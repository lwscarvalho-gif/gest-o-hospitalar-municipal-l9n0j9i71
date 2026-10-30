import pb from '@/lib/pocketbase/client'
import {
  ImpressoAssistencial,
  TipoImpressoAssistencial,
  OrigemImpressoAssistencial,
  ConteudoReceitaAssistencial,
  ConteudoAtestadoAssistencial,
  ConteudoResumoAltaAssistencial,
} from '@/types/hospital'
import { registrarAuditoria } from './auditoria'
import { formatarDataHoraFuso } from './dataFusoUnidade'

export interface EmitirImpressoParams {
  tipo: TipoImpressoAssistencial
  pacienteId: string
  profissionalId?: string
  profissionalNome: string
  profissionalProfissao: string
  profissionalRegistro: string
  unidadeNome?: string
  municipioUf?: string
  origem: OrigemImpressoAssistencial
  atendimentoPaId?: string
  internacaoId?: string
  prescricaoOrigemId?: string
  cidConsentimentoRegistrado?: boolean
  cidConsentimentoDataHora?: string
  cid10Codigo?: string
  cid10Descricao?: string
  conteudo:
    | ConteudoReceitaAssistencial
    | ConteudoAtestadoAssistencial
    | ConteudoResumoAltaAssistencial
    | Record<string, any>
  observacoesGerais?: string
}

export interface ListarImpressosFiltros {
  pacienteId?: string
  tipo?: TipoImpressoAssistencial
  atendimentoPaId?: string
  internacaoId?: string
}

/**
 * Emite um novo impresso assistencial (receita, atestado ou resumo de alta)
 * com auditoria imediata e validação das regras clínicas e consentimento de CID.
 */
export async function emitirImpressoAssistencial(
  params: EmitirImpressoParams,
): Promise<ImpressoAssistencial> {
  // Validação: profissional é obrigatório na identificação
  if (!params.profissionalNome?.trim()) {
    throw new Error('Identificação do profissional emissor é obrigatória.')
  }
  if (!params.pacienteId) {
    throw new Error('Paciente é obrigatório para emissão de impresso assistencial.')
  }

  // Validação de CID no atestado: exige consentimento explícito
  if (params.tipo === 'atestado' && params.cid10Codigo) {
    if (!params.cidConsentimentoRegistrado) {
      throw new Error(
        'Conforme resolução do CFM e regras do sistema, o CID só pode constar em atestado mediante consentimento explícito do paciente devidamente registrado.',
      )
    }
  }

  const agoraIso = new Date().toISOString()
  const dataHoraFormatada = formatarDataHoraFuso(new Date(), undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: undefined,
  })

  const payload: Record<string, any> = {
    tipo: params.tipo,
    paciente: params.pacienteId,
    profissional_nome: params.profissionalNome.trim(),
    profissional_profissao: params.profissionalProfissao?.trim() || 'Médico(a)',
    profissional_registro: params.profissionalRegistro?.trim() || 'Registro não informado',
    unidade_nome: params.unidadeNome?.trim() || 'Hospital Municipal de Mirante da Serra',
    municipio_uf: params.municipioUf?.trim() || 'Mirante da Serra - RO',
    origem: params.origem,
    data_hora_emissao: dataHoraFormatada,
    cid_consentimento_registrado: !!params.cidConsentimentoRegistrado,
    cid_consentimento_data_hora: params.cidConsentimentoRegistrado
      ? params.cidConsentimentoDataHora || agoraIso
      : '',
    cid10_codigo:
      params.cidConsentimentoRegistrado || params.tipo !== 'atestado'
        ? params.cid10Codigo || ''
        : '',
    cid10_descricao:
      params.cidConsentimentoRegistrado || params.tipo !== 'atestado'
        ? params.cid10Descricao || ''
        : '',
    conteudo: params.conteudo,
    observacoes_gerais: params.observacoesGerais || '',
  }

  if (params.profissionalId) {
    payload.profissional = params.profissionalId
  }
  if (params.atendimentoPaId) {
    payload.atendimento_pa = params.atendimentoPaId
  }
  if (params.internacaoId) {
    payload.internacao = params.internacaoId
  }
  if (params.prescricaoOrigemId) {
    payload.prescricao_origem = params.prescricaoOrigemId
  }

  const record = await pb
    .collection('impressos_assistenciais')
    .create<ImpressoAssistencial>(payload, {
      expand: 'paciente,profissional,atendimento_pa,internacao,prescricao_origem',
    })

  // Trilha de auditoria obrigatória com detalhes do consentimento e profissional
  const rotuloTipo = {
    receita: 'Receita Médica Assistencial',
    atestado: 'Atestado Médico Assistencial',
    resumo_alta: 'Resumo de Alta Hospitalar',
  }[params.tipo]

  const detalhesAuditoria = [
    `Tipo: ${rotuloTipo}`,
    `Origem: ${params.origem}`,
    `Paciente ID: ${params.pacienteId}`,
    `Emissor: ${params.profissionalNome} (${params.profissionalRegistro})`,
    params.atendimentoPaId ? `PA Ref: ${params.atendimentoPaId}` : null,
    params.internacaoId ? `Internação Ref: ${params.internacaoId}` : null,
    params.tipo === 'atestado'
      ? `Consentimento CID: ${params.cidConsentimentoRegistrado ? `AUTORIZADO às ${payload.cid_consentimento_data_hora} (CID: ${payload.cid10_codigo || 'Sem código'})` : 'NÃO AUTORIZADO (CID omitido)'}`
      : null,
  ]
    .filter(Boolean)
    .join(' | ')

  await registrarAuditoria({
    acao: `EMISSAO_IMPRESSO_${params.tipo.toUpperCase()}`,
    modulo: 'Impressos Assistenciais',
    detalhes: detalhesAuditoria,
    registro_id: record.id,
  })

  return record
}

/**
 * Lista impressos emitidos com filtros e ordenação decrescente de criação
 */
export async function listarImpressosAssistenciais(
  filtros: ListarImpressosFiltros = {},
): Promise<ImpressoAssistencial[]> {
  const condicoes: string[] = []

  if (filtros.pacienteId) {
    condicoes.push(`paciente = "${filtros.pacienteId}"`)
  }
  if (filtros.tipo) {
    condicoes.push(`tipo = "${filtros.tipo}"`)
  }
  if (filtros.atendimentoPaId) {
    condicoes.push(`atendimento_pa = "${filtros.atendimentoPaId}"`)
  }
  if (filtros.internacaoId) {
    condicoes.push(`internacao = "${filtros.internacaoId}"`)
  }

  const filter = condicoes.length > 0 ? condicoes.join(' && ') : ''

  return pb
    .collection('impressos_assistenciais')
    .getFullList<ImpressoAssistencial>({
      filter,
      sort: '-created',
      expand: 'paciente,profissional,atendimento_pa,internacao,prescricao_origem',
    })
    .catch((err) => {
      console.error('Falha ao listar impressos assistenciais:', err)
      return []
    })
}

/**
 * Obtém um impresso assistencial pelo ID
 */
export async function obterImpressoPorId(id: string): Promise<ImpressoAssistencial | null> {
  try {
    return await pb.collection('impressos_assistenciais').getOne<ImpressoAssistencial>(id, {
      expand: 'paciente,profissional,atendimento_pa,internacao,prescricao_origem',
    })
  } catch (err) {
    console.error('Falha ao obter impresso por ID:', err)
    return null
  }
}
