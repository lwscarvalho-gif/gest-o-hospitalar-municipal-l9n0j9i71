/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0029: Base Operacional de Transporte Sanitário Interno (Parte 1: Backend/Serviço)
 * Referência: ANEXO I - DOC-02 Seção 7.4.4.2 (pp. 27-29) e Cotação / Modelo Base
 *
 * Coleções criadas:
 * 1. `transporte_tipos_veiculo`:
 *    - Cadastro de tipos de veículos (ex: Ambulância Tipo A/B/C/D, Van, Micro-ônibus, Veículo Leve).
 * 2. `transporte_veiculos`:
 *    - Cadastro detalhado de veículos contendo: descricao, tipo, placa, marca, numero_chassi,
 *      ano, capacidade_lotacao, tipo_combustivel, data_validade_extintor, status, ativo, observacoes.
 * 3. `transporte_rotas`:
 *    - Cadastro de rotas com: descricao, municipio_saida, ativo, distancia_estimada_km, observacoes.
 * 4. `transporte_destinos`:
 *    - Cadastro de destinos com: nome, municipio_localizacao, telefone, endereco, ativo.
 * 5. `transporte_motoristas`:
 *    - Cadastro de motoristas contendo: nome, endereco, cpf, telefone, cep, municipio, complemento,
 *      tipo_veiculo_habilitado, cnh_numero, cnh_categoria, cnh_vencimento, ativo, observacoes.
 * 6. `transporte_viagens`:
 *    - Lançamento de viagens registrando: codigo_viagem, data_saida, data_retorno_previsto,
 *      data_retorno_real, tipo_viagem, status, motorista, veiculo, rota, destino,
 *      cidade_destino, local_destino, auxiliar_nome, km_inicial, km_final, km_rodado,
 *      empresa_terceirizada, dotacao_orcamentaria, recurso_financeiro, observacoes,
 *      usuario_autor_id, cancelado_por_id, motivo_cancelamento, data_cancelamento.
 * 7. `transporte_passageiros`:
 *    - Vínculo detalhado de passageiros à viagem com vagas separadas ida/volta:
 *      viagem, paciente, nome_completo, documento_tipo, documento_numero, telefone,
 *      tipo_passageiro ('paciente' | 'acompanhante'), paciente_vinculado (se for acompanhante),
 *      trecho ('ida' | 'volta' | 'ida_e_volta'), vagas_ida (0 ou 1), vagas_volta (0 ou 1),
 *      local_embarque, local_desembarque, horario_embarque_previsto, horario_desembarque_previsto,
 *      data_aviso_paciente, status ('agendado' | 'embarcado' | 'desembarcado' | 'nao_compareceu' | 'cancelado'),
 *      observacoes, usuario_autor_id, cancelado_por_id, motivo_cancelamento, idempotency_key.
 *
 * RLS:
 * - Recepção possui acesso administrativo para consultar e visualizar agendas e listas,
 *   mas dados clínicos sensíveis continuam protegidos no módulo assistencial/PEP.
 * - Escrita permitida para autenticados exceto exclusão física (deleção proibida por auditoria).
 */
migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'
    const pacientesColId = app.findCollectionByNameOrId('pacientes').id

    // ------------------------------------------------------------------------
    // 1. transporte_tipos_veiculo
    // ------------------------------------------------------------------------
    let tiposVeiculoCol
    try {
      tiposVeiculoCol = app.findCollectionByNameOrId('transporte_tipos_veiculo')
    } catch (_) {
      tiposVeiculoCol = new Collection({
        name: 'transporte_tipos_veiculo',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        updateRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        deleteRule: null,
        fields: [
          { name: 'nome', type: 'text', required: true, min: 2, max: 100 },
          { name: 'codigo', type: 'text', required: false, max: 30 },
          { name: 'descricao', type: 'text', required: false, max: 500 },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_transp_tipo_veic_ativo ON transporte_tipos_veiculo (ativo)'],
      })
      app.save(tiposVeiculoCol)
    }

    const tiposVeiculoColId = app.findCollectionByNameOrId('transporte_tipos_veiculo').id

    // ------------------------------------------------------------------------
    // 2. transporte_veiculos
    // ------------------------------------------------------------------------
    let veiculosCol
    try {
      veiculosCol = app.findCollectionByNameOrId('transporte_veiculos')
    } catch (_) {
      veiculosCol = new Collection({
        name: 'transporte_veiculos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        updateRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        deleteRule: null,
        fields: [
          { name: 'descricao', type: 'text', required: true, min: 2, max: 150 },
          {
            name: 'tipo',
            type: 'relation',
            collectionId: tiposVeiculoColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'placa', type: 'text', required: true, min: 7, max: 10 },
          { name: 'marca', type: 'text', required: false, max: 100 },
          { name: 'numero_chassi', type: 'text', required: false, max: 50 },
          { name: 'ano', type: 'number', required: false, onlyInt: true, min: 1950, max: 2100 },
          {
            name: 'capacidade_lotacao',
            type: 'number',
            required: true,
            onlyInt: true,
            min: 1,
            max: 200,
          },
          {
            name: 'tipo_combustivel',
            type: 'select',
            values: ['diesel', 'gasolina', 'etanol', 'flex', 'gnv', 'eletrico', 'outro'],
            maxSelect: 1,
            required: false,
          },
          {
            name: 'data_validade_extintor',
            type: 'text',
            required: false,
            min: 10,
            max: 10,
          },
          {
            name: 'status',
            type: 'select',
            values: ['disponivel', 'em_viagem', 'manutencao', 'indisponivel', 'inativo'],
            maxSelect: 1,
            required: true,
          },
          { name: 'motivo_indisponibilidade', type: 'text', required: false, max: 500 },
          { name: 'ativo', type: 'bool' },
          { name: 'observacoes', type: 'text', required: false, max: 1000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_transp_veiculos_placa ON transporte_veiculos (placa)',
          'CREATE INDEX idx_transp_veiculos_status ON transporte_veiculos (status, ativo)',
        ],
      })
      app.save(veiculosCol)
    }

    const veiculosColId = app.findCollectionByNameOrId('transporte_veiculos').id

    // ------------------------------------------------------------------------
    // 3. transporte_rotas
    // ------------------------------------------------------------------------
    let rotasCol
    try {
      rotasCol = app.findCollectionByNameOrId('transporte_rotas')
    } catch (_) {
      rotasCol = new Collection({
        name: 'transporte_rotas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        updateRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        deleteRule: null,
        fields: [
          { name: 'descricao', type: 'text', required: true, min: 2, max: 150 },
          { name: 'municipio_saida', type: 'text', required: true, min: 2, max: 100 },
          { name: 'ativo', type: 'bool' },
          {
            name: 'distancia_estimada_km',
            type: 'number',
            required: false,
            min: 0,
            max: 10000,
          },
          { name: 'observacoes', type: 'text', required: false, max: 1000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_transp_rotas_ativo ON transporte_rotas (ativo)',
          'CREATE INDEX idx_transp_rotas_saida ON transporte_rotas (municipio_saida)',
        ],
      })
      app.save(rotasCol)
    }

    const rotasColId = app.findCollectionByNameOrId('transporte_rotas').id

    // ------------------------------------------------------------------------
    // 4. transporte_destinos
    // ------------------------------------------------------------------------
    let destinosCol
    try {
      destinosCol = app.findCollectionByNameOrId('transporte_destinos')
    } catch (_) {
      destinosCol = new Collection({
        name: 'transporte_destinos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        updateRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        deleteRule: null,
        fields: [
          { name: 'nome', type: 'text', required: true, min: 2, max: 150 },
          { name: 'municipio_localizacao', type: 'text', required: true, min: 2, max: 100 },
          { name: 'telefone', type: 'text', required: false, max: 30 },
          { name: 'endereco', type: 'text', required: false, max: 200 },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_transp_destinos_ativo ON transporte_destinos (ativo)',
          'CREATE INDEX idx_transp_destinos_mun ON transporte_destinos (municipio_localizacao)',
        ],
      })
      app.save(destinosCol)
    }

    const destinosColId = app.findCollectionByNameOrId('transporte_destinos').id

    // ------------------------------------------------------------------------
    // 5. transporte_motoristas
    // ------------------------------------------------------------------------
    let motoristasCol
    try {
      motoristasCol = app.findCollectionByNameOrId('transporte_motoristas')
    } catch (_) {
      motoristasCol = new Collection({
        name: 'transporte_motoristas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        updateRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        deleteRule: null,
        fields: [
          { name: 'nome', type: 'text', required: true, min: 2, max: 150 },
          { name: 'cpf', type: 'text', required: true, min: 11, max: 14 },
          { name: 'telefone', type: 'text', required: false, max: 30 },
          { name: 'endereco', type: 'text', required: false, max: 200 },
          { name: 'cep', type: 'text', required: false, max: 10 },
          { name: 'municipio', type: 'text', required: false, max: 100 },
          { name: 'complemento', type: 'text', required: false, max: 100 },
          { name: 'tipo_veiculo_habilitado', type: 'text', required: false, max: 150 },
          { name: 'cnh_numero', type: 'text', required: true, min: 5, max: 30 },
          { name: 'cnh_categoria', type: 'text', required: true, min: 1, max: 5 },
          { name: 'cnh_vencimento', type: 'text', required: true, min: 10, max: 10 },
          { name: 'ativo', type: 'bool' },
          { name: 'observacoes', type: 'text', required: false, max: 1000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_transp_mot_cpf ON transporte_motoristas (cpf)',
          'CREATE INDEX idx_transp_mot_ativo ON transporte_motoristas (ativo)',
          'CREATE INDEX idx_transp_mot_cnh_venc ON transporte_motoristas (cnh_vencimento)',
        ],
      })
      app.save(motoristasCol)
    }

    const motoristasColId = app.findCollectionByNameOrId('transporte_motoristas').id

    // ------------------------------------------------------------------------
    // 6. transporte_viagens
    // ------------------------------------------------------------------------
    let viagensCol
    try {
      viagensCol = app.findCollectionByNameOrId('transporte_viagens')
    } catch (_) {
      viagensCol = new Collection({
        name: 'transporte_viagens',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        updateRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        deleteRule: null,
        fields: [
          { name: 'codigo_viagem', type: 'text', required: true, min: 1, max: 50 },
          { name: 'data_saida', type: 'text', required: true, min: 16, max: 25 },
          { name: 'data_retorno_previsto', type: 'text', required: true, min: 16, max: 25 },
          { name: 'data_retorno_real', type: 'text', required: false, max: 25 },
          {
            name: 'tipo_viagem',
            type: 'select',
            values: [
              'sanitario_eletivo',
              'urgencia_emergencia',
              'tfd_intermunicipal',
              'administrativo',
              'outro',
            ],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'status',
            type: 'select',
            values: ['programada', 'em_transito', 'concluida', 'cancelada'],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'motorista',
            type: 'relation',
            collectionId: motoristasColId,
            required: true,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'veiculo',
            type: 'relation',
            collectionId: veiculosColId,
            required: true,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'rota',
            type: 'relation',
            collectionId: rotasColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'destino',
            type: 'relation',
            collectionId: destinosColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'cidade_destino', type: 'text', required: true, min: 2, max: 100 },
          { name: 'local_destino', type: 'text', required: false, max: 150 },
          { name: 'auxiliar_nome', type: 'text', required: false, max: 150 },
          { name: 'km_inicial', type: 'number', required: false, min: 0 },
          { name: 'km_final', type: 'number', required: false, min: 0 },
          { name: 'km_rodado', type: 'number', required: false, min: 0 },
          { name: 'empresa_terceirizada', type: 'text', required: false, max: 150 },
          { name: 'dotacao_orcamentaria', type: 'text', required: false, max: 100 },
          { name: 'recurso_financeiro', type: 'text', required: false, max: 100 },
          { name: 'observacoes', type: 'text', required: false, max: 1000 },
          {
            name: 'usuario_autor_id',
            type: 'relation',
            collectionId: usersColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'cancelado_por_id',
            type: 'relation',
            collectionId: usersColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'motivo_cancelamento', type: 'text', required: false, max: 1000 },
          { name: 'data_cancelamento', type: 'text', required: false, max: 30 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_transp_viag_codigo ON transporte_viagens (codigo_viagem)',
          'CREATE INDEX idx_transp_viag_status ON transporte_viagens (status, data_saida)',
          'CREATE INDEX idx_transp_viag_veic ON transporte_viagens (veiculo, data_saida)',
          'CREATE INDEX idx_transp_viag_mot ON transporte_viagens (motorista, data_saida)',
        ],
      })
      app.save(viagensCol)
    }

    const viagensColId = app.findCollectionByNameOrId('transporte_viagens').id

    // ------------------------------------------------------------------------
    // 7. transporte_passageiros
    // ------------------------------------------------------------------------
    let passageirosCol
    try {
      passageirosCol = app.findCollectionByNameOrId('transporte_passageiros')
    } catch (_) {
      passageirosCol = new Collection({
        name: 'transporte_passageiros',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        updateRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        deleteRule: null,
        fields: [
          {
            name: 'viagem',
            type: 'relation',
            collectionId: viagensColId,
            required: true,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'paciente',
            type: 'relation',
            collectionId: pacientesColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'nome_completo', type: 'text', required: true, min: 2, max: 150 },
          { name: 'documento_tipo', type: 'text', required: false, max: 20 },
          { name: 'documento_numero', type: 'text', required: false, max: 30 },
          { name: 'telefone', type: 'text', required: false, max: 30 },
          {
            name: 'tipo_passageiro',
            type: 'select',
            values: ['paciente', 'acompanhante'],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'trecho',
            type: 'select',
            values: ['ida', 'volta', 'ida_e_volta'],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'vagas_ida',
            type: 'number',
            required: false,
            onlyInt: true,
            min: 0,
            max: 10,
          },
          {
            name: 'vagas_volta',
            type: 'number',
            required: false,
            onlyInt: true,
            min: 0,
            max: 10,
          },
          { name: 'local_embarque', type: 'text', required: false, max: 150 },
          { name: 'local_desembarque', type: 'text', required: false, max: 150 },
          { name: 'horario_embarque_previsto', type: 'text', required: false, max: 30 },
          { name: 'horario_desembarque_previsto', type: 'text', required: false, max: 30 },
          { name: 'data_aviso_paciente', type: 'text', required: false, max: 30 },
          {
            name: 'status',
            type: 'select',
            values: ['agendado', 'embarcado', 'desembarcado', 'nao_compareceu', 'cancelado'],
            maxSelect: 1,
            required: true,
          },
          { name: 'observacoes', type: 'text', required: false, max: 1000 },
          {
            name: 'usuario_autor_id',
            type: 'relation',
            collectionId: usersColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'cancelado_por_id',
            type: 'relation',
            collectionId: usersColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'motivo_cancelamento', type: 'text', required: false, max: 1000 },
          { name: 'data_cancelamento', type: 'text', required: false, max: 30 },
          { name: 'idempotency_key', type: 'text', required: false, max: 100 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_transp_pass_viagem ON transporte_passageiros (viagem, status)',
          'CREATE INDEX idx_transp_pass_paciente ON transporte_passageiros (paciente)',
          'CREATE INDEX idx_transp_pass_idemp ON transporte_passageiros (idempotency_key)',
        ],
      })
      app.save(passageirosCol)
    }

    // Auto-relação reflexiva para paciente_vinculado (no caso de acompanhante referenciar outro passageiro da mesma viagem)
    const passCriado = app.findCollectionByNameOrId('transporte_passageiros')
    if (!passCriado.fields.getByName('paciente_vinculado')) {
      passCriado.fields.add(
        new RelationField({
          name: 'paciente_vinculado',
          collectionId: passCriado.id,
          required: false,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      app.save(passCriado)
    }
  },
  (app) => {
    const tabelas = [
      'transporte_passageiros',
      'transporte_viagens',
      'transporte_motoristas',
      'transporte_destinos',
      'transporte_rotas',
      'transporte_veiculos',
      'transporte_tipos_veiculo',
    ]

    for (let i = 0; i < tabelas.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(tabelas[i])
        if (col) app.delete(col)
      } catch (_) {}
    }
  },
)
