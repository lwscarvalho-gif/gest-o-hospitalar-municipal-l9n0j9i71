import React, { useState, useEffect } from 'react'
import {
  BaixaEstoqueDistribuicaoSND,
  ItemCardapioRefeicao,
  Setor,
  SnapshotItemBaixaSND,
} from '@/types/hospital'
import { consultarConsumoInsumosSND, estornarBaixaSND } from '@/services/snd'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Package,
  Calendar,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ModalConsumoEstornoSndProps {
  aberta: boolean
  onClose: () => void
  refeicoes: ItemCardapioRefeicao[]
  setores: Setor[]
  podeOperarEstoque: boolean
}

export const ModalConsumoEstornoSnd: React.FC<ModalConsumoEstornoSndProps> = ({
  aberta,
  onClose,
  refeicoes,
  setores,
  podeOperarEstoque,
}) => {
  const { toast } = useToast()

  // Filtros de busca
  const [dataInicio, setDataInicio] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [dataFim, setDataFim] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [pontoEstoqueFiltro, setPontoEstoqueFiltro] = useState('')
  const [filtroStatusEstorno, setFiltroStatusEstorno] = useState<'todos' | 'ativos' | 'estornados'>(
    'todos',
  )

  // Resultados paginados
  const [baixas, setBaixas] = useState<BaixaEstoqueDistribuicaoSND[]>([])
  const [carregando, setCarregando] = useState(false)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalItens, setTotalItens] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)

  // Modal de Detalhes / Snapshot da Baixa
  const [baixaVisualizando, setBaixaVisualizando] = useState<BaixaEstoqueDistribuicaoSND | null>(
    null,
  )

  // Modal de Estorno Compensatório
  const [baixaParaEstorno, setBaixaParaEstorno] = useState<BaixaEstoqueDistribuicaoSND | null>(null)
  const [motivoEstorno, setMotivoEstorno] = useState('')
  const [executandoEstorno, setExecutandoEstorno] = useState(false)
  const [erroEstorno, setErroEstorno] = useState<string | null>(null)

  const carregarBaixas = async (pag = 1) => {
    setCarregando(true)
    try {
      const estornadoParam =
        filtroStatusEstorno === 'estornados'
          ? true
          : filtroStatusEstorno === 'ativos'
            ? false
            : undefined

      const resp = await consultarConsumoInsumosSND({
        page: pag,
        perPage: 15,
        data_inicio: dataInicio ? `${dataInicio}T00:00:00.000Z` : undefined,
        data_fim: dataFim ? `${dataFim}T23:59:59.999Z` : undefined,
        ponto_estoque: pontoEstoqueFiltro.trim() || undefined,
        estornado: estornadoParam,
      })

      setBaixas(resp.items)
      setTotalItens(resp.totalItems)
      setTotalPaginas(resp.totalPages)
      setPaginaAtual(resp.page)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao consultar consumo de insumos',
        description: String(err instanceof Error ? err.message : err),
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (aberta) {
      carregarBaixas(1)
    }
  }, [aberta, dataInicio, dataFim, pontoEstoqueFiltro, filtroStatusEstorno])

  const abrirModalEstorno = (baixa: BaixaEstoqueDistribuicaoSND) => {
    if (baixa.estornado) {
      toast({
        title: 'Baixa já estornada',
        description: `Esta baixa já foi estornada por ${baixa.estorno_autor_nome} em ${baixa.estorno_data_utc}. Duplo estorno é estritamente proibido.`,
        variant: 'destructive',
      })
      return
    }
    setBaixaParaEstorno(baixa)
    setMotivoEstorno('')
    setErroEstorno(null)
  }

  const handleConfirmarEstorno = async () => {
    if (!baixaParaEstorno) return
    if (!motivoEstorno.trim() || motivoEstorno.trim().length < 5) {
      setErroEstorno('O motivo do estorno compensatório é obrigatório (mínimo de 5 caracteres).')
      return
    }

    setExecutandoEstorno(true)
    setErroEstorno(null)

    try {
      const resp = await estornarBaixaSND({
        baixa_id: baixaParaEstorno.id,
        motivo: motivoEstorno.trim(),
      })

      toast({
        title: 'Estorno Compensatório Efetivado',
        description:
          resp.mensagem || 'Saldo devolvido ao almoxarifado de nutrição e trilha auditada.',
      })

      setBaixaParaEstorno(null)
      setMotivoEstorno('')
      carregarBaixas(paginaAtual)
    } catch (err: unknown) {
      const msg = String(err instanceof Error ? err.message : err)
      setErroEstorno(msg)
      toast({
        title: 'Falha no Estorno Compensatório',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setExecutandoEstorno(false)
    }
  }

  return (
    <>
      <Dialog open={aberta} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-900">
                <History className="w-5 h-5 text-indigo-600" />
                Rastreabilidade de Consumo de Insumos & Estorno Compensatório
              </span>
              <Badge variant="outline" className="text-[11px] bg-slate-100 text-slate-700">
                7.4.3.5.c.i • Trilha Auditável
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Consulta de eventos de baixa de insumos no estoque vinculados às distribuições do SND.
              Permite estorno compensatório com autoria da sessão, motivo formal e bloqueio a duplo
              estorno (sem exclusão de dados).
            </DialogDescription>
          </DialogHeader>

          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-100">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Período De</label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Até</label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ponto de Estoque</label>
              <Input
                placeholder="ex: Almoxarifado, Cozinha..."
                value={pontoEstoqueFiltro}
                onChange={(e) => setPontoEstoqueFiltro(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Situação da Baixa</label>
              <select
                className="w-full h-8 rounded-md border border-slate-300 px-2 bg-white text-xs"
                value={filtroStatusEstorno}
                onChange={(e) => setFiltroStatusEstorno(e.target.value as any)}
              >
                <option value="todos">Todas as Baixas</option>
                <option value="ativos">Consumos Efetivos (Não Estornados)</option>
                <option value="estornados">Apenas Estornadas</option>
              </select>
            </div>
          </div>

          {/* Tabela de Consumo Auditável */}
          <div className="border border-slate-200 rounded-lg overflow-hidden mt-3">
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">
                Histórico Auditável de Baixas ({totalItens} registros)
              </span>
              <span className="text-[11px] text-slate-400">
                Página {paginaAtual} de {totalPaginas}
              </span>
            </div>

            {carregando ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Carregando histórico de consumo de insumos...
              </div>
            ) : baixas.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Nenhuma baixa de estoque registrada no período ou filtros informados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-semibold uppercase">
                    <tr>
                      <th className="py-2 px-3">Data / Hora UTC</th>
                      <th className="py-2 px-3">Ficha de Composição</th>
                      <th className="py-2 px-3">Ponto de Estoque</th>
                      <th className="py-2 px-3">Qtd Insumos</th>
                      <th className="py-2 px-3">Operador da Baixa</th>
                      <th className="py-2 px-3">Situação</th>
                      <th className="py-2 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {baixas.map((bx) => {
                      const itensRaw = bx.snapshot_itens_consumidos || []
                      const totalInsumos = Array.isArray(itensRaw) ? itensRaw.length : 0

                      return (
                        <tr
                          key={bx.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            bx.estornado ? 'bg-amber-50/40 text-slate-600' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">
                            {new Date(bx.data_hora_baixa_utc).toLocaleString('pt-BR')}
                          </td>

                          <td className="py-2 px-3">
                            <span className="font-semibold text-slate-800">
                              {bx.composicao_codigo_snapshot}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono ml-1.5">
                              v{bx.composicao_versao_snapshot}
                            </span>
                          </td>

                          <td className="py-2 px-3 text-slate-600">{bx.ponto_estoque}</td>

                          <td className="py-2 px-3 font-medium text-slate-800">
                            {totalInsumos} insumo(s)
                          </td>

                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                            {bx.autor_nome}
                          </td>

                          <td className="py-2 px-3">
                            {bx.estornado ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-amber-100 text-amber-800 border-amber-300"
                              >
                                Estornado
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300"
                              >
                                Efetivado
                              </Badge>
                            )}
                          </td>

                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 border-slate-300"
                                onClick={() => setBaixaVisualizando(bx)}
                              >
                                Inspecionar Snapshot
                              </Button>

                              {podeOperarEstoque && !bx.estornado && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] px-2 border-rose-300 text-rose-700 hover:bg-rose-50"
                                  onClick={() => abrirModalEstorno(bx)}
                                >
                                  <RotateCcw className="w-3 h-3 mr-1" />
                                  Estornar
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginação */}
            <div className="py-2 px-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
              <span>
                Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong>
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  disabled={paginaAtual <= 1 || carregando}
                  onClick={() => carregarBaixas(paginaAtual - 1)}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  disabled={paginaAtual >= totalPaginas || carregando}
                  onClick={() => carregarBaixas(paginaAtual + 1)}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button size="sm" variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Inspecionar Snapshot Congelado */}
      <Dialog
        open={Boolean(baixaVisualizando)}
        onOpenChange={(open) => !open && setBaixaVisualizando(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-slate-900">
              <Package className="w-5 h-5 text-indigo-600" />
              Snapshot de Consumo Congelado na Baixa
            </DialogTitle>
            <DialogDescription className="text-xs">
              Valores históricos registrados no momento da confirmação da distribuição. Imutável por
              garantia regulatória.
            </DialogDescription>
          </DialogHeader>

          {baixaVisualizando && (
            <div className="space-y-3 py-1 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded border text-[11px]">
                <div>
                  <strong>Baixa ID:</strong>{' '}
                  <span className="font-mono">{baixaVisualizando.id}</span>
                </div>
                <div>
                  <strong>Data/Hora UTC:</strong> {baixaVisualizando.data_hora_baixa_utc}
                </div>
                <div>
                  <strong>Ficha Snapshot:</strong> {baixaVisualizando.composicao_codigo_snapshot} (v
                  {baixaVisualizando.composicao_versao_snapshot})
                </div>
                <div>
                  <strong>Ponto Estoque:</strong> {baixaVisualizando.ponto_estoque}
                </div>
                <div>
                  <strong>Operador:</strong> {baixaVisualizando.autor_nome}
                </div>
                <div>
                  <strong>Idempotency-Key:</strong>{' '}
                  <span className="font-mono">{baixaVisualizando.idempotency_key}</span>
                </div>
              </div>

              {baixaVisualizando.estornado && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px] space-y-0.5">
                  <div className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Registro Estornado Compensatoriamente
                  </div>
                  <div>
                    <strong>Data Estorno:</strong> {baixaVisualizando.estorno_data_utc} por{' '}
                    {baixaVisualizando.estorno_autor_nome}
                  </div>
                  <div>
                    <strong>Motivo:</strong> {baixaVisualizando.estorno_motivo}
                  </div>
                </div>
              )}

              <div>
                <span className="font-semibold text-slate-800 block mb-1">
                  Insumos Consumidos no Snapshot:
                </span>
                <div className="border rounded divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {(baixaVisualizando.snapshot_itens_consumidos || []).map(
                    (it: SnapshotItemBaixaSND, idx: number) => (
                      <div key={idx} className="p-2 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="font-semibold text-slate-900">{it.item_nome}</span>
                          <div className="text-[10px] text-slate-500">
                            Consumo: {it.quantidade_consumo} {it.unidade_consumo}
                            {it.unidade_consumo !== it.unidade_estoque &&
                              ` (fator: ${it.fator_conversao})`}
                            {it.lote && ` • Lote: ${it.lote}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900">
                            {it.quantidade_baixa_estoque} {it.unidade_estoque}
                          </span>
                          <div className="text-[9px] text-slate-400">
                            Saldo: {it.saldo_anterior} ➔ {it.saldo_posterior}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setBaixaVisualizando(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Ação de Estorno Compensatório */}
      <Dialog
        open={Boolean(baixaParaEstorno)}
        onOpenChange={(open) => !open && setBaixaParaEstorno(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-rose-800">
              <RotateCcw className="w-5 h-5 text-rose-600" />
              Estorno Compensatório de Baixa SND
            </DialogTitle>
            <DialogDescription className="text-xs">
              Devolve o saldo de insumos ao almoxarifado de nutrição via movimento compensatório. A
              exclusão física é bloqueada; duplo estorno é estritamente rejeitado.
            </DialogDescription>
          </DialogHeader>

          {baixaParaEstorno && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-2.5 bg-slate-50 border rounded text-[11px] space-y-1">
                <div>
                  <strong>Baixa ID:</strong>{' '}
                  <span className="font-mono">{baixaParaEstorno.id}</span>
                </div>
                <div>
                  <strong>Ficha:</strong> {baixaParaEstorno.composicao_codigo_snapshot} (v
                  {baixaParaEstorno.composicao_versao_snapshot})
                </div>
                <div>
                  <strong>Insumos a estornar:</strong>{' '}
                  {(baixaParaEstorno.snapshot_itens_consumidos || []).length} item(ns)
                </div>
              </div>

              {erroEstorno && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 rounded text-rose-800 text-[11px]">
                  <strong>Erro no estorno:</strong> {erroEstorno}
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Motivo / Justificativa Obrigatória do Estorno *
                </label>
                <Textarea
                  rows={3}
                  placeholder="ex: Paciente em jejum de emergência, refeição devolvida lacrada à copa..."
                  value={motivoEstorno}
                  onChange={(e) => setMotivoEstorno(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <p className="text-[10px] text-slate-500 italic">
                O autor da sessão ativa será registrado como responsável pelo estorno nos registros
                do SUS.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBaixaParaEstorno(null)}
              disabled={executandoEstorno}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleConfirmarEstorno}
              disabled={executandoEstorno}
            >
              {executandoEstorno ? 'Processando Estorno...' : 'Confirmar Estorno Compensatório'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
