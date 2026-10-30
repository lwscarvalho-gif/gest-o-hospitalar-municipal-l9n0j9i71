/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Integridade Transacional e Segurança de Impressos Assistenciais:
 * - Coleção: impressos_assistenciais
 * - 1. Validação de vínculos clínicos no servidor (paciente, atendimento_pa, internacao).
 * - 2. Vínculo de Autor derivado com integridade da sessão do servidor.
 * - 3. Snapshot fiel congelado no ato da emissão para reprodução no SAME.
 * - 4. Regras de Retificação Rastreável: gera novo registro referenciado preservando o original.
 * - 5. Bloqueio de Imutabilidade Estrita: proibição de UPDATE e DELETE direto.
 * - 6. Idempotência contra duplo clique / reenvio concorrente.
 */

onRecordCreate((e) => {
  var auth = e.auth
  if (!auth) {
    throw new ForbiddenError('Operação não autorizada: sessão de usuário ausente.')
  }

  // 1. Validação de permissão do usuário
  var userRole = auth.getString('role')
  if (userRole === 'recepcao') {
    throw new ForbiddenError(
      'Perfil de recepção não possui autorização para emitir impressos assistenciais.',
    )
  }

  // 2. Registro do autor obtido com fidelidade da sessão
  e.record.set('usuario_emissor_id', auth.id)

  // 3. Validação do vínculo do paciente
  var pacienteId = e.record.getString('paciente')
  if (!pacienteId) {
    throw new BadRequestError(
      'Vínculo de paciente é obrigatório para emissão de impresso assistencial.',
    )
  }

  var pacienteRecord
  try {
    pacienteRecord = e.app.findRecordById('pacientes', pacienteId)
  } catch (err) {
    throw new BadRequestError('Paciente informado não foi localizado no cadastro do sistema.')
  }

  // 4. Validação de coerência do atendimento PA (se informado)
  var atdPaId = e.record.getString('atendimento_pa')
  if (atdPaId) {
    try {
      var paRecord = e.app.findRecordById('pronto_atendimento', atdPaId)
      var paPacienteId = paRecord.getString('paciente')
      if (paPacienteId && paPacienteId !== pacienteId) {
        throw new BadRequestError(
          'Inconsistência de vínculo: o atendimento de PA informado pertence a outro paciente.',
        )
      }
    } catch (err) {
      if (err.status === 400 || (err.message && err.message.indexOf('Inconsistência') !== -1)) {
        throw err
      }
      throw new BadRequestError('Atendimento de Pronto Atendimento informado não foi localizado.')
    }
  }

  // 5. Validação de coerência da internação (se informada)
  var internacaoId = e.record.getString('internacao')
  if (internacaoId) {
    try {
      var interRecord = e.app.findRecordById('internacoes', internacaoId)
      var interPacienteId = interRecord.getString('paciente')
      if (interPacienteId && interPacienteId !== pacienteId) {
        throw new BadRequestError(
          'Inconsistência de vínculo: a internação informada pertence a outro paciente.',
        )
      }
    } catch (err) {
      if (err.status === 400 || (err.message && err.message.indexOf('Inconsistência') !== -1)) {
        throw err
      }
      throw new BadRequestError('Registro de internação informado não foi localizado.')
    }
  }

  // 6. Idempotência
  var idempKey = e.record.getString('idempotency_key')
  if (idempKey) {
    try {
      var existente = e.app.findFirstRecordByFilter(
        'impressos_assistenciais',
        'idempotency_key = {:key}',
        { key: idempKey },
      )
      if (existente) {
        throw new BadRequestError(
          'Documento já emitido anteriormente com esta chave de idempotência. Operação duplicada rejeitada.',
        )
      }
    } catch (err) {
      if (
        err.status === 400 ||
        (err.message && err.message.indexOf('Documento já emitido') !== -1)
      ) {
        throw err
      }
    }
  }

  // 7. Congelamento do Snapshot do Paciente (para reimpressão fiel pelo SAME)
  if (!e.record.getString('paciente_nome_snapshot')) {
    e.record.set('paciente_nome_snapshot', pacienteRecord.getString('nome') || '')
  }
  if (!e.record.getString('paciente_cpf_snapshot')) {
    e.record.set('paciente_cpf_snapshot', pacienteRecord.getString('cpf') || '')
  }
  if (!e.record.getString('paciente_cns_snapshot')) {
    e.record.set('paciente_cns_snapshot', pacienteRecord.getString('cartao_sus') || '')
  }
  if (!e.record.getString('paciente_nascimento_snapshot')) {
    e.record.set('paciente_nascimento_snapshot', pacienteRecord.getString('data_nascimento') || '')
  }
  if (!e.record.getString('paciente_sexo_snapshot')) {
    e.record.set('paciente_sexo_snapshot', pacienteRecord.getString('sexo') || '')
  }
  if (!e.record.getString('paciente_alergias_snapshot')) {
    e.record.set('paciente_alergias_snapshot', pacienteRecord.getString('alergias') || '')
  }

  // 8. Regras de Retificação Rastreável
  var tipoRegistro = e.record.getString('tipo_registro') || 'ato_original'
  if (tipoRegistro === 'retificacao') {
    var docOriginalId = e.record.getString('documento_original')
    if (!docOriginalId) {
      throw new BadRequestError(
        'Retificação exige informar a referência ao documento_original emitido anteriormente.',
      )
    }

    var docOriginal
    try {
      docOriginal = e.app.findRecordById('impressos_assistenciais', docOriginalId)
    } catch (err) {
      throw new BadRequestError(
        'Documento original a ser retificado não foi encontrado na base de dados.',
      )
    }

    if (docOriginal.getString('paciente') !== pacienteId) {
      throw new BadRequestError(
        'Documento original a ser retificado pertence a paciente diferente.',
      )
    }

    var motivo = (e.record.getString('motivo_retificacao') || '').trim()
    if (!motivo || motivo.length < 5) {
      throw new BadRequestError(
        'Retificação de documento clínico exige justificativa/motivo formal com no mínimo 5 caracteres.',
      )
    }

    try {
      var anteriores = e.app.findRecordsByFilter(
        'impressos_assistenciais',
        'documento_original = {:docOrig}',
        '-numero_retificacao',
        1,
        0,
        { docOrig: docOriginalId },
      )
      var proxNum = 1
      if (anteriores && anteriores.length > 0) {
        proxNum = (anteriores[0].getInt('numero_retificacao') || 0) + 1
      }
      e.record.set('numero_retificacao', proxNum)
    } catch (_) {
      e.record.set('numero_retificacao', 1)
    }
  } else {
    e.record.set('tipo_registro', 'ato_original')
    e.record.set('numero_retificacao', 0)
  }

  // 9. Preservação do consentimento de CID para atestados
  var tipoImpresso = e.record.getString('tipo')
  if (tipoImpresso === 'atestado') {
    var cidCodigo = e.record.getString('cid10_codigo')
    var consentimento = e.record.getBool('cid_consentimento_registrado')
    if (cidCodigo && !consentimento) {
      throw new BadRequestError(
        'Conforme resolução do CFM e regras do sistema, o CID só pode constar em atestado mediante consentimento explícito do paciente devidamente registrado.',
      )
    }
  }

  e.next()
}, 'impressos_assistenciais')

onRecordUpdate((e) => {
  throw new ForbiddenError(
    'Documento assistencial é imutável após emissão. Para corrigir dados clínicos, emita uma retificação referenciada preservando o histórico.',
  )
}, 'impressos_assistenciais')

onRecordDelete((e) => {
  throw new ForbiddenError(
    'Documento assistencial não pode ser excluído do prontuário por motivos de guarda legal e auditoria.',
  )
}, 'impressos_assistenciais')
