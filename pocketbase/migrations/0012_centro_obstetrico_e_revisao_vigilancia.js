migrate(
  (app) => {
    // -------------------------------------------------------------------------
    // FRENTE 1: REVISÃO DE PRIVACIDADE DA VIGILÂNCIA EM SAÚDE
    // Restringir a leitura da coleção notificacoes_vigilancia para que recepção
    // não leia diretamente os registros clínicos sensíveis (apenas admin, gestor e profissional).
    // Para a recepção, cria-se uma view administrativa agregada/resumida sem campos clínicos de terceiros.
    // -------------------------------------------------------------------------
    try {
      const colNotif = app.findCollectionByNameOrId('notificacoes_vigilancia')
      // Regra de list e view fechada para clínico/assistencial: admin, gestor, profissional
      const assistencialReadRule =
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')"
      colNotif.listRule = assistencialReadRule
      colNotif.viewRule = assistencialReadRule
      app.save(colNotif)
    } catch (e) {
      console.log('Erro ao atualizar regras de notificacoes_vigilancia:', e)
    }

    // Criar View Administrativa da Vigilância para Recepção / Fila Administrativa
    // Apenas identificadores administrativos: id, numero_notificacao, tipo_vigilancia, periodicidade, situacao, data_notificacao, unidade_notificadora
    // Sem agravo, sem cid10, sem observacoes_investigacao, sem historico_investigacao, sem nome ou cpf de terceiros
    try {
      const viewVigAdmin = new Collection({
        name: 'vigilancia_fila_administrativa',
        type: 'view',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        viewQuery: `
          SELECT
            id,
            numero_notificacao,
            tipo_vigilancia,
            periodicidade,
            situacao,
            data_notificacao,
            unidade_notificadora,
            created,
            updated
          FROM notificacoes_vigilancia
        `,
      })
      app.save(viewVigAdmin)
    } catch (e) {
      console.log('Erro ao criar view vigilancia_fila_administrativa:', e)
    }

    // -------------------------------------------------------------------------
    // FRENTE 2: CENTRO OBSTÉTRICO
    // Coleções:
    // 1. obstetrica_admissoes
    // 2. obstetrica_trabalho_parto (cronologia do trabalho de parto)
    // 3. obstetrica_partos (registro do parto/nascimento)
    // 4. obstetrica_recem_nascidos (registro do RN vinculado à mãe e ao parto)
    // 5. obstetrica_desfechos_altas (desfecho materno e alta com desocupação de leito)
    // -------------------------------------------------------------------------

    const pacientesColId = app.findCollectionByNameOrId('pacientes').id
    const internacoesColId = app.findCollectionByNameOrId('internacoes').id
    const profissionaisColId = app.findCollectionByNameOrId('profissionais').id
    const leitosColId = app.findCollectionByNameOrId('leitos').id

    // RLS:
    // Leitura: admin, gestor, profissional. Recepção pode consultar resumo administrativo básico
    // Escrita (create/update): ESTRITAMENTE admin, gestor, profissional (recepção bloqueada)
    // Delete: admin
    const assistencialReadRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')"
    const assistencialWriteRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')"
    const adminOnlyDeleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"

    // 1. Admissão Obstétrica
    const admissoesObstetricas = new Collection({
      name: 'obstetrica_admissoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: assistencialWriteRule,
      updateRule: assistencialWriteRule,
      deleteRule: adminOnlyDeleteRule,
      fields: [
        {
          name: 'numero_admissao',
          type: 'text',
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
        {
          name: 'internacao',
          type: 'relation',
          required: false,
          collectionId: internacoesColId,
          maxSelect: 1,
        },
        {
          name: 'leito',
          type: 'relation',
          required: false,
          collectionId: leitosColId,
          maxSelect: 1,
        },
        { name: 'leito_codigo', type: 'text', required: false },
        { name: 'data_hora_admissao', type: 'text', required: true },
        // Histórico obstétrico prévio preenchido pelo profissional
        { name: 'gravidez_planejada', type: 'bool', required: false },
        { name: 'gesta_previa', type: 'number', required: false },
        { name: 'para_previa', type: 'number', required: false },
        { name: 'abortos_previos', type: 'number', required: false },
        { name: 'cesareas_previas', type: 'number', required: false },
        // Idade Gestacional informada pelo profissional (SEM calculadoras ou limiares automáticos)
        { name: 'idade_gestacional_semanas', type: 'number', required: false },
        { name: 'idade_gestacional_dias', type: 'number', required: false },
        { name: 'dum_informada', type: 'text', required: false }, // Data da Última Menstruação informada
        { name: 'dpp_informada', type: 'text', required: false }, // Data Provável do Parto informada
        // Risco obstétrico: campo digitado/selecionado pelo profissional (SEM escores automáticos)
        {
          name: 'risco_obstetrico_informado',
          type: 'select',
          values: ['habitual', 'alto_risco', 'nao_informado'],
          maxSelect: 1,
          required: false,
        },
        { name: 'justificativa_risco_profissional', type: 'text', required: false },
        { name: 'motivo_admissao', type: 'text', required: true },
        { name: 'sinais_sintomas_admissao', type: 'text', required: false },
        { name: 'sinais_vitais_admissao', type: 'text', required: false },
        { name: 'batimentos_cardiofetais_bcf', type: 'text', required: false },
        { name: 'dinamica_uterina', type: 'text', required: false },
        { name: 'dilatacao_cervical_cm', type: 'text', required: false },
        { name: 'bolsa_amniotica', type: 'text', required: false }, // íntegra, rota, aspecto informado
        {
          name: 'status_admissao',
          type: 'select',
          values: ['em_trabalho_parto', 'em_observacao', 'parto_realizado', 'alta', 'transferida'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'profissional_responsavel',
          type: 'relation',
          required: false,
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'profissional_nome', type: 'text', required: true },
        { name: 'observacoes_admissao', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_obs_adm_num ON obstetrica_admissoes (numero_admissao)',
        'CREATE INDEX idx_obs_adm_paciente ON obstetrica_admissoes (paciente)',
        'CREATE INDEX idx_obs_adm_status ON obstetrica_admissoes (status_admissao)',
        'CREATE INDEX idx_obs_adm_data ON obstetrica_admissoes (data_hora_admissao)',
      ],
    })
    app.save(admissoesObstetricas)

    const admissoesColId = app.findCollectionByNameOrId('obstetrica_admissoes').id

    // 2. Registros do Trabalho de Parto (Cronologia/Evolução horária)
    const trabalhoParto = new Collection({
      name: 'obstetrica_trabalho_parto',
      type: 'base',
      listRule: assistencialReadRule,
      viewRule: assistencialReadRule,
      createRule: assistencialWriteRule,
      updateRule: assistencialWriteRule,
      deleteRule: adminOnlyDeleteRule,
      fields: [
        {
          name: 'admissao_obstetrica',
          type: 'relation',
          required: true,
          collectionId: admissoesColId,
          maxSelect: 1,
        },
        {
          name: 'paciente',
          type: 'relation',
          required: true,
          collectionId: pacientesColId,
          maxSelect: 1,
        },
        { name: 'data_hora_registro', type: 'text', required: true },
        // Parâmetros clínicos informados pelo profissional (SEM cálculo de risco ou limiares)
        { name: 'dilatacao_cervical_cm', type: 'text', required: false },
        { name: 'apagamento_cervical_percentual', type: 'text', required: false },
        { name: 'altura_apresentacao_de_lee', type: 'text', required: false },
        { name: 'variedade_posicao', type: 'text', required: false },
        { name: 'dinamica_uterina_freq_duracao', type: 'text', required: false },
        { name: 'batimentos_cardiofetais_bcf', type: 'text', required: false },
        { name: 'bolsa_aspecto_liquido', type: 'text', required: false },
        { name: 'pressao_arterial', type: 'text', required: false },
        { name: 'frequencia_cardiaca_materna', type: 'text', required: false },
        { name: 'temperatura_axilar', type: 'text', required: false },
        // Métodos não-farmacológicos e conduta digitados pelo profissional
        { name: 'metodos_alivio_dor_informados', type: 'text', required: false },
        { name: 'medicamentos_administrados', type: 'text', required: false },
        { name: 'evolucao_anotacao_profissional', type: 'text', required: true },
        {
          name: 'profissional_registro',
          type: 'relation',
          required: false,
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'profissional_nome', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_obs_tp_adm ON obstetrica_trabalho_parto (admissao_obstetrica)',
        'CREATE INDEX idx_obs_tp_paciente ON obstetrica_trabalho_parto (paciente)',
        'CREATE INDEX idx_obs_tp_data ON obstetrica_trabalho_parto (data_hora_registro)',
      ],
    })
    app.save(trabalhoParto)

    // 3. Registros de Parto / Nascimento
    const partos = new Collection({
      name: 'obstetrica_partos',
      type: 'base',
      listRule: assistencialReadRule,
      viewRule: assistencialReadRule,
      createRule: assistencialWriteRule,
      updateRule: assistencialWriteRule,
      deleteRule: adminOnlyDeleteRule,
      fields: [
        {
          name: 'admissao_obstetrica',
          type: 'relation',
          required: true,
          collectionId: admissoesColId,
          maxSelect: 1,
        },
        {
          name: 'paciente_mae',
          type: 'relation',
          required: true,
          collectionId: pacientesColId,
          maxSelect: 1,
        },
        { name: 'paciente_mae_nome', type: 'text', required: true },
        { name: 'data_hora_parto', type: 'text', required: true },
        {
          name: 'tipo_parto',
          type: 'select',
          values: [
            'vaginal_espontaneo',
            'vaginal_instrumentado',
            'cesarea_eletiva',
            'cesarea_urgencia',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'indicacao_tipo_parto', type: 'text', required: false },
        { name: 'posicao_parto', type: 'text', required: false },
        { name: 'anestesia_analgesia_utilizada', type: 'text', required: false },
        { name: 'episiotomia_laceracao', type: 'text', required: false },
        { name: 'perineorrafia_sutura', type: 'text', required: false },
        { name: 'dequitacao_placenta_tempo_modo', type: 'text', required: false },
        { name: 'sangramento_estimado_ml', type: 'number', required: false },
        { name: 'intercorrencias_maternas', type: 'text', required: false },
        { name: 'contato_pele_a_pele_imediato', type: 'bool', required: false },
        { name: 'amamentacao_primeira_hora', type: 'bool', required: false },
        { name: 'clampeamento_cordao_oportuno', type: 'bool', required: false },
        {
          name: 'medico_obstetra',
          type: 'relation',
          required: false,
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'medico_obstetra_nome', type: 'text', required: true },
        { name: 'enfermeiro_obstetra_nome', type: 'text', required: false },
        { name: 'pediatra_neonatologista_nome', type: 'text', required: false },
        { name: 'observacoes_parto', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_obs_parto_adm ON obstetrica_partos (admissao_obstetrica)',
        'CREATE INDEX idx_obs_parto_mae ON obstetrica_partos (paciente_mae)',
        'CREATE INDEX idx_obs_parto_data ON obstetrica_partos (data_hora_parto)',
      ],
    })
    app.save(partos)

    const partosColId = app.findCollectionByNameOrId('obstetrica_partos').id

    // 4. Recém-Nascidos (Vínculo mãe-RN, dados informados pelo profissional, sem cálculos automáticos)
    const recemNascidos = new Collection({
      name: 'obstetrica_recem_nascidos',
      type: 'base',
      listRule: assistencialReadRule,
      viewRule: assistencialReadRule,
      createRule: assistencialWriteRule,
      updateRule: assistencialWriteRule,
      deleteRule: adminOnlyDeleteRule,
      fields: [
        {
          name: 'parto',
          type: 'relation',
          required: true,
          collectionId: partosColId,
          maxSelect: 1,
        },
        {
          name: 'admissao_obstetrica',
          type: 'relation',
          required: true,
          collectionId: admissoesColId,
          maxSelect: 1,
        },
        {
          name: 'mae_paciente',
          type: 'relation',
          required: true,
          collectionId: pacientesColId,
          maxSelect: 1,
        },
        { name: 'mae_nome', type: 'text', required: true },
        { name: 'identificacao_rn', type: 'text', required: true }, // Ex: "RN de Maria Silva - Gemelar 1" ou "RN Maria Silva"
        { name: 'data_hora_nascimento', type: 'text', required: true },
        {
          name: 'sexo',
          type: 'select',
          values: ['masculino', 'feminino', 'indeterminado'],
          maxSelect: 1,
          required: true,
        },
        // Medidas e peso informados pelo profissional (valores antropométricos digitados)
        { name: 'peso_gramas', type: 'number', required: true },
        { name: 'comprimento_cm', type: 'number', required: false },
        { name: 'perimetro_cefalico_cm', type: 'number', required: false },
        { name: 'perimetro_toracico_cm', type: 'number', required: false },
        // Apgar digitado pelo profissional em 1º e 5º min (informado, NÃO calculado pelo sistema)
        { name: 'apgar_1_minuto', type: 'number', required: false },
        { name: 'apgar_5_minutos', type: 'number', required: false },
        { name: 'apgar_10_minutos', type: 'number', required: false },
        // Acomodação inicial do RN como escolha profissional
        {
          name: 'acomodacao_rn',
          type: 'select',
          values: [
            'alojamento_conjunto',
            'unidade_cuidados_intermediarios',
            'uti_neonatal',
            'isolamento',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'reanimacao_neonatal_necessaria', type: 'bool', required: false },
        { name: 'detalhes_reanimacao', type: 'text', required: false },
        { name: 'pulseira_identificacao_conferida', type: 'bool', required: true },
        { name: 'declaracao_nascido_vivo_dnv_numero', type: 'text', required: false },
        { name: 'observacoes_rn', type: 'text', required: false },
        // Vínculo opcional se já cadastrado como paciente próprio no hospital
        {
          name: 'paciente_rn_cadastro',
          type: 'relation',
          required: false,
          collectionId: pacientesColId,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_obs_rn_parto ON obstetrica_recem_nascidos (parto)',
        'CREATE INDEX idx_obs_rn_mae ON obstetrica_recem_nascidos (mae_paciente)',
        'CREATE INDEX idx_obs_rn_data ON obstetrica_recem_nascidos (data_hora_nascimento)',
      ],
    })
    app.save(recemNascidos)

    // 5. Desfechos e Altas Obstétricas (mãe e RN integrados à desocupação de leito)
    const desfechosAltas = new Collection({
      name: 'obstetrica_desfechos_altas',
      type: 'base',
      listRule: assistencialReadRule,
      viewRule: assistencialReadRule,
      createRule: assistencialWriteRule,
      updateRule: assistencialWriteRule,
      deleteRule: adminOnlyDeleteRule,
      fields: [
        {
          name: 'admissao_obstetrica',
          type: 'relation',
          required: true,
          collectionId: admissoesColId,
          maxSelect: 1,
        },
        {
          name: 'paciente_mae',
          type: 'relation',
          required: true,
          collectionId: pacientesColId,
          maxSelect: 1,
        },
        { name: 'paciente_mae_nome', type: 'text', required: true },
        { name: 'data_hora_desfecho', type: 'text', required: true },
        {
          name: 'tipo_desfecho',
          type: 'select',
          values: [
            'alta_hospitalar_mae_e_rn',
            'alta_hospitalar_apenas_mae',
            'transferencia_inter_hospitalar',
            'obito_materno',
            'alta_a_pedido',
            'permanencia_internada',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'resumo_desfecho_clinico', type: 'text', required: true },
        { name: 'orientacoes_pos_parto_puerperio', type: 'text', required: false },
        { name: 'encaminhamento_retorno_ubs', type: 'text', required: false },
        {
          name: 'desocupar_leito_internacao',
          type: 'bool',
          required: false,
        },
        {
          name: 'internacao_desocupada',
          type: 'relation',
          required: false,
          collectionId: internacoesColId,
          maxSelect: 1,
        },
        {
          name: 'profissional_alta',
          type: 'relation',
          required: false,
          collectionId: profissionaisColId,
          maxSelect: 1,
        },
        { name: 'profissional_nome', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_obs_desfecho_adm ON obstetrica_desfechos_altas (admissao_obstetrica)',
        'CREATE INDEX idx_obs_desfecho_mae ON obstetrica_desfechos_altas (paciente_mae)',
        'CREATE INDEX idx_obs_desfecho_data ON obstetrica_desfechos_altas (data_hora_desfecho)',
      ],
    })
    app.save(desfechosAltas)
  },
  (app) => {
    // Reversão
    try {
      app.delete(app.findCollectionByNameOrId('obstetrica_desfechos_altas'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('obstetrica_recem_nascidos'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('obstetrica_partos'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('obstetrica_trabalho_parto'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('obstetrica_admissoes'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('vigilancia_fila_administrativa'))
    } catch (_) {}
  },
)
