import pb from '@/lib/pocketbase/client'
import {
  ItemCardapioRefeicao,
  DietaCatalogoSND,
  PrescricaoDieteticaSND,
  DistribuicaoRefeicaoSND,
  ItemMapaCozinhaSanitizado,
  CategoriaDietaSND,
  StatusDistribuicaoRefeicao,
  ComposicaoRefeicaoSND,
  ItemComposicaoReceitaSND,
  BaixaEstoqueDistribuicaoSND,
  PreviaInsumosBaixaSND,
  ConfirmarDistribuicaoComBaixaParams,
  RespostaConfirmarDistribuicaoComBaixa,
  EstornarBaixaSNDParams,
  RespostaEstornoBaixaSND,
} from '@/types/hospital'
import { registrarAuditoria } from './auditoria'

export interface CriarRefeicaoParams {
  codigo: string
  nome: string
  descricao?: string
  horario_padrao: string
  ordem_dia: number
  ativo?: boolean
}

export interface CriarDietaCatalogoParams {
  codigo: string
  nome: string
  categoria: CategoriaDietaSND
  consistencia?: string
  composicao_descricao?: string
  indicacao_padrao?: string
  refeicoes_permitidas?: string[]
  ativo?: boolean
}

export interface EmitirPrescricaoDieteticaParams {
  paciente_ref: string
  internacao_ref?: string
  atendimento_pa_ref?: string
  leito_ref?: string
  setor_ref?: string
  dieta_catalogo_ref: string
  categoria_dieta?: CategoriaDietaSND
  consistencia?: string
  via_administracao?: string
  quantidade?: number
  unidade_medida?: string
  fracionamento?: string
  horarios_refeicoes?: Array<{ refeicao_codigo: string; horario: string }>
  vigencia_inicio?: string
  vigencia_fim?: string
  restricoes_alimentares?: string
  alergias_verificadas?: string
  observacoes_profissionais?: string
  diagnostico_justificativa_clinica?: string // RESTRITO: não exposto para a cozinha
  prescricao_anterior_ref?: string
  motivo_alteracao_suspensao?: string
  idempotency_key?: string
}

export interface RegistrarDistribuicaoRefeicaoParams {
  prescricao_dietetica_ref: string
  paciente_ref: string
  leito_ref?: string
  setor_ref?: string
  refeicao_codigo: string
  data_operacional: string
  horario_previsto?: string
  status_operacional: 'planejado' | 'em_preparo' | 'distribuido' | 'nao_distribuido'
  motivo_nao_distribuido?: string
  observacoes_operacionais?: string
  temperatura_afericao?: string
  responsavel_entrega_nome?: string
  idempotency_key?: string
}

export interface ListarDistribuicoesFiltros {
  page?: number
  perPage?: number
  data_operacional?: string
  data_inicio?: string
  data_fim?: string
  setor_ref?: string
  leito_ref?: string
  paciente_ref?: string
  refeicao_codigo?: string
  status_operacional?: string
}

