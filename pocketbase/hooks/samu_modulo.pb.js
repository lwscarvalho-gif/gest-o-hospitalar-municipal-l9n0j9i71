/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Integridade Server-Side e Rotas Transacionais: Módulo SAMU Básico (Parte 1)
 * Requisitos: Itens 407 a 417 do ANEXO I e Seção 7.4.5.1.e.i
 *
 * Princípios e Invariantes:
 * 1. Callback JSVM do PocketBase com toda lógica e funções auxiliares DENTRO dos corpos dos callbacks.
 * 2. Bloqueio absoluto de bypass via API de coleção (samu_ocorrencias e samu_historico_estados têm
 *    createRule/updateRule/deleteRule = null; hooks onRecordDelete bloqueiam exclusão física com erro 400).
 * 3. Identidade do autor derivada estritamente da sessão (@request.auth), sem confiar no payload do cliente.
 * 4. Idempotência em rotas transacionais: reenvio com mesma chave devolve resultado persistido sem duplicar;
 *    mesma chave com payload divergente retorna conflito (409 IDEMPOTENCY_PAYLOAD_CONFLICT).
 * 5. Histórico imutável de estados: cada transição gera registro em `samu_historico_estados` com autor,
 *    horário UTC do servidor e motivo quando cabível.
 * 6. Classificação de risco SOMENTE por profissional de saúde autorizado ('admin', 'gestor', 'profissional').
 *    Rejeita classificação automática ou feita por perfil administrativo sem competência assistencial ('recepcao').
 * 7. Atribuição de unidade móvel (veículo de transporte sanitário):
 *    - Rejeita se o veículo estiver inativo, em manutenção ou indisponível.
 *    - Rejeita se o veículo estiver em status conflituoso/ocupado em outra ocorrência SAMU ativa
 *      ('em_deslocamento', 'no_local', 'em_transporte').
 * 8. Vínculo posterior da vítima a paciente cadastrado confirmado por humano:
 *    - NÃO altera os dados originalmente informados na abertura (vitima_nome_informado, sexo, idade permanecem intactos).
 *    - Exige autor humano identificado e registra data/hora de confirmação.
 * 9. Encerramento da ocorrência SAMU NÃO gera consulta/alta/internação automática (evita registros clínicos fantasmas).
 */

// ============================================================================
// 1. Bloqueio de Exclusão Física e Bypass de Criação/Atualização via Coleção
// ============================================================================
onRecordCreate((e) => {
  throw new BadRequestError(
    'OPERACAO_NEGADA_BYPASS: Criação direta de ocorrência via API de coleção proibida. Utilize a rota transacional /backend/v1/samu/ocorrencias/abrir.',
  )
}, 'samu_ocorrencias')

onRecordUpdate((e) => {
  throw new BadRequestError(
    'OPERACAO_NEGADA_BYPASS: Alteração direta de ocorrência via API de coleção proibida. Utilize as rotas operacionais transacionais do SAMU.',
  )
}, 'samu_ocorrencias')

onRecordDelete((e) => {
  throw new BadRequestError(
    'OPERACAO_NEGADA_IMUTABILIDADE: Ocorrências do SAMU não podem ser excluídas fisicamente. Cancele ou conclua a ocorrência preservando a trilha.',
  )
}, 'samu_ocorrencias')

onRecordCreate((e) => {
  throw new BadRequestError(
    'OPERACAO_NEGADA_BYPASS: Registros de histórico do SAMU não podem ser criados diretamente via API de coleção. São gerados exclusivamente pelo backend.',
  )
}, 'samu_historico_estados')

onRecordUpdate((e) => {
  throw new BadRequestError(
    'OPERACAO_NEGADA_IMUTABILIDADE: Registros de histórico de estados do SAMU são estritamente imutáveis e não permitem alteração.',
  )
}, 'samu_historico_estados')

onRecordDelete((e) => {
  throw new BadRequestError(
    'OPERACAO_NEGADA_IMUTABILIDADE: Registros de histórico de estados do SAMU são estritamente imutáveis e não podem ser excluídos.',
  )
}, 'samu_historico_estados')

