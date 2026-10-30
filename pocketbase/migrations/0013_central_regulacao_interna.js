migrate(
  (app) => {
    // -------------------------------------------------------------------------
    // CENTRAL DE REGULAÇÃO INTERNA MUNICIPAL
    // Controle interno municipal de encaminhamentos e transferências assistenciais.
    // Vinculadas a paciente e atendimento real (PA, internação ou ambulatorial).
    // Decisões humanas de prioridade e destino, sem ranking clínico automático.
    // Transições: solicitada -> em_avaliacao -> aceita / negada -> efetivada / cancelada.
    // Movimentação de leito ocorre APENAS no passo de confirmação/efetivação.
    // Mínimo privilégio: recepção consulta apenas view administrativa agregada.
    // -------------------------------------------------------------------------

    const pacientesColId = app.findCollectionByNameOrId('pacientes').id
    const profissionaisColId = app.findCollectionByNameOrId('profissionais').id
    const setoresColId = app.findCollectionByNameOrId('setores').id
    const leitosColId = app.findCollectionByNameOrId('leitos').id
    const internacoesColId = app.findCollectionByNameOrId('internacoes').id
    const paColId = app.findCollectionByNameOrId('pronto_atendimento').id

    // RLS:
    // Leitura clínica: admin, gestor, profissional
    // Escrita: admin, gestor, profissional (recepção bloqueada)
    // Delete: restrito a admin
    const assistencialReadRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')"
    const assistencialWriteRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')"
    const adminDeleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"

    // 1. Coleção principal: regulacao_solicitacoes
    const regulacaoCol = new Collection({
      name: 'regulacao_solicitacoes',
      type: 'base',
      listRule: assistencialReadRule,
      viewRule: assistencialReadRule,
      createRule: assistencialWriteRule,
      updateRule: assistencialWriteRule,
      deleteRule: adminDeleteRule,
      fields: [
        { name: 'numero_solicitacao', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          values: [
            'transferencia_interna',
            'transferencia_externa',
            'encaminhamento_especialidade',
          ],
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
        { name: 'paciente_nome', type: 'text', required: true },
        // Vínculo com atendimento de origem real (PA ou Internação)
        {
          name: 'atendimento_origem_tipo',
          type: 'select',
          values: ['pronto_atendimento', 'internacao', 'ambulatorial'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'atendimento_pa',
          type: 'relation',
          required: false,
          collectionId: paColId,
          maxSelect: 1,
        },
        {
          name: 'internacao',
          type: 'relation',
          required: false,
          collectionId: internacoesColId,
          maxSelect: 1,
        },
        // Origem
        {
          name: 'setor_origem',
          type: 'relation',
          required: false,
          collectionId: setoresColId,
          maxSelect: 1,
        },
        { name: 'setor_origem_nome', type: 'text', required: true },
        {
          name: 'leito_origem',
          type: 'relation',
          required: false,
          collectionId: leitosColId,
          maxSelect: 1,
        },
        { name: 'leito_origem_codigo', type: 'text', required: false },
        // Destino pretendido/designado (decisão humana)
        {
          name: 'setor_destino',
          type: 'relation',
          required: false,
          collectionId: setoresColId,
          maxSelect: 1,
        },
        { name: 'setor_destino_nome', type: 'text', required: false },
        {
          name: 'leito_destino',
          type: 'relation',
          required: false,
          collectionId: leitosColId,
          maxSelect: 1,
        },
        { name: 'leito_destino_codigo', type: 'text', required: false },
        { name: 'unidade_externa_destino', type: 'text', required: false }, // Quando for transferência externa municipal
        // Recurso solicitado
        {
          name: 'recurso_solicitado',
          type: 'select',
          values: [
            'leito_enfermaria_clinica',
            'leito_uti_adulto',
            'leito_isolamento',
            'leito_cirurgico',
            'avaliacao_especializada',
            'procedimento_urgencia',
            'suporte_ventilatorio',
            'outro',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'descricao_recurso', type: 'text', required: false },
        // Prioridade clínica definida e justificada pelo profissional humano (sem ranking automático)
        {
          name: 'prioridade',
          type: 'select',
          values: ['emergencia_vermelha', 'urgencia_amarela', 'prioritario_verde', 'eletivo_azul'],
          maxSelect: 1,
          required: true,
        },
        { name: 'justificativa_clinica', type: 'text', required: true },
        { name: 'diagnostico_principal', type: 'text', required: true },
        { name: 'cid10_codigo', type: 'text', required: false },
        { name: 'sinais_vitais_sumario', type: 'text', required: false },
        { name: 'condicoes_transporte', type: 'text', required: false }, // Ex: ambulância básica, UTI móvel, deambulando
        // Situação do fluxo
        {
          name: 'situacao',
          type: 'select',
          values: ['solicitada', 'em_avaliacao', 'aceita', 'negada', 'efetivada', 'cancelada'],
          maxSelect: 1,
          required: true,
        },
        // Profissional solicitante
        {
          name: 'profissional_solicitante',
          type: 'relation',
          required: false,
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'profissional_solicitante_nome', type: 'text', required: true },
        { name: 'profissional_solicitante_registro', type: 'text', required: false },
        { name: 'data_hora_solicitacao', type: 'text', required: true },
        // Avaliação pelo responsável regulador (decisão humana)
        {
          name: 'profissional_regulador',
          type: 'relation',
          required: false,
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'profissional_regulador_nome', type: 'text', required: false },
        { name: 'data_hora_avaliacao', type: 'text', required: false },
        {
          name: 'decisao_regulador',
          type: 'select',
          values: ['pendente', 'aceita', 'negada'],
          maxSelect: 1,
          required: false,
        },
        { name: 'motivo_decisao_regulador', type: 'text', required: false },
        // Efetivação / Confirmação da transferência real (movimenta leito/internação)
        { name: 'data_hora_efetivacao', type: 'text', required: false },
        { name: 'responsavel_efetivacao_nome', type: 'text', required: false },
        { name: 'observacoes_efetivacao', type: 'text', required: false },
        // Cancelamento
        { name: 'motivo_cancelamento', type: 'text', required: false },
        { name: 'data_hora_cancelamento', type: 'text', required: false },
        // Histórico auditado das mudanças de status / decisões
        { name: 'historico_transicoes', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_reg_num ON regulacao_solicitacoes (numero_solicitacao)',
        'CREATE INDEX idx_reg_paciente ON regulacao_solicitacoes (paciente)',
        'CREATE INDEX idx_reg_situacao ON regulacao_solicitacoes (situacao)',
        'CREATE INDEX idx_reg_data ON regulacao_solicitacoes (data_hora_solicitacao)',
        'CREATE INDEX idx_reg_recurso ON regulacao_solicitacoes (recurso_solicitado)',
        'CREATE INDEX idx_reg_prioridade ON regulacao_solicitacoes (prioridade)',
      ],
    })
    app.save(regulacaoCol)

    // 2. View administrativa para a recepção (Fila Administrativa de Regulação)
    // Permite que recepção e triagem acompanhem status de encaminhamentos sem expor
    // justificativa clínica, diagnóstico, CID, sinais vitais ou dados clínicos confidenciais.
    try {
      const viewRegAdmin = new Collection({
        name: 'regulacao_fila_administrativa',
        type: 'view',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        viewQuery: `
          SELECT
            id,
            numero_solicitacao,
            tipo,
            paciente_nome,
            atendimento_origem_tipo,
            setor_origem_nome,
            setor_destino_nome,
            unidade_externa_destino,
            recurso_solicitado,
            prioridade,
            situacao,
            decisao_regulador,
            data_hora_solicitacao,
            data_hora_avaliacao,
            data_hora_efetivacao,
            created,
            updated
          FROM regulacao_solicitacoes
        `,
      })
      app.save(viewRegAdmin)
    } catch (e) {
      console.log('Erro ao criar view regulacao_fila_administrativa:', e)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('regulacao_fila_administrativa'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('regulacao_solicitacoes'))
    } catch (_) {}
  },
)
