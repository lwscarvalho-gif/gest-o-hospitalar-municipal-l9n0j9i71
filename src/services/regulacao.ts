import pb from '@/lib/pocketbase/client'
import {
  SolicitacaoRegulacao,
  SolicitacaoRegulacaoResumoAdmin,
  TipoSolicitacaoRegulacao,
  AtendimentoOrigemRegulacao,
  RecursoSolicitadoRegulacao,
  PrioridadeRegulacao,
  SituacaoRegulacao,
  DecisaoRegulador,
  ItemTransicaoRegulacao,
} from '@/types/hospital'
import { registrarAuditoria } from './auditoria'
import { atualizarLeito } from './cadastros'
import { transferirLeito } from './internacoes'

/**
 * SERVIÇO: CENTRAL DE REGULAÇÃO INTERNA MUNICIPAL
 *
 * Características e regras de negócio:
 * 1. Controle interno municipal — sem dependência de envio ou comunicação externa.
 * 2. Decisões humanas de prioridade, aceite/negativa e destino; sem escores ou rankings clínicos automáticos.
 * 3. Bloqueio de duplicidades de solicitações ativas para o mesmo paciente e recurso.
 * 4. Validação de transições de status permitidas (solicitada -> em_avaliacao -> aceita/negada -> efetivada/cancelada).
 * 5. A transferência NUNCA movimenta leito/internação no momento da solicitação; a movimentação só ocorre
 *    na etapa de confirmação/efetivação expressa.
 * 6. Histórico auditado em cada ação na trilha institucional.
 * 7. Consulta administrativa dedicada para perfil recepção através da view regulacao_fila_administrativa
 *    (sem expor justificativa clínica nem diagnósticos).
 */

export interface CriarSolicitacaoRegulacaoParams {
  tipo: TipoSolicitacaoRegulacao
  paciente: string
  paciente_nome: string
  atendimento_origem_tipo: AtendimentoOrigemRegulacao
  atendimento_pa?: string
  internacao?: string
  setor_origem?: string
  setor_origem_nome: string
  leito_origem?: string
  leito_origem_codigo?: string
  setor_destino?: string
  setor_destino_nome?: string
  leito_destino?: string
  leito_destino_codigo?: string
  unidade_externa_destino?: string
  recurso_solicitado: RecursoSolicitadoRegulacao
  descricao_recurso?: string
  prioridade: PrioridadeRegulacao
  justificativa_clinica: string
  diagnostico_principal: string
  cid10_codigo?: string
  sinais_vitais_sumario?: string
  condicoes_transporte?: string
  profissional_solicitante?: string
  profissional_solicitante_nome: string
  profissional_solicitante_registro?: string
  usuarioId?: string
  usuarioRole?: string
}

export interface ListarRegulacaoFiltros {
  situacao?: SituacaoRegulacao | 'todas' | 'ativas'
  periodo?: 'hoje' | '7dias' | '30dias' | 'todos'
  recurso?: RecursoSolicitadoRegulacao | 'todos'
  prioridade?: PrioridadeRegulacao | 'todas'
  pacienteId?: string
  termoBusca?: string
}

export interface AvaliarSolicitacaoParams {
  solicitacaoId: string
  decisao: 'aceita' | 'negada'
  motivo_decisao: string
  setor_destino?: string
  setor_destino_nome?: string
  leito_destino?: string
  leito_destino_codigo?: string
  unidade_externa_destino?: string
  profissional_regulador?: string
  profissional_regulador_nome: string
  usuarioId?: string
  usuarioRole?: string
}

export interface EfetivarTransferenciaParams {
  solicitacaoId: string
  responsavel_nome: string
  observacoes_efetivacao?: string
  usuarioId?: string
  usuarioRole?: string
}

export interface CancelarSolicitacaoParams {
  solicitacaoId: string
  motivo_cancelamento: string
  responsavel_nome: string
  usuarioId?: string
  usuarioRole?: string
}

