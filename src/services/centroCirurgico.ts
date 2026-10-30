import pb from '@/lib/pocketbase/client'
import {
  SalaCirurgica,
  Cirurgia,
  ChecklistPreOperatorio,
  AtoOperatorio,
  RecuperacaoPosAnestesica,
  StatusSalaCirurgica,
  StatusCirurgia,
  DestinoSRPA,
  TipoAnestesia,
  TipoPacienteCirurgia,
} from '@/types/hospital'
import { registrarAuditoria } from './auditoria'

// ============================================================================
// SALAS CIRÚRGICAS
// ============================================================================

export async function listarSalasCirurgicas(): Promise<SalaCirurgica[]> {
  try {
    const records = await pb.collection('salas_cirurgicas').getFullList<SalaCirurgica>({
      sort: 'nome',
    })
    return records
  } catch (err) {
    console.error('Erro ao listar salas cirúrgicas:', err)
    return []
  }
}

export async function atualizarStatusSalaCirurgica(
  salaId: string,
  status: StatusSalaCirurgica,
  motivo_bloqueio?: string,
): Promise<SalaCirurgica> {
  const data: Partial<SalaCirurgica> = {
    status,
    motivo_bloqueio: motivo_bloqueio || '',
  }
  const res = await pb.collection('salas_cirurgicas').update<SalaCirurgica>(salaId, data)

  await registrarAuditoria({
    acao: `Alteração de status da sala cirúrgica para "${status.toUpperCase()}"`,
    modulo: 'Centro Cirúrgico',
    detalhes: `Sala ID: ${salaId}${motivo_bloqueio ? ` | Motivo: ${motivo_bloqueio}` : ''}`,
    registro_id: salaId,
  })

  return res
}

// ============================================================================
// AGENDA E CICLO DAS CIRURGIAS
// ============================================================================

export interface CriarCirurgiaParams {
  paciente: string
  tipo_paciente: TipoPacienteCirurgia
  internacao?: string
  atendimento_pa?: string
  sala: string
  procedimento_codigo?: string
  procedimento_nome: string
  data_horario_previsto: string
  duracao_estimada_minutos?: number
  cirurgiao_principal: string
  cirurgiao_principal_nome: string
  anestesista?: string
  anestesista_nome?: string
  instrumentador?: string
  instrumentador_nome?: string
  equipe_adicional?: string
  observacoes_agendamento?: string
}

export async function listarCirurgias(filtros?: {
  pacienteId?: string
  salaId?: string
  status?: string
}): Promise<Cirurgia[]> {
  try {
    const filterParts: string[] = []
    if (filtros?.pacienteId) {
      filterParts.push(`paciente = "${filtros.pacienteId}"`)
    }
    if (filtros?.salaId) {
      filterParts.push(`sala = "${filtros.salaId}"`)
    }
    if (filtros?.status && filtros.status !== 'todos') {
      filterParts.push(`status = "${filtros.status}"`)
    }

    const records = await pb.collection('cirurgias').getFullList<Cirurgia>({
      filter: filterParts.length > 0 ? filterParts.join(' && ') : undefined,
      sort: '-data_horario_previsto',
      expand:
        'paciente,internacao,atendimento_pa,sala,cirurgiao_principal,anestesista,instrumentador',
    })
    return records
  } catch (err) {
    console.error('Erro ao listar cirurgias:', err)
    return []
  }
}

export async function agendarCirurgia(params: CriarCirurgiaParams): Promise<Cirurgia> {
  const dados = {
    ...params,
    status: 'agendada' as StatusCirurgia,
  }

  const record = await pb.collection('cirurgias').create<Cirurgia>(dados)

  await registrarAuditoria({
    acao: 'Agendamento de cirurgia',
    modulo: 'Centro Cirúrgico',
    detalhes: `Procedimento: ${params.procedimento_nome} | Data/Horário: ${params.data_horario_previsto} | Cirurgião: ${params.cirurgiao_principal_nome}`,
    registro_id: record.id,
  })

  return record
}

export async function reagendarCirurgia(
  cirurgiaId: string,
  novaDataHora: string,
  novaSalaId?: string,
  motivo?: string,
): Promise<Cirurgia> {
  const patch: Record<string, any> = {
    data_horario_previsto: novaDataHora,
  }
  if (novaSalaId) {
    patch.sala = novaSalaId
  }
  if (motivo) {
    patch.observacoes_agendamento = motivo
  }

  const record = await pb.collection('cirurgias').update<Cirurgia>(cirurgiaId, patch)

  await registrarAuditoria({
    acao: 'Reagendamento de cirurgia',
    modulo: 'Centro Cirúrgico',
    detalhes: `Cirurgia ID: ${cirurgiaId} reagendada para ${novaDataHora}${motivo ? ` | Motivo: ${motivo}` : ''}`,
    registro_id: cirurgiaId,
  })

  return record
}

