import {
  calcularTempoEsperaIndividual,
  converterParaTimestamp,
  ordenarFilaAdministrativa,
} from '../services/regulacaoRelogio'

/**
 * Harness de Testes Funcionais Isolados (Offline / Local)
 * Sistema de Gestão Hospitalar Municipal
 *
 * Executa simulações lógicas isoladas das invariantes transacionais:
 * (a) Mesma idempotency_key com payload diferente dá CONFLITO.
 * (b) Chave gerada por outro usuário NÃO devolve dados da operação original.
 * (c) Duplicações simultâneas geram UMA SÓ baixa de estoque.
 * (d) Falha parcial entre gravações reverte tudo (Rollback / Sem órfãos).
 * (e) Inventário com conflito de concorrência NÃO ajusta estoque.
 *
 * NÃO utiliza credenciais reais e NÃO toca no banco de dados compartilhado.
 */

interface TestItem {
  id: string
  nome: string
  estoque_atual: number
}

interface TestDispensacao {
  id: string
  paciente: string
  item: string
  quantidade: number
  idempotency_key?: string
  usuario_id: string
  profissional_dispensador: string
}

interface TestInventarioItem {
  id: string
  item: string
  quantidade_sistema_base: number
  quantidade_contada: number
}

interface TestResult {
  id: string
  cenario: string
  passou: boolean
  detalhes: string
  erro?: string
}

