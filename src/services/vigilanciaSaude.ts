import pb from '@/lib/pocketbase/client'
import {
  NotificacaoVigilancia,
  NotificacaoVigilanciaResumoAdmin,
  TipoVigilancia,
  SituacaoCasoVigilancia,
  PeriodicidadeNotificacao,
  CriterioConfirmacaoVigilancia,
  EvolucaoCasoVigilancia,
  ItemHistoricoInvestigacao,
} from '@/types/hospital'
import { registrarAuditoria } from './auditoria'

export interface AgravoCatalogo {
  codigo: string
  nome: string
  cid10Padrao?: string
  periodicidade: PeriodicidadeNotificacao
  tipoVigilancia: TipoVigilancia
  descricaoSimplificada: string
}

/**
 * Catálogo Oficial Enxuto de Doenças e Agravos de Notificação Compulsória (Portaria GM/MS 5.201/2024 e correlatas)
 * Focado no controle interno municipal, sem georreferenciamento e sem vacinas/imunização.
 */
export const CATALOGO_AGRAVOS_VIGILANCIA: AgravoCatalogo[] = [
  {
    codigo: 'DENGUE',
    nome: 'Dengue',
    cid10Padrao: 'A90',
    periodicidade: 'semanal',
    tipoVigilancia: 'epidemiologica',
    descricaoSimplificada: 'Doença febril aguda transmitida pelo Aedes aegypti.',
  },
  {
    codigo: 'CHIKUNGUNYA',
    nome: 'Febre de Chikungunya',
    cid10Padrao: 'A92.0',
    periodicidade: 'semanal',
    tipoVigilancia: 'epidemiologica',
    descricaoSimplificada: 'Arbovirose com manifestação articular intensa e febre súbita.',
  },
  {
    codigo: 'ZIKA',
    nome: 'Zika Vírus (Infecção)',
    cid10Padrao: 'A92.8',
    periodicidade: 'semanal',
    tipoVigilancia: 'epidemiologica',
    descricaoSimplificada:
      'Arbovirose com exantema pruriginoso, febre baixa e hiperemia conjuntival.',
  },
  {
    codigo: 'MALARIA',
    nome: 'Malária',
    cid10Padrao: 'B54',
    periodicidade: 'imediata_24h',
    tipoVigilancia: 'epidemiologica',
    descricaoSimplificada:
      'Doença infecciosa febril transmitida pelo mosquito Anopheles (relevância amazônica/RO).',
  },
  {
    codigo: 'LEPTOSPIROSE',
    nome: 'Leptospirose',
    cid10Padrao: 'A27.9',
    periodicidade: 'imediata_24h',
    tipoVigilancia: 'epidemiologica',
    descricaoSimplificada:
      'Infecção aguda transmitida por contato com urina de animais infectados (roedores).',
  },
  {
    codigo: 'TUBERCULOSE',
    nome: 'Tuberculose (todas as formas)',
    cid10Padrao: 'A16.2',
    periodicidade: 'semanal',
    tipoVigilancia: 'epidemiologica',
    descricaoSimplificada:
      'Doença infectocontagiosa pulmonar/extrapulmonar causada pelo bacilo de Koch.',
  },
  {
    codigo: 'HANSENIASE',
    nome: 'Hanseníase',
    cid10Padrao: 'A30.9',
    periodicidade: 'semanal',
    tipoVigilancia: 'epidemiologica',
    descricaoSimplificada:
      'Doença crônica com manchas hipocrômicas ou avermelhadas com alteração de sensibilidade.',
  },
  {
    codigo: 'MENINGITE',
    nome: 'Meningite (bacteriana / viral / indeterminada)',
    cid10Padrao: 'G03.9',
    periodicidade: 'imediata_24h',
    tipoVigilancia: 'epidemiologica',
    descricaoSimplificada: 'Inflamação das membranas cerebrais; rigidez de nuca, cefaleia e febre.',
  },
  {
    codigo: 'HEPATITE_VIRAL',
    nome: 'Hepatites Virais (A, B, C, Delta)',
    cid10Padrao: 'B19.9',
    periodicidade: 'semanal',
    tipoVigilancia: 'epidemiologica',
    descricaoSimplificada: 'Infecção do fígado por vírus hepatotrópicos com icterícia e colúria.',
  },
  {
    codigo: 'HIV_GESTANTE_CRIANCA',
    nome: 'Infecção pelo HIV em Gestante, Parturiente ou Puérpera',
    cid10Padrao: 'Z21',
    periodicidade: 'semanal',
    tipoVigilancia: 'epidemiologica',
    descricaoSimplificada: 'Vigilância da transmissão vertical do HIV na rede de atenção à saúde.',
  },
  {
    codigo: 'ACIDENTE_PECONHENTO',
    nome: 'Acidente por Animais Peçonhentos (Serpente, Aranha, Escorpião)',
    cid10Padrao: 'X29',
    periodicidade: 'semanal',
    tipoVigilancia: 'epidemiologica',
    descricaoSimplificada:
      'Envenenamento ou injúria por inoculação de veneno de animais peçonhentos.',
  },
  {
    codigo: 'ACIDENTE_TRABALHO_GRAVE',
    nome: 'Acidente de Trabalho Grave / Fatal / com Menor',
    cid10Padrao: 'Y96',
    periodicidade: 'imediata_24h',
    tipoVigilancia: 'saude_trabalhador',
    descricaoSimplificada:
      'Evento no exercício laboral que cause morte, mutilação ou envolva menor de 18 anos.',
  },
  {
    codigo: 'VIOLENCIA_INTERPESSOAL',
    nome: 'Violência Interpessoal ou Autoprovocada',
    cid10Padrao: 'Y09',
    periodicidade: 'imediata_24h',
    tipoVigilancia: 'epidemiologica',
    descricaoSimplificada:
      'Casos suspeitos ou confirmados de violência física, sexual ou tentativa de suicídio.',
  },
  {
    codigo: 'INTOXICACAO_EXOGENA',
    nome: 'Intoxicação Exógena (Medicamentos, Agrotóxicos, Produtos Químicos)',
    cid10Padrao: 'T65.9',
    periodicidade: 'semanal',
    tipoVigilancia: 'epidemiologica',
    descricaoSimplificada: 'Efeito nocivo consequente à exposição a substâncias químicas externas.',
  },
  {
    codigo: 'SURTO_DTA',
    nome: 'Surto de Doença Transmitida por Alimentos ou Água (DTA)',
    cid10Padrao: 'A05.9',
    periodicidade: 'imediata_24h',
    tipoVigilancia: 'sanitaria',
    descricaoSimplificada:
      'Ocorrência de dois ou mais casos com quadro clínico semelhante após ingestão comum.',
  },
  {
    codigo: 'OUTRO_AGRAVO',
    nome: 'Outro Agravo de Interesse da Saúde Pública Municipal',
    cid10Padrao: 'Z03.9',
    periodicidade: 'semanal',
    tipoVigilancia: 'epidemiologica',
    descricaoSimplificada:
      'Notificação de controle interno para casos especiais sob suspeição clínica.',
  },
]

