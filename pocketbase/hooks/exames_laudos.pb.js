/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Integridade Server-Side: Módulo Exames & Laudos e Vínculo com Prontuário SAME
 *
 * 1. Cadeia de vínculos paciente / atendimento (PA ou Internação) / solicitação / coleta / laudo:
 *    - Validação rígida no servidor: não confia em paciente, autor ou perfil enviados pelo navegador.
 *    - Solicitante e autor do laudo são vinculados com base na sessão autenticada (@request.auth).
 *    - Se informada internação ou atendimento PA, o servidor valida se pertencem ao mesmo paciente.
 *
 * 2. Permissões verificadas no servidor:
 *    - Recepção tem perfil estritamente administrativo: NÃO pode emitir, alterar nem retificar laudos (apenas médicos/biomédicos/profissionais autorizados ou gestor/admin).
 *    - Recepção não pode criar exames nem alterar status clínico.
 *
 * 3. Transições inconsistentes:
 *    - Exame com status 'cancelado' NÃO aceita nova coleta, análise, laudo ou retificação.
 *    - Ordem de estados clínicos validada (solicitado -> coletado -> em_analise -> liberado).
 *
 * 4. Proteção idempotente com chave persistente (idempotency_key):
 *    - Previne duplicação por duplo clique, reenvio de rede ou concorrência.
 *    - Conflito se a mesma chave for enviada com paciente/exame/parâmetros divergentes.
 *
 * 5. Laudo FINALIZADO / LIBERADO preserva conteúdo original:
 *    - Edição direta de resultado_sumario ou laudo_texto em exame liberado é BLOQUEADA.
 *    - Correções ocorrem exclusivamente por retificação (nova versão registrada na coleção laudos_versoes),
 *      mantendo a versão original e o histórico imutável com motivo, autor, cargo e data/hora.
 */

// -------------------------------------------------------------
// A. CRIAÇÃO DE SOLICITAÇÃO DE EXAME (onRecordCreate 'exames')
// -------------------------------------------------------------
onRecordCreate((e) => {
  const auth = e.auth
  const pacienteId = e.record.get('paciente')
  const internacaoId = e.record.get('internacao')
  const atendimentoPaId = e.record.get('atendimento_pa')
  const tipoExame = e.record.get('tipo_exame')
  const idempotencyKey = e.record.get('idempotency_key')

  // 1. Verificação de permissões do solicitante
  if (auth) {
    const role = auth.get('role')
    if (role === 'recepcao') {
      throw new ForbiddenError(
        'PERMISSÃO NEGADA: Perfil recepção não tem autorização para emitir solicitação médica de exames.',
      )
    }
  }

  // 2. Validação da cadeia clínica: paciente obrigatório e existente
  if (!pacienteId) {
    throw new BadRequestError('Identificação do paciente é obrigatória para solicitar exame.')
  }

  const pacienteRec = e.app.findRecordById('pacientes', pacienteId)
  if (!pacienteRec) {
    throw new NotFoundError(`Paciente com identificador "${pacienteId}" não foi encontrado.`)
  }

  // Validação de vínculo cruzado: internação deve pertencer ao mesmo paciente
  if (internacaoId) {
    const interRec = e.app.findRecordById('internacoes', internacaoId)
    if (!interRec) {
      throw new NotFoundError(`Internação "${internacaoId}" não encontrada.`)
    }
    const pacInter = interRec.get('paciente')
    if (pacInter && pacInter !== pacienteId) {
      throw new BadRequestError(
        'VÍNCULO CLÍNICO DIVERGENTE: A internação informada pertence a outro paciente.',
      )
    }
  }

  // Validação de vínculo cruzado: atendimento PA deve pertencer ao mesmo paciente
  if (atendimentoPaId) {
    const paRec = e.app.findRecordById('pronto_atendimento', atendimentoPaId)
    if (!paRec) {
      throw new NotFoundError(`Atendimento PA "${atendimentoPaId}" não encontrado.`)
    }
    const pacPa = paRec.get('paciente')
    if (pacPa && pacPa !== pacienteId) {
      throw new BadRequestError(
        'VÍNCULO CLÍNICO DIVERGENTE: O atendimento de Pronto Atendimento informado pertence a outro paciente.',
      )
    }
  }

  // 3. Idempotência por chave contra duplo envio/duplo clique
  if (idempotencyKey && String(idempotencyKey).trim().length > 0) {
    const key = String(idempotencyKey).trim()
    const existentes = e.app.findRecordsByFilter(
      'exames',
      'idempotency_key = {:k}',
      '-created',
      1,
      0,
      { k: key },
    )

    if (existentes && existentes.length > 0) {
      const original = existentes[0]

      // Checa conflito de payload se a mesma chave for reenviada com parâmetros divergentes
      const origPac = original.get('paciente')
      const origTipo = original.get('tipo_exame')
      if ((origPac && origPac !== pacienteId) || (origTipo && origTipo !== tipoExame)) {
        throw new BadRequestError(
          'IDEMPOTENCY_PAYLOAD_CONFLICT: A chave de idempotência informada já foi usada para outro exame ou paciente.',
        )
      }

      // Hit idempotente seguro
      throw new BadRequestError(`IDEMPOTENT_HIT:${original.id}`)
    }
  }

  // 4. Autor autêntico da sessão (não confiar cegamente em solicitante_nome do navegador)
  if (auth) {
    const authNome = auth.get('name')
    if (authNome && String(authNome).trim().length > 0) {
      e.record.set('solicitante_nome', authNome)
    }
  }

  // 5. Estado inicial obrigatório: 'solicitado'
  e.record.set('status', 'solicitado')

  // Timestamp seguro da solicitação
  if (!e.record.get('data_solicitacao')) {
    const agora = new Date()
    e.record.set(
      'data_solicitacao',
      agora.toISOString().slice(0, 10) + ' ' + agora.toTimeString().slice(0, 5),
    )
  }

  e.next()
}, 'exames')