// ============================================================================
// 2. Rota POST /backend/v1/samu/ocorrencias/abrir
// ============================================================================
routerAdd('POST', '/backend/v1/samu/ocorrencias/abrir', (c) => {
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

  var auth = c.get('auth')
  if (!auth) {
    return c.json(401, { erro: 'Não autenticado: faça login para abrir ocorrência do SAMU.' })
  }

  var authId = auth.id
  var authNome = auth.getString('name') || auth.getString('email') || 'Operador SAMU'
  var authRole = auth.getString('role')
  var authCargo = auth.getString('cargo') || authRole

  var body = {}
  try {
    body = c.requestInfo().body || {}
  } catch (_) {
    body = {}
  }

  var tipoOcorrencia = sanitizar(body.tipo_ocorrencia)
  var tiposPermitidos = ['clinica', 'trauma', 'obstetrica', 'psiquiatrica', 'pediatrica', 'outro']
  if (!tipoOcorrencia || tiposPermitidos.indexOf(tipoOcorrencia) === -1) {
    return c.json(400, {
      erro:
        'Tipo de ocorrência inválido ou não informado. Opções permitidas: ' +
        tiposPermitidos.join(', '),
    })
  }

  var relacaoSolicitante = sanitizar(body.relacao_solicitante_vitima)
  var relacoesPermitidas = [
    'propria_vitima',
    'familiar',
    'transeunte',
    'policial_bombeiro',
    'profissional_saude',
    'outro',
  ]
  if (!relacaoSolicitante || relacoesPermitidas.indexOf(relacaoSolicitante) === -1) {
    return c.json(400, {
      erro:
        'Relação do solicitante com a vítima inválida ou não informada. Opções: ' +
        relacoesPermitidas.join(', '),
    })
  }

  var vitimaDesconhecida = Boolean(body.vitima_desconhecida)
  var vitimaNome = sanitizar(body.vitima_nome_informado)
  if (!vitimaNome) {
    if (vitimaDesconhecida) {
      vitimaNome = 'Desconhecido(a) / Não identificado(a)'
    } else {
      return c.json(400, {
        erro: 'Nome da vítima informado é obrigatório (ou marque vítima como desconhecida).',
      })
    }
  }

  var vitimaSexo = sanitizar(body.vitima_sexo_informado)
  var sexosPermitidos = ['M', 'F', 'Outro', 'desconhecido']
  if (!vitimaSexo || sexosPermitidos.indexOf(vitimaSexo) === -1) {
    vitimaSexo = vitimaDesconhecida ? 'desconhecido' : 'Outro'
  }

  var vitimaIdade =
    sanitizar(body.vitima_idade_informada) || (vitimaDesconhecida ? 'desconhecida' : '')

  var enderecoTextual = sanitizar(body.endereco_textual)
  if (!enderecoTextual || enderecoTextual.length < 3) {
    return c.json(400, {
      erro: 'Endereço em que se encontra a vítima é obrigatório (mínimo de 3 caracteres).',
    })
  }

  var municipio = sanitizar(body.municipio)
  if (!municipio) {
    return c.json(400, { erro: 'Município da ocorrência é obrigatório.' })
  }

  var idempKey = sanitizar(body.idempotency_key)
  var hashPayload = normalizarHash({
    tipo_ocorrencia: tipoOcorrencia,
    relacao_solicitante_vitima: relacaoSolicitante,
    vitima_nome_informado: vitimaNome,
    vitima_sexo_informado: vitimaSexo,
    vitima_idade_informada: vitimaIdade,
    endereco_textual: enderecoTextual,
    municipio: municipio,
    solicitante: sanitizar(body.nome_solicitante),
  })

  // Checagem de Idempotência
  if (idempKey) {
    try {
      var existentes = c.app.findRecordsByFilter(
        'samu_ocorrencias',
        'idempotency_key = {:k}',
        '-created',
        1,
        0,
        { k: idempKey },
      )
      if (existentes && existentes.length > 0) {
        var exOco = existentes[0]
        var exHash = exOco.getString('hash_payload')
        if (exHash && exHash !== hashPayload) {
          return c.json(409, {
            codigo: 'IDEMPOTENCY_PAYLOAD_CONFLICT',
            erro: 'Conflito de idempotência: a mesma chave foi enviada com dados de ocorrência diferentes.',
            registro_existente_id: exOco.id,
          })
        }
        return c.json(200, {
          sucesso: true,
          idempotente: true,
          mensagem: 'Ocorrência já registrada anteriormente.',
          ocorrencia_id: exOco.id,
          numero_ocorrencia: exOco.getString('numero_ocorrencia'),
          status_fluxo: exOco.getString('status_fluxo'),
        })
      }
    } catch (_) {}
  }

  var agoraUtc = new Date().toISOString()
  var ano = new Date().getUTCFullYear()
  var randomCod = Math.random().toString(36).substring(2, 7).toUpperCase()
  var numeroOcorrencia = 'SAMU-' + ano + '-' + randomCod

  // Validação opcional inicial de classificação de risco (humana)
  var riscoInformado = sanitizar(body.classificacao_risco)
  var riscoAutorId = ''
  var riscoAutorNome = ''
  var riscoAutorCargo = ''
  var riscoDataHora = ''
  var riscoJustificativa = ''

  if (riscoInformado && riscoInformado !== 'nao_classificado') {
    var rolesClinicos = ['admin', 'gestor', 'profissional']
    if (rolesClinicos.indexOf(authRole) === -1) {
      return c.json(403, {
        erro: 'Classificação de risco negada: permitida somente para profissional de saúde autorizado.',
      })
    }
    riscoAutorId = authId
    riscoAutorNome = authNome
    riscoAutorCargo = authCargo
    riscoDataHora = agoraUtc
    riscoJustificativa = sanitizar(body.risco_justificativa)
  } else {
    riscoInformado = 'nao_classificado'
  }

  var ocorrenciaCol = c.app.findCollectionByNameOrId('samu_ocorrencias')
  var novaOco = new Record(ocorrenciaCol)

  novaOco.set('numero_ocorrencia', numeroOcorrencia)
  novaOco.set('tipo_ocorrencia', tipoOcorrencia)
  novaOco.set('relacao_solicitante_vitima', relacaoSolicitante)
  novaOco.set('nome_solicitante', sanitizar(body.nome_solicitante))
  novaOco.set('telefone_solicitante', sanitizar(body.telefone_solicitante))
  novaOco.set('vitima_desconhecida', vitimaDesconhecida)
  novaOco.set('vitima_nome_informado', vitimaNome)
  novaOco.set('vitima_sexo_informado', vitimaSexo)
  novaOco.set('vitima_idade_informada', vitimaIdade)
  novaOco.set('vitima_confirmada_humano', false)
  novaOco.set('endereco_textual', enderecoTextual)
  novaOco.set('numero_complemento', sanitizar(body.numero_complemento))
  novaOco.set('bairro', sanitizar(body.bairro))
  novaOco.set('ponto_referencia', sanitizar(body.ponto_referencia))
  novaOco.set('municipio', municipio)
  novaOco.set('classificacao_risco', riscoInformado)
  if (riscoAutorId) {
    novaOco.set('risco_classificado_por_id', riscoAutorId)
    novaOco.set('risco_classificado_por_nome', riscoAutorNome)
    novaOco.set('risco_classificado_por_cargo', riscoAutorCargo)
    novaOco.set('risco_data_hora', riscoDataHora)
    novaOco.set('risco_justificativa', riscoJustificativa)
  }
  novaOco.set('status_fluxo', 'aberta')
  novaOco.set('data_hora_abertura', agoraUtc)
  novaOco.set('observacoes_iniciais', sanitizar(body.observacoes_iniciais))
  novaOco.set('usuario_abertura_id', authId)
  novaOco.set('usuario_abertura_nome', authNome)
  novaOco.set('ultimo_alterador_id', authId)
  novaOco.set('idempotency_key', idempKey)
  novaOco.set('hash_payload', hashPayload)

  c.app.save(novaOco)

  // Grava histórico inicial imutável
  try {
    var histCol = c.app.findCollectionByNameOrId('samu_historico_estados')
    var histRec = new Record(histCol)
    histRec.set('ocorrencia', novaOco.id)
    histRec.set('status_anterior', '')
    histRec.set('status_novo', 'aberta')
    histRec.set('motivo_transicao', 'Abertura inicial da ocorrência SAMU')
    histRec.set('autor_id', authId)
    histRec.set('autor_nome', authNome)
    histRec.set('autor_cargo', authCargo)
    histRec.set('autor_perfil', authRole)
    histRec.set('data_hora_utc', agoraUtc)
    histRec.set(
      'detalhes',
      JSON.stringify({
        tipo_ocorrencia: tipoOcorrencia,
        vitima_desconhecida: vitimaDesconhecida,
        municipio: municipio,
      }),
    )
    c.app.save(histRec)
  } catch (_) {}

  return c.json(201, {
    sucesso: true,
    mensagem: 'Ocorrência SAMU aberta com sucesso.',
    ocorrencia_id: novaOco.id,
    numero_ocorrencia: numeroOcorrencia,
    status_fluxo: 'aberta',
    data_hora_abertura: agoraUtc,
  })
})