export interface CriarNotificacaoParams {
  pacienteId: string
  pacienteNome: string
  pacienteCpf?: string
  pacienteCartaoSus?: string
  pacienteDataNascimento?: string
  pacienteSexo?: string
  pacienteMunicipio?: string
  pacienteBairro?: string
  pacienteLogradouro?: string
  pacienteTelefone?: string
  tipoVigilancia: TipoVigilancia
  agravoCodigo: string
  agravoNome: string
  cid10Codigo?: string
  periodicidade: PeriodicidadeNotificacao
  situacao?: SituacaoCasoVigilancia
  dataNotificacao: string
  dataPrimeirosSintomas?: string
  profissionalNotificanteId?: string
  profissionalNome: string
  profissionalRegistro?: string
  unidadeNotificadora?: string
  municipioNotificacao?: string
  observacoesInvestigacao?: string
}

export interface ListarNotificacoesFiltros {
  pacienteId?: string
  agravoCodigo?: string
  situacao?: SituacaoCasoVigilancia
  tipoVigilancia?: TipoVigilancia
  dataInicio?: string
  dataFim?: string
  buscaTexto?: string
}

export interface AtualizarSituacaoParams {
  notificacaoId: string
  novaSituacao: SituacaoCasoVigilancia
  criterioConfirmacao?: CriterioConfirmacaoVigilancia
  evolucaoCaso?: EvolucaoCasoVigilancia
  dataEncerramento?: string
  notaInvestigacao: string
}

