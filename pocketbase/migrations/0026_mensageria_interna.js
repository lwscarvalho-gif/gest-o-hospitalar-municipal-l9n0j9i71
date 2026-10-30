/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0026: Mensageria Interna Hospitalar entre Usuários e Grupos (Parte 1: Backend)
 *
 * Criação das coleções de mensageria interna do próprio sistema hospitalar:
 * 1. `canais_grupos_mensageria`
 *    - Grupos e equipes funcionais internas (ex: Plantão Médico, Enfermagem PA, Recepção, Regulação, Farmácia).
 *    - `nome`, `sigla`, `descricao`, `ativo`, `membros` (relation multi para users), `criado_por` (relation para users).
 *    - Acesso: autenticados podem listar/ver grupos ativos. Criação/edição restrita a admin/gestor.
 *
 * 2. `mensagens_internas`
 *    - Registro imutável de mensagem interna com snapshot congelado de participantes.
 *    - `remetente` (relation -> _pb_users_auth_): autor estrito derivado da sessão (@request.auth.id).
 *    - `remetente_nome_snapshot`: nome do remetente no envio.
 *    - `tipo_destinatario`: 'usuario' | 'grupo'.
 *    - `destinatario_usuario`: relation -> _pb_users_auth_ (quando individual).
 *    - `destinatario_grupo`: relation -> canais_grupos_mensageria (quando grupo).
 *    - `destinatarios_resolvidos_ids`: json (array de user ids congelados no envio).
 *    - `destinatarios_snapshot`: json (array de { id, nome, cargo }).
 *    - `assunto`: texto curto (min 1, max 160).
 *    - `conteudo`: texto seguro sanitizado (min 1, max 4000).
 *    - `lida_por`: json (array de user ids que marcaram como lida).
 *    - `idempotency_key`: texto único para evitar duplicidades em falha de rede / duplo clique.
 *    - Regras RLS estritas:
 *      - listRule / viewRule: apenas remetente ou destinatário autorizado (@request.auth.id = remetente || destinatarios_resolvidos_ids ~ @request.auth.id).
 *      - createRule: apenas autenticado (@request.auth.id != '').
 *      - updateRule: apenas autenticado cujo id está nos destinatários autorizados (exclusivamente para marcar leitura, protegido no hook contra alteração de conteúdo ou remetente).
 *      - deleteRule: null (mensagens hospitalares não são excluídas arbitrariamente por clientes).
 */
migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'

    // 1. Coleção canais_grupos_mensageria
    let gruposCol
    try {
      gruposCol = app.findCollectionByNameOrId('canais_grupos_mensageria')
    } catch (_) {
      gruposCol = new Collection({
        name: 'canais_grupos_mensageria',
        type: 'base',
        listRule: "@request.auth.id != '' && ativo = true",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')",
        deleteRule: null,
        fields: [
          { name: 'nome', type: 'text', required: true, min: 2, max: 120 },
          { name: 'sigla', type: 'text', required: false, max: 20 },
          { name: 'descricao', type: 'text', required: false, max: 500 },
          { name: 'ativo', type: 'bool' },
          {
            name: 'membros',
            type: 'relation',
            collectionId: usersColId,
            required: false,
            maxSelect: 100,
            cascadeDelete: false,
          },
          {
            name: 'criado_por',
            type: 'relation',
            collectionId: usersColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_cgm_ativo ON canais_grupos_mensageria (ativo)'],
      })
      app.save(gruposCol)
    }

    const gruposColId = app.findCollectionByNameOrId('canais_grupos_mensageria').id

    // 2. Coleção mensagens_internas
    let mensagensCol
    try {
      mensagensCol = app.findCollectionByNameOrId('mensagens_internas')
    } catch (_) {
      mensagensCol = new Collection({
        name: 'mensagens_internas',
        type: 'base',
        // listRule e viewRule: só remetente ou usuário cujo ID consta na lista de destinatários resolvidos
        listRule:
          "@request.auth.id != '' && (remetente = @request.auth.id || destinatarios_resolvidos_ids ~ @request.auth.id)",
        viewRule:
          "@request.auth.id != '' && (remetente = @request.auth.id || destinatarios_resolvidos_ids ~ @request.auth.id)",
        createRule: "@request.auth.id != ''",
        // updateRule: apenas destinatário autorizado pode atualizar (marcar como lida). Hook impede qualquer outra alteração.
        updateRule: "@request.auth.id != '' && destinatarios_resolvidos_ids ~ @request.auth.id",
        deleteRule: null,
        fields: [
          {
            name: 'remetente',
            type: 'relation',
            collectionId: usersColId,
            required: true,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'remetente_nome_snapshot', type: 'text', required: false, max: 150 },
          {
            name: 'tipo_destinatario',
            type: 'select',
            values: ['usuario', 'grupo'],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'destinatario_usuario',
            type: 'relation',
            collectionId: usersColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'destinatario_grupo',
            type: 'relation',
            collectionId: gruposColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'destinatarios_resolvidos_ids', type: 'json' },
          { name: 'destinatarios_snapshot', type: 'json' },
          { name: 'assunto', type: 'text', required: true, min: 1, max: 160 },
          { name: 'conteudo', type: 'text', required: true, min: 1, max: 4000 },
          { name: 'lida_por', type: 'json' },
          { name: 'idempotency_key', type: 'text', required: false, max: 100 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_msg_remetente_created ON mensagens_internas (remetente, created DESC)',
          'CREATE INDEX idx_msg_idempotency ON mensagens_internas (idempotency_key)',
          'CREATE INDEX idx_msg_tipo_dest ON mensagens_internas (tipo_destinatario, created DESC)',
        ],
      })
      app.save(mensagensCol)
    }
  },
  (app) => {
    try {
      const msg = app.findCollectionByNameOrId('mensagens_internas')
      if (msg) app.delete(msg)
    } catch (_) {}
    try {
      const grupos = app.findCollectionByNameOrId('canais_grupos_mensageria')
      if (grupos) app.delete(grupos)
    } catch (_) {}
  },
)
