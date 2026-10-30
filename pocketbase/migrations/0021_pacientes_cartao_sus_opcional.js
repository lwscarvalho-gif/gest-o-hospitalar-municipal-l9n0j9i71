/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Permitir ausência de Cartão SUS (required: false) para contemplar Recém-Nascidos
    // e atendimentos de urgência/emergência sem documento inicial,
    // conforme regra de negócio e hook de identificação.
    const col = app.findCollectionByNameOrId('pacientes')
    const field = col.fields.getByName('cartao_sus')
    if (field) {
      field.required = false
    }
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('pacientes')
      const field = col.fields.getByName('cartao_sus')
      if (field) {
        field.required = true
      }
      app.save(col)
    } catch (_) {}
  },
)
