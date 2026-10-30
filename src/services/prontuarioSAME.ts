import pb from '@/lib/pocketbase/client'
import {
  EventoProntuarioUnificado,
  Paciente,
  FichaProntoAtendimento,
  Internacao,
  EvolucaoClinica,
  DispensacaoFarmacia,
  RegistroImunizacao,
  Agendamento,
  PrescricaoMedica,
  AdministracaoMedicamento,
} from '@/types/hospital'
import { listarPrescricoes, listarAdministracoesMedicamentos } from './prescricoes'

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
    imunizacoes,
    agendamentos,
    prescricoes,
    administracoes,
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
      .collection('imunizacao_registros')
      .getFullList<RegistroImunizacao>({
        filter: `paciente = "${pacienteId}"`,
        sort: '-created',
        expand: 'vacina,profissional_aplicador',
      })
      .catch(() => [] as RegistroImunizacao[]),

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

    eventos.push({
      id: `presc-${p.id}`,
      tipo: 'prescricao_medica',
      dataHora: p.data_prescricao || p.created,
      titulo: `Prescrição Médica Hospitalar (${qtdItens} item${qtdItens !== 1 ? 'ns' : ''}) — Status: ${p.status.toUpperCase()}`,
      subtitulo: p.medico_nome ? `Médico: ${p.medico_nome}` : undefined,
      descricao: listaNomes || p.observacoes_gerais || 'Prescrição medicamentosa emitida',
      detalhes: {
        status: p.status,
        itens: p.itens,
        observacoes: p.observacoes_gerais,
      },
      profissionalNome: p.medico_nome,
      badgeTexto: `Prescrição ${p.status.toUpperCase()}`,
      badgeCor: p.status === 'ativa' ? 'bg-purple-600 text-white' : 'bg-slate-600 text-white',
      icone: 'FileText',
      registroOriginal: p,
    })
  })

  // E. Administração de Medicamentos ao Leito (Enfermagem)
  administracoes.forEach((adm) => {
    eventos.push({
      id: `adm-${adm.id}`,
      tipo: 'administracao_enfermagem',
      dataHora: adm.data_hora_administracao || adm.created,
      titulo: `Checagem Enfermagem: ${adm.medicamento_nome} (${adm.status.toUpperCase()})`,
      subtitulo: `Aplicado por: ${adm.responsavel_nome} (${adm.responsavel_cargo || 'Enfermagem'})`,
      descricao: `Dose: ${adm.dose_administrada || 'Padrão'} | Via: ${adm.via_administrada || 'Conforme prescrição'}${adm.observacoes ? ` • Obs: ${adm.observacoes}` : ''}`,
      detalhes: {
        medicamento: adm.medicamento_nome,
        dose: adm.dose_administrada,
        via: adm.via_administrada,
        status: adm.status,
        observacoes: adm.observacoes,
      },
      profissionalNome: adm.responsavel_nome,
      badgeTexto: `Checagem: ${adm.status}`,
      badgeCor:
        adm.status === 'administrado'
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

  // G. Imunização / Vacinas
  imunizacoes.forEach((vac) => {
    const nomeVacina = vac.expand?.vacina?.nome || 'Vacina'
    eventos.push({
      id: `vac-${vac.id}`,
      tipo: 'vacina_aplicacao',
      dataHora: vac.data_aplicacao || vac.created,
      titulo: `Imunização / Vacina: ${nomeVacina} (${vac.dose})`,
      subtitulo: vac.aplicador_nome
        ? `Aplicador: ${vac.aplicador_nome} • Local: ${vac.local_aplicacao || 'Sala de Vacina'}`
        : undefined,
      descricao: `Lote: ${vac.lote}${vac.validade_lote ? ` (Val: ${vac.validade_lote})` : ''}${vac.observacoes ? ` • ${vac.observacoes}` : ''}`,
      detalhes: {
        vacina: nomeVacina,
        dose: vac.dose,
        lote: vac.lote,
        local: vac.local_aplicacao,
      },
      profissionalNome: vac.aplicador_nome,
      badgeTexto: `Vacina • ${vac.dose}`,
      badgeCor: 'bg-cyan-700 text-white',
      icone: 'Syringe',
      registroOriginal: vac,
    })
  })

  // H. Agendamentos Ambulatoriais
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

  // 3. Ordenar todos os eventos por data/hora mais recente primeiro
  eventos.sort((a, b) => b.dataHora.localeCompare(a.dataHora))

  return { paciente, eventos }
}
