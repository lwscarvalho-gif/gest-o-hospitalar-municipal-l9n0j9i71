migrate(
  (app) => {
    // 1. Atualizar a coleção 'pacientes' com condicoes_cronicas (alergias já existe como text)
    const pacientesCol = app.findCollectionByNameOrId('pacientes')
    if (!pacientesCol.fields.getByName('condicoes_cronicas')) {
      pacientesCol.fields.add(
        new TextField({
          name: 'condicoes_cronicas',
          required: false,
        }),
      )
      app.save(pacientesCol)
    }

    const pacientesColId = pacientesCol.id
    const profissionaisColId = app.findCollectionByNameOrId('profissionais').id
    const internacoesColId = app.findCollectionByNameOrId('internacoes').id
    const farmaciaItensColId = app.findCollectionByNameOrId('farmacia_itens').id

    // 2. Coleção 'prescricoes' (Prescrição Médica na Internação)
    const prescricoes = new Collection({
      name: 'prescricoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'paciente',
          type: 'relation',
          required: true,
          collectionId: pacientesColId,
          maxSelect: 1,
        },
        {
          name: 'internacao',
          type: 'relation',
          required: true,
          collectionId: internacoesColId,
          maxSelect: 1,
        },
        {
          name: 'medico',
          type: 'relation',
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'medico_nome', type: 'text' },
        { name: 'data_prescricao', type: 'text', required: true }, // AAAA-MM-DD HH:mm
        {
          name: 'status',
          type: 'select',
          values: ['ativa', 'suspensa', 'concluida'],
          maxSelect: 1,
          required: true,
        },
        { name: 'observacoes_gerais', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_presc_paciente ON prescricoes (paciente)',
        'CREATE INDEX idx_presc_internacao ON prescricoes (internacao)',
        'CREATE INDEX idx_presc_status ON prescricoes (status)',
      ],
    })
    app.save(prescricoes)

    const prescricoesColId = app.findCollectionByNameOrId('prescricoes').id

    // 3. Coleção 'prescricao_itens' (Itens da Prescrição Médica)
    const prescricaoItens = new Collection({
      name: 'prescricao_itens',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'prescricao',
          type: 'relation',
          required: true,
          collectionId: prescricoesColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'paciente',
          type: 'relation',
          required: true,
          collectionId: pacientesColId,
          maxSelect: 1,
        },
        {
          name: 'item_farmacia',
          type: 'relation',
          collectionId: farmaciaItensColId,
          maxSelect: 1,
        },
        { name: 'medicamento_nome', type: 'text', required: true },
        { name: 'dose', type: 'text', required: true }, // ex: 500mg, 1 ampola, 10 gotas
        {
          name: 'via_administracao',
          type: 'select',
          values: [
            'oral',
            'intravenosa',
            'intramuscular',
            'subcutanea',
            'inalatoria',
            'topica',
            'retal',
            'oftalmica',
            'nasal',
            'outra',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'frequencia', type: 'text', required: true }, // ex: 6/6h, 8/8h, 12/12h, 1x ao dia, se dor
        { name: 'duracao', type: 'text' }, // ex: 7 dias, uso contínuo, 48 horas
        { name: 'instrucoes', type: 'text' }, // ex: diluir em SF 100ml em 30min
        {
          name: 'status',
          type: 'select',
          values: ['ativo', 'suspenso', 'concluido'],
          maxSelect: 1,
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_item_prescricao ON prescricao_itens (prescricao)',
        'CREATE INDEX idx_item_farmacia ON prescricao_itens (item_farmacia)',
      ],
    })
    app.save(prescricaoItens)

    const prescricaoItensColId = app.findCollectionByNameOrId('prescricao_itens').id

    // 4. Coleção 'administracao_medicamentos' (Checagem/Aprazamento da Enfermagem ao leito)
    const administracaoMedicamentos = new Collection({
      name: 'administracao_medicamentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'paciente',
          type: 'relation',
          required: true,
          collectionId: pacientesColId,
          maxSelect: 1,
        },
        {
          name: 'internacao',
          type: 'relation',
          collectionId: internacoesColId,
          maxSelect: 1,
        },
        {
          name: 'prescricao',
          type: 'relation',
          collectionId: prescricoesColId,
          maxSelect: 1,
        },
        {
          name: 'prescricao_item',
          type: 'relation',
          collectionId: prescricaoItensColId,
          maxSelect: 1,
        },
        { name: 'medicamento_nome', type: 'text', required: true },
        { name: 'dose_administrada', type: 'text' },
        { name: 'via_administrada', type: 'text' },
        { name: 'data_hora_administracao', type: 'text', required: true }, // AAAA-MM-DD HH:mm
        {
          name: 'profissional_enfermagem',
          type: 'relation',
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'responsavel_nome', type: 'text', required: true },
        { name: 'responsavel_cargo', type: 'text' }, // ex: Enf. Chefe / Téc. Enfermagem COREN-RO
        {
          name: 'status',
          type: 'select',
          values: ['administrado', 'recusado', 'suspenso', 'nao_administrado'],
          maxSelect: 1,
          required: true,
        },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_adm_paciente ON administracao_medicamentos (paciente)',
        'CREATE INDEX idx_adm_item ON administracao_medicamentos (prescricao_item)',
        'CREATE INDEX idx_adm_data ON administracao_medicamentos (data_hora_administracao)',
      ],
    })
    app.save(administracaoMedicamentos)

    // 5. Adicionar campo 'prescricao_relacionada' e 'internacao' na coleção farmacia_dispensacoes
    const farmaciaDispCol = app.findCollectionByNameOrId('farmacia_dispensacoes')
    if (!farmaciaDispCol.fields.getByName('prescricao_relacionada')) {
      farmaciaDispCol.fields.add(
        new RelationField({
          name: 'prescricao_relacionada',
          collectionId: prescricoesColId,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    if (!farmaciaDispCol.fields.getByName('internacao')) {
      farmaciaDispCol.fields.add(
        new RelationField({
          name: 'internacao',
          collectionId: internacoesColId,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    app.save(farmaciaDispCol)

    // 6. Atualizar pacientes existentes com condições crônicas e alergias se vazios para teste realista
    try {
      const pacientesList = app.findRecordsByFilter('pacientes', '', 'nome', 5, 0)
      if (pacientesList.length > 0) {
        const p0 = pacientesList[0]
        if (!p0.getString('alergias')) {
          p0.set('alergias', 'Penicilina, Dipirona (choque anafilático prévio)')
        }
        p0.set('condicoes_cronicas', 'Hipertensão Arterial Sistêmica, Diabetes Mellitus Tipo 2')
        app.save(p0)
      }
      if (pacientesList.length > 1) {
        const p1 = pacientesList[1]
        if (!p1.getString('alergias')) {
          p1.set('alergias', 'Iodo, Anti-inflamatórios Não Esteroidais (AINEs)')
        }
        p1.set('condicoes_cronicas', 'Asma Brônquica Moderada')
        app.save(p1)
      }
    } catch (e) {
      console.log('Aviso ao semear alergias em pacientes:', e)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('administracao_medicamentos'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('prescricao_itens'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('prescricoes'))
    } catch (_) {}
  },
)
