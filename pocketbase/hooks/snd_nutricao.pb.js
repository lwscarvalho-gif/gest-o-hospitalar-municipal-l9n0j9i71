/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Integridade Server-Side: Módulo SND (Serviço de Nutrição e Dietética) BASE
 * Requisitos 7.4.3.5.a.i–ii e 7.4.3.5.b.i (p.22–23)
 *
 * Princípios e Invariantes:
 * 1. Catálogo parametrizável de refeições e dietas (oral, rotina, enteral, parenteral, especial)
 *    versionado e inativável (sem exclusão física).
 * 2. Prescrição individualizada SOMENTE por profissional humano autorizado (médico / nutricionista /
 *    profissional com role autorizado).
 * 3. Validação estrita de vínculo clínico no servidor: paciente, episódio (internação ativa ou PA em observação),
 *    leito, unidade/setor e snapshot da versão vigente do catálogo no momento da prescrição.
 * 4. NUNCA fórmulas, doses, recomendações nutricionais, contraindicações ou cálculo clínico automático;
 *    todos os parâmetros decorrem estritamente da avaliação humana do profissional.
 * 5. Histórico e versionamento imutáveis: alteração ou suspensão cria nova versão / evento, preservando
 *    registros anteriores sem apagar nada.
 * 6. Mapa operacional da cozinha/copa sanitizado: recebe apenas dados operacionais (dieta, consistência,
 *    via, restrições alimentares, observações da refeição, leito/setor). Diagnóstico clínico, CID, prontuário
 *    detalhado e justificativa clínica são estritamente mascarados/bloqueados para a cozinha.
 * 7. Distribuição idempotente: reenvio com mesma idempotency_key e mesmo payload retorna sucesso (200),
 *    conflito de payload retorna 409 (IDEMPOTENCY_PAYLOAD_CONFLICT).
 * 8. Motivo OBRIGATÓRIO em caso de não distribuição (status 'nao_distribuido').
 */

