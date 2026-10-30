/**
 * SERVIÇO DE CONFIGURAÇÃO E MANIPULAÇÃO DE FUSO HORÁRIO E DATAS POR UNIDADE
 *
 * Diretrizes do Codex (v0.0.24):
 * 1. Fuso horário operacional da unidade: 'America/Porto_Velho' para Mirante da Serra/RO (UTC-4).
 * 2. Parametrizável de forma controlada (configurável por unidade, com default seguro).
 * 3. Timestamps persistidos em UTC e conversão estrita apenas na apresentação/filtros de dia/competência.
 * 4. NUNCA reescrever timestamps históricos.
 * 5. Datas ausentes, nulas ou inconsistentes:
 *    - Apresentadas como "Indisponível" (ou "indisponível").
 *    - Ficam estritamente FORA do cálculo de médias de indicadores, sem virar zero que falseie indicadores.
 *    - Sinalizam inconsistência sem inventar valores.
 */

export interface UnidadeFusoConfig {
  codigoUnidade: string
  nomeUnidade: string
  fusoIana: string
  uf: string
  municipio: string
}

/**
 * Tabela de unidades e fusos homologados.
 * Default seguro do município de operação: Mirante da Serra/RO = America/Porto_Velho (UTC-4).
 */
export const UNIDADES_FUSO_HOMOLOGADAS: Record<string, UnidadeFusoConfig> = {
  mirante_da_serra: {
    codigoUnidade: 'mirante_da_serra',
    nomeUnidade: 'Hospital Municipal de Mirante da Serra',
    fusoIana: 'America/Porto_Velho',
    uf: 'RO',
    municipio: 'Mirante da Serra',
  },
  central_porto_velho: {
    codigoUnidade: 'central_porto_velho',
    nomeUnidade: 'Central Reguladora Estadual - Rondônia',
    fusoIana: 'America/Porto_Velho',
    uf: 'RO',
    municipio: 'Porto Velho',
  },
  referencia_nacional: {
    codigoUnidade: 'referencia_nacional',
    nomeUnidade: 'Unidade Referência Brasília / Ministério da Saúde',
    fusoIana: 'America/Sao_Paulo',
    uf: 'DF',
    municipio: 'Brasília',
  },
}

export const FUSO_PADRAO_SISTEMA = 'America/Porto_Velho'
export const UNIDADE_PADRAO_SISTEMA = 'mirante_da_serra'

// Armazenamento em memória / local storage para fuso ativo
let unidadeAtivaId: string = UNIDADE_PADRAO_SISTEMA

export function obterUnidadeFusoAtiva(): UnidadeFusoConfig {
  return (
    UNIDADES_FUSO_HOMOLOGADAS[unidadeAtivaId] || UNIDADES_FUSO_HOMOLOGADAS[UNIDADE_PADRAO_SISTEMA]
  )
}

export function obterFusoHorarioAtivo(): string {
  return obterUnidadeFusoAtiva().fusoIana
}

export function definirUnidadeFusoAtiva(codigoUnidade: string): UnidadeFusoConfig {
  if (UNIDADES_FUSO_HOMOLOGADAS[codigoUnidade]) {
    unidadeAtivaId = codigoUnidade
  }
  return obterUnidadeFusoAtiva()
}

/**
 * Parser de datas e timestamps robusto que aceita:
 * - ISO 8601 (YYYY-MM-DDTHH:mm:ssZ ou com offset)
 * - BR com hora (DD/MM/YYYY, HH:mm:ss ou DD/MM/YYYY HH:mm)
 * - BR date-only (DD/MM/YYYY)
 * - ISO date-only (YYYY-MM-DD)
 * - Epoch timestamp (número ou string numérica)
 * Retorna Date válida ou null se ausente/inválida.
 */
export function parseDataHoraSegura(valor?: string | number | Date | null): Date | null {
  if (valor === undefined || valor === null) return null
  if (valor instanceof Date) {
    return isNaN(valor.getTime()) ? null : valor
  }
  if (typeof valor === 'number') {
    if (isNaN(valor) || valor <= 0) return null
    const d = new Date(valor)
    return isNaN(d.getTime()) ? null : d
  }

  const s = String(valor).trim()
  if (!s || s === 'null' || s === 'undefined' || s === 'N/A' || s === '0') return null

  // Tenta formato BR DD/MM/AAAA [HH:mm[:ss]]
  const brMatch = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/,
  )
  if (brMatch) {
    const dia = parseInt(brMatch[1], 10)
    const mes = parseInt(brMatch[2], 10) - 1
    const ano = parseInt(brMatch[3], 10)
    const hora = brMatch[4] ? parseInt(brMatch[4], 10) : 0
    const min = brMatch[5] ? parseInt(brMatch[5], 10) : 0
    const sec = brMatch[6] ? parseInt(brMatch[6], 10) : 0
    const d = new Date(ano, mes, dia, hora, min, sec)
    return isNaN(d.getTime()) ? null : d
  }

  // Tenta formato ISO direto (ex: 2026-10-15T12:00:00Z ou 2026-10-15 12:00:00)
  const dIso = new Date(s.includes(' ') && !s.includes('T') ? s.replace(' ', 'T') : s)
  if (!isNaN(dIso.getTime())) {
    return dIso
  }

  return null
}

