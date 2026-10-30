import pb from '@/lib/pocketbase/client'
import {
  CanalGrupoMensageria,
  EnviarMensagemParams,
  ListarMensagensFiltros,
  MensagemInterna,
  ResultadoPaginadoMensagens,
  UsuarioDiretorioFuncional,
} from '@/types/hospital'

/**
 * Serviço de Mensageria Interna Hospitalar (Parte 1: Backend + Serviço)
 *
 * - Comunicação estritamente interna entre usuários e grupos cadastrados no sistema.
 * - Autor sempre derivado da sessão ativa (@request.auth.id), sem confiar no navegador.
 * - Participantes de grupos resolvidos no envio e congelados no snapshot da mensagem.
 * - Suporte a idempotency_key contra duplo clique ou retry de rede.
 * - Diretório mínimo sem CPF, CNS, telefone ou dados de pacientes.
 * - Sanitização de texto plano sem renderização HTML.
 */

export function sanitizarTextoMensagem(texto: string): string {
  if (!texto) return ''
  return String(texto).trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

export function gerarChaveIdempotenciaMensagem(prefixo = 'msg'): string {
  const aleatorio = Math.random().toString(36).substring(2, 10)
  const agora = Date.now().toString(36)
  return `${prefixo}_${agora}_${aleatorio}`
}

function parseJsonArray<T>(valor: unknown): T[] {
  if (Array.isArray(valor)) return valor as T[]
  if (typeof valor === 'string' && valor.trim().length > 0) {
    try {
      const parsed = JSON.parse(valor)
      return Array.isArray(parsed) ? parsed : []
    } catch (_) {
      return []
    }
  }
  return []
}

function normalizarMensagem(rec: any): MensagemInterna {
  return {
    id: rec.id,
    remetente: rec.remetente || '',
    remetente_nome_snapshot: rec.remetente_nome_snapshot || '',
    tipo_destinatario: rec.tipo_destinatario || 'usuario',
    destinatario_usuario: rec.destinatario_usuario || undefined,
    destinatario_grupo: rec.destinatario_grupo || undefined,
    destinatarios_resolvidos_ids: parseJsonArray<string>(rec.destinatarios_resolvidos_ids),
    destinatarios_snapshot: parseJsonArray(rec.destinatarios_snapshot),
    assunto: rec.assunto || '',
    conteudo: rec.conteudo || '',
    lida_por: parseJsonArray<string>(rec.lida_por),
    idempotency_key: rec.idempotency_key || undefined,
    expand: rec.expand,
    created: rec.created || '',
    updated: rec.updated || '',
  }
}

/**
 * Consulta o diretório funcional de usuários autorizados (mínimo, sem dados pessoais sensíveis).
 * Não expõe CPF, CNS, telefones, endereços ou prontuários.
 */
export async function listarDiretorioUsuarios(): Promise<UsuarioDiretorioFuncional[]> {
  try {
    // Tenta primeiro o endpoint seguro com projeção mínima
    const res = await pb.send('/backend/v1/mensageria/diretorio-usuarios', {
      method: 'GET',
    })
    if (res && Array.isArray(res.usuarios)) {
      return res.usuarios
    }
  } catch (_) {
    // Fallback via coleção de usuários com campos mínimos
  }

  const records = await pb.collection('_pb_users_auth_').getFullList({
    sort: 'name',
    fields: 'id,name,email,cargo,role',
  })

  return records.map((u) => ({
    id: u.id,
    nome: (u.name as string) || (u.email as string) || 'Usuário',
    cargo: (u.cargo as string) || '',
    role: (u.role as string) || 'profissional',
  }))
}

/**
 * Lista canais e grupos de mensageria ativos para composição de envio.
 */
export async function listarGruposMensageria(): Promise<CanalGrupoMensageria[]> {
  const records = await pb.collection('canais_grupos_mensageria').getFullList({
    filter: 'ativo = true',
    sort: 'nome',
    expand: 'membros',
  })

  return records.map((g) => ({
    id: g.id,
    nome: g.nome as string,
    sigla: (g.sigla as string) || undefined,
    descricao: (g.descricao as string) || undefined,
    ativo: Boolean(g.ativo),
    membros: Array.isArray(g.membros) ? (g.membros as string[]) : [],
    criado_por: (g.criado_por as string) || undefined,
    expand: g.expand as any,
    created: g.created as string,
    updated: g.updated as string,
  }))
}

/**
 * Envia uma mensagem interna hospitalar (individual ou para grupo).
 * Implementa idempotência: se reenviar com a mesma chave, reaproveita o registro gerado.
 */
export async function enviarMensagemInterna(
  params: EnviarMensagemParams,
): Promise<{ mensagem: MensagemInterna; reutilizadoIdempotente: boolean }> {
  const assuntoLimpo = sanitizarTextoMensagem(params.assunto)
  if (!assuntoLimpo || assuntoLimpo.length < 1) {
    throw new Error('O assunto da mensagem é obrigatório.')
  }
  if (assuntoLimpo.length > 160) {
    throw new Error('O assunto da mensagem deve ter no máximo 160 caracteres.')
  }

  const conteudoLimpo = sanitizarTextoMensagem(params.conteudo)
  if (!conteudoLimpo || conteudoLimpo.length < 1) {
    throw new Error('O conteúdo da mensagem é obrigatório.')
  }
  if (conteudoLimpo.length > 4000) {
    throw new Error('O conteúdo da mensagem deve ter no máximo 4000 caracteres.')
  }

  if (params.tipo_destinatario === 'usuario' && !params.destinatario_usuario) {
    throw new Error('Destinatário individual obrigatório.')
  }
  if (params.tipo_destinatario === 'grupo' && !params.destinatario_grupo) {
    throw new Error('Grupo destinatário obrigatório.')
  }

  const chaveIdemp = params.idempotency_key?.trim() || gerarChaveIdempotenciaMensagem()

  const payload: Record<string, any> = {
    tipo_destinatario: params.tipo_destinatario,
    assunto: assuntoLimpo,
    conteudo: conteudoLimpo,
    idempotency_key: chaveIdemp,
  }

  if (params.tipo_destinatario === 'usuario') {
    payload.destinatario_usuario = params.destinatario_usuario
  } else {
    payload.destinatario_grupo = params.destinatario_grupo
  }

  try {
    const record = await pb.collection('mensagens_internas').create(payload, {
      expand: 'remetente,destinatario_usuario,destinatario_grupo',
    })
    return {
      mensagem: normalizarMensagem(record),
      reutilizadoIdempotente: false,
    }
  } catch (err: any) {
    // Tratar retorno de IDEMPOTENT_HIT do hook PocketBase
    const msgErro = err?.data?.message || err?.message || ''
    if (msgErro.includes('IDEMPOTENT_HIT:')) {
      const match = msgErro.match(/IDEMPOTENT_HIT:([a-zA-Z0-9_-]+)/)
      if (match && match[1]) {
        const idExistente = match[1]
        const recExistente = await pb.collection('mensagens_internas').getOne(idExistente, {
          expand: 'remetente,destinatario_usuario,destinatario_grupo',
        })
        return {
          mensagem: normalizarMensagem(recExistente),
          reutilizadoIdempotente: true,
        }
      }
    }

    // Se foi falha de rede pós-gravação e temos chave, consultar por idempotency_key
    if (chaveIdemp && (err?.status === 0 || msgErro.includes('Failed to fetch'))) {
      try {
        const existente = await pb
          .collection('mensagens_internas')
          .getFirstListItem(pb.filter('idempotency_key = {:key}', { key: chaveIdemp }), {
            expand: 'remetente,destinatario_usuario,destinatario_grupo',
          })
        if (existente) {
          return {
            mensagem: normalizarMensagem(existente),
            reutilizadoIdempotente: true,
          }
        }
      } catch {
        /* intentionally ignored */
      }
    }

    throw err
  }
}

/**
 * Lista mensagens da Caixa de Entrada ou Caixa de Enviadas com paginação e busca segura.
 */
export async function listarMensagensInternas(
  filtros: ListarMensagensFiltros,
): Promise<ResultadoPaginadoMensagens> {
  const usuarioId = pb.authStore.record?.id
  if (!usuarioId) {
    throw new Error('Sessão expirada ou não autenticado.')
  }

  const pagina = Math.max(1, filtros.pagina || 1)
  const porPagina = Math.min(100, Math.max(1, filtros.por_pagina || 20))

  let expressaoFiltro = ''

  if (filtros.tipo_caixa === 'enviadas') {
    expressaoFiltro = pb.filter('remetente = {:userId}', { userId: usuarioId })
  } else {
    // Caixa de entrada: usuário é um dos destinatários resolvidos
    expressaoFiltro = pb.filter('destinatarios_resolvidos_ids ~ {:userId}', { userId: usuarioId })
    if (filtros.somente_nao_lidas) {
      expressaoFiltro += ` && !(lida_por ~ '${usuarioId}')`
    }
  }

  if (filtros.busca?.trim()) {
    const termo = filtros.busca.trim().slice(0, 100)
    expressaoFiltro += ` && (assunto ~ {:busca} || conteudo ~ {:busca})`
  }

  const resultList = await pb.collection('mensagens_internas').getList(pagina, porPagina, {
    filter: expressaoFiltro,
    sort: '-created',
    expand: 'remetente,destinatario_usuario,destinatario_grupo',
  })

  // Apurar total de não lidas na caixa de entrada se aplicável
  let totalNaoLidas = 0
  if (filtros.tipo_caixa === 'entrada') {
    try {
      const filtroNaoLidas = `${pb.filter('destinatarios_resolvidos_ids ~ {:userId}', { userId: usuarioId })} && !(lida_por ~ '${usuarioId}')`
      const countRes = await pb.collection('mensagens_internas').getList(1, 1, {
        filter: filtroNaoLidas,
        fields: 'id',
      })
      totalNaoLidas = countRes.totalItems
    } catch (_) {
      totalNaoLidas = 0
    }
  }

  return {
    items: resultList.items.map(normalizarMensagem),
    totalItems: resultList.totalItems,
    totalPages: resultList.totalPages,
    page: resultList.page,
    perPage: resultList.perPage,
    totalNaoLidas,
  }
}

/**
 * Marca uma mensagem como lida pelo usuário autenticado corrente.
 * Se já estiver marcada como lida pelo usuário, retorna sem erro.
 */
export async function marcarMensagemComoLida(mensagemId: string): Promise<MensagemInterna> {
  const usuarioId = pb.authStore.record?.id
  if (!usuarioId) {
    throw new Error('Sessão expirada ou não autenticado.')
  }

  const msg = await pb.collection('mensagens_internas').getOne(mensagemId)
  const lidasAtuais: string[] = parseJsonArray<string>(msg.lida_por)

  if (lidasAtuais.includes(usuarioId)) {
    return normalizarMensagem(msg)
  }

  const novaLista = [...lidasAtuais, usuarioId]
  const atualizado = await pb
    .collection('mensagens_internas')
    .update(
      mensagemId,
      { lida_por: novaLista },
      { expand: 'remetente,destinatario_usuario,destinatario_grupo' },
    )

  return normalizarMensagem(atualizado)
}