// ============================================================================
// 1. Hook de Prescrição Dietética: snd_prescricoes_dieteticas (onRecordCreate)
// ============================================================================
onRecordCreate((e) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  function normalizarHash(obj) {
    var chaves = Object.keys(obj).sort()
    var partes = []
    for (var k = 0; k < chaves.length; k++) {
      partes.push(chaves[k] + '=' + String(obj[chaves[k]]))
    }
    return partes.join('&')
  }

  var auth = e.auth
  if (!auth) {
    throw new ForbiddenError('Não autorizado: usuário não autenticado.')
  }

  var authRole = auth.getString('role')
  var authCargo = (auth.getString('cargo') || '').toLowerCase()
  var authNome = auth.getString('name') || auth.getString('email') || 'Profissional'
  var authId = auth.id

  // Apenas profissional, gestor ou admin podem prescrever dieta
  var rolesAutorizados = ['admin', 'gestor', 'profissional']
  if (rolesAutorizados.indexOf(authRole) === -1) {
    throw new ForbiddenError(
      'Acesso negado: Prescrição dietética permitida somente para profissionais de saúde autorizados.',
    )
  }

  // Preenche autoritativamente o prescritor com a sessão do servidor
  e.record.set('prescritor_id', authId)
  e.record.set('prescritor_nome', authNome)
  e.record.set('prescritor_perfil', authCargo || authRole || 'profissional_autorizado')
  var regConselho = auth.getString('registro_profissional')
  if (regConselho && !e.record.getString('prescritor_conselho')) {
    e.record.set('prescritor_conselho', regConselho)
  }

  var dataHoraUtc = new Date().toISOString()
  if (!e.record.getString('data_hora_prescricao_utc')) {
    e.record.set('data_hora_prescricao_utc', dataHoraUtc)
  }

  // 1.1 Vínculo com Paciente
  var pacienteId = sanitizar(e.record.get('paciente_ref'))
  if (!pacienteId) {
    throw new BadRequestError('Prescrição dietética exige vínculo obrigatório com um paciente.')
  }
  var pacRec
  try {
    pacRec = e.app.findRecordById('pacientes', pacienteId)
  } catch (_) {
    throw new NotFoundError('Paciente informado não foi encontrado no sistema.')
  }

  // 1.2 Vínculo com Episódio: Internação ativa ou Pronto Atendimento
  var internacaoId = sanitizar(e.record.get('internacao_ref'))
  var paId = sanitizar(e.record.get('atendimento_pa_ref'))

  if (!internacaoId && !paId) {
    throw new BadRequestError(
      'Prescrição dietética exige vínculo com um episódio assistencial ativo (internação ou atendimento PA).',
    )
  }

  if (internacaoId) {
    var intRec
    try {
      intRec = e.app.findRecordById('internacoes', internacaoId)
    } catch (_) {
      throw new NotFoundError('Internação informada não foi encontrada.')
    }
    // Verifica coerência paciente-internação
    var pacInternacao = intRec.getString('paciente')
    if (pacInternacao && pacInternacao !== pacienteId) {
      throw new BadRequestError(
        'Vínculo divergente: O paciente informado difere do paciente vinculado à internação.',
      )
    }
    // Verifica status da internação: alta/óbito não aceita nova prescrição
    var statusInt = intRec.getString('status')
    if (statusInt === 'alta' || statusInt === 'obito') {
      throw new BadRequestError(
        'Não é permitido prescrever dieta para internação já encerrada com alta ou óbito.',
      )
    }

    // Auto-deriva leito e setor da internação se não enviados
    if (!e.record.get('leito_ref') && intRec.get('leito_atual')) {
      e.record.set('leito_ref', intRec.get('leito_atual'))
    }
    if (!e.record.get('setor_ref') && intRec.get('setor_atual')) {
      e.record.set('setor_ref', intRec.get('setor_atual'))
    }
  }

  if (paId) {
    try {
      var paRec = e.app.findRecordById('pronto_atendimento', paId)
      var pacPa = paRec.getString('paciente')
      if (pacPa && pacPa !== pacienteId) {
        throw new BadRequestError(
          'Vínculo divergente: O paciente informado difere do paciente vinculado ao atendimento PA.',
        )
      }
      var statusPa = paRec.getString('status')
      if (statusPa === 'finalizado') {
        throw new BadRequestError(
          'Não é permitido prescrever dieta para atendimento de PA já finalizado.',
        )
      }
    } catch (err) {
      if (err instanceof BadRequestError) throw err
      throw new NotFoundError('Atendimento de Pronto Atendimento informado não foi encontrado.')
    }
  }

  // 1.3 Validação do Catálogo de Dieta e Snapshot da Versão Vigente
  var dietaCatalogoId = sanitizar(e.record.get('dieta_catalogo_ref'))
  if (!dietaCatalogoId) {
    throw new BadRequestError('Tipo de dieta do catálogo é obrigatório na prescrição.')
  }

  var dietaRec
  try {
    dietaRec = e.app.findRecordById('snd_dietas_catalogo', dietaCatalogoId)
  } catch (_) {
    throw new NotFoundError('Item do catálogo de dietas informado não foi encontrado.')
  }

  // Verifica se o item do catálogo está ativo
  var dietaAtiva = dietaRec.getBool('ativo')
  if (dietaAtiva === false) {
    throw new BadRequestError(
      'Não é permitido prescrever um tipo de dieta inativado no catálogo. Selecione uma opção vigente.',
    )
  }

  // Congela o snapshot da versão vigente no momento da confirmação humana
  e.record.set('dieta_codigo_snapshot', dietaRec.getString('codigo'))
  e.record.set('dieta_nome_snapshot', dietaRec.getString('nome'))
  e.record.set('dieta_versao_snapshot', dietaRec.getInt('versao') || 1)

  // Categoria deve ser consistente com o catálogo se não especificada
  if (!e.record.getString('categoria_dieta')) {
    e.record.set('categoria_dieta', dietaRec.getString('categoria'))
  }
  if (!e.record.getString('consistencia') && dietaRec.getString('consistencia')) {
    e.record.set('consistencia', dietaRec.getString('consistencia'))
  }

  // 1.4 Regras de Vigência e Status
  var vigInicio = sanitizar(e.record.get('vigencia_inicio'))
  if (!vigInicio) {
    e.record.set('vigencia_inicio', dataHoraUtc)
  }
  var statusPresc = e.record.getString('status') || 'ativa'
  e.record.set('status', statusPresc)

  // 1.5 Versionamento e Suspensão de Prescrições Anteriores
  var versaoNum = e.record.getInt('versao_numero')
  if (!versaoNum || versaoNum < 1) {
    e.record.set('versao_numero', 1)
  }

  var prescricaoAnteriorId = sanitizar(e.record.get('prescricao_anterior_ref'))
  if (prescricaoAnteriorId) {
    try {
      var anteriorRec = e.app.findRecordById('snd_prescricoes_dieteticas', prescricaoAnteriorId)
      // Suspende a versão anterior preservando histórico (inativação por status 'alterada'/'suspensa')
      if (anteriorRec.getString('status') === 'ativa') {
        anteriorRec.set('status', 'alterada')
        anteriorRec.set('vigencia_fim', dataHoraUtc)
        anteriorRec.set(
          'motivo_alteracao_suspensao',
          'Substituída por nova versão clínica (V' +
            (anteriorRec.getInt('versao_numero') + 1) +
            ')',
        )
        e.app.save(anteriorRec)
      }
      e.record.set('versao_numero', (anteriorRec.getInt('versao_numero') || 1) + 1)
    } catch (_) {}
  } else if (internacaoId && statusPresc === 'ativa') {
    // Se não passou anterior_ref explícito, localiza prescrição ativa concorrente desta internação e suspende
    try {
      var ativas = e.app.findRecordsByFilter(
        'snd_prescricoes_dieteticas',
        'internacao_ref = {:intId} && status = "ativa"',
        '-created',
        10,
        0,
        { intId: internacaoId },
      )
      if (ativas && ativas.length > 0) {
        for (var a = 0; a < ativas.length; a++) {
          var atRec = ativas[a]
          atRec.set('status', 'alterada')
          atRec.set('vigencia_fim', dataHoraUtc)
          atRec.set(
            'motivo_alteracao_suspensao',
            'Substituída por nova prescrição dietética confirmada pelo profissional ' + authNome,
          )
          e.app.save(atRec)
        }
      }
    } catch (_) {}
  }

  // 1.6 Idempotência da Prescrição
  var idempKey = sanitizar(e.record.get('idempotency_key'))
  var hashPayloadPresc = normalizarHash({
    paciente_ref: pacienteId,
    internacao_ref: internacaoId,
    atendimento_pa_ref: paId,
    dieta_catalogo_ref: dietaCatalogoId,
    categoria_dieta: e.record.getString('categoria_dieta'),
    via_administracao: e.record.getString('via_administracao'),
    vigencia_inicio: e.record.getString('vigencia_inicio'),
    prescritor_id: authId,
  })
  e.record.set('hash_payload', hashPayloadPresc)

  if (idempKey) {
    try {
      var prescExistentes = e.app.findRecordsByFilter(
        'snd_prescricoes_dieteticas',
        'idempotency_key = {:k}',
        '-created',
        1,
        0,
        { k: idempKey },
      )
      if (prescExistentes && prescExistentes.length > 0) {
        var exPresc = prescExistentes[0]
        var exHash = exPresc.getString('hash_payload')
        if (exHash && exHash !== hashPayloadPresc) {
          throw new BadRequestError(
            'IDEMPOTENCY_PAYLOAD_CONFLICT: A mesma chave de idempotência foi submetida com prescrição dietética divergente.',
          )
        }
        throw new BadRequestError('IDEMPOTENT_HIT:' + exPresc.id)
      }
    } catch (err) {
      if (err instanceof BadRequestError) throw err
    }
  }

  e.next()
}, 'snd_prescricoes_dieteticas')

