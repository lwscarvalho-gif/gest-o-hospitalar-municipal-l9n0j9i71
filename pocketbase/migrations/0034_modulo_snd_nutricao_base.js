/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0034: Serviço de Nutrição e Dietética (SND) BASE
 * Conforme Requisitos 7.4.3.5.a.i–ii e 7.4.3.5.b.i (páginas 22–23 do PDF detalhado persistido)
 *
 * ESCOPO DESTA MIGRAÇÃO (Estrutura vazia, zero dados de negócio pré-inseridos):
 * 1. Coleção `snd_cardapio_refeicoes`:
 *    - Catálogo parametrizável de refeições (ex: desjejum, colação, almoço, lanche, jantar, ceia)
 *    - Versionado e inativável (inativação lógica via campo `ativo`, sem exclusão física)
 *    - Campos: codigo, nome, descricao, horario_padrao, ordem_dia, ativo, versao, motivo_inativacao,
 *              autor_id, autor_nome, created, updated
 *
 * 2. Coleção `snd_dietas_catalogo`:
 *    - Catálogo parametrizável de tipos de dieta
 *    - Categoria/via: oral, rotina, enteral, parenteral
 *    - Versionado e inativável (inativação lógica via campo `ativo`, sem exclusão física)
 *    - Mudança em item de catálogo NÃO altera prescrições já emitidas (prescrições mantêm snapshot e referência de versão)
 *    - Campos: codigo, nome, categoria, consistencia, composicao_descricao, indicacao_padrao,
 *              refeicoes_permitidas (json), ativo, versao, versao_anterior_id, motivo_alteracao,
 *              autor_id, autor_nome, created, updated
 *
 * 3. Coleção `snd_prescricoes_dieteticas`:
 *    - Prescrição dietética individualizada de nutrição e dietética
 *    - Vínculo com paciente, episódio (internação ativa ou pronto atendimento em observação), leito, unidade/setor
 *    - Somente emitida por profissional humano autorizado (médico / nutricionista / profissional assistencial autorizado)
 *    - Horários, vigência (inicio/fim), quantidade/volume, unidade_medida, via_administracao, fracionamento,
 *      restrições alimentares, alergias verificadas, observações lançadas pelo profissional
 *    - Histórico e versionamento imutável: suspensão e alteração criam nova versão/evento preservando registros anteriores
 *    - Campos: paciente_ref, internacao_ref, atendimento_pa_ref, leito_ref, setor_ref,
 *              dieta_catalogo_ref, dieta_versao_snapshot, categoria_dieta, consistencia,
 *              via_administracao, quantidade, unidade_medida, fracionamento, horários_refeicoes (json),
 *              vigencia_inicio, vigencia_fim, status, restricoes_alimentares, observacoes_profissionais,
 *              diagnostico_justificativa_clinica (restrito, nunca vazado para cozinha),
 *              versao_numero, prescricao_anterior_ref, motivo_alteracao_suspensao,
 *              prescritor_id, prescritor_nome, prescritor_perfil, prescritor_registro_conselho,
 *              data_hora_prescricao_utc, idempotency_key, hash_payload, created, updated
 *
 * 4. Coleção `snd_distribuicoes_refeicoes`:
 *    - Mapa operacional de refeições e registro de preparo, distribuição e não distribuição
 *    - Cozinha/copa recebe SOMENTE informações operacionais (dieta, consistência, via, restrições alimentares e observações da refeição)
 *    - Dados clínicos (diagnóstico, prontuário detalhado, CID, justificativa clínica) são estritamente mascarados
 *    - Motivo OBRIGATÓRIO em caso de não distribuição
 *    - Registro idempotente com chave persistente (reenvio idêntico retorna 200, divergente 409)
 *    - Timestamps UTC persistidos, autoria da sessão do servidor
 *    - Campos: prescricao_dietetica_ref, paciente_ref, leito_ref, setor_ref, refeicao_codigo,
 *              data_operacional, horario_previsto, status_operacional ('planejado', 'em_preparo', 'distribuido', 'nao_distribuido'),
 *              motivo_nao_distribuido, observacoes_operacionais, temperatura_afericao, responsavel_entrega_nome,
 *              data_hora_registro_utc, autor_id, autor_nome, autor_perfil,
 *              idempotency_key, hash_payload, created, updated
 *
 * REGRAS DE ACESSO:
 * - listRule/viewRule: usuários autenticados
 * - createRule/updateRule: restritos conforme o perfil (prescrição apenas para profissionais autorizados; distribuição por operadores de cozinha/nutrição)
 * - deleteRule: null (proibida exclusão física de registros do SND para garantia de trilha auditável)
 */