/**
 * Gera um número de notificação interno sequencial e identificável
 * Formato: NOT-ANO-XXXXXX
 */
function gerarNumeroNotificacao(): string {
  const ano = new Date().getFullYear()
  const random = Math.floor(100000 + Math.random() * 900000)
  return `NOT-${ano}-${random}`
}

/**
 * Cria um novo registro de notificação de vigilância em saúde
 */
export async function registrarNotificacaoVigilancia(
  params: CriarNotificacaoParams,
): Promise<NotificacaoVigilancia> {
  const numero_notificacao = gerarNumeroNotificacao()
  const situacao = params.situacao || 'notificado'
  const data_notificacao = params.dataNotificacao || new Date().toISOString().split('T')[0]

  const authUser = pb.authStore.model
  const historicoInicial: ItemHistoricoInvestigacao[] = [
    {
      data_hora: new Date().toISOString(),
      usuario_id: authUser?.id || '',
      usuario_nome: authUser?.name || params.profissionalNome || 'Profissional Notificante',
      usuario_cargo: (authUser as any)?.cargo || 'Profissional de Saúde',
      situacao_anterior: 'notificado',
      situacao_nova: situacao,
      nota: params.observacoesInvestigacao
        ? `Notificação inicial registrada: ${params.observacoesInvestigacao}`
        : 'Notificação inicial cadastrada no controle interno municipal.',
    },
  ]

  const payload: any = {
    numero_notificacao,
    tipo_vigilancia: params.tipoVigilancia,
    paciente: params.pacienteId,
    paciente_nome: params.pacienteNome,
    paciente_cpf: params.pacienteCpf || '',
    paciente_cartao_sus: params.pacienteCartaoSus || '',
    paciente_data_nascimento: params.pacienteDataNascimento || '',
    paciente_sexo: params.pacienteSexo || '',
    paciente_municipio: params.pacienteMunicipio || 'Mirante da Serra - RO',
    paciente_bairro: params.pacienteBairro || '',
    paciente_logradouro: params.pacienteLogradouro || '',
    paciente_telefone: params.pacienteTelefone || '',
    agravo_codigo: params.agravoCodigo,
    agravo_nome: params.agravoNome,
    cid10_codigo: params.cid10Codigo || '',
    periodicidade: params.periodicidade,
    situacao,
    criterio_confirmacao: 'em_aberto',
    evolucao_caso: 'em_tratamento',
    data_notificacao,
    data_primeiros_sintomas: params.dataPrimeirosSintomas || '',
    profissional_notificante: params.profissionalNotificanteId || null,
    profissional_nome: params.profissionalNome,
    profissional_registro: params.profissionalRegistro || '',
    unidade_notificadora:
      params.unidadeNotificadora || 'Hospital Municipal de Mirante da Serra - RO',
    municipio_notificacao: params.municipioNotificacao || 'Mirante da Serra - RO',
    observacoes_investigacao: params.observacoesInvestigacao || '',
    historico_investigacao: JSON.stringify(historicoInicial),
  }

  const record = await pb
    .collection('notificacoes_vigilancia')
    .create<NotificacaoVigilancia>(payload)

  // Auditoria oficial
  await registrarAuditoria({
    acao: 'REGISTRAR_NOTIFICACAO_VIGILANCIA',
    modulo: 'Vigilância em Saúde',
    detalhes: `Notificação nº ${numero_notificacao} do agravo "${params.agravoNome}" para o paciente ${params.pacienteNome} (Situação: ${situacao}). Controle interno municipal.`,
    registro_id: record.id,
  })

  return record
}

/**
 * Atualiza situação clínica e anota investigação de um caso de vigilância (revisão humana)
 */
