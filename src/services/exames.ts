import pb from '@/lib/pocketbase/client'
import { ExameItem, StatusExame, PrioridadeExame, CategoriaExame } from '@/types/hospital'
import { registrarAuditoria } from './auditoria'

export interface CriarExameParams {
  paciente: string
  internacao?: string
  atendimento_pa?: string
  setor?: string
  tipo_exame: string
  categoria?: CategoriaExame
  prioridade: PrioridadeExame
  justificativa?: string
  solicitante?: string
  solicitante_nome: string
}

export interface ListarExamesFiltros {
  pacienteId?: string
  internacaoId?: string
  atendimentoPaId?: string
  status?: StatusExame | 'todos'
  setorId?: string
  busca?: string
}

/**
 * Listar exames cadastrados com suporte a filtros e ordenação por data de solicitação mais recente
 */
export async function listarExames(filtros?: ListarExamesFiltros): Promise<ExameItem[]> {
  try {
    const filterClauses: string[] = []

    if (filtros?.pacienteId) {
      filterClauses.push(`paciente = "${filtros.pacienteId}"`)
    }
    if (filtros?.internacaoId) {
      filterClauses.push(`internacao = "${filtros.internacaoId}"`)
    }
    if (filtros?.atendimentoPaId) {
      filterClauses.push(`atendimento_pa = "${filtros.atendimentoPaId}"`)
    }
    if (filtros?.status && filtros.status !== 'todos') {
      filterClauses.push(`status = "${filtros.status}"`)
    }
    if (filtros?.setorId && filtros.setorId !== 'todos') {
      filterClauses.push(`setor = "${filtros.setorId}"`)
    }
    if (filtros?.busca?.trim()) {
      filterClauses.push(`tipo_exame ~ "${filtros.busca.trim()}"`)
    }

    const filter = filterClauses.length > 0 ? filterClauses.join(' && ') : ''

    const records = await pb.collection('exames').getFullList<ExameItem>({
      filter,
      sort: '-data_solicitacao',
      expand: 'paciente,internacao,atendimento_pa,setor,solicitante,responsavel_laudo',
    })

    return records
  } catch (err) {
    console.error('Erro ao listar exames:', err)
    return []
  }
}

/**
 * Solicitação de novo exame pelo profissional (no PA ou na Internação)
 */
export async function solicitarExame(params: CriarExameParams): Promise<ExameItem> {
  const agora = new Date()
  const data_solicitacao = agora.toISOString().slice(0, 10) + ' ' + agora.toTimeString().slice(0, 5)

  const novo = await pb.collection('exames').create<ExameItem>({
    paciente: params.paciente,
    internacao: params.internacao || null,
    atendimento_pa: params.atendimento_pa || null,
    setor: params.setor || null,
    tipo_exame: params.tipo_exame.trim(),
    categoria: params.categoria || 'laboratorial',
    prioridade: params.prioridade,
    justificativa: params.justificativa?.trim() || '',
    data_solicitacao,
    solicitante: params.solicitante || null,
    solicitante_nome: params.solicitante_nome,
    status: 'solicitado',
  })

  await registrarAuditoria({
    acao: 'Solicitação de Exame',
    modulo: 'Exames & Laudos',
    detalhes: `Exame "${params.tipo_exame}" solicitado (${params.prioridade.toUpperCase()}) para paciente ID ${params.paciente}. Solicitante: ${params.solicitante_nome}`,
    registro_id: novo.id,
  })

  return novo
}

/**
 * Avançar etapa do exame: registrar coleta de material (acessível inclusive por recepção/enfermagem)
 */
export async function registrarColetaExame(params: {
  exameId: string
  responsavel_coleta_nome: string
  observacoes_coleta?: string
}): Promise<ExameItem> {
  const agora = new Date()
  const data_coleta = agora.toISOString().slice(0, 10) + ' ' + agora.toTimeString().slice(0, 5)

  const atualizado = await pb.collection('exames').update<ExameItem>(params.exameId, {
    status: 'coletado',
    data_coleta,
    responsavel_coleta_nome: params.responsavel_coleta_nome,
    observacoes_coleta: params.observacoes_coleta || '',
  })

  await registrarAuditoria({
    acao: 'Coleta de Exame Registrada',
    modulo: 'Exames & Laudos',
    detalhes: `Exame ID ${params.exameId} marcado como coletado por ${params.responsavel_coleta_nome}`,
    registro_id: params.exameId,
  })

  return atualizado
}

/**
 * Iniciar análise laboratorial ou radiológica do exame
 */
export async function iniciarAnaliseExame(params: {
  exameId: string
  responsavel_analise_nome: string
}): Promise<ExameItem> {
  const agora = new Date()
  const data_inicio_analise =
    agora.toISOString().slice(0, 10) + ' ' + agora.toTimeString().slice(0, 5)

  const atualizado = await pb.collection('exames').update<ExameItem>(params.exameId, {
    status: 'em_analise',
    data_inicio_analise,
    responsavel_analise_nome: params.responsavel_analise_nome,
  })

  await registrarAuditoria({
    acao: 'Análise de Exame Iniciada',
    modulo: 'Exames & Laudos',
    detalhes: `Exame ID ${params.exameId} colocado em análise por ${params.responsavel_analise_nome}`,
    registro_id: params.exameId,
  })

  return atualizado
}

/**
 * Liberar laudo/resultado do exame (redigido por profissional médico/biomédico/assistencial)
 */
export async function emitirLaudoExame(params: {
  exameId: string
  responsavel_laudo?: string
  responsavel_laudo_nome: string
  resultado_sumario: string
  laudo_texto: string
}): Promise<ExameItem> {
  const agora = new Date()
  const data_laudo = agora.toISOString().slice(0, 10) + ' ' + agora.toTimeString().slice(0, 5)

  const atualizado = await pb.collection('exames').update<ExameItem>(params.exameId, {
    status: 'liberado',
    data_laudo,
    responsavel_laudo: params.responsavel_laudo || null,
    responsavel_laudo_nome: params.responsavel_laudo_nome,
    resultado_sumario: params.resultado_sumario.trim(),
    laudo_texto: params.laudo_texto.trim(),
  })

  await registrarAuditoria({
    acao: 'Laudo de Exame Emitido / Liberado',
    modulo: 'Exames & Laudos',
    detalhes: `Exame ID ${params.exameId} liberado com resultado "${params.resultado_sumario}". Responsável: ${params.responsavel_laudo_nome}`,
    registro_id: params.exameId,
  })

  return atualizado
}

/**
 * Cancelar exame com justificativa formal
 */
export async function cancelarExame(params: {
  exameId: string
  motivo_cancelamento: string
  usuario_nome: string
}): Promise<ExameItem> {
  const atualizado = await pb.collection('exames').update<ExameItem>(params.exameId, {
    status: 'cancelado',
    motivo_cancelamento: params.motivo_cancelamento.trim(),
  })

  await registrarAuditoria({
    acao: 'Cancelamento de Exame',
    modulo: 'Exames & Laudos',
    detalhes: `Exame ID ${params.exameId} cancelado por ${params.usuario_nome}. Motivo: ${params.motivo_cancelamento}`,
    registro_id: params.exameId,
  })

  return atualizado
}
