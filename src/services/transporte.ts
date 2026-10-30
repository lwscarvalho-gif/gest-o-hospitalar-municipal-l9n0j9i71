/**
 * Serviço de Transporte Sanitário Interno (Backend & Cliente)
 * Referência: ANEXO I - DOC-02 Seção 7.4.4.2.a-b (pp. 27-29) e Cotação / Modelo Base
 *
 * Escopo:
 * 1. Cadastros de veículos (tipo, placa, lotação, combustível, extintor, status),
 *    motoristas (CNH categoria/vencimento), rotas e destinos.
 * 2. Lançamento e controle de viagens programadas com verificação de agenda e integridade.
 * 3. Cálculo de KM seguro: rejeita negativo, trata ausente como ausente (nunca zero).
 * 4. Vínculo de pacientes e acompanhantes com VAGAS SEPARADAS e explícitas (ida/volta).
 * 5. Reserva atômica de vagas idempotente (POST /backend/v1/transporte/reservar-vagas).
 * 6. Cancelamento e inativação auditados (sem exclusão física).
 * 7. Conversão de fuso da unidade na apresentação e persistência em UTC.
 */

import pb from '@/lib/pocketbase/client'
import {
  TransporteTipoVeiculo,
  TransporteVeiculo,
  TransporteRota,
  TransporteDestino,
  TransporteMotorista,
  TransporteViagem,
  TransportePassageiro,
  CriarVeiculoParams,
  CriarMotoristaParams,
  CriarRotaParams,
  CriarDestinoParams,
  CriarViagemParams,
  RegistrarRetornoViagemKmParams,
  ReservarVagasParams,
  ResultadoReservaVagas,
  CancelarViagemParams,
  CancelarPassageiroParams,
} from '@/types/hospital'
import { registrarAuditoria } from './auditoria'
import { formatarDataHoraFuso, parseDataHoraSegura, obterFusoHorarioAtivo } from './dataFusoUnidade'

export function converterParaIsoUtcSeguro(dataEntrada?: string | number | Date | null): string {
  const d = parseDataHoraSegura(dataEntrada)
  return d ? d.toISOString() : new Date().toISOString()
}

// ----------------------------------------------------------------------------
// Regra 1: Cálculo e Validação de Quilometragem
// ----------------------------------------------------------------------------
export interface CalculoKmResultado {
  km_inicial: number | null
  km_final: number | null
  km_rodado: number | null
  valido: boolean
  erro?: string
}

/**
 * Validação rigorosa de quilometragem:
 * - Rejeita números negativos.
 * - Rejeita km_final menor que km_inicial.
 * - Trata ausente como null/ausente (NUNCA substitui ausente por 0).
 */
export function calcularKmViagem(
  kmInicial?: number | null | string,
  kmFinal?: number | null | string,
): CalculoKmResultado {
  const ini =
    kmInicial !== undefined && kmInicial !== null && kmInicial !== '' ? Number(kmInicial) : null
  const fim = kmFinal !== undefined && kmFinal !== null && kmFinal !== '' ? Number(kmFinal) : null

  if (ini !== null && (isNaN(ini) || ini < 0)) {
    return {
      km_inicial: null,
      km_final: fim,
      km_rodado: null,
      valido: false,
      erro: 'Km inicial não pode ser negativo ou inválido.',
    }
  }

  if (fim !== null && (isNaN(fim) || fim < 0)) {
    return {
      km_inicial: ini,
      km_final: null,
      km_rodado: null,
      valido: false,
      erro: 'Km final não pode ser negativo ou inválido.',
    }
  }

  if (ini !== null && fim !== null) {
    if (fim < ini) {
      return {
        km_inicial: ini,
        km_final: fim,
        km_rodado: null,
        valido: false,
        erro: `Km final (${fim}) não pode ser menor que o Km inicial (${ini}).`,
      }
    }
    return {
      km_inicial: ini,
      km_final: fim,
      km_rodado: fim - ini,
      valido: true,
    }
  }

  // Se qualquer um dos dois estiver ausente, km_rodado permanece ausente (null)
  return {
    km_inicial: ini,
    km_final: fim,
    km_rodado: null,
    valido: true,
  }
}

