import pb from '@/lib/pocketbase/client'
import {
  AdmissaoObstetrica,
  RegistroTrabalhoParto,
  RegistroParto,
  RecemNascido,
  DesfechoAltaObstetrica,
  StatusAdmissaoObstetrica,
  RiscoObstetricoInformado,
  TipoParto,
  SexoRN,
  AcomodacaoRN,
  TipoDesfechoObstetrico,
} from '@/types/hospital'
import { registrarAuditoria } from './auditoria'

export interface CriarAdmissaoObstetricaParams {
  pacienteId: string
  pacienteNome: string
  internacaoId?: string
  leitoId?: string
  leitoCodigo?: string
  dataHoraAdmissao: string
  gravidezPlanejada?: boolean
  gestaPrevia?: number
  paraPrevia?: number
  abortosPrevios?: number
  cesareasPrevias?: number
  idadeGestacionalSemanas?: number
  idadeGestacionalDias?: number
  dumInformada?: string
  dppInformada?: string
  riscoObstetricoInformado?: RiscoObstetricoInformado
  justificativaRiscoProfissional?: string
  motivoAdmissao: string
  sinaisSintomasAdmissao?: string
  sinaisVitaisAdmissao?: string
  batimentosCardiofetaisBcf?: string
  dinamicaUterina?: string
  dilatacaoCervicalCm?: string
  bolsaAmniotica?: string
  statusAdmissao?: StatusAdmissaoObstetrica
  profissionalResponsavelId?: string
  profissionalNome: string
  observacoesAdmissao?: string
}

export interface CriarRegistroTrabalhoPartoParams {
  admissaoObstetricaId: string
  pacienteId: string
  dataHoraRegistro: string
  dilatacaoCervicalCm?: string
  apagamentoCervicalPercentual?: string
  alturaApresentacaoDeLee?: string
  variedadePosicao?: string
  dinamicaUterinaFreqDuracao?: string
  batimentosCardiofetaisBcf?: string
  bolsaAspectoLiquido?: string
  pressaoArterial?: string
  frequenciaCardiacaMaterna?: string
  temperaturaAxilar?: string
  metodosAlivioDorInformados?: string
  medicamentosAdministrados?: string
  evolucaoAnotacaoProfissional: string
  profissionalRegistroId?: string
  profissionalNome: string
}

export interface CriarRegistroPartoParams {
  admissaoObstetricaId: string
  pacienteMaeId: string
  pacienteMaeNome: string
  dataHoraParto: string
  tipoParto: TipoParto
  indicacaoTipoParto?: string
  posicaoParto?: string
  anestesiaAnalgesiaUtilizada?: string
  episiotomiaLaceracao?: string
  perineorrafiaSutura?: string
  dequitacaoPlacentaTempoModo?: string
  sangramentoEstimadoMl?: number
  intercorrenciasMaternas?: string
  contatoPeleAPeleImediato?: boolean
  amamentacaoPrimeiraHora?: boolean
  clampeamentoCordaoOportuno?: boolean
  medicoObstetraId?: string
  medicoObstetraNome: string
  enfermeiroObstetraNome?: string
  pediatraNeonatologistaNome?: string
  observacoesParto?: string
}

export interface CriarRecemNascidoParams {
  partoId: string
  admissaoObstetricaId: string
  maePacienteId: string
  maeNome: string
  identificacaoRn: string
  dataHoraNascimento: string
  sexo: SexoRN
  pesoGramas: number
  comprimentoCm?: number
  perimetroCefalicoCm?: number
  perimetroToracicoCm?: number
  apgar1Minuto?: number
  apgar5Minutos?: number
  apgar10Minutos?: number
  acomodacaoRn: AcomodacaoRN
  reanimacaoNeonatalNecessaria?: boolean
  detalhesReanimacao?: string
  pulseiraIdentificacaoConferida: boolean
  declaracaoNascidoVivoDnvNumero?: string
  observacoesRn?: string
  pacienteRnCadastroId?: string
}

