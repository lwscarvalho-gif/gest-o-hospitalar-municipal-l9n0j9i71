/**
 * Serviço Oficial de Identificação, Busca Segura e Desambiguação de Pacientes
 *
 * Especificações Oficiais:
 * - CPF: Módulo 11 (Receita Federal / Portaria ANS SIB-XML)
 *   Referência oficial: https://www.gov.br/ans/pt-br/arquivos/assuntos/espaco-da-operadora-de-plano-de-saude/aplicativos-ans/sib/sibalgoritmosxml1002072026.pdf
 * - CNS: Cartão Nacional de Saúde (15 dígitos - Algoritmo oficial DATASUS / MS / e-SUS AB / ANS SIB)
 *   Referência oficial: https://integracao.esusab.ufsc.br/v211/docs/algoritmo_CNS.html
 *
 * Regras do Sistema Municipal:
 * - Preservação estrita de zeros à esquerda (CNS e CPF são strings numéricas, nunca números inteiros).
 * - Ausência de documento permitida para Recém-Nascidos (RN) e Urgência/Emergência sem documento.
 * - Privacidade LGPD: mascaramento em listagens de resultados; exibição completa apenas em registro detalhado.
 * - Desambiguação por Data de Nascimento e Nome da Mãe.
 * - Homônimos por nome geram apenas alerta humano; união ou mesclagem automática é terminantemente proibida.
 */

import pb from '@/lib/pocketbase/client'
import { Paciente } from '@/types/hospital'

// =============================================================================
// 1. VALIDAÇÃO OFICIAL DE CPF (Módulo 11 - Receita Federal / ANS)
// =============================================================================

export interface ResultadoValidacaoDocumento {
  valido: boolean
  motivo?: string
}

/**
 * Remove formatações pontuação mas preserva estritamente todos os zeros à esquerda.
 */
export function limparApenasDigitosPreservandoZeros(valor?: string | null): string {
  if (!valor) return ''
  return valor.replace(/\D/g, '')
}

/**
 * Validação oficial de CPF com algoritmo Módulo 11 da Receita Federal.
 * Permite vazio caso seja recém-nascido ou atendimento de urgência sem identificador.
 */
export function validarCPFOficial(
  cpfBruto?: string | null,
  obrigatorio = false,
): ResultadoValidacaoDocumento {
  if (!cpfBruto || !cpfBruto.trim()) {
    if (obrigatorio) {
      return { valido: false, motivo: 'CPF não informado.' }
    }
    return { valido: true } // Vazio permitido para RN / urgência
  }

  const cpf = limparApenasDigitosPreservandoZeros(cpfBruto)

  if (cpf.length !== 11) {
    return {
      valido: false,
      motivo: `CPF deve conter exatamente 11 dígitos numéricos (informado: ${cpf.length}). Zeros à esquerda devem ser mantidos.`,
    }
  }

  // Rejeita sequências com todos os dígitos repetidos (000.000.000-00, 111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(cpf)) {
    return {
      valido: false,
      motivo: 'CPF inválido: sequência de dígitos idênticos não é permitida.',
    }
  }

  // Cálculo do 1º Dígito Verificador (pesos de 10 a 2)
  let soma1 = 0
  for (let i = 0; i < 9; i++) {
    soma1 += parseInt(cpf.charAt(i), 10) * (10 - i)
  }
  let resto1 = soma1 % 11
  const dv1Esperado = resto1 < 2 ? 0 : 11 - resto1

  if (parseInt(cpf.charAt(9), 10) !== dv1Esperado) {
    return {
      valido: false,
      motivo: 'CPF inválido: primeiro dígito verificador não confere com o cálculo oficial.',
    }
  }

  // Cálculo do 2º Dígito Verificador (pesos de 11 a 2)
  let soma2 = 0
  for (let i = 0; i < 10; i++) {
    soma2 += parseInt(cpf.charAt(i), 10) * (11 - i)
  }
  let resto2 = soma2 % 11
  const dv2Esperado = resto2 < 2 ? 0 : 11 - resto2

  if (parseInt(cpf.charAt(10), 10) !== dv2Esperado) {
    return {
      valido: false,
      motivo: 'CPF inválido: segundo dígito verificador não confere com o cálculo oficial.',
    }
  }

  return { valido: true }
}

