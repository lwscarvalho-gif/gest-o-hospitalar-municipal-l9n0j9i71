/**
 * Serviço de Conferência de Consistência do Faturamento SUS Municipal (v0.0.27)
 *
 * ATENÇÃO REGULATÓRIA:
 * Validação administrativa e operacional interna preventiva, executada ANTES de qualquer
 * exportação ou consolidação. NUNCA alegar homologação oficial DATASUS nem conformidade jurídica plena.
 *
 * FONTES OFICIAIS DOCUMENTADAS:
 * 1. Manual Técnico Operacional SIH — Janeiro/2017 (DATASUS):
 *    ftp://ftp2.datasus.gov.br/public/sistemas/dsweb/SIHD/Manuais/MANUAL_SIH_janeiro_2017.pdf
 *    - AIH válida para apresentação até 3 competências anteriores à de apresentação;
 *    - Alta do paciente permitida até 6 meses anteriores à competência de processamento;
 *    - CID principal e secundário obrigatórios quando causa externa ou agravo de trabalho
 *      (Capítulos XIX/XX da CID-10, grupos S/T/V/W/X/Y - Portarias GM/MS 1969/2001 e SAS 579/2001).
 *
 * 2. Manual de Operacionalização nos Sistemas de Informação: Componente Créditos Financeiros (MS/gov.br, 2025):
 *    https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/guias-e-manuais/2025/manual-operacionalizacao-nos-sistemas-de-informacao-creditos-financeiros.pdf
 *    - Estrutura da AIH (inicial / continuidade / longa permanência);
 *    - Componentes de valor SH (Serviços Hospitalares) e SP (Serviços Profissionais);
 *    - Tabela Unificada de Procedimentos, Medicamentos e OPM do SUS (SIGTAP).
 *
 * 3. SIGTAP oficial (DATASUS):
 *    http://sigtap.datasus.gov.br
 *    - Tabela unificada por competência (competências distintas podem alterar atributos e vigências).
 *    - Se a competência da conta/atendimento não estiver importada, NUNCA inferir compatibilidade:
 *      sinalizar 'competência não importada — validar manualmente'.
 *
 * 4. SIA/SUS (DATASUS):
 *    http://sia.datasus.gov.br
 *    - BPA individualizado (BPA-I) vs consolidado (BPA-C) conforme instrumento de registro.
 *    - Controle de duplicidade de produção na mesma competência para o mesmo atendimento e procedimento.
 */

import {
  ContaFaturamento,
  ProducaoBPAItem,
  ProcedimentoSigtap,
  CID10Item,
  Paciente,
  Profissional,
  Internacao,
} from '@/types/hospital'

export type NivelInconsistencia = 'erro' | 'advertencia'

export interface ItemInconsistencia {
  id: string
  campo: string
  nivel: NivelInconsistencia
  mensagem: string
  fonteOficial: string
  regraReferencia: string
}

export interface ResultadoValidacaoContaAIH {
  contaId: string
  numeroConta: string
  valida: boolean
  erros: ItemInconsistencia[]
  advertencias: ItemInconsistencia[]
  totalErros: number
  totalAdvertencias: number
}

export interface ResultadoValidacaoItemBPA {
  bpaId: string
  procedimentoCodigo: string
  pacienteNome: string
  valida: boolean
  erros: ItemInconsistencia[]
  advertencias: ItemInconsistencia[]
  totalErros: number
  totalAdvertencias: number
  duplicidadeDetectada?: boolean
}

export interface ContextoValidacaoFaturamento {
  competenciaAtiva: string // Formato 'YYYY-MM'
  competenciasImportadasSigtap?: string[] // Competências com SIGTAP formalmente carregada
  catalogoSigtap: ProcedimentoSigtap[]
  tabelaSigtapParcial?: boolean // Se true, tabela local é um recorte/parcial (não completa)
  catalogoCid10?: CID10Item[]
  pacientesExistentes?: Paciente[]
  profissionaisExistentes?: Profissional[]
  internacoesExistentes?: Internacao[]
  cnesUnidadeCadastrado?: string
  producaoBpaCompetencia?: ProducaoBPAItem[]
}

