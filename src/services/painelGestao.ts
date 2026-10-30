import pb from '@/lib/pocketbase/client'
import { registrarAuditoria } from './auditoria'
import { obterFusoHorarioAtivo, parseDataHoraSegura, mesmoDiaCivilFuso } from './dataFusoUnidade'

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
 * Consulta os indicadores agregados do painel exclusivamente no servidor
 * via endpoint /backend/v1/painel/indicadores.
 *
 * REGRA ESTRITA DE SEGURANÇA E PRIVACIDADE LGPD (v0.0.43):
 * - A agregação ocorre 100% no servidor (PocketBase pb_hook).
 * - NENHUM fallback baixa registros clínicos, pacientes, fichas de PA, internações,
 *   prescrições, exames, dispensações, cirurgias ou contas financeiras no navegador.
 * - Em caso de falha/404/403/timeout do endpoint agregado:
 *   a exceção é lançada diretamente para que o cliente preserve o último resultado
 *   autorizado válido (exibindo aviso de estado desatualizado com timestamp)
 *   ou sinalize indisponível quando não há resultado prévio.
 * - NUNCA contorna controle de acesso nem expõe dados clínicos ou pessoais detalhados.
 */
export async function carregarDadosPainelGestao(
  periodo: PeriodoApuracao = 'hoje',
): Promise<PainelGestaoDados> {
  const resServidor = await pb.send<PainelGestaoDados>(
    `/backend/v1/painel/indicadores?periodo=${encodeURIComponent(periodo)}`,
    { method: 'GET' },
  )

  if (resServidor && resServidor.pa && resServidor.leitos) {
    return resServidor
  }

  throw new Error('Resposta inválida ou incompleta do endpoint agregado do painel de gestão.')
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
