import pb from '@/lib/pocketbase/client'
import {
  PrescricaoMedica,
  PrescricaoItem,
  AdministracaoMedicamento,
  ViaAdministracaoMedicamento,
  StatusPrescricao,
  StatusPrescricaoItem,
  StatusAdministracao,
} from '@/types/hospital'
import { registrarAuditoria } from './auditoria'

// -------------------------------------------------------------
// PRESCRIÇÕES MÉDICAS (INTERNAÇÃO)
// -------------------------------------------------------------

export interface ItemPrescricaoInput {
  item_farmacia?: string
  medicamento_nome: string
  dose: string
  via_administracao: ViaAdministracaoMedicamento
  frequencia: string
  duracao?: string
  instrucoes?: string
}

export interface CriarPrescricaoParams {
  pacienteId: string
  internacaoId?: string
  atendimentoPaId?: string
  origem?: 'internacao' | 'pronto_atendimento'
  medicoId?: string
  medicoNome?: string
  observacoesGerais?: string
  itens: ItemPrescricaoInput[]
}

export async function listarPrescricoes(filtros?: {
  pacienteId?: string
  internacaoId?: string
  atendimentoPaId?: string
  origem?: 'internacao' | 'pronto_atendimento'
  status?: StatusPrescricao
}): Promise<PrescricaoMedica[]> {
  try {
    const parts: string[] = []
    if (filtros?.pacienteId) {
      parts.push(`paciente = "${filtros.pacienteId}"`)
    }
    if (filtros?.internacaoId) {
      parts.push(`internacao = "${filtros.internacaoId}"`)
    }
    if (filtros?.atendimentoPaId) {
      parts.push(`atendimento_pa = "${filtros.atendimentoPaId}"`)
    }
    if (filtros?.origem) {
      parts.push(`origem = "${filtros.origem}"`)
    }
    if (filtros?.status) {
      parts.push(`status = "${filtros.status}"`)
    }

    const records = await pb.collection('prescricoes').getFullList<PrescricaoMedica>({
      filter: parts.join(' && ') || undefined,
      sort: '-created',
      expand: 'paciente,internacao,atendimento_pa,medico',
    })

    // Carregar itens para cada prescrição
    const prescricoesComItens = await Promise.all(
      records.map(async (presc) => {
        try {
          const itens = await pb.collection('prescricao_itens').getFullList<PrescricaoItem>({
            filter: `prescricao = "${presc.id}"`,
            sort: 'created',
            expand: 'item_farmacia',
          })
          return { ...presc, itens }
        } catch {
          return { ...presc, itens: [] }
        }
      }),
    )

    return prescricoesComItens
  } catch (error) {
    console.error('Erro ao listar prescricoes:', error)
    return []
  }
}

export async function criarPrescricaoMedica(
  params: CriarPrescricaoParams,
): Promise<PrescricaoMedica> {
  const {
    pacienteId,
    internacaoId,
    atendimentoPaId,
    origem,
    medicoId,
    medicoNome,
    observacoesGerais,
    itens,
  } = params

  if (!itens || itens.length === 0) {
    throw new Error('A prescrição médica deve conter pelo menos um medicamento.')
  }

  const agora = new Date().toISOString().replace('T', ' ').slice(0, 16)
  const origemFinal = origem || (atendimentoPaId ? 'pronto_atendimento' : 'internacao')

  // 1. Criar cabeçalho da Prescrição
  const prescricaoRecord = await pb.collection('prescricoes').create<PrescricaoMedica>(
    {
      paciente: pacienteId,
      internacao: internacaoId || undefined,
      atendimento_pa: atendimentoPaId || undefined,
      origem: origemFinal,
      medico: medicoId || undefined,
      medico_nome: medicoNome || pb.authStore.model?.name || 'Médico Plantonista',
      data_prescricao: agora,
      status: 'ativa',
      observacoes_gerais: observacoesGerais || '',
    },
    {
      expand: 'paciente,internacao,atendimento_pa,medico',
    },
  )

  // 2. Criar cada item da prescrição
  const itensCriados: PrescricaoItem[] = []
  for (const item of itens) {
    const itemRecord = await pb.collection('prescricao_itens').create<PrescricaoItem>(
      {
        prescricao: prescricaoRecord.id,
        paciente: pacienteId,
        item_farmacia: item.item_farmacia || undefined,
        medicamento_nome: item.medicamento_nome.trim(),
        dose: item.dose.trim(),
        via_administracao: item.via_administracao,
        frequencia: item.frequencia.trim(),
        duracao: item.duracao?.trim() || '',
        instrucoes: item.instrucoes?.trim() || '',
        status: 'ativo',
      },
      {
        expand: 'item_farmacia',
      },
    )
    itensCriados.push(itemRecord)
  }

  // 3. Auditoria
  await registrarAuditoria({
    acao: 'PRESCRIÇÃO_MEDICA_CRIADA',
    modulo:
      origemFinal === 'pronto_atendimento' ? 'Pronto Atendimento' : 'Assistencial / Prescrição',
    detalhes: `Prescrição (${origemFinal === 'pronto_atendimento' ? 'PA' : 'Internação'}) emitida com ${itens.length} medicamento(s): ${itens.map((i) => i.medicamento_nome).join(', ')}`,
    registro_id: prescricaoRecord.id,
  })

  return {
    ...prescricaoRecord,
    itens: itensCriados,
  }
}