export interface RegistrarDesfechoAltaParams {
  admissaoObstetricaId: string
  pacienteMaeId: string
  pacienteMaeNome: string
  dataHoraDesfecho: string
  tipoDesfecho: TipoDesfechoObstetrico
  resumoDesfechoClinico: string
  orientacoesPosPartoPuerperio?: string
  encaminhamentoRetornoUbs?: string
  desocuparLeitoInternacao?: boolean
  internacaoDesocupadaId?: string
  profissionalAltaId?: string
  profissionalNome: string
}

function gerarNumeroAdmissaoObstetrica(): string {
  const ano = new Date().getFullYear()
  const random = Math.floor(10000 + Math.random() * 90000)
  return `OBS-${ano}-${random}`
}

// -------------------------------------------------------------
// ADMISSÃO OBSTÉTRICA
// -------------------------------------------------------------
export async function registrarAdmissaoObstetrica(
  params: CriarAdmissaoObstetricaParams,
): Promise<AdmissaoObstetrica> {
  const numero_admissao = gerarNumeroAdmissaoObstetrica()
  const status_admissao = params.statusAdmissao || 'em_trabalho_parto'

  const payload: any = {
    numero_admissao,
    paciente: params.pacienteId,
    paciente_nome: params.pacienteNome,
    internacao: params.internacaoId || null,
    leito: params.leitoId || null,
    leito_codigo: params.leitoCodigo || '',
    data_hora_admissao: params.dataHoraAdmissao,
    gravidez_planejada: !!params.gravidezPlanejada,
    gesta_previa: params.gestaPrevia ?? null,
    para_previa: params.paraPrevia ?? null,
    abortos_previos: params.abortosPrevios ?? null,
    cesareas_previas: params.cesareasPrevias ?? null,
    idade_gestacional_semanas: params.idadeGestacionalSemanas ?? null,
    idade_gestacional_dias: params.idadeGestacionalDias ?? null,
    dum_informada: params.dumInformada || '',
    dpp_informada: params.dppInformada || '',
    risco_obstetrico_informado: params.riscoObstetricoInformado || 'habitual',
    justificativa_risco_profissional: params.justificativaRiscoProfissional || '',
    motivo_admissao: params.motivoAdmissao,
    sinais_sintomas_admissao: params.sinaisSintomasAdmissao || '',
    sinais_vitais_admissao: params.sinaisVitaisAdmissao || '',
    batimentos_cardiofetais_bcf: params.batimentosCardiofetaisBcf || '',
    dinamica_uterina: params.dinamicaUterina || '',
    dilatacao_cervical_cm: params.dilatacaoCervicalCm || '',
    bolsa_amniotica: params.bolsaAmniotica || '',
    status_admissao,
    profissional_responsavel: params.profissionalResponsavelId || null,
    profissional_nome: params.profissionalNome,
    observacoes_admissao: params.observacoesAdmissao || '',
  }

  const record = await pb.collection('obstetrica_admissoes').create<AdmissaoObstetrica>(payload)

  await registrarAuditoria({
    acao: 'REGISTRAR_ADMISSAO_OBSTETRICA',
    modulo: 'Centro Obstétrico',
    detalhes: `Admissão obstétrica nº ${numero_admissao} da paciente ${params.pacienteNome} (IG informada: ${params.idadeGestacionalSemanas || 'N/I'} sem, Risco: ${params.riscoObstetricoInformado || 'habitual'}).`,
    registro_id: record.id,
  })

  return record
}

