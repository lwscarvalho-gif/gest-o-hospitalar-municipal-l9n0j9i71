import pb from '@/lib/pocketbase/client'
import { ItemFarmacia, DispensacaoFarmacia, TipoMovimentoFarmacia } from '@/types/hospital'
import { registrarAuditoria } from './auditoria'

// ---------------------------------------------------------------------------
// CATÁLOGO DE ITENS DA FARMÁCIA (MEDICAMENTOS E MATERIAIS)
// ---------------------------------------------------------------------------

export async function listarItensFarmacia(
  filtroTexto?: string,
  apenasAtivos = false,
): Promise<ItemFarmacia[]> {
  try {
    let filterParts: string[] = []
    if (apenasAtivos) {
      filterParts.push('ativo = true')
    }
    if (filtroTexto && filtroTexto.trim()) {
      const q = filtroTexto.trim()
      filterParts.push(`(nome ~ "${q}" || principio_ativo ~ "${q}" || lote ~ "${q}")`)
    }
    const filter = filterParts.join(' && ')

    const records = await pb.collection('farmacia_itens').getFullList<ItemFarmacia>({
      filter: filter || undefined,
      sort: 'nome',
    })
    return records
  } catch (error) {
    console.error('Erro ao listar itens da farmácia:', error)
    return []
  }
}

export async function obterItemFarmacia(id: string): Promise<ItemFarmacia | null> {
  try {
    const record = await pb.collection('farmacia_itens').getOne<ItemFarmacia>(id)
    return record
  } catch (error) {
    console.error(`Erro ao obter item ${id}:`, error)
    return null
  }
}

export async function criarItemFarmacia(dados: Partial<ItemFarmacia>): Promise<ItemFarmacia> {
  const payload = {
    nome: dados.nome,
    tipo: dados.tipo || 'medicamento',
    principio_ativo: dados.principio_ativo || '',
    apresentacao: dados.apresentacao || '',
    unidade_medida: dados.unidade_medida || 'comprimido',
    lote: dados.lote || '',
    validade: dados.validade || '',
    estoque_atual: Number(dados.estoque_atual ?? 0),
    estoque_minimo: Number(dados.estoque_minimo ?? 0),
    ativo: dados.ativo !== false,
    observacoes: dados.observacoes || '',
  }

  const record = await pb.collection('farmacia_itens').create<ItemFarmacia>(payload)

  await registrarAuditoria({
    acao: 'CRIAR_ITEM_FARMACIA',
    modulo: 'Farmácia',
    detalhes: `Cadastrado item: ${record.nome} (${record.tipo}) - Estoque inicial: ${record.estoque_atual}`,
    registro_id: record.id,
  })

  return record
}

export async function atualizarItemFarmacia(
  id: string,
  dados: Partial<ItemFarmacia>,
): Promise<ItemFarmacia> {
  const record = await pb.collection('farmacia_itens').update<ItemFarmacia>(id, dados)

  await registrarAuditoria({
    acao: 'EDITAR_ITEM_FARMACIA',
    modulo: 'Farmácia',
    detalhes: `Item atualizado: ${record.nome} - Estoque: ${record.estoque_atual}`,
    registro_id: record.id,
  })

  return record
}

// ---------------------------------------------------------------------------
// DISPENSAÇÃO E BAIXA DE ESTOQUE AUTOMÁTICA
// ---------------------------------------------------------------------------

export interface RegistrarDispensacaoParams {
  pacienteId: string
  itemId: string
  quantidade: number
  lote?: string
  prescricaoOrigem?: string
  profissionalDispensador?: string
  tipoMovimento?: TipoMovimentoFarmacia
  setorDestino?: string
  observacoes?: string
  prescricaoRelacionadaId?: string
  internacaoId?: string
  atendimentoPaId?: string
}

