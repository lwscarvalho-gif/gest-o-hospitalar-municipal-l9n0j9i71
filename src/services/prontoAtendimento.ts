import pb from '@/lib/pocketbase/client'
import { FichaProntoAtendimento, ClassificacaoRisco, CondutaPA } from '@/types/hospital'
import { registrarAuditoria } from './auditoria'
import { admitirPaciente } from './internacoes'
import { criarAgendamento } from './agendamentos'

// Ordem de gravidade para classificação de risco de Manchester/SUS
export const PESO_RISCO: Record<ClassificacaoRisco, number> = {
  vermelho: 1, // Emergência imediata (0 min)
  laranja: 2, // Muito urgente (10 min)
  amarelo: 3, // Urgente (60 min)
  verde: 4, // Pouco urgente (120 min)
  azul: 5, // Não urgente (240 min)
}

export async function listarAtendimentosPA(filtros?: {
  status?: string
  pacienteId?: string
  dataInicio?: string
  dataFim?: string
  apenasFilaAtiva?: boolean
}): Promise<FichaProntoAtendimento[]> {
  const conds: string[] = []

  if (filtros?.apenasFilaAtiva) {
    conds.push('status != "finalizado"')
  } else if (filtros?.status && filtros.status !== 'todos') {
    conds.push(`status = "${filtros.status}"`)
  }

  if (filtros?.pacienteId) {
    conds.push(`paciente = "${filtros.pacienteId}"`)
  }

  if (filtros?.dataInicio) {
    conds.push(`data_hora_chegada >= "${filtros.dataInicio}"`)
  }

  if (filtros?.dataFim) {
    conds.push(`data_hora_chegada <= "${filtros.dataFim} 23:59"`)
  }

  const records = await pb.collection('pronto_atendimento').getFullList<FichaProntoAtendimento>({
    filter: conds.join(' && '),
    sort: '-created',
    expand:
      'paciente,profissional_atendimento,leito_encaminhado,internacao_gerada,agendamento_gerado',
  })

  return records
}

// 1. Criar acolhimento inicial (chegada do paciente no PA)
export async function criarEntradaPA(dados: {
  paciente: string
  queixa_principal?: string
  data_hora_chegada?: string
  pacienteNome?: string
}): Promise<FichaProntoAtendimento> {
  const agora = dados.data_hora_chegada || new Date().toLocaleString('pt-BR')

  const payload = {
    paciente: dados.paciente,
    status: 'aguardando_triagem',
    queixa_principal: dados.queixa_principal || '',
    data_hora_chegada: agora,
  }

  const record = await pb.collection('pronto_atendimento').create<FichaProntoAtendimento>(payload, {
    expand: 'paciente',
  })

  await registrarAuditoria({
    acao: 'ACOLHIMENTO_PA',
    modulo: 'Pronto Atendimento',
    detalhes: `Paciente ${dados.pacienteNome || dados.paciente} deu entrada no Pronto Atendimento (aguardando triagem)`,
    registro_id: record.id,
  })

  return record
}

// 2. Registrar Triagem com Classificação de Risco
export async function registrarTriagemPA(dados: {
  id: string
  classificacao_risco: ClassificacaoRisco
  queixa_principal: string
  sinais_vitais: string
  discriminador?: string
  triador_nome: string
  pacienteNome?: string
}): Promise<FichaProntoAtendimento> {
  const agora = new Date().toLocaleString('pt-BR')

  const payload = {
    status: 'aguardando_atendimento',
    classificacao_risco: dados.classificacao_risco,
    queixa_principal: dados.queixa_principal,
    sinais_vitais: dados.sinais_vitais,
    discriminador: dados.discriminador || '',
    data_hora_triagem: agora,
    triador_nome: dados.triador_nome,
  }

  const record = await pb
    .collection('pronto_atendimento')
    .update<FichaProntoAtendimento>(dados.id, payload, {
      expand: 'paciente',
    })

  await registrarAuditoria({
    acao: 'TRIAGEM_PA',
    modulo: 'Pronto Atendimento',
    detalhes: `Triagem concluída: Risco ${dados.classificacao_risco.toUpperCase()} | Sinais vitais: ${dados.sinais_vitais} | Triador: ${dados.triador_nome}`,
    registro_id: record.id,
  })

  return record
}

// 3. Iniciar atendimento pelo profissional médico
export async function iniciarAtendimentoPA(dados: {
  id: string
  profissionalId: string
  profissionalNome?: string
}): Promise<FichaProntoAtendimento> {
  const agora = new Date().toLocaleString('pt-BR')

  const record = await pb.collection('pronto_atendimento').update<FichaProntoAtendimento>(
    dados.id,
    {
      status: 'em_atendimento',
      profissional_atendimento: dados.profissionalId,
      data_hora_atendimento: agora,
    },
    {
      expand: 'paciente,profissional_atendimento',
    },
  )

  await registrarAuditoria({
    acao: 'INICIO_ATENDIMENTO_PA',
    modulo: 'Pronto Atendimento',
    detalhes: `Profissional ${dados.profissionalNome || dados.profissionalId} chamou ficha de PA para atendimento médico`,
    registro_id: record.id,
  })

  return record
}

