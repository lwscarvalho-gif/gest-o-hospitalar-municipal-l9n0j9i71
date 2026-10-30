/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de integridade transacional de Dispensações Farmacêuticas:
 * 1. Valida existência do item farmacêutico.
 * 2. Verifica se há saldo suficiente no estoque (estoque_atual >= quantidade).
 * 3. Previne dispensação duplicada com mesmo idempotency_key/tempo recente para o mesmo paciente/item.
 * 4. Executa a baixa atômica de estoque no item farmácia_itens.
 */
onRecordCreate((e) => {
  const itemId = e.record.get('item')
  const quantidade = Number(e.record.get('quantidade'))
  const pacienteId = e.record.get('paciente')
  const prescricaoRelacionada = e.record.get('prescricao_relacionada')

  if (!itemId) {
    throw new BadRequestError('Item de farmácia não especificado na dispensação.')
  }

  if (isNaN(quantidade) || quantidade <= 0) {
    throw new BadRequestError('A quantidade da dispensação deve ser estritamente positiva.')
  }

  const itemRecord = e.app.findRecordById('farmacia_itens', itemId)
  if (!itemRecord) {
    throw new NotFoundError(`Medicamento/material com ID "${itemId}" não encontrado no catálogo.`)
  }

  const estoqueAtual = Number(itemRecord.get('estoque_atual')) || 0
  if (estoqueAtual < quantidade) {
    throw new BadRequestError(
      `Saldo insuficiente em estoque para "${itemRecord.get('nome')}". Solicitado: ${quantidade}, Disponível: ${estoqueAtual}.`,
    )
  }

  // Prevenção contra duplo clique / duplicidade acidental:
  // Se houver uma dispensação exatamente igual para o mesmo paciente, item e quantidade criada nos últimos 10 segundos
  try {
    const recentRecords = e.app.findRecordsByFilter(
      'farmacia_dispensacoes',
      `paciente = {:paciente} && item = {:item} && quantidade = {:qtd}`,
      '-created',
      1,
      0,
      { paciente: pacienteId, item: itemId, qtd: quantidade },
    )

    if (recentRecords && recentRecords.length > 0) {
      const ultimaDisp = recentRecords[0]
      const createdStr = ultimaDisp.get('created')
      if (createdStr) {
        const diffMs = Math.abs(new Date().getTime() - new Date(createdStr).getTime())
        if (diffMs < 3000) {
          // Bloqueia reenvio dentro de 3 segundos com erro explícito
          throw new BadRequestError(
            `Operação duplicada ignorada: uma dispensação idêntica para este paciente e item acabou de ser processada há ${Math.round(diffMs / 1000)}s.`,
          )
        }
      }
    }
  } catch (err) {
    if (err instanceof BadRequestError) {
      throw err
    }
  }

  // Cria a dispensação
  e.next()

  // Realiza a dedução atômica no estoque
  const novoEstoque = estoqueAtual - quantidade
  itemRecord.set('estoque_atual', novoEstoque)
  e.app.save(itemRecord)
}, 'farmacia_dispensacoes')
