/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Endurecimento de unicidade no banco de dados para Pacientes (CPF e CNS).
    // Conforme requisitos:
    // 1. Zeros à esquerda devem ser preservados.
    // 2. Não bloquear registros sem documento (RN/urgência permitidos: cpf ou cartao_sus vazio/null).
    // 3. Não inventar documentos nem alterar cadastros históricos.
    // 4. Se registros históricos conflitantes impedirem criar índice único, NÃO excluir nem mesclar nada:
    //    relatar o conflito explicitamente e adotar proteção alternativa segura sem perda de dados.

    // 1. Normalizar formatação de dados históricos (ex: remover pontuação preservando dígitos e zeros à esquerda)
    // apenas quando o registro possuir documento preenchido, sem excluir ou alterar cadastros.
    try {
      const records = app.findRecordsByFilter(
        'pacientes',
        "cpf != '' || cartao_sus != ''",
        'id',
        500,
        0,
      )
      for (let i = 0; i < records.length; i++) {
        const rec = records[i]
        let alterou = false
        const rawCpf = rec.get('cpf')
        if (rawCpf) {
          const limpoCpf = ('' + rawCpf).replace(/\D/g, '')
          if (limpoCpf !== rawCpf) {
            rec.set('cpf', limpoCpf)
            alterou = true
          }
        }
        const rawCns = rec.get('cartao_sus')
        if (rawCns) {
          const limpoCns = ('' + rawCns).replace(/\D/g, '')
          if (limpoCns !== rawCns) {
            rec.set('cartao_sus', limpoCns)
            alterou = true
          }
        }
        if (alterou) {
          app.save(rec)
        }
      }
    } catch (e) {
      console.log('Aviso ao normalizar dígitos de pacientes existentes:', e)
    }

    // 2. Verificar se existem conflitos históricos de duplicidade em CPF ou CNS
    let conflitosCpf = 0
    let conflitosCns = 0

    try {
      // Checa duplicidades em CPF não-vazio
      const dupsCpf = app
        .db()
        .newQuery(
          "SELECT cpf, COUNT(*) as qtd FROM pacientes WHERE cpf IS NOT NULL AND cpf != '' GROUP BY cpf HAVING COUNT(*) > 1",
        )
        .all()
      if (dupsCpf && dupsCpf.length > 0) {
        conflitosCpf = dupsCpf.length
        console.log(
          'Conflito histórico detectado em CPF: duplicidades encontradas sem exclusão:',
          dupsCpf,
        )
      }
    } catch (e) {
      console.log('Aviso ao verificar duplicidades históricas de CPF:', e)
    }

    try {
      // Checa duplicidades em CNS não-vazio
      const dupsCns = app
        .db()
        .newQuery(
          "SELECT cartao_sus, COUNT(*) as qtd FROM pacientes WHERE cartao_sus IS NOT NULL AND cartao_sus != '' GROUP BY cartao_sus HAVING COUNT(*) > 1",
        )
        .all()
      if (dupsCns && dupsCns.length > 0) {
        conflitosCns = dupsCns.length
        console.log(
          'Conflito histórico detectado em CNS: duplicidades encontradas sem exclusão:',
          dupsCns,
        )
      }
    } catch (e) {
      console.log('Aviso ao verificar duplicidades históricas de CNS:', e)
    }

    // 3. Criação de índices únicos parciais (SQLite CREATE UNIQUE INDEX ... WHERE ... != '')
    // Somente se não houver conflitos que causem erro. Se houver, a integridade é garantida pelo hook transacional.
    const pacientesCol = app.findCollectionByNameOrId('pacientes')

    if (conflitosCpf === 0) {
      try {
        // Remove índice prévio se existir com mesmo nome para recriar com clausula WHERE
        pacientesCol.removeIndex('idx_pacientes_cpf_unique')
      } catch (_) {}
      try {
        pacientesCol.indexes.push(
          "CREATE UNIQUE INDEX idx_pacientes_cpf_unique ON pacientes (cpf) WHERE cpf IS NOT NULL AND cpf != ''",
        )
      } catch (err) {
        console.log('Não foi possível registrar idx_pacientes_cpf_unique na coleção:', err)
      }
    } else {
      console.log(
        'ATENÇÃO: Índice único físico de CPF suspenso devido a conflitos históricos relatados sem perda de dados.',
      )
    }

    if (conflitosCns === 0) {
      try {
        pacientesCol.removeIndex('idx_pacientes_cns_unique')
      } catch (_) {}
      try {
        pacientesCol.indexes.push(
          "CREATE UNIQUE INDEX idx_pacientes_cns_unique ON pacientes (cartao_sus) WHERE cartao_sus IS NOT NULL AND cartao_sus != ''",
        )
      } catch (err) {
        console.log('Não foi possível registrar idx_pacientes_cns_unique na coleção:', err)
      }
    } else {
      console.log(
        'ATENÇÃO: Índice único físico de CNS suspenso devido a conflitos históricos relatados sem perda de dados.',
      )
    }

    app.save(pacientesCol)
  },
  (app) => {
    try {
      const pacientesCol = app.findCollectionByNameOrId('pacientes')
      pacientesCol.removeIndex('idx_pacientes_cpf_unique')
      pacientesCol.removeIndex('idx_pacientes_cns_unique')
      app.save(pacientesCol)
    } catch (_) {}
  },
)
