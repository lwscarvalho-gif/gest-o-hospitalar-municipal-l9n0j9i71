export type UserRole = 'admin' | 'gestor' | 'profissional' | 'recepcao'

// ============================================================================
// MÓDULO DE TRANSPORTE SANITÁRIO INTERNO (SEÇÃO 7.4.4.2.a-b)
// ============================================================================

export type CombustivelVeiculo =
  | 'diesel'
  | 'gasolina'
  | 'etanol'
  | 'flex'
  | 'gnv'
  | 'eletrico'
  | 'outro'

export type StatusVeiculo = 'disponivel' | 'em_viagem' | 'manutencao' | 'indisponivel' | 'inativo'

export interface TransporteTipoVeiculo {
  id: string
  nome: string
  codigo?: string
  descricao?: string
  ativo: boolean
  created: string
  updated: string
}

// ============================================================================
// TIPOS DO MÓDULO SAMU (Itens 407–417 do ANEXO I e Seção 7.4.5.1.e.i)
// ============================================================================

export type TipoOcorrenciaSAMU =
  | 'clinica'
  | 'trauma'
  | 'obstetrica'
  | 'psiquiatrica'
  | 'pediatrica'
  | 'outro'

export type RelacaoSolicitanteVitimaSAMU =
  | 'propria_vitima'
  | 'familiar'
  | 'transeunte'
  | 'policial_bombeiro'
  | 'profissional_saude'
  | 'outro'

export type StatusFluxoSAMU =
  | 'aberta'
  | 'em_deslocamento'
  | 'no_local'
  | 'em_transporte'
  | 'concluida'
  | 'cancelada'

export type ClassificacaoRiscoSAMU =
  | 'vermelho'
  | 'laranja'
  | 'amarelo'
  | 'verde'
  | 'azul'
  | 'nao_classificado'

export interface SamuOcorrencia {
  id: string
  numero_ocorrencia: string
  tipo_ocorrencia: TipoOcorrenciaSAMU
  relacao_solicitante_vitima: RelacaoSolicitanteVitimaSAMU
  nome_solicitante?: string
  telefone_solicitante?: string
  vitima_desconhecida: boolean
  vitima_nome_informado: string
  vitima_sexo_informado: 'M' | 'F' | 'Outro' | 'desconhecido'
  vitima_idade_informada?: string
  vitima_paciente_id?: string
  vitima_confirmada_humano: boolean
  vitima_confirmacao_data?: string
  vitima_confirmacao_autor_id?: string
  endereco_textual: string
  numero_complemento?: string
  bairro?: string
  ponto_referencia?: string
  municipio: string
  classificacao_risco: ClassificacaoRiscoSAMU
  risco_classificado_por_id?: string
  risco_classificado_por_nome?: string
  risco_classificado_por_cargo?: string
  risco_data_hora?: string
  risco_justificativa?: string
  unidade_saude_destino_id?: string
  unidade_saude_destino_nome?: string
  unidade_saude_destino_externa?: string
  unidade_movel_id?: string
  unidade_movel_placa?: string
  unidade_movel_descricao?: string
  status_fluxo: StatusFluxoSAMU
  motivo_cancelamento?: string
  data_cancelamento?: string
  cancelado_por_id?: string
  data_hora_abertura: string
  data_hora_conclusao?: string
  observacoes_iniciais?: string
  desfecho_encaminhamento?: string
  usuario_abertura_id?: string
  usuario_abertura_nome?: string
  ultimo_alterador_id?: string
  idempotency_key?: string
  hash_payload?: string
  created: string
  updated: string
  historico?: SamuHistoricoEstado[]
}

export interface SamuHistoricoEstado {
  id: string
  ocorrencia?: string
  status_anterior?: string
  status_novo: string
  motivo_transicao?: string
  unidade_movel_id?: string
  unidade_destino_nome?: string
  autor_id?: string
  autor_nome?: string
  autor_cargo?: string
  autor_perfil?: string
  data_hora_utc: string
  detalhes?: Record<string, unknown> | null
  evento_anterior_ref?: string
  motivo_correcao?: string
  created?: string
}

export interface AbrirOcorrenciaSAMUParams {
  tipo_ocorrencia: TipoOcorrenciaSAMU
  relacao_solicitante_vitima: RelacaoSolicitanteVitimaSAMU
  nome_solicitante?: string
  telefone_solicitante?: string
  vitima_desconhecida?: boolean
  vitima_nome_informado?: string
  vitima_sexo_informado?: 'M' | 'F' | 'Outro' | 'desconhecido'
  vitima_idade_informada?: string
  endereco_textual: string
  numero_complemento?: string
  bairro?: string
  ponto_referencia?: string
  municipio: string
  classificacao_risco?: ClassificacaoRiscoSAMU
  risco_justificativa?: string
  observacoes_iniciais?: string
  idempotency_key?: string
}

export interface ClassificarRiscoSAMUParams {
  classificacao_risco: 'vermelho' | 'laranja' | 'amarelo' | 'verde' | 'azul'
  justificativa?: string
}

export interface AtribuirUnidadeMovelSAMUParams {
  unidade_movel_id: string
  unidade_saude_destino_id?: string
  unidade_saude_destino_nome?: string
  unidade_saude_destino_externa?: string
}

export interface TransitarStatusSAMUParams {
  status_novo: StatusFluxoSAMU
  motivo?: string
  desfecho_encaminhamento?: string
  unidade_saude_destino_nome?: string
  idempotency_key?: string
}

export interface VincularPacienteSAMUParams {
  paciente_id: string
  confirmacao_humana: boolean
  justificativa?: string
}

export interface FiltrosListagemSAMU {
  status?: StatusFluxoSAMU | 'todos'
  tipo?: TipoOcorrenciaSAMU | 'todos'
  municipio?: string
  unidade_movel_id?: string
  data_inicio?: string
  data_fim?: string
  page?: number
  perPage?: number
}