// ============================================================================
// 2. Hook de Distribuição Operacional: snd_distribuicoes_refeicoes (onRecordCreate)
// ============================================================================
onRecordCreate((e) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  function normalizarHash(obj) {
    var chaves = Object.keys(obj).sort()
    var partes = []
    for (var k = 0; k < chaves.length; k++) {
      partes.push(chaves[k] + '=' + String(obj[chaves[k]]))
    }
    return partes.join('&')
  }

  var auth = e.auth
  if (!auth) {
    throw new ForbiddenError('Não autorizado: faça login para registrar distribuição de refeição.')
  }

  var authId = auth.id
  var authNome = auth.getString('name') || auth.getString('email') || 'Operador Cozinha/SND'
  var authCargo = auth.getString('cargo') || auth.getString('role') || 'operador'

  e.record.set('autor_id', authId)
  e.record.set('autor_nome', authNome)
  e.record.set('autor_perfil', authCargo)

  var agoraUtc = new Date().toISOString()
  if (!e.record.getString('data_hora_registro_utc')) {
    e.record.set('data_hora_registro_utc', agoraUtc)
  }

  // 2.1 Prescrição Dietética de Origem Obrigatória e Válida
  var prescricaoId = sanitizar(e.record.get('prescricao_dietetica_ref'))
  if (!prescricaoId) {
    throw new BadRequestError(
      'Registro de distribuição de refeição exige vínculo com a prescrição dietética.',
    )
  }

  var prescRec
  try {
    prescRec = e.app.findRecordById('snd_prescricoes_dieteticas', prescricaoId)
  } catch (_) {
    throw new NotFoundError('Prescrição dietética de origem não encontrada.')
  }

  // Prescrição suspensa/encerrada não aceita nova distribuição de refeições
  var statusPresc = prescRec.getString('status')
  if (statusPresc === 'suspensa' || statusPresc === 'encerrada') {
    throw new BadRequestError(
      'Não é permitido registrar distribuição de refeição para prescrição dietética inativa ou suspensa (' +
        statusPresc +
        ').',
    )
  }

  // 2.2 Coerência de Vínculos com o Servidor (Paciente, Leito, Setor)
  var pacPresc = prescRec.getString('paciente_ref')
  var pacInformado = sanitizar(e.record.get('paciente_ref'))
  if (pacInformado && pacInformado !== pacPresc) {
    throw new BadRequestError(
      'Vínculo divergente: O paciente informado difere do paciente vinculado à prescrição dietética.',
    )
  }
  e.record.set('paciente_ref', pacPresc)

  // Deriva leito e setor autoritativamente da prescrição se ausentes
  if (!e.record.get('leito_ref') && prescRec.get('leito_ref')) {
    e.record.set('leito_ref', prescRec.get('leito_ref'))
  }
  if (!e.record.get('setor_ref') && prescRec.get('setor_ref')) {
    e.record.set('setor_ref', prescRec.get('setor_ref'))
  }

  // 2.3 Validação de Refeição e Status Operacional
  var refCodigo = sanitizar(e.record.get('refeicao_codigo'))
  if (!refCodigo) {
    throw new BadRequestError('Código da refeição (ex: desjejum, almoco, jantar) é obrigatório.')
  }

  var statusOperacional = e.record.getString('status_operacional') || 'planejado'
  var motivoNaoDist = sanitizar(e.record.get('motivo_nao_distribuido'))

  // Regra Estrita: motivo OBRIGATÓRIO se nao_distribuido
  if (statusOperacional === 'nao_distribuido') {
    if (!motivoNaoDist || motivoNaoDist.length < 3) {
      throw new BadRequestError(
        'Motivo é OBRIGATÓRIO ao registrar refeição com status "não distribuído" (mínimo de 3 caracteres).',
      )
    }
  }

  // 2.4 Idempotência Persistente da Distribuição
  var idempKey = sanitizar(e.record.get('idempotency_key'))
  var hashPayloadDist = normalizarHash({
    prescricao_ref: prescricaoId,
    paciente_ref: pacPresc,
    refeicao_codigo: refCodigo,
    data_operacional: e.record.getString('data_operacional'),
    horario_previsto: e.record.getString('horario_previsto'),
    status_operacional: statusOperacional,
    motivo_nao_distribuido: motivoNaoDist,
  })
  e.record.set('hash_payload', hashPayloadDist)

  if (idempKey) {
    try {
      var distExistentes = e.app.findRecordsByFilter(
        'snd_distribuicoes_refeicoes',
        'idempotency_key = {:k}',
        '-created',
        1,
        0,
        { k: idempKey },
      )
      if (distExistentes && distExistentes.length > 0) {
        var exDist = distExistentes[0]
        var exHash = exDist.getString('hash_payload')
        if (exHash && exHash !== hashPayloadDist) {
          throw new BadRequestError(
            'IDEMPOTENCY_PAYLOAD_CONFLICT: A mesma chave de idempotência foi submetida com dados de distribuição divergentes.',
          )
        }
        throw new BadRequestError('IDEMPOTENT_HIT:' + exDist.id)
      }
    } catch (err) {
      if (err instanceof BadRequestError) throw err
    }
  }

  e.next()
}, 'snd_distribuicoes_refeicoes')

