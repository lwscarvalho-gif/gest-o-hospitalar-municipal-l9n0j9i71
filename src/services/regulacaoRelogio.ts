/**
 * MÓDULO DE RELÓGIO E TEMPO DE ESPERA DA CENTRAL DE REGULAÇÃO
 *
 * Diretrizes explícitas do Codex e requisitos de conformidade:
 * 1. FUSO HORÁRIO FIXO: America/Sao_Paulo (UTC-3).
 * 2. ORIGEM DO RELÓGIO: Momento exato da criação da solicitação (`data_hora_solicitacao` ou autodate `created`).
 * 3. ENCERRAMENTO DO RELÓGIO:
 *    - Quando `efetivada`: tempo cravado até `data_hora_efetivacao`.
 *    - Quando `cancelada`: tempo cravado até `data_hora_cancelamento`.
 *    - Quando `negada`: tempo cravado até `data_hora_avaliacao`.
 *    - Quando `solicitada` ou `em_avaliacao` ou `aceita`: relógio ativo correndo até o momento presente (`agora`).
 * 4. PAUSAS / RETOMADAS: Transições que indicam pausa (ex: motivo contendo "pausa" ou status em espera técnica)
 *    são amortizadas sem produzir valor negativo.
 * 5. TRATAMENTO DE BORDAS:
 *    - Datas ausentes, nulas ou strings corrompidas: fallback seguro para 0 min, status 'indeterminado', sem quebrar a tela.
 *    - Datas invertidas (fim antes do início): protegido com `Math.max(0, ...)`, impedindo valores negativos.
 *    - Virada de dia (ex: 23h50 -> 00h10): calculado em timestamp epoch absoluto em milissegundos, totalizando exatamente 20 minutos.
 * 6. ORDEM TRANSPARENTE DA FILA: Ordenação administrativa exclusivamente por data e prioridade humana já registrada,
 *    sem algoritmo preditivo ou escore clínico automático.
 */

import { CalculoTempoEspera, SituacaoRegulacao, ItemTransicaoRegulacao } from '@/types/hospital'

import {
  obterFusoHorarioAtivo,
  formatarDataHoraFuso,
  formatarHoraFuso,
  parseDataHoraSegura,
} from './dataFusoUnidade'

/**
 * Fuso horário da unidade parametrizável.
 * Default seguro de Mirante da Serra/RO: America/Porto_Velho (UTC-4).
 */
export const FUSO_HORARIO_REGULACAO = obterFusoHorarioAtivo()

/**
 * Converte data em formato brasileiro (DD/MM/AAAA, HH:mm:ss ou DD/MM/AAAA HH:mm)
 * ou formato ISO (YYYY-MM-DDTHH:mm:ssZ) para timestamp epoch em milissegundos.
 * NUNCA altera timestamps históricos persistidos.
 * Retorna null se for inválida ou vazia.
 */
export function converterParaTimestamp(dataStr?: string | null): number | null {
  const d = parseDataHoraSegura(dataStr)
  return d ? d.getTime() : null
}

export function converterParaTimestampLegado(dataStr?: string | null): number | null {
  if (!dataStr || typeof dataStr !== 'string') return null
  const limpa = dataStr.trim()
  if (!limpa) return null

  // Tenta interpretar formato DD/MM/AAAA [HH:mm[:ss]]
  const partesBr = limpa.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/,
  )
  if (partesBr) {
    const dia = parseInt(partesBr[1], 10)
    const mes = parseInt(partesBr[2], 10) - 1
    const ano = parseInt(partesBr[3], 10)
    const hora = partesBr[4] ? parseInt(partesBr[4], 10) : 0
    const minuto = partesBr[5] ? parseInt(partesBr[5], 10) : 0
    const segundo = partesBr[6] ? parseInt(partesBr[6], 10) : 0
    const d = new Date(ano, mes, dia, hora, minuto, segundo)
    const t = d.getTime()
    return isNaN(t) ? null : t
  }

  // Tenta formato ISO nativo
  const dIso = new Date(limpa)
  const tIso = dIso.getTime()
  return isNaN(tIso) ? null : tIso
}

