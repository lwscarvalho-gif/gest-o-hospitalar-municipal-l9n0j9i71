/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const admCol = app.findCollectionByNameOrId('administracao_medicamentos')

    // 1. Campo de idempotência persistente para evitar duplicidades por duplo clique/reenvio
    if (!admCol.fields.getByName('idempotency_key')) {
      admCol.fields.add(
        new TextField({
          name: 'idempotency_key',
          required: false,
        }),
      )
    }

    // 2. Rastreabilidade de correções / retificações históricas
    if (!admCol.fields.getByName('tipo_registro')) {
      admCol.fields.add(
        new SelectField({
          name: 'tipo_registro',
          required: false,
          values: ['ato_original', 'retificacao', 'anotacao_complementar'],
          maxSelect: 1,
        }),
      )
    }

    if (!admCol.fields.getByName('registro_original')) {
      admCol.fields.add(
        new RelationField({
          name: 'registro_original',
          collectionId: admCol.id,
          maxSelect: 1,
          required: false,
          cascadeDelete: false,
        }),
      )
    }

    if (!admCol.fields.getByName('motivo_correcao')) {
      admCol.fields.add(
        new TextField({
          name: 'motivo_correcao',
          required: false,
        }),
      )
    }

    if (!admCol.fields.getByName('usuario_id')) {
      admCol.fields.add(
        new TextField({
          name: 'usuario_id',
          required: false,
        }),
      )
    }

    // 3. Regras de imutabilidade clínica dos atos de administração anteriores
    // Registros não podem ser apagados e atualizações diretas são bloqueadas
    admCol.deleteRule = null // Ninguém apaga registros históricos de medicação
    admCol.updateRule = null // Imutável diretamente; correções via retificação rastreável

    // Adiciona índices com addIndex
    admCol.addIndex('idx_adm_idempotency', false, 'idempotency_key', '')
    admCol.addIndex('idx_adm_original', false, 'registro_original', '')

    app.save(admCol)
  },
  (app) => {
    try {
      const admCol = app.findCollectionByNameOrId('administracao_medicamentos')
      admCol.removeIndex('idx_adm_idempotency')
      admCol.removeIndex('idx_adm_original')
      app.save(admCol)
    } catch (_) {}
  },
)
