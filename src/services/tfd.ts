/**
 * Serviço de Tratamento Fora do Domicílio (TFD) - Seção 7.4.4.2.e (página 30)
 *
 * Funcionalidades fornecidas:
 * 1. Processo TFD: abertura, consulta paginada, isolamento de dados clínicos (recepção não vê CID/justificativa);
 * 2. Transição formal de estados com motivo obrigatório e auditoria em tfd_historico_estados;
 * 3. Vínculo e validações de viagens ao processo TFD com coerência de paciente;
 * 4. Viagens em lote: prévia para revisão humana e confirmação explícita com idempotência persistente;
 * 5. Renovação de processos concluídos: cria novo processo relacionado preservando histórico;
 * 6. Cancelamento/Inativação auditados sem exclusão física.
 */

import pb from '@/lib/pocketbase/client'
import { registrarAuditoria } from './auditoria'
import type {
  TfdProcesso,
  TfdHistoricoEstado,
  CriarProcessoTfdParams,
  TransitarEstadoTfdParams,
  RenovarProcessoTfdParams,
  ItemViagemLoteInput,
  PreviaViagemLoteResultado,
  ConfirmarViagemLoteParams,
  ConfirmarViagemLoteResultado,
  ListarProcessosTfdFiltros,
  ResultadoPaginadoTfd,
} from '@/types/hospital'

/**
 * Gera número interno para novo processo de TFD (interno, não oficial SUS)
 */
export function gerarNumeroProcessoTfdInterno(sequencial: number, ano?: number): string {
  const a = ano || new Date().getFullYear()
  const s = Math.max(1, Math.floor(sequencial))
  return `TFD-${a}-${String(s).padStart(5, '0')}`
}

/**
 * Validação prévia de transição de estado no lado do cliente/serviço
 */
export function validarTransicaoEstadoTfd(
  estadoAtual: string,
  novoEstado: string,
  motivo: string,
  userRole?: string,
): { valido: boolean; erro?: string } {
  if (userRole === 'recepcao') {
    return {
      valido: false,
      erro: 'Acesso negado: Perfil de recepção não possui autorização para transitar estados de TFD.',
    }
  }

  const estadosValidos = ['autorizado', 'cancelado', 'enviado_para_estado', 'negado', 'inconcluso']
  if (!estadosValidos.includes(novoEstado)) {
    return {
      valido: false,
      erro: `Estado inválido. Valores aceitos: ${estadosValidos.join(', ')}.`,
    }
  }

  if (estadoAtual === 'cancelado') {
    return {
      valido: false,
      erro: 'O processo de TFD está cancelado e é imutável. Não é permitida reativação.',
    }
  }

  if (!motivo || motivo.trim().length < 5) {
    return {
      valido: false,
      erro: 'A transição de estado exige justificativa/motivo formal com no mínimo 5 caracteres.',
    }
  }

  return { valido: true }
}

/**
 * Validação de vínculo entre paciente do processo TFD e paciente da viagem
 */
export function validarCoerenciaPacienteTfdViagem(
  pacienteProcessoId: string,
  pacienteViagemId: string,
): { coerente: boolean; erro?: string } {
  if (!pacienteProcessoId || !pacienteViagemId) {
    return {
      coerente: false,
      erro: 'Identificação de paciente ausente na validação de vínculo TFD.',
    }
  }

  if (pacienteProcessoId !== pacienteViagemId) {
    return {
      coerente: false,
      erro: 'INCONSISTÊNCIA DE VÍNCULO TFD: O paciente da viagem não coincide com o titular do processo de TFD.',
    }
  }

  return { coerente: true }
}

/**
 * Validação e preparação de renovação de processo TFD
 */
