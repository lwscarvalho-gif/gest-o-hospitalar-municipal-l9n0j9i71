/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0030: Processos Formais de Tratamento Fora do Domicílio (TFD) - Parte 1: Backend/Serviço
 * Referência: ANEXO I - DOC-02 Seção 7.4.4.2.e (página 30) do caderno de especificações funcionais:
 * - e.i: Abertura e controle dos processos de TFD contendo: número do processo (interno, não oficial),
 *   data de abertura, paciente, profissional responsável, CID-10, tratamento solicitado, tipo de atendimento
 *   e justificativa clínica;
 * - e.ii: Status do processo de TFD (autorizado, cancelado, enviado para o estado, negado ou inconcluso),
 *   com campo obrigatório para justificativa da situação e observações gerais;
 * - e.iii: Mecanismo para criação e lançamento de viagens vinculadas ao processo de TFD com paciente coerente;
 * - e.iv: Criação em lote de viagens de TFD com prévia para revisão humana, confirmação explícita e idempotência;
 * - e.v: Renovação de processos de TFD já concluídos (cria novo processo relacionado preservando histórico).
 *
 * Coleções criadas:
 * 1. `tfd_processos`:
 *    - Processo formal de TFD com isolamento de dados clínicos sensíveis (justificativa_clinica e cid10
 *      protegidos de recepção via hooks/RLS).
 *    - Controle de renovação: processo_anterior_ref indica a cadeia de processos renovados.
 * 2. `tfd_historico_estados`:
 *    - Histórico auditável e imutável de todas as transições de estado, registrando:
 *      processo, estado_anterior, estado_novo, motivo_justificativa, observacoes, usuario_autor_id, data_hora.
 * 3. `tfd_viagens_lote`:
 *    - Registro persistente de lotes de viagens: lote_id, processo_id, idempotency_key,
 *      confirmado, data_confirmacao, resultado_sumario, usuario_autor_id.
 *
 * Atualização em `transporte_viagens`:
 *    - Adiciona campo de relação `tfd_processo` apontando para `tfd_processos` para vincular
 *      diretamente viagens de TFD ao respectivo processo.
 */
migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'
    const pacientesColId = app.findCollectionByNameOrId('pacientes').id
    const profissionaisColId = app.findCollectionByNameOrId('profissionais').id

    // ------------------------------------------------------------------------
    // 1. Coleção tfd_processos
    // ------------------------------------------------------------------------
    let tfdCol
    try {
      tfdCol = app.findCollectionByNameOrId('tfd_processos')
    } catch (_) {
      tfdCol = new Collection({
        name: 'tfd_processos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        updateRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        deleteRule: null, // Proibição de exclusão física por auditoria SUS
        fields: [
          { name: 'numero_processo', type: 'text', required: true, min: 3, max: 50 },
          { name: 'data_abertura', type: 'text', required: true, min: 10, max: 25 },
          {
            name: 'paciente',
            type: 'relation',
            collectionId: pacientesColId,
            required: true,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'profissional_responsavel',
            type: 'relation',
            collectionId: profissionaisColId,
            required: true,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'cid10', type: 'text', required: true, min: 2, max: 10 },
          { name: 'tratamento_solicitado', type: 'text', required: true, min: 2, max: 250 },
          {
            name: 'tipo_atendimento',
            type: 'select',
            values: [
              'consulta_especializada',
              'exame_alta_complexidade',
              'procedimento_cirurgico',
              'tratamento_oncologico',
              'terapia_renal_substitutiva',
              'urgencia_emergencia',
              'outro',
            ],
            maxSelect: 1,
            required: true,
          },
          { name: 'justificativa_clinica', type: 'text', required: true, min: 5, max: 3000 },
          {
            name: 'status',
            type: 'select',
            values: ['autorizado', 'cancelado', 'enviado_para_estado', 'negado', 'inconcluso'],
            maxSelect: 1,
            required: true,
          },
          { name: 'motivo_situacao', type: 'text', required: false, max: 1500 },
          { name: 'observacoes_gerais', type: 'text', required: false, max: 2000 },
          { name: 'municipio_destino', type: 'text', required: false, max: 100 },
          { name: 'estabelecimento_destino', type: 'text', required: false, max: 150 },
          { name: 'tipo_transporte_recomendado', type: 'text', required: false, max: 100 },
          { name: 'exige_acompanhante', type: 'bool' },
          { name: 'justificativa_acompanhante', type: 'text', required: false, max: 1000 },
          {
            name: 'usuario_autor_id',
            type: 'relation',
            collectionId: usersColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'ultimo_alterador_id',
            type: 'relation',
            collectionId: usersColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'data_ultima_transicao', type: 'text', required: false, max: 30 },
          { name: 'idempotency_key', type: 'text', required: false, max: 100 },
          { name: 'is_renovacao', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_tfd_num_processo ON tfd_processos (numero_processo)',
          'CREATE INDEX idx_tfd_proc_paciente ON tfd_processos (paciente, created DESC)',
          'CREATE INDEX idx_tfd_proc_status ON tfd_processos (status, created DESC)',
          'CREATE INDEX idx_tfd_proc_idemp ON tfd_processos (idempotency_key)',
        ],
      })
      app.save(tfdCol)
    }

    // Auto-relação reflexiva para renovação: processo_anterior_ref
    const tfdProcCriado = app.findCollectionByNameOrId('tfd_processos')
    if (!tfdProcCriado.fields.getByName('processo_anterior_ref')) {
      tfdProcCriado.fields.add(
        new RelationField({
          name: 'processo_anterior_ref',
          collectionId: tfdProcCriado.id,
          required: false,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      app.save(tfdProcCriado)
    }

    const tfdColId = app.findCollectionByNameOrId('tfd_processos').id

    // ------------------------------------------------------------------------
    // 2. Coleção tfd_historico_estados (auditável e imutável)
    // ------------------------------------------------------------------------
    let histCol
    try {
      histCol = app.findCollectionByNameOrId('tfd_historico_estados')
    } catch (_) {
      histCol = new Collection({
        name: 'tfd_historico_estados',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        updateRule: null, // Imutável após inserção
        deleteRule: null, // Não pode ser apagado
        fields: [
          {
            name: 'processo',
            type: 'relation',
            collectionId: tfdColId,
            required: true,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'estado_anterior', type: 'text', required: false, max: 50 },
          { name: 'estado_novo', type: 'text', required: true, min: 2, max: 50 },
          { name: 'motivo_justificativa', type: 'text', required: true, min: 5, max: 2000 },
          { name: 'observacoes', type: 'text', required: false, max: 2000 },
          {
            name: 'usuario_autor_id',
            type: 'relation',
            collectionId: usersColId,
            required: true,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'data_hora', type: 'text', required: true, min: 10, max: 30 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_tfd_hist_proc ON tfd_historico_estados (processo, created DESC)',
          'CREATE INDEX idx_tfd_hist_autor ON tfd_historico_estados (usuario_autor_id)',
        ],
      })
      app.save(histCol)
    }

    // ------------------------------------------------------------------------
    // 3. Coleção tfd_viagens_lote (controle de idempotência e auditoria de lote)
    // ------------------------------------------------------------------------
    let loteCol
    try {
      loteCol = app.findCollectionByNameOrId('tfd_viagens_lote')
    } catch (_) {
      loteCol = new Collection({
        name: 'tfd_viagens_lote',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        updateRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        deleteRule: null,
        fields: [
          { name: 'lote_codigo', type: 'text', required: true, min: 3, max: 60 },
          {
            name: 'processo',
            type: 'relation',
            collectionId: tfdColId,
            required: true,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'idempotency_key', type: 'text', required: true, min: 5, max: 100 },
          { name: 'confirmado', type: 'bool' },
          { name: 'data_confirmacao', type: 'text', required: false, max: 30 },
          { name: 'itens_solicitados', type: 'number', required: true, onlyInt: true, min: 1 },
          { name: 'itens_criados', type: 'number', required: false, onlyInt: true, min: 0 },
          { name: 'itens_conflito', type: 'number', required: false, onlyInt: true, min: 0 },
          { name: 'resultado_sumario', type: 'json' },
          {
            name: 'usuario_autor_id',
            type: 'relation',
            collectionId: usersColId,
            required: true,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_tfd_lote_idemp ON tfd_viagens_lote (idempotency_key)',
          'CREATE INDEX idx_tfd_lote_proc ON tfd_viagens_lote (processo)',
        ],
      })
      app.save(loteCol)
    }

    // ------------------------------------------------------------------------
    // 4. Adicionar relação tfd_processo em transporte_viagens
    // ------------------------------------------------------------------------
    const viagensCol = app.findCollectionByNameOrId('transporte_viagens')
    if (!viagensCol.fields.getByName('tfd_processo')) {
      viagensCol.fields.add(
        new RelationField({
          name: 'tfd_processo',
          collectionId: tfdColId,
          required: false,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      app.save(viagensCol)
    }
  },
  (app) => {
    try {
      const viagensCol = app.findCollectionByNameOrId('transporte_viagens')
      const campoTfd = viagensCol.fields.getByName('tfd_processo')
      if (campoTfd) {
        viagensCol.fields.removeByName('tfd_processo')
        app.save(viagensCol)
      }
    } catch (_) {}

    try {
      const loteCol = app.findCollectionByNameOrId('tfd_viagens_lote')
      if (loteCol) app.delete(loteCol)
    } catch (_) {}

    try {
      const histCol = app.findCollectionByNameOrId('tfd_historico_estados')
      if (histCol) app.delete(histCol)
    } catch (_) {}

    try {
      const tfdCol = app.findCollectionByNameOrId('tfd_processos')
      if (tfdCol) app.delete(tfdCol)
    } catch (_) {}
  },
)
