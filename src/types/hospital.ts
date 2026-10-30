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
// FASE 4: MÓDULO EXAMES & LAUDOS
// -------------------------------------------------------------
export type CategoriaExame = 'laboratorial' | 'imagem' | 'grafico' | 'outro'
export type PrioridadeExame = 'urgente' | 'eletiva'
export type StatusExame = 'solicitado' | 'coletado' | 'em_analise' | 'liberado' | 'cancelado'

export interface ExameItem {
  id: string
  paciente: string
  internacao?: string
  atendimento_pa?: string
  setor?: string
  tipo_exame: string
  categoria?: CategoriaExame
  prioridade: PrioridadeExame
  justificativa?: string
  data_solicitacao: string
  solicitante?: string
  solicitante_nome: string
  status: StatusExame
  data_coleta?: string
  responsavel_coleta_nome?: string
  observacoes_coleta?: string
  data_inicio_analise?: string
  responsavel_analise_nome?: string
  data_laudo?: string
  responsavel_laudo?: string
  responsavel_laudo_nome?: string
  resultado_sumario?: string
  laudo_texto?: string
  motivo_cancelamento?: string
  expand?: {
    paciente?: Paciente
    internacao?: Internacao
    atendimento_pa?: FichaProntoAtendimento
    setor?: Setor
    solicitante?: Profissional
    responsavel_laudo?: Profissional
  }
  created: string
  updated: string
}

// -------------------------------------------------------------
// FASE 3 / SAME: PRESCRIÇÃO MÉDICA DIGITAL NA INTERNAÇÃO
// -------------------------------------------------------------
export type ViaAdministracaoMedicamento =
  | 'oral'
  | 'intravenosa'
  | 'intramuscular'
  | 'subcutanea'
  | 'inalatoria'
  | 'topica'
  | 'retal'
  | 'oftalmica'
  | 'nasal'
  | 'outra'

export type StatusPrescricao = 'ativa' | 'suspensa' | 'concluida'
export type StatusPrescricaoItem = 'ativo' | 'suspenso' | 'concluido'
export type StatusAdministracao = 'administrado' | 'recusado' | 'suspenso' | 'nao_administrado'

export interface PrescricaoItem {
  id: string
  prescricao: string
  paciente: string
  item_farmacia?: string
  medicamento_nome: string
  dose: string
  via_administracao: ViaAdministracaoMedicamento
  frequencia: string
  duracao?: string
  instrucoes?: string
  status: StatusPrescricaoItem
  expand?: {
    item_farmacia?: ItemFarmacia
  }
  created: string
  updated: string
}

export type OrigemPrescricao = 'internacao' | 'pronto_atendimento'

export interface PrescricaoMedica {
  id: string
  paciente: string
  internacao?: string
  atendimento_pa?: string
  origem?: OrigemPrescricao
  medico?: string
  medico_nome?: string
  data_prescricao: string
  status: StatusPrescricao
  observacoes_gerais?: string
  expand?: {
    paciente?: Paciente
    internacao?: Internacao
    atendimento_pa?: FichaProntoAtendimento
    medico?: Profissional
  }
  itens?: PrescricaoItem[]
  created: string
  updated: string
}

export interface AdministracaoMedicamento {
  id: string
  paciente: string
  internacao?: string
  atendimento_pa?: string
  prescricao?: string
  prescricao_item?: string
  medicamento_nome: string
  dose_administrada?: string
  via_administrada?: string
  data_hora_administracao: string
  profissional_enfermagem?: string
  responsavel_nome: string
  responsavel_cargo?: string
  status: StatusAdministracao
  observacoes?: string
  expand?: {
    paciente?: Paciente
    internacao?: Internacao
    atendimento_pa?: FichaProntoAtendimento
    prescricao?: PrescricaoMedica
    prescricao_item?: PrescricaoItem
    profissional_enfermagem?: Profissional
  }
  created: string
  updated: string
}

