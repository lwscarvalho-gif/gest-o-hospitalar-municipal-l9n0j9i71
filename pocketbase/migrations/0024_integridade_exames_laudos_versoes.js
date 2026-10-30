/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0024: Integridade do Módulo Exames & Laudos
 *
 * 1. Adiciona campos de controle na coleção `exames`:
 *    - `idempotency_key` (text): chave para proteção contra duplo clique / reenvio concorrente
 *    - `versao_atual` (number): número da versão vigente do laudo (inicia em 1 ao liberar)
 *    - `tem_retificacao` (bool): flag indicativa de que o exame possui versões/retificações
 *
 * 2. Cria a coleção `laudos_versoes`:
 *    - Histórico imutável de todas as versões do laudo (versão original + retificações)
 *    - Referência `exame` (relation -> exames, required, cascadeDelete: false)
 *    - Referência `versao_anterior_id` (text): id da versão anterior para rastreabilidade
 *    - `numero_versao` (number, required)
 *    - `resultado_sumario` (text, required)
 *    - `laudo_texto` (text, required)
 *    - `motivo_retificacao` (text, opcional na v1, obrigatório em retificações)
 *    - `responsavel_laudo` (relation -> profissionais, opcional)
 *    - `responsavel_laudo_nome` (text, required)
 *    - `responsavel_laudo_cargo` (text, opcional)
 *    - `data_laudo` (text, required)
 *    - `usuario_id` (text, preenchido pelo backend a partir de @request.auth.id)
 *    - `idempotency_key` (text, opcional)
 *    - Regras de acesso: imutável (updateRule = null, deleteRule = null), consulta restrita a profissionais/gestores/admins
 */
migrate(
  (app) => {
    const examesCol = app.findCollectionByNameOrId('exames')
    const examesColId = examesCol.id
    const profissionaisColId = app.findCollectionByNameOrId('profissionais').id

    // 1. Adiciona novos campos na coleção 'exames' de forma defensiva
    if (!examesCol.fields.getByName('idempotency_key')) {
      examesCol.fields.add(
        new TextField({
          name: 'idempotency_key',
          required: false,
        }),
      )
    }

    if (!examesCol.fields.getByName('versao_atual')) {
      examesCol.fields.add(
        new NumberField({
          name: 'versao_atual',
          required: false,
          onlyInt: true,
        }),
      )
    }

    if (!examesCol.fields.getByName('tem_retificacao')) {
      examesCol.fields.add(
        new BoolField({
          name: 'tem_retificacao',
          required: false,
        }),
      )
    }

    // Salva coleção exames com os novos campos
    app.save(examesCol)

    // Adiciona índice para a idempotency_key de exames
    examesCol.addIndex('idx_exames_idempotency', false, 'idempotency_key', '')
    app.save(examesCol)

    // 2. Criação da coleção `laudos_versoes`
    let laudosVersoesCol
    try {
      laudosVersoesCol = app.findCollectionByNameOrId('laudos_versoes')
    } catch (_) {
      laudosVersoesCol = new Collection({
        name: 'laudos_versoes',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        viewRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        updateRule: null, // Imutável por desenho: nunca sobrescrever histórico
        deleteRule: null, // Imutável por desenho: nunca apagar histórico
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
            name: 'numero_versao',
            type: 'number',
            required: true,
            onlyInt: true,
          },
          {
            name: 'resultado_sumario',
            type: 'text',
            required: true,
          },
          {
            name: 'laudo_texto',
            type: 'text',
            required: true,
          },
          {
            name: 'motivo_retificacao',
            type: 'text',
            required: false,
          },
          {
            name: 'versao_anterior_id',
            type: 'text',
            required: false,
          },
          {
            name: 'responsavel_laudo',
            type: 'relation',
            required: false,
            collectionId: profissionaisColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'responsavel_laudo_nome',
            type: 'text',
            required: true,
          },
          {
            name: 'responsavel_laudo_cargo',
            type: 'text',
            required: false,
          },
          {
            name: 'data_laudo',
            type: 'text',
            required: true,
          },
          {
            name: 'usuario_id',
            type: 'text',
            required: false,
          },
          {
            name: 'idempotency_key',
            type: 'text',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_laudos_vers_exame ON laudos_versoes (exame)',
          'CREATE INDEX idx_laudos_vers_numero ON laudos_versoes (exame, numero_versao)',
          'CREATE INDEX idx_laudos_vers_idemp ON laudos_versoes (idempotency_key)',
        ],
      })
      app.save(laudosVersoesCol)
    }

    // 3. Backfill seguro e idempotente de exames já liberados (v1 no histórico de versões)
    try {
      const examesLiberados = app.findRecordsByFilter(
        'exames',
        "status = 'liberado' && resultado_sumario != ''",
        'created',
        100,
        0,
      )

      for (const ex of examesLiberados) {
        // Verifica se já existe versão para este exame
        const versoesExistentes = app.findRecordsByFilter(
          'laudos_versoes',
          'exame = {:exId}',
          'numero_versao',
          1,
          0,
          { exId: ex.id },
        )

        if (versoesExistentes.length === 0) {
          const v1 = new Record(laudosVersoesCol)
          v1.set('exame', ex.id)
          v1.set('numero_versao', 1)
          v1.set('resultado_sumario', ex.getString('resultado_sumario') || 'Concluído')
          v1.set('laudo_texto', ex.getString('laudo_texto') || 'Laudo original arquivado.')
          v1.set('responsavel_laudo', ex.getString('responsavel_laudo'))
          v1.set(
            'responsavel_laudo_nome',
            ex.getString('responsavel_laudo_nome') || 'Profissional Responsável',
          )
          v1.set('data_laudo', ex.getString('data_laudo') || ex.getString('created'))
          v1.set('motivo_retificacao', 'Versão inicial emitida')
          app.save(v1)

          ex.set('versao_atual', 1)
          ex.set('tem_retificacao', false)
          app.save(ex)
        }
      }
    } catch (backfillErr) {
      console.log('Aviso no backfill de laudos já liberados:', backfillErr)
    }
  },
  (app) => {
    try {
      const laudosVersoesCol = app.findCollectionByNameOrId('laudos_versoes')
      if (laudosVersoesCol) {
        app.delete(laudosVersoesCol)
      }
    } catch (_) {}

    try {
      const examesCol = app.findCollectionByNameOrId('exames')
      if (examesCol) {
        if (examesCol.fields.getByName('idempotency_key')) {
          examesCol.fields.removeByName('idempotency_key')
        }
        if (examesCol.fields.getByName('versao_atual')) {
          examesCol.fields.removeByName('versao_atual')
        }
        if (examesCol.fields.getByName('tem_retificacao')) {
          examesCol.fields.removeByName('tem_retificacao')
        }
        app.save(examesCol)
      }
    } catch (_) {}
  },
)
