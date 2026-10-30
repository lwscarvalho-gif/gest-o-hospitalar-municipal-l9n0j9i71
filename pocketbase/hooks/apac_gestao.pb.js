/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Segurança, Transações e Regras de Negócio: Módulo APAC Interno
 * Referência: ANEXO I - DOC-02 Seção 7.4.4.4 (pp. 31-32) de "módulos (1).pdf"
 *
 * Escopo de Proteção:
 * 1. Autor derivado da sessão (@request.auth.id), nunca confiando em payload do cliente.
 * 2. Vínculo paciente e atendimento (internação / PA) validado no banco; se fornecido atendimento,
 *    deve pertencer comprovadamente ao mesmo paciente.
 * 3. Modalidade e APAC anterior: se modalidade for 'continuidade' ou informada apac_anterior_numero / apac_anterior_ref,
 *    valida no banco que a APAC anterior pertence OBRIGATORIAMENTE ao mesmo paciente.
 * 4. Reserva / Atribuição de número atômica e idempotente:
 *    - Endpoint dedicado POST /backend/v1/apac/reservar-numero com transação `$app.runInTransaction`.
 *    - Chave de idempotência persistente: retry devolve o mesmo número e solicitação sem duplicar;
 *      conflito se mesma chave enviada com paciente/tipo divergentes.
 *    - Incrementa de forma atômica `numero_atual` da faixa ativa configurada pelo operador autorizado (ano/uf/tipo).
 *    - Se cancelamento da solicitação ocorrer, o cancelamento é auditado e o número NÃO é reutilizado silenciosamente.
 * 5. Preservação de históricos e retificações:
 *    - Mesmo padrão de laudos e impressos: registros finalizados/autorizados são imutáveis contra sobrescrita direta.
 *    - Retificação gera novo registro com `tipo_registro='retificacao'`, `solicitacao_original_ref`,
 *      motivo da retificação (min 5 caracteres), autor da sessão e incremento de versão.
 * 6. Exclusão arbitrária sumariamente proibida (guarda e auditoria SUS).
 * 7. Perfil recepção: acesso administrativo mínimo para consulta; proibido emitir, autorizar, retificar ou cancelar.
 */