export async function cancelarCirurgia(
  cirurgiaId: string,
  motivo_cancelamento: string,
): Promise<Cirurgia> {
  const record = await pb.collection('cirurgias').update<Cirurgia>(cirurgiaId, {
    status: 'cancelada',
    motivo_cancelamento,
  })

  // Se a cirurgia cancelada estava com sala ocupada, verifica se deve liberar
  if (record.sala) {
    try {
      await pb.collection('salas_cirurgicas').update(record.sala, {
        status: 'livre',
      })
    } catch {
      /* intentionally ignored */
    }
  }

  await registrarAuditoria({
    acao: 'Cancelamento de cirurgia agendada',
    modulo: 'Centro Cirúrgico',
    detalhes: `Cirurgia ID: ${cirurgiaId} | Motivo: ${motivo_cancelamento}`,
    registro_id: cirurgiaId,
  })

  return record
}

export async function iniciarCirurgiaEmSala(cirurgiaId: string, salaId: string): Promise<Cirurgia> {
  const agora = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const record = await pb.collection('cirurgias').update<Cirurgia>(cirurgiaId, {
    status: 'em_sala',
    data_hora_inicio: agora,
  })

  // Atualizar sala cirúrgica para 'ocupada'
  await pb.collection('salas_cirurgicas').update(salaId, {
    status: 'ocupada',
  })

  await registrarAuditoria({
    acao: 'Início da cirurgia em sala cirúrgica',
    modulo: 'Centro Cirúrgico',
    detalhes: `Cirurgia ID: ${cirurgiaId} em sala. Sala ID ${salaId} marcada como OCUPADA`,
    registro_id: cirurgiaId,
  })

  return record
}

export async function encaminharParaSRPA(cirurgiaId: string, salaId: string): Promise<Cirurgia> {
  const record = await pb.collection('cirurgias').update<Cirurgia>(cirurgiaId, {
    status: 'em_recuperacao',
  })

  // Ao desocupar a sala cirúrgica, ela entra automaticamente em 'limpeza' para desinfecção terminal
  await pb.collection('salas_cirurgicas').update(salaId, {
    status: 'limpeza',
    motivo_bloqueio: 'Higienização e desinfecção pós-operatória',
  })

  await registrarAuditoria({
    acao: 'Encaminhamento do paciente para SRPA / Recuperação',
    modulo: 'Centro Cirúrgico',
    detalhes: `Cirurgia ID: ${cirurgiaId} em recuperação. Sala ID ${salaId} encaminhada para LIMPEZA`,
    registro_id: cirurgiaId,
  })

  return record
}

// ============================================================================
// CHECKLIST PRÉ-OPERATÓRIO (SEGURANÇA CIRÚRGICA OMS)
// ============================================================================

export interface SalvarChecklistPreOpParams {
  cirurgia: string
  paciente: string
  data_conferencia: string
  responsavel?: string
  responsavel_nome: string
  jejum_confirmado: boolean
  jejum_horas?: number
  exames_pre_operatorios_ok: boolean
  detalhes_exames?: string
  consentimento_informado_assinado: boolean
  avaliacao_risco_anestesico_concluida: boolean
  risco_asa?: any
  demarcacao_lateralidade: boolean
  alergias_checadas: boolean
  reserva_sangue_hemoderivados: boolean
  retirada_proteses_adornos: boolean
  acesso_venoso_permeavel: boolean
  liberado_centro_cirurgico: boolean
  observacoes?: string
}

export async function obterChecklistPorCirurgia(
  cirurgiaId: string,
): Promise<ChecklistPreOperatorio | null> {
  try {
    const records = await pb
      .collection('checklists_pre_operatorios')
      .getFullList<ChecklistPreOperatorio>({
        filter: `cirurgia = "${cirurgiaId}"`,
        sort: '-created',
        expand: 'responsavel',
      })
    return records.length > 0 ? records[0] : null
  } catch (err) {
    console.error('Erro ao buscar checklist pré-operatório:', err)
    return null
  }
}

export async function salvarChecklistPreOperatorio(
  params: SalvarChecklistPreOpParams,
  checklistExistenteId?: string,
): Promise<ChecklistPreOperatorio> {
  let record: ChecklistPreOperatorio
  if (checklistExistenteId) {
    record = await pb
      .collection('checklists_pre_operatorios')
      .update<ChecklistPreOperatorio>(checklistExistenteId, params)
  } else {
    record = await pb
      .collection('checklists_pre_operatorios')
      .create<ChecklistPreOperatorio>(params)
  }

  // Se liberado para o centro cirúrgico, atualiza o status da cirurgia para 'checklist_concluido'
  if (params.liberado_centro_cirurgico) {
    await pb.collection('cirurgias').update(params.cirurgia, {
      status: 'checklist_concluido',
    })
  }

  await registrarAuditoria({
    acao: params.liberado_centro_cirurgico
      ? 'Checklist pré-operatório CONCLUÍDO e paciente LIBERADO para centro cirúrgico'
      : 'Registro/Atualização de checklist pré-operatório',
    modulo: 'Centro Cirúrgico',
    detalhes: `Cirurgia ID: ${params.cirurgia} | Responsável: ${params.responsavel_nome} | Liberado: ${params.liberado_centro_cirurgico ? 'SIM' : 'NÃO'}`,
    registro_id: record.id,
  })

  return record
}