// -------------------------------------------------------------
// TRANSIÇÕES DE ESTADO PERMITIDAS
// -------------------------------------------------------------
const TRANSIÇÕES_VALIDAS: Record<SituacaoRegulacao, SituacaoRegulacao[]> = {
  solicitada: ['em_avaliacao', 'cancelada'],
  em_avaliacao: ['aceita', 'negada', 'cancelada'],
  aceita: ['efetivada', 'cancelada'],
  negada: ['em_avaliacao'], // permite reavaliação se solicitado
  efetivada: [], // estado final
  cancelada: [], // estado final
}

function validarTransicao(de: SituacaoRegulacao, para: SituacaoRegulacao): boolean {
  return TRANSIÇÕES_VALIDAS[de]?.includes(para) ?? false
}

// -------------------------------------------------------------
// FUNÇÃO: LISTAR SOLICITAÇÕES CLÍNICAS (ADMIN, GESTOR, PROFISSIONAL)
// -------------------------------------------------------------
export async function listarSolicitacoesRegulacao(
  filtros?: ListarRegulacaoFiltros,
): Promise<SolicitacaoRegulacao[]> {
  const conds: string[] = []

  if (filtros?.pacienteId) {
    conds.push(`paciente = "${filtros.pacienteId}"`)
  }

  if (filtros?.situacao && filtros.situacao !== 'todas') {
    if (filtros.situacao === 'ativas') {
      conds.push(`(situacao = "solicitada" || situacao = "em_avaliacao" || situacao = "aceita")`)
    } else {
      conds.push(`situacao = "${filtros.situacao}"`)
    }
  }

  if (filtros?.recurso && filtros.recurso !== 'todos') {
    conds.push(`recurso_solicitado = "${filtros.recurso}"`)
  }

  if (filtros?.prioridade && filtros.prioridade !== 'todas') {
    conds.push(`prioridade = "${filtros.prioridade}"`)
  }

  const filter = conds.length > 0 ? conds.join(' && ') : ''

  const records = await pb.collection('regulacao_solicitacoes').getFullList<SolicitacaoRegulacao>({
    filter,
    sort: '-created',
    expand:
      'paciente,atendimento_pa,internacao,setor_origem,leito_origem,setor_destino,leito_destino,profissional_solicitante,profissional_regulador',
  })

  // Filtro em memória para busca textual e período
  let resultado = records

  if (filtros?.termoBusca && filtros.termoBusca.trim() !== '') {
    const q = filtros.termoBusca.toLowerCase().trim()
    resultado = resultado.filter(
      (r) =>
        r.paciente_nome.toLowerCase().includes(q) ||
        r.numero_solicitacao.toLowerCase().includes(q) ||
        r.diagnostico_principal.toLowerCase().includes(q) ||
        (r.cid10_codigo && r.cid10_codigo.toLowerCase().includes(q)) ||
        r.setor_origem_nome.toLowerCase().includes(q) ||
        (r.setor_destino_nome && r.setor_destino_nome.toLowerCase().includes(q)) ||
        (r.unidade_externa_destino && r.unidade_externa_destino.toLowerCase().includes(q)),
    )
  }

  if (filtros?.periodo && filtros.periodo !== 'todos') {
    const agora = new Date()
    resultado = resultado.filter((r) => {
      const dataStr = r.data_hora_solicitacao || r.created
      const d = new Date(dataStr.includes('/') ? converterDataBrParaIso(dataStr) : dataStr)
      if (isNaN(d.getTime())) return true
      const diffHoras = (agora.getTime() - d.getTime()) / (1000 * 60 * 60)
      if (filtros.periodo === 'hoje') return diffHoras <= 24
      if (filtros.periodo === '7dias') return diffHoras <= 24 * 7
      if (filtros.periodo === '30dias') return diffHoras <= 24 * 30
      return true
    })
  }

  return resultado
}

