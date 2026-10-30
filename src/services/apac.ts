/**
 * Serviço Cliente do Módulo APAC Interno
 * Referência: ANEXO I - DOC-02 Seção 7.4.4.4 (pp. 31-32) de "módulos (1).pdf"
 *
 * Escopo Funcional:
 * 1. Listas paginadas de solicitações com CPF e CNS obrigatoriamente mascarados no payload.
 * 2. Criação, retificação e cancelamento auditado de solicitações APAC.
 * 3. Reserva / atribuição de número transacional atômico e idempotente.
 * 4. Tratamento robusto de estados de erro, conflito (409) e reenvio com mesma chave (idempotency hit).
 * 5. Geração de rascunho de pré-preenchimento a partir de dados existentes do PEP (paciente,
 *    atendimento PA, internação, diagnóstico/CID) EXCLUSIVAMENTE para revisão profissional humana
 *    (sem autorização clínica automática, sem envio federal).
 */

import pb from '@/lib/pocketbase/client'
import {
  ApacSolicitacao,
  ApacFaixaSequencia,
  CriarSolicitacaoApacParams,
  RetificarSolicitacaoApacParams,
  ListarSolicitacoesApacFiltros,
  ResultadoPaginadoApac,
  RascunhoApacDoPep,
  CriarFaixaSequenciaParams,
  Paciente,
  Internacao,
  FichaProntoAtendimento,
} from '@/types/hospital'
import { mascararCPF, mascararCNS } from './identificacaoPaciente'
import { registrarAuditoria } from './auditoria'

/**
 * Utilitário de escape de texto para filtros no PocketBase
 */