export interface ResultadoPaginadoDistribuicoes {
  items: DistribuicaoRefeicaoSND[]
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

export interface SuspenderPrescricaoParams {
  prescricao_id: string
  motivo: string
  idempotency_key?: string
}

/**
 * 1. Catálogo de Refeições (Cardápio / Horários)
 */
export async function listarRefeicoesCardapio(
  somenteAtivas = true,
): Promise<ItemCardapioRefeicao[]> {
  const filter = somenteAtivas ? 'ativo = true' : ''
  const records = await pb.collection('snd_cardapio_refeicoes').getFullList({
    filter,
    sort: 'ordem_dia',
  })
  return records as unknown as ItemCardapioRefeicao[]
}

export async function criarRefeicaoCardapio(
  params: CriarRefeicaoParams,
): Promise<ItemCardapioRefeicao> {
  const payload = {
    ...params,
    ativo: params.ativo !== false,
    versao: 1,
    autor_id: pb.authStore.model?.id || '',
    autor_nome: pb.authStore.model?.name || pb.authStore.model?.email || 'Administrador',
  }

  const record = await pb.collection('snd_cardapio_refeicoes').create(payload)

  await registrarAuditoria({
    acao: 'criar_refeicao_cardapio',
    modulo: 'snd',
    detalhes: `Refeição cadastrada no cardápio: ${params.nome} (${params.codigo})`,
    registro_id: record.id,
  })

  return record as unknown as ItemCardapioRefeicao
}

export async function inativarRefeicaoCardapio(
  id: string,
  motivo: string,
): Promise<ItemCardapioRefeicao> {
  const record = await pb.collection('snd_cardapio_refeicoes').update(id, {
    ativo: false,
    motivo_inativacao: motivo,
  })

  await registrarAuditoria({
    acao: 'inativar_refeicao_cardapio',
    modulo: 'snd',
    detalhes: `Refeição inativada: ${id}. Motivo: ${motivo}`,
    registro_id: id,
  })

  return record as unknown as ItemCardapioRefeicao
}

/**
 * 2. Catálogo de Tipos de Dieta (Oral, Rotina, Enteral, Parenteral, Especial)
 */
export async function listarDietasCatalogo(somenteAtivas = true): Promise<DietaCatalogoSND[]> {
  const filter = somenteAtivas ? 'ativo = true' : ''
  const records = await pb.collection('snd_dietas_catalogo').getFullList({
    filter,
    sort: 'categoria,nome',
  })
  return records as unknown as DietaCatalogoSND[]
}

export async function criarDietaCatalogo(
  params: CriarDietaCatalogoParams,
): Promise<DietaCatalogoSND> {
  const payload = {
    ...params,
    ativo: params.ativo !== false,
    versao: 1,
    autor_id: pb.authStore.model?.id || '',
    autor_nome: pb.authStore.model?.name || pb.authStore.model?.email || 'Administrador',
  }

  const record = await pb.collection('snd_dietas_catalogo').create(payload)

  await registrarAuditoria({
    acao: 'criar_dieta_catalogo',
    modulo: 'snd',
    detalhes: `Tipo de dieta cadastrado no catálogo: ${params.nome} (${params.categoria})`,
    registro_id: record.id,
  })

  return record as unknown as DietaCatalogoSND
}

export async function inativarDietaCatalogo(id: string, motivo: string): Promise<DietaCatalogoSND> {
  const record = await pb.collection('snd_dietas_catalogo').update(id, {
    ativo: false,
    motivo_alteracao: motivo,
  })

  await registrarAuditoria({
    acao: 'inativar_dieta_catalogo',
    modulo: 'snd',
    detalhes: `Tipo de dieta inativado: ${id}. Motivo: ${motivo}`,
    registro_id: id,
  })

  return record as unknown as DietaCatalogoSND
}

/**
 * 3. Prescrição Dietética Individualizada
 * Emitida exclusivamente por profissional humano autorizado.
 * Vínculo estrito com paciente e episódio assistencial.
 */
export async function listarPrescricoesDieteticas(filtros: {
  paciente_ref?: string
  internacao_ref?: string
  status?: string
}): Promise<PrescricaoDieteticaSND[]> {
  const filterParts: string[] = []
  if (filtros.paciente_ref) filterParts.push(`paciente_ref = "${filtros.paciente_ref}"`)
  if (filtros.internacao_ref) filterParts.push(`internacao_ref = "${filtros.internacao_ref}"`)
  if (filtros.status) filterParts.push(`status = "${filtros.status}"`)

  const records = await pb.collection('snd_prescricoes_dieteticas').getFullList({
    filter: filterParts.join(' && '),
    sort: '-created',
    expand: 'paciente_ref,internacao_ref,leito_ref,setor_ref,dieta_catalogo_ref',
  })
  return records as unknown as PrescricaoDieteticaSND[]
}

export async function emitirPrescricaoDietetica(
  params: EmitirPrescricaoDieteticaParams,
): Promise<PrescricaoDieteticaSND> {
  // Snapshot prévio do catálogo para garantir consistência
  const dietaRec = await pb.collection('snd_dietas_catalogo').getOne(params.dieta_catalogo_ref)

  const payload = {
    ...params,
    dieta_codigo_snapshot: dietaRec.codigo,
    dieta_nome_snapshot: dietaRec.nome,
    dieta_versao_snapshot: dietaRec.versao || 1,
    categoria_dieta: params.categoria_dieta || dietaRec.categoria,
    consistencia: params.consistencia || dietaRec.consistencia || '',
    status: 'ativa',
    versao_numero: 1,
    prescritor_id: pb.authStore.model?.id || '',
    prescritor_nome:
      pb.authStore.model?.name || pb.authStore.model?.email || 'Profissional Autorizado',
    prescritor_perfil: pb.authStore.model?.cargo || pb.authStore.model?.role || 'profissional',
    prescritor_conselho: pb.authStore.model?.registro_profissional || '',
    data_hora_prescricao_utc: new Date().toISOString(),
  }

  try {
    const record = await pb.collection('snd_prescricoes_dieteticas').create(payload)

    await registrarAuditoria({
      acao: 'emitir_prescricao_dietetica',
      modulo: 'snd',
      detalhes: `Prescrição dietética emitida para paciente ${params.paciente_ref}: ${dietaRec.nome} (${payload.categoria_dieta})`,
      registro_id: record.id,
    })

    return record as unknown as PrescricaoDieteticaSND
  } catch (err: unknown) {
    const errorMsg = String(err)
    if (errorMsg.includes('IDEMPOTENT_HIT:') && params.idempotency_key) {
      // Localiza o registro já persistido com a mesma chave
      const hit = await pb
        .collection('snd_prescricoes_dieteticas')
        .getFirstListItem(`idempotency_key = "${params.idempotency_key}"`)
      return hit as unknown as PrescricaoDieteticaSND
    }
    throw err
  }
}

/**
 * 4. Registro Operacional de Distribuição de Refeições (Cozinha/Copa)
 * Idempotente com chave persistente e validação de motivo em caso de não distribuição.
 */
export async function registrarDistribuicaoRefeicao(
  params: RegistrarDistribuicaoRefeicaoParams,
): Promise<DistribuicaoRefeicaoSND> {
  if (
    params.status_operacional === 'nao_distribuido' &&
    (!params.motivo_nao_distribuido || params.motivo_nao_distribuido.trim().length < 3)
  ) {
    throw new Error('Motivo é obrigatório ao registrar refeição com status "não distribuído".')
  }

  const payload = {
    ...params,
    data_hora_registro_utc: new Date().toISOString(),
    autor_id: pb.authStore.model?.id || '',
    autor_nome: pb.authStore.model?.name || pb.authStore.model?.email || 'Operador SND',
    autor_perfil: pb.authStore.model?.cargo || pb.authStore.model?.role || 'operador',
  }

  try {
    const record = await pb.collection('snd_distribuicoes_refeicoes').create(payload)

    await registrarAuditoria({
      acao: 'registrar_distribuicao_refeicao',
      modulo: 'snd',
      detalhes: `Distribuição de refeição [${params.refeicao_codigo}] para paciente ${params.paciente_ref} - Status: ${params.status_operacional}`,
      registro_id: record.id,
    })

    return record as unknown as DistribuicaoRefeicaoSND
  } catch (err: unknown) {
    const errorMsg = String(err)
    if (errorMsg.includes('IDEMPOTENT_HIT:') && params.idempotency_key) {
      const hit = await pb
        .collection('snd_distribuicoes_refeicoes')
        .getFirstListItem(`idempotency_key = "${params.idempotency_key}"`)
      return hit as unknown as DistribuicaoRefeicaoSND
    }
    throw err
  }
}

/**
 * 5. Mapa Operacional Sanitizado da Cozinha (LGPD e Sigilo Clínico)
 * Consulta endpoint seguro que remove estritamente CID, prontuário detalhado e justificativa clínica.
 */
export async function obterMapaCozinhaSanitizado(
  dataOperacional?: string,
  setorId?: string,
): Promise<ItemMapaCozinhaSanitizado[]> {
  const queryParams = new URLSearchParams()
  if (dataOperacional) queryParams.set('data_operacional', dataOperacional)
  if (setorId) queryParams.set('setor_ref', setorId)

  const url = `/backend/v1/snd/mapa-cozinha?${queryParams.toString()}`
  const response = await pb.send<{ sucesso: boolean; itens: ItemMapaCozinhaSanitizado[] }>(url, {
    method: 'GET',
  })

  return response.itens || []
}

/**
 * 6. Suspensão de Prescrição Dietética
 * Imutabilidade: Atualiza o status da prescrição para 'suspensa' ou cria evento de encerramento
 * com motivo auditável, data/hora da suspensão e autoria.
 */
export async function suspenderPrescricaoDietetica(
  params: SuspenderPrescricaoParams,
): Promise<PrescricaoDieteticaSND> {
  if (!params.motivo || params.motivo.trim().length < 3) {
    throw new Error('Motivo da suspensão é obrigatório (mínimo de 3 caracteres).')
  }

  const agoraUtc = new Date().toISOString()
  const autorNome =
    pb.authStore.model?.name || pb.authStore.model?.email || 'Profissional Autorizado'

  // Prescrição anterior é mantida integralmente, atualizando apenas o encerramento do seu ciclo de vida
  const prescricao = await pb
    .collection('snd_prescricoes_dieteticas')
    .update(params.prescricao_id, {
      status: 'suspensa',
      vigencia_fim: agoraUtc,
      motivo_alteracao_suspensao: `Suspensa pelo profissional ${autorNome}. Motivo: ${params.motivo.trim()}`,
    })

  await registrarAuditoria({
    acao: 'suspender_prescricao_dietetica',
    modulo: 'snd',
    detalhes: `Prescrição dietética ${params.prescricao_id} suspensa. Motivo: ${params.motivo.trim()}`,
    registro_id: params.prescricao_id,
  })

  return prescricao as unknown as PrescricaoDieteticaSND
}

/**
 * 7. Listagem Paginada de Distribuições de Refeição (Operação de Cozinha e Auditoria)
 */
export async function listarDistribuicoesRefeicoes(
  filtros: ListarDistribuicoesFiltros = {},
): Promise<ResultadoPaginadoDistribuicoes> {
  const page = filtros.page || 1
  const perPage = filtros.perPage || 20
  const filterParts: string[] = []

  if (filtros.data_operacional) {
    filterParts.push(`data_operacional = "${filtros.data_operacional}"`)
  } else {
    if (filtros.data_inicio) {
      filterParts.push(`data_operacional >= "${filtros.data_inicio}"`)
    }
    if (filtros.data_fim) {
      filterParts.push(`data_operacional <= "${filtros.data_fim}"`)
    }
  }

  if (filtros.setor_ref) filterParts.push(`setor_ref = "${filtros.setor_ref}"`)
  if (filtros.leito_ref) filterParts.push(`leito_ref = "${filtros.leito_ref}"`)
  if (filtros.paciente_ref) filterParts.push(`paciente_ref = "${filtros.paciente_ref}"`)
  if (filtros.refeicao_codigo) filterParts.push(`refeicao_codigo = "${filtros.refeicao_codigo}"`)
  if (filtros.status_operacional && filtros.status_operacional !== 'todos') {
    filterParts.push(`status_operacional = "${filtros.status_operacional}"`)
  }

  const result = await pb.collection('snd_distribuicoes_refeicoes').getList(page, perPage, {
    filter: filterParts.join(' && '),
    sort: '-data_operacional,-created',
    expand: 'prescricao_dietetica_ref,paciente_ref,leito_ref,setor_ref',
  })

  return {
    items: result.items as unknown as DistribuicaoRefeicaoSND[],
    page: result.page,
    perPage: result.perPage,
    totalItems: result.totalItems,
    totalPages: result.totalPages,
  }
}

// ============================================================================
// 8. Fichas de Composição Operacional Versionadas (Requisito 7.4.3.5.c.i)
// ============================================================================

export interface SalvarComposicaoParams {
  codigo: string
  refeicao_codigo: string
  dieta_catalogo_ref?: string
  dieta_codigo?: string
  descricao?: string
  itens_composicao: ItemComposicaoReceitaSND[]
  motivo_alteracao?: string
}

/**
 * Cadastra ou versiona uma ficha de composição operacional por refeição e tipo de dieta.
 * Insumo, unidade e quantidade definidos por operador autorizado com validação de fator de conversão.
 */
export async function salvarComposicaoOperacional(
  params: SalvarComposicaoParams,
): Promise<ComposicaoRefeicaoSND> {
  const codigoSanitizado = params.codigo.trim().toLowerCase()
  const refeicaoCodigo = params.refeicao_codigo.trim().toLowerCase()
  const dietaCodigo = params.dieta_codigo?.trim() || ''

  if (!params.itens_composicao || params.itens_composicao.length === 0) {
    throw new Error('A ficha de composição operacional deve conter ao menos um insumo do estoque.')
  }

  // Validação estrita de cada insumo e conversão
  for (const it of params.itens_composicao) {
    if (!it.item_estoque_id) throw new Error('Insumo sem item_estoque_id vinculado.')
    if (it.quantidade_consumo <= 0)
      throw new Error(`Quantidade do insumo ${it.item_nome} deve ser positiva.`)
    if (
      it.unidade_consumo !== it.unidade_estoque &&
      (!it.fator_conversao || it.fator_conversao <= 0)
    ) {
      throw new Error(
        `Fator de conversão explícito obrigatório para insumo ${it.item_nome} (${it.unidade_consumo} -> ${it.unidade_estoque}).`,
      )
    }
  }

  // Busca versões existentes do código
  let versaoNova = 1
  let versaoAnteriorId: string | undefined

  try {
    const existentes = await pb.collection('snd_composicoes_refeicoes').getList(1, 1, {
      filter: `codigo = "${codigoSanitizado}"`,
      sort: '-versao',
    })
    if (existentes.items.length > 0) {
      const ultima = existentes.items[0]
      versaoNova = Number(ultima.versao || 1) + 1
      versaoAnteriorId = ultima.id

      // Inativa versão anterior
      await pb.collection('snd_composicoes_refeicoes').update(ultima.id, {
        ativo: false,
      })
    }
  } catch {
    /* intentionally ignored */
  }

  const autorId = pb.authStore.model?.id || ''
  const autorNome = pb.authStore.model?.name || pb.authStore.model?.email || 'Operador SND'

  const record = await pb.collection('snd_composicoes_refeicoes').create({
    codigo: codigoSanitizado,
    refeicao_codigo: refeicaoCodigo,
    dieta_catalogo_ref: params.dieta_catalogo_ref || null,
    dieta_codigo: dietaCodigo,
    descricao: params.descricao || '',
    versao: versaoNova,
    ativo: true,
    versao_anterior_id: versaoAnteriorId || null,
    motivo_alteracao:
      params.motivo_alteracao ||
      (versaoNova === 1 ? 'Versão inicial homologada' : 'Atualização de ficha'),
    itens_composicao: params.itens_composicao,
    autor_id: autorId,
    autor_nome: autorNome,
  })

  await registrarAuditoria({
    acao: 'salvar_composicao_operacional_snd',
    modulo: 'snd',
    detalhes: `Ficha de composição ${codigoSanitizado} criada/versionada para v${versaoNova} (${refeicaoCodigo} / ${dietaCodigo || 'geral'}).`,
    registro_id: record.id,
  })

  return record as unknown as ComposicaoRefeicaoSND
}

/**
 * Lista fichas de composição operacional cadastradas
 */
export async function listarComposicoesOperacionais(
  refeicaoCodigo?: string,
  dietaCodigo?: string,
): Promise<ComposicaoRefeicaoSND[]> {
  const filterParts: string[] = ['ativo = true']
  if (refeicaoCodigo) filterParts.push(`refeicao_codigo = "${refeicaoCodigo}"`)
  if (dietaCodigo)
    filterParts.push(
      `(dieta_codigo = "${dietaCodigo}" || dieta_codigo = "" || dieta_codigo = "todas")`,
    )

  const records = await pb.collection('snd_composicoes_refeicoes').getFullList({
    filter: filterParts.join(' && '),
    sort: '-versao',
  })

  return records as unknown as ComposicaoRefeicaoSND[]
}

// ============================================================================
// 9. Prévia de Insumos e Validação de Estoque antes da Confirmação
// ============================================================================

/**
 * Obtém prévia calculada no cliente com validação de estoque, lote, validade e conversões.
 * Permite ao operador inspecionar o impacto antes de confirmar a distribuição.
 */
export async function obterPreviaInsumosDistribuicao(
  refeicaoCodigo: string,
  dietaCodigo: string,
): Promise<PreviaInsumosBaixaSND> {
  const composicoes = await listarComposicoesOperacionais(refeicaoCodigo, dietaCodigo)

  if (!composicoes || composicoes.length === 0) {
    return {
      refeicao_codigo: refeicaoCodigo,
      dieta_codigo: dietaCodigo,
      composicao_encontrada: false,
      pode_baixar: false,
      motivos_bloqueio: [
        `Ficha de composição não encontrada para refeição "${refeicaoCodigo}" e dieta "${dietaCodigo}".`,
      ],
      itens: [],
    }
  }

  const composicao = composicoes[0]
  const motivosBloqueio: string[] = []
  const itensResultado: PreviaInsumosBaixaSND['itens'] = []
  const agora = new Date()

  for (const it of composicao.itens_composicao) {
    let itemEstoque: any = null
    try {
      itemEstoque = await pb.collection('farmacia_itens').getOne(it.item_estoque_id)
    } catch (_) {
      motivosBloqueio.push(
        `Insumo "${it.item_nome}" (ID ${it.item_estoque_id}) não encontrado no estoque.`,
      )
      continue
    }

    const saldo = Number(itemEstoque.estoque_atual) || 0
    const fator = it.fator_conversao || 1.0
    const qtdBaixa = Number((it.quantidade_consumo * fator).toFixed(4))
    const validadeStr = itemEstoque.validade || ''

    let vencido = false
    if (validadeStr) {
      const dVal = new Date(validadeStr)
      if (!isNaN(dVal.getTime()) && dVal.getTime() < agora.getTime()) {
        vencido = true
        motivosBloqueio.push(
          `Insumo "${itemEstoque.nome}" vencido em ${validadeStr}. Proibido consumo humano.`,
        )
      }
    }

    const saldoSuficiente = saldo >= qtdBaixa
    if (!saldoSuficiente) {
      motivosBloqueio.push(
        `Estoque insuficiente para "${itemEstoque.nome}". Disponível: ${saldo} ${itemEstoque.unidade_medida}, necessário: ${qtdBaixa} ${itemEstoque.unidade_medida}.`,
      )
    }

    itensResultado.push({
      item_id: it.item_estoque_id,
      item_nome: itemEstoque.nome,
      unidade_consumo: it.unidade_consumo,
      quantidade_consumo: it.quantidade_consumo,
      unidade_estoque: itemEstoque.unidade_medida,
      fator_conversao: fator,
      quantidade_necessaria: qtdBaixa,
      saldo_disponivel: saldo,
      saldo_suficiente: saldoSuficiente,
      lote: itemEstoque.lote,
      validade: validadeStr,
      vencido,
    })
  }

  return {
    refeicao_codigo: refeicaoCodigo,
    dieta_codigo: dietaCodigo,
    composicao_encontrada: true,
    composicao_codigo: composicao.codigo,
    composicao_versao: composicao.versao,
    pode_baixar: motivosBloqueio.length === 0,
    motivos_bloqueio: motivosBloqueio.length > 0 ? motivosBloqueio : undefined,
    itens: itensResultado,
  }
}

// ============================================================================
// 10. Confirmação Transacional de Distribuição com Baixa Integrada (Servidor)
// ============================================================================

/**
 * Confirma distribuição e efetua a baixa atômica de insumos no estoque pelo servidor.
 * - Idempotência com chave persistente e detecção de conflito 409
 * - Reenvio após timeout retorna resultado persistido sem nova baixa
 * - Rollback completo em caso de falha
 */
export async function confirmarDistribuicaoComBaixa(
  params: ConfirmarDistribuicaoComBaixaParams,
): Promise<RespostaConfirmarDistribuicaoComBaixa> {
  const url = '/backend/v1/snd/distribuicao/confirmar-com-baixa'
  const response = await pb.send<RespostaConfirmarDistribuicaoComBaixa>(url, {
    method: 'POST',
    body: JSON.stringify(params),
  })

  return response
}

// ============================================================================
// 11. Estorno Compensatório de Baixa (Servidor)
// ============================================================================

/**
 * Registra estorno compensatório explícito de baixa de estoque.
 * Devolve o saldo, audita motivo/autor e bloqueia duplo estorno sem exclusão física.
 */
export async function estornarBaixaSND(
  params: EstornarBaixaSNDParams,
): Promise<RespostaEstornoBaixaSND> {
  const url = '/backend/v1/snd/baixa/estornar'
  const response = await pb.send<RespostaEstornoBaixaSND>(url, {
    method: 'POST',
    body: JSON.stringify(params),
  })

  return response
}

// ============================================================================
// 12. Consulta de Consumo e Baixas de Insumos por Período / Refeição / Ponto
// ============================================================================

export interface FiltrosConsultaConsumoSND {
  data_inicio?: string
  data_fim?: string
  refeicao_codigo?: string
  ponto_estoque?: string
  estornado?: boolean
  page?: number
  perPage?: number
}

export interface ResultadoConsultaConsumoSND {
  items: BaixaEstoqueDistribuicaoSND[]
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

/**
 * Consulta histórico auditável de baixas de estoque do SND
 */
export async function consultarConsumoInsumosSND(
  filtros: FiltrosConsultaConsumoSND = {},
): Promise<ResultadoConsultaConsumoSND> {
  const page = filtros.page || 1
  const perPage = filtros.perPage || 20
  const filterParts: string[] = []

  if (filtros.data_inicio) filterParts.push(`data_hora_baixa_utc >= "${filtros.data_inicio}"`)
  if (filtros.data_fim) filterParts.push(`data_hora_baixa_utc <= "${filtros.data_fim}"`)
  if (filtros.ponto_estoque) filterParts.push(`ponto_estoque ~ "${filtros.ponto_estoque}"`)
  if (typeof filtros.estornado === 'boolean') filterParts.push(`estornado = ${filtros.estornado}`)

  const result = await pb.collection('snd_baixas_estoque_distribuicoes').getList(page, perPage, {
    filter: filterParts.join(' && '),
    sort: '-data_hora_baixa_utc,-created',
    expand: 'distribuicao_ref,setor_ref',
  })

  return {
    items: result.items as unknown as BaixaEstoqueDistribuicaoSND[],
    page: result.page,
    perPage: result.perPage,
    totalItems: result.totalItems,
    totalPages: result.totalPages,
  }
}