/**
 * Formata data e hora no fuso horário IANA da unidade configurada.
 * Se o valor for ausente ou inválido, retorna "indisponível" (ou fallback customizado).
 */
export function formatarDataHoraFuso(
  valor?: string | number | Date | null,
  fusoIana: string = obterFusoHorarioAtivo(),
  opcoes?: Intl.DateTimeFormatOptions,
): string {
  const d = parseDataHoraSegura(valor)
  if (!d) return 'indisponível'

  const optionsPadrao: Intl.DateTimeFormatOptions = {
    timeZone: fusoIana,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }

  try {
    return new Intl.DateTimeFormat('pt-BR', { ...optionsPadrao, ...opcoes }).format(d)
  } catch {
    // Se fuso for rejeitado pelo runtime, fallback com fuso padrão
    return new Intl.DateTimeFormat('pt-BR', {
      ...optionsPadrao,
      timeZone: FUSO_PADRAO_SISTEMA,
      ...opcoes,
    }).format(d)
  }
}

/**
 * Formata apenas a data no fuso da unidade (DD/MM/AAAA)
 */
export function formatarDataFuso(
  valor?: string | number | Date | null,
  fusoIana: string = obterFusoHorarioAtivo(),
): string {
  return formatarDataHoraFuso(valor, fusoIana, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: undefined,
    minute: undefined,
    second: undefined,
  })
}

/**
 * Formata apenas o horário no fuso da unidade (HH:mm ou HH:mm:ss)
 */
export function formatarHoraFuso(
  valor?: string | number | Date | null,
  fusoIana: string = obterFusoHorarioAtivo(),
  incluirSegundos: boolean = false,
): string {
  const d = parseDataHoraSegura(valor)
  if (!d) return 'indisponível'

  const opcoes: Intl.DateTimeFormatOptions = {
    timeZone: fusoIana,
    hour: '2-digit',
    minute: '2-digit',
    second: incluirSegundos ? '2-digit' : undefined,
  }

  try {
    return new Intl.DateTimeFormat('pt-BR', opcoes).format(d)
  } catch {
    return new Intl.DateTimeFormat('pt-BR', { ...opcoes, timeZone: FUSO_PADRAO_SISTEMA }).format(d)
  }
}

/**
 * Extrai partes de data civil (ano, mes, dia) no fuso da unidade.
 * Essencial para limites de dia e competência mensais sem desvio UTC.
 */
export function extrairDataCivilFuso(
  valor: Date | number | string,
  fusoIana: string = obterFusoHorarioAtivo(),
): { ano: number; mes: number; dia: number; hora: number; minuto: number } | null {
  const d = parseDataHoraSegura(valor)
  if (!d) return null

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: fusoIana,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(d)
    const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10)

    return {
      ano: getPart('year'),
      mes: getPart('month'), // 1-12
      dia: getPart('day'),
      hora: getPart('hour'),
      minuto: getPart('minute'),
    }
  } catch {
    return null
  }
}

/**
 * Retorna se duas datas pertencem ao mesmo dia civil no fuso especificado.
 */
export function mesmoDiaCivilFuso(
  dataA: Date | number | string,
  dataB: Date | number | string,
  fusoIana: string = obterFusoHorarioAtivo(),
): boolean {
  const pA = extrairDataCivilFuso(dataA, fusoIana)
  const pB = extrairDataCivilFuso(dataB, fusoIana)
  if (!pA || !pB) return false
  return pA.ano === pB.ano && pA.mes === pB.mes && pA.dia === pB.dia
}

/**
 * Retorna se a data pertence à competência (YYYY-MM) informada no fuso da unidade.
 */
export function mesmaCompetenciaFuso(
  data: Date | number | string,
  competencia: string, // 'YYYY-MM'
  fusoIana: string = obterFusoHorarioAtivo(),
): boolean {
  const p = extrairDataCivilFuso(data, fusoIana)
  if (!p) return false
  const compStr = `${p.ano}-${String(p.mes).padStart(2, '0')}`
  return compStr === competencia
}

/**
 * CÁLCULO DE MÉDIA ESTATÍSTICA ESTRITA:
 * Exclui expressamente valores nulos, indefinidos, NaN e registros sem data.
 * Se nenhum dado válido existir, retorna `null` (NUNCA 0).
 */
export function calcularMediaEstatisticaSegura(
  valores: Array<number | null | undefined>,
): number | null {
  const validos = valores.filter(
    (v): v is number => typeof v === 'number' && !isNaN(v) && isFinite(v),
  )
  if (validos.length === 0) return null
  const soma = validos.reduce((acc, v) => acc + v, 0)
  return soma / validos.length
}
