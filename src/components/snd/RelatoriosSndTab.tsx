import React, { useState, useEffect } from 'react'
import {
  DistribuicaoRefeicaoSND,
  Setor,
  Leito,
  Paciente,
  ItemCardapioRefeicao,
} from '@/types/hospital'
import { listarDistribuicoesRefeicoes } from '@/services/snd'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  FileText,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  PieChart,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building,
  RotateCcw,
  History,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ModalConsumoEstornoSnd } from './ModalConsumoEstornoSnd'

interface RelatoriosSndTabProps {
  setores: Setor[]
  leitos: Leito[]
  pacientes: Paciente[]
  refeicoes: ItemCardapioRefeicao[]
  podeOperarEstoque?: boolean
}

export const RelatoriosSndTab: React.FC<RelatoriosSndTabProps> = ({
  setores,
  leitos,
  pacientes,
  refeicoes,
  podeOperarEstoque = true,
}) => {
  const { toast } = useToast()
  const [modalConsumoAberta, setModalConsumoAberta] = useState(false)

  // Filtros de consolidação
  const [dataInicio, setDataInicio] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  })
  const [dataFim, setDataFim] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [filtroSetor, setFiltroSetor] = useState<string>('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroRefeicao, setFiltroRefeicao] = useState<string>('')

  // Dados paginados de distribuição
  const [distribuicoes, setDistribuicoes] = useState<DistribuicaoRefeicaoSND[]>([])
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [carregando, setCarregando] = useState(false)

  const carregarRelatorio = async (pagina = 1) => {
    setCarregando(true)
    try {
      const resp = await listarDistribuicoesRefeicoes({
        page: pagina,
        perPage: 25,
        data_inicio: dataInicio,
        data_fim: dataFim,
        setor_ref: filtroSetor || undefined,
        status_operacional: filtroStatus !== 'todos' ? filtroStatus : undefined,
        refeicao_codigo: filtroRefeicao || undefined,
      })
      setDistribuicoes(resp.items)
      setTotalRegistros(resp.totalItems)
      setTotalPaginas(resp.totalPages)
      setPaginaAtual(resp.page)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao carregar relatório',
        description: String(err instanceof Error ? err.message : err),
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarRelatorio(1)
  }, [dataInicio, dataFim, filtroSetor, filtroStatus, filtroRefeicao])

  // Métricas agregadas da página/período
  const totalDistribuidas = distribuicoes.filter(
    (d) => d.status_operacional === 'distribuido',
  ).length
  const totalNaoDistribuidas = distribuicoes.filter(
    (d) => d.status_operacional === 'nao_distribuido',
  ).length
  const totalEmPreparo = distribuicoes.filter((d) => d.status_operacional === 'em_preparo').length

  const handleImprimir = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Relatório e Ação de Impressão Sanitizada */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              Relatório Consolidado de Nutrição e Distribuição (SND)
              <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-300">
                A4 Impressão Sanitizada
              </Badge>
            </h3>
            <p className="text-xs text-slate-500">
              Consolidação de refeições e dietas hospitalares por período, setor, leito e paciente.
              Estritamente sanitizado de acordo com o sigilo da Lei Geral de Proteção de Dados
              (LGPD).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {podeOperarEstoque && (
            <Button
              size="sm"
              variant="outline"
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs h-8 flex items-center gap-1.5"
              onClick={() => setModalConsumoAberta(true)}
            >
              <History className="w-3.5 h-3.5 text-indigo-600" />
              Consumo de Insumos & Estorno
            </Button>
          )}

          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 flex items-center gap-1.5"
            onClick={handleImprimir}
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Folha Sanitizada A4
          </Button>
        </div>
      </div>

      {/* Cartões de Indicadores Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Refeições Entregues</p>
              <h4 className="text-xl font-bold text-emerald-600">{totalDistribuidas}</h4>
              <span className="text-[10px] text-slate-400">Status "distribuído" no lote</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Não Distribuídas</p>
              <h4 className="text-xl font-bold text-rose-600">{totalNaoDistribuidas}</h4>
              <span className="text-[10px] text-slate-400">Com justificativa/motivo formal</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Em Preparo / Planejadas</p>
              <h4 className="text-xl font-bold text-amber-600">{totalEmPreparo}</h4>
              <span className="text-[10px] text-slate-400">Em produção na cozinha hospitalar</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros Parametrizáveis */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
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
              <label className="font-semibold text-slate-700 block mb-1">Setor / Unidade</label>
              <select
                className="w-full h-8 rounded-md border border-slate-300 px-2 bg-white text-xs"
                value={filtroSetor}
                onChange={(e) => setFiltroSetor(e.target.value)}
              >
                <option value="">Todos os Setores</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tipo de Refeição</label>
              <select
                className="w-full h-8 rounded-md border border-slate-300 px-2 bg-white text-xs"
                value={filtroRefeicao}
                onChange={(e) => setFiltroRefeicao(e.target.value)}
              >
                <option value="">Todas as Refeições</option>
                {refeicoes.map((r) => (
                  <option key={r.id} value={r.codigo}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Status Operacional</label>
              <select
                className="w-full h-8 rounded-md border border-slate-300 px-2 bg-white text-xs"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
              >
                <option value="todos">Todos os Status</option>
                <option value="distribuido">Distribuído</option>
                <option value="nao_distribuido">Não Distribuído</option>
                <option value="em_preparo">Em Preparo</option>
                <option value="planejado">Planejado</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Área Imprimível (Folha A4 Sanitizada) */}
      <div className="printable-report">
        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Consolidado Operacional de Refeições Distribuídas
              </CardTitle>
              <span className="text-[11px] text-slate-500">
                Total registrado: <strong>{totalRegistros}</strong> eventos
              </span>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              Prefeitura Municipal de Saúde • SND
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {carregando ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Carregando relatório...
              </div>
            ) : distribuicoes.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-300" />
                <p>Nenhum registro de distribuição encontrado para os filtros selecionados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Data / Horário</th>
                      <th className="py-2.5 px-3">Paciente</th>
                      <th className="py-2.5 px-3">Leito / Setor</th>
                      <th className="py-2.5 px-3">Refeição</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Justificativa / Motivo</th>
                      <th className="py-2.5 px-3">Operador Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {distribuicoes.map((dist) => {
                      const pac = pacientes.find((p) => p.id === dist.paciente_ref)
                      const leito = leitos.find((l) => l.id === dist.leito_ref)
                      const setor = setores.find((s) => s.id === dist.setor_ref)
                      const refeicao = refeicoes.find((r) => r.codigo === dist.refeicao_codigo)

                      const statusClasses: Record<string, string> = {
                        distribuido: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                        nao_distribuido: 'bg-rose-100 text-rose-800 border-rose-300',
                        em_preparo: 'bg-amber-100 text-amber-800 border-amber-300',
                        planejado: 'bg-slate-100 text-slate-700 border-slate-300',
                      }

                      return (
                        <tr key={dist.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">
                              {dist.data_operacional}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {dist.horario_previsto || '—'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {pac ? pac.nome : `Paciente #${dist.paciente_ref.substring(0, 8)}`}
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800">
                              {leito ? leito.codigo : 'Sem leito'}
                            </div>
                            <span className="text-[10px] text-slate-500 block">
                              {setor ? setor.nome : 'Geral'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 font-medium text-slate-700">
                            {refeicao ? refeicao.nome : dist.refeicao_codigo.toUpperCase()}
                          </td>

                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] py-0 px-1.5 ${
                                statusClasses[dist.status_operacional] || statusClasses.planejado
                              }`}
                            >
                              {dist.status_operacional}
                            </Badge>
                          </td>

                          <td className="py-2.5 px-3">
                            {dist.motivo_nao_distribuido ? (
                              <span className="text-[11px] text-rose-800 font-semibold block">
                                {dist.motivo_nao_distribuido}
                              </span>
                            ) : dist.observacoes_operacionais ? (
                              <span className="text-[11px] text-slate-600 italic">
                                {dist.observacoes_operacionais}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            <div className="text-[11px] font-medium">{dist.autor_nome}</div>
                            <span className="text-[10px] text-slate-400">
                              {new Date(
                                dist.data_hora_registro_utc || dist.created,
                              ).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginação do Relatório */}
            <div className="py-3 px-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
              <span>
                Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong> (
                {totalRegistros} registros)
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={paginaAtual <= 1 || carregando}
                  onClick={() => carregarRelatorio(paginaAtual - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={paginaAtual >= totalPaginas || carregando}
                  onClick={() => carregarRelatorio(paginaAtual + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Consumo de Insumos e Estorno Compensatório */}
      <ModalConsumoEstornoSnd
        aberta={modalConsumoAberta}
        onClose={() => setModalConsumoAberta(false)}
        refeicoes={refeicoes}
        setores={setores}
        podeOperarEstoque={podeOperarEstoque}
      />
    </div>
  )
}
