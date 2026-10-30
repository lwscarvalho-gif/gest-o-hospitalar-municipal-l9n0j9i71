/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Segurança, Integridade Server-Side e Transações: Módulo de Processos TFD (Parte 1)
 * Referência: ANEXO I - DOC-02 Seção 7.4.4.2.e (página 30) de "módulos (1).pdf"
 *
 * Observação do JSVM do PocketBase:
 * Todas as funções utilitárias devem ser declaradas INLINE dentro de cada callback de hook / rota.
 */

// ----------------------------------------------------------------------------
// A. Validações ao Criar Processo TFD (tfd_processos)
// ----------------------------------------------------------------------------
onRecordCreate((e) => {
  function sanitizar(val) {
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
      'Acesso negado: Perfil de recepção não possui permissão para abrir processos de TFD.',
    )
  }

  // 1. Autor derivado da sessão
  e.record.set('usuario_autor_id', auth.id)
  e.record.set('ultimo_alterador_id', auth.id)
  e.record.set('data_ultima_transicao', new Date().toISOString())

  // 2. Validação do paciente
  var pacienteId = e.record.getString('paciente')
  if (!pacienteId) {
    throw new BadRequestError('O paciente vinculado ao processo de TFD é obrigatório.')
  }

  try {
    e.app.findRecordById('pacientes', pacienteId)
  } catch (_) {
    throw new BadRequestError('Paciente informado não foi localizado no cadastro oficial.')
  }

  // 3. Validação do profissional responsável
  var profId = e.record.getString('profissional_responsavel')
  if (!profId) {
    throw new BadRequestError('O profissional responsável pelo processo de TFD é obrigatório.')
  }

  try {
    e.app.findRecordById('profissionais', profId)
  } catch (_) {
    throw new BadRequestError('Profissional informado não foi localizado no cadastro.')
  }

  // 4. Campos clínicos obrigatórios
  var cid10 = sanitizar(e.record.getString('cid10'))
  if (!cid10 || cid10.length < 2) {
    throw new BadRequestError('O código CID-10 é obrigatório para abertura de processo TFD.')
  }

  var tratamento = sanitizar(e.record.getString('tratamento_solicitado'))
  if (!tratamento || tratamento.length < 2) {
    throw new BadRequestError('O tratamento solicitado é obrigatório.')
  }

  var justificativa = sanitizar(e.record.getString('justificativa_clinica'))
  if (!justificativa || justificativa.length < 5) {
    throw new BadRequestError(
      'A justificativa clínica fundamentada é obrigatória (mínimo 5 caracteres).',
    )
  }

  // 5. Estado inicial: NUNCA autoriza automaticamente!
  var status = e.record.getString('status')
  if (!status) {
    e.record.set('status', 'inconcluso')
  }

  // 6. Idempotência por chave persistente
  var idempKey = sanitizar(e.record.getString('idempotency_key'))
  if (idempKey) {
    var existentes = e.app.findRecordsByFilter(
      'tfd_processos',
      'idempotency_key = {:key}',
      '-created',
      1,
      0,
      { key: idempKey },
    )
    if (existentes && existentes.length > 0) {
      var existRec = existentes[0]
      if (existRec.getString('paciente') !== pacienteId || existRec.getString('cid10') !== cid10) {
        throw new BadRequestError(
          'IDEMPOTENCY_PAYLOAD_CONFLICT: A chave de idempotência já foi utilizada para processo divergente.',
        )
      }
      throw new BadRequestError('IDEMPOTENT_HIT:' + existRec.id)
    }
  }

  e.next()
}, 'tfd_processos')

// ----------------------------------------------------------------------------
// B. Validações e Histórico Auditável ao Atualizar Processo TFD (tfd_processos)
// ----------------------------------------------------------------------------
onRecordUpdate((e) => {
  function sanitizar(val) {
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
      'Acesso negado: Perfil de recepção não possui permissão para alterar processos de TFD.',
    )
  }

  var original = e.record.original()
  if (!original) {
    e.next()
    return
  }

  var statusAnt = original.getString('status')
  var statusNovo = e.record.getString('status')

  // Não permite alterar o paciente do processo criado
  if (e.record.getString('paciente') !== original.getString('paciente')) {
    throw new BadRequestError(
      'Violação de integridade: Não é permitido alterar o paciente de um processo de TFD existente.',
    )
  }

  // Não permite alterar o número interno após registrado
  if (e.record.getString('numero_processo') !== original.getString('numero_processo')) {
    throw new BadRequestError(
      'Violação de integridade: O número interno do processo de TFD é imutável.',
    )
  }

  // Processo cancelado é imutável
  if (statusAnt === 'cancelado') {
    throw new BadRequestError(
      'O processo de TFD está cancelado e seu registro é imutável. Não é permitida reativação.',
    )
  }

  // Se houver transição de estado, exige motivo obrigatório e grava no histórico auditável
  if (statusAnt !== statusNovo) {
    var motivo = sanitizar(e.record.getString('motivo_situacao'))
    if (!motivo || motivo.length < 5) {
      throw new BadRequestError(
        'A transição de estado do processo de TFD ("' +
          statusAnt +
          '" -> "' +
          statusNovo +
          '") exige justificativa/motivo obrigatório com no mínimo 5 caracteres.',
      )
    }

    var agoraIso = new Date().toISOString()
    e.record.set('ultimo_alterador_id', auth.id)
    e.record.set('data_ultima_transicao', agoraIso)

    // Cria registro no histórico auditável
    var colHist = e.app.findCollectionByNameOrId('tfd_historico_estados')
    var recHist = new Record(colHist)
    recHist.set('processo', e.record.id)
    recHist.set('estado_anterior', statusAnt)
    recHist.set('estado_novo', statusNovo)
    recHist.set('motivo_justificativa', motivo)
    recHist.set('observacoes', sanitizar(e.record.getString('observacoes_gerais')))
    recHist.set('usuario_autor_id', auth.id)
    recHist.set('data_hora', agoraIso)
    e.app.save(recHist)
  }

  e.next()
}, 'tfd_processos')

