import pb from '@/lib/pocketbase/client'
import { Internacao, EvolucaoClinica, MovimentacaoLeito } from '@/types/hospital'
import { registrarAuditoria } from './auditoria'
import { atualizarLeito } from './cadastros'

// INTERNAÇÕES
export async function listarInternacoes(apenasAtivas = false): Promise<Internacao[]> {
  const filter = apenasAtivas ? 'status = "ativa"' : ''
  const records = await pb.collection('internacoes').getFullList<Internacao>({
    filter,
    sort: '-created',
    expand: 'paciente,leito_atual,setor_atual,medico_responsavel',
  })
  return records
}

export async function admitirPaciente(dados: {
  paciente: string
  leito_atual: string
  setor_atual: string
  medico_responsavel?: string
  motivo_admissao: string
  diagnostico_inicial?: string
  cid10_admissao?: string
  leitoCodigo?: string
  usuarioNome?: string
}): Promise<Internacao> {
  const agora = new Date().toLocaleString('pt-BR')
  const historico: MovimentacaoLeito[] = [
    {
      data: agora,
      de: 'Admissão',
      para: `${dados.leitoCodigo || 'Leito'}`,
      motivo: dados.motivo_admissao,
      responsavel: dados.usuarioNome || 'Recepção',
    },
  ]

  const payload = {
    paciente: dados.paciente,
    leito_atual: dados.leito_atual,
    setor_atual: dados.setor_atual,
    medico_responsavel: dados.medico_responsavel || '',
    data_admissao: agora,
    motivo_admissao: dados.motivo_admissao,
    diagnostico_inicial: dados.diagnostico_inicial || '',
    cid10_admissao: dados.cid10_admissao || '',
    status: 'ativa',
    historico_leitos: JSON.stringify(historico),
  }

  const record = await pb.collection('internacoes').create<Internacao>(payload, {
    expand: 'paciente,leito_atual,setor_atual,medico_responsavel',
  })

  // Atualizar o status do leito para "ocupado"
  await atualizarLeito(dados.leito_atual, { status: 'ocupado' })

  await registrarAuditoria({
    acao: 'ADMISSAO_PACIENTE',
    modulo: 'Internação',
    detalhes: `Paciente admitido no leito ${dados.leitoCodigo || dados.leito_atual}`,
    registro_id: record.id,
  })

  return record
}

export async function transferirLeito(params: {
  internacaoId: string
  leitoAntigoId: string
  leitoNovoId: string
  setorNovoId: string
  motivo: string
  leitoAntigoCodigo: string
  leitoNovoCodigo: string
  usuarioNome: string
  historicoAtual: MovimentacaoLeito[]
}): Promise<Internacao> {
  const agora = new Date().toLocaleString('pt-BR')
  const novaMov: MovimentacaoLeito = {
    data: agora,
    de: params.leitoAntigoCodigo,
    para: params.leitoNovoCodigo,
    motivo: params.motivo,
    responsavel: params.usuarioNome,
  }

  const novoHistorico = [...params.historicoAtual, novaMov]

  // 1. Atualizar a internação
  const updated = await pb.collection('internacoes').update<Internacao>(
    params.internacaoId,
    {
      leito_atual: params.leitoNovoId,
      setor_atual: params.setorNovoId,
      historico_leitos: JSON.stringify(novoHistorico),
    },
    {
      expand: 'paciente,leito_atual,setor_atual,medico_responsavel',
    },
  )

  // 2. Liberar leito antigo para "higienizacao"
  await atualizarLeito(params.leitoAntigoId, { status: 'higienizacao' })

  // 3. Ocupar o novo leito
  await atualizarLeito(params.leitoNovoId, { status: 'ocupado' })

  await registrarAuditoria({
    acao: 'TRANSFERENCIA_LEITO',
    modulo: 'Internação',
    detalhes: `Transferência de ${params.leitoAntigoCodigo} para ${params.leitoNovoCodigo}. Motivo: ${params.motivo}`,
    registro_id: params.internacaoId,
  })

  return updated
}

export async function darAltaPaciente(params: {
  internacaoId: string
  leitoId: string
  motivo_alta: string
  leitoCodigo: string
  usuarioNome: string
}): Promise<Internacao> {
  const agora = new Date().toLocaleString('pt-BR')

  const updated = await pb.collection('internacoes').update<Internacao>(
    params.internacaoId,
    {
      data_alta: agora,
      status: 'alta',
      motivo_alta: params.motivo_alta,
    },
    {
      expand: 'paciente,leito_atual,setor_atual,medico_responsavel',
    },
  )

  // Colocar leito em higienização pós-alta
  await atualizarLeito(params.leitoId, { status: 'higienizacao' })

  await registrarAuditoria({
    acao: 'ALTA_HOSPITALAR',
    modulo: 'Internação',
    detalhes: `Alta concedida. Leito ${params.leitoCodigo} liberado para higienização. Motivo: ${params.motivo_alta}`,
    registro_id: params.internacaoId,
  })

  return updated
}

// REGISTRO ASSISTENCIAL MÍNIMO (EVOLUÇÕES CLÍNICAS)
export async function listarEvolucoes(
  pacienteId?: string,
  internacaoId?: string,
): Promise<EvolucaoClinica[]> {
  const conds: string[] = []
  if (pacienteId) conds.push(`paciente = "${pacienteId}"`)
  if (internacaoId) conds.push(`internacao = "${internacaoId}"`)

  const records = await pb.collection('evolucoes_clinicas').getFullList<EvolucaoClinica>({
    filter: conds.join(' && '),
    sort: '-created',
    expand: 'paciente,profissional,internacao',
  })
  return records
}

export async function criarEvolucaoClinica(dados: {
  paciente: string
  internacao?: string
  profissional?: string
  tipo: 'evolucao_medica' | 'anotacao_enfermagem' | 'diagnostico' | 'prescricao' | 'alta'
  descricao: string
  diagnostico?: string
  cid10?: string
  sinais_vitais?: string
  conduta?: string
}): Promise<EvolucaoClinica> {
  const agora = new Date().toLocaleString('pt-BR')
  const payload = {
    ...dados,
    data_hora: agora,
  }

  const record = await pb.collection('evolucoes_clinicas').create<EvolucaoClinica>(payload, {
    expand: 'paciente,profissional,internacao',
  })

  await registrarAuditoria({
    acao: 'REGISTRO_ASSISTENCIAL',
    modulo: 'Prontuário/Assistencial',
    detalhes: `Novo registro clínico tipo ${dados.tipo}. Diagnóstico: ${dados.diagnostico || 'N/A'}`,
    registro_id: record.id,
  })

  return record
}