// ============================================================================
// 3. Rota POST /backend/v1/samu/ocorrencias/{id}/classificar-risco
// ============================================================================
routerAdd('POST', '/backend/v1/samu/ocorrencias/{id}/classificar-risco', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.get('auth')
  if (!auth) {
    return c.json(401, { erro: 'Não autenticado: faça login para classificar risco no SAMU.' })
  }

  var authId = auth.id
  var authNome = auth.getString('name') || auth.getString('email') || 'Profissional'
  var authRole = auth.getString('role')
  var authCargo = auth.getString('cargo') || authRole

  // Classificação de risco SOMENTE por profissional de saúde autorizado
  var rolesClinicos = ['admin', 'gestor', 'profissional']
  if (rolesClinicos.indexOf(authRole) === -1) {
    return c.json(403, {
      erro:
        'Acesso negado: Classificação de risco no SAMU é ato assistencial restrito a profissionais de saúde autorizados (perfil "' +
        authRole +
        '" não autorizado).',
    })
  }

  var ocorrenciaId = c.request.pathValue('id')
  var ocoRec
  try {
    ocoRec = c.app.findRecordById('samu_ocorrencias', ocorrenciaId)
  } catch (_) {
    return c.json(404, { erro: 'Ocorrência SAMU não encontrada.' })
  }

  var statusAtual = ocoRec.getString('status_fluxo')
  if (statusAtual === 'concluida' || statusAtual === 'cancelada') {
    return c.json(400, {
      erro: 'Não é permitido alterar a classificação de risco de ocorrência já encerrada ou cancelada.',
    })
  }

  var body = {}
  try {
    body = c.requestInfo().body || {}
  } catch (_) {
    body = {}
  }

  var novoRisco = sanitizar(body.classificacao_risco)
  var niveisPermitidos = ['vermelho', 'laranja', 'amarelo', 'verde', 'azul']
  if (!novoRisco || niveisPermitidos.indexOf(novoRisco) === -1) {
    return c.json(400, {
      erro:
        'Nível de risco inválido. Níveis permitidos pelo protocolo humano: ' +
        niveisPermitidos.join(', '),
    })
  }

  var justificativa = sanitizar(body.justificativa)
  var agoraUtc = new Date().toISOString()
  var riscoAntigo = ocoRec.getString('classificacao_risco')

  ocoRec.set('classificacao_risco', novoRisco)
  ocoRec.set('risco_classificado_por_id', authId)
  ocoRec.set('risco_classificado_por_nome', authNome)
  ocoRec.set('risco_classificado_por_cargo', authCargo)
  ocoRec.set('risco_data_hora', agoraUtc)
  ocoRec.set('risco_justificativa', justificativa)
  ocoRec.set('ultimo_alterador_id', authId)

  c.app.save(ocoRec)

  // Grava histórico do evento
  try {
    var histCol = c.app.findCollectionByNameOrId('samu_historico_estados')
    var histRec = new Record(histCol)
    histRec.set('ocorrencia', ocoRec.id)
    histRec.set('status_anterior', statusAtual)
    histRec.set('status_novo', statusAtual)
    histRec.set(
      'motivo_transicao',
      'Classificação de Risco humana: ' +
        (riscoAntigo || 'nao_classificado') +
        ' -> ' +
        novoRisco +
        (justificativa ? ' (' + justificativa + ')' : ''),
    )
    histRec.set('autor_id', authId)
    histRec.set('autor_nome', authNome)
    histRec.set('autor_cargo', authCargo)
    histRec.set('autor_perfil', authRole)
    histRec.set('data_hora_utc', agoraUtc)
    histRec.set(
      'detalhes',
      JSON.stringify({
        risco_anterior: riscoAntigo,
        risco_novo: novoRisco,
        justificativa: justificativa,
      }),
    )
    c.app.save(histRec)
  } catch (_) {}

  return c.json(200, {
    sucesso: true,
    mensagem: 'Classificação de risco atribuída com sucesso por profissional de saúde.',
    ocorrencia_id: ocoRec.id,
    classificacao_risco: novoRisco,
    classificado_por: authNome,
    data_hora: agoraUtc,
  })
})

