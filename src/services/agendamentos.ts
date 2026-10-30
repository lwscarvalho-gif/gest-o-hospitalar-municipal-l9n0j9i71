import pb from '@/lib/pocketbase/client'
import { Agendamento } from '@/types/hospital'
import { registrarAuditoria } from './auditoria'

export async function listarAgendamentos(filtros?: {
  data?: string
  profissionalId?: string
  status?: string
}): Promise<Agendamento[]> {
  const conds: string[] = []
  if (filtros?.data) {
    conds.push(`data_hora ~ "${filtros.data}"`)
  }
  if (filtros?.profissionalId && filtros.profissionalId !== 'todos') {
    conds.push(`profissional = "${filtros.profissionalId}"`)
  }
  if (filtros?.status && filtros.status !== 'todos') {
    conds.push(`status = "${filtros.status}"`)
  }

  const records = await pb.collection('agendamentos').getFullList<Agendamento>({
    filter: conds.join(' && '),
    sort: 'data_hora',
    expand: 'paciente,profissional,setor',
  })
  return records
}

export async function criarAgendamento(dados: {
  paciente: string
  profissional: string
  setor?: string
  tipo: 'consulta' | 'retorno' | 'procedimento' | 'urgencia'
  data_hora: string
  status: 'agendado' | 'confirmado'
  motivo?: string
  observacoes?: string
}): Promise<Agendamento> {
  const record = await pb.collection('agendamentos').create<Agendamento>(dados, {
    expand: 'paciente,profissional,setor',
  })
  await registrarAuditoria({
    acao: 'MARCAR_CONSULTA',
    modulo: 'Agendamento',
    detalhes: `Agendamento criado para ${record.data_hora} (${record.tipo})`,
    registro_id: record.id,
  })
  return record
}

export async function atualizarStatusAgendamento(
  id: string,
  novoStatus: 'agendado' | 'confirmado' | 'em_atendimento' | 'atendido' | 'cancelado',
  observacoes?: string,
): Promise<Agendamento> {
  const payload: any = { status: novoStatus }
  if (observacoes !== undefined) payload.observacoes = observacoes

  const record = await pb.collection('agendamentos').update<Agendamento>(id, payload, {
    expand: 'paciente,profissional,setor',
  })
  await registrarAuditoria({
    acao: 'ALTERAR_STATUS_AGENDAMENTO',
    modulo: 'Agendamento',
    detalhes: `Agendamento status alterado para: ${novoStatus}`,
    registro_id: record.id,
  })
  return record
}