/**
 * Formata minutos em string amigável (ex: "45m", "3h 15m", "2d 4h")
 */
export function formatarMinutosEspera(minutosTotais: number): string {
  if (isNaN(minutosTotais) || minutosTotais <= 0) return '0 min'

  const dias = Math.floor(minutosTotais / (60 * 24))
  const horas = Math.floor((minutosTotais % (60 * 24)) / 60)
  const minutos = Math.floor(minutosTotais % 60)

  if (dias > 0) {
    return `${dias}d ${horas}h ${minutos}m`
  }
  if (horas > 0) {
    return `${horas}h ${minutos}m`
  }
  return `${minutos} min`
}

export interface ParametrosCalculoEspera {
  situacao: SituacaoRegulacao
  dataHoraSolicitacao?: string | null
  created?: string | null
  dataHoraAvaliacao?: string | null
  dataHoraEfetivacao?: string | null
  dataHoraCancelamento?: string | null
  historicoTransicoes?: ItemTransicaoRegulacao[] | string | null
  tempoAlvoMinutos?: number
  agoraReferencia?: Date | number // Injeção de dependência para testes
}

/**
 * Calcula com precisão o tempo de espera individual de uma solicitação de regulação.
 * Garante nunca produzir valores negativos mesmo com datas invertidas ou ausentes.
 */
export function calcularTempoEsperaIndividual(params: ParametrosCalculoEspera): CalculoTempoEspera {
  const agoraMs =
    params.agoraReferencia instanceof Date
      ? params.agoraReferencia.getTime()
      : typeof params.agoraReferencia === 'number'
        ? params.agoraReferencia
        : Date.now()

  // 1. Origem do relógio: data_hora_solicitacao ou created
  const tsOrigem =
    converterParaTimestamp(params.dataHoraSolicitacao) || converterParaTimestamp(params.created)

  if (!tsOrigem) {
    return {
      minutosEsperaTotal: 0,
      minutosEsperaLiquida: 0, // mantido 0 mas com status 'indeterminado' que deve ser excluído de médias
      tempoFormatado: 'indisponível',
      dataOrigemIso: '',
      statusRelogio: 'indeterminado',
      alertaAtraso: false,
      dataInvalidaOuAusente: true,
      detalhesCalculo:
        'Data de solicitação ausente ou inválida (indisponível). Excluído de médias de espera.',
    }
  }

  // 2. Determinar ponto de encerramento do relógio conforme a situação
  let tsFim: number = agoraMs
  let statusRelogio: 'ativo' | 'pausado' | 'concluido' | 'cancelado' | 'indeterminado' = 'ativo'
  let motivoFim = 'Em andamento (relógio ativo)'

  if (params.situacao === 'efetivada') {
    statusRelogio = 'concluido'
    const tsEfet = converterParaTimestamp(params.dataHoraEfetivacao)
    if (tsEfet) {
      tsFim = tsEfet
      motivoFim = 'Finalizado na efetivação da transferência'
    } else {
      motivoFim = 'Efetivada (data de efetivação estimada)'
    }
  } else if (params.situacao === 'cancelada') {
    statusRelogio = 'cancelado'
    const tsCanc = converterParaTimestamp(params.dataHoraCancelamento)
    if (tsCanc) {
      tsFim = tsCanc
      motivoFim = 'Interrompido por cancelamento da solicitação'
    } else {
      motivoFim = 'Cancelada'
    }
  } else if (params.situacao === 'negada') {
    statusRelogio = 'concluido'
    const tsAval = converterParaTimestamp(params.dataHoraAvaliacao)
    if (tsAval) {
      tsFim = tsAval
      motivoFim = 'Concluído na recusa do regulador'
    }
  }

  // 3. Checar pausas no histórico de transições se houver
  let minutosPausados = 0
  let historicoArray: ItemTransicaoRegulacao[] = []
  if (params.historicoTransicoes) {
    try {
      historicoArray =
        typeof params.historicoTransicoes === 'string'
          ? JSON.parse(params.historicoTransicoes)
          : params.historicoTransicoes
    } catch {
      historicoArray = []
    }
  }

  // Se houver registro explícito de pausa e retomada
  let momentoPausa: number | null = null
  for (const tr of historicoArray) {
    const texto = `${tr.motivo || ''} ${tr.detalhes || ''}`.toLowerCase()
    const tsTr = converterParaTimestamp(tr.data_hora)
    if (!tsTr) continue

    if (
      texto.includes('pausa') ||
      texto.includes('suspenso') ||
      texto.includes('aguardando laudo externo')
    ) {
      if (!momentoPausa) momentoPausa = tsTr
    } else if (
      momentoPausa &&
      (texto.includes('retom') || texto.includes('reabert') || tr.para === 'em_avaliacao')
    ) {
      const diffPausa = Math.max(0, tsTr - momentoPausa)
      minutosPausados += Math.floor(diffPausa / (1000 * 60))
      momentoPausa = null
    }
  }

  // Se a solicitação ainda estiver pausada atualmente
  if (momentoPausa && statusRelogio === 'ativo') {
    statusRelogio = 'pausado'
    const diffPausa = Math.max(0, agoraMs - momentoPausa)
    minutosPausados += Math.floor(diffPausa / (1000 * 60))
  }

  // 4. Cálculo da diferença bruta com proteção estrita contra data invertida
  // Se tsFim < tsOrigem (data invertida), Math.max garante 0
  const diffMsBruta = Math.max(0, tsFim - tsOrigem)
  const minutosBrutos = Math.floor(diffMsBruta / (1000 * 60))

  // Minutos líquidos (descontando pausas amortizadas)
  const minutosLiquidos = Math.max(0, minutosBrutos - minutosPausados)

  // 5. Alerta de atraso baseado no tempo alvo do recurso parametrizado
  const tempoAlvo = params.tempoAlvoMinutos || 120 // padrão 2 horas se não parametrizado
  const alertaAtraso = statusRelogio === 'ativo' && minutosLiquidos > tempoAlvo

  const fusoAtivo = obterFusoHorarioAtivo()
  const horaOrigemFormatada = formatarHoraFuso(tsOrigem, fusoAtivo, true)

  return {
    minutosEsperaTotal: minutosBrutos,
    minutosEsperaLiquida: minutosLiquidos,
    tempoFormatado: formatarMinutosEspera(minutosLiquidos),
    dataOrigemIso: new Date(tsOrigem).toISOString(),
    dataFimIso: new Date(tsFim).toISOString(),
    statusRelogio,
    alertaAtraso,
    dataInvalidaOuAusente: false,
    detalhesCalculo: `Origem: ${horaOrigemFormatada} (fuso ${fusoAtivo}) • ${motivoFim} • Pausas: ${minutosPausados} min`,
  }
}