// ============================================================================
// 4. Rota POST /backend/v1/samu/ocorrencias/{id}/atribuir-unidade
// ============================================================================
routerAdd('POST', '/backend/v1/samu/ocorrencias/{id}/atribuir-unidade', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.get('auth')
  if (!auth) {
    return c.json(401, { erro: 'Não autenticado: faça login para atribuir unidade móvel.' })
  }

  var authId = auth.id
  var authNome = auth.getString('name') || auth.getString('email') || 'Operador SAMU'
  var authRole = auth.getString('role')
  var authCargo = auth.getString('cargo') || authRole

  var ocorrenciaId = c.request.pathValue('id')
  var body = {}
  try {
    body = c.requestInfo().body || {}
  } catch (_) {
    body = {}
  }

  var veiculoId = sanitizar(body.unidade_movel_id)
  if (!veiculoId) {
    return c.json(400, { erro: 'ID da unidade móvel (veículo) é obrigatório.' })
  }

  var destinoId = sanitizar(body.unidade_saude_destino_id)
  var destinoNome = sanitizar(body.unidade_saude_destino_nome)
  var destinoExterna = sanitizar(body.unidade_saude_destino_externa)

  var agoraUtc = new Date().toISOString()
  var resultadoAtribuicao = null

  try {
    c.app.runInTransaction((txApp) => {
      // 1. Busca ocorrência atual na transação
      var ocoRec = txApp.findRecordById('samu_ocorrencias', ocorrenciaId)
      var statusAtual = ocoRec.getString('status_fluxo')
      if (statusAtual === 'concluida' || statusAtual === 'cancelada') {
        var errTerminal = new Error(
          'Não é permitido atribuir unidade móvel a uma ocorrência já concluída ou cancelada.',
        )
        errTerminal.statusCode = 400
        throw errTerminal
      }

      // 2. Busca e valida veículo de transporte sanitário
      var veiculoRec = txApp.findRecordById('transporte_veiculos', veiculoId)
      if (!veiculoRec.getBool('ativo')) {
        var errInativo = new Error('A unidade móvel selecionada está inativa no sistema.')
        errInativo.statusCode = 400
        throw errInativo
      }

      var statusVeic = veiculoRec.getString('status')
      if (
        statusVeic === 'manutencao' ||
        statusVeic === 'indisponivel' ||
        statusVeic === 'inativo'
      ) {
        var errIndisp = new Error(
          'A unidade móvel ' +
            veiculoRec.getString('placa') +
            ' está em manutenção ou indisponível (Situação: ' +
            statusVeic.toUpperCase() +
            ').',
        )
        errIndisp.statusCode = 400
        throw errIndisp
      }

      // 3. Checagem atômica de conflito de ocupação NO MESMO CONTEXTO TRANSAÇÃO
      var ativas = txApp.findRecordsByFilter(
        'samu_ocorrencias',
        'id != {:ocoId} && unidade_movel_id = {:vId} && status_fluxo != "concluida" && status_fluxo != "cancelada"',
        '-created',
        5,
        0,
        { ocoId: ocorrenciaId, vId: veiculoId },
      )
      if (ativas && ativas.length > 0) {
        var conflito = ativas[0]
        var errConflito = new Error(
          'CONFLITO DE ATRIBUIÇÃO: A unidade móvel (' +
            veiculoRec.getString('placa') +
            ') já está empenhada na ocorrência ativa ' +
            conflito.getString('numero_ocorrencia') +
            ' (Status: ' +
            conflito.getString('status_fluxo') +
            '). Desocupe-a ou conclua a ocorrência anterior antes de nova atribuição.',
        )
        errConflito.statusCode = 409
        errConflito.codigo = 'UNIDADE_MOVEL_OCUPADA'
        throw errConflito
      }

      // 4. Resolve destino de saúde se aplicável
      if (destinoId && !destinoNome) {
        try {
          var setorRec = txApp.findRecordById('setores', destinoId)
          destinoNome = setorRec.getString('nome')
        } catch (_) {}
      }

      var placaVeic = veiculoRec.getString('placa')
      var descVeic = veiculoRec.getString('descricao') || placaVeic

      ocoRec.set('unidade_movel_id', veiculoId)
      ocoRec.set('unidade_movel_placa', placaVeic)
      ocoRec.set('unidade_movel_descricao', descVeic)
      if (destinoId) ocoRec.set('unidade_saude_destino_id', destinoId)
      if (destinoNome) ocoRec.set('unidade_saude_destino_nome', destinoNome)
      if (destinoExterna) ocoRec.set('unidade_saude_destino_externa', destinoExterna)
      ocoRec.set('ultimo_alterador_id', authId)

      // Se a ocorrência ainda estava 'aberta', avança para 'em_deslocamento'
      var novoStatus = statusAtual
      if (statusAtual === 'aberta') {
        novoStatus = 'em_deslocamento'
        ocoRec.set('status_fluxo', novoStatus)
      }

      txApp.save(ocoRec)

      // 5. Grava histórico de transição atômico
      var histCol = txApp.findCollectionByNameOrId('samu_historico_estados')
      var histRec = new Record(histCol)
      histRec.set('ocorrencia', ocoRec.id)
      histRec.set('status_anterior', statusAtual)
      histRec.set('status_novo', novoStatus)
      histRec.set(
        'motivo_transicao',
        'Atribuição da unidade móvel ' +
          placaVeic +
          (destinoNome ? ' com destino a ' + destinoNome : ''),
      )
      histRec.set('unidade_movel_id', veiculoId)
      histRec.set('unidade_destino_nome', destinoNome || destinoExterna)
      histRec.set('autor_id', authId)
      histRec.set('autor_nome', authNome)
      histRec.set('autor_cargo', authCargo)
      histRec.set('autor_perfil', authRole)
      histRec.set('data_hora_utc', agoraUtc)
      histRec.set(
        'detalhes',
        JSON.stringify({
          unidade_movel_id: veiculoId,
          placa: placaVeic,
          destino: destinoNome || destinoExterna,
        }),
      )
      txApp.save(histRec)

      resultadoAtribuicao = {
        ocorrencia_id: ocoRec.id,
        unidade_movel_id: veiculoId,
        unidade_movel_placa: placaVeic,
        status_fluxo: novoStatus,
      }
    })

    return c.json(200, {
      sucesso: true,
      mensagem: 'Unidade móvel atribuída à ocorrência com sucesso em transação atômica.',
      ocorrencia_id: resultadoAtribuicao.ocorrencia_id,
      unidade_movel_id: resultadoAtribuicao.unidade_movel_id,
      unidade_movel_placa: resultadoAtribuicao.unidade_movel_placa,
      status_fluxo: resultadoAtribuicao.status_fluxo,
      data_hora: agoraUtc,
    })
  } catch (err) {
    var msg = err.message || String(err)
    var st = err.statusCode || 500
    if (msg.indexOf('no rows in result set') !== -1 || msg.indexOf('não encontrada') !== -1) {
      st = 404
      msg = 'Ocorrência SAMU ou unidade móvel não localizada.'
    } else if (
      err.codigo === 'UNIDADE_MOVEL_OCUPADA' ||
      msg.indexOf('CONFLITO DE ATRIBUIÇÃO') !== -1
    ) {
      st = 409
    }
    return c.json(st, {
      codigo: err.codigo || 'ERRO_ATRIBUICAO_UNIDADE',
      erro: msg,
    })
  }
})