// 4. Finalizar atendimento com Conduta (Alta, Internação ou Ambulatório)
export async function finalizarAtendimentoPA(dados: {
  id: string
  ficha: FichaProntoAtendimento
  evolucao_clinica: string
  diagnostico: string
  cid10?: string
  conduta: CondutaPA
  observacoes_conduta?: string
  profissionalId: string
  profissionalNome: string
  // Dados extras para internação
  leitoInternacaoId?: string
  setorInternacaoId?: string
  leitoCodigo?: string
  // Dados extras para encaminhamento ambulatorial
  profissionalAgendaId?: string
  setorAgendaId?: string
  dataHoraAgenda?: string
}): Promise<FichaProntoAtendimento> {
  const agora = new Date().toLocaleString('pt-BR')
  let internacaoGeradaId: string | undefined = undefined
  let leitoEncaminhadoId: string | undefined = undefined
  let agendamentoGeradoId: string | undefined = undefined

  // Conduta A: Encaminhamento para Internação
  if (dados.conduta === 'internacao') {
    if (!dados.leitoInternacaoId || !dados.setorInternacaoId) {
      throw new Error('Para encaminhamento à internação, selecione um leito vago.')
    }

    const internacao = await admitirPaciente({
      paciente: dados.ficha.paciente,
      leito_atual: dados.leitoInternacaoId,
      setor_atual: dados.setorInternacaoId,
      medico_responsavel: dados.profissionalId,
      motivo_admissao: `Encaminhado do Pronto Atendimento. Queixa: ${dados.ficha.queixa_principal || ''}. Conduta: ${dados.observacoes_conduta || ''}`,
      diagnostico_inicial: dados.diagnostico,
      cid10_admissao: dados.cid10 || '',
      leitoCodigo: dados.leitoCodigo,
      usuarioNome: dados.profissionalNome,
    })

    internacaoGeradaId = internacao.id
    leitoEncaminhadoId = dados.leitoInternacaoId
  }

  // Conduta B: Encaminhamento para Ambulatório
  if (dados.conduta === 'ambulatorio') {
    if (!dados.profissionalAgendaId || !dados.dataHoraAgenda) {
      throw new Error(
        'Para encaminhamento ambulatorial, selecione o profissional e a data/hora do agendamento.',
      )
    }

    const agendamento = await criarAgendamento({
      paciente: dados.ficha.paciente,
      profissional: dados.profissionalAgendaId,
      setor: dados.setorAgendaId,
      tipo: 'retorno',
      data_hora: dados.dataHoraAgenda,
      status: 'agendado',
      motivo: `Retorno pós-PA: ${dados.diagnostico || dados.ficha.queixa_principal || 'Acompanhamento ambulatorial'}`,
      observacoes: dados.observacoes_conduta || 'Encaminhado pelo Pronto Atendimento municipal.',
    })

    agendamentoGeradoId = agendamento.id
  }

  // Atualizar a ficha de PA
  const payload: any = {
    status: 'finalizado',
    evolucao_clinica: dados.evolucao_clinica,
    diagnostico: dados.diagnostico,
    cid10: dados.cid10 || '',
    conduta: dados.conduta,
    observacoes_conduta: dados.observacoes_conduta || '',
    data_hora_finalizacao: agora,
  }

  if (internacaoGeradaId) payload.internacao_gerada = internacaoGeradaId
  if (leitoEncaminhadoId) payload.leito_encaminhado = leitoEncaminhadoId
  if (agendamentoGeradoId) payload.agendamento_gerado = agendamentoGeradoId

  const record = await pb
    .collection('pronto_atendimento')
    .update<FichaProntoAtendimento>(dados.id, payload, {
      expand:
        'paciente,profissional_atendimento,leito_encaminhado,internacao_gerada,agendamento_gerado',
    })

  await registrarAuditoria({
    acao: 'FINALIZACAO_PA',
    modulo: 'Pronto Atendimento',
    detalhes: `Atendimento de PA finalizado. Conduta: ${dados.conduta.toUpperCase()}. Diagnóstico: ${dados.diagnostico} (CID-10: ${dados.cid10 || 'N/A'})${
      internacaoGeradaId ? ` | Internado no leito ${dados.leitoCodigo || leitoEncaminhadoId}` : ''
    }${agendamentoGeradoId ? ` | Agendado para ${dados.dataHoraAgenda}` : ''}`,
    registro_id: record.id,
  })

  return record
}