// ----------------------------------------------------------------------------
// C. Validação de Vínculo de Viagem ao Processo TFD (transporte_viagens)
// ----------------------------------------------------------------------------
onRecordCreate((e) => {
  var tfdId = e.record.getString('tfd_processo')
  if (tfdId) {
    try {
      e.app.findRecordById('tfd_processos', tfdId)
    } catch (_) {
      throw new BadRequestError('O processo de TFD informado para a viagem não foi localizado.')
    }
  }
  e.next()
}, 'transporte_viagens')

// Validação na criação de passageiro: se a viagem estiver vinculada a um processo TFD,
// o paciente da reserva DEVE ser rigorosamente coerente com o paciente do processo TFD!
onRecordCreate((e) => {
  var viagemId = e.record.getString('viagem')
  var tipoPassageiro = e.record.getString('tipo_passageiro') || 'paciente'
  var pacienteId = e.record.getString('paciente')

  if (viagemId && tipoPassageiro === 'paciente' && pacienteId) {
    try {
      var viagemRec = e.app.findRecordById('transporte_viagens', viagemId)
      var tfdId = viagemRec.getString('tfd_processo')
      if (tfdId) {
        var tfdRec = e.app.findRecordById('tfd_processos', tfdId)
        var pacProcessoId = tfdRec.getString('paciente')
        if (pacProcessoId && pacProcessoId !== pacienteId) {
          throw new BadRequestError(
            'INCONSISTÊNCIA DE VÍNCULO TFD: A viagem está vinculada ao Processo TFD ' +
              tfdRec.getString('numero_processo') +
              ', cujo paciente titular é diferente do paciente informado para a viagem.',
          )
        }
      }
    } catch (err) {
      if (err.status === 400 || (err.message && err.message.indexOf('INCONSISTÊNCIA') !== -1)) {
        throw err
      }
    }
  }

  e.next()
}, 'transporte_passageiros')

// ----------------------------------------------------------------------------
// D. Proibição de Exclusão Física (Auditoria e Guarda SUS)
// ----------------------------------------------------------------------------
onRecordDelete((e) => {
  throw new ForbiddenError(
    'Processos de TFD não podem ser excluídos fisicamente. Utilize o cancelamento auditado com motivo formal.',
  )
}, 'tfd_processos')

onRecordDelete((e) => {
  throw new ForbiddenError(
    'O histórico de estados do processo TFD é imutável e de guarda permanente para fins de auditoria SUS.',
  )
}, 'tfd_historico_estados')

onRecordDelete((e) => {
  throw new ForbiddenError('Registros de lotes de viagens TFD não podem ser excluídos fisicamente.')
}, 'tfd_viagens_lote')

