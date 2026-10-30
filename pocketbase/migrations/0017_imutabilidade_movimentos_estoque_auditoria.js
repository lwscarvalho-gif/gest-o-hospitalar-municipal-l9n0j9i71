/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. farmacia_movimentos_estoque:
    // Imutabilidade estrita: histórico de movimentação não pode ser atualizado nem apagado por ninguém via API.
    try {
      const movCol = app.findCollectionByNameOrId('farmacia_movimentos_estoque')
      if (movCol) {
        movCol.updateRule = null // imutável: bloqueia UPDATE via API
        movCol.deleteRule = null // imutável: bloqueia DELETE via API
        app.save(movCol)
      }
    } catch (err) {
      console.log('Aviso ao ajustar regras de farmacia_movimentos_estoque:', err)
    }

    // 2. auditoria:
    // Imutabilidade estrita já estabelecida na migração 0014 (updateRule = null, deleteRule = null).
    // Reafirmamos para garantir integridade permanente contra qualquer alteração acidental.
    try {
      const audCol = app.findCollectionByNameOrId('auditoria')
      if (audCol) {
        audCol.updateRule = null // imutável
        audCol.deleteRule = null // imutável
        app.save(audCol)
      }
    } catch (err) {
      console.log('Aviso ao ajustar regras de auditoria:', err)
    }
  },
  (app) => {
    try {
      const movCol = app.findCollectionByNameOrId('farmacia_movimentos_estoque')
      if (movCol) {
        movCol.updateRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
        movCol.deleteRule = null
        app.save(movCol)
      }
    } catch (_) {}
  },
)
