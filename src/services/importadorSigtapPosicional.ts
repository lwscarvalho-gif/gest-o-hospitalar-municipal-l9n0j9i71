/**
 * Parser Posicional Dinâmico e Extrator Seguro do Pacote Oficial SIGTAP Desktop
 *
 * FONTES OFICIAIS E NORMAS:
 * 1. Download oficial DATASUS: http://tabela-unificada.datasus.gov.br/tabela-unificada/app/download.jsp
 *    Formato: Arquivo compactado (.zip) com arquivos .txt posicionais e respectivos *_layout.txt em CSV.
 * 2. Encoding Oficial: ISO-8859-1 (Latin1) - acentuação oficial do Ministério da Saúde.
 * 3. Decisão de Projeto contra Quebra de Layout (Fórum DATASUS tópico 432177):
 *    A partir de 06/2025 o layout posicional teve expansão de casas/posições.
 *    Portanto, as posições de início, fim e tamanho NUNCA devem ser fixadas no código;
 *    são derivadas dinamicamente do respectivo arquivo tb_procedimento_layout.txt incluído no pacote.
 * 4. Segurança e Extração:
 *    - Proteção estrita contra Zip-Slip (caminhos com "../" ou barras absolutas).
 *    - Validação de tamanho máximo de arquivo compactado (ex: 50MB) e descompactado (ex: 150MB).
 *    - Rejeição de arquivos com nomes ou extensões perigosas.
 * 5. Escala de Valores:
 *    - Tipo Numérico com decimais implícitos no layout do SUS: inteiros divididos por 100 (centavos).
 * 6. Zeros à Esquerda:
 *    - Preservados estritamente como string (ex: "0101010010").
 */

import { unzipSync } from 'fflate'
import {
  ItemSIGTAPValido,
  RejeicaoImportacaoSIGTAP,
  normalizarCodigoProcedimentoSigtap,
} from './importacaoSigtap'
import { ComplexidadeProcedimento, ModalidadeProcedimento } from '@/types/hospital'

/**
 * Definição de uma coluna derivada do arquivo *_layout.txt
 */
export interface ColunaLayoutSigtap {
  coluna: string // ex: CO_PROCEDIMENTO, NO_PROCEDIMENTO, VL_SERVICO_HOSPITALAR
  tamanho: number
  inicio: number // 1-based (conforme arquivo de layout do DATASUS)
  fim: number // 1-based inclusivo
  tipo: string // VARCHAR, VARCHAR2, NUMBER, CHAR, DATE
  descricao?: string
}

/**
 * Mapa de layout por tabela (ex: tb_procedimento -> lista de colunas)
 */
export type LayoutTabelaSigtap = Record<string, ColunaLayoutSigtap>

/**
 * Hierarquia auxiliar quando presente no pacote oficial
 */
export interface GrupoSigtap {
  codigo: string
  nome: string
  competencia: string
}

export interface SubGrupoSigtap {
  grupoCodigo: string
  codigo: string
  nome: string
  competencia: string
}

export interface FormaOrganizacaoSigtap {
  grupoCodigo: string
  subGrupoCodigo: string
  codigo: string
  nome: string
  competencia: string
}

export interface PacoteSigtapExtraido {
  sucesso: boolean
  arquivosPresentes: string[]
  tabelasIdentificadas: string[]
  layoutsIdentificados: string[]
  lacunas: string[]
  coberturaCatalogo:
    | 'completo_procedimentos_e_hierarquia'
    | 'subconjunto_procedimentos'
    | 'incompleto_sem_layout'
  declaracaoCobertura: string
  competenciaDetectada?: string
  totalLinhasProcedimentos: number
  totalValidos: number
  totalRejeitados: number
  itensValidos: ItemSIGTAPValido[]
  rejeicoes: RejeicaoImportacaoSIGTAP[]
  grupos?: GrupoSigtap[]
  subGrupos?: SubGrupoSigtap[]
  formasOrganizacao?: FormaOrganizacaoSigtap[]
}

// Limites seguros de descompactação
export const LIMITE_MAX_BYTES_ZIP = 50 * 1024 * 1024 // 50 MB
export const LIMITE_MAX_BYTES_TOTAL_UNZIPPED = 150 * 1024 * 1024 // 150 MB
export const LIMITE_MAX_BYTES_ARQUIVO_UNICO = 80 * 1024 * 1024 // 80 MB
export const LIMITE_MAX_ENTRADAS_ZIP = 500 // Máximo de entradas/arquivos no pacote

