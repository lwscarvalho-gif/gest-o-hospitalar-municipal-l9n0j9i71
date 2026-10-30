/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0033: Módulo RIS - Registro Formal de Entrega de Laudos e Resultados
 * Conforme Requisito 7.4.3.4.c.i (p. 22 do DOC-02 detalhado persistido) e ANEXO I item 313-316.
 *
 * 1. Nova coleção `ris_entregas_laudos`:
 *    - exame_ref: relation para exames (obrigatório, maxSelect 1)
 *    - laudo_versao_ref: relation para laudos_versoes (obrigatório, maxSelect 1)
 *    - paciente_ref: relation para pacientes (obrigatório, maxSelect 1)
 *    - versao_entregue: snapshot numérico da versão exata entregue (apenas versões liberadas)
 *    - destinatario_nome: nome completo do destinatário/retirante conferido pelo operador
 *    - destinatario_documento: documento de identificação mínimo conferido presencialmente
 *    - destinatario_parentesco_grau: parentesco ou vínculo com o paciente (ex.: 'proprio_paciente', 'mae', 'pai', 'filho', 'outro')
 *    - forma_recebimento: forma presencial/interna ('presencial_balcao', 'setor_interno', 'entrega_ambulatorial')
 *    - observacao: observação opcional
 *    - data_hora_entrega: data/hora do servidor em UTC
 *    - autor_id: id do operador derivado da sessão autenticada (nunca do navegador)
 *    - autor_nome: nome do operador derivado da sessão
 *    - autor_perfil: perfil/role do operador derivado da sessão
 *    - idempotency_key: chave persistente contra reenvios duplicados
 *    - hash_payload: hash dos dados da entrega para detecção de divergência (409)
 *    - evento_anterior_ref: relation opcional para evento de entrega anterior (correção por novo evento imutável)
 *    - motivo_correcao: justificativa quando for retificação/correção de recibo anterior
 *    - created, updated: autodate fields obrigatórios
 *
 * 2. Regras de Segurança:
 *    - createRule: apenas operadores autenticados com perfis autorizados ('admin', 'gestor', 'profissional', 'recepcao')
 *    - listRule / viewRule: autenticados autorizados. A recepção só acessa os metadados desta coleção,
 *      sem ter acesso ampliado à coleção laudos_versoes nem ao corpo clínico/imagens.
 *    - updateRule: null (REGISTRO IMUTÁVEL - proibido reescrever/atualizar evento)
 *    - deleteRule: null (REGISTRO IMUTÁVEL - proibido excluir histórico auditável)
 */

migrate(
  (app) => {
    const examesCol = app.findCollectionByNameOrId('exames')
    const examesColId = examesCol.id
    const laudosVersoesCol = app.findCollectionByNameOrId('laudos_versoes')
    const laudosVersoesColId = laudosVersoesCol.id
    const pacientesCol = app.findCollectionByNameOrId('pacientes')
    const pacientesColId = pacientesCol.id

    let entregasCol
    try {
      entregasCol = app.findCollectionByNameOrId('ris_entregas_laudos')
    } catch (_) {
      entregasCol = new Collection({
        name: 'ris_entregas_laudos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional' || @request.auth.role = 'recepcao')",
        updateRule: null, // Imutável por desenho: nunca sobrescrever evento de entrega
        deleteRule: null, // Imutável por desenho: nunca apagar histórico de entrega
        fields: [
          {
            name: 'exame_ref',
            type: 'relation',
            required: true,
            collectionId: examesColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'laudo_versao_ref',
            type: 'relation',
            required: true,
            collectionId: laudosVersoesColId,
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
            name: 'versao_entregue',
            type: 'number',
            required: true,
            onlyInt: true,
          },
          {
            name: 'destinatario_nome',
            type: 'text',
            required: true,
          },
          {
            name: 'destinatario_documento',
            type: 'text',
            required: true,
          },
          {
            name: 'destinatario_parentesco_grau',
            type: 'text',
            required: false,
          },
          {
            name: 'forma_recebimento',
            type: 'select',
            required: true,
            values: ['presencial_balcao', 'setor_interno', 'entrega_ambulatorial'],
            maxSelect: 1,
          },
          {
            name: 'observacao',
            type: 'text',
            required: false,
          },
          {
            name: 'data_hora_entrega',
            type: 'text',
            required: true,
          },
          {
            name: 'autor_id',
            type: 'text',
            required: true,
          },
          {
            name: 'autor_nome',
            type: 'text',
            required: true,
          },
          {
            name: 'autor_perfil',
            type: 'text',
            required: true,
          },
          {
            name: 'idempotency_key',
            type: 'text',
            required: false,
          },
          {
            name: 'hash_payload',
            type: 'text',
            required: false,
          },
          {
            name: 'evento_anterior_ref',
            type: 'text',
            required: false,
          },
          {
            name: 'motivo_correcao',
            type: 'text',
            required: false,
          },
          {
            name: 'protocolo_entrega',
            type: 'text',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ris_entregas_exame ON ris_entregas_laudos (exame_ref)',
          'CREATE INDEX idx_ris_entregas_paciente ON ris_entregas_laudos (paciente_ref)',
          'CREATE INDEX idx_ris_entregas_versao ON ris_entregas_laudos (laudo_versao_ref)',
          'CREATE INDEX idx_ris_entregas_data ON ris_entregas_laudos (data_hora_entrega)',
          'CREATE INDEX idx_ris_entregas_idemp ON ris_entregas_laudos (idempotency_key)',
          'CREATE INDEX idx_ris_entregas_protocolo ON ris_entregas_laudos (protocolo_entrega)',
        ],
      })
      app.save(entregasCol)
    }
  },
  (app) => {
    try {
      const entregasCol = app.findCollectionByNameOrId('ris_entregas_laudos')
      if (entregasCol) {
        app.delete(entregasCol)
      }
    } catch (_) {}
  },
)