// -------------------------------------------------------------
// FUNÇÃO: LISTAR FILA ADMINISTRATIVA DE REGULAÇÃO (RECEPCÃO)
// Acessa view regulacao_fila_administrativa sem expor dados clínicos confidenciais
// -------------------------------------------------------------
export async function listarRegulacaoFilaAdministrativa(): Promise<
  SolicitacaoRegulacaoResumoAdmin[]
> {
  const records = await pb
    .collection('regulacao_fila_administrativa')
    .getFullList<SolicitacaoRegulacaoResumoAdmin>({
      sort: '-created',
    })
  return records
}

// -------------------------------------------------------------
// FUNÇÃO: CRIAR SOLICITAÇÃO DE REGULAÇÃO (ENCAMINHAMENTO/TRANSFERÊNCIA)
// -------------------------------------------------------------
export async function criarSolicitacaoRegulacao(
  params: CriarSolicitacaoRegulacaoParams,
): Promise<SolicitacaoRegulacao> {
  // 1. Guarda contra duplicidade: checar se já existe solicitação ativa igual
  // (mesmo paciente e mesmo recurso solicitado) em andamento ('solicitada', 'em_avaliacao', 'aceita')
  const solicitacoesAtivas = await pb
    .collection('regulacao_solicitacoes')
    .getFullList<SolicitacaoRegulacao>({
      filter: `paciente = "${params.paciente}" && recurso_solicitado = "${params.recurso_solicitado}" && (situacao = "solicitada" || situacao = "em_avaliacao" || situacao = "aceita")`,
      limit: 1,
    })

  if (solicitacoesAtivas.length > 0) {
    throw new Error(
      `Já existe uma solicitação ativa (${solicitacoesAtivas[0].numero_solicitacao}) deste recurso para o paciente. Evite duplicidades no fluxo de regulação.`,
    )
  }

  // 2. Gerar número institucional da solicitação de regulação
  const timestamp = Date.now().toString().slice(-6)
  const ano = new Date().getFullYear()
  const numero_solicitacao = `REG-${ano}-${timestamp}`

  const agora = new Date().toLocaleString('pt-BR')

  const transicaoInicial: ItemTransicaoRegulacao = {
    data_hora: agora,
    de: 'solicitada',
    para: 'solicitada',
    responsavel_nome: params.profissional_solicitante_nome,
    responsavel_role: params.usuarioRole || 'profissional',
    motivo: 'Solicitação inicial registrada pelo profissional',
    detalhes: `Recurso: ${params.recurso_solicitado} • Prioridade humana: ${params.prioridade}`,
  }

  const payload = {
    numero_solicitacao,
    tipo: params.tipo,
    paciente: params.paciente,
    paciente_nome: params.paciente_nome,
    atendimento_origem_tipo: params.atendimento_origem_tipo,
    atendimento_pa: params.atendimento_pa || '',
    internacao: params.internacao || '',
    setor_origem: params.setor_origem || '',
    setor_origem_nome: params.setor_origem_nome,
    leito_origem: params.leito_origem || '',
    leito_origem_codigo: params.leito_origem_codigo || '',
    setor_destino: params.setor_destino || '',
    setor_destino_nome: params.setor_destino_nome || '',
    leito_destino: params.leito_destino || '',
    leito_destino_codigo: params.leito_destino_codigo || '',
    unidade_externa_destino: params.unidade_externa_destino || '',
    recurso_solicitado: params.recurso_solicitado,
    descricao_recurso: params.descricao_recurso || '',
    prioridade: params.prioridade,
    justificativa_clinica: params.justificativa_clinica,
    diagnostico_principal: params.diagnostico_principal,
    cid10_codigo: params.cid10_codigo || '',
    sinais_vitais_sumario: params.sinais_vitais_sumario || '',
    condicoes_transporte: params.condicoes_transporte || '',
    situacao: 'solicitada' as SituacaoRegulacao,
    profissional_solicitante: params.profissional_solicitante || '',
    profissional_solicitante_nome: params.profissional_solicitante_nome,
    profissional_solicitante_registro: params.profissional_solicitante_registro || '',
    data_hora_solicitacao: agora,
    decisao_regulador: 'pendente' as DecisaoRegulador,
    historico_transicoes: JSON.stringify([transicaoInicial]),
  }

  // NOTA: Conforme requisito explícito, nenhum leito é movimentado nesta etapa.
  const record = await pb
    .collection('regulacao_solicitacoes')
    .create<SolicitacaoRegulacao>(payload, {
      expand: 'paciente,setor_origem,setor_destino',
    })

  await registrarAuditoria({
    acao: 'SOLICITACAO_REGULACAO_CRIADA',
    modulo: 'Central de Regulação',
    detalhes: `Solicitação ${numero_solicitacao} criada para paciente ${params.paciente_nome}. Recurso: ${params.recurso_solicitado}. Prioridade humana: ${params.prioridade}. Origem: ${params.setor_origem_nome}.`,
    registro_id: record.id,
  })

  return record
}