// ----------------------------------------------------------------------------
// E. Endpoints de Consulta com Isolamento Clínico da Recepção
// GET /backend/v1/tfd/processos
// GET /backend/v1/tfd/processos/{id}
// ----------------------------------------------------------------------------
routerAdd('GET', '/backend/v1/tfd/processos', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado: faça login para acessar os processos de TFD.' })
  }

  var role = auth.getString('role')
  var isRecepcao = role === 'recepcao'

  var reqInfo = c.requestInfo()
  var query = reqInfo && reqInfo.query ? reqInfo.query : {}
  var statusFiltro = sanitizar(query.status)
  var pacienteFiltro = sanitizar(query.paciente)
  var busca = sanitizar(query.busca)
  var page = Math.max(1, parseInt(query.page, 10) || 1)
  var perPage = Math.min(100, Math.max(1, parseInt(query.perPage, 10) || 20))

  var dataInicioFiltro = sanitizar(query.data_inicio)
  var dataFimFiltro = sanitizar(query.data_fim)

  var filterParts = []
  var filterParams = {}

  if (statusFiltro && statusFiltro !== 'todos') {
    filterParts.push('status = {:status}')
    filterParams['status'] = statusFiltro
  }

  if (pacienteFiltro) {
    filterParts.push('paciente = {:paciente}')
    filterParams['paciente'] = pacienteFiltro
  }

  if (busca) {
    filterParts.push(
      '(numero_processo ~ {:busca} || tratamento_solicitado ~ {:busca} || municipio_destino ~ {:busca})',
    )
    filterParams['busca'] = busca
  }

  if (dataInicioFiltro) {
    filterParts.push('data_abertura >= {:dtIni}')
    filterParams['dtIni'] = dataInicioFiltro
  }

  if (dataFimFiltro) {
    filterParts.push('data_abertura <= {:dtFim}')
    filterParams['dtFim'] = dataFimFiltro
  }

  var filterStr = filterParts.join(' && ')
  var offset = (page - 1) * perPage

  try {
    var records = c.app.findRecordsByFilter(
      'tfd_processos',
      filterStr,
      '-created',
      perPage,
      offset,
      filterParams,
    )
    var total = c.app.countRecords('tfd_processos', filterStr, filterParams)

    var items = []
    for (var i = 0; i < records.length; i++) {
      var r = records[i]
      var itemObj = {
        id: r.id,
        numero_processo: r.getString('numero_processo'),
        data_abertura: r.getString('data_abertura'),
        paciente: r.getString('paciente'),
        profissional_responsavel: r.getString('profissional_responsavel'),
        tratamento_solicitado: r.getString('tratamento_solicitado'),
        tipo_atendimento: r.getString('tipo_atendimento'),
        status: r.getString('status'),
        motivo_situacao: r.getString('motivo_situacao'),
        observacoes_gerais: r.getString('observacoes_gerais'),
        municipio_destino: r.getString('municipio_destino'),
        estabelecimento_destino: r.getString('estabelecimento_destino'),
        tipo_transporte_recomendado: r.getString('tipo_transporte_recomendado'),
        exige_acompanhante: r.getBool('exige_acompanhante'),
        usuario_autor_id: r.getString('usuario_autor_id'),
        data_ultima_transicao: r.getString('data_ultima_transicao'),
        is_renovacao: r.getBool('is_renovacao'),
        processo_anterior_ref: r.getString('processo_anterior_ref'),
        created: r.getString('created'),
        updated: r.getString('updated'),
      }

      // ISOLAMENTO DE DADOS CLÍNICOS:
      // Se for recepção, NÃO expõe justificativa_clinica, CID-10 nem justificativa_acompanhante
      if (isRecepcao) {
        itemObj.cid10 = '[DADO CLÍNICO RESTRITO]'
        itemObj.justificativa_clinica = '[DADO CLÍNICO RESTRITO - PERFIL ASSISTENCIAL]'
        itemObj.justificativa_acompanhante = '[DADO RESTRITO]'
      } else {
        itemObj.cid10 = r.getString('cid10')
        itemObj.justificativa_clinica = r.getString('justificativa_clinica')
        itemObj.justificativa_acompanhante = r.getString('justificativa_acompanhante')
      }

      items.push(itemObj)
    }

    return c.json(200, {
      items: items,
      page: page,
      perPage: perPage,
      totalItems: total,
      totalPages: Math.ceil(total / perPage),
      isolamento_clinico_aplicado: isRecepcao,
    })
  } catch (err) {
    return c.json(500, { erro: err.message || String(err) })
  }
})

routerAdd('GET', '/backend/v1/tfd/processos/{id}', (c) => {
  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado: faça login para acessar o processo de TFD.' })
  }

  var id = c.request.pathValue('id')
  var role = auth.getString('role')
  var isRecepcao = role === 'recepcao'

  try {
    var r = c.app.findRecordById('tfd_processos', id)
    var itemObj = {
      id: r.id,
      numero_processo: r.getString('numero_processo'),
      data_abertura: r.getString('data_abertura'),
      paciente: r.getString('paciente'),
      profissional_responsavel: r.getString('profissional_responsavel'),
      tratamento_solicitado: r.getString('tratamento_solicitado'),
      tipo_atendimento: r.getString('tipo_atendimento'),
      status: r.getString('status'),
      motivo_situacao: r.getString('motivo_situacao'),
      observacoes_gerais: r.getString('observacoes_gerais'),
      municipio_destino: r.getString('municipio_destino'),
      estabelecimento_destino: r.getString('estabelecimento_destino'),
      tipo_transporte_recomendado: r.getString('tipo_transporte_recomendado'),
      exige_acompanhante: r.getBool('exige_acompanhante'),
      usuario_autor_id: r.getString('usuario_autor_id'),
      data_ultima_transicao: r.getString('data_ultima_transicao'),
      is_renovacao: r.getBool('is_renovacao'),
      processo_anterior_ref: r.getString('processo_anterior_ref'),
      created: r.getString('created'),
      updated: r.getString('updated'),
    }

    if (isRecepcao) {
      itemObj.cid10 = '[DADO CLÍNICO RESTRITO]'
      itemObj.justificativa_clinica = '[DADO CLÍNICO RESTRITO - PERFIL ASSISTENCIAL]'
      itemObj.justificativa_acompanhante = '[DADO RESTRITO]'
    } else {
      itemObj.cid10 = r.getString('cid10')
      itemObj.justificativa_clinica = r.getString('justificativa_clinica')
      itemObj.justificativa_acompanhante = r.getString('justificativa_acompanhante')
    }

    return c.json(200, itemObj)
  } catch (err) {
    return c.json(404, { erro: 'Processo de TFD não localizado.' })
  }
})

