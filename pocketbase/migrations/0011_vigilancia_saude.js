migrate(
  (app) => {
    const pacientesColId = app.findCollectionByNameOrId('pacientes').id
    const profissionaisColId = app.findCollectionByNameOrId('profissionais').id

    // Coleção notificacoes_vigilancia (Vigilância em Saúde - Controle Interno)
    // Regras de RLS:
    // Leitura (list/view): todos os usuários autenticados (admin, gestor, profissional, recepcao)
    // Escrita (create/update): restrito no backend a admin, gestor ou profissional (recepção bloqueada)
    // Exclusão: restrito a admin
    const escritaRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')"
    const deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"

    const notificacoes = new Collection({
      name: 'notificacoes_vigilancia',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: escritaRule,
      updateRule: escritaRule,
      deleteRule: deleteRule,
      fields: [
        {
          name: 'numero_notificacao',
          type: 'text',
          required: true,
        },
        {
          name: 'tipo_vigilancia',
          type: 'select',
          values: ['epidemiologica', 'sanitaria', 'saude_trabalhador'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'paciente',
          type: 'relation',
          required: true,
          collectionId: pacientesColId,
          maxSelect: 1,
        },
        { name: 'paciente_nome', type: 'text', required: true },
        { name: 'paciente_cpf', type: 'text', required: false },
        { name: 'paciente_cartao_sus', type: 'text', required: false },
        { name: 'paciente_data_nascimento', type: 'text', required: false },
        { name: 'paciente_sexo', type: 'text', required: false },
        { name: 'paciente_municipio', type: 'text', required: false },
        { name: 'paciente_bairro', type: 'text', required: false },
        { name: 'paciente_logradouro', type: 'text', required: false },
        { name: 'paciente_telefone', type: 'text', required: false },
        { name: 'agravo_codigo', type: 'text', required: true },
        { name: 'agravo_nome', type: 'text', required: true },
        { name: 'cid10_codigo', type: 'text', required: false },
        {
          name: 'periodicidade',
          type: 'select',
          values: ['imediata_24h', 'semanal'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'situacao',
          type: 'select',
          values: ['notificado', 'em_investigacao', 'confirmado', 'descartado', 'encerrado'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'criterio_confirmacao',
          type: 'select',
          values: ['laboratorial', 'clinico_epidemiologico', 'clinico', 'em_aberto'],
          maxSelect: 1,
          required: false,
        },
        {
          name: 'evolucao_caso',
          type: 'select',
          values: ['cura', 'obito_agravo', 'obito_outras_causas', 'em_tratamento', 'ignorado'],
          maxSelect: 1,
          required: false,
        },
        { name: 'data_notificacao', type: 'text', required: true }, // YYYY-MM-DD
        { name: 'data_primeiros_sintomas', type: 'text', required: false }, // YYYY-MM-DD
        { name: 'data_encerramento', type: 'text', required: false }, // YYYY-MM-DD
        {
          name: 'profissional_notificante',
          type: 'relation',
          required: false,
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'profissional_nome', type: 'text', required: true },
        { name: 'profissional_registro', type: 'text', required: false },
        { name: 'unidade_notificadora', type: 'text', required: true },
        { name: 'municipio_notificacao', type: 'text', required: true },
        { name: 'observacoes_investigacao', type: 'text', required: false },
        { name: 'historico_investigacao', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_notif_paciente ON notificacoes_vigilancia (paciente)',
        'CREATE INDEX idx_notif_situacao ON notificacoes_vigilancia (situacao)',
        'CREATE INDEX idx_notif_agravo ON notificacoes_vigilancia (agravo_codigo)',
        'CREATE INDEX idx_notif_data ON notificacoes_vigilancia (data_notificacao)',
        'CREATE UNIQUE INDEX idx_notif_numero ON notificacoes_vigilancia (numero_notificacao)',
      ],
    })

    app.save(notificacoes)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('notificacoes_vigilancia'))
    } catch (_) {}
  },
)