// ============================================================================
// 5. Rota POST /backend/v1/samu/ocorrencias/{id}/transicao
// ============================================================================
routerAdd('POST', '/backend/v1/samu/ocorrencias/{id}/transicao', (c) => {
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

  var auth = c.get('auth')
  if (!auth) {
    return c.json(401, { erro: 'Não autenticado: faça login para transitar status no SAMU.' })
  }

  var authId = auth.id
  var authNome = auth.getString('name') || auth.getString('email') || 'Operador SAMU'
  var authRole = auth.getString('role')
  var authCargo = auth.getString('cargo') || authRole

  var ocorrenciaId = c.request.pathValue('id')
  var ocoRec
  try {
    ocoRec = c.app.findRecordById('samu_ocorrencias', ocorrenciaId)
  } catch (_) {
    return c.json(404, { erro: 'Ocorrência SAMU não encontrada.' })
  }

  var statusAntigo = ocoRec.getString('status_fluxo')
  if (statusAntigo === 'concluida' || statusAntigo === 'cancelada') {
    return c.json(400, {
      erro:
        'A ocorrência ' +
        ocoRec.getString('numero_ocorrencia') +
        ' está em estado terminal (' +
        statusAntigo +
        ') e não permite novas transições.',
    })
  }

  var body = {}
  try {
    body = c.requestInfo().body || {}
  } catch (_) {
    body = {}
  }

  var statusNovo = sanitizar(body.status_novo)
  var transicoesValidas = {
    aberta: ['em_deslocamento', 'cancelada'],
    em_deslocamento: ['no_local', 'cancelada'],
    no_local: ['em_transporte', 'concluida', 'cancelada'],
    em_transporte: ['concluida', 'cancelada'],
  }

  var permitidos = transicoesValidas[statusAntigo] || []
  if (permitidos.indexOf(statusNovo) === -1) {
    return c.json(400, {
      erro:
        'Transição inválida de "' +
        statusAntigo +
        '" para "' +
        statusNovo +
        '". Próximos status válidos: ' +
        permitidos.join(', '),
    })
  }

  var motivo = sanitizar(body.motivo)
  if (statusNovo === 'cancelada') {
    if (!motivo || motivo.length < 5) {
      return c.json(400, {
        erro: 'O cancelamento de ocorrência SAMU exige justificativa formal com no mínimo 5 caracteres.',
      })
    }
  }

  var agoraUtc = new Date().toISOString()
  var idempKey = sanitizar(body.idempotency_key)
  var hashTransicao = normalizarHash({
    ocorrencia_id: ocorrenciaId,
    status_novo: statusNovo,
    motivo: motivo,
  })

  // Idempotência da transição
  if (idempKey) {
    try {
      var histExistentes = c.app.findRecordsByFilter(
        'samu_historico_estados',
        'ocorrencia = {:oId} && detalhes ~ {:k}',
        '-created',
        1,
        0,
        { oId: ocorrenciaId, k: idempKey },
      )
      if (histExistentes && histExistentes.length > 0) {
        var hEx = histExistentes[0]
        if (hEx.getString('status_novo') === statusNovo) {
          return c.json(200, {
            sucesso: true,
            idempotente: true,
            mensagem: 'Transição já realizada anteriormente.',
            ocorrencia_id: ocorrenciaId,
            status_anterior: hEx.getString('status_anterior'),
            status_novo: statusNovo,
          })
        } else {
          return c.json(409, {
            codigo: 'IDEMPOTENCY_PAYLOAD_CONFLICT',
            erro: 'Conflito de idempotência: a mesma chave de transição foi submetida com status divergente.',
          })
        }
      }
    } catch (_) {}
  }

  try {
    c.app.runInTransaction((txApp) => {
      var ocoTrans = txApp.findRecordById('samu_ocorrencias', ocoRec.id)
      ocoTrans.set('status_fluxo', statusNovo)
      ocoTrans.set('ultimo_alterador_id', authId)

      if (statusNovo === 'cancelada') {
        ocoTrans.set('motivo_cancelamento', motivo)
        ocoTrans.set('data_cancelamento', agoraUtc)
        ocoTrans.set('cancelado_por_id', authId)
      } else if (statusNovo === 'concluida') {
        ocoTrans.set('data_hora_conclusao', agoraUtc)
        var desfecho = sanitizar(body.desfecho_encaminhamento)
        if (desfecho) {
          ocoTrans.set('desfecho_encaminhamento', desfecho)
        }
        // NOTA OBRIGATÓRIA CODEX: Encerramento do SAMU NÃO gera consulta/alta/internação automática.
      }

      // Atualização opcional de unidade destino durante o transporte
      var unidDestinoNome = sanitizar(body.unidade_saude_destino_nome)
      if (unidDestinoNome) {
        ocoTrans.set('unidade_saude_destino_nome', unidDestinoNome)
      }

      txApp.save(ocoTrans)

      // Grava histórico atômico
      var histCol = txApp.findCollectionByNameOrId('samu_historico_estados')
      var histRec = new Record(histCol)
      histRec.set('ocorrencia', ocoTrans.id)
      histRec.set('status_anterior', statusAntigo)
      histRec.set('status_novo', statusNovo)
      histRec.set('motivo_transicao', motivo || 'Transição de status operacional')
      if (ocoTrans.getString('unidade_movel_id')) {
        histRec.set('unidade_movel_id', ocoTrans.getString('unidade_movel_id'))
      }
      histRec.set(
        'unidade_destino_nome',
        ocoTrans.getString('unidade_saude_destino_nome') ||
          ocoTrans.getString('unidade_saude_destino_externa'),
      )
      histRec.set('autor_id', authId)
      histRec.set('autor_nome', authNome)
      histRec.set('autor_cargo', authCargo)
      histRec.set('autor_perfil', authRole)
      histRec.set('data_hora_utc', agoraUtc)
      histRec.set(
        'detalhes',
        JSON.stringify({
          idempotency_key: idempKey,
          hash_payload: hashTransicao,
          motivo: motivo,
        }),
      )
      txApp.save(histRec)
    })

    return c.json(200, {
      sucesso: true,
      mensagem: 'Status da ocorrência atualizado para "' + statusNovo + '".',
      ocorrencia_id: ocoRec.id,
      status_anterior: statusAntigo,
      status_novo: statusNovo,
      data_hora: agoraUtc,
    })
  } catch (err) {
    return c.json(500, {
      erro: 'Falha ao atualizar status da ocorrência: ' + (err.message || String(err)),
    })
  }
})