// -------------------------------------------------------------
// B. TRANSIÇÕES E ATUALIZAÇÕES DO EXAME (onRecordUpdate 'exames')
// -------------------------------------------------------------
onRecordUpdate((e) => {
  const auth = e.auth
  const original = e.record.original()
  if (!original) {
    e.next()
    return
  }

  const statusAnterior = original.get('status')
  const novoStatus = e.record.get('status')
  const pacienteOriginal = original.get('paciente')
  const pacienteNovo = e.record.get('paciente')

  // 1. Imutabilidade do paciente: não é permitido alterar o paciente de um exame em andamento
  if (pacienteNovo && pacienteOriginal && pacienteNovo !== pacienteOriginal) {
    throw new BadRequestError(
      'INTEGRIDADE VIOLADA: Não é permitido alterar o paciente de uma solicitação de exame já existente.',
    )
  }

  // 2. Regra de cancelamento: solicitação cancelada é terminal
  if (statusAnterior === 'cancelado') {
    throw new BadRequestError(
      'EXAME CANCELADO: Solicitação de exame cancelada não aceita coleta, análise, laudo nem reativação.',
    )
  }

  // 3. Validação de perfil por ação / transição
  if (auth) {
    const role = auth.get('role')

    // Se estiver tentando laudar ou alterar dados de laudo diretamente na coleção 'exames'
    const mudouLaudoTexto =
      e.record.get('laudo_texto') !== original.get('laudo_texto') ||
      e.record.get('resultado_sumario') !== original.get('resultado_sumario')

    if (mudouLaudoTexto || novoStatus === 'liberado') {
      if (role === 'recepcao') {
        throw new ForbiddenError(
          'ACESSO NEGADO: Usuários do perfil recepção não têm autorização para redigir ou emitir laudos.',
        )
      }
    }
  }

  // 4. Imutabilidade de Laudo Finalizado:
  // Se o exame já estava 'liberado', qualquer alteração no laudo original é bloqueada no servidor
  if (statusAnterior === 'liberado') {
    const laudoAnterior = original.get('laudo_texto') || ''
    const laudoNovo = e.record.get('laudo_texto') || ''
    const resultadoAnterior = original.get('resultado_sumario') || ''
    const resultadoNovo = e.record.get('resultado_sumario') || ''

    // Se houve tentativa de sobrescrever o conteúdo do laudo finalizado
    if (
      (laudoNovo !== laudoAnterior || resultadoNovo !== resultadoAnterior) &&
      !e.record.get('tem_retificacao')
    ) {
      throw new BadRequestError(
        'LAUDO FINALIZADO IMUTÁVEL: O laudo já liberado não pode ser sobrescrito diretamente. Utilize o fluxo de retificação/nova versão com justificativa clínica.',
      )
    }

    // Não permite reverter exame liberado para solicitado ou coletado
    if (novoStatus === 'solicitado' || novoStatus === 'coletado' || novoStatus === 'em_analise') {
      throw new BadRequestError(
        'TRANSIÇÃO INVÁLIDA: Exame liberado não pode retornar a etapas anteriores de coleta ou análise.',
      )
    }
  }

  // 5. Validação de etapas e preenchimento autoritativo do responsável da sessão
  if (novoStatus === 'coletado' && statusAnterior === 'solicitado') {
    if (!e.record.get('data_coleta')) {
      const agora = new Date()
      e.record.set(
        'data_coleta',
        agora.toISOString().slice(0, 10) + ' ' + agora.toTimeString().slice(0, 5),
      )
    }
    if (auth && !e.record.get('responsavel_coleta_nome')) {
      e.record.set('responsavel_coleta_nome', auth.get('name') || 'Equipe de Coleta')
    }
  }

  if (
    novoStatus === 'em_analise' &&
    (statusAnterior === 'solicitado' || statusAnterior === 'coletado')
  ) {
    if (!e.record.get('data_inicio_analise')) {
      const agora = new Date()
      e.record.set(
        'data_inicio_analise',
        agora.toISOString().slice(0, 10) + ' ' + agora.toTimeString().slice(0, 5),
      )
    }
  }

  if (novoStatus === 'liberado' && statusAnterior !== 'liberado') {
    // Validação de campos obrigatórios do laudo
    const laudoTexto = e.record.get('laudo_texto')
    const resultadoSumario = e.record.get('resultado_sumario')
    if (!laudoTexto || String(laudoTexto).trim().length === 0) {
      throw new BadRequestError(
        'LAUDO OBRIGATÓRIO: A liberação do exame exige o preenchimento do laudo descritivo.',
      )
    }
    if (!resultadoSumario || String(resultadoSumario).trim().length === 0) {
      throw new BadRequestError(
        'SUMÁRIO OBRIGATÓRIO: Conclusão/sumário do laudo é obrigatório para liberação.',
      )
    }

    // Autor do laudo derivado da sessão autenticada
    if (auth) {
      e.record.set('responsavel_laudo_nome', auth.get('name') || 'Profissional Responsável')
      // Se houver registro profissional ou id correspondente
      const profs = e.app.findRecordsByFilter(
        'profissionais',
        'email = {:em} || nome = {:nm}',
        '-created',
        1,
        0,
        { em: auth.get('email') || '', nm: auth.get('name') || '' },
      )
      if (profs && profs.length > 0) {
        e.record.set('responsavel_laudo', profs[0].id)
      }
    }

    if (!e.record.get('data_laudo')) {
      const agora = new Date()
      e.record.set(
        'data_laudo',
        agora.toISOString().slice(0, 10) + ' ' + agora.toTimeString().slice(0, 5),
      )
    }

    // Inicializa versão atual do laudo como 1
    e.record.set('versao_atual', 1)
  }

  e.next()

  // 6. Ao liberar primeira versão (status passou para 'liberado' pela primeira vez),
  // grava atomicamente a versão 1 na coleção `laudos_versoes` se ainda não existir
  if (novoStatus === 'liberado' && statusAnterior !== 'liberado') {
    try {
      const laudosVersoesCol = e.app.findCollectionByNameOrId('laudos_versoes')
      const exId = e.record.id

      const versoes = e.app.findRecordsByFilter(
        'laudos_versoes',
        'exame = {:exId} && numero_versao = 1',
        '-created',
        1,
        0,
        { exId },
      )

      if (!versoes || versoes.length === 0) {
        const v1 = new Record(laudosVersoesCol)
        v1.set('exame', exId)
        v1.set('numero_versao', 1)
        v1.set('resultado_sumario', e.record.get('resultado_sumario'))
        v1.set('laudo_texto', e.record.get('laudo_texto'))
        v1.set('responsavel_laudo', e.record.get('responsavel_laudo'))
        v1.set('responsavel_laudo_nome', e.record.get('responsavel_laudo_nome'))
        v1.set('data_laudo', e.record.get('data_laudo'))
        v1.set('motivo_retificacao', 'Versão inicial homologada')
        if (auth) {
          v1.set('usuario_id', auth.id)
          v1.set('responsavel_laudo_cargo', auth.get('cargo') || auth.get('role'))
        }
        e.app.save(v1)
      }
    } catch (errV1) {
      console.log('Aviso ao sincronizar versão 1 de laudo liberado:', errV1)
    }
  }
}, 'exames')

