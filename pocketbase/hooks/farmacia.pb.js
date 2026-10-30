/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de integridade transacional de Dispensações Farmacêuticas e Inventário:
 *
 * PARTE 1 - Idempotência Real de Dispensação:
 * - Se cliente enviar `idempotency_key`, verifica se já existe registro com essa chave.
 * - Se já existe, interrompe a criação duplicada lançando BadRequestError com prefixo IDEMPOTENT_HIT:<id>.
 * - Se a chave for nova, garante atomicidade no estoque com rollback em caso de falha.
 * - Dispensações repetidas legítimas (sem mesma chave de idempotência) do mesmo paciente/medicamento CONTINUAM permitidas.
 *
 * PARTE 2 - Inventário e Movimentações:
 * - Rota customizada /backend/v1/farmacia/inventario/fechar com reconciliação estrita de concorrência.
 * - Rota customizada /backend/v1/farmacia/perdas/registrar para registrar perda/avaria sem apagar histórico.
 */

onRecordCreate((e) => {
  const itemId = e.record.get('item')
  const quantidade = Number(e.record.get('quantidade'))
  const idempotencyKey = e.record.get('idempotency_key')

  if (!itemId) {
    throw new BadRequestError('Item de farmácia não especificado na dispensação.')
  }

  if (isNaN(quantidade) || quantidade <= 0) {
    throw new BadRequestError('A quantidade da dispensação deve ser estritamente positiva.')
  }

  // 1. Verificação de IDEMPOTÊNCIA PERSISTENTE:
  if (idempotencyKey && String(idempotencyKey).trim().length > 0) {
    const key = String(idempotencyKey).trim()
    const existentes = e.app.findRecordsByFilter(
      'farmacia_dispensacoes',
      'idempotency_key = {:k}',
      '-created',
      1,
      0,
      { k: key },
    )

    if (existentes && existentes.length > 0) {
      const original = existentes[0]
      // Lança erro controlado informando o ID original para o cliente recuperar de forma consistente
      throw new BadRequestError(`IDEMPOTENT_HIT:${original.id}`)
    }
  }

  // 2. Validação de estoque disponível no catálogo
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

  // Permite salvar o registro de dispensação
  e.next()

  // 3. Baixa atômica de estoque no item
  const novoEstoque = estoqueAtual - quantidade
  itemRecord.set('estoque_atual', novoEstoque)
  e.app.save(itemRecord)
}, 'farmacia_dispensacoes')

/**
 * Endpoint de fechamento de inventário com reconciliação estrita de concorrência:
 * POST /backend/v1/farmacia/inventario/fechar
 * Body: { inventario_id, reconciliar_concorrencia?: boolean, justificativa_fechamento: string }
 *
 * Regra: se algum item do inventário teve seu estoque_atual alterado desde a abertura/contagem
 * (quantidade_sistema_base != estoque_atual_do_item), e reconciliar_concorrencia não foi aceito,
 * REJEITA o fechamento e marca o inventário como 'rejeitado_concorrencia' ou solicita conferência.
 */