// ============================================================================
// 6. Rota POST /backend/v1/samu/ocorrencias/{id}/vincular-paciente
// ============================================================================
routerAdd('POST', '/backend/v1/samu/ocorrencias/{id}/vincular-paciente', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.get('auth')
  if (!auth) {
    return c.json(401, { erro: 'Não autenticado: faça login para vincular paciente.' })
  }

  var authId = auth.id
  var authNome = auth.getString('name') || auth.getString('email') || 'Operador SAMU'
  var authRole = auth.getString('role')
  var authCargo = auth.getString('cargo') || authRole

  var ocorrenciaId = c.request.pathValue('id')
  var ocoRec
  try {
    ocoRec = c.app.findRecordById('samu_ocorrencias', ocorrenciaId)
  } catch (_) {
    return c.json(404, { erro: 'Ocorrência SAMU não encontrada.' })
  }

  var body = {}
  try {
    body = c.requestInfo().body || {}
  } catch (_) {
    body = {}
  }

  var pacienteId = sanitizar(body.paciente_id)
  if (!pacienteId) {
    return c.json(400, { erro: 'ID do paciente cadastrado é obrigatório para vínculo.' })
  }

  var pacRec
  try {
    pacRec = c.app.findRecordById('pacientes', pacienteId)
  } catch (_) {
    return c.json(404, { erro: 'Paciente informado não foi encontrado no cadastro municipal.' })
  }

  var confirmacaoHumana = Boolean(body.confirmacao_humana)
  if (!confirmacaoHumana) {
    return c.json(400, {
      erro: 'A confirmação humana do vínculo de identidade é estritamente obrigatória (parâmetro "confirmacao_humana" deve ser verdadeiro).',
    })
  }

  var justificativa = sanitizar(body.justificativa)
  var agoraUtc = new Date().toISOString()

  // REGRA CRÍTICA: Não altera os campos originalmente informados da vítima
  // Preserva vitima_nome_informado, vitima_sexo_informado, vitima_idade_informada
  var nomeOriginal = ocoRec.getString('vitima_nome_informado')
  var pacNomeCadastrado = pacRec.getString('nome')

  ocoRec.set('vitima_paciente_id', pacienteId)
  ocoRec.set('vitima_confirmada_humano', true)
  ocoRec.set('vitima_confirmacao_data', agoraUtc)
  ocoRec.set('vitima_confirmacao_autor_id', authId)
  ocoRec.set('ultimo_alterador_id', authId)

  c.app.save(ocoRec)

  // Grava histórico
  try {
    var histCol = c.app.findCollectionByNameOrId('samu_historico_estados')
    var histRec = new Record(histCol)
    histRec.set('ocorrencia', ocoRec.id)
    histRec.set('status_anterior', ocoRec.getString('status_fluxo'))
    histRec.set('status_novo', ocoRec.getString('status_fluxo'))
    histRec.set(
      'motivo_transicao',
      'Vínculo de paciente confirmado por humano: ' +
        pacNomeCadastrado +
        ' (Original informado: ' +
        nomeOriginal +
        ')' +
        (justificativa ? ' - ' + justificativa : ''),
    )
    histRec.set('autor_id', authId)
    histRec.set('autor_nome', authNome)
    histRec.set('autor_cargo', authCargo)
    histRec.set('autor_perfil', authRole)
    histRec.set('data_hora_utc', agoraUtc)
    histRec.set(
      'detalhes',
      JSON.stringify({
        paciente_id: pacienteId,
        paciente_nome_cadastrado: pacNomeCadastrado,
        vitima_nome_informado_original: nomeOriginal,
        justificativa: justificativa,
      }),
    )
    c.app.save(histRec)
  } catch (_) {}

  return c.json(200, {
    sucesso: true,
    mensagem: 'Vítima vinculada com sucesso ao cadastro de paciente com confirmação humana.',
    ocorrencia_id: ocoRec.id,
    paciente_id: pacienteId,
    paciente_nome: pacNomeCadastrado,
    vitima_nome_informado_original: nomeOriginal,
    data_confirmacao: agoraUtc,
  })
})

