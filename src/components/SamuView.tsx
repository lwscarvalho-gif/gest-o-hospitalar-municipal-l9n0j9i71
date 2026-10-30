import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PhoneCall,
  PlusCircle,
  RefreshCw,
  Printer,
  Eye,
  Truck,
  ShieldCheck,
  ArrowRightLeft,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  SamuOcorrencia,
  StatusFluxoSAMU,
  TipoOcorrenciaSAMU,
  TransporteVeiculo,
  Setor,
} from '@/types/hospital'
import { listarOcorrenciasSAMU } from '@/services/samu'
import { listarVeiculos } from '@/services/transporte'
import { listarSetores } from '@/services/cadastros'
import { formatarDataHoraFuso, obterFusoHorarioAtivo } from '@/services/dataFusoUnidade'
import { ModalAberturaOcorrencia } from './samu/ModalAberturaOcorrencia'
import { ModalAcoesOperacionaisSAMU, AcaoOperacionalTipo } from './samu/ModalAcoesOperacionaisSAMU'
import { ModalDetalhesOcorrenciaSAMU } from './samu/ModalDetalhesOcorrenciaSAMU'
import {
  RelatorioSanitizadoSamuA4,
  gerarSnapshotRelatorioSAMU,
  RelatorioAtendimentosSamuSnapshot,
} from './samu/RelatorioSanitizadoSamuA4'

