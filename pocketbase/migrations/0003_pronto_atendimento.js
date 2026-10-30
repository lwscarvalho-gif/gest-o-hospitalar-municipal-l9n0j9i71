migrate(
  (app) => {
    const pacientesColId = app.findCollectionByNameOrId('pacientes').id
    const profissionaisColId = app.findCollectionByNameOrId('profissionais').id
    const leitosColId = app.findCollectionByNameOrId('leitos').id
    const internacoesColId = app.findCollectionByNameOrId('internacoes').id
    const agendamentosColId = app.findCollectionByNameOrId('agendamentos').id

    // Coleção pronto_atendimento
    const pa = new Collection({
      name: 'pronto_atendimento',
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
          name: 'status',
          type: 'select',
          values: ['aguardando_triagem', 'aguardando_atendimento', 'em_atendimento', 'finalizado'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'classificacao_risco',
          type: 'select',
          values: ['vermelho', 'laranja', 'amarelo', 'verde', 'azul'],
          maxSelect: 1,
          required: false,
        },
        { name: 'queixa_principal', type: 'text' },
        { name: 'sinais_vitais', type: 'text' }, // ex: PA: 130/80 mmHg, FC: 82 bpm, Temp: 36.8°C, SatO2: 98%
        { name: 'discriminador', type: 'text' }, // ex: Dor torácica intensa, Febre alta
        { name: 'data_hora_chegada', type: 'text', required: true },
        { name: 'data_hora_triagem', type: 'text' },
        { name: 'triador_nome', type: 'text' },
        {
          name: 'profissional_atendimento',
          type: 'relation',
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'data_hora_atendimento', type: 'text' },
        { name: 'data_hora_finalizacao', type: 'text' },
        { name: 'evolucao_clinica', type: 'text' },
        { name: 'diagnostico', type: 'text' },
        { name: 'cid10', type: 'text' },
        {
          name: 'conduta',
          type: 'select',
          values: ['alta', 'internacao', 'ambulatorio', 'observacao'],
          maxSelect: 1,
          required: false,
        },
        { name: 'observacoes_conduta', type: 'text' },
        {
          name: 'internacao_gerada',
          type: 'relation',
          collectionId: internacoesColId,
          maxSelect: 1,
        },
        {
          name: 'leito_encaminhado',
          type: 'relation',
          collectionId: leitosColId,
          maxSelect: 1,
        },
        {
          name: 'agendamento_gerado',
          type: 'relation',
          collectionId: agendamentosColId,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_pa_paciente ON pronto_atendimento (paciente)',
        'CREATE INDEX idx_pa_status ON pronto_atendimento (status)',
      ],
    })
    app.save(pa)

    // Seed de exemplo: 2 fichas no PA para demonstração imediata
    const paCol = app.findCollectionByNameOrId('pronto_atendimento')
    const hoje = new Date().toISOString().slice(0, 10)

    try {
      const pacientes = app.findRecordsByFilter('pacientes', '', 'nome', 3, 0)
      if (pacientes.length >= 2) {
        // Ficha 1: Aguardando Atendimento (Amarelo - urgente)
        const p1 = pacientes[1]
        const rec1 = new Record(paCol)
        rec1.set('paciente', p1.id)
        rec1.set('status', 'aguardando_atendimento')
        rec1.set('classificacao_risco', 'amarelo')
        rec1.set('queixa_principal', 'Cefaleia súbita e picos pressóricos com tontura')
        rec1.set('sinais_vitais', 'PA: 160/100 mmHg | FC: 88 bpm | Temp: 36.7°C | SatO2: 97%')
        rec1.set('discriminador', 'Crise hipertensiva com dor de cabeça moderada')
        rec1.set('data_hora_chegada', hoje + ' 08:45')
        rec1.set('data_hora_triagem', hoje + ' 08:52')
        rec1.set('triador_nome', 'Mariana Santos (Recepção/Triagem)')
        app.save(rec1)

        // Ficha 2: Aguardando Triagem
        if (pacientes.length >= 3) {
          const p2 = pacientes[2]
          const rec2 = new Record(paCol)
          rec2.set('paciente', p2.id)
          rec2.set('status', 'aguardando_triagem')
          rec2.set('queixa_principal', 'Sintomas gripais e dor de garganta há 3 dias')
          rec2.set('data_hora_chegada', hoje + ' 09:10')
          app.save(rec2)
        }
      }
    } catch (e) {
      console.log('Aviso ao semear PA:', e)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('pronto_atendimento')
      app.delete(col)
    } catch (_) {}
  },
)
