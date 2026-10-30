/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Segurança, Integridade Server-Side e Transações: Transporte Sanitário Interno
 * Referência: ANEXO I - DOC-02 Seção 7.4.4.2.a-b (pp. 27-29) e itens não amarelos
 *
 * Regras Obrigatórias Implementadas:
 * 1. Autor derivado da sessão (@request.auth.id), nunca confiando cegamente no payload do cliente.
 * 2. Vínculo paciente validado no banco de dados (`pacientes`).
 * 3. Validação de conflitos de agenda (sobreposição de horários) para veículo e motorista ao programar/atualizar viagem:
 *    - Rejeita se veículo ou motorista já estiver vinculado a outra viagem não-cancelada no mesmo intervalo.
 *    - Sinaliza e bloqueia se o veículo estiver em status de manutenção, indisponível ou inativo.
 *    - Sinaliza e bloqueia se o motorista estiver inativo ou com CNH vencida na data da viagem.
 * 4. Validação de lotação por trecho (ida e volta separadamente):
 *    - Capacidade definida no veículo da viagem.
 *    - Acompanhante ocupa vaga separada explicitamente (vagas_ida e vagas_volta).
 *    - Grupo de acompanhantes não pode consumir vaga invisível; cada vaga é contabilizada.
 * 5. Reserva de vagas ATÔMICA com idempotência persistente via transação `$app.runInTransaction`:
 *    - Endpoint dedicado POST /backend/v1/transporte/reservar-vagas
 *    - Reenvio com mesma chave devolve reserva existente sem duplicar;
 *    - Bloqueia com IDEMPOTENCY_PAYLOAD_CONFLICT se mesma chave vier com dados conflitantes.
 * 6. Validação e cálculo de quilometragem:
 *    - Km inicial e final não podem ser negativos;
 *    - Km final deve ser >= Km inicial;
 *    - Ausente é tratado como ausente (null/vazio), NUNCA transformado em zero.
 * 7. Inativação / cancelamento AUDITADOS:
 *    - Proibição de exclusão física (onRecordDelete rejeita).
 *    - Cancelamento de viagens e reservas exige motivo formal com registro do autor da sessão.
 */

