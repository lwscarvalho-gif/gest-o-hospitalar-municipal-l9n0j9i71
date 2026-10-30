/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook Server-Side do Módulo RIS (Radiologia e Diagnóstico por Imagem)
 * Conforme DOC-02 Seção 7.4.3.4.a.i-iv e c.ii, e itens 313-316 do ANEXO I.
 *
 * NOTA: Cada callback routerAdd declara suas próprias funções utilitárias localmente
 * para respeitar o isolamento de escopo da JSVM do PocketBase.
 */

// ----------------------------------------------------------------------------
// 1. POST /backend/v1/ris/requisicao-pep
// Requisição de RX/TC/ECG/US a partir da solicitação do PEP sem duplicar
// ----------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/ris/requisicao-pep', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado: faça login para solicitar exame no RIS.' })
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    return c.json(403, {
      erro: 'Acesso negado: Perfil de recepção não tem autorização clínica para emitir requisições de imagem no RIS.',
    })
  }

  var reqInfo = c.requestInfo()
  var body = reqInfo && reqInfo.body ? reqInfo.body : {}

  var pacienteId = sanitizar(body.paciente_id)
  var internacaoId = sanitizar(body.internacao_id)
  var atendimentoPaId = sanitizar(body.atendimento_pa_id)
  var setorId = sanitizar(body.setor_id)
  var tipoExame = sanitizar(body.tipo_exame)
  var modalidade = sanitizar(body.modalidade_ris).toLowerCase()
  var prioridade = sanitizar(body.prioridade).toLowerCase() || 'eletiva'
  var justificativa = sanitizar(body.justificativa_clinica)
  var tipoExecucao = sanitizar(body.tipo_execucao).toLowerCase() || 'interno'
  var prestadorNome = sanitizar(body.prestador_externo_nome)
  var prestadorCnes = sanitizar(body.prestador_externo_cnes)
  var prestadorUf = sanitizar(body.prestador_externo_uf)
  var idempotencyKey = sanitizar(body.idempotency_key)

  if (!pacienteId) {
    return c.json(400, { erro: 'Identificação do paciente é obrigatória para requisição no RIS.' })
  }
  if (!tipoExame) {
    return c.json(400, { erro: 'Nome / tipo de procedimento do exame de imagem é obrigatório.' })
  }

  var modalidadesValidas = ['rx', 'tc', 'ecg', 'us', 'outro']
  if (!modalidade || modalidadesValidas.indexOf(modalidade) === -1) {
    var nomeUp = tipoExame.toUpperCase()
    if (
      nomeUp.indexOf('RAIO') !== -1 ||
      nomeUp.indexOf('RX') !== -1 ||
      nomeUp.indexOf('RADIOGRAFIA') !== -1
    ) {
      modalidade = 'rx'
    } else if (nomeUp.indexOf('TOMOGRAFIA') !== -1 || nomeUp.indexOf('TC') !== -1) {
      modalidade = 'tc'
    } else if (nomeUp.indexOf('ELETROCARDIOGRAMA') !== -1 || nomeUp.indexOf('ECG') !== -1) {
      modalidade = 'ecg'
    } else if (
      nomeUp.indexOf('ULTRASSOM') !== -1 ||
      nomeUp.indexOf('USG') !== -1 ||
      nomeUp.indexOf('ULTRASSONOGRAFIA') !== -1
    ) {
      modalidade = 'us'
    } else {
      modalidade = 'outro'
    }
  }

  // 1. Validação de Vínculos Clínicos no Servidor
  try {
    var pacRec = c.app.findRecordById('pacientes', pacienteId)
    if (!pacRec) {
      return c.json(404, { erro: 'Paciente informado não foi encontrado.' })
    }
  } catch (_) {
    return c.json(404, { erro: 'Paciente informado não foi encontrado no cadastro.' })
  }

  if (internacaoId) {
    try {
      var interRec = c.app.findRecordById('internacoes', internacaoId)
      if (interRec.getString('paciente') !== pacienteId) {
        return c.json(400, {
          erro: 'VÍNCULO CLÍNICO DIVERGENTE: A internação informada pertence a outro paciente.',
        })
      }
    } catch (_) {
      return c.json(404, { erro: 'Internação informada não foi encontrada.' })
    }
  }

  if (atendimentoPaId) {
    try {
      var paRec = c.app.findRecordById('pronto_atendimento', atendimentoPaId)
      if (paRec.getString('paciente') !== pacienteId) {
        return c.json(400, {
          erro: 'VÍNCULO CLÍNICO DIVERGENTE: O atendimento de PA informado pertence a outro paciente.',
        })
      }
    } catch (_) {
      return c.json(404, {
        erro: 'Atendimento de Pronto Atendimento informado não foi encontrado.',
      })
    }
  }

  // 2. Proteção Idempotente Persistente contra Reenvio
  if (idempotencyKey) {
    try {
      var exExistentes = c.app.findRecordsByFilter(
        'exames',
        'idempotency_key = {:k}',
        '-created',
        1,
        0,
        { k: idempotencyKey },
      )
      if (exExistentes && exExistentes.length > 0) {
        var exOrig = exExistentes[0]
        if (
          exOrig.getString('paciente') !== pacienteId ||
          exOrig.getString('tipo_exame') !== tipoExame
        ) {
          return c.json(409, {
            erro: 'IDEMPOTENCY_PAYLOAD_CONFLICT: A mesma chave já foi utilizada com parâmetros divergentes.',
          })
        }
        return c.json(200, {
          sucesso: true,
          idempotente: true,
          mensagem: 'Requisição de exame de imagem já registrada anteriormente para esta chave.',
          exame_id: exOrig.id,
          status_ris: exOrig.getString('status_ris') || 'solicitado',
          modalidade_ris: exOrig.getString('modalidade_ris') || modalidade,
        })
      }
    } catch (_) {}
  }

  // 3. Autor e Solicitante Derivados Autoritativamente da Sessão do Servidor
  var autorNome = auth.getString('name') || 'Profissional Solicitante'
  var autorId = auth.id
  var profSolicitanteId = ''
  try {
    var profs = c.app.findRecordsByFilter(
      'profissionais',
      'email = {:em} || nome = {:nm}',
      '-created',
      1,
      0,
      { em: auth.getString('email') || '', nm: autorNome },
    )
    if (profs && profs.length > 0) {
      profSolicitanteId = profs[0].id
    }
  } catch (_) {}

  try {
    var agora = new Date()
    var dataSolicitacao = agora.toISOString().slice(0, 10) + ' ' + agora.toTimeString().slice(0, 5)

    var colExames = c.app.findCollectionByNameOrId('exames')
    var novoExame = new Record(colExames)

    novoExame.set('paciente', pacienteId)
    if (internacaoId) novoExame.set('internacao', internacaoId)
    if (atendimentoPaId) novoExame.set('atendimento_pa', atendimentoPaId)
    if (setorId) novoExame.set('setor', setorId)

    novoExame.set('tipo_exame', tipoExame)
    novoExame.set('categoria', modalidade === 'ecg' ? 'grafico' : 'imagem')
    novoExame.set('modalidade_ris', modalidade)
    novoExame.set('prioridade', prioridade === 'urgente' ? 'urgente' : 'eletiva')
    novoExame.set('justificativa', justificativa)
    novoExame.set('data_solicitacao', dataSolicitacao)

    if (profSolicitanteId) novoExame.set('solicitante', profSolicitanteId)
    novoExame.set('solicitante_nome', autorNome)

    novoExame.set('status', 'solicitado')
    novoExame.set('status_ris', 'solicitado')
    novoExame.set('tipo_execucao', tipoExecucao === 'externo' ? 'externo' : 'interno')

    if (tipoExecucao === 'externo') {
      novoExame.set('prestador_externo_nome', prestadorNome)
      novoExame.set('prestador_externo_cnes', prestadorCnes)
      novoExame.set('prestador_externo_uf', prestadorUf)
    }

    if (idempotencyKey) {
      novoExame.set('idempotency_key', idempotencyKey)
    }

    c.app.save(novoExame)

    // Trilha auditável
    try {
      var colHist = c.app.findCollectionByNameOrId('ris_historico_transicoes')
      var hRec = new Record(colHist)
      hRec.set('exame', novoExame.id)
      hRec.set('status_anterior', 'novo')
      hRec.set('status_novo', 'solicitado')
      hRec.set('motivo_justificativa', 'Emissão de requisição de imagem a partir do PEP')
      hRec.set('usuario_autor_id', autorId)
      hRec.set('usuario_autor_nome', autorNome)
      hRec.set('usuario_cargo', auth.getString('cargo') || auth.getString('role'))
      hRec.set('data_hora', dataSolicitacao)
      hRec.set(
        'detalhes',
        JSON.stringify({
          modalidade: modalidade,
          prioridade: prioridade,
          tipo_execucao: tipoExecucao,
          internacao_id: internacaoId || null,
          atendimento_pa_id: atendimentoPaId || null,
        }),
      )
      c.app.save(hRec)
    } catch (_) {}

    return c.json(201, {
      sucesso: true,
      mensagem: 'Requisição de imagem criada na fila RIS com sucesso.',
      exame_id: novoExame.id,
      modalidade_ris: modalidade,
      status_ris: 'solicitado',
      tipo_execucao: novoExame.getString('tipo_execucao'),
    })
  } catch (err) {
    return c.json(500, { erro: err.message || String(err) })
  }
})

