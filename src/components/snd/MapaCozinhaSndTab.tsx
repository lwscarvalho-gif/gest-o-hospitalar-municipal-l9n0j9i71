import React, { useState } from 'react'
import {
  ItemMapaCozinhaSanitizado,
  Setor,
  ItemCardapioRefeicao,
  StatusDistribuicaoRefeicao,
  PreviaInsumosBaixaSND,
} from '@/types/hospital'
import {
  registrarDistribuicaoRefeicao,
  obterPreviaInsumosDistribuicao,
  confirmarDistribuicaoComBaixa,
} from '@/services/snd'
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
  ChefHat,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  ShieldCheck,
  Bed,
  Utensils,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flame,
  Scale,
  PackageCheck,
  PackageX,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface MapaCozinhaSndTabProps {
  itensMapa: ItemMapaCozinhaSanitizado[]
  setores: Setor[]
  refeicoes: ItemCardapioRefeicao[]
  carregando: boolean
  dataOperacional: string
  setDataOperacional: (d: string) => void
  setorSelecionadoId: string
  setSetorSelecionadoId: (id: string) => void
  onAtualizar: () => void
  podeOperarCozinha: boolean
}

export const MapaCozinhaSndTab: React.FC<MapaCozinhaSndTabProps> = ({
  itensMapa,
  setores,
  refeicoes,
  carregando,
  dataOperacional,
  setDataOperacional,
  setorSelecionadoId,
  setSetorSelecionadoId,
  onAtualizar,
  podeOperarCozinha,
}) => {
  const { toast } = useToast()

  // Filtros locais de visualização e paginação
  const [buscaTexto, setBuscaTexto] = useState('')
  const [refeicaoAtivaCodigo, setRefeicaoAtivaCodigo] = useState<string>(
    () => refeicoes[0]?.codigo || 'almoco',
  )
  const [paginaAtual, setPaginaAtual] = useState(1)
  const itensPorPagina = 10

  // Modal de Registro Operacional (Preparo / Distribuído / Não distribuído)
  const [modalRegistroAberta, setModalRegistroAberta] = useState(false)
  const [itemSelecionado, setItemSelecionado] = useState<ItemMapaCozinhaSanitizado | null>(null)
  const [statusOperacional, setStatusOperacional] =
    useState<StatusDistribuicaoRefeicao>('distribuido')
  const [motivoNaoDistribuido, setMotivoNaoDistribuido] = useState('')
  const [temperatura, setTemperatura] = useState('')
  const [responsavelEntrega, setResponsavelEntrega] = useState('')
  const [observacoesOperacionais, setObservacoesOperacionais] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Chave de idempotência persistente por item e refeição
  const [idempotencyKey, setIdempotencyKey] = useState('')

  // Prévia de insumos do estoque antes de confirmar
  const [previaInsumos, setPreviaInsumos] = useState<PreviaInsumosBaixaSND | null>(null)
  const [carregandoPrevia, setCarregandoPrevia] = useState(false)
  const [erroServidorBaixa, setErroServidorBaixa] = useState<string | null>(null)
  const [pontoEstoque, setPontoEstoque] = useState('SND - Almoxarifado de Nutrição')

  const abrirModalRegistro = async (
    item: ItemMapaCozinhaSanitizado,
    statusInicial: StatusDistribuicaoRefeicao = 'distribuido',
  ) => {
    setItemSelecionado(item)
    setStatusOperacional(statusInicial)
    setMotivoNaoDistribuido('')
    setTemperatura('')
    setObservacoesOperacionais('')
    setResponsavelEntrega('')
    setErroServidorBaixa(null)
    setPreviaInsumos(null)
    setPontoEstoque('SND - Almoxarifado de Nutrição')

    // Chave única e reprodutível por refeição/dia/prescrição
    const novaChave = `dist-${item.prescricao_id}-${refeicaoAtivaCodigo}-${dataOperacional}`
    setIdempotencyKey(novaChave)
    setModalRegistroAberta(true)

    // Se for status 'distribuido', carrega a prévia de insumos e saldo de estoque
    if (statusInicial === 'distribuido') {
      carregarPreviaInsumos(item.dieta_nome || 'todas')
    }
  }

  const carregarPreviaInsumos = async (dietaCodigoOuNome: string) => {
    setCarregandoPrevia(true)
    try {
      const resp = await obterPreviaInsumosDistribuicao(refeicaoAtivaCodigo, dietaCodigoOuNome)
      setPreviaInsumos(resp)
    } catch (err: unknown) {
      console.warn('Não foi possível obter prévia de insumos:', err)
      setPreviaInsumos(null)
    } finally {
      setCarregandoPrevia(false)
    }
  }

  const handleSalvarDistribuicao = async () => {
    if (!itemSelecionado) return

    if (statusOperacional === 'nao_distribuido') {
      if (!motivoNaoDistribuido.trim() || motivoNaoDistribuido.trim().length < 3) {
        toast({
          title: 'Motivo obrigatório',
          description:
            'É obrigatório registrar a justificativa técnica/operacional quando a refeição não for distribuída (ex: jejum cirúrgico, ausência do paciente).',
          variant: 'destructive',
        })
        return
      }
    }

    setSalvando(true)
    setErroServidorBaixa(null)

    try {
      const refeicaoObj = refeicoes.find((r) => r.codigo === refeicaoAtivaCodigo)

      // Regra 7.4.3.5.c.i:
      // Se status === 'distribuido', aciona o endpoint transacional de confirmação com baixa integrada no estoque!
      // Se 'planejado', 'em_preparo' ou 'nao_distribuido', registra operacionalmente SEM baixar estoque.
      if (statusOperacional === 'distribuido') {
        const respConfirmacao = await confirmarDistribuicaoComBaixa({
          idempotency_key: idempotencyKey,
          prescricao_dietetica_ref: itemSelecionado.prescricao_id,
          refeicao_codigo: refeicaoAtivaCodigo,
          data_operacional: dataOperacional,
          horario_previsto: refeicaoObj?.horario_padrao,
          status_operacional: 'distribuido',
          ponto_estoque: pontoEstoque,
          responsavel_entrega_nome: responsavelEntrega.trim() || undefined,
          temperatura_afericao: temperatura.trim() || undefined,
          observacoes_operacionais: observacoesOperacionais.trim() || undefined,
        })

        toast({
          title: respConfirmacao.baixa_executada
            ? 'Distribuição Confirmada com Baixa no Estoque'
            : 'Distribuição Registrada',
          description:
            respConfirmacao.mensagem || 'Refeição entregue e insumos baixados com sucesso.',
        })
      } else {
        await registrarDistribuicaoRefeicao({
          prescricao_dietetica_ref: itemSelecionado.prescricao_id,
          paciente_ref: itemSelecionado.paciente_id,
          leito_ref: itemSelecionado.leito_id,
          setor_ref: itemSelecionado.setor_id,
          refeicao_codigo: refeicaoAtivaCodigo,
          data_operacional: dataOperacional,
          horario_previsto: refeicaoObj?.horario_padrao,
          status_operacional: statusOperacional,
          motivo_nao_distribuido:
            statusOperacional === 'nao_distribuido' ? motivoNaoDistribuido.trim() : undefined,
          temperatura_afericao: temperatura.trim() || undefined,
          responsavel_entrega_nome: responsavelEntrega.trim() || undefined,
          observacoes_operacionais: observacoesOperacionais.trim() || undefined,
          idempotency_key: idempotencyKey,
        })

        toast({
          title: 'Status Operacional Registrado',
          description: `Refeição [${refeicaoAtivaCodigo.toUpperCase()}] registrada como "${statusOperacional}". Sem baixa de estoque (só distribuições confirmadas consomem insumos).`,
        })
      }

      setModalRegistroAberta(false)
      setItemSelecionado(null)
      onAtualizar()
    } catch (err: unknown) {
      const msg = String(err instanceof Error ? err.message : err)

      // Regra de resiliência: O formulário NÃO é fechado ou resetado em caso de erro!
      // A mensagem é exposta de forma acionável e o operador mantém a mesma chave para reenvio.
      setErroServidorBaixa(msg)

      toast({
        title: 'Falha na Confirmação / Baixa de Estoque',
        description: msg.includes('IDEMPOTENT_HIT')
          ? 'Registro já processado anteriormente com a mesma chave de idempotência.'
          : msg,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Filtragem local por texto
  const itensFiltrados = itensMapa.filter((item) => {
    if (!buscaTexto) return true
    const termo = buscaTexto.toLowerCase()
    return (
      item.paciente_nome.toLowerCase().includes(termo) ||
      (item.leito_codigo && item.leito_codigo.toLowerCase().includes(termo)) ||
      (item.setor_nome && item.setor_nome.toLowerCase().includes(termo)) ||
      item.dieta_nome.toLowerCase().includes(termo)
    )
  })

  // Paginação
  const totalPaginas = Math.max(1, Math.ceil(itensFiltrados.length / itensPorPagina))
  const inicio = (paginaAtual - 1) * itensPorPagina
  const itensPaginados = itensFiltrados.slice(inicio, inicio + itensPorPagina)

  return (
    <div className="space-y-6">
      {/* Barra de Sanitização LGPD e Sigilo */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              Mapa Operacional de Cozinha e Copa (SND)
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                Endpoint Sanitizado LGPD
              </Badge>
            </h3>
            <p className="text-xs text-slate-400">
              Payload operacional estrito: exibe leito, dieta, consistência, via e restrições
              alimentares. Diagnóstico, CID e prontuário clínico são ocultados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs h-8"
            onClick={() => window.print()}
          >
            <Printer className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Imprimir Mapa Operacional
          </Button>
        </div>
      </div>

      {/* Controles de Filtros e Refeições */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Data Operacional</label>
              <Input
                type="date"
                value={dataOperacional}
                onChange={(e) => {
                  setDataOperacional(e.target.value)
                  setPaginaAtual(1)
                }}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Filtrar por Unidade / Setor
              </label>
              <select
                className="w-full h-8 rounded-md border border-slate-300 px-2 bg-white text-xs"
                value={setorSelecionadoId}
                onChange={(e) => {
                  setSetorSelecionadoId(e.target.value)
                  setPaginaAtual(1)
                }}
              >
                <option value="">Todos os Setores / Enfermarias</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Buscar por Leito, Paciente ou Dieta
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Filtrar nesta página..."
                  value={buscaTexto}
                  onChange={(e) => {
                    setBuscaTexto(e.target.value)
                    setPaginaAtual(1)
                  }}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Abas Rápidas por Refeição */}
          <div className="border-t border-slate-100 pt-3">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
              Selecione a Refeição em Andamento na Cozinha:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {refeicoes
                .filter((r) => r.ativo)
                .map((ref) => {
                  const ativa = refeicaoAtivaCodigo === ref.codigo
                  return (
                    <button
                      key={ref.id}
                      onClick={() => setRefeicaoAtivaCodigo(ref.codigo)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                        ativa
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      <span>{ref.nome}</span>
                      <span className="text-[10px] opacity-75">({ref.horario_padrao})</span>
                    </button>
                  )
                })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Paginada do Mapa de Cozinha */}
      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-600" />
            Mapa de Montagem e Distribuição • Refeição:{' '}
            <span className="text-blue-600 underline">
              {refeicoes.find((r) => r.codigo === refeicaoAtivaCodigo)?.nome || refeicaoAtivaCodigo}
            </span>
          </CardTitle>
          <span className="text-xs text-slate-500 font-medium">
            Total de Leitos Prescritos: <strong>{itensFiltrados.length}</strong>
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {carregando ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Carregando mapa operacional sanitizado...
            </div>
          ) : itensPaginados.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <Utensils className="w-8 h-8 mx-auto text-slate-300" />
              <p>Nenhuma dieta ativa vinculada aos leitos para os filtros informados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Leito / Setor</th>
                    <th className="py-2.5 px-3">Paciente</th>
                    <th className="py-2.5 px-3">Tipo de Dieta & Consistência</th>
                    <th className="py-2.5 px-3">Via & Fracionamento</th>
                    <th className="py-2.5 px-3">Restrições / Alergias</th>
                    <th className="py-2.5 px-3">Observações Cozinha</th>
                    <th className="py-2.5 px-3 text-right">Ação Cozinha/Copa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {itensPaginados.map((item) => (
                    <tr key={item.prescricao_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Bed className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-800">
                            {item.leito_codigo || 'Sem leito'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          {item.setor_nome || 'Geral'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {item.paciente_nome}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900">{item.dieta_nome}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span>{item.categoria_dieta?.toUpperCase()}</span>
                          {item.consistencia && <span>• {item.consistencia}</span>}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        <div>{item.via_administracao || 'Via Oral'}</div>
                        {item.fracionamento && (
                          <div className="text-[10px] text-slate-400">{item.fracionamento}</div>
                        )}
                        {item.quantidade && (
                          <div className="text-[10px] text-slate-500">
                            {item.quantidade} {item.unidade_medida || 'ml'}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {item.alergias_alimentares ? (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] mb-1 font-semibold block w-fit">
                            ALERGIA: {item.alergias_alimentares}
                          </Badge>
                        ) : null}
                        {item.restricoes_alimentares ? (
                          <span className="text-[11px] text-amber-800 font-medium block">
                            {item.restricoes_alimentares}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Sem restrições</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 italic max-w-xs truncate">
                        {item.observacoes_operacionais || '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-2"
                            onClick={() => abrirModalRegistro(item, 'distribuido')}
                            disabled={!podeOperarCozinha}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Distribuído
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] border-amber-300 text-amber-700 hover:bg-amber-50 px-2"
                            onClick={() => abrirModalRegistro(item, 'em_preparo')}
                            disabled={!podeOperarCozinha}
                          >
                            Preparo
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] border-rose-300 text-rose-700 hover:bg-rose-50 px-2"
                            onClick={() => abrirModalRegistro(item, 'nao_distribuido')}
                            disabled={!podeOperarCozinha}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Não Entregue
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          <div className="py-3 px-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong>
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={paginaAtual <= 1}
                onClick={() => setPaginaAtual((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={paginaAtual >= totalPaginas}
                onClick={() => setPaginaAtual((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Registro Operacional (Humano com Idempotência) */}
      <Dialog open={modalRegistroAberta} onOpenChange={setModalRegistroAberta}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Utensils className="w-5 h-5 text-blue-600" />
              Registro de Distribuição de Refeição
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirmação humana de preparo ou entrega da refeição no leito com chave de
              idempotência persistente.
            </DialogDescription>
          </DialogHeader>

          {itemSelecionado && (
            <div className="space-y-3 py-2 text-xs max-h-[70vh] overflow-y-auto pr-1">
              {/* Alerta de erro do servidor mantendo o formulário intacto */}
              {erroServidorBaixa && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Ocorreu um erro no servidor (Formulário preservado)
                  </div>
                  <p className="text-[11px] leading-relaxed">{erroServidorBaixa}</p>
                  <p className="text-[10px] text-rose-700 italic">
                    Corrija os dados se necessário ou tente novamente. A mesma chave idempotente
                    será mantida para evitar duplicidades.
                  </p>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-1">
                <div>
                  <strong>Leito:</strong> {itemSelecionado.leito_codigo || 'Sem leito'} •{' '}
                  <strong>Paciente:</strong> {itemSelecionado.paciente_nome}
                </div>
                <div>
                  <strong>Dieta:</strong> {itemSelecionado.dieta_nome} (
                  {itemSelecionado.categoria_dieta})
                </div>
                <div>
                  <strong>Refeição:</strong> {refeicaoAtivaCodigo.toUpperCase()} •{' '}
                  <strong>Data:</strong> {dataOperacional}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Status Operacional *
                </label>
                <select
                  className="w-full h-8 rounded-md border border-slate-300 px-2 bg-white text-xs"
                  value={statusOperacional}
                  onChange={(e) => {
                    const novo = e.target.value as StatusDistribuicaoRefeicao
                    setStatusOperacional(novo)
                    if (novo === 'distribuido' && !previaInsumos) {
                      carregarPreviaInsumos(itemSelecionado.dieta_nome || 'todas')
                    }
                  }}
                >
                  <option value="distribuido">Distribuído no Leito (Consome Estoque)</option>
                  <option value="em_preparo">Em Preparo na Cozinha (Sem Baixa)</option>
                  <option value="planejado">Planejado (Sem Baixa)</option>
                  <option value="nao_distribuido">
                    Não Distribuído (Exige Motivo • Sem Baixa)
                  </option>
                </select>
              </div>

              {/* Prévia de Insumos e Saldo do Almoxarifado antes da Confirmação */}
              {statusOperacional === 'distribuido' && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-900 flex items-center gap-1.5 text-xs">
                      <Scale className="w-4 h-4 text-blue-600" />
                      Prévia de Insumos & Estoque (Item 7.4.3.5.c.i)
                    </span>
                    {previaInsumos?.composicao_encontrada && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-white text-blue-800 border-blue-300 font-mono"
                      >
                        Ficha: {previaInsumos.composicao_codigo} (v{previaInsumos.composicao_versao}
                        )
                      </Badge>
                    )}
                  </div>

                  {carregandoPrevia ? (
                    <p className="text-[11px] text-blue-700 italic">
                      Verificando saldos, lotes e validades no estoque...
                    </p>
                  ) : !previaInsumos || !previaInsumos.composicao_encontrada ? (
                    <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-blue-100 flex items-start gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span>
                        Nenhuma ficha técnica de insumos vinculada a esta refeição. A confirmação da
                        distribuição prosseguirá sem baixa de estoque até parametrização da ficha.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {previaInsumos.motivos_bloqueio &&
                        previaInsumos.motivos_bloqueio.length > 0 && (
                          <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-800 space-y-1">
                            <span className="font-bold flex items-center gap-1 text-rose-900">
                              <PackageX className="w-3.5 h-3.5" />
                              Alerta de Inconsistência de Estoque:
                            </span>
                            <ul className="list-disc list-inside space-y-0.5 pl-1">
                              {previaInsumos.motivos_bloqueio.map((m, idx) => (
                                <li key={idx}>{m}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                      <div className="bg-white rounded border border-blue-100 divide-y divide-slate-100 max-h-36 overflow-y-auto">
                        {previaInsumos.itens.map((ins, idx) => (
                          <div
                            key={idx}
                            className="p-1.5 flex items-center justify-between text-[11px]"
                          >
                            <div>
                              <span className="font-semibold text-slate-800">{ins.item_nome}</span>
                              <div className="text-[10px] text-slate-500">
                                Nec: {ins.quantidade_necessaria} {ins.unidade_estoque} • Disp:{' '}
                                {ins.saldo_disponivel} {ins.unidade_estoque}
                                {ins.lote && ` • Lote: ${ins.lote}`}
                              </div>
                            </div>
                            <div className="text-right">
                              {ins.vencido ? (
                                <Badge className="bg-rose-100 text-rose-800 text-[10px] border-rose-300">
                                  Vencido
                                </Badge>
                              ) : ins.saldo_suficiente ? (
                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] border-emerald-300">
                                  Saldo OK
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-100 text-rose-800 text-[10px] border-rose-300">
                                  Insuficiente
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">
                          Ponto de Estoque / Almoxarifado de Saída
                        </label>
                        <Input
                          value={pontoEstoque}
                          onChange={(e) => setPontoEstoque(e.target.value)}
                          className="h-7 text-xs bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {statusOperacional === 'nao_distribuido' && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded">
                  <label className="font-semibold text-rose-900 block mb-1">
                    Motivo / Justificativa Obrigatória *
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="ex: Paciente em jejum para cirurgia; recusa alimentar; paciente ausente para exame..."
                    value={motivoNaoDistribuido}
                    onChange={(e) => setMotivoNaoDistribuido(e.target.value)}
                    required
                    className="bg-white text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Temperatura Aferida
                  </label>
                  <Input
                    placeholder="ex: 65°C"
                    value={temperatura}
                    onChange={(e) => setTemperatura(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Responsável pela Entrega
                  </label>
                  <Input
                    placeholder="Nome do copeiro/entregador"
                    value={responsavelEntrega}
                    onChange={(e) => setResponsavelEntrega(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Observações da Entrega
                </label>
                <Input
                  placeholder="ex: Aceitação integral; porção extra de água..."
                  value={observacoesOperacionais}
                  onChange={(e) => setObservacoesOperacionais(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="text-[10px] text-slate-400 font-mono">
                Idempotency-Key: {idempotencyKey}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalRegistroAberta(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSalvarDistribuicao}
              disabled={salvando}
            >
              {salvando ? 'Gravando no Servidor...' : 'Confirmar Registro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