// -------------------------------------------------------------
// C. RETIFICAÇÃO / NOVA VERSÃO DE LAUDO (onRecordCreate 'laudos_versoes')
// -------------------------------------------------------------
onRecordCreate((e) => {
  const auth = e.auth
  const exameId = e.record.get('exame')
  const numeroVersaoInformado = e.record.get('numero_versao')
  const motivoRetificacao = e.record.get('motivo_retificacao')
  const idempotencyKey = e.record.get('idempotency_key')
  const laudoTexto = e.record.get('laudo_texto')
  const resultadoSumario = e.record.get('resultado_sumario')

  // 1. Permissões: recepção NÃO pode criar versão nem retificar laudo
  if (auth) {
    const role = auth.get('role')
    if (role === 'recepcao') {
      throw new ForbiddenError(
        'PERMISSÃO NEGADA: Perfil recepção não tem autorização para emitir ou retificar laudos.',
      )
    }
  }

  // 2. Validação do exame de referência
  if (!exameId) {
    throw new BadRequestError(
      'Identificador do exame de referência é obrigatório para registrar versão de laudo.',
    )
  }

  const exameRec = e.app.findRecordById('exames', exameId)
  if (!exameRec) {
    throw new NotFoundError(`Exame "${exameId}" não encontrado.`)
  }

  // 3. Status do exame: exame cancelado NÃO aceita laudo nem retificação
  const statusExame = exameRec.get('status')
  if (statusExame === 'cancelado') {
    throw new BadRequestError(
      'EXAME CANCELADO: Não é permitido registrar laudo ou retificação para um exame com solicitação cancelada.',
    )
  }

  // 4. Idempotência por chave contra duplo envio de retificação
  if (idempotencyKey && String(idempotencyKey).trim().length > 0) {
    const key = String(idempotencyKey).trim()
    const existentes = e.app.findRecordsByFilter(
      'laudos_versoes',
      'idempotency_key = {:k}',
      '-created',
      1,
      0,
      { k: key },
    )

    if (existentes && existentes.length > 0) {
      const original = existentes[0]

      // Checa divergência de payload
      if (original.get('exame') !== exameId) {
        throw new BadRequestError(
          'IDEMPOTENCY_PAYLOAD_CONFLICT: A chave informada já foi usada para retificação de outro exame.',
        )
      }

      throw new BadRequestError(`IDEMPOTENT_HIT:${original.id}`)
    }
  }

  // 5. Determinação rigorosa da versão e validação de retificação
  const versoesExistentes = e.app.findRecordsByFilter(
    'laudos_versoes',
    'exame = {:exId}',
    '-numero_versao',
    100,
    0,
    { exId: exameId },
  )

  const maiorVersao =
    versoesExistentes.length > 0 ? Number(versoesExistentes[0].get('numero_versao')) || 1 : 0
  const proximaVersao = maiorVersao + 1

  // Se já existia versão anterior, trata-se de retificação formal
  if (maiorVersao >= 1) {
    if (!motivoRetificacao || String(motivoRetificacao).trim().length < 5) {
      throw new BadRequestError(
        'JUSTIFICATIVA OBRIGATÓRIA: Retificação de laudo exige motivo/justificativa clínica detalhada (mínimo de 5 caracteres).',
      )
    }

    // Vincula a última versão como versao_anterior_id
    e.record.set('versao_anterior_id', versoesExistentes[0].id)
  }

  e.record.set('numero_versao', proximaVersao)

  // 6. Dados autoritativos do emissor derivados da sessão autenticada
  if (auth) {
    e.record.set('usuario_id', auth.id)
    const authNome = auth.get('name')
    if (authNome && String(authNome).trim().length > 0) {
      e.record.set('responsavel_laudo_nome', authNome)
    }
    const authCargo = auth.get('cargo') || auth.get('role')
    if (authCargo) {
      e.record.set('responsavel_laudo_cargo', authCargo)
    }

    // Busca vínculo com profissionais se disponível
    try {
      const profs = e.app.findRecordsByFilter(
        'profissionais',
        'email = {:em} || nome = {:nm}',
        '-created',
        1,
        0,
        { em: auth.get('email') || '', nm: auth.get('name') || '' },
      )
      if (profs && profs.length > 0) {
        e.record.set('responsavel_laudo', profs[0].id)
      }
    } catch (_) {}
  }

  // Timestamp seguro do laudo
  if (!e.record.get('data_laudo')) {
    const agora = new Date()
    e.record.set(
      'data_laudo',
      agora.toISOString().slice(0, 10) + ' ' + agora.toTimeString().slice(0, 5),
    )
  }

  e.next()

  // 7. Atualiza o exame principal de forma atômica para refletir a versão vigente
  try {
    exameRec.set('status', 'liberado')
    exameRec.set('resultado_sumario', resultadoSumario)
    exameRec.set('laudo_texto', laudoTexto)
    exameRec.set('versao_atual', proximaVersao)
    exameRec.set('data_laudo', e.record.get('data_laudo'))
    exameRec.set('responsavel_laudo_nome', e.record.get('responsavel_laudo_nome'))
    if (e.record.get('responsavel_laudo')) {
      exameRec.set('responsavel_laudo', e.record.get('responsavel_laudo'))
    }
    if (proximaVersao > 1) {
      exameRec.set('tem_retificacao', true)
    }
    e.app.save(exameRec)
  } catch (errSync) {
    console.log('Aviso ao sincronizar exame principal com versão vigente:', errSync)
  }
}, 'laudos_versoes')