/**
 * Ordenação administrativa transparente da fila de regulação.
 * Critério público:
 * 1º - Prioridade clínica registrada pelo profissional (vermelho > amarelo > verde > azul).
 * 2º - Data de solicitação mais antiga (ordem cronológica de chegada FIFO).
 * Não altera nem cria qualquer escore clínico.
 */
export const PESO_PRIORIDADE_REGULACAO: Record<string, number> = {
  emergencia_vermelha: 4,
  urgencia_amarela: 3,
  prioritario_verde: 2,
  eletivo_azul: 1,
}

export function ordenarFilaAdministrativa<
  T extends { prioridade?: string; data_hora_solicitacao?: string; created?: string },
>(itens: T[]): T[] {
  return [...itens].sort((a, b) => {
    // 1º critério: prioridade humana
    const pesoA = PESO_PRIORIDADE_REGULACAO[a.prioridade || ''] || 0
    const pesoB = PESO_PRIORIDADE_REGULACAO[b.prioridade || ''] || 0
    if (pesoA !== pesoB) {
      return pesoB - pesoA // decrescente por gravidade humana
    }

    // 2º critério: cronológico (mais antigo primeiro na fila)
    const tsA =
      converterParaTimestamp(a.data_hora_solicitacao) || converterParaTimestamp(a.created) || 0
    const tsB =
      converterParaTimestamp(b.data_hora_solicitacao) || converterParaTimestamp(b.created) || 0
    return tsA - tsB
  })
}