routerAdd('POST', '/backend/v1/farmacia/inventario/fechar', (e) => {
  const auth = e.auth
  if (!auth) {
    throw new ForbiddenError('Apenas usuários autenticados podem fechar inventário.')
  }

  const role = auth.get('role')
  if (role !== 'admin' && role !== 'gestor') {
    throw new ForbiddenError(
      'Apenas administradores ou gestores podem fechar inventário de farmácia.',
    )
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const inventarioId = body.inventario_id
  const justificativa = String(body.justificativa_fechamento || '').trim()
  const reconciliarConcorrencia = Boolean(body.reconciliar_concorrencia)

  if (!inventarioId) {
    throw new BadRequestError('ID do inventário não informado.')
  }

  if (!justificativa) {
    throw new BadRequestError(
      'Justificativa para fechamento e eventuais ajustes de inventário é obrigatória.',
    )
  }

  const inv = e.app.findRecordById('farmacia_inventarios', inventarioId)
  if (!inv) {
    throw new NotFoundError('Inventário não encontrado.')
  }

  if (inv.get('status') === 'concluido') {
    throw new BadRequestError('Este inventário já se encontra concluído.')
  }

  const itensInv = e.app.findRecordsByFilter(
    'farmacia_inventario_itens',
    'inventario = {:invId}',
    'item_nome',
    500,
    0,
    { invId: inventarioId },
  )

  if (!itensInv || itensInv.length === 0) {
    throw new BadRequestError('O inventário não possui itens cadastrados para conferência.')
  }

  // 1. Checagem de concorrência: verificar se estoque atual do catálogo mudou em relação ao estoque_base
  const itensConcorrentes = []
  for (let i = 0; i < itensInv.length; i++) {
    const itemInv = itensInv[i]
    const catalogoItemId = itemInv.get('item')
    const baseEsperada = Number(itemInv.get('quantidade_sistema_base')) || 0

    try {
      const catItem = e.app.findRecordById('farmacia_itens', catalogoItemId)
      const estoqueAtualReal = Number(catItem.get('estoque_atual')) || 0
      if (estoqueAtualReal !== baseEsperada) {
        itensConcorrentes.push({
          item_id: catalogoItemId,
          item_nome: itemInv.get('item_nome'),
          estoque_base_abertura: baseEsperada,
          estoque_atual_real: estoqueAtualReal,
          diferenca_movimentada: estoqueAtualReal - baseEsperada,
        })
      }
    } catch (_) {}
  }

  // Se houve movimentação concorrente e não foi explicitamente reconciliado:
  if (itensConcorrentes.length > 0 && !reconciliarConcorrencia) {
    inv.set('status', 'rejeitado_concorrencia')
    e.app.save(inv)

    return e.json(409, {
      sucesso: false,
      concorrencia_detectada: true,
      mensagem:
        'O fechamento foi rejeitado: o estoque-base de um ou mais itens mudou durante a contagem (houve dispensações ou entradas). É necessária uma nova conferência e reconciliação antes de aplicar qualquer ajuste.',
      itens_concorrentes: itensConcorrentes,
    })
  }

  // 2. Se não há concorrência ou o gestor confirmou a reconciliação com justificativa digitada:
  // Executa os ajustes estritamente dentro de transação atômica
  let totalDivergencias = 0
  const movimentosGerados = []

  e.app.runInTransaction((tx) => {
    for (let i = 0; i < itensInv.length; i++) {
      const itemInv = itensInv[i]
      const qtdContada = itemInv.get('quantidade_contada')

      // Se não foi contado, pula ajuste
      if (qtdContada === null || qtdContada === undefined || String(qtdContada) === '') {
        continue
      }

      const numContado = Number(qtdContada)
      const catalogoItemId = itemInv.get('item')
      const catItem = tx.findRecordById('farmacia_itens', catalogoItemId)
      const estoqueAntes = Number(catItem.get('estoque_atual')) || 0
      const diferenca = numContado - estoqueAntes

      if (diferenca !== 0) {
        totalDivergencias++
        const tipoMov = diferenca > 0 ? 'ajuste_inventario_sobra' : 'ajuste_inventario_falta'

        // Cria o registro imutável em farmacia_movimentos_estoque
        const movCol = tx.findCollectionByNameOrId('farmacia_movimentos_estoque')
        const movRecord = new Record(movCol)
        movRecord.set('item', catalogoItemId)
        movRecord.set('item_nome', catItem.get('nome'))
        movRecord.set('tipo_movimento', tipoMov)
        movRecord.set('quantidade', Math.abs(diferenca))
        movRecord.set('estoque_anterior', estoqueAntes)
        movRecord.set('estoque_posterior', numContado)
        movRecord.set('lote', itemInv.get('lote') || catItem.get('lote') || '')
        movRecord.set('validade', itemInv.get('validade') || catItem.get('validade') || '')
        movRecord.set('local_armazenamento', itemInv.get('local_armazenamento') || '')
        movRecord.set(
          'justificativa',
          `Ajuste por inventário ${inv.get('codigo_inventario')}: ${justificativa}`,
        )
        movRecord.set('responsavel_nome', auth.get('name') || 'Gestor de Farmácia')
        movRecord.set('responsavel_id', auth.id)
        movRecord.set('data_hora', new Date().toISOString().replace('T', ' ').slice(0, 16))
        movRecord.set('inventario_origem', inv.id)
        tx.save(movRecord)
        movimentosGerados.push(movRecord.id)

        // Atualiza o estoque no catálogo
        catItem.set('estoque_atual', numContado)
        tx.save(catItem)

        // Atualiza item do inventário para 'ajustado'
        itemInv.set('divergencia', diferenca)
        itemInv.set('status_conferencia', 'ajustado')
        itemInv.set('justificativa_ajuste', justificativa)
        tx.save(itemInv)
      } else {
        itemInv.set('divergencia', 0)
        itemInv.set('status_conferencia', 'reconciliado')
        tx.save(itemInv)
      }
    }

    // Atualiza status do inventário
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16)
    inv.set('status', 'concluido')
    inv.set('data_fechamento', now)
    inv.set('responsavel_fechamento', auth.get('name') || 'Gestor de Farmácia')
    inv.set('justificativa_fechamento', justificativa)
    inv.set('total_divergencias', totalDivergencias)
    tx.save(inv)
  })

  return e.json(200, {
    sucesso: true,
    inventario_id: inv.id,
    status: 'concluido',
    total_divergencias: totalDivergencias,
    movimentos_gerados_qtd: movimentosGerados.length,
    mensagem: 'Inventário fechado com sucesso e ajustes de estoque devidamente auditados.',
  })
})

