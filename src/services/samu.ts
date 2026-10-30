import pb from '@/lib/pocketbase/client'
import {
  SamuOcorrencia,
  AbrirOcorrenciaSAMUParams,
  ClassificarRiscoSAMUParams,
  AtribuirUnidadeMovelSAMUParams,
  TransitarStatusSAMUParams,
  VincularPacienteSAMUParams,
  FiltrosListagemSAMU,
  RespostaListagemSAMU,
} from '@/types/hospital'
import { registrarAuditoria } from './auditoria'

/**
 * Serviço de Integração do Módulo SAMU BÁSICO (Parte 1: Backend/Serviço)
 * Conforme Itens 407 a 417 do ANEXO I e Seção 7.4.5.1.e.i
 *
 * Invariantes:
 * - Autoria e timestamps derivados do servidor
 * - Vítima desconhecida não exige CPF/CNS nem cadastro prévio
 * - Vínculo posterior confirmado por humano preserva dados originalmente informados
 * - Classificação de risco exclusiva de profissional de saúde autorizado
 * - Idempotência com detecção de conflito (409)
 * - Padrão seqRef para descarte de respostas obsoletas em trocas de sessão/tela
 */

export class RespostaSessaoObsoletaError extends Error {
  constructor(mensagem = 'Resposta assíncrona descartada por transição de sessão.') {
    super(mensagem)
    this.name = 'RespostaSessaoObsoletaError'
  }
}

export class IdempotenciaConflitoPayloadError extends Error {
  codigo: string
  registroExistenteId?: string

  constructor(message: string, registroExistenteId?: string) {
    super(message)
    this.name = 'IdempotenciaConflitoPayloadError'
    this.codigo = 'IDEMPOTENCY_PAYLOAD_CONFLICT'
    this.registroExistenteId = registroExistenteId
  }
}

export class ConflitoUnidadeMovelOcupadaError extends Error {
  codigo: string

  constructor(message: string) {
    super(message)
    this.name = 'ConflitoUnidadeMovelOcupadaError'
    this.codigo = 'UNIDADE_MOVEL_OCUPADA'
  }
}

export interface OpcoesRequisicaoSAMU {
  seqMomento?: number
  seqReferencia?: { current: number }
  session_token?: string
}

function verificarDescarteSessao(opcoes?: OpcoesRequisicaoSAMU) {
  if (
    opcoes &&
    opcoes.seqMomento !== undefined &&
    opcoes.seqReferencia !== undefined &&
    opcoes.seqMomento !== opcoes.seqReferencia.current
  ) {
    throw new RespostaSessaoObsoletaError()
  }
}

/**
 * 1. Abrir Ocorrência SAMU (Item 407–410)
 * Aceita vítima desconhecida sem CPF/CNS, grava endereço textual e relação com solicitante
 */
