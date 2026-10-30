/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0035: Ficha de Composição Operacional de Refeições/Dietas e Baixa Integrada ao Estoque
 * Conforme Requisito 7.4.3.5.c.i (página 23 do PDF detalhado persistido)
 */

migrate(
  (app) => {
    const distribuicoesCol = app.findCollectionByNameOrId('snd_distribuicoes_refeicoes')
    const distribuicoesColId = distribuicoesCol.id

    const dietasCol = app.findCollectionByNameOrId('snd_dietas_catalogo')
    const dietasColId = dietasCol.id

    let setoresColId = null
    try {
      setoresColId = app.findCollectionByNameOrId('setores').id
    } catch (_) {}

    // ------------------------------------------------------------------------
    // 1. Coleção `snd_composicoes_refeicoes` (Fichas de Composição Operacional Versionadas)
    // ------------------------------------------------------------------------
    let composicoesCol
    try {
      composicoesCol = app.findCollectionByNameOrId('snd_composicoes_refeicoes')
    } catch (_) {
      composicoesCol = new Collection({
        name: 'snd_composicoes_refeicoes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        deleteRule: null, // Sem exclusão física: versionamento e inativação lógica
        fields: [
          { name: 'codigo', type: 'text', required: true },
          { name: 'refeicao_codigo', type: 'text', required: true }, // ex: desjejum, almoco, jantar, colacao, ceia
          {
            name: 'dieta_catalogo_ref',
            type: 'relation',
            required: false,
            collectionId: dietasColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'dieta_codigo', type: 'text', required: false }, // codigo textual da dieta ou "todas"
          { name: 'descricao', type: 'text', required: false },
          { name: 'versao', type: 'number', required: true, onlyInt: true },
          { name: 'ativo', type: 'bool', required: false },
          { name: 'versao_anterior_id', type: 'text', required: false },
          { name: 'motivo_alteracao', type: 'text', required: false },
          // Itens da receita/composição em formato JSON estruturado:
          // Array de: {
          //   item_estoque_id: string,
          //   item_nome: string,
          //   unidade_consumo: string,
          //   quantidade_consumo: number,
          //   unidade_estoque: string,
          //   fator_conversao: number, // 1 se mesma unidade; se gramas->kg = 0.001; explicitamente cadastrado e validado
          //   quantidade_baixa_estoque: number // quantidade_consumo * fator_conversao
          // }
          { name: 'itens_composicao', type: 'json', required: true },
          { name: 'autor_id', type: 'text', required: false },
          { name: 'autor_nome', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [],
      })
      app.save(composicoesCol)
    }

    // ------------------------------------------------------------------------
    // 2. Coleção `snd_baixas_estoque_distribuicoes` (Eventos de Baixa Vinculados)
    // ------------------------------------------------------------------------
    let baixasCol
    try {
      baixasCol = app.findCollectionByNameOrId('snd_baixas_estoque_distribuicoes')
    } catch (_) {
      const fields = [
        {
          name: 'distribuicao_ref',
          type: 'relation',
          required: true,
          collectionId: distribuicoesColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'composicao_ref_id', type: 'text', required: false },
        { name: 'composicao_codigo_snapshot', type: 'text', required: true },
        { name: 'composicao_versao_snapshot', type: 'number', required: true, onlyInt: true },
        { name: 'snapshot_itens_consumidos', type: 'json', required: true }, // itens congelados com lote, validade, quantidades e saldos
        { name: 'ponto_estoque', type: 'text', required: true }, // ex: "SND - Almoxarifado de Nutrição" ou setor
      ]

      if (setoresColId) {
        fields.push({
          name: 'setor_ref',
          type: 'relation',
          required: false,
          collectionId: setoresColId,
          cascadeDelete: false,
          maxSelect: 1,
        })
      }

      fields.push(
        { name: 'data_hora_baixa_utc', type: 'text', required: true },
        { name: 'movimentos_estoque_ids', type: 'json', required: false }, // array de IDs de farmacia_movimentos_estoque gerados
        { name: 'estornado', type: 'bool', required: false }, // true se foi compensado
        { name: 'estorno_motivo', type: 'text', required: false },
        { name: 'estorno_autor_id', type: 'text', required: false },
        { name: 'estorno_autor_nome', type: 'text', required: false },
        { name: 'estorno_data_utc', type: 'text', required: false },
        { name: 'estorno_movimentos_ids', type: 'json', required: false }, // IDs dos movimentos compensatórios
        { name: 'autor_id', type: 'text', required: true },
        { name: 'autor_nome', type: 'text', required: true },
        { name: 'idempotency_key', type: 'text', required: true },
        { name: 'hash_payload', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      )

      baixasCol = new Collection({
        name: 'snd_baixas_estoque_distribuicoes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: null, // Sem exclusão física: imutável e auditável
        fields: fields,
        indexes: [],
      })
      app.save(baixasCol)
    }
  },
  (app) => {
    try {
      const baixasCol = app.findCollectionByNameOrId('snd_baixas_estoque_distribuicoes')
      if (baixasCol) app.delete(baixasCol)
    } catch (_) {}

    try {
      const composicoesCol = app.findCollectionByNameOrId('snd_composicoes_refeicoes')
      if (composicoesCol) app.delete(composicoesCol)
    } catch (_) {}
  },
)
