import pb from '@/lib/pocketbase/client'
import {
  ItemFarmacia,
  DispensacaoFarmacia,
  TipoMovimentoFarmacia,
  InventarioFarmacia,
  ItemInventarioFarmacia,
  MovimentoEstoqueFarmacia,
  TipoMovimentoEstoque,
} from '@/types/hospital'
import { registrarAuditoria } from './auditoria'

// ---------------------------------------------------------------------------
// CATÁLOGO DE ITENS DA FARMÁCIA (MEDICAMENTOS E MATERIAIS)
// ---------------------------------------------------------------------------

export async function listarItensFarmacia(
  filtroTexto?: string,
  apenasAtivos = false,
): Promise<ItemFarmacia[]> {
  try {
    const filterParts: string[] = []
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
    localizacao_farmacia: dados.localizacao_farmacia || '',
    estoque_atual: Number(dados.estoque_atual ?? 0),
    estoque_minimo: Number(dados.estoque_minimo ?? 0),
    ativo: dados.ativo !== false,
    observacoes: dados.observacoes || '',
  }

  const record = await pb.collection('farmacia_itens').create<ItemFarmacia>(payload)

  await registrarAuditoria({
    acao: 'CRIAR_ITEM_FARMACIA',
    modulo: 'Farmácia',
    detalhes: `Cadastrado item: ${record.nome} (${record.tipo}) - Estoque inicial: ${record.estoque_atual} - Local: ${record.localizacao_farmacia || 'N/I'}`,
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
// DISPENSAÇÃO E BAIXA DE ESTOQUE COM IDEMPOTÊNCIA PERSISTENTE
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
  idempotencyKey?: string // Chave única persistente gerada pelo cliente ao abrir o fluxo
}

export async function registrarDispensacao(params: RegistrarDispensacaoParams): Promise<{
  dispensacao: DispensacaoFarmacia
  itemAtualizado: ItemFarmacia
  idempotenteReutilizado?: boolean
}> {
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
    idempotencyKey,
  } = params

  if (quantidade <= 0) {
    throw new Error('A quantidade dispensada deve ser maior que zero.')
  }

  // 1. Se foi informada chave de idempotência, verificar se já existe dispensação prévia
  if (idempotencyKey && idempotencyKey.trim()) {
    try {
      const jaExiste = await pb
        .collection('farmacia_dispensacoes')
        .getFirstListItem<DispensacaoFarmacia>(`idempotency_key = "${idempotencyKey.trim()}"`, {
          expand: 'paciente,item,prescricao_relacionada,internacao,atendimento_pa',
        })
      if (jaExiste) {
        // (b) Isolamento de usuário: checa se pertence ao usuário da sessão
        const authNome = pb.authStore.model?.name || ''
        if (
          authNome &&
          jaExiste.profissional_dispensador &&
          jaExiste.profissional_dispensador !== authNome
        ) {
          throw new Error(
            'Acesso negado: a chave de idempotência informada foi criada por outro usuário.',
          )
        }

        // (a) Validação de payload idêntico: se item, paciente ou quantidade diferem, gera conflito
        if (
          jaExiste.item !== itemId ||
          jaExiste.paciente !== pacienteId ||
          Number(jaExiste.quantidade) !== quantidade
        ) {
          throw new Error(
            'Conflito de Idempotência: A mesma chave já foi usada com parâmetros de dispensação diferentes.',
          )
        }

        // Retorna o resultado original sem segunda baixa de estoque!
        const itemAtual = (await obterItemFarmacia(jaExiste.item)) || ({} as ItemFarmacia)
        return {
          dispensacao: jaExiste,
          itemAtualizado: itemAtual,
          idempotenteReutilizado: true,
        }
      }
    } catch (errVerif: any) {
      if (
        errVerif.message?.includes('Conflito de Idempotência') ||
        errVerif.message?.includes('Acesso negado')
      ) {
        throw errVerif
      }
      // Registro não encontrado previamente com essa chave, segue fluxo normal
    }
  }

  // 2. Obter item atual para checar estoque disponível
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

  const dataHoraAtual = new Date().toISOString().replace('T', ' ').slice(0, 16)

  // 3. Criar registro de dispensação com idempotency_key
  let dispensacao: DispensacaoFarmacia
  try {
    dispensacao = await pb.collection('farmacia_dispensacoes').create<DispensacaoFarmacia>(
      {
        paciente: pacienteId,
        item: itemId,
        quantidade,
        lote: lote || item.lote || '',
        idempotency_key: idempotencyKey ? idempotencyKey.trim() : undefined,
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
  } catch (err: any) {
    // Se o backend detectou IDEMPOTENT_HIT no hook:
    const msg = err?.message || ''
    if (msg.includes('IDEMPOTENT_HIT:')) {
      const originalId = msg.split('IDEMPOTENT_HIT:')[1]?.trim()
      if (originalId) {
        const originalDisp = await pb
          .collection('farmacia_dispensacoes')
          .getOne<DispensacaoFarmacia>(originalId, {
            expand: 'paciente,item,prescricao_relacionada,internacao,atendimento_pa',
          })
        const itemAtual = (await obterItemFarmacia(originalDisp.item)) || ({} as ItemFarmacia)
        return {
          dispensacao: originalDisp,
          itemAtualizado: itemAtual,
          idempotenteReutilizado: true,
        }
      }
    }
    if (msg.includes('IDEMPOTENCY_PAYLOAD_CONFLICT')) {
      throw new Error(
        'Conflito de Idempotência: A mesma chave já foi utilizada com dados de dispensação diferentes.',
      )
    }
    throw err
  }

  // 4. Obter item com estoque já atualizado pelo backend
  let itemAtualizado: ItemFarmacia
  try {
    itemAtualizado = await pb.collection('farmacia_itens').getOne<ItemFarmacia>(itemId)
  } catch {
    itemAtualizado = item
  }

  // 5. Trilha de auditoria da movimentação
  const detalhesVinculo = prescricaoRelacionadaId
    ? ` (Vinculado à Prescrição ID ${prescricaoRelacionadaId})`
    : ''
  await registrarAuditoria({
    acao: 'DISPENSACAO_FARMACIA',
    modulo: 'Farmácia',
    detalhes: `Dispensado ${quantidade} ${item.unidade_medida}(s) de "${item.nome}" (Lote: ${lote || item.lote || 'N/I'}). Estoque restante: ${itemAtualizado.estoque_atual}. Paciente ID: ${pacienteId}${detalhesVinculo}${idempotencyKey ? ` [Idempotência: ${idempotencyKey}]` : ''}`,
    registro_id: dispensacao.id,
  })

  return { dispensacao, itemAtualizado, idempotenteReutilizado: false }
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

// ---------------------------------------------------------------------------
// PARTE 1 & 4: INVENTÁRIO DE FARMÁCIA (CONTAGEM, DIVERGÊNCIAS, AJUSTES AUDITADOS)
// ---------------------------------------------------------------------------

export interface IniciarInventarioParams {
  titulo: string
  responsavelAbertura: string
  observacoes?: string
}

export async function iniciarInventario(
  params: IniciarInventarioParams,
): Promise<{ inventario: InventarioFarmacia; totalItens: number }> {
  const agora = new Date()
  const dataAbertura = agora.toISOString().replace('T', ' ').slice(0, 16)
  const codigo = `INV-${agora.getFullYear()}${(agora.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`

  // 1. Obter todos os itens ativos do catálogo farmacêutico com snapshot do estoque base
  const itensCatalogo = await pb.collection('farmacia_itens').getFullList<ItemFarmacia>({
    filter: 'ativo = true',
    sort: 'nome',
  })

  // 2. Criar cabeçalho do inventário
  const inventario = await pb.collection('farmacia_inventarios').create<InventarioFarmacia>({
    codigo_inventario: codigo,
    titulo: params.titulo.trim(),
    status: 'em_andamento',
    data_abertura: dataAbertura,
    responsavel_abertura: params.responsavelAbertura,
    total_itens_inventariados: itensCatalogo.length,
    total_divergencias: 0,
    observacoes: params.observacoes || '',
  })

  // 3. Gerar itens de inventário para contagem física com snapshot
  for (const it of itensCatalogo) {
    await pb.collection('farmacia_inventario_itens').create({
      inventario: inventario.id,
      item: it.id,
      item_nome: it.nome,
      lote: it.lote || '',
      validade: it.validade || '',
      local_armazenamento: it.localizacao_farmacia || 'Almoxarifado Farmácia',
      quantidade_sistema_base: Number(it.estoque_atual || 0),
      status_conferencia: 'pendente',
    })
  }

  await registrarAuditoria({
    acao: 'INICIAR_INVENTARIO_FARMACIA',
    modulo: 'Farmácia',
    detalhes: `Inventário ${codigo} aberto com ${itensCatalogo.length} itens no snapshot base por ${params.responsavelAbertura}.`,
    registro_id: inventario.id,
  })

  return { inventario, totalItens: itensCatalogo.length }
}

export async function listarInventarios(): Promise<InventarioFarmacia[]> {
  try {
    const list = await pb.collection('farmacia_inventarios').getFullList<InventarioFarmacia>({
      sort: '-data_abertura',
    })
    return list
  } catch (error) {
    console.error('Erro ao listar inventários:', error)
    return []
  }
}

export async function obterInventario(
  id: string,
): Promise<{ inventario: InventarioFarmacia; itens: ItemInventarioFarmacia[] } | null> {
  try {
    const inventario = await pb.collection('farmacia_inventarios').getOne<InventarioFarmacia>(id)
    const itens = await pb
      .collection('farmacia_inventario_itens')
      .getFullList<ItemInventarioFarmacia>({
        filter: `inventario = "${id}"`,
        sort: 'item_nome',
        expand: 'item',
      })
    return { inventario, itens }
  } catch (error) {
    console.error('Erro ao obter inventário:', error)
    return null
  }
}

export interface RegistrarContagemItemParams {
  itemInventarioId: string
  quantidadeContada: number
  responsavelContagem: string
  justificativaAjuste?: string
  observacoes?: string
}

export async function registrarContagemFisica(
  params: RegistrarContagemItemParams,
): Promise<ItemInventarioFarmacia> {
  const itemInv = await pb
    .collection('farmacia_inventario_itens')
    .getOne<ItemInventarioFarmacia>(params.itemInventarioId)

  const contada = Number(params.quantidadeContada)
  const base = Number(itemInv.quantidade_sistema_base)
  const divergencia = contada - base
  const status: 'contado' | 'divergente' = divergencia === 0 ? 'contado' : 'divergente'

  const dataHora = new Date().toISOString().replace('T', ' ').slice(0, 16)

  const atualizado = await pb
    .collection('farmacia_inventario_itens')
    .update<ItemInventarioFarmacia>(params.itemInventarioId, {
      quantidade_contada: contada,
      divergencia,
      status_conferencia: status,
      responsavel_contagem: params.responsavelContagem,
      data_hora_contagem: dataHora,
      justificativa_ajuste: params.justificativaAjuste || '',
      observacoes: params.observacoes || '',
    })

  return atualizado
}

export interface FecharInventarioParams {
  inventarioId: string
  justificativaFechamento: string
  reconciliarConcorrencia?: boolean
}

export interface ResultadoFechamentoInventario {
  sucesso: boolean
  concorrencia_detectada?: boolean
  mensagem: string
  total_divergencias?: number
  itens_concorrentes?: Array<{
    item_id: string
    item_nome: string
    estoque_base_abertura: number
    estoque_atual_real: number
    diferenca_movimentada: number
  }>
}

export async function fecharInventarioComConferencia(
  params: FecharInventarioParams,
): Promise<ResultadoFechamentoInventario> {
  const { inventarioId, justificativaFechamento, reconciliarConcorrencia = false } = params

  if (!justificativaFechamento || !justificativaFechamento.trim()) {
    throw new Error('A justificativa de fechamento e ajuste de estoque é obrigatória.')
  }

  // Chama o endpoint de backend transacional com proteção de concorrência
  try {
    const res = await pb.send<ResultadoFechamentoInventario>(
      '/backend/v1/farmacia/inventario/fechar',
      {
        method: 'POST',
        body: {
          inventario_id: inventarioId,
          justificativa_fechamento: justificativaFechamento.trim(),
          reconciliar_concorrencia: reconciliarConcorrencia,
        },
      },
    )

    await registrarAuditoria({
      acao: 'FECHAMENTO_INVENTARIO_FARMACIA',
      modulo: 'Farmácia',
      detalhes: `Inventário ID ${inventarioId} fechado. Divergências ajustadas: ${res.total_divergencias || 0}. Justificativa: ${justificativaFechamento}`,
      registro_id: inventarioId,
    })

    return res
  } catch (err: any) {
    if (err.status === 409 && err.data?.concorrencia_detectada) {
      return {
        sucesso: false,
        concorrencia_detectada: true,
        mensagem: err.data.mensagem,
        itens_concorrentes: err.data.itens_concorrentes,
      }
    }
    throw new Error(err.data?.message || err.message || 'Falha ao fechar inventário.')
  }
}

// ---------------------------------------------------------------------------
// PERDAS POR VALIDADE OU AVARIA (MOVIMENTAÇÕES FORMAIS SEM APAGAR HISTÓRICO)
// ---------------------------------------------------------------------------

export interface RegistrarPerdaParams {
  itemId: string
  tipo: 'perda_validade' | 'perda_avaria'
  quantidade: number
  justificativa: string
  lote?: string
  validade?: string
  localArmazenamento?: string
}

export async function registrarPerdaEstoque(params: RegistrarPerdaParams): Promise<any> {
  const { itemId, tipo, quantidade, justificativa, lote, validade, localArmazenamento } = params

  if (quantidade <= 0) {
    throw new Error('A quantidade de perda deve ser maior que zero.')
  }
  if (!justificativa.trim()) {
    throw new Error('A justificativa formal da perda/avaria é obrigatória.')
  }

  const res = await pb.send('/backend/v1/farmacia/perdas/registrar', {
    method: 'POST',
    body: {
      item_id: itemId,
      tipo,
      quantidade,
      justificativa: justificativa.trim(),
      lote,
      validade,
      local_armazenamento: localArmazenamento,
    },
  })

  await registrarAuditoria({
    acao: tipo === 'perda_validade' ? 'PERDA_ESTOQUE_VALIDADE' : 'PERDA_ESTOQUE_AVARIA',
    modulo: 'Farmácia',
    detalhes: `Registrada ${tipo === 'perda_validade' ? 'perda por validade' : 'baixa por avaria'} de ${quantidade} un. do item ID ${itemId}. Motivo: ${justificativa}`,
    registro_id: itemId,
  })

  return res
}

export async function listarMovimentosEstoque(filtros?: {
  itemId?: string
  tipoMovimento?: TipoMovimentoEstoque
}): Promise<MovimentoEstoqueFarmacia[]> {
  try {
    const filterParts: string[] = []
    if (filtros?.itemId) {
      filterParts.push(`item = "${filtros.itemId}"`)
    }
    if (filtros?.tipoMovimento) {
      filterParts.push(`tipo_movimento = "${filtros.tipoMovimento}"`)
    }
    const filter = filterParts.join(' && ')

    const records = await pb
      .collection('farmacia_movimentos_estoque')
      .getFullList<MovimentoEstoqueFarmacia>({
        filter: filter || undefined,
        sort: '-data_hora',
        expand: 'item,inventario_origem',
      })
    return records
  } catch (error) {
    console.error('Erro ao listar movimentos de estoque:', error)
    return []
  }
}
