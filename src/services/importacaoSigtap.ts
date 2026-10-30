/**
 * Validador e Parser de Importação SIGTAP CSV (v0.0.28)
 *
 * REQUISITOS NORMATIVOS E DE ROBUSTEZ:
 * 1. Pré-visualização do CSV antes de gravar, com competência explícita.
 * 2. Preservação estrita de zeros à esquerda nos códigos de procedimentos SUS (10 dígitos: XX.XX.XX.XXX-X ou 10 dígitos numéricos).
 * 3. Validação estrita de valores decimais (SH, SA, SP) — rejeição de formatos inválidos ou negativos.
 * 4. Detecção e rejeição de duplicidades dentro do lote com relatório linha a linha.
 * 5. Idempotência por lote e competência explícita: não sobrescreve competências anteriores e não recalcula contas históricas.
 * 6. Fonte Oficial: http://tabela-unificada.datasus.gov.br/tabela-unificada/app/download.jsp
 *    Nota: o arquivo oficial distribuído pelo SIGTAP Desktop é posicional (.txt);
 *    o suporte atual trata a importação CSV estruturada para uso municipal.
 */

import { ComplexidadeProcedimento, ModalidadeProcedimento } from '@/types/hospital'

export interface ItemSIGTAPValido {
  linha: number
  codigo: string // Preserva zeros à esquerda
  codigoNormalizado: string // 10 dígitos sem pontuação
  nome: string
  valor_sh: number
  valor_sa: number
  valor_sp: number
  complexidade: ComplexidadeProcedimento
  modalidade: ModalidadeProcedimento
  instrumento_registro: string
}

export interface RejeicaoImportacaoSIGTAP {
  linha: number
  codigoBruto?: string
  motivo: string
  detalhe?: string
  campo?: 'codigo' | 'nome' | 'valor_sh' | 'valor_sa' | 'valor_sp' | 'duplicidade' | 'formato'
}

export interface PrevisualizacaoSIGTAPResultado {
  sucesso: boolean
  competencia: string
  totalLinhasArquivo: number
  totalValidos: number
  totalRejeitados: number
  itensValidos: ItemSIGTAPValido[]
  rejeicoes: RejeicaoImportacaoSIGTAP[]
  delimitadorDetectado: ';' | ','
}

/**
 * Normaliza e formata código de procedimento SUS preservando zeros à esquerda.
 * No SIGTAP oficial: 10 dígitos numéricos (ex: 03.01.06.008-8 ou 0301060088).
 * Se o Excel/CSV perdeu zero inicial (ex: 301060088 com 9 dígitos), preenche até 10 dígitos se numérico,
 * ou se já tiver pontuação, preenche grupo inicial se faltar zero.
 */