export async function atualizarSituacaoInvestigacao(
  params: AtualizarSituacaoParams,
): Promise<NotificacaoVigilancia> {
  const notifAtual = await pb
    .collection('notificacoes_vigilancia')
    .getOne<NotificacaoVigilancia>(params.notificacaoId)

  let historico: ItemHistoricoInvestigacao[] = []
  try {
    if (typeof notifAtual.historico_investigacao === 'string') {
      historico = JSON.parse(notifAtual.historico_investigacao) || []
    } else if (Array.isArray(notifAtual.historico_investigacao)) {
      historico = notifAtual.historico_investigacao
    }
  } catch {
    historico = []
  }

  const authUser = pb.authStore.model
  const novoItemHistorico: ItemHistoricoInvestigacao = {
    data_hora: new Date().toISOString(),
    usuario_id: authUser?.id || '',
    usuario_nome: authUser?.name || 'Profissional Responsável',
    usuario_cargo: (authUser as any)?.cargo || 'Profissional de Saúde',
    situacao_anterior: notifAtual.situacao,
    situacao_nova: params.novaSituacao,
    nota: params.notaInvestigacao,
  }

  historico.push(novoItemHistorico)

  const payload: any = {
    situacao: params.novaSituacao,
    historico_investigacao: JSON.stringify(historico),
  }

  if (params.criterioConfirmacao) {
    payload.criterio_confirmacao = params.criterioConfirmacao
  }
  if (params.evolucaoCaso) {
    payload.evolucao_caso = params.evolucaoCaso
  }
  if (params.dataEncerramento) {
    payload.data_encerramento = params.dataEncerramento
  } else if (params.novaSituacao === 'encerrado' || params.novaSituacao === 'descartado') {
    payload.data_encerramento = new Date().toISOString().split('T')[0]
  }

  const record = await pb
    .collection('notificacoes_vigilancia')
    .update<NotificacaoVigilancia>(params.notificacaoId, payload)

  await registrarAuditoria({
    acao: 'ATUALIZAR_SITUACAO_VIGILANCIA',
    modulo: 'Vigilância em Saúde',
    detalhes: `Caso nº ${notifAtual.numero_notificacao} atualizado de "${notifAtual.situacao}" para "${params.novaSituacao}". Nota: ${params.notaInvestigacao.slice(0, 100)}`,
    registro_id: record.id,
  })

  return record
}

/**
 * Lista notificações com filtros múltiplos (paciente, agravo, período, situação, texto)
 */
