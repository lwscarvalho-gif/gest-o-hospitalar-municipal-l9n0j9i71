import pb from '@/lib/pocketbase/client'
import {
  ItemFilaRIS,
  FiltrosFilaRIS,
  RespostaFilaRIS,
  RequisicaoImagemPepParams,
  TransitarStatusRISParams,
  AgendarExameRISParams,
  ComprovanteAgendamentoRISSnapshot,
  ReagendarExameRISParams,
  RegistrarExameExternoRISParams,
  RisModeloLaudo,
  CriarModeloLaudoRISParams,
  RisAgenda,
  RisHistoricoTransicao,
  SalvarRascunhoLaudoRISParams,
  RespostaSalvarRascunhoRIS,
  PublicarLaudoRISParams,
  RespostaPublicarLaudoRIS,
  RetificarLaudoRISParams,
  RespostaRetificarLaudoRIS,
  RespostaPreviaLaudoRIS,
} from '@/types/hospital'
import { registrarAuditoria } from './auditoria'

/**
 * Serviço de Integração do Módulo RIS (Radiologia e Diagnóstico por Imagem)
 * Conforme Seção 7.4.3.4.a.i-iv e c.ii e itens 313-316 do ANEXO I.
 */

export interface RespostaRequisicaoPepRIS {
  sucesso: boolean
  idempotente?: boolean
  mensagem: string
  exame_id: string
  modalidade_ris: string
  status_ris: string
  tipo_execucao: string
}

/**
 * 1. Emissão de Requisição de Exame de Imagem a partir do PEP
 * Validação de paciente/internação/PA no servidor e idempotência estrita
 */
