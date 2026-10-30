/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0031: Módulo RIS (Radiologia e Diagnóstico por Imagem) - Primeira Parte
 * Conforme Seção 7.4.3.4.a.i-iv e c.ii (pp. 21-22 do DOC-02) e itens 313-316 do ANEXO I.
 *
 * 1. Evolução da coleção `exames`:
 *    - `modalidade_ris` (select: 'rx', 'tc', 'ecg', 'us', 'outro')
 *    - `status_ris` (select: 'solicitado', 'agendado', 'realizado_aguardando_laudo', 'laudado', 'cancelado')
 *    - `tipo_execucao` (select: 'interno', 'externo')
 *    - `prestador_externo_nome` (text)
 *    - `prestador_externo_cnes` (text)
 *    - `prestador_externo_uf` (text)
 *    - `rascunho_laudo` (text: apenas rascunho temporário, nunca substitui laudo liberado)
 *    - `modelo_laudo_id` (text: referência ao modelo aplicado)
 *
 * 2. Criação da coleção `ris_modelos_laudo`:
 *    - Modelos de laudos pré-definidos por procedimento/modalidade
 *    - Versionamento estrito e inativação lógica (sem exclusão física)
 *    - Regras de acesso: recepção bloqueada; apenas profissionais/gestores/admins
 *
 * 3. Criação da coleção `ris_agendas`:
 *    - Agendamento de exames por unidade/setor, sala/equipamento e profissional
 *    - Conflitos validados no servidor; reagendamento/cancelamento auditados sem deleção física
 *    - Comprovante de agendamento em snapshot congelado (impresso seguro)
 *
 * 4. Criação da coleção `ris_historico_transicoes`:
 *    - Trilha auditável de transições na fila RIS com motivo, autor e timestamp
 */

