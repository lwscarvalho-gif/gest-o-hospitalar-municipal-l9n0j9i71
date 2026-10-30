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

  // Sanitizador de HTML interno ao callback para isolamento JSVM do PocketBase
  function sanitizarHtmlServidorRIS(inputHtml) {
    if (!inputHtml) return ''
    var str = String(inputHtml)
    str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    str = str.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    str = str.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    str = str.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    str = str.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    str = str.replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '')
    str = str.replace(/<!--[\s\S]*?-->/g, '')
    str = str.replace(/\son[a-zA-Z_]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    str = str.replace(/href\s*=\s*["']?\s*(?:javascript|vbscript|data):[^"'>\s]*/gi, 'href="#"')
    str = str.replace(/<img\b([^>]*?)>/gi, function (match, attrs) {
      var srcMatch = attrs.match(/src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
      var srcVal = srcMatch ? srcMatch[1] || srcMatch[2] || srcMatch[3] || '' : ''
      srcVal = srcVal.trim()
      var isInternoValido =
        srcVal.indexOf('/api/files/ris_imagens_anexas/') !== -1 ||
        srcVal.indexOf('/api/files/exames/') !== -1 ||
        srcVal.indexOf('/assets/') === 0 ||
        srcVal.indexOf('/ris-internal-image/') === 0
      if (!isInternoValido) {
        return '<span class="ris-img-bloqueada text-slate-400 italic text-xs">[Imagem externa bloqueada por segurança do RIS]</span>'
      }
      var altMatch = attrs.match(/alt\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
      var altVal = altMatch ? altMatch[1] || altMatch[2] || 'Imagem do Exame' : 'Imagem do Exame'
      var widthMatch = attrs.match(/width\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
      var heightMatch = attrs.match(/height\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
      var idMatch = attrs.match(/data-imagem-id\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
      var safeAttrs =
        'src="' + srcVal.replace(/"/g, '&quot;') + '" alt="' + altVal.replace(/"/g, '&quot;') + '"'
      if (widthMatch)
        safeAttrs +=
          ' width="' +
          (widthMatch[1] || widthMatch[2] || widthMatch[3]).replace(/"/g, '&quot;') +
          '"'
      if (heightMatch)
        safeAttrs +=
          ' height="' +
          (heightMatch[1] || heightMatch[2] || heightMatch[3]).replace(/"/g, '&quot;') +
          '"'
      if (idMatch)
        safeAttrs += ' data-imagem-id="' + (idMatch[1] || idMatch[2]).replace(/"/g, '&quot;') + '"'
      safeAttrs +=
        ' class="ris-imagem-laudo-interna max-w-full rounded border border-slate-300 my-2"'
      return '<img ' + safeAttrs + ' />'
    })
    var allowlistTags = [
      'p',
      'br',
      'hr',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'mark',
      'span',
      'div',
      'ul',
      'ol',
      'li',
      'a',
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'input',
      'label',
    ]
    str = str.replace(
      /<(\/?)([a-zA-Z0-9_-]+)([^>]*)>/gi,
      function (fullMatch, closingSlash, tagName, restAttrs) {
        var tagLower = tagName.toLowerCase()
        if (tagLower === 'img') return fullMatch
        if (allowlistTags.indexOf(tagLower) === -1) return ''
        if (tagLower === 'input') {
          if (!restAttrs.match(/type\s*=\s*["']?checkbox["']?/i)) return ''
          var isChecked = !!restAttrs.match(/\bchecked\b/i)
          return (
            '<input type="checkbox"' +
            (isChecked ? ' checked' : '') +
            ' disabled class="ris-checklist-item" />'
          )
        }
        var safeTagAttrs = ''
        if (tagLower === 'a') {
          var hrefMatch = restAttrs.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
          var hVal = hrefMatch ? hrefMatch[1] || hrefMatch[2] || hrefMatch[3] || '#' : '#'
          if (
            hVal.toLowerCase().indexOf('javascript:') !== -1 ||
            hVal.toLowerCase().indexOf('data:') !== -1
          ) {
            hVal = '#'
          }
          safeTagAttrs +=
            ' href="' + hVal.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener noreferrer"'
        }
        if (tagLower === 'td' || tagLower === 'th') {
          var colMatch = restAttrs.match(/colspan\s*=\s*["']?(\d+)["']?/i)
          var rowMatch = restAttrs.match(/rowspan\s*=\s*["']?(\d+)["']?/i)
          if (colMatch) safeTagAttrs += ' colspan="' + colMatch[1] + '"'
          if (rowMatch) safeTagAttrs += ' rowspan="' + rowMatch[1] + '"'
        }
        var classMatch = restAttrs.match(/class\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
        if (classMatch) {
          var clsVal = (classMatch[1] || classMatch[2] || '').trim()
          safeTagAttrs += ' class="' + clsVal.replace(/["<>]/g, '') + '"'
        }
        var styleMatch = restAttrs.match(/style\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
        if (styleMatch) {
          var rawStyle = (styleMatch[1] || styleMatch[2] || '').trim()
          rawStyle = rawStyle.replace(/url\s*\([^)]*\)/gi, '')
          rawStyle = rawStyle.replace(/expression\s*\([^)]*\)/gi, '')
          rawStyle = rawStyle.replace(/javascript\s*:/gi, '')
          safeTagAttrs += ' style="' + rawStyle.replace(/"/g, '&quot;') + '"'
        }
        var dataMatches = restAttrs.match(/data-[a-zA-Z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*')/gi)
        if (dataMatches && dataMatches.length > 0) {
          for (var d = 0; d < dataMatches.length; d++) {
            safeTagAttrs += ' ' + dataMatches[d]
          }
        }
        return '<' + closingSlash + tagLower + safeTagAttrs + '>'
      },
    )
    return str
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

    var conteudoFormatado =
      body.conteudo_formatado !== undefined ? String(body.conteudo_formatado) : ''
    var configEditor = body.config_editor || null

    var colMod = c.app.findCollectionByNameOrId('ris_modelos_laudo')
    var novoMod = new Record(colMod)
    novoMod.set('titulo', titulo)
    novoMod.set('modalidade', modalidade)
    if (codigoProcedimento) novoMod.set('codigo_procedimento', codigoProcedimento)
    novoMod.set('procedimento_nome', procedimentoNome)
    novoMod.set('texto_padrao', textoPadrao)
    if (conteudoFormatado) {
      novoMod.set('conteudo_formatado', sanitizarHtmlServidorRIS(conteudoFormatado))
    } else {
      novoMod.set('conteudo_formatado', sanitizarHtmlServidorRIS(textoPadrao))
    }
    if (configEditor) {
      novoMod.set('config_editor', JSON.stringify(configEditor))
    }
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
// Suporta tanto texto puro legado quanto conteúdo formatado rico (v0.0.59+)
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
    var formatadoModelo = modeloRec.getString('conteudo_formatado') || textoModelo
    var configModeloRaw = modeloRec.getString('config_editor')

    // Gera APENAS rascunho_laudo e conteudo_formatado_rascunho, preservando status e campos de liberação
    exameRec.set('rascunho_laudo', textoModelo)
    exameRec.set('conteudo_formatado_rascunho', formatadoModelo)
    if (configModeloRaw) {
      exameRec.set('config_editor_rascunho', configModeloRaw)
    }
    exameRec.set('modelo_laudo_id', modeloId)
    var vAtual = exameRec.getInt('versao_conteudo_rascunho') || 0
    exameRec.set('versao_conteudo_rascunho', vAtual + 1)
    c.app.save(exameRec)

    return c.json(200, {
      sucesso: true,
      mensagem: 'Modelo aplicado com sucesso como rascunho para revisão humana.',
      exame_id: exameId,
      modelo_id: modeloId,
      modelo_titulo: modeloRec.getString('titulo'),
      modelo_versao: modeloRec.getInt('versao'),
      rascunho_gerado: textoModelo,
      conteudo_formatado_rascunho: formatadoModelo,
      versao_conteudo_rascunho: vAtual + 1,
    })
  } catch (err) {
    return c.json(400, { erro: err.message || String(err) })
  }
})

// ----------------------------------------------------------------------------
// 10. POST /backend/v1/ris/exames/{id}/salvar-rascunho
// Salva rascunho com sanitização server-side, concorrência otimista (409)
// e autor autêntico da sessão PocketBase (@request.auth.id)
// ----------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/ris/exames/{id}/salvar-rascunho', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado: faça login para editar rascunho de laudo.' })
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    return c.json(403, {
      erro: 'Acesso negado: Perfil de recepção não tem autorização para redigir ou salvar rascunhos de laudo.',
    })
  }

  var exameId = c.request.pathValue('id')
  var reqInfo = c.requestInfo()
  var body = reqInfo && reqInfo.body ? reqInfo.body : {}

  var conteudoFormatado =
    body.conteudo_formatado !== undefined ? String(body.conteudo_formatado) : ''
  var configEditor = body.config_editor || {}
  var versaoEsperada = parseInt(body.versao_esperada, 10)
  var resultadoSumario = sanitizar(body.resultado_sumario)

  try {
    var exameRec = c.app.findRecordById('exames', exameId)

    // Laudo liberado é imutável contra sobrescrita direta de rascunho
    var statusExame = exameRec.getString('status_ris') || exameRec.getString('status')
    if (statusExame === 'laudado' || exameRec.getString('status') === 'liberado') {
      return c.json(400, {
        erro: 'LAUDO LIBERADO IMUTÁVEL: Não é permitido alterar rascunho de exame já liberado. Utilize o fluxo de retificação.',
      })
    }

    if (statusExame === 'cancelado') {
      return c.json(400, { erro: 'Não é possível alterar rascunho de exame cancelado.' })
    }

    // Concorrência de edição otimista (versão / conflito 409)
    var versaoAtual = exameRec.getInt('versao_conteudo_rascunho') || 0
    if (!isNaN(versaoEsperada) && versaoEsperada > 0 && versaoEsperada !== versaoAtual) {
      return c.json(409, {
        erro: 'CONFLITO_CONCORRENCIA_EDICAO: O rascunho deste laudo foi modificado por outro profissional. Atualize sua visualização antes de salvar.',
        versao_atual_servidor: versaoAtual,
        versao_esperada_cliente: versaoEsperada,
      })
    }

    // Sanitização server-side obrigatória (fonte da verdade)
    var htmlSanitizado = sanitizarHtmlServidorRIS(conteudoFormatado)

    // Extrai texto puro mantendo legibilidade para compatibilidade com buscas e legado
    var textoPuro = htmlSanitizado
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    var novaVersao = versaoAtual + 1
    exameRec.set('conteudo_formatado_rascunho', htmlSanitizado)
    exameRec.set('config_editor_rascunho', JSON.stringify(configEditor))
    exameRec.set('versao_conteudo_rascunho', novaVersao)
    exameRec.set('rascunho_laudo', textoPuro)
    if (resultadoSumario) {
      exameRec.set('resultado_sumario', resultadoSumario)
    }

    c.app.save(exameRec)

    return c.json(200, {
      sucesso: true,
      mensagem: 'Rascunho formatado salvo com sanitização do servidor com sucesso.',
      exame_id: exameId,
      versao_conteudo_rascunho: novaVersao,
      autor_id: auth.id,
      autor_nome: auth.getString('name') || 'Profissional',
    })
  } catch (err) {
    return c.json(400, { erro: err.message || String(err) })
  }
})

// ----------------------------------------------------------------------------
// 11. POST /backend/v1/ris/exames/{id}/publicar-laudo
// Liberação formal do laudo: congela conteúdo formatado E configuração usada,
// cria versão 1 imutável em `laudos_versoes`, autor derivado da sessão (@request.auth.id),
// atualiza status do exame para 'laudado' / 'liberado', idempotência persistente.
// ----------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/ris/exames/{id}/publicar-laudo', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado: faça login para liberar laudo no RIS.' })
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    return c.json(403, {
      erro: 'Acesso negado: Perfil de recepção não tem autorização clínica para liberar laudos médicos no RIS.',
    })
  }

  var exameId = c.request.pathValue('id')
  var reqInfo = c.requestInfo()
  var body = reqInfo && reqInfo.body ? reqInfo.body : {}

  var conteudoFormatado =
    body.conteudo_formatado !== undefined ? String(body.conteudo_formatado) : ''
  var configEditor = body.config_editor || {}
  var resultadoSumario = sanitizar(body.resultado_sumario)
  var idempotencyKey = sanitizar(body.idempotency_key)

  if (!resultadoSumario) {
    return c.json(400, {
      erro: 'Parecer conclusivo / sumário do resultado é obrigatório para liberação do laudo.',
    })
  }

  // Idempotência persistente
  if (idempotencyKey) {
    try {
      var versExistentes = c.app.findRecordsByFilter(
        'laudos_versoes',
        'idempotency_key = {:k}',
        '-created',
        1,
        0,
        { k: idempotencyKey },
      )
      if (versExistentes && versExistentes.length > 0) {
        var vOrig = versExistentes[0]
        if (vOrig.getString('exame') !== exameId) {
          return c.json(409, {
            erro: 'IDEMPOTENCY_PAYLOAD_CONFLICT: A mesma chave já foi usada para outro exame.',
          })
        }
        return c.json(200, {
          sucesso: true,
          idempotente: true,
          mensagem: 'Laudo já publicado anteriormente para esta chave de idempotência.',
          exame_id: exameId,
          versao_numero: vOrig.getInt('numero_versao') || 1,
          versao_id: vOrig.id,
        })
      }
    } catch (_) {}
  }

  try {
    var exameRec = c.app.findRecordById('exames', exameId)

    if (
      exameRec.getString('status_ris') === 'cancelado' ||
      exameRec.getString('status') === 'cancelado'
    ) {
      return c.json(400, { erro: 'Não é possível publicar laudo para exame cancelado.' })
    }

    var stAnt = exameRec.getString('status_ris') || exameRec.getString('status')
    if (stAnt === 'laudado' || exameRec.getString('status') === 'liberado') {
      return c.json(400, {
        erro: 'LAUDO JÁ EMITIDO: O exame já possui laudo homologado. Para emitir correções, utilize o fluxo de retificação.',
      })
    }

    // Sanitização server-side
    var htmlSanitizado = sanitizarHtmlServidorRIS(conteudoFormatado)
    if (!htmlSanitizado || htmlSanitizado.trim().length === 0) {
      // Se não veio no body, busca do rascunho prévio sanitizado
      htmlSanitizado = exameRec.getString('conteudo_formatado_rascunho') || ''
    }
    if (!htmlSanitizado || htmlSanitizado.trim().length === 0) {
      return c.json(400, { erro: 'Conteúdo do laudo não pode ser vazio para homologação.' })
    }

    var textoPuro = htmlSanitizado
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // Consulta imagens anexas ativas vinculadas a este exame para snapshot congelado
    var imagensSnapshot = []
    try {
      var imgRecs = c.app.findRecordsByFilter(
        'ris_imagens_anexas',
        'exame = {:exId}',
        'ordem',
        50,
        0,
        { exId: exameId },
      )
      for (var i = 0; i < imgRecs.length; i++) {
        var im = imgRecs[i]
        imagensSnapshot.push({
          id: im.id,
          arquivo: im.getString('arquivo'),
          legenda: im.getString('legenda'),
          ordem: im.getInt('ordem') || i + 1,
          mime_type: im.getString('mime_type'),
          tamanho_bytes: im.getInt('tamanho_bytes') || 0,
        })
      }
    } catch (_) {}

    var agora = new Date()
    var dataLaudo = agora.toISOString().slice(0, 10) + ' ' + agora.toTimeString().slice(0, 5)
    var autorNome = auth.getString('name') || 'Médico Radiologista'
    var autorCargo = auth.getString('cargo') || auth.getString('role')
    var autorId = auth.id

    // Busca vínculo com profissionais se existir
    var profResponsavelId = ''
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
        profResponsavelId = profs[0].id
      }
    } catch (_) {}

    // Grava atomicamente na coleção `laudos_versoes` com snapshot imutável
    var colVersoes = c.app.findCollectionByNameOrId('laudos_versoes')
    var novaVersao = new Record(colVersoes)
    novaVersao.set('exame', exameId)
    novaVersao.set('numero_versao', 1)
    novaVersao.set('resultado_sumario', resultadoSumario)
    novaVersao.set('laudo_texto', textoPuro)
    novaVersao.set('conteudo_formatado', htmlSanitizado)
    novaVersao.set('config_editor_snapshot', JSON.stringify(configEditor))
    novaVersao.set('imagens_anexas_snapshot', JSON.stringify(imagensSnapshot))
    novaVersao.set('responsavel_laudo', profResponsavelId || null)
    novaVersao.set('responsavel_laudo_nome', autorNome)
    novaVersao.set('responsavel_laudo_cargo', autorCargo)
    novaVersao.set('data_laudo', dataLaudo)
    novaVersao.set('usuario_id', autorId)
    novaVersao.set('motivo_retificacao', 'Homologação e liberação inicial do laudo RIS')
    if (idempotencyKey) {
      novaVersao.set('idempotency_key', idempotencyKey)
    }
    c.app.save(novaVersao)

    // Atualiza exame principal para estado liberado
    exameRec.set('status_ris', 'laudado')
    exameRec.set('status', 'liberado')
    exameRec.set('resultado_sumario', resultadoSumario)
    exameRec.set('laudo_texto', textoPuro)
    exameRec.set('conteudo_formatado_rascunho', htmlSanitizado)
    exameRec.set('versao_atual', 1)
    exameRec.set('data_laudo', dataLaudo)
    exameRec.set('responsavel_laudo', profResponsavelId || null)
    exameRec.set('responsavel_laudo_nome', autorNome)
    c.app.save(exameRec)

    // Trilha auditável
    try {
      var colHist = c.app.findCollectionByNameOrId('ris_historico_transicoes')
      var hRec = new Record(colHist)
      hRec.set('exame', exameId)
      hRec.set('status_anterior', stAnt)
      hRec.set('status_novo', 'laudado')
      hRec.set(
        'motivo_justificativa',
        'Liberação formal do laudo no módulo RIS (Versão 1 congelada)',
      )
      hRec.set('usuario_autor_id', autorId)
      hRec.set('usuario_autor_nome', autorNome)
      hRec.set('usuario_cargo', autorCargo)
      hRec.set('data_hora', dataLaudo)
      hRec.set(
        'detalhes',
        JSON.stringify({
          versao_id: novaVersao.id,
          versao_numero: 1,
          resultado_sumario: resultadoSumario,
          total_imagens_anexadas: imagensSnapshot.length,
        }),
      )
      c.app.save(hRec)
    } catch (_) {}

    return c.json(201, {
      sucesso: true,
      mensagem: 'Laudo RIS publicado e congelado na Versão 1 com sucesso.',
      exame_id: exameId,
      versao_id: novaVersao.id,
      versao_numero: 1,
      status_ris: 'laudado',
      data_laudo: dataLaudo,
      responsavel_nome: autorNome,
    })
  } catch (err) {
    return c.json(400, { erro: err.message || String(err) })
  }
})

// ----------------------------------------------------------------------------
// 12. POST /backend/v1/ris/exames/{id}/retificar-laudo
// Retificação formal: cria NOVA versão em `laudos_versoes`, NUNCA altera nem sobrescreve
// as versões emitidas anteriores (preservando histórico imutável da v0.0.59),
// exige justificativa clínica e autor da sessão autenticada.
// ----------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/ris/exames/{id}/retificar-laudo', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado: faça login para retificar laudo.' })
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    return c.json(403, {
      erro: 'Acesso negado: Perfil de recepção não tem autorização para retificar laudos.',
    })
  }

  var exameId = c.request.pathValue('id')
  var reqInfo = c.requestInfo()
  var body = reqInfo && reqInfo.body ? reqInfo.body : {}

  var conteudoFormatado =
    body.conteudo_formatado !== undefined ? String(body.conteudo_formatado) : ''
  var configEditor = body.config_editor || {}
  var resultadoSumario = sanitizar(body.resultado_sumario)
  var motivoRetificacao = sanitizar(body.motivo_retificacao)
  var idempotencyKey = sanitizar(body.idempotency_key)

  if (!motivoRetificacao || motivoRetificacao.length < 5) {
    return c.json(400, {
      erro: 'JUSTIFICATIVA OBRIGATÓRIA: A retificação de laudo exige justificativa clínica detalhada (mínimo 5 caracteres).',
    })
  }

  if (!resultadoSumario) {
    return c.json(400, {
      erro: 'Parecer conclusivo / sumário do resultado é obrigatório para nova versão do laudo.',
    })
  }

  // Idempotência
  if (idempotencyKey) {
    try {
      var versExistentes = c.app.findRecordsByFilter(
        'laudos_versoes',
        'idempotency_key = {:k}',
        '-created',
        1,
        0,
        { k: idempotencyKey },
      )
      if (versExistentes && versExistentes.length > 0) {
        var vOrig = versExistentes[0]
        if (vOrig.getString('exame') !== exameId) {
          return c.json(409, {
            erro: 'IDEMPOTENCY_PAYLOAD_CONFLICT: A chave já foi usada para outro exame.',
          })
        }
        return c.json(200, {
          sucesso: true,
          idempotente: true,
          mensagem: 'Retificação já registrada para esta chave de idempotência.',
          exame_id: exameId,
          versao_numero: vOrig.getInt('numero_versao'),
          versao_id: vOrig.id,
        })
      }
    } catch (_) {}
  }

  try {
    var exameRec = c.app.findRecordById('exames', exameId)

    if (
      exameRec.getString('status_ris') === 'cancelado' ||
      exameRec.getString('status') === 'cancelado'
    ) {
      return c.json(400, { erro: 'Não é possível retificar exame cancelado.' })
    }

    // Busca histórico de versões para determinar próxima versão
    var versoesAnteriores = c.app.findRecordsByFilter(
      'laudos_versoes',
      'exame = {:exId}',
      '-numero_versao',
      100,
      0,
      { exId: exameId },
    )

    var maiorVersao = 1
    var versaoAnteriorId = ''
    if (versoesAnteriores && versoesAnteriores.length > 0) {
      maiorVersao = versoesAnteriores[0].getInt('numero_versao') || 1
      versaoAnteriorId = versoesAnteriores[0].id
    }
    var proximaVersao = maiorVersao + 1

    // Sanitização server-side
    var htmlSanitizado = sanitizarHtmlServidorRIS(conteudoFormatado)
    var textoPuro = htmlSanitizado
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // Snapshot das imagens anexas ativas vinculadas
    var imagensSnapshot = []
    try {
      var imgRecs = c.app.findRecordsByFilter(
        'ris_imagens_anexas',
        'exame = {:exId}',
        'ordem',
        50,
        0,
        { exId: exameId },
      )
      for (var i = 0; i < imgRecs.length; i++) {
        var im = imgRecs[i]
        imagensSnapshot.push({
          id: im.id,
          arquivo: im.getString('arquivo'),
          legenda: im.getString('legenda'),
          ordem: im.getInt('ordem') || i + 1,
          mime_type: im.getString('mime_type'),
          tamanho_bytes: im.getInt('tamanho_bytes') || 0,
        })
      }
    } catch (_) {}

    var agora = new Date()
    var dataLaudo = agora.toISOString().slice(0, 10) + ' ' + agora.toTimeString().slice(0, 5)
    var autorNome = auth.getString('name') || 'Médico Radiologista'
    var autorCargo = auth.getString('cargo') || auth.getString('role')
    var autorId = auth.id

    var profResponsavelId = ''
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
        profResponsavelId = profs[0].id
      }
    } catch (_) {}

    // Cria NOVA versão (sem alterar o registro da versão anterior!)
    var colVersoes = c.app.findCollectionByNameOrId('laudos_versoes')
    var novaVersaoRec = new Record(colVersoes)
    novaVersaoRec.set('exame', exameId)
    novaVersaoRec.set('numero_versao', proximaVersao)
    novaVersaoRec.set('versao_anterior_id', versaoAnteriorId)
    novaVersaoRec.set('motivo_retificacao', motivoRetificacao)
    novaVersaoRec.set('resultado_sumario', resultadoSumario)
    novaVersaoRec.set('laudo_texto', textoPuro)
    novaVersaoRec.set('conteudo_formatado', htmlSanitizado)
    novaVersaoRec.set('config_editor_snapshot', JSON.stringify(configEditor))
    novaVersaoRec.set('imagens_anexas_snapshot', JSON.stringify(imagensSnapshot))
    novaVersaoRec.set('responsavel_laudo', profResponsavelId || null)
    novaVersaoRec.set('responsavel_laudo_nome', autorNome)
    novaVersaoRec.set('responsavel_laudo_cargo', autorCargo)
    novaVersaoRec.set('data_laudo', dataLaudo)
    novaVersaoRec.set('usuario_id', autorId)
    if (idempotencyKey) {
      novaVersaoRec.set('idempotency_key', idempotencyKey)
    }
    c.app.save(novaVersaoRec)

    // Atualiza exame principal para apontar para a versão vigente e marcar retificação
    exameRec.set('versao_atual', proximaVersao)
    exameRec.set('tem_retificacao', true)
    exameRec.set('resultado_sumario', resultadoSumario)
    exameRec.set('laudo_texto', textoPuro)
    exameRec.set('conteudo_formatado_rascunho', htmlSanitizado)
    exameRec.set('data_laudo', dataLaudo)
    exameRec.set('responsavel_laudo', profResponsavelId || null)
    exameRec.set('responsavel_laudo_nome', autorNome)
    c.app.save(exameRec)

    // Trilha auditável
    try {
      var colHist = c.app.findCollectionByNameOrId('ris_historico_transicoes')
      var hRec = new Record(colHist)
      hRec.set('exame', exameId)
      hRec.set('status_anterior', 'laudado')
      hRec.set('status_novo', 'laudado')
      hRec.set(
        'motivo_justificativa',
        'Retificação de Laudo: Versão ' + proximaVersao + ' — ' + motivoRetificacao,
      )
      hRec.set('usuario_autor_id', autorId)
      hRec.set('usuario_autor_nome', autorNome)
      hRec.set('usuario_cargo', autorCargo)
      hRec.set('data_hora', dataLaudo)
      hRec.set(
        'detalhes',
        JSON.stringify({
          versao_nova_id: novaVersaoRec.id,
          versao_anterior_id: versaoAnteriorId,
          numero_versao: proximaVersao,
          motivo_retificacao: motivoRetificacao,
        }),
      )
      c.app.save(hRec)
    } catch (_) {}

    return c.json(201, {
      sucesso: true,
      mensagem:
        'Laudo retificado com sucesso criando Versão ' +
        proximaVersao +
        ' sem alterar as emitidas anteriores.',
      exame_id: exameId,
      versao_id: novaVersaoRec.id,
      versao_numero: proximaVersao,
      versao_anterior_id: versaoAnteriorId,
      data_laudo: dataLaudo,
      responsavel_nome: autorNome,
    })
  } catch (err) {
    return c.json(400, { erro: err.message || String(err) })
  }
})

// ----------------------------------------------------------------------------
// 13. GET /backend/v1/ris/exames/{id}/previa-laudo
// Serve prévia fiel do laudo formatado com layout municipal de impressão assistencial,
// dados do paciente, histórico de versões e imagens anexas vinculadas.
// Recepção é estritamente bloqueada.
// ----------------------------------------------------------------------------
routerAdd('GET', '/backend/v1/ris/exames/{id}/previa-laudo', (c) => {
  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado.' })
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    return c.json(403, {
      erro: 'Acesso negado: Perfil de recepção não tem acesso aos dados clínicos do laudo.',
    })
  }

  var exameId = c.request.pathValue('id')

  try {
    var exameRec = c.app.findRecordById('exames', exameId)
    var pacienteId = exameRec.getString('paciente')
    var pacRec = c.app.findRecordById('pacientes', pacienteId)

    // Busca versão vigente ou rascunho
    var versoes = c.app.findRecordsByFilter(
      'laudos_versoes',
      'exame = {:exId}',
      '-numero_versao',
      50,
      0,
      { exId: exameId },
    )

    var versaoVigente = versoes && versoes.length > 0 ? versoes[0] : null

    var conteudoHtml = ''
    var configEditor = {}
    var imagens = []

    if (versaoVigente) {
      conteudoHtml =
        versaoVigente.getString('conteudo_formatado') || versaoVigente.getString('laudo_texto')
      var cfgRaw = versaoVigente.getString('config_editor_snapshot')
      if (cfgRaw) {
        try {
          configEditor = JSON.parse(cfgRaw)
        } catch (_) {}
      }
      var imgRaw = versaoVigente.getString('imagens_anexas_snapshot')
      if (imgRaw) {
        try {
          imagens = JSON.parse(imgRaw)
        } catch (_) {}
      }
    } else {
      // Prévia de rascunho antes da publicação
      conteudoHtml =
        exameRec.getString('conteudo_formatado_rascunho') || exameRec.getString('rascunho_laudo')
      var cfgRascRaw = exameRec.getString('config_editor_rascunho')
      if (cfgRascRaw) {
        try {
          configEditor = JSON.parse(cfgRascRaw)
        } catch (_) {}
      }
      // Busca imagens anexas vinculadas
      try {
        var imList = c.app.findRecordsByFilter(
          'ris_imagens_anexas',
          'exame = {:exId}',
          'ordem',
          50,
          0,
          { exId: exameId },
        )
        for (var i = 0; i < imList.length; i++) {
          var imObj = imList[i]
          imagens.push({
            id: imObj.id,
            arquivo: imObj.getString('arquivo'),
            legenda: imObj.getString('legenda'),
            ordem: imObj.getInt('ordem') || i + 1,
            mime_type: imObj.getString('mime_type'),
          })
        }
      } catch (_) {}
    }

    var historicoFormatado = []
    if (versoes && versoes.length > 0) {
      for (var v = 0; v < versoes.length; v++) {
        var ver = versoes[v]
        historicoFormatado.push({
          id: ver.id,
          numero_versao: ver.getInt('numero_versao'),
          data_laudo: ver.getString('data_laudo'),
          responsavel_laudo_nome: ver.getString('responsavel_laudo_nome'),
          responsavel_laudo_cargo: ver.getString('responsavel_laudo_cargo'),
          motivo_retificacao: ver.getString('motivo_retificacao'),
          versao_anterior_id: ver.getString('versao_anterior_id'),
        })
      }
    }

    return c.json(200, {
      sucesso: true,
      exame_id: exameId,
      paciente: {
        id: pacRec.id,
        nome: pacRec.getString('nome'),
        cpf_mascarado: pacRec.getString('cpf')
          ? pacRec.getString('cpf').replace(/(\d{3})\d{5}(\d{2})/, '$1.***.**$2')
          : '',
        cns_mascarado: pacRec.getString('cartao_sus')
          ? pacRec.getString('cartao_sus').replace(/(\d{3})\d{8}(\d{4})/, '$1.****.****.$2')
          : '',
        data_nascimento: pacRec.getString('data_nascimento'),
        sexo: pacRec.getString('sexo'),
        tipo_sanguineo: pacRec.getString('tipo_sanguineo'),
        alergias: pacRec.getString('alergias'),
      },
      exame: {
        tipo_exame: exameRec.getString('tipo_exame'),
        modalidade_ris: exameRec.getString('modalidade_ris') || 'outro',
        data_solicitacao: exameRec.getString('data_solicitacao'),
        solicitante_nome: exameRec.getString('solicitante_nome'),
        status_ris: exameRec.getString('status_ris') || exameRec.getString('status'),
        data_laudo: exameRec.getString('data_laudo'),
        responsavel_laudo_nome: exameRec.getString('responsavel_laudo_nome'),
        resultado_sumario: exameRec.getString('resultado_sumario'),
        versao_vigente: exameRec.getInt('versao_atual') || 1,
        tem_retificacao: exameRec.getBool('tem_retificacao'),
        tipo_execucao: exameRec.getString('tipo_execucao') || 'interno',
        prestador_externo_nome: exameRec.getString('prestador_externo_nome'),
      },
      previa: {
        tipo_conteudo: versaoVigente ? 'publicado' : 'rascunho',
        conteudo_formatado_sanitizado: conteudoHtml,
        config_editor: configEditor,
        imagens_anexas: imagens,
        historico_versoes: historicoFormatado,
        unidade_nome: 'Hospital Municipal de Mirante da Serra',
        municipio_uf: 'Mirante da Serra - RO',
        aviso_legal:
          'Documento clínico assistencial oficial emitido no Sistema Hospitalar Municipal. Válido com assinatura física ou carimbo profissional. Não constitui certificação ICP-Brasil.',
      },
    })
  } catch (err) {
    return c.json(400, { erro: err.message || String(err) })
  }
})