export function prepararRenovacaoProcessoTfd(
  processoOriginal: TfdProcesso,
  motivoRenovacao: string,
  proximoSequencial: number,
  ano?: number,
): { valido: boolean; novoProcesso?: Partial<TfdProcesso>; erro?: string } {
  if (processoOriginal.status === 'cancelado') {
    return {
      valido: false,
      erro: 'Não é permitida a renovação de um processo de TFD cancelado.',
    }
  }

  if (!motivoRenovacao || motivoRenovacao.trim().length < 5) {
    return {
      valido: false,
      erro: 'A renovação exige justificativa/motivo formal com no mínimo 5 caracteres.',
    }
  }

  const novoNumero = gerarNumeroProcessoTfdInterno(proximoSequencial, ano)
  const agoraIso = new Date().toISOString()

  const novoProcesso: Partial<TfdProcesso> = {
    numero_processo: novoNumero,
    data_abertura: agoraIso.substring(0, 10),
    paciente: processoOriginal.paciente,
    profissional_responsavel: processoOriginal.profissional_responsavel,
    cid10: processoOriginal.cid10,
    tratamento_solicitado: processoOriginal.tratamento_solicitado,
    tipo_atendimento: processoOriginal.tipo_atendimento,
    justificativa_clinica: `[RENOVAÇÃO DO PROCESSO ${processoOriginal.numero_processo}] ${motivoRenovacao.trim()} | Justificativa anterior: ${processoOriginal.justificativa_clinica}`,
    status: 'inconcluso', // Renovação começa em estado inicial, nunca herda autorização prévia
    motivo_situacao: `Abertura por renovação formal do processo ${processoOriginal.numero_processo}: ${motivoRenovacao.trim()}`,
    municipio_destino: processoOriginal.municipio_destino,
    estabelecimento_destino: processoOriginal.estabelecimento_destino,
    tipo_transporte_recomendado: processoOriginal.tipo_transporte_recomendado,
    exige_acompanhante: processoOriginal.exige_acompanhante,
    justificativa_acompanhante: processoOriginal.justificativa_acompanhante,
    is_renovacao: true,
    processo_anterior_ref: processoOriginal.id,
    data_ultima_transicao: agoraIso,
  }

  return { valido: true, novoProcesso }
}

/**
 * Consulta de processos de TFD via endpoint com isolamento clínico
 */
export async function listarProcessosTfd(
  filtros: ListarProcessosTfdFiltros = {},
): Promise<ResultadoPaginadoTfd> {
  const queryParams = new URLSearchParams()
  if (filtros.status && filtros.status !== 'todos') queryParams.set('status', filtros.status)
  if (filtros.paciente) queryParams.set('paciente', filtros.paciente)
  if (filtros.busca) queryParams.set('busca', filtros.busca)
  if (filtros.dataInicio) queryParams.set('data_inicio', filtros.dataInicio)
  if (filtros.dataFim) queryParams.set('data_fim', filtros.dataFim)
  if (filtros.page) queryParams.set('page', String(filtros.page))
  if (filtros.perPage) queryParams.set('perPage', String(filtros.perPage))

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''

  return pb.send<ResultadoPaginadoTfd>(`/backend/v1/tfd/processos${queryString}`, {
    method: 'GET',
  })
}

/**
 * Obter um processo de TFD por ID via endpoint com isolamento clínico
 */
export async function obterProcessoTfdPorId(id: string): Promise<TfdProcesso> {
  return pb.send<TfdProcesso>(`/backend/v1/tfd/processos/${encodeURIComponent(id)}`, {
    method: 'GET',
  })
}

/**
 * Criação de processo de TFD
 */