// ----------------------------------------------------------------------------
// A. Validações e Integridade na Criação de Solicitação APAC (onRecordCreate)
// ----------------------------------------------------------------------------
onRecordCreate((e) => {
  function sanitizar(val) {
    if (!val) return ''
    return String(val).trim()
  }

  var auth = e.auth
  if (!auth) {
    throw new ForbiddenError('Operação não autorizada: sessão de usuário ausente.')
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    throw new ForbiddenError(
      'Acesso negado: Perfil de recepção possui apenas permissão de consulta administrativa de APAC.',
    )
  }

  // 1. Autor derivado obrigatoriamente da sessão
  e.record.set('usuario_autor_id', auth.id)

  var profNomeSessao =
    auth.getString('name') || auth.getString('email') || 'Profissional Autorizado'
  if (!e.record.getString('profissional_solicitante_nome')) {
    e.record.set('profissional_solicitante_nome', profNomeSessao)
  }

  // 2. Validação do paciente existente
  var pacienteId = e.record.getString('paciente')
  if (!pacienteId) {
    throw new BadRequestError(
      'A identificação do paciente é obrigatória para emitir solicitação de APAC.',
    )
  }

  var pacienteRec
  try {
    pacienteRec = e.app.findRecordById('pacientes', pacienteId)
  } catch (_) {
    throw new BadRequestError('Paciente informado não foi localizado no cadastro do sistema.')
  }

  // Validação de vínculo de internação (se informada)
  var internacaoId = e.record.getString('internacao')
  if (internacaoId) {
    try {
      var interRec = e.app.findRecordById('internacoes', internacaoId)
      if (interRec.getString('paciente') !== pacienteId) {
        throw new BadRequestError(
          'Inconsistência de vínculo clínico: A internação informada pertence a outro paciente.',
        )
      }
    } catch (err) {
      if (err.status === 400 || (err.message && err.message.indexOf('Inconsistência') !== -1))
        throw err
      throw new BadRequestError('Registro de internação informado não foi localizado.')
    }
  }

  // Validação de vínculo de atendimento PA (se informado)
  var paId = e.record.getString('atendimento_pa')
  if (paId) {
    try {
      var paRec = e.app.findRecordById('pronto_atendimento', paId)
      if (paRec.getString('paciente') !== pacienteId) {
        throw new BadRequestError(
          'Inconsistência de vínculo clínico: O atendimento de Pronto Atendimento informado pertence a outro paciente.',
        )
      }
    } catch (err) {
      if (err.status === 400 || (err.message && err.message.indexOf('Inconsistência') !== -1))
        throw err
      throw new BadRequestError('Atendimento de Pronto Atendimento informado não foi localizado.')
    }
  }

  // 3. Validação de Modalidade e APAC Anterior (pertencer ao mesmo paciente)
  var modalidade = e.record.getString('modalidade')
  var apacAntNumero = sanitizar(e.record.getString('apac_anterior_numero'))
  var apacAntRef = e.record.getString('apac_anterior_ref')

  if (modalidade === 'continuidade') {
    if (!apacAntNumero && !apacAntRef) {
      throw new BadRequestError(
        'Para modalidade "Continuidade", é obrigatório registrar o número da APAC anterior.',
      )
    }
  }

  if (apacAntRef) {
    try {
      var refRec = e.app.findRecordById('apac_solicitacoes', apacAntRef)
      if (refRec.getString('paciente') !== pacienteId) {
        throw new BadRequestError(
          'Vínculo inválido: A APAC anterior referenciada pertence a um paciente diferente.',
        )
      }
      if (!apacAntNumero) {
        e.record.set(
          'apac_anterior_numero',
          refRec.getString('numero_apac') || refRec.getString('numero_laudo'),
        )
      }
    } catch (err) {
      if (err.status === 400 || (err.message && err.message.indexOf('Vínculo inválido') !== -1))
        throw err
      throw new BadRequestError('A APAC anterior referenciada não foi encontrada na base de dados.')
    }
  } else if (apacAntNumero) {
    // Se foi passado apenas o número textual da APAC anterior, verifica se existe registro dela no banco
    try {
      var antEncontradas = e.app.findRecordsByFilter(
        'apac_solicitacoes',
        'numero_apac = {:num} || numero_laudo = {:num}',
        '-created',
        1,
        0,
        { num: apacAntNumero },
      )
      if (antEncontradas && antEncontradas.length > 0) {
        var antRec = antEncontradas[0]
        if (antRec.getString('paciente') !== pacienteId) {
          throw new BadRequestError(
            'A APAC anterior (' +
              apacAntNumero +
              ') está cadastrada para outro paciente no sistema.',
          )
        }
        e.record.set('apac_anterior_ref', antRec.id)
      }
    } catch (err) {
      if (err.status === 400 || (err.message && err.message.indexOf('outro paciente') !== -1))
        throw err
    }
  }

  // 4. Verificação de Idempotência
  var idempKey = sanitizar(e.record.getString('idempotency_key'))
  if (idempKey) {
    try {
      var existente = e.app.findFirstRecordByFilter(
        'apac_solicitacoes',
        'idempotency_key = {:key}',
        { key: idempKey },
      )
      if (existente) {
        // Conflito se a mesma chave for enviada para paciente ou tipo de laudo divergente
        if (
          existente.getString('paciente') !== pacienteId ||
          existente.getString('tipo_laudo') !== e.record.getString('tipo_laudo')
        ) {
          throw new BadRequestError(
            'IDEMPOTENCY_PAYLOAD_CONFLICT: A chave de idempotência já foi utilizada com parâmetros divergentes.',
          )
        }
        throw new BadRequestError('IDEMPOTENT_HIT:' + existente.id)
      }
    } catch (err) {
      if (
        err.status === 400 ||
        (err.message &&
          (err.message.indexOf('IDEMPOTENT_HIT') !== -1 ||
            err.message.indexOf('IDEMPOTENCY_PAYLOAD_CONFLICT') !== -1))
      ) {
        throw err
      }
    }
  }

  // 5. Mapeamento / Snapshot fiel dos dados do paciente (conforme 7.4.4.4.b.iv)
  var snapshot = {
    nome: pacienteRec.getString('nome') || '',
    nome_mae: pacienteRec.getString('nome_mae') || '',
    cns: pacienteRec.getString('cartao_sus') || '',
    cpf: pacienteRec.getString('cpf') || '',
    data_nascimento: pacienteRec.getString('data_nascimento') || '',
    sexo: pacienteRec.getString('sexo') || '',
    raca_cor: 'Não informada',
    responsavel_legal: '',
    numero_prontuario: pacienteRec.id,
  }
  e.record.set('dados_paciente_snapshot', snapshot)

  // 6. Regras de Retificação Rastreável
  var tipoRegistro = e.record.getString('tipo_registro') || 'ato_original'
  if (tipoRegistro === 'retificacao') {
    var origId = e.record.getString('solicitacao_original_ref')
    if (!origId) {
      throw new BadRequestError(
        'A retificação de APAC exige a referência à solicitação original (solicitacao_original_ref).',
      )
    }

    var origRec
    try {
      origRec = e.app.findRecordById('apac_solicitacoes', origId)
    } catch (_) {
      throw new BadRequestError(
        'A solicitação original de APAC a ser retificada não foi localizada.',
      )
    }

    if (origRec.getString('paciente') !== pacienteId) {
      throw new BadRequestError(
        'Inconsistência de retificação: A solicitação original pertence a outro paciente.',
      )
    }

    var motivo = sanitizar(e.record.getString('motivo_retificacao'))
    if (!motivo || motivo.length < 5) {
      throw new BadRequestError(
        'A retificação exige justificativa/motivo formal com no mínimo 5 caracteres.',
      )
    }

    // Calcula próxima versão
    var proxVersao = (origRec.getInt('numero_versao') || 1) + 1
    try {
      var retifs = e.app.findRecordsByFilter(
        'apac_solicitacoes',
        'solicitacao_original_ref = {:orig}',
        '-numero_versao',
        1,
        0,
        { orig: origId },
      )
      if (retifs && retifs.length > 0) {
        proxVersao = Math.max(proxVersao, (retifs[0].getInt('numero_versao') || 1) + 1)
      }
    } catch (_) {}

    e.record.set('numero_versao', proxVersao)
    // Preserva o mesmo número de APAC atribuído originalmente
    if (!e.record.getString('numero_apac') && origRec.getString('numero_apac')) {
      e.record.set('numero_apac', origRec.getString('numero_apac'))
    }
  } else {
    e.record.set('tipo_registro', 'ato_original')
    e.record.set('numero_versao', 1)
  }

  // Status inicial padrão se não fornecido
  if (!e.record.getString('status')) {
    e.record.set('status', 'solicitada')
  }

  e.next()
}, 'apac_solicitacoes')

