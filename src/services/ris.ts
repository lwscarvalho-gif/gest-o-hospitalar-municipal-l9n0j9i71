import pb from '@/lib/pocketbase/client'
import {
  ItemFilaRIS,
  FiltrosFilaRIS,
  RespostaFilaRIS,
  RequisicaoImagemPepParams,
  TransitarStatusRISParams,
  AgendarExameRISParams,
  ComprovanteAgendamentoRISSnapshot,
  ReagendarExameRISParams,
  RegistrarExameExternoRISParams,
  RisModeloLaudo,
  CriarModeloLaudoRISParams,
  RisAgenda,
  RisHistoricoTransicao,
} from '@/types/hospital'
import { registrarAuditoria } from './auditoria'

/**
 * Serviço de Integração do Módulo RIS (Radiologia e Diagnóstico por Imagem)
 * Conforme Seção 7.4.3.4.a.i-iv e c.ii e itens 313-316 do ANEXO I.
 */

export interface RespostaRequisicaoPepRIS {
  sucesso: boolean
  idempotente?: boolean
  mensagem: string
  exame_id: string
  modalidade_ris: string
  status_ris: string
  tipo_execucao: string
}

/**
 * 1. Emissão de Requisição de Exame de Imagem a partir do PEP
 * Validação de paciente/internação/PA no servidor e idempotência estrita
 */
