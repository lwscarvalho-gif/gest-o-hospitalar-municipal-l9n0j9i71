import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  ItemFarmacia,
  DispensacaoFarmacia,
  Paciente,
  TipoItemFarmacia,
  TipoMovimentoFarmacia,
  UnidadeMedidaFarmacia,
  PrescricaoMedica,
} from '@/types/hospital'
import {
  listarItensFarmacia,
  criarItemFarmacia,
  atualizarItemFarmacia,
  registrarDispensacao,
  listarDispensacoes,
} from '@/services/farmacia'
import { listarPacientes } from '@/services/cadastros'
import { listarPrescricoes } from '@/services/prescricoes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  Pill,
  Package,
  Plus,
  Search,
  AlertTriangle,
  History,
  CheckCircle2,
  Clock,
  Layers,
  ArrowDownRight,
  Filter,
  User,
  RefreshCw,
  ClipboardCheck,
} from 'lucide-react'
import { InventarioFarmaciaTab } from './InventarioFarmaciaTab'

export const FarmaciaView: React.FC = () => {
  const { user, temPermissao } = useAuth()
  const { toast } = useToast()

  const podeCadastrarCatalogo = temPermissao(['admin', 'gestor'])
  const podeCriarFecharInventario = temPermissao(['admin', 'gestor'])
  const podeAcessarInventario = temPermissao(['admin', 'gestor', 'profissional'])

  // Estados principais
  const [activeSubTab, setActiveSubTab] = useState<
    'catalogo' | 'dispensacao' | 'historico' | 'inventario'
  >('dispensacao')
  const [itens, setItens] = useState<ItemFarmacia[]>([])
  const [dispensacoes, setDispensacoes] = useState<DispensacaoFarmacia[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [prescricoesAtivas, setPrescricoesAtivas] = useState<PrescricaoMedica[]>([])
  const [loading, setLoading] = useState(true)

  // Modalidade de dispensação: 'avulsa' ou 'prescricao'
  const [modoDispensacao, setModoDispensacao] = useState<'avulsa' | 'prescricao'>('prescricao')
  const [prescricaoSelecionadaId, setPrescricaoSelecionadaId] = useState('')

  // Filtros
  const [buscaItem, setBuscaItem] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'medicamento' | 'material'>('todos')
  const [filtroHistoricoPaciente, setFiltroHistoricoPaciente] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')

  // Modais
  const [modalItemAberto, setModalItemAberto] = useState(false)
  const [itemEmEdicao, setItemEmEdicao] = useState<ItemFarmacia | null>(null)
  const [modalDispensacaoAberto, setModalDispensacaoAberto] = useState(false)

  // Formulário de Item (Catálogo)
  const [formItemNome, setFormItemNome] = useState('')
  const [formItemTipo, setFormItemTipo] = useState<TipoItemFarmacia>('medicamento')
  const [formItemPrincipioAtivo, setFormItemPrincipioAtivo] = useState('')
  const [formItemApresentacao, setFormItemApresentacao] = useState('')
  const [formItemUnidade, setFormItemUnidade] = useState<UnidadeMedidaFarmacia>('comprimido')
  const [formItemLote, setFormItemLote] = useState('')
  const [formItemValidade, setFormItemValidade] = useState('')
  const [formItemEstoqueAtual, setFormItemEstoqueAtual] = useState('100')
  const [formItemEstoqueMinimo, setFormItemEstoqueMinimo] = useState('20')
  const [formItemAtivo, setFormItemAtivo] = useState(true)
  const [formItemObservacoes, setFormItemObservacoes] = useState('')
  const [salvandoItem, setSalvandoItem] = useState(false)

  // Formulário de Dispensação
  const [dispPacienteId, setDispPacienteId] = useState('')
  const [dispItemId, setDispItemId] = useState('')
  const [dispQuantidade, setDispQuantidade] = useState('1')
  const [dispPrescricao, setDispPrescricao] = useState('')
  const [dispTipoMovimento, setDispTipoMovimento] =
    useState<TipoMovimentoFarmacia>('dispensacao_paciente')
  const [dispSetorDestino, setDispSetorDestino] = useState('')
  const [dispObservacoes, setDispObservacoes] = useState('')
  const [salvandoDispensacao, setSalvandoDispensacao] = useState(false)
  const [fluxoIdempotencyKey, setFluxoIdempotencyKey] = useState('')
  const [erroDispensacao, setErroDispensacao] = useState<string | null>(null)
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null)

  const carregarDados = async () => {
    setLoading(true)
    setErroCarregamento(null)
    try {
      const [itensData, pacData, dispData, prescsData] = await Promise.all([
        listarItensFarmacia(),
        listarPacientes(),
        listarDispensacoes(),
        listarPrescricoes({ status: 'ativa' }),
      ])
      setItens(itensData)
      setPacientes(pacData)
      setDispensacoes(dispData)
      setPrescricoesAtivas(prescsData)
    } catch (e: any) {
      console.error(e)
      const msg = e?.message || 'Tente recarregar a página.'
      setErroCarregamento(`Não foi possível carregar os dados da farmácia: ${msg}`)
      toast({
        title: 'Erro ao carregar dados da farmácia',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Limpar e abrir modal de item
  const abrirModalNovoItem = () => {
    setItemEmEdicao(null)
    setFormItemNome('')
    setFormItemTipo('medicamento')
    setFormItemPrincipioAtivo('')
    setFormItemApresentacao('')
    setFormItemUnidade('comprimido')
    setFormItemLote('')
    setFormItemValidade('')
    setFormItemEstoqueAtual('100')
    setFormItemEstoqueMinimo('20')
    setFormItemAtivo(true)
    setFormItemObservacoes('')
    setModalItemAberto(true)
  }

  const abrirModalEditarItem = (it: ItemFarmacia) => {
    setItemEmEdicao(it)
    setFormItemNome(it.nome)
    setFormItemTipo(it.tipo)
    setFormItemPrincipioAtivo(it.principio_ativo || '')
    setFormItemApresentacao(it.apresentacao || '')
    setFormItemUnidade(it.unidade_medida)
    setFormItemLote(it.lote || '')
    setFormItemValidade(it.validade || '')
    setFormItemEstoqueAtual(String(it.estoque_atual))
    setFormItemEstoqueMinimo(String(it.estoque_minimo || 0))
    setFormItemAtivo(it.ativo !== false)
    setFormItemObservacoes(it.observacoes || '')
    setModalItemAberto(true)
  }

  const handleSalvarItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formItemNome.trim()) {
      toast({ title: 'Informe o nome do item.', variant: 'destructive' })
      return
    }

    setSalvandoItem(true)
    try {
      const dados: Partial<ItemFarmacia> = {
        nome: formItemNome.trim(),
        tipo: formItemTipo,
        principio_ativo: formItemPrincipioAtivo.trim(),
        apresentacao: formItemApresentacao.trim(),
        unidade_medida: formItemUnidade,
        lote: formItemLote.trim(),
        validade: formItemValidade,
        estoque_atual: Number(formItemEstoqueAtual || 0),
        estoque_minimo: Number(formItemEstoqueMinimo || 0),
        ativo: formItemAtivo,
        observacoes: formItemObservacoes.trim(),
      }

      if (itemEmEdicao) {
        await atualizarItemFarmacia(itemEmEdicao.id, dados)
        toast({ title: 'Item atualizado com sucesso!' })
      } else {
        await criarItemFarmacia(dados)
        toast({ title: 'Item cadastrado no catálogo farmacêutico!' })
      }

      setModalItemAberto(false)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar item',
        description: err.message || 'Verifique os dados preenchidos.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoItem(false)
    }
  }

  // Abertura do modal de dispensação
  const abrirModalDispensacao = (preSelectedItemId?: string) => {
    setDispItemId(preSelectedItemId || (itens.length > 0 ? itens[0].id : ''))
    setDispPacienteId(pacientes.length > 0 ? pacientes[0].id : '')
    setDispQuantidade('1')
    setDispPrescricao('')
    setDispTipoMovimento('dispensacao_paciente')
    setDispSetorDestino('')
    setDispObservacoes('')
    // Gera ID único persistente de idempotência na abertura do fluxo
    setFluxoIdempotencyKey(`disp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)
    setModalDispensacaoAberto(true)
  }

  const itemSelecionadoParaDisp = itens.find((i) => i.id === dispItemId)

  const handleSalvarDispensacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dispPacienteId) {
      toast({ title: 'Selecione o paciente recebedor.', variant: 'destructive' })
      return
    }
    if (!dispItemId) {
      toast({ title: 'Selecione o item a dispensar.', variant: 'destructive' })
      return
    }
    const qtd = Number(dispQuantidade)
    if (isNaN(qtd) || qtd <= 0) {
      toast({ title: 'Quantidade deve ser maior que zero.', variant: 'destructive' })
      return
    }

    if (itemSelecionadoParaDisp && qtd > itemSelecionadoParaDisp.estoque_atual) {
      toast({
        title: 'Estoque insuficiente!',
        description: `Disponível em estoque: ${itemSelecionadoParaDisp.estoque_atual} ${itemSelecionadoParaDisp.unidade_medida}(s). Você solicitou: ${qtd}.`,
        variant: 'destructive',
      })
      return
    }

    if (salvandoDispensacao) return
    setSalvandoDispensacao(true)
    setErroDispensacao(null)
    try {
      const keyToUse =
        fluxoIdempotencyKey || `disp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const prescObj = prescricoesAtivas.find((p) => p.id === prescricaoSelecionadaId)
      const res = await registrarDispensacao({
        pacienteId: dispPacienteId,
        itemId: dispItemId,
        quantidade: qtd,
        lote: itemSelecionadoParaDisp?.lote,
        idempotencyKey: keyToUse,
        prescricaoOrigem:
          modoDispensacao === 'prescricao' && prescObj
            ? `Prescrição #${prescObj.id.slice(0, 7)} (${prescObj.medico_nome || 'Médico'})`
            : dispPrescricao.trim(),
        profissionalDispensador: user?.name || 'Farmácia Municipal',
        tipoMovimento: dispTipoMovimento,
        setorDestino: dispSetorDestino.trim(),
        observacoes: dispObservacoes.trim(),
        prescricaoRelacionadaId:
          modoDispensacao === 'prescricao' ? prescricaoSelecionadaId || undefined : undefined,
        internacaoId: modoDispensacao === 'prescricao' ? prescObj?.internacao : undefined,
        atendimentoPaId: modoDispensacao === 'prescricao' ? prescObj?.atendimento_pa : undefined,
      })

      if (res.idempotenteReutilizado) {
        toast({
          title: 'Operação Idempotente (Reenvio Detectado)',
          description: `Retornado o registro original (#${res.dispensacao.id.slice(0, 7)}) sem aplicar segunda baixa de estoque.`,
        })
      } else {
        toast({
          title: 'Dispensação realizada com sucesso!',
          description: `Baixa automática de ${qtd} unidade(s) efetuada no estoque.`,
        })
      }
      setErroDispensacao(null)
      setModalDispensacaoAberto(false)
      setFluxoIdempotencyKey('')
      await carregarDados()
    } catch (err: any) {
      const msg = err?.message || 'Não foi possível concluir a saída de estoque.'
      // Preservação do texto: modal e inputs mantidos em memória
      setErroDispensacao(
        `Erro na dispensação: ${msg}. Os dados informados foram preservados na tela.`,
      )
      toast({
        title: 'Falha na Dispensação — Dados Preservados',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSalvandoDispensacao(false)
    }
  }

  // Filtros aplicados
  const itensFiltrados = itens.filter((it) => {
    if (filtroTipo !== 'todos' && it.tipo !== filtroTipo) return false
    if (buscaItem.trim()) {
      const q = buscaItem.toLowerCase()
      const matchNome = it.nome.toLowerCase().includes(q)
      const matchPrincipio = (it.principio_ativo || '').toLowerCase().includes(q)
      const matchLote = (it.lote || '').toLowerCase().includes(q)
      if (!matchNome && !matchPrincipio && !matchLote) return false
    }
    return true
  })

  const dispensacoesFiltradas = dispensacoes.filter((d) => {
    if (filtroHistoricoPaciente && d.paciente !== filtroHistoricoPaciente) return false
    if (filtroDataInicio && d.data_dispensacao < filtroDataInicio) return false
    if (filtroDataFim && d.data_dispensacao > `${filtroDataFim} 23:59`) return false
    return true
  })

  // Métricas
  const totalItens = itens.length
  const medicamentosQtd = itens.filter((i) => i.tipo === 'medicamento').length
  const materiaisQtd = itens.filter((i) => i.tipo === 'material').length
  const itensBaixoEstoque = itens.filter(
    (i) => i.estoque_atual <= (i.estoque_minimo || 0) && i.estoque_atual > 0,
  ).length
  const itensZerados = itens.filter((i) => i.estoque_atual <= 0).length

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Módulo de Farmácia & Dispensação</h1>
              <p className="text-xs text-slate-500">
                Catálogo de medicamentos/materiais, controle de estoque com baixa automática e
                dispensação nominal por paciente
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={loading}
            className="text-slate-600"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            size="sm"
            onClick={() => abrirModalDispensacao()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5"
          >
            <ArrowDownRight className="w-4 h-4" /> Nova Dispensação
          </Button>

          {podeCadastrarCatalogo && (
            <Button
              size="sm"
              onClick={abrirModalNovoItem}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Cadastrar Item
            </Button>
          )}
        </div>
      </div>

      {/* Cartões de Indicadores rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Itens no Catálogo</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{totalItens}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {medicamentosQtd} medicamentos • {materiaisQtd} materiais
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total de Dispensações</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{dispensacoes.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Saídas registradas</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Estoque Mínimo / Alerta</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{itensBaixoEstoque}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Itens demandando reposição</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Itens Zerados</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{itensZerados}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Sem saldo para dispensar</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas do Módulo: Dispensação Rápida / Catálogo / Histórico */}
      <Tabs
        value={activeSubTab}
        onValueChange={(v) => setActiveSubTab(v as any)}
        className="w-full"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <TabsList className="bg-slate-200/80 p-1">
            <TabsTrigger
              value="dispensacao"
              className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-emerald-700"
            >
              <ArrowDownRight className="w-3.5 h-3.5 mr-1.5" />
              Dispensação / Saída
            </TabsTrigger>
            <TabsTrigger
              value="catalogo"
              className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              Catálogo de Medicamentos & Materiais ({itens.length})
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-purple-700"
            >
              <History className="w-3.5 h-3.5 mr-1.5" />
              Histórico de Dispensações ({dispensacoes.length})
            </TabsTrigger>
            {podeAcessarInventario && (
              <TabsTrigger
                value="inventario"
                className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-purple-900"
              >
                <ClipboardCheck className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                Inventário Físico & Perdas
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* 1. ABA DISPENSAÇÃO RÁPIDA */}
        <TabsContent value="dispensacao" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Painel Esquerdo: Formulário Direto de Dispensação */}
            <Card className="lg:col-span-1 border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                  <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                  Registrar Saída / Dispensação
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleSalvarDispensacao} className="space-y-3.5">
                  {/* SELETOR DE MODALIDADE: VINCULADA À PRESCRIÇÃO vs AVULSA */}
                  <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <Label className="text-xs font-semibold text-slate-800">
                      Modalidade de Dispensação
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setModoDispensacao('prescricao')}
                        className={`py-1.5 px-2 rounded border text-xs font-semibold transition-all ${
                          modoDispensacao === 'prescricao'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        Contra Prescrição Médica
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoDispensacao('avulsa')}
                        className={`py-1.5 px-2 rounded border text-xs font-semibold transition-all ${
                          modoDispensacao === 'avulsa'
                            ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        Dispensação Avulsa
                      </button>
                    </div>
                  </div>

                  {/* CASO CONTRA PRESCRIÇÃO: SELEÇÃO DA PRESCRIÇÃO ATIVA */}
                  {modoDispensacao === 'prescricao' && (
                    <div className="space-y-1">
                      <Label
                        htmlFor="farm_prescricao_ativa"
                        className="text-xs text-purple-900 font-bold cursor-pointer"
                      >
                        Prescrição Médica Ativa (PA ou Internação) *
                      </Label>
                      <select
                        id="farm_prescricao_ativa"
                        className="w-full mt-1 px-3 py-2 text-xs border border-purple-300 rounded-md bg-purple-50/50 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium text-purple-950"
                        value={prescricaoSelecionadaId}
                        onChange={(e) => {
                          const pId = e.target.value
                          setPrescricaoSelecionadaId(pId)
                          const pObj = prescricoesAtivas.find((p) => p.id === pId)
                          if (pObj) {
                            setDispPacienteId(pObj.paciente)
                            // Se tiver itens prescritos e algum coincidir com catálogo, já preseleciona
                            if (pObj.itens && pObj.itens.length > 0) {
                              const itPresc = pObj.itens[0]
                              const found = itens.find((it) =>
                                it.nome
                                  .toLowerCase()
                                  .includes(itPresc.medicamento_nome.toLowerCase()),
                              )
                              if (found) setDispItemId(found.id)
                            }
                          }
                        }}
                      >
                        <option value="">Selecione uma prescrição ativa...</option>
                        {prescricoesAtivas.map((p) => {
                          const pacNome = p.expand?.paciente?.nome || 'Paciente'
                          const isPA = p.origem === 'pronto_atendimento' || !!p.atendimento_pa
                          const origemTexto = isPA
                            ? '[PA - Pronto Atendimento]'
                            : `[Internação - Leito ${p.expand?.internacao?.expand?.leito_atual?.codigo || 'Geral'}]`
                          const itensStr =
                            p.itens
                              ?.map(
                                (i) =>
                                  `${i.medicamento_nome} (${i.via_administracao?.toUpperCase() || 'VO'})`,
                              )
                              .join(', ') || ''
                          return (
                            <option key={p.id} value={p.id}>
                              {origemTexto} {pacNome} — {itensStr ? `${itensStr}` : 'Prescrição'} (
                              {p.data_prescricao})
                            </option>
                          )
                        })}
                      </select>
                      {prescricoesAtivas.length === 0 && (
                        <p className="text-[11px] text-amber-700 pt-0.5">
                          Não há prescrições médicas ativas (PA ou internação) no momento. Você pode
                          mudar para a modalidade "Dispensação Avulsa".
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <Label
                      htmlFor="farm_paciente_recebedor"
                      className="text-xs text-slate-700 font-medium cursor-pointer"
                    >
                      Paciente Recebedor *
                    </Label>
                    <select
                      id="farm_paciente_recebedor"
                      className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={dispPacienteId}
                      onChange={(e) => setDispPacienteId(e.target.value)}
                      required
                    >
                      <option value="">Selecione o paciente...</option>
                      {pacientes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} {p.cartao_sus ? `(SUS: ${p.cartao_sus})` : ''}
                        </option>
                      ))}
                    </select>

                    {/* Alerta de Alergia do Paciente Selecionado */}
                    {dispPacienteId &&
                      (() => {
                        const pac = pacientes.find((p) => p.id === dispPacienteId)
                        if (!pac?.alergias) return null
                        return (
                          <div className="mt-1.5 p-2 rounded bg-red-50 border border-red-200 text-[11px] text-red-900 font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-600 inline-block animate-pulse" />
                            <span>Alergias do Paciente: {pac.alergias}</span>
                          </div>
                        )
                      })()}
                  </div>

                  <div>
                    <Label
                      htmlFor="farm_item_dispensar"
                      className="text-xs text-slate-700 font-medium cursor-pointer"
                    >
                      Item Farmacêutico *
                    </Label>
                    <select
                      id="farm_item_dispensar"
                      className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={dispItemId}
                      onChange={(e) => setDispItemId(e.target.value)}
                      required
                    >
                      <option value="">Selecione o item...</option>
                      {itens.map((it) => (
                        <option key={it.id} value={it.id} disabled={it.estoque_atual <= 0}>
                          {it.nome} • Saldo: {it.estoque_atual} {it.unidade_medida}(s)
                          {it.lote ? ` [Lote: ${it.lote}]` : ''}
                          {it.estoque_atual <= 0 ? ' (ZERADO)' : ''}
                        </option>
                      ))}
                    </select>
                    {itemSelecionadoParaDisp && (
                      <div className="mt-1.5 p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Estoque Atual:</span>
                          <strong
                            className={
                              itemSelecionadoParaDisp.estoque_atual <= 0
                                ? 'text-red-600'
                                : 'text-emerald-700'
                            }
                          >
                            {itemSelecionadoParaDisp.estoque_atual}{' '}
                            {itemSelecionadoParaDisp.unidade_medida}(s)
                          </strong>
                        </div>
                        {itemSelecionadoParaDisp.lote && (
                          <div className="flex justify-between">
                            <span>Lote Ativo:</span>
                            <span>{itemSelecionadoParaDisp.lote}</span>
                          </div>
                        )}
                        {itemSelecionadoParaDisp.validade && (
                          <div className="flex justify-between">
                            <span>Validade:</span>
                            <span>{itemSelecionadoParaDisp.validade}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label
                        htmlFor="farm_quantidade_disp"
                        className="text-xs text-slate-700 font-medium cursor-pointer"
                      >
                        Quantidade *
                      </Label>
                      <Input
                        id="farm_quantidade_disp"
                        type="number"
                        min="1"
                        max={itemSelecionadoParaDisp?.estoque_atual || 9999}
                        value={dispQuantidade}
                        onChange={(e) => setDispQuantidade(e.target.value)}
                        className="h-8 text-xs mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="farm_tipo_movimento"
                        className="text-xs text-slate-700 font-medium cursor-pointer"
                      >
                        Tipo Movimento
                      </Label>
                      <select
                        id="farm_tipo_movimento"
                        className="w-full mt-1 h-8 px-2 text-xs border border-slate-300 rounded-md bg-white"
                        value={dispTipoMovimento}
                        onChange={(e) => setDispTipoMovimento(e.target.value as any)}
                      >
                        <option value="dispensacao_paciente">Dispensação Paciente</option>
                        <option value="remessa_setor">Remessa Setorial</option>
                      </select>
                    </div>
                  </div>

                  {dispTipoMovimento === 'remessa_setor' && (
                    <div>
                      <Label
                        htmlFor="farm_setor_destino"
                        className="text-xs text-slate-700 font-medium cursor-pointer"
                      >
                        Setor Destino
                      </Label>
                      <Input
                        id="farm_setor_destino"
                        placeholder="Ex: Pronto Atendimento / Enfermaria B"
                        value={dispSetorDestino}
                        onChange={(e) => setDispSetorDestino(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  )}

                  <div>
                    <Label
                      htmlFor="farm_prescricao_origem"
                      className="text-xs text-slate-700 font-medium cursor-pointer"
                    >
                      Prescrição / Origem
                    </Label>
                    <Input
                      id="farm_prescricao_origem"
                      placeholder="Ex: Dr. Paulo - Receita PA nº 882"
                      value={dispPrescricao}
                      onChange={(e) => setDispPrescricao(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="farm_disp_obs"
                      className="text-xs text-slate-700 font-medium cursor-pointer"
                    >
                      Observações / Posologia
                    </Label>
                    <Textarea
                      id="farm_disp_obs"
                      placeholder="Posologia orientada ou motivo da remessa..."
                      value={dispObservacoes}
                      onChange={(e) => setDispObservacoes(e.target.value)}
                      className="text-xs mt-1 min-h-[60px]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={
                      salvandoDispensacao ||
                      !itemSelecionadoParaDisp ||
                      itemSelecionadoParaDisp.estoque_atual <= 0
                    }
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2"
                  >
                    {salvandoDispensacao ? 'Baixando estoque...' : 'Confirmar Dispensação & Baixa'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Painel Direito: Itens com Estoque Crítico & Últimas Saídas */}
            <div className="lg:col-span-2 space-y-4">
              {/* Alerta de Estoque Crítico */}
              {itens.filter((i) => i.estoque_atual <= (i.estoque_minimo || 0)).length > 0 && (
                <div className="p-3.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold">Itens com Estoque em Alerta ou Zerado</p>
                    <p className="text-amber-800">
                      Existem itens com quantidade menor ou igual ao estoque de segurança.
                      Providencie a reposição para evitar desabastecimento na farmácia hospitalar.
                    </p>
                  </div>
                </div>
              )}

              {/* Lista Rápida dos 10 Últimos Atendimentos de Dispensação */}
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Últimas Dispensações Registradas
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-blue-600"
                    onClick={() => setActiveSubTab('historico')}
                  >
                    Ver todo histórico &rarr;
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {dispensacoes.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Nenhuma dispensação realizada ainda. Use o formulário ao lado para registrar a
                      primeira saída.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs">
                      {dispensacoes.slice(0, 8).map((d) => (
                        <div
                          key={d.id}
                          className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">
                                {d.expand?.item?.nome || 'Item Farmacêutico'}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
                              >
                                -{d.quantidade} {d.expand?.item?.unidade_medida || 'un'}
                              </Badge>
                              {d.lote && (
                                <span className="text-[10px] text-slate-400">Lote: {d.lote}</span>
                              )}
                            </div>
                            <div className="text-slate-500 flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                <strong>{d.expand?.paciente?.nome || 'Paciente'}</strong>
                              </span>
                              {d.prescricao_origem && <span>• {d.prescricao_origem}</span>}
                            </div>
                          </div>
                          <div className="text-right text-slate-400 text-[11px] shrink-0">
                            <div>{d.data_dispensacao}</div>
                            <div className="text-slate-500 font-medium">
                              {d.profissional_dispensador}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 2. ABA CATÁLOGO DE MEDICAMENTOS E MATERIAIS */}
        <TabsContent value="catalogo" className="mt-4 space-y-4">
          {/* Barra de Filtro de Catálogo */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Buscar por nome, princípio ativo ou lote..."
                value={buscaItem}
                onChange={(e) => setBuscaItem(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-9 px-3 text-xs border border-slate-300 rounded-md bg-white"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value as any)}
              >
                <option value="todos">Todos os Tipos</option>
                <option value="medicamento">Medicamentos</option>
                <option value="material">Materiais Hospitalares</option>
              </select>
            </div>
          </div>

          {/* Tabela do Catálogo */}
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-3">Item / Apresentação</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Princípio Ativo</th>
                    <th className="p-3">Lote / Validade</th>
                    <th className="p-3 text-right">Estoque Atual</th>
                    <th className="p-3 text-right">Est. Mínimo</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itensFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">
                        Nenhum item localizado no catálogo farmacêutico com esses filtros.
                      </td>
                    </tr>
                  ) : (
                    itensFiltrados.map((it) => {
                      const baixoEstoque = it.estoque_atual <= (it.estoque_minimo || 0)
                      const zerado = it.estoque_atual <= 0

                      return (
                        <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{it.nome}</div>
                            {it.apresentacao && (
                              <div className="text-[11px] text-slate-500">{it.apresentacao}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                it.tipo === 'medicamento'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {it.tipo === 'medicamento' ? 'Medicamento' : 'Material'}
                            </Badge>
                          </td>
                          <td className="p-3 text-slate-600">{it.principio_ativo || '—'}</td>
                          <td className="p-3">
                            <div className="text-slate-700 font-medium">{it.lote || 'N/I'}</div>
                            {it.validade && (
                              <div className="text-[10px] text-slate-400">Vence: {it.validade}</div>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <span
                              className={`font-bold px-2 py-0.5 rounded ${
                                zerado
                                  ? 'bg-red-100 text-red-700'
                                  : baixoEstoque
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-50 text-emerald-800'
                              }`}
                            >
                              {it.estoque_atual} {it.unidade_medida}(s)
                            </span>
                          </td>
                          <td className="p-3 text-right text-slate-500">
                            {it.estoque_minimo ?? 0} {it.unidade_medida}(s)
                          </td>
                          <td className="p-3 text-center">
                            {it.ativo !== false ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] border-0">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400 text-[10px]">
                                Inativo
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                              onClick={() => abrirModalDispensacao(it.id)}
                              disabled={zerado}
                            >
                              Dispensar
                            </Button>
                            {podeCadastrarCatalogo && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] px-2 text-slate-600"
                                onClick={() => abrirModalEditarItem(it)}
                              >
                                Editar
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 3. ABA HISTÓRICO DE DISPENSAÇÕES */}
        <TabsContent value="historico" className="mt-4 space-y-4">
          {/* Filtros do Histórico (por paciente e período) */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <Label className="text-xs text-slate-700 font-medium">Filtrar por Paciente</Label>
              <select
                className="w-full mt-1 h-9 px-2 text-xs border border-slate-300 rounded-md bg-white"
                value={filtroHistoricoPaciente}
                onChange={(e) => setFiltroHistoricoPaciente(e.target.value)}
              >
                <option value="">Todos os pacientes</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-700 font-medium">Data Início</Label>
              <Input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="h-9 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-700 font-medium">Data Fim</Label>
              <Input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="h-9 text-xs mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs w-full"
                onClick={() => {
                  setFiltroHistoricoPaciente('')
                  setFiltroDataInicio('')
                  setFiltroDataFim('')
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>

          {/* Tabela do Histórico */}
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-3">Data / Hora</th>
                    <th className="p-3">Paciente</th>
                    <th className="p-3">Item Farmacêutico</th>
                    <th className="p-3 text-right">Quantidade</th>
                    <th className="p-3">Lote</th>
                    <th className="p-3">Prescrição / Movimento</th>
                    <th className="p-3">Dispensador Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispensacoesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Nenhum registro de dispensação encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    dispensacoesFiltradas.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-700 whitespace-nowrap">
                          {d.data_dispensacao}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">
                            {d.expand?.paciente?.nome || 'Paciente'}
                          </div>
                          {d.expand?.paciente?.cartao_sus && (
                            <div className="text-[10px] text-slate-400">
                              SUS: {d.expand.paciente.cartao_sus}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-800">
                            {d.expand?.item?.nome || 'Item Farmacêutico'}
                          </div>
                          {d.expand?.item?.principio_ativo && (
                            <div className="text-[10px] text-slate-500">
                              {d.expand.item.principio_ativo}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Badge
                            variant="outline"
                            className="font-bold text-emerald-800 bg-emerald-50 border-emerald-200"
                          >
                            {d.quantidade} {d.expand?.item?.unidade_medida || 'un'}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-600 font-mono text-[11px]">
                          {d.lote || '—'}
                        </td>
                        <td className="p-3">
                          <div className="text-slate-700">
                            {d.prescricao_origem || 'Uso Ambulatorial'}
                          </div>
                          {d.setor_destino && (
                            <div className="text-[10px] text-blue-600">
                              Destino: {d.setor_destino}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">
                          {d.profissional_dispensador || 'Farmácia'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 4. ABA INVENTÁRIO FÍSICO, DIVERGÊNCIAS, PERDAS & AUDITORIA */}
        {podeAcessarInventario && (
          <TabsContent value="inventario" className="mt-4 space-y-4">
            <InventarioFarmaciaTab
              userNome={user?.name || 'Operador de Farmácia'}
              podeCriarFechar={podeCriarFecharInventario}
              podeContarAjustar={podeAcessarInventario}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* MODAL 1: CADASTRAR / EDITAR ITEM NO CATÁLOGO */}
      <Dialog open={modalItemAberto} onOpenChange={setModalItemAberto}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">
              {itemEmEdicao
                ? 'Editar Item Farmacêutico'
                : 'Cadastrar Item no Catálogo Farmacêutico'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarItem} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label
                  htmlFor="item_nome"
                  className="text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Nome do Item *
                </Label>
                <Input
                  id="item_nome"
                  placeholder="Ex: Paracetamol 750mg ou Luva Procedimento M"
                  value={formItemNome}
                  onChange={(e) => setFormItemNome(e.target.value)}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>

              <div>
                <Label
                  htmlFor="item_tipo"
                  className="text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Tipo *
                </Label>
                <select
                  id="item_tipo"
                  className="w-full mt-1 h-8 px-2 text-xs border border-slate-300 rounded-md bg-white"
                  value={formItemTipo}
                  onChange={(e) => setFormItemTipo(e.target.value as any)}
                >
                  <option value="medicamento">Medicamento</option>
                  <option value="material">Material Hospitalar</option>
                </select>
              </div>

              <div>
                <Label
                  htmlFor="item_unidade"
                  className="text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Unidade de Medida *
                </Label>
                <select
                  id="item_unidade"
                  className="w-full mt-1 h-8 px-2 text-xs border border-slate-300 rounded-md bg-white"
                  value={formItemUnidade}
                  onChange={(e) => setFormItemUnidade(e.target.value as any)}
                >
                  <option value="comprimido">Comprimido</option>
                  <option value="ampola">Ampola</option>
                  <option value="frasco">Frasco</option>
                  <option value="unidade">Unidade</option>
                  <option value="caixa">Caixa</option>
                  <option value="envelope">Envelope</option>
                  <option value="tubo">Tubo</option>
                </select>
              </div>

              <div>
                <Label
                  htmlFor="item_principio_ativo"
                  className="text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Princípio Ativo
                </Label>
                <Input
                  id="item_principio_ativo"
                  placeholder="Ex: Paracetamol"
                  value={formItemPrincipioAtivo}
                  onChange={(e) => setFormItemPrincipioAtivo(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label
                  htmlFor="item_apresentacao"
                  className="text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Apresentação
                </Label>
                <Input
                  id="item_apresentacao"
                  placeholder="Ex: Caixa com 20 comp / Frasco 100ml"
                  value={formItemApresentacao}
                  onChange={(e) => setFormItemApresentacao(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label
                  htmlFor="item_lote"
                  className="text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Lote Inicial
                </Label>
                <Input
                  id="item_lote"
                  placeholder="Ex: LOTE-2024-X"
                  value={formItemLote}
                  onChange={(e) => setFormItemLote(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label
                  htmlFor="item_validade"
                  className="text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Data de Validade
                </Label>
                <Input
                  id="item_validade"
                  type="date"
                  value={formItemValidade}
                  onChange={(e) => setFormItemValidade(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label
                  htmlFor="item_estoque_atual"
                  className="text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Estoque Atual *
                </Label>
                <Input
                  id="item_estoque_atual"
                  type="number"
                  min="0"
                  value={formItemEstoqueAtual}
                  onChange={(e) => setFormItemEstoqueAtual(e.target.value)}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>

              <div>
                <Label
                  htmlFor="item_estoque_minimo"
                  className="text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Estoque Mínimo de Alerta
                </Label>
                <Input
                  id="item_estoque_minimo"
                  type="number"
                  min="0"
                  value={formItemEstoqueMinimo}
                  onChange={(e) => setFormItemEstoqueMinimo(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="item_ativo"
                  className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer mt-1"
                >
                  <input
                    id="item_ativo"
                    type="checkbox"
                    checked={formItemAtivo}
                    onChange={(e) => setFormItemAtivo(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Item Ativo no Catálogo (disponível para novas dispensações)
                </label>
              </div>

              <div className="sm:col-span-2">
                <Label
                  htmlFor="item_obs"
                  className="text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Observações Gerais
                </Label>
                <Textarea
                  id="item_obs"
                  placeholder="Indicações, cuidados de armazenamento (ex: refrigerado 2°C a 8°C)..."
                  value={formItemObservacoes}
                  onChange={(e) => setFormItemObservacoes(e.target.value)}
                  className="text-xs mt-1 min-h-[60px]"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalItemAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoItem}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {salvandoItem ? 'Salvando...' : 'Salvar no Catálogo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: DISPENSAÇÃO RÁPIDA (quando chamada por botão de atalho) */}
      <Dialog open={modalDispensacaoAberto} onOpenChange={setModalDispensacaoAberto}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ArrowDownRight className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Dispensação & Baixa de Estoque</span>
            </DialogTitle>
          </DialogHeader>

          {erroDispensacao && (
            <div
              role="alert"
              className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-950 text-xs flex items-start gap-2 shadow-sm"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{erroDispensacao}</span>
            </div>
          )}

          <form onSubmit={handleSalvarDispensacao} className="space-y-3.5 pt-1">
            <div>
              <Label
                htmlFor="m_disp_paciente"
                className="text-xs text-slate-700 font-medium cursor-pointer"
              >
                Paciente Recebedor *
              </Label>
              <select
                id="m_disp_paciente"
                className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={dispPacienteId}
                onChange={(e) => setDispPacienteId(e.target.value)}
                required
              >
                <option value="">Selecione o paciente...</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} {p.cartao_sus ? `(SUS: ${p.cartao_sus})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label
                htmlFor="m_disp_item"
                className="text-xs text-slate-700 font-medium cursor-pointer"
              >
                Item a Dispensar *
              </Label>
              <select
                id="m_disp_item"
                className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={dispItemId}
                onChange={(e) => setDispItemId(e.target.value)}
                required
              >
                <option value="">Selecione o item...</option>
                {itens.map((it) => (
                  <option key={it.id} value={it.id} disabled={it.estoque_atual <= 0}>
                    {it.nome} (Saldo: {it.estoque_atual} {it.unidade_medida})
                    {it.estoque_atual <= 0 ? ' - ZERADO' : ''}
                  </option>
                ))}
              </select>
              {itemSelecionadoParaDisp && (
                <div className="mt-1 text-[11px] text-slate-500 flex justify-between">
                  <span>Estoque disponível:</span>
                  <strong
                    className={
                      itemSelecionadoParaDisp.estoque_atual <= 0
                        ? 'text-red-600'
                        : 'text-emerald-700'
                    }
                  >
                    {itemSelecionadoParaDisp.estoque_atual} {itemSelecionadoParaDisp.unidade_medida}
                    (s)
                  </strong>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label
                  htmlFor="m_disp_qtd"
                  className="text-xs text-slate-700 font-medium cursor-pointer"
                >
                  Quantidade *
                </Label>
                <Input
                  id="m_disp_qtd"
                  type="number"
                  min="1"
                  max={itemSelecionadoParaDisp?.estoque_atual || 999}
                  value={dispQuantidade}
                  onChange={(e) => setDispQuantidade(e.target.value)}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
              <div>
                <Label
                  htmlFor="m_disp_mov"
                  className="text-xs text-slate-700 font-medium cursor-pointer"
                >
                  Movimento
                </Label>
                <select
                  id="m_disp_mov"
                  className="w-full mt-1 h-8 px-2 text-xs border border-slate-300 rounded-md bg-white"
                  value={dispTipoMovimento}
                  onChange={(e) => setDispTipoMovimento(e.target.value as any)}
                >
                  <option value="dispensacao_paciente">Paciente</option>
                  <option value="remessa_setor">Remessa Setor</option>
                </select>
              </div>
            </div>

            <div>
              <Label
                htmlFor="m_disp_prescricao"
                className="text-xs text-slate-700 font-medium cursor-pointer"
              >
                Prescrição / Origem
              </Label>
              <Input
                id="m_disp_prescricao"
                placeholder="Ex: Receita PA nº 109 / Dr. Marcos"
                value={dispPrescricao}
                onChange={(e) => setDispPrescricao(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>

            <div>
              <Label
                htmlFor="m_disp_observacoes"
                className="text-xs text-slate-700 font-medium cursor-pointer"
              >
                Observações
              </Label>
              <Textarea
                id="m_disp_observacoes"
                placeholder="Posologia orientada ou anotação..."
                value={dispObservacoes}
                onChange={(e) => setDispObservacoes(e.target.value)}
                className="text-xs mt-1 min-h-[50px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalDispensacaoAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  salvandoDispensacao ||
                  !itemSelecionadoParaDisp ||
                  itemSelecionadoParaDisp.estoque_atual <= 0
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {salvandoDispensacao ? 'Baixando...' : 'Confirmar Saída'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