export interface ResumoConferenciaFaturamento {
  competencia: string
  totalContasAihAvaliadas: number
  contasAihValidas: number
  contasAihComErros: number
  contasAihComAdvertencias: number
  totalItensBpaAvaliados: number
  itensBpaValidos: number
  itensBpaComErros: number
  itensBpaComAdvertencias: number
  itensBpaDuplicados: number
  detalhesContas: ResultadoValidacaoContaAIH[]
  detalhesBpa: ResultadoValidacaoItemBPA[]
  competenciaSigtapImportada: boolean
}

// ============================================================================
// HELPERS DE DATA E COMPETÊNCIA
// ============================================================================

/**
 * Converte data string nos formatos ISO 'YYYY-MM-DD' ou BR 'DD/MM/YYYY' para objeto Date.
 */
export function converterDataGenerica(dataStr?: string | null): Date | null {
  if (!dataStr || typeof dataStr !== 'string') return null
  const limpa = dataStr.trim()
  if (!limpa) return null

  // Se já for YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(limpa)) {
    const [ano, mes, dia] = limpa.slice(0, 10).split('-').map(Number)
    if (ano && mes && dia) {
      const d = new Date(ano, mes - 1, dia)
      if (!isNaN(d.getTime())) return d
    }
  }

  // Se for DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(limpa)) {
    const [dia, mes, ano] = limpa.slice(0, 10).split('/').map(Number)
    if (ano && mes && dia) {
      const d = new Date(ano, mes - 1, dia)
      if (!isNaN(d.getTime())) return d
    }
  }

  const d = new Date(limpa)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Calcula a diferença em meses civis entre uma data de evento e a competência de processamento ('YYYY-MM').
 * Retorna positivo se o evento for anterior à competência.
 * Ex: evento em 2025-01 e competência 2025-08 -> 7 meses.
 */
export function diferencaMesesCompetencia(dataEvento: Date, competencia: string): number | null {
  const [anoCompStr, mesCompStr] = (competencia || '').split('-')
  const anoComp = parseInt(anoCompStr, 10)
  const mesComp = parseInt(mesCompStr, 10)
  if (isNaN(anoComp) || isNaN(mesComp)) return null

  const anoEvento = dataEvento.getFullYear()
  const mesEvento = dataEvento.getMonth() + 1 // 1-12

  return (anoComp - anoEvento) * 12 + (mesComp - mesEvento)
}

/**
 * Checa se o CID pertence ao capítulo de causas externas e lesões (Capítulos XIX e XX: S00-T98 e V01-Y98).
 * Checagem exclusivamente administrativa do código de caracteres, nunca inferência clínica.
 */
export function isCausaExternaOuAgravoTrabalho(cidCodigo?: string | null): boolean {
  if (!cidCodigo) return false
  const codigoLimpo = cidCodigo
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  if (!codigoLimpo) return false

  const letra = codigoLimpo[0]
  // Capítulos XIX (S e T) e XX (V, W, X, Y)
  return (
    letra === 'S' ||
    letra === 'T' ||
    letra === 'V' ||
    letra === 'W' ||
    letra === 'X' ||
    letra === 'Y'
  )
}

// ============================================================================
// VALIDAÇÃO DE CONTA HOSPITALAR (AIH)
// ============================================================================

