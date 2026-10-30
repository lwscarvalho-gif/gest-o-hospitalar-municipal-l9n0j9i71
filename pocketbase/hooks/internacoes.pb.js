/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de integridade transacional de Internações:
 * Impede que dois usuários ocupem simultaneamente o mesmo leito vago.
 * Valida a existência do leito e assegura que ele está em status 'vago'.
 */
onRecordCreate((e) => {
  const leitoId = e.record.get('leito_atual')
  if (!leitoId) {
    throw new BadRequestError('Leito de destino não informado para a internação.')
  }

  const leito = e.app.findRecordById('leitos', leitoId)
  if (!leito) {
    throw new NotFoundError(`Leito com ID "${leitoId}" não foi localizado no sistema.`)
  }

  const statusAtual = leito.get('status')
  if (statusAtual === 'ocupado') {
    throw new BadRequestError(
      `Conflito de ocupação: O leito "${leito.get('codigo')}" já se encontra OCUPADO por outro paciente. Atualize o mapa de leitos.`,
    )
  }

  if (statusAtual === 'manutencao' || statusAtual === 'higienizacao') {
    throw new BadRequestError(
      `Leito indisponível: O leito "${leito.get('codigo')}" está em "${statusAtual}" e não pode receber internações no momento.`,
    )
  }

  // Se tudo correto, procede com a criação
  e.next()

  // Imediatamente após a criação atômica da internação, atualiza o leito para 'ocupado'
  leito.set('status', 'ocupado')
  e.app.save(leito)
}, 'internacoes')

/**
 * Hook de integridade em Transferência de Leito / Atualização de Internação:
 * Impede transferir paciente para leito ocupado ou em manutenção.
 */
onRecordUpdate((e) => {
  const leitoNovoId = e.record.get('leito_atual')
  const original = e.record.original()
  const leitoAntigoId = original ? original.get('leito_atual') : null

  // Se houve mudança de leito
  if (leitoNovoId && leitoAntigoId && leitoNovoId !== leitoAntigoId) {
    const leitoNovo = e.app.findRecordById('leitos', leitoNovoId)
    if (!leitoNovo) {
      throw new NotFoundError(`Novo leito de destino não encontrado.`)
    }

    const statusNovo = leitoNovo.get('status')
    if (statusNovo === 'ocupado') {
      throw new BadRequestError(
        `Conflito na transferência: O leito de destino "${leitoNovo.get('codigo')}" já está ocupado.`,
      )
    }

    if (statusNovo === 'manutencao' || statusNovo === 'higienizacao') {
      throw new BadRequestError(
        `Leito indisponível: O leito "${leitoNovo.get('codigo')}" está em ${statusNovo}.`,
      )
    }

    e.next()

    // Ocupa novo leito e libera antigo para higienização
    leitoNovo.set('status', 'ocupado')
    e.app.save(leitoNovo)

    try {
      const leitoAntigo = e.app.findRecordById('leitos', leitoAntigoId)
      if (leitoAntigo) {
        leitoAntigo.set('status', 'higienizacao')
        e.app.save(leitoAntigo)
      }
    } catch (err) {
      console.warn('Aviso ao liberar leito antigo:', err)
    }
    return
  }

  // Se for alta hospitalar
  const statusNovoInternacao = e.record.get('status')
  const statusAntigoInternacao = original ? original.get('status') : null
  if (statusNovoInternacao === 'alta' && statusAntigoInternacao !== 'alta') {
    e.next()
    if (leitoNovoId) {
      try {
        const leito = e.app.findRecordById('leitos', leitoNovoId)
        if (leito) {
          leito.set('status', 'higienizacao')
          e.app.save(leito)
        }
      } catch (err) {
        console.warn('Aviso ao liberar leito pós alta:', err)
      }
    }
    return
  }

  e.next()
}, 'internacoes')
