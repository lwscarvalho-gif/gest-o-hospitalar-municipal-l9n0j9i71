migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const setoresCol = app.findCollectionByNameOrId('setores')
    const leitosCol = app.findCollectionByNameOrId('leitos')
    const pacientesCol = app.findCollectionByNameOrId('pacientes')
    const profissionaisCol = app.findCollectionByNameOrId('profissionais')
    const agendamentosCol = app.findCollectionByNameOrId('agendamentos')
    const internacoesCol = app.findCollectionByNameOrId('internacoes')
    const evolucoesCol = app.findCollectionByNameOrId('evolucoes_clinicas')
    const auditoriaCol = app.findCollectionByNameOrId('auditoria')
    const parametrosCol = app.findCollectionByNameOrId('parametros_integracao')

    // 1. Usuários semeados para cada perfil
    const seedUsers = [
      {
        email: 'lwscarvalho@gmail.com',
        password: 'Skip@Pass',
        name: 'Administrador Municipal',
        role: 'admin',
        cargo: 'Administrador do Sistema',
      },
      {
        email: 'admin@saude.gov.br',
        password: 'Skip@Pass',
        name: 'Gestor Geral de Saúde',
        role: 'admin',
        cargo: 'Secretário Municipal de Saúde',
      },
      {
        email: 'gestor@saude.gov.br',
        password: 'Skip@Pass',
        name: 'Dra. Helena Moreira',
        role: 'gestor',
        cargo: 'Diretora de Vigilância e Regulação',
      },
      {
        email: 'medico@saude.gov.br',
        password: 'Skip@Pass',
        name: 'Dr. Carlos Eduardo Ramos',
        role: 'profissional',
        cargo: 'Médico Clínico Geral',
        registro_profissional: 'CRM 4321-RO',
      },
      {
        email: 'recepcao@saude.gov.br',
        password: 'Skip@Pass',
        name: 'Mariana Santos',
        role: 'recepcao',
        cargo: 'Técnica de Acolhimento e Recepção',
      },
    ]

    for (const u of seedUsers) {
      try {
        const existing = app.findAuthRecordByEmail('_pb_users_auth_', u.email)
        existing.set('role', u.role)
        existing.set('name', u.name)
        existing.set('cargo', u.cargo)
        if (u.registro_profissional) existing.set('registro_profissional', u.registro_profissional)
        app.save(existing)
      } catch (_) {
        const rec = new Record(users)
        rec.setEmail(u.email)
        rec.setPassword(u.password)
        rec.setVerified(true)
        rec.set('name', u.name)
        rec.set('role', u.role)
        rec.set('cargo', u.cargo)
        if (u.registro_profissional) rec.set('registro_profissional', u.registro_profissional)
        app.save(rec)
      }
    }

    // 2. Setores municipais
    let enfermaria, uti, ambulatorio
    try {
      enfermaria = app.findFirstRecordByData('setores', 'sigla', 'ENF-01')
    } catch (_) {
      enfermaria = new Record(setoresCol)
      enfermaria.set('nome', 'Enfermaria Clínica Geral')
      enfermaria.set('sigla', 'ENF-01')
      enfermaria.set('tipo', 'enfermaria')
      enfermaria.set('capacidade', 12)
      enfermaria.set('ativo', true)
      enfermaria.set('descricao', 'Leitos de internação clínica adulto')
      app.save(enfermaria)
    }

    try {
      uti = app.findFirstRecordByData('setores', 'sigla', 'UTI-01')
    } catch (_) {
      uti = new Record(setoresCol)
      uti.set('nome', 'Unidade de Terapia Intensiva (UTI)')
      uti.set('sigla', 'UTI-01')
      uti.set('tipo', 'uti')
      uti.set('capacidade', 6)
      uti.set('ativo', true)
      uti.set('descricao', 'Cuidados intensivos e monitoramento contínuo')
      app.save(uti)
    }

    try {
      ambulatorio = app.findFirstRecordByData('setores', 'sigla', 'AMB-01')
    } catch (_) {
      ambulatorio = new Record(setoresCol)
      ambulatorio.set('nome', 'Ambulatório de Especialidades')
      ambulatorio.set('sigla', 'AMB-01')
      ambulatorio.set('tipo', 'ambulatorio')
      ambulatorio.set('capacidade', 20)
      ambulatorio.set('ativo', true)
      ambulatorio.set('descricao', 'Consultas eletivas e retornos')
      app.save(ambulatorio)
    }

    // 3. Leitos
    let l101, l102, l103, l201
    try {
      l101 = app.findFirstRecordByData('leitos', 'codigo', 'LEITO-101')
    } catch (_) {
      l101 = new Record(leitosCol)
      l101.set('codigo', 'LEITO-101')
      l101.set('setor', enfermaria.id)
      l101.set('tipo', 'clinico')
      l101.set('status', 'ocupado')
      l101.set('observacoes', 'Oxigênio canalizado, monitor cardíaco')
      app.save(l101)
    }

    try {
      l102 = app.findFirstRecordByData('leitos', 'codigo', 'LEITO-102')
    } catch (_) {
      l102 = new Record(leitosCol)
      l102.set('codigo', 'LEITO-102')
      l102.set('setor', enfermaria.id)
      l102.set('tipo', 'clinico')
      l102.set('status', 'vago')
      l102.set('observacoes', 'Higienizado e pronto para admissão')
      app.save(l102)
    }

    try {
      l103 = app.findFirstRecordByData('leitos', 'codigo', 'LEITO-103')
    } catch (_) {
      l103 = new Record(leitosCol)
      l103.set('codigo', 'LEITO-103')
      l103.set('setor', enfermaria.id)
      l103.set('tipo', 'clinico')
      l103.set('status', 'higienizacao')
      l103.set('observacoes', 'Em processo de desinfecção terminal')
      app.save(l103)
    }

    try {
      l201 = app.findFirstRecordByData('leitos', 'codigo', 'UTI-01')
    } catch (_) {
      l201 = new Record(leitosCol)
      l201.set('codigo', 'UTI-01')
      l201.set('setor', uti.id)
      l201.set('tipo', 'uti')
      l201.set('status', 'vago')
      l201.set('observacoes', 'Ventilador mecânico calibrado')
      app.save(l201)
    }

    // 4. Pacientes
    let pac1, pac2, pac3
    try {
      pac1 = app.findFirstRecordByData('pacientes', 'cartao_sus', '898001122334455')
    } catch (_) {
      pac1 = new Record(pacientesCol)
      pac1.set('nome', 'Sebastião Pereira da Silva')
      pac1.set('cpf', '423.891.202-45')
      pac1.set('cartao_sus', '898001122334455')
      pac1.set('data_nascimento', '1962-08-14')
      pac1.set('sexo', 'M')
      pac1.set('nome_mae', 'Francisca Pereira da Silva')
      pac1.set('telefone', '(69) 99234-1188')
      pac1.set('endereco', 'Rua das Flores, 245')
      pac1.set('bairro', 'Centro')
      pac1.set('cidade', 'Mirante da Serra')
      pac1.set('tipo_sanguineo', 'O+')
      pac1.set('alergias', 'Dipirona')
      pac1.set('observacoes', 'Hipertenso e diabético tipo 2')
      app.save(pac1)
    }

    try {
      pac2 = app.findFirstRecordByData('pacientes', 'cartao_sus', '745009988112233')
    } catch (_) {
      pac2 = new Record(pacientesCol)
      pac2.set('nome', 'Maria Aparecida de Oliveira')
      pac2.set('cpf', '612.443.909-12')
      pac2.set('cartao_sus', '745009988112233')
      pac2.set('data_nascimento', '1978-03-22')
      pac2.set('sexo', 'F')
      pac2.set('nome_mae', 'Lourdes de Oliveira')
      pac2.set('telefone', '(69) 98455-6721')
      pac2.set('endereco', 'Av. Brasil, 1100')
      pac2.set('bairro', 'Setor Pioneiro')
      pac2.set('cidade', 'Mirante da Serra')
      pac2.set('tipo_sanguineo', 'A+')
      pac2.set('alergias', 'Sem alergias conhecidas')
      pac2.set('observacoes', 'Acompanhamento pré-cirúrgico')
      app.save(pac2)
    }

    try {
      pac3 = app.findFirstRecordByData('pacientes', 'cartao_sus', '233445566778899')
    } catch (_) {
      pac3 = new Record(pacientesCol)
      pac3.set('nome', 'Lucas Gabriel Souza')
      pac3.set('cpf', '055.981.332-90')
      pac3.set('cartao_sus', '233445566778899')
      pac3.set('data_nascimento', '2005-11-09')
      pac3.set('sexo', 'M')
      pac3.set('nome_mae', 'Renata Ferreira Souza')
      pac3.set('telefone', '(69) 99312-4400')
      pac3.set('endereco', 'Linha 64, Gleba 02')
      pac3.set('bairro', 'Zona Rural')
      pac3.set('cidade', 'Mirante da Serra')
      pac3.set('tipo_sanguineo', 'B+')
      pac3.set('alergias', 'Penicilina')
      pac3.set('observacoes', 'Atendimento ambulatorial')
      app.save(pac3)
    }

    // 5. Profissionais de saúde
    let prof1, prof2
    try {
      prof1 = app.findFirstRecordByData('profissionais', 'registro_conselho', 'CRM 4321-RO')
    } catch (_) {
      prof1 = new Record(profissionaisCol)
      prof1.set('nome', 'Dr. Carlos Eduardo Ramos')
      prof1.set('categoria', 'medico')
      prof1.set('registro_conselho', 'CRM 4321-RO')
      prof1.set('especialidade', 'Clínica Médica e Terapia Intensiva')
      prof1.set('cpf', '332.112.556-78')
      prof1.set('telefone', '(69) 99988-1234')
      prof1.set('email', 'carlos.ramos@saude.gov.br')
      prof1.set('setor_padrao', enfermaria.id)
      prof1.set('ativo', true)
      app.save(prof1)
    }

    try {
      prof2 = app.findFirstRecordByData('profissionais', 'registro_conselho', 'CRM 8765-RO')
    } catch (_) {
      prof2 = new Record(profissionaisCol)
      prof2.set('nome', 'Dra. Juliana Vasconcelos')
      prof2.set('categoria', 'medico')
      prof2.set('registro_conselho', 'CRM 8765-RO')
      prof2.set('especialidade', 'Cardiologia')
      prof2.set('cpf', '554.223.119-01')
      prof2.set('telefone', '(69) 99877-5432')
      prof2.set('email', 'juliana.cardio@saude.gov.br')
      prof2.set('setor_padrao', ambulatorio.id)
      prof2.set('ativo', true)
      app.save(prof2)
    }

    // 6. Internação ativa para o paciente Sebastião no leito LEITO-101
    let internacao1
    const hoje = new Date().toISOString().slice(0, 10)
    try {
      internacao1 = app.findFirstRecordByData('internacoes', 'paciente', pac1.id)
    } catch (_) {
      internacao1 = new Record(internacoesCol)
      internacao1.set('paciente', pac1.id)
      internacao1.set('leito_atual', l101.id)
      internacao1.set('setor_atual', enfermaria.id)
      internacao1.set('medico_responsavel', prof1.id)
      internacao1.set('data_admissao', hoje + ' 08:30')
      internacao1.set('motivo_admissao', 'Descompensação hemodinâmica e crise hipertensiva severa')
      internacao1.set(
        'diagnostico_inicial',
        'Hipertensão arterial essencial em descompensação aguda',
      )
      internacao1.set('cid10_admissao', 'I10')
      internacao1.set('status', 'ativa')
      internacao1.set(
        'historico_leitos',
        JSON.stringify([
          {
            data: hoje + ' 08:30',
            de: 'Admissão',
            para: 'LEITO-101 (Enfermaria Clínica Geral)',
            motivo: 'Admissão hospitalar direta',
            responsavel: 'Mariana Santos (Recepção)',
          },
        ]),
      )
      app.save(internacao1)
    }

    // 7. Evolução clínica inicial vinculada
    try {
      app.findFirstRecordByData('evolucoes_clinicas', 'paciente', pac1.id)
    } catch (_) {
      const evo = new Record(evolucoesCol)
      evo.set('paciente', pac1.id)
      evo.set('internacao', internacao1.id)
      evo.set('profissional', prof1.id)
      evo.set('tipo', 'evolucao_medica')
      evo.set('data_hora', hoje + ' 10:15')
      evo.set(
        'descricao',
        'Paciente lúcido e orientado, queixando-se de cefaleia holocraniana moderada. Murmúrios vesiculares presentes sem ruídos adventícios.',
      )
      evo.set('diagnostico', 'Crise hipertensiva controlada após medicação venosa')
      evo.set('cid10', 'I10')
      evo.set(
        'sinais_vitais',
        'PA: 140/90 mmHg | FC: 76 bpm | Temp: 36.4°C | SatO2: 97% em ar ambiente',
      )
      evo.set(
        'conduta',
        'Manter repouso no leito, dieta hipossódica, anti-hipertensivo VO e monitoramento da pressão arterial a cada 4 horas.',
      )
      app.save(evo)
    }

    // 8. Agendamentos
    try {
      app.findFirstRecordByData('agendamentos', 'paciente', pac2.id)
    } catch (_) {
      const ag1 = new Record(agendamentosCol)
      ag1.set('paciente', pac2.id)
      ag1.set('profissional', prof2.id)
      ag1.set('setor', ambulatorio.id)
      ag1.set('tipo', 'consulta')
      ag1.set('data_hora', hoje + 'T14:00')
      ag1.set('status', 'confirmado')
      ag1.set('motivo', 'Avaliação cardiológica de rotina e eletrocardiograma')
      ag1.set('observacoes', 'Paciente traz exames laboratoriais anteriores')
      app.save(ag1)
    }

    try {
      app.findFirstRecordByData('agendamentos', 'paciente', pac3.id)
    } catch (_) {
      const ag2 = new Record(agendamentosCol)
      ag2.set('paciente', pac3.id)
      ag2.set('profissional', prof1.id)
      ag2.set('setor', ambulatorio.id)
      ag2.set('tipo', 'retorno')
      ag2.set('data_hora', hoje + 'T15:30')
      ag2.set('status', 'agendado')
      ag2.set('motivo', 'Revisão de medicação e avaliação geral')
      ag2.set('observacoes', 'Primeira consulta de retorno pós-atendimento')
      app.save(ag2)
    }

    // 9. Parâmetros de Integração Governamental (Fase 1: Configuração e Exportação Fictícia/Layout)
    const parametrosGov = [
      {
        codigo: 'CNES',
        titulo: 'CNES - Cadastro Nacional de Estabelecimentos de Saúde',
        status_conexao: 'pendente_fase2',
        configuracoes: JSON.stringify({
          codigo_unidade: '7823901',
          orgao_emissor: 'Secretaria Municipal de Saúde de Mirante da Serra - RO',
          versao_layout: 'CNES-XML v4.2',
          ambiente: 'Homologação DATASUS',
          responsavel_tecnico: 'Dr. Carlos Eduardo Ramos',
        }),
        observacoes:
          'Parâmetros municipais salvos. Conexão direta com webservice DATASUS programada para a Fase 2.',
      },
      {
        codigo: 'ESUS',
        titulo: 'e-SUS APS / SISAB - Atenção Primária em Saúde',
        status_conexao: 'pendente_fase2',
        configuracoes: JSON.stringify({
          versao_thrift: 'Thrift v3.2.14',
          cnes_matriz: '7823901',
          ine_equipe_padrao: '0001284792',
          tipo_envio: 'Lote Periódico Oficial',
          chave_integrador: 'MS-RO-SMS-2025-ALPHA',
        }),
        observacoes:
          'Layout de exportação e-SUS estruturado para envio dos atendimentos e cadastros simplificados.',
      },
      {
        codigo: 'TISS_SIGTAP',
        titulo: 'TISS / SIGTAP - Tabela Unificada e Faturamento SUS',
        status_conexao: 'homologacao',
        configuracoes: JSON.stringify({
          versao_tiss: 'TISS 04.01.00',
          competencia_sigtap: '2025/03',
          codigo_prestador: '990142-RO',
          modalidade_atendimento: 'Ambulatorial e Hospitalar Municipal',
        }),
        observacoes:
          'Tabela SIGTAP parametrizada com códigos de procedimentos e diárias hospitalares.',
      },
    ]

    for (const p of parametrosGov) {
      try {
        app.findFirstRecordByData('parametros_integracao', 'codigo', p.codigo)
      } catch (_) {
        const rec = new Record(parametrosCol)
        rec.set('codigo', p.codigo)
        rec.set('titulo', p.titulo)
        rec.set('status_conexao', p.status_conexao)
        rec.set('configuracoes', p.configuracoes)
        rec.set('observacoes', p.observacoes)
        rec.set('ultima_exportacao', hoje + ' 07:00')
        app.save(rec)
      }
    }

    // 10. Registro inicial de auditoria
    try {
      app.findFirstRecordByData('auditoria', 'acao', 'INICIALIZACAO_SISTEMA')
    } catch (_) {
      const aud = new Record(auditoriaCol)
      aud.set('usuario_id', 'sistema')
      aud.set('usuario_nome', 'Sistema de Gestão Hospitalar')
      aud.set('usuario_role', 'admin')
      aud.set('acao', 'INICIALIZACAO_SISTEMA')
      aud.set('modulo', 'Parametrização')
      aud.set(
        'detalhes',
        'Carga inicial de dados de demonstração da Fase 1 realizada com sucesso para a Secretaria de Saúde.',
      )
      aud.set('ip_info', '127.0.0.1 (servidor municipal)')
      app.save(aud)
    }
  },
  (app) => {
    // down logic is optional for idempotent seeds
  },
)