// -------------------------------------------------------------
// FUNÇÃO: COLOCAR EM AVALIAÇÃO PELO RESPONSÁVEL
// -------------------------------------------------------------
export async function iniciarAvaliacaoRegulacao(params: {
  solicitacaoId: string
  profissional_nome: string
  usuarioRole?: string
}): Promise<SolicitacaoRegulacao> {
  const atual = await pb
    .collection('regulacao_solicitacoes')
    .getOne<SolicitacaoRegulacao>(params.solicitacaoId)

  if (!validarTransicao(atual.situacao, 'em_avaliacao')) {
    throw new Error(
      `Transição inválida: não é possível passar de "${atual.situacao}" para "em_avaliacao".`,
    )
  }

  const agora = new Date().toLocaleString('pt-BR')
  let historico: ItemTransicaoRegulacao[] = []
  try {
    historico =
      typeof atual.historico_transicoes === 'string'
        ? JSON.parse(atual.historico_transicoes)
        : atual.historico_transicoes || []
  } catch {
    historico = []
  }

  historico.push({
    data_hora: agora,
    de: atual.situacao,
    para: 'em_avaliacao',
    responsavel_nome: params.profissional_nome,
    responsavel_role: params.usuarioRole,
    motivo: 'Regulador iniciou análise técnica do pedido',
  })

  const updated = await pb
    .collection('regulacao_solicitacoes')
    .update<SolicitacaoRegulacao>(params.solicitacaoId, {
      situacao: 'em_avaliacao',
      historico_transicoes: JSON.stringify(historico),
    })

  await registrarAuditoria({
    acao: 'REGULACAO_EM_AVALIACAO',
    modulo: 'Central de Regulação',
    detalhes: `Solicitação ${atual.numero_solicitacao} colocada em avaliação por ${params.profissional_nome}.`,
    registro_id: params.solicitacaoId,
  })

  return updated
}