// =============================================================================
// 2. VALIDAÇÃO OFICIAL DE CNS (Cartão Nacional de Saúde - 15 dígitos)
// =============================================================================

/**
 * Validação oficial do Cartão Nacional de Saúde (CNS).
 * Suporta tanto CNS Definitivo (iniciado em 1 ou 2) quanto Provisório (iniciado em 7, 8 ou 9).
 * Algoritmo oficial DATASUS / MS / ANS SIB.
 */
export function validarCNSOficial(
  cnsBruto?: string | null,
  obrigatorio = false,
): ResultadoValidacaoDocumento {
  if (!cnsBruto || !cnsBruto.trim()) {
    if (obrigatorio) {
      return { valido: false, motivo: 'Cartão SUS (CNS) não informado.' }
    }
    return { valido: true } // Vazio permitido para RN sem documento inicial
  }

  const cns = limparApenasDigitosPreservandoZeros(cnsBruto)

  if (cns.length !== 15) {
    return {
      valido: false,
      motivo: `O Cartão SUS deve conter exatamente 15 dígitos numéricos (informado: ${cns.length}).`,
    }
  }

  // Rejeita sequências de todos zeros ou todos iguais
  if (/^(\d)\1{14}$/.test(cns)) {
    return { valido: false, motivo: 'Cartão SUS inválido: número formado por dígitos repetidos.' }
  }

  const primeiroDigito = cns.charAt(0)

  // Caso 1: CNS que inicia com 1 ou 2 (Base PIS/PASEP)
  if (primeiroDigito === '1' || primeiroDigito === '2') {
    const pis = cns.substring(0, 11)
    let soma = 0
    for (let i = 0; i < 11; i++) {
      soma += parseInt(pis.charAt(i), 10) * (15 - i)
    }
    const resto = soma % 11
    let dv = 11 - resto
    if (dv === 11) dv = 0

    let resultado = ''
    if (dv === 10) {
      let soma2 = 0
      for (let i = 0; i < 11; i++) {
        soma2 += parseInt(pis.charAt(i), 10) * (15 - i)
      }
      soma2 += 2
      const resto2 = soma2 % 11
      let dv2 = 11 - resto2
      if (dv2 === 11) dv2 = 0
      resultado = pis + '001' + dv2.toString()
    } else {
      resultado = pis + '000' + dv.toString()
    }

    if (cns === resultado) {
      return { valido: true }
    }
    return {
      valido: false,
      motivo:
        'Cartão SUS (CNS definitivo) com dígito verificador inválido pelo algoritmo oficial do Ministério da Saúde.',
    }
  }

  // Caso 2: CNS Provisório (Inicia com 7, 8 ou 9)
  if (primeiroDigito === '7' || primeiroDigito === '8' || primeiroDigito === '9') {
    let soma = 0
    for (let i = 0; i < 15; i++) {
      soma += parseInt(cns.charAt(i), 10) * (15 - i)
    }
    if (soma % 11 === 0) {
      return { valido: true }
    }
    return {
      valido: false,
      motivo: 'Cartão SUS (CNS provisório) inválido pelo algoritmo de soma ponderada mod 11.',
    }
  }

  return {
    valido: false,
    motivo: `Cartão SUS inválido: primeiro dígito (${primeiroDigito}) não reconhecido (deve iniciar com 1, 2, 7, 8 ou 9).`,
  }
}

// =============================================================================
// 3. MASCARAMENTO SEGURO DE IDENTIFICADORES (LGPD & Privacidade)
// =============================================================================

/**
 * Mascara o CPF para privacidade em listas de pesquisa e visualizações públicas.
 * Exemplo: 123.456.789-01 -> ***.456.789-** ou 123.***.***-01
 * Aqui preservamos o início e fim ou ofuscamos miolo para conferência segura sem vazar o documento completo.
 */
export function mascararCPF(cpfBruto?: string | null): string {
  if (!cpfBruto) return 'Não informado'
  const digitos = limparApenasDigitosPreservandoZeros(cpfBruto)
  if (digitos.length !== 11) {
    return cpfBruto ? '***' + cpfBruto.slice(-3) : 'Não informado'
  }
  // Formato: 123.***.***-01
  return `${digitos.slice(0, 3)}.***.***-${digitos.slice(9, 11)}`
}

