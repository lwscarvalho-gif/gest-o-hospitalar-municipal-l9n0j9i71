/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0032: Editor Formatado de Laudos RIS (Seção 7.4.3.4.b.i-iii)
 * Parte 1: Schema para conteúdo formatado versionado, imagens internas e snapshot congelado.
 *
 * 1. Evolução da coleção `exames`:
 *    - `conteudo_formatado_rascunho` (editor/text): HTML sanitizado do rascunho em edição
 *    - `config_editor_rascunho` (json): Configurações visuais do editor (fontes, margens, cores de caixa/texto)
 *    - `versao_conteudo_rascunho` (number): Controle de concorrência otimista no rascunho
 *
 * 2. Evolução da coleção `ris_modelos_laudo`:
 *    - `conteudo_formatado` (editor/text): Modelo com formatação rica sanitizada
 *    - `config_editor` (json): Configurações padrão do editor para este modelo
 *
 * 3. Evolução da coleção `laudos_versoes`:
 *    - `conteudo_formatado` (editor/text): Conteúdo congelado/imutável da versão emitida
 *    - `config_editor_snapshot` (json): Snapshot das configurações do editor no momento da emissão
 *    - `imagens_anexas_snapshot` (json): Metadados congelados das imagens anexas autorizadas vinculadas à versão
 *
 * 4. Nova coleção `ris_imagens_anexas`:
 *    - Arquivos internos protegidos vinculados a exame e/ou paciente
 *    - MIME types permitidos: image/jpeg, image/png, image/webp
 *    - Limite de tamanho: 5 MB por imagem (5242880 bytes)
 *    - Acesso protegido: apenas usuários autenticados (recepção bloqueada para leitura/gravação clínica)
 */