export function validarContaHospitalarAIH(
  conta: ContaFaturamento,
  contexto: ContextoValidacaoFaturamento,
): ResultadoValidacaoContaAIH {
  const erros: ItemInconsistencia[] = []
  const advertencias: ItemInconsistencia[] = []

  const competenciaAlvo = conta.competencia || contexto.competenciaAtiva

  // 1. Campos Obrigatórios de Identificação
  if (!conta.paciente || (typeof conta.paciente === 'string' && conta.paciente.trim() === '')) {
    erros.push({
      id: 'aih_sem_paciente',
      campo: 'paciente',
      nivel: 'erro',
      mensagem: 'Conta hospitalar sem paciente vinculado.',
      fonteOficial: 'Manual SIH/DATASUS 2017 (Cap. Identificação do Usuário)',
      regraReferencia:
        'Obrigatoriedade de vínculo do paciente/CNS cadastrado para composição da AIH.',
    })
  } else if (contexto.pacientesExistentes && contexto.pacientesExistentes.length > 0) {
    const pacienteEncontrado = contexto.pacientesExistentes.find(
      (p) => p.id === conta.paciente || p.id === (conta.expand?.paciente as any)?.id,
    )
    if (!pacienteEncontrado && !conta.expand?.paciente) {
      erros.push({
        id: 'aih_paciente_inexistente',
        campo: 'paciente',
        nivel: 'erro',
        mensagem: 'Referência de paciente não localizada no cadastro hospitalar.',
        fonteOficial: 'Manual SIH/DATASUS 2017',
        regraReferencia: 'Consistência de integridade relacional cadastral.',
      })
    }
  }

  // 2. Procedimento Principal
  if (!conta.procedimento_principal_codigo || conta.procedimento_principal_codigo.trim() === '') {
    erros.push({
      id: 'aih_sem_procedimento_principal',
      campo: 'procedimento_principal_codigo',
      nivel: 'erro',
      mensagem: 'Procedimento principal não informado na conta AIH.',
      fonteOficial: 'Manual SIH/DATASUS 2017 e Manual Créditos Financeiros MS 2025',
      regraReferencia: 'Procedimento principal SIGTAP é campo estruturante obrigatório da AIH.',
    })
  } else {
    // Validação contra SIGTAP por competência
    const procCodigoLimpo = conta.procedimento_principal_codigo.trim()
    const procEncontrado = contexto.catalogoSigtap.find((p) => p.codigo.trim() === procCodigoLimpo)

    // Se houver lista de competências importadas e a competência da conta não foi importada
    const competenciasImportadas = contexto.competenciasImportadasSigtap || []
    const competenciaImportada =
      competenciasImportadas.length === 0 || competenciasImportadas.includes(competenciaAlvo)

    if (!competenciaImportada) {
      advertencias.push({
        id: 'aih_sigtap_competencia_nao_importada',
        campo: 'procedimento_principal_codigo',
        nivel: 'advertencia',
        mensagem: `Competência ${competenciaAlvo} não importada na SIGTAP local — validar manualmente vigência do procedimento ${procCodigoLimpo}.`,
        fonteOficial: 'SIGTAP Oficial (http://tabela-unificada.datasus.gov.br)',
        regraReferencia:
          'Procedimentos e atributos variam por competência; não inferir compatibilidade de tabela ausente.',
      })
    } else if (!procEncontrado) {
      // Requisito 2: Catálogo parcial (importação em recorte) não permite afirmar que procedimento ausente é inválido.
      // Se a tabela for parcial ou não declarada completa, gera aviso 'tabela incompleta, validar manualmente', não erro.
      if (contexto.tabelaSigtapParcial) {
        advertencias.push({
          id: 'aih_procedimento_tabela_parcial_validar_manual',
          campo: 'procedimento_principal_codigo',
          nivel: 'advertencia',
          mensagem: `Procedimento principal ${procCodigoLimpo} não localizado em catálogo local parcial/recorte — tabela incompleta, validar manualmente.`,
          fonteOficial: 'SIGTAP Oficial (http://tabela-unificada.datasus.gov.br)',
          regraReferencia:
            'Importação parcial de SIGTAP não constitui evidência de inexistência do procedimento no SUS.',
        })
      } else {
        erros.push({
          id: 'aih_procedimento_inexistente_sigtap',
          campo: 'procedimento_principal_codigo',
          nivel: 'erro',
          mensagem: `Procedimento principal ${procCodigoLimpo} não foi localizado na tabela SIGTAP municipal da competência.`,
          fonteOficial:
            'SIGTAP Oficial (http://tabela-unificada.datasus.gov.br) e Manual Créditos Financeiros MS 2025',
          regraReferencia:
            'Todo procedimento faturado em AIH deve existir no catálogo SIGTAP ativo da competência.',
        })
      }
    } else if (procEncontrado.modalidade && procEncontrado.modalidade === 'ambulatorial') {
      advertencias.push({
        id: 'aih_modalidade_exclusiva_ambulatorial',
        campo: 'procedimento_principal_codigo',
        nivel: 'advertencia',
        mensagem: `Procedimento ${procCodigoLimpo} está cadastrado como modalidade exclusivamente ambulatorial no SIGTAP.`,
        fonteOficial: 'Manual Créditos Financeiros MS 2025 (Tabela Unificada)',
        regraReferencia:
          'Procedimentos exclusivos de BPA não costumam ser aceitos como procedimento principal de internação AIH.',
      })
    }
  }

  // 3. CID Principal e Secundário
  if (!conta.cid_principal || conta.cid_principal.trim() === '') {
    erros.push({
      id: 'aih_sem_cid_principal',
      campo: 'cid_principal',
      nivel: 'erro',
      mensagem: 'Diagnóstico principal (CID-10) não informado na conta de internação.',
      fonteOficial: 'Manual SIH/DATASUS 2017 (Cap. Diagnóstico da AIH)',
      regraReferencia: 'CID-10 principal é campo de preenchimento obrigatório.',
    })
  } else {
    const cidLimpo = conta.cid_principal.trim().toUpperCase()

    // Requisito 1: Não inferir causa externa ou doença ocupacional a partir do capítulo do CID (S/T).
    // Validar apenas campos explicitamente informados e regras documentadas aplicáveis.
    // Regras normativas sem vigência confirmada em 2026 (Manual SIH 2017) viram AVISO "revisão humana", sem bloquear conta.
    const caraterAtendimento = (conta.carater_atendimento || '').toLowerCase()
    const ehAcidenteOuCausaExternaDeclarada =
      caraterAtendimento.includes('acidente') ||
      caraterAtendimento.includes('trabalho') ||
      caraterAtendimento.includes('transito') ||
      caraterAtendimento.includes('extern')

    if (
      ehAcidenteOuCausaExternaDeclarada &&
      (!conta.cid_secundario || conta.cid_secundario.trim() === '')
    ) {
      advertencias.push({
        id: 'aih_causa_externa_declarada_sem_cid_secundario',
        campo: 'cid_secundario',
        nivel: 'advertencia',
        mensagem: `Caráter de atendimento explicitamente registrado como causa externa/acidente sem CID secundário informado — recomendada revisão humana.`,
        fonteOficial:
          'Manual SIH 2017 / Portarias GM/MS 1969/2001 (revisão humana — vigência em confirmação 2026)',
        regraReferencia:
          'Campo explicitamente informado demanda verificação de CID complementar sem bloqueio automático.',
      })
    }
  }

  // 4. Coerência Temporal: Datas de Internação e Alta
  const dtInternacao = converterDataGenerica(conta.data_internacao)
  const dtAlta = converterDataGenerica(conta.data_alta)

  if (!dtInternacao) {
    erros.push({
      id: 'aih_data_internacao_invalida',
      campo: 'data_internacao',
      nivel: 'erro',
      mensagem: 'Data de internação ausente ou em formato inválido.',
      fonteOficial: 'Manual SIH/DATASUS 2017 (Período da AIH)',
      regraReferencia: 'Data de admissão/internação deve ser informada e válida.',
    })
  }

  if (dtInternacao && dtAlta) {
    // Saída >= Entrada
    if (dtAlta.getTime() < dtInternacao.getTime()) {
      erros.push({
        id: 'aih_data_alta_anterior_internacao',
        campo: 'data_alta',
        nivel: 'erro',
        mensagem: `Data de saída/alta (${conta.data_alta}) é anterior à data de admissão (${conta.data_internacao}).`,
        fonteOficial: 'Manual SIH/DATASUS 2017',
        regraReferencia:
          'Data de alta/saída hospitalar deve ser cronologicamente igual ou posterior à data de internação.',
      })
    }

    // Regra dos 6 meses: "alta do paciente até 6 meses anteriores à competência de processamento"
    const diffMesesAlta = diferencaMesesCompetencia(dtAlta, competenciaAlvo)
    if (diffMesesAlta !== null && diffMesesAlta > 6) {
      advertencias.push({
        id: 'aih_alta_mais_de_6_meses_competencia',
        campo: 'data_alta',
        nivel: 'advertencia',
        mensagem: `Alta ocorrida há ${diffMesesAlta} meses da competência de processamento (${competenciaAlvo}), excedendo o limite de 6 meses do Manual 2017 — sinalizado para revisão humana (sem bloqueio de conta).`,
        fonteOficial:
          'Manual Técnico Operacional SIH — Janeiro/2017 (DATASUS — revisão humana, sem confirmação 2026)',
        regraReferencia:
          'Alta do paciente permitida somente até 6 meses anteriores à competência de apresentação.',
      })
    }
  }

  // 5. Validade da AIH: até 3 competências anteriores à de apresentação
  if (dtInternacao) {
    const diffMesesInternacao = diferencaMesesCompetencia(dtInternacao, competenciaAlvo)
    if (diffMesesInternacao !== null && diffMesesInternacao > 3 && !dtAlta) {
      advertencias.push({
        id: 'aih_apresentacao_mais_de_3_competencias',
        campo: 'competencia',
        nivel: 'advertencia',
        mensagem: `Internação iniciada há mais de 3 competências anteriores à de apresentação (${competenciaAlvo}) — sinalizado para revisão humana quanto a AIH de continuidade/longa permanência (sem bloqueio de conta).`,
        fonteOficial:
          'Manual Técnico Operacional SIH — Janeiro/2017 (DATASUS — revisão humana, sem confirmação 2026)',
        regraReferencia:
          'AIH válida para apresentação até 3 competências anteriores à de processamento (ou requer AIH de continuidade).',
      })
    }
  }

  // 6. Referência da Unidade CNES
  if (contexto.cnesUnidadeCadastrado === '' || contexto.cnesUnidadeCadastrado === undefined) {
    advertencias.push({
      id: 'aih_cnes_nao_parametrizado',
      campo: 'unidade_cnes',
      nivel: 'advertencia',
      mensagem: 'Código CNES do estabelecimento não parametrizado no módulo de Integrações.',
      fonteOficial: 'Manual SIH/DATASUS 2017 e Manual Créditos Financeiros MS 2025',
      regraReferencia: 'CNES da unidade executante é mandatório para validação da remessa.',
    })
  }

  return {
    contaId: conta.id,
    numeroConta: conta.numero_conta,
    valida: erros.length === 0,
    erros,
    advertencias,
    totalErros: erros.length,
    totalAdvertencias: advertencias.length,
  }
}