export async function atualizarStatusPrescricao(
  prescricaoId: string,
  novoStatus: StatusPrescricao,
): Promise<PrescricaoMedica> {
  const updated = await pb.collection('prescricoes').update<PrescricaoMedica>(prescricaoId, {
    status: novoStatus,
  })

  await registrarAuditoria({
    acao: 'PRESCRIÇÃO_STATUS_ALTERADO',
    modulo: 'Assistencial / Prescrição',
    detalhes: `Prescrição ${prescricaoId} alterada para status: ${novoStatus}`,
    registro_id: prescricaoId,
  })

  return updated
}

// -------------------------------------------------------------
// ENFERMAGEM: ADMINISTRAÇÃO DE MEDICAMENTOS AO LEITO
// -------------------------------------------------------------

export interface RegistrarAdministracaoParams {
  pacienteId: string
  internacaoId?: string
  atendimentoPaId?: string
  prescricaoId?: string
  prescricaoItemId?: string
  medicamentoNome: string
  doseAdministrada?: string
  viaAdministrada?: string
  profissionalEnfermagemId?: string
  responsavelNome: string
  responsavelCargo?: string
  status: StatusAdministracao
  observacoes?: string
}

export async function registrarAdministracaoMedicamento(
  params: RegistrarAdministracaoParams,
): Promise<AdministracaoMedicamento> {
  const agora = new Date().toISOString().replace('T', ' ').slice(0, 16)

  const record = await pb.collection('administracao_medicamentos').create<AdministracaoMedicamento>(
    {
      paciente: params.pacienteId,
      internacao: params.internacaoId || undefined,
      atendimento_pa: params.atendimentoPaId || undefined,
      prescricao: params.prescricaoId || undefined,
      prescricao_item: params.prescricaoItemId || undefined,
      medicamento_nome: params.medicamentoNome,
      dose_administrada: params.doseAdministrada || '',
      via_administrada: params.viaAdministrada || '',
      data_hora_administracao: agora,
      profissional_enfermagem: params.profissionalEnfermagemId || undefined,
      responsavel_nome: params.responsavelNome,
      responsavel_cargo: params.responsavelCargo || 'Enfermagem',
      status: params.status,
      observacoes: params.observacoes || '',
    },
    {
      expand:
        'paciente,internacao,atendimento_pa,prescricao,prescricao_item,profissional_enfermagem',
    },
  )

  await registrarAuditoria({
    acao: 'ADMINISTRACAO_MEDICAMENTO',
    modulo: 'Enfermagem',
    detalhes: `Administração de "${params.medicamentoNome}" (${params.doseAdministrada || 'dose'}) status: ${params.status} por ${params.responsavelNome}`,
    registro_id: record.id,
  })

  return record
}

export async function listarAdministracoesMedicamentos(filtros?: {
  pacienteId?: string
  internacaoId?: string
  atendimentoPaId?: string
  prescricaoId?: string
}): Promise<AdministracaoMedicamento[]> {
  try {
    const parts: string[] = []
    if (filtros?.pacienteId) {
      parts.push(`paciente = "${filtros.pacienteId}"`)
    }
    if (filtros?.internacaoId) {
      parts.push(`internacao = "${filtros.internacaoId}"`)
    }
    if (filtros?.atendimentoPaId) {
      parts.push(`atendimento_pa = "${filtros.atendimentoPaId}"`)
    }
    if (filtros?.prescricaoId) {
      parts.push(`prescricao = "${filtros.prescricaoId}"`)
    }

    const records = await pb
      .collection('administracao_medicamentos')
      .getFullList<AdministracaoMedicamento>({
        filter: parts.join(' && ') || undefined,
        sort: '-data_hora_administracao',
        expand:
          'paciente,internacao,atendimento_pa,prescricao,prescricao_item,profissional_enfermagem',
      })
    return records
  } catch (error) {
    console.error('Erro ao listar administracoes:', error)
    return []
  }
}