// ----------------------------------------------------------------------------
// 2. GET /backend/v1/ris/fila
// Fila RIS paginada por unidade, modalidade e status com isolamento de recepção
// ----------------------------------------------------------------------------
routerAdd('GET', '/backend/v1/ris/fila', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado: faça login para acessar a fila RIS.' })
  }

  var role = auth.getString('role')
  var isRecepcao = role === 'recepcao'

  var reqInfo = c.requestInfo()
  var query = reqInfo && reqInfo.query ? reqInfo.query : {}

  var statusFiltro = sanitizar(query.status)
  var modalidadeFiltro = sanitizar(query.modalidade)
  var setorFiltro = sanitizar(query.setor)
  var tipoExecucaoFiltro = sanitizar(query.tipo_execucao)
  var busca = sanitizar(query.busca)
  var pacienteFiltro = sanitizar(query.paciente)

  var page = Math.max(1, parseInt(query.page, 10) || 1)
  var perPage = Math.min(100, Math.max(1, parseInt(query.perPage, 10) || 20))

  var filterParts = ["categoria = 'imagem' || categoria = 'grafico' || modalidade_ris != ''"]
  var filterParams = {}

  if (statusFiltro && statusFiltro !== 'todos') {
    filterParts.push('status_ris = {:stRis}')
    filterParams['stRis'] = statusFiltro
  }

  if (modalidadeFiltro && modalidadeFiltro !== 'todos') {
    filterParts.push('modalidade_ris = {:modRis}')
    filterParams['modRis'] = modalidadeFiltro
  }

  if (setorFiltro && setorFiltro !== 'todos') {
    filterParts.push('setor = {:setorId}')
    filterParams['setorId'] = setorFiltro
  }

  if (tipoExecucaoFiltro && tipoExecucaoFiltro !== 'todos') {
    filterParts.push('tipo_execucao = {:tExec}')
    filterParams['tExec'] = tipoExecucaoFiltro
  }

  if (pacienteFiltro) {
    filterParts.push('paciente = {:pacId}')
    filterParams['pacId'] = pacienteFiltro
  }

  if (busca) {
    filterParts.push(
      '(tipo_exame ~ {:busca} || solicitante_nome ~ {:busca} || prestador_externo_nome ~ {:busca})',
    )
    filterParams['busca'] = busca
  }

  var filterStr = filterParts.join(' && ')
  var offset = (page - 1) * perPage

  try {
    var records = c.app.findRecordsByFilter(
      'exames',
      filterStr,
      '-created',
      perPage,
      offset,
      filterParams,
    )
    var total = c.app.countRecords('exames', filterStr, filterParams)

    var items = []
    for (var i = 0; i < records.length; i++) {
      var r = records[i]
      var pacId = r.getString('paciente')
      var pacNome = 'Paciente'
      var pacCpf = ''
      var pacCns = ''

      if (pacId) {
        try {
          var pRec = c.app.findRecordById('pacientes', pacId)
          pacNome = pRec.getString('nome') || pacNome
          pacCpf = pRec.getString('cpf') || ''
          pacCns = pRec.getString('cartao_sus') || ''
        } catch (_) {}
      }

      var itemObj = {
        id: r.id,
        paciente_id: pacId,
        paciente_nome: pacNome,
        paciente_cpf_mascarado: pacCpf ? pacCpf.replace(/(\d{3})\d{5}(\d{2})/, '$1.***.**$2') : '',
        paciente_cns_mascarado: pacCns
          ? pacCns.replace(/(\d{3})\d{8}(\d{4})/, '$1.****.****.$2')
          : '',
        tipo_exame: r.getString('tipo_exame'),
        modalidade_ris: r.getString('modalidade_ris') || 'outro',
        prioridade: r.getString('prioridade'),
        data_solicitacao: r.getString('data_solicitacao'),
        solicitante_nome: r.getString('solicitante_nome'),
        status_ris: r.getString('status_ris') || r.getString('status') || 'solicitado',
        status_exame_legado: r.getString('status'),
        tipo_execucao: r.getString('tipo_execucao') || 'interno',
        prestador_externo_nome: r.getString('prestador_externo_nome'),
        prestador_externo_cnes: r.getString('prestador_externo_cnes'),
        prestador_externo_uf: r.getString('prestador_externo_uf'),
        versao_atual: r.getInt('versao_atual') || 1,
        tem_retificacao: r.getBool('tem_retificacao'),
        setor_id: r.getString('setor'),
        internacao_id: r.getString('internacao'),
        atendimento_pa_id: r.getString('atendimento_pa'),
        created: r.getString('created'),
        updated: r.getString('updated'),
      }

      // ISOLAMENTO DE DADOS CLÍNICOS E RASCUNHOS
      // Se for recepção: apenas dados administrativos mínimos!
      if (isRecepcao) {
        itemObj.justificativa_clinica = '[DADO CLÍNICO RESTRITO]'
        itemObj.rascunho_laudo = '[DADO CLÍNICO RESTRITO]'
        itemObj.laudo_texto = '[DADO CLÍNICO RESTRITO]'
        itemObj.resultado_sumario = '[DADO CLÍNICO RESTRITO]'
      } else {
        itemObj.justificativa_clinica = r.getString('justificativa')
        itemObj.rascunho_laudo = r.getString('rascunho_laudo')
        itemObj.laudo_texto = r.getString('laudo_texto')
        itemObj.resultado_sumario = r.getString('resultado_sumario')
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

// ----------------------------------------------------------------------------
// 3. POST /backend/v1/ris/exames/{id}/transicao
// Transições autorizadas com motivo obrigatório e sem liberação automática
// ----------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/ris/exames/{id}/transicao', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado: faça login para alterar status na fila RIS.' })
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    return c.json(403, {
      erro: 'Acesso negado: Perfil de recepção não tem autorização para transitar status clínicos na fila RIS.',
    })
  }

  var exameId = c.request.pathValue('id')
  var reqInfo = c.requestInfo()
  var body = reqInfo && reqInfo.body ? reqInfo.body : {}

  var novoStatus = sanitizar(body.novo_status).toLowerCase()
  var motivo = sanitizar(body.motivo_justificativa)
  var detalhes = body.detalhes || {}

  var statusValidos = [
    'solicitado',
    'agendado',
    'realizado_aguardando_laudo',
    'laudado',
    'cancelado',
  ]
  if (statusValidos.indexOf(novoStatus) === -1) {
    return c.json(400, {
      erro: 'Status inválido na fila RIS. Os status permitidos são: ' + statusValidos.join(', '),
    })
  }

  if (novoStatus === 'cancelado' || novoStatus === 'solicitado') {
    if (!motivo || motivo.length < 5) {
      return c.json(400, {
        erro: 'Esta transição exige justificativa formal obrigatória (mínimo de 5 caracteres).',
      })
    }
  }

  try {
    var exameRec = c.app.findRecordById('exames', exameId)
    var statusAnterior =
      exameRec.getString('status_ris') || exameRec.getString('status') || 'solicitado'

    if (statusAnterior === 'cancelado') {
      return c.json(400, {
        erro: 'Exame cancelado é terminal na fila RIS e não permite transição nem reativação.',
      })
    }

    if (statusAnterior === 'laudado' && novoStatus !== 'cancelado') {
      return c.json(400, {
        erro: 'Exame já laudado não pode retornar a etapas anteriores. Utilize retificação de laudo para novas versões.',
      })
    }

    if (novoStatus === 'laudado') {
      var laudoTexto = exameRec.getString('laudo_texto')
      var resultadoSumario = exameRec.getString('resultado_sumario')
      if (!laudoTexto || !resultadoSumario) {
        return c.json(400, {
          erro: 'PROIBIDA LIBERAÇÃO AUTOMÁTICA: O exame só pode ser transacionado para "laudado" após emissão formal do laudo com sumário e parecer descritivo.',
        })
      }
    }

    exameRec.set('status_ris', novoStatus)
    if (novoStatus === 'cancelado') {
      exameRec.set('status', 'cancelado')
      exameRec.set('motivo_cancelamento', motivo)
    } else if (novoStatus === 'realizado_aguardando_laudo') {
      exameRec.set('status', 'em_analise')
    }

    c.app.save(exameRec)

    var agora = new Date()
    var dataHora = agora.toISOString().slice(0, 10) + ' ' + agora.toTimeString().slice(0, 5)

    var colHist = c.app.findCollectionByNameOrId('ris_historico_transicoes')
    var hRec = new Record(colHist)
    hRec.set('exame', exameRec.id)
    hRec.set('status_anterior', statusAnterior)
    hRec.set('status_novo', novoStatus)
    hRec.set('motivo_justificativa', motivo || 'Transição realizada na fila RIS')
    hRec.set('usuario_autor_id', auth.id)
    hRec.set('usuario_autor_nome', auth.getString('name') || 'Profissional')
    hRec.set('usuario_cargo', auth.getString('cargo') || auth.getString('role'))
    hRec.set('data_hora', dataHora)
    hRec.set('detalhes', JSON.stringify(detalhes))
    c.app.save(hRec)

    return c.json(200, {
      sucesso: true,
      mensagem: 'Status na fila RIS atualizado com sucesso.',
      exame_id: exameRec.id,
      status_anterior: statusAnterior,
      status_novo: novoStatus,
      data_hora: dataHora,
    })
  } catch (err) {
    return c.json(400, { erro: err.message || String(err) })
  }
})