export async function criarProcessoTfd(params: CriarProcessoTfdParams): Promise<TfdProcesso> {
  const sequencial = (await pb.collection('tfd_processos').getList(1, 1)).totalItems + 1
  const numeroProcesso = gerarNumeroProcessoTfdInterno(sequencial)

  const record = await pb.collection('tfd_processos').create<TfdProcesso>({
    numero_processo: numeroProcesso,
    data_abertura: new Date().toISOString().substring(0, 10),
    paciente: params.paciente,
    profissional_responsavel: params.profissional_responsavel,
    cid10: params.cid10.trim().toUpperCase(),
    tratamento_solicitado: params.tratamento_solicitado.trim(),
    tipo_atendimento: params.tipo_atendimento,
    justificativa_clinica: params.justificativa_clinica.trim(),
    status: params.status || 'inconcluso',
    motivo_situacao: params.motivo_situacao?.trim() || 'Abertura inicial de processo TFD',
    observacoes_gerais: params.observacoes_gerais?.trim() || '',
    municipio_destino: params.municipio_destino?.trim() || '',
    estabelecimento_destino: params.estabelecimento_destino?.trim() || '',
    tipo_transporte_recomendado: params.tipo_transporte_recomendado?.trim() || '',
    exige_acompanhante: params.exige_acompanhante || false,
    justificativa_acompanhante: params.justificativa_acompanhante?.trim() || '',
    idempotency_key: params.idempotency_key || null,
  })

  await registrarAuditoria({
    acao: 'criar_processo_tfd',
    modulo: 'transporte_tfd',
    detalhes: `Abertura do Processo TFD ${record.numero_processo} para paciente ${params.paciente}. Tratamento: ${params.tratamento_solicitado}`,
    registro_id: record.id,
  })

  return record
}

/**
 * Transição de estado formal por ação humana com motivo obrigatório
 */
export async function transitarEstadoTfd(params: TransitarEstadoTfdParams): Promise<any> {
  const resposta = await pb.send<any>(
    `/backend/v1/tfd/processos/${encodeURIComponent(params.processo_id)}/transicao`,
    {
      method: 'POST',
      body: {
        novo_status: params.novo_status,
        motivo_justificativa: params.motivo_justificativa.trim(),
        observacoes: params.observacoes?.trim() || '',
      },
    },
  )

  await registrarAuditoria({
    acao: 'transitar_estado_tfd',
    modulo: 'transporte_tfd',
    detalhes: `Transição de estado do processo TFD ${params.processo_id} para ${params.novo_status}. Motivo: ${params.motivo_justificativa}`,
    registro_id: params.processo_id,
  })

  return resposta
}

/**
 * Renovação formal de processo de TFD concluído
 */
export async function renovarProcessoTfd(params: RenovarProcessoTfdParams): Promise<any> {
  const resposta = await pb.send<any>(
    `/backend/v1/tfd/processos/${encodeURIComponent(params.processo_original_id)}/renovar`,
    {
      method: 'POST',
      body: {
        motivo_renovacao: params.motivo_renovacao.trim(),
        tratamento_solicitado: params.tratamento_solicitado?.trim(),
        justificativa_clinica: params.justificativa_clinica?.trim(),
        cid10: params.cid10?.trim().toUpperCase(),
        tipo_atendimento: params.tipo_atendimento,
        profissional_responsavel: params.profissional_responsavel,
        idempotency_key: params.idempotency_key || null,
      },
    },
  )

  await registrarAuditoria({
    acao: 'renovar_processo_tfd',
    modulo: 'transporte_tfd',
    detalhes: `Processo TFD ${params.processo_original_id} renovado gerando novo processo ${resposta.novo_numero_processo}. Motivo: ${params.motivo_renovacao}`,
    registro_id: resposta.novo_processo_id,
  })

  return resposta
}

/**
 * Prévia de viagens em lote para revisão humana (sem gravação)
 */
export async function obterPreviaViagensLoteTfd(
  processoId: string,
  itens: ItemViagemLoteInput[],
): Promise<PreviaViagemLoteResultado> {
  return pb.send<PreviaViagemLoteResultado>('/backend/v1/tfd/viagens-lote/previa', {
    method: 'POST',
    body: {
      processo_id: processoId,
      itens,
    },
  })
}

/**
 * Confirmação explícita do lote de viagens com idempotência e discriminação de conflitos
 */