// ----------------------------------------------------------------------------
// Regra 2: Validação de Lotação por Trecho (Ida / Volta separadas)
// ----------------------------------------------------------------------------
export interface OcupacaoTrechoViagem {
  capacidade_veiculo: number
  ocupadas_ida: number
  ocupadas_volta: number
  disponiveis_ida: number
  disponiveis_volta: number
  esgotado_ida: boolean
  esgotado_volta: boolean
}

export function apurarOcupacaoViagem(
  capacidadeLotacao: number,
  passageiros: Array<{ vagas_ida?: number; vagas_volta?: number; status?: string }>,
): OcupacaoTrechoViagem {
  const cap = Math.max(0, capacidadeLotacao || 0)
  let ocupIda = 0
  let ocupVolta = 0

  for (const p of passageiros) {
    if (p.status !== 'cancelado') {
      ocupIda += Number(p.vagas_ida || 0)
      ocupVolta += Number(p.vagas_volta || 0)
    }
  }

  const dispIda = Math.max(0, cap - ocupIda)
  const dispVolta = Math.max(0, cap - ocupVolta)

  return {
    capacidade_veiculo: cap,
    ocupadas_ida: ocupIda,
    ocupadas_volta: ocupVolta,
    disponiveis_ida: dispIda,
    disponiveis_volta: dispVolta,
    esgotado_ida: dispIda === 0,
    esgotado_volta: dispVolta === 0,
  }
}

// ----------------------------------------------------------------------------
// Regra 3: Formatação Amigável no Fuso Horário da Unidade (America/Porto_Velho)
// ----------------------------------------------------------------------------
export function formatarDataHoraViagemFuso(dataIsoUtc?: string | null): string {
  if (!dataIsoUtc) return 'Indisponível'
  return formatarDataHoraFuso(dataIsoUtc)
}

// ----------------------------------------------------------------------------
// Cadastros Básicos: Tipos de Veículos, Veículos, Motoristas, Rotas e Destinos
// ----------------------------------------------------------------------------

export async function listarTiposVeiculos(): Promise<TransporteTipoVeiculo[]> {
  try {
    const records = await pb
      .collection('transporte_tipos_veiculo')
      .getFullList<TransporteTipoVeiculo>({
        filter: 'ativo = true',
        sort: 'nome',
      })
    return records
  } catch (err) {
    console.warn('Erro ao listar tipos de veículos:', err)
    return []
  }
}

export async function listarVeiculos(apenasAtivos = true): Promise<TransporteVeiculo[]> {
  try {
    const filter = apenasAtivos ? 'ativo = true' : ''
    const records = await pb.collection('transporte_veiculos').getFullList<TransporteVeiculo>({
      filter,
      sort: 'descricao',
      expand: 'tipo',
    })
    return records
  } catch (err) {
    console.warn('Erro ao listar veículos:', err)
    return []
  }
}

export async function cadastrarVeiculo(params: CriarVeiculoParams): Promise<TransporteVeiculo> {
  const record = await pb.collection('transporte_veiculos').create<TransporteVeiculo>({
    descricao: params.descricao.trim(),
    tipo: params.tipo || null,
    placa: params.placa.trim().toUpperCase(),
    marca: params.marca?.trim() || '',
    numero_chassi: params.numero_chassi?.trim() || '',
    ano: params.ano || null,
    capacidade_lotacao: params.capacidade_lotacao,
    tipo_combustivel: params.tipo_combustivel || null,
    data_validade_extintor: params.data_validade_extintor || '',
    status: params.status,
    motivo_indisponibilidade: params.motivo_indisponibilidade || '',
    ativo: params.ativo !== false,
    observacoes: params.observacoes || '',
  })

  await registrarAuditoria({
    acao: 'cadastrar_veiculo',
    modulo: 'transporte_sanitario',
    detalhes: `Veículo cadastrado: Placa ${record.placa}, Lotação ${record.capacidade_lotacao}`,
    registro_id: record.id,
  })

  return record
}

export async function inativarVeiculo(
  veiculoId: string,
  motivo: string,
): Promise<TransporteVeiculo> {
  const record = await pb.collection('transporte_veiculos').update<TransporteVeiculo>(veiculoId, {
    status: 'inativo',
    ativo: false,
    motivo_indisponibilidade: motivo,
  })

  await registrarAuditoria({
    acao: 'inativar_veiculo',
    modulo: 'transporte_sanitario',
    detalhes: `Veículo inativado (ID: ${veiculoId}). Motivo: ${motivo}`,
    registro_id: veiculoId,
  })

  return record
}

