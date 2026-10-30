/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0036: Blindagem de Integridade e Bloqueio de Bypass SND / RIS
 * Missão Codex:
 * (1) Bloqueio absoluto de escrita direta por API de coleção em `snd_baixas_estoque_distribuicoes` e `ris_entregas_laudos`
 *     (createRule = null, updateRule = null, deleteRule = null), forçando passagem exclusiva
 *     pelos endpoints transacionais server-side com validação de sessão e consistência.
 * (2) Bloqueio de exclusão em `snd_distribuicoes_refeicoes` (deleteRule = null) e restrição de update/create.
 * (3) Imutabilidade de histórico e recibos: previne falsificação de versão, paciente e autor.
 */

migrate(
  (app) => {
    // 1. snd_baixas_estoque_distribuicoes: Imutável e proibida escrita direta via API cliente
    try {
      const baixasCol = app.findCollectionByNameOrId('snd_baixas_estoque_distribuicoes')
      if (baixasCol) {
        baixasCol.createRule = null // Somente backend transacional (runInTransaction) pode criar
        baixasCol.updateRule = null // Somente backend transacional (estorno) pode atualizar
        baixasCol.deleteRule = null // Exclusão física proibida
        app.save(baixasCol)
      }
    } catch (err) {
      console.log('Aviso ao ajustar regras de snd_baixas_estoque_distribuicoes:', err)
    }

    // 2. ris_entregas_laudos: Imutável e proibida escrita direta via API cliente
    try {
      const entregasCol = app.findCollectionByNameOrId('ris_entregas_laudos')
      if (entregasCol) {
        entregasCol.createRule = null // Somente endpoint /backend/v1/ris/entregas pode criar com autor da sessão
        entregasCol.updateRule = null // Registro imutável de recibo
        entregasCol.deleteRule = null // Exclusão de recibo/protocolo proibida
        app.save(entregasCol)
      }
    } catch (err) {
      console.log('Aviso ao ajustar regras de ris_entregas_laudos:', err)
    }

    // 3. snd_distribuicoes_refeicoes: Bloqueio de deleção e garantia de regras estritas
    try {
      const distCol = app.findCollectionByNameOrId('snd_distribuicoes_refeicoes')
      if (distCol) {
        distCol.deleteRule = null // Exclusão física de distribuição é proibida
        // Criação e atualização direta só permitidas para não-'distribuido' (validado no hook onRecordCreate/Update)
        distCol.listRule = "@request.auth.id != ''"
        distCol.viewRule = "@request.auth.id != ''"
        app.save(distCol)
      }
    } catch (err) {
      console.log('Aviso ao ajustar regras de snd_distribuicoes_refeicoes:', err)
    }

    // 4. laudos_versoes: Assegurar createRule restrito e update/delete nulos
    try {
      const laudosCol = app.findCollectionByNameOrId('laudos_versoes')
      if (laudosCol) {
        laudosCol.updateRule = null
        laudosCol.deleteRule = null
        app.save(laudosCol)
      }
    } catch (err) {
      console.log('Aviso ao verificar regras de laudos_versoes:', err)
    }
  },
  (app) => {
    try {
      const baixasCol = app.findCollectionByNameOrId('snd_baixas_estoque_distribuicoes')
      if (baixasCol) {
        baixasCol.createRule = "@request.auth.id != ''"
        baixasCol.updateRule = "@request.auth.id != ''"
        app.save(baixasCol)
      }
    } catch (_) {}

    try {
      const entregasCol = app.findCollectionByNameOrId('ris_entregas_laudos')
      if (entregasCol) {
        entregasCol.createRule =
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional' || @request.auth.role = 'recepcao')"
        app.save(entregasCol)
      }
    } catch (_) {}
  },
)