/**
 * Decodifica bytes em texto utilizando a codificação padrão oficial do Ministério da Saúde:
 * ISO-8859-1 (Latin1).
 *
 * NOTA DE LIMITAÇÃO TÉCNICA:
 * A decodificação em ISO-8859-1 mapeia bytes de 0x00 a 0xFF diretamente em caracteres Unicode,
 * tratando acentuações do português ("Cirúrgico", "Atenção", etc.). A TextDecoder('iso-8859-1')
 * nunca dispara erro 'fatal' por si só em bytes isolados; portanto, este método NÃO constitui
 * prova de detecção universal de encoding corrompido, apenas aplica a norma do DATASUS.
 * Caso seja fornecido texto já convertido em UTF-8 válido com acentuação multibyte sem mojibake,
 * o leitor preserva a compatibilidade.
 */
export function decodificarTextoBytes(bytes: Uint8Array): string {
  if (!bytes || bytes.byteLength === 0) return ''
  try {
    // Padrão normativo do DATASUS: ISO-8859-1
    const decoderIso = new TextDecoder('iso-8859-1', { fatal: false })
    return decoderIso.decode(bytes)
  } catch {
    // Fallback controlado para UTF-8
    const decoderUtf8 = new TextDecoder('utf-8', { fatal: false })
    return decoderUtf8.decode(bytes)
  }
}

/**
 * Validação de caminho seguro (prevenção contra Zip-Slip)
 */
export function validarCaminhoSeguroZip(caminho: string): boolean {
  if (!caminho || typeof caminho !== 'string') return false
  const normalizado = caminho.replace(/\\/g, '/')
  // Rejeita tentativas de subida de diretório e caminhos absolutos
  if (
    normalizado.startsWith('/') ||
    normalizado.startsWith('../') ||
    normalizado.includes('/../')
  ) {
    return false
  }
  if (normalizado.includes('..')) {
    return false
  }
  return true
}

/**
 * Extrai de forma segura o ZIP em memória usando fflate.
 * Retorna dicionário nomeNormalizado -> Uint8Array.
 */
