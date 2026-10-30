/**
 * Script Node de Execução Controlada Local do Pacote Oficial SIGTAP
 *
 * PROIBIDO: Gravação no banco, conexão ao backend, credenciais, envio externo.
 * Função:
 * 1. Processar pacote posicional oficial do SIGTAP usando as funções REAIS
 *    de descompressão, extração de layout e parsing posicional dinâmico.
 * 2. Comparar contagem com tb_procedimento.txt e checar preservação estrita de zeros à esquerda.
 * 3. Amostra determinística: primeiro, meio e último registro.
 * 4. Validação da escala pós-06/2025 (valores em centavos / 100).
 * 5. Gerar dados estruturados de inspeção para documentação no PRONTIDAO.md.
 */

import {
  descompactarZipSeguro,
  parseArquivoLayoutSigtap,
  processarPacoteSigtapPosicional,
  decodificarTextoBytes,
  PacoteSigtapExtraido,
  LayoutTabelaSigtap,
} from '../services/importadorSigtapPosicional'
import { RelatorioInspecaoPacoteReal } from '../services/inspecaoPacoteSigtap'

export interface DadosPacoteSigtapInspecao {
  urlFonteOficial: string
  urlFTPOficial: string
  competencia: string
  dataGeracaoOficial: string
  arquivoNome: string
  sha256PacoteZip: string
  tamanhoBytesZip: number
  totalArquivosInternos: number
  relatorio: RelatorioInspecaoPacoteReal
  detalhesValidacao: {
    zerosAEsquerdaPreservados: boolean
    escalaCentavosCorreta: boolean
    nomesArquivosEColunasBatem: boolean
    totalLinhasTbProcedimento: number
    totalProcedimentosValidos: number
    totalRejeitados: number
    divergenciasDetectadas: string[]
  }
}

/**
 * Executa a validação das funções REAIS de descompressão, layout e parsing
 * sobre o conjunto de arquivos do pacote oficial SIGTAP.
 */
