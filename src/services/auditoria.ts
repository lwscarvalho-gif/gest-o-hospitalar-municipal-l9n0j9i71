import pb from '@/lib/pocketbase/client'
import { AuditoriaRegistro } from '@/types/hospital'

export async function registrarAuditoria(params: {
  acao: string
  modulo: string
  detalhes?: string
  registro_id?: string
}) {
  try {
    const authUser = pb.authStore.model
    const usuario_id = authUser?.id || 'anonimo'
    const usuario_nome = authUser?.name || authUser?.email || 'Usuário Desconhecido'
    const usuario_role = (authUser as any)?.role || 'indefinido'

    await pb.collection('auditoria').create({
      usuario_id,
      usuario_nome,
      usuario_role,
      acao: params.acao,
      modulo: params.modulo,
      detalhes: params.detalhes || '',
      registro_id: params.registro_id || '',
      ip_info: 'Acesso Web Municipal',
    })
  } catch (err) {
    console.warn('Falha ao gravar auditoria:', err)
  }
}

export async function listarAuditoria(limit = 50): Promise<AuditoriaRegistro[]> {
  try {
    const records = await pb.collection('auditoria').getList<AuditoriaRegistro>(1, limit, {
      sort: '-created',
    })
    return records.items
  } catch (err) {
    console.error('Erro ao listar auditoria:', err)
    return []
  }
}
