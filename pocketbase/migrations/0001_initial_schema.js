migrate(
  (app) => {
    // 1. Atualizar coleção users para incluir role e status
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          required: false,
          values: ['admin', 'gestor', 'profissional', 'recepcao'],
          maxSelect: 1,
        }),
      )
    }

    if (!users.fields.getByName('cargo')) {
      users.fields.add(
        new TextField({
          name: 'cargo',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('registro_profissional')) {
      users.fields.add(
        new TextField({
          name: 'registro_profissional',
          required: false,
        }),
      )
    }

    // Regras de users: autenticado pode listar e visualizar; atualizar seu próprio perfil ou admin atualizar
    users.listRule = "@request.auth.id != ''"
    users.viewRule = "@request.auth.id != ''"
    users.updateRule = "@request.auth.id != ''"
    app.save(users)

    // 2. Coleção setores (Unidades / Setores do hospital / UBS / UPA)
    const setores = new Collection({
      name: 'setores',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'sigla', type: 'text' },
        {
          name: 'tipo',
          type: 'select',
          values: [
            'enfermaria',
            'uti',
            'isolamento',
            'pronto_socorro',
            'centro_cirurgico',
            'ambulatorio',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'capacidade', type: 'number', min: 0 },
        { name: 'ativo', type: 'bool' },
        { name: 'descricao', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(setores)

    const setoresColId = app.findCollectionByNameOrId('setores').id

    // 3. Coleção leitos
    const leitos = new Collection({
      name: 'leitos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'codigo', type: 'text', required: true },
        {
          name: 'setor',
          type: 'relation',
          required: true,
          collectionId: setoresColId,
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          values: ['clinico', 'cirurgico', 'pediatrico', 'uti', 'isolamento'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          values: ['vago', 'ocupado', 'manutencao', 'higienizacao'],
          maxSelect: 1,
          required: true,
        },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(leitos)

    // 4. Coleção pacientes
    const pacientes = new Collection({
      name: 'pacientes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'cpf', type: 'text' },
        { name: 'cartao_sus', type: 'text', required: true },
        { name: 'data_nascimento', type: 'text' },
        { name: 'sexo', type: 'select', values: ['M', 'F', 'Outro'], maxSelect: 1 },
        { name: 'nome_mae', type: 'text' },
        { name: 'telefone', type: 'text' },
        { name: 'endereco', type: 'text' },
        { name: 'bairro', type: 'text' },
        { name: 'cidade', type: 'text' },
        { name: 'tipo_sanguineo', type: 'text' },
        { name: 'alergias', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(pacientes)

    // 5. Coleção profissionais (pessoal médico, enfermagem, especialistas)
    const profissionais = new Collection({
      name: 'profissionais',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        {
          name: 'categoria',
          type: 'select',
          values: [
            'medico',
            'enfermeiro',
            'tecnico_enfermagem',
            'fisioterapeuta',
            'psicologo',
            'outro',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'registro_conselho', type: 'text', required: true }, // ex: CRM 1234-RO, COREN 5678-RO
        { name: 'especialidade', type: 'text', required: true },
        { name: 'cpf', type: 'text' },
        { name: 'telefone', type: 'text' },
        { name: 'email', type: 'text' },
        { name: 'setor_padrao', type: 'relation', collectionId: setoresColId, maxSelect: 1 },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(profissionais)

    const pacientesColId = app.findCollectionByNameOrId('pacientes').id
    const profissionaisColId = app.findCollectionByNameOrId('profissionais').id
    const leitosColId = app.findCollectionByNameOrId('leitos').id

    // 6. Coleção agendamentos (consultas, procedimentos)
    const agendamentos = new Collection({
      name: 'agendamentos',
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
          name: 'profissional',
          type: 'relation',
          required: true,
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'setor', type: 'relation', collectionId: setoresColId, maxSelect: 1 },
        {
          name: 'tipo',
          type: 'select',
          values: ['consulta', 'retorno', 'procedimento', 'urgencia'],
          maxSelect: 1,
          required: true,
        },
        { name: 'data_hora', type: 'text', required: true }, // ISO string YYYY-MM-DDTHH:mm
        {
          name: 'status',
          type: 'select',
          values: ['agendado', 'confirmado', 'em_atendimento', 'atendido', 'cancelado'],
          maxSelect: 1,
          required: true,
        },
        { name: 'motivo', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(agendamentos)

    // 7. Coleção internacoes
    const internacoes = new Collection({
      name: 'internacoes',
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
          name: 'leito_atual',
          type: 'relation',
          required: true,
          collectionId: leitosColId,
          maxSelect: 1,
        },
        {
          name: 'setor_atual',
          type: 'relation',
          required: true,
          collectionId: setoresColId,
          maxSelect: 1,
        },
        {
          name: 'medico_responsavel',
          type: 'relation',
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'data_admissao', type: 'text', required: true },
        { name: 'data_alta', type: 'text' },
        { name: 'motivo_admissao', type: 'text', required: true },
        { name: 'diagnostico_inicial', type: 'text' },
        { name: 'cid10_admissao', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['ativa', 'alta', 'transferido', 'obito'],
          maxSelect: 1,
          required: true,
        },
        { name: 'motivo_alta', type: 'text' },
        { name: 'historico_leitos', type: 'json' }, // array com movimentações [{ data, leito_de, leito_para, motivo, responsavel }]
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(internacoes)

    const internacoesColId = app.findCollectionByNameOrId('internacoes').id

    // 8. Coleção evolucoes_clinicas (registro assistencial mínimo)
    const evolucoes = new Collection({
      name: 'evolucoes_clinicas',
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
        { name: 'internacao', type: 'relation', collectionId: internacoesColId, maxSelect: 1 },
        { name: 'profissional', type: 'relation', collectionId: profissionaisColId, maxSelect: 1 },
        {
          name: 'tipo',
          type: 'select',
          values: ['evolucao_medica', 'anotacao_enfermagem', 'diagnostico', 'prescricao', 'alta'],
          maxSelect: 1,
          required: true,
        },
        { name: 'data_hora', type: 'text', required: true },
        { name: 'descricao', type: 'text', required: true },
        { name: 'diagnostico', type: 'text' },
        { name: 'cid10', type: 'text' },
        { name: 'sinais_vitais', type: 'text' }, // ex: PA 120/80, FC 78, Temp 36.5, SatO2 98%
        { name: 'conduta', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(evolucoes)

    // 9. Coleção auditoria (rastreabilidade de quem fez o quê e quando)
    const auditoria = new Collection({
      name: 'auditoria',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'usuario_id', type: 'text', required: true },
        { name: 'usuario_nome', type: 'text', required: true },
        { name: 'usuario_role', type: 'text' },
        { name: 'acao', type: 'text', required: true }, // ex: LOGIN, CRIAR_PACIENTE, ADMISSAO_LEITO, TRANSFERENCIA_LEITO, ALTA, EVOLUCAO_CLINICA
        { name: 'modulo', type: 'text', required: true }, // ex: Pacientes, Internação, Agendamento, Sistema
        { name: 'detalhes', type: 'text' },
        { name: 'registro_id', type: 'text' },
        { name: 'ip_info', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(auditoria)

    // 10. Coleção parametros_integracao (CNES, e-SUS, TISS/SIGTAP)
    const parametros = new Collection({
      name: 'parametros_integracao',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'codigo', type: 'text', required: true }, // ex: CNES, ESUS, TISS_SIGTAP
        { name: 'titulo', type: 'text', required: true },
        { name: 'configuracoes', type: 'json' }, // credenciais fictícias/parâmetros de lote
        {
          name: 'status_conexao',
          type: 'select',
          values: ['configurado', 'pendente_fase2', 'homologacao'],
          maxSelect: 1,
          required: true,
        },
        { name: 'ultima_exportacao', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(parametros)
  },
  (app) => {
    const toDelete = [
      'parametros_integracao',
      'auditoria',
      'evolucoes_clinicas',
      'internacoes',
      'agendamentos',
      'profissionais',
      'pacientes',
      'leitos',
      'setores',
    ]
    for (const name of toDelete) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