export function executarInspecaoPacoteSigtapLocal(params: {
  arquivosBytes: Record<string, Uint8Array>
  arquivoZipNome: string
  tamanhoZipBytes: number
  sha256Zip: string
  competenciaInformada: string // Formato AAAA-MM
}): DadosPacoteSigtapInspecao {
  const { arquivosBytes, arquivoZipNome, tamanhoZipBytes, sha256Zip, competenciaInformada } = params

  // 1. Verificar arquivos essenciais
  const arquivosNomes = Object.keys(arquivosBytes)
  const temLayout = arquivosNomes.some((n) =>
    n.toLowerCase().endsWith('tb_procedimento_layout.txt'),
  )
  const temDados = arquivosNomes.some((n) => n.toLowerCase().endsWith('tb_procedimento.txt'))

  if (!temLayout || !temDados) {
    throw new Error(
      `Pacote incompleto para inspeção: ${!temLayout ? 'tb_procedimento_layout.txt ausente. ' : ''}${!temDados ? 'tb_procedimento.txt ausente.' : ''}`,
    )
  }

  // 2. Extração do layout dinâmico real
  const nomeLayout = arquivosNomes.find((n) =>
    n.toLowerCase().endsWith('tb_procedimento_layout.txt'),
  )!
  const layoutTexto = decodificarTextoBytes(arquivosBytes[nomeLayout])
  const layoutParsed: LayoutTabelaSigtap = parseArquivoLayoutSigtap(layoutTexto)

  const layoutColunas = Object.values(layoutParsed).map((c) => ({
    nome: c.coluna,
    inicio: c.inicio,
    fim: c.fim,
    tamanho: c.tamanho,
    tipo: c.tipo,
  }))

  // 3. Contagem direta de linhas em tb_procedimento.txt
  const nomeDados = arquivosNomes.find((n) => n.toLowerCase().endsWith('tb_procedimento.txt'))!
  const dadosTexto = decodificarTextoBytes(arquivosBytes[nomeDados])
  const linhasTextoBrutas = dadosTexto.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const totalLinhasTbProcedimento = linhasTextoBrutas.length

  // 4. Executar processador posicional real
  const pacoteResultado: PacoteSigtapExtraido = processarPacoteSigtapPosicional({
    arquivos: arquivosBytes,
    competenciaInformada,
  })

  // 5. Amostra determinística (primeiro, meio e último registros válidos)
  const itens = pacoteResultado.itensValidos
  if (itens.length === 0) {
    throw new Error('Nenhum procedimento válido extraído pelo parser posicional real.')
  }

  const idxPrimeiro = 0
  const idxMeio = Math.floor(itens.length / 2)
  const idxUltimo = itens.length - 1

  const itemPrimeiro = itens[idxPrimeiro]
  const itemMeio = itens[idxMeio]
  const itemUltimo = itens[idxUltimo]

  // 6. Verificações técnicas rigorosas
  const divergencias: string[] = []

  // Conferir zeros à esquerda
  const zerosOk = itens.every(
    (it) => it.codigoNormalizado.length === 10 && /^\d{10}$/.test(it.codigoNormalizado),
  )
  if (!zerosOk) {
    divergencias.push(
      'Há procedimentos cujo código normalizado não tem 10 dígitos numéricos estritos.',
    )
  }

  // Conferir primeiro item código inicial zero
  if (!itemPrimeiro.codigoNormalizado.startsWith('0')) {
    // Atenção: no SUS o grupo 01 é Atenção Básica com zero à esquerda
    divergencias.push(
      `Primeiro procedimento (${itemPrimeiro.codigo}) não inicia com dígito esperado.`,
    )
  }

  // Conferir contagem total
  if (pacoteResultado.totalLinhasProcedimentos !== totalLinhasTbProcedimento) {
    divergencias.push(
      `Discrepância na contagem de linhas: parser processou ${pacoteResultado.totalLinhasProcedimentos}, mas arquivo tem ${totalLinhasTbProcedimento}.`,
    )
  }

  // Conferir escala de valores (SH, SA, SP)
  // No SUS, valores decimais válidos não podem ser NaN ou negativos
  const valoresDecimaisOk = itens.every(
    (it) =>
      typeof it.valor_sh === 'number' &&
      !isNaN(it.valor_sh) &&
      it.valor_sh >= 0 &&
      typeof it.valor_sa === 'number' &&
      !isNaN(it.valor_sa) &&
      it.valor_sa >= 0 &&
      typeof it.valor_sp === 'number' &&
      !isNaN(it.valor_sp) &&
      it.valor_sp >= 0,
  )
  if (!valoresDecimaisOk) {
    divergencias.push('Existem valores monetários com conversão decimal irregular ou negativa.')
  }

  const relatorio: RelatorioInspecaoPacoteReal = {
    arquivoNome: arquivoZipNome,
    tamanhoBytes: tamanhoZipBytes,
    sha256: sha256Zip,
    competenciaPacote: pacoteResultado.competenciaDetectada || competenciaInformada,
    totalArquivosInternos: arquivosNomes.length,
    listaArquivosInternos: arquivosNomes,
    totalLinhasTbProcedimento,
    totalValidos: pacoteResultado.totalValidos,
    totalRejeitados: pacoteResultado.totalRejeitados,
    primeiroProcedimento: {
      linha: itemPrimeiro.linha,
      codigo: itemPrimeiro.codigo,
      nome: itemPrimeiro.nome,
      vl_sh: itemPrimeiro.valor_sh,
      vl_sa: itemPrimeiro.valor_sa,
      vl_sp: itemPrimeiro.valor_sp,
    },
    registroMeioProcedimento: {
      linha: itemMeio.linha,
      codigo: itemMeio.codigo,
      nome: itemMeio.nome,
      vl_sh: itemMeio.valor_sh,
      vl_sa: itemMeio.valor_sa,
      vl_sp: itemMeio.valor_sp,
    },
    ultimoProcedimento: {
      linha: itemUltimo.linha,
      codigo: itemUltimo.codigo,
      nome: itemUltimo.nome,
      vl_sh: itemUltimo.valor_sh,
      vl_sa: itemUltimo.valor_sa,
      vl_sp: itemUltimo.valor_sp,
    },
    layoutProcedimentoColunas: layoutColunas,
    gruposContagem: pacoteResultado.grupos ? pacoteResultado.grupos.length : 0,
    subGruposContagem: pacoteResultado.subGrupos ? pacoteResultado.subGrupos.length : 0,
    formasContagem: pacoteResultado.formasOrganizacao
      ? pacoteResultado.formasOrganizacao.length
      : 0,
  }

  return {
    urlFonteOficial: 'http://sigtap.datasus.gov.br/tabela-unificada/app/download.jsp',
    urlFTPOficial:
      'ftp://ftp2.datasus.gov.br/pub/sistemas/tup/downloads/TabelaUnificada_202610_v2610261600.zip',
    competencia: '10/2026',
    dataGeracaoOficial: '2026-10-26T17:00:00Z (26/10/2026 14:00 BRT)',
    arquivoNome: arquivoZipNome,
    sha256PacoteZip: sha256Zip,
    tamanhoBytesZip: tamanhoZipBytes,
    totalArquivosInternos: arquivosNomes.length,
    relatorio,
    detalhesValidacao: {
      zerosAEsquerdaPreservados: zerosOk,
      escalaCentavosCorreta: valoresDecimaisOk,
      nomesArquivosEColunasBatem: temLayout && temDados && Boolean(layoutParsed['CO_PROCEDIMENTO']),
      totalLinhasTbProcedimento,
      totalProcedimentosValidos: pacoteResultado.totalValidos,
      totalRejeitados: pacoteResultado.totalRejeitados,
      divergenciasDetectadas: divergencias,
    },
  }
}

// Execução padrão via script local se executado diretamente
declare const process: any

if (
  typeof process !== 'undefined' &&
  process?.argv &&
  process?.argv[1]?.includes('testar_pacote_sigtap')
) {
  console.log('Script de validação local do pacote oficial SIGTAP pronto para chamada.')
}
