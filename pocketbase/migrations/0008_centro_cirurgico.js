migrate(
  (app) => {
    const pacientesColId = app.findCollectionByNameOrId('pacientes').id
    const profissionaisColId = app.findCollectionByNameOrId('profissionais').id
    const internacoesColId = app.findCollectionByNameOrId('internacoes').id
    const prontoAtendimentoColId = app.findCollectionByNameOrId('pronto_atendimento').id

    // 1. Coleção 'salas_cirurgicas'
    const salasCirurgicas = new Collection({
      name: 'salas_cirurgicas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true }, // ex: Sala 01 - Geral, Sala 02 - Ortopedia, Sala 03 - Obstétrica
        { name: 'bloco', type: 'text', required: false }, // ex: Bloco A, Centro Cirúrgico Principal
        {
          name: 'status',
          type: 'select',
          values: ['livre', 'ocupada', 'limpeza', 'manutencao'],
          maxSelect: 1,
          required: true,
        },
        { name: 'motivo_bloqueio', type: 'text', required: false },
        { name: 'equipamentos', type: 'text', required: false }, // ex: Arco Cirúrgico, Foco LED, Torre de Vídeo
        { name: 'ativo', type: 'bool', required: false },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_salas_cirurgicas_status ON salas_cirurgicas (status)'],
    })
    app.save(salasCirurgicas)

    const salasCirurgicasColId = app.findCollectionByNameOrId('salas_cirurgicas').id

    // 2. Coleção 'cirurgias' (Agenda e ciclo da cirurgia)
    const cirurgias = new Collection({
      name: 'cirurgias',
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
          name: 'tipo_paciente',
          type: 'select',
          values: ['internado', 'ambulatorial', 'urgencia_pa'],
          maxSelect: 1,
          required: true,
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
          name: 'sala',
          type: 'relation',
          required: true,
          collectionId: salasCirurgicasColId,
          maxSelect: 1,
        },
        { name: 'procedimento_codigo', type: 'text', required: false }, // Código SIGTAP/SUS ex: 04.07.01.003-2
        { name: 'procedimento_nome', type: 'text', required: true }, // ex: Apendicectomia, Colecistectomia Videolaparoscópica
        { name: 'data_horario_previsto', type: 'text', required: true }, // AAAA-MM-DD HH:mm
        { name: 'duracao_estimada_minutos', type: 'number', required: false },
        {
          name: 'status',
          type: 'select',
          values: [
            'agendada',
            'checklist_concluido',
            'em_sala',
            'em_recuperacao',
            'concluida',
            'cancelada',
          ],
          maxSelect: 1,
          required: true,
        },
        // Equipe Prevista / Responsáveis
        {
          name: 'cirurgiao_principal',
          type: 'relation',
          required: true,
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'cirurgiao_principal_nome', type: 'text', required: true },
        {
          name: 'anestesista',
          type: 'relation',
          required: false,
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'anestesista_nome', type: 'text', required: false },
        {
          name: 'instrumentador',
          type: 'relation',
          required: false,
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'instrumentador_nome', type: 'text', required: false },
        { name: 'equipe_adicional', type: 'text', required: false }, // enfermeiro circulante, 1º auxiliar etc.
        { name: 'observacoes_agendamento', type: 'text', required: false },
        { name: 'motivo_cancelamento', type: 'text', required: false },
        // Timestamps reais do ciclo cirúrgico
        { name: 'data_hora_inicio', type: 'text', required: false },
        { name: 'data_hora_fim', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_cirurgias_paciente ON cirurgias (paciente)',
        'CREATE INDEX idx_cirurgias_sala ON cirurgias (sala)',
        'CREATE INDEX idx_cirurgias_status ON cirurgias (status)',
        'CREATE INDEX idx_cirurgias_data ON cirurgias (data_horario_previsto)',
      ],
    })
    app.save(cirurgias)

    const cirurgiasColId = app.findCollectionByNameOrId('cirurgias').id

    // 3. Coleção 'checklists_pre_operatorios' (Checklist de Segurança Cirúrgica OMS / Liberação)
    const checklistsPreOp = new Collection({
      name: 'checklists_pre_operatorios',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'cirurgia',
          type: 'relation',
          required: true,
          collectionId: cirurgiasColId,
          maxSelect: 1,
        },
        {
          name: 'paciente',
          type: 'relation',
          required: true,
          collectionId: pacientesColId,
          maxSelect: 1,
        },
        { name: 'data_conferencia', type: 'text', required: true },
        {
          name: 'responsavel',
          type: 'relation',
          required: false,
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'responsavel_nome', type: 'text', required: true },
        // Itens de checagem obrigatória:
        { name: 'jejum_confirmado', type: 'bool', required: false },
        { name: 'jejum_horas', type: 'number', required: false },
        { name: 'exames_pre_operatorios_ok', type: 'bool', required: false },
        { name: 'detalhes_exames', type: 'text', required: false },
        { name: 'consentimento_informado_assinado', type: 'bool', required: false },
        { name: 'avaliacao_risco_anestesico_concluida', type: 'bool', required: false },
        {
          name: 'risco_asa',
          type: 'select',
          values: ['ASA_I', 'ASA_II', 'ASA_III', 'ASA_IV', 'ASA_V', 'ASA_VI'],
          maxSelect: 1,
          required: false,
        },
        { name: 'demarcacao_lateralidade', type: 'bool', required: false },
        { name: 'alergias_checadas', type: 'bool', required: false },
        { name: 'reserva_sangue_hemoderivados', type: 'bool', required: false },
        { name: 'retirada_proteses_adornos', type: 'bool', required: false },
        { name: 'acesso_venoso_permeavel', type: 'bool', required: false },
        { name: 'liberado_centro_cirurgico', type: 'bool', required: false },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_checklists_cirurgia ON checklists_pre_operatorios (cirurgia)',
        'CREATE INDEX idx_checklists_paciente ON checklists_pre_operatorios (paciente)',
      ],
    })
    app.save(checklistsPreOp)

    // 4. Coleção 'atos_operatorios' (Registro cirúrgico pelo profissional)
    const atosOperatorios = new Collection({
      name: 'atos_operatorios',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'cirurgia',
          type: 'relation',
          required: true,
          collectionId: cirurgiasColId,
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
          name: 'cirurgiao',
          type: 'relation',
          required: false,
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'cirurgiao_nome', type: 'text', required: true },
        { name: 'procedimento_realizado', type: 'text', required: true },
        { name: 'codigo_procedimento', type: 'text', required: false },
        { name: 'tecnica_cirurgica', type: 'text', required: true }, // ex: Laparotomia exploradora, Vídeo, Convencional
        {
          name: 'tipo_anestesia',
          type: 'select',
          values: [
            'geral',
            'raquianestesia',
            'peridural',
            'sedacao_local',
            'bloqueio_regional',
            'local',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'data_hora_inicio', type: 'text', required: true },
        { name: 'data_hora_fim', type: 'text', required: true },
        { name: 'duracao_minutos', type: 'number', required: false },
        { name: 'diagnostico_pre_operatorio', type: 'text', required: false },
        { name: 'diagnostico_pos_operatorio', type: 'text', required: false },
        { name: 'cid10', type: 'text', required: false },
        { name: 'descricao_ato', type: 'text', required: true }, // Descrição minuciosa dos achados cirúrgicos e tempo operatório
        { name: 'complicacoes_intercorrencias', type: 'text', required: false },
        { name: 'perda_sanguinea_estimada_ml', type: 'number', required: false },
        { name: 'materiais_implantes_utilizados', type: 'text', required: false },
        { name: 'envio_anatomo_patologico', type: 'bool', required: false },
        { name: 'equipe_participante', type: 'text', required: false }, // lista de profissionais
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_atos_cirurgia ON atos_operatorios (cirurgia)',
        'CREATE INDEX idx_atos_paciente ON atos_operatorios (paciente)',
      ],
    })
    app.save(atosOperatorios)

    // 5. Coleção 'recuperacao_pos_anestesica' (SRPA)
    const recuperacaoPosAnestesica = new Collection({
      name: 'recuperacao_pos_anestesica',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'cirurgia',
          type: 'relation',
          required: true,
          collectionId: cirurgiasColId,
          maxSelect: 1,
        },
        {
          name: 'paciente',
          type: 'relation',
          required: true,
          collectionId: pacientesColId,
          maxSelect: 1,
        },
        { name: 'data_hora_admissao_srpa', type: 'text', required: true },
        { name: 'data_hora_alta_srpa', type: 'text', required: false },
        {
          name: 'responsavel',
          type: 'relation',
          required: false,
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'responsavel_nome', type: 'text', required: true },
        { name: 'escala_aldrete_kroulik', type: 'number', required: false }, // 0 a 10 (liberação recomendada >= 8 ou 9)
        { name: 'sinais_vitais_admissao', type: 'text', required: false },
        { name: 'sinais_vitais_alta', type: 'text', required: false },
        { name: 'nivel_consciencia', type: 'text', required: false },
        { name: 'dor_escala_analogica', type: 'text', required: false },
        { name: 'nauseas_vomitos', type: 'bool', required: false },
        { name: 'evolucao_pos_operatoria', type: 'text', required: true },
        {
          name: 'destino_pos_alta',
          type: 'select',
          values: ['retorno_leito', 'alta_hospitalar', 'uti', 'observacao_srpa'],
          maxSelect: 1,
          required: true,
        },
        { name: 'leito_destino', type: 'text', required: false },
        { name: 'orientacoes_alta', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_srpa_cirurgia ON recuperacao_pos_anestesica (cirurgia)',
        'CREATE INDEX idx_srpa_paciente ON recuperacao_pos_anestesica (paciente)',
        'CREATE INDEX idx_srpa_destino ON recuperacao_pos_anestesica (destino_pos_alta)',
      ],
    })
    app.save(recuperacaoPosAnestesica)

    // Sementes iniciais de salas cirúrgicas e demonstração
    try {
      const s1 = new Record(salasCirurgicas)
      s1.set('nome', 'Sala 01 - Cirurgia Geral & Laparoscopia')
      s1.set('bloco', 'Bloco Cirúrgico Central')
      s1.set('status', 'livre')
      s1.set(
        'equipamentos',
        'Torre de Vídeo Stryker, Foco Cirúrgico LED, Bisturi Eletrônico Bipolar, Monitor Multiparamétrico',
      )
      s1.set('ativo', true)
      s1.set(
        'observacoes',
        'Sala climatizada com fluxo laminar para cirurgias limpas e videocirurgia.',
      )
      app.save(s1)

      const s2 = new Record(salasCirurgicas)
      s2.set('nome', 'Sala 02 - Ortopedia & Traumatologia')
      s2.set('bloco', 'Bloco Cirúrgico Central')
      s2.set('status', 'ocupada')
      s2.set(
        'equipamentos',
        'Arco Cirúrgico Philips em C, Mesa Radiotransparente, Foco LED Auxiliar',
      )
      s2.set('ativo', true)
      s2.set(
        'observacoes',
        'Dedicada a procedimentos ortopédicos e cirurgias de urgência do trauma.',
      )
      app.save(s2)

      const s3 = new Record(salasCirurgicas)
      s3.set('nome', 'Sala 03 - Obstetrícia & Parto Cirúrgico')
      s3.set('bloco', 'Centro Cirúrgico & Maternidade')
      s3.set('status', 'limpeza')
      s3.set('motivo_bloqueio', 'Higienização terminal após cesariana eletiva')
      s3.set(
        'equipamentos',
        'Berço Aquecido Neonatal, Monitor Cardiotocógrafo, Aspirador Cirúrgico Duplo',
      )
      s3.set('ativo', true)
      s3.set('observacoes', 'Sala integrada à equipe obstétrica e pediátrica municipal.')
      app.save(s3)

      const s4 = new Record(salasCirurgicas)
      s4.set('nome', 'Sala 04 - Pequenos Procedimentos & Ambulatório')
      s4.set('bloco', 'Ambulatório Cirúrgico')
      s4.set('status', 'manutencao')
      s4.set(
        'motivo_bloqueio',
        'Calibração preventiva do foco cirúrgico e teste elétrico de segurança',
      )
      s4.set('equipamentos', 'Bisturi de Alta Frequência, Foco Móvel, Oxímetro de Pulso')
      s4.set('ativo', true)
      s4.set('observacoes', 'Previsão de liberação técnica em 24 horas.')
      app.save(s4)

      // Criar agendamento de exemplo para a Sala 02 (que está ocupada) se houver pacientes e profissionais
      const pacientesList = app.findRecordsByFilter('pacientes', '', 'created', 2, 0)
      const profList = app.findRecordsByFilter('profissionais', '', 'created', 3, 0)

      if (pacientesList.length > 0 && profList.length > 0) {
        const p1 = pacientesList[0]
        const cirurgiao1 = profList[0]
        const anest1 = profList.length > 1 ? profList[1] : profList[0]

        const c1 = new Record(cirurgias)
        c1.set('paciente', p1.id)
        c1.set('tipo_paciente', 'internado')
        c1.set('sala', s2.id)
        c1.set('procedimento_codigo', '04.08.05.016-1')
        c1.set('procedimento_nome', 'Osteossíntese de Fratura de Diáfise Femoral')
        c1.set('data_horario_previsto', '2025-05-10 09:00')
        c1.set('duracao_estimada_minutos', 120)
        c1.set('status', 'em_sala')
        c1.set('cirurgiao_principal', cirurgiao1.id)
        c1.set('cirurgiao_principal_nome', cirurgiao1.getString('nome'))
        c1.set('anestesista', anest1.id)
        c1.set('anestesista_nome', anest1.getString('nome'))
        c1.set('instrumentador_nome', 'Renata Oliveira (Instrumentadora)')
        c1.set('equipe_adicional', 'Circulante de Sala: Marcos Santos (Téc. Enfermagem)')
        c1.set(
          'observacoes_agendamento',
          'Paciente admitido via PA com politrauma estável. Requer reserva de 2 CH de hemácias.',
        )
        c1.set('data_hora_inicio', '2025-05-10 09:15')
        app.save(c1)

        // Checklist correspondente a esta cirurgia (concluído)
        const ch1 = new Record(checklistsPreOp)
        ch1.set('cirurgia', c1.id)
        ch1.set('paciente', p1.id)
        ch1.set('data_conferencia', '2025-05-10 08:30')
        ch1.set('responsavel', cirurgiao1.id)
        ch1.set('responsavel_nome', cirurgiao1.getString('nome'))
        ch1.set('jejum_confirmado', true)
        ch1.set('jejum_horas', 8)
        ch1.set('exames_pre_operatorios_ok', true)
        ch1.set(
          'detalhes_exames',
          'Hemograma, Coagulograma e RX prévios checados sem contraindicações.',
        )
        ch1.set('consentimento_informado_assinado', true)
        ch1.set('avaliacao_risco_anestesico_concluida', true)
        ch1.set('risco_asa', 'ASA_II')
        ch1.set('demarcacao_lateralidade', true)
        ch1.set('alergias_checadas', true)
        ch1.set('reserva_sangue_hemoderivados', true)
        ch1.set('retirada_proteses_adornos', true)
        ch1.set('acesso_venoso_permeavel', true)
        ch1.set('liberado_centro_cirurgico', true)
        ch1.set('observacoes', 'Paciente liberado para transferência ao bloco cirúrgico.')
        app.save(ch1)
      }
    } catch (errSeed) {
      console.log('Aviso ao semear centro cirurgico:', errSeed)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('recuperacao_pos_anestesica'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('atos_operatorios'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('checklists_pre_operatorios'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('cirurgias'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('salas_cirurgicas'))
    } catch (_) {}
  },
)