export function normalizarCodigoProcedimentoSigtap(codigoBruto?: string | null): {
  valido: boolean
  codigoFormatado: string
  codigoNormalizado: string
  erro?: string
} {
  if (!codigoBruto || typeof codigoBruto !== 'string') {
    return {
      valido: false,
      codigoFormatado: '',
      codigoNormalizado: '',
      erro: 'Código não informado ou vazio',
    }
  }

  // Remove aspas, espaços e eventuais caracteres '=' comuns de exportação Excel
  let limpo = codigoBruto.replace(/["'=]/g, '').trim()
  if (!limpo) {
    return { valido: false, codigoFormatado: '', codigoNormalizado: '', erro: 'Código vazio' }
  }

  // Extrair apenas dígitos
  const apenasDigitos = limpo.replace(/\D/g, '')

  // No SUS o código de procedimento tem exatamente 10 dígitos (2+2+2+3+1: XX.XX.XX.XXX-X)
  // Caso o CSV venha com 8 ou 9 dígitos porque perdeu zeros à esquerda no Excel
  if (apenasDigitos.length > 0 && apenasDigitos.length <= 10) {
    const comZeros = apenasDigitos.padStart(10, '0')
    const formatado = `${comZeros.slice(0, 2)}.${comZeros.slice(2, 4)}.${comZeros.slice(4, 6)}.${comZeros.slice(6, 9)}-${comZeros.slice(9, 10)}`
    return {
      valido: true,
      codigoFormatado: formatado,
      codigoNormalizado: comZeros,
    }
  }

  // Se o código tiver formato alfanumérico especial (ex: pacotes municipais customizados) mas sem dígitos SUS
  if (limpo.length >= 6 && limpo.length <= 16) {
    return {
      valido: true,
      codigoFormatado: limpo,
      codigoNormalizado: limpo.toUpperCase(),
    }
  }

  return {
    valido: false,
    codigoFormatado: limpo,
    codigoNormalizado: limpo,
    erro: `Código com formato inválido (${limpo}): esperado 10 dígitos do padrão SUS`,
  }
}

/**
 * Faz o parsing seguro de valores decimais monetários com verificação de formato.
 * Aceita: '12,50', '12.50', '0', '0,00', '1.250,50', 'R$ 12,50'.
 * Rejeita: strings corrompidas, múltiplos separadores inválidos, valores negativos ou NaN.
 */
export function parseValorDecimalSigtap(valorBruto?: string | null): {
  valido: boolean
  valor: number
  erro?: string
} {
  if (valorBruto === undefined || valorBruto === null) {
    return { valido: true, valor: 0 }
  }

  const str = String(valorBruto)
    .replace(/["'R$\s]/g, '')
    .trim()
  if (str === '') {
    return { valido: true, valor: 0 }
  }

  // Detectar caracteres proibidos (exceto números, vírgula, ponto e sinal de menos)
  if (/[^0-9,.-]/.test(str)) {
    return { valido: false, valor: 0, erro: `Valor contém caracteres inválidos: "${valorBruto}"` }
  }

  // Não permitir valores negativos para procedimentos da tabela SUS
  if (str.startsWith('-')) {
    return { valido: false, valor: 0, erro: `Valor não pode ser negativo: "${valorBruto}"` }
  }

  // Tratar formato brasileiro com milhar: 1.234,56 ou 1,234.56 ou simples 1234,56
  let normalizado = str
  if (normalizado.includes('.') && normalizado.includes(',')) {
    // 1.250,50 -> remove ponto, troca virgula por ponto
    if (normalizado.indexOf('.') < normalizado.indexOf(',')) {
      normalizado = normalizado.replace(/\./g, '').replace(',', '.')
    } else {
      // 1,250.50 -> remove virgula
      normalizado = normalizado.replace(/,/g, '')
    }
  } else if (normalizado.includes(',')) {
    normalizado = normalizado.replace(',', '.')
  }

  // Se houver mais de um ponto após normalização, é formato corrompido
  const partes = normalizado.split('.')
  if (partes.length > 2) {
    return {
      valido: false,
      valor: 0,
      erro: `Separadores decimais múltiplos ou inconsistentes: "${valorBruto}"`,
    }
  }

  const num = Number(normalizado)
  if (isNaN(num) || !isFinite(num)) {
    return {
      valido: false,
      valor: 0,
      erro: `Não foi possível converter em número decimal: "${valorBruto}"`,
    }
  }

  return {
    valido: true,
    valor: Math.round(num * 100) / 100,
  }
}

/**
 * Pré-visualiza e valida linha a linha o conteúdo CSV do SIGTAP.
 * Retorna itens prontos para gravação e relatório detalhado de rejeições.
 */
export function previsualizarSigtapCSV(params: {
  conteudoCSV: string
  competencia: string // ex: '2026-09' ou '2025-05'
}): PrevisualizacaoSIGTAPResultado {
  const { conteudoCSV, competencia } = params

  if (!competencia || !/^\d{4}-\d{2}$/.test(competencia.trim())) {
    throw new Error('Competência explícita inválida. Formato esperado: AAAA-MM (ex: 2026-09).')
  }

  const linhas = conteudoCSV
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (linhas.length === 0) {
    throw new Error('Arquivo CSV vazio.')
  }

  const delimitador: ';' | ',' = linhas[0].includes(';') ? ';' : ','
  const header = linhas[0]
    .toLowerCase()
    .split(delimitador)
    .map((c) => c.replace(/["']/g, '').trim())

  const idxCodigo = header.findIndex((h) => h.includes('codigo') || h.includes('procedimento'))
  const idxNome = header.findIndex((h) => h.includes('nome') || h.includes('descricao'))
  const idxSH = header.findIndex(
    (h) => h.includes('sh') || h.includes('servico_hospitalar') || h.includes('hospitalar'),
  )
  const idxSA = header.findIndex((h) => h.includes('sa') || h.includes('ambulatorial'))
  const idxSP = header.findIndex((h) => h.includes('sp') || h.includes('profissional'))
  const idxComplexidade = header.findIndex((h) => h.includes('complex'))
  const idxModalidade = header.findIndex((h) => h.includes('modalid'))

  if (idxCodigo === -1 || idxNome === -1) {
    throw new Error('O CSV deve conter colunas com cabeçalho identificando "codigo" e "nome".')
  }

  const itensValidos: ItemSIGTAPValido[] = []
  const rejeicoes: RejeicaoImportacaoSIGTAP[] = []
  const codigosVistosNoLote = new Map<string, number>() // codigoNormalizado -> número da primeira linha

  for (let i = 1; i < linhas.length; i++) {
    const numeroLinha = i + 1
    const cols = linhas[i].split(delimitador).map((c) => c.replace(/^["']|["']$/g, '').trim())

    const codigoBruto = cols[idxCodigo] ?? ''
    const nomeBruto = cols[idxNome] ?? ''

    // 1. Validação de presença mínima
    if (!codigoBruto.trim()) {
      rejeicoes.push({
        linha: numeroLinha,
        campo: 'codigo',
        motivo: 'Código de procedimento ausente na linha',
      })
      continue
    }

    if (!nomeBruto.trim()) {
      rejeicoes.push({
        linha: numeroLinha,
        codigoBruto,
        campo: 'nome',
        motivo: 'Nome/descrição do procedimento ausente na linha',
      })
      continue
    }

    // 2. Preservação de zeros à esquerda e integridade do código
    const codRes = normalizarCodigoProcedimentoSigtap(codigoBruto)
    if (!codRes.valido) {
      rejeicoes.push({
        linha: numeroLinha,
        codigoBruto,
        campo: 'codigo',
        motivo: codRes.erro || 'Código de procedimento inválido',
      })
      continue
    }

    // 3. Validação de duplicidade dentro do lote
    const codigoNormalizado = codRes.codigoNormalizado
    if (codigosVistosNoLote.has(codigoNormalizado)) {
      const linhaAnterior = codigosVistosNoLote.get(codigoNormalizado)!
      rejeicoes.push({
        linha: numeroLinha,
        codigoBruto,
        campo: 'duplicidade',
        motivo: `Procedimento duplicado dentro do mesmo lote de importação (já presente na linha ${linhaAnterior})`,
        detalhe: `Código: ${codRes.codigoFormatado}`,
      })
      continue
    }
    codigosVistosNoLote.set(codigoNormalizado, numeroLinha)

    // 4. Validação de valores decimais
    const shRes = idxSH !== -1 ? parseValorDecimalSigtap(cols[idxSH]) : { valido: true, valor: 0 }
    if (!shRes.valido) {
      rejeicoes.push({
        linha: numeroLinha,
        codigoBruto,
        campo: 'valor_sh',
        motivo: `Valor de Serviço Hospitalar (SH) inválido: ${shRes.erro}`,
      })
      continue
    }

    const saRes = idxSA !== -1 ? parseValorDecimalSigtap(cols[idxSA]) : { valido: true, valor: 0 }
    if (!saRes.valido) {
      rejeicoes.push({
        linha: numeroLinha,
        codigoBruto,
        campo: 'valor_sa',
        motivo: `Valor Ambulatorial (SA) inválido: ${saRes.erro}`,
      })
      continue
    }

    const spRes = idxSP !== -1 ? parseValorDecimalSigtap(cols[idxSP]) : { valido: true, valor: 0 }
    if (!spRes.valido) {
      rejeicoes.push({
        linha: numeroLinha,
        codigoBruto,
        campo: 'valor_sp',
        motivo: `Valor Profissional (SP) inválido: ${spRes.erro}`,
      })
      continue
    }

    // 5. Normalização de complexidade e modalidade
    let complexidade: ComplexidadeProcedimento = 'media'
    if (idxComplexidade !== -1 && cols[idxComplexidade]) {
      const cLower = cols[idxComplexidade].toLowerCase()
      if (cLower.includes('basic') || cLower.includes('básic')) complexidade = 'basica'
      else if (cLower.includes('alt')) complexidade = 'alta'
      else if (cLower.includes('não') || cLower.includes('nao')) complexidade = 'nao_se_aplica'
    }

    let modalidade: ModalidadeProcedimento = 'hospitalar'
    if (idxModalidade !== -1 && cols[idxModalidade]) {
      const mLower = cols[idxModalidade].toLowerCase()
      if (mLower.includes('amb') && mLower.includes('hosp'))
        modalidade = 'ambulatorial_e_hospitalar'
      else if (mLower.includes('amb')) modalidade = 'ambulatorial'
    } else if (saRes.valor > 0 && shRes.valor === 0) {
      modalidade = 'ambulatorial'
    } else if (saRes.valor > 0 && shRes.valor > 0) {
      modalidade = 'ambulatorial_e_hospitalar'
    }

    itensValidos.push({
      linha: numeroLinha,
      codigo: codRes.codigoFormatado,
      codigoNormalizado: codRes.codigoNormalizado,
      nome: nomeBruto.trim(),
      valor_sh: shRes.valor,
      valor_sa: saRes.valor,
      valor_sp: spRes.valor,
      complexidade,
      modalidade,
      instrumento_registro: modalidade === 'ambulatorial' ? 'BPA' : 'AIH',
    })
  }

  return {
    sucesso: rejeicoes.length === 0,
    competencia,
    totalLinhasArquivo: linhas.length - 1,
    totalValidos: itensValidos.length,
    totalRejeitados: rejeicoes.length,
    itensValidos,
    rejeicoes,
    delimitadorDetectado: delimitador,
  }
}