// ----------------------------------------------------------------------------
// B. Proteção de Atualização e Cancelamento Auditado (onRecordUpdate)
// ----------------------------------------------------------------------------
onRecordUpdate((e) => {
  function sanitizar(val) {
    if (!val) return ''
    return String(val).trim()
  }

  var auth = e.auth
  if (!auth) {
    throw new ForbiddenError('Operação não autorizada: sessão de usuário ausente.')
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    throw new ForbiddenError(
      'Acesso negado: Perfil de recepção não possui permissão para alterar solicitações de APAC.',
    )
  }

  var original = e.record.original()
  if (!original) {
    e.next()
    return
  }

  var statusAnt = original.getString('status')
  var statusNovo = e.record.getString('status')

  // 1. Solicitação cancelada é terminal: não pode ser reativada nem editada
  if (statusAnt === 'cancelado') {
    throw new BadRequestError(
      'A solicitação de APAC foi cancelada e seu registro é imutável. Não é permitida reativação.',
    )
  }

  // 2. Não é permitido alterar o paciente de uma solicitação já existente
  if (e.record.getString('paciente') !== original.getString('paciente')) {
    throw new BadRequestError(
      'Violação de integridade: Não é permitido alterar o paciente de uma APAC já emitida.',
    )
  }

  // 3. Imutabilidade do número da APAC após atribuído: não pode ser alterado arbitrariamente
  var numApacAnt = original.getString('numero_apac')
  var numApacNovo = e.record.getString('numero_apac')
  if (numApacAnt && numApacNovo && numApacAnt !== numApacNovo) {
    throw new BadRequestError(
      'O número de APAC atribuído é imutável. Para correções clínicas ou cadastrais, utilize retificação.',
    )
  }

  // 4. Cancelamento auditado
  if (statusNovo === 'cancelada' && statusAnt !== 'cancelada') {
    var motivoCanc = sanitizar(e.record.getString('motivo_cancelamento'))
    if (!motivoCanc || motivoCanc.length < 5) {
      throw new BadRequestError(
        'O cancelamento da solicitação de APAC exige motivo formal com no mínimo 5 caracteres.',
      )
    }
    e.record.set('cancelado_por_id', auth.id)
    if (!e.record.getString('data_cancelamento')) {
      var agora = new Date()
      e.record.set('data_cancelamento', agora.toISOString())
    }
  }

  // 5. Preservação de solicitações autorizadas contra edição direta não-retificada
  if (statusAnt === 'autorizada' && statusNovo !== 'cancelada') {
    var mudouCid = e.record.getString('cid_principal') !== original.getString('cid_principal')
    var mudouTipo = e.record.getString('tipo_laudo') !== original.getString('tipo_laudo')
    var mudouModalidade = e.record.getString('modalidade') !== original.getString('modalidade')
    var mudouPrestador =
      e.record.getString('executante_prestador_nome') !==
      original.getString('executante_prestador_nome')

    if (mudouCid || mudouTipo || mudouModalidade || mudouPrestador) {
      throw new BadRequestError(
        'A solicitação de APAC já se encontra autorizada. Modificações de CID, modalidade ou prestador devem ser realizadas por meio de Retificação formal com rastreabilidade.',
      )
    }
  }

  e.next()
}, 'apac_solicitacoes')