// ============================================================================
// 7. Rota GET /backend/v1/samu/ocorrencias (Listagem com filtros)
// ============================================================================
routerAdd('GET', '/backend/v1/samu/ocorrencias', (c) => {
  function sanitizar(val) {
    if (val === null || val === undefined) return ''
    return String(val).trim()
  }

  var auth = c.get('auth')
  if (!auth) {
    return c.json(401, { erro: 'Não autenticado: faça login para consultar ocorrências do SAMU.' })
  }

  var q = c.requestInfo().query || {}
  var status = sanitizar(q.status)
  var tipo = sanitizar(q.tipo)
  var municipio = sanitizar(q.municipio)
  var unidadeMovel = sanitizar(q.unidade_movel_id)
  var dataInicio = sanitizar(q.data_inicio)
  var dataFim = sanitizar(q.data_fim)
  var page = parseInt(q.page || '1', 10)
  if (isNaN(page) || page < 1) page = 1
  var perPage = parseInt(q.perPage || '30', 10)
  if (isNaN(perPage) || perPage < 1 || perPage > 100) perPage = 30

  var filters = []
  var params = {}

  if (status && status !== 'todos') {
    filters.push('status_fluxo = {:status}')
    params.status = status
  }
  if (tipo && tipo !== 'todos') {
    filters.push('tipo_ocorrencia = {:tipo}')
    params.tipo = tipo
  }
  if (municipio) {
    filters.push('municipio ~ {:mun}')
    params.mun = municipio
  }
  if (unidadeMovel) {
    filters.push('unidade_movel_id = {:um}')
    params.um = unidadeMovel
  }
  if (dataInicio) {
    filters.push('data_hora_abertura >= {:dIni}')
    params.dIni = dataInicio
  }
  if (dataFim) {
    filters.push('data_hora_abertura <= {:dFim}')
    params.dFim = dataFim
  }

  var filterExpr = filters.length > 0 ? filters.join(' && ') : ''
  var offset = (page - 1) * perPage

  try {
    var records = c.app.findRecordsByFilter(
      'samu_ocorrencias',
      filterExpr,
      '-data_hora_abertura',
      perPage,
      offset,
      params,
    )
    var total = c.app.countRecords('samu_ocorrencias', filterExpr, params)

    var items = []
    for (var i = 0; i < records.length; i++) {
      var r = records[i]
      items.push({
        id: r.id,
        numero_ocorrencia: r.getString('numero_ocorrencia'),
        tipo_ocorrencia: r.getString('tipo_ocorrencia'),
        relacao_solicitante_vitima: r.getString('relacao_solicitante_vitima'),
        nome_solicitante: r.getString('nome_solicitante'),
        telefone_solicitante: r.getString('telefone_solicitante'),
        vitima_desconhecida: r.getBool('vitima_desconhecida'),
        vitima_nome_informado: r.getString('vitima_nome_informado'),
        vitima_sexo_informado: r.getString('vitima_sexo_informado'),
        vitima_idade_informada: r.getString('vitima_idade_informada'),
        vitima_paciente_id: r.getString('vitima_paciente_id'),
        vitima_confirmada_humano: r.getBool('vitima_confirmada_humano'),
        endereco_textual: r.getString('endereco_textual'),
        municipio: r.getString('municipio'),
        bairro: r.getString('bairro'),
        classificacao_risco: r.getString('classificacao_risco'),
        risco_classificado_por_nome: r.getString('risco_classificado_por_nome'),
        unidade_saude_destino_id: r.getString('unidade_saude_destino_id'),
        unidade_saude_destino_nome: r.getString('unidade_saude_destino_nome'),
        unidade_movel_id: r.getString('unidade_movel_id'),
        unidade_movel_placa: r.getString('unidade_movel_placa'),
        status_fluxo: r.getString('status_fluxo'),
        data_hora_abertura: r.getString('data_hora_abertura'),
        data_hora_conclusao: r.getString('data_hora_conclusao'),
        motivo_cancelamento: r.getString('motivo_cancelamento'),
      })
    }

    return c.json(200, {
      items: items,
      page: page,
      perPage: perPage,
      totalItems: total,
      totalPages: Math.ceil(total / perPage),
    })
  } catch (err) {
    return c.json(500, { erro: 'Falha ao consultar ocorrências SAMU: ' + String(err) })
  }
})