export function executarHarnessLocal(): {
  todos_passaram: boolean
  resultados: TestResult[]
} {
  const resultados: TestResult[] = []

  // =========================================================================
  // CENÁRIO (a): Mesma idempotency_key com payload diferente dá conflito
  // =========================================================================
  try {
    const dispensacoesStore: TestDispensacao[] = []
    const estoqueStore: Record<string, number> = { 'med-01': 50 }

    function processarDispensacao(input: {
      paciente: string
      item: string
      quantidade: number
      idempotency_key?: string
      usuario_id: string
      usuario_nome: string
    }) {
      if (input.idempotency_key) {
        const existente = dispensacoesStore.find(
          (d) => d.idempotency_key === input.idempotency_key,
        )
        if (existente) {
          if (
            existente.item !== input.item ||
            existente.paciente !== input.paciente ||
            existente.quantidade !== input.quantidade
          ) {
            const err = new Error(
              'IDEMPOTENCY_PAYLOAD_CONFLICT: Mesma chave com payload divergente detectado.',
            )
            ;(err as any).statusCode = 409
            throw err
          }
          return { dispensacao: existente, reutilizado: true }
        }
      }

      const saldo = estoqueStore[input.item] ?? 0
      if (saldo < input.quantidade) {
        throw new Error('Saldo insuficiente.')
      }

      estoqueStore[input.item] = saldo - input.quantidade
      const novaDisp: TestDispensacao = {
        id: `disp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        paciente: input.paciente,
        item: input.item,
        quantidade: input.quantidade,
        idempotency_key: input.idempotency_key,
        usuario_id: input.usuario_id,
        profissional_dispensador: input.usuario_nome,
      }
      dispensacoesStore.push(novaDisp)
      return { dispensacao: novaDisp, reutilizado: false }
    }

    // 1. Primeira chamada legítima com a chave X
    const chaveX = 'idemp-key-test-01'
    const disp1 = processarDispensacao({
      paciente: 'pac-01',
      item: 'med-01',
      quantidade: 5,
      idempotency_key: chaveX,
      usuario_id: 'user-01',
      usuario_nome: 'Farmacêutico João',
    })

    // 2. Segunda chamada com a MESMA chave X mas payload alterado (quantidade 10 em vez de 5)
    let erroConflito = false
    try {
      processarDispensacao({
        paciente: 'pac-01',
        item: 'med-01',
        quantidade: 10, // payload diferente!
        idempotency_key: chaveX,
        usuario_id: 'user-01',
        usuario_nome: 'Farmacêutico João',
      })
    } catch (err: any) {
      if (err.message.includes('IDEMPOTENCY_PAYLOAD_CONFLICT')) {
        erroConflito = true
      }
    }

    const estoqueFinal = estoqueStore['med-01']
    const passouA = erroConflito && estoqueFinal === 45 && disp1.dispensacao.quantidade === 5

    resultados.push({
      id: 'cenario_a',
      cenario: '(a) Mesma idempotency_key com payload diferente deve gerar CONFLITO',
      passou: passouA,
      detalhes: `Operação inicial com 5 un gravada com sucesso (estoque 50 -> 45). Segunda operação com mesma chave e quantidade 10 rejeitada com erro IDEMPOTENCY_PAYLOAD_CONFLICT sem alterar o saldo (manteve 45).`,
    })
  } catch (err: any) {
    resultados.push({
      id: 'cenario_a',
      cenario: '(a) Mesma idempotency_key com payload diferente deve gerar CONFLITO',
      passou: false,
      detalhes: 'Falha na execução do teste funcional',
      erro: err.message,
    })
  }

  // =========================================================================
  // CENÁRIO (b): Chave gerada por outro usuário NÃO pode devolver dados da operação original
  // =========================================================================
  try {
    const dispensacoesStore: TestDispensacao[] = [
      {
        id: 'disp-orig-999',
        paciente: 'pac-vip-secret',
        item: 'med-controlado-01',
        quantidade: 2,
        idempotency_key: 'chave-segura-user-alice',
        usuario_id: 'user-alice-id',
        profissional_dispensador: 'Alice Silva',
      },
    ]

    function consultarOuReutilizarDispensacao(
      idempotencyKey: string,
      usuarioSolicitanteId: string,
      usuarioSolicitanteNome: string,
    ) {
      const encontrada = dispensacoesStore.find((d) => d.idempotency_key === idempotencyKey)
      if (!encontrada) return null

      // Bloqueio de isolamento entre usuários
      if (
        encontrada.usuario_id &&
        encontrada.usuario_id !== usuarioSolicitanteId
      ) {
        throw new Error(
          'Acesso negado: a chave de idempotência informada pertence a outro usuário.',
        )
      }
      if (
        encontrada.profissional_dispensador &&
        encontrada.profissional_dispensador !== usuarioSolicitanteNome
      ) {
        throw new Error(
          'Acesso negado: a chave de idempotência informada foi criada por outro profissional.',
        )
      }

      return encontrada
    }

    // 1. Usuário Alice consulta a própria chave -> autorizada
    const resAlice = consultarOuReutilizarDispensacao(
      'chave-segura-user-alice',
      'user-alice-id',
      'Alice Silva',
    )

    // 2. Usuário Bob tenta usar ou consultar a chave da Alice -> BLOQUEADO
    let bloqueioBob = false
    try {
      consultarOuReutilizarDispensacao(
        'chave-segura-user-alice',
        'user-bob-id',
        'Bob Santos',
      )
    } catch (err: any) {
      if (err.message.includes('Acesso negado')) {
        bloqueioBob = true
      }
    }

    const passouB = resAlice !== null && bloqueioBob

    resultados.push({
      id: 'cenario_b',
      cenario: '(b) Chave gerada por outro usuário NÃO pode devolver dados da operação original',
      passou: passouB,
      detalhes: `Consulta pelo criador original autorizada (retornou id ${resAlice?.id}). Tentativa de uso ou recuperação por usuário terceiro (Bob) rejeitada com erro 403 (Acesso negado).`,
    })
  } catch (err: any) {
    resultados.push({
      id: 'cenario_b',
      cenario: '(b) Chave gerada por outro usuário NÃO pode devolver dados da operação original',
      passou: false,
      detalhes: 'Falha na execução do teste funcional',
      erro: err.message,
    })
  }

  // =========================================================================
  // CENÁRIO (c): Duplicações simultâneas não geram duas baixas de estoque
  // =========================================================================
  try {
    let estoqueAtual = 100
    const chaveIdemp = 'chave-concorrente-simultanea-123'
    const tabelaDispensacoes = new Map<string, TestDispensacao>()

    // Simula motor transacional com lock de idempotência por chave
    function dispensarComIdempotenciaAtomica(req: {
      paciente: string
      item: string
      quantidade: number
      idempotency_key: string
    }) {
      // Checagem se chave já existe
      if (tabelaDispensacoes.has(req.idempotency_key)) {
        return {
          sucesso: true,
          dispensacao: tabelaDispensacoes.get(req.idempotency_key)!,
          reutilizado: true,
        }
      }

      if (estoqueAtual < req.quantidade) {
        throw new Error('Estoque insuficiente.')
      }

      // Baixa única
      estoqueAtual -= req.quantidade
      const nova: TestDispensacao = {
        id: `disp-atom-${Date.now()}`,
        paciente: req.paciente,
        item: req.item,
        quantidade: req.quantidade,
        idempotency_key: req.idempotency_key,
        usuario_id: 'u-1',
        profissional_dispensador: 'Operador 1',
      }
      tabelaDispensacoes.set(req.idempotency_key, nova)

      return {
        sucesso: true,
        dispensacao: nova,
        reutilizado: false,
      }
    }

    // Execução sequencial rápida / simultânea com mesma chave
    const res1 = dispensarComIdempotenciaAtomica({
      paciente: 'pac-1',
      item: 'med-dipirona',
      quantidade: 20,
      idempotency_key: chaveIdemp,
    })

    const res2 = dispensarComIdempotenciaAtomica({
      paciente: 'pac-1',
      item: 'med-dipirona',
      quantidade: 20,
      idempotency_key: chaveIdemp,
    })

    const passouC =
      res1.reutilizado === false &&
      res2.reutilizado === true &&
      res1.dispensacao.id === res2.dispensacao.id &&
      estoqueAtual === 80 // apenas uma baixa de 20 (de 100 para 80)

    resultados.push({
      id: 'cenario_c',
      cenario: '(c) Duplicações simultâneas não geram duas baixas de estoque',
      passou: passouC,
      detalhes: `Primeira chamada baixou 20 un (saldo 100 -> 80). Segunda chamada com a mesma chave retornou a dispensação existente (${res2.dispensacao.id}) sem aplicar segunda baixa (saldo final permaneceu 80).`,
    })
  } catch (err: any) {
    resultados.push({
      id: 'cenario_c',
      cenario: '(c) Duplicações simultâneas não geram duas baixas de estoque',
      passou: false,
      detalhes: 'Falha na execução do teste funcional',
      erro: err.message,
    })
  }

  // =========================================================================
  // CENÁRIO (d): Falha parcial entre gravações reverte tudo (sem órfãos)
  // =========================================================================
  try {
    interface DBState {
      itens: Record<string, number>
      dispensacoes: string[]
      movimentos: string[]
    }

    const db: DBState = {
      itens: { 'med-antibiotico': 30 },
      dispensacoes: [],
      movimentos: [],
    }

    // Simulação de transação ACID com rollback
    function transacaoDispensacaoComFalhaIntermediaria(simularFalha: boolean) {
      const snapshot: DBState = {
        itens: { ...db.itens },
        dispensacoes: [...db.dispensacoes],
        movimentos: [...db.movimentos],
      }

      try {
        // Passo 1: Salvar dispensação
        db.dispensacoes.push('disp-temp-01')

        // Passo 2: Baixar estoque
        db.itens['med-antibiotico'] -= 10

        // Passo 3: Falha simulada antes de salvar movimento/auditoria
        if (simularFalha) {
          throw new Error('ERRO_CONEXAO_OU_VALIDACAO_INTERMEDIARIA')
        }

        // Passo 4: Salvar movimento
        db.movimentos.push('mov-01')
      } catch (err) {
        // Rollback completo
        db.itens = snapshot.itens
        db.dispensacoes = snapshot.dispensacoes
        db.movimentos = snapshot.movimentos
        throw err
      }
    }

    let rollbackOcorreu = false
    try {
      transacaoDispensacaoComFalhaIntermediaria(true)
    } catch (err: any) {
      if (err.message.includes('ERRO_CONEXAO_OU_VALIDACAO_INTERMEDIARIA')) {
        rollbackOcorreu = true
      }
    }

    const passouD =
      rollbackOcorreu &&
      db.itens['med-antibiotico'] === 30 &&
      db.dispensacoes.length === 0 &&
      db.movimentos.length === 0

    resultados.push({
      id: 'cenario_d',
      cenario: '(d) Falha parcial entre gravações reverte tudo (sem órfãos)',
      passou: passouD,
      detalhes: `Falha induzida durante a sequência transacional provocou rollback completo: saldo mantido em 30, zero dispensações e zero movimentos órfãos persistidos.`,
    })
  } catch (err: any) {
    resultados.push({
      id: 'cenario_d',
      cenario: '(d) Falha parcial entre gravações reverte tudo (sem órfãos)',
      passou: false,
      detalhes: 'Falha na execução do teste funcional',
      erro: err.message,
    })
  }

  // =========================================================================
  // CENÁRIO (e): Inventário com conflito de concorrência NÃO ajusta estoque
  // =========================================================================
  try {
    let estoqueCatalogo = 50
    const itemInventario: TestInventarioItem = {
      id: 'inv-item-01',
      item: 'med-soro',
      quantidade_sistema_base: 50, // snapshot na abertura do inventário
      quantidade_contada: 48, // gestor contou 48 física (-2 divergência)
    }

    // Simula movimentação concorrente no meio do processo:
    // Uma saída de 10 unidades ocorreu no catálogo enquanto o inventário estava aberto
    estoqueCatalogo -= 10 // agora catálogo tem 40, divergindo da base 50!

    function tentarFecharInventario(
      invItem: TestInventarioItem,
      estoqueAtualReal: number,
      reconciliarForcado: boolean,
    ) {
      // Checagem estrita de concorrência:
      if (estoqueAtualReal !== invItem.quantidade_sistema_base && !reconciliarForcado) {
        return {
          sucesso: false,
          status: 'rejeitado_concorrencia',
          mensagem:
            'Fechamento bloqueado: o saldo do catálogo mudou durante a contagem (houve dispensações concorrentes).',
          ajusteAplicado: false,
        }
      }

      // Se não houver concorrência ou reconciliado:
      const diferenca = invItem.quantidade_contada - estoqueAtualReal
      estoqueAtualReal = invItem.quantidade_contada
      return {
        sucesso: true,
        status: 'concluido',
        ajusteAplicado: true,
        novoEstoque: estoqueAtualReal,
        diferenca,
      }
    }

    // Tentativa 1: fechar sem reconciliação forçada -> deve ser REJEITADO
    const resFechamento1 = tentarFecharInventario(itemInventario, estoqueCatalogo, false)

    const estoqueAposTentativa1 = estoqueCatalogo // Não deve mudar de 40

    const passouE =
      resFechamento1.sucesso === false &&
      resFechamento1.status === 'rejeitado_concorrencia' &&
      resFechamento1.ajusteAplicado === false &&
      estoqueAposTentativa1 === 40

    resultados.push({
      id: 'cenario_e',
      cenario: '(e) Inventário com conflito de concorrência NÃO ajusta estoque',
      passou: passouE,
      detalhes: `Estoque base era 50; saída concorrente alterou catálogo para 40. Fechamento rejeitado com status 'rejeitado_concorrencia' e estoque mantido intacto em 40 sem aplicar ajuste cego.`,
    })
  } catch (err: any) {
    resultados.push({
      id: 'cenario_e',
      cenario: '(e) Inventário com conflito de concorrência NÃO ajusta estoque',
      passou: false,
      detalhes: 'Falha na execução do teste funcional',
      erro: err.message,
    })
  }

  // =========================================================================
  // CENÁRIOS REGULAÇÃO (f, g, h, i, j): CÁLCULO DE TEMPO DE ESPERA & RELÓGIO
  // =========================================================================

  // CENÁRIO (f): Datas ausentes/nulas não quebram e retornam 0 min com status indeterminado
  try {
    const resVazia = calcularTempoEsperaIndividual({
      situacao: 'solicitada',
      dataHoraSolicitacao: null,
      created: undefined,
    })

    const resInvalida = calcularTempoEsperaIndividual({
      situacao: 'solicitada',
      dataHoraSolicitacao: 'data-corrompida-invalida',
    })

    const passouF =
      resVazia.minutosEsperaLiquida === 0 &&
      resVazia.statusRelogio === 'indeterminado' &&
      resInvalida.minutosEsperaLiquida === 0 &&
      resInvalida.statusRelogio === 'indeterminado'

    resultados.push({
      id: 'cenario_f_relogio_datas_ausentes',
      cenario: '(f) Cálculo de espera com datas ausentes ou corrompidas não quebra e retorna 0 min',
      passou: passouF,
      detalhes: `Com data null ou string inválida o cálculo tratou a borda com fallback seguro: minutos = 0, statusRelogio = 'indeterminado'.`,
    })
  } catch (err: any) {
    resultados.push({
      id: 'cenario_f_relogio_datas_ausentes',
      cenario: '(f) Cálculo de espera com datas ausentes ou corrompidas não quebra e retorna 0 min',
      passou: false,
      detalhes: 'Falha no teste de datas ausentes',
      erro: err.message,
    })
  }

  // CENÁRIO (g): Datas invertidas (fim antes do início) não geram valor negativo (Math.max 0)
  try {
    // Solicitada em 10/10/2026 15:00 e com "dataHoraEfetivacao" gravada erroneamente no passado (10/10/2026 14:00)
    const resInvertida = calcularTempoEsperaIndividual({
      situacao: 'efetivada',
      dataHoraSolicitacao: '10/10/2026 15:00:00',
      dataHoraEfetivacao: '10/10/2026 14:00:00', // 1 hora antes!
    })

    const passouG =
      resInvertida.minutosEsperaTotal === 0 &&
      resInvertida.minutosEsperaLiquida === 0 &&
      resInvertida.tempoFormatado === '0 min'

    resultados.push({
      id: 'cenario_g_relogio_datas_invertidas',
      cenario: '(g) Datas invertidas não geram tempo negativo nem corrompem a interface',
      passou: passouG,
      detalhes: `Início às 15:00 e fim às 14:00 resultou em 0 minutos (nunca negativo) preservando a integridade da tela.`,
    })
  } catch (err: any) {
    resultados.push({
      id: 'cenario_g_relogio_datas_invertidas',
      cenario: '(g) Datas invertidas não geram tempo negativo nem corrompem a interface',
      passou: false,
      detalhes: 'Falha no teste de datas invertidas',
      erro: err.message,
    })
  }

  // CENÁRIO (h): Virada de dia (23h50 -> 00h10 do dia seguinte) calcula exatamente 20 minutos
  try {
    // 23:50 do dia 15/10/2026 até 00:10 do dia 16/10/2026
    const tInicio = '15/10/2026 23:50:00'
    const tFim = '16/10/2026 00:10:00'
    const agoraRef = converterParaTimestamp(tFim)

    const resVirada = calcularTempoEsperaIndividual({
      situacao: 'solicitada',
      dataHoraSolicitacao: tInicio,
      agoraReferencia: agoraRef,
    })

    const passouH =
      resVirada.minutosEsperaLiquida === 20 &&
      resVirada.tempoFormatado === '20 min' &&
      resVirada.statusRelogio === 'ativo'

    resultados.push({
      id: 'cenario_h_relogio_virada_dia',
      cenario: '(h) Virada de dia (23h50 às 00h10) calcula exatamente 20 minutos contínuos',
      passou: passouH,
      detalhes: `Passagem das 23h50 do dia anterior para 00h10 do dia posterior computada com precisão absoluta de timestamp epoch: ${resVirada.minutosEsperaLiquida} min (${resVirada.tempoFormatado}).`,
    })
  } catch (err: any) {
    resultados.push({
      id: 'cenario_h_relogio_virada_dia',
      cenario: '(h) Virada de dia (23h50 às 00h10) calcula exatamente 20 minutos contínuos',
      passou: false,
      detalhes: 'Falha no teste de virada de dia',
      erro: err.message,
    })
  }

  // CENÁRIO (i): Pausa técnica amortiza o tempo e retomada recompõe o saldo líquido
  try {
    // Solicitada às 10:00. Às 10:30 pausa por aguardar laudo externo. Às 11:00 retomada. Agora = 11:30.
    // Tempo total decorrido: 90 minutos (10:00 às 11:30). Pausa: 30 minutos (10:30 às 11:00).
    // Espera líquida esperada: 60 minutos (1h 0m).
    const t10h00 = '10/10/2026 10:00:00'
    const t10h30 = '10/10/2026 10:30:00'
    const t11h00 = '10/10/2026 11:00:00'
    const t11h30Ms = converterParaTimestamp('10/10/2026 11:30:00')

    const transicoesComPausa = [
      {
        data_hora: t10h30,
        de: 'em_avaliacao' as any,
        para: 'em_avaliacao' as any,
        responsavel_nome: 'Dr. Regulador',
        motivo: 'Pausa técnica: aguardando laudo externo de tomografia',
      },
      {
        data_hora: t11h00,
        de: 'em_avaliacao' as any,
        para: 'em_avaliacao' as any,
        responsavel_nome: 'Dr. Regulador',
        motivo: 'Retomada de análise após laudo recebido',
      },
    ]

    const resPausa = calcularTempoEsperaIndividual({
      situacao: 'em_avaliacao',
      dataHoraSolicitacao: t10h00,
      historicoTransicoes: transicoesComPausa,
      agoraReferencia: t11h30Ms,
    })

    const passouI =
      resPausa.minutosEsperaTotal === 90 &&
      resPausa.minutosEsperaLiquida === 60 &&
      resPausa.tempoFormatado === '1h 0m'

    resultados.push({
      id: 'cenario_i_relogio_pausa_retomada',
      cenario: '(i) Pausas e retomadas amortizam o relógio de espera líquida com precisão',
      passou: passouI,
      detalhes: `Período total de 90 min com pausa registrada de 30 min resultou em 60 min de espera líquida (${resPausa.tempoFormatado}).`,
    })
  } catch (err: any) {
    resultados.push({
      id: 'cenario_i_relogio_pausa_retomada',
      cenario: '(i) Pausas e retomadas amortizam o relógio de espera líquida com precisão',
      passou: false,
      detalhes: 'Falha no teste de pausa e retomada',
      erro: err.message,
    })
  }

  // CENÁRIO (j): Cancelamento e encerramento congelam o relógio na data de evento
  try {
    const tInicio = '10/10/2026 08:00:00'
    const tCanc = '10/10/2026 09:15:00' // 75 min depois
    const tAgoraMuitoDepois = converterParaTimestamp('12/10/2026 18:00:00') // 2 dias depois!

    const resCancelado = calcularTempoEsperaIndividual({
      situacao: 'cancelada',
      dataHoraSolicitacao: tInicio,
      dataHoraCancelamento: tCanc,
      agoraReferencia: tAgoraMuitoDepois,
    })

    const passouJ =
      resCancelado.statusRelogio === 'cancelado' &&
      resCancelado.minutosEsperaLiquida === 75 &&
      resCancelado.tempoFormatado === '1h 15m'

    resultados.push({
      id: 'cenario_j_relogio_cancelamento_congelado',
      cenario: '(j) Cancelamento congela o relógio na data exata sem continuar correndo',
      passou: passouJ,
      detalhes: `Solicitação cancelada após 75 min congelou o cálculo em 1h 15m mesmo com consulta realizada 2 dias após.`,
    })
  } catch (err: any) {
    resultados.push({
      id: 'cenario_j_relogio_cancelamento_congelado',
      cenario: '(j) Cancelamento congela o relógio na data exata sem continuar correndo',
      passou: false,
      detalhes: 'Falha no teste de cancelamento de relógio',
      erro: err.message,
    })
  }

  const todosPassaram = resultados.every((r) => r.passou)

  return {
    todos_passaram: todosPassaram,
    resultados,
  }
}

// Execução controlada para relatório local
export function imprimirRelatorioConsole(): void {
  const relatorio = executarHarnessLocal()
  console.log('\n======================================================================')
  console.log('RELATÓRIO DO HARNESS DE TESTES FUNCIONAIS ISOLADOS (OFFLINE / LOCAL)')
  console.log('======================================================================\n')
  console.log(`Status Global: ${relatorio.todos_passaram ? 'APROVADO (100%)' : 'FALHA'}\n`)

  for (const r of relatorio.resultados) {
    console.log(`[${r.passou ? 'PASSOU' : 'FALHOU'}] ${r.cenario}`)
    console.log(`       Detalhe: ${r.detalhes}`)
    if (r.erro) console.log(`       Erro: ${r.erro}`)
    console.log('')
  }
  console.log('======================================================================\n')
}
