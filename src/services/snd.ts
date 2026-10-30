import pb from '@/lib/pocketbase/client'
import {
  ItemCardapioRefeicao,
  DietaCatalogoSND,
  PrescricaoDieteticaSND,
  DistribuicaoRefeicaoSND,
  ItemMapaCozinhaSanitizado,
  CategoriaDietaSND,
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
