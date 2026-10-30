import pb from '@/lib/pocketbase/client'
import { Vacina, RegistroImunizacao, DoseVacina } from '@/types/hospital'
import { registrarAuditoria } from './auditoria'

// ---------------------------------------------------------------------------
// CATÁLOGO DE VACINAS
// ---------------------------------------------------------------------------

export async function listarVacinas(filtroTexto?: string, apenasAtivas = false): Promise<Vacina[]> {
  try {
    const filterParts: string[] = []
    if (apenasAtivas) {
      filterParts.push('ativo = true')
    }
    if (filtroTexto && filtroTexto.trim()) {
      const q = filtroTexto.trim()
      filterParts.push(`(nome ~ "${q}" || fabricante ~ "${q}" || indicacao ~ "${q}")`)
    }
    const filter = filterParts.join(' && ')

    const records = await pb.collection('vacinas').getFullList<Vacina>({
      filter: filter || undefined,
      sort: 'nome',
    })
    return records
  } catch (error) {
    console.error('Erro ao listar vacinas:', error)
    return []
  }
}

export async function criarVacina(dados: Partial<Vacina>): Promise<Vacina> {
  const payload = {
    nome: dados.nome,
    fabricante: dados.fabricante || '',
    indicacao: dados.indicacao || '',
    via_administracao: dados.via_administracao || 'intramuscular',
    lote_padrao: dados.lote_padrao || '',
    validade_lote: dados.validade_lote || '',
    doses_previstas: Number(dados.doses_previstas || 1),
    estoque_doses: Number(dados.estoque_doses ?? 0),
    ativo: dados.ativo !== false,
    observacoes: dados.observacoes || '',
  }

  const record = await pb.collection('vacinas').create<Vacina>(payload)

  await registrarAuditoria({
    acao: 'CRIAR_VACINA',
    modulo: 'Imunização',
    detalhes: `Vacina cadastrada: ${record.nome} (Estoque inicial: ${record.estoque_doses} doses)`,
    registro_id: record.id,
  })

  return record
}

export async function atualizarVacina(id: string, dados: Partial<Vacina>): Promise<Vacina> {
  const record = await pb.collection('vacinas').update<Vacina>(id, dados)

  await registrarAuditoria({
    acao: 'EDITAR_VACINA',
    modulo: 'Imunização',
    detalhes: `Vacina atualizada: ${record.nome} - Estoque: ${record.estoque_doses} doses`,
    registro_id: record.id,
  })

  return record
}

// ---------------------------------------------------------------------------
// REGISTRO DE APLICAÇÃO DE VACINAS E BAIXA DE ESTOQUE
// ---------------------------------------------------------------------------

export interface RegistrarAplicacaoVacinaParams {
  pacienteId: string
  vacinaId: string
  dose: DoseVacina
  lote: string
  validadeLote?: string
  dataAplicacao: string // AAAA-MM-DD
  profissionalAplicadorId?: string
  aplicadorNome?: string
  localAplicacao?: string
  observacoes?: string
}

export async function registrarAplicacaoVacina(
  params: RegistrarAplicacaoVacinaParams,
): Promise<{ aplicacao: RegistroImunizacao; vacinaAtualizada: Vacina }> {
  const {
    pacienteId,
    vacinaId,
    dose,
    lote,
    validadeLote,
    dataAplicacao,
    profissionalAplicadorId,
    aplicadorNome,
    localAplicacao,
    observacoes,
  } = params

  // 1. Checar vacina e estoque
  const vacina = await pb.collection('vacinas').getOne<Vacina>(vacinaId)
  if (!vacina) {
    throw new Error('Vacina não encontrada no catálogo.')
  }

  const estoqueAtual = Number(vacina.estoque_doses || 0)
  if (estoqueAtual <= 0) {
    throw new Error(
      `Estoque zerado para a vacina "${vacina.nome}". Não é possível registrar aplicação sem doses disponíveis.`,
    )
  }

  const novoEstoque = estoqueAtual - 1

  // 2. Criar registro de aplicação
  const aplicacao = await pb.collection('imunizacao_registros').create<RegistroImunizacao>(
    {
      paciente: pacienteId,
      vacina: vacinaId,
      dose,
      lote: lote || vacina.lote_padrao || 'LOTE-PADRAO',
      validade_lote: validadeLote || vacina.validade_lote || '',
      data_aplicacao: dataAplicacao || new Date().toISOString().slice(0, 10),
      profissional_aplicador: profissionalAplicadorId || undefined,
      aplicador_nome: aplicadorNome || pb.authStore.model?.name || 'Vacinador Municipal',
      local_aplicacao: localAplicacao || 'Deltoide',
      observacoes: observacoes || '',
    },
    {
      expand: 'paciente,vacina,profissional_aplicador',
    },
  )

  // 3. Baixa de 1 dose no estoque da vacina
  const vacinaAtualizada = await pb.collection('vacinas').update<Vacina>(vacinaId, {
    estoque_doses: novoEstoque,
  })

  // 4. Trilha de auditoria
  await registrarAuditoria({
    acao: 'APLICACAO_VACINA',
    modulo: 'Imunização',
    detalhes: `Aplicação de ${vacina.nome} (${dose}) - Lote: ${lote || vacina.lote_padrao}. Estoque restante: ${novoEstoque} doses. Paciente ID: ${pacienteId}`,
    registro_id: aplicacao.id,
  })

  return { aplicacao, vacinaAtualizada }
}

export async function listarAplicacoesVacinas(filtros?: {
  pacienteId?: string
  vacinaId?: string
  dataInicio?: string
  dataFim?: string
}): Promise<RegistroImunizacao[]> {
  try {
    const filterParts: string[] = []

    if (filtros?.pacienteId) {
      filterParts.push(`paciente = "${filtros.pacienteId}"`)
    }
    if (filtros?.vacinaId) {
      filterParts.push(`vacina = "${filtros.vacinaId}"`)
    }
    if (filtros?.dataInicio) {
      filterParts.push(`data_aplicacao >= "${filtros.dataInicio}"`)
    }
    if (filtros?.dataFim) {
      filterParts.push(`data_aplicacao <= "${filtros.dataFim}"`)
    }

    const filter = filterParts.join(' && ')

    const records = await pb.collection('imunizacao_registros').getFullList<RegistroImunizacao>({
      filter: filter || undefined,
      sort: '-data_aplicacao',
      expand: 'paciente,vacina,profissional_aplicador',
    })
    return records
  } catch (error) {
    console.error('Erro ao listar registros de imunização:', error)
    return []
  }
}