// ----------------------------------------------------------------------------
// 4. POST /backend/v1/ris/agendar
// Agenda com validação de conflito de sala/equipamento ou profissional no servidor
// ----------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/ris/agendar', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado: faça login para agendar exame RIS.' })
  }

  var reqInfo = c.requestInfo()
  var body = reqInfo && reqInfo.body ? reqInfo.body : {}

  var exameId = sanitizar(body.exame_id)
  var unidadeSetorId = sanitizar(body.unidade_setor_id)
  var salaEquipamento = sanitizar(body.sala_equipamento)
  var profissionalId = sanitizar(body.profissional_id)
  var profissionalNome = sanitizar(body.profissional_nome)
  var dataHoraInicio = sanitizar(body.data_hora_inicio)
  var dataHoraFim = sanitizar(body.data_hora_fim)
  var preparoOrientacoes = sanitizar(body.preparo_orientacoes)
  var idempotencyKey = sanitizar(body.idempotency_key)

  if (!exameId || !salaEquipamento || !dataHoraInicio || !dataHoraFim) {
    return c.json(400, {
      erro: 'Parâmetros obrigatórios incompletos: exame_id, sala_equipamento, data_hora_inicio e data_hora_fim.',
    })
  }

  if (dataHoraInicio >= dataHoraFim) {
    return c.json(400, {
      erro: 'Horário de início deve ser anterior ao horário de término.',
    })
  }

  if (idempotencyKey) {
    try {
      var agExistentes = c.app.findRecordsByFilter(
        'ris_agendas',
        'idempotency_key = {:k}',
        '-created',
        1,
        0,
        { k: idempotencyKey },
      )
      if (agExistentes && agExistentes.length > 0) {
        var aOrig = agExistentes[0]
        if (
          aOrig.getString('exame') !== exameId ||
          aOrig.getString('sala_equipamento') !== salaEquipamento
        ) {
          return c.json(409, {
            erro: 'IDEMPOTENCY_PAYLOAD_CONFLICT: A mesma chave já foi usada para outro agendamento.',
          })
        }
        return c.json(200, {
          sucesso: true,
          idempotente: true,
          agenda_id: aOrig.id,
          mensagem: 'Agendamento já confirmado para esta chave de idempotência.',
          comprovante: aOrig.getString('comprovante_snapshot')
            ? JSON.parse(aOrig.getString('comprovante_snapshot'))
            : null,
        })
      }
    } catch (_) {}
  }

  try {
    var exameRec = c.app.findRecordById('exames', exameId)
    if (exameRec.getString('status_ris') === 'cancelado') {
      return c.json(400, { erro: 'Não é possível agendar um exame que foi cancelado.' })
    }

    var pacienteId = exameRec.getString('paciente')
    var pacRec = c.app.findRecordById('pacientes', pacienteId)

    // Validação de Conflito de Sala/Equipamento no Servidor
    var conflitosSala = c.app.findRecordsByFilter(
      'ris_agendas',
      '(status = "agendado" || status = "confirmado") && sala_equipamento = {:sala} && data_hora_inicio < {:fim} && data_hora_fim > {:ini}',
      '-created',
      10,
      0,
      { sala: salaEquipamento, ini: dataHoraInicio, fim: dataHoraFim },
    )

    if (conflitosSala && conflitosSala.length > 0) {
      var c0 = conflitosSala[0]
      return c.json(409, {
        erro:
          'CONFLITO_DE_AGENDA: A sala/equipamento "' +
          salaEquipamento +
          '" já possui agendamento confirmado entre ' +
          c0.getString('data_hora_inicio') +
          ' e ' +
          c0.getString('data_hora_fim') +
          '.',
      })
    }

    // Validação de Conflito de Profissional no Servidor
    if (profissionalId) {
      var conflitosProf = c.app.findRecordsByFilter(
        'ris_agendas',
        '(status = "agendado" || status = "confirmado") && profissional_responsavel = {:prof} && data_hora_inicio < {:fim} && data_hora_fim > {:ini}',
        '-created',
        10,
        0,
        { prof: profissionalId, ini: dataHoraInicio, fim: dataHoraFim },
      )
      if (conflitosProf && conflitosProf.length > 0) {
        return c.json(409, {
          erro: 'CONFLITO_DE_AGENDA_PROFISSIONAL: O profissional já possui exame agendado neste mesmo intervalo.',
        })
      }
    }

    // Comprovante em Snapshot Seguro (padrão de impressão assistencial)
    var comprovanteId = 'COMP-RIS-' + Date.now().toString(36).toUpperCase()
    var snapshotComprovante = {
      comprovante_id: comprovanteId,
      exame_id: exameRec.id,
      tipo_exame: exameRec.getString('tipo_exame'),
      modalidade_ris: exameRec.getString('modalidade_ris') || 'rx',
      paciente_id: pacRec.id,
      paciente_nome: pacRec.getString('nome'),
      paciente_cpf: pacRec.getString('cpf')
        ? pacRec.getString('cpf').replace(/(\d{3})\d{5}(\d{2})/, '$1.***.**$2')
        : '',
      paciente_cns: pacRec.getString('cartao_sus')
        ? pacRec.getString('cartao_sus').replace(/(\d{3})\d{8}(\d{4})/, '$1.****.****.$2')
        : '',
      data_nascimento: pacRec.getString('data_nascimento'),
      unidade_setor: unidadeSetorId || exameRec.getString('setor') || 'Radiologia e Imagem',
      sala_equipamento: salaEquipamento,
      data_hora_inicio: dataHoraInicio,
      data_hora_fim: dataHoraFim,
      profissional_responsavel: profissionalNome || 'Equipe do Setor de Imagem',
      preparo_orientacoes:
        preparoOrientacoes ||
        'Comparecer com 15 minutos de antecedência munido de documento oficial com foto e Cartão SUS.',
      data_hora_emissao:
        new Date().toISOString().slice(0, 10) + ' ' + new Date().toTimeString().slice(0, 5),
      emissor_nome: auth.getString('name') || 'Operador',
      seguranca_hash: 'RIS-SEC-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    }

    var colAg = c.app.findCollectionByNameOrId('ris_agendas')
    var novaAgenda = new Record(colAg)
    novaAgenda.set('exame', exameRec.id)
    novaAgenda.set('paciente', pacRec.id)
    if (unidadeSetorId) novaAgenda.set('unidade_setor', unidadeSetorId)
    novaAgenda.set('sala_equipamento', salaEquipamento)
    if (profissionalId) novaAgenda.set('profissional_responsavel', profissionalId)
    novaAgenda.set('profissional_nome', profissionalNome)
    novaAgenda.set('data_hora_inicio', dataHoraInicio)
    novaAgenda.set('data_hora_fim', dataHoraFim)
    novaAgenda.set('status', 'agendado')
    novaAgenda.set('preparo_orientacoes', preparoOrientacoes)
    novaAgenda.set('comprovante_snapshot', JSON.stringify(snapshotComprovante))
    novaAgenda.set('usuario_autor_id', auth.id)
    novaAgenda.set('usuario_autor_nome', auth.getString('name') || 'Operador')
    if (idempotencyKey) novaAgenda.set('idempotency_key', idempotencyKey)

    c.app.save(novaAgenda)

    exameRec.set('status_ris', 'agendado')
    c.app.save(exameRec)

    // Trilha auditável
    try {
      var colHist = c.app.findCollectionByNameOrId('ris_historico_transicoes')
      var hRec = new Record(colHist)
      hRec.set('exame', exameRec.id)
      hRec.set('status_anterior', 'solicitado')
      hRec.set('status_novo', 'agendado')
      hRec.set(
        'motivo_justificativa',
        'Exame agendado para ' + dataHoraInicio + ' na sala ' + salaEquipamento,
      )
      hRec.set('usuario_autor_id', auth.id)
      hRec.set('usuario_autor_nome', auth.getString('name') || 'Operador')
      hRec.set('data_hora', snapshotComprovante.data_hora_emissao)
      hRec.set(
        'detalhes',
        JSON.stringify({ agenda_id: novaAgenda.id, comprovante_id: comprovanteId }),
      )
      c.app.save(hRec)
    } catch (_) {}

    return c.json(201, {
      sucesso: true,
      mensagem: 'Exame agendado com sucesso e comprovante seguro gerado.',
      agenda_id: novaAgenda.id,
      comprovante: snapshotComprovante,
    })
  } catch (err) {
    return c.json(400, { erro: err.message || String(err) })
  }
})