// ----------------------------------------------------------------------------
// F. Endpoint Transição Formal de Estado (Humano Autorizado + Motivo Obrigatório)
// POST /backend/v1/tfd/processos/{id}/transicao
// ----------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/tfd/processos/{id}/transicao', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado: faça login para alterar o estado do processo.' })
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    return c.json(403, {
      erro: 'Acesso negado: Perfil de recepção não possui autorização para transitar estados de TFD.',
    })
  }

  var id = c.request.pathValue('id')
  var reqInfo = c.requestInfo()
  var payload = reqInfo && reqInfo.body ? reqInfo.body : {}

  var novoStatus = sanitizar(payload.novo_status)
  var motivo = sanitizar(payload.motivo_justificativa)
  var observacoes = sanitizar(payload.observacoes)

  var estadosValidos = ['autorizado', 'cancelado', 'enviado_para_estado', 'negado', 'inconcluso']
  if (estadosValidos.indexOf(novoStatus) === -1) {
    return c.json(400, {
      erro: 'Estado inválido: Os estados permitidos são: ' + estadosValidos.join(', ') + '.',
    })
  }

  if (!motivo || motivo.length < 5) {
    return c.json(400, {
      erro: 'A transição de estado exige justificativa/motivo formal obrigatório (mínimo 5 caracteres).',
    })
  }

  try {
    var processoRec = c.app.findRecordById('tfd_processos', id)
    var statusAnt = processoRec.getString('status')

    if (statusAnt === 'cancelado') {
      return c.json(400, {
        erro: 'O processo de TFD está cancelado e é imutável. Não é permitida reativação.',
      })
    }

    processoRec.set('status', novoStatus)
    processoRec.set('motivo_situacao', motivo)
    if (observacoes) {
      processoRec.set('observacoes_gerais', observacoes)
    }

    c.app.save(processoRec)

    return c.json(200, {
      sucesso: true,
      mensagem: 'Estado do processo TFD atualizado com sucesso.',
      processo_id: processoRec.id,
      estado_anterior: statusAnt,
      estado_novo: novoStatus,
      data_hora: processoRec.getString('data_ultima_transicao'),
    })
  } catch (err) {
    return c.json(400, { erro: err.message || String(err) })
  }
})