export const SamuView: React.FC = () => {
  const { user } = useAuth()
  const seqRef = useRef<number>(0)
  const fusoAtivo = obterFusoHorarioAtivo()

  // Lista de ocorrências paginada
  const [ocorrencias, setOcorrencias] = useState<SamuOcorrencia[]>([])
  const [totalOcorrencias, setTotalOcorrencias] = useState(0)
  const [pagina, setPagina] = useState(1)
  const porPagina = 10
  const [carregando, setCarregando] = useState(false)
  const [erroListagem, setErroListagem] = useState<string | null>(null)

  // Filtros (Itens 414 a 417: Tipo, Período, Município, Unidade Móvel, Status)
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroMunicipio, setFiltroMunicipio] = useState<string>('')
  const [filtroUnidadeMovelId, setFiltroUnidadeMovelId] = useState<string>('todos')
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('')
  const [filtroDataFim, setFiltroDataFim] = useState<string>('')

  // Recursos de apoio
  const [veiculosFrota, setVeiculosFrota] = useState<TransporteVeiculo[]>([])
  const [setoresHospitalares, setSetoresHospitalares] = useState<Setor[]>([])

  // Modais
  const [modalAberturaAberto, setModalAberturaAberto] = useState(false)
  const [modalDetalheAberto, setModalDetalheAberto] = useState(false)
  const [ocorrenciaDetalheId, setOcorrenciaDetalheId] = useState<string | null>(null)

  const [modalAcaoAberto, setModalAcaoAberto] = useState(false)
  const [tipoAcao, setTipoAcao] = useState<AcaoOperacionalTipo>('transicao_status')
  const [ocorrenciaAcao, setOcorrenciaAcao] = useState<SamuOcorrencia | null>(null)

  // Modal / Visualização de Relatório Sanitizado A4
  const [visualizandoRelatorio, setVisualizandoRelatorio] = useState(false)
  const [snapshotRelatorio, setSnapshotRelatorio] =
    useState<RelatorioAtendimentosSamuSnapshot | null>(null)

  // Carregar frotas e setores de apoio
  useEffect(() => {
    let ativo = true
    const carregarApoio = async () => {
      try {
        const [veics, sets] = await Promise.all([
          listarVeiculos().catch(() => []),
          listarSetores().catch(() => []),
        ])
        if (ativo) {
          setVeiculosFrota(veics)
          setSetoresHospitalares(sets)
        }
      } catch (_err) {
        // Silencioso se não houver dados de apoio
      }
    }
    carregarApoio()
    return () => {
      ativo = false
    }
  }, [])

  // Carregar ocorrências com descarte de sessão antiga (seqRef)
  const carregarOcorrencias = useCallback(async () => {
    setCarregando(true)
    setErroListagem(null)
    const currentSeq = ++seqRef.current

    try {
      const resp = await listarOcorrenciasSAMU(
        {
          page: pagina,
          perPage: porPagina,
          status: filtroStatus !== 'todos' ? (filtroStatus as StatusFluxoSAMU) : undefined,
          tipo: filtroTipo !== 'todos' ? (filtroTipo as TipoOcorrenciaSAMU) : undefined,
          municipio: filtroMunicipio.trim() || undefined,
          unidade_movel_id: filtroUnidadeMovelId !== 'todos' ? filtroUnidadeMovelId : undefined,
          data_inicio: filtroDataInicio ? `${filtroDataInicio} 00:00:00` : undefined,
          data_fim: filtroDataFim ? `${filtroDataFim} 23:59:59` : undefined,
        },
        {
          seqMomento: currentSeq,
          seqReferencia: seqRef,
        },
      )

      setOcorrencias(resp.items)
      setTotalOcorrencias(resp.totalItems)
    } catch (err: unknown) {
      const erroAny = err as { name?: string; message?: string }
      if (erroAny?.name === 'RespostaSessaoObsoletaError') {
        // Resposta descartada legitimamente
        return
      }
      setErroListagem(erroAny?.message || 'Erro ao carregar lista de ocorrências do SAMU.')
    } finally {
      setCarregando(false)
    }
  }, [
    pagina,
    porPagina,
    filtroStatus,
    filtroTipo,
    filtroMunicipio,
    filtroUnidadeMovelId,
    filtroDataInicio,
    filtroDataFim,
  ])

  useEffect(() => {
    carregarOcorrencias()
  }, [carregarOcorrencias])

  // Gerar relatório operacional sanitizado A4 (Itens 414–417)
  const handleGerarRelatorioA4 = async () => {
    try {
      setCarregando(true)
      // Busca todas as ocorrências correspondentes aos filtros (sem limitar à página atual)
      const respCompleta = await listarOcorrenciasSAMU({
        page: 1,
        perPage: 100,
        status: filtroStatus !== 'todos' ? (filtroStatus as StatusFluxoSAMU) : undefined,
        tipo: filtroTipo !== 'todos' ? (filtroTipo as TipoOcorrenciaSAMU) : undefined,
        municipio: filtroMunicipio.trim() || undefined,
        unidade_movel_id: filtroUnidadeMovelId !== 'todos' ? filtroUnidadeMovelId : undefined,
        data_inicio: filtroDataInicio ? `${filtroDataInicio} 00:00:00` : undefined,
        data_fim: filtroDataFim ? `${filtroDataFim} 23:59:59` : undefined,
      })

      const veiculoSelecionado = veiculosFrota.find((v) => v.id === filtroUnidadeMovelId)

      const snap = gerarSnapshotRelatorioSAMU(
        respCompleta.items,
        {
          data_inicio: filtroDataInicio,
          data_fim: filtroDataFim,
          municipio: filtroMunicipio,
          tipo: filtroTipo,
          unidade_movel_id: filtroUnidadeMovelId !== 'todos' ? filtroUnidadeMovelId : undefined,
          unidade_movel_placa: veiculoSelecionado?.placa,
          status: filtroStatus,
        },
        {
          name: user?.name,
          role: user?.role,
        },
        fusoAtivo,
      )

      setSnapshotRelatorio(snap)
      setVisualizandoRelatorio(true)
    } catch (_err) {
      setErroListagem('Erro ao compilar dados para o relatório operacional.')
    } finally {
      setCarregando(false)
    }
  }

  // Abertura de ações
  const abrirAcao = (tipo: AcaoOperacionalTipo, item: SamuOcorrencia) => {
    setTipoAcao(tipo)
    setOcorrenciaAcao(item)
    setModalAcaoAberto(true)
  }

  // Badges auxiliares
  const obterBadgeRisco = (risco?: string) => {
    switch (risco) {
      case 'vermelho':
        return (
          <Badge className="bg-red-600 text-white hover:bg-red-700 text-[10px]">🔴 Vermelho</Badge>
        )
      case 'laranja':
        return (
          <Badge className="bg-orange-500 text-white hover:bg-orange-600 text-[10px]">
            🟠 Laranja
          </Badge>
        )
      case 'amarelo':
        return (
          <Badge className="bg-yellow-500 text-black hover:bg-yellow-600 text-[10px]">
            🟡 Amarelo
          </Badge>
        )
      case 'verde':
        return (
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px]">
            🟢 Verde
          </Badge>
        )
      case 'azul':
        return (
          <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-[10px]">🔵 Azul</Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            Não classificado
          </Badge>
        )
    }
  }

  const obterBadgeStatus = (status: StatusFluxoSAMU) => {
    switch (status) {
      case 'aberta':
        return (
          <Badge
            variant="outline"
            className="border-amber-500 text-amber-700 bg-amber-50 text-[10px]"
          >
            Aberta
          </Badge>
        )
      case 'em_deslocamento':
        return <Badge className="bg-blue-600 text-white text-[10px]">Deslocamento</Badge>
      case 'no_local':
        return <Badge className="bg-indigo-600 text-white text-[10px]">No Local</Badge>
      case 'em_transporte':
        return <Badge className="bg-purple-600 text-white text-[10px]">Em Transporte</Badge>
      case 'concluida':
        return <Badge className="bg-emerald-600 text-white text-[10px]">Concluída</Badge>
      case 'cancelada':
        return (
          <Badge variant="destructive" className="text-[10px]">
            Cancelada
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status}
          </Badge>
        )
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(totalOcorrencias / porPagina))

  return (
    <div className="space-y-6">
      {/* Visualização de Impresso A4 Sanitizado */}
      {visualizandoRelatorio && snapshotRelatorio ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-100 p-4 rounded-lg border border-slate-300 print:hidden">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Visualização de Impressão Sanitizada A4 (Itens 414–417)
              </h2>
              <p className="text-xs text-slate-600">
                Relatório gerado estritamente com dados operacionais e de frota, sem prontuário
                sigiloso nem GPS.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setVisualizandoRelatorio(false)}>
                Voltar à Lista
              </Button>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-900 text-white"
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Documento
              </Button>
            </div>
          </div>

          <RelatorioSanitizadoSamuA4 relatorio={snapshotRelatorio} />
        </div>
      ) : (
        <>
          {/* Cabeçalho da Visão Operacional SAMU */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-sm">
                  <PhoneCall className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    SAMU 192 (Módulo Básico)
                  </h1>
                  <p className="text-xs text-slate-500">
                    Regulação e despacho de urgências móveis municipais • Itens 407–417
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGerarRelatorioA4}
                className="text-xs"
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Relatório Sanitizado A4
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => carregarOcorrencias()}
                disabled={carregando}
                className="text-xs"
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>

              <Button
                size="sm"
                onClick={() => setModalAberturaAberto(true)}
                className="bg-red-700 hover:bg-red-800 text-white text-xs font-semibold shadow-sm"
              >
                <PlusCircle className="mr-1.5 h-4 w-4" />
                Novo Chamado 192
              </Button>
            </div>
          </div>

          {/* Filtros Operacionais Paginados (Itens 414 a 417) */}
          <Card>
            <CardHeader className="py-3 px-4 border-b border-slate-100">
              <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                Filtros Operacionais de Chamados e Despacho
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                {/* 1. Status */}
                <div className="space-y-1">
                  <Label htmlFor="filtro-status" className="text-[11px]">
                    Status
                  </Label>
                  <Select
                    value={filtroStatus}
                    onValueChange={(val) => {
                      setFiltroStatus(val)
                      setPagina(1)
                    }}
                  >
                    <SelectTrigger id="filtro-status" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      <SelectItem value="aberta">Aberta</SelectItem>
                      <SelectItem value="em_deslocamento">Em Deslocamento</SelectItem>
                      <SelectItem value="no_local">No Local</SelectItem>
                      <SelectItem value="em_transporte">Em Transporte</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Tipo de Ocorrência (414) */}
                <div className="space-y-1">
                  <Label htmlFor="filtro-tipo" className="text-[11px]">
                    Tipo (414)
                  </Label>
                  <Select
                    value={filtroTipo}
                    onValueChange={(val) => {
                      setFiltroTipo(val)
                      setPagina(1)
                    }}
                  >
                    <SelectTrigger id="filtro-tipo" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os tipos</SelectItem>
                      <SelectItem value="clinica">Clínico</SelectItem>
                      <SelectItem value="trauma">Trauma</SelectItem>
                      <SelectItem value="obstetrica">Obstétrico</SelectItem>
                      <SelectItem value="psiquiatrica">Psiquiátrico</SelectItem>
                      <SelectItem value="pediatrica">Pediátrico</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Município (416) */}
                <div className="space-y-1">
                  <Label htmlFor="filtro-municipio" className="text-[11px]">
                    Município (416)
                  </Label>
                  <Input
                    id="filtro-municipio"
                    placeholder="Filtrar cidade..."
                    value={filtroMunicipio}
                    onChange={(e) => {
                      setFiltroMunicipio(e.target.value)
                      setPagina(1)
                    }}
                    className="h-8 text-xs"
                  />
                </div>

                {/* 4. Unidade Móvel (417) */}
                <div className="space-y-1">
                  <Label htmlFor="filtro-veiculo" className="text-[11px]">
                    Viatura (417)
                  </Label>
                  <Select
                    value={filtroUnidadeMovelId}
                    onValueChange={(val) => {
                      setFiltroUnidadeMovelId(val)
                      setPagina(1)
                    }}
                  >
                    <SelectTrigger id="filtro-veiculo" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas as viaturas</SelectItem>
                      {veiculosFrota.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.placa} ({v.descricao})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 5. Período Início (415) */}
                <div className="space-y-1">
                  <Label htmlFor="filtro-data-ini" className="text-[11px]">
                    Data Início (415)
                  </Label>
                  <Input
                    id="filtro-data-ini"
                    type="date"
                    value={filtroDataInicio}
                    onChange={(e) => {
                      setFiltroDataInicio(e.target.value)
                      setPagina(1)
                    }}
                    className="h-8 text-xs"
                  />
                </div>

                {/* 6. Período Fim (415) */}
                <div className="space-y-1">
                  <Label htmlFor="filtro-data-fim" className="text-[11px]">
                    Data Fim (415)
                  </Label>
                  <Input
                    id="filtro-data-fim"
                    type="date"
                    value={filtroDataFim}
                    onChange={(e) => {
                      setFiltroDataFim(e.target.value)
                      setPagina(1)
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mensagem de Erro da Listagem */}
          {erroListagem && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-xs">
              {erroListagem}
            </div>
          )}

          {/* Tabela Paginada de Ocorrências SAMU */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase">
                    <th className="py-2.5 px-3">Nº Ocorrência</th>
                    <th className="py-2.5 px-3">Abertura (Local)</th>
                    <th className="py-2.5 px-3">Tipo / Motivo</th>
                    <th className="py-2.5 px-3">Vítima Informada</th>
                    <th className="py-2.5 px-3">Município / Local</th>
                    <th className="py-2.5 px-3">Risco</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Unidade Móvel</th>
                    <th className="py-2.5 px-3 text-right">Ações Operacionais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ocorrencias.length > 0 ? (
                    ocorrencias.map((oco) => {
                      return (
                        <tr key={oco.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {oco.numero_ocorrencia}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap text-[11px]">
                            {formatarDataHoraFuso(oco.data_hora_abertura, fusoAtivo)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                            <span className="font-semibold block uppercase text-[11px]">
                              {oco.tipo_ocorrencia}
                            </span>
                            <span
                              className="text-[11px] text-slate-500 max-w-[150px] truncate block"
                              title={oco.observacoes_iniciais}
                            >
                              {oco.observacoes_iniciais || 'Sem relato adicional'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                            {oco.vitima_desconhecida ? (
                              <span className="font-semibold text-amber-800 bg-amber-50 px-1 py-0.5 rounded text-[10px]">
                                Desconhecido
                              </span>
                            ) : (
                              <span
                                className="font-medium text-slate-900 block max-w-[140px] truncate"
                                title={oco.vitima_nome_informado}
                              >
                                {oco.vitima_nome_informado || 'Não informada'}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 block">
                              {oco.vitima_sexo_informado} •{' '}
                              {oco.vitima_idade_informada || 'Idade n/d'}
                            </span>
                            {oco.vitima_confirmada_humano && oco.vitima_paciente_id && (
                              <span className="text-[9px] text-emerald-700 font-bold block">
                                ✓ Vínculo Confirmado
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            <span className="font-semibold block">{oco.municipio}</span>
                            <span
                              className="text-[11px] text-slate-500 max-w-[140px] truncate block"
                              title={oco.endereco_textual}
                            >
                              {oco.endereco_textual}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {obterBadgeRisco(oco.classificacao_risco)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {obterBadgeStatus(oco.status_fluxo)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                            {oco.unidade_movel_placa ? (
                              <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                {oco.unidade_movel_placa}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Sem viatura</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1">
                            {/* Ação 1: Detalhes & Histórico */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="Visualizar Detalhes e Histórico Auditável"
                              onClick={() => {
                                setOcorrenciaDetalheId(oco.id)
                                setModalDetalheAberto(true)
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-600" />
                            </Button>

                            {/* Ação 2: Classificar Risco (Humano) */}
                            {oco.status_fluxo !== 'concluida' &&
                              oco.status_fluxo !== 'cancelada' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  title="Classificar Risco (Médico/Enfermeiro)"
                                  onClick={() => abrirAcao('classificar_risco', oco)}
                                >
                                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                                </Button>
                              )}

                            {/* Ação 3: Atribuir Unidade Móvel */}
                            {oco.status_fluxo !== 'concluida' &&
                              oco.status_fluxo !== 'cancelada' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  title="Atribuir Unidade Móvel"
                                  onClick={() => abrirAcao('atribuir_unidade', oco)}
                                >
                                  <Truck className="h-3.5 w-3.5 text-blue-600" />
                                </Button>
                              )}

                            {/* Ação 4: Transição de Status / Conclusão */}
                            {oco.status_fluxo !== 'concluida' &&
                              oco.status_fluxo !== 'cancelada' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  title="Transição Operacional de Status"
                                  onClick={() => abrirAcao('transicao_status', oco)}
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-600" />
                                </Button>
                              )}

                            {/* Ação 5: Vincular Paciente Cadastrado (Se não vinculado ainda) */}
                            {(!oco.vitima_paciente_id || !oco.vitima_confirmada_humano) &&
                              oco.status_fluxo !== 'cancelada' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  title="Confirmar Vínculo a Paciente Cadastrado"
                                  onClick={() => abrirAcao('vincular_paciente', oco)}
                                >
                                  <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                </Button>
                              )}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 italic">
                        {carregando
                          ? 'Carregando chamados do SAMU...'
                          : 'Nenhuma ocorrência encontrada para os filtros selecionados.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação da Tabela */}
            <div className="flex justify-between items-center px-4 py-3 border-t border-slate-100 text-xs text-slate-600">
              <div>
                Total de Ocorrências: <strong>{totalOcorrencias}</strong> • Página{' '}
                <strong>{pagina}</strong> de <strong>{totalPaginas}</strong>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina <= 1 || carregando}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  className="h-7 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina >= totalPaginas || carregando}
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  className="h-7 text-xs"
                >
                  Próxima
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Modal 1: Abertura de Ocorrência */}
      <ModalAberturaOcorrencia
        open={modalAberturaAberto}
        onClose={() => setModalAberturaAberto(false)}
        onSuccess={() => carregarOcorrencias()}
        setoresHospitalares={setoresHospitalares}
        seqRef={seqRef}
      />

      {/* Modal 2: Ações Operacionais */}
      <ModalAcoesOperacionaisSAMU
        open={modalAcaoAberto}
        onClose={() => {
          setModalAcaoAberto(false)
          setOcorrenciaAcao(null)
        }}
        onSuccess={() => carregarOcorrencias()}
        ocorrencia={ocorrenciaAcao}
        tipoAcao={tipoAcao}
        veiculosFrota={veiculosFrota}
        setoresHospitalares={setoresHospitalares}
        usuarioPerfil={user?.role}
        seqRef={seqRef}
      />

      {/* Modal 3: Detalhes e Histórico Imutável */}
      <ModalDetalhesOcorrenciaSAMU
        open={modalDetalheAberto}
        onClose={() => {
          setModalDetalheAberto(false)
          setOcorrenciaDetalheId(null)
        }}
        ocorrenciaId={ocorrenciaDetalheId}
        seqRef={seqRef}
      />
    </div>
  )
}