// ----------------------------------------------------------------------------
// 5. POST /backend/v1/ris/agendas/{id}/reagendar
// Reagendamento sem apagar histórico (inativa anterior e cria nova agenda)
// ----------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/ris/agendas/{id}/reagendar', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado.' })
  }

  var agendaId = c.request.pathValue('id')
  var reqInfo = c.requestInfo()
  var body = reqInfo && reqInfo.body ? reqInfo.body : {}

  var motivo = sanitizar(body.motivo)
  var novaDataInicio = sanitizar(body.nova_data_hora_inicio)
  var novaDataFim = sanitizar(body.nova_data_hora_fim)
  var novaSala = sanitizar(body.nova_sala_equipamento)
  var novoProfissionalId = sanitizar(body.novo_profissional_id)
  var novoProfissionalNome = sanitizar(body.novo_profissional_nome)
  var preparoOrientacoes = sanitizar(body.preparo_orientacoes)

  if (!motivo || motivo.length < 5) {
    return c.json(400, {
      erro: 'O reagendamento exige justificativa formal com no mínimo 5 caracteres.',
    })
  }

  if (!novaDataInicio || !novaDataFim) {
    return c.json(400, { erro: 'Novas datas e horários de início e fim são obrigatórios.' })
  }

  try {
    var agendaAntiga = c.app.findRecordById('ris_agendas', agendaId)
    var statusAnt = agendaAntiga.getString('status')
    if (statusAnt === 'cancelado' || statusAnt === 'realizado') {
      return c.json(400, {
        erro: 'Não é possível reagendar um agendamento já cancelado ou realizado.',
      })
    }

    var salaDestino = novaSala || agendaAntiga.getString('sala_equipamento')
    var profDestinoId = novoProfissionalId || agendaAntiga.getString('profissional_responsavel')
    var profDestinoNome = novoProfissionalNome || agendaAntiga.getString('profissional_nome')

    // Conflito de horário
    var conflitos = c.app.findRecordsByFilter(
      'ris_agendas',
      '(status = "agendado" || status = "confirmado") && sala_equipamento = {:sala} && data_hora_inicio < {:fim} && data_hora_fim > {:ini} && id != {:origId}',
      '-created',
      5,
      0,
      { sala: salaDestino, ini: novaDataInicio, fim: novaDataFim, origId: agendaId },
    )
    if (conflitos && conflitos.length > 0) {
      return c.json(409, {
        erro:
          'CONFLITO_DE_AGENDA: A sala/equipamento "' +
          salaDestino +
          '" já está ocupada no novo horário.',
      })
    }

    // Inativação lógica da agenda anterior SEM exclusão física
    agendaAntiga.set('status', 'reagendado')
    agendaAntiga.set('motivo_cancelamento_reagendamento', motivo)
    c.app.save(agendaAntiga)

    // Cria nova agenda
    var exameId = agendaAntiga.getString('exame')
    var pacienteId = agendaAntiga.getString('paciente')
    var pacRec = c.app.findRecordById('pacientes', pacienteId)
    var exameRec = c.app.findRecordById('exames', exameId)

    var comprovanteId = 'COMP-RIS-REAG-' + Date.now().toString(36).toUpperCase()
    var snapshotComprovante = {
      comprovante_id: comprovanteId,
      exame_id: exameId,
      tipo_exame: exameRec.getString('tipo_exame'),
      modalidade_ris: exameRec.getString('modalidade_ris') || 'rx',
      paciente_id: pacRec.id,
      paciente_nome: pacRec.getString('nome'),
      paciente_cpf: pacRec.getString('cpf')
        ? pacRec.getString('cpf').replace(/(\d{3})\d{5}(\d{2})/, '$1.***.**$2')
        : '',
      paciente_cns: pacRec.getString('cartao_sus')
        ? pacRec.getString('cartao_sus').replace(/(\d{3})\d{8}(\d{4})/, '$1.****.****.$2')
        : '',
      sala_equipamento: salaDestino,
      data_hora_inicio: novaDataInicio,
      data_hora_fim: novaDataFim,
      profissional_responsavel: profDestinoNome || 'Equipe do Setor de Imagem',
      preparo_orientacoes: preparoOrientacoes || agendaAntiga.getString('preparo_orientacoes'),
      motivo_reagendamento: motivo,
      agenda_anterior_id: agendaId,
      data_hora_emissao:
        new Date().toISOString().slice(0, 10) + ' ' + new Date().toTimeString().slice(0, 5),
      emissor_nome: auth.getString('name') || 'Operador',
      seguranca_hash: 'RIS-REAG-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    }

    var colAg = c.app.findCollectionByNameOrId('ris_agendas')
    var novaAg = new Record(colAg)
    novaAg.set('exame', exameId)
    novaAg.set('paciente', pacienteId)
    novaAg.set('sala_equipamento', salaDestino)
    if (profDestinoId) novaAg.set('profissional_responsavel', profDestinoId)
    novaAg.set('profissional_nome', profDestinoNome)
    novaAg.set('data_hora_inicio', novaDataInicio)
    novaAg.set('data_hora_fim', novaDataFim)
    novaAg.set('status', 'agendado')
    novaAg.set('agenda_anterior_id', agendaId)
    novaAg.set('motivo_cancelamento_reagendamento', motivo)
    novaAg.set('preparo_orientacoes', snapshotComprovante.preparo_orientacoes)
    novaAg.set('comprovante_snapshot', JSON.stringify(snapshotComprovante))
    novaAg.set('usuario_autor_id', auth.id)
    novaAg.set('usuario_autor_nome', auth.getString('name') || 'Operador')
    c.app.save(novaAg)

    // Trilha auditável
    try {
      var colHist = c.app.findCollectionByNameOrId('ris_historico_transicoes')
      var hRec = new Record(colHist)
      hRec.set('exame', exameId)
      hRec.set('status_anterior', 'agendado')
      hRec.set('status_novo', 'agendado')
      hRec.set(
        'motivo_justificativa',
        'Reagendamento: ' + motivo + ' (Nova data: ' + novaDataInicio + ')',
      )
      hRec.set('usuario_autor_id', auth.id)
      hRec.set('usuario_autor_nome', auth.getString('name') || 'Operador')
      hRec.set('data_hora', snapshotComprovante.data_hora_emissao)
      hRec.set(
        'detalhes',
        JSON.stringify({
          agenda_anterior_id: agendaId,
          nova_agenda_id: novaAg.id,
        }),
      )
      c.app.save(hRec)
    } catch (_) {}

    return c.json(200, {
      sucesso: true,
      mensagem: 'Reagendamento concluído mantendo histórico auditável.',
      agenda_anterior_id: agendaId,
      nova_agenda_id: novaAg.id,
      comprovante: snapshotComprovante,
    })
  } catch (err) {
    return c.json(400, { erro: err.message || String(err) })
  }
})

