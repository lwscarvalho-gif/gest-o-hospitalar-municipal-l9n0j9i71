import pb from '@/lib/pocketbase/client'
import {
  ProcedimentoSigtap,
  CID10Item,
  ContaFaturamento,
  ItemContaFaturamento,
  ProducaoBPAItem,
  CompetenciaFaturamento,
} from '@/types/hospital'
import { registrarAuditoria } from './auditoria'

// ============================================================================
// 1. TABELA SIGTAP & CID-10
// ============================================================================

export async function listarProcedimentosSigtap(termo?: string): Promise<ProcedimentoSigtap[]> {
  let filter = ''
  if (termo && termo.trim()) {
    const t = termo.trim().replace(/"/g, '')
    filter = `codigo ~ "${t}" || nome ~ "${t}"`
  }

  const records = await pb.collection('procedimentos_sigtap').getFullList<ProcedimentoSigtap>({
    filter,
    sort: 'codigo',
  })
  return records
}

export async function buscarProcedimentoPorCodigo(
  codigo: string,
): Promise<ProcedimentoSigtap | null> {
  try {
    const record = await pb
      .collection('procedimentos_sigtap')
      .getFirstListItem<ProcedimentoSigtap>(`codigo = "${codigo.trim()}"`)
    return record
  } catch {
    return null
  }
}

export async function criarProcedimentoSigtap(dados: {
  codigo: string
  nome: string
  valor_sh: number
  valor_sa: number
  valor_sp: number
  complexidade?: 'basica' | 'media' | 'alta' | 'nao_se_aplica'
  modalidade?: 'ambulatorial' | 'hospitalar' | 'ambulatorial_e_hospitalar'
  instrumento_registro?: string
  ativo?: boolean
}): Promise<ProcedimentoSigtap> {
  const payload = {
    ...dados,
    ativo: dados.ativo ?? true,
  }

  const record = await pb.collection('procedimentos_sigtap').create<ProcedimentoSigtap>(payload)

  await registrarAuditoria({
    acao: 'CADASTRAR_PROCEDIMENTO_SIGTAP',
    modulo: 'Faturamento',
    detalhes: `Procedimento cadastrado: ${dados.codigo} - ${dados.nome}`,
    registro_id: record.id,
  })

  return record
}

/**
 * Importação em lote da tabela SIGTAP a partir de texto CSV.
 * Cabeçalho esperado (flexível com vírgula ou ponto-e-vírgula):
 * codigo;nome;valor_sh;valor_sa;valor_sp;complexidade;modalidade
 */
import {
  previsualizarSigtapCSV,
  PrevisualizacaoSIGTAPResultado,
  ItemSIGTAPValido,
} from './importacaoSigtap'

/**
 * Executa a gravação idempotente do lote de procedimentos SIGTAP previamente validado.
 *
 * Regras:
 * - Apenas itens validados entram no lote (itens rejeitados ficam no relatório de auditoria e não são salvos).
 * - Se a competência já tiver sido homologada/fechada, não sobrescreve.
 * - Idempotente: se o procedimento já existir com os mesmos atributos na competência ativa, não duplica.
 * - Contas hospitalares e BPA históricos nunca são recalculados automaticamente por esta importação.
 */
export async function executarGravacaoLoteSIGTAP(params: {
  itensValidos: ItemSIGTAPValido[]
  competencia: string
  usuarioNome: string
  usuarioRole?: string
}): Promise<{
  inseridos: number
  mantidosOuAtualizados: number
  erros: string[]
  competencia: string
}> {
  const { itensValidos, competencia, usuarioNome, usuarioRole } = params

  if (usuarioRole && usuarioRole !== 'admin' && usuarioRole !== 'gestor') {
    throw new Error(
      'Acesso negado: a importação e alteração do catálogo SIGTAP é restrita a Administradores e Gestores.',
    )
  }

  if (itensValidos.length === 0) {
    throw new Error('Nenhum item válido para gravar no lote.')
  }

  // Verificar status da competência informada
  try {
    const compExistente = await pb
      .collection('competencias_faturamento')
      .getFirstListItem<CompetenciaFaturamento>(`competencia = "${competencia}"`)
    if (compExistente && compExistente.status === 'fechada') {
      throw new Error(
        `A competência ${competencia} já está fechada e auditada. Não é permitido sobrescrever ou importar dados em competência fechada.`,
      )
    }
  } catch (err: any) {
    if (err.message?.includes('fechada')) throw err
    // Se não encontrou a competência, ela ainda será aberta oportunamente
  }

  let inseridos = 0
  let mantidosOuAtualizados = 0
  const erros: string[] = []

  for (const item of itensValidos) {
    try {
      const existente = await buscarProcedimentoPorCodigo(item.codigo)
      if (existente) {
        // Idempotência: verificar se houve alteração real antes de atualizar
        const precisaAtualizar =
          existente.nome !== item.nome ||
          Number(existente.valor_sh) !== item.valor_sh ||
          Number(existente.valor_sa) !== item.valor_sa ||
          Number(existente.valor_sp) !== item.valor_sp ||
          existente.modalidade !== item.modalidade ||
          existente.complexidade !== item.complexidade

        if (precisaAtualizar) {
          await pb.collection('procedimentos_sigtap').update(existente.id, {
            nome: item.nome,
            valor_sh: item.valor_sh,
            valor_sa: item.valor_sa,
            valor_sp: item.valor_sp,
            complexidade: item.complexidade,
            modalidade: item.modalidade,
            instrumento_registro: item.instrumento_registro,
            ativo: true,
          })
          mantidosOuAtualizados++
        } else {
          mantidosOuAtualizados++
        }
      } else {
        await pb.collection('procedimentos_sigtap').create({
          codigo: item.codigo,
          nome: item.nome,
          valor_sh: item.valor_sh,
          valor_sa: item.valor_sa,
          valor_sp: item.valor_sp,
          complexidade: item.complexidade,
          modalidade: item.modalidade,
          instrumento_registro: item.instrumento_registro,
          ativo: true,
        })
        inseridos++
      }
    } catch (err: any) {
      erros.push(`Procedimento ${item.codigo} (linha ${item.linha}): ${err.message}`)
    }
  }

  await registrarAuditoria({
    acao: 'IMPORTACAO_SIGTAP_LOTE_CONFIRMADA',
    modulo: 'Faturamento',
    detalhes: `Lote SIGTAP da competência ${competencia} gravado por ${usuarioNome}: ${inseridos} novos, ${mantidosOuAtualizados} mantidos/atualizados, ${erros.length} falhas. Contas históricas preservadas sem recálculo retroativo.`,
  })

  return {
    inseridos,
    mantidosOuAtualizados,
    erros,
    competencia,
  }
}

/**
 * Função de retrocompatibilidade para importação direta, utilizando a validação estrita.
 */
export async function importarTabelaSIGTAPCSV(
  conteudoCSV: string,
  competencia?: string,
): Promise<{
  totalLinhas: number
  importados: number
  atualizados: number
  erros: string[]
  competencia: string
  rejeicoesDetalhadas: PrevisualizacaoSIGTAPResultado['rejeicoes']
}> {
  const comp = competencia || calcularCompetenciaAtual()
  const preview = previsualizarSigtapCSV({ conteudoCSV, competencia: comp })

  const gravacao = await executarGravacaoLoteSIGTAP({
    itensValidos: preview.itensValidos,
    competencia: comp,
    usuarioNome: 'Importador Administrativo',
  })

  const errosFormatados = [
    ...preview.rejeicoes.map(
      (r) => `Linha ${r.linha} (${r.codigoBruto || 'sem código'}): [REJEITADO] ${r.motivo}`,
    ),
    ...gravacao.erros,
  ]

  return {
    totalLinhas: preview.totalLinhasArquivo,
    importados: gravacao.inseridos,
    atualizados: gravacao.mantidosOuAtualizados,
    erros: errosFormatados,
    competencia: comp,
    rejeicoesDetalhadas: preview.rejeicoes,
  }
}

// CID-10
export async function listarCID10(termo?: string): Promise<CID10Item[]> {
  let filter = ''
  if (termo && termo.trim()) {
    const t = termo.trim().replace(/"/g, '')
    filter = `codigo ~ "${t}" || descricao ~ "${t}"`
  }
  const records = await pb.collection('cid10').getFullList<CID10Item>({
    filter,
    sort: 'codigo',
  })
  return records
}

export async function criarCID10(dados: {
  codigo: string
  descricao: string
  capitulo?: string
}): Promise<CID10Item> {
  const record = await pb.collection('cid10').create<CID10Item>({
    ...dados,
    ativo: true,
  })
  await registrarAuditoria({
    acao: 'CADASTRAR_CID10',
    modulo: 'Faturamento',
    detalhes: `Novo CID-10 cadastrado: ${dados.codigo} - ${dados.descricao}`,
    registro_id: record.id,
  })
  return record
}

// ============================================================================
// 2. CONTAS HOSPITALARES (AIH SIMPLIFICADA) & ITENS
// ============================================================================

export function calcularCompetenciaAtual(): string {
  const d = new Date()
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

export async function listarContasFaturamento(filtros?: {
  competencia?: string
  status?: string
  pacienteId?: string
}): Promise<ContaFaturamento[]> {
  const conds: string[] = []
  if (filtros?.competencia && filtros.competencia !== 'todas') {
    conds.push(`competencia = "${filtros.competencia}"`)
  }
  if (filtros?.status && filtros.status !== 'todos') {
    conds.push(`status = "${filtros.status}"`)
  }
  if (filtros?.pacienteId) {
    conds.push(`paciente = "${filtros.pacienteId}"`)
  }

  const records = await pb.collection('contas_faturamento').getFullList<ContaFaturamento>({
    filter: conds.join(' && '),
    sort: '-created',
    expand: 'paciente,internacao,profissional_solicitante',
  })
  return records
}

export async function obterContaComItens(contaId: string): Promise<{
  conta: ContaFaturamento
  itens: ItemContaFaturamento[]
}> {
  const conta = await pb.collection('contas_faturamento').getOne<ContaFaturamento>(contaId, {
    expand: 'paciente,internacao,profissional_solicitante',
  })
  const itens = await pb.collection('itens_conta').getFullList<ItemContaFaturamento>({
    filter: `conta = "${contaId}"`,
    sort: 'created',
  })
  return { conta, itens }
}

export async function criarContaHospitalar(params: {
  paciente: string
  internacao?: string
  profissional_solicitante?: string
  profissional_nome?: string
  data_internacao: string
  data_alta?: string
  carater_atendimento?: string
  motivo_saida_alta?: string
  cid_principal?: string
  cid_secundario?: string
  procedimento_principal_codigo: string
  procedimento_principal_nome: string
  competencia?: string
  observacoes?: string
}): Promise<ContaFaturamento> {
  const procSigtap = await buscarProcedimentoPorCodigo(params.procedimento_principal_codigo)
  const sh = procSigtap?.valor_sh || 0
  const sa = procSigtap?.valor_sa || 0
  const sp = procSigtap?.valor_sp || 0
  const total = Math.round((sh + sa + sp) * 100) / 100

  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const comp = params.competencia || calcularCompetenciaAtual()
  const compLimpa = comp.replace('-', '')
  const numero_conta = `AIH-${compLimpa}-${randomSuffix}`

  const payload = {
    numero_conta,
    numero_aih: numero_conta,
    paciente: params.paciente,
    internacao: params.internacao || '',
    profissional_solicitante: params.profissional_solicitante || '',
    profissional_nome: params.profissional_nome || '',
    data_internacao: params.data_internacao,
    data_alta: params.data_alta || '',
    carater_atendimento: params.carater_atendimento || 'Urgência',
    motivo_saida_alta: params.motivo_saida_alta || 'Alta médica / Melhora',
    cid_principal: params.cid_principal || '',
    cid_secundario: params.cid_secundario || '',
    procedimento_principal_codigo: params.procedimento_principal_codigo,
    procedimento_principal_nome: params.procedimento_principal_nome,
    competencia: comp,
    status: 'aberta' as const,
    valor_sh: sh,
    valor_sa: sa,
    valor_sp: sp,
    valor_total: total,
    observacoes: params.observacoes || '',
  }

  const record = await pb.collection('contas_faturamento').create<ContaFaturamento>(payload, {
    expand: 'paciente,internacao,profissional_solicitante',
  })

  await registrarAuditoria({
    acao: 'GERAR_CONTA_HOSPITALAR',
    modulo: 'Faturamento',
    detalhes: `Conta hospitalar gerada: ${numero_conta} | Procedimento: ${params.procedimento_principal_codigo} (${params.procedimento_principal_nome}) | Total R$ ${total.toFixed(2)}`,
    registro_id: record.id,
  })

  return record
}

export async function recalcularTotaisConta(contaId: string): Promise<ContaFaturamento> {
  const { conta, itens } = await obterContaComItens(contaId)

  const procPrincipal = await buscarProcedimentoPorCodigo(conta.procedimento_principal_codigo)
  let sh = procPrincipal?.valor_sh || 0
  let sa = procPrincipal?.valor_sa || 0
  let sp = procPrincipal?.valor_sp || 0

  itens.forEach((it) => {
    const qtd = it.quantidade || 1
    sh += (it.valor_unitario_sh || 0) * qtd
    sa += (it.valor_unitario_sa || 0) * qtd
    sp += (it.valor_unitario_sp || 0) * qtd
  })

  sh = Math.round(sh * 100) / 100
  sa = Math.round(sa * 100) / 100
  sp = Math.round(sp * 100) / 100
  const valor_total = Math.round((sh + sa + sp) * 100) / 100

  const updated = await pb.collection('contas_faturamento').update<ContaFaturamento>(
    contaId,
    {
      valor_sh: sh,
      valor_sa: sa,
      valor_sp: sp,
      valor_total,
    },
    {
      expand: 'paciente,internacao,profissional_solicitante',
    },
  )

  return updated
}

export async function adicionarItemConta(params: {
  conta: string
  tipo: 'procedimento_secundario' | 'diaria' | 'material' | 'sessao' | 'exame'
  procedimento_codigo: string
  procedimento_nome: string
  quantidade: number
  data_execucao?: string
  profissional_executante?: string
  observacoes?: string
}): Promise<ItemContaFaturamento> {
  const sigtap = await buscarProcedimentoPorCodigo(params.procedimento_codigo)
  if (!sigtap) {
    throw new Error(
      `Procedimento com código "${params.procedimento_codigo}" não foi localizado na tabela SIGTAP importada.`,
    )
  }

  const sh = sigtap.valor_sh || 0
  const sa = sigtap.valor_sa || 0
  const sp = sigtap.valor_sp || 0
  const valor_total_item = Math.round((sh + sa + sp) * params.quantidade * 100) / 100

  const payload = {
    conta: params.conta,
    tipo: params.tipo,
    procedimento_codigo: sigtap.codigo,
    procedimento_nome: sigtap.nome,
    quantidade: params.quantidade,
    valor_unitario_sh: sh,
    valor_unitario_sa: sa,
    valor_unitario_sp: sp,
    valor_total_item,
    data_execucao: params.data_execucao || new Date().toLocaleDateString('pt-BR'),
    profissional_executante: params.profissional_executante || '',
    observacoes: params.observacoes || '',
  }

  const record = await pb.collection('itens_conta').create<ItemContaFaturamento>(payload)

  await recalcularTotaisConta(params.conta)

  await registrarAuditoria({
    acao: 'ADICIONAR_ITEM_CONTA',
    modulo: 'Faturamento',
    detalhes: `Item adicionado na conta ${params.conta}: ${params.quantidade}x ${sigtap.codigo} - ${sigtap.nome}`,
    registro_id: record.id,
  })

  return record
}

export async function removerItemConta(itemId: string, contaId: string): Promise<void> {
  await pb.collection('itens_conta').delete(itemId)
  await recalcularTotaisConta(contaId)

  await registrarAuditoria({
    acao: 'REMOVER_ITEM_CONTA',
    modulo: 'Faturamento',
    detalhes: `Item ${itemId} removido da conta ${contaId}`,
    registro_id: contaId,
  })
}

export async function alterarStatusConta(params: {
  contaId: string
  novoStatus: 'aberta' | 'conciliada' | 'glosada' | 'enviada'
  motivoGlosa?: string
  responsavelNome: string
}): Promise<ContaFaturamento> {
  const agora = new Date().toLocaleString('pt-BR')
  const payload: any = {
    status: params.novoStatus,
  }

  if (params.novoStatus === 'glosada') {
    payload.motivo_glosa = params.motivoGlosa || 'Glosa administrativa registrada'
    payload.data_glosa = agora
    payload.responsavel_glosa = params.responsavelNome
  } else if (params.novoStatus === 'aberta') {
    payload.observacoes = `Reaberta por ${params.responsavelNome} em ${agora}`
  }

  const updated = await pb
    .collection('contas_faturamento')
    .update<ContaFaturamento>(params.contaId, payload, {
      expand: 'paciente,internacao,profissional_solicitante',
    })

  await registrarAuditoria({
    acao:
      params.novoStatus === 'glosada'
        ? 'GLOSAR_CONTA'
        : params.novoStatus === 'aberta'
          ? 'REABRIR_CONTA'
          : 'ALTERAR_STATUS_CONTA',
    modulo: 'Faturamento',
    detalhes: `Conta ${updated.numero_conta} alterada para status "${params.novoStatus}" por ${params.responsavelNome}${params.motivoGlosa ? ` | Motivo da glosa: ${params.motivoGlosa}` : ''}`,
    registro_id: params.contaId,
  })

  return updated
}

export async function atualizarContaHospitalar(
  contaId: string,
  dados: {
    procedimento_principal_codigo?: string
    procedimento_principal_nome?: string
    cid_principal?: string
    cid_secundario?: string
    carater_atendimento?: string
    competencia?: string
    observacoes?: string
    numero_aih?: string
  },
): Promise<ContaFaturamento> {
  const payload: any = { ...dados }

  if (dados.procedimento_principal_codigo) {
    const sigtap = await buscarProcedimentoPorCodigo(dados.procedimento_principal_codigo)
    if (!sigtap) {
      throw new Error(
        `Procedimento ${dados.procedimento_principal_codigo} não encontrado no SIGTAP.`,
      )
    }
    payload.procedimento_principal_codigo = sigtap.codigo
    payload.procedimento_principal_nome = sigtap.nome
  }

  await pb.collection('contas_faturamento').update(contaId, payload)
  const atualizada = await recalcularTotaisConta(contaId)

  await registrarAuditoria({
    acao: 'EDITAR_CONTA_HOSPITALAR',
    modulo: 'Faturamento',
    detalhes: `Conta ${atualizada.numero_conta} atualizada`,
    registro_id: contaId,
  })

  return atualizada
}

// ============================================================================
// 3. PRODUÇÃO AMBULATORIAL (BPA SIMPLIFICADO)
// ============================================================================

export async function listarProducaoBPA(filtros?: {
  competencia?: string
  status?: string
  pacienteId?: string
}): Promise<ProducaoBPAItem[]> {
  const conds: string[] = []
  if (filtros?.competencia && filtros.competencia !== 'todas') {
    conds.push(`competencia = "${filtros.competencia}"`)
  }
  if (filtros?.status && filtros.status !== 'todos') {
    conds.push(`status = "${filtros.status}"`)
  }
  if (filtros?.pacienteId) {
    conds.push(`paciente = "${filtros.pacienteId}"`)
  }

  const records = await pb.collection('producao_bpa').getFullList<ProducaoBPAItem>({
    filter: conds.join(' && '),
    sort: '-created',
    expand: 'paciente,profissional,atendimento_pa,agendamento',
  })
  return records
}

export async function criarItemProducaoBPA(params: {
  paciente: string
  profissional?: string
  profissional_nome?: string
  origem_atendimento: 'pronto_atendimento' | 'ambulatorio_agendamento' | 'avulso'
  atendimento_pa?: string
  agendamento?: string
  procedimento_codigo: string
  procedimento_nome?: string
  quantidade?: number
  data_atendimento?: string
  competencia?: string
  cid10?: string
  observacoes?: string
}): Promise<ProducaoBPAItem> {
  const qtd = params.quantidade || 1
  const sigtap = await buscarProcedimentoPorCodigo(params.procedimento_codigo)
  const nomeFinal = params.procedimento_nome || sigtap?.nome || 'Atendimento de Saúde SUS'
  const valorUnitario = sigtap?.valor_sa || 0
  const valorTotal = Math.round(valorUnitario * qtd * 100) / 100

  const comp = params.competencia || calcularCompetenciaAtual()
  const dataAtend = params.data_atendimento || new Date().toLocaleDateString('pt-BR')

  const payload = {
    paciente: params.paciente,
    profissional: params.profissional || '',
    profissional_nome: params.profissional_nome || '',
    origem_atendimento: params.origem_atendimento,
    atendimento_pa: params.atendimento_pa || '',
    agendamento: params.agendamento || '',
    procedimento_codigo: params.procedimento_codigo,
    procedimento_nome: nomeFinal,
    quantidade: qtd,
    data_atendimento: dataAtend,
    competencia: comp,
    cid10: params.cid10 || '',
    valor_unitario_sa: valorUnitario,
    valor_total: valorTotal,
    status: 'apurado' as const,
    observacoes: params.observacoes || '',
  }

  const record = await pb.collection('producao_bpa').create<ProducaoBPAItem>(payload, {
    expand: 'paciente,profissional,atendimento_pa,agendamento',
  })

  await registrarAuditoria({
    acao: 'REGISTRAR_PRODUCAO_BPA',
    modulo: 'Faturamento',
    detalhes: `Item BPA gerado: ${params.procedimento_codigo} (${nomeFinal}) | Qtd: ${qtd} | Origem: ${params.origem_atendimento}`,
    registro_id: record.id,
  })

  return record
}

export async function glosarItemBPA(
  bpaId: string,
  motivoGlosa: string,
  usuarioNome: string,
): Promise<ProducaoBPAItem> {
  const updated = await pb.collection('producao_bpa').update<ProducaoBPAItem>(
    bpaId,
    {
      status: 'glosado',
      motivo_glosa: motivoGlosa,
      observacoes: `Glosado por ${usuarioNome}: ${motivoGlosa}`,
    },
    {
      expand: 'paciente,profissional',
    },
  )

  await registrarAuditoria({
    acao: 'GLOSAR_ITEM_BPA',
    modulo: 'Faturamento',
    detalhes: `Item BPA ${bpaId} glosado por ${usuarioNome}: ${motivoGlosa}`,
    registro_id: bpaId,
  })

  return updated
}

export async function reabrirItemBPA(bpaId: string, usuarioNome: string): Promise<ProducaoBPAItem> {
  const updated = await pb.collection('producao_bpa').update<ProducaoBPAItem>(
    bpaId,
    {
      status: 'apurado',
      motivo_glosa: '',
      observacoes: `Reaberto por ${usuarioNome}`,
    },
    {
      expand: 'paciente,profissional',
    },
  )

  await registrarAuditoria({
    acao: 'REABRIR_ITEM_BPA',
    modulo: 'Faturamento',
    detalhes: `Item BPA ${bpaId} reaberto por ${usuarioNome}`,
    registro_id: bpaId,
  })

  return updated
}

// ============================================================================
// 4. FECHAMENTO DE COMPETÊNCIA & RELATÓRIO DE PRODUÇÃO CSV
// ============================================================================

export async function listarCompetencias(): Promise<CompetenciaFaturamento[]> {
  const records = await pb
    .collection('competencias_faturamento')
    .getFullList<CompetenciaFaturamento>({
      sort: '-competencia',
    })
  return records
}

export async function obterOuCriarCompetencia(
  competencia: string,
): Promise<CompetenciaFaturamento> {
  try {
    const existing = await pb
      .collection('competencias_faturamento')
      .getFirstListItem<CompetenciaFaturamento>(`competencia = "${competencia}"`)
    return existing
  } catch {
    const [anoStr, mesStr] = competencia.split('-')
    const ano = parseInt(anoStr, 10) || new Date().getFullYear()
    const mes = parseInt(mesStr, 10) || new Date().getMonth() + 1

    const created = await pb.collection('competencias_faturamento').create<CompetenciaFaturamento>({
      competencia,
      ano,
      mes,
      status: 'aberta',
      observacoes: `Competência ${competencia} aberta`,
    })
    return created
  }
}

export interface TotaisCompetencia {
  competencia: string
  totalContasAIH: number
  totalItensBPA: number
  valorTotalSH: number
  valorTotalSA: number
  valorTotalSP: number
  valorTotalGeral: number
  producaoPorProcedimento: Array<{
    codigo: string
    nome: string
    instrumento: 'AIH' | 'BPA'
    quantidade: number
    valorSH: number
    valorSA: number
    valorSP: number
    valorTotal: number
  }>
}

export async function consolidarProducaoCompetencia(
  competencia: string,
): Promise<TotaisCompetencia> {
  const [contas, bpas] = await Promise.all([
    listarContasFaturamento({ competencia }),
    listarProducaoBPA({ competencia }),
  ])

  const contasValidas = contas.filter((c) => c.status !== 'glosada')
  const bpasValidos = bpas.filter((b) => b.status !== 'glosado')

  let valorTotalSH = 0
  let valorTotalSA = 0
  let valorTotalSP = 0

  const mapaProc = new Map<
    string,
    {
      codigo: string
      nome: string
      instrumento: 'AIH' | 'BPA'
      quantidade: number
      valorSH: number
      valorSA: number
      valorSP: number
      valorTotal: number
    }
  >()

  contasValidas.forEach((c) => {
    valorTotalSH += c.valor_sh || 0
    valorTotalSA += c.valor_sa || 0
    valorTotalSP += c.valor_sp || 0

    const chave = `AIH-${c.procedimento_principal_codigo}`
    const atual = mapaProc.get(chave) || {
      codigo: c.procedimento_principal_codigo,
      nome: c.procedimento_principal_nome,
      instrumento: 'AIH',
      quantidade: 0,
      valorSH: 0,
      valorSA: 0,
      valorSP: 0,
      valorTotal: 0,
    }

    atual.quantidade += 1
    atual.valorSH += c.valor_sh || 0
    atual.valorSA += c.valor_sa || 0
    atual.valorSP += c.valor_sp || 0
    atual.valorTotal += c.valor_total || 0
    mapaProc.set(chave, atual)
  })

  bpasValidos.forEach((b) => {
    valorTotalSA += b.valor_total || 0

    const chave = `BPA-${b.procedimento_codigo}`
    const atual = mapaProc.get(chave) || {
      codigo: b.procedimento_codigo,
      nome: b.procedimento_nome,
      instrumento: 'BPA',
      quantidade: 0,
      valorSH: 0,
      valorSA: 0,
      valorSP: 0,
      valorTotal: 0,
    }

    atual.quantidade += b.quantidade || 1
    atual.valorSA += b.valor_total || 0
    atual.valorTotal += b.valor_total || 0
    mapaProc.set(chave, atual)
  })

  valorTotalSH = Math.round(valorTotalSH * 100) / 100
  valorTotalSA = Math.round(valorTotalSA * 100) / 100
  valorTotalSP = Math.round(valorTotalSP * 100) / 100
  const valorTotalGeral = Math.round((valorTotalSH + valorTotalSA + valorTotalSP) * 100) / 100

  const producaoPorProcedimento = Array.from(mapaProc.values()).sort(
    (a, b) => b.valorTotal - a.valorTotal,
  )

  return {
    competencia,
    totalContasAIH: contasValidas.length,
    totalItensBPA: bpasValidos.length,
    valorTotalSH,
    valorTotalSA,
    valorTotalSP,
    valorTotalGeral,
    producaoPorProcedimento,
  }
}

export async function fecharCompetencia(
  competencia: string,
  usuarioNome: string,
): Promise<CompetenciaFaturamento> {
  const totais = await consolidarProducaoCompetencia(competencia)
  const regComp = await obterOuCriarCompetencia(competencia)
  const agora = new Date().toLocaleString('pt-BR')

  const updated = await pb
    .collection('competencias_faturamento')
    .update<CompetenciaFaturamento>(regComp.id, {
      status: 'fechada',
      data_fechamento: agora,
      fechado_por: usuarioNome,
      total_contas_aih: totais.totalContasAIH,
      total_itens_bpa: totais.totalItensBPA,
      valor_total_sh: totais.valorTotalSH,
      valor_total_sa: totais.valorTotalSA,
      valor_total_sp: totais.valorTotalSP,
      valor_total_geral: totais.valorTotalGeral,
      observacoes: `Competência fechada e apurada em ${agora} por ${usuarioNome}.`,
    })

  await registrarAuditoria({
    acao: 'FECHAMENTO_COMPETENCIA',
    modulo: 'Faturamento',
    detalhes: `Competência ${competencia} fechada. AIH: ${totais.totalContasAIH} contas (R$ ${totais.valorTotalSH + totais.valorTotalSP}), BPA: ${totais.totalItensBPA} itens (R$ ${totais.valorTotalSA}) | Total Geral R$ ${totais.valorTotalGeral.toFixed(2)}`,
    registro_id: regComp.id,
  })

  return updated
}

export async function reabrirCompetencia(
  competencia: string,
  usuarioNome: string,
): Promise<CompetenciaFaturamento> {
  const regComp = await obterOuCriarCompetencia(competencia)
  const agora = new Date().toLocaleString('pt-BR')

  const updated = await pb
    .collection('competencias_faturamento')
    .update<CompetenciaFaturamento>(regComp.id, {
      status: 'aberta',
      observacoes: `Competência reaberta por ${usuarioNome} em ${agora}.`,
    })

  await registrarAuditoria({
    acao: 'REABRIR_COMPETENCIA',
    modulo: 'Faturamento',
    detalhes: `Competência ${competencia} reaberta por ${usuarioNome}`,
    registro_id: regComp.id,
  })

  return updated
}

export function exportarRelatorioProducaoCSV(totais: TotaisCompetencia): void {
  const cabecalho = [
    'Competencia',
    'Instrumento',
    'Codigo_SIGTAP',
    'Nome_Procedimento',
    'Quantidade',
    'Valor_SH_RS',
    'Valor_SA_RS',
    'Valor_SP_RS',
    'Valor_Total_RS',
  ]

  const linhas: string[] = []
  linhas.push(cabecalho.join(';'))

  totais.producaoPorProcedimento.forEach((item) => {
    const formatarMoeda = (v: number) => v.toFixed(2).replace('.', ',')
    const linha = [
      totais.competencia,
      item.instrumento,
      `="${item.codigo}"`,
      `"${item.nome.replace(/"/g, '""')}"`,
      String(item.quantidade),
      formatarMoeda(item.valorSH),
      formatarMoeda(item.valorSA),
      formatarMoeda(item.valorSP),
      formatarMoeda(item.valorTotal),
    ]
    linhas.push(linha.join(';'))
  })

  linhas.push('')
  linhas.push(
    [
      'TOTAL GERAL',
      '',
      '',
      `"Total Procedimentos (${totais.producaoPorProcedimento.length})"`,
      String(totais.totalContasAIH + totais.totalItensBPA),
      totais.valorTotalSH.toFixed(2).replace('.', ','),
      totais.valorTotalSA.toFixed(2).replace('.', ','),
      totais.valorTotalSP.toFixed(2).replace('.', ','),
      totais.valorTotalGeral.toFixed(2).replace('.', ','),
    ].join(';'),
  )

  const csvContent = '\uFEFF' + linhas.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio_producao_sus_${totais.competencia.replace('-', '_')}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
