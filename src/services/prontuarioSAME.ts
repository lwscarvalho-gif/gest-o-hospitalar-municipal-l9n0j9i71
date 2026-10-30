import pb from '@/lib/pocketbase/client'
import {
  EventoProntuarioUnificado,
  Paciente,
  FichaProntoAtendimento,
  Internacao,
  EvolucaoClinica,
  DispensacaoFarmacia,
  Agendamento,
  PrescricaoMedica,
  AdministracaoMedicamento,
  ExameItem,
  Cirurgia,
  ChecklistPreOperatorio,
  AtoOperatorio,
  RecuperacaoPosAnestesica,
} from '@/types/hospital'
import { listarPrescricoes, listarAdministracoesMedicamentos } from './prescricoes'
import { listarExames } from './exames'
import { listarCirurgias } from './centroCirurgico'
import { NotificacaoVigilancia } from '@/types/hospital'

/**
 * SERVIÇO SAME — PRONTUÁRIO ELETRÔNICO ÚNICO / CONSOLIDADO
 * Agrega todas as ocorrências de saúde do paciente em ordem cronológica reversa (linha do tempo).
 */

export async function carregarProntuarioUnificado(
  pacienteId: string,
): Promise<{ paciente: Paciente; eventos: EventoProntuarioUnificado[] }> {
  // 1. Obter paciente com dados cadastrais e alergias
  const paciente = await pb.collection('pacientes').getOne<Paciente>(pacienteId)

  // 2. Carregar todas as coleções clínicas associadas a esse paciente em paralelo
  const [
    atendimentosPA,
    internacoes,
    evolucoes,
    dispensacoes,
    agendamentos,
    prescricoes,
    administracoes,
    exames,
    cirurgias,
    checklistsPreOp,
    atosOperatorios,
    recuperacoesSrpa,
    impressosAssistenciais,
    notificacoesVigilancia,
    obstetricaAdmissoes,
    obstetricaTrabalhoParto,
    obstetricaPartos,
    obstetricaRecemNascidos,
    obstetricaDesfechosAltas,
    solicitacoesRegulacao,
  ] = await Promise.all([
    pb
      .collection('pronto_atendimento')
      .getFullList<FichaProntoAtendimento>({
        filter: `paciente = "${pacienteId}"`,
        sort: '-created',
        expand: 'profissional_atendimento,leito_encaminhado',
      })
      .catch(() => [] as FichaProntoAtendimento[]),

    pb
      .collection('internacoes')
      .getFullList<Internacao>({
        filter: `paciente = "${pacienteId}"`,
        sort: '-created',
        expand: 'leito_atual,setor_atual,medico_responsavel',
      })
      .catch(() => [] as Internacao[]),

    pb
      .collection('evolucoes_clinicas')
      .getFullList<EvolucaoClinica>({
        filter: `paciente = "${pacienteId}"`,
        sort: '-created',
        expand: 'profissional,internacao',
      })
      .catch(() => [] as EvolucaoClinica[]),

    pb
      .collection('farmacia_dispensacoes')
      .getFullList<DispensacaoFarmacia>({
        filter: `paciente = "${pacienteId}"`,
        sort: '-created',
        expand: 'item,prescricao_relacionada',
      })
      .catch(() => [] as DispensacaoFarmacia[]),

    pb
      .collection('agendamentos')
      .getFullList<Agendamento>({
        filter: `paciente = "${pacienteId}"`,
        sort: '-created',
        expand: 'profissional,setor',
      })
      .catch(() => [] as Agendamento[]),

    listarPrescricoes({ pacienteId }),

    listarAdministracoesMedicamentos({ pacienteId }),

    listarExames({ pacienteId }),

    listarCirurgias({ pacienteId }),

    pb
      .collection('checklists_pre_operatorios')
      .getFullList<ChecklistPreOperatorio>({
        filter: `paciente = "${pacienteId}"`,
        sort: '-created',
        expand: 'responsavel,cirurgia',
      })
      .catch(() => [] as ChecklistPreOperatorio[]),

    pb
      .collection('atos_operatorios')
      .getFullList<AtoOperatorio>({
        filter: `paciente = "${pacienteId}"`,
        sort: '-created',
        expand: 'cirurgiao,cirurgia',
      })
      .catch(() => [] as AtoOperatorio[]),

    pb
      .collection('recuperacao_pos_anestesica')
      .getFullList<RecuperacaoPosAnestesica>({
        filter: `paciente = "${pacienteId}"`,
        sort: '-created',
        expand: 'responsavel,cirurgia',
      })
      .catch(() => [] as RecuperacaoPosAnestesica[]),

    pb
      .collection('impressos_assistenciais')
      .getFullList<any>({
        filter: `paciente = "${pacienteId}"`,
        sort: '-created',
        expand: 'profissional,atendimento_pa,internacao,prescricao_origem',
      })
      .catch(() => [] as any[]),

    pb
      .collection('notificacoes_vigilancia')
      .getFullList<NotificacaoVigilancia>({
        filter: `paciente = "${pacienteId}"`,
        sort: '-data_notificacao,-created',
        expand: 'profissional_notificante',
      })
      .catch(() => [] as NotificacaoVigilancia[]),

    // Centro Obstétrico: Admissões, Trabalho de Parto, Partos, RNs e Desfechos/Altas
    pb
      .collection('obstetrica_admissoes')
      .getFullList<any>({
        filter: `paciente = "${pacienteId}"`,
        sort: '-data_hora_admissao,-created',
        expand: 'profissional_responsavel,leito,internacao',
      })
      .catch(() => [] as any[]),

    pb
      .collection('obstetrica_trabalho_parto')
      .getFullList<any>({
        filter: `paciente = "${pacienteId}"`,
        sort: '-data_hora_registro,-created',
        expand: 'profissional_registro,admissao_obstetrica',
      })
      .catch(() => [] as any[]),

    pb
      .collection('obstetrica_partos')
      .getFullList<any>({
        filter: `paciente_mae = "${pacienteId}"`,
        sort: '-data_hora_parto,-created',
        expand: 'medico_obstetra,admissao_obstetrica',
      })
      .catch(() => [] as any[]),

    pb
      .collection('obstetrica_recem_nascidos')
      .getFullList<any>({
        filter: `mae_paciente = "${pacienteId}" || paciente_rn_cadastro = "${pacienteId}"`,
        sort: '-data_hora_nascimento,-created',
        expand: 'parto,admissao_obstetrica,mae_paciente',
      })
      .catch(() => [] as any[]),

    pb
      .collection('obstetrica_desfechos_altas')
      .getFullList<any>({
        filter: `paciente_mae = "${pacienteId}"`,
        sort: '-data_hora_desfecho,-created',
        expand: 'profissional_alta,admissao_obstetrica',
      })
      .catch(() => [] as any[]),

    // Central de Regulação Interna: Solicitações vinculadas ao paciente
    pb
      .collection('regulacao_solicitacoes')
      .getFullList<any>({
        filter: `paciente = "${pacienteId}"`,
        sort: '-data_hora_solicitacao,-created',
        expand:
          'setor_origem,setor_destino,leito_destino,profissional_solicitante,profissional_regulador',
      })
      .catch(() => [] as any[]),
  ])

  const eventos: EventoProntuarioUnificado[] = []

  // A. Atendimentos do Pronto Atendimento (PA)
  atendimentosPA.forEach((pa) => {
    // Evento de Triagem e Chegada
    eventos.push({
      id: `pa-chegada-${pa.id}`,
      tipo: 'pa_triagem',
      dataHora: pa.data_hora_triagem || pa.data_hora_chegada || pa.created,
      titulo: `Pronto Atendimento — Triagem Manchester (${(pa.classificacao_risco || 'Sem risco').toUpperCase()})`,
      subtitulo: pa.triador_nome ? `Triador: ${pa.triador_nome}` : undefined,
      descricao: pa.queixa_principal ? `Queixa: ${pa.queixa_principal}` : 'Acolhimento no PA',
      detalhes: {
        discriminador: pa.discriminador,
        sinais_vitais: pa.sinais_vitais,
        status: pa.status,
      },
      profissionalNome: pa.triador_nome,
      badgeTexto: `PA • ${(pa.classificacao_risco || 'Triagem').toUpperCase()}`,
      badgeCor:
        pa.classificacao_risco === 'vermelho'
          ? 'bg-red-600 text-white'
          : pa.classificacao_risco === 'laranja'
            ? 'bg-orange-500 text-white'
            : pa.classificacao_risco === 'amarelo'
              ? 'bg-amber-500 text-white'
              : pa.classificacao_risco === 'verde'
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 text-white',
      icone: 'Flame',
      registroOriginal: pa,
    })

    // Evento de Consulta / Conduta Médica do PA (se já atendido)
    if (pa.diagnostico || pa.conduta || pa.evolucao_clinica) {
      eventos.push({
        id: `pa-atend-${pa.id}`,
        tipo: 'pa_atendimento',
        dataHora: pa.data_hora_atendimento || pa.data_hora_finalizacao || pa.updated,
        titulo: `Pronto Atendimento — Atendimento Clínico & Conduta: ${(pa.conduta || 'Atendido').toUpperCase()}`,
        subtitulo: pa.expand?.profissional_atendimento?.nome
          ? `Médico: ${pa.expand.profissional_atendimento.nome}`
          : undefined,
        descricao: pa.diagnostico ? `Diagnóstico: ${pa.diagnostico}` : pa.evolucao_clinica,
        detalhes: {
          cid10: pa.cid10,
          evolucao_clinica: pa.evolucao_clinica,
          conduta: pa.conduta,
          observacoes_conduta: pa.observacoes_conduta,
          leito_encaminhado: pa.expand?.leito_encaminhado?.codigo,
        },
        profissionalNome: pa.expand?.profissional_atendimento?.nome,
        badgeTexto: `Conduta: ${pa.conduta || 'Alta'}`,
        badgeCor: 'bg-slate-800 text-white',
        icone: 'Stethoscope',
        registroOriginal: pa,
      })
    }
  })

  // B. Internações Hospitalares
  internacoes.forEach((inter) => {
    // Admissão
    eventos.push({
      id: `int-adm-${inter.id}`,
      tipo: 'internacao_admissao',
      dataHora: inter.data_admissao || inter.created,
      titulo: `Internação Hospitalar — Admissão no Leito ${inter.expand?.leito_atual?.codigo || 'Leito'}`,
      subtitulo: `Setor: ${inter.expand?.setor_atual?.nome || 'Setor'} | Médico: ${inter.expand?.medico_responsavel?.nome || 'Plantão'}`,
      descricao: `Motivo: ${inter.motivo_admissao}${inter.diagnostico_inicial ? ` • Hipótese: ${inter.diagnostico_inicial}` : ''}`,
      detalhes: {
        cid10: inter.cid10_admissao,
        status: inter.status,
      },
      profissionalNome: inter.expand?.medico_responsavel?.nome,
      setorOuLeito: `${inter.expand?.setor_atual?.nome} / ${inter.expand?.leito_atual?.codigo}`,
      badgeTexto: 'Internação Admissão',
      badgeCor: 'bg-indigo-600 text-white',
      icone: 'Bed',
      registroOriginal: inter,
    })

    // Movimentações entre leitos
    try {
      let historico: any[] = []
      if (typeof inter.historico_leitos === 'string') {
        historico = JSON.parse(inter.historico_leitos) || []
      } else if (Array.isArray(inter.historico_leitos)) {
        historico = inter.historico_leitos
      }
      historico.slice(1).forEach((mov, idx) => {
        eventos.push({
          id: `int-mov-${inter.id}-${idx}`,
          tipo: 'internacao_transferencia',
          dataHora: mov.data || inter.updated,
          titulo: `Transferência de Leito: ${mov.de} → ${mov.para}`,
          subtitulo: mov.responsavel ? `Responsável: ${mov.responsavel}` : undefined,
          descricao: mov.motivo ? `Motivo: ${mov.motivo}` : 'Transferência entre leitos/setores',
          badgeTexto: 'Transferência',
          badgeCor: 'bg-amber-600 text-white',
          icone: 'ArrowRightLeft',
          registroOriginal: mov,
        })
      })
    } catch {
      // ignora se parse falhar
    }

    // Alta Hospitalar
    if (inter.status === 'alta' && inter.data_alta) {
      eventos.push({
        id: `int-alta-${inter.id}`,
        tipo: 'internacao_alta',
        dataHora: inter.data_alta,
        titulo: `Alta Hospitalar — Leito ${inter.expand?.leito_atual?.codigo || ''}`,
        subtitulo: `Setor: ${inter.expand?.setor_atual?.nome || ''}`,
        descricao: inter.motivo_alta || 'Alta médica com melhora clínica',
        badgeTexto: 'Alta Hospitalar',
        badgeCor: 'bg-emerald-700 text-white',
        icone: 'LogOut',
        registroOriginal: inter,
      })
    }
  })

  // C. Evoluções Clínicas e Anotações de Enfermagem
  evolucoes.forEach((ev) => {
    const isEnf = ev.tipo === 'anotacao_enfermagem'
    const isPresc = ev.tipo === 'prescricao'
    const isAlta = ev.tipo === 'alta'

    const rotuloTipo: Record<string, string> = {
      evolucao_medica: 'Evolução Médica',
      anotacao_enfermagem: 'Anotação de Enfermagem',
      diagnostico: 'Diagnóstico Clínico',
      prescricao: 'Prescrição / Conduta',
      alta: 'Sumário de Alta',
    }

    eventos.push({
      id: `ev-${ev.id}`,
      tipo: 'evolucao_clinica',
      dataHora: ev.data_hora || ev.created,
      titulo: rotuloTipo[ev.tipo] || 'Registro Clínico Assistencial',
      subtitulo: ev.expand?.profissional?.nome
        ? `${ev.expand.profissional.nome} (${ev.expand.profissional.registro_conselho || 'SMS'})`
        : undefined,
      descricao: ev.descricao,
      detalhes: {
        diagnostico: ev.diagnostico,
        cid10: ev.cid10,
        sinais_vitais: ev.sinais_vitais,
        conduta: ev.conduta,
      },
      profissionalNome: ev.expand?.profissional?.nome,
      badgeTexto: rotuloTipo[ev.tipo] || 'Evolução',
      badgeCor: isEnf
        ? 'bg-teal-600 text-white'
        : isPresc
          ? 'bg-amber-600 text-white'
          : isAlta
            ? 'bg-slate-700 text-white'
            : 'bg-blue-600 text-white',
      icone: isEnf ? 'ClipboardList' : 'Activity',
      registroOriginal: ev,
    })
  })

  // D. Prescrições Médicas Digitais
  prescricoes.forEach((p) => {
    const qtdItens = p.itens?.length || 0
    const listaNomes =
      p.itens
        ?.map((i) => `${i.medicamento_nome} (${i.dose} ${i.via_administracao} ${i.frequencia})`)
        .join('; ') || ''

    const isPA = p.origem === 'pronto_atendimento' || !!p.atendimento_pa
    eventos.push({
      id: `presc-${p.id}`,
      tipo: 'prescricao_medica',
      dataHora: p.data_prescricao || p.created,
      titulo: `Prescrição Médica ${isPA ? '(Pronto Atendimento)' : '(Internação)'} (${qtdItens} item${qtdItens !== 1 ? 'ns' : ''}) — Status: ${p.status.toUpperCase()}`,
      subtitulo: p.medico_nome ? `Médico: ${p.medico_nome}` : undefined,
      descricao: listaNomes || p.observacoes_gerais || 'Prescrição medicamentosa emitida',
      detalhes: {
        status: p.status,
        origem: isPA ? 'Pronto Atendimento' : 'Internação',
        itens: p.itens,
        observacoes: p.observacoes_gerais,
      },
      profissionalNome: p.medico_nome,
      badgeTexto: `${isPA ? 'PA' : 'Internação'} • ${p.status.toUpperCase()}`,
      badgeCor: p.status === 'ativa' ? 'bg-purple-600 text-white' : 'bg-slate-600 text-white',
      icone: 'FileText',
      registroOriginal: p,
    })
  })

  // E. Administração de Medicamentos ao Leito / Sala de Medicação PA (Enfermagem)
  administracoes.forEach((adm) => {
    const isPAAdm = !!adm.atendimento_pa
    const isRetificacao = adm.tipo_registro === 'retificacao'
    const titulo = isRetificacao
      ? `Retificação Rastreável de Administração (${isPAAdm ? 'PA' : 'Leito'}): ${adm.medicamento_nome} (${adm.status.toUpperCase()})`
      : `Administração/Checagem (${isPAAdm ? 'PA' : 'Leito'}): ${adm.medicamento_nome} (${adm.status.toUpperCase()})`

    const subtitulo = isRetificacao
      ? `Retificado por: ${adm.responsavel_nome} (${adm.responsavel_cargo || 'Enfermagem'})${adm.registro_original ? ` • Ref. Original: #${adm.registro_original.slice(-6)}` : ''}`
      : `Aplicado por: ${adm.responsavel_nome} (${adm.responsavel_cargo || 'Enfermagem'})`

    const descricao = `${isRetificacao ? `[RETIFICAÇÃO] Motivo: ${adm.motivo_correcao || 'Correção de registro'}\n` : ''}Dose: ${adm.dose_administrada || 'Padrão'} | Via: ${adm.via_administrada || 'Conforme prescrição'}${adm.observacoes ? ` • Obs: ${adm.observacoes}` : ''}`

    eventos.push({
      id: `adm-${adm.id}`,
      tipo: 'administracao_enfermagem',
      dataHora: adm.data_hora_administracao || adm.created,
      titulo,
      subtitulo,
      descricao,
      detalhes: {
        medicamento: adm.medicamento_nome,
        dose: adm.dose_administrada,
        via: adm.via_administrada,
        status: adm.status,
        tipo_registro: adm.tipo_registro || 'ato_original',
        registro_original: adm.registro_original,
        motivo_correcao: adm.motivo_correcao,
        origem: isPAAdm ? 'Pronto Atendimento' : 'Internação',
        observacoes: adm.observacoes,
      },
      profissionalNome: adm.responsavel_nome,
      badgeTexto: isRetificacao
        ? `Retificação • ${adm.status}`
        : `${isPAAdm ? 'PA' : 'Leito'} • ${adm.status}`,
      badgeCor: isRetificacao
        ? 'bg-amber-700 text-white'
        : adm.status === 'administrado'
          ? 'bg-emerald-600 text-white'
          : adm.status === 'recusado'
            ? 'bg-rose-600 text-white'
            : 'bg-amber-600 text-white',
      icone: 'CheckCircle2',
      registroOriginal: adm,
    })
  })

  // F. Farmácia & Dispensações
  dispensacoes.forEach((d) => {
    const nomeItem = d.expand?.item?.nome || 'Medicamento/Material'
    const unidade = d.expand?.item?.unidade_medida || 'un'
    const vinculado = d.expand?.prescricao_relacionada || d.prescricao_origem

    eventos.push({
      id: `farm-disp-${d.id}`,
      tipo: 'dispensacao_farmacia',
      dataHora: d.data_dispensacao || d.created,
      titulo: `Farmácia Hospitalar — Dispensação: ${d.quantidade} ${unidade}(s) de ${nomeItem}`,
      subtitulo: d.profissional_dispensador
        ? `Dispensado por: ${d.profissional_dispensador}`
        : undefined,
      descricao: `Lote: ${d.lote || 'N/I'}${vinculado ? ` • Origem/Prescrição: ${d.prescricao_origem || 'Prescrição Internação'}` : ''}${d.observacoes ? ` • ${d.observacoes}` : ''}`,
      detalhes: {
        item: nomeItem,
        quantidade: d.quantidade,
        unidade,
        lote: d.lote,
        prescricao: d.prescricao_origem,
        tipo_movimento: d.tipo_movimento,
      },
      profissionalNome: d.profissional_dispensador,
      badgeTexto: 'Dispensação Farmácia',
      badgeCor: 'bg-emerald-700 text-white',
      icone: 'Pill',
      registroOriginal: d,
    })
  })

  // G. Agendamentos Ambulatoriais
  agendamentos.forEach((ag) => {
    eventos.push({
      id: `ag-${ag.id}`,
      tipo: 'agendamento',
      dataHora: ag.data_hora || ag.created,
      titulo: `Agendamento Ambulatorial: ${ag.tipo.toUpperCase()} (${ag.status.toUpperCase()})`,
      subtitulo: ag.expand?.profissional?.nome
        ? `Especialista: ${ag.expand.profissional.nome} (${ag.expand.profissional.especialidade})`
        : undefined,
      descricao: ag.motivo || 'Consulta agendada pela rede municipal',
      detalhes: {
        tipo: ag.tipo,
        status: ag.status,
        setor: ag.expand?.setor?.nome,
      },
      profissionalNome: ag.expand?.profissional?.nome,
      badgeTexto: `Agendamento • ${ag.status}`,
      badgeCor: ag.status === 'atendido' ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-white',
      icone: 'Calendar',
      registroOriginal: ag,
    })
  })

  // H. Ciclo de Exames & Laudos (Solicitação, Coleta, Análise e Laudo Liberado)
  exames.forEach((ex) => {
    // 1. Evento do Laudo / Resultado Concluído
    if (ex.status === 'liberado' && (ex.laudo_texto || ex.resultado_sumario)) {
      eventos.push({
        id: `ex-laudo-${ex.id}`,
        tipo: 'exame_laudado',
        dataHora: ex.data_laudo || ex.updated || ex.created,
        titulo: `Laudo de Exame Liberado: ${ex.tipo_exame}`,
        subtitulo: ex.responsavel_laudo_nome
          ? `Laudado por: ${ex.responsavel_laudo_nome}`
          : undefined,
        descricao: ex.resultado_sumario
          ? `Resultado: ${ex.resultado_sumario}\n\n${ex.laudo_texto || ''}`
          : ex.laudo_texto || 'Laudo emitido e disponibilizado ao prontuário',
        detalhes: {
          tipo_exame: ex.tipo_exame,
          categoria: ex.categoria,
          resultado_sumario: ex.resultado_sumario,
          laudo_texto: ex.laudo_texto,
          responsavel_laudo: ex.responsavel_laudo_nome,
          data_solicitacao: ex.data_solicitacao,
          solicitante: ex.solicitante_nome,
        },
        profissionalNome: ex.responsavel_laudo_nome || ex.solicitante_nome,
        badgeTexto: `Resultado: ${ex.resultado_sumario || 'Liberado'}`,
        badgeCor: 'bg-teal-700 text-white',
        icone: 'FlaskConical',
        registroOriginal: ex,
      })
    }

    // 2. Evento do Pedido / Solicitação Inicial do Exame
    const rotuloStatus =
      {
        solicitado: 'Solicitado (Fila)',
        coletado: 'Material Coletado',
        em_analise: 'Em Análise',
        liberado: 'Laudo Liberado',
        cancelado: 'Cancelado',
      }[ex.status] || ex.status

    const corStatus =
      {
        solicitado: 'bg-amber-600 text-white',
        coletado: 'bg-blue-600 text-white',
        em_analise: 'bg-purple-600 text-white',
        liberado: 'bg-emerald-600 text-white',
        cancelado: 'bg-red-600 text-white',
      }[ex.status] || 'bg-slate-600 text-white'

    eventos.push({
      id: `ex-ped-${ex.id}`,
      tipo:
        ex.status === 'cancelado'
          ? 'exame_cancelado'
          : ex.status === 'em_analise'
            ? 'exame_em_analise'
            : ex.status === 'coletado'
              ? 'exame_coletado'
              : 'exame_solicitado',
      dataHora: ex.data_solicitacao || ex.created,
      titulo: `Pedido de Exame: ${ex.tipo_exame} (${ex.prioridade.toUpperCase()})`,
      subtitulo: `Solicitante: ${ex.solicitante_nome}${ex.expand?.setor?.nome ? ` • Setor: ${ex.expand.setor.nome}` : ''}`,
      descricao: `${ex.justificativa ? `Justificativa clínica: ${ex.justificativa}` : 'Exame complementar solicitado'}${
        ex.motivo_cancelamento ? ` • Motivo do cancelamento: ${ex.motivo_cancelamento}` : ''
      }${
        ex.data_coleta
          ? ` • Coleta realizada em ${ex.data_coleta}${ex.responsavel_coleta_nome ? ` por ${ex.responsavel_coleta_nome}` : ''}`
          : ''
      }`,
      detalhes: {
        tipo_exame: ex.tipo_exame,
        categoria: ex.categoria,
        prioridade: ex.prioridade,
        justificativa: ex.justificativa,
        status: ex.status,
        data_coleta: ex.data_coleta,
        responsavel_coleta: ex.responsavel_coleta_nome,
        resultado_sumario: ex.resultado_sumario,
      },
      profissionalNome: ex.solicitante_nome,
      badgeTexto: `Exame • ${rotuloStatus}`,
      badgeCor: corStatus,
      icone: 'Microscope',
      registroOriginal: ex,
    })
  })

  // I. CENTRO CIRÚRGICO — Agenda, Checklists, Atos Operatórios e SRPA
  // 1. Agendamento / Ciclo da Cirurgia
  cirurgias.forEach((cir) => {
    const statusLabels: Record<string, string> = {
      agendada: 'Agendada',
      checklist_concluido: 'Checklist Concluído',
      em_sala: 'Em Sala Cirúrgica',
      em_recuperacao: 'Em Recuperação (SRPA)',
      concluida: 'Concluída',
      cancelada: 'Cancelada',
    }

    const statusBadgeCores: Record<string, string> = {
      agendada: 'bg-blue-600 text-white',
      checklist_concluido: 'bg-amber-600 text-white',
      em_sala: 'bg-red-600 text-white',
      em_recuperacao: 'bg-purple-600 text-white',
      concluida: 'bg-emerald-700 text-white',
      cancelada: 'bg-slate-600 text-white',
    }

    const isCancelada = cir.status === 'cancelada'
    const salaNome = cir.expand?.sala?.nome || 'Sala Cirúrgica'

    eventos.push({
      id: `cir-${cir.id}`,
      tipo: isCancelada ? 'cirurgia_cancelada' : 'cirurgia_agendada',
      dataHora: cir.data_horario_previsto || cir.created,
      titulo: `Centro Cirúrgico — ${cir.procedimento_nome} (${statusLabels[cir.status] || cir.status})`,
      subtitulo: `Cirurgião: ${cir.cirurgiao_principal_nome} • Sala: ${salaNome}${cir.anestesista_nome ? ` • Anestesista: ${cir.anestesista_nome}` : ''}`,
      descricao: `${cir.procedimento_codigo ? `Código SIGTAP: ${cir.procedimento_codigo} | ` : ''}Tipo: Paciente ${cir.tipo_paciente.toUpperCase()}${
        cir.duracao_estimada_minutos ? ` | Estimativa: ${cir.duracao_estimada_minutos} min` : ''
      }${cir.observacoes_agendamento ? `\nObservações: ${cir.observacoes_agendamento}` : ''}${
        cir.motivo_cancelamento ? `\nMotivo do Cancelamento: ${cir.motivo_cancelamento}` : ''
      }`,
      detalhes: {
        procedimento: cir.procedimento_nome,
        codigo: cir.procedimento_codigo,
        sala: salaNome,
        status: cir.status,
        cirurgiao: cir.cirurgiao_principal_nome,
        anestesista: cir.anestesista_nome,
        instrumentador: cir.instrumentador_nome,
        equipe_adicional: cir.equipe_adicional,
        data_hora_inicio: cir.data_hora_inicio,
        data_hora_fim: cir.data_hora_fim,
      },
      profissionalNome: cir.cirurgiao_principal_nome,
      setorOuLeito: salaNome,
      badgeTexto: `Cirurgia • ${statusLabels[cir.status] || cir.status}`,
      badgeCor: statusBadgeCores[cir.status] || 'bg-slate-700 text-white',
      icone: 'Scissors',
      registroOriginal: cir,
    })
  })

  // 2. Checklists Pré-Operatórios
  checklistsPreOp.forEach((chk) => {
    eventos.push({
      id: `chk-preop-${chk.id}`,
      tipo: 'cirurgia_checklist',
      dataHora: chk.data_conferencia || chk.created,
      titulo: `Checklist Pré-Operatório — ${chk.liberado_centro_cirurgico ? 'PACIENTE LIBERADO' : 'PENDENTE DE LIBERAÇÃO'}`,
      subtitulo: `Conferido por: ${chk.responsavel_nome}${chk.risco_asa ? ` • Risco Cirúrgico: ${chk.risco_asa}` : ''}`,
      descricao: `Jejum: ${chk.jejum_confirmado ? `Confirmado (${chk.jejum_horas || 8}h)` : 'Não confirmado'} | Exames Pré-Op: ${chk.exames_pre_operatorios_ok ? 'Conformes' : 'Pendentes'} | Consentimento Informado: ${chk.consentimento_informado_assinado ? 'Assinado' : 'Pendente'} | Alergias: ${chk.alergias_checadas ? 'Checadas' : 'Não checadas'}${
        chk.detalhes_exames ? `\nExames: ${chk.detalhes_exames}` : ''
      }${chk.observacoes ? `\nObs: ${chk.observacoes}` : ''}`,
      detalhes: {
        jejum: chk.jejum_confirmado,
        jejum_horas: chk.jejum_horas,
        exames_ok: chk.exames_pre_operatorios_ok,
        consentimento: chk.consentimento_informado_assinado,
        avaliacao_anestesica: chk.avaliacao_risco_anestesico_concluida,
        risco_asa: chk.risco_asa,
        demarcacao_lateralidade: chk.demarcacao_lateralidade,
        alergias_checadas: chk.alergias_checadas,
        liberado: chk.liberado_centro_cirurgico,
      },
      profissionalNome: chk.responsavel_nome,
      badgeTexto: chk.liberado_centro_cirurgico ? 'Pré-Op • Liberado' : 'Pré-Op • Pendente',
      badgeCor: chk.liberado_centro_cirurgico
        ? 'bg-emerald-700 text-white'
        : 'bg-amber-600 text-white',
      icone: 'CheckSquare',
      registroOriginal: chk,
    })
  })

  // 3. Atos Operatórios (Descrição Cirúrgica)
  atosOperatorios.forEach((ato) => {
    eventos.push({
      id: `ato-op-${ato.id}`,
      tipo: 'cirurgia_ato_operatorio',
      dataHora: ato.data_hora_fim || ato.data_hora_inicio || ato.created,
      titulo: `Ato Operatório Registrado: ${ato.procedimento_realizado}`,
      subtitulo: `Cirurgião: ${ato.cirurgiao_nome} • Técnica: ${ato.tecnica_cirurgica} • Anestesia: ${ato.tipo_anestesia.toUpperCase()}`,
      descricao: `Início: ${ato.data_hora_inicio} • Término: ${ato.data_hora_fim}${ato.duracao_minutos ? ` (${ato.duracao_minutos} min)` : ''}${
        ato.diagnostico_pre_operatorio ? `\nDx Pré: ${ato.diagnostico_pre_operatorio}` : ''
      }${ato.diagnostico_pos_operatorio ? ` | Dx Pós: ${ato.diagnostico_pos_operatorio}` : ''}${
        ato.cid10 ? ` (CID-10: ${ato.cid10})` : ''
      }\n\nDescrição do Ato:\n${ato.descricao_ato}${
        ato.complicacoes_intercorrencias
          ? `\n\nIntercorrências: ${ato.complicacoes_intercorrencias}`
          : ''
      }${ato.materiais_implantes_utilizados ? `\nMateriais/Implantes: ${ato.materiais_implantes_utilizados}` : ''}${
        ato.envio_anatomo_patologico ? '\nMaterial enviado para exame anátomo-patológico.' : ''
      }`,
      detalhes: {
        procedimento: ato.procedimento_realizado,
        tecnica: ato.tecnica_cirurgica,
        anestesia: ato.tipo_anestesia,
        duracao: ato.duracao_minutos,
        diagnostico_pos: ato.diagnostico_pos_operatorio,
        perda_sanguinea: ato.perda_sanguinea_estimada_ml,
        equipe: ato.equipe_participante,
      },
      profissionalNome: ato.cirurgiao_nome,
      badgeTexto: 'Ato Cirúrgico Registrado',
      badgeCor: 'bg-rose-700 text-white',
      icone: 'Activity',
      registroOriginal: ato,
    })
  })

  // 4. Recuperação Pós-Anestésica (SRPA)
  recuperacoesSrpa.forEach((rec) => {
    const destinoLabels: Record<string, string> = {
      retorno_leito: 'Retorno ao Leito / Enfermaria',
      alta_hospitalar: 'Alta Hospitalar Direta',
      uti: 'Transferência para UTI',
      observacao_srpa: 'Em Observação na SRPA',
    }

    eventos.push({
      id: `rec-srpa-${rec.id}`,
      tipo: 'cirurgia_recuperacao_srpa',
      dataHora: rec.data_hora_alta_srpa || rec.data_hora_admissao_srpa || rec.created,
      titulo: `SRPA / Recuperação Pós-Anestésica — Destino: ${destinoLabels[rec.destino_pos_alta] || rec.destino_pos_alta}`,
      subtitulo: `Responsável SRPA: ${rec.responsavel_nome}${rec.escala_aldrete_kroulik !== undefined ? ` • Escala Aldrete: ${rec.escala_aldrete_kroulik}/10` : ''}`,
      descricao: `Admissão: ${rec.data_hora_admissao_srpa}${rec.data_hora_alta_srpa ? ` • Alta SRPA: ${rec.data_hora_alta_srpa}` : ''}${
        rec.sinais_vitais_admissao ? `\nSinais Vitais Admissão: ${rec.sinais_vitais_admissao}` : ''
      }${rec.sinais_vitais_alta ? ` | Sinais Vitais Alta: ${rec.sinais_vitais_alta}` : ''}${
        rec.nivel_consciencia ? ` | Consciência: ${rec.nivel_consciencia}` : ''
      }${rec.dor_escala_analogica ? ` | Dor EVA: ${rec.dor_escala_analogica}` : ''}\n\nEvolução:\n${rec.evolucao_pos_operatoria}${
        rec.leito_destino ? `\nLeito de Destino: ${rec.leito_destino}` : ''
      }${rec.orientacoes_alta ? `\nOrientações: ${rec.orientacoes_alta}` : ''}`,
      detalhes: {
        admissao: rec.data_hora_admissao_srpa,
        alta: rec.data_hora_alta_srpa,
        aldrete: rec.escala_aldrete_kroulik,
        destino: rec.destino_pos_alta,
        leito_destino: rec.leito_destino,
        evolucao: rec.evolucao_pos_operatoria,
      },
      profissionalNome: rec.responsavel_nome,
      badgeTexto: `SRPA • ${destinoLabels[rec.destino_pos_alta] || 'Recuperação'}`,
      badgeCor:
        rec.destino_pos_alta === 'uti'
          ? 'bg-red-700 text-white'
          : rec.destino_pos_alta === 'alta_hospitalar'
            ? 'bg-emerald-700 text-white'
            : 'bg-indigo-700 text-white',
      icone: 'HeartPulse',
      registroOriginal: rec,
    })
  })

  // J. Impressos Assistenciais Emitidos (Receitas, Atestados e Resumos de Alta)
  impressosAssistenciais.forEach((imp) => {
    const rotuloTipo: Record<string, string> = {
      receita: 'Receita Médica Emitida',
      atestado: 'Atestado Assistencial Emitido',
      resumo_alta: 'Resumo de Alta Hospitalar Emitido',
    }

    const tipoEventoMap: Record<string, any> = {
      receita: 'impresso_receita',
      atestado: 'impresso_atestado',
      resumo_alta: 'impresso_resumo_alta',
    }

    let resumoConteudo = ''
    if (imp.tipo === 'receita') {
      const conteudoRec = typeof imp.conteudo === 'string' ? JSON.parse(imp.conteudo) : imp.conteudo
      const itensQtd = conteudoRec?.itens?.length || 0
      const itensText =
        conteudoRec?.itens
          ?.map(
            (it: any) =>
              `${it.medicamento_nome} (${it.dose || ''} ${it.via_administracao || ''} - ${it.frequencia_posologia || ''})`,
          )
          .join('; ') || ''
      resumoConteudo = `${itensQtd} medicamento(s) prescrito(s): ${itensText}`
    } else if (imp.tipo === 'atestado') {
      const conteudoAt = typeof imp.conteudo === 'string' ? JSON.parse(imp.conteudo) : imp.conteudo
      resumoConteudo = `${conteudoAt?.texto_atestado || 'Atestado emitido'}${
        imp.cid_consentimento_registrado && imp.cid10_codigo
          ? ` • CID autorização registrada: ${imp.cid10_codigo}${imp.cid10_descricao ? ` - ${imp.cid10_descricao}` : ''}`
          : ' • CID omitido (sem consentimento ou não aplicável)'
      }`
    } else if (imp.tipo === 'resumo_alta') {
      const conteudoAlt = typeof imp.conteudo === 'string' ? JSON.parse(imp.conteudo) : imp.conteudo
      resumoConteudo = `Condição na alta: ${conteudoAlt?.condicao_alta?.toUpperCase() || 'ALTA'}\nDiagnóstico: ${conteudoAlt?.diagnostico_alta || 'Não informado'}${conteudoAlt?.cid10_alta ? ` (CID: ${conteudoAlt.cid10_alta})` : ''}\nConduta pós-alta: ${conteudoAlt?.conduta_medicacao_alta || 'Sem prescrição pós-alta'}`
    }

    eventos.push({
      id: `imp-${imp.id}`,
      tipo: tipoEventoMap[imp.tipo] || 'impresso_receita',
      dataHora: imp.data_hora_emissao || imp.created,
      titulo: `${rotuloTipo[imp.tipo] || 'Impresso Assistencial'} • ${imp.unidade_nome || 'Hospital Municipal'}`,
      subtitulo: `Emissor: ${imp.profissional_nome} (${imp.profissional_registro}) • Origem: ${imp.origem?.toUpperCase()}`,
      descricao: resumoConteudo,
      detalhes: {
        tipo_impresso: imp.tipo,
        profissional_nome: imp.profissional_nome,
        profissional_registro: imp.profissional_registro,
        profissional_profissao: imp.profissional_profissao,
        unidade_nome: imp.unidade_nome,
        origem: imp.origem,
        cid_consentimento_registrado: imp.cid_consentimento_registrado,
        cid_consentimento_data_hora: imp.cid_consentimento_data_hora,
        cid10_codigo: imp.cid10_codigo,
        cid10_descricao: imp.cid10_descricao,
        conteudo: typeof imp.conteudo === 'string' ? JSON.parse(imp.conteudo) : imp.conteudo,
        observacoes_gerais: imp.observacoes_gerais,
      },
      profissionalNome: imp.profissional_nome,
      badgeTexto:
        imp.tipo === 'receita'
          ? 'Receita A4'
          : imp.tipo === 'atestado'
            ? 'Atestado A4'
            : 'Resumo de Alta A4',
      badgeCor:
        imp.tipo === 'receita'
          ? 'bg-purple-700 text-white'
          : imp.tipo === 'atestado'
            ? 'bg-amber-700 text-white'
            : 'bg-emerald-800 text-white',
      icone: 'Printer',
      registroOriginal: imp,
    })
  })

  // K. Notificações de Vigilância em Saúde (Controle Interno Municipal)
  notificacoesVigilancia.forEach((notif) => {
    const rotuloSituacao: Record<string, string> = {
      notificado: 'Notificado (Aguardando)',
      em_investigacao: 'Em Investigação Epidemiológica',
      confirmado: 'Caso Confirmado',
      descartado: 'Caso Descartado',
      encerrado: 'Investigação Encerrada',
    }

    const corSituacao: Record<string, string> = {
      notificado: 'bg-amber-600 text-white',
      em_investigacao: 'bg-blue-600 text-white',
      confirmado: 'bg-red-600 text-white',
      descartado: 'bg-slate-600 text-white',
      encerrado: 'bg-emerald-700 text-white',
    }

    const rotuloTipoVig: Record<string, string> = {
      epidemiologica: 'Vigilância Epidemiológica',
      sanitaria: 'Vigilância Sanitária',
      saude_trabalhador: 'Saúde do Trabalhador',
    }

    eventos.push({
      id: `vig-${notif.id}`,
      tipo: 'notificacao_vigilancia',
      dataHora: notif.data_notificacao || notif.created,
      titulo: `Notificação de Agravo: ${notif.agravo_nome} (Nº ${notif.numero_notificacao})`,
      subtitulo: `Notificante: ${notif.profissional_nome}${notif.profissional_registro ? ` (${notif.profissional_registro})` : ''} • ${rotuloTipoVig[notif.tipo_vigilancia] || 'Vigilância'}`,
      descricao: `Situação do caso: ${rotuloSituacao[notif.situacao] || notif.situacao}${
        notif.cid10_codigo ? ` • CID-10: ${notif.cid10_codigo}` : ''
      }${
        notif.data_primeiros_sintomas
          ? ` • Início dos sintomas: ${notif.data_primeiros_sintomas}`
          : ''
      }${
        notif.observacoes_investigacao
          ? `\nNotas de investigação: ${notif.observacoes_investigacao}`
          : ''
      }\n[Aviso: Registro de controle interno municipal — exportação/envio oficial a órgãos externos não implementado]`,
      detalhes: {
        numero_notificacao: notif.numero_notificacao,
        agravo_codigo: notif.agravo_codigo,
        agravo_nome: notif.agravo_nome,
        cid10_codigo: notif.cid10_codigo,
        tipo_vigilancia: notif.tipo_vigilancia,
        periodicidade: notif.periodicidade,
        situacao: notif.situacao,
        criterio_confirmacao: notif.criterio_confirmacao,
        evolucao_caso: notif.evolucao_caso,
        data_notificacao: notif.data_notificacao,
        data_primeiros_sintomas: notif.data_primeiros_sintomas,
        data_encerramento: notif.data_encerramento,
        unidade_notificadora: notif.unidade_notificadora,
        observacoes_investigacao: notif.observacoes_investigacao,
      },
      profissionalNome: notif.profissional_nome,
      badgeTexto: `Vigilância • ${rotuloSituacao[notif.situacao] || notif.situacao}`,
      badgeCor: corSituacao[notif.situacao] || 'bg-amber-600 text-white',
      icone: 'ShieldAlert',
      registroOriginal: notif,
    })
  })

  // L. CENTRO OBSTÉTRICO (Admissões, Evolução do Trabalho de Parto, Partos, Vínculo Mãe-RN, Desfecho e Alta)
  // 1. Admissão Obstétrica
  obstetricaAdmissoes.forEach((adm) => {
    const statusMap: Record<string, string> = {
      em_trabalho_parto: 'Em Trabalho de Parto',
      em_observacao: 'Em Observação',
      parto_realizado: 'Parto Realizado',
      alta: 'Alta Obstétrica',
      transferida: 'Transferida',
    }

    const riscoMap: Record<string, string> = {
      habitual: 'Risco Habitual',
      alto_risco: 'Alto Risco (informado pelo profissional)',
      nao_informado: 'Não informado',
    }

    eventos.push({
      id: `obs-adm-${adm.id}`,
      tipo: 'obstetrica_admissao',
      dataHora: adm.data_hora_admissao || adm.created,
      titulo: `Admissão Obstétrica — Nº ${adm.numero_admissao} (${statusMap[adm.status_admissao] || adm.status_admissao})`,
      subtitulo: `Profissional: ${adm.profissional_nome}${adm.leito_codigo ? ` • Leito: ${adm.leito_codigo}` : ''}`,
      descricao: `Motivo: ${adm.motivo_admissao}${
        adm.idade_gestacional_semanas
          ? `\nIdade Gestacional informada: ${adm.idade_gestacional_semanas} sem${adm.idade_gestacional_dias ? ` e ${adm.idade_gestacional_dias} dias` : ''}`
          : ''
      }${
        adm.risco_obstetrico_informado
          ? ` • Classificação profissional: ${riscoMap[adm.risco_obstetrico_informado] || adm.risco_obstetrico_informado}`
          : ''
      }${adm.batimentos_cardiofetais_bcf ? ` • BCF: ${adm.batimentos_cardiofetais_bcf}` : ''}${
        adm.dinamica_uterina ? ` • Dinâmica: ${adm.dinamica_uterina}` : ''
      }${adm.dilatacao_cervical_cm ? ` • Dilatação: ${adm.dilatacao_cervical_cm} cm` : ''}${
        adm.bolsa_amniotica ? ` • Bolsa: ${adm.bolsa_amniotica}` : ''
      }${adm.observacoes_admissao ? `\nObservações: ${adm.observacoes_admissao}` : ''}`,
      detalhes: {
        numero_admissao: adm.numero_admissao,
        idade_gestacional_semanas: adm.idade_gestacional_semanas,
        gesta_previa: adm.gesta_previa,
        para_previa: adm.para_previa,
        abortos_previos: adm.abortos_previos,
        cesareas_previas: adm.cesareas_previas,
        dum: adm.dum_informada,
        dpp: adm.dpp_informada,
        risco_informado: adm.risco_obstetrico_informado,
        status: adm.status_admissao,
      },
      profissionalNome: adm.profissional_nome,
      setorOuLeito: adm.leito_codigo || 'Centro Obstétrico',
      badgeTexto: `Obstetrícia • Admissão`,
      badgeCor: 'bg-pink-700 text-white',
      icone: 'HeartHandshake',
      registroOriginal: adm,
    })
  })

  // 2. Registros da Cronologia do Trabalho de Parto
  obstetricaTrabalhoParto.forEach((tp) => {
    eventos.push({
      id: `obs-tp-${tp.id}`,
      tipo: 'obstetrica_trabalho_parto',
      dataHora: tp.data_hora_registro || tp.created,
      titulo: `Evolução do Trabalho de Parto`,
      subtitulo: `Registrado por: ${tp.profissional_nome}`,
      descricao: `Evolução clínica: ${tp.evolucao_anotacao_profissional}${
        tp.dilatacao_cervical_cm ? `\nDilatação: ${tp.dilatacao_cervical_cm} cm` : ''
      }${
        tp.apagamento_cervical_percentual
          ? ` • Apagamento: ${tp.apagamento_cervical_percentual}`
          : ''
      }${
        tp.altura_apresentacao_de_lee ? ` • Plano de De Lee: ${tp.altura_apresentacao_de_lee}` : ''
      }${
        tp.dinamica_uterina_freq_duracao ? ` • Dinâmica: ${tp.dinamica_uterina_freq_duracao}` : ''
      }${tp.batimentos_cardiofetais_bcf ? ` • BCF: ${tp.batimentos_cardiofetais_bcf}` : ''}${
        tp.bolsa_aspecto_liquido ? ` • Líquido amniótico: ${tp.bolsa_aspecto_liquido}` : ''
      }${tp.pressao_arterial ? ` • PA: ${tp.pressao_arterial}` : ''}${
        tp.metodos_alivio_dor_informados
          ? ` • Alívio da dor: ${tp.metodos_alivio_dor_informados}`
          : ''
      }`,
      detalhes: {
        dilatacao: tp.dilatacao_cervical_cm,
        dinamica: tp.dinamica_uterina_freq_duracao,
        bcf: tp.batimentos_cardiofetais_bcf,
        bolsa: tp.bolsa_aspecto_liquido,
        anotacao: tp.evolucao_anotacao_profissional,
      },
      profissionalNome: tp.profissional_nome,
      badgeTexto: 'Trabalho de Parto',
      badgeCor: 'bg-rose-600 text-white',
      icone: 'Activity',
      registroOriginal: tp,
    })
  })

  // 3. Registros de Parto / Nascimento
  obstetricaPartos.forEach((parto) => {
    const rotuloTipoParto: Record<string, string> = {
      vaginal_espontaneo: 'Parto Vaginal Espontâneo',
      vaginal_instrumentado: 'Parto Vaginal Instrumentado',
      cesarea_eletiva: 'Cesariana Eletiva',
      cesarea_urgencia: 'Cesariana de Urgência',
    }

    eventos.push({
      id: `obs-parto-${parto.id}`,
      tipo: 'obstetrica_parto',
      dataHora: parto.data_hora_parto || parto.created,
      titulo: `Parto Realizado: ${rotuloTipoParto[parto.tipo_parto] || parto.tipo_parto}`,
      subtitulo: `Médico Obstetra: ${parto.medico_obstetra_nome}${parto.enfermeiro_obstetra_nome ? ` • Enf. Obstetra: ${parto.enfermeiro_obstetra_nome}` : ''}`,
      descricao: `Tipo de parto: ${rotuloTipoParto[parto.tipo_parto] || parto.tipo_parto}${
        parto.indicacao_tipo_parto ? ` • Indicação: ${parto.indicacao_tipo_parto}` : ''
      }${
        parto.anestesia_analgesia_utilizada
          ? ` • Anestesia: ${parto.anestesia_analgesia_utilizada}`
          : ''
      }${
        parto.sangramento_estimado_ml
          ? ` • Sangramento est.: ${parto.sangramento_estimado_ml} ml`
          : ''
      }${parto.contato_pele_a_pele_imediato ? ' • Contato pele a pele imediato garantido' : ''}${
        parto.amamentacao_primeira_hora ? ' • Amamentação na 1ª hora realizada' : ''
      }${
        parto.intercorrencias_maternas ? `\nIntercorrências: ${parto.intercorrencias_maternas}` : ''
      }${parto.observacoes_parto ? `\nObservações: ${parto.observacoes_parto}` : ''}`,
      detalhes: {
        tipo_parto: parto.tipo_parto,
        indicacao: parto.indicacao_tipo_parto,
        anestesia: parto.anestesia_analgesia_utilizada,
        episiotomia_laceracao: parto.episiotomia_laceracao,
        sangramento_ml: parto.sangramento_estimado_ml,
        pele_a_pele: parto.contato_pele_a_pele_imediato,
        amamentacao_1h: parto.amamentacao_primeira_hora,
      },
      profissionalNome: parto.medico_obstetra_nome,
      badgeTexto: `Parto • ${rotuloTipoParto[parto.tipo_parto] || 'Parto'}`,
      badgeCor: 'bg-purple-800 text-white',
      icone: 'HeartPulse',
      registroOriginal: parto,
    })
  })

  // 4. Recém-Nascidos Vínculo Mãe-RN
  obstetricaRecemNascidos.forEach((rn) => {
    const rotuloAcomodacao: Record<string, string> = {
      alojamento_conjunto: 'Alojamento Conjunto (junto à mãe)',
      unidade_cuidados_intermediarios: 'Unidade de Cuidados Intermediários (UCI)',
      uti_neonatal: 'UTI Neonatal',
      isolamento: 'Isolamento Neonatal',
    }

    eventos.push({
      id: `obs-rn-${rn.id}`,
      tipo: 'obstetrica_recem_nascido',
      dataHora: rn.data_hora_nascimento || rn.created,
      titulo: `Nascimento do Recém-Nascido: ${rn.identificacao_rn}`,
      subtitulo: `Mãe: ${rn.mae_nome} • Sexo: ${rn.sexo.toUpperCase()} • Peso: ${rn.peso_gramas}g`,
      descricao: `Dados antropométricos informados: Peso ${rn.peso_gramas}g${
        rn.comprimento_cm ? ` • Comp.: ${rn.comprimento_cm} cm` : ''
      }${rn.perimetro_cefalico_cm ? ` • PC: ${rn.perimetro_cefalico_cm} cm` : ''}${
        rn.apgar_1_minuto !== undefined && rn.apgar_1_minuto !== null
          ? ` • Apgar 1º min: ${rn.apgar_1_minuto}`
          : ''
      }${
        rn.apgar_5_minutos !== undefined && rn.apgar_5_minutos !== null
          ? ` • Apgar 5º min: ${rn.apgar_5_minutos}`
          : ''
      }\nAcomodação inicial: ${rotuloAcomodacao[rn.acomodacao_rn] || rn.acomodacao_rn}${
        rn.pulseira_identificacao_conferida ? ' • Pulseira dupla mãe-RN conferida' : ''
      }${
        rn.declaracao_nascido_vivo_dnv_numero
          ? ` • DNV nº: ${rn.declaracao_nascido_vivo_dnv_numero}`
          : ''
      }${
        rn.reanimacao_neonatal_necessaria
          ? `\nReanimação neonatal: ${rn.detalhes_reanimacao || 'Realizada'}`
          : ''
      }${rn.observacoes_rn ? `\nObs: ${rn.observacoes_rn}` : ''}`,
      detalhes: {
        identificacao_rn: rn.identificacao_rn,
        sexo: rn.sexo,
        peso_gramas: rn.peso_gramas,
        comprimento_cm: rn.comprimento_cm,
        perimetro_cefalico_cm: rn.perimetro_cefalico_cm,
        apgar_1: rn.apgar_1_minuto,
        apgar_5: rn.apgar_5_minutos,
        apgar_10: rn.apgar_10_minutos,
        acomodacao: rn.acomodacao_rn,
        dnv: rn.declaracao_nascido_vivo_dnv_numero,
      },
      badgeTexto: `RN • ${rn.sexo === 'feminino' ? 'Menina' : rn.sexo === 'masculino' ? 'Menino' : 'RN'} (${rn.peso_gramas}g)`,
      badgeCor: rn.sexo === 'feminino' ? 'bg-pink-600 text-white' : 'bg-cyan-700 text-white',
      icone: 'Baby',
      registroOriginal: rn,
    })
  })

  // 5. Desfecho e Alta Obstétrica
  obstetricaDesfechosAltas.forEach((desf) => {
    const rotuloDesfecho: Record<string, string> = {
      alta_hospitalar_mae_e_rn: 'Alta Hospitalar Conjunta (Mãe e Recém-Nascido)',
      alta_hospitalar_apenas_mae: 'Alta Hospitalar da Mãe (RN permanece internado)',
      transferencia_inter_hospitalar: 'Transferência Inter-Hospitalar',
      obito_materno: 'Óbito Materno',
      alta_a_pedido: 'Alta a Pedido da Paciente/Responsável',
      permanencia_internada: 'Permanência em Internação Puerperal',
    }

    eventos.push({
      id: `obs-desf-${desf.id}`,
      tipo: 'obstetrica_desfecho_alta',
      dataHora: desf.data_hora_desfecho || desf.created,
      titulo: `Desfecho Obstétrico: ${rotuloDesfecho[desf.tipo_desfecho] || desf.tipo_desfecho}`,
      subtitulo: `Profissional Responsável: ${desf.profissional_nome}`,
      descricao: `Resumo do desfecho: ${desf.resumo_desfecho_clinico}${
        desf.orientacoes_pos_parto_puerperio
          ? `\nOrientações pós-parto e puerpério: ${desf.orientacoes_pos_parto_puerperio}`
          : ''
      }${
        desf.encaminhamento_retorno_ubs
          ? `\nRetorno / UBS de referência: ${desf.encaminhamento_retorno_ubs}`
          : ''
      }${
        desf.desocupar_leito_internacao
          ? '\n[Leito hospitalar desocupado e encaminhado para higienização]'
          : ''
      }`,
      detalhes: {
        tipo_desfecho: desf.tipo_desfecho,
        resumo: desf.resumo_desfecho_clinico,
        orientacoes: desf.orientacoes_pos_parto_puerperio,
        retorno_ubs: desf.encaminhamento_retorno_ubs,
        leito_desocupado: desf.desocupar_leito_internacao,
      },
      profissionalNome: desf.profissional_nome,
      badgeTexto: `Desfecho Obstétrico`,
      badgeCor: 'bg-emerald-800 text-white',
      icone: 'CheckCircle2',
      registroOriginal: desf,
    })
  })

  // M. CENTRAL DE REGULAÇÃO INTERNA MUNICIPAL (Encaminhamentos e Transferências)
  solicitacoesRegulacao.forEach((reg) => {
    const rotuloRecurso: Record<string, string> = {
      leito_enfermaria_clinica: 'Leito Enfermaria Clínica',
      leito_uti_adulto: 'Leito UTI Adulto',
      leito_isolamento: 'Leito Isolamento',
      leito_cirurgico: 'Leito Cirúrgico',
      avaliacao_especializada: 'Avaliação Especializada',
      procedimento_urgencia: 'Procedimento de Urgência',
      suporte_ventilatorio: 'Suporte Ventilatório',
      outro: 'Outro Recurso',
    }

    const rotuloPrioridade: Record<string, string> = {
      emergencia_vermelha: 'Emergência (Vermelho)',
      urgencia_amarela: 'Urgência (Amarelo)',
      prioritario_verde: 'Prioritário (Verde)',
      eletivo_azul: 'Eletivo (Azul)',
    }

    const corPrioridade: Record<string, string> = {
      emergencia_vermelha: 'bg-red-600 text-white',
      urgencia_amarela: 'bg-amber-600 text-white',
      prioritario_verde: 'bg-emerald-600 text-white',
      eletivo_azul: 'bg-blue-600 text-white',
    }

    const rotuloSituacao: Record<string, string> = {
      solicitada: 'Solicitada (Aguardando Avaliação)',
      em_avaliacao: 'Em Avaliação Técnica',
      aceita: 'Aceita pelo Regulador',
      negada: 'Negada pelo Regulador',
      efetivada: 'Transferência Efetivada',
      cancelada: 'Cancelada',
    }

    // 1. Evento de Efetivação da Transferência Real (se concluída)
    if (reg.situacao === 'efetivada' && reg.data_hora_efetivacao) {
      eventos.push({
        id: `reg-efetivada-${reg.id}`,
        tipo: 'regulacao_efetivacao',
        dataHora: reg.data_hora_efetivacao,
        titulo: `Central de Regulação — Transferência Real Efetivada (${reg.numero_solicitacao})`,
        subtitulo: `Confirmada por: ${reg.responsavel_efetivacao_nome || 'Equipe de Regulação'} • Destino: ${reg.setor_destino_nome || reg.unidade_externa_destino || 'Destino'}`,
        descricao: `Transferência física do paciente confirmada. Leito de destino ativado no mapa de leitos.${
          reg.observacoes_efetivacao ? `\nObservações: ${reg.observacoes_efetivacao}` : ''
        }\n[Controle interno municipal — sem comunicação SISREG/externa alegada]`,
        detalhes: {
          numero_solicitacao: reg.numero_solicitacao,
          origem: reg.setor_origem_nome,
          destino: reg.setor_destino_nome || reg.unidade_externa_destino,
          leito_destino: reg.leito_destino_codigo,
          data_hora_efetivacao: reg.data_hora_efetivacao,
          responsavel: reg.responsavel_efetivacao_nome,
        },
        profissionalNome: reg.responsavel_efetivacao_nome,
        setorOuLeito: reg.leito_destino_codigo || reg.setor_destino_nome,
        badgeTexto: 'Regulação • Efetivada',
        badgeCor: 'bg-emerald-700 text-white',
        icone: 'ArrowRightLeft',
        registroOriginal: reg,
      })
    }

    // 2. Evento da Decisão do Regulador (se avaliado)
    if (
      reg.data_hora_avaliacao &&
      (reg.decisao_regulador === 'aceita' || reg.decisao_regulador === 'negada')
    ) {
      eventos.push({
        id: `reg-decisao-${reg.id}`,
        tipo: 'regulacao_avaliacao',
        dataHora: reg.data_hora_avaliacao,
        titulo: `Decisão de Regulação: ${reg.decisao_regulador === 'aceita' ? 'ACEITA' : 'NEGADA'} (${reg.numero_solicitacao})`,
        subtitulo: `Regulador: ${reg.profissional_regulador_nome || 'Médico Regulador'} (Decisão humana)`,
        descricao: `Motivo da decisão: ${reg.motivo_decisao_regulador || 'Avaliação técnica assistencial'}${
          reg.setor_destino_nome ? ` • Destino autorizado: ${reg.setor_destino_nome}` : ''
        }${reg.unidade_externa_destino ? ` • Destino externo: ${reg.unidade_externa_destino}` : ''}`,
        detalhes: {
          decisao: reg.decisao_regulador,
          motivo: reg.motivo_decisao_regulador,
          regulador: reg.profissional_regulador_nome,
          setor_destino: reg.setor_destino_nome,
          unidade_externa: reg.unidade_externa_destino,
        },
        profissionalNome: reg.profissional_regulador_nome,
        badgeTexto: `Regulador • ${reg.decisao_regulador.toUpperCase()}`,
        badgeCor:
          reg.decisao_regulador === 'aceita'
            ? 'bg-emerald-600 text-white'
            : 'bg-rose-700 text-white',
        icone: 'ShieldCheck',
        registroOriginal: reg,
      })
    }

    // 3. Evento da Solicitação Inicial de Regulação
    eventos.push({
      id: `reg-solic-${reg.id}`,
      tipo: 'regulacao_solicitacao',
      dataHora: reg.data_hora_solicitacao || reg.created,
      titulo: `Solicitação de Regulação: ${reg.numero_solicitacao} — ${rotuloRecurso[reg.recurso_solicitado] || reg.recurso_solicitado}`,
      subtitulo: `Solicitante: ${reg.profissional_solicitante_nome} • Origem: ${reg.setor_origem_nome}`,
      descricao: `Diagnóstico principal: ${reg.diagnostico_principal}${reg.cid10_codigo ? ` (${reg.cid10_codigo})` : ''}\nPrioridade informada pelo profissional: ${rotuloPrioridade[reg.prioridade] || reg.prioridade}\nJustificativa clínica: ${reg.justificativa_clinica}${
        reg.sinais_vitais_sumario ? `\nSinais vitais: ${reg.sinais_vitais_sumario}` : ''
      }${reg.condicoes_transporte ? ` • Transporte: ${reg.condicoes_transporte}` : ''}\nSituação atual: ${rotuloSituacao[reg.situacao] || reg.situacao}\n[Controle interno municipal]`,
      detalhes: {
        numero_solicitacao: reg.numero_solicitacao,
        tipo: reg.tipo,
        origem: reg.setor_origem_nome,
        recurso: reg.recurso_solicitado,
        prioridade: reg.prioridade,
        justificativa: reg.justificativa_clinica,
        diagnostico: reg.diagnostico_principal,
        cid10: reg.cid10_codigo,
        situacao: reg.situacao,
      },
      profissionalNome: reg.profissional_solicitante_nome,
      badgeTexto: `Regulação • ${rotuloPrioridade[reg.prioridade] || 'Prioritário'}`,
      badgeCor: corPrioridade[reg.prioridade] || 'bg-amber-600 text-white',
      icone: 'Share2',
      registroOriginal: reg,
    })
  })

  // 3. Ordenar todos os eventos por data/hora mais recente primeiro
  eventos.sort((a, b) => b.dataHora.localeCompare(a.dataHora))

  return { paciente, eventos }
}