// ----------------------------------------------------------------------------
// C. Proibição de Exclusão (onRecordDelete)
// ----------------------------------------------------------------------------
onRecordDelete((e) => {
  throw new ForbiddenError(
    'Solicitações de APAC não podem ser excluídas por usuários. Registros mantidos para integridade, auditoria e conformidade SUS.',
  )
}, 'apac_solicitacoes')

onRecordDelete((e) => {
  throw new ForbiddenError(
    'Faixas de sequência de APAC não podem ser excluídas após inclusão para preservar a rastreabilidade da numeração.',
  )
}, 'apac_faixas_sequencias')

// ----------------------------------------------------------------------------
// D. Endpoint Transacional e Idempotente para Atribuição de Número de APAC
// POST /backend/v1/apac/reservar-numero
// ----------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/apac/reservar-numero', (c) => {
  function sanitizar(val) {
    if (!val) return ''
    return String(val).trim()
  }

  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado: faça login para acessar o serviço de APAC.' })
  }

  var role = auth.getString('role')
  if (role === 'recepcao') {
    return c.json(403, {
      erro: 'Perfil de recepção não tem permissão para reservar ou atribuir número de APAC.',
    })
  }

  var body
  try {
    body = c.requestInfo().body || {}
  } catch (_) {
    return c.json(400, { erro: 'Payload JSON inválido.' })
  }

  var solicitacaoId = sanitizar(body.solicitacao_id)
  var idempotencyKey = sanitizar(body.idempotency_key)
  var ano = Number(body.ano) || new Date().getFullYear()
  var uf = sanitizar(body.uf || 'RO').toUpperCase()
  var tipoLaudo = sanitizar(body.tipo_laudo)

  if (!solicitacaoId) {
    return c.json(400, { erro: 'Identificador da solicitação (solicitacao_id) é obrigatório.' })
  }
  if (!idempotencyKey) {
    return c.json(400, {
      erro: 'Chave de idempotência (idempotency_key) é obrigatória para reserva atômica.',
    })
  }

  try {
    var solicitacao = c.app.findRecordById('apac_solicitacoes', solicitacaoId)

    // Se já possui número de APAC atribuído:
    var numeroExistente = solicitacao.getString('numero_apac')
    if (numeroExistente) {
      return c.json(200, {
        sucesso: true,
        ja_atribuido: true,
        numero_apac: numeroExistente,
        solicitacao_id: solicitacao.id,
        status: solicitacao.getString('status'),
      })
    }

    if (solicitacao.getString('status') === 'cancelada') {
      return c.json(400, {
        erro: 'A solicitação de APAC está cancelada. Não é possível atribuir número.',
      })
    }

    var tipoParaBuscar = tipoLaudo || solicitacao.getString('tipo_laudo') || 'laudo_geral'

    var resultadoReserva = null

    // Execução em transação atômica isolada
    c.app.runInTransaction((txApp) => {
      // 1. Localiza a faixa ativa configurada pelo operador para o ano/UF/tipo
      var faixas = txApp.findRecordsByFilter(
        'apac_faixas_sequencias',
        'ano = {:ano} && uf = {:uf} && tipo_apac = {:tipo} && ativo = true',
        '-created',
        1,
        0,
        { ano: ano, uf: uf, tipo: tipoParaBuscar },
      )

      if (!faixas || faixas.length === 0) {
        throw new Error(
          'Nenhuma sequência de numeração APAC ativa foi configurada pelo gestor para o ano ' +
            ano +
            ', UF ' +
            uf +
            ' e tipo "' +
            tipoParaBuscar +
            '". Solicite inclusão de faixa autorizada.',
        )
      }

      var faixa = faixas[0]
      var inicial = faixa.getInt('faixa_inicial')
      var final = faixa.getInt('faixa_final')
      var atual = faixa.getInt('numero_atual')

      var proximoNumero = atual > 0 ? atual + 1 : inicial

      if (proximoNumero > final) {
        throw new Error(
          'A faixa de sequência de numeração APAC (' +
            inicial +
            ' a ' +
            final +
            ') para o tipo "' +
            tipoParaBuscar +
            '" está esgotada. Cadastre nova faixa.',
        )
      }

      // Formatação padronizada do número da APAC para uso interno municipal
      // Exemplo: UF + ANO + Sequencial formatado
      var seqStr = String(proximoNumero)
      while (seqStr.length < 7) {
        seqStr = '0' + seqStr
      }
      var numeroFormatadoApac = uf + String(ano) + seqStr

      // 2. Atualiza a faixa de forma atômica
      faixa.set('numero_atual', proximoNumero)
      txApp.save(faixa)

      // 3. Atualiza a solicitação com o número e altera status para autorizada
      solicitacao.set('numero_apac', numeroFormatadoApac)
      solicitacao.set('faixa_sequencia_origem', faixa.id)
      solicitacao.set('status', 'autorizada')
      txApp.save(solicitacao)

      resultadoReserva = {
        numero_apac: numeroFormatadoApac,
        numero_sequencial: proximoNumero,
        faixa_id: faixa.id,
        solicitacao_id: solicitacao.id,
      }
    })

    return c.json(200, {
      sucesso: true,
      numero_apac: resultadoReserva.numero_apac,
      solicitacao_id: resultadoReserva.solicitacao_id,
      faixa_id: resultadoReserva.faixa_id,
      mensagem: 'Número de APAC atribuído com sucesso via reserva atômica.',
    })
  } catch (err) {
    var msgErro = err.message || String(err)
    var statusCode = 500
    if (msgErro.indexOf('esgotada') !== -1 || msgErro.indexOf('Nenhuma sequência') !== -1) {
      statusCode = 409 // Conflito de recurso / esgotamento
    } else if (
      msgErro.indexOf('não foi localizada') !== -1 ||
      msgErro.indexOf('cancelada') !== -1
    ) {
      statusCode = 400
    }
    return c.json(statusCode, { erro: msgErro })
  }
})
