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

  // BLOQUEIO DE BYPASS TRANSACIONAL (Regra de Auditoria Codex):
  // É estritamente proibido criar diretamente uma distribuição com status 'distribuido'
  // via API de coleção sem passar pelo endpoint transacional `/backend/v1/snd/distribuicao/confirmar-com-baixa`.
  // Isso impede a fabricação de distribuições concluídas sem baixa atômica de insumos.
  if (statusOperacional === 'distribuido') {
    throw new BadRequestError(
      'OPERAÇÃO_NEGADA_BYPASS: Distribuição com status "distribuido" consome insumos do estoque e deve ser confirmada exclusivamente pelo endpoint transacional /backend/v1/snd/distribuicao/confirmar-com-baixa.',
    )
  }

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
// 2b. Hook de Proteção em Alteração de Distribuição: snd_distribuicoes_refeicoes (onRecordUpdate)
// Impede bypass que tente transitar registro existente para 'distribuido' via API direta,
// e protege distribuições legadas/já distribuídas contra alterações indevidas.
// ============================================================================
onRecordUpdate((e) => {
  var novoStatus = e.record.getString('status_operacional')
  var statusAnterior = e.record.originalCopy()
    ? e.record.originalCopy().getString('status_operacional')
    : ''

  // Se o registro antigo já era 'distribuido' (legado ou confirmado previamente),
  // ele é imutável em seu status para evitar baixa retroativa ou corrupção de histórico.
  if (statusAnterior === 'distribuido') {
    if (novoStatus !== 'distribuido') {
      throw new BadRequestError(
        'OPERAÇÃO_NEGADA_IMUTABILIDADE: Refeição já confirmada como "distribuído" é imutável. Para correções de consumo, utilize o estorno formal de baixa.',
      )
    }
  }

  // Se tenta mudar para 'distribuido' via update direto da coleção (bypass do endpoint de baixa):
  if (novoStatus === 'distribuido' && statusAnterior !== 'distribuido') {
    throw new BadRequestError(
      'OPERAÇÃO_NEGADA_BYPASS: A transição para status "distribuido" exige baixa atômica no estoque e deve ser realizada exclusivamente via /backend/v1/snd/distribuicao/confirmar-com-baixa.',
    )
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

onRecordDelete((e) => {
  throw new BadRequestError(
    'Operação proibida: Fichas de composição do SND não permitem exclusão física. Utilize versionamento ou inativação lógica.',
  )
}, 'snd_composicoes_refeicoes')

onRecordDelete((e) => {
  throw new BadRequestError(
    'Operação proibida: Baixas de estoque do SND são imutáveis e auditáveis. Para correções utilize estorno compensatório.',
  )
}, 'snd_baixas_estoque_distribuicoes')

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

// ============================================================================
// 5. Endpoint Transacional: Confirmar Distribuição com Baixa de Insumos (Item 7.4.3.5.c.i)
// POST /backend/v1/snd/distribuicao/confirmar-com-baixa
//
// O ÚNICO evento de baixa no estoque:
// - Valida distribuição e prescrição ativa
// - Se status !== 'distribuido' (ex: planejado, em_preparo, nao_distribuido), NÃO consome insumos do estoque!
// - Para 'distribuido', localiza ficha de composição ativa vigente para a refeição e dieta
// - Congela snapshot da composição (versão, insumos, fator de conversão, lotes)
// - Em transação atômica completa:
//    1. Salva ou atualiza a distribuição como 'distribuido'
//    2. Para cada insumo: valida unidade e conversão explícita (rejeita incompatibilidade ou ausência de fator)
//    3. Verifica saldo e validade do lote no servidor (rejeita saldo insuficiente ou insumo vencido)
//    4. Cria registros imutáveis em farmacia_movimentos_estoque
//    5. Decrementa o saldo do item em farmacia_itens
//    6. Salva o registro da baixa em snd_baixas_estoque_distribuicoes
// - Se ocorrer qualquer erro, ROLLBACK completo sem distribuição marcada como sucesso e sem baixa oculta
// - Idempotência estrita: reenvio após timeout retorna resultado persistido sem nova baixa;
//   mesma chave com payload divergente retorna conflito (409)
// ============================================================================
routerAdd('POST', '/backend/v1/snd/distribuicao/confirmar-com-baixa', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  function parseDataIso(dStr) {
    if (!dStr) return null
    try {
      var d = new Date(dStr)
      if (isNaN(d.getTime())) return null
      return d
    } catch (_) {
      return null
    }
  }

  function normalizarHash(obj) {
    var chaves = Object.keys(obj).sort()
    var partes = []
    for (var k = 0; k < chaves.length; k++) {
      partes.push(chaves[k] + '=' + String(obj[chaves[k]]))
    }
    return partes.join('&')
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, {
      sucesso: false,
      codigo: 'NAO_AUTORIZADO',
      erro: 'Não autorizado: faça login para confirmar distribuição de refeição.',
    })
  }

  var authRole = auth.getString('role')
  if (authRole === 'recepcao') {
    return c.json(403, {
      sucesso: false,
      codigo: 'ACESSO_NEGADO',
      erro: 'Perfil recepção não tem permissão para confirmação operacional e baixa de nutrição.',
    })
  }

  var authId = auth.id
  var authNome = auth.getString('name') || auth.getString('email') || 'Operador Cozinha/SND'
  var authCargo = auth.getString('cargo') || auth.getString('role') || 'operador'

  var reqInfo = c.requestInfo()
  var body = reqInfo.body || {}

  var idempotencyKey = sanitizar(body.idempotency_key)
  if (!idempotencyKey) {
    return c.json(400, {
      sucesso: false,
      codigo: 'CHAVE_IDEMPOTENCIA_OBRIGATORIA',
      erro: 'A chave de idempotência (idempotency_key) é obrigatória para confirmação com baixa.',
    })
  }

  var prescricaoId = sanitizar(body.prescricao_dietetica_ref)
  var distribuicaoId = sanitizar(body.distribuicao_id)
  var refeicaoCodigo = sanitizar(body.refeicao_codigo)
  var dataOperacional = sanitizar(body.data_operacional) || new Date().toISOString().slice(0, 10)
  var horarioPrevisto = sanitizar(body.horario_previsto) || ''
  var statusOperacional = sanitizar(body.status_operacional) || 'distribuido'
  var motivoNaoDistribuido = sanitizar(body.motivo_nao_distribuido)
  var pontoEstoque = sanitizar(body.ponto_estoque) || 'SND - Almoxarifado de Nutrição'
  var responsavelEntrega = sanitizar(body.responsavel_entrega_nome) || authNome
  var temperaturaAfericao = sanitizar(body.temperatura_afericao)
  var observacoes = sanitizar(body.observacoes_operacionais)

  // 1. Validação de Hash e Idempotência Persistente prévia
  var payloadHashObj = {
    prescricao_ref: prescricaoId,
    distribuicao_id: distribuicaoId,
    refeicao_codigo: refeicaoCodigo,
    data_operacional: dataOperacional,
    status_operacional: statusOperacional,
    ponto_estoque: pontoEstoque,
  }
  var payloadHash = normalizarHash(payloadHashObj)

  // Verifica se já existe registro de baixa com esta idempotency_key
  try {
    var baixasExistentes = c.app.findRecordsByFilter(
      'snd_baixas_estoque_distribuicoes',
      'idempotency_key = {:k}',
      '-created',
      1,
      0,
      { k: idempotencyKey },
    )
    if (baixasExistentes && baixasExistentes.length > 0) {
      var exBaixa = baixasExistentes[0]
      var exHash = exBaixa.getString('hash_payload')
      if (exHash && exHash !== payloadHash) {
        return c.json(409, {
          sucesso: false,
          codigo: 'IDEMPOTENCY_PAYLOAD_CONFLICT',
          erro: 'A mesma chave de idempotência foi submetida com parâmetros ou dados divergentes.',
        })
      }
      return c.json(200, {
        sucesso: true,
        idempotente: true,
        codigo: 'REPLAY_IDEMPOTENTE',
        mensagem: 'Operação já processada anteriormente. Retornando registro persistido.',
        baixa_id: exBaixa.id,
        distribuicao_id: exBaixa.getString('distribuicao_ref'),
        data_hora_baixa_utc: exBaixa.getString('data_hora_baixa_utc'),
        movimentos_estoque_ids: exBaixa.get('movimentos_estoque_ids'),
        snapshot_itens: exBaixa.get('snapshot_itens_consumidos'),
      })
    }
  } catch (err) {
    // prossegue se não encontrar
  }

  // 2. Se não distribuído, valida justificativa obrigatória e NÃO baixa estoque
  if (statusOperacional !== 'distribuido') {
    if (
      statusOperacional === 'nao_distribuido' &&
      (!motivoNaoDistribuido || motivoNaoDistribuido.length < 3)
    ) {
      return c.json(400, {
        sucesso: false,
        codigo: 'MOTIVO_NAO_DISTRIBUIDO_OBRIGATORIO',
        erro: 'Motivo é obrigatório ao marcar refeição como não distribuída.',
      })
    }

    // Registra apenas a distribuição sem nenhuma baixa de insumos
    var distIdCriada = ''
    try {
      c.app.runInTransaction((tx) => {
        var distRecord
        if (distribuicaoId) {
          distRecord = tx.findRecordById('snd_distribuicoes_refeicoes', distribuicaoId)
        } else {
          var distCol = tx.findCollectionByNameOrId('snd_distribuicoes_refeicoes')
          distRecord = new Record(distCol)
        }
        distRecord.set('prescricao_dietetica_ref', prescricaoId)
        distRecord.set('refeicao_codigo', refeicaoCodigo)
        distRecord.set('data_operacional', dataOperacional)
        distRecord.set('horario_previsto', horarioPrevisto)
        distRecord.set('status_operacional', statusOperacional)
        distRecord.set('motivo_nao_distribuido', motivoNaoDistribuido)
        distRecord.set('observacoes_operacionais', observacoes)
        distRecord.set('data_hora_registro_utc', new Date().toISOString())
        distRecord.set('autor_id', authId)
        distRecord.set('autor_nome', authNome)
        distRecord.set('autor_perfil', authCargo)
        distRecord.set('idempotency_key', idempotencyKey)
        distRecord.set('hash_payload', payloadHash)
        tx.save(distRecord)
        distIdCriada = distRecord.id
      })
      return c.json(200, {
        sucesso: true,
        baixa_executada: false,
        status_operacional: statusOperacional,
        distribuicao_id: distIdCriada,
        mensagem:
          'Distribuição registrada sem consumo de insumos (status diferente de distribuído).',
      })
    } catch (err) {
      return c.json(400, {
        sucesso: false,
        codigo: 'ERRO_REGISTRO_DISTRIBUICAO',
        erro: 'Erro ao registrar distribuição: ' + (err.message || String(err)),
      })
    }
  }

  // 3. Status é 'distribuido': Obter Prescrição e Paciente
  if (!prescricaoId) {
    return c.json(400, {
      sucesso: false,
      codigo: 'PRESCRICAO_OBRIGATORIA',
      erro: 'Prescrição dietética de origem é obrigatória para confirmar distribuição com baixa.',
    })
  }

  var prescRec
  try {
    prescRec = c.app.findRecordById('snd_prescricoes_dieteticas', prescricaoId)
  } catch (_) {
    return c.json(404, {
      sucesso: false,
      codigo: 'PRESCRICAO_NAO_ENCONTRADA',
      erro: 'Prescrição dietética não encontrada no servidor.',
    })
  }

  var statusPresc = prescRec.getString('status')
  if (statusPresc !== 'ativa') {
    return c.json(400, {
      sucesso: false,
      codigo: 'PRESCRICAO_INATIVA',
      erro: 'Não é possível dar baixa para prescrição dietética com status ' + statusPresc + '.',
    })
  }

  var pacId = prescRec.getString('paciente_ref')
  var leitoId = prescRec.getString('leito_ref')
  var setorId = prescRec.getString('setor_ref')
  var dietaCodigo = prescRec.getString('dieta_codigo_snapshot')

  // 4. Localizar Ficha de Composição Operacional Ativa (por refeição e dieta)
  var composicaoRecord = null
  try {
    // Tenta primeiro composição específica para refeicao + dieta
    var comps = c.app.findRecordsByFilter(
      'snd_composicoes_refeicoes',
      'refeicao_codigo = {:ref} && (dieta_codigo = {:dieta} || dieta_codigo = "" || dieta_codigo = "todas") && ativo = true',
      '-versao',
      1,
      0,
      { ref: refeicaoCodigo, dieta: dietaCodigo },
    )
    if (comps && comps.length > 0) {
      composicaoRecord = comps[0]
    }
  } catch (_) {}

  if (!composicaoRecord) {
    return c.json(422, {
      sucesso: false,
      codigo: 'COMPOSICAO_NAO_ENCONTRADA',
      erro:
        'Ficha de composição operacional ativa não cadastrada para refeição "' +
        refeicaoCodigo +
        '" e dieta "' +
        dietaCodigo +
        '". Operação interrompida sem baixa parcial.',
    })
  }

  var itensComposicaoRaw = composicaoRecord.get('itens_composicao')
  var itensComposicao = []
  if (Array.isArray(itensComposicaoRaw)) {
    itensComposicao = itensComposicaoRaw
  } else if (typeof itensComposicaoRaw === 'string') {
    try {
      itensComposicao = JSON.parse(itensComposicaoRaw)
    } catch (_) {
      itensComposicao = []
    }
  }

  if (itensComposicao.length === 0) {
    return c.json(422, {
      sucesso: false,
      codigo: 'COMPOSICAO_SEM_INSUMOS',
      erro: 'Ficha de composição operacional não possui insumos parametrizados para baixa.',
    })
  }

  // 5. Validação Prévia Rigorosa de Insumos, Unidades, Conversões, Saldos e Validades
  // (Executada antes e conferida dentro da transação para garantir rollback total)
  var agora = new Date()
  var itensParaBaixa = []

  for (var idx = 0; idx < itensComposicao.length; idx++) {
    var ic = itensComposicao[idx]
    var itemId = sanitizar(ic.item_estoque_id)
    if (!itemId) {
      return c.json(422, {
        sucesso: false,
        codigo: 'INSUMO_ID_AUSENTE',
        erro: 'Insumo na posição ' + idx + ' não possui identificador de estoque cadastrado.',
      })
    }

    var itemEstoque
    try {
      itemEstoque = c.app.findRecordById('farmacia_itens', itemId)
    } catch (_) {
      return c.json(404, {
        sucesso: false,
        codigo: 'INSUMO_ESTOQUE_NAO_ENCONTRADO',
        erro:
          'Insumo de estoque ID "' +
          itemId +
          '" não foi localizado no catálogo de farmácia/nutrição.',
      })
    }

    var ativoEstoque = itemEstoque.getBool('ativo')
    if (!ativoEstoque) {
      return c.json(422, {
        sucesso: false,
        codigo: 'INSUMO_INATIVO',
        erro: 'Insumo "' + itemEstoque.getString('nome') + '" está inativo no catálogo de estoque.',
      })
    }

    // Regra de Validade do Lote no Estoque
    var validadeStr = itemEstoque.getString('validade')
    if (validadeStr) {
      var dVal = parseDataIso(validadeStr)
      if (dVal && dVal.getTime() < agora.getTime()) {
        return c.json(422, {
          sucesso: false,
          codigo: 'INSUMO_ESTOQUE_VENCIDO',
          erro:
            'Insumo "' +
            itemEstoque.getString('nome') +
            '" com validade vencida em ' +
            validadeStr +
            '. Proibido consumo humano. Transação abortada sem baixa parcial.',
        })
      }
    }

    // Regra de Conversão de Unidades Estrita
    var unidadeEstoque = sanitizar(itemEstoque.getString('unidade_medida'))
    var unidadeConsumo = sanitizar(ic.unidade_consumo) || unidadeEstoque
    var fatorConversao = Number(ic.fator_conversao)
    var qtdConsumo = Number(ic.quantidade_consumo)

    if (isNaN(qtdConsumo) || qtdConsumo <= 0) {
      return c.json(422, {
        sucesso: false,
        codigo: 'QUANTIDADE_INVALIDA',
        erro:
          'Quantidade de consumo do insumo "' +
          itemEstoque.getString('nome') +
          '" deve ser positiva.',
      })
    }

    if (unidadeConsumo !== unidadeEstoque) {
      if (isNaN(fatorConversao) || fatorConversao <= 0) {
        return c.json(422, {
          sucesso: false,
          codigo: 'FATOR_CONVERSAO_AUSENTE',
          erro:
            'Incompatibilidade de unidades para o insumo "' +
            itemEstoque.getString('nome') +
            '": unidade de consumo "' +
            unidadeConsumo +
            '" difere da unidade de estoque "' +
            unidadeEstoque +
            '" sem fator explícito cadastrado.',
        })
      }
    } else {
      if (isNaN(fatorConversao) || fatorConversao <= 0) {
        fatorConversao = 1.0
      }
    }

    var qtdBaixaEstoque = Number((qtdConsumo * fatorConversao).toFixed(4))
    var saldoAtual = Number(itemEstoque.getFloat('estoque_atual')) || 0

    if (saldoAtual < qtdBaixaEstoque) {
      return c.json(422, {
        sucesso: false,
        codigo: 'ESTOQUE_INSUFICIENTE',
        erro:
          'Saldo insuficiente para o insumo "' +
          itemEstoque.getString('nome') +
          '". Saldo disponível: ' +
          saldoAtual +
          ' ' +
          unidadeEstoque +
          ', necessário para a refeição: ' +
          qtdBaixaEstoque +
          ' ' +
          unidadeEstoque +
          '. Nenhuma baixa parcial foi realizada.',
      })
    }

    itensParaBaixa.push({
      item_id: itemId,
      item_nome: itemEstoque.getString('nome'),
      unidade_consumo: unidadeConsumo,
      quantidade_consumo: qtdConsumo,
      unidade_estoque: unidadeEstoque,
      fator_conversao: fatorConversao,
      quantidade_baixa_estoque: qtdBaixaEstoque,
      saldo_anterior: saldoAtual,
      saldo_posterior: Number((saldoAtual - qtdBaixaEstoque).toFixed(4)),
      lote: itemEstoque.getString('lote') || '',
      validade: validadeStr || '',
    })
  }

  // 6. Execução em Transação Atômica Completa (Distribuição + Movimentos Estoque + Baixa SND)
  var resultadoTransacao = null
  try {
    c.app.runInTransaction((tx) => {
      // 6.1 Salva/Atualiza registro de distribuição de refeição
      var distRecord
      if (distribuicaoId) {
        distRecord = tx.findRecordById('snd_distribuicoes_refeicoes', distribuicaoId)
      } else {
        var distCol = tx.findCollectionByNameOrId('snd_distribuicoes_refeicoes')
        distRecord = new Record(distCol)
      }

      distRecord.set('prescricao_dietetica_ref', prescricaoId)
      distRecord.set('paciente_ref', pacId)
      if (leitoId) distRecord.set('leito_ref', leitoId)
      if (setorId) distRecord.set('setor_ref', setorId)
      distRecord.set('refeicao_codigo', refeicaoCodigo)
      distRecord.set('data_operacional', dataOperacional)
      distRecord.set('horario_previsto', horarioPrevisto)
      distRecord.set('status_operacional', 'distribuido')
      distRecord.set('responsavel_entrega_nome', responsavelEntrega)
      if (temperaturaAfericao) distRecord.set('temperatura_afericao', temperaturaAfericao)
      if (observacoes) distRecord.set('observacoes_operacionais', observacoes)
      distRecord.set('data_hora_registro_utc', new Date().toISOString())
      distRecord.set('autor_id', authId)
      distRecord.set('autor_nome', authNome)
      distRecord.set('autor_perfil', authCargo)
      distRecord.set('idempotency_key', idempotencyKey)
      distRecord.set('hash_payload', payloadHash)
      tx.save(distRecord)

      var movIdsGerados = []
      var movCol = tx.findCollectionByNameOrId('farmacia_movimentos_estoque')

      // 6.2 Processa baixas dos insumos
      for (var bIdx = 0; bIdx < itensParaBaixa.length; bIdx++) {
        var ib = itensParaBaixa[bIdx]

        // Re-verifica saldo dentro do lock transacional
        var itemRecTx = tx.findRecordById('farmacia_itens', ib.item_id)
        var saldoTx = Number(itemRecTx.getFloat('estoque_atual')) || 0
        if (saldoTx < ib.quantidade_baixa_estoque) {
          throw new Error(
            'CONCORRENCIA_SALDO_INSUFICIENTE: Saldo do insumo ' +
              ib.item_nome +
              ' foi alterado concorrentemente (' +
              saldoTx +
              ' < ' +
              ib.quantidade_baixa_estoque +
              '). Operação revertida.',
          )
        }

        var novoSaldo = Number((saldoTx - ib.quantidade_baixa_estoque).toFixed(4))
        ib.saldo_anterior = saldoTx
        ib.saldo_posterior = novoSaldo

        // Registra movimento de estoque na coleção farmacia_movimentos_estoque
        var mov = new Record(movCol)
        mov.set('item', ib.item_id)
        mov.set('item_nome', ib.item_nome)
        mov.set('tipo_movimento', 'perda_avaria') // Reutiliza tipo existente para baixa/saída assistencial de nutrição
        mov.set('quantidade', ib.quantidade_baixa_estoque)
        mov.set('estoque_anterior', saldoTx)
        mov.set('estoque_posterior', novoSaldo)
        mov.set('lote', ib.lote)
        mov.set('validade', ib.validade)
        mov.set('local_armazenamento', pontoEstoque)
        mov.set(
          'justificativa',
          'SND: Baixa operacional por distribuição confirmada refeição ' +
            refeicaoCodigo +
            ' prescrição ' +
            prescricaoId +
            ' ficha v' +
            composicaoRecord.getInt('versao'),
        )
        mov.set('responsavel_nome', authNome)
        mov.set('responsavel_id', authId)
        mov.set('data_hora', new Date().toISOString().replace('T', ' ').slice(0, 16))
        mov.set('documento_ref', 'SND-DIST-' + distRecord.id)
        tx.save(mov)
        movIdsGerados.push(mov.id)

        // Atualiza item do estoque
        itemRecTx.set('estoque_atual', novoSaldo)
        tx.save(itemRecTx)
      }

      // 6.3 Salva registro mestre do vínculo da baixa com snapshot imutável da composição
      var baixasCol = tx.findCollectionByNameOrId('snd_baixas_estoque_distribuicoes')
      var baixaRecord = new Record(baixasCol)
      baixaRecord.set('distribuicao_ref', distRecord.id)
      baixaRecord.set('composicao_ref_id', composicaoRecord.id)
      baixaRecord.set('composicao_codigo_snapshot', composicaoRecord.getString('codigo'))
      baixaRecord.set('composicao_versao_snapshot', composicaoRecord.getInt('versao'))
      baixaRecord.set('snapshot_itens_consumidos', itensParaBaixa)
      baixaRecord.set('ponto_estoque', pontoEstoque)
      if (setorId) baixaRecord.set('setor_ref', setorId)
      baixaRecord.set('data_hora_baixa_utc', new Date().toISOString())
      baixaRecord.set('movimentos_estoque_ids', movIdsGerados)
      baixaRecord.set('estornado', false)
      baixaRecord.set('autor_id', authId)
      baixaRecord.set('autor_nome', authNome)
      baixaRecord.set('idempotency_key', idempotencyKey)
      baixaRecord.set('hash_payload', payloadHash)
      tx.save(baixaRecord)

      resultadoTransacao = {
        baixa_id: baixaRecord.id,
        distribuicao_id: distRecord.id,
        composicao_codigo: composicaoRecord.getString('codigo'),
        composicao_versao: composicaoRecord.getInt('versao'),
        data_hora_baixa_utc: baixaRecord.getString('data_hora_baixa_utc'),
        movimentos_estoque_ids: movIdsGerados,
        snapshot_itens: itensParaBaixa,
      }
    })
  } catch (errTx) {
    return c.json(422, {
      sucesso: false,
      codigo: 'ERRO_TRANSACIONAL_BAIXA',
      erro:
        'Falha durante transação atômica de baixa: ' +
        (errTx.message || String(errTx)) +
        '. Nenhuma alteração foi persistida (rollback completo).',
    })
  }

  return c.json(200, {
    sucesso: true,
    baixa_executada: true,
    mensagem: 'Distribuição confirmada e insumos baixados no estoque com sucesso.',
    dados: resultadoTransacao,
  })
})

// ============================================================================
// 6. Endpoint Transacional: Estorno Compensatório de Baixa (Item 7.4.3.5.c.i)
// POST /backend/v1/snd/baixa/estornar
//
// Movimento compensatório explícito:
// - Proibido duplo estorno (rejeita se já estornado)
// - Nunca exclui nem reescreve registros anteriores (deleções bloqueadas)
// - Registra movimentos de entrada compensatória em farmacia_movimentos_estoque
// - Restaura o saldo no catálogo de estoque
// - Registra autor da sessão, data/hora UTC e motivo formal do estorno
// ============================================================================
routerAdd('POST', '/backend/v1/snd/baixa/estornar', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, {
      sucesso: false,
      codigo: 'NAO_AUTORIZADO',
      erro: 'Não autorizado: faça login para estornar baixa de nutrição.',
    })
  }

  var authRole = auth.getString('role')
  if (authRole === 'recepcao') {
    return c.json(403, {
      sucesso: false,
      codigo: 'ACESSO_NEGADO',
      erro: 'Recepção não possui permissão para estorno de baixa de estoque.',
    })
  }

  var authId = auth.id
  var authNome = auth.getString('name') || auth.getString('email') || 'Operador SND'

  var reqInfo = c.requestInfo()
  var body = reqInfo.body || {}

  var baixaId = sanitizar(body.baixa_id)
  var motivo = sanitizar(body.motivo)

  if (!baixaId) {
    return c.json(400, {
      sucesso: false,
      codigo: 'BAIXA_ID_OBRIGATORIO',
      erro: 'Identificador da baixa (baixa_id) é obrigatório.',
    })
  }

  if (!motivo || motivo.length < 5) {
    return c.json(400, {
      sucesso: false,
      codigo: 'MOTIVO_ESTORNO_OBRIGATORIO',
      erro: 'Motivo do estorno compensatório é obrigatório (mínimo de 5 caracteres).',
    })
  }

  var baixaRecord
  try {
    baixaRecord = c.app.findRecordById('snd_baixas_estoque_distribuicoes', baixaId)
  } catch (_) {
    return c.json(404, {
      sucesso: false,
      codigo: 'BAIXA_NAO_ENCONTRADA',
      erro: 'Registro de baixa de nutrição não encontrado.',
    })
  }

  if (baixaRecord.getBool('estornado')) {
    return c.json(422, {
      sucesso: false,
      codigo: 'BAIXA_JA_ESTORNADA',
      erro:
        'Esta baixa de estoque já foi estornada anteriormente em ' +
        baixaRecord.getString('estorno_data_utc') +
        ' por ' +
        baixaRecord.getString('estorno_autor_nome') +
        '. Duplo estorno é estritamente proibido.',
    })
  }

  var snapshotRaw = baixaRecord.get('snapshot_itens_consumidos')
  var itensConsumidos = []
  if (Array.isArray(snapshotRaw)) {
    itensConsumidos = snapshotRaw
  } else if (typeof snapshotRaw === 'string') {
    try {
      itensConsumidos = JSON.parse(snapshotRaw)
    } catch (_) {
      itensConsumidos = []
    }
  }

  var estornoMovIds = []
  var agoraUtc = new Date().toISOString()

  try {
    c.app.runInTransaction((tx) => {
      var movCol = tx.findCollectionByNameOrId('farmacia_movimentos_estoque')

      for (var idx = 0; idx < itensConsumidos.length; idx++) {
        var it = itensConsumidos[idx]
        var itemId = sanitizar(it.item_id)
        var qtdDevolver = Number(it.quantidade_baixa_estoque)

        var itemRecTx = tx.findRecordById('farmacia_itens', itemId)
        var saldoAtual = Number(itemRecTx.getFloat('estoque_atual')) || 0
        var saldoRestaurado = Number((saldoAtual + qtdDevolver).toFixed(4))

        // Cria movimento compensatório de entrada
        var movComp = new Record(movCol)
        movComp.set('item', itemId)
        movComp.set('item_nome', it.item_nome || itemRecTx.getString('nome'))
        movComp.set('tipo_movimento', 'devolucao_paciente') // Reutiliza tipo compensatório existente
        movComp.set('quantidade', qtdDevolver)
        movComp.set('estoque_anterior', saldoAtual)
        movComp.set('estoque_posterior', saldoRestaurado)
        movComp.set('lote', it.lote || '')
        movComp.set('validade', it.validade || '')
        movComp.set('local_armazenamento', baixaRecord.getString('ponto_estoque'))
        movComp.set(
          'justificativa',
          'ESTORNO COMPENSATÓRIO SND: ' + motivo + ' (Ref. Baixa ' + baixaId + ')',
        )
        movComp.set('responsavel_nome', authNome)
        movComp.set('responsavel_id', authId)
        movComp.set('data_hora', agoraUtc.replace('T', ' ').slice(0, 16))
        movComp.set('documento_ref', 'ESTORNO-SND-' + baixaId)
        tx.save(movComp)
        estornoMovIds.push(movComp.id)

        // Devolve o saldo ao estoque
        itemRecTx.set('estoque_atual', saldoRestaurado)
        tx.save(itemRecTx)
      }

      // Atualiza status do registro de baixa marcando estorno compensatório
      baixaRecord.set('estornado', true)
      baixaRecord.set('estorno_motivo', motivo)
      baixaRecord.set('estorno_autor_id', authId)
      baixaRecord.set('estorno_autor_nome', authNome)
      baixaRecord.set('estorno_data_utc', agoraUtc)
      baixaRecord.set('estorno_movimentos_ids', estornoMovIds)
      tx.save(baixaRecord)
    })
  } catch (errTx) {
    return c.json(422, {
      sucesso: false,
      codigo: 'ERRO_ESTORNO_TRANSACIONAL',
      erro: 'Falha durante estorno compensatório: ' + (errTx.message || String(errTx)),
    })
  }

  return c.json(200, {
    sucesso: true,
    baixa_id: baixaId,
    estornado: true,
    estorno_data_utc: agoraUtc,
    estorno_autor_nome: authNome,
    movimentos_compensatorios_ids: estornoMovIds,
    mensagem:
      'Estorno compensatório registrado com sucesso. Saldo restaurado no estoque sem exclusão de históricos.',
  })
})