// ============================================================================
// VALIDAÇÃO DE ITEM DE PRODUÇÃO AMBULATORIAL (BPA)
// ============================================================================

export function validarItemProducaoBPA(
  bpa: ProducaoBPAItem,
  contexto: ContextoValidacaoFaturamento,
): ResultadoValidacaoItemBPA {
  const erros: ItemInconsistencia[] = []
  const advertencias: ItemInconsistencia[] = []

  const competenciaAlvo = bpa.competencia || contexto.competenciaAtiva

  // 1. Paciente vinculado
  if (!bpa.paciente || (typeof bpa.paciente === 'string' && bpa.paciente.trim() === '')) {
    erros.push({
      id: 'bpa_sem_paciente',
      campo: 'paciente',
      nivel: 'erro',
      mensagem: 'Produção ambulatorial sem paciente vinculado.',
      fonteOficial: 'SIA/SUS (http://sia.datasus.gov.br) — Instrumento BPA-I',
      regraReferencia:
        'BPA individualizado exige identificação cadastral completa do usuário do SUS.',
    })
  }

  // 2. Procedimento SIGTAP
  if (!bpa.procedimento_codigo || bpa.procedimento_codigo.trim() === '') {
    erros.push({
      id: 'bpa_sem_procedimento',
      campo: 'procedimento_codigo',
      nivel: 'erro',
      mensagem: 'Código de procedimento não informado no lançamento BPA.',
      fonteOficial: 'SIA/SUS e SIGTAP Oficial',
      regraReferencia: 'Procedimento SIGTAP é obrigatório para faturamento ambulatorial.',
    })
  } else {
    const codProc = bpa.procedimento_codigo.trim()
    const procEncontrado = contexto.catalogoSigtap.find((p) => p.codigo.trim() === codProc)

    const competenciasImportadas = contexto.competenciasImportadasSigtap || []
    const competenciaImportada =
      competenciasImportadas.length === 0 || competenciasImportadas.includes(competenciaAlvo)

    if (!competenciaImportada) {
      advertencias.push({
        id: 'bpa_sigtap_competencia_nao_importada',
        campo: 'procedimento_codigo',
        nivel: 'advertencia',
        mensagem: `Competência ${competenciaAlvo} não importada na SIGTAP — validar manualmente vigência do procedimento ${codProc}.`,
        fonteOficial: 'SIGTAP Oficial (http://tabela-unificada.datasus.gov.br)',
        regraReferencia: 'Procedimentos e instrumentos de registro variam por competência.',
      })
    } else if (!procEncontrado) {
      // Requisito 2: Tabela parcial não permite afirmar que procedimento é inválido
      if (contexto.tabelaSigtapParcial) {
        advertencias.push({
          id: 'bpa_procedimento_tabela_parcial_validar_manual',
          campo: 'procedimento_codigo',
          nivel: 'advertencia',
          mensagem: `Procedimento ambulatorial ${codProc} não localizado em catálogo local parcial/recorte — tabela incompleta, validar manualmente.`,
          fonteOficial: 'SIGTAP Oficial (http://tabela-unificada.datasus.gov.br)',
          regraReferencia: 'Importação parcial não prova inexistência do procedimento no SUS.',
        })
      } else {
        erros.push({
          id: 'bpa_procedimento_inexistente_sigtap',
          campo: 'procedimento_codigo',
          nivel: 'erro',
          mensagem: `Procedimento ambulatorial ${codProc} inexistente no catálogo SIGTAP importado.`,
          fonteOficial: 'SIA/SUS e SIGTAP Oficial (http://tabela-unificada.datasus.gov.br)',
          regraReferencia: 'O procedimento deve estar vigente e cadastrado no catálogo municipal.',
        })
      }
    } else if (procEncontrado.modalidade && procEncontrado.modalidade === 'hospitalar') {
      advertencias.push({
        id: 'bpa_modalidade_exclusiva_hospitalar',
        campo: 'procedimento_codigo',
        nivel: 'advertencia',
        mensagem: `Procedimento ${codProc} possui modalidade exclusivamente hospitalar no SIGTAP (instrumento esperado: AIH).`,
        fonteOficial: 'Manual SIA/SUS e SIGTAP',
        regraReferencia:
          'Procedimentos de internação exclusiva geram inconsistência se faturados em BPA.',
      })
    }
  }

  // 3. Atendimento real vinculado
  const temAtendimentoReal =
    (bpa.atendimento_pa && bpa.atendimento_pa.trim() !== '') ||
    (bpa.agendamento && bpa.agendamento.trim() !== '') ||
    bpa.origem_atendimento === 'avulso'

  if (!temAtendimentoReal) {
    advertencias.push({
      id: 'bpa_sem_atendimento_vinculado',
      campo: 'origem_atendimento',
      nivel: 'advertencia',
      mensagem:
        'Lançamento ambulatorial sem chave de atendimento do PA ou consulta agendada vinculada.',
      fonteOficial: 'Manual Técnico do SIA/SUS (Rastreabilidade de Atendimentos)',
      regraReferencia:
        'Recomenda-se vinculação direta ao registro assistencial eletrônico para evitar glosas em auditoria.',
    })
  }

  // 4. Profissional executante
  const temProfissional =
    (bpa.profissional && bpa.profissional.trim() !== '') ||
    (bpa.profissional_nome && bpa.profissional_nome.trim() !== '')

  if (!temProfissional) {
    advertencias.push({
      id: 'bpa_sem_profissional',
      campo: 'profissional',
      nivel: 'advertencia',
      mensagem: 'Profissional executante ou solicitante não identificado.',
      fonteOficial: 'SIA/SUS (CNS do Profissional Executante)',
      regraReferencia:
        'Obrigatoriedade de identificação do profissional (CNS/CBO) nos procedimentos individualizados.',
    })
  }

  // 5. Quantidade coerente
  if (!bpa.quantidade || bpa.quantidade <= 0) {
    erros.push({
      id: 'bpa_quantidade_invalida',
      campo: 'quantidade',
      nivel: 'erro',
      mensagem: `Quantidade informada (${bpa.quantidade}) deve ser maior que zero.`,
      fonteOficial: 'SIA/SUS',
      regraReferencia: 'Quantidade produzida deve ser positiva.',
    })
  }

  // 6. Detecção de DUPLICIDADE de Produção
  // (mesmo atendimento/origem + mesmo procedimento + mesma competência)
  let duplicidadeDetectada = false
  if (contexto.producaoBpaCompetencia && contexto.producaoBpaCompetencia.length > 0) {
    const chaveAtendimento = bpa.atendimento_pa || bpa.agendamento || ''
    const codProc = (bpa.procedimento_codigo || '').trim()

    if (chaveAtendimento && codProc) {
      const duplicados = contexto.producaoBpaCompetencia.filter((item) => {
        if (item.id === bpa.id) return false
        if (item.status === 'glosado') return false
        const chaveOutro = item.atendimento_pa || item.agendamento || ''
        const codOutro = (item.procedimento_codigo || '').trim()
        const compOutro = item.competencia || contexto.competenciaAtiva
        return (
          chaveOutro === chaveAtendimento && codOutro === codProc && compOutro === competenciaAlvo
        )
      })

      if (duplicados.length > 0) {
        duplicidadeDetectada = true
        advertencias.push({
          id: 'bpa_duplicidade_producao_detectada',
          campo: 'procedimento_codigo',
          nivel: 'advertencia',
          mensagem: `Duplicidade detectada: mesmo atendimento (${chaveAtendimento}) já produziu o procedimento ${codProc} na competência ${competenciaAlvo} (${duplicados.length} outro(s) registro(s)).`,
          fonteOficial: 'SIA/SUS — Portarias de Controle de Faturamento Ambulatorial',
          regraReferencia:
            'Produção duplicada é sinalizada para revisão administrativa sem bloqueio automático.',
        })
      }
    }
  }

  return {
    bpaId: bpa.id,
    procedimentoCodigo: bpa.procedimento_codigo,
    pacienteNome: bpa.expand?.paciente?.nome || 'Paciente',
    valida: erros.length === 0,
    erros,
    advertencias,
    totalErros: erros.length,
    totalAdvertencias: advertencias.length,
    duplicidadeDetectada,
  }
}