// -------------------------------------------------------------
// FUNÇÃO: AVALIAR SOLICITAÇÃO (ACEITAR OU NEGAR) — DECISÃO HUMANA
// -------------------------------------------------------------
export async function avaliarSolicitacaoRegulacao(
  params: AvaliarSolicitacaoParams,
): Promise<SolicitacaoRegulacao> {
  const atual = await pb
    .collection('regulacao_solicitacoes')
    .getOne<SolicitacaoRegulacao>(params.solicitacaoId)

  const novoStatus: SituacaoRegulacao = params.decisao === 'aceita' ? 'aceita' : 'negada'

  if (!validarTransicao(atual.situacao, novoStatus)) {
    throw new Error(
      `Transição inválida: não é possível passar de "${atual.situacao}" para "${novoStatus}".`,
    )
  }

  const agora = new Date().toLocaleString('pt-BR')
  let historico: ItemTransicaoRegulacao[] = []
  try {
    historico =
      typeof atual.historico_transicoes === 'string'
        ? JSON.parse(atual.historico_transicoes)
        : atual.historico_transicoes || []
  } catch {
    historico = []
  }

  historico.push({
    data_hora: agora,
    de: atual.situacao,
    para: novoStatus,
    responsavel_nome: params.profissional_regulador_nome,
    responsavel_role: params.usuarioRole || 'profissional',
    motivo: params.motivo_decisao,
    detalhes: `Decisão humana: ${params.decisao.toUpperCase()}${
      params.setor_destino_nome ? ` • Destino: ${params.setor_destino_nome}` : ''
    }${params.unidade_externa_destino ? ` • Destino Externo: ${params.unidade_externa_destino}` : ''}`,
  })

  const payload: Partial<SolicitacaoRegulacao> = {
    situacao: novoStatus,
    decisao_regulador: params.decisao,
    motivo_decisao_regulador: params.motivo_decisao,
    profissional_regulador: params.profissional_regulador || '',
    profissional_regulador_nome: params.profissional_regulador_nome,
    data_hora_avaliacao: agora,
    historico_transicoes: JSON.stringify(historico),
  }

  if (params.setor_destino) payload.setor_destino = params.setor_destino
  if (params.setor_destino_nome) payload.setor_destino_nome = params.setor_destino_nome
  if (params.leito_destino) payload.leito_destino = params.leito_destino
  if (params.leito_destino_codigo) payload.leito_destino_codigo = params.leito_destino_codigo
  if (params.unidade_externa_destino)
    payload.unidade_externa_destino = params.unidade_externa_destino

  // NOTA: O aceite ainda não movimenta o leito. A movimentação só ocorre quando a transferência for confirmada/efetivada.
  const updated = await pb
    .collection('regulacao_solicitacoes')
    .update<SolicitacaoRegulacao>(params.solicitacaoId, payload, {
      expand: 'paciente,setor_origem,setor_destino,leito_destino',
    })

  await registrarAuditoria({
    acao: params.decisao === 'aceita' ? 'REGULACAO_ACEITA' : 'REGULACAO_NEGADA',
    modulo: 'Central de Regulação',
    detalhes: `Solicitação ${atual.numero_solicitacao} ${novoStatus} por ${params.profissional_regulador_nome}. Motivo: ${params.motivo_decisao}. Destino definido: ${params.setor_destino_nome || params.unidade_externa_destino || 'N/A'}.`,
    registro_id: params.solicitacaoId,
  })

  return updated
}