// ----------------------------------------------------------------------------
// G. Endpoint para Renovação de Processo TFD Concluído
// POST /backend/v1/tfd/processos/{id}/renovar
// ----------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/tfd/processos/{id}/renovar', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado: faça login para renovar o processo de TFD.' })
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    return c.json(403, {
      erro: 'Acesso negado: Perfil de recepção não tem permissão para renovar processos de TFD.',
    })
  }

  var idOriginal = c.request.pathValue('id')
  var reqInfo = c.requestInfo()
  var payload = reqInfo && reqInfo.body ? reqInfo.body : {}

  var motivoRenovacao = sanitizar(payload.motivo_renovacao)
  var novoTratamento = sanitizar(payload.tratamento_solicitado)
  var novaJustificativa = sanitizar(payload.justificativa_clinica)
  var novoCid = sanitizar(payload.cid10)
  var idempotencyKey = sanitizar(payload.idempotency_key)

  if (!motivoRenovacao || motivoRenovacao.length < 5) {
    return c.json(400, {
      erro: 'A renovação do processo de TFD exige justificativa/motivo formal (mínimo 5 caracteres).',
    })
  }

  // Idempotência prévia
  if (idempotencyKey) {
    try {
      var idempExistente = c.app.findRecordsByFilter(
        'tfd_processos',
        'idempotency_key = {:k}',
        '-created',
        1,
        0,
        { k: idempotencyKey },
      )
      if (idempExistente && idempExistente.length > 0) {
        var recExist = idempExistente[0]
        if (recExist.getString('processo_anterior_ref') !== idOriginal) {
          return c.json(409, {
            erro: 'IDEMPOTENCY_PAYLOAD_CONFLICT: A mesma chave já foi utilizada para renovação de outro processo.',
          })
        }
        return c.json(200, {
          sucesso: true,
          idempotente: true,
          mensagem: 'Renovação já processada previamente para esta chave de idempotência.',
          novo_processo_id: recExist.id,
          novo_numero_processo: recExist.getString('numero_processo'),
          processo_anterior_id: idOriginal,
        })
      }
    } catch (_) {}
  }

  try {
    var procOrig = c.app.findRecordById('tfd_processos', idOriginal)
    var statusOrig = procOrig.getString('status')

    // Se estiver cancelado, não pode ser renovado
    if (statusOrig === 'cancelado') {
      return c.json(400, {
        erro: 'Não é permitida a renovação de um processo de TFD que foi cancelado.',
      })
    }

    // Gera NOVO número interno (interno, não oficial SUS): Prefixo TFD-ano-sequencial
    var anoAtual = new Date().getFullYear()
    var seqContador = c.app.countRecords('tfd_processos') + 1
    var novoNumero = 'TFD-' + anoAtual + '-' + String(seqContador).padStart(5, '0')

    // Garante unicidade do novo número interno
    var tentativas = 0
    while (tentativas < 10) {
      var testeCol = c.app.findRecordsByFilter(
        'tfd_processos',
        'numero_processo = {:num}',
        '-created',
        1,
        0,
        { num: novoNumero },
      )
      if (!testeCol || testeCol.length === 0) break
      seqContador++
      novoNumero = 'TFD-' + anoAtual + '-' + String(seqContador).padStart(5, '0')
      tentativas++
    }

    var colTfd = c.app.findCollectionByNameOrId('tfd_processos')
    var novoRec = new Record(colTfd)
    novoRec.set('numero_processo', novoNumero)
    novoRec.set('data_abertura', new Date().toISOString().substring(0, 10))
    novoRec.set('paciente', procOrig.getString('paciente'))
    novoRec.set(
      'profissional_responsavel',
      payload.profissional_responsavel || procOrig.getString('profissional_responsavel'),
    )
    novoRec.set('cid10', novoCid || procOrig.getString('cid10'))
    novoRec.set(
      'tratamento_solicitado',
      novoTratamento || procOrig.getString('tratamento_solicitado'),
    )
    novoRec.set(
      'tipo_atendimento',
      payload.tipo_atendimento || procOrig.getString('tipo_atendimento'),
    )
    novoRec.set(
      'justificativa_clinica',
      novaJustificativa ||
        '[RENOVAÇÃO DO PROCESSO ' +
          procOrig.getString('numero_processo') +
          '] ' +
          motivoRenovacao +
          ' | Justificativa anterior: ' +
          procOrig.getString('justificativa_clinica'),
    )
    // A renovação começa OBRIGATORIAMENTE em estado inicial ('inconcluso'),
    // NUNCA herda silenciosamente a autorização prévia!
    novoRec.set('status', 'inconcluso')
    novoRec.set(
      'motivo_situacao',
      'Abertura por renovação formal do processo ' +
        procOrig.getString('numero_processo') +
        ': ' +
        motivoRenovacao,
    )
    novoRec.set('municipio_destino', procOrig.getString('municipio_destino'))
    novoRec.set('estabelecimento_destino', procOrig.getString('estabelecimento_destino'))
    novoRec.set('tipo_transporte_recomendado', procOrig.getString('tipo_transporte_recomendado'))
    novoRec.set('exige_acompanhante', procOrig.getBool('exige_acompanhante'))
    novoRec.set('justificativa_acompanhante', procOrig.getString('justificativa_acompanhante'))
    novoRec.set('usuario_autor_id', auth.id)
    novoRec.set('ultimo_alterador_id', auth.id)
    novoRec.set('data_ultima_transicao', new Date().toISOString())
    novoRec.set('is_renovacao', true)
    novoRec.set('processo_anterior_ref', procOrig.id)
    if (idempotencyKey) {
      novoRec.set('idempotency_key', idempotencyKey)
    }

    c.app.save(novoRec)

    // Registra entrada no histórico do novo processo
    var colHist = c.app.findCollectionByNameOrId('tfd_historico_estados')
    var recHist = new Record(colHist)
    recHist.set('processo', novoRec.id)
    recHist.set('estado_anterior', 'novo_registro')
    recHist.set('estado_novo', 'inconcluso')
    recHist.set(
      'motivo_justificativa',
      'Renovação formal vinculada ao processo anterior ' +
        procOrig.getString('numero_processo') +
        '. Motivo: ' +
        motivoRenovacao,
    )
    recHist.set('usuario_autor_id', auth.id)
    recHist.set('data_hora', new Date().toISOString())
    c.app.save(recHist)

    return c.json(200, {
      sucesso: true,
      mensagem:
        'Processo de TFD renovado com sucesso com novo número interno e histórico preservado.',
      novo_processo_id: novoRec.id,
      novo_numero_processo: novoRec.getString('numero_processo'),
      processo_anterior_id: procOrig.id,
      processo_anterior_numero: procOrig.getString('numero_processo'),
    })
  } catch (err) {
    return c.json(400, { erro: err.message || String(err) })
  }
})

