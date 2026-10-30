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
  idempotencyKey?: string
  tipoRegistro?: 'ato_original' | 'retificacao' | 'anotacao_complementar'
  registroOriginalId?: string
  motivoCorrecao?: string
}

export interface RetificarAdministracaoParams {
  registroOriginalId: string
  motivoCorrecao: string
  pacienteId: string
  prescricaoId?: string
  prescricaoItemId?: string
  internacaoId?: string
  atendimentoPaId?: string
  medicamentoNome: string
  doseAdministrada?: string
  viaAdministrada?: string
  profissionalEnfermagemId?: string
  responsavelNome: string
  responsavelCargo?: string
  status: StatusAdministracao
  observacoes?: string
  idempotencyKey?: string
}

const EXPAND_ADMINISTRACAO =
  'paciente,internacao,atendimento_pa,prescricao,prescricao_item,profissional_enfermagem,registro_original'

export async function registrarAdministracaoMedicamento(
  params: RegistrarAdministracaoParams,
): Promise<AdministracaoMedicamento> {
  const agora = new Date().toISOString().replace('T', ' ').slice(0, 16)
  const chaveFinal = params.idempotencyKey?.trim() || undefined

  const payload: Record<string, any> = {
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
    idempotency_key: chaveFinal,
    tipo_registro: params.tipoRegistro || 'ato_original',
    registro_original: params.registroOriginalId || undefined,
    motivo_correcao: params.motivoCorrecao || undefined,
    usuario_id: pb.authStore.model?.id || undefined,
  }

  try {
    const record = await pb
      .collection('administracao_medicamentos')
      .create<AdministracaoMedicamento>(payload, {
        expand: EXPAND_ADMINISTRACAO,
      })

    const isRetificacao = params.tipoRegistro === 'retificacao'
    await registrarAuditoria({
      acao: isRetificacao ? 'RETIFICACAO_ADMINISTRACAO_MEDICAMENTO' : 'ADMINISTRACAO_MEDICAMENTO',
      modulo: 'Enfermagem',
      detalhes: isRetificacao
        ? `Retificação da administração ref "${params.registroOriginalId}" ("${params.medicamentoNome}"): motivo "${params.motivoCorrecao}" por ${params.responsavelNome}`
        : `Administração de "${params.medicamentoNome}" (${params.doseAdministrada || 'dose'}) status: ${params.status} por ${params.responsavelNome}`,
      registro_id: record.id,
    })

    return record
  } catch (error: any) {
    const errorMsg = String(error?.message || error?.data?.message || '')

    // 1. Tratamento de HIT Idempotente (mesma chave já gravada): devolve o registro original sem duplicar
    if (errorMsg.includes('IDEMPOTENT_HIT:')) {
      const match = errorMsg.match(/IDEMPOTENT_HIT:([a-zA-Z0-9_-]+)/)
      const recordId = match ? match[1] : null
      if (recordId) {
        try {
          const originalRecord = await pb
            .collection('administracao_medicamentos')
            .getOne<AdministracaoMedicamento>(recordId, {
              expand: EXPAND_ADMINISTRACAO,
            })
          return originalRecord
        } catch {
          // Se falhou getOne, tenta busca pela chave
        }
      }
    }

    // 2. Conflito de payload (mesma chave com paciente/prescrição/item divergentes)
    if (errorMsg.includes('IDEMPOTENCY_PAYLOAD_CONFLICT')) {
      throw new Error(
        'CONFLITO_IDEMPOTENCIA: A mesma chave de checagem foi enviada com dados de paciente, prescrição ou medicamento divergentes da operação anterior.',
      )
    }

    // 3. Falha de rede ou timeout (network error / fetch failed) após gravação no backend:
    // Se temos chave de idempotência persistente, antes de acusar falha verificamos se o registro já gravou
    const isNetworkError =
      error?.status === 0 ||
      error?.isAbort ||
      errorMsg.toLowerCase().includes('failed to fetch') ||
      errorMsg.toLowerCase().includes('network') ||
      errorMsg.toLowerCase().includes('connection')

    if (isNetworkError && chaveFinal) {
      try {
        const registros = await pb
          .collection('administracao_medicamentos')
          .getFullList<AdministracaoMedicamento>({
            filter: `idempotency_key = "${chaveFinal}"`,
            sort: '-created',
            expand: EXPAND_ADMINISTRACAO,
          })
        if (registros.length > 0) {
          // Registro foi salvo no backend apesar do corte da conexão de resposta
          return registros[0]
        }
      } catch {
        // Se a rede estiver totalmente indisponível, segue para rethrow do erro original
      }
    }

    // Re-lança com mensagem clara preservada
    throw error
  }
}

export async function retificarAdministracaoMedicamento(
  params: RetificarAdministracaoParams,
): Promise<AdministracaoMedicamento> {
  if (!params.registroOriginalId) {
    throw new Error('Retificação de administração exige referência ao registro original.')
  }
  if (!params.motivoCorrecao || params.motivoCorrecao.trim().length < 5) {
    throw new Error(
      'Retificação de administração exige justificativa/motivo detalhado (mínimo de 5 caracteres).',
    )
  }

  // Gera chave de idempotência exclusiva para esta operação de retificação se não fornecida
  const idempotencyKey =
    params.idempotencyKey ||
    `retif_${params.registroOriginalId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

  return registrarAdministracaoMedicamento({
    pacienteId: params.pacienteId,
    internacaoId: params.internacaoId,
    atendimentoPaId: params.atendimentoPaId,
    prescricaoId: params.prescricaoId,
    prescricaoItemId: params.prescricaoItemId,
    medicamentoNome: params.medicamentoNome,
    doseAdministrada: params.doseAdministrada,
    viaAdministrada: params.viaAdministrada,
    profissionalEnfermagemId: params.profissionalEnfermagemId,
    responsavelNome: params.responsavelNome,
    responsavelCargo: params.responsavelCargo,
    status: params.status,
    observacoes: params.observacoes,
    idempotencyKey,
    tipoRegistro: 'retificacao',
    registroOriginalId: params.registroOriginalId,
    motivoCorrecao: params.motivoCorrecao.trim(),
  })
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
        expand: EXPAND_ADMINISTRACAO,
      })
    return records
  } catch (error) {
    console.error('Erro ao listar administracoes:', error)
    return []
  }
}