// ============================================================================
// 3. Catálogos: Imutabilidade e Inativação Lógica (sem exclusão física)
// ============================================================================
onRecordDelete((e) => {
  throw new BadRequestError(
    'Operação proibida: Catálogo de refeições do SND não permite exclusão física. Utilize inativação lógica.',
  )
}, 'snd_cardapio_refeicoes')

onRecordDelete((e) => {
  throw new BadRequestError(
    'Operação proibida: Catálogo de dietas do SND não permite exclusão física. Utilize inativação lógica e versionamento.',
  )
}, 'snd_dietas_catalogo')

onRecordDelete((e) => {
  throw new BadRequestError(
    'Operação proibida: Prescrições dietéticas do SND são imutáveis e auditáveis. Não é permitida exclusão física.',
  )
}, 'snd_prescricoes_dieteticas')

onRecordDelete((e) => {
  throw new BadRequestError(
    'Operação proibida: Registros de distribuição de refeições do SND não permitem exclusão física.',
  )
}, 'snd_distribuicoes_refeicoes')

// ============================================================================
// 4. Endpoint Customizado: Mapa Operacional Sanitizado da Cozinha (GET /backend/v1/snd/mapa-cozinha)
// Garante que a cozinha receba APENAS dados operacionais, sem prontuário/CID/justificativa clínica
// ============================================================================
routerAdd('GET', '/backend/v1/snd/mapa-cozinha', (c) => {
  var auth = c.auth
  if (!auth) {
    return c.json(401, {
      erro: 'Não autorizado: faça login para acessar o mapa de cozinha do SND.',
    })
  }

  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var query = c.request.url.query()
  var dataOperacional = sanitizar(query.get('data') || query.get('data_operacional'))
  if (!dataOperacional) {
    dataOperacional = new Date().toISOString().slice(0, 10)
  }
  var setorFiltro = sanitizar(query.get('setor_ref') || query.get('setor_id'))

  // Busca prescrições ativas
  var prescricoesAtivas = []
  try {
    prescricoesAtivas = c.app.findRecordsByFilter(
      'snd_prescricoes_dieteticas',
      'status = "ativa"',
      'created',
      500,
      0,
    )
  } catch (err) {
    return c.json(500, {
      erro: 'Erro ao consultar prescrições ativas: ' + (err.message || String(err)),
    })
  }

  // Monta mapa sanitizado: estritamente SEM dados clínicos protegidos
  var mapaOperacional = []
  for (var i = 0; i < prescricoesAtivas.length; i++) {
    var p = prescricoesAtivas[i]

    var leitoId = p.getString('leito_ref')
    var setorId = p.getString('setor_ref')
    if (setorFiltro && setorId !== setorFiltro) {
      continue
    }

    var leitoCodigo = ''
    if (leitoId) {
      try {
        var lRec = c.app.findRecordById('leitos', leitoId)
        leitoCodigo = lRec.getString('codigo')
      } catch (_) {}
    }

    var setorNome = ''
    if (setorId) {
      try {
        var sRec = c.app.findRecordById('setores', setorId)
        setorNome = sRec.getString('nome')
      } catch (_) {}
    }

    var pacId = p.getString('paciente_ref')
    var pacNome = ''
    if (pacId) {
      try {
        var pacRec = c.app.findRecordById('pacientes', pacId)
        pacNome = pacRec.getString('nome')
      } catch (_) {}
    }

    mapaOperacional.push({
      prescricao_id: p.id,
      paciente_id: pacId,
      paciente_nome: pacNome,
      leito_id: leitoId,
      leito_codigo: leitoCodigo,
      setor_id: setorId,
      setor_nome: setorNome,
      dieta_codigo: p.getString('dieta_codigo_snapshot'),
      dieta_nome: p.getString('dieta_nome_snapshot'),
      dieta_versao: p.getInt('dieta_versao_snapshot'),
      categoria_dieta: p.getString('categoria_dieta'),
      consistencia: p.getString('consistencia'),
      via_administracao: p.getString('via_administracao'),
      quantidade: p.getFloat('quantidade'),
      unidade_medida: p.getString('unidade_medida'),
      fracionamento: p.getString('fracionamento'),
      restricoes_alimentares: p.getString('restricoes_alimentares'),
      alergias_alimentares: p.getString('alergias_verificadas'),
      observacoes_operacionais: p.getString('observacoes_profissionais'),
      // NOTA LGPD/SIGILO CLÍNICO: diagnostico_justificativa_clinica, CID e prontuário
      // são OMITIDOS propositalmente neste endpoint operacional de cozinha
    })
  }

  return c.json(200, {
    sucesso: true,
    data_operacional: dataOperacional,
    total_leitos_atendidos: mapaOperacional.length,
    itens: mapaOperacional,
  })
})
