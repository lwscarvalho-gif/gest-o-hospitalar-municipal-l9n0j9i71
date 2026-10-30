migrate(
  (app) => {
    // -------------------------------------------------------------------------
    // CENTRAL DE REGULAÇÃO: GESTÃO ADMINISTRATIVA & CATÁLOGOS PARAMETRIZÁVEIS
    // 1. Catálogo de Recursos / Especialidades (leitos, especialidades, exames de urgência)
    // 2. Destinos Internos Parametrizáveis (enfermarias, blocos, unidades vinculadas a setores)
    // Suporte a ativação / inativação (soft disable) sem perda de histórico.
    // Regras de RLS: Escrita admin/gestor/profissional; Leitura administrativa irrestrita a autenticados (incluindo recepção).
    // Deleção física bloqueada (deleteRule null para garantir integridade e histórico).
    // -------------------------------------------------------------------------

    const setoresColId = app.findCollectionByNameOrId('setores').id

    const authReadRule = "@request.auth.id != ''"
    const adminGestorWriteRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')"

    // 1. Coleção regulacao_catalogo_recursos
    const recursosCol = new Collection({
      name: 'regulacao_catalogo_recursos',
      type: 'base',
      listRule: authReadRule,
      viewRule: authReadRule,
      createRule: adminGestorWriteRule,
      updateRule: adminGestorWriteRule,
      deleteRule: null, // sem exclusão física para preservar histórico
      fields: [
        { name: 'codigo', type: 'text', required: true },
        { name: 'nome', type: 'text', required: true },
        {
          name: 'categoria',
          type: 'select',
          values: ['leito', 'especialidade', 'procedimento', 'suporte'],
          maxSelect: 1,
          required: true,
        },
        { name: 'descricao', type: 'text', required: false },
        { name: 'ativo', type: 'bool', required: false },
        { name: 'tempo_alvo_minutos', type: 'number', required: false },
        { name: 'ordem', type: 'number', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_reg_cat_rec_codigo ON regulacao_catalogo_recursos (codigo)',
        'CREATE INDEX idx_reg_cat_rec_ativo ON regulacao_catalogo_recursos (ativo)',
        'CREATE INDEX idx_reg_cat_rec_categoria ON regulacao_catalogo_recursos (categoria)',
      ],
    })
    app.save(recursosCol)

    // 2. Coleção regulacao_destinos_internos
    const destinosCol = new Collection({
      name: 'regulacao_destinos_internos',
      type: 'base',
      listRule: authReadRule,
      viewRule: authReadRule,
      createRule: adminGestorWriteRule,
      updateRule: adminGestorWriteRule,
      deleteRule: null, // sem exclusão física para preservar histórico
      fields: [
        { name: 'codigo', type: 'text', required: true },
        { name: 'nome', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          values: ['enfermaria', 'uti', 'centro_cirurgico', 'ambulatorio', 'isolamento', 'outro'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'setor_vinculado',
          type: 'relation',
          required: false,
          collectionId: setoresColId,
          maxSelect: 1,
        },
        { name: 'bloco_ala', type: 'text', required: false },
        { name: 'capacidade_operacional', type: 'number', required: false },
        { name: 'ativo', type: 'bool', required: false },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'ordem', type: 'number', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_reg_dest_codigo ON regulacao_destinos_internos (codigo)',
        'CREATE INDEX idx_reg_dest_ativo ON regulacao_destinos_internos (ativo)',
        'CREATE INDEX idx_reg_dest_setor ON regulacao_destinos_internos (setor_vinculado)',
      ],
    })
    app.save(destinosCol)

    // 3. Seed inicial de catálogo de recursos
    const recursosIniciais = [
      {
        codigo: 'leito_enfermaria_clinica',
        nome: 'Leito Enfermaria Clínica',
        categoria: 'leito',
        descricao: 'Internação de cuidados clínicos gerais e retaguarda clínica',
        ativo: true,
        tempo_alvo_minutos: 240,
        ordem: 1,
      },
      {
        codigo: 'leito_uti_adulto',
        nome: 'Leito UTI Adulto',
        categoria: 'leito',
        descricao: 'Unidade de Terapia Intensiva com suporte avançado à vida',
        ativo: true,
        tempo_alvo_minutos: 60,
        ordem: 2,
      },
      {
        codigo: 'leito_isolamento',
        nome: 'Leito de Isolamento Respiratório/Contato',
        categoria: 'leito',
        descricao: 'Isolamento de precaução aérea ou de contato com pressão diferencial',
        ativo: true,
        tempo_alvo_minutos: 120,
        ordem: 3,
      },
      {
        codigo: 'leito_cirurgico',
        nome: 'Leito Cirúrgico / Pré-Pós Operatório',
        categoria: 'leito',
        descricao: 'Acomodação prévia e posterior a procedimentos cirúrgicos',
        ativo: true,
        tempo_alvo_minutos: 180,
        ordem: 4,
      },
      {
        codigo: 'avaliacao_especializada',
        nome: 'Interconsulta / Avaliação Especializada',
        categoria: 'especialidade',
        descricao: 'Parecer médico especializado em cardiologia, neurologia, nefrologia, etc.',
        ativo: true,
        tempo_alvo_minutos: 120,
        ordem: 5,
      },
      {
        codigo: 'procedimento_urgencia',
        nome: 'Procedimento de Urgência em Bloco',
        categoria: 'procedimento',
        descricao: 'Procedimentos de urgência ou pequenas intervenções emergenciais',
        ativo: true,
        tempo_alvo_minutos: 90,
        ordem: 6,
      },
      {
        codigo: 'suporte_ventilatorio',
        nome: 'Vaga com Suporte Ventilatório Invasivo',
        categoria: 'suporte',
        descricao: 'Respirador mecânico e monitorização hemodinâmica contínua',
        ativo: true,
        tempo_alvo_minutos: 45,
        ordem: 7,
      },
      {
        codigo: 'outro',
        nome: 'Outro Recurso Parametrizado',
        categoria: 'suporte',
        descricao: 'Recursos assistenciais e transferências excepcionais sob demanda',
        ativo: true,
        tempo_alvo_minutos: 360,
        ordem: 8,
      },
    ]

    for (const rec of recursosIniciais) {
      try {
        const record = new Record(recursosCol)
        record.set('codigo', rec.codigo)
        record.set('nome', rec.nome)
        record.set('categoria', rec.categoria)
        record.set('descricao', rec.descricao)
        record.set('ativo', rec.ativo)
        record.set('tempo_alvo_minutos', rec.tempo_alvo_minutos)
        record.set('ordem', rec.ordem)
        app.save(record)
      } catch (e) {
        console.log('Recurso já existente ou erro:', e)
      }
    }

    // 4. Seed inicial de destinos internos vinculados
    try {
      const setoresExistentes = app.findRecordsByFilter('setores', 'ativo = true', 'nome', 10, 0)
      let ordemDest = 1
      for (const setor of setoresExistentes) {
        try {
          const recDest = new Record(destinosCol)
          recDest.set('codigo', `DEST_${setor.getString('sigla') || setor.id.slice(0, 6)}`)
          recDest.set('nome', setor.getString('nome'))
          recDest.set('tipo', setor.getString('tipo') || 'enfermaria')
          recDest.set('setor_vinculado', setor.id)
          recDest.set('bloco_ala', setor.getString('sigla') || 'Geral')
          recDest.set('capacidade_operacional', setor.getInt('capacidade') || 10)
          recDest.set('ativo', true)
          recDest.set('ordem', ordemDest++)
          app.save(recDest)
        } catch (_) {}
      }
    } catch (_) {}
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('regulacao_destinos_internos'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('regulacao_catalogo_recursos'))
    } catch (_) {}
  },
)