/**
 * Mascara o CNS (Cartão SUS) de 15 dígitos para privacidade em listagens.
 * Exemplo: 704105154942080 -> 704.****.****.080
 */
export function mascararCNS(cnsBruto?: string | null): string {
  if (!cnsBruto) return 'Sem Cartão SUS'
  const digitos = limparApenasDigitosPreservandoZeros(cnsBruto)
  if (digitos.length !== 15) {
    return cnsBruto ? '***' + cnsBruto.slice(-4) : 'Sem Cartão SUS'
  }
  return `${digitos.slice(0, 3)}.****.****.${digitos.slice(12, 15)}`
}

// =============================================================================
// 4. NORMALIZAÇÃO DE BUSCA E TRATAMENTO DE ACENTOS
// =============================================================================

/**
 * Remove acentos e normaliza termo para buscas em memória e comparação de homônimos.
 */
export function normalizarTextoBusca(texto?: string | null): string {
  if (!texto) return ''
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

// =============================================================================
// 5. ANÁLISE DE HOMÔNIMOS (APENAS AVISO HUMANO - PROIBIDO MERGE AUTOMÁTICO)
// =============================================================================

export interface AlertaHomonimo {
  suspeita: boolean
  tipo:
    | 'homonimo_exato'
    | 'mesmo_nome_mae_divergente'
    | 'mesmo_nome_nascimento_divergente'
    | 'nenhuma'
  mensagem: string
  pacienteExistente?: Paciente
}

/**
 * Compara dois registros para alertar sobre possível homônimo.
 * Regra do Sistema: O sistema JAMAIS junta, mescla ou altera automaticamente
 * o cadastro histórico de outro paciente. Apenas sinaliza para decisão humana.
 */
export function analisarSuspeitaHomonimo(
  novo: { nome: string; nomeMae?: string; dataNascimento?: string; id?: string },
  existente: Paciente,
): AlertaHomonimo {
  if (novo.id && novo.id === existente.id) {
    return { suspeita: false, tipo: 'nenhuma', mensagem: '' }
  }

  const nomeNovoNorm = normalizarTextoBusca(novo.nome)
  const nomeExistenteNorm = normalizarTextoBusca(existente.nome)

  if (!nomeNovoNorm || nomeNovoNorm !== nomeExistenteNorm) {
    return { suspeita: false, tipo: 'nenhuma', mensagem: '' }
  }

  const maeNovoNorm = normalizarTextoBusca(novo.nomeMae)
  const maeExistenteNorm = normalizarTextoBusca(existente.nome_mae)

  const nascNovo = novo.dataNascimento ? novo.dataNascimento.split('T')[0] : ''
  const nascExistente = existente.data_nascimento ? existente.data_nascimento.split('T')[0] : ''

  const mesmaMae = maeNovoNorm && maeExistenteNorm && maeNovoNorm === maeExistenteNorm
  const mesmoNasc = nascNovo && nascExistente && nascNovo === nascExistente

  if (mesmaMae && mesmoNasc) {
    return {
      suspeita: true,
      tipo: 'homonimo_exato',
      mensagem: `Atenção: Paciente homônimo exato detectado ("${existente.nome}"), com mesma data de nascimento (${nascExistente}) e mesmo nome de mãe. Verifique se não se trata de duplicidade ou confira o Cartão SUS/CPF antes de prosseguir.`,
      pacienteExistente: existente,
    }
  }

  if (mesmoNasc && (!maeNovoNorm || !maeExistenteNorm || maeNovoNorm !== maeExistenteNorm)) {
    return {
      suspeita: true,
      tipo: 'mesmo_nome_mae_divergente',
      mensagem: `Alerta de Homônimo: Existe outro paciente com o mesmo nome e mesma data de nascimento (${nascExistente}), porém a filiação materna é divergente ou incompleta. Verifique com atenção os documentos do usuário. Não haverá união automática de históricos.`,
      pacienteExistente: existente,
    }
  }

  return {
    suspeita: true,
    tipo: 'mesmo_nome_nascimento_divergente',
    mensagem: `Alerta de Homônimo: Outro paciente já possui o nome "${existente.nome}", mas com data de nascimento diferente (${nascExistente || 'não informada'}). Cadastros mantidos separados.`,
    pacienteExistente: existente,
  }
}

// =============================================================================
// 6. BUSCA PAGINADA NO SERVIDOR COM PRESERVAÇÃO DE ZEROS À ESQUERDA
// =============================================================================

export interface ParametrosBuscaPacientes {
  termo?: string
  pagina?: number
  porPagina?: number
}

export interface ResultadoBuscaPacientesPaginada {
  itens: Paciente[]
  totalItens: number
  totalPaginas: number
  paginaAtual: number
}

/**
 * Busca paginada no PocketBase.
 * NUNCA carrega toda a base de pacientes no cliente.
 * Preserva zeros à esquerda ao buscar por CPF ou Cartão SUS (ex: "0014" não vira "14").
 */
/**
 * Escapa com segurança strings para uso em filtros PocketBase,
 * neutralizando caracteres de injeção e aspas.
 */
export function escaparFiltroPocketBase(valor: string): string {
  if (!valor) return ''
  return valor
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n|\r/g, ' ')
}