export async function listarAdmissoesObstetricas(filtros?: {
  pacienteId?: string
  status?: StatusAdmissaoObstetrica | 'todos'
  dataInicio?: string
  dataFim?: string
  buscaTexto?: string
}): Promise<AdmissaoObstetrica[]> {
  try {
    const filterClauses: string[] = []

    if (filtros?.pacienteId) {
      filterClauses.push(`paciente = "${filtros.pacienteId}"`)
    }
    if (filtros?.status && filtros.status !== 'todos') {
      filterClauses.push(`status_admissao = "${filtros.status}"`)
    }
    if (filtros?.dataInicio) {
      filterClauses.push(`data_hora_admissao >= "${filtros.dataInicio}"`)
    }
    if (filtros?.dataFim) {
      filterClauses.push(`data_hora_admissao <= "${filtros.dataFim} 23:59:59"`)
    }
    if (filtros?.buscaTexto && filtros.buscaTexto.trim().length > 0) {
      const q = filtros.buscaTexto.trim().replace(/"/g, '')
      filterClauses.push(
        `(paciente_nome ~ "${q}" || numero_admissao ~ "${q}" || leito_codigo ~ "${q}")`,
      )
    }

    const filterString = filterClauses.length > 0 ? filterClauses.join(' && ') : ''

    const records = await pb.collection('obstetrica_admissoes').getFullList<AdmissaoObstetrica>({
      filter: filterString,
      sort: '-data_hora_admissao,-created',
      expand: 'paciente,internacao,leito,profissional_responsavel',
    })

    return records
  } catch (err) {
    console.error('Erro ao listar admissões obstétricas:', err)
    return []
  }
}

export async function atualizarStatusAdmissaoObstetrica(
  admissaoId: string,
  novoStatus: StatusAdmissaoObstetrica,
  motivo?: string,
): Promise<AdmissaoObstetrica> {
  const record = await pb
    .collection('obstetrica_admissoes')
    .update<AdmissaoObstetrica>(admissaoId, { status_admissao: novoStatus })

  await registrarAuditoria({
    acao: 'ATUALIZAR_STATUS_ADMISSAO_OBSTETRICA',
    modulo: 'Centro Obstétrico',
    detalhes: `Status da admissão obstétrica ${record.numero_admissao} alterado para "${novoStatus}". ${motivo ? `Nota: ${motivo}` : ''}`,
    registro_id: record.id,
  })

  return record
}

// -------------------------------------------------------------
// TRABALHO DE PARTO (CRONOLOGIA & EVOLUÇÃO)
// -------------------------------------------------------------
export async function registrarEvolucaoTrabalhoParto(
  params: CriarRegistroTrabalhoPartoParams,
): Promise<RegistroTrabalhoParto> {
  const payload: any = {
    admissao_obstetrica: params.admissaoObstetricaId,
    paciente: params.pacienteId,
    data_hora_registro: params.dataHoraRegistro,
    dilatacao_cervical_cm: params.dilatacaoCervicalCm || '',
    apagamento_cervical_percentual: params.apagamentoCervicalPercentual || '',
    altura_apresentacao_de_lee: params.alturaApresentacaoDeLee || '',
    variedade_posicao: params.variedadePosicao || '',
    dinamica_uterina_freq_duracao: params.dinamicaUterinaFreqDuracao || '',
    batimentos_cardiofetais_bcf: params.batimentosCardiofetaisBcf || '',
    bolsa_aspecto_liquido: params.bolsaAspectoLiquido || '',
    pressao_arterial: params.pressaoArterial || '',
    frequencia_cardiaca_materna: params.frequenciaCardiacaMaterna || '',
    temperatura_axilar: params.temperaturaAxilar || '',
    metodos_alivio_dor_informados: params.metodosAlivioDorInformados || '',
    medicamentos_administrados: params.medicamentosAdministrados || '',
    evolucao_anotacao_profissional: params.evolucaoAnotacaoProfissional,
    profissional_registro: params.profissionalRegistroId || null,
    profissional_nome: params.profissionalNome,
  }

  const record = await pb
    .collection('obstetrica_trabalho_parto')
    .create<RegistroTrabalhoParto>(payload)

  await registrarAuditoria({
    acao: 'REGISTRAR_TRABALHO_PARTO',
    modulo: 'Centro Obstétrico',
    detalhes: `Evolução de trabalho de parto registrada às ${params.dataHoraRegistro} por ${params.profissionalNome} (Dilatação: ${params.dilatacaoCervicalCm || 'N/I'} cm, BCF: ${params.batimentosCardiofetaisBcf || 'N/I'}).`,
    registro_id: record.id,
  })

  return record
}

export async function listarRegistrosTrabalhoParto(
  admissaoObstetricaId?: string,
  pacienteId?: string,
): Promise<RegistroTrabalhoParto[]> {
  try {
    const filterClauses: string[] = []
    if (admissaoObstetricaId) {
      filterClauses.push(`admissao_obstetrica = "${admissaoObstetricaId}"`)
    }
    if (pacienteId) {
      filterClauses.push(`paciente = "${pacienteId}"`)
    }

    const records = await pb
      .collection('obstetrica_trabalho_parto')
      .getFullList<RegistroTrabalhoParto>({
        filter: filterClauses.join(' && '),
        sort: 'data_hora_registro,created',
        expand: 'profissional_registro,admissao_obstetrica',
      })

    return records
  } catch (err) {
    console.error('Erro ao listar registros de trabalho de parto:', err)
    return []
  }
}

// -------------------------------------------------------------
// PARTO / NASCIMENTO
// -------------------------------------------------------------
export async function registrarParto(params: CriarRegistroPartoParams): Promise<RegistroParto> {
  const payload: any = {
    admissao_obstetrica: params.admissaoObstetricaId,
    paciente_mae: params.pacienteMaeId,
    paciente_mae_nome: params.pacienteMaeNome,
    data_hora_parto: params.dataHoraParto,
    tipo_parto: params.tipoParto,
    indicacao_tipo_parto: params.indicacaoTipoParto || '',
    posicao_parto: params.posicaoParto || '',
    anestesia_analgesia_utilizada: params.anestesiaAnalgesiaUtilizada || '',
    episiotomia_laceracao: params.episiotomiaLaceracao || '',
    perineorrafia_sutura: params.perineorrafiaSutura || '',
    dequitacao_placenta_tempo_modo: params.dequitacaoPlacentaTempoModo || '',
    sangramento_estimado_ml: params.sangramentoEstimadoMl ?? null,
    intercorrencias_maternas: params.intercorrenciasMaternas || '',
    contato_pele_a_pele_imediato: !!params.contatoPeleAPeleImediato,
    amamentacao_primeira_hora: !!params.amamentacaoPrimeiraHora,
    clampeamento_cordao_oportuno: !!params.clampeamentoCordaoOportuno,
    medico_obstetra: params.medicoObstetraId || null,
    medico_obstetra_nome: params.medicoObstetraNome,
    enfermeiro_obstetra_nome: params.enfermeiroObstetraNome || '',
    pediatra_neonatologista_nome: params.pediatraNeonatologistaNome || '',
    observacoes_parto: params.observacoesParto || '',
  }

  const record = await pb.collection('obstetrica_partos').create<RegistroParto>(payload)

  // Atualizar admissão para 'parto_realizado'
  try {
    await pb
      .collection('obstetrica_admissoes')
      .update(params.admissaoObstetricaId, { status_admissao: 'parto_realizado' })
  } catch (e) {
    console.warn('Não foi possível atualizar status da admissão obstétrica:', e)
  }

  await registrarAuditoria({
    acao: 'REGISTRAR_PARTO',
    modulo: 'Centro Obstétrico',
    detalhes: `Parto registrado para a mãe ${params.pacienteMaeNome} em ${params.dataHoraParto}. Tipo: ${params.tipoParto}. Médico responsável: ${params.medicoObstetraNome}.`,
    registro_id: record.id,
  })

  return record
}

export async function listarPartos(
  admissaoObstetricaId?: string,
  pacienteMaeId?: string,
): Promise<RegistroParto[]> {
  try {
    const filterClauses: string[] = []
    if (admissaoObstetricaId) {
      filterClauses.push(`admissao_obstetrica = "${admissaoObstetricaId}"`)
    }
    if (pacienteMaeId) {
      filterClauses.push(`paciente_mae = "${pacienteMaeId}"`)
    }

    const records = await pb.collection('obstetrica_partos').getFullList<RegistroParto>({
      filter: filterClauses.join(' && '),
      sort: '-data_hora_parto,-created',
      expand: 'medico_obstetra,admissao_obstetrica,paciente_mae',
    })

    return records
  } catch (err) {
    console.error('Erro ao listar partos:', err)
    return []
  }
}

// -------------------------------------------------------------
// RECÉM-NASCIDO (VÍNCULO MÃE-RN & DADOS ANTROPOMÉTRICOS)
// -------------------------------------------------------------
export async function registrarRecemNascido(
  params: CriarRecemNascidoParams,
): Promise<RecemNascido> {
  const payload: any = {
    parto: params.partoId,
    admissao_obstetrica: params.admissaoObstetricaId,
    mae_paciente: params.maePacienteId,
    mae_nome: params.maeNome,
    identificacao_rn: params.identificacaoRn,
    data_hora_nascimento: params.dataHoraNascimento,
    sexo: params.sexo,
    peso_gramas: params.pesoGramas,
    comprimento_cm: params.comprimentoCm ?? null,
    perimetro_cefalico_cm: params.perimetroCefalicoCm ?? null,
    perimetro_toracico_cm: params.perimetroToracicoCm ?? null,
    apgar_1_minuto: params.apgar1Minuto ?? null,
    apgar_5_minutos: params.apgar5Minutos ?? null,
    apgar_10_minutos: params.apgar10Minutos ?? null,
    acomodacao_rn: params.acomodacaoRn,
    reanimacao_neonatal_necessaria: !!params.reanimacaoNeonatalNecessaria,
    detalhes_reanimacao: params.detalhesReanimacao || '',
    pulseira_identificacao_conferida: !!params.pulseiraIdentificacaoConferida,
    declaracao_nascido_vivo_dnv_numero: params.declaracaoNascidoVivoDnvNumero || '',
    observacoes_rn: params.observacoesRn || '',
    paciente_rn_cadastro: params.pacienteRnCadastroId || null,
  }

  const record = await pb.collection('obstetrica_recem_nascidos').create<RecemNascido>(payload)

  await registrarAuditoria({
    acao: 'REGISTRAR_RECEM_NASCIDO',
    modulo: 'Centro Obstétrico',
    detalhes: `Recém-nascido "${params.identificacaoRn}" cadastrado e vinculado à mãe ${params.maeNome} (Sexo: ${params.sexo}, Peso: ${params.pesoGramas}g, Apgar 1º/5º: ${params.apgar1Minuto ?? '-'}/${params.apgar5Minutos ?? '-'}, Acomodação: ${params.acomodacaoRn}).`,
    registro_id: record.id,
  })

  return record
}

export async function listarRecemNascidos(
  partoId?: string,
  maePacienteId?: string,
): Promise<RecemNascido[]> {
  try {
    const filterClauses: string[] = []
    if (partoId) {
      filterClauses.push(`parto = "${partoId}"`)
    }
    if (maePacienteId) {
      filterClauses.push(`mae_paciente = "${maePacienteId}"`)
    }

    const records = await pb.collection('obstetrica_recem_nascidos').getFullList<RecemNascido>({
      filter: filterClauses.join(' && '),
      sort: '-data_hora_nascimento,-created',
      expand: 'parto,admissao_obstetrica,mae_paciente,paciente_rn_cadastro',
    })

    return records
  } catch (err) {
    console.error('Erro ao listar recém-nascidos:', err)
    return []
  }
}

// -------------------------------------------------------------
// DESFECHO & ALTA OBSTÉTRICA (INTEGRADA AO LEITO DE INTERNAÇÃO)
// -------------------------------------------------------------
export async function registrarDesfechoAltaObstetrica(
  params: RegistrarDesfechoAltaParams,
): Promise<DesfechoAltaObstetrica> {
  const payload: any = {
    admissao_obstetrica: params.admissaoObstetricaId,
    paciente_mae: params.pacienteMaeId,
    paciente_mae_nome: params.pacienteMaeNome,
    data_hora_desfecho: params.dataHoraDesfecho,
    tipo_desfecho: params.tipoDesfecho,
    resumo_desfecho_clinico: params.resumoDesfechoClinico,
    orientacoes_pos_parto_puerperio: params.orientacoesPosPartoPuerperio || '',
    encaminhamento_retorno_ubs: params.encaminhamentoRetornoUbs || '',
    desocupar_leito_internacao: !!params.desocuparLeitoInternacao,
    internacao_desocupada: params.internacaoDesocupadaId || null,
    profissional_alta: params.profissionalAltaId || null,
    profissional_nome: params.profissionalNome,
  }

  const record = await pb
    .collection('obstetrica_desfechos_altas')
    .create<DesfechoAltaObstetrica>(payload)

  // Atualizar admissão para 'alta' ou 'transferida'
  const novoStatusAdmissao: StatusAdmissaoObstetrica =
    params.tipoDesfecho === 'transferencia_inter_hospitalar'
      ? 'transferida'
      : params.tipoDesfecho === 'permanencia_internada'
        ? 'parto_realizado'
        : 'alta'

  try {
    await pb
      .collection('obstetrica_admissoes')
      .update(params.admissaoObstetricaId, { status_admissao: novoStatusAdmissao })
  } catch (e) {
    console.warn('Erro ao atualizar status da admissão obstétrica:', e)
  }

  // Se solicitado desocupar leito e há internação vinculada, dar alta na internação e liberar o leito
  if (params.desocuparLeitoInternacao && params.internacaoDesocupadaId) {
    try {
      const internacao = await pb
        .collection('internacoes')
        .getOne<any>(params.internacaoDesocupadaId)

      await pb.collection('internacoes').update(internacao.id, {
        status: 'alta',
        data_alta: params.dataHoraDesfecho,
        motivo_alta: `Alta obstétrica: ${params.resumoDesfechoClinico}`,
      })

      if (internacao.leito_atual) {
        await pb.collection('leitos').update(internacao.leito_atual, {
          status: 'higienizacao', // Leito vai para higienização após a desocupação
        })
      }
    } catch (e) {
      console.warn('Erro ao desocupar leito na alta obstétrica:', e)
    }
  }

  await registrarAuditoria({
    acao: 'REGISTRAR_DESFECHO_ALTA_OBSTETRICA',
    modulo: 'Centro Obstétrico',
    detalhes: `Desfecho obstétrico da paciente ${params.pacienteMaeNome}: ${params.tipoDesfecho}. Profissional: ${params.profissionalNome}. Desocupação de leito: ${params.desocuparLeitoInternacao ? 'Sim' : 'Não'}.`,
    registro_id: record.id,
  })

  return record
}

export async function listarDesfechosAltas(
  admissaoObstetricaId?: string,
  pacienteMaeId?: string,
): Promise<DesfechoAltaObstetrica[]> {
  try {
    const filterClauses: string[] = []
    if (admissaoObstetricaId) {
      filterClauses.push(`admissao_obstetrica = "${admissaoObstetricaId}"`)
    }
    if (pacienteMaeId) {
      filterClauses.push(`paciente_mae = "${pacienteMaeId}"`)
    }

    const records = await pb
      .collection('obstetrica_desfechos_altas')
      .getFullList<DesfechoAltaObstetrica>({
        filter: filterClauses.join(' && '),
        sort: '-data_hora_desfecho,-created',
        expand: 'profissional_alta,admissao_obstetrica,paciente_mae',
      })

    return records
  } catch (err) {
    console.error('Erro ao listar desfechos obstétricos:', err)
    return []
  }
}

// -------------------------------------------------------------
// PAINEL DE GESTÃO DO CENTRO OBSTÉTRICO (INDICADORES AGREGADOS)
// -------------------------------------------------------------
export interface IndicadoresCentroObstetrico {
  totalAdmissoes: number
  admissoesAtivasEmTrabalhoParto: number
  admissoesEmObservacao: number
  partosRealizados: number
  altasConcluidas: number
  transferencias: number
  totalRecemNascidos: number
  partosPorTipo: {
    vaginal_espontaneo: number
    vaginal_instrumentado: number
    cesarea_eletiva: number
    cesarea_urgencia: number
  }
  recemNascidosPorSexo: {
    masculino: number
    feminino: number
    indeterminado: number
  }
  recemNascidosPorAcomodacao: {
    alojamento_conjunto: number
    unidade_cuidados_intermediarios: number
    uti_neonatal: number
    isolamento: number
  }
  taxaContatoPeleAPele: number
  taxaAmamentacaoPrimeiraHora: number
}

export function calcularIndicadoresCentroObstetrico(
  admissoes: AdmissaoObstetrica[],
  partos: RegistroParto[],
  recemNascidos: RecemNascido[],
): IndicadoresCentroObstetrico {
  let admissoesAtivasEmTrabalhoParto = 0
  let admissoesEmObservacao = 0
  let altasConcluidas = 0
  let transferencias = 0

  admissoes.forEach((a) => {
    if (a.status_admissao === 'em_trabalho_parto') admissoesAtivasEmTrabalhoParto++
    else if (a.status_admissao === 'em_observacao') admissoesEmObservacao++
    else if (a.status_admissao === 'alta') altasConcluidas++
    else if (a.status_admissao === 'transferida') transferencias++
  })

  const partosPorTipo = {
    vaginal_espontaneo: 0,
    vaginal_instrumentado: 0,
    cesarea_eletiva: 0,
    cesarea_urgencia: 0,
  }

  let peleAPeleCount = 0
  let amamentacao1hCount = 0

  partos.forEach((p) => {
    if (partosPorTipo[p.tipo_parto] !== undefined) {
      partosPorTipo[p.tipo_parto]++
    }
    if (p.contato_pele_a_pele_imediato) peleAPeleCount++
    if (p.amamentacao_primeira_hora) amamentacao1hCount++
  })

  const recemNascidosPorSexo = {
    masculino: 0,
    feminino: 0,
    indeterminado: 0,
  }

  const recemNascidosPorAcomodacao = {
    alojamento_conjunto: 0,
    unidade_cuidados_intermediarios: 0,
    uti_neonatal: 0,
    isolamento: 0,
  }

  recemNascidos.forEach((rn) => {
    if (recemNascidosPorSexo[rn.sexo] !== undefined) {
      recemNascidosPorSexo[rn.sexo]++
    }
    if (recemNascidosPorAcomodacao[rn.acomodacao_rn] !== undefined) {
      recemNascidosPorAcomodacao[rn.acomodacao_rn]++
    }
  })

  const totalPartos = partos.length
  const taxaContatoPeleAPele =
    totalPartos > 0 ? Math.round((peleAPeleCount / totalPartos) * 100) : 0
  const taxaAmamentacaoPrimeiraHora =
    totalPartos > 0 ? Math.round((amamentacao1hCount / totalPartos) * 100) : 0

  return {
    totalAdmissoes: admissoes.length,
    admissoesAtivasEmTrabalhoParto,
    admissoesEmObservacao,
    partosRealizados: totalPartos,
    altasConcluidas,
    transferencias,
    totalRecemNascidos: recemNascidos.length,
    partosPorTipo,
    recemNascidosPorSexo,
    recemNascidosPorAcomodacao,
    taxaContatoPeleAPele,
    taxaAmamentacaoPrimeiraHora,
  }
}
