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

// -------------------------------------------------------------
// FASE 2: MÓDULO FARMÁCIA
// -------------------------------------------------------------
export type TipoItemFarmacia = 'medicamento' | 'material'
export type UnidadeMedidaFarmacia =
  | 'comprimido'
  | 'ampola'
  | 'frasco'
  | 'unidade'
  | 'caixa'
  | 'envelope'
  | 'tubo'

export interface ItemFarmacia {
  id: string
  nome: string
  tipo: TipoItemFarmacia
  principio_ativo?: string
  apresentacao?: string
  unidade_medida: UnidadeMedidaFarmacia
  lote?: string
  validade?: string
  estoque_atual: number
  estoque_minimo?: number
  ativo?: boolean
  observacoes?: string
  created: string
  updated: string
}

export type TipoMovimentoFarmacia = 'dispensacao_paciente' | 'remessa_setor'

export interface DispensacaoFarmacia {
  id: string
  paciente: string
  item: string
  quantidade: number
  lote?: string
  prescricao_origem?: string
  profissional_dispensador?: string
  data_dispensacao: string
  tipo_movimento: TipoMovimentoFarmacia
  setor_destino?: string
  observacoes?: string
  expand?: {
    paciente?: Paciente
    item?: ItemFarmacia
  }
  created: string
  updated: string
}

// -------------------------------------------------------------
// FASE 2: MÓDULO IMUNIZAÇÃO
// -------------------------------------------------------------
export type ViaAdministracaoVacina = 'intramuscular' | 'subcutanea' | 'intradermica' | 'oral'
export type DoseVacina = '1a_dose' | '2a_dose' | '3a_dose' | 'reforco' | 'anual' | 'dose_unica'

export interface Vacina {
  id: string
  nome: string
  fabricante?: string
  indicacao?: string
  via_administracao: ViaAdministracaoVacina
  lote_padrao?: string
  validade_lote?: string
  doses_previstas?: number
  estoque_doses: number
  ativo?: boolean
  observacoes?: string
  created: string
  updated: string
}

export interface RegistroImunizacao {
  id: string
  paciente: string
  vacina: string
  dose: DoseVacina
  lote: string
  validade_lote?: string
  data_aplicacao: string
  profissional_aplicador?: string
  aplicador_nome?: string
  local_aplicacao?: string
  observacoes?: string
  expand?: {
    paciente?: Paciente
    vacina?: Vacina
    profissional_aplicador?: Profissional
  }
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

export type ClassificacaoRisco = 'vermelho' | 'laranja' | 'amarelo' | 'verde' | 'azul'

export type StatusPA =
  | 'aguardando_triagem'
  | 'aguardando_atendimento'
  | 'em_atendimento'
  | 'finalizado'

export type CondutaPA = 'alta' | 'internacao' | 'ambulatorio' | 'observacao'

export interface FichaProntoAtendimento {
  id: string
  paciente: string
  status: StatusPA
  classificacao_risco?: ClassificacaoRisco
  queixa_principal?: string
  sinais_vitais?: string
  discriminador?: string
  data_hora_chegada: string
  data_hora_triagem?: string
  triador_nome?: string
  profissional_atendimento?: string
  data_hora_atendimento?: string
  data_hora_finalizacao?: string
  evolucao_clinica?: string
  diagnostico?: string
  cid10?: string
  conduta?: CondutaPA
  observacoes_conduta?: string
  internacao_gerada?: string
  leito_encaminhado?: string
  agendamento_gerado?: string
  expand?: {
    paciente?: Paciente
    profissional_atendimento?: Profissional
    leito_encaminhado?: Leito
    internacao_gerada?: Internacao
    agendamento_gerado?: Agendamento
  }
  created: string
  updated: string
}