export async function solicitarExameImagemPep(
  params: RequisicaoImagemPepParams,
): Promise<RespostaRequisicaoPepRIS> {
  const idempotencyKey =
    params.idempotency_key ||
    `ris-req-${params.paciente_id}-${params.tipo_exame.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`

  const payload = {
    ...params,
    idempotency_key: idempotencyKey,
  }

  const res = (await pb.send('/backend/v1/ris/requisicao-pep', {
    method: 'POST',
    body: payload,
  })) as RespostaRequisicaoPepRIS

  try {
    await registrarAuditoria({
      acao: 'SOLICITACAO_IMAGEM_PEP_RIS',
      modulo: 'ris',
      registro_id: res.exame_id,
      detalhes: JSON.stringify({
        tipo_exame: params.tipo_exame,
        modalidade: res.modalidade_ris,
        paciente_id: params.paciente_id,
        idempotency_key: idempotencyKey,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

/**
 * 2. Consulta da Fila RIS paginada com isolamento clínico para recepção
 */
export async function listarFilaRIS(filtros: FiltrosFilaRIS = {}): Promise<RespostaFilaRIS> {
  const queryParams = new URLSearchParams()
  if (filtros.status) queryParams.set('status', filtros.status)
  if (filtros.modalidade) queryParams.set('modalidade', filtros.modalidade)
  if (filtros.setor) queryParams.set('setor', filtros.setor)
  if (filtros.tipo_execucao) queryParams.set('tipo_execucao', filtros.tipo_execucao)
  if (filtros.busca) queryParams.set('busca', filtros.busca)
  if (filtros.paciente) queryParams.set('paciente', filtros.paciente)
  if (filtros.page) queryParams.set('page', String(filtros.page))
  if (filtros.perPage) queryParams.set('perPage', String(filtros.perPage))

  const queryString = queryParams.toString()
  const path = `/backend/v1/ris/fila${queryString ? `?${queryString}` : ''}`

  const res = await pb.send(path, {
    method: 'GET',
  })

  return res as RespostaFilaRIS
}

/**
 * 3. Transição humana autorizada e auditada de status na fila RIS
 * Proibida liberação clínica automática; motivo obrigatório para cancelamento
 */
export async function transitarStatusRIS(
  exameId: string,
  params: TransitarStatusRISParams,
): Promise<{
  sucesso: boolean
  mensagem: string
  exame_id: string
  status_anterior: string
  status_novo: string
  data_hora: string
}> {
  const res = (await pb.send(`/backend/v1/ris/exames/${encodeURIComponent(exameId)}/transicao`, {
    method: 'POST',
    body: params,
  })) as {
    sucesso: boolean
    mensagem: string
    exame_id: string
    status_anterior: string
    status_novo: string
    data_hora: string
  }

  try {
    await registrarAuditoria({
      acao: 'TRANSICAO_STATUS_RIS',
      modulo: 'ris',
      registro_id: exameId,
      detalhes: JSON.stringify({
        status_anterior: res.status_anterior,
        status_novo: res.status_novo,
        motivo: params.motivo_justificativa,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

/**
 * 4. Agendamento com validação de conflito de agenda no servidor e comprovante seguro
 */
export async function agendarExameRIS(params: AgendarExameRISParams): Promise<{
  sucesso: boolean
  mensagem: string
  agenda_id: string
  idempotente?: boolean
  comprovante: ComprovanteAgendamentoRISSnapshot
}> {
  const idempotencyKey =
    params.idempotency_key ||
    `ris-ag-${params.exame_id}-${params.sala_equipamento.toLowerCase().replace(/\s+/g, '-')}-${params.data_hora_inicio}`

  const payload = {
    ...params,
    idempotency_key: idempotencyKey,
  }

  const res = (await pb.send('/backend/v1/ris/agendar', {
    method: 'POST',
    body: payload,
  })) as {
    sucesso: boolean
    mensagem: string
    agenda_id: string
    idempotente?: boolean
    comprovante: ComprovanteAgendamentoRISSnapshot
  }

  try {
    await registrarAuditoria({
      acao: 'AGENDAMENTO_RIS',
      modulo: 'ris',
      registro_id: res.agenda_id,
      detalhes: JSON.stringify({
        exame_id: params.exame_id,
        sala_equipamento: params.sala_equipamento,
        data_hora_inicio: params.data_hora_inicio,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

/**
 * 5. Reagendamento sem apagar histórico (inativa anterior e cria nova agenda)
 */
export async function reagendarExameRIS(
  agendaId: string,
  params: ReagendarExameRISParams,
): Promise<{
  sucesso: boolean
  mensagem: string
  agenda_anterior_id: string
  nova_agenda_id: string
  comprovante: ComprovanteAgendamentoRISSnapshot
}> {
  const res = (await pb.send(`/backend/v1/ris/agendas/${encodeURIComponent(agendaId)}/reagendar`, {
    method: 'POST',
    body: params,
  })) as {
    sucesso: boolean
    mensagem: string
    agenda_anterior_id: string
    nova_agenda_id: string
    comprovante: ComprovanteAgendamentoRISSnapshot
  }

  try {
    await registrarAuditoria({
      acao: 'REAGENDAMENTO_RIS',
      modulo: 'ris',
      registro_id: res.nova_agenda_id,
      detalhes: JSON.stringify({
        agenda_anterior_id: agendaId,
        nova_data_inicio: params.nova_data_hora_inicio,
        motivo: params.motivo,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

/**
 * 6. Cancelamento de agendamento preservando histórico
 */
export async function cancelarAgendamentoRIS(
  agendaId: string,
  motivo: string,
): Promise<{
  sucesso: boolean
  mensagem: string
  agenda_id: string
  status: string
}> {
  const res = (await pb.send(`/backend/v1/ris/agendas/${encodeURIComponent(agendaId)}/cancelar`, {
    method: 'POST',
    body: { motivo },
  })) as {
    sucesso: boolean
    mensagem: string
    agenda_id: string
    status: string
  }

  try {
    await registrarAuditoria({
      acao: 'CANCELAMENTO_AGENDAMENTO_RIS',
      modulo: 'ris',
      registro_id: agendaId,
      detalhes: JSON.stringify({ motivo }),
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

/**
 * 7. Registro de exame externo: identifica prestador/origem sem falsear execução interna
 */
export async function registrarExameExternoRIS(
  exameId: string,
  params: RegistrarExameExternoRISParams,
): Promise<{
  sucesso: boolean
  mensagem: string
  exame_id: string
  tipo_execucao: string
  prestador_externo_nome: string
  status_ris: string
}> {
  const res = (await pb.send(
    `/backend/v1/ris/exames/${encodeURIComponent(exameId)}/registrar-externo`,
    {
      method: 'POST',
      body: params,
    },
  )) as {
    sucesso: boolean
    mensagem: string
    exame_id: string
    tipo_execucao: string
    prestador_externo_nome: string
    status_ris: string
  }

  try {
    await registrarAuditoria({
      acao: 'REGISTRO_EXAME_EXTERNO_RIS',
      modulo: 'ris',
      registro_id: exameId,
      detalhes: JSON.stringify({
        prestador: params.prestador_externo_nome,
        cnes: params.prestador_externo_cnes,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

/**
 * 8. Modelos de Laudo Versionados e Inativáveis
 */
export async function salvarModeloLaudoRIS(params: CriarModeloLaudoRISParams): Promise<{
  sucesso: boolean
  mensagem: string
  modelo_id: string
  versao: number
}> {
  const res = (await pb.send('/backend/v1/ris/modelos', {
    method: 'POST',
    body: params,
  })) as {
    sucesso: boolean
    mensagem: string
    modelo_id: string
    versao: number
  }

  try {
    await registrarAuditoria({
      acao: 'SALVAR_MODELO_LAUDO_RIS',
      modulo: 'ris',
      registro_id: res.modelo_id,
      detalhes: JSON.stringify({
        titulo: params.titulo,
        versao: res.versao,
        modalidade: params.modalidade,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

export async function inativarModeloLaudoRIS(modeloId: string): Promise<{
  sucesso: boolean
  mensagem: string
  modelo_id: string
  ativo: boolean
}> {
  const res = (await pb.send(`/backend/v1/ris/modelos/${encodeURIComponent(modeloId)}/inativar`, {
    method: 'POST',
  })) as {
    sucesso: boolean
    mensagem: string
    modelo_id: string
    ativo: boolean
  }

  try {
    await registrarAuditoria({
      acao: 'INATIVAR_MODELO_LAUDO_RIS',
      modulo: 'ris',
      registro_id: modeloId,
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

export async function listarModelosLaudoRIS(
  modalidade?: string,
  apenasAtivos = true,
): Promise<RisModeloLaudo[]> {
  const filters: string[] = []
  if (apenasAtivos) {
    filters.push('ativo = true')
  }
  if (modalidade && modalidade !== 'todos') {
    filters.push(`modalidade = "${modalidade}"`)
  }

  const records = await pb.collection('ris_modelos_laudo').getFullList<RisModeloLaudo>({
    filter: filters.length ? filters.join(' && ') : undefined,
    sort: '-created',
  })

  return records
}

/**
 * ----------------------------------------------------------------------------
 * SERVIÇOS CLIENTE TYPESCRIPT — EDITOR FORMATADO DE LAUDOS RIS (0.0.60)
 * Conforme contrato implantado nos endpoints 10, 11, 12 e 13 do hook PocketBase:
 * - /backend/v1/ris/exames/{id}/salvar-rascunho (POST)
 * - /backend/v1/ris/exames/{id}/publicar-laudo (POST)
 * - /backend/v1/ris/exames/{id}/retificar-laudo (POST)
 * - /backend/v1/ris/exames/{id}/previa-laudo (GET)
 * ----------------------------------------------------------------------------
 */

export interface OpcoesRequisicaoRIS {
  seqMomento?: number
  seqReferencia?: { current: number }
  session_token?: string
}

/**
 * Função de Sanitização Server-Side / Fonte da Verdade do RIS
 * Espelha fielmente a implementação JSVM implantada no hook `pocketbase/hooks/ris_modulo.pb.js`
 * para validação e execução em testes unitários e de integração locais.
 */
export function sanitizarHtmlServidorRIS(inputHtml: unknown): string {
  if (!inputHtml) return ''
  let str = String(inputHtml)
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  str = str.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  str = str.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
  str = str.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
  str = str.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
  str = str.replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '')
  str = str.replace(/<!--[\s\S]*?-->/g, '')
  str = str.replace(/\son[a-zA-Z_]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  str = str.replace(/href\s*=\s*["']?\s*(?:javascript|vbscript|data):[^"'>\s]*/gi, 'href="#"')
  str = str.replace(/<img\b([^>]*?)>/gi, function (_match, attrs) {
    const srcMatch = attrs.match(/src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
    let srcVal = srcMatch ? srcMatch[1] || srcMatch[2] || srcMatch[3] || '' : ''
    srcVal = srcVal.trim()
    const isInternoValido =
      srcVal.indexOf('/api/files/ris_imagens_anexas/') !== -1 ||
      srcVal.indexOf('/api/files/exames/') !== -1 ||
      srcVal.indexOf('/assets/') === 0 ||
      srcVal.indexOf('/ris-internal-image/') === 0
    if (!isInternoValido) {
      return '<span class="ris-img-bloqueada text-slate-400 italic text-xs">[Imagem externa bloqueada por segurança do RIS]</span>'
    }
    const altMatch = attrs.match(/alt\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
    const altVal = altMatch ? altMatch[1] || altMatch[2] || 'Imagem do Exame' : 'Imagem do Exame'
    const widthMatch = attrs.match(/width\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
    const heightMatch = attrs.match(/height\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
    const idMatch = attrs.match(/data-imagem-id\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
    let safeAttrs =
      'src="' + srcVal.replace(/"/g, '&quot;') + '" alt="' + altVal.replace(/"/g, '&quot;') + '"'
    if (widthMatch)
      safeAttrs +=
        ' width="' + (widthMatch[1] || widthMatch[2] || widthMatch[3]).replace(/"/g, '&quot;') + '"'
    if (heightMatch)
      safeAttrs +=
        ' height="' +
        (heightMatch[1] || heightMatch[2] || heightMatch[3]).replace(/"/g, '&quot;') +
        '"'
    if (idMatch)
      safeAttrs += ' data-imagem-id="' + (idMatch[1] || idMatch[2]).replace(/"/g, '&quot;') + '"'
    safeAttrs += ' class="ris-imagem-laudo-interna max-w-full rounded border border-slate-300 my-2"'
    return '<img ' + safeAttrs + ' />'
  })
  const allowlistTags = [
    'p',
    'br',
    'hr',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'mark',
    'span',
    'div',
    'ul',
    'ol',
    'li',
    'a',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'input',
    'label',
  ]
  str = str.replace(
    /<(\/?)([a-zA-Z0-9_-]+)([^>]*)>/gi,
    function (fullMatch, closingSlash, tagName, restAttrs) {
      const tagLower = tagName.toLowerCase()
      if (tagLower === 'img') return fullMatch
      if (allowlistTags.indexOf(tagLower) === -1) return ''
      if (tagLower === 'input') {
        if (!restAttrs.match(/type\s*=\s*["']?checkbox["']?/i)) return ''
        const isChecked = !!restAttrs.match(/\bchecked\b/i)
        return (
          '<input type="checkbox"' +
          (isChecked ? ' checked' : '') +
          ' disabled class="ris-checklist-item" />'
        )
      }
      let safeTagAttrs = ''
      if (tagLower === 'a') {
        const hrefMatch = restAttrs.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
        let hVal = hrefMatch ? hrefMatch[1] || hrefMatch[2] || hrefMatch[3] || '#' : '#'
        if (
          hVal.toLowerCase().indexOf('javascript:') !== -1 ||
          hVal.toLowerCase().indexOf('data:') !== -1
        ) {
          hVal = '#'
        }
        safeTagAttrs +=
          ' href="' + hVal.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener noreferrer"'
      }
      if (tagLower === 'td' || tagLower === 'th') {
        const colMatch = restAttrs.match(/colspan\s*=\s*["']?(\d+)["']?/i)
        const rowMatch = restAttrs.match(/rowspan\s*=\s*["']?(\d+)["']?/i)
        if (colMatch) safeTagAttrs += ' colspan="' + colMatch[1] + '"'
        if (rowMatch) safeTagAttrs += ' rowspan="' + rowMatch[1] + '"'
      }
      const classMatch = restAttrs.match(/class\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
      if (classMatch) {
        const clsVal = (classMatch[1] || classMatch[2] || '').trim()
        safeTagAttrs += ' class="' + clsVal.replace(/["<>]/g, '') + '"'
      }
      const styleMatch = restAttrs.match(/style\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
      if (styleMatch) {
        let rawStyle = (styleMatch[1] || styleMatch[2] || '').trim()
        rawStyle = rawStyle.replace(/url\s*\([^)]*\)/gi, '')
        rawStyle = rawStyle.replace(/expression\s*\([^)]*\)/gi, '')
        rawStyle = rawStyle.replace(/javascript\s*:/gi, '')
        safeTagAttrs += ' style="' + rawStyle.replace(/"/g, '&quot;') + '"'
      }
      const dataMatches = restAttrs.match(/data-[a-zA-Z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*')/gi)
      if (dataMatches && dataMatches.length > 0) {
        for (let d = 0; d < dataMatches.length; d++) {
          safeTagAttrs += ' ' + dataMatches[d]
        }
      }
      return '<' + closingSlash + tagLower + safeTagAttrs + '>'
    },
  )
  return str
}

/**
 * Erro de conflito de concorrência de edição (HTTP 409)
 */
export class ConflitoConcorrenciaEdicaoError extends Error {
  readonly versaoAtualServidor?: number
  readonly versaoEsperadaCliente?: number

  constructor(mensagem: string, versaoAtualServidor?: number, versaoEsperadaCliente?: number) {
    super(mensagem)
    this.name = 'ConflitoConcorrenciaEdicaoError'
    this.versaoAtualServidor = versaoAtualServidor
    this.versaoEsperadaCliente = versaoEsperadaCliente
  }
}

/**
 * Erro de resposta obsoleta descartada por seqRef (troca de paciente ou sessão em voo)
 */
export class RespostaSessaoObsoletaError extends Error {
  constructor(mensagem = 'Resposta assíncrona descartada por transição de sessão/paciente.') {
    super(mensagem)
    this.name = 'RespostaSessaoObsoletaError'
  }
}

/**
 * Helper para validar se a resposta em voo ainda pertence à sessão ativa (padrão seqRef)
 */
function verificarDescarteSessao(opcoes?: OpcoesRequisicaoRIS) {
  if (
    opcoes &&
    opcoes.seqMomento !== undefined &&
    opcoes.seqReferencia !== undefined &&
    opcoes.seqMomento !== opcoes.seqReferencia.current
  ) {
    throw new RespostaSessaoObsoletaError()
  }
}

/**
 * 12. Salvar Rascunho Formatado no RIS com Concorrência Otimista (409)
 * Contrato backend: POST /backend/v1/ris/exames/{id}/salvar-rascunho
 */
export async function salvarRascunhoLaudoRIS(
  exameId: string,
  params: SalvarRascunhoLaudoRISParams,
  opcoes?: OpcoesRequisicaoRIS,
): Promise<RespostaSalvarRascunhoRIS> {
  const token = params.session_token || opcoes?.session_token || pb.authStore.token
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
  const url = `${baseUrl.replace(/\/$/, '')}/backend/v1/ris/exames/${encodeURIComponent(exameId)}/salvar-rascunho`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      conteudo_formatado: params.conteudo_formatado,
      versao_esperada: params.versao_esperada,
      config_editor: params.config_editor,
      resultado_sumario: params.resultado_sumario,
    }),
  })

  // Validação do padrão seqRef: se a sessão/paciente mudou enquanto a requisição estava em voo, descarta
  verificarDescarteSessao(opcoes)

  const data = await response.json()

  if (!response.ok) {
    if (response.status === 409) {
      throw new ConflitoConcorrenciaEdicaoError(
        data.erro ||
          'O rascunho deste laudo foi modificado por outro profissional. Atualize sua visualização antes de salvar.',
        data.versao_atual_servidor,
        data.versao_esperada_cliente,
      )
    }
    throw new Error(data.erro || 'Falha ao salvar rascunho de laudo RIS.')
  }

  try {
    await registrarAuditoria({
      acao: 'SALVAR_RASCUNHO_RIS',
      modulo: 'ris',
      registro_id: exameId,
      detalhes: JSON.stringify({
        versao: data.versao_conteudo_rascunho,
        autor_id: data.autor_id,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return data as RespostaSalvarRascunhoRIS
}

/**
 * 13. Publicar (Liberar) Laudo Formalmente no RIS
 * Cria Versão 1 imutável em `laudos_versoes`, congela snapshot e atualiza exame para laudado/liberado.
 * Contrato backend: POST /backend/v1/ris/exames/{id}/publicar-laudo
 */
export async function publicarLaudoRIS(
  exameId: string,
  params: PublicarLaudoRISParams,
  opcoes?: OpcoesRequisicaoRIS,
): Promise<RespostaPublicarLaudoRIS> {
  const token = params.session_token || opcoes?.session_token || pb.authStore.token
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
  const url = `${baseUrl.replace(/\/$/, '')}/backend/v1/ris/exames/${encodeURIComponent(exameId)}/publicar-laudo`

  const idempotencyKey = params.idempotency_key || `ris-pub-${exameId}-${Date.now().toString(36)}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      conteudo_formatado: params.conteudo_formatado,
      resultado_sumario: params.resultado_sumario,
      idempotency_key: idempotencyKey,
      config_editor: params.config_editor,
    }),
  })

  verificarDescarteSessao(opcoes)

  const data = await response.json()

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error(
        `IDEMPOTENCY_PAYLOAD_CONFLICT: ${data.erro || 'Conflito de chave de idempotência.'}`,
      )
    }
    throw new Error(data.erro || 'Falha ao liberar laudo RIS.')
  }

  try {
    await registrarAuditoria({
      acao: 'PUBLICAR_LAUDO_RIS',
      modulo: 'ris',
      registro_id: exameId,
      detalhes: JSON.stringify({
        versao_numero: data.versao_numero,
        versao_id: data.versao_id,
        idempotente: data.idempotente,
        idempotency_key: idempotencyKey,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return data as RespostaPublicarLaudoRIS
}

/**
 * 14. Retificar Laudo Formalmente no RIS
 * Cria NOVA versão imutável (V2, V3...) sem alterar as versões anteriores já emitidas.
 * Exige justificativa clínica (mínimo 5 caracteres) e resultado conclusivo.
 * Contrato backend: POST /backend/v1/ris/exames/{id}/retificar-laudo
 */
export async function retificarLaudoRIS(
  exameId: string,
  params: RetificarLaudoRISParams,
  opcoes?: OpcoesRequisicaoRIS,
): Promise<RespostaRetificarLaudoRIS> {
  const token = params.session_token || opcoes?.session_token || pb.authStore.token
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
  const url = `${baseUrl.replace(/\/$/, '')}/backend/v1/ris/exames/${encodeURIComponent(exameId)}/retificar-laudo`

  const idempotencyKey = params.idempotency_key || `ris-ret-${exameId}-${Date.now().toString(36)}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      conteudo_formatado: params.conteudo_formatado,
      resultado_sumario: params.resultado_sumario,
      motivo_retificacao: params.motivo_retificacao,
      idempotency_key: idempotencyKey,
      config_editor: params.config_editor,
    }),
  })

  verificarDescarteSessao(opcoes)

  const data = await response.json()

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error(
        `IDEMPOTENCY_PAYLOAD_CONFLICT: ${data.erro || 'Conflito de chave de idempotência na retificação.'}`,
      )
    }
    throw new Error(data.erro || 'Falha ao retificar laudo RIS.')
  }

  try {
    await registrarAuditoria({
      acao: 'RETIFICAR_LAUDO_RIS',
      modulo: 'ris',
      registro_id: exameId,
      detalhes: JSON.stringify({
        versao_numero: data.versao_numero,
        versao_id: data.versao_id,
        versao_anterior_id: data.versao_anterior_id,
        motivo_retificacao: params.motivo_retificacao,
        idempotente: data.idempotente,
        idempotency_key: idempotencyKey,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return data as RespostaRetificarLaudoRIS
}

/**
 * 15. Obter Prévia Oficial do Laudo RIS Formatado
 * Serve prévia com layout municipal, dados do paciente, histórico de versões e imagens anexas.
 * Contrato backend: GET /backend/v1/ris/exames/{id}/previa-laudo
 */
export async function obterPreviaLaudoRIS(
  exameId: string,
  opcoes?: OpcoesRequisicaoRIS,
): Promise<RespostaPreviaLaudoRIS> {
  const token = opcoes?.session_token || pb.authStore.token
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
  const url = `${baseUrl.replace(/\/$/, '')}/backend/v1/ris/exames/${encodeURIComponent(exameId)}/previa-laudo`

  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  verificarDescarteSessao(opcoes)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.erro || 'Falha ao obter prévia de laudo RIS.')
  }

  return data as RespostaPreviaLaudoRIS
}

/**
 * 9. Aplicação de Modelo: Gera APENAS RASCUNHO para revisão humana
 * Bloqueado no servidor caso o laudo já tenha sido liberado
 */
export async function aplicarModeloLaudoComoRascunho(
  exameId: string,
  modeloId: string,
): Promise<{
  sucesso: boolean
  mensagem: string
  exame_id: string
  modelo_id: string
  modelo_titulo: string
  modelo_versao: number
  rascunho_gerado: string
}> {
  const res = (await pb.send(
    `/backend/v1/ris/exames/${encodeURIComponent(exameId)}/aplicar-modelo`,
    {
      method: 'POST',
      body: { modelo_id: modeloId },
    },
  )) as {
    sucesso: boolean
    mensagem: string
    exame_id: string
    modelo_id: string
    modelo_titulo: string
    modelo_versao: number
    rascunho_gerado: string
  }

  try {
    await registrarAuditoria({
      acao: 'APLICAR_MODELO_RASCUNHO_RIS',
      modulo: 'ris',
      registro_id: exameId,
      detalhes: JSON.stringify({
        modelo_id: modeloId,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return res
}

/**
 * 10. Consulta de Histórico de Transições da Fila RIS (Trilha Auditável)
 */
export async function listarHistoricoTransicoesRIS(
  exameId: string,
): Promise<RisHistoricoTransicao[]> {
  const records = await pb
    .collection('ris_historico_transicoes')
    .getFullList<RisHistoricoTransicao>({
      filter: `exame = "${exameId}"`,
      sort: '-created',
    })

  return records
}

/**
 * 11. Consulta de Agendas vinculadas a um exame
 */
export async function listarAgendasDoExameRIS(exameId: string): Promise<RisAgenda[]> {
  const records = await pb.collection('ris_agendas').getFullList<RisAgenda>({
    filter: `exame = "${exameId}"`,
    sort: '-created',
  })

  return records
}