// ----------------------------------------------------------------------------
// 6. POST /backend/v1/ris/agendas/{id}/cancelar
// Cancelamento de agendamento preservando histórico
// ----------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/ris/agendas/{id}/cancelar', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado.' })
  }

  var agendaId = c.request.pathValue('id')
  var reqInfo = c.requestInfo()
  var body = reqInfo && reqInfo.body ? reqInfo.body : {}
  var motivo = sanitizar(body.motivo)

  if (!motivo || motivo.length < 5) {
    return c.json(400, {
      erro: 'Cancelamento de agendamento exige motivo formal (mínimo 5 caracteres).',
    })
  }

  try {
    var agRec = c.app.findRecordById('ris_agendas', agendaId)
    var stAnt = agRec.getString('status')
    if (stAnt === 'cancelado') {
      return c.json(400, { erro: 'O agendamento já se encontra cancelado.' })
    }

    agRec.set('status', 'cancelado')
    agRec.set('motivo_cancelamento_reagendamento', motivo)
    c.app.save(agRec)

    var exameId = agRec.getString('exame')
    try {
      var exRec = c.app.findRecordById('exames', exameId)
      if (exRec.getString('status_ris') === 'agendado') {
        exRec.set('status_ris', 'solicitado')
        c.app.save(exRec)
      }
    } catch (_) {}

    return c.json(200, {
      sucesso: true,
      mensagem: 'Agendamento cancelado com sucesso e preservado no histórico.',
      agenda_id: agendaId,
      status: 'cancelado',
    })
  } catch (err) {
    return c.json(400, { erro: err.message || String(err) })
  }
})