function escaparFiltro(texto: string): string {
  return texto.replace(/["\\]/g, '\\$&')
}

/**
 * Sanitiza identificadores sensíveis de pacientes (CPF e CNS) nas solicitações
 * de APAC retornadas para a interface, em conformidade com as diretrizes de LGPD.
 */
export function mascararDadosPacienteApac(solic: ApacSolicitacao): ApacSolicitacao {
  let pacExpand = solic.expand?.paciente
  if (pacExpand) {
    pacExpand = {
      ...pacExpand,
      cpf: pacExpand.cpf ? mascararCPF(pacExpand.cpf) : '',
      cartao_sus: pacExpand.cartao_sus ? mascararCNS(pacExpand.cartao_sus) : '',
    }
  }

  let snap = solic.dados_paciente_snapshot
  if (snap) {
    snap = {
      ...snap,
      cpf: snap.cpf ? mascararCPF(snap.cpf) : '',
      cns: snap.cns ? mascararCNS(snap.cns) : '',
    }
  }

  return {
    ...solic,
    dados_paciente_snapshot: snap,
    expand: solic.expand
      ? {
          ...solic.expand,
          paciente: pacExpand,
        }
      : undefined,
  }
}

/**
 * Listagem paginada de solicitações de APAC com filtros administrativos e clínicos.
 * Retorna dados com CPF/CNS mascarados para proteção de dados.
 */
export async function listarSolicitacoesApacPaginado(
  filtros?: ListarSolicitacoesApacFiltros,
): Promise<ResultadoPaginadoApac> {
  try {
    const filterClauses: string[] = []

    if (filtros?.pacienteId) {
      filterClauses.push(`paciente = "${escaparFiltro(filtros.pacienteId)}"`)
    }
    if (filtros?.tipo_laudo && filtros.tipo_laudo !== 'todos') {
      filterClauses.push(`tipo_laudo = "${escaparFiltro(filtros.tipo_laudo)}"`)
    }
    if (filtros?.modalidade && filtros.modalidade !== 'todos') {
      filterClauses.push(`modalidade = "${escaparFiltro(filtros.modalidade)}"`)
    }
    if (filtros?.status && filtros.status !== 'todos') {
      filterClauses.push(`status = "${escaparFiltro(filtros.status)}"`)
    }
    if (filtros?.dataInicio) {
      filterClauses.push(`data_solicitacao >= "${escaparFiltro(filtros.dataInicio)}"`)
    }
    if (filtros?.dataFim) {
      filterClauses.push(`data_solicitacao <= "${escaparFiltro(filtros.dataFim)}"`)
    }
    if (filtros?.busca?.trim()) {
      const q = escaparFiltro(filtros.busca.trim())
      filterClauses.push(
        `(numero_laudo ~ "${q}" || numero_apac ~ "${q}" || cid_principal ~ "${q}" || executante_prestador_nome ~ "${q}" || profissional_solicitante_nome ~ "${q}")`,
      )
    }

    const filter = filterClauses.length > 0 ? filterClauses.join(' && ') : ''
    const pagina = Math.max(1, filtros?.pagina || 1)
    const porPagina = Math.min(100, Math.max(5, filtros?.porPagina || 50))

    const result = await pb
      .collection('apac_solicitacoes')
      .getList<ApacSolicitacao>(pagina, porPagina, {
        filter,
        sort: '-data_solicitacao,-created',
        expand:
          'paciente,internacao,atendimento_pa,profissional_solicitante,faixa_sequencia_origem,apac_anterior_ref,solicitacao_original_ref',
      })

    return {
      items: result.items.map(mascararDadosPacienteApac),
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    }
  } catch (err) {
    console.error('Erro ao listar solicitações de APAC paginadas:', err)
    return {
      items: [],
      page: 1,
      perPage: 50,
      totalItems: 0,
      totalPages: 0,
    }
  }
}

/**
 * Obter uma solicitação de APAC específica pelo ID com relações expandidas e mascaramento
 */
export async function obterSolicitacaoApacPorId(id: string): Promise<ApacSolicitacao | null> {
  try {
    const record = await pb.collection('apac_solicitacoes').getOne<ApacSolicitacao>(id, {
      expand:
        'paciente,internacao,atendimento_pa,profissional_solicitante,faixa_sequencia_origem,apac_anterior_ref,solicitacao_original_ref',
    })
    return mascararDadosPacienteApac(record)
  } catch (err) {
    console.error('Erro ao obter solicitação de APAC por ID:', err)
    return null
  }
}

/**
 * Criar nova solicitação de APAC com suporte a idempotência e tratamento de conflitos
 */
export async function criarSolicitacaoApac(
  params: CriarSolicitacaoApacParams,
): Promise<ApacSolicitacao> {
  const chaveIdempotente =
    params.idempotency_key ||
    `apac_solic_${params.paciente}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  const agora = new Date()
  const dataHoje = agora.toISOString().slice(0, 10)
  const dataSolic = params.data_solicitacao || dataHoje

  try {
    const novo = await pb.collection('apac_solicitacoes').create<ApacSolicitacao>({
      paciente: params.paciente,
      internacao: params.internacao || null,
      atendimento_pa: params.atendimento_pa || null,
      unidade_solicitante: params.unidade_solicitante.trim(),
      profissional_solicitante: params.profissional_solicitante || null,
      profissional_solicitante_nome: params.profissional_solicitante_nome?.trim() || '',
      data_solicitacao: dataSolic,
      numero_laudo: params.numero_laudo.trim(),
      tipo_laudo: params.tipo_laudo,
      modalidade: params.modalidade,
      apac_anterior_numero: params.apac_anterior_numero?.trim() || '',
      apac_anterior_ref: params.apac_anterior_ref || null,
      executante_prestador_nome: params.executante_prestador_nome.trim(),
      executante_cnes: params.executante_cnes?.trim() || '',
      cid_principal: params.cid_principal.trim().toUpperCase(),
      cid_secundario: params.cid_secundario?.trim().toUpperCase() || '',
      cid_causas_associadas: params.cid_causas_associadas?.trim().toUpperCase() || '',
      validade_inicial: params.validade_inicial.trim(),
      validade_final: params.validade_final.trim(),
      status: 'solicitada',
      tipo_registro: 'ato_original',
      numero_versao: 1,
      idempotency_key: chaveIdempotente,
    })

    await registrarAuditoria({
      acao: 'Solicitação de APAC Emitida',
      modulo: 'APAC',
      detalhes: `Solicitação APAC tipo "${params.tipo_laudo}" (${params.modalidade}) criada para paciente ID ${params.paciente}. Laudo: ${params.numero_laudo}.`,
      registro_id: novo.id,
    })

    return mascararDadosPacienteApac(novo)
  } catch (err: any) {
    const msg = String(err?.message || '')

    // Hit idempotente seguro
    if (msg.includes('IDEMPOTENT_HIT:')) {
      const match = msg.match(/IDEMPOTENT_HIT:([a-zA-Z0-9_-]+)/)
      const existingId = match ? match[1] : null
      if (existingId) {
        const existente = await pb
          .collection('apac_solicitacoes')
          .getOne<ApacSolicitacao>(existingId, {
            expand:
              'paciente,internacao,atendimento_pa,profissional_solicitante,faixa_sequencia_origem,apac_anterior_ref',
          })
        return mascararDadosPacienteApac(existente)
      }
    }

    if (msg.includes('IDEMPOTENCY_PAYLOAD_CONFLICT')) {
      throw new Error(
        'CONFLITO_IDEMPOTENCIA: Esta chave de envio já foi processada anteriormente para outra solicitação.',
      )
    }

    throw err
  }
}

/**
 * Retificar uma solicitação de APAC existente:
 * Preserva o registro original imutável e cria uma nova versão vinculada com motivo/autor/data.
 */
export async function retificarSolicitacaoApac(
  params: RetificarSolicitacaoApacParams,
): Promise<ApacSolicitacao> {
  const original = await pb
    .collection('apac_solicitacoes')
    .getOne<ApacSolicitacao>(params.solicitacao_original_id)
  if (!original) {
    throw new Error('Solicitação original de APAC não foi localizada.')
  }

  const chaveIdempotente =
    params.idempotency_key ||
    `apac_retif_${original.id}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  const agora = new Date()
  const dataHoje = agora.toISOString().slice(0, 10)

  try {
    const novaVersao = await pb.collection('apac_solicitacoes').create<ApacSolicitacao>({
      paciente: original.paciente,
      internacao: original.internacao || null,
      atendimento_pa: original.atendimento_pa || null,
      unidade_solicitante: params.unidade_solicitante?.trim() || original.unidade_solicitante,
      profissional_solicitante:
        params.profissional_solicitante || original.profissional_solicitante || null,
      profissional_solicitante_nome:
        params.profissional_solicitante_nome?.trim() || original.profissional_solicitante_nome,
      data_solicitacao: dataHoje,
      numero_laudo: original.numero_laudo,
      numero_apac: original.numero_apac || '',
      faixa_sequencia_origem: original.faixa_sequencia_origem || null,
      tipo_laudo: original.tipo_laudo,
      modalidade: original.modalidade,
      apac_anterior_numero: original.apac_anterior_numero || '',
      apac_anterior_ref: original.apac_anterior_ref || null,
      executante_prestador_nome:
        params.executante_prestador_nome?.trim() || original.executante_prestador_nome,
      executante_cnes: params.executante_cnes?.trim() || original.executante_cnes || '',
      cid_principal: (params.cid_principal || original.cid_principal).trim().toUpperCase(),
      cid_secundario: (params.cid_secundario ?? original.cid_secundario ?? '').trim().toUpperCase(),
      cid_causas_associadas: (params.cid_causas_associadas ?? original.cid_causas_associadas ?? '')
        .trim()
        .toUpperCase(),
      validade_inicial: params.validade_inicial?.trim() || original.validade_inicial,
      validade_final: params.validade_final?.trim() || original.validade_final,
      status: original.status === 'autorizada' ? 'autorizada' : 'solicitada',
      tipo_registro: 'retificacao',
      solicitacao_original_ref: original.id,
      motivo_retificacao: params.motivo_retificacao.trim(),
      idempotency_key: chaveIdempotente,
    })

    await registrarAuditoria({
      acao: 'Retificação de Solicitação de APAC',
      modulo: 'APAC',
      detalhes: `Retificação formal (versão ${novaVersao.numero_versao}) da APAC original ID ${original.id}. Motivo: ${params.motivo_retificacao}`,
      registro_id: novaVersao.id,
    })

    return mascararDadosPacienteApac(novaVersao)
  } catch (err: any) {
    const msg = String(err?.message || '')
    if (msg.includes('IDEMPOTENT_HIT:')) {
      const match = msg.match(/IDEMPOTENT_HIT:([a-zA-Z0-9_-]+)/)
      const existingId = match ? match[1] : null
      if (existingId) {
        const existente = await pb
          .collection('apac_solicitacoes')
          .getOne<ApacSolicitacao>(existingId)
        return mascararDadosPacienteApac(existente)
      }
    }
    throw err
  }
}

/**
 * Cancelar solicitação de APAC com justificativa clínica/administrativa auditada.
 * A numeração nunca é reutilizada silenciosamente.
 */
export async function cancelarSolicitacaoApac(
  solicitacaoId: string,
  motivoCancelamento: string,
): Promise<ApacSolicitacao> {
  const atualizado = await pb
    .collection('apac_solicitacoes')
    .update<ApacSolicitacao>(solicitacaoId, {
      status: 'cancelada',
      motivo_cancelamento: motivoCancelamento.trim(),
    })

  await registrarAuditoria({
    acao: 'Cancelamento de APAC',
    modulo: 'APAC',
    detalhes: `Solicitação APAC ID ${solicitacaoId} cancelada. Motivo: ${motivoCancelamento}`,
    registro_id: solicitacaoId,
  })

  return mascararDadosPacienteApac(atualizado)
}

/**
 * Reserva e atribuição atômica de número de APAC via endpoint transacional seguro do backend.
 * Garante idempotência: se reenviado com a mesma chave, não duplica e retorna o número já reservado.
 */
export async function reservarNumeroApacTransacional(params: {
  solicitacao_id: string
  idempotency_key: string
  ano?: number
  uf?: string
  tipo_laudo?: string
}): Promise<{
  sucesso: boolean
  numero_apac: string
  solicitacao_id: string
  ja_atribuido?: boolean
  mensagem?: string
}> {
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
  const url = `${baseUrl.replace(/\/$/, '')}/backend/v1/apac/reservar-numero`

  const token = pb.authStore.token
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify(params),
  })

  const data = await response.json()

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error(
        `CONFLITO_SEQUENCIA_APAC: ${data.erro || 'Faixa de numeração esgotada ou inexistente.'}`,
      )
    }
    throw new Error(data.erro || 'Falha ao reservar número de APAC.')
  }

  await registrarAuditoria({
    acao: 'Reserva de Número de APAC',
    modulo: 'APAC',
    detalhes: `Número ${data.numero_apac} reservado e atribuído à solicitação ID ${params.solicitacao_id}.`,
    registro_id: params.solicitacao_id,
  })

  return data
}

