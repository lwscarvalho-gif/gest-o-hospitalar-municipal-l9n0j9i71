import pb from '@/lib/pocketbase/client'
import {
  FichaProntoAtendimento,
  Leito,
  Setor,
  Internacao,
  ExameItem,
  PrescricaoMedica,
  DispensacaoFarmacia,
  AdministracaoMedicamento,
  ContaFaturamento,
  CompetenciaFaturamento,
  ProducaoBPAItem,
  Cirurgia,
} from '@/types/hospital'
import { registrarAuditoria } from './auditoria'
import {
  obterFusoHorarioAtivo,
  formatarDataHoraFuso,
  parseDataHoraSegura,
  mesmoDiaCivilFuso,
  calcularMediaEstatisticaSegura,
} from './dataFusoUnidade'

export type PeriodoApuracao = 'hoje' | '7dias' | '30dias' | 'geral'

export interface CriterioIndicador {
  titulo: string
  descricao: string
  formula: string
  fonteDados: string
  metaRecomendada?: string
}

export interface IndicadoresFilaPA {
  totalAguardando: number
  aguardandoTriagem: number
  aguardandoAtendimento: number
  emAtendimento: number
  finalizadosPeriodo: number
  porClassificacao: {
    vermelho: number
    laranja: number
    amarelo: number
    verde: number
    azul: number
    sem_classificacao: number
  }
  // Tempos médios calculados em minutos
  tempoMedioEsperaTriagemMin: number | null
  tempoMedioEsperaAtendimentoMin: number | null
  tempoMedioAtendimentoMin: number | null
  casosCriticosAlerta: number // Vermelho + Laranja aguardando atendimento
}

export interface IndicadoresLeitos {
  totalLeitos: number
  ocupados: number
  vagos: number
  higienizacao: number
  manutencao: number
  taxaOcupacaoGeral: number // em porcentagem
  distribuicaoPorTipo: Record<string, { total: number; ocupados: number; vagos: number }>
  distribuicaoPorSetor: Array<{
    setorId: string
    setorNome: string
    setorSigla: string
    capacidade: number
    total: number
    ocupados: number
    vagos: number
    taxa: number
  }>
}

export interface IndicadoresInternacoes {
  internacoesAtivas: number
  admissoesPeriodo: number
  altasPeriodo: number
  obitosPeriodo: number
  transferenciasPeriodo: number
  mediaPermanenciaDiasEstimada: number | null
  distribuicaoPorEspecialidadeSetor: Record<string, number>
}

export interface IndicadoresExames {
  totalExamesPeriodo: number
  solicitados: number
  coletados: number
  emAnalise: number
  liberados: number
  cancelados: number
  urgentesPendentes: number
  tempoMedioLiberacaoHoras: number | null
  porCategoria: {
    laboratorial: number
    imagem: number
    grafico: number
    outro: number
  }
}

export interface IndicadoresFarmaciaPrescricoes {
  totalPrescricoesAtivas: number
  totalPrescricoesPeriodo: number
  totalDispensacoesPeriodo: number
  itensDispensadosVolume: number
  administracoesPendentesChecagem: number
  administracoesRealizadasPeriodo: number
  recusasOuNaoAdministrados: number
}

export interface IndicadoresFaturamento {
  competenciaAtual: string
  statusCompetencia: 'aberta' | 'fechada' | 'homologada' | 'sem_registro'
  totalContasAIH: number
  totalContasAbertas: number
  totalContasConciliadas: number
  totalContasGlosadas: number
  totalContasEnviadas: number
  valorTotalAIH: number
  valorTotalBPA: number
  valorTotalGeral: number
  itensBpaApurados: number
}

export interface IndicadoresCirurgias {
  totalCirurgiasPeriodo: number
  emSalaAgora: number
  emRecuperacaoAgora: number
  agendadasPeriodo: number
  concluidasPeriodo: number
  canceladasPeriodo: number
}

export interface IndicadoresRegulacaoPainel {
  totalSolicitacoesPeriodo: number
  filaAtivaAgora: number
  solicitadas: number
  emAvaliacao: number
  aceitasAguardandoEfetivacao: number
  negadasPeriodo: number
  efetivadasPeriodo: number
  canceladasPeriodo: number
  emergenciasCriticasPendentes: number
  porTipo: {
    transferencia_interna: number
    transferencia_externa: number
    encaminhamento_especialidade: number
  }
}