// ----------------------------------------------------------------------------
// 7. POST /backend/v1/ris/exames/{id}/registrar-externo
// Exame externo: identifica prestador/origem sem falsear execução interna
// ----------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/ris/exames/{id}/registrar-externo', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado.' })
  }

  var exameId = c.request.pathValue('id')
  var reqInfo = c.requestInfo()
  var body = reqInfo && reqInfo.body ? reqInfo.body : {}

  var prestadorNome = sanitizar(body.prestador_externo_nome)
  var prestadorCnes = sanitizar(body.prestador_externo_cnes)
  var prestadorUf = sanitizar(body.prestador_externo_uf)
  var observacoes = sanitizar(body.observacoes)

  if (!prestadorNome || prestadorNome.length < 3) {
    return c.json(400, {
      erro: 'Identificação do prestador externo credenciado é obrigatória (mínimo 3 caracteres).',
    })
  }

  try {
    var exRec = c.app.findRecordById('exames', exameId)
    if (exRec.getString('status_ris') === 'cancelado') {
      return c.json(400, { erro: 'Não é possível registrar execução para exame cancelado.' })
    }

    exRec.set('tipo_execucao', 'externo')
    exRec.set('prestador_externo_nome', prestadorNome)
    if (prestadorCnes) exRec.set('prestador_externo_cnes', prestadorCnes)
    if (prestadorUf) exRec.set('prestador_externo_uf', prestadorUf)

    exRec.set('status_ris', 'realizado_aguardando_laudo')
    exRec.set('status', 'em_analise')
    c.app.save(exRec)

    // Trilha auditável
    try {
      var colHist = c.app.findCollectionByNameOrId('ris_historico_transicoes')
      var hRec = new Record(colHist)
      hRec.set('exame', exameId)
      hRec.set('status_anterior', exRec.getString('status_ris'))
      hRec.set('status_novo', 'realizado_aguardando_laudo')
      hRec.set(
        'motivo_justificativa',
        'Exame realizado por terceiro credenciado: ' +
          prestadorNome +
          (prestadorCnes ? ' (CNES ' + prestadorCnes + ')' : ''),
      )
      hRec.set('usuario_autor_id', auth.id)
      hRec.set('usuario_autor_nome', auth.getString('name') || 'Operador')
      hRec.set(
        'data_hora',
        new Date().toISOString().slice(0, 10) + ' ' + new Date().toTimeString().slice(0, 5),
      )
      hRec.set(
        'detalhes',
        JSON.stringify({
          tipo_execucao: 'externo',
          prestador_nome: prestadorNome,
          prestador_cnes: prestadorCnes,
          observacoes: observacoes,
        }),
      )
      c.app.save(hRec)
    } catch (_) {}

    return c.json(200, {
      sucesso: true,
      mensagem:
        'Exame registrado como executado por prestador externo credenciado. Aguardando laudo.',
      exame_id: exameId,
      tipo_execucao: 'externo',
      prestador_externo_nome: prestadorNome,
      status_ris: 'realizado_aguardando_laudo',
    })
  } catch (err) {
    return c.json(400, { erro: err.message || String(err) })
  }
})