// ----------------------------------------------------------------------------
// H. Viagens em Lote: Prévia para Revisão Humana (Sem Gravação)
// POST /backend/v1/tfd/viagens-lote/previa
// ----------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/tfd/viagens-lote/previa', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  function parseDataMs(dataStr) {
    if (!dataStr) return null
    var s = String(dataStr).trim()
    var d = new Date(s)
    var ms = d.getTime()
    return isNaN(ms) ? null : ms
  }

  function sobreposicao(iniA, fimA, iniB, fimB) {
    return iniA < fimB && iniB < fimA
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado: faça login para simular o lote de viagens.' })
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    return c.json(403, {
      erro: 'Acesso negado: Perfil de recepção não tem permissão para planejar viagens de TFD.',
    })
  }

  var reqInfo = c.requestInfo()
  var payload = reqInfo && reqInfo.body ? reqInfo.body : {}
  var processoId = sanitizar(payload.processo_id)
  var itens = payload.itens || []

  if (!processoId) {
    return c.json(400, { erro: 'Parâmetro processo_id é obrigatório.' })
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    return c.json(400, {
      erro: 'A lista de itens de viagem para o lote deve conter ao menos 1 item.',
    })
  }

  try {
    var procRec = c.app.findRecordById('tfd_processos', processoId)
    var pacienteId = procRec.getString('paciente')
    var pacRec = c.app.findRecordById('pacientes', pacienteId)

    var previaItens = []
    var totalConflitos = 0
    var totalAptos = 0

    for (var i = 0; i < itens.length; i++) {
      var item = itens[i]
      var itemKey = sanitizar(item.item_idempotency_key) || 'item_' + i
      var saidaStr = sanitizar(item.data_saida)
      var retornoStr = sanitizar(item.data_retorno_previsto)
      var veiculoId = sanitizar(item.veiculo_id)
      var motoristaId = sanitizar(item.motorista_id)

      var analiseItem = {
        indice: i,
        item_idempotency_key: itemKey,
        data_saida: saidaStr,
        data_retorno_previsto: retornoStr,
        veiculo_id: veiculoId,
        motorista_id: motoristaId,
        apto: true,
        motivo_rejeicao: null,
      }

      var saidaMs = parseDataMs(saidaStr)
      var retornoMs = parseDataMs(retornoStr)

      if (!saidaMs || !retornoMs || retornoMs <= saidaMs) {
        analiseItem.apto = false
        analiseItem.motivo_rejeicao =
          'Datas inválidas: data de retorno deve ser posterior à data de saída.'
      } else if (!veiculoId || !motoristaId) {
        analiseItem.apto = false
        analiseItem.motivo_rejeicao = 'Veículo e motorista são obrigatórios para cada viagem.'
      } else {
        // Validação de veículo
        try {
          var veicRec = c.app.findRecordById('transporte_veiculos', veiculoId)
          if (!veicRec.getBool('ativo')) {
            analiseItem.apto = false
            analiseItem.motivo_rejeicao = 'Veículo ' + veicRec.getString('placa') + ' está inativo.'
          } else if (veicRec.getString('status') !== 'disponivel') {
            analiseItem.apto = false
            analiseItem.motivo_rejeicao =
              'Veículo ' +
              veicRec.getString('placa') +
              ' está em situação ' +
              veicRec.getString('status') +
              '.'
          }
        } catch (_) {
          analiseItem.apto = false
          analiseItem.motivo_rejeicao = 'Veículo informado não existe no cadastro.'
        }

        // Validação de motorista
        if (analiseItem.apto) {
          try {
            var motRec = c.app.findRecordById('transporte_motoristas', motoristaId)
            if (!motRec.getBool('ativo')) {
              analiseItem.apto = false
              analiseItem.motivo_rejeicao =
                'Motorista ' + motRec.getString('nome') + ' está inativo.'
            }
          } catch (_) {
            analiseItem.apto = false
            analiseItem.motivo_rejeicao = 'Motorista informado não existe no cadastro.'
          }
        }

        // Validação de sobreposição de agenda
        if (analiseItem.apto) {
          var viagensExist = c.app.findRecordsByFilter(
            'transporte_viagens',
            'status != "cancelada" && (veiculo = {:v} || motorista = {:m})',
            '-created',
            50,
            0,
            { v: veiculoId, m: motoristaId },
          )
          for (var v = 0; v < viagensExist.length; v++) {
            var vRec = viagensExist[v]
            var vSaidaMs = parseDataMs(vRec.getString('data_saida'))
            var vRetornoMs = parseDataMs(
              vRec.getString('data_retorno_real') || vRec.getString('data_retorno_previsto'),
            )
            if (vSaidaMs && vRetornoMs && sobreposicao(saidaMs, retornoMs, vSaidaMs, vRetornoMs)) {
              analiseItem.apto = false
              analiseItem.motivo_rejeicao =
                'Conflito de agenda com a viagem ' +
                vRec.getString('codigo_viagem') +
                ' (' +
                vRec.getString('data_saida') +
                ' a ' +
                vRec.getString('data_retorno_previsto') +
                ').'
              break
            }
          }
        }
      }

      if (analiseItem.apto) {
        totalAptos++
      } else {
        totalConflitos++
      }

      previaItens.push(analiseItem)
    }

    return c.json(200, {
      sucesso: true,
      tipo: 'previa_revisao_humana',
      confirmacao_obrigatoria: true,
      mensagem:
        'Prévia do lote gerada para conferência humana. Nenhuma viagem foi gravada no banco até que ocorra confirmação explícita no endpoint de confirmação.',
      processo_id: processoId,
      processo_numero: procRec.getString('numero_processo'),
      paciente_nome: pacRec.getString('nome'),
      total_solicitados: itens.length,
      total_aptos: totalAptos,
      total_conflitos: totalConflitos,
      itens: previaItens,
    })
  } catch (err) {
    return c.json(400, { erro: err.message || String(err) })
  }
})

