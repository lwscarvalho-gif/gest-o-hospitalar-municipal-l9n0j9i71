/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0037: Módulo SAMU Básico (Itens 407 a 417 do ANEXO I e Seção 7.4.5.1.e.i) - Parte 1
 *
 * Estruturas Criadas:
 * 1. `samu_ocorrencias`:
 *    - numero_ocorrencia (código único ex: SAMU-2026-XXXXX)
 *    - tipo_ocorrencia (clinica, trauma, obstetrica, psiquiatrica, pediatrica, outro)
 *    - relacao_solicitante_vitima (propria_vitima, familiar, transeunte, policial_bombeiro, profissional_saude, outro)
 *    - nome_solicitante (text)
 *    - telefone_solicitante (text)
 *    - vitima_desconhecida (bool)
 *    - vitima_nome_informado (text - aceita "Desconhecido", "Não identificado", etc.)
 *    - vitima_sexo_informado (select: M | F | Outro | desconhecido)
 *    - vitima_idade_informada (text - ex: "aprox. 35 anos", "desconhecida", "42")
 *    - vitima_paciente_id (relation -> pacientes, opcional; vinculado após confirmação humana)
 *    - vitima_confirmada_humano (bool)
 *    - vitima_confirmacao_data (text UTC)
 *    - vitima_confirmacao_autor_id (relation -> users)
 *    - endereco_textual (text)
 *    - numero_complemento (text)
 *    - bairro (text)
 *    - ponto_referencia (text)
 *    - municipio (text)
 *    - classificacao_risco (select: vermelho | laranja | amarelo | verde | azul | nao_classificado)
 *    - risco_classificado_por_id (relation -> users)
 *    - risco_classificado_por_nome (text)
 *    - risco_classificado_por_cargo (text)
 *    - risco_data_hora (text UTC)
 *    - risco_justificativa (text)
 *    - unidade_saude_destino_id (relation -> setores, opcional)
 *    - unidade_saude_destino_nome (text)
 *    - unidade_saude_destino_externa (text, quando hospital de outro município/referência)
 *    - unidade_movel_id (relation -> transporte_veiculos, opcional)
 *    - unidade_movel_placa (text)
 *    - unidade_movel_descricao (text)
 *    - status_fluxo (select: aberta | em_deslocamento | no_local | em_transporte | concluida | cancelada)
 *    - motivo_cancelamento (text)
 *    - data_cancelamento (text UTC)
 *    - cancelado_por_id (relation -> users)
 *    - data_hora_abertura (text UTC)
 *    - data_hora_conclusao (text UTC)
 *    - observacoes_iniciais (text)
 *    - desfecho_encaminhamento (text)
 *    - usuario_abertura_id (relation -> users)
 *    - usuario_abertura_nome (text)
 *    - ultimo_alterador_id (relation -> users)
 *    - idempotency_key (text)
 *    - hash_payload (text)
 *
 * 2. `samu_historico_estados`: Coleção imutável de trilha de estados e eventos
 *    - ocorrencia (relation -> samu_ocorrencias)
 *    - status_anterior (text)
 *    - status_novo (text)
 *    - motivo_transicao (text)
 *    - unidade_movel_id (relation -> transporte_veiculos)
 *    - unidade_destino_nome (text)
 *    - autor_id (relation -> users)
 *    - autor_nome (text)
 *    - autor_cargo (text)
 *    - autor_perfil (text)
 *    - data_hora_utc (text UTC)
 *    - detalhes (json)
 *    - evento_anterior_ref (text)
 *    - motivo_correcao (text)
 *
 * Regras e Segurança:
 * - Índices de idempotência e performance
 * - Histórico sem update e sem delete
 * - Bloqueio de exclusão de ocorrências no hook
 */

migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'
    const pacientesColId = app.findCollectionByNameOrId('pacientes').id
    const setoresColId = app.findCollectionByNameOrId('setores').id
    const veiculosColId = app.findCollectionByNameOrId('transporte_veiculos').id

    // 1. Coleção samu_ocorrencias
    let ocorrenciasCol
    try {
      ocorrenciasCol = app.findCollectionByNameOrId('samu_ocorrencias')
    } catch (_) {
      ocorrenciasCol = new Collection({
        name: 'samu_ocorrencias',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null, // Proibida criação direta via API de coleção; somente rota /backend/v1/samu/ocorrencias/abrir
        updateRule: null, // Proibida atualização direta via API de coleção; somente rotas transacionais autorizadas
        deleteRule: null, // Exclusão física proibida
        fields: [
          { name: 'numero_ocorrencia', type: 'text', required: true },
          {
            name: 'tipo_ocorrencia',
            type: 'select',
            required: true,
            values: ['clinica', 'trauma', 'obstetrica', 'psiquiatrica', 'pediatrica', 'outro'],
            maxSelect: 1,
          },
          {
            name: 'relacao_solicitante_vitima',
            type: 'select',
            required: true,
            values: [
              'propria_vitima',
              'familiar',
              'transeunte',
              'policial_bombeiro',
              'profissional_saude',
              'outro',
            ],
            maxSelect: 1,
          },
          { name: 'nome_solicitante', type: 'text' },
          { name: 'telefone_solicitante', type: 'text' },
          { name: 'vitima_desconhecida', type: 'bool' },
          { name: 'vitima_nome_informado', type: 'text', required: true },
          {
            name: 'vitima_sexo_informado',
            type: 'select',
            required: true,
            values: ['M', 'F', 'Outro', 'desconhecido'],
            maxSelect: 1,
          },
          { name: 'vitima_idade_informada', type: 'text' },
          {
            name: 'vitima_paciente_id',
            type: 'relation',
            collectionId: pacientesColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'vitima_confirmada_humano', type: 'bool' },
          { name: 'vitima_confirmacao_data', type: 'text' },
          {
            name: 'vitima_confirmacao_autor_id',
            type: 'relation',
            collectionId: usersColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'endereco_textual', type: 'text', required: true },
          { name: 'numero_complemento', type: 'text' },
          { name: 'bairro', type: 'text' },
          { name: 'ponto_referencia', type: 'text' },
          { name: 'municipio', type: 'text', required: true },
          {
            name: 'classificacao_risco',
            type: 'select',
            values: ['vermelho', 'laranja', 'amarelo', 'verde', 'azul', 'nao_classificado'],
            maxSelect: 1,
          },
          {
            name: 'risco_classificado_por_id',
            type: 'relation',
            collectionId: usersColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'risco_classificado_por_nome', type: 'text' },
          { name: 'risco_classificado_por_cargo', type: 'text' },
          { name: 'risco_data_hora', type: 'text' },
          { name: 'risco_justificativa', type: 'text' },
          {
            name: 'unidade_saude_destino_id',
            type: 'relation',
            collectionId: setoresColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'unidade_saude_destino_nome', type: 'text' },
          { name: 'unidade_saude_destino_externa', type: 'text' },
          {
            name: 'unidade_movel_id',
            type: 'relation',
            collectionId: veiculosColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'unidade_movel_placa', type: 'text' },
          { name: 'unidade_movel_descricao', type: 'text' },
          {
            name: 'status_fluxo',
            type: 'select',
            required: true,
            values: [
              'aberta',
              'em_deslocamento',
              'no_local',
              'em_transporte',
              'concluida',
              'cancelada',
            ],
            maxSelect: 1,
          },
          { name: 'motivo_cancelamento', type: 'text' },
          { name: 'data_cancelamento', type: 'text' },
          {
            name: 'cancelado_por_id',
            type: 'relation',
            collectionId: usersColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'data_hora_abertura', type: 'text', required: true },
          { name: 'data_hora_conclusao', type: 'text' },
          { name: 'observacoes_iniciais', type: 'text' },
          { name: 'desfecho_encaminhamento', type: 'text' },
          {
            name: 'usuario_abertura_id',
            type: 'relation',
            collectionId: usersColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'usuario_abertura_nome', type: 'text' },
          {
            name: 'ultimo_alterador_id',
            type: 'relation',
            collectionId: usersColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'idempotency_key', type: 'text' },
          { name: 'hash_payload', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_samu_oco_numero ON samu_ocorrencias (numero_ocorrencia)',
          'CREATE INDEX idx_samu_oco_status ON samu_ocorrencias (status_fluxo)',
          'CREATE INDEX idx_samu_oco_tipo ON samu_ocorrencias (tipo_ocorrencia)',
          'CREATE INDEX idx_samu_oco_data_abertura ON samu_ocorrencias (data_hora_abertura)',
          'CREATE INDEX idx_samu_oco_municipio ON samu_ocorrencias (municipio)',
          'CREATE INDEX idx_samu_oco_unid_movel ON samu_ocorrencias (unidade_movel_id)',
          'CREATE INDEX idx_samu_oco_paciente ON samu_ocorrencias (vitima_paciente_id)',
          'CREATE INDEX idx_samu_oco_idemp ON samu_ocorrencias (idempotency_key)',
        ],
      })
      app.save(ocorrenciasCol)
    }

    const samuOcorrenciasColId = app.findCollectionByNameOrId('samu_ocorrencias').id

    // 2. Coleção samu_historico_estados
    let historicoCol
    try {
      historicoCol = app.findCollectionByNameOrId('samu_historico_estados')
    } catch (_) {
      historicoCol = new Collection({
        name: 'samu_historico_estados',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null, // Somente via rotas do backend
        updateRule: null, // Histórico estritamente imutável
        deleteRule: null, // Exclusão física proibida
        fields: [
          {
            name: 'ocorrencia',
            type: 'relation',
            collectionId: samuOcorrenciasColId,
            cascadeDelete: false,
            required: true,
            maxSelect: 1,
          },
          { name: 'status_anterior', type: 'text' },
          { name: 'status_novo', type: 'text', required: true },
          { name: 'motivo_transicao', type: 'text' },
          {
            name: 'unidade_movel_id',
            type: 'relation',
            collectionId: veiculosColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'unidade_destino_nome', type: 'text' },
          {
            name: 'autor_id',
            type: 'relation',
            collectionId: usersColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'autor_nome', type: 'text' },
          { name: 'autor_cargo', type: 'text' },
          { name: 'autor_perfil', type: 'text' },
          { name: 'data_hora_utc', type: 'text', required: true },
          { name: 'detalhes', type: 'json' },
          { name: 'evento_anterior_ref', type: 'text' },
          { name: 'motivo_correcao', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_samu_hist_oco ON samu_historico_estados (ocorrencia)',
          'CREATE INDEX idx_samu_hist_data ON samu_historico_estados (data_hora_utc)',
          'CREATE INDEX idx_samu_hist_autor ON samu_historico_estados (autor_id)',
        ],
      })
      app.save(historicoCol)
    }
  },
  (app) => {
    try {
      const hist = app.findCollectionByNameOrId('samu_historico_estados')
      if (hist) app.delete(hist)
    } catch (_) {}

    try {
      const oco = app.findCollectionByNameOrId('samu_ocorrencias')
      if (oco) app.delete(oco)
    } catch (_) {}
  },
)
