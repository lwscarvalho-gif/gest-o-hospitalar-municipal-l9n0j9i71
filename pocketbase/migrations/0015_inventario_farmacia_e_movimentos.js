/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Adicionar campos em farmacia_itens (localizacao_farmacia)
    const farmItens = app.findCollectionByNameOrId('farmacia_itens')
    if (!farmItens.fields.getByName('localizacao_farmacia')) {
      farmItens.fields.add(new TextField({ name: 'localizacao_farmacia' }))
      app.save(farmItens)
    }

    // 2. Adicionar campos de idempotência e auditoria em farmacia_dispensacoes
    const farmDisp = app.findCollectionByNameOrId('farmacia_dispensacoes')
    if (!farmDisp.fields.getByName('idempotency_key')) {
      farmDisp.fields.add(new TextField({ name: 'idempotency_key' }))
      app.save(farmDisp)
    }

    // Garantir índice de idempotency_key na coleção farmacia_dispensacoes
    try {
      farmDisp.addIndex('idx_disp_idempotency', false, 'idempotency_key', '')
      app.save(farmDisp)
    } catch (err) {
      console.log('Índice idx_disp_idempotency:', err)
    }

    // 3. Criar coleção farmacia_inventarios
    // Estados: em_andamento | cancelado | concluido | rejeitado_concorrencia
    let inventariosCol
    try {
      inventariosCol = app.findCollectionByNameOrId('farmacia_inventarios')
    } catch (_) {
      inventariosCol = new Collection({
        name: 'farmacia_inventarios',
        type: 'base',
        // Apenas admin/gestor/profissional visualiza; apenas admin/gestor cria e fecha
        listRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        viewRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        fields: [
          { name: 'codigo_inventario', type: 'text', required: true },
          { name: 'titulo', type: 'text', required: true },
          {
            name: 'status',
            type: 'select',
            values: ['em_andamento', 'cancelado', 'concluido', 'rejeitado_concorrencia'],
            maxSelect: 1,
            required: true,
          },
          { name: 'data_abertura', type: 'text', required: true },
          { name: 'responsavel_abertura', type: 'text', required: true },
          { name: 'data_fechamento', type: 'text' },
          { name: 'responsavel_fechamento', type: 'text' },
          { name: 'justificativa_fechamento', type: 'text' },
          { name: 'total_itens_inventariados', type: 'number', min: 0 },
          { name: 'total_divergencias', type: 'number', min: 0 },
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_inv_codigo ON farmacia_inventarios (codigo_inventario)',
          'CREATE INDEX idx_inv_status ON farmacia_inventarios (status)',
          'CREATE INDEX idx_inv_data ON farmacia_inventarios (data_abertura)',
        ],
      })
      app.save(inventariosCol)
    }

    const inventariosColId = app.findCollectionByNameOrId('farmacia_inventarios').id
    const itensColId = app.findCollectionByNameOrId('farmacia_itens').id

    // 4. Criar coleção farmacia_inventario_itens
    // Contagem por item/lote/validade/local com snapshot do estoque base
    try {
      app.findCollectionByNameOrId('farmacia_inventario_itens')
    } catch (_) {
      const invItensCol = new Collection({
        name: 'farmacia_inventario_itens',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        viewRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        fields: [
          {
            name: 'inventario',
            type: 'relation',
            required: true,
            collectionId: inventariosColId,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'item',
            type: 'relation',
            required: true,
            collectionId: itensColId,
            maxSelect: 1,
          },
          { name: 'item_nome', type: 'text', required: true },
          { name: 'lote', type: 'text' },
          { name: 'validade', type: 'text' },
          { name: 'local_armazenamento', type: 'text' },
          { name: 'quantidade_sistema_base', type: 'number', required: true },
          { name: 'quantidade_contada', type: 'number' },
          { name: 'divergencia', type: 'number' }, // contada - base
          {
            name: 'status_conferencia',
            type: 'select',
            values: ['pendente', 'contado', 'divergente', 'reconciliado', 'ajustado'],
            maxSelect: 1,
            required: true,
          },
          { name: 'responsavel_contagem', type: 'text' },
          { name: 'data_hora_contagem', type: 'text' },
          { name: 'justificativa_ajuste', type: 'text' },
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_inv_item_parent ON farmacia_inventario_itens (inventario)',
          'CREATE INDEX idx_inv_item_ref ON farmacia_inventario_itens (item)',
          'CREATE INDEX idx_inv_item_status ON farmacia_inventario_itens (status_conferencia)',
        ],
      })
      app.save(invItensCol)
    }

    // 5. Criar coleção farmacia_movimentos_estoque
    // Registra movimentos formais: entrada, ajuste_inventario_sobra, ajuste_inventario_falta,
    // perda_validade, perda_avaria, sem apagar histórico
    try {
      app.findCollectionByNameOrId('farmacia_movimentos_estoque')
    } catch (_) {
      const movimentosCol = new Collection({
        name: 'farmacia_movimentos_estoque',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        viewRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        deleteRule: null, // histórico de movimento é estritamente imutável
        fields: [
          {
            name: 'item',
            type: 'relation',
            required: true,
            collectionId: itensColId,
            maxSelect: 1,
          },
          { name: 'item_nome', type: 'text', required: true },
          {
            name: 'tipo_movimento',
            type: 'select',
            values: [
              'entrada_nota',
              'ajuste_inventario_sobra',
              'ajuste_inventario_falta',
              'perda_validade',
              'perda_avaria',
              'devolucao_paciente',
            ],
            maxSelect: 1,
            required: true,
          },
          { name: 'quantidade', type: 'number', required: true },
          { name: 'estoque_anterior', type: 'number', required: true },
          { name: 'estoque_posterior', type: 'number', required: true },
          { name: 'lote', type: 'text' },
          { name: 'validade', type: 'text' },
          { name: 'local_armazenamento', type: 'text' },
          { name: 'justificativa', type: 'text', required: true },
          { name: 'responsavel_nome', type: 'text', required: true },
          { name: 'responsavel_id', type: 'text' },
          { name: 'data_hora', type: 'text', required: true },
          {
            name: 'inventario_origem',
            type: 'relation',
            collectionId: inventariosColId,
            maxSelect: 1,
          },
          { name: 'documento_ref', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mov_item ON farmacia_movimentos_estoque (item)',
          'CREATE INDEX idx_mov_tipo ON farmacia_movimentos_estoque (tipo_movimento)',
          'CREATE INDEX idx_mov_data ON farmacia_movimentos_estoque (data_hora)',
          'CREATE INDEX idx_mov_inv ON farmacia_movimentos_estoque (inventario_origem)',
        ],
      })
      app.save(movimentosCol)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('farmacia_movimentos_estoque'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('farmacia_inventario_itens'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('farmacia_inventarios'))
    } catch (_) {}
  },
)