export async function inativarMotorista(
  motoristaId: string,
  motivo?: string,
): Promise<TransporteMotorista> {
  const record = await pb
    .collection('transporte_motoristas')
    .update<TransporteMotorista>(motoristaId, {
      ativo: false,
      observacoes: motivo || 'Inativação operacional',
    })

  await registrarAuditoria({
    acao: 'inativar_motorista',
    modulo: 'transporte_sanitario',
    detalhes: `Motorista inativado (ID: ${motoristaId}). Motivo: ${motivo || 'Operacional'}`,
    registro_id: motoristaId,
  })

  return record
}

export async function listarMotoristas(apenasAtivos = true): Promise<TransporteMotorista[]> {
  try {
    const filter = apenasAtivos ? 'ativo = true' : ''
    const records = await pb.collection('transporte_motoristas').getFullList<TransporteMotorista>({
      filter,
      sort: 'nome',
    })
    return records
  } catch (err) {
    console.warn('Erro ao listar motoristas:', err)
    return []
  }
}

export async function cadastrarMotorista(
  params: CriarMotoristaParams,
): Promise<TransporteMotorista> {
  const record = await pb.collection('transporte_motoristas').create<TransporteMotorista>({
    nome: params.nome.trim(),
    cpf: params.cpf.trim(),
    telefone: params.telefone?.trim() || '',
    endereco: params.endereco?.trim() || '',
    cep: params.cep?.trim() || '',
    municipio: params.municipio?.trim() || '',
    complemento: params.complemento?.trim() || '',
    tipo_veiculo_habilitado: params.tipo_veiculo_habilitado?.trim() || '',
    cnh_numero: params.cnh_numero.trim(),
    cnh_categoria: params.cnh_categoria.trim().toUpperCase(),
    cnh_vencimento: params.cnh_vencimento.trim(),
    ativo: params.ativo !== false,
    observacoes: params.observacoes || '',
  })

  await registrarAuditoria({
    acao: 'cadastrar_motorista',
    modulo: 'transporte_sanitario',
    detalhes: `Motorista cadastrado: ${record.nome}, CNH ${record.cnh_categoria} venc. ${record.cnh_vencimento}`,
    registro_id: record.id,
  })

  return record
}

export async function listarRotas(apenasAtivas = true): Promise<TransporteRota[]> {
  try {
    const filter = apenasAtivas ? 'ativo = true' : ''
    const records = await pb.collection('transporte_rotas').getFullList<TransporteRota>({
      filter,
      sort: 'descricao',
    })
    return records
  } catch (err) {
    console.warn('Erro ao listar rotas:', err)
    return []
  }
}

export async function cadastrarRota(params: CriarRotaParams): Promise<TransporteRota> {
  const record = await pb.collection('transporte_rotas').create<TransporteRota>({
    descricao: params.descricao.trim(),
    municipio_saida: params.municipio_saida.trim(),
    distancia_estimada_km: params.distancia_estimada_km || null,
    ativo: params.ativo !== false,
    observacoes: params.observacoes || '',
  })
  return record
}

export async function listarDestinos(apenasAtivos = true): Promise<TransporteDestino[]> {
  try {
    const filter = apenasAtivos ? 'ativo = true' : ''
    const records = await pb.collection('transporte_destinos').getFullList<TransporteDestino>({
      filter,
      sort: 'nome',
    })
    return records
  } catch (err) {
    console.warn('Erro ao listar destinos:', err)
    return []
  }
}

export async function cadastrarDestino(params: CriarDestinoParams): Promise<TransporteDestino> {
  const record = await pb.collection('transporte_destinos').create<TransporteDestino>({
    nome: params.nome.trim(),
    municipio_localizacao: params.municipio_localizacao.trim(),
    telefone: params.telefone?.trim() || '',
    endereco: params.endereco?.trim() || '',
    ativo: params.ativo !== false,
  })
  return record
}

// ----------------------------------------------------------------------------
// Gestão de Viagens Sanitárias
// ----------------------------------------------------------------------------