export async function abrirOcorrenciaSAMU(
  params: AbrirOcorrenciaSAMUParams,
  opcoes?: OpcoesRequisicaoSAMU,
): Promise<{
  sucesso: boolean
  idempotente?: boolean
  mensagem: string
  ocorrencia_id: string
  numero_ocorrencia: string
  status_fluxo: string
  data_hora_abertura?: string
}> {
  const token = opcoes?.session_token || pb.authStore.token
  const baseUrl = (import.meta.env.VITE_POCKETBASE_URL || '').replace(/\/$/, '')
  const url = `${baseUrl}/backend/v1/samu/ocorrencias/abrir`

  const idempotencyKey =
    params.idempotency_key ||
    `samu-oco-${params.tipo_ocorrencia}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...params,
      idempotency_key: idempotencyKey,
    }),
  })

  verificarDescarteSessao(opcoes)

  const data = await response.json()

  if (!response.ok) {
    if (response.status === 409) {
      throw new IdempotenciaConflitoPayloadError(
        data.erro || 'Conflito de chave de idempotência com dados divergentes.',
        data.registro_existente_id,
      )
    }
    throw new Error(data.erro || 'Falha ao abrir ocorrência SAMU.')
  }

  try {
    await registrarAuditoria({
      acao: 'ABRIR_OCORRENCIA_SAMU',
      modulo: 'samu',
      registro_id: data.ocorrencia_id,
      detalhes: JSON.stringify({
        numero_ocorrencia: data.numero_ocorrencia,
        tipo_ocorrencia: params.tipo_ocorrencia,
        municipio: params.municipio,
        idempotency_key: idempotencyKey,
        idempotente: data.idempotente || false,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return data
}

/**
 * 2. Classificar Risco da Vítima (Item 411)
 * Ato assistencial SOMENTE por profissional de saúde autorizado; sem algoritmo automático
 */
export async function classificarRiscoSAMU(
  ocorrenciaId: string,
  params: ClassificarRiscoSAMUParams,
  opcoes?: OpcoesRequisicaoSAMU,
): Promise<{
  sucesso: boolean
  mensagem: string
  ocorrencia_id: string
  classificacao_risco: string
  classificado_por: string
  data_hora: string
}> {
  const token = opcoes?.session_token || pb.authStore.token
  const baseUrl = (import.meta.env.VITE_POCKETBASE_URL || '').replace(/\/$/, '')
  const url = `${baseUrl}/backend/v1/samu/ocorrencias/${encodeURIComponent(ocorrenciaId)}/classificar-risco`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  })

  verificarDescarteSessao(opcoes)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.erro || 'Falha ao classificar risco da ocorrência SAMU.')
  }

  try {
    await registrarAuditoria({
      acao: 'CLASSIFICAR_RISCO_SAMU',
      modulo: 'samu',
      registro_id: ocorrenciaId,
      detalhes: JSON.stringify({
        classificacao_risco: params.classificacao_risco,
        justificativa: params.justificativa,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return data
}

/**
 * 3. Atribuir Unidade Móvel e Destino (Item 412 e 413)
 * Validação de status do veículo no cadastro de transporte e conflito de ocupação
 */
export async function atribuirUnidadeMovelSAMU(
  ocorrenciaId: string,
  params: AtribuirUnidadeMovelSAMUParams,
  opcoes?: OpcoesRequisicaoSAMU,
): Promise<{
  sucesso: boolean
  mensagem: string
  ocorrencia_id: string
  unidade_movel_id: string
  unidade_movel_placa: string
  status_fluxo: string
  data_hora: string
}> {
  const token = opcoes?.session_token || pb.authStore.token
  const baseUrl = (import.meta.env.VITE_POCKETBASE_URL || '').replace(/\/$/, '')
  const url = `${baseUrl}/backend/v1/samu/ocorrencias/${encodeURIComponent(ocorrenciaId)}/atribuir-unidade`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  })

  verificarDescarteSessao(opcoes)

  const data = await response.json()

  if (!response.ok) {
    if (response.status === 409 && data.codigo === 'UNIDADE_MOVEL_OCUPADA') {
      throw new ConflitoUnidadeMovelOcupadaError(data.erro)
    }
    throw new Error(data.erro || 'Falha ao atribuir unidade móvel à ocorrência SAMU.')
  }

  try {
    await registrarAuditoria({
      acao: 'ATRIBUIR_UNIDADE_MOVEL_SAMU',
      modulo: 'samu',
      registro_id: ocorrenciaId,
      detalhes: JSON.stringify({
        unidade_movel_id: params.unidade_movel_id,
        placa: data.unidade_movel_placa,
        unidade_destino: params.unidade_saude_destino_nome || params.unidade_saude_destino_externa,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return data
}

/**
 * 4. Transição de Status Operacional e Cancelamento Auditado
 * Transição de estados no servidor com gravação imutável de histórico; motivo obrigatório em cancelamento
 */
export async function transitarStatusSAMU(
  ocorrenciaId: string,
  params: TransitarStatusSAMUParams,
  opcoes?: OpcoesRequisicaoSAMU,
): Promise<{
  sucesso: boolean
  idempotente?: boolean
  mensagem: string
  ocorrencia_id: string
  status_anterior: string
  status_novo: string
  data_hora: string
}> {
  const token = opcoes?.session_token || pb.authStore.token
  const baseUrl = (import.meta.env.VITE_POCKETBASE_URL || '').replace(/\/$/, '')
  const url = `${baseUrl}/backend/v1/samu/ocorrencias/${encodeURIComponent(ocorrenciaId)}/transicao`

  const idempotencyKey =
    params.idempotency_key ||
    `samu-trans-${ocorrenciaId}-${params.status_novo}-${Date.now().toString(36)}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...params,
      idempotency_key: idempotencyKey,
    }),
  })

  verificarDescarteSessao(opcoes)

  const data = await response.json()

  if (!response.ok) {
    if (response.status === 409) {
      throw new IdempotenciaConflitoPayloadError(
        data.erro || 'Conflito de chave de transição com status divergente.',
      )
    }
    throw new Error(data.erro || 'Falha ao realizar transição de status no SAMU.')
  }

  try {
    await registrarAuditoria({
      acao: 'TRANSICAO_STATUS_SAMU',
      modulo: 'samu',
      registro_id: ocorrenciaId,
      detalhes: JSON.stringify({
        status_anterior: data.status_anterior,
        status_novo: data.status_novo,
        motivo: params.motivo,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return data
}

/**
 * 5. Vínculo Posterior da Vítima a Paciente Cadastrado (Confirmação Humana)
 * Não altera a identidade informada originalmente na abertura; valida paciente existente
 */
export async function vincularPacienteSAMU(
  ocorrenciaId: string,
  params: VincularPacienteSAMUParams,
  opcoes?: OpcoesRequisicaoSAMU,
): Promise<{
  sucesso: boolean
  mensagem: string
  ocorrencia_id: string
  paciente_id: string
  paciente_nome: string
  vitima_nome_informado_original: string
  data_confirmacao: string
}> {
  const token = opcoes?.session_token || pb.authStore.token
  const baseUrl = (import.meta.env.VITE_POCKETBASE_URL || '').replace(/\/$/, '')
  const url = `${baseUrl}/backend/v1/samu/ocorrencias/${encodeURIComponent(ocorrenciaId)}/vincular-paciente`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  })

  verificarDescarteSessao(opcoes)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.erro || 'Falha ao vincular paciente à ocorrência SAMU.')
  }

  try {
    await registrarAuditoria({
      acao: 'VINCULAR_PACIENTE_SAMU',
      modulo: 'samu',
      registro_id: ocorrenciaId,
      detalhes: JSON.stringify({
        paciente_id: params.paciente_id,
        paciente_nome: data.paciente_nome,
        nome_original_preservado: data.vitima_nome_informado_original,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return data
}

/**
 * 6. Listar Ocorrências SAMU com Filtros Operacionais (Itens 414 a 417)
 */
export async function listarOcorrenciasSAMU(
  filtros: FiltrosListagemSAMU = {},
  opcoes?: OpcoesRequisicaoSAMU,
): Promise<RespostaListagemSAMU> {
  const token = opcoes?.session_token || pb.authStore.token
  const baseUrl = (import.meta.env.VITE_POCKETBASE_URL || '').replace(/\/$/, '')

  const queryParams = new URLSearchParams()
  if (filtros.status) queryParams.set('status', filtros.status)
  if (filtros.tipo) queryParams.set('tipo', filtros.tipo)
  if (filtros.municipio) queryParams.set('municipio', filtros.municipio)
  if (filtros.unidade_movel_id) queryParams.set('unidade_movel_id', filtros.unidade_movel_id)
  if (filtros.data_inicio) queryParams.set('data_inicio', filtros.data_inicio)
  if (filtros.data_fim) queryParams.set('data_fim', filtros.data_fim)
  if (filtros.page) queryParams.set('page', String(filtros.page))
  if (filtros.perPage) queryParams.set('perPage', String(filtros.perPage))

  const qs = queryParams.toString()
  const url = `${baseUrl}/backend/v1/samu/ocorrencias${qs ? `?${qs}` : ''}`

  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  verificarDescarteSessao(opcoes)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.erro || 'Falha ao consultar ocorrências SAMU.')
  }

  return data as RespostaListagemSAMU
}

/**
 * 7. Obter Detalhes da Ocorrência SAMU e Trilha Imutável de Histórico
 */
export async function obterOcorrenciaSAMUPorId(
  ocorrenciaId: string,
  opcoes?: OpcoesRequisicaoSAMU,
): Promise<SamuOcorrencia> {
  const token = opcoes?.session_token || pb.authStore.token
  const baseUrl = (import.meta.env.VITE_POCKETBASE_URL || '').replace(/\/$/, '')
  const url = `${baseUrl}/backend/v1/samu/ocorrencias/${encodeURIComponent(ocorrenciaId)}`

  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  verificarDescarteSessao(opcoes)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.erro || 'Falha ao obter detalhes da ocorrência SAMU.')
  }

  return data as SamuOcorrencia
}