export async function confirmarViagensLoteTfd(
  params: ConfirmarViagemLoteParams,
): Promise<ConfirmarViagemLoteResultado> {
  const resposta = await pb.send<ConfirmarViagemLoteResultado>(
    '/backend/v1/tfd/viagens-lote/confirmar',
    {
      method: 'POST',
      body: {
        processo_id: params.processo_id,
        lote_idempotency_key: params.lote_idempotency_key,
        confirmado: params.confirmado,
        itens: params.itens,
      },
    },
  )

  await registrarAuditoria({
    acao: 'confirmar_viagens_lote_tfd',
    modulo: 'transporte_tfd',
    detalhes: `Lote de viagens ${resposta.lote_codigo} confirmado para processo TFD ${params.processo_id}. Criados: ${resposta.itens_criados_total}, Conflitos: ${resposta.itens_conflito_total}`,
    registro_id: params.processo_id,
  })

  return resposta
}

/**
 * Consulta do histórico de transições de estado de um processo de TFD
 */
export async function listarHistoricoEstadosTfd(processoId: string): Promise<TfdHistoricoEstado[]> {
  const records = await pb.collection('tfd_historico_estados').getFullList<TfdHistoricoEstado>({
    filter: pb.filter('processo = {:id}', { id: processoId }),
    sort: '-created',
    expand: 'usuario_autor_id',
  })
  return records
}

/**
 * Consulta de viagens vinculadas a um processo específico de TFD
 */
export async function listarViagensDoProcessoTfd(processoId: string): Promise<any[]> {
  try {
    const records = await pb.collection('transporte_viagens').getFullList({
      filter: pb.filter('tfd_processo = {:id}', { id: processoId }),
      sort: '-data_saida',
      expand: 'motorista,veiculo,rota,destino',
    })
    return records
  } catch (err) {
    console.warn(`Erro ao listar viagens do processo TFD ${processoId}:`, err)
    return []
  }
}

/**
 * Totais e contagens agregadas internas por localidade/município de destino
 * Sem mapas, sem georreferenciamento, sem dados pessoais desnecessários
 */
export interface AgregadoLocalidadeTfd {
  municipio: string
  totalProcessos: number
  totalAutorizados: number
  totalEnviadosEstado: number
  totalInconclusos: number
  totalViagensVinculadas: number
}

export async function obterTotaisAgregadosPorLocalidade(): Promise<AgregadoLocalidadeTfd[]> {
  try {
    const [processosRes, viagensRes] = await Promise.all([
      pb.collection('tfd_processos').getFullList<TfdProcesso>({
        fields: 'id,municipio_destino,status',
      }),
      pb.collection('transporte_viagens').getFullList({
        fields: 'id,cidade_destino,tfd_processo,status',
        filter: 'status != "cancelada"',
      }),
    ])

    const mapa = new Map<string, AgregadoLocalidadeTfd>()

    for (const proc of processosRes) {
      const muni = proc.municipio_destino?.trim() || 'Município não informado'
      if (!mapa.has(muni)) {
        mapa.set(muni, {
          municipio: muni,
          totalProcessos: 0,
          totalAutorizados: 0,
          totalEnviadosEstado: 0,
          totalInconclusos: 0,
          totalViagensVinculadas: 0,
        })
      }
      const item = mapa.get(muni)!
      item.totalProcessos++
      if (proc.status === 'autorizado') item.totalAutorizados++
      else if (proc.status === 'enviado_para_estado') item.totalEnviadosEstado++
      else if (proc.status === 'inconcluso') item.totalInconclusos++
    }

    for (const viagem of viagensRes) {
      const muni = (viagem as any).cidade_destino?.trim() || 'Município não informado'
      if (!mapa.has(muni)) {
        mapa.set(muni, {
          municipio: muni,
          totalProcessos: 0,
          totalAutorizados: 0,
          totalEnviadosEstado: 0,
          totalInconclusos: 0,
          totalViagensVinculadas: 0,
        })
      }
      const item = mapa.get(muni)!
      item.totalViagensVinculadas++
    }

    return Array.from(mapa.values()).sort((a, b) => b.totalProcessos - a.totalProcessos)
  } catch (err) {
    console.warn('Erro ao obter totais agregados por localidade:', err)
    return []
  }
}