// ----------------------------------------------------------------------------
// B. Validação ao Criar / Atualizar Viagem (transporte_viagens)
// ----------------------------------------------------------------------------
onRecordCreate((e) => {
  function sanitizarTexto(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  function parseDataIsoMs(dataStr) {
    if (!dataStr) return null
    var s = String(dataStr).trim()
    var d = new Date(s)
    var ms = d.getTime()
    return isNaN(ms) ? null : ms
  }

  function intervalosSobrepostos(iniA, fimA, iniB, fimB) {
    return iniA < fimB && iniB < fimA
  }

  var auth = e.auth
  if (!auth) {
    throw new ForbiddenError('Operação não autorizada: sessão de usuário ausente.')
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    throw new ForbiddenError(
      'Acesso negado: Perfil de recepção possui apenas permissão de consulta administrativa de transporte.',
    )
  }

  // 1. Autor derivado da sessão
  e.record.set('usuario_autor_id', auth.id)

  // 2. Validações de datas
  var saidaStr = e.record.getString('data_saida')
  var retornoStr = e.record.getString('data_retorno_previsto')

  var saidaMs = parseDataIsoMs(saidaStr)
  var retornoMs = parseDataIsoMs(retornoStr)

  if (!saidaMs || !retornoMs) {
    throw new BadRequestError('Data de saída e data prevista de retorno válidas são obrigatórias.')
  }

  if (retornoMs <= saidaMs) {
    throw new BadRequestError(
      'A data prevista de retorno deve ser posterior à data de saída da viagem.',
    )
  }

  // 3. Validação do Veículo e seu Status
  var veiculoId = e.record.getString('veiculo')
  if (!veiculoId) {
    throw new BadRequestError('É obrigatório informar o veículo da viagem.')
  }

  var veiculoRec
  try {
    veiculoRec = e.app.findRecordById('transporte_veiculos', veiculoId)
  } catch (_) {
    throw new BadRequestError('O veículo informado não foi localizado no cadastro.')
  }

  if (!veiculoRec.getBool('ativo')) {
    throw new BadRequestError('O veículo selecionado está inativo no sistema.')
  }

  var statusVeiculo = veiculoRec.getString('status')
  if (
    statusVeiculo === 'manutencao' ||
    statusVeiculo === 'indisponivel' ||
    statusVeiculo === 'inativo'
  ) {
    var motivoIndisp = veiculoRec.getString('motivo_indisponibilidade')
    var detalheMotivo = motivoIndisp ? ' (' + motivoIndisp + ')' : ''
    throw new BadRequestError(
      'O veículo ' +
        veiculoRec.getString('placa') +
        ' está indisponível para viagens no momento' +
        detalheMotivo +
        '. Situação: ' +
        statusVeiculo.toUpperCase() +
        '.',
    )
  }

  // 4. Validação do Motorista e Validade de CNH
  var motoristaId = e.record.getString('motorista')
  if (!motoristaId) {
    throw new BadRequestError('É obrigatório informar o motorista da viagem.')
  }

  var motoristaRec
  try {
    motoristaRec = e.app.findRecordById('transporte_motoristas', motoristaId)
  } catch (_) {
    throw new BadRequestError('O motorista informado não foi localizado no cadastro.')
  }

  if (!motoristaRec.getBool('ativo')) {
    throw new BadRequestError('O motorista selecionado está inativo no cadastro do sistema.')
  }

  var cnhVencimento = motoristaRec.getString('cnh_vencimento')
  if (cnhVencimento) {
    var dataVenc = new Date(cnhVencimento + 'T23:59:59Z').getTime()
    if (!isNaN(dataVenc) && dataVenc < saidaMs) {
      throw new BadRequestError(
        'A CNH do motorista ' +
          motoristaRec.getString('nome') +
          ' estará vencida na data da viagem (Vencimento: ' +
          cnhVencimento +
          '). Regularize a habilitação antes de escalá-lo.',
      )
    }
  }

  // 5. Validação de Conflito de Agenda (Veículo e Motorista)
  var viagensExistentes = e.app.findRecordsByFilter(
    'transporte_viagens',
    'status != "cancelada" && (veiculo = {:v} || motorista = {:m})',
    '-created',
    100,
    0,
    { v: veiculoId, m: motoristaId },
  )

  for (var i = 0; i < viagensExistentes.length; i++) {
    var vExist = viagensExistentes[i]
    var vSaidaMs = parseDataIsoMs(vExist.getString('data_saida'))
    var vRetornoMs = parseDataIsoMs(
      vExist.getString('data_retorno_real') || vExist.getString('data_retorno_previsto'),
    )

    if (vSaidaMs && vRetornoMs && intervalosSobrepostos(saidaMs, retornoMs, vSaidaMs, vRetornoMs)) {
      if (vExist.getString('veiculo') === veiculoId) {
        throw new BadRequestError(
          'CONFLITO DE AGENDA: O veículo (' +
            veiculoRec.getString('placa') +
            ') já está escalado para a viagem "' +
            vExist.getString('codigo_viagem') +
            '" no período informado (' +
            vExist.getString('data_saida') +
            ' a ' +
            vExist.getString('data_retorno_previsto') +
            ').',
        )
      }
      if (vExist.getString('motorista') === motoristaId) {
        throw new BadRequestError(
          'CONFLITO DE AGENDA: O motorista (' +
            motoristaRec.getString('nome') +
            ') já está escalado para a viagem "' +
            vExist.getString('codigo_viagem') +
            '" no período informado (' +
            vExist.getString('data_saida') +
            ' a ' +
            vExist.getString('data_retorno_previsto') +
            ').',
        )
      }
    }
  }

  // 6. Validação de KM (rejeita negativo, trata ausente como ausente)
  var kmInicial = e.record.get('km_inicial')
  var kmFinal = e.record.get('km_final')

  if (kmInicial !== null && kmInicial !== undefined && kmInicial !== '') {
    var numKmIni = Number(kmInicial)
    if (isNaN(numKmIni) || numKmIni < 0) {
      throw new BadRequestError('O Km inicial não pode ser negativo.')
    }
    e.record.set('km_inicial', numKmIni)
  }

  if (kmFinal !== null && kmFinal !== undefined && kmFinal !== '') {
    var numKmFim = Number(kmFinal)
    if (isNaN(numKmFim) || numKmFim < 0) {
      throw new BadRequestError('O Km final não pode ser negativo.')
    }
    e.record.set('km_final', numKmFim)

    if (kmInicial !== null && kmInicial !== undefined && kmInicial !== '') {
      var numKmIni2 = Number(kmInicial)
      if (numKmFim < numKmIni2) {
        throw new BadRequestError('O Km final não pode ser menor que o Km inicial.')
      }
      e.record.set('km_rodado', numKmFim - numKmIni2)
    }
  }

  // Status padrão
  if (!e.record.getString('status')) {
    e.record.set('status', 'programada')
  }

  e.next()
}, 'transporte_viagens')

onRecordUpdate((e) => {
  function sanitizarTexto(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  function parseDataIsoMs(dataStr) {
    if (!dataStr) return null
    var s = String(dataStr).trim()
    var d = new Date(s)
    var ms = d.getTime()
    return isNaN(ms) ? null : ms
  }

  function intervalosSobrepostos(iniA, fimA, iniB, fimB) {
    return iniA < fimB && iniB < fimA
  }

  var auth = e.auth
  if (!auth) {
    throw new ForbiddenError('Operação não autorizada: sessão de usuário ausente.')
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    throw new ForbiddenError(
      'Acesso negado: Perfil de recepção possui apenas permissão de consulta administrativa de transporte.',
    )
  }

  var original = e.record.original()
  if (!original) {
    e.next()
    return
  }

  var statusAnt = original.getString('status')
  var statusNovo = e.record.getString('status')

  // 1. Viagem cancelada é terminal
  if (statusAnt === 'cancelada') {
    throw new BadRequestError(
      'A viagem está cancelada e seu registro é imutável. Não é permitida reativação.',
    )
  }

  // 2. Cancelamento auditado
  if (statusNovo === 'cancelada' && statusAnt !== 'cancelada') {
    var motivo = sanitizarTexto(e.record.getString('motivo_cancelamento'))
    if (!motivo || motivo.length < 5) {
      throw new BadRequestError(
        'O cancelamento da viagem exige justificativa/motivo formal com no mínimo 5 caracteres.',
      )
    }
    e.record.set('cancelado_por_id', auth.id)
    if (!e.record.getString('data_cancelamento')) {
      e.record.set('data_cancelamento', new Date().toISOString())
    }
  }

  // 3. Validação de KM
  var kmInicial = e.record.get('km_inicial')
  var kmFinal = e.record.get('km_final')

  if (kmInicial !== null && kmInicial !== undefined && kmInicial !== '') {
    var numKmIni = Number(kmInicial)
    if (isNaN(numKmIni) || numKmIni < 0) {
      throw new BadRequestError('O Km inicial não pode ser negativo.')
    }
  }

  if (kmFinal !== null && kmFinal !== undefined && kmFinal !== '') {
    var numKmFim = Number(kmFinal)
    if (isNaN(numKmFim) || numKmFim < 0) {
      throw new BadRequestError('O Km final não pode ser negativo.')
    }
    if (kmInicial !== null && kmInicial !== undefined && kmInicial !== '') {
      var numKmIni2 = Number(kmInicial)
      if (numKmFim < numKmIni2) {
        throw new BadRequestError('O Km final não pode ser menor que o Km inicial.')
      }
      e.record.set('km_rodado', numKmFim - numKmIni2)
    }
  }

  // 4. Se alterou horários ou veículo/motorista, valida sobreposição
  var mudouHorario =
    e.record.getString('data_saida') !== original.getString('data_saida') ||
    e.record.getString('data_retorno_previsto') !== original.getString('data_retorno_previsto')
  var mudouVeiculo = e.record.getString('veiculo') !== original.getString('veiculo')
  var mudouMotorista = e.record.getString('motorista') !== original.getString('motorista')

  if ((mudouHorario || mudouVeiculo || mudouMotorista) && statusNovo !== 'cancelada') {
    var saidaMs = parseDataIsoMs(e.record.getString('data_saida'))
    var retornoMs = parseDataIsoMs(e.record.getString('data_retorno_previsto'))

    if (retornoMs <= saidaMs) {
      throw new BadRequestError(
        'A data prevista de retorno deve ser posterior à data de saída da viagem.',
      )
    }

    var veiculoId = e.record.getString('veiculo')
    var motoristaId = e.record.getString('motorista')

    var viagensExistentes = e.app.findRecordsByFilter(
      'transporte_viagens',
      'id != {:id} && status != "cancelada" && (veiculo = {:v} || motorista = {:m})',
      '-created',
      100,
      0,
      { id: e.record.id, v: veiculoId, m: motoristaId },
    )

    for (var i = 0; i < viagensExistentes.length; i++) {
      var vExist = viagensExistentes[i]
      var vSaidaMs = parseDataIsoMs(vExist.getString('data_saida'))
      var vRetornoMs = parseDataIsoMs(
        vExist.getString('data_retorno_real') || vExist.getString('data_retorno_previsto'),
      )

      if (
        vSaidaMs &&
        vRetornoMs &&
        intervalosSobrepostos(saidaMs, retornoMs, vSaidaMs, vRetornoMs)
      ) {
        if (vExist.getString('veiculo') === veiculoId) {
          throw new BadRequestError(
            'CONFLITO DE AGENDA: O veículo já está escalado para outra viagem no período.',
          )
        }
        if (vExist.getString('motorista') === motoristaId) {
          throw new BadRequestError(
            'CONFLITO DE AGENDA: O motorista já está escalado para outra viagem no período.',
          )
        }
      }
    }
  }

  e.next()
}, 'transporte_viagens')

// ----------------------------------------------------------------------------
// C. Validação ao Vincular Passageiro / Vagas (transporte_passageiros)
// ----------------------------------------------------------------------------
onRecordCreate((e) => {
  function sanitizarTexto(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = e.auth
  if (!auth) {
    throw new ForbiddenError('Operação não autorizada: sessão de usuário ausente.')
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    throw new ForbiddenError(
      'Acesso negado: Perfil de recepção possui apenas permissão de consulta administrativa de transporte.',
    )
  }

  // 1. Autor derivado da sessão
  e.record.set('usuario_autor_id', auth.id)

  var viagemId = e.record.getString('viagem')
  if (!viagemId) {
    throw new BadRequestError('É obrigatório vincular o passageiro a uma viagem.')
  }

  var viagemRec
  try {
    viagemRec = e.app.findRecordById('transporte_viagens', viagemId)
  } catch (_) {
    throw new BadRequestError('Viagem informada não foi localizada no sistema.')
  }

  if (viagemRec.getString('status') === 'cancelada') {
    throw new BadRequestError('Não é permitido incluir passageiros em uma viagem cancelada.')
  }

  // 2. Validação de Vínculo de Paciente no Banco
  var tipoPassageiro = e.record.getString('tipo_passageiro') || 'paciente'
  var pacienteId = e.record.getString('paciente')

  if (tipoPassageiro === 'paciente') {
    if (!pacienteId) {
      throw new BadRequestError(
        'Para passageiro do tipo Paciente, a seleção do paciente é obrigatória.',
      )
    }
    var pacRec
    try {
      pacRec = e.app.findRecordById('pacientes', pacienteId)
    } catch (_) {
      throw new BadRequestError('Paciente informado não foi localizado no cadastro oficial.')
    }

    if (!e.record.getString('nome_completo')) {
      e.record.set('nome_completo', pacRec.getString('nome'))
    }
    if (!e.record.getString('documento_numero')) {
      e.record.set(
        'documento_numero',
        pacRec.getString('cpf') || pacRec.getString('cartao_sus') || '',
      )
    }
    if (!e.record.getString('telefone')) {
      e.record.set('telefone', pacRec.getString('telefone') || '')
    }
  } else if (tipoPassageiro === 'acompanhante') {
    var nomeAcomp = sanitizarTexto(e.record.getString('nome_completo'))
    if (!nomeAcomp || nomeAcomp.length < 2) {
      throw new BadRequestError('Para acompanhante, o nome completo é obrigatório.')
    }
  }

  // 3. Regras de Vagas por Trecho (Ida e Volta separadamente)
  var trecho = e.record.getString('trecho') || 'ida_e_volta'
  var vagasIda = e.record.getInt('vagas_ida')
  var vagasVolta = e.record.getInt('vagas_volta')

  if (trecho === 'ida') {
    vagasIda = vagasIda > 0 ? vagasIda : 1
    vagasVolta = 0
  } else if (trecho === 'volta') {
    vagasIda = 0
    vagasVolta = vagasVolta > 0 ? vagasVolta : 1
  } else {
    // ida_e_volta
    vagasIda = vagasIda > 0 ? vagasIda : 1
    vagasVolta = vagasVolta > 0 ? vagasVolta : 1
  }

  e.record.set('vagas_ida', vagasIda)
  e.record.set('vagas_volta', vagasVolta)

  // 4. Verificação de Lotação Máxima da Viagem por Trecho
  var veiculoViagemId = viagemRec.getString('veiculo')
  var veiculoRec = e.app.findRecordById('transporte_veiculos', veiculoViagemId)
  var lotacaoMax = veiculoRec.getInt('capacidade_lotacao') || 0

  var passageirosAtuais = e.app.findRecordsByFilter(
    'transporte_passageiros',
    'viagem = {:viagem} && status != "cancelado"',
    '-created',
    500,
    0,
    { viagem: viagemId },
  )

  var totalIdaOcupado = 0
  var totalVoltaOcupado = 0

  for (var p = 0; p < passageirosAtuais.length; p++) {
    var pass = passageirosAtuais[p]
    totalIdaOcupado += pass.getInt('vagas_ida')
    totalVoltaOcupado += pass.getInt('vagas_volta')
  }

  if (totalIdaOcupado + vagasIda > lotacaoMax) {
    throw new BadRequestError(
      'CAPACIDADE EXCEDIDA (TRECHO IDA): O veículo comporta ' +
        lotacaoMax +
        ' passageiros. Vagas ocupadas: ' +
        totalIdaOcupado +
        ', solicitadas: ' +
        vagasIda +
        '. Vagas insuficientes na ida.',
    )
  }

  if (totalVoltaOcupado + vagasVolta > lotacaoMax) {
    throw new BadRequestError(
      'CAPACIDADE EXCEDIDA (TRECHO VOLTA): O veículo comporta ' +
        lotacaoMax +
        ' passageiros. Vagas ocupadas: ' +
        totalVoltaOcupado +
        ', solicitadas: ' +
        vagasVolta +
        '. Vagas insuficientes na volta.',
    )
  }

  // 5. Idempotência por chave persistente
  var idempKey = sanitizarTexto(e.record.getString('idempotency_key'))
  if (idempKey) {
    var existentes = e.app.findRecordsByFilter(
      'transporte_passageiros',
      'idempotency_key = {:key}',
      '-created',
      1,
      0,
      { key: idempKey },
    )
    if (existentes && existentes.length > 0) {
      var existRec = existentes[0]
      if (
        existRec.getString('viagem') !== viagemId ||
        existRec.getString('paciente') !== (pacienteId || '') ||
        existRec.getString('trecho') !== trecho
      ) {
        throw new BadRequestError(
          'IDEMPOTENCY_PAYLOAD_CONFLICT: A chave de idempotência já foi utilizada com dados divergentes.',
        )
      }
      throw new BadRequestError('IDEMPOTENT_HIT:' + existRec.id)
    }
  }

  if (!e.record.getString('status')) {
    e.record.set('status', 'agendado')
  }

  e.next()
}, 'transporte_passageiros')

onRecordUpdate((e) => {
  function sanitizarTexto(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = e.auth
  if (!auth) {
    throw new ForbiddenError('Operação não autorizada: sessão de usuário ausente.')
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    throw new ForbiddenError(
      'Acesso negado: Perfil de recepção possui apenas permissão de consulta administrativa de transporte.',
    )
  }

  var original = e.record.original()
  if (!original) {
    e.next()
    return
  }

  var statusAnt = original.getString('status')
  var statusNovo = e.record.getString('status')

  // 1. Passageiro cancelado é imutável
  if (statusAnt === 'cancelado') {
    throw new BadRequestError(
      'O vínculo do passageiro está cancelado e é imutável. Não é permitido reativar reserva cancelada.',
    )
  }

  // 2. Cancelamento auditado
  if (statusNovo === 'cancelado' && statusAnt !== 'cancelado') {
    var motivo = sanitizarTexto(e.record.getString('motivo_cancelamento'))
    if (!motivo || motivo.length < 5) {
      throw new BadRequestError(
        'O cancelamento da reserva de vaga exige justificativa/motivo formal com no mínimo 5 caracteres.',
      )
    }
    e.record.set('cancelado_por_id', auth.id)
    if (!e.record.getString('data_cancelamento')) {
      e.record.set('data_cancelamento', new Date().toISOString())
    }
  }

  // 3. Se alterou vagas ou trecho, recalcula lotação
  var mudouVagas =
    e.record.getInt('vagas_ida') !== original.getInt('vagas_ida') ||
    e.record.getInt('vagas_volta') !== original.getInt('vagas_volta') ||
    e.record.getString('trecho') !== original.getString('trecho')

  if (mudouVagas && statusNovo !== 'cancelado') {
    var viagemId = e.record.getString('viagem')
    var viagemRec = e.app.findRecordById('transporte_viagens', viagemId)
    var veiculoRec = e.app.findRecordById('transporte_veiculos', viagemRec.getString('veiculo'))
    var lotacaoMax = veiculoRec.getInt('capacidade_lotacao') || 0

    var passageirosAtuais = e.app.findRecordsByFilter(
      'transporte_passageiros',
      'id != {:id} && viagem = {:viagem} && status != "cancelado"',
      '-created',
      500,
      0,
      { id: e.record.id, viagem: viagemId },
    )

    var totalIdaOcupado = 0
    var totalVoltaOcupado = 0

    for (var p = 0; p < passageirosAtuais.length; p++) {
      var pass = passageirosAtuais[p]
      totalIdaOcupado += pass.getInt('vagas_ida')
      totalVoltaOcupado += pass.getInt('vagas_volta')
    }

    var novasVagasIda = e.record.getInt('vagas_ida')
    var novasVagasVolta = e.record.getInt('vagas_volta')

    if (totalIdaOcupado + novasVagasIda > lotacaoMax) {
      throw new BadRequestError('CAPACIDADE EXCEDIDA: Vagas insuficientes na ida após alteração.')
    }
    if (totalVoltaOcupado + novasVagasVolta > lotacaoMax) {
      throw new BadRequestError('CAPACIDADE EXCEDIDA: Vagas insuficientes na volta após alteração.')
    }
  }

  e.next()
}, 'transporte_passageiros')

// ----------------------------------------------------------------------------
// D. Proibição de Exclusão Física (Auditoria e Guarda SUS)
// ----------------------------------------------------------------------------
onRecordDelete((e) => {
  throw new ForbiddenError(
    'Viagens de transporte sanitário não podem ser excluídas fisicamente. Utilize o cancelamento auditado para preservar os históricos operacionais.',
  )
}, 'transporte_viagens')

onRecordDelete((e) => {
  throw new ForbiddenError(
    'Vínculos de passageiros e reservas de vagas não podem ser excluídos fisicamente. Utilize cancelamento auditado.',
  )
}, 'transporte_passageiros')

onRecordDelete((e) => {
  throw new ForbiddenError(
    'Veículos cadastrados não podem ser excluídos. Inative o cadastro para preservar a rastreabilidade das viagens.',
  )
}, 'transporte_veiculos')

onRecordDelete((e) => {
  throw new ForbiddenError(
    'Motoristas cadastrados não podem ser excluídos. Inative o cadastro para preservar a rastreabilidade das viagens.',
  )
}, 'transporte_motoristas')

// ----------------------------------------------------------------------------
// E. Endpoint Atômico e Idempotente para Reserva de Vagas
// POST /backend/v1/transporte/reservar-vagas
// ----------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/transporte/reservar-vagas', (c) => {
  function sanitizarTexto(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado: faça login para acessar o serviço de transporte.' })
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    return c.json(403, {
      erro: 'Perfil de recepção não possui permissão para reservar vagas no transporte.',
    })
  }

  var reqInfo = c.requestInfo()
  var payload = reqInfo && reqInfo.body ? reqInfo.body : {}
  var viagemId = sanitizarTexto(payload.viagem_id)
  var pacienteId = sanitizarTexto(payload.paciente_id)
  var nomeCompleto = sanitizarTexto(payload.nome_completo)
  var tipoPassageiro = sanitizarTexto(payload.tipo_passageiro) || 'paciente'
  var trecho = sanitizarTexto(payload.trecho) || 'ida_e_volta'
  var acompanhantes = payload.acompanhantes || [] // array de { nome_completo, documento_numero, telefone }
  var idempotencyKey = sanitizarTexto(payload.idempotency_key)

  if (!viagemId) {
    return c.json(400, { erro: 'Parâmetro viagem_id é obrigatório.' })
  }

  // 1. Verificação prévia de idempotência
  if (idempotencyKey) {
    try {
      var passExistentes = c.app.findRecordsByFilter(
        'transporte_passageiros',
        'idempotency_key = {:k}',
        '-created',
        10,
        0,
        { k: idempotencyKey },
      )
      if (passExistentes && passExistentes.length > 0) {
        var pPrincipal = passExistentes[0]
        if (
          pPrincipal.getString('viagem') !== viagemId ||
          pPrincipal.getString('paciente') !== (pacienteId || '')
        ) {
          return c.json(409, {
            erro: 'IDEMPOTENCY_PAYLOAD_CONFLICT: A mesma chave já foi utilizada com parâmetros divergentes.',
          })
        }
        var idsExistentes = []
        for (var ex = 0; ex < passExistentes.length; ex++) {
          idsExistentes.push(passExistentes[ex].id)
        }
        return c.json(200, {
          sucesso: true,
          idempotente: true,
          ids_reservas: idsExistentes,
          viagem_id: viagemId,
          mensagem: 'Reserva já efetuada previamente para esta chave de idempotência.',
        })
      }
    } catch (_) {}
  }

  var resultadoReserva = null

  try {
    c.app.runInTransaction((txApp) => {
      // 1. Busca viagem e veículo
      var viagemRec = txApp.findRecordById('transporte_viagens', viagemId)
      if (viagemRec.getString('status') === 'cancelada') {
        throw new Error('A viagem selecionada está cancelada. Não é possível reservar vagas.')
      }

      var veiculoRec = txApp.findRecordById('transporte_veiculos', viagemRec.getString('veiculo'))
      var lotacaoMax = veiculoRec.getInt('capacidade_lotacao') || 0

      // 2. Calcula ocupação atual da viagem
      var ocupados = txApp.findRecordsByFilter(
        'transporte_passageiros',
        'viagem = {:viagem} && status != "cancelado"',
        '-created',
        500,
        0,
        { viagem: viagemId },
      )

      var totalOcupadoIda = 0
      var totalOcupadoVolta = 0
      for (var o = 0; o < ocupados.length; o++) {
        totalOcupadoIda += ocupados[o].getInt('vagas_ida')
        totalOcupadoVolta += ocupados[o].getInt('vagas_volta')
      }

      // 3. Calcula total de vagas demandadas nesta requisição
      // Cada acompanhante ocupa 1 vaga explicitamente! Grupo não consome vaga invisível.
      var qtdPessoas = 1 + acompanhantes.length
      var demandaIda = trecho === 'ida' || trecho === 'ida_e_volta' ? qtdPessoas : 0
      var demandaVolta = trecho === 'volta' || trecho === 'ida_e_volta' ? qtdPessoas : 0

      if (totalOcupadoIda + demandaIda > lotacaoMax) {
        throw new Error(
          'LOTAÇÃO ESGOTADA (IDA): Capacidade: ' +
            lotacaoMax +
            ', Vagas ocupadas: ' +
            totalOcupadoIda +
            ', Vagas requeridas: ' +
            demandaIda +
            '.',
        )
      }

      if (totalOcupadoVolta + demandaVolta > lotacaoMax) {
        throw new Error(
          'LOTAÇÃO ESGOTADA (VOLTA): Capacidade: ' +
            lotacaoMax +
            ', Vagas ocupadas: ' +
            totalOcupadoVolta +
            ', Vagas requeridas: ' +
            demandaVolta +
            '.',
        )
      }

      var colPass = txApp.findCollectionByNameOrId('transporte_passageiros')
      var idsCriados = []

      // 4. Cria registro do passageiro principal
      var recPrincipal = new Record(colPass)
      recPrincipal.set('viagem', viagemId)
      if (pacienteId) {
        recPrincipal.set('paciente', pacienteId)
      }
      recPrincipal.set('nome_completo', nomeCompleto || 'Paciente sem nome informado')
      recPrincipal.set('documento_tipo', payload.documento_tipo || '')
      recPrincipal.set('documento_numero', payload.documento_numero || '')
      recPrincipal.set('telefone', payload.telefone || '')
      recPrincipal.set('tipo_passageiro', tipoPassageiro)
      recPrincipal.set('trecho', trecho)
      recPrincipal.set('vagas_ida', trecho === 'ida' || trecho === 'ida_e_volta' ? 1 : 0)
      recPrincipal.set('vagas_volta', trecho === 'volta' || trecho === 'ida_e_volta' ? 1 : 0)
      recPrincipal.set('local_embarque', payload.local_embarque || '')
      recPrincipal.set('local_desembarque', payload.local_desembarque || '')
      recPrincipal.set('status', 'agendado')
      recPrincipal.set('usuario_autor_id', auth.id)
      if (idempotencyKey) {
        recPrincipal.set('idempotency_key', idempotencyKey)
      }
      txApp.save(recPrincipal)
      idsCriados.push(recPrincipal.id)

      // 5. Cria registros individuais para cada acompanhante (vagas separadas e explícitas)
      for (var a = 0; a < acompanhantes.length; a++) {
        var acomp = acompanhantes[a]
        var recAcomp = new Record(colPass)
        recAcomp.set('viagem', viagemId)
        recAcomp.set('paciente_vinculado', recPrincipal.id)
        recAcomp.set('nome_completo', acomp.nome_completo || 'Acompanhante ' + (a + 1))
        recAcomp.set('documento_tipo', acomp.documento_tipo || 'CPF')
        recAcomp.set('documento_numero', acomp.documento_numero || '')
        recAcomp.set('telefone', acomp.telefone || payload.telefone || '')
        recAcomp.set('tipo_passageiro', 'acompanhante')
        recAcomp.set('trecho', trecho)
        recAcomp.set('vagas_ida', trecho === 'ida' || trecho === 'ida_e_volta' ? 1 : 0)
        recAcomp.set('vagas_volta', trecho === 'volta' || trecho === 'ida_e_volta' ? 1 : 0)
        recAcomp.set('local_embarque', payload.local_embarque || '')
        recAcomp.set('local_desembarque', payload.local_desembarque || '')
        recAcomp.set('status', 'agendado')
        recAcomp.set('usuario_autor_id', auth.id)
        if (idempotencyKey) {
          recAcomp.set('idempotency_key', idempotencyKey + '_acomp_' + a)
        }
        txApp.save(recAcomp)
        idsCriados.push(recAcomp.id)
      }

      resultadoReserva = {
        viagem_id: viagemId,
        ids_reservas: idsCriados,
        vagas_ida_consumidas: demandaIda,
        vagas_volta_consumidas: demandaVolta,
        vagas_restantes_ida: lotacaoMax - (totalOcupadoIda + demandaIda),
        vagas_restantes_volta: lotacaoMax - (totalOcupadoVolta + demandaVolta),
      }
    })

    return c.json(200, {
      sucesso: true,
      mensagem: 'Vagas reservadas com sucesso na transação atômica.',
      reserva: resultadoReserva,
    })
  } catch (err) {
    var msg = err.message || String(err)
    var st = 500
    if (msg.indexOf('LOTAÇÃO ESGOTADA') !== -1 || msg.indexOf('insuficientes') !== -1) {
      st = 409
    } else if (msg.indexOf('cancelada') !== -1 || msg.indexOf('não foi localizada') !== -1) {
      st = 400
    }
    return c.json(st, { erro: msg })
  }
})
