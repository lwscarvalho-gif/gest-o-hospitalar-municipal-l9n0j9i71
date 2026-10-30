/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Integridade Server-Side: Prescrição -> Checagem/Administração de Medicamentos
 *
 * Requisitos estritos:
 * 1. Vínculo consistente entre paciente, atendimento/internação, prescrição e item prescrito;
 *    não confia em paciente/autor/perfil fornecidos exclusivamente pelo navegador.
 * 2. Idempotência por chave persistente (idempotency_key) contra duplo clique, reenvio ou concorrência,
 *    sem impedir doses distintas legítimas.
 * 3. Prescrição suspensa/cancelada ou item suspenso NÃO aceita novas administrações.
 * 4. Preservação de registros históricos: correções são retificações rastreáveis com motivo, autor, data e referência
 *    ao registro original, sem apagar ou reescrever atos anteriores.
 */

onRecordCreate((e) => {
  const prescricaoId = e.record.get('prescricao')
  const itemId = e.record.get('prescricao_item')
  const pacienteInformado = e.record.get('paciente')
  const internacaoInformada = e.record.get('internacao')
  const atendimentoPaInformado = e.record.get('atendimento_pa')
  const idempotencyKey = e.record.get('idempotency_key')
  const tipoRegistro = e.record.get('tipo_registro') || 'ato_original'
  const registroOriginalId = e.record.get('registro_original')
  const motivoCorrecao = e.record.get('motivo_correcao')

  // A. Se for retificação / correção rastreável:
  if (tipoRegistro === 'retificacao') {
    if (!registroOriginalId) {
      throw new BadRequestError(
        'Retificação de administração exige referência ao registro original.',
      )
    }
    if (!motivoCorrecao || String(motivoCorrecao).trim().length < 5) {
      throw new BadRequestError(
        'Retificação de administração exige justificativa/motivo detalhado (mínimo de 5 caracteres).',
      )
    }

    // Verifica se o registro original existe
    const originalRec = e.app.findRecordById('administracao_medicamentos', registroOriginalId)
    if (!originalRec) {
      throw new NotFoundError(
        `Registro original de administração "${registroOriginalId}" não encontrado.`,
      )
    }
  }

  // B. Idempotência contra duplo clique / reenvio / concorrência
  if (idempotencyKey && String(idempotencyKey).trim().length > 0) {
    const key = String(idempotencyKey).trim()
    const existentes = e.app.findRecordsByFilter(
      'administracao_medicamentos',
      'idempotency_key = {:k}',
      '-created',
      1,
      0,
      { k: key },
    )

    if (existentes && existentes.length > 0) {
      const original = existentes[0]

      // Isolamento de usuário: se autenticado e há divergência de usuário
      const auth = e.auth
      const originalUserId = original.get('usuario_id') || ''
      if (auth && originalUserId && originalUserId !== auth.id) {
        throw new ForbiddenError(
          'Acesso negado: a chave de idempotência de administração informada pertence a outro usuário.',
        )
      }

      // Conflito de payload: mesma chave com item, prescrição ou paciente divergente
      const origPresc = original.get('prescricao')
      const origItem = original.get('prescricao_item')
      const origPac = original.get('paciente')

      if (
        (origPresc && prescricaoId && origPresc !== prescricaoId) ||
        (origItem && itemId && origItem !== itemId) ||
        (origPac && pacienteInformado && origPac !== pacienteInformado)
      ) {
        throw new BadRequestError(
          'IDEMPOTENCY_PAYLOAD_CONFLICT: A mesma chave de checagem foi utilizada com dados divergentes.',
        )
      }

      // Retorna HIT idempotente controlado
      throw new BadRequestError(`IDEMPOTENT_HIT:${original.id}`)
    }
  }

  // C. Validação server-side de Prescrição e Item prescrito
  if (!prescricaoId) {
    throw new BadRequestError('Prescrição de origem é obrigatória para registrar administração.')
  }

  const prescricaoRec = e.app.findRecordById('prescricoes', prescricaoId)
  if (!prescricaoRec) {
    throw new NotFoundError(`Prescrição médica "${prescricaoId}" não encontrada.`)
  }

  // C1. Status da prescrição: se suspensa ou concluída, não aceita nova administração
  const statusPresc = prescricaoRec.get('status')
  if (statusPresc === 'suspensa' || statusPresc === 'concluida') {
    throw new BadRequestError(
      `Prescrição médica ${statusPresc.toUpperCase()}: não é permitido administrar medicamentos para uma prescrição inativa ou cancelada.`,
    )
  }

  // C2. Vínculo consistente de Paciente (Servidor é a autoridade da verdade clínica)
  const pacientePrescricao = prescricaoRec.get('paciente')
  if (!pacientePrescricao) {
    throw new BadRequestError('Prescrição médica sem paciente vinculado.')
  }
  if (pacienteInformado && pacienteInformado !== pacientePrescricao) {
    throw new BadRequestError(
      'VÍNCULO DIVERGENTE: O paciente informado no formulário difere do paciente vinculado à prescrição médica.',
    )
  }
  // Força o paciente correto derivado do servidor
  e.record.set('paciente', pacientePrescricao)

  // C3. Vínculo consistente de Atendimento PA / Internação
  const internacaoPrescricao = prescricaoRec.get('internacao') || ''
  const atendimentoPaPrescricao = prescricaoRec.get('atendimento_pa') || ''

  if (internacaoInformada && internacaoPrescricao && internacaoInformada !== internacaoPrescricao) {
    throw new BadRequestError(
      'VÍNCULO DIVERGENTE: A internação informada difere da internação da prescrição médica.',
    )
  }
  if (
    atendimentoPaInformado &&
    atendimentoPaPrescricao &&
    atendimentoPaInformado !== atendimentoPaPrescricao
  ) {
    throw new BadRequestError(
      'VÍNCULO DIVERGENTE: O atendimento de PA informado difere do atendimento da prescrição médica.',
    )
  }

  // Sincroniza vínculos autoritativos da prescrição no registro de administração
  if (internacaoPrescricao) {
    e.record.set('internacao', internacaoPrescricao)
  }
  if (atendimentoPaPrescricao) {
    e.record.set('atendimento_pa', atendimentoPaPrescricao)
  }

  // C4. Validação de Item da prescrição (se informado)
  if (itemId) {
    const itemRec = e.app.findRecordById('prescricao_itens', itemId)
    if (!itemRec) {
      throw new NotFoundError(`Item de prescrição "${itemId}" não encontrado.`)
    }

    // Verifica se o item pertence à prescrição indicada
    if (itemRec.get('prescricao') !== prescricaoId) {
      throw new BadRequestError(
        'VÍNCULO DIVERGENTE: O item de medicamento informado não pertence à prescrição médica selecionada.',
      )
    }

    // Verifica status do item prescrito
    const statusItem = itemRec.get('status')
    if (statusItem === 'suspenso' || statusItem === 'concluido') {
      throw new BadRequestError(
        `Medicamento ${statusItem.toUpperCase()} na prescrição médica. Não é permitida nova administração.`,
      )
    }

    // Garante nome do medicamento fiel ao item prescrito caso venha em branco
    if (!e.record.get('medicamento_nome')) {
      e.record.set('medicamento_nome', itemRec.get('medicamento_nome'))
    }
  }

  // D. Autor e Perfil: Servidor não confia em dados fornecidos pelo navegador
  const auth = e.auth
  if (auth) {
    e.record.set('usuario_id', auth.id)

    // Se o usuário possui nome e cargo no perfil auth, sobrepõe ou preenche autoritativamente
    const authNome = auth.get('name')
    const authCargo = auth.get('cargo') || auth.get('role') || ''
    if (authNome && String(authNome).trim().length > 0) {
      e.record.set('responsavel_nome', authNome)
    }
    if (authCargo && String(authCargo).trim().length > 0) {
      e.record.set('responsavel_cargo', authCargo)
    }
  }

  // E. Timestamp seguro de administração
  if (!e.record.get('data_hora_administracao')) {
    e.record.set('data_hora_administracao', new Date().toISOString().replace('T', ' ').slice(0, 16))
  }

  e.next()
}, 'administracao_medicamentos')
