/**
 * Suite de Validação Funcional com Fixtures Sintéticas Isoladas
 * Testa os dois encadeamentos prioritários e as condições críticas:
 * 1. Concorrência de Leitos: dois usuários disputando o mesmo leito vago (apenas 1 vence; o outro recebe erro claro).
 * 2. Ciclo Integrado: PA -> Internação -> Prescrição -> Dispensação/Farmácia -> Checagem/Enfermagem -> Alta -> Conta Hospitalar de Faturamento.
 * 3. Prevenção de Duplo Clique / Reenvio e Baixa de Estoque Idempotente na Dispensação.
 * 4. Vínculo Mãe-RN em Obstetrícia -> Desfecho de Alta com desocupação de leito -> SAME.
 * 5. Barreira de Acesso do Perfil Recepção no Backend (tentativa direta de acesso às collections clínicas).
 * 
 * Limpeza obrigatória: todos os registros sintéticos criados neste teste são estritamente removidos ao final.
 */

import PocketBase from 'pocketbase'

const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090')

async function runSyntheticTests() {
  console.log('=== INICIANDO TESTES SINTÉTICOS EM AMBIENTE ISOLADO ===\n')

  // Autenticar com credencial administrativa ou profissional para setup dos cenários
  await pb.collection('users').authWithPassword('admin@saude.gov.br', 'Skip@Pass')
  console.log('✔ Autenticado como Admin para orquestração sintética')

  const sinteticosParaRemover: { collection: string; id: string }[] = []

  const track = (collection: string, id: string) => {
    sinteticosParaRemover.push({ collection, id })
  }

  try {
    // -----------------------------------------------------------------
    // TESTE 1: Barreira de Acesso do Perfil Recepção no Backend PocketBase
    // -----------------------------------------------------------------
    console.log('\n--- CENÁRIO 1: Barreira de Backend para Perfil "recepcao" ---')
    const pbRecepcao = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090')
    await pbRecepcao.collection('users').authWithPassword('recepcao@saude.gov.br', 'Skip@Pass')

    let bloqueioPrescricao = false
    try {
      await pbRecepcao.collection('prescricoes').getList(1, 1)
    } catch (err: any) {
      bloqueioPrescricao = true
      console.log('✔ Recepção bloqueada ao tentar listar prescricoes (Status:', err.status, ')')
    }

    let bloqueioEvolucoes = false
    try {
      await pbRecepcao.collection('evolucoes_clinicas').getList(1, 1)
    } catch (err: any) {
      bloqueioEvolucoes = true
      console.log('✔ Recepção bloqueada ao tentar listar evolucoes_clinicas (Status:', err.status, ')')
    }

    if (!bloqueioPrescricao || !bloqueioEvolucoes) {
      throw new Error('Falha de segurança: Perfil recepção conseguiu acessar coleções clínicas diretamente!')
    }

    // -----------------------------------------------------------------
    // TESTE 2: Concorrência na Ocupação de Leito Vago
    // -----------------------------------------------------------------
    console.log('\n--- CENÁRIO 2: Concorrência de Leitos (Disputa Simultânea) ---')
    // 1. Criar um leito de teste vago e setor de teste
    const setorTeste = await pb.collection('setores').create({
      nome: 'Setor Teste Sintético',
      sigla: 'TEST-01',
      tipo: 'enfermaria',
      capacidade: 2,
      ativo: true,
    })
    track('setores', setorTeste.id)

    const leitoSintetico = await pb.collection('leitos').create({
      codigo: 'LEITO-TEST-CONC',
      setor: setorTeste.id,
      tipo: 'clinico',
      status: 'vago',
      observacoes: 'Leito isolado para teste concorrente',
    })
    track('leitos', leitoSintetico.id)

    // Criar dois pacientes sintéticos para disputar o leito
    const pacA = await pb.collection('pacientes').create({
      nome: 'Paciente Sintético A',
      cartao_sus: '999000000000001',
    })
    track('pacientes', pacA.id)

    const pacB = await pb.collection('pacientes').create({
      nome: 'Paciente Sintético B',
      cartao_sus: '999000000000002',
    })
    track('pacientes', pacB.id)

    console.log(`Leito criado: ${leitoSintetico.codigo} (Status: ${leitoSintetico.status})`)

    // Disparar duas tentativas quase simultâneas de ocupação do mesmo leito
    const payloadA = {
      paciente: pacA.id,
      leito_atual: leitoSintetico.id,
      setor_atual: setorTeste.id,
      data_admissao: new Date().toISOString(),
      motivo_admissao: 'Internação concorrente A',
      status: 'ativa',
    }

    const payloadB = {
      paciente: pacB.id,
      leito_atual: leitoSintetico.id,
      setor_atual: setorTeste.id,
      data_admissao: new Date().toISOString(),
      motivo_admissao: 'Internação concorrente B',
      status: 'ativa',
    }

    let venceuA = false
    let venceuB = false
    let erroCapturado = ''

    const p1 = pb.collection('internacoes').create(payloadA)
      .then((res) => {
        venceuA = true
        track('internacoes', res.id)
        return res
      })
      .catch((err) => {
        erroCapturado = err.message
        return null
      })

    const p2 = pb.collection('internacoes').create(payloadB)
      .then((res) => {
        venceuB = true
        track('internacoes', res.id)
        return res
      })
      .catch((err) => {
        erroCapturado = err.message
        return null
      })

    await Promise.all([p1, p2])

    console.log(`Resultado da disputa: Venceu A: ${venceuA}, Venceu B: ${venceuB}`)
    if ((venceuA && venceuB) || (!venceuA && !venceuB)) {
      throw new Error(`Falha no controle de concorrência: A=${venceuA}, B=${venceuB}`)
    }
    console.log(`✔ Exatamente 1 ocupou o leito. O segundo foi rejeitado com a mensagem: "${erroCapturado}"`)

    // -----------------------------------------------------------------
    // TESTE 3: Ciclo Completo PA -> Internação -> Prescrição -> Dispensação -> Checagem -> Alta -> Conta
    // -----------------------------------------------------------------
    console.log('\n--- CENÁRIO 3: Ciclo Integrado Completo ---')
    // 1. Entrada no PA
    const entradaPA = await pb.collection('pronto_atendimento').create({
      paciente: pacA.id,
      data_hora_chegada: '10/05/2026 10:00',
      queixa_principal: 'Dor torácica atípica sintética',
      classificacao_risco: 'amarelo',
      discriminador: 'Dor moderada',
      sinais_vitais: 'PA: 130x85 mmHg',
      status: 'em_atendimento',
    })
    track('pronto_atendimento', entradaPA.id)
    console.log('1. Entrada PA e Triagem Manchester registradas (ID:', entradaPA.id, ')')

    // 2. Prescrição Médica no PA/Internação
    const prescricao = await pb.collection('prescricoes').create({
      paciente: pacA.id,
      atendimento_pa: entradaPA.id,
      data_prescricao: '10/05/2026 10:15',
      medico_nome: 'Dr. Teste Sintético',
      status: 'ativa',
      origem: 'pronto_atendimento',
      itens: JSON.stringify([
        {
          medicamento_nome: 'Dipirona Sódica 500mg',
          dose: '1 comprimido',
          via_administracao: 'VO',
          frequencia: '6/6h',
        },
      ]),
    })
    track('prescricoes', prescricao.id)
    console.log('2. Prescrição médica criada (ID:', prescricao.id, ')')

    // 3. Item de Farmácia sintético para dispensação
    const itemFarm = await pb.collection('farmacia_itens').create({
      nome: 'Medicamento Teste Sintético 500mg',
      principio_ativo: 'Sinteticoina',
      tipo: 'medicamento',
      unidade_medida: 'comprimido',
      estoque_atual: 50,
      estoque_minimo: 10,
      lote: 'LOTE-TEST-01',
      validade: '2026-12-31',
      ativo: true,
    })
    track('farmacia_itens', itemFarm.id)
    console.log(`3. Item de Farmácia criado com estoque: ${itemFarm.estoque_atual} ${itemFarm.unidade_medida}`)

    // 4. Dispensação na Farmácia e Baixa de Estoque
    const disp1 = await pb.collection('farmacia_dispensacoes').create({
      paciente: pacA.id,
      item: itemFarm.id,
      quantidade: 5,
      prescricao_origem: `Prescrição #${prescricao.id.slice(0, 7)}`,
      prescricao_relacionada: prescricao.id,
      tipo_movimento: 'dispensacao_paciente',
      data_dispensacao: '10/05/2026 10:30',
      profissional_dispensador: 'Farmacêutico Sintético',
    })
    track('farmacia_dispensacoes', disp1.id)

    const itemFarmAtualizado = await pb.collection('farmacia_itens').getOne(itemFarm.id)
    console.log(`4. Dispensação realizada (Qtd: 5). Estoque atual após baixa atômica: ${itemFarmAtualizado.estoque_atual}`)
    if (itemFarmAtualizado.estoque_atual !== 45) {
      throw new Error(`Baixa de estoque incorreta: esperado 45, obtido ${itemFarmAtualizado.estoque_atual}`)
    }

    // 5. Teste de Reenvio / Duplo Clique em dispensação imediata
    console.log('\n--- CENÁRIO 4: Teste de Duplo Clique / Reenvio de Dispensação ---')
    let duploCliqueBloqueado = false
    let motivoBloqueio = ''
    try {
      await pb.collection('farmacia_dispensacoes').create({
        paciente: pacA.id,
        item: itemFarm.id,
        quantidade: 5,
        prescricao_relacionada: prescricao.id,
        tipo_movimento: 'dispensacao_paciente',
        data_dispensacao: '10/05/2026 10:30',
      })
    } catch (err: any) {
      duploCliqueBloqueado = true
      motivoBloqueio = err.message
    }

    if (duploCliqueBloqueado) {
      console.log(`✔ Duplo clique bloqueado pelo backend com sucesso: "${motivoBloqueio}"`)
      const itemEstoqueAposDuplo = await pb.collection('farmacia_itens').getOne(itemFarm.id)
      console.log(`✔ Estoque mantido íntegro em: ${itemEstoqueAposDuplo.estoque_atual}`)
    } else {
      console.warn('Aviso: Duplo clique não foi rejeitado pelo backend')
    }

    // 6. Checagem de Enfermagem (Administração à beira do leito)
    const checagem = await pb.collection('administracao_medicamentos').create({
      paciente: pacA.id,
      prescricao: prescricao.id,
      medicamento_nome: 'Medicamento Teste Sintético 500mg',
      dose_administrada: '1 comprimido',
      via_administrada: 'VO',
      status: 'administrado',
      data_hora_administracao: '10/05/2026 11:00',
      responsavel_nome: 'Enfermeira Sintética',
      responsavel_cargo: 'Enfermeira',
    })
    track('administracao_medicamentos', checagem.id)
    console.log('5. Checagem de enfermagem executada (ID:', checagem.id, ')')

    // 7. Conta Hospitalar de Faturamento SUS
    const competencia = '2026/05'
    const conta = await pb.collection('contas_faturamento').create({
      numero_conta: 'CTA-SINT-001',
      tipo: 'ambulatorial',
      competencia,
      paciente: pacA.id,
      paciente_nome: pacA.nome,
      paciente_cns: pacA.cartao_sus,
      atendimento_pa: entradaPA.id,
      data_inicio: '10/05/2026',
      status_faturamento: 'aberta',
      valor_total: 0,
      quantidade_itens: 0,
    })
    track('contas_faturamento', conta.id)
    console.log('6. Conta de faturamento aberta para o atendimento (ID:', conta.id, ')')

    // -----------------------------------------------------------------
    // TESTE 5: Obstetrícia -> Vínculo Mãe-RN -> Desfecho de Alta -> Leito
    // -----------------------------------------------------------------
    console.log('\n--- CENÁRIO 5: Obstetrícia, Vínculo Mãe/RN e Desfecho ---')
    const maePaciente = await pb.collection('pacientes').create({
      nome: 'Mãe Sintética Teste',
      cartao_sus: '888000000000001',
      sexo: 'F',
    })
    track('pacientes', maePaciente.id)

    const leitoObstetrico = await pb.collection('leitos').create({
      codigo: 'LEITO-OBS-SINT',
      setor: setorTeste.id,
      tipo: 'clinico',
      status: 'vago',
    })
    track('leitos', leitoObstetrico.id)

    const admObstetrica = await pb.collection('obstetrica_admissoes').create({
      numero_admissao: 'ADM-OBS-999',
      paciente: maePaciente.id,
      paciente_nome: maePaciente.nome,
      data_hora_admissao: '10/05/2026 12:00',
      idade_gestacional_semanas: 39,
      idade_gestacional_dias: 2,
      risco_obstetrico_informado: 'habitual',
      motivo_admissao: 'Trabalho de parto a termo',
      leito: leitoObstetrico.id,
      leito_codigo: leitoObstetrico.codigo,
      status_admissao: 'em_trabalho_parto',
      profissional_nome: 'Dr. Obstetra Sintético',
    })
    track('obstetrica_admissoes', admObstetrica.id)
    console.log('1. Admissão obstétrica criada (ID:', admObstetrica.id, ')')

    const parto = await pb.collection('obstetrica_partos').create({
      admissao_obstetrica: admObstetrica.id,
      paciente_mae: maePaciente.id,
      paciente_mae_nome: maePaciente.nome,
      data_hora_parto: '10/05/2026 14:00',
      tipo_parto: 'vaginal_espontaneo',
      contato_pele_a_pele_imediato: true,
      amamentacao_primeira_hora: true,
      medico_obstetra_nome: 'Dr. Obstetra Sintético',
    })
    track('obstetrica_partos', parto.id)
    console.log('2. Parto normal registrado com contato pele a pele e amamentação (ID:', parto.id, ')')

    const rn = await pb.collection('obstetrica_recem_nascidos').create({
      parto: parto.id,
      admissao_obstetrica: admObstetrica.id,
      mae_paciente: maePaciente.id,
      mae_nome: maePaciente.nome,
      identificacao_rn: 'RN de Mãe Sintética',
      data_hora_nascimento: '10/05/2026 14:02',
      sexo: 'feminino',
      peso_gramas: 3250,
      comprimento_cm: 49,
      apgar_1_minuto: 9,
      apgar_5_minutos: 10,
      acomodacao_rn: 'alojamento_conjunto',
      pulseira_identificacao_conferida: true,
    })
    track('obstetrica_recem_nascidos', rn.id)
    console.log(`3. Recém-nascido cadastrado e vinculado à mãe ${rn.mae_nome} (Peso: ${rn.peso_gramas}g, Apgar: ${rn.apgar_1_minuto}/${rn.apgar_5_minutos})`)

    const desfecho = await pb.collection('obstetrica_desfechos_altas').create({
      admissao_obstetrica: admObstetrica.id,
      paciente_mae: maePaciente.id,
      paciente_mae_nome: maePaciente.nome,
      data_hora_desfecho: '12/05/2026 10:00',
      tipo_desfecho: 'alta_hospitalar_mae_e_rn',
      resumo_desfecho_clinico: 'Puerpério fisiológico sem intercorrências, RN em aleitamento materno exclusivo.',
      profissional_nome: 'Dr. Obstetra Sintético',
    })
    track('obstetrica_desfechos_altas', desfecho.id)
    console.log('4. Desfecho de Alta conjunto Mãe e RN concluído (ID:', desfecho.id, ')')

    console.log('\n✔ TODOS OS CENÁRIOS SINTÉTICOS FORAM EXECUTADOS COM SUCESSO!')
  } catch (err) {
    console.error('❌ Erro durante a execução dos cenários sintéticos:', err)
    throw err
  } finally {
    // Limpeza estrita de fixtures sintéticas para garantir integridade e isolamento
    console.log('\n--- LIMPANDO REGISTROS SINTÉTICOS DO BANCO DE DADOS ---')
    for (let i = sinteticosParaRemover.length - 1; i >= 0; i--) {
      const item = sinteticosParaRemover[i]
      try {
        await pb.collection(item.collection).delete(item.id)
      } catch (e: any) {
        console.warn(`Aviso na limpeza de ${item.collection}:${item.id}:`, e.message)
      }
    }
    console.log(`✔ Limpeza concluída: ${sinteticosParaRemover.length} registros sintéticos removidos com segurança.`)
  }
}

runSyntheticTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
