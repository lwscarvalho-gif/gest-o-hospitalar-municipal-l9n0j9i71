import React, { useState, useEffect } from 'react'
import {
  InventarioFarmacia,
  ItemInventarioFarmacia,
  MovimentoEstoqueFarmacia,
  ItemFarmacia,
} from '@/types/hospital'
import {
  listarInventarios,
  obterInventario,
  iniciarInventario,
  registrarContagemFisica,
  fecharInventarioComConferencia,
  registrarPerdaEstoque,
  listarMovimentosEstoque,
  listarItensFarmacia,
} from '@/services/farmacia'
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
import { useToast } from '@/hooks/use-toast'
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Lock,
  Layers,
  FileWarning,
  History,
  ShieldCheck,
} from 'lucide-react'

interface Props {
  userNome?: string
  podeCriarFechar: boolean
  podeContarAjustar: boolean
}

export const InventarioFarmaciaTab: React.FC<Props> = ({
  userNome = 'Operador',
  podeCriarFechar,
  podeContarAjustar,
}) => {
  const { toast } = useToast()

  const [inventarios, setInventarios] = useState<InventarioFarmacia[]>([])
  const [inventarioAtivoId, setInventarioAtivoId] = useState<string>('')
  const [itensInventario, setItensInventario] = useState<ItemInventarioFarmacia[]>([])
  const [inventarioAtivo, setInventarioAtivo] = useState<InventarioFarmacia | null>(null)
  const [movimentos, setMovimentos] = useState<MovimentoEstoqueFarmacia[]>([])
  const [catalogoItens, setCatalogoItens] = useState<ItemFarmacia[]>([])
  const [loading, setLoading] = useState(false)

  // Sub-abas internas: 'contagem' | 'movimentos'
  const [secaoInventario, setSecaoInventario] = useState<'contagem' | 'movimentos'>('contagem')

  // Modais
  const [modalNovoInv, setModalNovoInv] = useState(false)
  const [tituloNovoInv, setTituloNovoInv] = useState('')
  const [obsNovoInv, setObsNovoInv] = useState('')
  const [criandoInv, setCriandoInv] = useState(false)

  const [modalContagem, setModalContagem] = useState(false)
  const [itemEmContagem, setItemEmContagem] = useState<ItemInventarioFarmacia | null>(null)
  const [qtdContadaInput, setQtdContadaInput] = useState('')
  const [justificativaContagem, setJustificativaContagem] = useState('')
  const [salvandoContagem, setSalvandoContagem] = useState(false)

  const [modalFechar, setModalFechar] = useState(false)
  const [justificativaFechamento, setJustificativaFechamento] = useState('')
  const [reconciliarForcado, setReconciliarForcado] = useState(false)
  const [fechandoInv, setFechandoInv] = useState(false)
  const [concorrenciaAlerta, setConcorrenciaAlerta] = useState<any[] | null>(null)

  // Modal de Testes Sintéticos Isolados
  const [modalTestes, setModalTestes] = useState(false)
  const [testando, setTestando] = useState(false)
  const [resultadoTestes, setResultadoTestes] = useState<any | null>(null)

  // Modal de Perdas (Validade / Avaria)
  const [modalPerda, setModalPerda] = useState(false)
  const [perdaItemId, setPerdaItemId] = useState('')
  const [perdaTipo, setPerdaTipo] = useState<'perda_validade' | 'perda_avaria'>('perda_validade')
  const [perdaQtd, setPerdaQtd] = useState('1')
  const [perdaJustificativa, setPerdaJustificativa] = useState('')
  const [salvandoPerda, setSalvandoPerda] = useState(false)

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [invList, movList, catList] = await Promise.all([
        listarInventarios(),
        listarMovimentosEstoque(),
        listarItensFarmacia(),
      ])
      setInventarios(invList)
      setMovimentos(movList)
      setCatalogoItens(catList)

      // Se não há ativo selecionado, seleciona o primeiro
      const idParaCarregar = inventarioAtivoId || (invList.length > 0 ? invList[0].id : '')
      if (idParaCarregar) {
        setInventarioAtivoId(idParaCarregar)
        const det = await obterInventario(idParaCarregar)
        if (det) {
          setInventarioAtivo(det.inventario)
          setItensInventario(det.itens)
        }
      } else {
        setInventarioAtivo(null)
        setItensInventario([])
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar inventários',
        description: 'Tente recarregar os dados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const selecionarInventario = async (id: string) => {
    setInventarioAtivoId(id)
    setConcorrenciaAlerta(null)
    setReconciliarForcado(false)
    setLoading(true)
    try {
      const det = await obterInventario(id)
      if (det) {
        setInventarioAtivo(det.inventario)
        setItensInventario(det.itens)
      }
    } finally {
      setLoading(false)
    }
  }

  // Abrir modal novo inventário
  const handleCriarInventario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tituloNovoInv.trim()) {
      toast({ title: 'Informe o título do inventário.', variant: 'destructive' })
      return
    }

    setCriandoInv(true)
    try {
      const res = await iniciarInventario({
        titulo: tituloNovoInv.trim(),
        responsavelAbertura: userNome,
        observacoes: obsNovoInv.trim(),
      })
      toast({
        title: 'Inventário aberto com sucesso!',
        description: `Snapshot gerado com ${res.totalItens} item(ns) para conferência física.`,
      })
      setModalNovoInv(false)
      setTituloNovoInv('')
      setObsNovoInv('')
      await carregarDados()
      await selecionarInventario(res.inventario.id)
    } catch (err: any) {
      toast({
        title: 'Falha ao abrir inventário',
        description: err.message || 'Verifique suas permissões.',
        variant: 'destructive',
      })
    } finally {
      setCriandoInv(false)
    }
  }

  // Registrar Contagem Física
  const abrirModalContagem = (item: ItemInventarioFarmacia) => {
    setItemEmContagem(item)
    setQtdContadaInput(
      item.quantidade_contada !== undefined && item.quantidade_contada !== null
        ? String(item.quantidade_contada)
        : String(item.quantidade_sistema_base),
    )
    setJustificativaContagem(item.justificativa_ajuste || '')
    setModalContagem(true)
  }

  const handleSalvarContagem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemEmContagem) return

    const contada = Number(qtdContadaInput)
    if (isNaN(contada) || contada < 0) {
      toast({ title: 'A quantidade contada deve ser zero ou positiva.', variant: 'destructive' })
      return
    }

    setSalvandoContagem(true)
    try {
      await registrarContagemFisica({
        itemInventarioId: itemEmContagem.id,
        quantidadeContada: contada,
        responsavelContagem: userNome,
        justificativaAjuste: justificativaContagem.trim(),
      })

      toast({
        title: 'Contagem física registrada!',
        description: `Item "${itemEmContagem.item_nome}" registrado com ${contada} unidade(s).`,
      })
      setModalContagem(false)
      if (inventarioAtivoId) {
        await selecionarInventario(inventarioAtivoId)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar contagem',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoContagem(false)
    }
  }

  // Fechar Inventário com Conferência Humana Obrigatória e Proteção de Concorrência
  const handleFecharInventario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inventarioAtivo) return
    if (!justificativaFechamento.trim()) {
      toast({
        title: 'Justificativa obrigatória!',
        description: 'Digite o motivo e parecer técnico para fechamento e aplicação de ajustes.',
        variant: 'destructive',
      })
      return
    }

    setFechandoInv(true)
    try {
      const res = await fecharInventarioComConferencia({
        inventarioId: inventarioAtivo.id,
        justificativaFechamento: justificativaFechamento.trim(),
        reconciliarConcorrencia: reconciliarForcado,
      })

      if (!res.sucesso && res.concorrencia_detectada) {
        setConcorrenciaAlerta(res.itens_concorrentes || [])
        toast({
          title: 'Fechamento Rejeitado por Concorrência!',
          description:
            'O estoque-base mudou durante a contagem (houve dispensações ou entradas). Exige conferência humana antes do ajuste.',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Inventário Concluído!',
        description: `Ajustes aplicados e auditados. ${res.total_divergencias || 0} divergência(s) reconciliada(s).`,
      })
      setModalFechar(false)
      setJustificativaFechamento('')
      setReconciliarForcado(false)
      setConcorrenciaAlerta(null)
      await carregarDados()
      await selecionarInventario(inventarioAtivo.id)
    } catch (err: any) {
      toast({
        title: 'Erro no fechamento do inventário',
        description: err.message || 'Verifique os dados.',
        variant: 'destructive',
      })
    } finally {
      setFechandoInv(false)
    }
  }

  // Registrar Perda por Validade ou Avaria
  const handleRegistrarPerda = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!perdaItemId) {
      toast({ title: 'Selecione o item com perda.', variant: 'destructive' })
      return
    }
    const qtd = Number(perdaQtd)
    if (isNaN(qtd) || qtd <= 0) {
      toast({ title: 'A quantidade deve ser maior que zero.', variant: 'destructive' })
      return
    }
    if (!perdaJustificativa.trim()) {
      toast({ title: 'Justificativa obrigatória!', variant: 'destructive' })
      return
    }

    setSalvandoPerda(true)
    try {
      const it = catalogoItens.find((i) => i.id === perdaItemId)
      await registrarPerdaEstoque({
        itemId: perdaItemId,
        tipo: perdaTipo,
        quantidade: qtd,
        justificativa: perdaJustificativa.trim(),
        lote: it?.lote,
        validade: it?.validade,
        localArmazenamento: it?.localizacao_farmacia,
      })

      toast({
        title: 'Perda registrada com sucesso!',
        description: `Movimento formal gravado e saldo atualizado. Histórico anterior 100% preservado.`,
      })
      setModalPerda(false)
      setPerdaJustificativa('')
      setPerdaQtd('1')
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Falha ao registrar perda',
        description: err.message || 'Verifique o saldo do item.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoPerda(false)
    }
  }

  const itensDivergentes = itensInventario.filter(
    (i) => i.status_conferencia === 'divergente' || (i.divergencia && i.divergencia !== 0),
  )

  return (
    <div className="space-y-6">
      {/* Barra de Ações do Inventário */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Inventário Físico & Auditoria de Estoque
              </h2>
              <p className="text-xs text-slate-500">
                Contagem física por item/lote/validade/local, reconciliação de divergências e saídas
                por perda/avaria
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

          {podeContarAjustar && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPerdaItemId(catalogoItens.length > 0 ? catalogoItens[0].id : '')
                setPerdaTipo('perda_validade')
                setPerdaQtd('1')
                setPerdaJustificativa('')
                setModalPerda(true)
              }}
              className="text-amber-800 border-amber-300 hover:bg-amber-50 flex items-center gap-1.5"
            >
              <FileWarning className="w-4 h-4 text-amber-600" />
              Registrar Perda / Avaria
            </Button>
          )}

          {podeCriarFechar && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  setModalTestes(true)
                  setTestando(true)
                  try {
                    const { executarTestesSinteticosFarmacia } =
                      await import('@/services/testesSinteticos')
                    const res = await executarTestesSinteticosFarmacia()
                    setResultadoTestes(res)
                  } catch (e: any) {
                    setResultadoTestes({
                      todos_passaram: false,
                      resultados: [{ cenario: 'erro', sucesso: false, erro: e.message }],
                    })
                  } finally {
                    setTestando(false)
                  }
                }}
                className="text-purple-700 border-purple-300 hover:bg-purple-50 flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Auditar Cenários Sintéticos
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setTituloNovoInv(
                    `Inventário Farmácia Geral - ${new Date().toLocaleDateString('pt-BR')}`,
                  )
                  setObsNovoInv('')
                  setModalNovoInv(true)
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Novo Inventário
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Sub-navegação interna */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setSecaoInventario('contagem')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
            secaoInventario === 'contagem'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          Contagem & Conferência
        </button>
        <button
          type="button"
          onClick={() => setSecaoInventario('movimentos')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
            secaoInventario === 'movimentos'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Movimentos de Estoque & Perdas ({movimentos.length})
        </button>
      </div>

      {secaoInventario === 'contagem' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Coluna Esquerda: Seletor de Inventários */}
          <Card className="lg:col-span-1 border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Inventários Realizados
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {inventarios.length}
              </Badge>
            </CardHeader>
            <CardContent className="p-2 space-y-1.5 max-h-[600px] overflow-y-auto">
              {inventarios.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Nenhum inventário iniciado. Clique em "Novo Inventário" para começar.
                </div>
              ) : (
                inventarios.map((inv) => {
                  const ativo = inv.id === inventarioAtivoId
                  const isConcluido = inv.status === 'concluido'
                  const isRejeitado = inv.status === 'rejeitado_concorrencia'

                  return (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => selecionarInventario(inv.id)}
                      className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                        ativo
                          ? 'bg-purple-50 border-purple-300 text-purple-950 font-medium shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono text-[10px] text-slate-500">
                          {inv.codigo_inventario}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 ${
                            isConcluido
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : isRejeitado
                                ? 'bg-red-50 text-red-700 border-red-300'
                                : 'bg-amber-50 text-amber-700 border-amber-300'
                          }`}
                        >
                          {isConcluido
                            ? 'Concluído'
                            : isRejeitado
                              ? 'Rejeitado (Concorrência)'
                              : 'Em Andamento'}
                        </Badge>
                      </div>
                      <p className="font-semibold text-slate-800 line-clamp-1">{inv.titulo}</p>
                      <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                        <span>Abertura: {inv.data_abertura.slice(0, 10)}</span>
                        <span>{inv.total_itens_inventariados || 0} itens</span>
                      </div>
                    </button>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Coluna Direita: Detalhes do Inventário e Contagem Física */}
          <div className="lg:col-span-3 space-y-4">
            {!inventarioAtivo ? (
              <Card className="p-12 text-center text-slate-400 text-xs bg-white border-slate-200">
                Selecione um inventário à esquerda ou inicie um novo inventário para visualizar a
                conferência física.
              </Card>
            ) : (
              <>
                {/* Cabeçalho do Inventário Selecionado */}
                <Card className="border-slate-200 shadow-sm bg-white p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-800">
                          {inventarioAtivo.titulo}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            inventarioAtivo.status === 'concluido'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : inventarioAtivo.status === 'rejeitado_concorrencia'
                                ? 'bg-red-50 text-red-700 border-red-300'
                                : 'bg-amber-50 text-amber-700 border-amber-300'
                          }`}
                        >
                          {inventarioAtivo.status === 'concluido'
                            ? 'Concluído / Ajustes Auditados'
                            : inventarioAtivo.status === 'rejeitado_concorrencia'
                              ? 'Rejeitado por Concorrência'
                              : 'Em Andamento'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Código:{' '}
                        <span className="font-mono">{inventarioAtivo.codigo_inventario}</span> •
                        Abertura: {inventarioAtivo.data_abertura} por{' '}
                        <strong>{inventarioAtivo.responsavel_abertura}</strong>
                        {inventarioAtivo.data_fechamento && (
                          <span>
                            {' '}
                            • Fechado em {inventarioAtivo.data_fechamento} por{' '}
                            <strong>{inventarioAtivo.responsavel_fechamento}</strong>
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {inventarioAtivo.status !== 'concluido' && podeCriarFechar && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setJustificativaFechamento('')
                            setReconciliarForcado(false)
                            setConcorrenciaAlerta(null)
                            setModalFechar(true)
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Conferir & Fechar Inventário
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Alerta de Concorrência se houver rejeição */}
                  {inventarioAtivo.status === 'rejeitado_concorrencia' && (
                    <div className="mt-3 p-3 rounded-lg border border-red-200 bg-red-50 text-red-900 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Atenção: Fechamento Rejeitado por Concorrência</p>
                        <p className="text-red-800 mt-0.5">
                          Durante a contagem, movimentos simultâneos de dispensação ou entrada
                          ocorreram no estoque do catálogo. O fechamento automático foi bloqueado
                          para impedir sobrescrita de dados. Realize a conferência e confirme a
                          reconciliação antes de aplicar os ajustes.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Resumo de Contagem */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center text-xs">
                    <div className="p-2 rounded bg-slate-50">
                      <span className="text-slate-500 block text-[11px]">Itens no Snapshot</span>
                      <strong className="text-base text-slate-800">{itensInventario.length}</strong>
                    </div>
                    <div className="p-2 rounded bg-blue-50">
                      <span className="text-blue-600 block text-[11px]">Contagens Realizadas</span>
                      <strong className="text-base text-blue-800">
                        {
                          itensInventario.filter(
                            (i) =>
                              i.quantidade_contada !== undefined && i.quantidade_contada !== null,
                          ).length
                        }
                      </strong>
                    </div>
                    <div className="p-2 rounded bg-amber-50">
                      <span className="text-amber-700 block text-[11px]">
                        Divergências Detectadas
                      </span>
                      <strong className="text-base text-amber-800">
                        {itensDivergentes.length}
                      </strong>
                    </div>
                  </div>
                </Card>

                {/* Tabela de Itens para Contagem Física */}
                <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                  <CardHeader className="p-3 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Itens do Inventário (Item / Lote / Validade / Local)
                    </CardTitle>
                    <span className="text-[11px] text-slate-400">
                      {itensInventario.length} itens registrados
                    </span>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <th className="p-3">Medicamento / Material</th>
                          <th className="p-3">Lote / Validade</th>
                          <th className="p-3">Local Armazenamento</th>
                          <th className="p-3 text-right">Estoque Base</th>
                          <th className="p-3 text-right">Qtd. Contada</th>
                          <th className="p-3 text-right">Divergência</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itensInventario.map((it) => {
                          const jaContado =
                            it.quantidade_contada !== undefined && it.quantidade_contada !== null
                          const div = it.divergencia || 0
                          const temDivergencia = div !== 0

                          return (
                            <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3">
                                <div className="font-semibold text-slate-800">{it.item_nome}</div>
                                {it.justificativa_ajuste && (
                                  <div className="text-[11px] text-slate-500 italic mt-0.5">
                                    Obs: {it.justificativa_ajuste}
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="text-slate-700 font-medium">{it.lote || 'N/I'}</div>
                                {it.validade && (
                                  <div className="text-[10px] text-slate-400">{it.validade}</div>
                                )}
                              </td>
                              <td className="p-3 text-slate-600">
                                {it.local_armazenamento || 'Almoxarifado Central'}
                              </td>
                              <td className="p-3 text-right font-medium text-slate-700">
                                {it.quantidade_sistema_base}
                              </td>
                              <td className="p-3 text-right">
                                {jaContado ? (
                                  <span className="font-bold text-slate-800">
                                    {it.quantidade_contada}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Pendente</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                {jaContado ? (
                                  <span
                                    className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                      temDivergencia
                                        ? div > 0
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-red-100 text-red-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {div > 0 ? `+${div}` : div}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    it.status_conferencia === 'ajustado'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : it.status_conferencia === 'divergente'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : it.status_conferencia === 'contado' ||
                                            it.status_conferencia === 'reconciliado'
                                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                                          : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {it.status_conferencia}
                                </Badge>
                              </td>
                              <td className="p-3 text-right">
                                {inventarioAtivo.status !== 'concluido' && podeContarAjustar ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => abrirModalContagem(it)}
                                    className="h-7 text-xs px-2 text-purple-700 border-purple-300 hover:bg-purple-50"
                                  >
                                    {jaContado ? 'Recontar' : 'Contar'}
                                  </Button>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Auditado</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Secao: Movimentos de Estoque & Perdas */
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                Histórico Imutável de Movimentos de Estoque & Perdas
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Todas as entradas, ajustes de sobra/falta de inventário e perdas por validade/avaria
                registradas formalmente sem apagar histórico
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {movimentos.length} movimentos registrados
            </Badge>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Item Farmacêutico</th>
                  <th className="p-3">Tipo de Movimento</th>
                  <th className="p-3 text-right">Qtd Movimentada</th>
                  <th className="p-3 text-right">Saldo Ant. &rarr; Novo</th>
                  <th className="p-3">Justificativa Registrada</th>
                  <th className="p-3">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movimentos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Nenhum movimento formal registrado ainda.
                    </td>
                  </tr>
                ) : (
                  movimentos.map((m) => {
                    const isPerda =
                      m.tipo_movimento === 'perda_validade' || m.tipo_movimento === 'perda_avaria'
                    const isAjusteSobra = m.tipo_movimento === 'ajuste_inventario_sobra'
                    const isAjusteFalta = m.tipo_movimento === 'ajuste_inventario_falta'

                    return (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-700 whitespace-nowrap">{m.data_hora}</td>
                        <td className="p-3 font-semibold text-slate-800">
                          {m.item_nome}
                          {m.lote && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              Lote: {m.lote}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              isPerda
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : isAjusteSobra
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : isAjusteFalta
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {m.tipo_movimento.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-800">
                          {m.quantidade} un
                        </td>
                        <td className="p-3 text-right text-slate-600 whitespace-nowrap">
                          {m.estoque_anterior} &rarr; <strong>{m.estoque_posterior}</strong>
                        </td>
                        <td className="p-3 text-slate-700 max-w-xs">{m.justificativa}</td>
                        <td className="p-3 text-slate-600">{m.responsavel_nome}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL TESTES SINTÉTICOS ISOLADOS */}
      <Dialog open={modalTestes} onOpenChange={setModalTestes}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              Auditoria de Cenários Sintéticos Isolados
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
              Executa cenários com fixtures sintéticas isoladas temporárias e limpeza automática:
              retry tardio com idempotência, concorrência vs. inventário, saldo insuficiente e
              rollback atômico.
            </div>

            {testando ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <RefreshCw className="w-6 h-6 text-purple-600 animate-spin mx-auto" />
                <p>Executando cenários de estresse transacional no backend...</p>
              </div>
            ) : resultadoTestes ? (
              <div className="space-y-3">
                <div
                  className={`p-3 rounded-lg border text-xs font-bold flex items-center gap-2 ${
                    resultadoTestes.todos_passaram
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-red-50 border-red-300 text-red-800'
                  }`}
                >
                  {resultadoTestes.todos_passaram ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Todos os cenários sintéticos passaram com sucesso comprovado!
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      Um ou mais cenários reportaram divergência.
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  {resultadoTestes.resultados?.map((r: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 font-mono text-[11px]">
                          {r.cenario}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            r.sucesso
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-red-50 text-red-700 border-red-300'
                          }
                        >
                          {r.sucesso ? 'PASSOU' : 'FALHOU'}
                        </Badge>
                      </div>
                      <p className="text-slate-600 text-[11px]">{r.detalhes || r.erro}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalTestes(false)}
              >
                Fechar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 1: ABRIR NOVO INVENTÁRIO */}
      <Dialog open={modalNovoInv} onOpenChange={setModalNovoInv}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-purple-600" />
              Abrir Novo Inventário de Farmácia
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCriarInventario} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium text-slate-700">Título do Inventário *</Label>
              <Input
                placeholder="Ex: Inventário Trimestral Almoxarifado Farmácia"
                value={tituloNovoInv}
                onChange={(e) => setTituloNovoInv(e.target.value)}
                className="text-xs mt-1"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700">Observações de Abertura</Label>
              <Textarea
                placeholder="Escopo da contagem, locais ou motivos da checagem..."
                value={obsNovoInv}
                onChange={(e) => setObsNovoInv(e.target.value)}
                className="text-xs mt-1 min-h-[60px]"
              />
            </div>

            <div className="p-3 rounded bg-purple-50 border border-purple-200 text-purple-900 text-xs">
              <p className="font-semibold">Snapshot Base:</p>
              <p className="text-[11px] text-purple-800 mt-0.5">
                Ao abrir, o sistema capturará o saldo atual de todos os itens do catálogo como base
                de comparação. Durante a contagem, dispensações podem continuar; o fechamento
                verificará se houve concorrência.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovoInv(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={criandoInv}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {criandoInv ? 'Abrindo...' : 'Abrir Inventário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: REGISTRAR CONTAGEM FÍSICA DO ITEM */}
      <Dialog open={modalContagem} onOpenChange={setModalContagem}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">
              Contagem Física: {itemEmContagem?.item_nome}
            </DialogTitle>
          </DialogHeader>

          {itemEmContagem && (
            <form onSubmit={handleSalvarContagem} className="space-y-4 pt-1">
              <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Lote:</span>
                  <strong className="text-slate-800">{itemEmContagem.lote || 'N/I'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Validade:</span>
                  <strong className="text-slate-800">{itemEmContagem.validade || 'N/I'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Local de Armazenamento:</span>
                  <strong className="text-slate-800">
                    {itemEmContagem.local_armazenamento || 'Almoxarifado Central'}
                  </strong>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                  <span className="text-slate-600 font-semibold">Estoque Base no Sistema:</span>
                  <strong className="text-purple-700">
                    {itemEmContagem.quantidade_sistema_base} un.
                  </strong>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Quantidade Física Contada *
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={qtdContadaInput}
                  onChange={(e) => setQtdContadaInput(e.target.value)}
                  className="text-sm font-bold mt-1"
                  required
                />
              </div>

              {qtdContadaInput !== '' && (
                <div className="p-2.5 rounded text-xs border">
                  {Number(qtdContadaInput) === itemEmContagem.quantidade_sistema_base ? (
                    <div className="text-emerald-700 flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      Sem divergência (Contagem idêntica ao sistema base).
                    </div>
                  ) : (
                    <div className="text-amber-800 space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Divergência detectada:{' '}
                        {Number(qtdContadaInput) - itemEmContagem.quantidade_sistema_base > 0
                          ? `+${Number(qtdContadaInput) - itemEmContagem.quantidade_sistema_base}`
                          : Number(qtdContadaInput) - itemEmContagem.quantidade_sistema_base}{' '}
                        un.
                      </div>
                      <p className="text-[11px] text-amber-700">
                        O ajuste no estoque só será aplicado no fechamento do inventário após
                        confirmação humana do gestor com justificativa obrigatória.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label className="text-xs font-medium text-slate-700">
                  Anotação / Justificativa da Contagem
                </Label>
                <Textarea
                  placeholder="Ex: Contagem realizada na prateleira B, conferida dupla checagem..."
                  value={justificativaContagem}
                  onChange={(e) => setJustificativaContagem(e.target.value)}
                  className="text-xs mt-1 min-h-[50px]"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalContagem(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={salvandoContagem}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {salvandoContagem ? 'Gravando...' : 'Salvar Contagem'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 3: FECHAR INVENTÁRIO (CONFERÊNCIA HUMANA OBRIGATÓRIA & CONCORRÊNCIA) */}
      <Dialog open={modalFechar} onOpenChange={setModalFechar}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Conferência Humana & Fechamento de Inventário
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleFecharInventario} className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p className="font-semibold text-slate-800">
                Resumo da Conferência antes de aplicar ajustes:
              </p>
              <p className="text-slate-600">
                • Itens no inventário: <strong>{itensInventario.length}</strong>
              </p>
              <p className="text-slate-600">
                • Divergências que gerarão movimentação formal:{' '}
                <strong className="text-amber-700">{itensDivergentes.length}</strong>
              </p>
            </div>

            {/* Alerta de Concorrência se o backend rejeitou */}
            {concorrenciaAlerta && concorrenciaAlerta.length > 0 && (
              <div className="p-3.5 rounded-lg border border-red-300 bg-red-50 text-red-950 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-red-800">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Concorrência Detectada: Estoque mudou durante a contagem!
                </div>
                <p className="text-red-900 text-[11px]">
                  Os seguintes itens sofreram saídas de dispensação ou novas entradas desde a
                  abertura deste inventário:
                </p>
                <div className="divide-y divide-red-200 text-[11px]">
                  {concorrenciaAlerta.map((c, idx) => (
                    <div key={idx} className="py-1 flex justify-between">
                      <span className="font-medium">{c.item_nome}</span>
                      <span>
                        Base abertura: {c.estoque_base_abertura} &rarr; Atual:{' '}
                        {c.estoque_atual_real} (dif: {c.diferenca_movimentada})
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-red-200">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-red-900">
                    <input
                      type="checkbox"
                      checked={reconciliarForcado}
                      onChange={(e) => setReconciliarForcado(e.target.checked)}
                      className="rounded border-red-300 text-red-600"
                    />
                    Declaro que reconferi as dispensações concorrentes e autorizo a reconciliação
                    definitiva
                  </label>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs font-bold text-slate-800">
                Justificativa Obrigatória do Gestor / Responsável *
              </Label>
              <p className="text-[11px] text-slate-500 mb-1">
                Obrigatório descrever a justificativa técnica para os ajustes de sobra e falta. Fica
                registrado na trilha de auditoria e movimentos de estoque.
              </p>
              <Textarea
                placeholder="Ex: Conferência física concluída com a equipe de farmácia. Divergências apuradas decorrentes de quebras e ajustes de embalagem fracionada..."
                value={justificativaFechamento}
                onChange={(e) => setJustificativaFechamento(e.target.value)}
                className="text-xs min-h-[80px]"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalFechar(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={fechandoInv || !justificativaFechamento.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {fechandoInv ? 'Fechando & Auditando...' : 'Confirmar Fechamento e Ajustes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: REGISTRAR PERDA POR VALIDADE OU AVARIA */}
      <Dialog open={modalPerda} onOpenChange={setModalPerda}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileWarning className="w-5 h-5 text-amber-600" />
              Registrar Saída por Perda / Avaria
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRegistrarPerda} className="space-y-4 pt-1">
            <div>
              <Label className="text-xs font-medium text-slate-700">Item Farmacêutico *</Label>
              <select
                className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
                value={perdaItemId}
                onChange={(e) => setPerdaItemId(e.target.value)}
                required
              >
                {catalogoItens.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.nome} (Saldo atual: {it.estoque_atual} {it.unidade_medida})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium text-slate-700">Tipo de Perda *</Label>
                <select
                  className="w-full mt-1 h-8 px-2 text-xs border border-slate-300 rounded-md bg-white font-medium"
                  value={perdaTipo}
                  onChange={(e) => setPerdaTipo(e.target.value as any)}
                >
                  <option value="perda_validade">Validade Vencida</option>
                  <option value="perda_avaria">Avaria / Quebra</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700">Quantidade Perdida *</Label>
                <Input
                  type="number"
                  min="1"
                  value={perdaQtd}
                  onChange={(e) => setPerdaQtd(e.target.value)}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-800">
                Justificativa Obrigatória *
              </Label>
              <Textarea
                placeholder="Ex: Frasco quebrado durante transporte interno / Lote vencido recolhido para incineração..."
                value={perdaJustificativa}
                onChange={(e) => setPerdaJustificativa(e.target.value)}
                className="text-xs mt-1 min-h-[60px]"
                required
              />
            </div>

            <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <p className="font-semibold">Regra de Integridade:</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                O movimento de perda é gravado como saída própria, sem apagar ou reescrever o
                histórico anterior do item.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalPerda(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoPerda || !perdaJustificativa.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {salvandoPerda ? 'Gravando...' : 'Efetivar Baixa por Perda'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