// ----------------------------------------------------------------------------
// 8. Gestão de Modelos de Laudo por Procedimento (Versionados e Inativáveis)
// POST /backend/v1/ris/modelos
// POST /backend/v1/ris/modelos/{id}/inativar
// ----------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/ris/modelos', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado.' })
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    return c.json(403, {
      erro: 'Recepção não tem permissão para cadastrar ou versionar modelos de laudo.',
    })
  }

  var reqInfo = c.requestInfo()
  var body = reqInfo && reqInfo.body ? reqInfo.body : {}

  var titulo = sanitizar(body.titulo)
  var modalidade = sanitizar(body.modalidade).toLowerCase()
  var codigoProcedimento = sanitizar(body.codigo_procedimento)
  var procedimentoNome = sanitizar(body.procedimento_nome)
  var textoPadrao = sanitizar(body.texto_padrao)
  var modeloAnteriorId = sanitizar(body.modelo_anterior_id)
  var motivoAlteracao = sanitizar(body.motivo_alteracao)

  if (!titulo || !modalidade || !procedimentoNome || !textoPadrao) {
    return c.json(400, {
      erro: 'Campos obrigatórios: titulo, modalidade, procedimento_nome e texto_padrao.',
    })
  }

  try {
    var versao = 1
    if (modeloAnteriorId) {
      try {
        var modAnt = c.app.findRecordById('ris_modelos_laudo', modeloAnteriorId)
        versao = (modAnt.getInt('versao') || 1) + 1
        modAnt.set('ativo', false)
        c.app.save(modAnt)
      } catch (_) {}
    }

    var colMod = c.app.findCollectionByNameOrId('ris_modelos_laudo')
    var novoMod = new Record(colMod)
    novoMod.set('titulo', titulo)
    novoMod.set('modalidade', modalidade)
    if (codigoProcedimento) novoMod.set('codigo_procedimento', codigoProcedimento)
    novoMod.set('procedimento_nome', procedimentoNome)
    novoMod.set('texto_padrao', textoPadrao)
    novoMod.set('versao', versao)
    novoMod.set('ativo', true)
    if (modeloAnteriorId) novoMod.set('modelo_anterior_id', modeloAnteriorId)
    if (motivoAlteracao) novoMod.set('motivo_alteracao', motivoAlteracao)
    novoMod.set('usuario_autor_id', auth.id)
    novoMod.set('usuario_autor_nome', auth.getString('name') || 'Profissional')

    c.app.save(novoMod)

    return c.json(201, {
      sucesso: true,
      mensagem: 'Modelo de laudo ' + (versao > 1 ? 'versionado' : 'cadastrado') + ' com sucesso.',
      modelo_id: novoMod.id,
      versao: versao,
    })
  } catch (err) {
    return c.json(400, { erro: err.message || String(err) })
  }
})