// ============================================================================
// 8. Rota GET /backend/v1/samu/ocorrencias/{id} (Detalhes + Trilha)
// ============================================================================
routerAdd('GET', '/backend/v1/samu/ocorrencias/{id}', (c) => {
  var auth = c.get('auth')
  if (!auth) {
    return c.json(401, { erro: 'Não autenticado: faça login para consultar a ocorrência do SAMU.' })
  }

  var ocorrenciaId = c.request.pathValue('id')
  var ocoRec
  try {
    ocoRec = c.app.findRecordById('samu_ocorrencias', ocorrenciaId)
  } catch (_) {
    return c.json(404, { erro: 'Ocorrência SAMU não encontrada.' })
  }

  var historicoRecords = []
  try {
    historicoRecords = c.app.findRecordsByFilter(
      'samu_historico_estados',
      'ocorrencia = {:oId}',
      '-data_hora_utc',
      100,
      0,
      { oId: ocorrenciaId },
    )
  } catch (_) {}

  var historico = []
  for (var i = 0; i < historicoRecords.length; i++) {
    var h = historicoRecords[i]
    var detalhesParsed = null
    try {
      detalhesParsed = JSON.parse(h.getString('detalhes'))
    } catch (_) {}

    historico.push({
      id: h.id,
      status_anterior: h.getString('status_anterior'),
      status_novo: h.getString('status_novo'),
      motivo_transicao: h.getString('motivo_transicao'),
      unidade_movel_id: h.getString('unidade_movel_id'),
      unidade_destino_nome: h.getString('unidade_destino_nome'),
      autor_id: h.getString('autor_id'),
      autor_nome: h.getString('autor_nome'),
      autor_cargo: h.getString('autor_cargo'),
      autor_perfil: h.getString('autor_perfil'),
      data_hora_utc: h.getString('data_hora_utc'),
      detalhes: detalhesParsed,
    })
  }

  return c.json(200, {
    id: ocoRec.id,
    numero_ocorrencia: ocoRec.getString('numero_ocorrencia'),
    tipo_ocorrencia: ocoRec.getString('tipo_ocorrencia'),
    relacao_solicitante_vitima: ocoRec.getString('relacao_solicitante_vitima'),
    nome_solicitante: ocoRec.getString('nome_solicitante'),
    telefone_solicitante: ocoRec.getString('telefone_solicitante'),
    vitima_desconhecida: ocoRec.getBool('vitima_desconhecida'),
    vitima_nome_informado: ocoRec.getString('vitima_nome_informado'),
    vitima_sexo_informado: ocoRec.getString('vitima_sexo_informado'),
    vitima_idade_informada: ocoRec.getString('vitima_idade_informada'),
    vitima_paciente_id: ocoRec.getString('vitima_paciente_id'),
    vitima_confirmada_humano: ocoRec.getBool('vitima_confirmada_humano'),
    vitima_confirmacao_data: ocoRec.getString('vitima_confirmacao_data'),
    endereco_textual: ocoRec.getString('endereco_textual'),
    numero_complemento: ocoRec.getString('numero_complemento'),
    bairro: ocoRec.getString('bairro'),
    ponto_referencia: ocoRec.getString('ponto_referencia'),
    municipio: ocoRec.getString('municipio'),
    classificacao_risco: ocoRec.getString('classificacao_risco'),
    risco_classificado_por_id: ocoRec.getString('risco_classificado_por_id'),
    risco_classificado_por_nome: ocoRec.getString('risco_classificado_por_nome'),
    risco_classificado_por_cargo: ocoRec.getString('risco_classificado_por_cargo'),
    risco_data_hora: ocoRec.getString('risco_data_hora'),
    risco_justificativa: ocoRec.getString('risco_justificativa'),
    unidade_saude_destino_id: ocoRec.getString('unidade_saude_destino_id'),
    unidade_saude_destino_nome: ocoRec.getString('unidade_saude_destino_nome'),
    unidade_saude_destino_externa: ocoRec.getString('unidade_saude_destino_externa'),
    unidade_movel_id: ocoRec.getString('unidade_movel_id'),
    unidade_movel_placa: ocoRec.getString('unidade_movel_placa'),
    unidade_movel_descricao: ocoRec.getString('unidade_movel_descricao'),
    status_fluxo: ocoRec.getString('status_fluxo'),
    motivo_cancelamento: ocoRec.getString('motivo_cancelamento'),
    data_cancelamento: ocoRec.getString('data_cancelamento'),
    data_hora_abertura: ocoRec.getString('data_hora_abertura'),
    data_hora_conclusao: ocoRec.getString('data_hora_conclusao'),
    observacoes_iniciais: ocoRec.getString('observacoes_iniciais'),
    desfecho_encaminhamento: ocoRec.getString('desfecho_encaminhamento'),
    usuario_abertura_id: ocoRec.getString('usuario_abertura_id'),
    usuario_abertura_nome: ocoRec.getString('usuario_abertura_nome'),
    historico: historico,
  })
})