// -------------------------------------------------------------
// FASE 3 / SAME: LINHA DO TEMPO CONSOLIDADA DO PRONTUÁRIO
// -------------------------------------------------------------
export type TipoEventoProntuario =
  | 'pa_triagem'
  | 'pa_atendimento'
  | 'internacao_admissao'
  | 'internacao_alta'
  | 'internacao_transferencia'
  | 'evolucao_clinica'
  | 'prescricao_medica'
  | 'administracao_enfermagem'
  | 'dispensacao_farmacia'
  | 'agendamento'
  | 'exame_solicitado'
  | 'exame_coletado'
  | 'exame_em_analise'
  | 'exame_laudado'
  | 'exame_cancelado'
  | 'cirurgia_agendada'
  | 'cirurgia_checklist'
  | 'cirurgia_ato_operatorio'
  | 'cirurgia_recuperacao_srpa'
  | 'cirurgia_cancelada'
  | 'faturamento_conta_hospitalar'
  | 'faturamento_producao_bpa'

export interface EventoProntuarioUnificado {
  id: string
  tipo: TipoEventoProntuario
  dataHora: string
  titulo: string
  subtitulo?: string
  descricao?: string
  detalhes?: Record<string, any>
  profissionalNome?: string
  setorOuLeito?: string
  badgeTexto: string
  badgeCor: string
  icone: string
  registroOriginal?: any
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
  prescricao_relacionada?: string
  internacao?: string
  atendimento_pa?: string
  expand?: {
    paciente?: Paciente
    item?: ItemFarmacia
    prescricao_relacionada?: PrescricaoMedica
    internacao?: Internacao
    atendimento_pa?: FichaProntoAtendimento
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
  condicoes_cronicas?: string
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

// -------------------------------------------------------------
// FASE 5: MÓDULO CENTRO CIRÚRGICO
// -------------------------------------------------------------
export type StatusSalaCirurgica = 'livre' | 'ocupada' | 'limpeza' | 'manutencao'

export interface SalaCirurgica {
  id: string
  nome: string
  bloco?: string
  status: StatusSalaCirurgica
  motivo_bloqueio?: string
  equipamentos?: string
  ativo?: boolean
  observacoes?: string
  created: string
  updated: string
}

export type TipoPacienteCirurgia = 'internado' | 'ambulatorial' | 'urgencia_pa'

export type StatusCirurgia =
  | 'agendada'
  | 'checklist_concluido'
  | 'em_sala'
  | 'em_recuperacao'
  | 'concluida'
  | 'cancelada'

export interface Cirurgia {
  id: string
  paciente: string
  tipo_paciente: TipoPacienteCirurgia
  internacao?: string
  atendimento_pa?: string
  sala: string
  procedimento_codigo?: string
  procedimento_nome: string
  data_horario_previsto: string
  duracao_estimada_minutos?: number
  status: StatusCirurgia
  cirurgiao_principal: string
  cirurgiao_principal_nome: string
  anestesista?: string
  anestesista_nome?: string
  instrumentador?: string
  instrumentador_nome?: string
  equipe_adicional?: string
  observacoes_agendamento?: string
  motivo_cancelamento?: string
  data_hora_inicio?: string
  data_hora_fim?: string
  expand?: {
    paciente?: Paciente
    internacao?: Internacao
    atendimento_pa?: FichaProntoAtendimento
    sala?: SalaCirurgica
    cirurgiao_principal?: Profissional
    anestesista?: Profissional
    instrumentador?: Profissional
  }
  created: string
  updated: string
}

export type RiscoASA = 'ASA_I' | 'ASA_II' | 'ASA_III' | 'ASA_IV' | 'ASA_V' | 'ASA_VI'

export interface ChecklistPreOperatorio {
  id: string
  cirurgia: string
  paciente: string
  data_conferencia: string
  responsavel?: string
  responsavel_nome: string
  jejum_confirmado?: boolean
  jejum_horas?: number
  exames_pre_operatorios_ok?: boolean
  detalhes_exames?: string
  consentimento_informado_assinado?: boolean
  avaliacao_risco_anestesico_concluida?: boolean
  risco_asa?: RiscoASA
  demarcacao_lateralidade?: boolean
  alergias_checadas?: boolean
  reserva_sangue_hemoderivados?: boolean
  retirada_proteses_adornos?: boolean
  acesso_venoso_permeavel?: boolean
  liberado_centro_cirurgico?: boolean
  observacoes?: string
  expand?: {
    cirurgia?: Cirurgia
    paciente?: Paciente
    responsavel?: Profissional
  }
  created: string
  updated: string
}

export type TipoAnestesia =
  | 'geral'
  | 'raquianestesia'
  | 'peridural'
  | 'sedacao_local'
  | 'bloqueio_regional'
  | 'local'

export interface AtoOperatorio {
  id: string
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
  expand?: {
    cirurgia?: Cirurgia
    paciente?: Paciente
    cirurgiao?: Profissional
  }
  created: string
  updated: string
}

export type DestinoSRPA = 'retorno_leito' | 'alta_hospitalar' | 'uti' | 'observacao_srpa'

export interface RecuperacaoPosAnestesica {
  id: string
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
  expand?: {
    cirurgia?: Cirurgia
    paciente?: Paciente
    responsavel?: Profissional
  }
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

// -------------------------------------------------------------
// FASE 6: MÓDULO FATURAMENTO SUS (SIH AIH & SIA BPA)
// -------------------------------------------------------------
export type ComplexidadeProcedimento = 'basica' | 'media' | 'alta' | 'nao_se_aplica'
export type ModalidadeProcedimento = 'ambulatorial' | 'hospitalar' | 'ambulatorial_e_hospitalar'

export interface ProcedimentoSigtap {
  id: string
  codigo: string
  nome: string
  valor_sh: number
  valor_sa: number
  valor_sp: number
  complexidade?: ComplexidadeProcedimento
  modalidade?: ModalidadeProcedimento
  instrumento_registro?: string
  ativo?: boolean
  created: string
  updated: string
}

export interface CID10Item {
  id: string
  codigo: string
  descricao: string
  capitulo?: string
  ativo?: boolean
  created: string
  updated: string
}

export type StatusContaFaturamento = 'aberta' | 'conciliada' | 'glosada' | 'enviada'

export interface ContaFaturamento {
  id: string
  numero_conta: string
  numero_aih?: string
  paciente: string
  internacao?: string
  profissional_solicitante?: string
  profissional_nome?: string
  data_internacao: string
  data_alta?: string
  carater_atendimento?: string
  motivo_saida_alta?: string
  cid_principal?: string
  cid_secundario?: string
  procedimento_principal_codigo: string
  procedimento_principal_nome: string
  competencia: string
  status: StatusContaFaturamento
  motivo_glosa?: string
  data_glosa?: string
  responsavel_glosa?: string
  valor_sh?: number
  valor_sa?: number
  valor_sp?: number
  valor_total?: number
  observacoes?: string
  expand?: {
    paciente?: Paciente
    internacao?: Internacao
    profissional_solicitante?: Profissional
  }
  created: string
  updated: string
}

export type TipoItemConta = 'procedimento_secundario' | 'diaria' | 'material' | 'sessao' | 'exame'

export interface ItemContaFaturamento {
  id: string
  conta: string
  tipo: TipoItemConta
  procedimento_codigo: string
  procedimento_nome: string
  quantidade: number
  valor_unitario_sh?: number
  valor_unitario_sa?: number
  valor_unitario_sp?: number
  valor_total_item?: number
  data_execucao?: string
  profissional_executante?: string
  observacoes?: string
  created: string
  updated: string
}

export type OrigemProducaoBPA = 'pronto_atendimento' | 'ambulatorio_agendamento' | 'avulso'
export type StatusProducaoBPA = 'pendente' | 'apurado' | 'glosado' | 'fechado'

export interface ProducaoBPAItem {
  id: string
  paciente: string
  profissional?: string
  profissional_nome?: string
  origem_atendimento: OrigemProducaoBPA
  atendimento_pa?: string
  agendamento?: string
  procedimento_codigo: string
  procedimento_nome: string
  quantidade: number
  data_atendimento: string
  competencia: string
  cid10?: string
  valor_unitario_sa?: number
  valor_total?: number
  status: StatusProducaoBPA
  motivo_glosa?: string
  observacoes?: string
  expand?: {
    paciente?: Paciente
    profissional?: Profissional
    atendimento_pa?: FichaProntoAtendimento
    agendamento?: Agendamento
  }
  created: string
  updated: string
}

export type StatusCompetencia = 'aberta' | 'fechada' | 'homologada'

export interface CompetenciaFaturamento {
  id: string
  competencia: string
  ano: number
  mes: number
  status: StatusCompetencia
  data_fechamento?: string
  fechado_por?: string
  total_contas_aih?: number
  total_itens_bpa?: number
  valor_total_sh?: number
  valor_total_sa?: number
  valor_total_sp?: number
  valor_total_geral?: number
  observacoes?: string
  created: string
  updated: string
}

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
