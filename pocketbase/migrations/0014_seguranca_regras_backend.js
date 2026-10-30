/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Proteger coleções clínicas contra acesso de perfil 'recepcao'
    // Coleções onde recepção NÃO pode criar, atualizar ou excluir:
    const colecoesClinicasRestritas = [
      'evolucoes_clinicas',
      'prescricoes',
      'prescricao_itens',
      'administracao_medicamentos',
      'exames',
      'cirurgias',
      'cirurgia_checklists',
      'cirurgia_atos',
      'cirurgia_srpa',
      'obstetrica_admissoes',
      'obstetrica_trabalho_parto',
      'obstetrica_partos',
      'obstetrica_recem_nascidos',
      'obstetrica_desfechos_altas',
    ]

    for (const colName of colecoesClinicasRestritas) {
      try {
        const col = app.findCollectionByNameOrId(colName)
        if (col) {
          // Bloquear recepção de visualizar dados clínicos sensíveis
          col.listRule = "@request.auth.id != '' && @request.auth.role != 'recepcao'"
          col.viewRule = "@request.auth.id != '' && @request.auth.role != 'recepcao'"
          // Apenas profissionais clínicos, gestores ou admins podem criar/editar
          col.createRule =
            "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')"
          col.updateRule =
            "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')"
          col.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
          app.save(col)
        }
      } catch (err) {
        console.error('Erro ao ajustar regra da coleção:', colName, err)
      }
    }

    // 2. Proteção de coleções de farmácia:
    // Apenas profissionais, gestores e admins dispensam e alteram estoque
    try {
      const farmDisp = app.findCollectionByNameOrId('farmacia_dispensacoes')
      if (farmDisp) {
        farmDisp.createRule =
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')"
        farmDisp.updateRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
        farmDisp.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
        app.save(farmDisp)
      }

      const farmItens = app.findCollectionByNameOrId('farmacia_itens')
      if (farmItens) {
        farmItens.createRule =
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')"
        farmItens.updateRule =
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')"
        farmItens.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
        app.save(farmItens)
      }
    } catch (err) {
      console.error('Erro ao ajustar regras de farmácia:', err)
    }

    // 3. Regras de Internação e Leitos
    try {
      const inter = app.findCollectionByNameOrId('internacoes')
      if (inter) {
        inter.listRule = "@request.auth.id != ''"
        inter.viewRule = "@request.auth.id != ''"
        inter.createRule = "@request.auth.id != ''"
        inter.updateRule =
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')"
        inter.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
        app.save(inter)
      }

      const leitos = app.findCollectionByNameOrId('leitos')
      if (leitos) {
        leitos.createRule =
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor')"
        leitos.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
        app.save(leitos)
      }
    } catch (err) {
      console.error('Erro ao ajustar regras de internação/leitos:', err)
    }

    // 4. Regras de Auditoria: imutável (ninguém atualiza ou apaga registros de auditoria)
    try {
      const aud = app.findCollectionByNameOrId('auditoria')
      if (aud) {
        aud.listRule = "@request.auth.id != ''"
        aud.viewRule = "@request.auth.id != ''"
        aud.createRule = "@request.auth.id != ''"
        aud.updateRule = null // imutável
        aud.deleteRule = null // imutável
        app.save(aud)
      }
    } catch (err) {
      console.error('Erro ao ajustar regra de auditoria:', err)
    }

    // 5. Regras de Regulação: recepção pode apenas ver ou criar solicitação básica
    try {
      const reg = app.findCollectionByNameOrId('regulacao_solicitacoes')
      if (reg) {
        reg.updateRule =
          "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'gestor' || @request.auth.role = 'profissional')"
        reg.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"
        app.save(reg)
      }
    } catch (err) {
      console.error('Erro ao ajustar regras de regulação:', err)
    }
  },
  (app) => {
    // Reverter para autenticado geral caso necessário
    const colecoes = [
      'evolucoes_clinicas',
      'prescricoes',
      'prescricao_itens',
      'administracao_medicamentos',
      'exames',
      'cirurgias',
      'obstetrica_admissoes',
      'obstetrica_trabalho_parto',
      'obstetrica_partos',
      'obstetrica_recem_nascidos',
      'obstetrica_desfechos_altas',
    ]
    for (const c of colecoes) {
      try {
        const col = app.findCollectionByNameOrId(c)
        if (col) {
          col.listRule = "@request.auth.id != ''"
          col.viewRule = "@request.auth.id != ''"
          col.createRule = "@request.auth.id != ''"
          col.updateRule = "@request.auth.id != ''"
          app.save(col)
        }
      } catch {}
    }
  },
)
