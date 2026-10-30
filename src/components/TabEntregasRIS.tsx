import React, { useState, useEffect, useRef, useCallback } from 'react'
import { RisEntregaLaudo, ItemFilaRIS, ListarEntregasLaudoFiltros } from '@/types/hospital'
import { listarEntregasLaudo } from '@/services/ris'
import { formatarDataHoraFuso, obterFusoHorarioAtivo } from '@/services/dataFusoUnidade'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  FileCheck,
  Search,
  Filter,
  RefreshCw,
  Printer,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Eye,
} from 'lucide-react'
import {
  ReciboSanitizadoEntregaA4,
  criarSnapshotReciboEntrega,
  ReciboEntregaRISSnapshot,
} from '@/components/ReciboSanitizadoEntregaA4'
import { ModalEntregaLaudoRIS } from '@/components/ModalEntregaLaudoRIS'

interface TabEntregasRISProps {
  examesFila: ItemFilaRIS[]
  onAbrirEntregaExame: (exame: ItemFilaRIS) => void
  onAtualizarFilaGeral: () => void
}

export const TabEntregasRIS: React.FC<TabEntregasRISProps> = ({
  examesFila,
  onAbrirEntregaExame,
  onAtualizarFilaGeral,
}) => {
  // Sub-visão interna: 'pendentes' vs 'entregues'
  const [visao, setVisao] = useState<'pendentes' | 'entregues'>('pendentes')

  // Entregas registradas (Histórico imutável de comprovantes administrativos)
  const [entregas, setEntregas] = useState<RisEntregaLaudo[]>([])
  const [carregandoEntregas, setCarregandoEntregas] = useState(false)
  const [erroEntregas, setErroEntregas] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [totalItens, setTotalItens] = useState(0)

  // Filtros de entregas
  const [filtroBusca, setFiltroBusca] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')

  // Descarte de resposta antiga em voo (SeqRef)
  const seqEntregasRef = useRef(0)

  // Recibo para visualização/reimpressão
  const [reciboVisualizacao, setReciboVisualizacao] = useState<ReciboEntregaRISSnapshot | null>(
    null,
  )
  const [modalReciboAberto, setModalReciboAberto] = useState(false)

  // Modal para retificação de recibo de entrega existente
  const [entregaParaRetificar, setEntregaParaRetificar] = useState<RisEntregaLaudo | null>(null)
  const [exameParaRetificar, setExameParaRetificar] = useState<ItemFilaRIS | null>(null)
  const [modalRetificarAberto, setModalRetificarAberto] = useState(false)

  // Carregar entregas da API PocketBase
  const carregarEntregas = useCallback(async () => {
    const seq = ++seqEntregasRef.current
    setCarregandoEntregas(true)
    setErroEntregas(null)

    try {
      const filtros: ListarEntregasLaudoFiltros = {
        page: pagina,
        perPage: 15,
      }
      if (filtroBusca.trim()) filtros.busca = filtroBusca.trim()
      if (filtroDataInicio) filtros.data_inicio = filtroDataInicio
      if (filtroDataFim) filtros.data_fim = filtroDataFim

      const res = await listarEntregasLaudo(filtros, seqEntregasRef, seq)

      if (seq !== seqEntregasRef.current) return

      setEntregas(res.items || [])
      setTotalPaginas(res.totalPages || 1)
      setTotalItens(res.totalItems || 0)
    } catch (err: unknown) {
      if (seq !== seqEntregasRef.current) return
      const msg = err instanceof Error ? err.message : 'Falha ao consultar histórico de entregas.'
      setErroEntregas(msg)
    } finally {
      if (seq === seqEntregasRef.current) {
        setCarregandoEntregas(false)
      }
    }
  }, [pagina, filtroBusca, filtroDataInicio, filtroDataFim])

  useEffect(() => {
    if (visao === 'entregues') {
      carregarEntregas()
    }
  }, [visao, carregarEntregas])

  // Lista de pendentes de entrega calculada a partir dos exames laudados/liberados
  // Exames cujo status é 'laudado' (ou status_exame_legado 'liberado')
  const examesLiberados = examesFila.filter(
    (ex) => ex.status_ris === 'laudado' || ex.status_exame_legado === 'liberado',
  )

  // Filtro de pendentes na UI
  const [buscaPendentes, setBuscaPendentes] = useState('')
  const [filtroModalidadePendentes, setFiltroModalidadePendentes] = useState<string>('todos')

  const pendentesFiltrados = examesLiberados.filter((ex) => {
    if (filtroModalidadePendentes !== 'todos' && ex.modalidade_ris !== filtroModalidadePendentes) {
      return false
    }
    if (buscaPendentes.trim()) {
      const q = buscaPendentes.trim().toLowerCase()
      const matchPac = ex.paciente_nome?.toLowerCase().includes(q)
      const matchEx = ex.tipo_exame?.toLowerCase().includes(q)
      const matchDoc = ex.paciente_cpf_mascarado?.toLowerCase().includes(q)
      return matchPac || matchEx || matchDoc
    }
    return true
  })

  // Visualizar snapshot de comprovante
  const handleVisualizarRecibo = (ent: RisEntregaLaudo) => {
    const snap = criarSnapshotReciboEntrega(ent)
    setReciboVisualizacao(snap)
    setModalReciboAberto(true)
  }

  // Iniciar retificação de recibo existente
  const handleIniciarRetificacaoRecibo = (ent: RisEntregaLaudo) => {
    // Procura o item correspondente na fila para compor o contexto
    const correspondente =
      examesFila.find((ex) => ex.id === ent.exame_ref) ||
      ({
        id: ent.exame_ref,
        paciente_id: ent.paciente_ref,
        paciente_nome: ent.paciente_nome || 'Paciente Titular',
        paciente_cpf_mascarado: ent.paciente_cpf_mascarado,
        tipo_exame: ent.exame_tipo || 'Exame de Imagem',
        modalidade_ris: (ent.exame_modalidade as any) || 'rx',
        versao_atual: ent.versao_entregue || 1,
        status_ris: 'laudado',
      } as ItemFilaRIS)

    setEntregaParaRetificar(ent)
    setExameParaRetificar(correspondente)
    setModalRetificarAberto(true)
  }

  const fusoAtivo = obterFusoHorarioAtivo()

  return (
    <div className="space-y-4">
      {/* 1. SELETOR DE SUB-VISÃO (PENDENTES VS ENTREGUES) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={visao === 'pendentes' ? 'default' : 'outline'}
            onClick={() => setVisao('pendentes')}
            className={`text-xs h-8 ${
              visao === 'pendentes'
                ? 'bg-sky-700 hover:bg-sky-600 text-white'
                : 'text-slate-700 border-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Laudos Liberados Pendentes de Entrega ({examesLiberados.length})
          </Button>

          <Button
            size="sm"
            variant={visao === 'entregues' ? 'default' : 'outline'}
            onClick={() => setVisao('entregues')}
            className={`text-xs h-8 ${
              visao === 'entregues'
                ? 'bg-sky-700 hover:bg-sky-600 text-white'
                : 'text-slate-700 border-slate-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Comprovantes e Recibos Emitidos ({totalItens || entregas.length})
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-300">
            <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
            Fuso Operacional: {fusoAtivo}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={visao === 'pendentes' ? onAtualizarFilaGeral : carregarEntregas}
            disabled={carregandoEntregas}
            className="text-xs h-8 text-slate-700 border-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${carregandoEntregas ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VISÃO 1: PENDENTES DE ENTREGA (LAUDOS JÁ LIBERADOS) */}
      {/* ==================================================================== */}
      {visao === 'pendentes' && (
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-sky-700" />
                Laudos Radiológicos Concluídos e Liberados Aguardando Entrega
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Exames com laudo assinado no prontuário prontos para entrega presencial com
                conferência documental obrigatória.
              </p>
            </div>

            {/* Filtros rápidos de pendentes */}
            <div className="flex items-center gap-2">
              <Select
                value={filtroModalidadePendentes}
                onValueChange={setFiltroModalidadePendentes}
              >
                <SelectTrigger className="text-xs h-8 w-32 bg-white">
                  <SelectValue placeholder="Modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Modalidades</SelectItem>
                  <SelectItem value="rx">Raio-X (RX)</SelectItem>
                  <SelectItem value="tc">Tomografia (TC)</SelectItem>
                  <SelectItem value="us">Ultrassom (USG)</SelectItem>
                  <SelectItem value="ecg">ECG</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <Input
                  placeholder="Filtrar paciente ou exame..."
                  value={buscaPendentes}
                  onChange={(e) => setBuscaPendentes(e.target.value)}
                  className="text-xs h-8 pl-8"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {pendentesFiltrados.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs space-y-1">
                <p className="font-semibold text-slate-700">
                  Nenhum laudo liberado pendente de entrega encontrado.
                </p>
                <p className="text-slate-400">
                  Novos exames laudados pelo médico assistente no PEP aparecerão nesta lista.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Data / Hora</th>
                      <th className="p-3">Paciente (LGPD)</th>
                      <th className="p-3">Exame / Procedimento</th>
                      <th className="p-3">Versão Vigente</th>
                      <th className="p-3">Solicitante</th>
                      <th className="p-3 text-right">Ação de Entrega</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendentesFiltrados.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 whitespace-nowrap text-slate-600 font-mono">
                          {item.data_solicitacao || item.created?.slice(0, 16).replace('T', ' ')}
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-slate-900">{item.paciente_nome}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {item.paciente_cpf_mascarado
                              ? `CPF: ${item.paciente_cpf_mascarado}`
                              : 'CPF: [Mascarado]'}
                            {item.paciente_cns_mascarado &&
                              ` • CNS: ${item.paciente_cns_mascarado}`}
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{item.tipo_exame}</div>
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase text-sky-800 border-sky-300 mt-0.5"
                          >
                            {item.modalidade_ris}
                          </Badge>
                        </td>

                        <td className="p-3 font-mono">
                          <span className="bg-emerald-100 text-emerald-950 font-bold px-2 py-0.5 rounded border border-emerald-300">
                            v{item.versao_atual || 1}
                          </span>
                        </td>

                        <td className="p-3 text-slate-600">
                          {item.solicitante_nome || 'Médico Assistente'}
                        </td>

                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            onClick={() => onAbrirEntregaExame(item)}
                            className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs h-7 px-3 font-semibold shadow-sm"
                          >
                            <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                            Registrar Entrega
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* VISÃO 2: RECIBOS E COMPROVANTES EMITIDOS (HISTÓRICO FORMAL) */}
      {/* ==================================================================== */}
      {visao === 'entregues' && (
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Histórico de Comprovantes Formais Emitidos (Apenas Metadados Administrativos)
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registro imutável de entregas com datas no fuso da unidade e identificação do
                  recebedor. Sigilo preservado (sem corpo do laudo).
                </p>
              </div>
              <span className="text-xs text-slate-500">
                Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong> ({totalItens}{' '}
                registros)
              </span>
            </div>

            {/* Barra de Filtros de Histórico */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> Filtros:
              </span>

              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <Input
                  placeholder="Protocolo, recebedor ou documento..."
                  value={filtroBusca}
                  onChange={(e) => {
                    setFiltroBusca(e.target.value)
                    setPagina(1)
                  }}
                  className="text-xs h-8 pl-8"
                />
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-600">
                <span>Período:</span>
                <Input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => {
                    setFiltroDataInicio(e.target.value)
                    setPagina(1)
                  }}
                  className="text-xs h-8 w-32"
                />
                <span>até</span>
                <Input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => {
                    setFiltroDataFim(e.target.value)
                    setPagina(1)
                  }}
                  className="text-xs h-8 w-32"
                />
              </div>

              {(filtroBusca || filtroDataInicio || filtroDataFim) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFiltroBusca('')
                    setFiltroDataInicio('')
                    setFiltroDataFim('')
                    setPagina(1)
                  }}
                  className="text-xs h-8 text-red-600"
                >
                  Limpar
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {carregandoEntregas ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-sky-700" />
                <span>Carregando comprovantes de entrega...</span>
              </div>
            ) : erroEntregas ? (
              <div className="py-12 px-4 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-800">{erroEntregas}</p>
                <Button variant="outline" size="sm" onClick={carregarEntregas}>
                  Tentar Novamente
                </Button>
              </div>
            ) : entregas.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                Nenhum comprovante de entrega registrado para os filtros informados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Protocolo</th>
                      <th className="p-3">Data / Hora Local ({fusoAtivo})</th>
                      <th className="p-3">Paciente (LGPD)</th>
                      <th className="p-3">Versão</th>
                      <th className="p-3">Destinatário Conferido</th>
                      <th className="p-3">Recebimento</th>
                      <th className="p-3">Operador</th>
                      <th className="p-3 text-right">Comprovante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entregas.map((ent) => {
                      const dataLocal = formatarDataHoraFuso(ent.data_hora_entrega, fusoAtivo)
                      return (
                        <tr key={ent.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-sky-900">
                            {ent.protocolo_entrega}
                            {ent.evento_anterior_ref && (
                              <span className="block text-[9px] text-amber-700 font-normal">
                                Retificação de #{ent.evento_anterior_ref.slice(-6)}
                              </span>
                            )}
                          </td>

                          <td className="p-3 font-mono text-slate-700 whitespace-nowrap">
                            {dataLocal}
                          </td>

                          <td className="p-3">
                            <div className="font-semibold text-slate-900">
                              {ent.paciente_nome || 'Paciente Titular'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {ent.paciente_cpf_mascarado}
                            </div>
                          </td>

                          <td className="p-3 font-mono">
                            <span className="bg-sky-50 text-sky-950 font-bold px-1.5 py-0.5 rounded border border-sky-300">
                              v{ent.versao_entregue}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="font-bold text-slate-900">{ent.destinatario_nome}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Doc: {ent.destinatario_documento}
                              {ent.destinatario_parentesco_grau &&
                                ` (${ent.destinatario_parentesco_grau})`}
                            </div>
                          </td>

                          <td className="p-3 text-slate-700">
                            <span className="capitalize">
                              {ent.forma_recebimento?.replace(/_/g, ' ')}
                            </span>
                          </td>

                          <td className="p-3 text-slate-600">
                            <div>{ent.autor_nome}</div>
                            <span className="text-[10px] text-slate-400">({ent.autor_perfil})</span>
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleVisualizarRecibo(ent)}
                                className="h-7 text-[11px] px-2 text-slate-700 border-slate-300"
                                title="Visualizar e Imprimir Recibo A4 Sanitizado"
                              >
                                <Printer className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                Recibo A4
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleIniciarRetificacaoRecibo(ent)}
                                className="h-7 text-[11px] px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                                title="Corrigir/Retificar Recibo de Entrega (Gera novo evento vinculado)"
                              >
                                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                Retificar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginação do histórico */}
            <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                Mostrando página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  className="h-8 px-2 text-xs"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  className="h-8 px-2 text-xs"
                >
                  Próxima <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: VISUALIZAÇÃO DO RECIBO SANITIZADO EM FOLHA A4 */}
      {/* ==================================================================== */}
      <Dialog open={modalReciboAberto} onOpenChange={setModalReciboAberto}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Printer className="w-4 h-4 text-sky-700" />
              Recibo Oficial Sanitizado de Entrega de Laudo RIS
            </DialogTitle>
          </DialogHeader>

          {reciboVisualizacao && <ReciboSanitizadoEntregaA4 recibo={reciboVisualizacao} />}

          <DialogFooter className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Imprimir Recibo A4
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setModalReciboAberto(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 2: RETIFICAÇÃO DE RECIBO EXISTENTE */}
      {/* ==================================================================== */}
      {modalRetificarAberto && exameParaRetificar && (
        <ModalEntregaLaudoRIS
          aberto={modalRetificarAberto}
          onOpenChange={(ab) => {
            setModalRetificarAberto(ab)
            if (!ab) {
              setEntregaParaRetificar(null)
              setExameParaRetificar(null)
            }
          }}
          exame={exameParaRetificar}
          eventoAnteriorParaCorrecao={entregaParaRetificar}
          onSucesso={() => {
            carregarEntregas()
            onAtualizarFilaGeral()
          }}
        />
      )}
    </div>
  )
}