migrate(
  (app) => {
    const pacientesCol = app.findCollectionByNameOrId('pacientes')
    const pacientesColId = pacientesCol.id

    const internacoesCol = app.findCollectionByNameOrId('internacoes')
    const internacoesColId = internacoesCol.id

    const leitosCol = app.findCollectionByNameOrId('leitos')
    const leitosColId = leitosCol.id

    const setoresCol = app.findCollectionByNameOrId('setores')
    const setoresColId = setoresCol.id

    let prontoAtendimentoColId = null
    try {
      const paCol = app.findCollectionByNameOrId('pronto_atendimento')
      prontoAtendimentoColId = paCol.id
    } catch (_) {}

    // ------------------------------------------------------------------------
    // 1. Coleção `snd_cardapio_refeicoes` (Catálogo de Refeições)
    // ------------------------------------------------------------------------
    let refeicoesCol
    try {
      refeicoesCol = app.findCollectionByNameOrId('snd_cardapio_refeicoes')
    } catch (_) {
      refeicoesCol = new Collection({
        name: 'snd_cardapio_refeicoes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        deleteRule: null, // Sem exclusão física: inativação lógica
        fields: [
          { name: 'codigo', type: 'text', required: true },
          { name: 'nome', type: 'text', required: true },
          { name: 'descricao', type: 'text', required: false },
          { name: 'horario_padrao', type: 'text', required: true }, // ex: "07:30", "12:00"
          { name: 'ordem_dia', type: 'number', required: true, onlyInt: true },
          { name: 'ativo', type: 'bool', required: false }, // default true via service
          { name: 'versao', type: 'number', required: true, onlyInt: true },
          { name: 'motivo_inativacao', type: 'text', required: false },
          { name: 'autor_id', type: 'text', required: false },
          { name: 'autor_nome', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_snd_ref_codigo ON snd_cardapio_refeicoes (codigo)',
          'CREATE INDEX idx_snd_ref_versao ON snd_cardapio_refeicoes (versao)',
          'CREATE INDEX idx_snd_ref_ativo ON snd_cardapio_refeicoes (ativo)',
          'CREATE INDEX idx_snd_ref_ordem ON snd_cardapio_refeicoes (ordem_dia)',
        ],
      })
      app.save(refeicoesCol)
    }

    // ------------------------------------------------------------------------
    // 2. Coleção `snd_dietas_catalogo` (Catálogo de Tipos de Dieta)
    // ------------------------------------------------------------------------
    let dietasCol
    try {
      dietasCol = app.findCollectionByNameOrId('snd_dietas_catalogo')
    } catch (_) {
      dietasCol = new Collection({
        name: 'snd_dietas_catalogo',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        deleteRule: null, // Sem exclusão física: inativação lógica e versionamento
        fields: [
          { name: 'codigo', type: 'text', required: true },
          { name: 'nome', type: 'text', required: true },
          {
            name: 'categoria',
            type: 'select',
            required: true,
            values: ['oral', 'rotina', 'enteral', 'parenteral', 'especial'],
            maxSelect: 1,
          },
          { name: 'consistencia', type: 'text', required: false }, // livre, branda, pastosa, liquida, liquida_restrita, jejum
          { name: 'composicao_descricao', type: 'text', required: false },
          { name: 'indicacao_padrao', type: 'text', required: false },
          { name: 'refeicoes_permitidas', type: 'json', required: false }, // lista de codigos de refeicoes
          { name: 'ativo', type: 'bool', required: false },
          { name: 'versao', type: 'number', required: true, onlyInt: true },
          { name: 'versao_anterior_id', type: 'text', required: false },
          { name: 'motivo_alteracao', type: 'text', required: false },
          { name: 'autor_id', type: 'text', required: false },
          { name: 'autor_nome', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_snd_dietas_codigo ON snd_dietas_catalogo (codigo)',
          'CREATE INDEX idx_snd_dietas_versao ON snd_dietas_catalogo (versao)',
          'CREATE INDEX idx_snd_dietas_categoria ON snd_dietas_catalogo (categoria)',
          'CREATE INDEX idx_snd_dietas_ativo ON snd_dietas_catalogo (ativo)',
        ],
      })
      app.save(dietasCol)
    }

    const dietasColId = app.findCollectionByNameOrId('snd_dietas_catalogo').id

    // ------------------------------------------------------------------------
    // 3. Coleção `snd_prescricoes_dieteticas` (Prescrição Dietética Individualizada)
    // ------------------------------------------------------------------------
    let prescricoesDieteticasCol
    try {
      prescricoesDieteticasCol = app.findCollectionByNameOrId('snd_prescricoes_dieteticas')
    } catch (_) {
      const fields = [
        {
          name: 'paciente_ref',
          type: 'relation',
          required: true,
          collectionId: pacientesColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'internacao_ref',
          type: 'relation',
          required: false,
          collectionId: internacoesColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
      ]

      if (prontoAtendimentoColId) {
        fields.push({
          name: 'atendimento_pa_ref',
          type: 'relation',
          required: false,
          collectionId: prontoAtendimentoColId,
          cascadeDelete: false,
          maxSelect: 1,
        })
      } else {
        fields.push({
          name: 'atendimento_pa_ref',
          type: 'text',
          required: false,
        })
      }

      fields.push(
        {
          name: 'leito_ref',
          type: 'relation',
          required: false,
          collectionId: leitosColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'setor_ref',
          type: 'relation',
          required: false,
          collectionId: setoresColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'dieta_catalogo_ref',
          type: 'relation',
          required: true,
          collectionId: dietasColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'dieta_codigo_snapshot', type: 'text', required: true },
        { name: 'dieta_nome_snapshot', type: 'text', required: true },
        { name: 'dieta_versao_snapshot', type: 'number', required: true, onlyInt: true },
        {
          name: 'categoria_dieta',
          type: 'select',
          required: true,
          values: ['oral', 'rotina', 'enteral', 'parenteral', 'especial'],
          maxSelect: 1,
        },
        { name: 'consistencia', type: 'text', required: false },
        { name: 'via_administracao', type: 'text', required: false }, // oral, sonda_nasogastrica, sonda_nasoenteral, gastrostomia, jejunostomia, parenteral_central, parenteral_periferica
        { name: 'quantidade', type: 'number', required: false },
        { name: 'unidade_medida', type: 'text', required: false }, // ml, g, kcal, gotas/min, ml/h
        { name: 'fracionamento', type: 'text', required: false }, // ex: "6x ao dia", "contínuo 24h"
        { name: 'horarios_refeicoes', type: 'json', required: false }, // array de horários/refeições
        { name: 'vigencia_inicio', type: 'text', required: true }, // ISO UTC
        { name: 'vigencia_fim', type: 'text', required: false }, // ISO UTC
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativa', 'alterada', 'suspensa', 'encerrada'],
          maxSelect: 1,
        },
        { name: 'restricoes_alimentares', type: 'text', required: false }, // ex: hipossódica, sem glúten, sem lactose, hipoglicídica
        { name: 'alergias_verificadas', type: 'text', required: false },
        { name: 'observacoes_profissionais', type: 'text', required: false },
        { name: 'diagnostico_justificativa_clinica', type: 'text', required: false }, // RESTRITO (mascarado para a cozinha)
        { name: 'versao_numero', type: 'number', required: true, onlyInt: true },
        { name: 'prescricao_anterior_ref', type: 'text', required: false },
        { name: 'motivo_alteracao_suspensao', type: 'text', required: false },
        { name: 'prescritor_id', type: 'text', required: true },
        { name: 'prescritor_nome', type: 'text', required: true },
        { name: 'prescritor_perfil', type: 'text', required: true },
        { name: 'prescritor_conselho', type: 'text', required: false },
        { name: 'data_hora_prescricao_utc', type: 'text', required: true },
        { name: 'idempotency_key', type: 'text', required: false },
        { name: 'hash_payload', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      )

      prescricoesDieteticasCol = new Collection({
        name: 'snd_prescricoes_dieteticas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        updateRule: null, // Imutável por padrão: alterações e suspensões geram nova versão/evento
        deleteRule: null, // Imutável: nunca excluir histórico
        fields: fields,
        indexes: [,],
      })
      app.save(prescricoesDieteticasCol)
    }

    const prescricoesColId = app.findCollectionByNameOrId('snd_prescricoes_dieteticas').id

    // ------------------------------------------------------------------------
    // 4. Coleção `snd_distribuicoes_refeicoes` (Mapa Operacional de Distribuição)
    // ------------------------------------------------------------------------
    let distribuicoesCol
    try {
      distribuicoesCol = app.findCollectionByNameOrId('snd_distribuicoes_refeicoes')
    } catch (_) {
      distribuicoesCol = new Collection({
        name: 'snd_distribuicoes_refeicoes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: null, // Proibida exclusão de registros operacionais
        fields: [
          {
            name: 'prescricao_dietetica_ref',
            type: 'relation',
            required: true,
            collectionId: prescricoesColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'paciente_ref',
            type: 'relation',
            required: true,
            collectionId: pacientesColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'leito_ref',
            type: 'relation',
            required: false,
            collectionId: leitosColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'setor_ref',
            type: 'relation',
            required: false,
            collectionId: setoresColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'refeicao_codigo', type: 'text', required: true },
          { name: 'data_operacional', type: 'text', required: true }, // AAAA-MM-DD
          { name: 'horario_previsto', type: 'text', required: false }, // HH:mm
          {
            name: 'status_operacional',
            type: 'select',
            required: true,
            values: ['planejado', 'em_preparo', 'distribuido', 'nao_distribuido'],
            maxSelect: 1,
          },
          { name: 'motivo_nao_distribuido', type: 'text', required: false }, // Obrigatório se nao_distribuido
          { name: 'observacoes_operacionais', type: 'text', required: false },
          { name: 'temperatura_afericao', type: 'text', required: false },
          { name: 'responsavel_entrega_nome', type: 'text', required: false },
          { name: 'data_hora_registro_utc', type: 'text', required: true },
          { name: 'autor_id', type: 'text', required: true },
          { name: 'autor_nome', type: 'text', required: true },
          { name: 'autor_perfil', type: 'text', required: true },
          { name: 'idempotency_key', type: 'text', required: false },
          { name: 'hash_payload', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_snd_dist_presc ON snd_distribuicoes_refeicoes (prescricao_dietetica_ref)',
          'CREATE INDEX idx_snd_dist_paciente ON snd_distribuicoes_refeicoes (paciente_ref)',
          'CREATE INDEX idx_snd_dist_leito ON snd_distribuicoes_refeicoes (leito_ref)',
          'CREATE INDEX idx_snd_dist_data ON snd_distribuicoes_refeicoes (data_operacional)',
          'CREATE INDEX idx_snd_dist_status ON snd_distribuicoes_refeicoes (status_operacional)',
          'CREATE INDEX idx_snd_dist_idemp ON snd_distribuicoes_refeicoes (idempotency_key)',
        ],
      })
      app.save(distribuicoesCol)
    }
  },
  (app) => {
    try {
      const distribuicoesCol = app.findCollectionByNameOrId('snd_distribuicoes_refeicoes')
      if (distribuicoesCol) app.delete(distribuicoesCol)
    } catch (_) {}

    try {
      const prescricoesDieteticasCol = app.findCollectionByNameOrId('snd_prescricoes_dieteticas')
      if (prescricoesDieteticasCol) app.delete(prescricoesDieteticasCol)
    } catch (_) {}

    try {
      const dietasCol = app.findCollectionByNameOrId('snd_dietas_catalogo')
      if (dietasCol) app.delete(dietasCol)
    } catch (_) {}

    try {
      const refeicoesCol = app.findCollectionByNameOrId('snd_cardapio_refeicoes')
      if (refeicoesCol) app.delete(refeicoesCol)
    } catch (_) {}
  },
)
