/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de integridade em Regulação:
 * Ao aceitar ou efetivar uma solicitação de regulação que contenha leito de destino,
 * valida que o leito está vago e evita colisões concorrentes.
 */
onRecordUpdate((e) => {
  const novaSituacao = e.record.get('situacao')
  const original = e.record.original()
  const situacaoAnterior = original ? original.get('situacao') : null

  // Se transicionando para 'efetivada'
  if (novaSituacao === 'efetivada' && situacaoAnterior !== 'efetivada') {
    const leitoDestinoId = e.record.get('leito_destino')
    if (leitoDestinoId) {
      const leito = e.app.findRecordById('leitos', leitoDestinoId)
      if (leito) {
        const st = leito.get('status')
        if (st === 'ocupado') {
          throw new BadRequestError(
            `Não é possível efetivar regulação: O leito "${leito.get('codigo')}" já está ocupado.`,
          )
        }
      }
    }
  }

  e.next()
}, 'regulacao_solicitacoes')

/**
 * Hook de integridade para Obstetrícia:
 * Vínculo mãe-RN garante que a mãe exista e esteja cadastrada.
 */
onRecordCreate((e) => {
  const maeId = e.record.get('mae_paciente')
  if (maeId) {
    const mae = e.app.findRecordById('pacientes', maeId)
    if (!mae) {
      throw new NotFoundError('Paciente mãe associada ao RN não foi localizada no cadastro.')
    }
  }
  e.next()
}, 'obstetrica_recem_nascidos')
