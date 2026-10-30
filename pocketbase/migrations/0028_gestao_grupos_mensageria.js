/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0028: Refinamento de Regras e Gestão de Grupos de Mensageria
 *
 * Atualiza canais_grupos_mensageria para permitir que usuários autenticados
 * visualizem e listem grupos para administração caso sejam gestores/admin ou criadores,
 * mantendo a listagem pública restrita a grupos ativos para envio, e bloqueando deleção física.
 */
migrate(
  (app) => {
    try {
      const gruposCol = app.findCollectionByNameOrId('canais_grupos_mensageria')

      // Usuários autenticados podem listar:
      // 1. Grupos ativos (para envio/consulta geral); OU
      // 2. Qualquer grupo (inclusive inativo) se o usuário for admin ou gestor, ou for o criador do grupo
      gruposCol.listRule =
        "@request.auth.id != '' && (ativo = true || @request.auth.role = 'admin' || @request.auth.role = 'gestor' || criado_por = @request.auth.id)"

      // Visualização individual: qualquer usuário autenticado
      gruposCol.viewRule = "@request.auth.id != ''"

      // Criação: admin, gestor ou usuário com papel de gestão
      gruposCol.createRule =
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')"

      // Atualização (renomear, inativar, alterar membros): admin, gestor ou o próprio criador do grupo
      gruposCol.updateRule =
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || criado_por = @request.auth.id)"

      // Deleção física expressamente proibida (inativação lógica obrigatória)
      gruposCol.deleteRule = null

      app.save(gruposCol)
    } catch (e) {
      console.log('Aviso ao ajustar regras de canais_grupos_mensageria:', e)
    }
  },
  (app) => {
    try {
      const gruposCol = app.findCollectionByNameOrId('canais_grupos_mensageria')
      gruposCol.listRule = "@request.auth.id != '' && ativo = true"
      gruposCol.createRule =
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')"
      gruposCol.updateRule =
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')"
      gruposCol.deleteRule = null
      app.save(gruposCol)
    } catch (_) {}
  },
)