export function descompactarZipSeguro(
  zipBuffer: ArrayBuffer | Uint8Array,
): Record<string, Uint8Array> {
  const bytes = zipBuffer instanceof Uint8Array ? zipBuffer : new Uint8Array(zipBuffer)

  if (bytes.byteLength > LIMITE_MAX_BYTES_ZIP) {
    throw new Error(
      `Arquivo ZIP excede o limite máximo permitido (${(LIMITE_MAX_BYTES_ZIP / (1024 * 1024)).toFixed(0)} MB). Tamanho enviado: ${(bytes.byteLength / (1024 * 1024)).toFixed(1)} MB.`,
    )
  }

  // Contadores para validação ativa ANTES e DURANTE a descompressão (no filter de cada entrada)
  let entradasVistas = 0
  let tamanhoEstimadoAcumulado = 0

  let arquivosBrutos: Record<string, Uint8Array>
  try {
    arquivosBrutos = unzipSync(bytes, {
      filter: (file) => {
        // Ignorar pastas e arquivos de sistema do macOS/Windows
        if (file.name.endsWith('/') || file.name.includes('__MACOSX')) return false

        // 1. Validação ativa de Zip-Slip no momento da descoberta da entrada
        if (!validarCaminhoSeguroZip(file.name)) {
          throw new Error(
            `Caminho perigoso detectado no arquivo ZIP (Zip-Slip bloqueado): "${file.name}"`,
          )
        }

        // 2. Validação ativa do número de entradas ANTES de inflar
        entradasVistas++
        if (entradasVistas > LIMITE_MAX_ENTRADAS_ZIP) {
          throw new Error(
            `Número excessivo de arquivos no pacote ZIP (${entradasVistas} entradas detectadas; limite de segurança: ${LIMITE_MAX_ENTRADAS_ZIP}).`,
          )
        }

        // 3. Validação preventiva contra Zip-Bomb usando tamanho original declarado no cabeçalho (size)
        if (typeof file.size === 'number' && file.size > 0) {
          if (file.size > LIMITE_MAX_BYTES_ARQUIVO_UNICO) {
            throw new Error(
              `Entrada "${file.name}" declara tamanho descompactado de ${(file.size / (1024 * 1024)).toFixed(1)} MB, excedendo o limite individual permitido (${(LIMITE_MAX_BYTES_ARQUIVO_UNICO / (1024 * 1024)).toFixed(0)} MB).`,
            )
          }
          tamanhoEstimadoAcumulado += file.size
          if (tamanhoEstimadoAcumulado > LIMITE_MAX_BYTES_TOTAL_UNZIPPED) {
            throw new Error(
              `Tamanho expandido total declarado pelo pacote ZIP (${(tamanhoEstimadoAcumulado / (1024 * 1024)).toFixed(1)} MB) excede o limite máximo de segurança (${(LIMITE_MAX_BYTES_TOTAL_UNZIPPED / (1024 * 1024)).toFixed(0)} MB).`,
            )
          }
        }

        return true
      },
    })
  } catch (err: any) {
    throw new Error(`Falha ao descompactar pacote ZIP do SIGTAP: ${err.message}`)
  }

  // Validação estrita DURANTE/APÓS montagem em memória
  let tamanhoRealAcumulado = 0
  const resultado: Record<string, Uint8Array> = {}

  for (const [caminho, conteudo] of Object.entries(arquivosBrutos)) {
    if (!validarCaminhoSeguroZip(caminho)) {
      throw new Error(`Caminho malicioso rejeitado: "${caminho}"`)
    }
    if (conteudo.byteLength > LIMITE_MAX_BYTES_ARQUIVO_UNICO) {
      throw new Error(
        `Arquivo interno "${caminho}" excede o limite máximo individual (${(LIMITE_MAX_BYTES_ARQUIVO_UNICO / (1024 * 1024)).toFixed(0)} MB).`,
      )
    }
    tamanhoRealAcumulado += conteudo.byteLength
    if (tamanhoRealAcumulado > LIMITE_MAX_BYTES_TOTAL_UNZIPPED) {
      throw new Error(
        `O pacote ZIP expandido excede o limite total de segurança (${(LIMITE_MAX_BYTES_TOTAL_UNZIPPED / (1024 * 1024)).toFixed(0)} MB).`,
      )
    }

    // Normalizar nome do arquivo removendo caminhos de diretório e padronizando em lowercase
    const partes = caminho.replace(/\\/g, '/').split('/')
    const nomeBase = partes[partes.length - 1].toLowerCase().trim()
    resultado[nomeBase] = conteudo
  }

  return resultado
}

/**
 * Faz o parsing do arquivo de layout CSV (ex: tb_procedimento_layout.txt).
 * Colunas esperadas no cabeçalho: Coluna, Tamanho, Inicio, Fim, Tipo (ou com acentos/minúsculas).
 * Delimitador: vírgula ou ponto-e-vírgula.
 */
