/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Normalizar diretamente via SQL para contornar ganchos antigos que impediam salvamento
    app
      .db()
      .newQuery(
        "UPDATE pacientes SET cpf = REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') WHERE cpf IS NOT NULL AND cpf != ''",
      )
      .execute()

    app
      .db()
      .newQuery(
        "UPDATE pacientes SET cartao_sus = REPLACE(REPLACE(REPLACE(cartao_sus, '.', ''), '-', ''), ' ', '') WHERE cartao_sus IS NOT NULL AND cartao_sus != ''",
      )
      .execute()
  },
  () => {},
)