/**
 * Listar faixas de sequência configuradas pelo operador municipal autorizado
 */
export async function listarFaixasSequenciasApac(ano?: number): Promise<ApacFaixaSequencia[]> {
  try {
    const filter = ano ? `ano = ${ano}` : ''
    const records = await pb.collection('apac_faixas_sequencias').getFullList<ApacFaixaSequencia>({
      filter,
      sort: '-ano,tipo_apac',
    })
    return records
  } catch (err) {
    console.error('Erro ao listar faixas de APAC:', err)
    return []
  }
}

/**
 * Cadastrar nova faixa de numeração de APAC (restrito a admin/gestor municipal)
 */
export async function cadastrarFaixaSequenciaApac(
  params: CriarFaixaSequenciaParams,
): Promise<ApacFaixaSequencia> {
  const nova = await pb.collection('apac_faixas_sequencias').create<ApacFaixaSequencia>({
    ano: params.ano,
    uf: params.uf.trim().toUpperCase(),
    tipo_apac: params.tipo_apac,
    faixa_inicial: params.faixa_inicial,
    faixa_final: params.faixa_final,
    numero_atual: params.faixa_inicial - 1, // Inicializa para começar na faixa_inicial
    validade_inicial: params.validade_inicial.trim(),
    validade_final: params.validade_final.trim(),
    ativo: params.ativo !== false,
    observacoes: params.observacoes?.trim() || '',
  })

  await registrarAuditoria({
    acao: 'Cadastro de Faixa de Sequência APAC',
    modulo: 'APAC',
    detalhes: `Faixa ${params.faixa_inicial} a ${params.faixa_final} cadastrada para ano ${params.ano}, UF ${params.uf}, tipo ${params.tipo_apac}.`,
    registro_id: nova.id,
  })

  return nova
}