migrate(
  (app) => {
    const examesCol = app.findCollectionByNameOrId('exames')
    const examesColId = examesCol.id
    const pacientesColId = app.findCollectionByNameOrId('pacientes').id

    // ------------------------------------------------------------------------
    // 1. Campos na coleção `exames`
    // ------------------------------------------------------------------------
    if (!examesCol.fields.getByName('conteudo_formatado_rascunho')) {
      examesCol.fields.add(
        new EditorField({
          name: 'conteudo_formatado_rascunho',
          required: false,
          maxSize: 5242880,
          convertURLs: false,
        }),
      )
    }

    if (!examesCol.fields.getByName('config_editor_rascunho')) {
      examesCol.fields.add(
        new JSONField({
          name: 'config_editor_rascunho',
          required: false,
          maxSize: 1048576,
        }),
      )
    }

    if (!examesCol.fields.getByName('versao_conteudo_rascunho')) {
      examesCol.fields.add(
        new NumberField({
          name: 'versao_conteudo_rascunho',
          required: false,
          onlyInt: true,
        }),
      )
    }

    app.save(examesCol)

    // ------------------------------------------------------------------------
    // 2. Campos na coleção `ris_modelos_laudo`
    // ------------------------------------------------------------------------
    const modelosCol = app.findCollectionByNameOrId('ris_modelos_laudo')
    if (!modelosCol.fields.getByName('conteudo_formatado')) {
      modelosCol.fields.add(
        new EditorField({
          name: 'conteudo_formatado',
          required: false,
          maxSize: 5242880,
          convertURLs: false,
        }),
      )
    }

    if (!modelosCol.fields.getByName('config_editor')) {
      modelosCol.fields.add(
        new JSONField({
          name: 'config_editor',
          required: false,
          maxSize: 1048576,
        }),
      )
    }

    app.save(modelosCol)

    // ------------------------------------------------------------------------
    // 3. Campos na coleção `laudos_versoes`
    // ------------------------------------------------------------------------
    const versoesCol = app.findCollectionByNameOrId('laudos_versoes')
    if (!versoesCol.fields.getByName('conteudo_formatado')) {
      versoesCol.fields.add(
        new EditorField({
          name: 'conteudo_formatado',
          required: false,
          maxSize: 5242880,
          convertURLs: false,
        }),
      )
    }

    if (!versoesCol.fields.getByName('config_editor_snapshot')) {
      versoesCol.fields.add(
        new JSONField({
          name: 'config_editor_snapshot',
          required: false,
          maxSize: 1048576,
        }),
      )
    }

    if (!versoesCol.fields.getByName('imagens_anexas_snapshot')) {
      versoesCol.fields.add(
        new JSONField({
          name: 'imagens_anexas_snapshot',
          required: false,
          maxSize: 2097152,
        }),
      )
    }

    app.save(versoesCol)

    // ------------------------------------------------------------------------
    // 4. Nova coleção `ris_imagens_anexas`
    // ------------------------------------------------------------------------
    let imagensCol
    try {
      imagensCol = app.findCollectionByNameOrId('ris_imagens_anexas')
    } catch (_) {
      imagensCol = new Collection({
        name: 'ris_imagens_anexas',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        viewRule: "@request.auth.id != '' && @request.auth.role != 'recepcao'",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')",
        fields: [
          {
            name: 'exame',
            type: 'relation',
            required: true,
            collectionId: examesColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'paciente',
            type: 'relation',
            required: true,
            collectionId: pacientesColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'arquivo',
            type: 'file',
            required: true,
            maxSelect: 1,
            maxSize: 5242880, // 5 MB máx
            mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
            protected: true, // Arquivo protegido internamente (requer token / regra view)
          },
          { name: 'legenda', type: 'text', required: false },
          { name: 'ordem', type: 'number', required: false, onlyInt: true },
          { name: 'mime_type', type: 'text', required: false },
          { name: 'tamanho_bytes', type: 'number', required: false, onlyInt: true },
          { name: 'checksum_sha256', type: 'text', required: false },
          { name: 'usuario_autor_id', type: 'text', required: false },
          { name: 'usuario_autor_nome', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ris_img_exame ON ris_imagens_anexas (exame)',
          'CREATE INDEX idx_ris_img_paciente ON ris_imagens_anexas (paciente)',
          'CREATE INDEX idx_ris_img_created ON ris_imagens_anexas (created)',
        ],
      })
      app.save(imagensCol)
    }
  },
  (app) => {
    try {
      const imagensCol = app.findCollectionByNameOrId('ris_imagens_anexas')
      if (imagensCol) app.delete(imagensCol)
    } catch (_) {}

    try {
      const versoesCol = app.findCollectionByNameOrId('laudos_versoes')
      if (versoesCol) {
        if (versoesCol.fields.getByName('conteudo_formatado')) {
          versoesCol.fields.removeByName('conteudo_formatado')
        }
        if (versoesCol.fields.getByName('config_editor_snapshot')) {
          versoesCol.fields.removeByName('config_editor_snapshot')
        }
        if (versoesCol.fields.getByName('imagens_anexas_snapshot')) {
          versoesCol.fields.removeByName('imagens_anexas_snapshot')
        }
        app.save(versoesCol)
      }
    } catch (_) {}

    try {
      const modelosCol = app.findCollectionByNameOrId('ris_modelos_laudo')
      if (modelosCol) {
        if (modelosCol.fields.getByName('conteudo_formatado')) {
          modelosCol.fields.removeByName('conteudo_formatado')
        }
        if (modelosCol.fields.getByName('config_editor')) {
          modelosCol.fields.removeByName('config_editor')
        }
        app.save(modelosCol)
      }
    } catch (_) {}

    try {
      const examesCol = app.findCollectionByNameOrId('exames')
      if (examesCol) {
        if (examesCol.fields.getByName('conteudo_formatado_rascunho')) {
          examesCol.fields.removeByName('conteudo_formatado_rascunho')
        }
        if (examesCol.fields.getByName('config_editor_rascunho')) {
          examesCol.fields.removeByName('config_editor_rascunho')
        }
        if (examesCol.fields.getByName('versao_conteudo_rascunho')) {
          examesCol.fields.removeByName('versao_conteudo_rascunho')
        }
        app.save(examesCol)
      }
    } catch (_) {}
  },
)