// -------------------------------------------------------------
// FUNÇÃO: EFETIVAR / CONFIRMAR TRANSFERÊNCIA (MOVIMENTAÇÃO REAL DE LEITO)
// Apenas neste passo ocorre a movimentação e atualização do mapa de leitos/internação.
// -------------------------------------------------------------
export async function efetivarTransferenciaRegulacao(
  params: EfetivarTransferenciaParams,
): Promise<SolicitacaoRegulacao> {
  const atual = await pb
    .collection('regulacao_solicitacoes')
    .getOne<SolicitacaoRegulacao>(params.solicitacaoId, {
      expand: 'internacao,leito_origem,leito_destino',
    })

  if (!validarTransicao(atual.situacao, 'efetivada')) {
    throw new Error(
      `Transição inválida: não é possível efetivar solicitação com situação atual "${atual.situacao}". Apenas solicitações "aceita" podem ser confirmadas/efetivadas.`,
    )
  }

  const agora = new Date().toLocaleString('pt-BR')

  // Se for transferência interna com leitos identificados e internação ativa:
  // Executar movimentação do leito real:
  if (
    atual.tipo === 'transferencia_interna' &&
    atual.internacao &&
    atual.leito_origem &&
    atual.leito_destino &&
    atual.setor_destino
  ) {
    try {
      const internacaoObj = await pb.collection('internacoes').getOne(atual.internacao)
      let histLeitos = []
      try {
        histLeitos =
          typeof internacaoObj.historico_leitos === 'string'
            ? JSON.parse(internacaoObj.historico_leitos)
            : internacaoObj.historico_leitos || []
      } catch {
        histLeitos = []
      }

      await transferirLeito({
        internacaoId: atual.internacao,
        leitoAntigoId: atual.leito_origem,
        leitoNovoId: atual.leito_destino,
        setorNovoId: atual.setor_destino,
        motivo: `Regulação Interna (${atual.numero_solicitacao}): ${atual.justificativa_clinica.slice(0, 80)}`,
        leitoAntigoCodigo: atual.leito_origem_codigo || 'Origem',
        leitoNovoCodigo: atual.leito_destino_codigo || 'Destino',
        usuarioNome: params.responsavel_nome,
        historicoAtual: histLeitos,
      })
    } catch (err) {
      console.error('Erro ao transferir leito na efetivação de regulação:', err)
      throw new Error(
        `Falha ao movimentar leito hospitalar na efetivação: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  } else if (atual.leito_destino && !atual.internacao) {
    // Se era uma transferência a partir do PA para um leito de internação (ocupar novo leito)
    try {
      await atualizarLeito(atual.leito_destino, { status: 'ocupado' })
    } catch (err) {
      console.warn('Aviso: Não foi possível marcar leito de destino como ocupado:', err)
    }
  }

  let historico: ItemTransicaoRegulacao[] = []
  try {
    historico =
      typeof atual.historico_transicoes === 'string'
        ? JSON.parse(atual.historico_transicoes)
        : atual.historico_transicoes || []
  } catch {
    historico = []
  }

  historico.push({
    data_hora: agora,
    de: atual.situacao,
    para: 'efetivada',
    responsavel_nome: params.responsavel_nome,
    responsavel_role: params.usuarioRole || 'profissional',
    motivo: params.observacoes_efetivacao || 'Transferência assistencial confirmada e efetivada',
    detalhes: 'Movimentação física de leito/internação concluída no mapa de leitos.',
  })

  const updated = await pb
    .collection('regulacao_solicitacoes')
    .update<SolicitacaoRegulacao>(params.solicitacaoId, {
      situacao: 'efetivada',
      data_hora_efetivacao: agora,
      responsavel_efetivacao_nome: params.responsavel_nome,
      observacoes_efetivacao: params.observacoes_efetivacao || '',
      historico_transicoes: JSON.stringify(historico),
    })

  await registrarAuditoria({
    acao: 'REGULACAO_TRANSFERENCIA_EFETIVADA',
    modulo: 'Central de Regulação',
    detalhes: `Transferência ${atual.numero_solicitacao} confirmada e efetivada por ${params.responsavel_nome}. Leito de destino confirmado.`,
    registro_id: params.solicitacaoId,
  })

  return updated
}

// -------------------------------------------------------------
// FUNÇÃO: CANCELAR SOLICITAÇÃO
// -------------------------------------------------------------
export async function cancelarSolicitacaoRegulacao(
  params: CancelarSolicitacaoParams,
): Promise<SolicitacaoRegulacao> {
  const atual = await pb
    .collection('regulacao_solicitacoes')
    .getOne<SolicitacaoRegulacao>(params.solicitacaoId)

  if (!validarTransicao(atual.situacao, 'cancelada')) {
    throw new Error(
      `Transição inválida: solicitação com situação "${atual.situacao}" não pode ser cancelada.`,
    )
  }

  const agora = new Date().toLocaleString('pt-BR')
  let historico: ItemTransicaoRegulacao[] = []
  try {
    historico =
      typeof atual.historico_transicoes === 'string'
        ? JSON.parse(atual.historico_transicoes)
        : atual.historico_transicoes || []
  } catch {
    historico = []
  }

  historico.push({
    data_hora: agora,
    de: atual.situacao,
    para: 'cancelada',
    responsavel_nome: params.responsavel_nome,
    responsavel_role: params.usuarioRole,
    motivo: params.motivo_cancelamento,
  })

  const updated = await pb
    .collection('regulacao_solicitacoes')
    .update<SolicitacaoRegulacao>(params.solicitacaoId, {
      situacao: 'cancelada',
      motivo_cancelamento: params.motivo_cancelamento,
      data_hora_cancelamento: agora,
      historico_transicoes: JSON.stringify(historico),
    })

  await registrarAuditoria({
    acao: 'REGULACAO_CANCELADA',
    modulo: 'Central de Regulação',
    detalhes: `Solicitação ${atual.numero_solicitacao} cancelada por ${params.responsavel_nome}. Motivo: ${params.motivo_cancelamento}`,
    registro_id: params.solicitacaoId,
  })

  return updated
}

// -------------------------------------------------------------
// INDICADORES AGREGADOS DA REGULAÇÃO (SEM DADOS PESSOAIS)
// -------------------------------------------------------------
export interface IndicadoresAgregadosRegulacao {
  totalSolicitacoes: number
  solicitadas: number
  emAvaliacao: number
  aceitas: number
  negadas: number
  efetivadas: number
  canceladas: number
  totalAtivasFila: number
  porPrioridade: {
    emergencia_vermelha: number
    urgencia_amarela: number
    prioritario_verde: number
    eletivo_azul: number
  }
  porRecurso: Record<string, number>
  porTipo: {
    transferencia_interna: number
    transferencia_externa: number
    encaminhamento_especialidade: number
  }
}

export function calcularIndicadoresRegulacao(
  solicitacoes: SolicitacaoRegulacao[] | SolicitacaoRegulacaoResumoAdmin[],
): IndicadoresAgregadosRegulacao {
  let solicitadas = 0
  let emAvaliacao = 0
  let aceitas = 0
  let negadas = 0
  let efetivadas = 0
  let canceladas = 0

  const porPrioridade = {
    emergencia_vermelha: 0,
    urgencia_amarela: 0,
    prioritario_verde: 0,
    eletivo_azul: 0,
  }

  const porRecurso: Record<string, number> = {}

  const porTipo = {
    transferencia_interna: 0,
    transferencia_externa: 0,
    encaminhamento_especialidade: 0,
  }

  solicitacoes.forEach((s) => {
    if (s.situacao === 'solicitada') solicitadas++
    if (s.situacao === 'em_avaliacao') emAvaliacao++
    if (s.situacao === 'aceita') aceitas++
    if (s.situacao === 'negada') negadas++
    if (s.situacao === 'efetivada') efetivadas++
    if (s.situacao === 'cancelada') canceladas++

    if (s.prioridade && porPrioridade[s.prioridade] !== undefined) {
      porPrioridade[s.prioridade]++
    }

    if (s.recurso_solicitado) {
      porRecurso[s.recurso_solicitado] = (porRecurso[s.recurso_solicitado] || 0) + 1
    }

    if (s.tipo && porTipo[s.tipo] !== undefined) {
      porTipo[s.tipo]++
    }
  })

  return {
    totalSolicitacoes: solicitacoes.length,
    solicitadas,
    emAvaliacao,
    aceitas,
    negadas,
    efetivadas,
    canceladas,
    totalAtivasFila: solicitadas + emAvaliacao + aceitas,
    porPrioridade,
    porRecurso,
    porTipo,
  }
}

function converterDataBrParaIso(str: string): string {
  const parts = str.split(/[,\s]+/)
  const dateParts = parts[0].split('/')
  if (dateParts.length === 3) {
    const hora = parts[1] || '00:00:00'
    return `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}T${hora}`
  }
  return str
}