// ============================================================================
// ATO OPERATÓRIO (REGISTRO CIRÚRGICO PELO PROFISSIONAL)
// ============================================================================

export interface RegistrarAtoOperatorioParams {
  cirurgia: string
  paciente: string
  cirurgiao?: string
  cirurgiao_nome: string
  procedimento_realizado: string
  codigo_procedimento?: string
  tecnica_cirurgica: string
  tipo_anestesia: TipoAnestesia
  data_hora_inicio: string
  data_hora_fim: string
  duracao_minutos?: number
  diagnostico_pre_operatorio?: string
  diagnostico_pos_operatorio?: string
  cid10?: string
  descricao_ato: string
  complicacoes_intercorrencias?: string
  perda_sanguinea_estimada_ml?: number
  materiais_implantes_utilizados?: string
  envio_anatomo_patologico?: boolean
  equipe_participante?: string
}

export async function obterAtoOperatorioPorCirurgia(
  cirurgiaId: string,
): Promise<AtoOperatorio | null> {
  try {
    const records = await pb.collection('atos_operatorios').getFullList<AtoOperatorio>({
      filter: `cirurgia = "${cirurgiaId}"`,
      sort: '-created',
      expand: 'cirurgiao',
    })
    return records.length > 0 ? records[0] : null
  } catch (err) {
    console.error('Erro ao obter ato operatório:', err)
    return null
  }
}

export async function registrarAtoOperatorio(
  params: RegistrarAtoOperatorioParams,
  atoExistenteId?: string,
): Promise<AtoOperatorio> {
  let record: AtoOperatorio
  if (atoExistenteId) {
    record = await pb.collection('atos_operatorios').update<AtoOperatorio>(atoExistenteId, params)
  } else {
    record = await pb.collection('atos_operatorios').create<AtoOperatorio>(params)
  }

  // Atualiza data_hora_fim na cirurgia se aplicável
  await pb.collection('cirurgias').update(params.cirurgia, {
    data_hora_fim: params.data_hora_fim,
  })

  await registrarAuditoria({
    acao: 'Registro do ato operatório cirúrgico',
    modulo: 'Centro Cirúrgico',
    detalhes: `Procedimento: ${params.procedimento_realizado} | Cirurgião: ${params.cirurgiao_nome} | Anestesia: ${params.tipo_anestesia}`,
    registro_id: record.id,
  })

  return record
}

// ============================================================================
// RECUPERAÇÃO PÓS-ANESTÉSICA (SRPA)
// ============================================================================

export interface RegistrarRecuperacaoPosAnestesicaParams {
  cirurgia: string
  paciente: string
  data_hora_admissao_srpa: string
  data_hora_alta_srpa?: string
  responsavel?: string
  responsavel_nome: string
  escala_aldrete_kroulik?: number
  sinais_vitais_admissao?: string
  sinais_vitais_alta?: string
  nivel_consciencia?: string
  dor_escala_analogica?: string
  nauseas_vomitos?: boolean
  evolucao_pos_operatoria: string
  destino_pos_alta: DestinoSRPA
  leito_destino?: string
  orientacoes_alta?: string
}

export async function obterRecuperacaoPorCirurgia(
  cirurgiaId: string,
): Promise<RecuperacaoPosAnestesica | null> {
  try {
    const records = await pb
      .collection('recuperacao_pos_anestesica')
      .getFullList<RecuperacaoPosAnestesica>({
        filter: `cirurgia = "${cirurgiaId}"`,
        sort: '-created',
        expand: 'responsavel',
      })
    return records.length > 0 ? records[0] : null
  } catch (err) {
    console.error('Erro ao obter registro de SRPA:', err)
    return null
  }
}

export async function registrarRecuperacaoPosAnestesica(
  params: RegistrarRecuperacaoPosAnestesicaParams,
  srpaExistenteId?: string,
): Promise<RecuperacaoPosAnestesica> {
  let record: RecuperacaoPosAnestesica
  if (srpaExistenteId) {
    record = await pb
      .collection('recuperacao_pos_anestesica')
      .update<RecuperacaoPosAnestesica>(srpaExistenteId, params)
  } else {
    record = await pb
      .collection('recuperacao_pos_anestesica')
      .create<RecuperacaoPosAnestesica>(params)
  }

  // Se alta da SRPA foi definida e destino preenchido, marca a cirurgia como 'concluida'
  if (params.data_hora_alta_srpa && params.destino_pos_alta) {
    await pb.collection('cirurgias').update(params.cirurgia, {
      status: 'concluida',
    })
  }

  await registrarAuditoria({
    acao: 'Registro de evolução pós-operatória na SRPA',
    modulo: 'Centro Cirúrgico',
    detalhes: `Cirurgia ID: ${params.cirurgia} | Destino: ${params.destino_pos_alta} | Aldrete: ${params.escala_aldrete_kroulik || 'N/I'} | Responsável: ${params.responsavel_nome}`,
    registro_id: record.id,
  })

  return record
}