export async function registrarDispensacao(
  params: RegistrarDispensacaoParams,
): Promise<{ dispensacao: DispensacaoFarmacia; itemAtualizado: ItemFarmacia }> {
  const {
    pacienteId,
    itemId,
    quantidade,
    lote,
    prescricaoOrigem,
    profissionalDispensador,
    tipoMovimento = 'dispensacao_paciente',
    setorDestino,
    observacoes,
    prescricaoRelacionadaId,
    internacaoId,
    atendimentoPaId,
  } = params
  if (quantidade <= 0) {
    throw new Error('A quantidade dispensada deve ser maior que zero.')
  }

  // 1. Obter item atual para checar estoque disponível
  const item = await pb.collection('farmacia_itens').getOne<ItemFarmacia>(itemId)
  if (!item) {
    throw new Error('Item farmacêutico não encontrado.')
  }

  const estoqueAtual = Number(item.estoque_atual || 0)
  if (estoqueAtual < quantidade) {
    throw new Error(
      `Estoque insuficiente para "${item.nome}". Disponível: ${estoqueAtual} ${item.unidade_medida}(s), Solicitado: ${quantidade}.`,
    )
  }

  const novoEstoque = estoqueAtual - quantidade
  const dataHoraAtual = new Date().toISOString().replace('T', ' ').slice(0, 16)

  // 2. Criar registro de dispensação
  const dispensacao = await pb.collection('farmacia_dispensacoes').create<DispensacaoFarmacia>(
    {
      paciente: pacienteId,
      item: itemId,
      quantidade,
      lote: lote || item.lote || '',
      prescricao_origem: prescricaoOrigem || '',
      profissional_dispensador:
        profissionalDispensador || pb.authStore.model?.name || 'Farmácia Municipal',
      data_dispensacao: dataHoraAtual,
      tipo_movimento: tipoMovimento,
      setor_destino: setorDestino || '',
      observacoes: observacoes || '',
      prescricao_relacionada: prescricaoRelacionadaId || undefined,
      internacao: internacaoId || undefined,
      atendimento_pa: atendimentoPaId || undefined,
    },
    {
      expand: 'paciente,item,prescricao_relacionada,internacao,atendimento_pa',
    },
  )

  // 3. Atualizar estoque do item farmacêutico (baixa automática)
  const itemAtualizado = await pb.collection('farmacia_itens').update<ItemFarmacia>(itemId, {
    estoque_atual: novoEstoque,
  })

  // 4. Trilha de auditoria da movimentação
  const detalhesVínculo = prescricaoRelacionadaId
    ? ` (Vinculado à Prescrição ID ${prescricaoRelacionadaId})`
    : ''
  await registrarAuditoria({
    acao: 'DISPENSACAO_FARMACIA',
    modulo: 'Farmácia',
    detalhes: `Dispensado ${quantidade} ${item.unidade_medida}(s) de "${item.nome}" (Lote: ${lote || item.lote || 'N/I'}). Estoque restante: ${novoEstoque}. Paciente ID: ${pacienteId}${detalhesVínculo}`,
    registro_id: dispensacao.id,
  })

  return { dispensacao, itemAtualizado }
}

export async function listarDispensacoes(filtros?: {
  pacienteId?: string
  itemId?: string
  dataInicio?: string
  dataFim?: string
}): Promise<DispensacaoFarmacia[]> {
  try {
    const filterParts: string[] = []

    if (filtros?.pacienteId) {
      filterParts.push(`paciente = "${filtros.pacienteId}"`)
    }
    if (filtros?.itemId) {
      filterParts.push(`item = "${filtros.itemId}"`)
    }
    if (filtros?.dataInicio) {
      filterParts.push(`data_dispensacao >= "${filtros.dataInicio}"`)
    }
    if (filtros?.dataFim) {
      filterParts.push(`data_dispensacao <= "${filtros.dataFim} 23:59"`)
    }

    const filter = filterParts.join(' && ')

    const records = await pb.collection('farmacia_dispensacoes').getFullList<DispensacaoFarmacia>({
      filter: filter || undefined,
      sort: '-data_dispensacao',
      expand: 'paciente,item,prescricao_relacionada,atendimento_pa',
    })
    return records
  } catch (error) {
    console.error('Erro ao listar dispensações:', error)
    return []
  }
}
