import pb from '@/lib/pocketbase/client'
import {
  ExameItem,
  StatusExame,
  PrioridadeExame,
  CategoriaExame,
  LaudoVersao,
} from '@/types/hospital'
import { registrarAuditoria } from './auditoria'
import { mascararCPF, mascararCNS } from './identificacaoPaciente'

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
  idempotencyKey?: string
}

export interface ListarExamesFiltros {
  pacienteId?: string
  internacaoId?: string
  atendimentoPaId?: string
  status?: StatusExame | 'todos'
  setorId?: string
  busca?: string
  pagina?: number
  porPagina?: number
}

export interface ResultadoPaginadoExames {
  items: ExameItem[]
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

export interface RegistrarColetaParams {
  exameId: string
  responsavel_coleta_nome: string
  observacoes_coleta?: string
  idempotencyKey?: string
}

export interface IniciarAnaliseParams {
  exameId: string
  responsavel_analise_nome: string
  idempotencyKey?: string
}

export interface EmitirLaudoParams {
  exameId: string
  responsavel_laudo?: string
  responsavel_laudo_nome: string
  resultado_sumario: string
  laudo_texto: string
  idempotencyKey?: string
}

export interface RetificarLaudoParams {
  exameId: string
  motivo_retificacao: string
  resultado_sumario: string
  laudo_texto: string
  responsavel_laudo?: string
  responsavel_laudo_nome: string
  responsavel_laudo_cargo?: string
  idempotencyKey?: string
}

export interface CancelarExameParams {
  exameId: string
  motivo_cancelamento: string
  usuario_nome: string
}

/**
 * Utilitário de escape de texto para filtros no PocketBase
 */
function escaparFiltro(texto: string): string {
  return texto.replace(/["\\]/g, '\\$&')
}

/**
 * Sanitiza dados sensíveis do paciente expandido no resultado, evitando exposição
 * desnecessária de identificadores completos nos payloads de listagem e visualização.
 */
export function mascararDadosPacienteExame(exame: ExameItem): ExameItem {
  if (!exame.expand?.paciente) return exame

  const pac = { ...exame.expand.paciente }
  if (pac.cpf) {
    pac.cpf = mascararCPF(pac.cpf)
  }
  if (pac.cartao_sus) {
    pac.cartao_sus = mascararCNS(pac.cartao_sus)
  }
  return {
    ...exame,
    expand: {
      ...exame.expand,
      paciente: pac,
    },
  }
}

/**
 * Listar exames cadastrados com suporte a busca paginada no servidor, filtros
 * e proteção de identificadores de pacientes.
 */
export async function listarExamesPaginado(
  filtros?: ListarExamesFiltros,
): Promise<ResultadoPaginadoExames> {
  try {
    const filterClauses: string[] = []

    if (filtros?.pacienteId) {
      filterClauses.push(`paciente = "${escaparFiltro(filtros.pacienteId)}"`)
    }
    if (filtros?.internacaoId) {
      filterClauses.push(`internacao = "${escaparFiltro(filtros.internacaoId)}"`)
    }
    if (filtros?.atendimentoPaId) {
      filterClauses.push(`atendimento_pa = "${escaparFiltro(filtros.atendimentoPaId)}"`)
    }
    if (filtros?.status && filtros.status !== 'todos') {
      filterClauses.push(`status = "${escaparFiltro(filtros.status)}"`)
    }
    if (filtros?.setorId && filtros.setorId !== 'todos') {
      filterClauses.push(`setor = "${escaparFiltro(filtros.setorId)}"`)
    }
    if (filtros?.busca?.trim()) {
      const q = escaparFiltro(filtros.busca.trim())
      filterClauses.push(`(tipo_exame ~ "${q}" || solicitante_nome ~ "${q}")`)
    }

    const filter = filterClauses.length > 0 ? filterClauses.join(' && ') : ''
    const pagina = Math.max(1, filtros?.pagina || 1)
    const porPagina = Math.min(100, Math.max(5, filtros?.porPagina || 50))

    const result = await pb.collection('exames').getList<ExameItem>(pagina, porPagina, {
      filter,
      sort: '-data_solicitacao,-created',
      expand: 'paciente,internacao,atendimento_pa,setor,solicitante,responsavel_laudo',
    })

    return {
      items: result.items.map(mascararDadosPacienteExame),
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    }
  } catch (err) {
    console.error('Erro ao listar exames paginados:', err)
    return {
      items: [],
      page: 1,
      perPage: 50,
      totalItems: 0,
      totalPages: 0,
    }
  }
}

/**
 * Listar exames cadastrados (compatibilidade retroativa, paginada com teto seguro)
 */
export async function listarExames(filtros?: ListarExamesFiltros): Promise<ExameItem[]> {
  const pag = await listarExamesPaginado({
    ...filtros,
    pagina: 1,
    porPagina: 50,
  })
  return pag.items
}

/**
 * Solicitação de novo exame pelo profissional (no PA, Internação ou Ambulatório).
 * Implementa idempotência segura com chave estável para reenvios e nova para operações distintas.
 */
export async function solicitarExame(params: CriarExameParams): Promise<ExameItem> {
  const chaveIdempotente =
    params.idempotencyKey ||
    `solic_exame_${params.paciente}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  const agora = new Date()
  const data_solicitacao = agora.toISOString().slice(0, 10) + ' ' + agora.toTimeString().slice(0, 5)

  try {
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
      idempotency_key: chaveIdempotente,
    })

    await registrarAuditoria({
      acao: 'Solicitação de Exame',
      modulo: 'Exames & Laudos',
      detalhes: `Exame "${params.tipo_exame}" solicitado (${params.prioridade.toUpperCase()}) para paciente ID ${params.paciente}. Solicitante: ${params.solicitante_nome}`,
      registro_id: novo.id,
    })

    return novo
  } catch (err: any) {
    const msg = String(err?.message || '')

    // Hit idempotente controlado retornado pelo hook do backend
    if (msg.includes('IDEMPOTENT_HIT:')) {
      const match = msg.match(/IDEMPOTENT_HIT:([a-zA-Z0-9_-]+)/)
      const existingId = match ? match[1] : null
      if (existingId) {
        return await pb.collection('exames').getOne<ExameItem>(existingId, {
          expand: 'paciente,internacao,atendimento_pa,setor,solicitante,responsavel_laudo',
        })
      }
    }

    if (msg.includes('IDEMPOTENCY_PAYLOAD_CONFLICT')) {
      throw new Error(
        'CONFLITO_IDEMPOTENCIA: Esta chave já foi processada anteriormente para outro pedido de exame.',
      )
    }

    throw err
  }
}

/**
 * Avançar etapa do exame: registrar coleta de material biológico
 */
export async function registrarColetaExame(params: RegistrarColetaParams): Promise<ExameItem> {
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
export async function iniciarAnaliseExame(params: IniciarAnaliseParams): Promise<ExameItem> {
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
 * Liberar laudo/resultado inicial do exame (redigido por profissional autorizado).
 * Cria o laudo e garante gravação da Versão 1 no histórico imutável.
 */
export async function emitirLaudoExame(params: EmitirLaudoParams): Promise<ExameItem> {
  const chaveIdempotente =
    params.idempotencyKey ||
    `laudo_v1_${params.exameId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  const agora = new Date()
  const data_laudo = agora.toISOString().slice(0, 10) + ' ' + agora.toTimeString().slice(0, 5)

  try {
    const atualizado = await pb.collection('exames').update<ExameItem>(params.exameId, {
      status: 'liberado',
      data_laudo,
      responsavel_laudo: params.responsavel_laudo || null,
      responsavel_laudo_nome: params.responsavel_laudo_nome,
      resultado_sumario: params.resultado_sumario.trim(),
      laudo_texto: params.laudo_texto.trim(),
      idempotency_key: chaveIdempotente,
    })

    await registrarAuditoria({
      acao: 'Laudo de Exame Emitido / Liberado',
      modulo: 'Exames & Laudos',
      detalhes: `Exame ID ${params.exameId} liberado com resultado "${params.resultado_sumario}". Responsável: ${params.responsavel_laudo_nome}`,
      registro_id: params.exameId,
    })

    return atualizado
  } catch (err: any) {
    const msg = String(err?.message || '')
    if (msg.includes('IDEMPOTENT_HIT:')) {
      return await pb.collection('exames').getOne<ExameItem>(params.exameId, {
        expand: 'paciente,internacao,atendimento_pa,setor,solicitante,responsavel_laudo',
      })
    }
    throw err
  }
}

/**
 * Retificar laudo já finalizado: NUNCA sobrescreve nem apaga o registro original.
 * Cria uma nova versão na coleção `laudos_versoes` com motivo, autor e data,
 * mantendo a rastreabilidade completa e atualizando a versão vigente do exame.
 */
export async function retificarLaudoExame(params: RetificarLaudoParams): Promise<LaudoVersao> {
  const chaveIdempotente =
    params.idempotencyKey ||
    `retif_laudo_${params.exameId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  const agora = new Date()
  const data_laudo = agora.toISOString().slice(0, 10) + ' ' + agora.toTimeString().slice(0, 5)

  try {
    const versaoCriada = await pb.collection('laudos_versoes').create<LaudoVersao>({
      exame: params.exameId,
      resultado_sumario: params.resultado_sumario.trim(),
      laudo_texto: params.laudo_texto.trim(),
      motivo_retificacao: params.motivo_retificacao.trim(),
      responsavel_laudo: params.responsavel_laudo || null,
      responsavel_laudo_nome: params.responsavel_laudo_nome,
      responsavel_laudo_cargo: params.responsavel_laudo_cargo || '',
      data_laudo,
      idempotency_key: chaveIdempotente,
    })

    await registrarAuditoria({
      acao: 'Retificação de Laudo',
      modulo: 'Exames & Laudos',
      detalhes: `Nova versão (${versaoCriada.numero_versao}) do laudo do exame ID ${params.exameId}. Motivo: ${params.motivo_retificacao}. Autor: ${params.responsavel_laudo_nome}`,
      registro_id: versaoCriada.id,
    })

    return versaoCriada
  } catch (err: any) {
    const msg = String(err?.message || '')
    if (msg.includes('IDEMPOTENT_HIT:')) {
      const match = msg.match(/IDEMPOTENT_HIT:([a-zA-Z0-9_-]+)/)
      const existingId = match ? match[1] : null
      if (existingId) {
        return await pb.collection('laudos_versoes').getOne<LaudoVersao>(existingId)
      }
    }
    if (msg.includes('IDEMPOTENCY_PAYLOAD_CONFLICT')) {
      throw new Error(
        'CONFLITO_IDEMPOTENCIA: Esta chave já foi usada anteriormente para retificação de outro laudo.',
      )
    }
    throw err
  }
}

/**
 * Listar todas as versões de laudo de um determinado exame (para exibição no SAME e no impresso)
 */
export async function listarVersoesLaudo(exameId: string): Promise<LaudoVersao[]> {
  try {
    const records = await pb.collection('laudos_versoes').getFullList<LaudoVersao>({
      filter: `exame = "${escaparFiltro(exameId)}"`,
      sort: '-numero_versao',
      expand: 'responsavel_laudo',
    })
    return records
  } catch (err) {
    console.error('Erro ao listar versões do laudo:', err)
    return []
  }
}

/**
 * Cancelar exame com justificativa formal
 */
export async function cancelarExame(params: CancelarExameParams): Promise<ExameItem> {
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
