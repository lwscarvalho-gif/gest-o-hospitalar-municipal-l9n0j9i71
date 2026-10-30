import React, { useState, useEffect } from 'react'
import {
  ItemCardapioRefeicao,
  DietaCatalogoSND,
  ComposicaoRefeicaoSND,
  ItemComposicaoReceitaSND,
  ItemFarmacia,
} from '@/types/hospital'
import {
  listarComposicoesOperacionais,
  salvarComposicaoOperacional,
  inativarComposicaoOperacional,
} from '@/services/snd'
import { listarItensFarmacia } from '@/services/farmacia'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Layers,
  Plus,
  Trash2,
  AlertTriangle,
  History,
  Scale,
  Package,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ModalFichaComposicaoProps {
  aberta: boolean
  onClose: () => void
  refeicoes: ItemCardapioRefeicao[]
  dietas: DietaCatalogoSND[]
  podeEditar: boolean
}

export const ModalFichaComposicao: React.FC<ModalFichaComposicaoProps> = ({
  aberta,
  onClose,
  refeicoes,
  dietas,
  podeEditar,
}) => {
  const { toast } = useToast()

  // Estados de dados
  const [composicoes, setComposicoes] = useState<ComposicaoRefeicaoSND[]>([])
  const [itensEstoqueDisponiveis, setItensEstoqueDisponiveis] = useState<ItemFarmacia[]>([])
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Filtro na visualização das fichas
  const [filtroRefeicao, setFiltroRefeicao] = useState('')
  const [filtroDieta, setFiltroDieta] = useState('')

  // Modal de Nova / Editar / Versionar Ficha
  const [modalFormAberta, setModalFormAberta] = useState(false)
  const [fichaEdicao, setFichaEdicao] = useState<ComposicaoRefeicaoSND | null>(null)

  // Campos do formulário
  const [codigo, setCodigo] = useState('')
  const [refeicaoCodigo, setRefeicaoCodigo] = useState('')
  const [dietaRefId, setDietaRefId] = useState('')
  const [dietaCodigo, setDietaCodigo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [motivoAlteracao, setMotivoAlteracao] = useState('')
  const [itensReceita, setItensReceita] = useState<ItemComposicaoReceitaSND[]>([])

  // Modal de inativação lógica
  const [itemParaInativar, setItemParaInativar] = useState<ComposicaoRefeicaoSND | null>(null)
  const [motivoInativacao, setMotivoInativacao] = useState('')

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const [comps, estoque] = await Promise.all([
        listarComposicoesOperacionais(undefined, undefined, false), // traz todas para ver histórico e ativas
        listarItensFarmacia(undefined, true),
      ])
      setComposicoes(comps)
      setItensEstoqueDisponiveis(estoque)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao carregar fichas de composição',
        description: String(err instanceof Error ? err.message : err),
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (aberta) {
      carregarDados()
    }
  }, [aberta])

  const abrirNovaFicha = () => {
    setFichaEdicao(null)
    setCodigo('')
    setRefeicaoCodigo(refeicoes[0]?.codigo || 'almoco')
    setDietaRefId('')
    setDietaCodigo('todas')
    setDescricao('')
    setMotivoAlteracao('Versão inicial cadastrada')
    setItensReceita([])
    setModalFormAberta(true)
  }

  const abrirVersionamento = (comp: ComposicaoRefeicaoSND) => {
    setFichaEdicao(comp)
    setCodigo(comp.codigo)
    setRefeicaoCodigo(comp.refeicao_codigo)
    setDietaRefId(comp.dieta_catalogo_ref || '')
    setDietaCodigo(comp.dieta_codigo || 'todas')
    setDescricao(comp.descricao || '')
    setMotivoAlteracao(`Nova versão derivada da v${comp.versao}`)
    // Clona os itens para edição independente
    setItensReceita(
      comp.itens_composicao.map((it) => ({
        ...it,
      })),
    )
    setModalFormAberta(true)
  }

  const handleAdicionarInsumo = () => {
    if (itensEstoqueDisponiveis.length === 0) {
      toast({
        title: 'Estoque sem itens',
        description: 'Nenhum insumo disponível cadastrado no estoque/almoxarifado de nutrição.',
        variant: 'destructive',
      })
      return
    }

    const primeiro = itensEstoqueDisponiveis[0]
    setItensReceita((prev) => [
      ...prev,
      {
        item_estoque_id: primeiro.id,
        item_nome: primeiro.nome,
        unidade_consumo: primeiro.unidade_medida || 'unidade',
        quantidade_consumo: 1,
        unidade_estoque: primeiro.unidade_medida || 'unidade',
        fator_conversao: 1,
        quantidade_baixa_estoque: 1,
      },
    ])
  }

  const handleRemoverInsumo = (index: number) => {
    setItensReceita((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleAtualizarInsumo = (
    index: number,
    campo: keyof ItemComposicaoReceitaSND,
    valor: any,
  ) => {
    setItensReceita((prev) => {
      const clone = [...prev]
      const item = { ...clone[index] }

      if (campo === 'item_estoque_id') {
        const estItem = itensEstoqueDisponiveis.find((e) => e.id === valor)
        if (estItem) {
          item.item_estoque_id = estItem.id
          item.item_nome = estItem.nome
          item.unidade_estoque = estItem.unidade_medida || 'unidade'
          if (!item.unidade_consumo) {
            item.unidade_consumo = estItem.unidade_medida || 'unidade'
          }
        }
      } else {
        ;(item as any)[campo] = valor
      }

      // Recalcula baixa de estoque
      const qtd = Number(item.quantidade_consumo) || 0
      const fator = Number(item.fator_conversao) || 1
      item.quantidade_baixa_estoque = Number((qtd * fator).toFixed(4))

      clone[index] = item
      return clone
    })
  }

  const handleSalvarFicha = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!codigo.trim()) {
      toast({
        title: 'Código obrigatório',
        description: 'Informe um código identificador único para a ficha.',
        variant: 'destructive',
      })
      return
    }

    if (itensReceita.length === 0) {
      toast({
        title: 'Nenhum insumo incluído',
        description: 'Adicione ao menos um insumo do estoque para compor a ficha de nutrição.',
        variant: 'destructive',
      })
      return
    }

    // Validação de fatores
    for (const it of itensReceita) {
      if (it.quantidade_consumo <= 0) {
        toast({
          title: 'Quantidade inválida',
          description: `Quantidade do insumo "${it.item_nome}" deve ser maior que zero.`,
          variant: 'destructive',
        })
        return
      }
      if (
        it.unidade_consumo !== it.unidade_estoque &&
        (!it.fator_conversao || it.fator_conversao <= 0)
      ) {
        toast({
          title: 'Fator de conversão obrigatório',
          description: `Defina o fator de conversão de "${it.unidade_consumo}" para "${it.unidade_estoque}" no insumo "${it.item_nome}".`,
          variant: 'destructive',
        })
        return
      }
    }

    setSalvando(true)
    try {
      await salvarComposicaoOperacional({
        codigo: codigo.trim().toLowerCase(),
        refeicao_codigo: refeicaoCodigo.trim().toLowerCase(),
        dieta_catalogo_ref: dietaRefId || undefined,
        dieta_codigo: dietaCodigo.trim(),
        descricao: descricao.trim() || undefined,
        motivo_alteracao: motivoAlteracao.trim() || undefined,
        itens_composicao: itensReceita,
      })

      toast({
        title: 'Ficha salva com sucesso',
        description: `Ficha "${codigo}" gravada/versionada. Versão anterior inativada logicamente preservando histórico de consumos anteriores.`,
      })

      setModalFormAberta(false)
      carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar ficha de composição',
        description: String(err instanceof Error ? err.message : err),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleConfirmarInativacao = async () => {
    if (!itemParaInativar) return
    if (!motivoInativacao.trim() || motivoInativacao.trim().length < 3) {
      toast({
        title: 'Motivo obrigatório',
        description:
          'Informe uma justificativa formal para a inativação da ficha (mínimo 3 caracteres).',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      await inativarComposicaoOperacional(itemParaInativar.id, motivoInativacao.trim())
      toast({
        title: 'Ficha inativada logicamente',
        description:
          'A ficha não será mais aplicada em novas distribuições. Baixas anteriores mantêm o snapshot.',
      })
      setItemParaInativar(null)
      setMotivoInativacao('')
      carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao inativar ficha',
        description: String(err instanceof Error ? err.message : err),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Filtragem na listagem
  const composicoesFiltradas = composicoes.filter((comp) => {
    if (filtroRefeicao && comp.refeicao_codigo !== filtroRefeicao) return false
    if (filtroDieta && comp.dieta_codigo !== filtroDieta) return false
    return true
  })

  return (
    <>
      <Dialog open={aberta} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-900">
                <Layers className="w-5 h-5 text-emerald-600" />
                Fichas de Composição Operacional (Nutrição & Estoque)
              </span>
              <Badge variant="outline" className="text-[11px] bg-slate-100 text-slate-700">
                Item 7.4.3.5.c.i • Versionada
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Parametrização técnica de insumos do estoque por refeição e tipo de dieta. Gera
              snapshot congelado na baixa de distribuição. Inativação lógica e proibição de exclusão
              física.
            </DialogDescription>
          </DialogHeader>

          {/* Barra de Filtros e Ação */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                className="h-8 rounded-md border border-slate-300 px-2 bg-white text-xs"
                value={filtroRefeicao}
                onChange={(e) => setFiltroRefeicao(e.target.value)}
              >
                <option value="">Todas as Refeições</option>
                {refeicoes.map((r) => (
                  <option key={r.id} value={r.codigo}>
                    {r.nome} ({r.codigo})
                  </option>
                ))}
              </select>

              <select
                className="h-8 rounded-md border border-slate-300 px-2 bg-white text-xs"
                value={filtroDieta}
                onChange={(e) => setFiltroDieta(e.target.value)}
              >
                <option value="">Todos os Tipos de Dieta</option>
                <option value="todas">Geral (todas as dietas)</option>
                {dietas.map((d) => (
                  <option key={d.id} value={d.codigo}>
                    {d.nome} ({d.codigo})
                  </option>
                ))}
              </select>
            </div>

            {podeEditar && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 shrink-0 flex items-center gap-1.5"
                onClick={abrirNovaFicha}
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Ficha de Composição
              </Button>
            )}
          </div>

          {/* Listagem de Fichas */}
          <div className="space-y-3 py-2">
            {carregando ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Carregando fichas de composição operacional...
              </div>
            ) : composicoesFiltradas.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-lg">
                Nenhuma ficha de composição operacional cadastrada para os filtros informados.
              </div>
            ) : (
              composicoesFiltradas.map((comp) => {
                const totalInsumos = comp.itens_composicao?.length || 0
                return (
                  <Card
                    key={comp.id}
                    className={`border shadow-none text-xs transition-colors ${
                      comp.ativo
                        ? 'bg-white border-slate-200'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <CardContent className="p-3.5 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{comp.codigo}</span>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono uppercase bg-blue-50 text-blue-700 border-blue-200"
                            >
                              v{comp.versao}
                            </Badge>
                            {comp.ativo ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300"
                              >
                                Ativa
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-slate-100 text-slate-600 border-slate-300"
                              >
                                Inativa
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Refeição: <strong>{comp.refeicao_codigo.toUpperCase()}</strong> • Dieta:{' '}
                            <strong>{comp.dieta_codigo || 'todas'}</strong>
                            {comp.descricao && ` — ${comp.descricao}`}
                          </div>
                        </div>

                        {podeEditar && (
                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] border-slate-300 text-slate-700"
                              onClick={() => abrirVersionamento(comp)}
                            >
                              <History className="w-3.5 h-3.5 mr-1 text-blue-600" />
                              Nova Versão
                            </Button>
                            {comp.ativo && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[11px] text-slate-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => setItemParaInativar(comp)}
                              >
                                Inativar
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Tabela de Insumos da Ficha */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-700 block">
                          Insumos Cadastrados ({totalInsumos}):
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {comp.itens_composicao?.map((it, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-semibold text-slate-800">{it.item_nome}</span>
                                <div className="text-[10px] text-slate-500">
                                  Consumo:{' '}
                                  <strong>
                                    {it.quantidade_consumo} {it.unidade_consumo}
                                  </strong>
                                  {it.unidade_consumo !== it.unidade_estoque && (
                                    <span> • Fator: {it.fator_conversao}</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[11px] font-mono font-bold text-emerald-700">
                                  {it.quantidade_baixa_estoque} {it.unidade_estoque}
                                </span>
                                <span className="text-[9px] text-slate-400 block">
                                  baixa estimada
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {comp.motivo_alteracao && (
                        <p className="text-[10px] text-slate-400 italic">
                          Registro: {comp.motivo_alteracao} (por {comp.autor_nome || 'Operador'})
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button size="sm" variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Formulário: Criar / Versionar Ficha */}
      <Dialog open={modalFormAberta} onOpenChange={setModalFormAberta}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-600" />
              {fichaEdicao
                ? `Nova Versão da Ficha [${fichaEdicao.codigo}]`
                : 'Cadastrar Ficha de Composição'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {fichaEdicao
                ? `Cria uma versão incrementada da ficha. A versão anterior (v${fichaEdicao.versao}) é inativada logicamente, e consumos passados continuam congelados no snapshot anterior.`
                : 'Defina a refeição, o tipo de dieta e a receita técnica de insumos baixados do almoxarifado de nutrição.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarFicha} className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Código Único da Ficha *
                </label>
                <Input
                  placeholder="ex: almoco_geral, ceia_diabetico"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  disabled={Boolean(fichaEdicao)}
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Refeição do Cardápio *
                </label>
                <select
                  className="w-full h-8 rounded-md border border-slate-300 px-2 bg-white text-xs"
                  value={refeicaoCodigo}
                  onChange={(e) => setRefeicaoCodigo(e.target.value)}
                  required
                >
                  {refeicoes.map((r) => (
                    <option key={r.id} value={r.codigo}>
                      {r.nome} ({r.codigo})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Dieta Aplicável *</label>
                <select
                  className="w-full h-8 rounded-md border border-slate-300 px-2 bg-white text-xs"
                  value={dietaCodigo}
                  onChange={(e) => {
                    const cod = e.target.value
                    setDietaCodigo(cod)
                    const d = dietas.find((item) => item.codigo === cod)
                    setDietaRefId(d?.id || '')
                  }}
                  required
                >
                  <option value="todas">Geral (todas as dietas)</option>
                  {dietas.map((d) => (
                    <option key={d.id} value={d.codigo}>
                      {d.nome} ({d.codigo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Motivo do Versionamento / Cadastro *
                </label>
                <Input
                  placeholder="ex: Revisão calórica, substituição de insumo..."
                  value={motivoAlteracao}
                  onChange={(e) => setMotivoAlteracao(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Descrição / Instruções da Receita
              </label>
              <Textarea
                rows={2}
                placeholder="Detalhes operacionais para porcionamento e montagem..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Insumos da Receita */}
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 text-xs">
                    Insumos do Almoxarifado de Nutrição
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Defina a quantidade de consumo e o fator de conversão exato para a unidade do
                    estoque.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  onClick={handleAdicionarInsumo}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adicionar Insumo
                </Button>
              </div>

              {itensReceita.length === 0 ? (
                <div className="p-4 text-center text-slate-400 bg-slate-50 border border-dashed rounded-lg text-xs">
                  Nenhum insumo adicionado. Clique no botão acima para selecionar do estoque.
                </div>
              ) : (
                <div className="space-y-2">
                  {itensReceita.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-5">
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                            Item do Estoque
                          </label>
                          <select
                            className="w-full h-8 rounded border border-slate-300 px-2 bg-white text-xs"
                            value={it.item_estoque_id}
                            onChange={(e) =>
                              handleAtualizarInsumo(idx, 'item_estoque_id', e.target.value)
                            }
                          >
                            {itensEstoqueDisponiveis.map((est) => (
                              <option key={est.id} value={est.id}>
                                {est.nome} ({est.unidade_medida || 'un'}) - Saldo:{' '}
                                {est.estoque_atual}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                            Qtd Consumo
                          </label>
                          <Input
                            type="number"
                            step="any"
                            min="0.0001"
                            value={it.quantidade_consumo}
                            onChange={(e) =>
                              handleAtualizarInsumo(
                                idx,
                                'quantidade_consumo',
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="h-8 text-xs font-mono"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                            Unid Consumo
                          </label>
                          <Input
                            placeholder="ex: g, ml, un"
                            value={it.unidade_consumo}
                            onChange={(e) =>
                              handleAtualizarInsumo(idx, 'unidade_consumo', e.target.value)
                            }
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                            Fator Conversão
                          </label>
                          <Input
                            type="number"
                            step="any"
                            min="0.00001"
                            value={it.fator_conversao}
                            onChange={(e) =>
                              handleAtualizarInsumo(
                                idx,
                                'fator_conversao',
                                parseFloat(e.target.value) || 1,
                              )
                            }
                            className="h-8 text-xs font-mono"
                            title="Multiplicador para a unidade do estoque (ex: 1g = 0.001kg)"
                          />
                        </div>

                        <div className="sm:col-span-1 text-right self-end pb-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                            onClick={() => handleRemoverInsumo(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
                        <span>
                          Unidade no Estoque: <strong>{it.unidade_estoque}</strong>
                        </span>
                        <span className="font-mono text-emerald-700">
                          Baixa prevista:{' '}
                          <strong>
                            {it.quantidade_baixa_estoque} {it.unidade_estoque}
                          </strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalFormAberta(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={salvando}
              >
                {salvando ? 'Salvando Versão...' : 'Salvar Ficha de Composição'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Inativação Lógica */}
      <Dialog
        open={Boolean(itemParaInativar)}
        onOpenChange={(open) => !open && setItemParaInativar(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Inativação Lógica de Composição
            </DialogTitle>
            <DialogDescription className="text-xs">
              Você está inativando a ficha:{' '}
              <strong>
                {itemParaInativar?.codigo} (v{itemParaInativar?.versao})
              </strong>
              . A exclusão física é bloqueada no servidor para preservar o histórico e os snapshots
              de baixas de estoque efetuadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Motivo da Inativação *
              </label>
              <Textarea
                rows={3}
                placeholder="Informe a justificativa formal (ex: alteração de insumo pela nutricionista, descontinuação de cardápio)..."
                value={motivoInativacao}
                onChange={(e) => setMotivoInativacao(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItemParaInativar(null)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleConfirmarInativacao}
              disabled={salvando}
            >
              {salvando ? 'Inativando...' : 'Confirmar Inativação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
