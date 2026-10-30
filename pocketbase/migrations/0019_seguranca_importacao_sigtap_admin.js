/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Restringir escrita na coleção 'procedimentos_sigtap' exclusivamente a admin e gestor
    try {
      const colSigtap = app.findCollectionByNameOrId('procedimentos_sigtap')
      if (colSigtap) {
        colSigtap.listRule = "@request.auth.id != ''"
        colSigtap.viewRule = "@request.auth.id != ''"
        colSigtap.createRule =
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')"
        colSigtap.updateRule =
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')"
        colSigtap.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
        app.save(colSigtap)
      }
    } catch (err) {
      console.error('Erro ao ajustar regras de procedimentos_sigtap:', err)
    }

    // 2. Restringir também escrita na coleção 'competencias_faturamento' a admin e gestor
    try {
      const colComp = app.findCollectionByNameOrId('competencias_faturamento')
      if (colComp) {
        colComp.listRule = "@request.auth.id != ''"
        colComp.viewRule = "@request.auth.id != ''"
        colComp.createRule =
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')"
        colComp.updateRule =
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')"
        colComp.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
        app.save(colComp)
      }
    } catch (err) {
      console.error('Erro ao ajustar regras de competencias_faturamento:', err)
    }

    // 3. Restringir tabela de apoio CID-10
    try {
      const colCid = app.findCollectionByNameOrId('cid10')
      if (colCid) {
        colCid.listRule = "@request.auth.id != ''"
        colCid.viewRule = "@request.auth.id != ''"
        colCid.createRule =
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')"
        colCid.updateRule =
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')"
        colCid.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
        app.save(colCid)
      }
    } catch (err) {
      console.error('Erro ao ajustar regras de cid10:', err)
    }
  },
  (app) => {
    try {
      const colSigtap = app.findCollectionByNameOrId('procedimentos_sigtap')
      if (colSigtap) {
        colSigtap.createRule = "@request.auth.id != ''"
        colSigtap.updateRule = "@request.auth.id != ''"
        colSigtap.deleteRule = "@request.auth.id != ''"
        app.save(colSigtap)
      }
    } catch {}
  },
)