export function parseArquivoLayoutSigtap(conteudoTexto: string): LayoutTabelaSigtap {
  const linhas = conteudoTexto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (linhas.length < 2) {
    throw new Error(
      'Arquivo de layout inválido ou vazio (mínimo de cabeçalho + 1 coluna requerido).',
    )
  }

  const delimitador = linhas[0].includes(';') ? ';' : ','
  const cabecalho = linhas[0]
    .toLowerCase()
    .split(delimitador)
    .map((c) => c.replace(/["']/g, '').trim())

  const idxColuna = cabecalho.findIndex(
    (c) => c.includes('coluna') || c.includes('campo') || c.includes('nome'),
  )
  const idxTamanho = cabecalho.findIndex((c) => c.includes('tamanho') || c.includes('tam'))
  const idxInicio = cabecalho.findIndex((c) => c.includes('inicio') || c.includes('início'))
  const idxFim = cabecalho.findIndex((c) => c.includes('fim'))
  const idxTipo = cabecalho.findIndex((c) => c.includes('tipo'))
  const idxDescricao = cabecalho.findIndex((c) => c.includes('descri') || c.includes('detalhe'))

  if (idxColuna === -1 || idxInicio === -1 || idxFim === -1) {
    throw new Error(
      `Cabeçalho do layout oficial não contém as colunas mandatórias ("Coluna", "Inicio", "Fim"). Cabeçalho encontrado: ${linhas[0]}`,
    )
  }

  const mapa: LayoutTabelaSigtap = {}

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i]
    const partes = linha.split(delimitador).map((p) => p.replace(/^["']|["']$/g, '').trim())
    const nomeColuna = (partes[idxColuna] || '').toUpperCase()
    if (!nomeColuna) continue

    const inicio = parseInt(partes[idxInicio], 10)
    const fim = parseInt(partes[idxFim], 10)
    const tamanho = idxTamanho !== -1 ? parseInt(partes[idxTamanho], 10) : fim - inicio + 1
    const tipo = idxTipo !== -1 ? (partes[idxTipo] || 'VARCHAR').toUpperCase() : 'VARCHAR'
    const descricao = idxDescricao !== -1 ? partes[idxDescricao] : undefined

    if (isNaN(inicio) || isNaN(fim) || inicio <= 0 || fim < inicio) {
      throw new Error(
        `Posição inválida na linha ${i + 1} do layout: coluna "${nomeColuna}", início=${partes[idxInicio]}, fim=${partes[idxFim]}`,
      )
    }

    mapa[nomeColuna] = {
      coluna: nomeColuna,
      inicio,
      fim,
      tamanho: isNaN(tamanho) ? fim - inicio + 1 : tamanho,
      tipo,
      descricao,
    }
  }

  return mapa
}

/**
 * Extrai o valor de um campo de uma linha posicional baseado na definição de coluna (1-based index).
 */
export function extrairCampoPosicional(linha: string, colunaDef: ColunaLayoutSigtap): string {
  // Linha no layout oficial usa índices 1-based inclusivos [inicio..fim]
  const inicio0 = colunaDef.inicio - 1
  const fim0 = colunaDef.fim
  if (inicio0 >= linha.length) return ''
  return linha.slice(inicio0, Math.min(linha.length, fim0)).trim()
}

/**
 * Converte valor numérico posicional conforme o layout.
 * No layout DATASUS, valores monetários (VL_SERVICO_HOSPITALAR, etc.) são números inteiros
 * representando centavos (2 casas decimais implícitas), sem vírgula no arquivo posicional.
 * Ex: "0000001250" -> 12.50.
 * Se o campo vier com vírgula ou ponto (caso de conversão prévia), respeita os decimais informados.
 */
export function parseValorMonetarioPosicional(valorBruto: string): {
  valido: boolean
  valor: number
  erro?: string
} {
  const limpo = valorBruto.trim()
  if (!limpo || limpo === '0') {
    return { valido: true, valor: 0 }
  }

  // Se já contiver vírgula ou ponto
  if (limpo.includes(',') || limpo.includes('.')) {
    const normalizado = limpo.replace(',', '.')
    const n = parseFloat(normalizado)
    if (isNaN(n) || !isFinite(n) || n < 0) {
      return { valido: false, valor: 0, erro: `Valor monetário inválido: "${valorBruto}"` }
    }
    return { valido: true, valor: Math.round(n * 100) / 100 }
  }

  // Apenas dígitos numéricos com escala implícita de 2 casas decimais (padrão DATASUS)
  if (!/^\d+$/.test(limpo)) {
    return {
      valido: false,
      valor: 0,
      erro: `Valor contém caracteres não numéricos: "${valorBruto}"`,
    }
  }

  const inteiroCentavos = parseInt(limpo, 10)
  if (isNaN(inteiroCentavos) || inteiroCentavos < 0) {
    return { valido: false, valor: 0, erro: `Falha ao converter valor: "${valorBruto}"` }
  }

  const valorDecimal = Math.round(inteiroCentavos) / 100
  return { valido: true, valor: valorDecimal }
}

/**
 * Processador principal do Pacote Posicional SIGTAP
 */
export function processarPacoteSigtapPosicional(params: {
  arquivos: Record<string, Uint8Array>
  competenciaInformada: string // Formato AAAA-MM
}): PacoteSigtapExtraido {
  const { arquivos, competenciaInformada } = params

  if (!competenciaInformada || !/^\d{4}-\d{2}$/.test(competenciaInformada.trim())) {
    throw new Error('Competência explícita inválida. Formato esperado: AAAA-MM (ex: 2026-09).')
  }

  const compEsperadaFormatada = competenciaInformada.trim()
  const compEsperadaCompacta = compEsperadaFormatada.replace('-', '') // AAAAMM

  const nomesArquivos = Object.keys(arquivos)
  const lacunas: string[] = []

  // 1. Verificar arquivos essenciais de layout e dados de tb_procedimento
  const nomeLayoutProc = nomesArquivos.find(
    (n) => n === 'tb_procedimento_layout.txt' || n.endsWith('/tb_procedimento_layout.txt'),
  )
  const nomeDadosProc = nomesArquivos.find(
    (n) => n === 'tb_procedimento.txt' || n.endsWith('/tb_procedimento.txt'),
  )

  if (!nomeLayoutProc) {
    lacunas.push('Arquivo de layout obrigatório ausente no pacote: "tb_procedimento_layout.txt"')
  }
  if (!nomeDadosProc) {
    lacunas.push('Arquivo de dados obrigatório ausente no pacote: "tb_procedimento.txt"')
  }

  if (lacunas.length > 0) {
    return {
      sucesso: false,
      arquivosPresentes: nomesArquivos,
      tabelasIdentificadas: [],
      layoutsIdentificados: [],
      lacunas,
      coberturaCatalogo: 'incompleto_sem_layout',
      declaracaoCobertura: `Formato inválido ou pacote incompleto: ${lacunas.join('; ')}. O sistema recusa parsers fixos, deduções arbitrárias ou layouts ausentes. Certifique-se de enviar o arquivo ZIP original disponibilizado pelo DATASUS (contendo tb_procedimento.txt e tb_procedimento_layout.txt).`,
      totalLinhasProcedimentos: 0,
      totalValidos: 0,
      totalRejeitados: 0,
      itensValidos: [],
      rejeicoes: [
        {
          linha: 0,
          motivo: `Formato de pacote não reconhecido ou layout ausente: ${lacunas.join('; ')}. O arquivo não atende à estrutura oficial do DATASUS.`,
          campo: 'formato',
          detalhe: `Arquivos encontrados no pacote ZIP (${nomesArquivos.length}): ${nomesArquivos.slice(0, 10).join(', ')}${nomesArquivos.length > 10 ? '...' : ''}`,
        },
      ],
    }
  }

  // 2. Parser do layout dinâmico de tb_procedimento
  const layoutProcTexto = decodificarTextoBytes(arquivos[nomeLayoutProc!])
  const layoutProc = parseArquivoLayoutSigtap(layoutProcTexto)

  // Identificar colunas essenciais do layout
  const colCodigo = layoutProc['CO_PROCEDIMENTO']
  const colNome = layoutProc['NO_PROCEDIMENTO']
  const colSH = layoutProc['VL_SERVICO_HOSPITALAR']
  const colSA = layoutProc['VL_SERVICO_AMBULATORIAL']
  const colSP = layoutProc['VL_SERVICO_PROFISSIONAL']
  const colComplexidade = layoutProc['TP_COMPLEXIDADE']
  const colCompetencia = layoutProc['DT_COMPETENCIA']
  const colSexo = layoutProc['TP_SEXO']

  if (!colCodigo || !colNome) {
    throw new Error(
      'Formato desconhecido de layout: o arquivo "tb_procedimento_layout.txt" não define as colunas obrigatórias CO_PROCEDIMENTO e NO_PROCEDIMENTO. Pacote rejeitado para prevenir leituras corrompidas.',
    )
  }

  // 3. Parser dos dados posicionais de tb_procedimento
  const dadosProcTexto = decodificarTextoBytes(arquivos[nomeDadosProc!])
  const linhasProc = dadosProcTexto.split(/\r?\n/).filter((l) => l.trim().length > 0)

  const itensValidos: ItemSIGTAPValido[] = []
  const rejeicoes: RejeicaoImportacaoSIGTAP[] = []
  const codigosVistosNoLote = new Map<string, number>()

  let competenciaDetectadaPacote: string | undefined

  for (let i = 0; i < linhasProc.length; i++) {
    const numeroLinha = i + 1
    const linha = linhasProc[i]

    // Validação de linha truncada: a linha precisa ter no mínimo o fim do campo essencial mais adiantado
    const tamanhoMinimoEsperado = Math.max(
      colCodigo.fim,
      colNome.fim,
      colSH ? colSH.fim : 0,
      colSA ? colSA.fim : 0,
      colSP ? colSP.fim : 0,
      colCompetencia ? colCompetencia.fim : 0,
    )

    if (linha.length < tamanhoMinimoEsperado) {
      rejeicoes.push({
        linha: numeroLinha,
        motivo: `Linha truncada no arquivo posicional (tamanho ${linha.length} caracteres; esperado mínimo de ${tamanhoMinimoEsperado} conforme layout)`,
        campo: 'formato',
        detalhe: `Conteúdo parcial: "${linha.slice(0, 30)}..."`,
      })
      continue
    }

    // Extrair competência declarada no registro (se coluna existir)
    if (colCompetencia) {
      const dtCompBruta = extrairCampoPosicional(linha, colCompetencia)
      if (dtCompBruta) {
        if (!competenciaDetectadaPacote) {
          competenciaDetectadaPacote = dtCompBruta
        }
        // Validação de divergência de competência entre o conteúdo e o informado
        if (dtCompBruta !== compEsperadaCompacta) {
          const compDetectadaFormatada = `${dtCompBruta.slice(0, 4)}-${dtCompBruta.slice(4, 6)}`
          rejeicoes.push({
            linha: numeroLinha,
            motivo: `Competência declarada no registro (${compDetectadaFormatada}) diverge da competência informada pelo usuário (${compEsperadaFormatada})`,
            campo: 'formato',
            detalhe: `DT_COMPETENCIA="${dtCompBruta}" vs informada="${compEsperadaCompacta}"`,
          })
          continue
        }
      }
    }

    // Extração e normalização do código
    const codigoBruto = extrairCampoPosicional(linha, colCodigo)
    const codRes = normalizarCodigoProcedimentoSigtap(codigoBruto)
    if (!codRes.valido) {
      rejeicoes.push({
        linha: numeroLinha,
        codigoBruto,
        motivo: codRes.erro || 'Código de procedimento inválido',
        campo: 'codigo',
      })
      continue
    }

    // Extração do nome
    const nomeBruto = extrairCampoPosicional(linha, colNome)
    if (!nomeBruto) {
      rejeicoes.push({
        linha: numeroLinha,
        codigoBruto,
        motivo: 'Nome/descrição do procedimento ausente ou em branco',
        campo: 'nome',
      })
      continue
    }

    // Detecção de duplicidade dentro do lote
    const codigoNormalizado = codRes.codigoNormalizado
    if (codigosVistosNoLote.has(codigoNormalizado)) {
      const linhaAnterior = codigosVistosNoLote.get(codigoNormalizado)!
      rejeicoes.push({
        linha: numeroLinha,
        codigoBruto,
        motivo: `Registro duplicado dentro do mesmo pacote (já processado na linha ${linhaAnterior})`,
        campo: 'duplicidade',
        detalhe: `Código: ${codRes.codigoFormatado}`,
      })
      continue
    }
    codigosVistosNoLote.set(codigoNormalizado, numeroLinha)

    // Valores SH, SA e SP
    const shBruto = colSH ? extrairCampoPosicional(linha, colSH) : '0'
    const shRes = parseValorMonetarioPosicional(shBruto)
    if (!shRes.valido) {
      rejeicoes.push({
        linha: numeroLinha,
        codigoBruto,
        motivo: `Valor de Serviço Hospitalar (SH) inválido: ${shRes.erro}`,
        campo: 'valor_sh',
      })
      continue
    }

    const saBruto = colSA ? extrairCampoPosicional(linha, colSA) : '0'
    const saRes = parseValorMonetarioPosicional(saBruto)
    if (!saRes.valido) {
      rejeicoes.push({
        linha: numeroLinha,
        codigoBruto,
        motivo: `Valor Ambulatorial (SA) inválido: ${saRes.erro}`,
        campo: 'valor_sa',
      })
      continue
    }

    const spBruto = colSP ? extrairCampoPosicional(linha, colSP) : '0'
    const spRes = parseValorMonetarioPosicional(spBruto)
    if (!spRes.valido) {
      rejeicoes.push({
        linha: numeroLinha,
        codigoBruto,
        motivo: `Valor Profissional (SP) inválido: ${spRes.erro}`,
        campo: 'valor_sp',
      })
      continue
    }

    // Complexidade
    let complexidade: ComplexidadeProcedimento = 'media'
    if (colComplexidade) {
      const cVal = extrairCampoPosicional(linha, colComplexidade)
      if (cVal === '1') complexidade = 'basica'
      else if (cVal === '2') complexidade = 'media'
      else if (cVal === '3') complexidade = 'alta'
      else if (cVal === '0') complexidade = 'nao_se_aplica'
    }

    // Modalidade derivada dos valores e características
    let modalidade: ModalidadeProcedimento = 'hospitalar'
    if (saRes.valor > 0 && shRes.valor === 0) {
      modalidade = 'ambulatorial'
    } else if (saRes.valor > 0 && shRes.valor > 0) {
      modalidade = 'ambulatorial_e_hospitalar'
    }

    itensValidos.push({
      linha: numeroLinha,
      codigo: codRes.codigoFormatado,
      codigoNormalizado: codRes.codigoNormalizado,
      nome: nomeBruto,
      valor_sh: shRes.valor,
      valor_sa: saRes.valor,
      valor_sp: spRes.valor,
      complexidade,
      modalidade,
      instrumento_registro: modalidade === 'ambulatorial' ? 'BPA' : 'AIH',
    })
  }

  // 4. Tabelas auxiliares presentes no pacote (Grupos, Subgrupos, Formas de Organização)
  const grupos: GrupoSigtap[] = []
  const subGrupos: SubGrupoSigtap[] = []
  const formasOrganizacao: FormaOrganizacaoSigtap[] = []

  // tb_grupo
  if (arquivos['tb_grupo.txt'] && arquivos['tb_grupo_layout.txt']) {
    try {
      const layoutGrupo = parseArquivoLayoutSigtap(
        decodificarTextoBytes(arquivos['tb_grupo_layout.txt']),
      )
      const dadosGrupo = decodificarTextoBytes(arquivos['tb_grupo.txt'])
      const linhasGrupo = dadosGrupo.split(/\r?\n/).filter((l) => l.trim().length > 0)
      for (const lg of linhasGrupo) {
        const coGrupo = layoutGrupo['CO_GRUPO']
          ? extrairCampoPosicional(lg, layoutGrupo['CO_GRUPO'])
          : ''
        const noGrupo = layoutGrupo['NO_GRUPO']
          ? extrairCampoPosicional(lg, layoutGrupo['NO_GRUPO'])
          : ''
        const comp = layoutGrupo['DT_COMPETENCIA']
          ? extrairCampoPosicional(lg, layoutGrupo['DT_COMPETENCIA'])
          : ''
        if (coGrupo && noGrupo) {
          grupos.push({ codigo: coGrupo, nome: noGrupo, competencia: comp })
        }
      }
    } catch {
      // Falha não crítica na tabela auxiliar
    }
  }

  // tb_sub_grupo
  if (arquivos['tb_sub_grupo.txt'] && arquivos['tb_sub_grupo_layout.txt']) {
    try {
      const layoutSubGrupo = parseArquivoLayoutSigtap(
        decodificarTextoBytes(arquivos['tb_sub_grupo_layout.txt']),
      )
      const dadosSubGrupo = decodificarTextoBytes(arquivos['tb_sub_grupo.txt'])
      const linhasSub = dadosSubGrupo.split(/\r?\n/).filter((l) => l.trim().length > 0)
      for (const ls of linhasSub) {
        const coGrupo = layoutSubGrupo['CO_GRUPO']
          ? extrairCampoPosicional(ls, layoutSubGrupo['CO_GRUPO'])
          : ''
        const coSub = layoutSubGrupo['CO_SUB_GRUPO']
          ? extrairCampoPosicional(ls, layoutSubGrupo['CO_SUB_GRUPO'])
          : ''
        const noSub = layoutSubGrupo['NO_SUB_GRUPO']
          ? extrairCampoPosicional(ls, layoutSubGrupo['NO_SUB_GRUPO'])
          : ''
        const comp = layoutSubGrupo['DT_COMPETENCIA']
          ? extrairCampoPosicional(ls, layoutSubGrupo['DT_COMPETENCIA'])
          : ''
        if (coSub && noSub) {
          subGrupos.push({ grupoCodigo: coGrupo, codigo: coSub, nome: noSub, competencia: comp })
        }
      }
    } catch {
      // Falha não crítica
    }
  }

  // tb_forma_organizacao
  if (arquivos['tb_forma_organizacao.txt'] && arquivos['tb_forma_organizacao_layout.txt']) {
    try {
      const layoutForma = parseArquivoLayoutSigtap(
        decodificarTextoBytes(arquivos['tb_forma_organizacao_layout.txt']),
      )
      const dadosForma = decodificarTextoBytes(arquivos['tb_forma_organizacao.txt'])
      const linhasForma = dadosForma.split(/\r?\n/).filter((l) => l.trim().length > 0)
      for (const lf of linhasForma) {
        const coGrupo = layoutForma['CO_GRUPO']
          ? extrairCampoPosicional(lf, layoutForma['CO_GRUPO'])
          : ''
        const coSub = layoutForma['CO_SUB_GRUPO']
          ? extrairCampoPosicional(lf, layoutForma['CO_SUB_GRUPO'])
          : ''
        const coForma = layoutForma['CO_FORMA_ORGANIZACAO']
          ? extrairCampoPosicional(lf, layoutForma['CO_FORMA_ORGANIZACAO'])
          : ''
        const noForma = layoutForma['NO_FORMA_ORGANIZACAO']
          ? extrairCampoPosicional(lf, layoutForma['NO_FORMA_ORGANIZACAO'])
          : ''
        const comp = layoutForma['DT_COMPETENCIA']
          ? extrairCampoPosicional(lf, layoutForma['DT_COMPETENCIA'])
          : ''
        if (coForma && noForma) {
          formasOrganizacao.push({
            grupoCodigo: coGrupo,
            subGrupoCodigo: coSub,
            codigo: coForma,
            nome: noForma,
            competencia: comp,
          })
        }
      }
    } catch {
      // Falha não crítica
    }
  }

  // Declaração de Cobertura
  let coberturaCatalogo: PacoteSigtapExtraido['coberturaCatalogo'] = 'subconjunto_procedimentos'
  let declaracaoCobertura =
    'Importador cobre a tabela de Procedimentos (tb_procedimento). Relacionamentos e regras condicionadas não incluídas no pacote não são inferidos.'

  if (grupos.length > 0 && subGrupos.length > 0 && formasOrganizacao.length > 0) {
    coberturaCatalogo = 'completo_procedimentos_e_hierarquia'
    declaracaoCobertura = `Importador cobre catálogo de Procedimentos (${itensValidos.length} válidos) e Hierarquia Completa (${grupos.length} grupos, ${subGrupos.length} subgrupos, ${formasOrganizacao.length} formas de organização). Compatibilidades clínicas externas não inclusas.`
  }

  return {
    sucesso: rejeicoes.length === 0,
    arquivosPresentes: nomesArquivos,
    tabelasIdentificadas: [
      'tb_procedimento',
      ...(grupos.length > 0 ? ['tb_grupo'] : []),
      ...(subGrupos.length > 0 ? ['tb_sub_grupo'] : []),
      ...(formasOrganizacao.length > 0 ? ['tb_forma_organizacao'] : []),
    ],
    layoutsIdentificados: [
      'tb_procedimento_layout',
      ...(grupos.length > 0 ? ['tb_grupo_layout'] : []),
      ...(subGrupos.length > 0 ? ['tb_sub_grupo_layout'] : []),
      ...(formasOrganizacao.length > 0 ? ['tb_forma_organizacao_layout'] : []),
    ],
    lacunas: [],
    coberturaCatalogo,
    declaracaoCobertura,
    competenciaDetectada: competenciaDetectadaPacote
      ? `${competenciaDetectadaPacote.slice(0, 4)}-${competenciaDetectadaPacote.slice(4, 6)}`
      : undefined,
    totalLinhasProcedimentos: linhasProc.length,
    totalValidos: itensValidos.length,
    totalRejeitados: rejeicoes.length,
    itensValidos,
    rejeicoes,
    grupos: grupos.length > 0 ? grupos : undefined,
    subGrupos: subGrupos.length > 0 ? subGrupos : undefined,
    formasOrganizacao: formasOrganizacao.length > 0 ? formasOrganizacao : undefined,
  }
}