// ============================================================================
// CONFERÊNCIA CONSOLIDADA DA COMPETÊNCIA (PAINEL DE FATURAMENTO)
// ============================================================================

export function executarConferenciaConsistencia(params: {
  competencia: string
  contas: ContaFaturamento[]
  itensBpa: ProducaoBPAItem[]
  contexto: ContextoValidacaoFaturamento
}): ResumoConferenciaFaturamento {
  const { competencia, contas, itensBpa, contexto } = params

  const contasFiltradas = contas.filter(
    (c) => !c.competencia || c.competencia === competencia || c.competencia === 'todas',
  )
  const bpasFiltrados = itensBpa.filter(
    (b) => !b.competencia || b.competencia === competencia || b.competencia === 'todas',
  )

  const detalhesContas = contasFiltradas.map((c) => validarContaHospitalarAIH(c, contexto))
  const detalhesBpa = bpasFiltrados.map((b) =>
    validarItemProducaoBPA(b, {
      ...contexto,
      producaoBpaCompetencia: bpasFiltrados,
    }),
  )

  const contasAihValidas = detalhesContas.filter((d) => d.valida).length
  const contasAihComErros = detalhesContas.filter((d) => d.totalErros > 0).length
  const contasAihComAdvertencias = detalhesContas.filter((d) => d.totalAdvertencias > 0).length

  const itensBpaValidos = detalhesBpa.filter((d) => d.valida).length
  const itensBpaComErros = detalhesBpa.filter((d) => d.totalErros > 0).length
  const itensBpaComAdvertencias = detalhesBpa.filter((d) => d.totalAdvertencias > 0).length
  const itensBpaDuplicados = detalhesBpa.filter((d) => d.duplicidadeDetectada).length

  const competenciasImportadas = contexto.competenciasImportadasSigtap || []
  const competenciaSigtapImportada =
    competenciasImportadas.length === 0 || competenciasImportadas.includes(competencia)

  return {
    competencia,
    totalContasAihAvaliadas: detalhesContas.length,
    contasAihValidas,
    contasAihComErros,
    contasAihComAdvertencias,
    totalItensBpaAvaliados: detalhesBpa.length,
    itensBpaValidos,
    itensBpaComErros,
    itensBpaComAdvertencias,
    itensBpaDuplicados,
    detalhesContas,
    detalhesBpa,
    competenciaSigtapImportada,
  }
}