export interface ResultadoPaginadoViagens {
  items: TransporteViagem[]
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

export async function listarViagensPaginado(filtros?: {
  status?: string
  dataInicio?: string
  dataFim?: string
  veiculoId?: string
  motoristaId?: string
  busca?: string
  pagina?: number
  porPagina?: number
}): Promise<ResultadoPaginadoViagens> {
  try {
    const condicoes: string[] = []

    if (filtros?.status && filtros.status !== 'todos') {
      condicoes.push(`status = "${filtros.status}"`)
    }
    if (filtros?.veiculoId && filtros.veiculoId !== 'todos') {
      condicoes.push(`veiculo = "${filtros.veiculoId}"`)
    }
    if (filtros?.motoristaId && filtros.motoristaId !== 'todos') {
      condicoes.push(`motorista = "${filtros.motoristaId}"`)
    }
    if (filtros?.dataInicio) {
      condicoes.push(`data_saida >= "${filtros.dataInicio}"`)
    }
    if (filtros?.dataFim) {
      condicoes.push(`data_saida <= "${filtros.dataFim} 23:59:59"`)
    }
    if (filtros?.busca && filtros.busca.trim().length > 0) {
      const b = filtros.busca.trim().replace(/["\\]/g, '')
      condicoes.push(
        `(codigo_viagem ~ "${b}" || cidade_destino ~ "${b}" || local_destino ~ "${b}")`,
      )
    }

    const filter = condicoes.length > 0 ? condicoes.join(' && ') : ''
    const page = Math.max(1, filtros?.pagina || 1)
    const perPage = Math.min(50, Math.max(1, filtros?.porPagina || 10))

    const res = await pb.collection('transporte_viagens').getList<TransporteViagem>(page, perPage, {
      filter,
      sort: '-data_saida',
      expand: 'motorista,veiculo,rota,destino,usuario_autor_id,cancelado_por_id',
    })

    return {
      items: res.items,
      page: res.page,
      perPage: res.perPage,
      totalItems: res.totalItems,
      totalPages: res.totalPages,
    }
  } catch (err) {
    console.warn('Erro ao listar viagens paginadas:', err)
    return {
      items: [],
      page: 1,
      perPage: 10,
      totalItems: 0,
      totalPages: 1,
    }
  }
}

export async function listarViagens(filtros?: {
  status?: string
  dataInicio?: string
  dataFim?: string
  veiculoId?: string
  motoristaId?: string
}): Promise<TransporteViagem[]> {
  try {
    const condicoes: string[] = []

    if (filtros?.status && filtros.status !== 'todos') {
      condicoes.push(`status = "${filtros.status}"`)
    }
    if (filtros?.veiculoId) {
      condicoes.push(`veiculo = "${filtros.veiculoId}"`)
    }
    if (filtros?.motoristaId) {
      condicoes.push(`motorista = "${filtros.motoristaId}"`)
    }
    if (filtros?.dataInicio) {
      condicoes.push(`data_saida >= "${filtros.dataInicio}"`)
    }
    if (filtros?.dataFim) {
      condicoes.push(`data_saida <= "${filtros.dataFim} 23:59:59"`)
    }

    const filter = condicoes.join(' && ')

    const records = await pb.collection('transporte_viagens').getFullList<TransporteViagem>({
      filter,
      sort: '-data_saida',
      expand: 'motorista,veiculo,rota,destino,usuario_autor_id,cancelado_por_id',
    })

    return records
  } catch (err) {
    console.warn('Erro ao listar viagens:', err)
    return []
  }
}

export async function obterViagemPorId(id: string): Promise<TransporteViagem | null> {
  try {
    const record = await pb.collection('transporte_viagens').getOne<TransporteViagem>(id, {
      expand: 'motorista,veiculo,rota,destino,usuario_autor_id,cancelado_por_id',
    })
    return record
  } catch (err) {
    console.warn(`Erro ao obter viagem ${id}:`, err)
    return null
  }
}

export async function programarViagem(params: CriarViagemParams): Promise<TransporteViagem> {
  // Converte datas de entrada para ISO UTC seguro
  const dataSaidaUtc = converterParaIsoUtcSeguro(params.data_saida)
  const dataRetornoPrevistoUtc = converterParaIsoUtcSeguro(params.data_retorno_previsto)

  // Validação de Km preliminar
  const calculoKm = calcularKmViagem(params.km_inicial, params.km_final)
  if (!calculoKm.valido) {
    throw new Error(calculoKm.erro || 'Quilometragem inválida.')
  }

  const record = await pb.collection('transporte_viagens').create<TransporteViagem>({
    codigo_viagem: params.codigo_viagem.trim().toUpperCase(),
    data_saida: dataSaidaUtc,
    data_retorno_previsto: dataRetornoPrevistoUtc,
    tipo_viagem: params.tipo_viagem,
    status: 'programada',
    motorista: params.motorista,
    veiculo: params.veiculo,
    rota: params.rota || null,
    destino: params.destino || null,
    cidade_destino: params.cidade_destino.trim(),
    local_destino: params.local_destino?.trim() || '',
    auxiliar_nome: params.auxiliar_nome?.trim() || '',
    km_inicial: calculoKm.km_inicial,
    km_final: calculoKm.km_final,
    km_rodado: calculoKm.km_rodado,
    empresa_terceirizada: params.empresa_terceirizada?.trim() || '',
    dotacao_orcamentaria: params.dotacao_orcamentaria?.trim() || '',
    recurso_financeiro: params.recurso_financeiro?.trim() || '',
    observacoes: params.observacoes || '',
  })

  await registrarAuditoria({
    acao: 'programar_viagem',
    modulo: 'transporte_sanitario',
    detalhes: `Viagem ${record.codigo_viagem} programada para ${record.cidade_destino}. Saída: ${record.data_saida}`,
    registro_id: record.id,
  })

  return record
}

export async function registrarRetornoViagemKm(
  params: RegistrarRetornoViagemKmParams,
): Promise<TransporteViagem> {
  const viagem = await pb
    .collection('transporte_viagens')
    .getOne<TransporteViagem>(params.viagem_id)

  const calculoKm = calcularKmViagem(viagem.km_inicial, params.km_final)
  if (!calculoKm.valido) {
    throw new Error(calculoKm.erro || 'Quilometragem inválida ao registrar retorno.')
  }

  const dataRetornoRealUtc = params.data_retorno_real
    ? converterParaIsoUtcSeguro(params.data_retorno_real)
    : new Date().toISOString()

  const payload: Partial<TransporteViagem> = {
    km_final: calculoKm.km_final,
    km_rodado: calculoKm.km_rodado,
    data_retorno_real: dataRetornoRealUtc,
    status: 'concluida',
  }

  if (params.observacoes) {
    payload.observacoes = (viagem.observacoes ? viagem.observacoes + '\n' : '') + params.observacoes
  }

  const record = await pb
    .collection('transporte_viagens')
    .update<TransporteViagem>(params.viagem_id, payload)

  await registrarAuditoria({
    acao: 'concluir_viagem_km',
    modulo: 'transporte_sanitario',
    detalhes: `Viagem ${record.codigo_viagem} concluída. Km final: ${calculoKm.km_final}, Km rodado: ${calculoKm.km_rodado}`,
    registro_id: record.id,
  })

  return record
}

export async function finalizarViagem(params: {
  viagemId: string
  km_final: number
  data_retorno_real?: string
  observacoes?: string
}): Promise<TransporteViagem> {
  return registrarRetornoViagemKm({
    viagem_id: params.viagemId,
    km_final: params.km_final,
    data_retorno_real: params.data_retorno_real,
    observacoes: params.observacoes,
  })
}

export async function cancelarViagem(params: CancelarViagemParams): Promise<TransporteViagem> {
  if (!params.motivo_cancelamento || params.motivo_cancelamento.trim().length < 5) {
    throw new Error(
      'O cancelamento da viagem exige justificativa formal com no mínimo 5 caracteres.',
    )
  }

  const record = await pb
    .collection('transporte_viagens')
    .update<TransporteViagem>(params.viagem_id, {
      status: 'cancelada',
      motivo_cancelamento: params.motivo_cancelamento.trim(),
      data_cancelamento: new Date().toISOString(),
    })

  await registrarAuditoria({
    acao: 'cancelar_viagem',
    modulo: 'transporte_sanitario',
    detalhes: `Viagem ${record.codigo_viagem} cancelada. Motivo: ${params.motivo_cancelamento}`,
    registro_id: record.id,
  })

  return record
}

// ----------------------------------------------------------------------------
// Gestão de Passageiros e Reserva Atômica de Vagas
// ----------------------------------------------------------------------------

export interface ResultadoPaginadoPassageiros {
  items: TransportePassageiro[]
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

export async function listarPassageirosViagemPaginado(
  viagemId: string,
  pagina = 1,
  porPagina = 10,
  apenasAtivos = false,
): Promise<ResultadoPaginadoPassageiros> {
  try {
    const condicoes = [`viagem = "${viagemId}"`]
    if (apenasAtivos) {
      condicoes.push('status != "cancelado"')
    }
    const filter = condicoes.join(' && ')
    const page = Math.max(1, pagina)
    const perPage = Math.min(50, Math.max(1, porPagina))

    const res = await pb
      .collection('transporte_passageiros')
      .getList<TransportePassageiro>(page, perPage, {
        filter,
        sort: 'created',
        expand: 'paciente,paciente_vinculado,usuario_autor_id,cancelado_por_id',
      })

    return {
      items: res.items,
      page: res.page,
      perPage: res.perPage,
      totalItems: res.totalItems,
      totalPages: res.totalPages,
    }
  } catch (err) {
    console.warn(`Erro ao listar passageiros paginados da viagem ${viagemId}:`, err)
    return {
      items: [],
      page: 1,
      perPage: 10,
      totalItems: 0,
      totalPages: 1,
    }
  }
}

export async function listarPassageirosViagem(viagemId: string): Promise<TransportePassageiro[]> {
  try {
    const records = await pb
      .collection('transporte_passageiros')
      .getFullList<TransportePassageiro>({
        filter: `viagem = "${viagemId}"`,
        sort: 'created',
        expand: 'paciente,paciente_vinculado,usuario_autor_id',
      })
    return records
  } catch (err) {
    console.warn(`Erro ao listar passageiros da viagem ${viagemId}:`, err)
    return []
  }
}

/**
 * Reserva atômica de vagas no servidor com idempotência:
 * - Chama o endpoint dedicado POST /backend/v1/transporte/reservar-vagas
 * - Vagas de acompanhantes contadas individualmente e explicitamente (grupo não consome vaga invisível)
 * - Garante transação atômica e bloqueio contra sobrecapacidade no trecho de ida e de volta
 */
export async function reservarVagasComIdempotencia(
  params: ReservarVagasParams,
): Promise<ResultadoReservaVagas> {
  return reservarVagasTransacional(params)
}

export async function reservarVagasTransacional(
  params: ReservarVagasParams,
): Promise<ResultadoReservaVagas> {
  try {
    const resposta = await pb.send<ResultadoReservaVagas>('/backend/v1/transporte/reservar-vagas', {
      method: 'POST',
      body: {
        viagem_id: params.viagem_id,
        paciente_id: params.paciente_id || null,
        nome_completo: params.nome_completo || '',
        documento_tipo: params.documento_tipo || '',
        documento_numero: params.documento_numero || '',
        telefone: params.telefone || '',
        tipo_passageiro: params.tipo_passageiro || 'paciente',
        trecho: params.trecho,
        acompanhantes: params.acompanhantes || [],
        local_embarque: params.local_embarque || '',
        local_desembarque: params.local_desembarque || '',
        idempotency_key: params.idempotency_key || null,
      },
    })

    await registrarAuditoria({
      acao: 'reservar_vagas_transporte',
      modulo: 'transporte_sanitario',
      detalhes: `Vagas reservadas para viagem ${params.viagem_id}. Trecho: ${params.trecho}. Acompanhantes: ${params.acompanhantes?.length || 0}`,
      registro_id: params.viagem_id,
    })

    return resposta
  } catch (err: any) {
    const msg = err?.data?.erro || err?.message || 'Falha ao reservar vagas no transporte.'
    throw new Error(msg)
  }
}

export async function cancelarPassageiro(
  params: CancelarPassageiroParams,
): Promise<TransportePassageiro> {
  if (!params.motivo_cancelamento || params.motivo_cancelamento.trim().length < 5) {
    throw new Error('O cancelamento da reserva exige justificativa com no mínimo 5 caracteres.')
  }

  const record = await pb
    .collection('transporte_passageiros')
    .update<TransportePassageiro>(params.passageiro_id, {
      status: 'cancelado',
      motivo_cancelamento: params.motivo_cancelamento.trim(),
      data_cancelamento: new Date().toISOString(),
      vagas_ida: 0,
      vagas_volta: 0,
    })

  await registrarAuditoria({
    acao: 'cancelar_reserva_passageiro',
    modulo: 'transporte_sanitario',
    detalhes: `Reserva de vaga do passageiro ${record.nome_completo} cancelada. Motivo: ${params.motivo_cancelamento}`,
    registro_id: record.id,
  })

  return record
}