/**
 * Endpoint para registrar perdas por validade ou avaria:
 * POST /backend/v1/farmacia/perdas/registrar
 * Body: { item_id, tipo: 'perda_validade' | 'perda_avaria', quantidade, lote, validade, local_armazenamento, justificativa }
 *
 * Registra saída por perda no estoque sem apagar ou reescrever histórico anterior.
 */
routerAdd('POST', '/backend/v1/farmacia/perdas/registrar', (e) => {
  const auth = e.auth
  if (!auth) {
    throw new ForbiddenError('Apenas usuários autenticados podem registrar perdas.')
  }

  const role = auth.get('role')
  if (role === 'recepcao') {
    throw new ForbiddenError('Recepção não possui acesso a controle de perdas e estoque.')
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const itemId = body.item_id
  const tipo = body.tipo // 'perda_validade' ou 'perda_avaria'
  const quantidade = Number(body.quantidade)
  const justificativa = String(body.justificativa || '').trim()

  if (!itemId) {
    throw new BadRequestError('Item de farmácia não informado.')
  }

  if (tipo !== 'perda_validade' && tipo !== 'perda_avaria') {
    throw new BadRequestError('Tipo de perda inválido. Esperado perda_validade ou perda_avaria.')
  }

  if (isNaN(quantidade) || quantidade <= 0) {
    throw new BadRequestError('Quantidade de perda deve ser estritamente positiva.')
  }

  if (!justificativa) {
    throw new BadRequestError('Justificativa da perda ou avaria é obrigatória.')
  }

  const itemRecord = e.app.findRecordById('farmacia_itens', itemId)
  if (!itemRecord) {
    throw new NotFoundError('Item farmacêutico não encontrado.')
  }

  const estoqueAtual = Number(itemRecord.get('estoque_atual')) || 0
  if (estoqueAtual < quantidade) {
    throw new BadRequestError(
      `Estoque insuficiente para registrar perda. Saldo disponível: ${estoqueAtual}, informado para perda: ${quantidade}.`,
    )
  }

  let movId = ''
  const novoEstoque = estoqueAtual - quantidade

  e.app.runInTransaction((tx) => {
    // 1. Salvar movimento imutável
    const movCol = tx.findCollectionByNameOrId('farmacia_movimentos_estoque')
    const mov = new Record(movCol)
    mov.set('item', itemId)
    mov.set('item_nome', itemRecord.get('nome'))
    mov.set('tipo_movimento', tipo)
    mov.set('quantidade', quantidade)
    mov.set('estoque_anterior', estoqueAtual)
    mov.set('estoque_posterior', novoEstoque)
    mov.set('lote', body.lote || itemRecord.get('lote') || '')
    mov.set('validade', body.validade || itemRecord.get('validade') || '')
    mov.set(
      'local_armazenamento',
      body.local_armazenamento || itemRecord.get('local_armazenamento') || '',
    )
    mov.set('justificativa', justificativa)
    mov.set('responsavel_nome', auth.get('name') || 'Profissional de Farmácia')
    mov.set('responsavel_id', auth.id)
    mov.set('data_hora', new Date().toISOString().replace('T', ' ').slice(0, 16))
    tx.save(mov)
    movId = mov.id

    // 2. Dar baixa atômica no estoque do item
    itemRecord.set('estoque_atual', novoEstoque)
    tx.save(itemRecord)
  })

  return e.json(200, {
    sucesso: true,
    movimento_id: movId,
    item_id: itemId,
    estoque_anterior: estoqueAtual,
    novo_estoque: novoEstoque,
    mensagem: `Perda registrada com sucesso (${tipo === 'perda_validade' ? 'Validade vencida' : 'Avaria'}). Histórico preservado.`,
  })
})