// ----------------------------------------------------------------------------
// I. Viagens em Lote: Confirmação Explícita com Idempotência por Lote e por Item
// POST /backend/v1/tfd/viagens-lote/confirmar
// ----------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/tfd/viagens-lote/confirmar', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  function parseDataMs(dataStr) {
    if (!dataStr) return null
    var s = String(dataStr).trim()
    var d = new Date(s)
    var ms = d.getTime()
    return isNaN(ms) ? null : ms
  }

  function sobreposicao(iniA, fimA, iniB, fimB) {
    return iniA < fimB && iniB < fimA
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado: faça login para confirmar o lote de viagens.' })
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    return c.json(403, {
      erro: 'Acesso negado: Perfil de recepção não tem permissão para confirmar lotes de viagens.',
    })
  }

  var reqInfo = c.requestInfo()
  var payload = reqInfo && reqInfo.body ? reqInfo.body : {}

  var processoId = sanitizar(payload.processo_id)
  var loteIdempotencyKey = sanitizar(payload.lote_idempotency_key)
  var confirmado = payload.confirmado === true
  var itens = payload.itens || []

  if (!processoId) {
    return c.json(400, { erro: 'Parâmetro processo_id é obrigatório.' })
  }

  if (!confirmado) {
    return c.json(400, {
      erro: 'CONFIRMAÇÃO EXPLÍCITA OBRIGATÓRIA: O parâmetro "confirmado: true" é exigido para autorizar a gravação física do lote de viagens.',
    })
  }

  if (!loteIdempotencyKey || loteIdempotencyKey.length < 5) {
    return c.json(400, {
      erro: 'Chave de idempotência do lote (lote_idempotency_key) é obrigatória (mínimo 5 caracteres).',
    })
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    return c.json(400, { erro: 'A lista de itens de viagem do lote não pode estar vazia.' })
  }

  // 1. Verificação de idempotência no nível do lote
  try {
    var lotesExistentes = c.app.findRecordsByFilter(
      'tfd_viagens_lote',
      'idempotency_key = {:k}',
      '-created',
      1,
      0,
      { k: loteIdempotencyKey },
    )
    if (lotesExistentes && lotesExistentes.length > 0) {
      var loteRec = lotesExistentes[0]
      if (loteRec.getString('processo') !== processoId) {
        return c.json(409, {
          erro: 'IDEMPOTENCY_PAYLOAD_CONFLICT: A mesma chave de lote já foi utilizada para outro processo de TFD.',
        })
      }

      var sumarioArmazenado = {}
      try {
        sumarioArmazenado = JSON.parse(loteRec.getString('resultado_sumario')) || {}
      } catch (_) {}

      return c.json(200, {
        sucesso: true,
        idempotente: true,
        mensagem:
          'Lote de viagens já havia sido processado e confirmado anteriormente para esta chave.',
        lote_codigo: loteRec.getString('lote_codigo'),
        processo_id: processoId,
        itens_criados: loteRec.getInt('itens_criados'),
        itens_conflito: loteRec.getInt('itens_conflito'),
        detalhes: sumarioArmazenado,
      })
    }
  } catch (_) {}

  // 2. Executa a criação transacional dos itens válidos
  var itensCriadosResultado = []
  var itensConflitoResultado = []
  var loteCodigoGerado =
    'LOTE-TFD-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-6)

  try {
    c.app.runInTransaction((txApp) => {
      var procRec = txApp.findRecordById('tfd_processos', processoId)
      var pacienteId = procRec.getString('paciente')
      var pacRec = txApp.findRecordById('pacientes', pacienteId)

      var colViagens = txApp.findCollectionByNameOrId('transporte_viagens')
      var colPass = txApp.findCollectionByNameOrId('transporte_passageiros')

      for (var i = 0; i < itens.length; i++) {
        var it = itens[i]
        var itemKey = sanitizar(it.item_idempotency_key) || loteIdempotencyKey + '_item_' + i
        var saidaStr = sanitizar(it.data_saida)
        var retornoStr = sanitizar(it.data_retorno_previsto)
        var veiculoId = sanitizar(it.veiculo_id)
        var motoristaId = sanitizar(it.motorista_id)
        var cidadeDestino =
          sanitizar(it.cidade_destino) || procRec.getString('municipio_destino') || 'Destino TFD'
        var localDestino =
          sanitizar(it.local_destino) || procRec.getString('estabelecimento_destino') || ''

        // Verifica idempotência do item
        var viagemExistenteItem = txApp.findRecordsByFilter(
          'transporte_passageiros',
          'idempotency_key = {:ik}',
          '-created',
          1,
          0,
          { ik: itemKey },
        )
        if (viagemExistenteItem && viagemExistenteItem.length > 0) {
          itensCriadosResultado.push({
            item_idempotency_key: itemKey,
            idempotente_reaproveitado: true,
            viagem_id: viagemExistenteItem[0].getString('viagem'),
            reserva_id: viagemExistenteItem[0].id,
            status: 'preexistente',
          })
          continue
        }

        // Validações de conflito para este item
        var saidaMs = parseDataMs(saidaStr)
        var retornoMs = parseDataMs(retornoStr)
        var motivoConflito = null

        if (!saidaMs || !retornoMs || retornoMs <= saidaMs) {
          motivoConflito = 'Datas inválidas no item (retorno deve ser posterior à saída).'
        } else if (!veiculoId || !motoristaId) {
          motivoConflito = 'Veículo e motorista são obrigatórios.'
        } else {
          // Status veículo
          try {
            var vRec = txApp.findRecordById('transporte_veiculos', veiculoId)
            if (!vRec.getBool('ativo') || vRec.getString('status') !== 'disponivel') {
              motivoConflito = 'Veículo não disponível (' + vRec.getString('status') + ').'
            }
          } catch (_) {
            motivoConflito = 'Veículo não localizado.'
          }

          // Conflito de agenda
          if (!motivoConflito) {
            var vAgendas = txApp.findRecordsByFilter(
              'transporte_viagens',
              'status != "cancelada" && (veiculo = {:v} || motorista = {:m})',
              '-created',
              50,
              0,
              { v: veiculoId, m: motoristaId },
            )
            for (var a = 0; a < vAgendas.length; a++) {
              var agRec = vAgendas[a]
              var agSaidaMs = parseDataMs(agRec.getString('data_saida'))
              var agRetornoMs = parseDataMs(
                agRec.getString('data_retorno_real') || agRec.getString('data_retorno_previsto'),
              )
              if (
                agSaidaMs &&
                agRetornoMs &&
                sobreposicao(saidaMs, retornoMs, agSaidaMs, agRetornoMs)
              ) {
                motivoConflito =
                  'Conflito de agenda com viagem ' + agRec.getString('codigo_viagem') + '.'
                break
              }
            }
          }
        }

        if (motivoConflito) {
          itensConflitoResultado.push({
            item_idempotency_key: itemKey,
            data_saida: saidaStr,
            data_retorno_previsto: retornoStr,
            veiculo_id: veiculoId,
            motorista_id: motoristaId,
            motivo_conflito: motivoConflito,
          })
          continue
        }

        // Cria a viagem para o item do lote
        var codViagem =
          'VIA-TFD-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-6) + '-' + i
        var recViagem = new Record(colViagens)
        recViagem.set('codigo_viagem', codViagem)
        recViagem.set('data_saida', saidaStr)
        recViagem.set('data_retorno_previsto', retornoStr)
        recViagem.set('tipo_viagem', 'tfd_intermunicipal')
        recViagem.set('status', 'programada')
        recViagem.set('veiculo', veiculoId)
        recViagem.set('motorista', motoristaId)
        recViagem.set('cidade_destino', cidadeDestino)
        recViagem.set('local_destino', localDestino)
        recViagem.set('tfd_processo', processoId)
        recViagem.set(
          'observacoes',
          '[LOTE ' +
            loteCodigoGerado +
            '] Vinculado ao processo TFD ' +
            procRec.getString('numero_processo'),
        )
        recViagem.set('usuario_autor_id', auth.id)
        txApp.save(recViagem)

        // Cria a reserva do passageiro titular (com paciente coerente!)
        var recPass = new Record(colPass)
        recPass.set('viagem', recViagem.id)
        recPass.set('paciente', pacienteId)
        recPass.set('nome_completo', pacRec.getString('nome'))
        recPass.set('documento_tipo', 'CPF')
        recPass.set(
          'documento_numero',
          pacRec.getString('cpf') || pacRec.getString('cartao_sus') || '',
        )
        recPass.set('telefone', pacRec.getString('telefone') || '')
        recPass.set('tipo_passageiro', 'paciente')
        recPass.set('trecho', 'ida_e_volta')
        recPass.set('vagas_ida', 1)
        recPass.set('vagas_volta', 1)
        recPass.set('status', 'agendado')
        recPass.set('usuario_autor_id', auth.id)
        recPass.set('idempotency_key', itemKey)
        txApp.save(recPass)

        itensCriadosResultado.push({
          item_idempotency_key: itemKey,
          viagem_id: recViagem.id,
          codigo_viagem: codViagem,
          reserva_id: recPass.id,
          status: 'criado',
        })
      }

      // Salva o registro mestre do lote na tabela tfd_viagens_lote
      var colLotes = txApp.findCollectionByNameOrId('tfd_viagens_lote')
      var recLote = new Record(colLotes)
      recLote.set('lote_codigo', loteCodigoGerado)
      recLote.set('processo', processoId)
      recLote.set('idempotency_key', loteIdempotencyKey)
      recLote.set('confirmado', true)
      recLote.set('data_confirmacao', new Date().toISOString())
      recLote.set('itens_solicitados', itens.length)
      recLote.set('itens_criados', itensCriadosResultado.length)
      recLote.set('itens_conflito', itensConflitoResultado.length)
      recLote.set(
        'resultado_sumario',
        JSON.stringify({
          criados: itensCriadosResultado,
          conflitos: itensConflitoResultado,
        }),
      )
      recLote.set('usuario_autor_id', auth.id)
      txApp.save(recLote)
    })

    return c.json(200, {
      sucesso: true,
      mensagem:
        'Lote de viagens TFD confirmado e processado. Nenhum sucesso parcial oculto: itens criados e itens com conflito foram discriminados claramente.',
      lote_codigo: loteCodigoGerado,
      processo_id: processoId,
      total_solicitados: itens.length,
      itens_criados_total: itensCriadosResultado.length,
      itens_conflito_total: itensConflitoResultado.length,
      criados: itensCriadosResultado,
      conflitos: itensConflitoResultado,
    })
  } catch (err) {
    return c.json(500, { erro: err.message || String(err) })
  }
})