migrate(
  (app) => {
    const examesCol = app.findCollectionByNameOrId('exames')
    const pacientesColId = app.findCollectionByNameOrId('pacientes').id
    const profissionaisColId = app.findCollectionByNameOrId('profissionais').id
    const setoresColId = app.findCollectionByNameOrId('setores').id
    const examesColId = examesCol.id

    // -------------------------------------------------------------
    // 1. Novos campos na coleção 'exames' para radiologia/imagem (RIS)
    // -------------------------------------------------------------
    if (!examesCol.fields.getByName('modalidade_ris')) {
      examesCol.fields.add(
        new SelectField({
          name: 'modalidade_ris',
          required: false,
          values: ['rx', 'tc', 'ecg', 'us', 'outro'],
          maxSelect: 1,
        }),
      )
    }

    if (!examesCol.fields.getByName('status_ris')) {
      examesCol.fields.add(
        new SelectField({
          name: 'status_ris',
          required: false,
          values: ['solicitado', 'agendado', 'realizado_aguardando_laudo', 'laudado', 'cancelado'],
          maxSelect: 1,
        }),
      )
    }

    if (!examesCol.fields.getByName('tipo_execucao')) {
      examesCol.fields.add(
        new SelectField({
          name: 'tipo_execucao',
          required: false,
          values: ['interno', 'externo'],
          maxSelect: 1,
        }),
      )
    }

    if (!examesCol.fields.getByName('prestador_externo_nome')) {
      examesCol.fields.add(new TextField({ name: 'prestador_externo_nome', required: false }))
    }

    if (!examesCol.fields.getByName('prestador_externo_cnes')) {
      examesCol.fields.add(new TextField({ name: 'prestador_externo_cnes', required: false }))
    }

    if (!examesCol.fields.getByName('prestador_externo_uf')) {
      examesCol.fields.add(new TextField({ name: 'prestador_externo_uf', required: false }))
    }

    if (!examesCol.fields.getByName('rascunho_laudo')) {
      examesCol.fields.add(new TextField({ name: 'rascunho_laudo', required: false }))
    }

    if (!examesCol.fields.getByName('modelo_laudo_id')) {
      examesCol.fields.add(new TextField({ name: 'modelo_laudo_id', required: false }))
    }

    app.save(examesCol)

    examesCol.addIndex('idx_exames_status_ris', false, 'status_ris', '')
    examesCol.addIndex('idx_exames_modalidade_ris', false, 'modalidade_ris', '')
    examesCol.addIndex('idx_exames_tipo_execucao', false, 'tipo_execucao', '')
    app.save(examesCol)

    // -------------------------------------------------------------
    // 2. Coleção `ris_modelos_laudo` (Modelos versionados e inativáveis)
    // -------------------------------------------------------------
    let modelosCol
    try {
      modelosCol = app.findCollectionByNameOrId('ris_modelos_laudo')
    } catch (_) {
      modelosCol = new Collection({
        name: 'ris_modelos_laudo',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        viewRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        deleteRule: null, // Sem exclusão física: apenas inativação lógica
        fields: [
          { name: 'titulo', type: 'text', required: true },
          {
            name: 'modalidade',
            type: 'select',
            required: true,
            values: ['rx', 'tc', 'ecg', 'us', 'outro'],
            maxSelect: 1,
          },
          { name: 'codigo_procedimento', type: 'text', required: false },
          { name: 'procedimento_nome', type: 'text', required: true },
          { name: 'texto_padrao', type: 'text', required: true },
          { name: 'versao', type: 'number', required: true, onlyInt: true },
          { name: 'ativo', type: 'bool', required: false },
          { name: 'modelo_anterior_id', type: 'text', required: false },
          { name: 'motivo_alteracao', type: 'text', required: false },
          { name: 'usuario_autor_id', type: 'text', required: false },
          { name: 'usuario_autor_nome', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ris_modelos_mod ON ris_modelos_laudo (modalidade)',
          'CREATE INDEX idx_ris_modelos_proc ON ris_modelos_laudo (codigo_procedimento)',
          'CREATE INDEX idx_ris_modelos_ativo ON ris_modelos_laudo (ativo)',
        ],
      })
      app.save(modelosCol)
    }

    // -------------------------------------------------------------
    // 3. Coleção `ris_agendas` (Agendamento, conflito e comprovante seguro)
    // -------------------------------------------------------------
    let agendasCol
    try {
      agendasCol = app.findCollectionByNameOrId('ris_agendas')
    } catch (_) {
      agendasCol = new Collection({
        name: 'ris_agendas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: null, // Sem exclusão física: reagendamento e cancelamento auditados
        fields: [
          {
            name: 'exame',
            type: 'relation',
            required: true,
            collectionId: examesColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'paciente',
            type: 'relation',
            required: true,
            collectionId: pacientesColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'unidade_setor',
            type: 'relation',
            required: false,
            collectionId: setoresColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'sala_equipamento', type: 'text', required: true },
          {
            name: 'profissional_responsavel',
            type: 'relation',
            required: false,
            collectionId: profissionaisColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'profissional_nome', type: 'text', required: false },
          { name: 'data_hora_inicio', type: 'text', required: true },
          { name: 'data_hora_fim', type: 'text', required: true },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['agendado', 'confirmado', 'realizado', 'reagendado', 'cancelado'],
            maxSelect: 1,
          },
          { name: 'motivo_cancelamento_reagendamento', type: 'text', required: false },
          { name: 'agenda_anterior_id', type: 'text', required: false },
          { name: 'preparo_orientacoes', type: 'text', required: false },
          { name: 'comprovante_snapshot', type: 'json', required: false },
          { name: 'idempotency_key', type: 'text', required: false },
          { name: 'usuario_autor_id', type: 'text', required: false },
          { name: 'usuario_autor_nome', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ris_agenda_exame ON ris_agendas (exame)',
          'CREATE INDEX idx_ris_agenda_paciente ON ris_agendas (paciente)',
          'CREATE INDEX idx_ris_agenda_horario ON ris_agendas (sala_equipamento, data_hora_inicio, data_hora_fim)',
          'CREATE INDEX idx_ris_agenda_status ON ris_agendas (status)',
          'CREATE INDEX idx_ris_agenda_idemp ON ris_agendas (idempotency_key)',
        ],
      })
      app.save(agendasCol)
    }

    // -------------------------------------------------------------
    // 4. Coleção `ris_historico_transicoes` (Trilha auditável permanente)
    // -------------------------------------------------------------
    let historicoCol
    try {
      historicoCol = app.findCollectionByNameOrId('ris_historico_transicoes')
    } catch (_) {
      historicoCol = new Collection({
        name: 'ris_historico_transicoes',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        viewRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        updateRule: null, // Imutável
        deleteRule: null, // Imutável
        fields: [
          {
            name: 'exame',
            type: 'relation',
            required: true,
            collectionId: examesColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'status_anterior', type: 'text', required: true },
          { name: 'status_novo', type: 'text', required: true },
          { name: 'motivo_justificativa', type: 'text', required: true },
          { name: 'usuario_autor_id', type: 'text', required: true },
          { name: 'usuario_autor_nome', type: 'text', required: true },
          { name: 'usuario_cargo', type: 'text', required: false },
          { name: 'data_hora', type: 'text', required: true },
          { name: 'detalhes', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ris_hist_exame ON ris_historico_transicoes (exame)',
          'CREATE INDEX idx_ris_hist_data ON ris_historico_transicoes (data_hora)',
        ],
      })
      app.save(historicoCol)
    }
  },
  (app) => {
    try {
      const historicoCol = app.findCollectionByNameOrId('ris_historico_transicoes')
      if (historicoCol) app.delete(historicoCol)
    } catch (_) {}

    try {
      const agendasCol = app.findCollectionByNameOrId('ris_agendas')
      if (agendasCol) app.delete(agendasCol)
    } catch (_) {}

    try {
      const modelosCol = app.findCollectionByNameOrId('ris_modelos_laudo')
      if (modelosCol) app.delete(modelosCol)
    } catch (_) {}

    try {
      const examesCol = app.findCollectionByNameOrId('exames')
      if (examesCol) {
        if (examesCol.fields.getByName('modalidade_ris')) {
          examesCol.fields.removeByName('modalidade_ris')
        }
        if (examesCol.fields.getByName('status_ris')) {
          examesCol.fields.removeByName('status_ris')
        }
        if (examesCol.fields.getByName('tipo_execucao')) {
          examesCol.fields.removeByName('tipo_execucao')
        }
        if (examesCol.fields.getByName('prestador_externo_nome')) {
          examesCol.fields.removeByName('prestador_externo_nome')
        }
        if (examesCol.fields.getByName('prestador_externo_cnes')) {
          examesCol.fields.removeByName('prestador_externo_cnes')
        }
        if (examesCol.fields.getByName('prestador_externo_uf')) {
          examesCol.fields.removeByName('prestador_externo_uf')
        }
        if (examesCol.fields.getByName('rascunho_laudo')) {
          examesCol.fields.removeByName('rascunho_laudo')
        }
        if (examesCol.fields.getByName('modelo_laudo_id')) {
          examesCol.fields.removeByName('modelo_laudo_id')
        }
        app.save(examesCol)
      }
    } catch (_) {}
  },
)