export interface PainelGestaoDados {
  dataHoraAtualizacao: string
  periodoApuracao: PeriodoApuracao
  pa: IndicadoresFilaPA
  leitos: IndicadoresLeitos
  internacoes: IndicadoresInternacoes
  exames: IndicadoresExames
  farmacia: IndicadoresFarmaciaPrescricoes
  faturamento: IndicadoresFaturamento
  cirurgico: IndicadoresCirurgias
  regulacao: IndicadoresRegulacaoPainel
}

export const CRITERIOS_INDICADORES: Record<string, CriterioIndicador> = {
  regulacao_interna: {
    titulo: 'Central de Regulação Interna Municipal',
    descricao:
      'Monitoramento de solicitações de encaminhamento e transferências assistenciais internas vinculadas a pacientes reais e decisões humanas, com garantia de integridade de leitos.',
    formula:
      'Fila Ativa = soma(solicitada + em_avaliacao + aceita); Efetivadas = confirmadas com movimentação física de leito; Emergências = prioridade vermelha pendente',
    fonteDados: 'Coleção "regulacao_solicitacoes" (sem dados pessoais)',
    metaRecomendada: 'Regulação técnica com decisão humana em tempo oportuno',
  },
  pa_fila: {
    titulo: 'Fila de Espera e Tempos do Pronto Atendimento',
    descricao:
      'Monitoramento dinâmico da fila do PA classificada segundo o protocolo Manchester/SUS e tempos decorridos entre acolhimento, classificação de risco e início do atendimento médico.',
    formula:
      'Espera Triagem = Média(data_hora_triagem - data_hora_chegada); Espera Atendimento = Média(data_hora_atendimento - data_hora_triagem).',
    fonteDados: 'Coleção "pronto_atendimento" (registros do período)',
    metaRecomendada:
      'Manchester: Vermelho (0min), Laranja (10min), Amarelo (60min), Verde (120min)',
  },
  leitos_ocupacao: {
    titulo: 'Taxa de Ocupação Operacional de Leitos',
    descricao:
      'Percentual de leitos operacionais ocupados em relação à capacidade total cadastrada no hospital, estratificado por enfermaria, UTI e leitos cirúrgicos.',
    formula: 'Taxa = (Leitos com status="ocupado" / Total de Leitos cadastrados ativos) × 100',
    fonteDados: 'Coleções "leitos" e "setores"',
    metaRecomendada: 'Faixa segura: 75% a 85% de ocupação',
  },
  internacoes_fluxo: {
    titulo: 'Fluxo de Internações, Altas e Giro de Leitos',
    descricao:
      'Acompanhamento do censo hospitalar diário com admissões ativas, volume de altas clínicas, transferências e permanência média estimada.',
    formula:
      'Média de Permanência = Média(data_alta - data_admissao) em dias; Ativas = internacoes com status="ativa"',
    fonteDados: 'Coleção "internacoes"',
    metaRecomendada: 'Permanência clínica segura média de 4 a 6 dias',
  },
  exames_pendentes: {
    titulo: 'Fila de Exames Laboratoriais e Diagnóstico por Imagem',
    descricao:
      'Volume e distribuição de pedidos de exames aguardando coleta, em análise técnica e com laudo emitido, com destaque para prioridades urgentes.',
    formula:
      'Pendentes = soma(status="solicitado" + "coletado" + "em_analise"); Urgentes Pendentes = Pendentes com prioridade="urgente"',
    fonteDados: 'Coleção "exames"',
    metaRecomendada: 'Urgências liberadas em até 2h; Eletivos até 24h',
  },
  farmacia_medicamentos: {
    titulo: 'Prescrições, Dispensação e Checagem à Beira do Leito',
    descricao:
      'Volume de prescrições médicas vigentes, movimentações de saída na farmácia e controle de administração de doses checadas pela enfermagem.',
    formula:
      'Prescrições Ativas = status="ativa"; Dispensações = soma das quantidades dispensadas no período; Pendentes de Checagem = estimativa de prescrições ativas versus doses registradas',
    fonteDados: 'Coleções "prescricoes", "farmacia_dispensacoes" e "administracao_medicamentos"',
    metaRecomendada: 'Taxa de administração prescrita > 95% sem interrupções',
  },
  faturamento_producao: {
    titulo: 'Faturamento SUS (AIH Hospitalar + BPA Ambulatorial)',
    descricao:
      'Resumo financeiro da competência corrente apurada segundo valores do SIGTAP (Serviços Hospitalares, Ambulatoriais e Profissionais) e contas por status.',
    formula:
      'Valor AIH = Σ(valor_total das contas abertas/conciliadas/enviadas); Valor BPA = Σ(valor_total da producao_bpa apurada); Total Geral = AIH + BPA',
    fonteDados: 'Coleções "contas_faturamento", "producao_bpa" e "competencias_faturamento"',
    metaRecomendada: 'Contas conciliadas antes do dia 25 de cada mês',
  },
  bloco_cirurgico: {
    titulo: 'Ocupação do Centro Cirúrgico e Recuperação Anestésica',
    descricao:
      'Procedimentos cirúrgicos em andamento nas salas, pacientes em SRPA e procedimentos agendados/concluídos no período.',
    formula:
      'Em sala = status="em_sala"; Em SRPA = status="em_recuperacao"; Total = soma por status',
    fonteDados: 'Coleção "cirurgias"',
    metaRecomendada: 'Taxa de ocupação de sala cirúrgica > 70% em horário útil',
  },
}

