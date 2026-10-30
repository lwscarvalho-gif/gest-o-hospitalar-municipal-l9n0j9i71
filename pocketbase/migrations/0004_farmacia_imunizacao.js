migrate(
  (app) => {
    const pacientesColId = app.findCollectionByNameOrId('pacientes').id
    const profissionaisColId = app.findCollectionByNameOrId('profissionais').id

    // 1. Catálogo de Itens da Farmácia (medicamentos e materiais)
    const farmaciaItens = new Collection({
      name: 'farmacia_itens',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          values: ['medicamento', 'material'],
          maxSelect: 1,
          required: true,
        },
        { name: 'principio_ativo', type: 'text' },
        { name: 'apresentacao', type: 'text' }, // ex: Comprimido 500mg, Frasco 100ml, Ampola 2ml
        {
          name: 'unidade_medida',
          type: 'select',
          values: ['comprimido', 'ampola', 'frasco', 'unidade', 'caixa', 'envelope', 'tubo'],
          maxSelect: 1,
          required: true,
        },
        { name: 'lote', type: 'text' },
        { name: 'validade', type: 'text' }, // AAAA-MM-DD
        { name: 'estoque_atual', type: 'number', min: 0 },
        { name: 'estoque_minimo', type: 'number', min: 0 },
        { name: 'ativo', type: 'bool' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_farmacia_nome ON farmacia_itens (nome)',
        'CREATE INDEX idx_farmacia_tipo ON farmacia_itens (tipo)',
      ],
    })
    app.save(farmaciaItens)

    const farmaciaItensColId = app.findCollectionByNameOrId('farmacia_itens').id

    // 2. Dispensação e Remessas da Farmácia
    const farmaciaDispensacoes = new Collection({
      name: 'farmacia_dispensacoes',
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
          name: 'item',
          type: 'relation',
          required: true,
          collectionId: farmaciaItensColId,
          maxSelect: 1,
        },
        { name: 'quantidade', type: 'number', min: 1, required: true },
        { name: 'lote', type: 'text' },
        { name: 'prescricao_origem', type: 'text' }, // ex: Dr. Marcos - PA 10/05
        { name: 'profissional_dispensador', type: 'text' }, // quem fez a entrega
        { name: 'data_dispensacao', type: 'text', required: true }, // AAAA-MM-DD ou AAAA-MM-DD HH:mm
        {
          name: 'tipo_movimento',
          type: 'select',
          values: ['dispensacao_paciente', 'remessa_setor'],
          maxSelect: 1,
          required: true,
        },
        { name: 'setor_destino', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_disp_paciente ON farmacia_dispensacoes (paciente)',
        'CREATE INDEX idx_disp_item ON farmacia_dispensacoes (item)',
        'CREATE INDEX idx_disp_data ON farmacia_dispensacoes (data_dispensacao)',
      ],
    })
    app.save(farmaciaDispensacoes)

    // 3. Catálogo de Vacinas (Imunização)
    const vacinas = new Collection({
      name: 'vacinas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'fabricante', type: 'text' },
        { name: 'indicacao', type: 'text' }, // ex: Prevenção contra Influenza / Febre Amarela / Covid-19
        {
          name: 'via_administracao',
          type: 'select',
          values: ['intramuscular', 'subcutanea', 'intradermica', 'oral'],
          maxSelect: 1,
          required: true,
        },
        { name: 'lote_padrao', type: 'text' },
        { name: 'validade_lote', type: 'text' },
        { name: 'doses_previstas', type: 'number', min: 1 }, // total usual (ex: 2 doses, 3 doses, dose única)
        { name: 'estoque_doses', type: 'number', min: 0 },
        { name: 'ativo', type: 'bool' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_vacinas_nome ON vacinas (nome)'],
    })
    app.save(vacinas)

    const vacinasColId = app.findCollectionByNameOrId('vacinas').id

    // 4. Registro de Aplicação de Vacina (Imunização individual)
    const imunizacaoRegistros = new Collection({
      name: 'imunizacao_registros',
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
          name: 'vacina',
          type: 'relation',
          required: true,
          collectionId: vacinasColId,
          maxSelect: 1,
        },
        {
          name: 'dose',
          type: 'select',
          values: ['1a_dose', '2a_dose', '3a_dose', 'reforco', 'anual', 'dose_unica'],
          maxSelect: 1,
          required: true,
        },
        { name: 'lote', type: 'text', required: true },
        { name: 'validade_lote', type: 'text' },
        { name: 'data_aplicacao', type: 'text', required: true }, // AAAA-MM-DD
        {
          name: 'profissional_aplicador',
          type: 'relation',
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'aplicador_nome', type: 'text' }, // fallback ou preenchimento rápido
        { name: 'local_aplicacao', type: 'text' }, // ex: Deltoide D, Vasto lateral
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_imun_paciente ON imunizacao_registros (paciente)',
        'CREATE INDEX idx_imun_vacina ON imunizacao_registros (vacina)',
        'CREATE INDEX idx_imun_data ON imunizacao_registros (data_aplicacao)',
      ],
    })
    app.save(imunizacaoRegistros)

    // Seeds de exemplo: Farmácia e Vacinas para demonstração imediata
    try {
      const itensCol = app.findCollectionByNameOrId('farmacia_itens')
      const vacCol = app.findCollectionByNameOrId('vacinas')
      const regCol = app.findCollectionByNameOrId('imunizacao_registros')
      const dispCol = app.findCollectionByNameOrId('farmacia_dispensacoes')

      const pacientes = app.findRecordsByFilter('pacientes', '', 'nome', 5, 0)
      const profissionais = app.findRecordsByFilter('profissionais', '', 'nome', 5, 0)

      // 1. Itens da Farmácia
      const item1 = new Record(itensCol)
      item1.set('nome', 'Dipirona Sódica 500mg')
      item1.set('tipo', 'medicamento')
      item1.set('principio_ativo', 'Dipirona Sódica')
      item1.set('apresentacao', 'Comprimido 500mg')
      item1.set('unidade_medida', 'comprimido')
      item1.set('lote', 'DIP2024-A1')
      item1.set('validade', '2026-12-31')
      item1.set('estoque_atual', 480)
      item1.set('estoque_minimo', 100)
      item1.set('ativo', true)
      item1.set('observacoes', 'Analgésico e antipirético de uso hospitalar e ambulatorial')
      app.save(item1)

      const item2 = new Record(itensCol)
      item2.set('nome', 'Amoxicilina + Clavulanato 500/125mg')
      item2.set('tipo', 'medicamento')
      item2.set('principio_ativo', 'Amoxicilina + Clavulanato de Potássio')
      item2.set('apresentacao', 'Comprimido revestido')
      item2.set('unidade_medida', 'comprimido')
      item2.set('lote', 'AMX2024-C3')
      item2.set('validade', '2025-08-30')
      item2.set('estoque_atual', 250)
      item2.set('estoque_minimo', 50)
      item2.set('ativo', true)
      item2.set('observacoes', 'Antibiótico de amplo espectro')
      app.save(item2)

      const item3 = new Record(itensCol)
      item3.set('nome', 'Seringa Descartável 5ml com Agulha 25x7')
      item3.set('tipo', 'material')
      item3.set('principio_ativo', 'Polipropileno hospitalar estéril')
      item3.set('apresentacao', 'Embalagem individual estéril')
      item3.set('unidade_medida', 'unidade')
      item3.set('lote', 'SRG5-2024')
      item3.set('validade', '2028-05-01')
      item3.set('estoque_atual', 600)
      item3.set('estoque_minimo', 150)
      item3.set('ativo', true)
      item3.set('observacoes', 'Material de consumo básico enfermagem')
      app.save(item3)

      const item4 = new Record(itensCol)
      item4.set('nome', 'Soro Fisiológico 0,9% 500ml')
      item4.set('tipo', 'medicamento')
      item4.set('principio_ativo', 'Cloreto de Sódio 0,9%')
      item4.set('apresentacao', 'Bolsa flexível 500ml')
      item4.set('unidade_medida', 'frasco')
      item4.set('lote', 'SF500-88')
      item4.set('validade', '2026-03-20')
      item4.set('estoque_atual', 190)
      item4.set('estoque_minimo', 60)
      item4.set('ativo', true)
      item4.set('observacoes', 'Hidratação e diluição parenteral')
      app.save(item4)

      // 2. Dispensação inicial de exemplo
      if (pacientes.length > 0) {
        const hoje = new Date().toISOString().slice(0, 10)
        const disp = new Record(dispCol)
        disp.set('paciente', pacientes[0].id)
        disp.set('item', item1.id)
        disp.set('quantidade', 20)
        disp.set('lote', 'DIP2024-A1')
        disp.set('prescricao_origem', 'Receituário PA Municipal nº 1042')
        disp.set('profissional_dispensador', 'Farmácia Central / Recepção')
        disp.set('data_dispensacao', hoje + ' 09:30')
        disp.set('tipo_movimento', 'dispensacao_paciente')
        disp.set('observacoes', '1 comp 6/6h em caso de dor ou febre')
        app.save(disp)
      }

      // 3. Catálogo de Vacinas
      const v1 = new Record(vacCol)
      v1.set('nome', 'Influenza Trivalente (Gripe)')
      v1.set('fabricante', 'Instituto Butantan')
      v1.set('indicacao', 'Imunização contra vírus Influenza subtipos A (H1N1, H3N2) e B')
      v1.set('via_administracao', 'intramuscular')
      v1.set('lote_padrao', 'INF2024-B1')
      v1.set('validade_lote', '2025-04-30')
      v1.set('doses_previstas', 1)
      v1.set('estoque_doses', 180)
      v1.set('ativo', true)
      v1.set('observacoes', 'Campanha Anual de Vacinação Mirante da Serra')
      app.save(v1)

      const v2 = new Record(vacCol)
      v2.set('nome', 'Hepatite B Recombinante')
      v2.set('fabricante', 'Bio-Manguinhos / Fiocruz')
      v2.set('indicacao', 'Prevenção da infecção pelo vírus da hepatite B')
      v2.set('via_administracao', 'intramuscular')
      v2.set('lote_padrao', 'HPB2023-F9')
      v2.set('validade_lote', '2026-01-15')
      v2.set('doses_previstas', 3)
      v2.set('estoque_doses', 95)
      v2.set('ativo', true)
      v2.set('observacoes', 'Esquema de 3 doses (0, 1 e 6 meses)')
      app.save(v2)

      const v3 = new Record(vacCol)
      v3.set('nome', 'Febre Amarela (Atenuada)')
      v3.set('fabricante', 'Bio-Manguinhos / Fiocruz')
      v3.set('indicacao', 'Prevenção contra febre amarela em área endêmica de Rondônia')
      v3.set('via_administracao', 'subcutanea')
      v3.set('lote_padrao', 'FA2024-M4')
      v3.set('validade_lote', '2025-11-20')
      v3.set('doses_previstas', 1)
      v3.set('estoque_doses', 120)
      v3.set('ativo', true)
      v3.set('observacoes', 'Dose única com reforço conforme PNI municipal')
      app.save(v3)

      const v4 = new Record(vacCol)
      v4.set('nome', 'dT (Dupla Adulto - Difteria e Tétano)')
      v4.set('fabricante', 'Instituto Butantan')
      v4.set('indicacao', 'Imunização contra difteria e tétano acidental')
      v4.set('via_administracao', 'intramuscular')
      v4.set('lote_padrao', 'DT2024-K2')
      v4.set('validade_lote', '2026-08-10')
      v4.set('doses_previstas', 3)
      v4.set('estoque_doses', 140)
      v4.set('ativo', true)
      v4.set('observacoes', 'Reforço a cada 10 anos')
      app.save(v4)

      // 4. Registro de aplicação inicial no paciente 0
      if (pacientes.length > 0) {
        const hoje = new Date().toISOString().slice(0, 10)
        const apl = new Record(regCol)
        apl.set('paciente', pacientes[0].id)
        apl.set('vacina', v1.id)
        apl.set('dose', 'anual')
        apl.set('lote', 'INF2024-B1')
        apl.set('validade_lote', '2025-04-30')
        apl.set('data_aplicacao', hoje)
        if (profissionais.length > 0) {
          apl.set('profissional_aplicador', profissionais[0].id)
          apl.set('aplicador_nome', profissionais[0].getString('nome'))
        } else {
          apl.set('aplicador_nome', 'Enfermeira Sala de Vacina')
        }
        apl.set('local_aplicacao', 'Deltoide Esquerdo')
        apl.set('observacoes', 'Sem intercorrências pós-vacinais imediatas')
        app.save(apl)
      }
    } catch (e) {
      console.log('Aviso ao semear Farmácia e Vacinas:', e)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('imunizacao_registros'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('vacinas'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('farmacia_dispensacoes'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('farmacia_itens'))
    } catch (_) {}
  },
)
