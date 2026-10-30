export type UserRole = 'admin' | 'gestor' | 'profissional' | 'recepcao'

export interface AppUser {
  id: string
  email: string
  name: string
  role: UserRole
  cargo?: string
  registro_profissional?: string
  avatar?: string
  created: string
  updated: string
}

export interface Setor {
  id: string
  nome: string
  sigla?: string
  tipo: 'enfermaria' | 'uti' | 'isolamento' | 'pronto_socorro' | 'centro_cirurgico' | 'ambulatorio'
  capacidade?: number
  ativo?: boolean
  descricao?: string
  created: string
  updated: string
}

export interface Leito {
  id: string
  codigo: string
  setor: string
  expand?: {
    setor?: Setor
  }
  tipo: 'clinico' | 'cirurgico' | 'pediatrico' | 'uti' | 'isolamento'
  status: 'vago' | 'ocupado' | 'manutencao' | 'higienizacao'
  observacoes?: string
  created: string
  updated: string
}

export interface Paciente {
  id: string
  nome: string
  cpf?: string
  cartao_sus: string
  data_nascimento?: string
  sexo?: 'M' | 'F' | 'Outro'
  nome_mae?: string
  telefone?: string
  endereco?: string
  bairro?: string
  cidade?: string
  tipo_sanguineo?: string
  alergias?: string
  observacoes?: string
  created: string
  updated: string
}

export interface Profissional {
  id: string
  nome: string
  categoria:
    | 'medico'
    | 'enfermeiro'
    | 'tecnico_enfermagem'
    | 'fisioterapeuta'
    | 'psicologo'
    | 'outro'
  registro_conselho: string
  especialidade: string
  cpf?: string
  telefone?: string
  email?: string
  setor_padrao?: string
  expand?: {
    setor_padrao?: Setor
  }
  ativo?: boolean
  created: string
  updated: string
}

export interface Agendamento {
  id: string
  paciente: string
  profissional: string
  setor?: string
  expand?: {
    paciente?: Paciente
    profissional?: Profissional
    setor?: Setor
  }
  tipo: 'consulta' | 'retorno' | 'procedimento' | 'urgencia'
  data_hora: string
  status: 'agendado' | 'confirmado' | 'em_atendimento' | 'atendido' | 'cancelado'
  motivo?: string
  observacoes?: string
  created: string
  updated: string
}

export interface MovimentacaoLeito {
  data: string
  de: string
  para: string
  motivo?: string
  responsavel?: string
}

export interface Internacao {
  id: string
  paciente: string
  leito_atual: string
  setor_atual: string
  medico_responsavel?: string
  expand?: {
    paciente?: Paciente
    leito_atual?: Leito
    setor_atual?: Setor
    medico_responsavel?: Profissional
  }
  data_admissao: string
  data_alta?: string
  motivo_admissao: string
  diagnostico_inicial?: string
  cid10_admissao?: string
  status: 'ativa' | 'alta' | 'transferido' | 'obito'
  motivo_alta?: string
  historico_leitos?: MovimentacaoLeito[] | string
  created: string
  updated: string
}

export interface EvolucaoClinica {
  id: string
  paciente: string
  internacao?: string
  profissional?: string
  expand?: {
    paciente?: Paciente
    internacao?: Internacao
    profissional?: Profissional
  }
  tipo: 'evolucao_medica' | 'anotacao_enfermagem' | 'diagnostico' | 'prescricao' | 'alta'
  data_hora: string
  descricao: string
  diagnostico?: string
  cid10?: string
  sinais_vitais?: string
  conduta?: string
  created: string
  updated: string
}

export interface AuditoriaRegistro {
  id: string
  usuario_id: string
  usuario_nome: string
  usuario_role?: string
  acao: string
  modulo: string
  detalhes?: string
  registro_id?: string
  ip_info?: string
  created: string
  updated: string
}

export interface ParametroIntegracao {
  id: string
  codigo: string
  titulo: string
  configuracoes?: Record<string, any> | string
  status_conexao: 'configurado' | 'pendente_fase2' | 'homologacao'
  ultima_exportacao?: string
  observacoes?: string
  created: string
  updated: string
}