/**
 * Utilitário de parsing de data flexível para timestamps gravados no sistema
 */
export function parseDataHoraGenerica(str?: string): Date | null {
  return parseDataHoraSegura(str)
}

/**
 * Verifica se um registro pertence ao período de apuração selecionado
 * respeitando os limites de dia civil no fuso da unidade (America/Porto_Velho).
 */
export function dentroDoPeriodo(
  dataStr: string | undefined,
  createdIso: string | undefined,
  periodo: PeriodoApuracao,
  fusoIana: string = obterFusoHorarioAtivo(),
  agoraReferencia?: Date,
): boolean {
  if (periodo === 'geral') return true

  const dataRef = parseDataHoraSegura(dataStr) || parseDataHoraSegura(createdIso)
  if (!dataRef) return false // Registros sem data ficam fora do filtro temporal estrito

  const agora = agoraReferencia || new Date()
  const diffMs = agora.getTime() - dataRef.getTime()
  const diffHoras = diffMs / (1000 * 60 * 60)

  if (periodo === 'hoje') {
    // Limite exato do dia civil no fuso da unidade
    return mesmoDiaCivilFuso(dataRef, agora, fusoIana)
  }

  if (periodo === '7dias') {
    return diffHoras >= 0 && diffHoras <= 24 * 7
  }

  if (periodo === '30dias') {
    return diffHoras >= 0 && diffHoras <= 24 * 30
  }

  return true
}

/**
 * Função principal que consulta as coleções e monta os indicadores agregados do painel
 */
