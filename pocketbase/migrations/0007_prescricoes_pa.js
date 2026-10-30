migrate(
  (app) => {
    const prontoAtendimentoCol = app.findCollectionByNameOrId('pronto_atendimento')
    const paColId = prontoAtendimentoCol.id

    // 1. Atualizar coleção 'prescricoes':
    // - tornar 'internacao' opcional (required = false) para permitir prescrições do PA
    // - adicionar 'origem': select ('internacao', 'pronto_atendimento')
    // - adicionar 'atendimento_pa': relation -> pronto_atendimento
    const prescricoesCol = app.findCollectionByNameOrId('prescricoes')

    const fieldInternacao = prescricoesCol.fields.getByName('internacao')
    if (fieldInternacao) {
      fieldInternacao.required = false
    }

    if (!prescricoesCol.fields.getByName('origem')) {
      prescricoesCol.fields.add(
        new SelectField({
          name: 'origem',
          values: ['internacao', 'pronto_atendimento'],
          maxSelect: 1,
          required: false,
        }),
      )
    }

    if (!prescricoesCol.fields.getByName('atendimento_pa')) {
      prescricoesCol.fields.add(
        new RelationField({
          name: 'atendimento_pa',
          collectionId: paColId,
          maxSelect: 1,
          required: false,
        }),
      )
    }

    prescricoesCol.addIndex('idx_presc_pa', false, 'atendimento_pa', '')
    app.save(prescricoesCol)

    // 2. Atualizar coleção 'administracao_medicamentos':
    // - adicionar 'atendimento_pa': relation -> pronto_atendimento
    const admCol = app.findCollectionByNameOrId('administracao_medicamentos')
    if (!admCol.fields.getByName('atendimento_pa')) {
      admCol.fields.add(
        new RelationField({
          name: 'atendimento_pa',
          collectionId: paColId,
          maxSelect: 1,
          required: false,
        }),
      )
      admCol.addIndex('idx_adm_pa', false, 'atendimento_pa', '')
      app.save(admCol)
    }

    // 3. Atualizar coleção 'farmacia_dispensacoes':
    // - adicionar 'atendimento_pa': relation -> pronto_atendimento
    const dispCol = app.findCollectionByNameOrId('farmacia_dispensacoes')
    if (!dispCol.fields.getByName('atendimento_pa')) {
      dispCol.fields.add(
        new RelationField({
          name: 'atendimento_pa',
          collectionId: paColId,
          maxSelect: 1,
          required: false,
        }),
      )
      dispCol.addIndex('idx_disp_pa', false, 'atendimento_pa', '')
      app.save(dispCol)
    }
  },
  (app) => {
    try {
      const dispCol = app.findCollectionByNameOrId('farmacia_dispensacoes')
      dispCol.fields.removeByName('atendimento_pa')
      dispCol.removeIndex('idx_disp_pa')
      app.save(dispCol)
    } catch (_) {}

    try {
      const admCol = app.findCollectionByNameOrId('administracao_medicamentos')
      admCol.fields.removeByName('atendimento_pa')
      admCol.removeIndex('idx_adm_pa')
      app.save(admCol)
    } catch (_) {}

    try {
      const prescricoesCol = app.findCollectionByNameOrId('prescricoes')
      prescricoesCol.fields.removeByName('atendimento_pa')
      prescricoesCol.fields.removeByName('origem')
      prescricoesCol.removeIndex('idx_presc_pa')
      app.save(prescricoesCol)
    } catch (_) {}
  },
)
