migrate(
  (app) => {
    const pacientesColId = app.findCollectionByNameOrId('pacientes').id
    const profissionaisColId = app.findCollectionByNameOrId('profissionais').id
    const internacoesColId = app.findCollectionByNameOrId('internacoes').id
    const prontoAtendimentoColId = app.findCollectionByNameOrId('pronto_atendimento').id
    const prescricoesColId = app.findCollectionByNameOrId('prescricoes').id

    // Coleção impressos_assistenciais
    const impressos = new Collection({
      name: 'impressos_assistenciais',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tipo',
          type: 'select',
          values: ['receita', 'atestado', 'resumo_alta'],
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
        {
          name: 'profissional',
          type: 'relation',
          required: false,
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'profissional_nome', type: 'text', required: true },
        { name: 'profissional_profissao', type: 'text', required: true },
        { name: 'profissional_registro', type: 'text', required: true },
        { name: 'unidade_nome', type: 'text', required: true },
        { name: 'municipio_uf', type: 'text', required: false },
        {
          name: 'origem',
          type: 'select',
          values: ['pronto_atendimento', 'internacao', 'ambulatorio', 'avulso'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'atendimento_pa',
          type: 'relation',
          required: false,
          collectionId: prontoAtendimentoColId,
          maxSelect: 1,
        },
        {
          name: 'internacao',
          type: 'relation',
          required: false,
          collectionId: internacoesColId,
          maxSelect: 1,
        },
        {
          name: 'prescricao_origem',
          type: 'relation',
          required: false,
          collectionId: prescricoesColId,
          maxSelect: 1,
        },
        { name: 'data_hora_emissao', type: 'text', required: true },
        // Consentimento explícito para inclusão de CID (obrigatório se houver CID no atestado)
        { name: 'cid_consentimento_registrado', type: 'bool', required: false },
        { name: 'cid_consentimento_data_hora', type: 'text', required: false },
        { name: 'cid10_codigo', type: 'text', required: false },
        { name: 'cid10_descricao', type: 'text', required: false },
        // Conteúdo estruturado específico de cada tipo de impresso (JSON)
        { name: 'conteudo', type: 'json', required: true },
        { name: 'observacoes_gerais', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_impressos_paciente ON impressos_assistenciais (paciente)',
        'CREATE INDEX idx_impressos_tipo ON impressos_assistenciais (tipo)',
        'CREATE INDEX idx_impressos_data ON impressos_assistenciais (data_hora_emissao)',
        'CREATE INDEX idx_impressos_pa ON impressos_assistenciais (atendimento_pa)',
        'CREATE INDEX idx_impressos_internacao ON impressos_assistenciais (internacao)',
      ],
    })
    app.save(impressos)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('impressos_assistenciais'))
    } catch (_) {}
  },
)