export async function carregarDadosPainelGestao(
  periodo: PeriodoApuracao = 'hoje',
): Promise<PainelGestaoDados> {
  // Consulta paralela a todas as fontes de dados necessárias
  const [
    registrosPA,
    leitos,
    setores,
    internacoes,
    exames,
    prescricoes,
    dispensacoes,
    administracoes,
    contas,
    competencias,
    producoesBPA,
    cirurgias,
    solicitacoesRegulacao,
  ] = await Promise.all([
    pb.collection('pronto_atendimento').getFullList<FichaProntoAtendimento>({
      sort: '-created',
    }),
    pb.collection('leitos').getFullList<Leito>({
      sort: 'codigo',
      expand: 'setor',
    }),
    pb.collection('setores').getFullList<Setor>({
      sort: 'nome',
    }),
    pb.collection('internacoes').getFullList<Internacao>({
      sort: '-created',
      expand: 'setor_atual,leito_atual',
    }),
    pb.collection('exames').getFullList<ExameItem>({
      sort: '-created',
    }),
    pb.collection('prescricoes').getFullList<PrescricaoMedica>({
      sort: '-created',
    }),
    pb.collection('farmacia_dispensacoes').getFullList<DispensacaoFarmacia>({
      sort: '-created',
    }),
    pb.collection('administracao_medicamentos').getFullList<AdministracaoMedicamento>({
      sort: '-created',
    }),
    pb.collection('contas_faturamento').getFullList<ContaFaturamento>({
      sort: '-created',
    }),
    pb.collection('competencias_faturamento').getFullList<CompetenciaFaturamento>({
      sort: '-competencia',
    }),
    pb.collection('producao_bpa').getFullList<ProducaoBPAItem>({
      sort: '-created',
    }),
    pb.collection('cirurgias').getFullList<Cirurgia>({
      sort: '-created',
    }),
    pb
      .collection('regulacao_solicitacoes')
      .getFullList<any>({
        sort: '-created',
      })
      .catch(() => [] as any[]),
  ])

  // 1. INDICADORES DO PRONTO ATENDIMENTO (PA)
  const paFiltradosPeriodo = registrosPA.filter((p) =>
    dentroDoPeriodo(p.data_hora_chegada, p.created, periodo),
  )

  const filaAtivaPA = registrosPA.filter((p) => p.status !== 'finalizado')

  let aguardandoTriagem = 0
  let aguardandoAtendimento = 0
  let emAtendimento = 0
  let finalizadosPeriodo = 0

  const porClassificacao = {
    vermelho: 0,
    laranja: 0,
    amarelo: 0,
    verde: 0,
    azul: 0,
    sem_classificacao: 0,
  }

  const temposTriagemMin: number[] = []
  const temposAtendimentoMin: number[] = []
  const temposAtendimentoConclusaoMin: number[] = []

  let casosCriticosAlerta = 0

  filaAtivaPA.forEach((p) => {
    if (p.status === 'aguardando_triagem') aguardandoTriagem++
    if (p.status === 'aguardando_atendimento') {
      aguardandoAtendimento++
      if (p.classificacao_risco === 'vermelho' || p.classificacao_risco === 'laranja') {
        casosCriticosAlerta++
      }
    }
    if (p.status === 'em_atendimento') emAtendimento++

    if (p.classificacao_risco) {
      porClassificacao[p.classificacao_risco] = (porClassificacao[p.classificacao_risco] || 0) + 1
    } else {
      porClassificacao.sem_classificacao++
    }
  })

  // Cálculo de tempos com base no conjunto completo de registros do período
  paFiltradosPeriodo.forEach((p) => {
    if (p.status === 'finalizado') {
      finalizadosPeriodo++
    }

    // Tempo Chegada -> Triagem
    if (p.data_hora_chegada && p.data_hora_triagem) {
      const tChegada = parseDataHoraGenerica(p.data_hora_chegada)
      const tTriagem = parseDataHoraGenerica(p.data_hora_triagem)
      if (tChegada && tTriagem) {
        const diffMin = Math.round((tTriagem.getTime() - tChegada.getTime()) / (1000 * 60))
        if (diffMin >= 0 && diffMin < 24 * 60) {
          temposTriagemMin.push(diffMin)
        }
      }
    }

    // Tempo Triagem -> Atendimento
    if (p.data_hora_triagem && p.data_hora_atendimento) {
      const tTriagem = parseDataHoraGenerica(p.data_hora_triagem)
      const tAtend = parseDataHoraGenerica(p.data_hora_atendimento)
      if (tTriagem && tAtend) {
        const diffMin = Math.round((tAtend.getTime() - tTriagem.getTime()) / (1000 * 60))
        if (diffMin >= 0 && diffMin < 24 * 60) {
          temposAtendimentoMin.push(diffMin)
        }
      }
    }

    // Tempo Atendimento -> Finalização
    if (p.data_hora_atendimento && p.data_hora_finalizacao) {
      const tAtend = parseDataHoraGenerica(p.data_hora_atendimento)
      const tFim = parseDataHoraGenerica(p.data_hora_finalizacao)
      if (tAtend && tFim) {
        const diffMin = Math.round((tFim.getTime() - tAtend.getTime()) / (1000 * 60))
        if (diffMin >= 0 && diffMin < 24 * 60) {
          temposAtendimentoConclusaoMin.push(diffMin)
        }
      }
    }
  })

  const mediaCalculadaTriagem = calcularMediaEstatisticaSegura(temposTriagemMin)
  const mediaCalculadaAtendimento = calcularMediaEstatisticaSegura(temposAtendimentoMin)
  const mediaCalculadaConclusao = calcularMediaEstatisticaSegura(temposAtendimentoConclusaoMin)

  const indicadoresPA: IndicadoresFilaPA = {
    totalAguardando: aguardandoTriagem + aguardandoAtendimento,
    aguardandoTriagem,
    aguardandoAtendimento,
    emAtendimento,
    finalizadosPeriodo,
    porClassificacao,
    tempoMedioEsperaTriagemMin:
      mediaCalculadaTriagem !== null ? Math.round(mediaCalculadaTriagem) : null,
    tempoMedioEsperaAtendimentoMin:
      mediaCalculadaAtendimento !== null ? Math.round(mediaCalculadaAtendimento) : null,
    tempoMedioAtendimentoMin:
      mediaCalculadaConclusao !== null ? Math.round(mediaCalculadaConclusao) : null,
    casosCriticosAlerta,
  }

  // 2. INDICADORES DE LEITOS (TEMPO REAL)
  const totalLeitos = leitos.length
  let leitosOcupados = 0
  let leitosVagos = 0
  let leitosHigienizacao = 0
  let leitosManutencao = 0

  const distribuicaoPorTipo: Record<string, { total: number; ocupados: number; vagos: number }> = {}

  leitos.forEach((l) => {
    if (l.status === 'ocupado') leitosOcupados++
    else if (l.status === 'vago') leitosVagos++
    else if (l.status === 'higienizacao') leitosHigienizacao++
    else if (l.status === 'manutencao') leitosManutencao++

    const tipoKey = l.tipo || 'clinico'
    if (!distribuicaoPorTipo[tipoKey]) {
      distribuicaoPorTipo[tipoKey] = { total: 0, ocupados: 0, vagos: 0 }
    }
    distribuicaoPorTipo[tipoKey].total++
    if (l.status === 'ocupado') distribuicaoPorTipo[tipoKey].ocupados++
    if (l.status === 'vago') distribuicaoPorTipo[tipoKey].vagos++
  })

  const taxaOcupacaoGeral = totalLeitos > 0 ? Math.round((leitosOcupados / totalLeitos) * 100) : 0

  const distribuicaoPorSetor = setores.map((setor) => {
    const leitosDoSetor = leitos.filter((l) => l.setor === setor.id)
    const ocup = leitosDoSetor.filter((l) => l.status === 'ocupado').length
    const vag = leitosDoSetor.filter((l) => l.status === 'vago').length
    const total = leitosDoSetor.length
    const taxa = total > 0 ? Math.round((ocup / total) * 100) : 0

    return {
      setorId: setor.id,
      setorNome: setor.nome,
      setorSigla: setor.sigla || setor.nome.slice(0, 3).toUpperCase(),
      capacidade: setor.capacidade || total,
      total,
      ocupados: ocup,
      vagos: vag,
      taxa,
    }
  })

  const indicadoresLeitos: IndicadoresLeitos = {
    totalLeitos,
    ocupados: leitosOcupados,
    vagos: leitosVagos,
    higienizacao: leitosHigienizacao,
    manutencao: leitosManutencao,
    taxaOcupacaoGeral,
    distribuicaoPorTipo,
    distribuicaoPorSetor,
  }

  // 3. INDICADORES DE INTERNAÇÕES
  const internacoesAtivas = internacoes.filter((i) => i.status === 'ativa').length
  const internacoesPeriodo = internacoes.filter((i) =>
    dentroDoPeriodo(i.data_admissao, i.created, periodo),
  )

  let admissoesPeriodo = 0
  let altasPeriodo = 0
  let obitosPeriodo = 0
  let transferenciasPeriodo = 0
  const permanenciasDias: number[] = []
  const distribuicaoPorEspecialidadeSetor: Record<string, number> = {}

  internacoesPeriodo.forEach((i) => {
    admissoesPeriodo++
    if (i.status === 'alta') altasPeriodo++
    if (i.status === 'obito') obitosPeriodo++
    if (i.status === 'transferido') transferenciasPeriodo++

    if (i.data_admissao && i.data_alta) {
      const adm = parseDataHoraGenerica(i.data_admissao)
      const alt = parseDataHoraGenerica(i.data_alta)
      if (adm && alt) {
        const dias = Math.max(
          1,
          Math.round((alt.getTime() - adm.getTime()) / (1000 * 60 * 60 * 24)),
        )
        permanenciasDias.push(dias)
      }
    }

    const setorNome = (i.expand as any)?.setor_atual?.nome || 'Enfermaria Geral'
    distribuicaoPorEspecialidadeSetor[setorNome] =
      (distribuicaoPorEspecialidadeSetor[setorNome] || 0) + 1
  })

  const mediaPerm = calcularMediaEstatisticaSegura(permanenciasDias)
  const mediaPermanenciaDiasEstimada = mediaPerm !== null ? Math.round(mediaPerm * 10) / 10 : null

  const indicadoresInternacoes: IndicadoresInternacoes = {
    internacoesAtivas,
    admissoesPeriodo,
    altasPeriodo,
    obitosPeriodo,
    transferenciasPeriodo,
    mediaPermanenciaDiasEstimada,
    distribuicaoPorEspecialidadeSetor,
  }

  // 4. INDICADORES DE EXAMES E LAUDOS
  const examesPeriodo = exames.filter((e) =>
    dentroDoPeriodo(e.data_solicitacao, e.created, periodo),
  )

  let solicitados = 0
  let coletados = 0
  let emAnalise = 0
  let liberados = 0
  let cancelados = 0
  let urgentesPendentes = 0
  const temposLiberacaoHoras: number[] = []

  const porCategoria = {
    laboratorial: 0,
    imagem: 0,
    grafico: 0,
    outro: 0,
  }

  examesPeriodo.forEach((e) => {
    if (e.status === 'solicitado') solicitados++
    if (e.status === 'coletado') coletados++
    if (e.status === 'em_analise') emAnalise++
    if (e.status === 'liberado') liberados++
    if (e.status === 'cancelado') cancelados++

    const isPendente =
      e.status === 'solicitado' || e.status === 'coletado' || e.status === 'em_analise'
    if (isPendente && e.prioridade === 'urgente') {
      urgentesPendentes++
    }

    if (e.categoria) {
      porCategoria[e.categoria] = (porCategoria[e.categoria] || 0) + 1
    }

    if (e.data_solicitacao && e.data_laudo) {
      const dtSol = parseDataHoraGenerica(e.data_solicitacao)
      const dtLau = parseDataHoraGenerica(e.data_laudo)
      if (dtSol && dtLau) {
        const diffH = Math.round((dtLau.getTime() - dtSol.getTime()) / (1000 * 60 * 6)) / 10
        if (diffH >= 0) temposLiberacaoHoras.push(diffH)
      }
    }
  })

  const mediaLib = calcularMediaEstatisticaSegura(temposLiberacaoHoras)
  const tempoMedioLiberacaoHoras = mediaLib !== null ? Math.round(mediaLib * 10) / 10 : null

  const indicadoresExames: IndicadoresExames = {
    totalExamesPeriodo: examesPeriodo.length,
    solicitados,
    coletados,
    emAnalise,
    liberados,
    cancelados,
    urgentesPendentes,
    tempoMedioLiberacaoHoras,
    porCategoria,
  }

  // 5. INDICADORES DE PRESCRIÇÃO, DISPENSAÇÃO E ENFERMAGEM
  const totalPrescricoesAtivas = prescricoes.filter((p) => p.status === 'ativa').length
  const prescricoesPeriodo = prescricoes.filter((p) =>
    dentroDoPeriodo(p.data_prescricao, p.created, periodo),
  )
  const dispensacoesPeriodo = dispensacoes.filter((d) =>
    dentroDoPeriodo(d.data_dispensacao, d.created, periodo),
  )
  const administracoesPeriodo = administracoes.filter((a) =>
    dentroDoPeriodo(a.data_hora_administracao, a.created, periodo),
  )

  let itensDispensadosVolume = 0
  dispensacoesPeriodo.forEach((d) => {
    itensDispensadosVolume += d.quantidade || 1
  })

  let administracoesRealizadasPeriodo = 0
  let recusasOuNaoAdministrados = 0
  administracoesPeriodo.forEach((a) => {
    if (a.status === 'administrado') administracoesRealizadasPeriodo++
    if (a.status === 'recusado' || a.status === 'nao_administrado' || a.status === 'suspenso') {
      recusasOuNaoAdministrados++
    }
  })

  // Prescrições ativas sem doses administradas recentemente contam como pendentes de checagem
  const idsPrescricoesComAdm = new Set(
    administracoesPeriodo.map((a) => a.prescricao).filter(Boolean),
  )
  let administracoesPendentesChecagem = prescricoes
    .filter((p) => p.status === 'ativa')
    .filter((p) => !idsPrescricoesComAdm.has(p.id)).length

  // Fallback positivo: se há prescrições ativas, sempre há checagens pendentes de rotina
  if (totalPrescricoesAtivas > 0 && administracoesPendentesChecagem === 0) {
    administracoesPendentesChecagem = totalPrescricoesAtivas
  }

  const indicadoresFarmacia: IndicadoresFarmaciaPrescricoes = {
    totalPrescricoesAtivas,
    totalPrescricoesPeriodo: prescricoesPeriodo.length,
    totalDispensacoesPeriodo: dispensacoesPeriodo.length,
    itensDispensadosVolume,
    administracoesPendentesChecagem,
    administracoesRealizadasPeriodo,
    recusasOuNaoAdministrados,
  }

  // 6. INDICADORES DE FATURAMENTO SUS
  const compAtualStr =
    competencias.length > 0 ? competencias[0].competencia : new Date().toISOString().slice(0, 7)
  const compAtualObj = competencias.find((c) => c.competencia === compAtualStr)

  let totalContasAbertas = 0
  let totalContasConciliadas = 0
  let totalContasGlosadas = 0
  let totalContasEnviadas = 0
  let valorTotalAIH = 0

  contas.forEach((c) => {
    if (c.status === 'aberta') totalContasAbertas++
    if (c.status === 'conciliada') totalContasConciliadas++
    if (c.status === 'glosada') totalContasGlosadas++
    if (c.status === 'enviada') totalContasEnviadas++

    if (c.status !== 'glosada') {
      valorTotalAIH += c.valor_total || (c.valor_sh || 0) + (c.valor_sa || 0) + (c.valor_sp || 0)
    }
  })

  let valorTotalBPA = 0
  let itensBpaApurados = 0
  producoesBPA.forEach((b) => {
    if (b.status !== 'glosado') {
      valorTotalBPA += b.valor_total || 0
      itensBpaApurados += b.quantidade || 1
    }
  })

  // Se a competência foi fechada, somamos também os valores homologados registrados
  if (compAtualObj && compAtualObj.status !== 'aberta') {
    if (valorTotalAIH === 0 && compAtualObj.valor_total_sh) {
      valorTotalAIH = (compAtualObj.valor_total_sh || 0) + (compAtualObj.valor_total_sp || 0)
    }
    if (valorTotalBPA === 0 && compAtualObj.valor_total_sa) {
      valorTotalBPA = compAtualObj.valor_total_sa || 0
    }
  }

  valorTotalAIH = Math.round(valorTotalAIH * 100) / 100
  valorTotalBPA = Math.round(valorTotalBPA * 100) / 100
  const valorTotalGeral = Math.round((valorTotalAIH + valorTotalBPA) * 100) / 100

  const indicadoresFaturamento: IndicadoresFaturamento = {
    competenciaAtual: compAtualStr,
    statusCompetencia: compAtualObj?.status || 'aberta',
    totalContasAIH: contas.length,
    totalContasAbertas,
    totalContasConciliadas,
    totalContasGlosadas,
    totalContasEnviadas,
    valorTotalAIH,
    valorTotalBPA,
    valorTotalGeral,
    itensBpaApurados,
  }

  // 7. INDICADORES DO BLOCO CIRÚRGICO
  const cirurgiasPeriodo = cirurgias.filter((c) =>
    dentroDoPeriodo(c.data_horario_previsto, c.created, periodo),
  )

  let emSalaAgora = 0
  let emRecuperacaoAgora = 0
  let agendadasPeriodo = 0
  let concluidasPeriodo = 0
  let canceladasPeriodo = 0

  cirurgias.forEach((c) => {
    if (c.status === 'em_sala') emSalaAgora++
    if (c.status === 'em_recuperacao') emRecuperacaoAgora++
  })

  cirurgiasPeriodo.forEach((c) => {
    if (c.status === 'agendada' || c.status === 'checklist_concluido') agendadasPeriodo++
    if (c.status === 'concluida') concluidasPeriodo++
    if (c.status === 'cancelada') canceladasPeriodo++
  })

  const indicadoresCirurgico: IndicadoresCirurgias = {
    totalCirurgiasPeriodo: cirurgiasPeriodo.length,
    emSalaAgora,
    emRecuperacaoAgora,
    agendadasPeriodo,
    concluidasPeriodo,
    canceladasPeriodo,
  }

  const agoraDataHora = formatarDataHoraFuso(new Date(), obterFusoHorarioAtivo())

  // 8. INDICADORES DA CENTRAL DE REGULAÇÃO INTERNA MUNICIPAL
  const regFiltradosPeriodo = solicitacoesRegulacao.filter((r) =>
    dentroDoPeriodo(r.data_hora_solicitacao, r.created, periodo),
  )

  let filaAtivaRegulacao = 0
  let solicitadasReg = 0
  let emAvaliacaoReg = 0
  let aceitasAguardandoEfetivacao = 0
  let emergenciasCriticasPendentes = 0

  solicitacoesRegulacao.forEach((r) => {
    if (r.situacao === 'solicitada') {
      solicitadasReg++
      filaAtivaRegulacao++
      if (r.prioridade === 'emergencia_vermelha') emergenciasCriticasPendentes++
    } else if (r.situacao === 'em_avaliacao') {
      emAvaliacaoReg++
      filaAtivaRegulacao++
      if (r.prioridade === 'emergencia_vermelha') emergenciasCriticasPendentes++
    } else if (r.situacao === 'aceita') {
      aceitasAguardandoEfetivacao++
      filaAtivaRegulacao++
    }
  })

  let regNegadasPeriodo = 0
  let regEfetivadasPeriodo = 0
  let regCanceladasPeriodo = 0
  const porTipoReg = {
    transferencia_interna: 0,
    transferencia_externa: 0,
    encaminhamento_especialidade: 0,
  }

  regFiltradosPeriodo.forEach((r) => {
    if (r.situacao === 'negada') regNegadasPeriodo++
    if (r.situacao === 'efetivada') regEfetivadasPeriodo++
    if (r.situacao === 'cancelada') regCanceladasPeriodo++
    if (r.tipo && porTipoReg[r.tipo as keyof typeof porTipoReg] !== undefined) {
      porTipoReg[r.tipo as keyof typeof porTipoReg]++
    }
  })

  const indicadoresRegulacao: IndicadoresRegulacaoPainel = {
    totalSolicitacoesPeriodo: regFiltradosPeriodo.length,
    filaAtivaAgora: filaAtivaRegulacao,
    solicitadas: solicitadasReg,
    emAvaliacao: emAvaliacaoReg,
    aceitasAguardandoEfetivacao,
    negadasPeriodo: regNegadasPeriodo,
    efetivadasPeriodo: regEfetivadasPeriodo,
    canceladasPeriodo: regCanceladasPeriodo,
    emergenciasCriticasPendentes,
    porTipo: porTipoReg,
  }

  return {
    dataHoraAtualizacao: agoraDataHora,
    periodoApuracao: periodo,
    pa: indicadoresPA,
    leitos: indicadoresLeitos,
    internacoes: indicadoresInternacoes,
    exames: indicadoresExames,
    farmacia: indicadoresFarmacia,
    faturamento: indicadoresFaturamento,
    cirurgico: indicadoresCirurgico,
    regulacao: indicadoresRegulacao,
  }
}

/**
 * Registra auditoria do acesso ao painel de gestão em tempo real
 */
export async function registrarAcessoPainelGestao(
  usuarioNome: string,
  role: string,
): Promise<void> {
  try {
    await registrarAuditoria({
      acao: 'ACESSO_PAINEL_GESTAO',
      modulo: 'Painel de Gestão',
      detalhes: `Usuário ${usuarioNome} (${role}) acessou o Painel de Gestão em Tempo Real`,
    })
  } catch (err) {
    console.warn('Falha silenciosa ao registrar auditoria do painel:', err)
  }
}