/**
 * Busca paginada no PocketBase com minimização de dados no servidor.
 * 1. Tenta prioritariamente o endpoint `/backend/v1/pacientes/busca-minimizada`
 *    que já entrega CPF e CNS mascarados direto do servidor.
 * 2. Caso o endpoint customizado não responda (fallback de ambiente local/mock),
 *    utiliza a listagem padrão de pacientes aplicando sanitização e limite estrito.
 * Preserva zeros à esquerda ao buscar por CPF ou Cartão SUS (ex: "0014" não vira "14").
 */
export async function buscarPacientesPaginadoNoServidor(
  params: ParametrosBuscaPacientes = {},
): Promise<ResultadoBuscaPacientesPaginada> {
  const pagina = params.pagina && params.pagina > 0 ? params.pagina : 1
  const porPagina = params.porPagina && params.porPagina > 0 ? Math.min(params.porPagina, 50) : 15
  const termo = params.termo ? params.termo.trim() : ''

  // 1. Tentativa via endpoint de payload minimizado no servidor
  try {
    const queryParams = new URLSearchParams({
      pagina: String(pagina),
      porPagina: String(porPagina),
      ...(termo ? { termo } : {}),
    })

    const respostaServidor = await pb.send<ResultadoBuscaPacientesPaginada>(
      `/backend/v1/pacientes/busca-minimizada?${queryParams.toString()}`,
      {
        method: 'GET',
        requestKey: null,
      },
    )

    if (respostaServidor && Array.isArray(respostaServidor.itens)) {
      return respostaServidor
    }
  } catch (_e) {
    // Continua para o fallback seguro caso rota não esteja disponível
  }

  // 2. Fallback com filtros escapados e limite estrito
  let filterStr = ''

  if (termo) {
    const digitosComZeros = limparApenasDigitosPreservandoZeros(termo)
    const partesFiltro: string[] = []

    const termoEscapado = escaparFiltroPocketBase(termo)
    partesFiltro.push(`nome ~ "${termoEscapado}"`)
    partesFiltro.push(`nome_mae ~ "${termoEscapado}"`)

    if (digitosComZeros.length > 0) {
      const digitosEscapados = escaparFiltroPocketBase(digitosComZeros)
      partesFiltro.push(`cartao_sus ~ "${digitosEscapados}"`)
      partesFiltro.push(`cpf ~ "${digitosEscapados}"`)
    }

    filterStr = partesFiltro.join(' || ')
  }

  try {
    const res = await pb.collection('pacientes').getList(pagina, porPagina, {
      filter: filterStr || undefined,
      sort: 'nome',
      requestKey: null,
    })

    // Minimização de payload no fallback de cliente
    const itensMinimizados = (res.items as unknown as Paciente[]).map((p) => ({
      ...p,
      cpf: mascararCPF(p.cpf),
      cartao_sus: mascararCNS(p.cartao_sus),
    }))

    return {
      itens: itensMinimizados,
      totalItens: res.totalItems,
      totalPaginas: res.totalPages,
      paginaAtual: res.page,
    }
  } catch (err: any) {
    console.error('Erro na busca paginada de pacientes no servidor:', err)
    throw new Error(err?.message || 'Falha ao buscar pacientes no servidor.')
  }
}