export interface RespostaListagemSAMU {
  items: SamuOcorrencia[]
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

// ============================================================================
// Módulo SND - Serviço de Nutrição e Dietética (Requisitos 7.4.3.5.a.i–ii e 7.4.3.5.b.i)
// ============================================================================

export type CategoriaDietaSND = 'oral' | 'rotina' | 'enteral' | 'parenteral' | 'especial'
export type StatusPrescricaoDietetica = 'ativa' | 'alterada' | 'suspensa' | 'encerrada'
export type StatusDistribuicaoRefeicao =
  | 'planejado'
  | 'em_preparo'
  | 'distribuido'
  | 'nao_distribuido'

export interface ItemCardapioRefeicao {
  id: string
  codigo: string
  nome: string
  descricao?: string
  horario_padrao: string
  ordem_dia: number
  ativo: boolean
  versao: number
  motivo_inativacao?: string
  autor_id?: string
  autor_nome?: string
  created: string
  updated: string
}

export interface DietaCatalogoSND {
  id: string
  codigo: string
  nome: string
  categoria: CategoriaDietaSND
  consistencia?: string
  composicao_descricao?: string
  indicacao_padrao?: string
  refeicoes_permitidas?: string[]
  ativo: boolean
  versao: number
  versao_anterior_id?: string
  motivo_alteracao?: string
  autor_id?: string
  autor_nome?: string
  created: string
  updated: string
}

export interface PrescricaoDieteticaSND {
  id: string
  paciente_ref: string
  internacao_ref?: string
  atendimento_pa_ref?: string
  leito_ref?: string
  setor_ref?: string
  dieta_catalogo_ref: string
  dieta_codigo_snapshot: string
  dieta_nome_snapshot: string
  dieta_versao_snapshot: number
  categoria_dieta: CategoriaDietaSND
  consistencia?: string
  via_administracao?: string
  quantidade?: number
  unidade_medida?: string
  fracionamento?: string
  horarios_refeicoes?: Array<{ refeicao_codigo: string; horario: string }>
  vigencia_inicio: string
  vigencia_fim?: string
  status: StatusPrescricaoDietetica
  restricoes_alimentares?: string
  alergias_verificadas?: string
  observacoes_profissionais?: string
  diagnostico_justificativa_clinica?: string // RESTRITO: mascarado para cozinha
  versao_numero: number
  prescricao_anterior_ref?: string
  motivo_alteracao_suspensao?: string
  prescritor_id: string
  prescritor_nome: string
  prescritor_perfil: string
  prescritor_conselho?: string
  data_hora_prescricao_utc: string
  idempotency_key?: string
  hash_payload?: string
  expand?: {
    paciente_ref?: Paciente
    internacao_ref?: Internacao
    leito_ref?: Leito
    setor_ref?: Setor
    dieta_catalogo_ref?: DietaCatalogoSND
  }
  created: string
  updated: string
}

export interface DistribuicaoRefeicaoSND {
  id: string
  prescricao_dietetica_ref: string
  paciente_ref: string
  leito_ref?: string
  setor_ref?: string
  refeicao_codigo: string
  data_operacional: string
  horario_previsto?: string
  status_operacional: StatusDistribuicaoRefeicao
  motivo_nao_distribuido?: string
  observacoes_operacionais?: string
  temperatura_afericao?: string
  responsavel_entrega_nome?: string
  data_hora_registro_utc: string
  autor_id: string
  autor_nome: string
  autor_perfil: string
  idempotency_key?: string
  hash_payload?: string
  created: string
  updated: string
}

/**
 * Projeção Operacional Sanitizada para a Cozinha / Copa (LGPD e Sigilo Clínico):
 * Sem CID, sem diagnóstico detalhado, sem prontuário clínico nem justificativa assistencial restrita.
 */
export interface ItemMapaCozinhaSanitizado {
  prescricao_id: string
  paciente_id: string
  paciente_nome: string
  leito_id?: string
  leito_codigo?: string
  setor_id?: string
  setor_nome?: string
  dieta_codigo: string
  dieta_nome: string
  dieta_versao: number
  categoria_dieta: CategoriaDietaSND
  consistencia?: string
  via_administracao?: string
  quantidade?: number
  unidade_medida?: string
  fracionamento?: string
  restricoes_alimentares?: string
  alergias_alimentares?: string
  observacoes_operacionais?: string
}

// ----------------------------------------------------------------------------
// SND: COMPOSIÇÃO OPERACIONAL E BAIXA DE ESTOQUE (REQUISITO 7.4.3.5.c.i)
// ----------------------------------------------------------------------------

export interface ItemComposicaoReceitaSND {
  item_estoque_id: string
  item_nome: string
  unidade_consumo: string
  quantidade_consumo: number
  unidade_estoque: string
  fator_conversao: number
  quantidade_baixa_estoque: number
}

export interface ComposicaoRefeicaoSND {
  id: string
  codigo: string
  refeicao_codigo: string
  dieta_catalogo_ref?: string
  dieta_codigo?: string
  descricao?: string
  versao: number
  ativo: boolean
  versao_anterior_id?: string
  motivo_alteracao?: string
  itens_composicao: ItemComposicaoReceitaSND[]
  autor_id?: string
  autor_nome?: string
  created: string
  updated: string
}

export interface SnapshotItemBaixaSND {
  item_id: string
  item_nome: string
  unidade_consumo: string
  quantidade_consumo: number
  unidade_estoque: string
  fator_conversao: number
  quantidade_baixa_estoque: number
  saldo_anterior: number
  saldo_posterior: number
  lote?: string
  validade?: string
}

export interface BaixaEstoqueDistribuicaoSND {
  id: string
  distribuicao_ref: string
  composicao_ref_id?: string
  composicao_codigo_snapshot: string
  composicao_versao_snapshot: number
  snapshot_itens_consumidos: SnapshotItemBaixaSND[]
  ponto_estoque: string
  setor_ref?: string
  data_hora_baixa_utc: string
  movimentos_estoque_ids?: string[]
  estornado: boolean
  estorno_motivo?: string
  estorno_autor_id?: string
  estorno_autor_nome?: string
  estorno_data_utc?: string
  estorno_movimentos_ids?: string[]
  autor_id: string
  autor_nome: string
  idempotency_key: string
  hash_payload?: string
  created: string
  updated: string
}

export interface PreviaInsumosBaixaSND {
  refeicao_codigo: string
  dieta_codigo: string
  composicao_encontrada: boolean
  composicao_codigo?: string
  composicao_versao?: number
  pode_baixar: boolean
  motivos_bloqueio?: string[]
  itens: Array<{
    item_id: string
    item_nome: string
    unidade_consumo: string
    quantidade_consumo: number
    unidade_estoque: string
    fator_conversao: number
    quantidade_necessaria: number
    saldo_disponivel: number
    saldo_suficiente: boolean
    lote?: string
    validade?: string
    vencido: boolean
  }>
}

export interface ConfirmarDistribuicaoComBaixaParams {
  idempotency_key: string
  prescricao_dietetica_ref: string
  refeicao_codigo: string
  data_operacional?: string
  horario_previsto?: string
  status_operacional?: StatusDistribuicaoRefeicao
  motivo_nao_distribuido?: string
  ponto_estoque?: string
  responsavel_entrega_nome?: string
  temperatura_afericao?: string
  observacoes_operacionais?: string
  distribuicao_id?: string
}

export interface RespostaConfirmarDistribuicaoComBaixa {
  sucesso: boolean
  baixa_executada?: boolean
  idempotente?: boolean
  codigo?: string
  mensagem: string
  status_operacional?: StatusDistribuicaoRefeicao
  distribuicao_id?: string
  dados?: {
    baixa_id: string
    distribuicao_id: string
    composicao_codigo: string
    composicao_versao: number
    data_hora_baixa_utc: string
    movimentos_estoque_ids: string[]
    snapshot_itens: SnapshotItemBaixaSND[]
  }
}

export interface EstornarBaixaSNDParams {
  baixa_id: string
  motivo: string
}

export interface RespostaEstornoBaixaSND {
  sucesso: boolean
  baixa_id: string
  estornado: boolean
  estorno_data_utc: string
  estorno_autor_nome: string
  movimentos_compensatorios_ids: string[]
  mensagem: string
}

// ----------------------------------------------------------------------------
// MÓDULO RIS (Radiologia e Diagnóstico por Imagem)
// Conforme DOC-02 Seção 7.4.3.4.a.i-iv e c.ii, e itens 313-316 do ANEXO I
// ----------------------------------------------------------------------------

export type ModalidadeRIS = 'rx' | 'tc' | 'ecg' | 'us' | 'outro'

export type StatusFilaRIS =
  | 'solicitado'
  | 'agendado'
  | 'realizado_aguardando_laudo'
  | 'laudado'
  | 'cancelado'

export type TipoExecucaoRIS = 'interno' | 'externo'

export type StatusAgendaRIS = 'agendado' | 'confirmado' | 'realizado' | 'reagendado' | 'cancelado'

export interface ItemFilaRIS {
  id: string
  paciente_id: string
  paciente_nome: string
  paciente_cpf_mascarado: string
  paciente_cns_mascarado: string
  tipo_exame: string
  modalidade_ris: ModalidadeRIS
  prioridade: 'eletiva' | 'urgente'
  data_solicitacao: string
  solicitante_nome: string
  status_ris: StatusFilaRIS
  status_exame_legado?: string
  tipo_execucao: TipoExecucaoRIS
  prestador_externo_nome?: string
  prestador_externo_cnes?: string
  prestador_externo_uf?: string
  versao_atual: number
  tem_retificacao?: boolean
  setor_id?: string
  internacao_id?: string
  atendimento_pa_id?: string
  justificativa_clinica?: string
  rascunho_laudo?: string
  laudo_texto?: string
  resultado_sumario?: string
  created: string
  updated: string
}

export interface RequisicaoImagemPepParams {
  paciente_id: string
  tipo_exame: string
  modalidade_ris?: ModalidadeRIS
  prioridade?: 'eletiva' | 'urgente'
  justificativa_clinica?: string
  internacao_id?: string
  atendimento_pa_id?: string
  setor_id?: string
  tipo_execucao?: TipoExecucaoRIS
  prestador_externo_nome?: string
  prestador_externo_cnes?: string
  prestador_externo_uf?: string
  idempotency_key?: string
}

export interface FiltrosFilaRIS {
  status?: StatusFilaRIS | 'todos'
  modalidade?: ModalidadeRIS | 'todos'
  setor?: string
  tipo_execucao?: TipoExecucaoRIS | 'todos'
  busca?: string
  paciente?: string
  page?: number
  perPage?: number
}

export interface RespostaFilaRIS {
  items: ItemFilaRIS[]
  page: number
  perPage: number
  totalItems: number
  totalPages: number
  isolamento_clinico_aplicado: boolean
}

export interface TransitarStatusRISParams {
  novo_status: StatusFilaRIS
  motivo_justificativa: string
  detalhes?: Record<string, unknown>
}

export interface AgendarExameRISParams {
  exame_id: string
  sala_equipamento: string
  data_hora_inicio: string
  data_hora_fim: string
  unidade_setor_id?: string
  profissional_id?: string
  profissional_nome?: string
  preparo_orientacoes?: string
  idempotency_key?: string
}

export interface ComprovanteAgendamentoRISSnapshot {
  comprovante_id: string
  exame_id: string
  tipo_exame: string
  modalidade_ris: ModalidadeRIS
  paciente_id: string
  paciente_nome: string
  paciente_cpf: string
  paciente_cns: string
  data_nascimento?: string
  unidade_setor: string
  sala_equipamento: string
  data_hora_inicio: string
  data_hora_fim: string
  profissional_responsavel: string
  preparo_orientacoes: string
  motivo_reagendamento?: string
  agenda_anterior_id?: string
  data_hora_emissao: string
  emissor_nome: string
  seguranca_hash: string
}

export interface RisAgenda {
  id: string
  exame: string
  paciente: string
  unidade_setor?: string
  sala_equipamento: string
  profissional_responsavel?: string
  profissional_nome?: string
  data_hora_inicio: string
  data_hora_fim: string
  status: StatusAgendaRIS
  motivo_cancelamento_reagendamento?: string
  agenda_anterior_id?: string
  preparo_orientacoes?: string
  comprovante_snapshot?: ComprovanteAgendamentoRISSnapshot | string
  idempotency_key?: string
  usuario_autor_id?: string
  usuario_autor_nome?: string
  created: string
  updated: string
}

export interface ReagendarExameRISParams {
  motivo: string
  nova_data_hora_inicio: string
  nova_data_hora_fim: string
  nova_sala_equipamento?: string
  novo_profissional_id?: string
  novo_profissional_nome?: string
  preparo_orientacoes?: string
}

export interface RegistrarExameExternoRISParams {
  prestador_externo_nome: string
  prestador_externo_cnes?: string
  prestador_externo_uf?: string
  observacoes?: string
}

export interface RisConfigEditorLaudo {
  fonte_familia?: string
  tamanho_fonte?: string
  espacamento_linhas?: string
  margem_superior?: string
  margem_inferior?: string
  margem_esquerda?: string
  margem_direita?: string
  tamanho_pagina?: 'A4' | 'Carta'
  orientacao?: 'retrato' | 'paisagem'
  cor_destaque?: string
  cabecalho_customizado?: boolean
  rodape_customizado?: boolean
  [key: string]: unknown
}

export interface RisImagemAnexaItem {
  id: string
  arquivo: string
  legenda?: string
  ordem?: number
  mime_type?: string
  tamanho_bytes?: number
}

export interface RisModeloLaudo {
  id: string
  titulo: string
  modalidade: ModalidadeRIS
  codigo_procedimento?: string
  procedimento_nome: string
  texto_padrao: string
  conteudo_formatado?: string
  config_editor?: RisConfigEditorLaudo | string
  versao: number
  ativo: boolean
  modelo_anterior_id?: string
  motivo_alteracao?: string
  usuario_autor_id?: string
  usuario_autor_nome?: string
  created: string
  updated: string
}

export interface CriarModeloLaudoRISParams {
  titulo: string
  modalidade: ModalidadeRIS
  procedimento_nome: string
  texto_padrao: string
  codigo_procedimento?: string
  conteudo_formatado?: string
  config_editor?: RisConfigEditorLaudo | Record<string, unknown>
  modelo_anterior_id?: string
  motivo_alteracao?: string
}

export interface SalvarRascunhoLaudoRISParams {
  conteudo_formatado: string
  versao_esperada?: number
  config_editor?: RisConfigEditorLaudo | Record<string, unknown>
  resultado_sumario?: string
  session_token?: string
}

export interface RespostaSalvarRascunhoRIS {
  sucesso: boolean
  mensagem: string
  exame_id: string
  versao_conteudo_rascunho: number
  autor_id: string
  autor_nome: string
}

export interface PublicarLaudoRISParams {
  conteudo_formatado?: string
  resultado_sumario: string
  idempotency_key?: string
  config_editor?: RisConfigEditorLaudo | Record<string, unknown>
  session_token?: string
}

export interface RespostaPublicarLaudoRIS {
  sucesso: boolean
  mensagem: string
  exame_id: string
  versao_id: string
  versao_numero: number
  status_ris?: string
  data_laudo?: string
  responsavel_nome?: string
  idempotente?: boolean
}

export interface RetificarLaudoRISParams {
  conteudo_formatado: string
  resultado_sumario: string
  motivo_retificacao: string
  idempotency_key?: string
  config_editor?: RisConfigEditorLaudo | Record<string, unknown>
  session_token?: string
}

export interface RespostaRetificarLaudoRIS {
  sucesso: boolean
  mensagem: string
  exame_id: string
  versao_id: string
  versao_numero: number
  versao_anterior_id?: string
  data_laudo?: string
  responsavel_nome?: string
  idempotente?: boolean
}

export interface HistoricoVersaoLaudoPrevia {
  id: string
  numero_versao: number
  data_laudo: string
  responsavel_laudo_nome: string
  responsavel_laudo_cargo?: string
  motivo_retificacao?: string
  versao_anterior_id?: string
}

export interface RespostaPreviaLaudoRIS {
  sucesso: boolean
  exame_id: string
  paciente: {
    id: string
    nome: string
    cpf_mascarado: string
    cns_mascarado: string
    data_nascimento: string
    sexo: string
    tipo_sanguineo?: string
    alergias?: string
  }
  exame: {
    tipo_exame: string
    modalidade_ris: string
    data_solicitacao: string
    solicitante_nome: string
    status_ris: string
    data_laudo?: string
    responsavel_laudo_nome?: string
    resultado_sumario?: string
    versao_vigente: number
    tem_retificacao: boolean
    tipo_execucao: string
    prestador_externo_nome?: string
  }
  previa: {
    tipo_conteudo: 'publicado' | 'rascunho'
    conteudo_formatado_sanitizado: string
    config_editor: RisConfigEditorLaudo | Record<string, unknown>
    imagens_anexas: RisImagemAnexaItem[]
    historico_versoes: HistoricoVersaoLaudoPrevia[]
    unidade_nome: string
    municipio_uf: string
    aviso_legal: string
  }
}

export interface RisHistoricoTransicao {
  id: string
  exame: string
  status_anterior: string
  status_novo: string
  motivo_justificativa: string
  usuario_autor_id: string
  usuario_autor_nome: string
  usuario_cargo?: string
  data_hora: string
  detalhes?: Record<string, unknown>
  created: string
  updated: string
}

// ============================================================================
// ENTREGA FORMAL DE RESULTADOS RIS (REQUISITO 7.4.3.4.c.i)
// ============================================================================

export type FormaRecebimentoEntregaRIS =
  | 'presencial_balcao'
  | 'setor_interno'
  | 'entrega_ambulatorial'
  | 'presencial_proprio_paciente'
  | 'presencial_responsavel_legal'
  | 'interno_setor_clinico'
  | 'interno_medico_assistente'
  | 'outro_autorizado'

export interface RisEntregaLaudo {
  id: string
  protocolo_entrega: string
  exame_ref: string
  laudo_versao_ref: string
  paciente_ref: string
  paciente_nome?: string
  paciente_cpf_mascarado?: string
  paciente_cns_mascarado?: string
  exame_tipo?: string
  exame_modalidade?: string
  versao_entregue: number
  destinatario_nome: string
  destinatario_documento: string
  destinatario_parentesco_grau?: string
  forma_recebimento: FormaRecebimentoEntregaRIS
  observacao?: string
  data_hora_entrega: string
  autor_id: string
  autor_nome: string
  autor_perfil: string
  evento_anterior_ref?: string
  motivo_correcao?: string
  idempotency_key?: string
  created: string
}

export interface RegistrarEntregaLaudoParams {
  exame_id: string
  paciente_id?: string
  laudo_versao_id?: string
  versao_entregue?: number
  destinatario_nome: string
  destinatario_documento: string
  destinatario_parentesco_grau?: string
  forma_recebimento?: FormaRecebimentoEntregaRIS
  observacao?: string
  idempotency_key?: string
  confirmar_versao_divergente?: boolean
  evento_anterior_ref?: string
  motivo_correcao?: string
  session_token?: string
}

export interface RespostaRegistrarEntregaLaudo {
  sucesso: boolean
  idempotente?: boolean
  mensagem: string
  entrega: RisEntregaLaudo
}

export interface ListarEntregasLaudoFiltros {
  exame_id?: string
  paciente_id?: string
  data_inicio?: string
  data_fim?: string
  busca?: string
  page?: number
  perPage?: number
  session_token?: string
}

export interface RespostaListarEntregasLaudo {
  sucesso: boolean
  page: number
  perPage: number
  totalItems: number
  totalPages: number
  items: RisEntregaLaudo[]
}

// ============================================================================
// MÓDULO DE TRATAMENTO FORA DO DOMICÍLIO (TFD) - SEÇÃO 7.4.4.2.e
// ============================================================================

export type StatusProcessoTFD =
  | 'autorizado'
  | 'cancelado'
  | 'enviado_para_estado'
  | 'negado'
  | 'inconcluso'

export type TipoAtendimentoTFD =
  | 'consulta_especializada'
  | 'exame_alta_complexidade'
  | 'procedimento_cirurgico'
  | 'tratamento_oncologico'
  | 'terapia_renal_substitutiva'
  | 'urgencia_emergencia'
  | 'outro'

export interface TfdProcesso {
  id: string
  numero_processo: string
  data_abertura: string
  paciente: string
  profissional_responsavel: string
  cid10: string
  tratamento_solicitado: string
  tipo_atendimento: TipoAtendimentoTFD
  justificativa_clinica: string
  status: StatusProcessoTFD
  motivo_situacao?: string
  observacoes_gerais?: string
  municipio_destino?: string
  estabelecimento_destino?: string
  tipo_transporte_recomendado?: string
  exige_acompanhante?: boolean
  justificativa_acompanhante?: string
  usuario_autor_id?: string
  ultimo_alterador_id?: string
  data_ultima_transicao?: string
  idempotency_key?: string
  is_renovacao?: boolean
  processo_anterior_ref?: string
  expand?: {
    paciente?: Paciente
    profissional_responsavel?: Profissional
    usuario_autor_id?: AppUser
    ultimo_alterador_id?: AppUser
    processo_anterior_ref?: TfdProcesso
  }
  created: string
  updated: string
}

export interface TfdHistoricoEstado {
  id: string
  processo: string
  estado_anterior?: string
  estado_novo: StatusProcessoTFD
  motivo_justificativa: string
  observacoes?: string
  usuario_autor_id: string
  data_hora: string
  expand?: {
    processo?: TfdProcesso
    usuario_autor_id?: AppUser
  }
  created: string
  updated: string
}

export interface TfdViagensLote {
  id: string
  lote_codigo: string
  processo: string
  idempotency_key: string
  confirmado: boolean
  data_confirmacao?: string
  itens_solicitados: number
  itens_criados?: number
  itens_conflito?: number
  resultado_sumario?: any
  usuario_autor_id: string
  created: string
  updated: string
}

export interface CriarProcessoTfdParams {
  paciente: string
  profissional_responsavel: string
  cid10: string
  tratamento_solicitado: string
  tipo_atendimento: TipoAtendimentoTFD
  justificativa_clinica: string
  status?: StatusProcessoTFD
  motivo_situacao?: string
  observacoes_gerais?: string
  municipio_destino?: string
  estabelecimento_destino?: string
  tipo_transporte_recomendado?: string
  exige_acompanhante?: boolean
  justificativa_acompanhante?: string
  idempotency_key?: string
}

export interface TransitarEstadoTfdParams {
  processo_id: string
  novo_status: StatusProcessoTFD
  motivo_justificativa: string
  observacoes?: string
}

export interface RenovarProcessoTfdParams {
  processo_original_id: string
  motivo_renovacao: string
  tratamento_solicitado?: string
  justificativa_clinica?: string
  cid10?: string
  tipo_atendimento?: TipoAtendimentoTFD
  profissional_responsavel?: string
  idempotency_key?: string
}

export interface ItemViagemLoteInput {
  item_idempotency_key: string
  data_saida: string
  data_retorno_previsto: string
  veiculo_id: string
  motorista_id: string
  cidade_destino?: string
  local_destino?: string
}

export interface PreviaViagemLoteItem {
  indice: number
  item_idempotency_key: string
  data_saida: string
  data_retorno_previsto: string
  veiculo_id: string
  motorista_id: string
  apto: boolean
  motivo_rejeicao: string | null
}

export interface PreviaViagemLoteResultado {
  sucesso: boolean
  tipo: 'previa_revisao_humana'
  confirmacao_obrigatoria: true
  mensagem: string
  processo_id: string
  processo_numero: string
  paciente_nome: string
  total_solicitados: number
  total_aptos: number
  total_conflitos: number
  itens: PreviaViagemLoteItem[]
}

export interface ConfirmarViagemLoteParams {
  processo_id: string
  lote_idempotency_key: string
  confirmado: boolean
  itens: ItemViagemLoteInput[]
}

export interface ConfirmarViagemLoteResultado {
  sucesso: boolean
  idempotente?: boolean
  mensagem: string
  lote_codigo: string
  processo_id: string
  total_solicitados?: number
  itens_criados_total?: number
  itens_conflito_total?: number
  criados?: Array<{
    item_idempotency_key: string
    viagem_id: string
    codigo_viagem?: string
    reserva_id?: string
    status: string
  }>
  conflitos?: Array<{
    item_idempotency_key: string
    data_saida: string
    data_retorno_previsto: string
    veiculo_id: string
    motorista_id: string
    motivo_conflito: string
  }>
}

export interface ListarProcessosTfdFiltros {
  paciente?: string
  status?: StatusProcessoTFD | 'todos'
  busca?: string
  dataInicio?: string
  dataFim?: string
  page?: number
  perPage?: number
}

export interface ResultadoPaginadoTfd {
  items: TfdProcesso[]
  page: number
  perPage: number
  totalItems: number
  totalPages: number
  isolamento_clinico_aplicado?: boolean
}

export interface TransporteVeiculo {
  id: string
  descricao: string
  tipo?: string
  placa: string
  marca?: string
  numero_chassi?: string
  ano?: number
  capacidade_lotacao: number
  tipo_combustivel?: CombustivelVeiculo
  data_validade_extintor?: string
  status: StatusVeiculo
  motivo_indisponibilidade?: string
  ativo: boolean
  observacoes?: string
  expand?: {
    tipo?: TransporteTipoVeiculo
  }
  created: string
  updated: string
}

export interface TransporteRota {
  id: string
  descricao: string
  municipio_saida: string
  ativo: boolean
  distancia_estimada_km?: number
  observacoes?: string
  created: string
  updated: string
}

export interface TransporteDestino {
  id: string
  nome: string
  municipio_localizacao: string
  telefone?: string
  endereco?: string
  ativo: boolean
  created: string
  updated: string
}

export interface TransporteMotorista {
  id: string
  nome: string
  cpf: string
  telefone?: string
  endereco?: string
  cep?: string
  municipio?: string
  complemento?: string
  tipo_veiculo_habilitado?: string
  cnh_numero: string
  cnh_categoria: string
  cnh_vencimento: string
  ativo: boolean
  observacoes?: string
  created: string
  updated: string
}

export type TipoViagemSanitaria =
  | 'sanitario_eletivo'
  | 'urgencia_emergencia'
  | 'tfd_intermunicipal'
  | 'administrativo'
  | 'outro'

export type StatusViagem = 'programada' | 'em_transito' | 'concluida' | 'cancelada'

export interface TransporteViagem {
  id: string
  codigo_viagem: string
  data_saida: string
  data_retorno_previsto: string
  data_retorno_real?: string
  tipo_viagem: TipoViagemSanitaria
  status: StatusViagem
  motorista: string
  veiculo: string
  rota?: string
  destino?: string
  cidade_destino: string
  local_destino?: string
  auxiliar_nome?: string
  km_inicial?: number | null
  km_final?: number | null
  km_rodado?: number | null
  empresa_terceirizada?: string
  dotacao_orcamentaria?: string
  recurso_financeiro?: string
  observacoes?: string
  usuario_autor_id?: string
  cancelado_por_id?: string
  motivo_cancelamento?: string
  data_cancelamento?: string
  tfd_processo?: string
  expand?: {
    motorista?: TransporteMotorista
    veiculo?: TransporteVeiculo
    rota?: TransporteRota
    destino?: TransporteDestino
    usuario_autor_id?: AppUser
    cancelado_por_id?: AppUser
    tfd_processo?: TfdProcesso
  }
  created: string
  updated: string
}

export type TipoPassageiro = 'paciente' | 'acompanhante'
export type TrechoViagem = 'ida' | 'volta' | 'ida_e_volta'
export type StatusPassageiroViagem =
  | 'agendado'
  | 'embarcado'
  | 'desembarcado'
  | 'nao_compareceu'
  | 'cancelado'

export interface TransportePassageiro {
  id: string
  viagem: string
  paciente?: string
  paciente_vinculado?: string
  nome_completo: string
  documento_tipo?: string
  documento_numero?: string
  telefone?: string
  tipo_passageiro: TipoPassageiro
  trecho: TrechoViagem
  vagas_ida: number
  vagas_volta: number
  local_embarque?: string
  local_desembarque?: string
  horario_embarque_previsto?: string
  horario_desembarque_previsto?: string
  data_aviso_paciente?: string
  status: StatusPassageiroViagem
  observacoes?: string
  usuario_autor_id?: string
  cancelado_por_id?: string
  motivo_cancelamento?: string
  data_cancelamento?: string
  idempotency_key?: string
  expand?: {
    viagem?: TransporteViagem
    paciente?: Paciente
    paciente_vinculado?: TransportePassageiro
    usuario_autor_id?: AppUser
  }
  created: string
  updated: string
}

export interface CriarVeiculoParams {
  descricao: string
  tipo?: string
  placa: string
  marca?: string
  numero_chassi?: string
  ano?: number
  capacidade_lotacao: number
  tipo_combustivel?: CombustivelVeiculo
  data_validade_extintor?: string
  status: StatusVeiculo
  motivo_indisponibilidade?: string
  ativo?: boolean
  observacoes?: string
}

export interface CriarMotoristaParams {
  nome: string
  cpf: string
  telefone?: string
  endereco?: string
  cep?: string
  municipio?: string
  complemento?: string
  tipo_veiculo_habilitado?: string
  cnh_numero: string
  cnh_categoria: string
  cnh_vencimento: string
  ativo?: boolean
  observacoes?: string
}

export interface CriarRotaParams {
  descricao: string
  municipio_saida: string
  distancia_estimada_km?: number
  ativo?: boolean
  observacoes?: string
}

export interface CriarDestinoParams {
  nome: string
  municipio_localizacao: string
  telefone?: string
  endereco?: string
  ativo?: boolean
}

export interface CriarViagemParams {
  codigo_viagem: string
  data_saida: string
  data_retorno_previsto: string
  tipo_viagem: TipoViagemSanitaria
  motorista: string
  veiculo: string
  rota?: string
  destino?: string
  cidade_destino: string
  local_destino?: string
  auxiliar_nome?: string
  km_inicial?: number | null
  km_final?: number | null
  empresa_terceirizada?: string
  dotacao_orcamentaria?: string
  recurso_financeiro?: string
  observacoes?: string
  tfd_processo?: string
}

export interface RegistrarRetornoViagemKmParams {
  viagem_id: string
  km_final: number
  data_retorno_real?: string
  observacoes?: string
}

export interface AcompanhanteInput {
  nome_completo: string
  documento_numero?: string
  documento_tipo?: string
  telefone?: string
}

export interface ReservarVagasParams {
  viagem_id: string
  paciente_id?: string
  nome_completo?: string
  documento_tipo?: string
  documento_numero?: string
  telefone?: string
  tipo_passageiro?: TipoPassageiro
  trecho: TrechoViagem
  acompanhantes?: AcompanhanteInput[]
  local_embarque?: string
  local_desembarque?: string
  idempotency_key?: string
}

export interface ResultadoReservaVagas {
  sucesso: boolean
  idempotente?: boolean
  mensagem: string
  reserva?: {
    viagem_id: string
    ids_reservas: string[]
    vagas_ida_consumidas: number
    vagas_volta_consumidas: number
    vagas_restantes_ida: number
    vagas_restantes_volta: number
  }
}

export interface CancelarViagemParams {
  viagem_id: string
  motivo_cancelamento: string
}

export interface CancelarPassageiroParams {
  passageiro_id: string
  motivo_cancelamento: string
}

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

// ============================================================================
// MÓDULO DE GERENCIAMENTO DE APACS (SEÇÃO 7.4.4.4)
// ============================================================================

export type TipoLaudoApac =
  | 'laudo_geral'
  | 'medicamentos'
  | 'nefrologia'
  | 'quimioterapia'
  | 'radioterapia'
  | 'bariatrica'

export type ModalidadeApac = 'inicial' | 'continuidade' | 'sem_continuidade'

export type StatusSolicitacaoApac = 'solicitada' | 'em_analise' | 'autorizada' | 'cancelada'

export type TipoRegistroApac = 'ato_original' | 'retificacao'

export interface ApacFaixaSequencia {
  id: string
  ano: number
  uf: string
  tipo_apac: TipoLaudoApac
  faixa_inicial: number
  faixa_final: number
  numero_atual: number
  validade_inicial: string
  validade_final: string
  ativo: boolean
  criado_por?: string
  observacoes?: string
  created: string
  updated: string
}

export interface SnapshotPacienteApac {
  nome: string
  nome_mae?: string
  cns?: string
  cpf?: string
  data_nascimento?: string
  idade?: number
  sexo?: string
  raca_cor?: string
  responsavel_legal?: string
  numero_prontuario: string
}

export interface ApacSolicitacao {
  id: string
  paciente: string
  internacao?: string
  atendimento_pa?: string
  unidade_solicitante: string
  profissional_solicitante?: string
  profissional_solicitante_nome: string
  data_solicitacao: string
  numero_laudo: string
  numero_apac?: string
  faixa_sequencia_origem?: string
  tipo_laudo: TipoLaudoApac
  modalidade: ModalidadeApac
  apac_anterior_numero?: string
  apac_anterior_ref?: string
  executante_prestador_nome: string
  executante_cnes?: string
  cid_principal: string
  cid_secundario?: string
  cid_causas_associadas?: string
  validade_inicial: string
  validade_final: string
  status: StatusSolicitacaoApac
  dados_paciente_snapshot?: SnapshotPacienteApac
  tipo_registro: TipoRegistroApac
  solicitacao_original_ref?: string
  numero_versao?: number
  motivo_retificacao?: string
  usuario_autor_id?: string
  cancelado_por_id?: string
  motivo_cancelamento?: string
  data_cancelamento?: string
  idempotency_key?: string
  expand?: {
    paciente?: Paciente
    internacao?: Internacao
    atendimento_pa?: FichaProntoAtendimento
    profissional_solicitante?: Profissional
    faixa_sequencia_origem?: ApacFaixaSequencia
    apac_anterior_ref?: ApacSolicitacao
    solicitacao_original_ref?: ApacSolicitacao
  }
  created: string
  updated: string
}

export interface CriarSolicitacaoApacParams {
  paciente: string
  internacao?: string
  atendimento_pa?: string
  unidade_solicitante: string
  profissional_solicitante?: string
  profissional_solicitante_nome?: string
  data_solicitacao?: string
  numero_laudo: string
  tipo_laudo: TipoLaudoApac
  modalidade: ModalidadeApac
  apac_anterior_numero?: string
  apac_anterior_ref?: string
  executante_prestador_nome: string
  executante_cnes?: string
  cid_principal: string
  cid_secundario?: string
  cid_causas_associadas?: string
  validade_inicial: string
  validade_final: string
  idempotency_key?: string
}

export interface RetificarSolicitacaoApacParams {
  solicitacao_original_id: string
  motivo_retificacao: string
  unidade_solicitante?: string
  profissional_solicitante?: string
  profissional_solicitante_nome?: string
  executante_prestador_nome?: string
  executante_cnes?: string
  cid_principal?: string
  cid_secundario?: string
  cid_causas_associadas?: string
  validade_inicial?: string
  validade_final?: string
  idempotency_key?: string
}

export interface ListarSolicitacoesApacFiltros {
  pacienteId?: string
  tipo_laudo?: TipoLaudoApac | 'todos'
  modalidade?: ModalidadeApac | 'todos'
  status?: StatusSolicitacaoApac | 'todos'
  busca?: string
  dataInicio?: string
  dataFim?: string
  pagina?: number
  porPagina?: number
}

export interface ResultadoPaginadoApac {
  items: ApacSolicitacao[]
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

export interface RascunhoApacDoPep {
  paciente: string
  dados_paciente_snapshot: SnapshotPacienteApac
  internacao?: string
  atendimento_pa?: string
  unidade_solicitante: string
  profissional_solicitante?: string
  profissional_solicitante_nome: string
  cid_principal: string
  cid_secundario?: string
  data_solicitacao: string
  numero_laudo_sugerido: string
  tipo_laudo_padrao: TipoLaudoApac
  modalidade_padrao: ModalidadeApac
  validade_inicial_sugerida: string
  validade_final_sugerida: string
  executante_prestador_sugerido: string
  revisao_profissional_obrigatoria: true
}

export interface CriarFaixaSequenciaParams {
  ano: number
  uf: string
  tipo_apac: TipoLaudoApac
  faixa_inicial: number
  faixa_final: number
  validade_inicial: string
  validade_final: string
  ativo?: boolean
  observacoes?: string
}

// -------------------------------------------------------------
// FASE 8: MENSAGERIA INTERNA HOSPITALAR (SEÇÃO 7 / BLOCO 1)
// -------------------------------------------------------------
export type TipoDestinatarioMensagem = 'usuario' | 'grupo'

export interface DestinatarioSnapshot {
  id: string
  nome: string
  cargo?: string
  role?: string
}

export interface CanalGrupoMensageria {
  id: string
  nome: string
  sigla?: string
  descricao?: string
  ativo: boolean
  membros: string[]
  criado_por?: string
  expand?: {
    membros?: AppUser[]
    criado_por?: AppUser
  }
  created: string
  updated: string
}

export interface CriarGrupoMensageriaParams {
  nome: string
  sigla?: string
  descricao?: string
  membros?: string[]
}

export interface AtualizarGrupoMensageriaParams {
  id: string
  nome?: string
  sigla?: string
  descricao?: string
  ativo?: boolean
  membros?: string[]
}

export interface ListarDiretorioUsuariosParams {
  pagina?: number
  por_pagina?: number
  busca?: string
}

export interface ResultadoPaginadoDiretorioUsuarios {
  items: UsuarioDiretorioFuncional[]
  totalItems: number
  totalPages: number
  page: number
  perPage: number
}

export interface MensagemInterna {
  id: string
  remetente: string
  remetente_nome_snapshot?: string
  tipo_destinatario: TipoDestinatarioMensagem
  destinatario_usuario?: string
  destinatario_grupo?: string
  destinatarios_resolvidos_ids: string[]
  destinatarios_snapshot: DestinatarioSnapshot[]
  assunto: string
  conteudo: string
  lida_por: string[]
  idempotency_key?: string
  expand?: {
    remetente?: AppUser
    destinatario_usuario?: AppUser
    destinatario_grupo?: CanalGrupoMensageria
  }
  created: string
  updated: string
}

export interface UsuarioDiretorioFuncional {
  id: string
  nome: string
  cargo?: string
  role: UserRole | string
}

export interface EnviarMensagemParams {
  tipo_destinatario: TipoDestinatarioMensagem
  destinatario_usuario?: string
  destinatario_grupo?: string
  assunto: string
  conteudo: string
  idempotency_key?: string
}

export interface ListarMensagensFiltros {
  tipo_caixa: 'entrada' | 'enviadas'
  somente_nao_lidas?: boolean
  pagina?: number
  por_pagina?: number
  busca?: string
}

export interface ResultadoPaginadoMensagens {
  items: MensagemInterna[]
  totalItems: number
  totalPages: number
  page: number
  perPage: number
  totalNaoLidas?: number
}

// -------------------------------------------------------------
// FASE 6: VIGILÂNCIA EM SAÚDE (CONTROLE INTERNO MUNICIPAL)
// -------------------------------------------------------------
export type TipoVigilancia = 'epidemiologica' | 'sanitaria' | 'saude_trabalhador'

export type SituacaoCasoVigilancia =
  | 'notificado'
  | 'em_investigacao'
  | 'confirmado'
  | 'descartado'
  | 'encerrado'

export type PeriodicidadeNotificacao = 'imediata_24h' | 'semanal'

export type CriterioConfirmacaoVigilancia =
  | 'laboratorial'
  | 'clinico_epidemiologico'
  | 'clinico'
  | 'em_aberto'

export type EvolucaoCasoVigilancia =
  | 'cura'
  | 'obito_agravo'
  | 'obito_outras_causas'
  | 'em_tratamento'
  | 'ignorado'

export interface ItemHistoricoInvestigacao {
  data_hora: string
  usuario_id: string
  usuario_nome: string
  usuario_cargo?: string
  situacao_anterior: SituacaoCasoVigilancia
  situacao_nova: SituacaoCasoVigilancia
  nota: string
}

export interface NotificacaoVigilancia {
  id: string
  numero_notificacao: string
  tipo_vigilancia: TipoVigilancia
  paciente: string
  paciente_nome: string
  paciente_cpf?: string
  paciente_cartao_sus?: string
  paciente_data_nascimento?: string
  paciente_sexo?: string
  paciente_municipio?: string
  paciente_bairro?: string
  paciente_logradouro?: string
  paciente_telefone?: string
  agravo_codigo: string
  agravo_nome: string
  cid10_codigo?: string
  periodicidade: PeriodicidadeNotificacao
  situacao: SituacaoCasoVigilancia
  criterio_confirmacao?: CriterioConfirmacaoVigilancia
  evolucao_caso?: EvolucaoCasoVigilancia
  data_notificacao: string
  data_primeiros_sintomas?: string
  data_encerramento?: string
  profissional_notificante?: string
  profissional_nome: string
  profissional_registro?: string
  unidade_notificadora: string
  municipio_notificacao: string
  observacoes_investigacao?: string
  historico_investigacao?: ItemHistoricoInvestigacao[] | string
  expand?: {
    paciente?: Paciente
    profissional_notificante?: Profissional
  }
  created: string
  updated: string
}

/**
 * Resumo administrativo da notificação de vigilância (sem dados clínicos sensíveis de terceiros).
 * Utilizado para o perfil de recepção e contagens operacionais.
 */
export interface NotificacaoVigilanciaResumoAdmin {
  id: string
  numero_notificacao: string
  tipo_vigilancia: TipoVigilancia
  periodicidade: PeriodicidadeNotificacao
  situacao: SituacaoCasoVigilancia
  data_notificacao: string
  unidade_notificadora: string
  created: string
  updated: string
}

// -------------------------------------------------------------
// FASE 7: CENTRO OBSTÉTRICO (ASSISTÊNCIA AO PARTO & NASCIMENTO)
// -------------------------------------------------------------
export type StatusAdmissaoObstetrica =
  | 'em_trabalho_parto'
  | 'em_observacao'
  | 'parto_realizado'
  | 'alta'
  | 'transferida'

export type RiscoObstetricoInformado = 'habitual' | 'alto_risco' | 'nao_informado'

export interface AdmissaoObstetrica {
  id: string
  numero_admissao: string
  paciente: string
  paciente_nome: string
  internacao?: string
  leito?: string
  leito_codigo?: string
  data_hora_admissao: string
  gravidez_planejada?: boolean
  gesta_previa?: number
  para_previa?: number
  abortos_previos?: number
  cesareas_previas?: number
  idade_gestacional_semanas?: number
  idade_gestacional_dias?: number
  dum_informada?: string
  dpp_informada?: string
  risco_obstetrico_informado?: RiscoObstetricoInformado
  justificativa_risco_profissional?: string
  motivo_admissao: string
  sinais_sintomas_admissao?: string
  sinais_vitais_admissao?: string
  batimentos_cardiofetais_bcf?: string
  dinamica_uterina?: string
  dilatacao_cervical_cm?: string
  bolsa_amniotica?: string
  status_admissao: StatusAdmissaoObstetrica
  profissional_responsavel?: string
  profissional_nome: string
  observacoes_admissao?: string
  expand?: {
    paciente?: Paciente
    internacao?: Internacao
    leito?: Leito
    profissional_responsavel?: Profissional
  }
  created: string
  updated: string
}

export interface RegistroTrabalhoParto {
  id: string
  admissao_obstetrica: string
  paciente: string
  data_hora_registro: string
  dilatacao_cervical_cm?: string
  apagamento_cervical_percentual?: string
  altura_apresentacao_de_lee?: string
  variedade_posicao?: string
  dinamica_uterina_freq_duracao?: string
  batimentos_cardiofetais_bcf?: string
  bolsa_aspecto_liquido?: string
  pressao_arterial?: string
  frequencia_cardiaca_materna?: string
  temperatura_axilar?: string
  metodos_alivio_dor_informados?: string
  medicamentos_administrados?: string
  evolucao_anotacao_profissional: string
  profissional_registro?: string
  profissional_nome: string
  expand?: {
    admissao_obstetrica?: AdmissaoObstetrica
    paciente?: Paciente
    profissional_registro?: Profissional
  }
  created: string
  updated: string
}

export type TipoParto =
  | 'vaginal_espontaneo'
  | 'vaginal_instrumentado'
  | 'cesarea_eletiva'
  | 'cesarea_urgencia'

export interface RegistroParto {
  id: string
  admissao_obstetrica: string
  paciente_mae: string
  paciente_mae_nome: string
  data_hora_parto: string
  tipo_parto: TipoParto
  indicacao_tipo_parto?: string
  posicao_parto?: string
  anestesia_analgesia_utilizada?: string
  episiotomia_laceracao?: string
  perineorrafia_sutura?: string
  dequitacao_placenta_tempo_modo?: string
  sangramento_estimado_ml?: number
  intercorrencias_maternas?: string
  contato_pele_a_pele_imediato?: boolean
  amamentacao_primeira_hora?: boolean
  clampeamento_cordao_oportuno?: boolean
  medico_obstetra?: string
  medico_obstetra_nome: string
  enfermeiro_obstetra_nome?: string
  pediatra_neonatologista_nome?: string
  observacoes_parto?: string
  expand?: {
    admissao_obstetrica?: AdmissaoObstetrica
    paciente_mae?: Paciente
    medico_obstetra?: Profissional
  }
  created: string
  updated: string
}

export type SexoRN = 'masculino' | 'feminino' | 'indeterminado'
export type AcomodacaoRN =
  | 'alojamento_conjunto'
  | 'unidade_cuidados_intermediarios'
  | 'uti_neonatal'
  | 'isolamento'

export interface RecemNascido {
  id: string
  parto: string
  admissao_obstetrica: string
  mae_paciente: string
  mae_nome: string
  identificacao_rn: string
  data_hora_nascimento: string
  sexo: SexoRN
  peso_gramas: number
  comprimento_cm?: number
  perimetro_cefalico_cm?: number
  perimetro_toracico_cm?: number
  apgar_1_minuto?: number
  apgar_5_minutos?: number
  apgar_10_minutos?: number
  acomodacao_rn: AcomodacaoRN
  reanimacao_neonatal_necessaria?: boolean
  detalhes_reanimacao?: string
  pulseira_identificacao_conferida: boolean
  declaracao_nascido_vivo_dnv_numero?: string
  observacoes_rn?: string
  paciente_rn_cadastro?: string
  expand?: {
    parto?: RegistroParto
    admissao_obstetrica?: AdmissaoObstetrica
    mae_paciente?: Paciente
    paciente_rn_cadastro?: Paciente
  }
  created: string
  updated: string
}

export type TipoDesfechoObstetrico =
  | 'alta_hospitalar_mae_e_rn'
  | 'alta_hospitalar_apenas_mae'
  | 'transferencia_inter_hospitalar'
  | 'obito_materno'
  | 'alta_a_pedido'
  | 'permanencia_internada'

export interface DesfechoAltaObstetrica {
  id: string
  admissao_obstetrica: string
  paciente_mae: string
  paciente_mae_nome: string
  data_hora_desfecho: string
  tipo_desfecho: TipoDesfechoObstetrico
  resumo_desfecho_clinico: string
  orientacoes_pos_parto_puerperio?: string
  encaminhamento_retorno_ubs?: string
  desocupar_leito_internacao?: boolean
  internacao_desocupada?: string
  profissional_alta?: string
  profissional_nome: string
  expand?: {
    admissao_obstetrica?: AdmissaoObstetrica
    paciente_mae?: Paciente
    internacao_desocupada?: Internacao
    profissional_alta?: Profissional
  }
  created: string
  updated: string
}

// -------------------------------------------------------------
// IMPRESSOS ASSISTENCIAIS (Receita, Atestado, Resumo de Alta)
// -------------------------------------------------------------
export type TipoImpressoAssistencial = 'receita' | 'atestado' | 'resumo_alta' | 'laudo_exame'
export type OrigemImpressoAssistencial =
  | 'pronto_atendimento'
  | 'internacao'
  | 'ambulatorio'
  | 'avulso'

export interface ItemReceitaAssistencial {
  id?: string
  medicamento_nome: string
  apresentacao?: string
  dose: string
  via_administracao: ViaAdministracaoMedicamento | string
  frequencia_posologia: string
  duracao_quantidade: string
  orientacoes?: string
}

export interface ConteudoReceitaAssistencial {
  itens: ItemReceitaAssistencial[]
  observacoes_gerais?: string
  uso_continuo?: boolean
  tipo_receita?: 'simples' | 'controle_especial'
}

export type TipoAtestado =
  | 'afastamento_laboral'
  | 'comparecimento'
  | 'aptidao_fisica'
  | 'acompanhante'

export interface ConteudoAtestadoAssistencial {
  tipo_atestado: TipoAtestado
  periodo_dias?: number
  periodo_horas?: string
  data_inicio: string
  data_fim?: string
  finalidade?: string
  texto_atestado: string
  // Consentimento obrigatório para CID
  cid_consentimento_declarado: boolean
  cid_termo_consentimento?: string
}

export interface ConteudoResumoAltaAssistencial {
  // Dados objetivos do histórico
  data_admissao: string
  data_alta: string
  leito_setor: string
  motivo_internacao: string
  diagnostico_admissao?: string
  cid10_admissao?: string
  procedimentos_cirurgias_realizados?: string
  // Campos clínicos preenchidos/revisados pelo profissional (nunca inventados pelo sistema)
  resumo_evolucao_clinica: string
  diagnostico_alta: string
  cid10_alta?: string
  conduta_medicacao_alta: string
  recomendacoes_cuidados: string
  retorno_ambulatorial?: string
  condicao_alta: 'curado' | 'melhorado' | 'inalterado' | 'a_pedido' | 'transferido' | 'obito'
}

export interface ItemHistoricoLaudoImpresso {
  numero_versao: number
  data_laudo: string
  responsavel_laudo_nome: string
  responsavel_laudo_cargo?: string
  motivo_retificacao?: string
  resultado_sumario?: string
  laudo_texto?: string
}

export interface ConteudoLaudoExameAssistencial {
  tipo_exame: string
  categoria?: string
  prioridade?: string
  solicitante_nome?: string
  data_solicitacao?: string
  data_coleta?: string
  data_laudo?: string
  responsavel_laudo_nome: string
  responsavel_laudo_cargo?: string
  resultado_sumario: string
  laudo_texto: string
  versao_vigente: number
  tem_retificacao?: boolean
  historico_versoes?: ItemHistoricoLaudoImpresso[]
  observacoes?: string
}

export type TipoRegistroImpresso = 'ato_original' | 'retificacao'

export interface ImpressoAssistencial {
  id: string
  tipo: TipoImpressoAssistencial
  paciente: string
  paciente_nome_snapshot?: string
  paciente_cpf_snapshot?: string
  paciente_cns_snapshot?: string
  paciente_nascimento_snapshot?: string
  paciente_sexo_snapshot?: string
  paciente_alergias_snapshot?: string
  profissional?: string
  profissional_nome: string
  profissional_profissao: string
  profissional_registro: string
  unidade_nome: string
  municipio_uf?: string
  origem: OrigemImpressoAssistencial
  atendimento_pa?: string
  internacao?: string
  prescricao_origem?: string
  data_hora_emissao: string
  cid_consentimento_registrado?: boolean
  cid_consentimento_data_hora?: string
  cid10_codigo?: string
  cid10_descricao?: string
  tipo_registro?: TipoRegistroImpresso
  documento_original?: string
  motivo_retificacao?: string
  numero_retificacao?: number
  usuario_emissor_id?: string
  idempotency_key?: string
  conteudo:
    | ConteudoReceitaAssistencial
    | ConteudoAtestadoAssistencial
    | ConteudoResumoAltaAssistencial
    | ConteudoLaudoExameAssistencial
    | Record<string, any>
  observacoes_gerais?: string
  expand?: {
    paciente?: Paciente
    profissional?: Profissional
    atendimento_pa?: FichaProntoAtendimento
    internacao?: Internacao
    prescricao_origem?: PrescricaoMedica
    documento_original?: ImpressoAssistencial
  }
  created: string
  updated: string
}

// -------------------------------------------------------------
// FASE 4: MÓDULO EXAMES & LAUDOS
// -------------------------------------------------------------
export type CategoriaExame = 'laboratorial' | 'imagem' | 'grafico' | 'outro'
export type PrioridadeExame = 'urgente' | 'eletiva'
export type StatusExame = 'solicitado' | 'coletado' | 'em_analise' | 'liberado' | 'cancelado'

export interface LaudoVersao {
  id: string
  exame: string
  numero_versao: number
  resultado_sumario: string
  laudo_texto: string
  motivo_retificacao?: string
  versao_anterior_id?: string
  responsavel_laudo?: string
  responsavel_laudo_nome: string
  responsavel_laudo_cargo?: string
  data_laudo: string
  usuario_id?: string
  idempotency_key?: string
  expand?: {
    exame?: ExameItem
    responsavel_laudo?: Profissional
  }
  created: string
  updated: string
}

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
  idempotency_key?: string
  versao_atual?: number
  tem_retificacao?: boolean
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

export type TipoRegistroAdministracao = 'ato_original' | 'retificacao' | 'anotacao_complementar'

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
  idempotency_key?: string
  tipo_registro?: TipoRegistroAdministracao
  registro_original?: string
  motivo_correcao?: string
  usuario_id?: string
  expand?: {
    paciente?: Paciente
    internacao?: Internacao
    atendimento_pa?: FichaProntoAtendimento
    prescricao?: PrescricaoMedica
    prescricao_item?: PrescricaoItem
    profissional_enfermagem?: Profissional
    registro_original?: AdministracaoMedicamento
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
  | 'impresso_receita'
  | 'impresso_atestado'
  | 'impresso_resumo_alta'
  | 'notificacao_vigilancia'
  | 'obstetrica_admissao'
  | 'obstetrica_trabalho_parto'
  | 'obstetrica_parto'
  | 'obstetrica_recem_nascido'
  | 'obstetrica_desfecho_alta'
  | 'regulacao_solicitacao'
  | 'regulacao_avaliacao'
  | 'regulacao_efetivacao'

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
  localizacao_farmacia?: string
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
  idempotency_key?: string
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

export type StatusInventarioFarmacia =
  | 'em_andamento'
  | 'cancelado'
  | 'concluido'
  | 'rejeitado_concorrencia'

export interface InventarioFarmacia {
  id: string
  codigo_inventario: string
  titulo: string
  status: StatusInventarioFarmacia
  data_abertura: string
  responsavel_abertura: string
  data_fechamento?: string
  responsavel_fechamento?: string
  justificativa_fechamento?: string
  total_itens_inventariados?: number
  total_divergencias?: number
  observacoes?: string
  created: string
  updated: string
}

export type StatusConferenciaInventario =
  | 'pendente'
  | 'contado'
  | 'divergente'
  | 'reconciliado'
  | 'ajustado'

export interface ItemInventarioFarmacia {
  id: string
  inventario: string
  item: string
  item_nome: string
  lote?: string
  validade?: string
  local_armazenamento?: string
  quantidade_sistema_base: number
  quantidade_contada?: number
  divergencia?: number
  status_conferencia: StatusConferenciaInventario
  responsavel_contagem?: string
  data_hora_contagem?: string
  justificativa_ajuste?: string
  observacoes?: string
  expand?: {
    inventario?: InventarioFarmacia
    item?: ItemFarmacia
  }
  created: string
  updated: string
}

export type TipoMovimentoEstoque =
  | 'entrada_nota'
  | 'ajuste_inventario_sobra'
  | 'ajuste_inventario_falta'
  | 'perda_validade'
  | 'perda_avaria'
  | 'devolucao_paciente'

export interface MovimentoEstoqueFarmacia {
  id: string
  item: string
  item_nome: string
  tipo_movimento: TipoMovimentoEstoque
  quantidade: number
  estoque_anterior: number
  estoque_posterior: number
  lote?: string
  validade?: string
  local_armazenamento?: string
  justificativa: string
  responsavel_nome: string
  responsavel_id?: string
  data_hora: string
  inventario_origem?: string
  documento_ref?: string
  expand?: {
    item?: ItemFarmacia
    inventario_origem?: InventarioFarmacia
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
  profissao?: string
  conselho_regional?: string
  conselho_numero?: string
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

// -------------------------------------------------------------
// CENTRAL DE REGULAÇÃO INTERNA MUNICIPAL
// -------------------------------------------------------------
export type TipoSolicitacaoRegulacao =
  | 'transferencia_interna'
  | 'transferencia_externa'
  | 'encaminhamento_especialidade'

export type AtendimentoOrigemRegulacao = 'pronto_atendimento' | 'internacao' | 'ambulatorial'

export type RecursoSolicitadoRegulacao =
  | 'leito_enfermaria_clinica'
  | 'leito_uti_adulto'
  | 'leito_isolamento'
  | 'leito_cirurgico'
  | 'avaliacao_especializada'
  | 'procedimento_urgencia'
  | 'suporte_ventilatorio'
  | 'outro'

export type PrioridadeRegulacao =
  | 'emergencia_vermelha'
  | 'urgencia_amarela'
  | 'prioritario_verde'
  | 'eletivo_azul'

export type SituacaoRegulacao =
  | 'solicitada'
  | 'em_avaliacao'
  | 'aceita'
  | 'negada'
  | 'efetivada'
  | 'cancelada'

export type DecisaoRegulador = 'pendente' | 'aceita' | 'negada'

export interface ItemTransicaoRegulacao {
  data_hora: string
  de: SituacaoRegulacao
  para: SituacaoRegulacao
  responsavel_nome: string
  responsavel_role?: string
  motivo?: string
  detalhes?: string
}

export interface SolicitacaoRegulacao {
  id: string
  numero_solicitacao: string
  tipo: TipoSolicitacaoRegulacao
  paciente: string
  paciente_nome: string
  atendimento_origem_tipo: AtendimentoOrigemRegulacao
  atendimento_pa?: string
  internacao?: string
  setor_origem?: string
  setor_origem_nome: string
  leito_origem?: string
  leito_origem_codigo?: string
  setor_destino?: string
  setor_destino_nome?: string
  leito_destino?: string
  leito_destino_codigo?: string
  unidade_externa_destino?: string
  recurso_solicitado: RecursoSolicitadoRegulacao
  descricao_recurso?: string
  prioridade: PrioridadeRegulacao
  justificativa_clinica: string
  diagnostico_principal: string
  cid10_codigo?: string
  sinais_vitais_sumario?: string
  condicoes_transporte?: string
  situacao: SituacaoRegulacao
  profissional_solicitante?: string
  profissional_solicitante_nome: string
  profissional_solicitante_registro?: string
  data_hora_solicitacao: string
  profissional_regulador?: string
  profissional_regulador_nome?: string
  data_hora_avaliacao?: string
  decisao_regulador?: DecisaoRegulador
  motivo_decisao_regulador?: string
  data_hora_efetivacao?: string
  responsavel_efetivacao_nome?: string
  observacoes_efetivacao?: string
  motivo_cancelamento?: string
  data_hora_cancelamento?: string
  historico_transicoes?: ItemTransicaoRegulacao[] | string
  expand?: {
    paciente?: Paciente
    atendimento_pa?: FichaProntoAtendimento
    internacao?: Internacao
    setor_origem?: Setor
    leito_origem?: Leito
    setor_destino?: Setor
    leito_destino?: Leito
    profissional_solicitante?: Profissional
    profissional_regulador?: Profissional
  }
  created: string
  updated: string
}

export interface SolicitacaoRegulacaoResumoAdmin {
  id: string
  numero_solicitacao: string
  tipo: TipoSolicitacaoRegulacao
  paciente_nome: string
  atendimento_origem_tipo: AtendimentoOrigemRegulacao
  setor_origem_nome: string
  setor_destino_nome?: string
  unidade_externa_destino?: string
  recurso_solicitado: RecursoSolicitadoRegulacao
  prioridade: PrioridadeRegulacao
  situacao: SituacaoRegulacao
  decisao_regulador?: DecisaoRegulador
  data_hora_solicitacao: string
  data_hora_avaliacao?: string
  data_hora_efetivacao?: string
  created: string
  updated: string
}

// -------------------------------------------------------------
// GESTÃO ADMINISTRATIVA DA REGULAÇÃO: CATÁLOGO PARAMETRIZÁVEL & TEMPOS
// -------------------------------------------------------------
export type CategoriaRecursoRegulacao = 'leito' | 'especialidade' | 'procedimento' | 'suporte'

export interface ItemCatalogoRecurso {
  id: string
  codigo: string
  nome: string
  categoria: CategoriaRecursoRegulacao
  descricao?: string
  ativo: boolean
  tempo_alvo_minutos?: number
  ordem?: number
  created: string
  updated: string
}

export type TipoDestinoInterno =
  | 'enfermaria'
  | 'uti'
  | 'centro_cirurgico'
  | 'ambulatorio'
  | 'isolamento'
  | 'outro'

export interface ItemDestinoInterno {
  id: string
  codigo: string
  nome: string
  tipo: TipoDestinoInterno
  setor_vinculado?: string
  bloco_ala?: string
  capacidade_operacional?: number
  ativo: boolean
  observacoes?: string
  ordem?: number
  expand?: {
    setor_vinculado?: Setor
  }
  created: string
  updated: string
}

/**
 * Resultado do cálculo de tempo de espera individual de uma solicitação de regulação
 */
export interface CalculoTempoEspera {
  minutosEsperaTotal: number
  minutosEsperaLiquida: number // Descontadas eventuais pausas
  tempoFormatado: string
  dataOrigemIso: string
  dataFimIso?: string
  statusRelogio: 'ativo' | 'pausado' | 'concluido' | 'cancelado' | 'indeterminado'
  alertaAtraso?: boolean
  dataInvalidaOuAusente?: boolean
  detalhesCalculo: string
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