routerAdd('POST', '/backend/v1/ris/modelos/{id}/inativar', (c) => {
  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado.' })
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    return c.json(403, { erro: 'Acesso negado.' })
  }

  var modeloId = c.request.pathValue('id')
  try {
    var modRec = c.app.findRecordById('ris_modelos_laudo', modeloId)
    modRec.set('ativo', false)
    c.app.save(modRec)

    return c.json(200, {
      sucesso: true,
      mensagem: 'Modelo de laudo inativado com sucesso (preservado no histórico).',
      modelo_id: modeloId,
      ativo: false,
    })
  } catch (err) {
    return c.json(404, { erro: 'Modelo de laudo não encontrado.' })
  }
})

// ----------------------------------------------------------------------------
// 9. POST /backend/v1/ris/exames/{id}/aplicar-modelo
// Aplicação do modelo GERA APENAS RASCUNHO para revisão humana
// JAMAIS sobrescreve laudo já liberado
// ----------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/ris/exames/{id}/aplicar-modelo', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado.' })
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    return c.json(403, { erro: 'Recepção não pode aplicar modelos ou redigir laudos.' })
  }

  var exameId = c.request.pathValue('id')
  var reqInfo = c.requestInfo()
  var body = reqInfo && reqInfo.body ? reqInfo.body : {}
  var modeloId = sanitizar(body.modelo_id)

  if (!modeloId) {
    return c.json(400, { erro: 'Identificador do modelo_id é obrigatório.' })
  }

  try {
    var exameRec = c.app.findRecordById('exames', exameId)

    // JAMAIS sobrescrever laudo liberado!
    var statusExame = exameRec.getString('status_ris') || exameRec.getString('status')
    if (statusExame === 'laudado' || exameRec.getString('status') === 'liberado') {
      return c.json(400, {
        erro: 'LAUDO LIBERADO IMUTÁVEL: Não é permitido aplicar modelo para sobrescrever um laudo que já foi liberado e assinado.',
      })
    }

    if (statusExame === 'cancelado') {
      return c.json(400, { erro: 'Não é possível aplicar modelo em exame cancelado.' })
    }

    var modeloRec = c.app.findRecordById('ris_modelos_laudo', modeloId)
    var textoModelo = modeloRec.getString('texto_padrao')

    // Gera APENAS rascunho_laudo, preservando status e campos de liberação
    exameRec.set('rascunho_laudo', textoModelo)
    exameRec.set('modelo_laudo_id', modeloId)
    c.app.save(exameRec)

    return c.json(200, {
      sucesso: true,
      mensagem: 'Modelo aplicado com sucesso como rascunho para revisão humana.',
      exame_id: exameId,
      modelo_id: modeloId,
      modelo_titulo: modeloRec.getString('titulo'),
      modelo_versao: modeloRec.getInt('versao'),
      rascunho_gerado: textoModelo,
    })
  } catch (err) {
    return c.json(400, { erro: err.message || String(err) })
  }
})