export async function solicitarExameImagemPep(
  params: RequisicaoImagemPepParams,
): Promise<RespostaRequisicaoPepRIS> {
  const idempotencyKey =
    params.idempotency_key ||
    `ris-req-${params.paciente_id}-${params.tipo_exame.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`

  const payload = {
    ...params,
    idempotency_key: idempotencyKey,
  }

  const res = (await pb.send('/backend/v1/ris/requisicao-pep', {
    method: 'POST',
    body: payload,
  })) as RespostaRequisicaoPepRIS

  try {
    await registrarAuditoria({
      acao: 'SOLICITACAO_IMAGEM_PEP_RIS',
      modulo: 'ris',
      registro_id: res.exame_id,
      detalhes: JSON.stringify({
        tipo_exame: params.tipo_exame,
        modalidade: res.modalidade_ris,
        paciente_id: params.paciente_id,
        idempotency_key: idempotencyKey,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

/**
 * 2. Consulta da Fila RIS paginada com isolamento clínico para recepção
 */
export async function listarFilaRIS(filtros: FiltrosFilaRIS = {}): Promise<RespostaFilaRIS> {
  const queryParams = new URLSearchParams()
  if (filtros.status) queryParams.set('status', filtros.status)
  if (filtros.modalidade) queryParams.set('modalidade', filtros.modalidade)
  if (filtros.setor) queryParams.set('setor', filtros.setor)
  if (filtros.tipo_execucao) queryParams.set('tipo_execucao', filtros.tipo_execucao)
  if (filtros.busca) queryParams.set('busca', filtros.busca)
  if (filtros.paciente) queryParams.set('paciente', filtros.paciente)
  if (filtros.page) queryParams.set('page', String(filtros.page))
  if (filtros.perPage) queryParams.set('perPage', String(filtros.perPage))

  const queryString = queryParams.toString()
  const path = `/backend/v1/ris/fila${queryString ? `?${queryString}` : ''}`

  const res = await pb.send(path, {
    method: 'GET',
  })

  return res as RespostaFilaRIS
}

/**
 * 3. Transição humana autorizada e auditada de status na fila RIS
 * Proibida liberação clínica automática; motivo obrigatório para cancelamento
 */
export async function transitarStatusRIS(
  exameId: string,
  params: TransitarStatusRISParams,
): Promise<{
  sucesso: boolean
  mensagem: string
  exame_id: string
  status_anterior: string
  status_novo: string
  data_hora: string
}> {
  const res = (await pb.send(`/backend/v1/ris/exames/${encodeURIComponent(exameId)}/transicao`, {
    method: 'POST',
    body: params,
  })) as {
    sucesso: boolean
    mensagem: string
    exame_id: string
    status_anterior: string
    status_novo: string
    data_hora: string
  }

  try {
    await registrarAuditoria({
      acao: 'TRANSICAO_STATUS_RIS',
      modulo: 'ris',
      registro_id: exameId,
      detalhes: JSON.stringify({
        status_anterior: res.status_anterior,
        status_novo: res.status_novo,
        motivo: params.motivo_justificativa,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

/**
 * 4. Agendamento com validação de conflito de agenda no servidor e comprovante seguro
 */
export async function agendarExameRIS(params: AgendarExameRISParams): Promise<{
  sucesso: boolean
  mensagem: string
  agenda_id: string
  idempotente?: boolean
  comprovante: ComprovanteAgendamentoRISSnapshot
}> {
  const idempotencyKey =
    params.idempotency_key ||
    `ris-ag-${params.exame_id}-${params.sala_equipamento.toLowerCase().replace(/\s+/g, '-')}-${params.data_hora_inicio}`

  const payload = {
    ...params,
    idempotency_key: idempotencyKey,
  }

  const res = (await pb.send('/backend/v1/ris/agendar', {
    method: 'POST',
    body: payload,
  })) as {
    sucesso: boolean
    mensagem: string
    agenda_id: string
    idempotente?: boolean
    comprovante: ComprovanteAgendamentoRISSnapshot
  }

  try {
    await registrarAuditoria({
      acao: 'AGENDAMENTO_RIS',
      modulo: 'ris',
      registro_id: res.agenda_id,
      detalhes: JSON.stringify({
        exame_id: params.exame_id,
        sala_equipamento: params.sala_equipamento,
        data_hora_inicio: params.data_hora_inicio,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

/**
 * 5. Reagendamento sem apagar histórico (inativa anterior e cria nova agenda)
 */
export async function reagendarExameRIS(
  agendaId: string,
  params: ReagendarExameRISParams,
): Promise<{
  sucesso: boolean
  mensagem: string
  agenda_anterior_id: string
  nova_agenda_id: string
  comprovante: ComprovanteAgendamentoRISSnapshot
}> {
  const res = (await pb.send(`/backend/v1/ris/agendas/${encodeURIComponent(agendaId)}/reagendar`, {
    method: 'POST',
    body: params,
  })) as {
    sucesso: boolean
    mensagem: string
    agenda_anterior_id: string
    nova_agenda_id: string
    comprovante: ComprovanteAgendamentoRISSnapshot
  }

  try {
    await registrarAuditoria({
      acao: 'REAGENDAMENTO_RIS',
      modulo: 'ris',
      registro_id: res.nova_agenda_id,
      detalhes: JSON.stringify({
        agenda_anterior_id: agendaId,
        nova_data_inicio: params.nova_data_hora_inicio,
        motivo: params.motivo,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

/**
 * 6. Cancelamento de agendamento preservando histórico
 */
export async function cancelarAgendamentoRIS(
  agendaId: string,
  motivo: string,
): Promise<{
  sucesso: boolean
  mensagem: string
  agenda_id: string
  status: string
}> {
  const res = (await pb.send(`/backend/v1/ris/agendas/${encodeURIComponent(agendaId)}/cancelar`, {
    method: 'POST',
    body: { motivo },
  })) as {
    sucesso: boolean
    mensagem: string
    agenda_id: string
    status: string
  }

  try {
    await registrarAuditoria({
      acao: 'CANCELAMENTO_AGENDAMENTO_RIS',
      modulo: 'ris',
      registro_id: agendaId,
      detalhes: JSON.stringify({ motivo }),
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

/**
 * 7. Registro de exame externo: identifica prestador/origem sem falsear execução interna
 */
export async function registrarExameExternoRIS(
  exameId: string,
  params: RegistrarExameExternoRISParams,
): Promise<{
  sucesso: boolean
  mensagem: string
  exame_id: string
  tipo_execucao: string
  prestador_externo_nome: string
  status_ris: string
}> {
  const res = (await pb.send(
    `/backend/v1/ris/exames/${encodeURIComponent(exameId)}/registrar-externo`,
    {
      method: 'POST',
      body: params,
    },
  )) as {
    sucesso: boolean
    mensagem: string
    exame_id: string
    tipo_execucao: string
    prestador_externo_nome: string
    status_ris: string
  }

  try {
    await registrarAuditoria({
      acao: 'REGISTRO_EXAME_EXTERNO_RIS',
      modulo: 'ris',
      registro_id: exameId,
      detalhes: JSON.stringify({
        prestador: params.prestador_externo_nome,
        cnes: params.prestador_externo_cnes,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

/**
 * 8. Modelos de Laudo Versionados e Inativáveis
 */
export async function salvarModeloLaudoRIS(params: CriarModeloLaudoRISParams): Promise<{
  sucesso: boolean
  mensagem: string
  modelo_id: string
  versao: number
}> {
  const res = (await pb.send('/backend/v1/ris/modelos', {
    method: 'POST',
    body: params,
  })) as {
    sucesso: boolean
    mensagem: string
    modelo_id: string
    versao: number
  }

  try {
    await registrarAuditoria({
      acao: 'SALVAR_MODELO_LAUDO_RIS',
      modulo: 'ris',
      registro_id: res.modelo_id,
      detalhes: JSON.stringify({
        titulo: params.titulo,
        versao: res.versao,
        modalidade: params.modalidade,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

export async function inativarModeloLaudoRIS(modeloId: string): Promise<{
  sucesso: boolean
  mensagem: string
  modelo_id: string
  ativo: boolean
}> {
  const res = (await pb.send(`/backend/v1/ris/modelos/${encodeURIComponent(modeloId)}/inativar`, {
    method: 'POST',
  })) as {
    sucesso: boolean
    mensagem: string
    modelo_id: string
    ativo: boolean
  }

  try {
    await registrarAuditoria({
      acao: 'INATIVAR_MODELO_LAUDO_RIS',
      modulo: 'ris',
      registro_id: modeloId,
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

export async function listarModelosLaudoRIS(
  modalidade?: string,
  apenasAtivos = true,
): Promise<RisModeloLaudo[]> {
  const filters: string[] = []
  if (apenasAtivos) {
    filters.push('ativo = true')
  }
  if (modalidade && modalidade !== 'todos') {
    filters.push(`modalidade = "${modalidade}"`)
  }

  const records = await pb.collection('ris_modelos_laudo').getFullList<RisModeloLaudo>({
    filter: filters.length ? filters.join(' && ') : undefined,
    sort: '-created',
  })

  return records
}

/**
 * 9. Aplicação de Modelo: Gera APENAS RASCUNHO para revisão humana
 * Bloqueado no servidor caso o laudo já tenha sido liberado
 */
export async function aplicarModeloLaudoComoRascunho(
  exameId: string,
  modeloId: string,
): Promise<{
  sucesso: boolean
  mensagem: string
  exame_id: string
  modelo_id: string
  modelo_titulo: string
  modelo_versao: number
  rascunho_gerado: string
}> {
  const res = (await pb.send(
    `/backend/v1/ris/exames/${encodeURIComponent(exameId)}/aplicar-modelo`,
    {
      method: 'POST',
      body: { modelo_id: modeloId },
    },
  )) as {
    sucesso: boolean
    mensagem: string
    exame_id: string
    modelo_id: string
    modelo_titulo: string
    modelo_versao: number
    rascunho_gerado: string
  }

  try {
    await registrarAuditoria({
      acao: 'APLICAR_MODELO_RASCUNHO_RIS',
      modulo: 'ris',
      registro_id: exameId,
      detalhes: JSON.stringify({
        modelo_id: modeloId,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

/**
 * 10. Consulta de Histórico de Transições da Fila RIS (Trilha Auditável)
 */
export async function listarHistoricoTransicoesRIS(
  exameId: string,
): Promise<RisHistoricoTransicao[]> {
  const records = await pb
    .collection('ris_historico_transicoes')
    .getFullList<RisHistoricoTransicao>({
      filter: `exame = "${exameId}"`,
      sort: '-created',
    })

  return records
}

/**
 * 11. Consulta de Agendas vinculadas a um exame
 */
export async function listarAgendasDoExameRIS(exameId: string): Promise<RisAgenda[]> {
  const records = await pb.collection('ris_agendas').getFullList<RisAgenda>({
    filter: `exame = "${exameId}"`,
    sort: '-created',
  })

  return records
}
