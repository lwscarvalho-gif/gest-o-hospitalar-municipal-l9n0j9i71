migrate(
  (app) => {
    const pacientesColId = app.findCollectionByNameOrId('pacientes').id
    const profissionaisColId = app.findCollectionByNameOrId('profissionais').id
    const internacoesColId = app.findCollectionByNameOrId('internacoes').id
    const prontoAtendimentoColId = app.findCollectionByNameOrId('pronto_atendimento').id
    const setoresColId = app.findCollectionByNameOrId('setores').id

    // Coleção 'exames' (Ciclo completo: Pedido -> Coleta -> Análise -> Laudo/Resultado)
    const exames = new Collection({
      name: 'exames',
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
          required: false,
          collectionId: internacoesColId,
          maxSelect: 1,
        },
        {
          name: 'atendimento_pa',
          type: 'relation',
          required: false,
          collectionId: prontoAtendimentoColId,
          maxSelect: 1,
        },
        {
          name: 'setor',
          type: 'relation',
          required: false,
          collectionId: setoresColId,
          maxSelect: 1,
        },
        { name: 'tipo_exame', type: 'text', required: true }, // ex: Hemograma Completo, Radiografia de Tórax, Ultrassom Abdominal, EAS, PCR...
        {
          name: 'categoria',
          type: 'select',
          values: ['laboratorial', 'imagem', 'grafico', 'outro'],
          maxSelect: 1,
          required: false,
        },
        {
          name: 'prioridade',
          type: 'select',
          values: ['urgente', 'eletiva'],
          maxSelect: 1,
          required: true,
        },
        { name: 'justificativa', type: 'text', required: false },
        { name: 'data_solicitacao', type: 'text', required: true }, // AAAA-MM-DD HH:mm
        {
          name: 'solicitante',
          type: 'relation',
          required: false,
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'solicitante_nome', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          values: ['solicitado', 'coletado', 'em_analise', 'liberado', 'cancelado'],
          maxSelect: 1,
          required: true,
        },
        // Etapa 2: Coleta
        { name: 'data_coleta', type: 'text', required: false },
        { name: 'responsavel_coleta_nome', type: 'text', required: false },
        { name: 'observacoes_coleta', type: 'text', required: false },
        // Etapa 3: Análise
        { name: 'data_inicio_analise', type: 'text', required: false },
        { name: 'responsavel_analise_nome', type: 'text', required: false },
        // Etapa 4: Laudo / Resultado
        { name: 'data_laudo', type: 'text', required: false },
        {
          name: 'responsavel_laudo',
          type: 'relation',
          required: false,
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'responsavel_laudo_nome', type: 'text', required: false },
        { name: 'resultado_sumario', type: 'text', required: false }, // ex: Normal, Alterado, Inconclusivo, Reagente, Não Reagente
        { name: 'laudo_texto', type: 'text', required: false }, // Descrição detalhada dos parâmetros ou achados radiológicos
        // Cancelamento
        { name: 'motivo_cancelamento', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_exames_paciente ON exames (paciente)',
        'CREATE INDEX idx_exames_status ON exames (status)',
        'CREATE INDEX idx_exames_data ON exames (data_solicitacao)',
        'CREATE INDEX idx_exames_prioridade ON exames (prioridade)',
      ],
    })
    app.save(exames)

    // Sementes representativas para demonstrar o ciclo completo do exame
    try {
      const pacientesList = app.findRecordsByFilter('pacientes', '', 'created', 3, 0)
      const profList = app.findRecordsByFilter('profissionais', '', 'created', 2, 0)
      const setoresList = app.findRecordsByFilter('setores', '', 'created', 2, 0)

      if (pacientesList.length > 0 && profList.length > 0) {
        const p1 = pacientesList[0]
        const prof1 = profList[0]
        const setor1 = setoresList.length > 0 ? setoresList[0].id : null

        // 1. Exame Liberado (Laudado)
        const ex1 = new Record(exames)
        ex1.set('paciente', p1.id)
        if (setor1) ex1.set('setor', setor1)
        ex1.set('tipo_exame', 'Hemograma Completo com Plaquetas')
        ex1.set('categoria', 'laboratorial')
        ex1.set('prioridade', 'urgente')
        ex1.set('justificativa', 'Suspeita de infecção bacteriana aguda e controle de leucocitose')
        ex1.set('data_solicitacao', '2025-05-10 08:30')
        ex1.set('solicitante', prof1.id)
        ex1.set('solicitante_nome', prof1.getString('nome'))
        ex1.set('status', 'liberado')
        ex1.set('data_coleta', '2025-05-10 09:00')
        ex1.set('responsavel_coleta_nome', 'Maria Silva (Téc. Enfermagem)')
        ex1.set('data_inicio_analise', '2025-05-10 09:40')
        ex1.set('responsavel_analise_nome', 'Laboratório Municipal Central')
        ex1.set('data_laudo', '2025-05-10 11:15')
        ex1.set('responsavel_laudo', prof1.id)
        ex1.set('responsavel_laudo_nome', prof1.getString('nome'))
        ex1.set('resultado_sumario', 'Alterado - Leucocitose')
        ex1.set(
          'laudo_texto',
          'Eritrócitos: 4.8 milhões/mm³\nHemoglobina: 14.1 g/dL\nHematócrito: 42%\nLeucócitos Totais: 14.200/mm³ (VR: 4.000 a 10.000) com desvio à esquerda (Bastões 6%)\nPlaquetas: 240.000/mm³.\nConclusão: Leucocitose com neutrofilia sugestiva de quadro infeccioso/inflamatório em atividade.',
        )
        app.save(ex1)

        // 2. Exame Coletado / Em Análise
        const ex2 = new Record(exames)
        ex2.set('paciente', p1.id)
        if (setor1) ex2.set('setor', setor1)
        ex2.set('tipo_exame', 'Radiografia de Tórax PA e Perfil')
        ex2.set('categoria', 'imagem')
        ex2.set('prioridade', 'urgente')
        ex2.set(
          'justificativa',
          'Tosse produtiva há 4 dias, febre e estertores crepitantes em base direita',
        )
        ex2.set('data_solicitacao', '2025-05-10 10:00')
        ex2.set('solicitante', prof1.id)
        ex2.set('solicitante_nome', prof1.getString('nome'))
        ex2.set('status', 'em_analise')
        ex2.set('data_coleta', '2025-05-10 10:45')
        ex2.set('responsavel_coleta_nome', 'Carlos Mendes (Téc. Radiologia)')
        ex2.set('data_inicio_analise', '2025-05-10 11:00')
        ex2.set('responsavel_analise_nome', 'Setor de Radiologia e Diagnóstico')
        app.save(ex2)

        // 3. Exame Solicitado (Aguardando Coleta)
        if (pacientesList.length > 1) {
          const p2 = pacientesList[1]
          const ex3 = new Record(exames)
          ex3.set('paciente', p2.id)
          ex3.set('tipo_exame', 'EAS - Elementos Anormais e Sedimento')
          ex3.set('categoria', 'laboratorial')
          ex3.set('prioridade', 'eletiva')
          ex3.set('justificativa', 'Queixa de disúria e polaciúria, controle ambulatorial')
          ex3.set('data_solicitacao', '2025-05-10 11:30')
          ex3.set('solicitante', prof1.id)
          ex3.set('solicitante_nome', prof1.getString('nome'))
          ex3.set('status', 'solicitado')
          app.save(ex3)
        }
      }
    } catch (err) {
      console.log('Aviso ao semear exames iniciais:', err)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('exames'))
    } catch (_) {}
  },
)
