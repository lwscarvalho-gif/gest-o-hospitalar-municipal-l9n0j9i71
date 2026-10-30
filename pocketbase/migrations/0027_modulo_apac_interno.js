/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0027: Módulo APAC Interno - Parte 1 (Backend)
 * Referência: ANEXO I - DOC-02 Seção 7.4.4.4 (pp. 31-32) de "módulos (1).pdf"
 *
 * Criação das coleções de gerenciamento interno de APACs:
 * 1. `apac_faixas_sequencias`
 *    - Sequências de números de APACs disponibilizadas pelo município/gestor autorizado:
 *      ano, uf, tipo_apac, faixa_inicial, faixa_final, numero_atual,
 *      validade_inicial, validade_final, ativo, criado_por, observacoes.
 *    - Nenhuma faixa real ou numeração oficial SUS é pré-inventada/homologada.
 *    - Permissão de escrita restrita a admin/gestor. Leitura para autenticados.
 *
 * 2. `apac_solicitacoes`
 *    - Registro de solicitações e emissões de laudos APAC:
 *      paciente, internacao, atendimento_pa, unidade_solicitante, profissional_solicitante,
 *      profissional_solicitante_nome, data_solicitacao, numero_laudo, numero_apac,
 *      tipo_laudo ('laudo_geral' | 'medicamentos' | 'nefrologia' | 'quimioterapia' | 'radioterapia' | 'bariatrica'),
 *      modalidade ('inicial' | 'continuidade' | 'sem_continuidade'),
 *      apac_anterior_numero,
 *      executante_prestador_nome, executante_cnes,
 *      cid_principal, cid_secundario, cid_causas_associadas,
 *      validade_inicial, validade_final,
 *      status ('solicitada' | 'em_analise' | 'autorizada' | 'cancelada'),
 *      dados_paciente_snapshot (nome, mae, cns, nascimento, idade, sexo, raca_cor, responsavel, prontuario),
 *      tipo_registro ('ato_original' | 'retificacao'),
 *      numero_versao, motivo_retificacao,
 *      usuario_autor_id, cancelado_por_id, motivo_cancelamento, data_cancelamento,
 *      idempotency_key.
 *    - RLS: recepção tem acesso mínimo administrativo (list/view), escrita por profissional/gestor/admin.
 */
migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'
    const pacientesColId = app.findCollectionByNameOrId('pacientes').id
    const profissionaisColId = app.findCollectionByNameOrId('profissionais').id
    const internacoesColId = app.findCollectionByNameOrId('internacoes').id
    const paColId = app.findCollectionByNameOrId('pronto_atendimento').id

    // 1. Coleção apac_faixas_sequencias
    let faixasCol
    try {
      faixasCol = app.findCollectionByNameOrId('apac_faixas_sequencias')
    } catch (_) {
      faixasCol = new Collection({
        name: 'apac_faixas_sequencias',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')",
        deleteRule: null,
        fields: [
          { name: 'ano', type: 'number', required: true, onlyInt: true, min: 2000, max: 2100 },
          { name: 'uf', type: 'text', required: true, min: 2, max: 2 },
          {
            name: 'tipo_apac',
            type: 'select',
            values: [
              'laudo_geral',
              'medicamentos',
              'nefrologia',
              'quimioterapia',
              'radioterapia',
              'bariatrica',
            ],
            maxSelect: 1,
            required: true,
          },
          { name: 'faixa_inicial', type: 'number', required: true, onlyInt: true, min: 1 },
          { name: 'faixa_final', type: 'number', required: true, onlyInt: true, min: 1 },
          { name: 'numero_atual', type: 'number', required: false, onlyInt: true, min: 0 },
          { name: 'validade_inicial', type: 'text', required: true, min: 10, max: 10 },
          { name: 'validade_final', type: 'text', required: true, min: 10, max: 10 },
          { name: 'ativo', type: 'bool' },
          {
            name: 'criado_por',
            type: 'relation',
            collectionId: usersColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'observacoes', type: 'text', required: false, max: 1000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_apac_faixas_ano_uf_tipo ON apac_faixas_sequencias (ano, uf, tipo_apac, ativo)',
          'CREATE INDEX idx_apac_faixas_ativo ON apac_faixas_sequencias (ativo)',
        ],
      })
      app.save(faixasCol)
    }

    const faixasColId = app.findCollectionByNameOrId('apac_faixas_sequencias').id

    // 2. Coleção apac_solicitacoes
    let solicitacoesCol
    try {
      solicitacoesCol = app.findCollectionByNameOrId('apac_solicitacoes')
    } catch (_) {
      solicitacoesCol = new Collection({
        name: 'apac_solicitacoes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        updateRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        deleteRule: null,
        fields: [
          {
            name: 'paciente',
            type: 'relation',
            collectionId: pacientesColId,
            required: true,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'internacao',
            type: 'relation',
            collectionId: internacoesColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'atendimento_pa',
            type: 'relation',
            collectionId: paColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'unidade_solicitante', type: 'text', required: true, min: 2, max: 150 },
          {
            name: 'profissional_solicitante',
            type: 'relation',
            collectionId: profissionaisColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'profissional_solicitante_nome', type: 'text', required: true, min: 2, max: 150 },
          { name: 'data_solicitacao', type: 'text', required: true, min: 10, max: 20 },
          { name: 'numero_laudo', type: 'text', required: true, min: 1, max: 50 },
          { name: 'numero_apac', type: 'text', required: false, max: 50 },
          {
            name: 'faixa_sequencia_origem',
            type: 'relation',
            collectionId: faixasColId,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'tipo_laudo',
            type: 'select',
            values: [
              'laudo_geral',
              'medicamentos',
              'nefrologia',
              'quimioterapia',
              'radioterapia',
              'bariatrica',
            ],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'modalidade',
            type: 'select',
            values: ['inicial', 'continuidade', 'sem_continuidade'],
            maxSelect: 1,
            required: true,
          },
          { name: 'apac_anterior_numero', type: 'text', required: false, max: 50 },
          { name: 'executante_prestador_nome', type: 'text', required: true, min: 2, max: 180 },
          { name: 'executante_cnes', type: 'text', required: false, max: 20 },
          { name: 'cid_principal', type: 'text', required: true, min: 2, max: 10 },
          { name: 'cid_secundario', type: 'text', required: false, max: 10 },
          { name: 'cid_causas_associadas', type: 'text', required: false, max: 10 },
          { name: 'validade_inicial', type: 'text', required: true, min: 10, max: 10 },
          { name: 'validade_final', type: 'text', required: true, min: 10, max: 10 },
          {
            name: 'status',
            type: 'select',
            values: ['solicitada', 'em_analise', 'autorizada', 'cancelada'],
            maxSelect: 1,
            required: true,
          },
          { name: 'dados_paciente_snapshot', type: 'json' },
          {
            name: 'tipo_registro',
            type: 'select',
            values: ['ato_original', 'retificacao'],
            maxSelect: 1,
            required: true,
          },
          { name: 'numero_versao', type: 'number', required: false, onlyInt: true, min: 1 },
          { name: 'motivo_retificacao', type: 'text', required: false, max: 1000 },
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
          { name: 'data_cancelamento', type: 'text', required: false, max: 20 },
          { name: 'idempotency_key', type: 'text', required: false, max: 100 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_apac_solic_paciente ON apac_solicitacoes (paciente, created DESC)',
          'CREATE INDEX idx_apac_solic_status ON apac_solicitacoes (status, created DESC)',
          'CREATE INDEX idx_apac_solic_numero_apac ON apac_solicitacoes (numero_apac)',
          'CREATE INDEX idx_apac_solic_idempotency ON apac_solicitacoes (idempotency_key)',
          'CREATE INDEX idx_apac_solic_tipo_modalidade ON apac_solicitacoes (tipo_laudo, modalidade)',
        ],
      })
      app.save(solicitacoesCol)
    }

    // Agora que apac_solicitacoes foi salva e tem ID, adicionamos as relações reflexivas:
    const apacCriada = app.findCollectionByNameOrId('apac_solicitacoes')
    let saveRef = false

    if (!apacCriada.fields.getByName('apac_anterior_ref')) {
      apacCriada.fields.add(
        new RelationField({
          name: 'apac_anterior_ref',
          collectionId: apacCriada.id,
          required: false,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      saveRef = true
    }

    if (!apacCriada.fields.getByName('solicitacao_original_ref')) {
      apacCriada.fields.add(
        new RelationField({
          name: 'solicitacao_original_ref',
          collectionId: apacCriada.id,
          required: false,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      saveRef = true
    }

    if (saveRef) {
      app.save(apacCriada)
    }
  },
  (app) => {
    try {
      const apacCol = app.findCollectionByNameOrId('apac_solicitacoes')
      if (apacCol) app.delete(apacCol)
    } catch (_) {}

    try {
      const faixasCol = app.findCollectionByNameOrId('apac_faixas_sequencias')
      if (faixasCol) app.delete(faixasCol)
    } catch (_) {}
  },
)
