/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0025: Integridade, Imutabilidade, Snapshots e Retificação de Impressos Assistenciais
 *
 * 1. Evolução da coleção `impressos_assistenciais`:
 *    - Adiciona snapshot de paciente (campos congelados no ato da emissão para reprodução fiel na reimpressão pelo SAME):
 *      `paciente_nome_snapshot`, `paciente_cpf_snapshot`, `paciente_cns_snapshot`,
 *      `paciente_nascimento_snapshot`, `paciente_sexo_snapshot`, `paciente_alergias_snapshot`
 *    - Adiciona suporte formal a Retificação Rastreável:
 *      `tipo_registro` (select: 'ato_original', 'retificacao'),
 *      `documento_original` (relation -> impressos_assistenciais, cascadeDelete: false),
 *      `motivo_retificacao` (text),
 *      `numero_retificacao` (number)
 *    - Adiciona campos de auditoria e autor:
 *      `usuario_emissor_id` (text, derivado da sessão),
 *      `idempotency_key` (text)
 *    - Estabelece Imutabilidade Estrita:
 *      `updateRule = null` (documentos clínicos não podem sofrer UPDATE direto no banco; retificações geram novo registro)
 *      `deleteRule = null` (documentos clínicos emitidos não podem ser excluídos do histórico)
 *      `createRule` preserva o controle: apenas profissional, gestor e admin podem emitir
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('impressos_assistenciais')

    // 1. Campos de Snapshot do Paciente no Momento da Emissão
    if (!col.fields.getByName('paciente_nome_snapshot')) {
      col.fields.add(new TextField({ name: 'paciente_nome_snapshot', required: false }))
    }
    if (!col.fields.getByName('paciente_cpf_snapshot')) {
      col.fields.add(new TextField({ name: 'paciente_cpf_snapshot', required: false }))
    }
    if (!col.fields.getByName('paciente_cns_snapshot')) {
      col.fields.add(new TextField({ name: 'paciente_cns_snapshot', required: false }))
    }
    if (!col.fields.getByName('paciente_nascimento_snapshot')) {
      col.fields.add(new TextField({ name: 'paciente_nascimento_snapshot', required: false }))
    }
    if (!col.fields.getByName('paciente_sexo_snapshot')) {
      col.fields.add(new TextField({ name: 'paciente_sexo_snapshot', required: false }))
    }
    if (!col.fields.getByName('paciente_alergias_snapshot')) {
      col.fields.add(new TextField({ name: 'paciente_alergias_snapshot', required: false }))
    }

    // 2. Campos de Retificação e Rastreabilidade Histórica
    if (!col.fields.getByName('tipo_registro')) {
      col.fields.add(
        new SelectField({
          name: 'tipo_registro',
          required: false,
          values: ['ato_original', 'retificacao'],
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('documento_original')) {
      col.fields.add(
        new RelationField({
          name: 'documento_original',
          collectionId: col.id,
          maxSelect: 1,
          required: false,
          cascadeDelete: false,
        }),
      )
    }

    if (!col.fields.getByName('motivo_retificacao')) {
      col.fields.add(new TextField({ name: 'motivo_retificacao', required: false }))
    }

    if (!col.fields.getByName('numero_retificacao')) {
      col.fields.add(
        new NumberField({ name: 'numero_retificacao', required: false, onlyInt: true }),
      )
    }

    if (!col.fields.getByName('usuario_emissor_id')) {
      col.fields.add(new TextField({ name: 'usuario_emissor_id', required: false }))
    }

    if (!col.fields.getByName('idempotency_key')) {
      col.fields.add(new TextField({ name: 'idempotency_key', required: false }))
    }

    // 3. Imutabilidade Rígida: Proibição de UPDATE e DELETE direto no banco
    col.updateRule = null
    col.deleteRule = null
    col.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')"
    col.listRule = "@request.auth.id != '' && @request.auth.role != 'recepcao'"
    col.viewRule = "@request.auth.id != '' && @request.auth.role != 'recepcao'"

    // Índices de integridade e busca
    col.addIndex('idx_imp_doc_original', false, 'documento_original', '')
    col.addIndex('idx_imp_idempotency', false, 'idempotency_key', '')

    app.save(col)

    // Backfill seguro de registros legados: preenche tipo_registro = 'ato_original' se vazio
    try {
      const legados = app.findRecordsByFilter(
        'impressos_assistenciais',
        "tipo_registro = '' || tipo_registro = null",
        'created',
        100,
        0,
      )
      for (const rec of legados) {
        rec.set('tipo_registro', 'ato_original')
        app.save(rec)
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('impressos_assistenciais')
      if (col) {
        col.removeIndex('idx_imp_doc_original')
        col.removeIndex('idx_imp_idempotency')
        app.save(col)
      }
    } catch (_) {}
  },
)