export async function listarNotificacoesVigilancia(
  filtros?: ListarNotificacoesFiltros,
): Promise<NotificacaoVigilancia[]> {
  try {
    const authRole = (pb.authStore.model as any)?.role

    // Se o usuário logado for recepção, a coleção clínica notificacoes_vigilancia é bloqueada pelo RLS.
    // Em vez de falhar ou vazar dados, a recepção consulta a view administrativa ou tem retorno enxuto sem campos sensíveis de terceiros.
    if (authRole === 'recepcao') {
      return []
    }

    const filterClauses: string[] = []

    if (filtros?.pacienteId) {
      filterClauses.push(`paciente = "${filtros.pacienteId}"`)
    }
    if (filtros?.agravoCodigo && filtros.agravoCodigo !== 'todos') {
      filterClauses.push(`agravo_codigo = "${filtros.agravoCodigo}"`)
    }
    if (filtros?.situacao && filtros.situacao !== ('todas' as any)) {
      filterClauses.push(`situacao = "${filtros.situacao}"`)
    }
    if (filtros?.tipoVigilancia && filtros.tipoVigilancia !== ('todos' as any)) {
      filterClauses.push(`tipo_vigilancia = "${filtros.tipoVigilancia}"`)
    }
    if (filtros?.dataInicio) {
      filterClauses.push(`data_notificacao >= "${filtros.dataInicio}"`)
    }
    if (filtros?.dataFim) {
      filterClauses.push(`data_notificacao <= "${filtros.dataFim}"`)
    }
    if (filtros?.buscaTexto && filtros.buscaTexto.trim().length > 0) {
      const q = filtros.buscaTexto.trim().replace(/"/g, '')
      filterClauses.push(
        `(paciente_nome ~ "${q}" || numero_notificacao ~ "${q}" || agravo_nome ~ "${q}" || cid10_codigo ~ "${q}")`,
      )
    }

    const filterString = filterClauses.length > 0 ? filterClauses.join(' && ') : ''

    const records = await pb
      .collection('notificacoes_vigilancia')
      .getFullList<NotificacaoVigilancia>({
        filter: filterString,
        sort: '-data_notificacao,-created',
        expand: 'paciente,profissional_notificante',
      })

    return records
  } catch (err) {
    console.error('Erro ao listar notificações de vigilância:', err)
    return []
  }
}

/**
 * Lista estritamente a fila administrativa de vigilância (segura para o perfil recepção).
 * Retorna apenas número da notificação, tipo, periodicidade, situação e data.
 * Zero dados clínicos ou diagnósticos sensíveis de terceiros expostos.
 */
export async function listarVigilanciaFilaAdministrativa(): Promise<
  NotificacaoVigilanciaResumoAdmin[]
> {
  try {
    const records = await pb
      .collection('vigilancia_fila_administrativa')
      .getFullList<NotificacaoVigilanciaResumoAdmin>({
        sort: '-data_notificacao,-created',
      })
    return records
  } catch (err) {
    console.error('Erro ao consultar fila administrativa de vigilância:', err)
    return []
  }
}

/**
 * Obtém os indicadores agregados do módulo de Vigilância em Saúde
 * Minimiza dados pessoais: apenas contagens agrupadas por agravo, situação e período.
 */
export interface IndicadoresAgregadosVigilancia {
  totalCasos: number
  casosPorSituacao: {
    notificado: number
    em_investigacao: number
    confirmado: number
    descartado: number
    encerrado: number
  }
  casosPorPeriodicidade: {
    imediata_24h: number
    semanal: number
  }
  casosPorTipoVigilancia: {
    epidemiologica: number
    sanitaria: number
    saude_trabalhador: number
  }
  topAgravos: {
    codigo: string
    nome: string
    total: number
    confirmados: number
    emInvestigacao: number
  }[]
  casosUltimos30Dias: number
  casosUltimos7Dias: number
  taxaEncerramentoPercentual: number
}

export function calcularIndicadoresVigilancia(
  notificacoes: NotificacaoVigilancia[],
): IndicadoresAgregadosVigilancia {
  const agora = new Date()
  const d30 = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const d7 = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const casosPorSituacao = {
    notificado: 0,
    em_investigacao: 0,
    confirmado: 0,
    descartado: 0,
    encerrado: 0,
  }

  const casosPorPeriodicidade = {
    imediata_24h: 0,
    semanal: 0,
  }

  const casosPorTipoVigilancia = {
    epidemiologica: 0,
    sanitaria: 0,
    saude_trabalhador: 0,
  }

  const contagemPorAgravo: Record<
    string,
    { nome: string; total: number; confirmados: number; emInvestigacao: number }
  > = {}

  let casosUltimos30Dias = 0
  let casosUltimos7Dias = 0

  notificacoes.forEach((n) => {
    // Situação
    if (casosPorSituacao[n.situacao] !== undefined) {
      casosPorSituacao[n.situacao]++
    }

    // Periodicidade
    if (casosPorPeriodicidade[n.periodicidade] !== undefined) {
      casosPorPeriodicidade[n.periodicidade]++
    }

    // Tipo
    if (casosPorTipoVigilancia[n.tipo_vigilancia] !== undefined) {
      casosPorTipoVigilancia[n.tipo_vigilancia]++
    }

    // Agravo
    if (!contagemPorAgravo[n.agravo_codigo]) {
      contagemPorAgravo[n.agravo_codigo] = {
        nome: n.agravo_nome,
        total: 0,
        confirmados: 0,
        emInvestigacao: 0,
      }
    }
    contagemPorAgravo[n.agravo_codigo].total++
    if (n.situacao === 'confirmado') {
      contagemPorAgravo[n.agravo_codigo].confirmados++
    } else if (n.situacao === 'em_investigacao') {
      contagemPorAgravo[n.agravo_codigo].emInvestigacao++
    }

    // Períodos
    if (n.data_notificacao >= d30) {
      casosUltimos30Dias++
    }
    if (n.data_notificacao >= d7) {
      casosUltimos7Dias++
    }
  })

  const topAgravos = Object.entries(contagemPorAgravo)
    .map(([codigo, val]) => ({
      codigo,
      nome: val.nome,
      total: val.total,
      confirmados: val.confirmados,
      emInvestigacao: val.emInvestigacao,
    }))
    .sort((a, b) => b.total - a.total)

  const concluidos = casosPorSituacao.encerrado + casosPorSituacao.descartado
  const taxaEncerramentoPercentual =
    notificacoes.length > 0 ? Math.round((concluidos / notificacoes.length) * 100) : 0

  return {
    totalCasos: notificacoes.length,
    casosPorSituacao,
    casosPorPeriodicidade,
    casosPorTipoVigilancia,
    topAgravos,
    casosUltimos30Dias,
    casosUltimos7Dias,
    taxaEncerramentoPercentual,
  }
}