/**
 * Gerar Rascunho a partir do Prontuário Eletrônico do Paciente (PEP / Atendimento PA / Internação).
 * Conforme item 7.4.4.4.c.i:
 * "Mecanismo de emissão direta no Prontuário Eletrônico do Paciente (PEP) no ato da consulta médica/multiprofissional,
 * permitindo a geração automática da APAC com todos os dados clínicos e cadastrais previamente preenchidos,
 * sem a necessidade de redigitação pelo profissional."
 *
 * RESTRIÇÃO DE SEGURANÇA:
 * Este método gera estritamente um RASCUNHO DE PRÉ-PREENCHIMENTO para revisão profissional humana no navegador.
 * Nenhuma autorização clínica automática é concedida; o profissional de saúde deve revisar,
 * confirmar diagnósticos/CIDs e assinar a solicitação.
 */
export function gerarRascunhoApacDoPep(params: {
  paciente: Paciente
  atendimentoPa?: FichaProntoAtendimento
  internacao?: Internacao
  profissionalNome?: string
  profissionalId?: string
  unidadeSolicitante?: string
}): RascunhoApacDoPep {
  const {
    paciente,
    atendimentoPa,
    internacao,
    profissionalNome,
    profissionalId,
    unidadeSolicitante,
  } = params

  const agora = new Date()
  const dataHoje = agora.toISOString().slice(0, 10)

  // Cálculo aproximado de validade inicial (data atual) e final (3 meses à frente, padrão SUS APAC)
  const dataValidadeFim = new Date(agora)
  dataValidadeFim.setMonth(dataValidadeFim.getMonth() + 3)
  const validadeFinalStr = dataValidadeFim.toISOString().slice(0, 10)

  // Diagnóstico / CID herdado do atendimento clínico ativo
  const cidPrincipalDetectado = atendimentoPa?.cid10 || internacao?.cid10_admissao || 'Z00.0'

  // Determinar idade se data de nascimento informada
  let idadeCalculada: number | undefined
  if (paciente.data_nascimento) {
    const partes = paciente.data_nascimento.split('-')
    if (partes.length === 3) {
      const anoNasc = parseInt(partes[0], 10)
      if (!isNaN(anoNasc)) {
        idadeCalculada = agora.getFullYear() - anoNasc
      }
    }
  }

  const snapshot: RascunhoApacDoPep['dados_paciente_snapshot'] = {
    nome: paciente.nome || '',
    nome_mae: paciente.nome_mae || '',
    cns: paciente.cartao_sus || '',
    cpf: paciente.cpf || '',
    data_nascimento: paciente.data_nascimento || '',
    idade: idadeCalculada,
    sexo: paciente.sexo || '',
    raca_cor: 'Não informada',
    responsavel_legal: '',
    numero_prontuario: paciente.id,
  }

  const seqRascunho = Math.floor(Math.random() * 9000 + 1000)
  const numeroLaudoSugerido = `LAUDO-${agora.getFullYear()}-${seqRascunho}`

  return {
    paciente: paciente.id,
    dados_paciente_snapshot: snapshot,
    internacao: internacao?.id,
    atendimento_pa: atendimentoPa?.id,
    unidade_solicitante: unidadeSolicitante || 'Hospital Municipal de Mirante da Serra',
    profissional_solicitante: profissionalId,
    profissional_solicitante_nome: profissionalNome || 'Profissional Solicitante',
    cid_principal: cidPrincipalDetectado,
    cid_secundario: '',
    data_solicitacao: dataHoje,
    numero_laudo_sugerido: numeroLaudoSugerido,
    tipo_laudo_padrao: 'laudo_geral',
    modalidade_padrao: 'inicial',
    validade_inicial_sugerida: dataHoje,
    validade_final_sugerida: validadeFinalStr,
    executante_prestador_sugerido: 'Centro de Especialidades e Alta Complexidade SUS',
    revisao_profissional_obrigatoria: true,
  }
}
