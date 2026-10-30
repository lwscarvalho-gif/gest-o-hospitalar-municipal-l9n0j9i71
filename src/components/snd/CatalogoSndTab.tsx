import React, { useState } from 'react'
import { ItemCardapioRefeicao, DietaCatalogoSND, CategoriaDietaSND } from '@/types/hospital'
import {
  criarRefeicaoCardapio,
  inativarRefeicaoCardapio,
  criarDietaCatalogo,
  inativarDietaCatalogo,
} from '@/services/snd'
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
  Utensils,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Scale,
} from 'lucide-react'
import { ModalFichaComposicao } from './ModalFichaComposicao'
import { useToast } from '@/hooks/use-toast'

interface CatalogoSndTabProps {
  refeicoes: ItemCardapioRefeicao[]
  dietas: DietaCatalogoSND[]
  onAtualizar: () => void
  podeEditar: boolean
}

const CATEGORIAS_CONFIG: Record<
  CategoriaDietaSND,
  { label: string; badgeClass: string; desc: string }
> = {
  oral: {
    label: 'Via Oral / Rotina',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    desc: 'Dietas de consistência geral, branda, pastosa, líquida ou livre',
  },
  rotina: {
    label: 'Rotina Hospitalar',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    desc: 'Cardápios padrão para pacientes sem restrições metabólicas específicas',
  },
  enteral: {
    label: 'Nutrição Enteral',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    desc: 'Administração por sonda nasoenteral, gastrostomia ou jejunostomia',
  },
  parenteral: {
    label: 'Nutrição Parenteral (NPT)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    desc: 'Infusão venosa por cateter central ou periférico',
  },
  especial: {
    label: 'Especial / Metabólica',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    desc: 'Dietas para nefropatas, diabéticos, hepatopatas ou imunossuprimidos',
  },
}

export const CatalogoSndTab: React.FC<CatalogoSndTabProps> = ({
  refeicoes,
  dietas,
  onAtualizar,
  podeEditar,
}) => {
  const { toast } = useToast()
  const [modalRefeicaoAberta, setModalRefeicaoAberta] = useState(false)
  const [modalDietaAberta, setModalDietaAberta] = useState(false)
  const [modalComposicaoAberta, setModalComposicaoAberta] = useState(false)
  const [itemParaInativar, setItemParaInativar] = useState<{
    tipo: 'refeicao' | 'dieta'
    id: string
    nome: string
  } | null>(null)
  const [motivoInativacao, setMotivoInativacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Formulário Nova Refeição
  const [novaRefCodigo, setNovaRefCodigo] = useState('')
  const [novaRefNome, setNovaRefNome] = useState('')
  const [novaRefHorario, setNovaRefHorario] = useState('08:00')
  const [novaRefOrdem, setNovaRefOrdem] = useState(refeicoes.length + 1)
  const [novaRefDescricao, setNovaRefDescricao] = useState('')

  // Formulário Novo Tipo de Dieta
  const [novaDietaCodigo, setNovaDietaCodigo] = useState('')
  const [novaDietaNome, setNovaDietaNome] = useState('')
  const [novaDietaCategoria, setNovaDietaCategoria] = useState<CategoriaDietaSND>('oral')
  const [novaDietaConsistencia, setNovaDietaConsistencia] = useState('livre')
  const [novaDietaComposicao, setNovaDietaComposicao] = useState('')
  const [novaDietaIndicacao, setNovaDietaIndicacao] = useState('')

  const handleSalvarRefeicao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaRefCodigo.trim() || !novaRefNome.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o código identificador e o nome da refeição.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      await criarRefeicaoCardapio({
        codigo: novaRefCodigo.trim().toLowerCase(),
        nome: novaRefNome.trim(),
        horario_padrao: novaRefHorario,
        ordem_dia: Number(novaRefOrdem) || 1,
        descricao: novaRefDescricao.trim(),
        ativo: true,
      })
      toast({
        title: 'Refeição cadastrada',
        description: `Refeição "${novaRefNome}" adicionada com sucesso ao cardápio.`,
      })
      setModalRefeicaoAberta(false)
      setNovaRefCodigo('')
      setNovaRefNome('')
      setNovaRefDescricao('')
      onAtualizar()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao cadastrar',
        description: String(err instanceof Error ? err.message : err),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleSalvarDieta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaDietaCodigo.trim() || !novaDietaNome.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o código e o nome do tipo de dieta.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      await criarDietaCatalogo({
        codigo: novaDietaCodigo.trim().toLowerCase(),
        nome: novaDietaNome.trim(),
        categoria: novaDietaCategoria,
        consistencia: novaDietaConsistencia.trim(),
        composicao_descricao: novaDietaComposicao.trim(),
        indicacao_padrao: novaDietaIndicacao.trim(),
        ativo: true,
      })
      toast({
        title: 'Tipo de dieta cadastrado',
        description: `Dieta "${novaDietaNome}" inserida no catálogo vigente.`,
      })
      setModalDietaAberta(false)
      setNovaDietaCodigo('')
      setNovaDietaNome('')
      setNovaDietaComposicao('')
      setNovaDietaIndicacao('')
      onAtualizar()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao cadastrar',
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
          'Descreva a justificativa formal para a inativação no SND (mínimo 3 caracteres).',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      if (itemParaInativar.tipo === 'refeicao') {
        await inativarRefeicaoCardapio(itemParaInativar.id, motivoInativacao.trim())
      } else {
        await inativarDietaCatalogo(itemParaInativar.id, motivoInativacao.trim())
      }

      toast({
        title: 'Item inativado logicamente',
        description: 'O item foi inativado. Prescrições pregressas mantêm o histórico imutável.',
      })
      setItemParaInativar(null)
      setMotivoInativacao('')
      onAtualizar()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao inativar',
        description: String(err instanceof Error ? err.message : err),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Barra de Acesso à Composição de Insumos / Estoque */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-300">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
              Fichas Técnicas de Composição de Refeições & Baixa em Estoque
              <Badge className="bg-emerald-600 text-white text-[10px]">Requisito 7.4.3.5.c.i</Badge>
            </h3>
            <p className="text-xs text-emerald-800">
              Parametrize insumos, unidades de medida e fatores de conversão vinculados ao
              almoxarifado de nutrição. Gera snapshot imutável em cada evento de distribuição no
              leito.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 flex items-center gap-1.5 self-end md:self-auto"
          onClick={() => setModalComposicaoAberta(true)}
        >
          <Layers className="w-3.5 h-3.5" />
          Gerenciar Fichas de Composição
        </Button>
      </div>

      {/* Guia Informativo de Imutabilidade */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-600 leading-relaxed space-y-1">
          <p className="font-semibold text-slate-800">
            Regra Sanitária e Segurança do Paciente (Requisito 7.4.3.5.a.i–ii)
          </p>
          <p>
            Catálogos de refeições e dietas hospitalares são versionados e inativáveis logicamente.
            A exclusão física é bloqueada por integridade médica: inativar um tipo de dieta nunca
            altera nem compromete o snapshot histórico das prescrições já emitidas para pacientes
            internados ou atendidos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Cardápio e Horários de Refeições */}
        <Card className="lg:col-span-1 shadow-sm border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <Utensils className="w-4 h-4 text-emerald-600" />
                Refeições e Horários
              </CardTitle>
              <CardDescription className="text-xs">Grade padrão do dia hospitalar</CardDescription>
            </div>
            {podeEditar && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                onClick={() => setModalRefeicaoAberta(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Nova
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {refeicoes.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Nenhuma refeição cadastrada no cardápio.
              </p>
            ) : (
              refeicoes.map((ref) => (
                <div
                  key={ref.id}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                    ref.ativo
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800">{ref.nome}</span>
                      <span className="text-[10px] uppercase font-mono px-1 py-0.2 bg-slate-100 text-slate-600 rounded">
                        {ref.codigo}
                      </span>
                      {ref.ativo ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 border-emerald-300 text-emerald-700"
                        >
                          Ativa
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 border-slate-300 text-slate-500"
                        >
                          Inativa
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Horário padrão: {ref.horario_padrao}
                      </span>
                      <span>• Ordem {ref.ordem_dia}ª</span>
                    </div>
                    {ref.descricao && (
                      <p className="text-[11px] text-slate-500 italic">{ref.descricao}</p>
                    )}
                    {!ref.ativo && ref.motivo_inativacao && (
                      <p className="text-[10px] text-amber-700 font-medium">
                        Motivo: {ref.motivo_inativacao}
                      </p>
                    )}
                  </div>
                  {podeEditar && ref.ativo && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] text-slate-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() =>
                        setItemParaInativar({
                          tipo: 'refeicao',
                          id: ref.id,
                          nome: ref.nome,
                        })
                      }
                    >
                      Inativar
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Coluna 2 e 3: Catálogo Tipos de Dieta */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <Layers className="w-4 h-4 text-blue-600" />
                Catálogo de Tipos de Dieta (Oral / Enteral / Parenteral / Especial)
              </CardTitle>
              <CardDescription className="text-xs">
                Opções clínicas homologadas disponíveis para prescrição médica e nutricional
              </CardDescription>
            </div>
            {podeEditar && (
              <Button
                size="sm"
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setModalDietaAberta(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Cadastrar Dieta
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {dietas.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                Nenhum tipo de dieta cadastrado no catálogo.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dietas.map((dieta) => {
                  const catCfg = CATEGORIAS_CONFIG[dieta.categoria] || CATEGORIAS_CONFIG.oral
                  return (
                    <div
                      key={dieta.id}
                      className={`p-3 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                        dieta.ativo
                          ? 'bg-white border-slate-200 hover:border-slate-300'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-900 text-sm">
                                {dieta.nome}
                              </span>
                              <span className="text-[10px] uppercase font-mono px-1 py-0.5 bg-slate-100 text-slate-600 rounded">
                                {dieta.codigo}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              Versão {dieta.versao || 1}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0 px-2 ${catCfg.badgeClass}`}
                          >
                            {catCfg.label}
                          </Badge>
                        </div>

                        {dieta.consistencia && (
                          <div className="text-[11px] text-slate-600">
                            <strong className="text-slate-700">Consistência:</strong>{' '}
                            {dieta.consistencia}
                          </div>
                        )}
                        {dieta.composicao_descricao && (
                          <p className="text-[11px] text-slate-600 line-clamp-2">
                            <strong className="text-slate-700">Composição:</strong>{' '}
                            {dieta.composicao_descricao}
                          </p>
                        )}
                        {dieta.indicacao_padrao && (
                          <p className="text-[11px] text-slate-500 italic">
                            <strong className="text-slate-600">Indicação:</strong>{' '}
                            {dieta.indicacao_padrao}
                          </p>
                        )}
                        {!dieta.ativo && dieta.motivo_alteracao && (
                          <p className="text-[11px] text-amber-700 font-medium">
                            Inativação: {dieta.motivo_alteracao}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          {dieta.ativo ? 'Disponível para prescrição' : 'Inativada no catálogo'}
                        </span>
                        {podeEditar && dieta.ativo && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px] text-slate-500 hover:text-red-600 hover:bg-red-50 px-2"
                            onClick={() =>
                              setItemParaInativar({
                                tipo: 'dieta',
                                id: dieta.id,
                                nome: dieta.nome,
                              })
                            }
                          >
                            Inativar
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Nova Refeição */}
      <Dialog open={modalRefeicaoAberta} onOpenChange={setModalRefeicaoAberta}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Utensils className="w-5 h-5 text-emerald-600" />
              Cadastrar Refeição no Cardápio
            </DialogTitle>
            <DialogDescription className="text-xs">
              Adiciona um horário de distribuição padrão ao cardápio institucional do SND.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalvarRefeicao} className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Código Identificador (único) *
              </label>
              <Input
                placeholder="ex: colacao, ceia, almoco"
                value={novaRefCodigo}
                onChange={(e) => setNovaRefCodigo(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nome da Refeição *</label>
              <Input
                placeholder="ex: Colação Matinal, Ceia Noturna"
                value={novaRefNome}
                onChange={(e) => setNovaRefNome(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Horário Padrão *</label>
                <Input
                  type="time"
                  value={novaRefHorario}
                  onChange={(e) => setNovaRefHorario(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Ordem no Dia (1 a 10) *
                </label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={novaRefOrdem}
                  onChange={(e) => setNovaRefOrdem(Number(e.target.value))}
                  required
                />
              </div>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Descrição Operacional
              </label>
              <Textarea
                rows={2}
                placeholder="Instruções para a equipe de copa e montagem..."
                value={novaRefDescricao}
                onChange={(e) => setNovaRefDescricao(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalRefeicaoAberta(false)}
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
                {salvando ? 'Salvando...' : 'Confirmar e Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Novo Tipo de Dieta */}
      <Dialog open={modalDietaAberta} onOpenChange={setModalDietaAberta}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Cadastrar Tipo de Dieta no Catálogo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cadastra opção dietética parametrizável para uso nas prescrições médicas e
              nutricionais.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalvarDieta} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Código Único *</label>
                <Input
                  placeholder="ex: enteral_hiperproteica"
                  value={novaDietaCodigo}
                  onChange={(e) => setNovaDietaCodigo(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Categoria Clínica *
                </label>
                <select
                  className="w-full h-9 rounded-md border border-slate-300 px-3 bg-white text-xs"
                  value={novaDietaCategoria}
                  onChange={(e) => setNovaDietaCategoria(e.target.value as CategoriaDietaSND)}
                >
                  <option value="oral">Via Oral / Livre</option>
                  <option value="rotina">Rotina Hospitalar</option>
                  <option value="enteral">Nutrição Enteral</option>
                  <option value="parenteral">Nutrição Parenteral (NPT)</option>
                  <option value="especial">Especial / Metabólica</option>
                </select>
              </div>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nome da Dieta *</label>
              <Input
                placeholder="ex: Dieta Enteral Padrão com Fibras 1.2 kcal/ml"
                value={novaDietaNome}
                onChange={(e) => setNovaDietaNome(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Consistência / Textura
              </label>
              <Input
                placeholder="ex: pastosa, líquida completa, branda, infundível"
                value={novaDietaConsistencia}
                onChange={(e) => setNovaDietaConsistencia(e.target.value)}
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Composição e Características
              </label>
              <Textarea
                rows={2}
                placeholder="ex: Fracionamento padrão, densidade calórica, distribuição de macronutrientes..."
                value={novaDietaComposicao}
                onChange={(e) => setNovaDietaComposicao(e.target.value)}
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Indicação Clínica Padrão
              </label>
              <Textarea
                rows={2}
                placeholder="ex: Pacientes clínicos estáveis, pós-operatório imediato, disfagia orofaríngea leve..."
                value={novaDietaIndicacao}
                onChange={(e) => setNovaDietaIndicacao(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalDietaAberta(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={salvando}
              >
                {salvando ? 'Salvando...' : 'Confirmar e Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Gestão de Fichas de Composição */}
      <ModalFichaComposicao
        aberta={modalComposicaoAberta}
        onClose={() => setModalComposicaoAberta(false)}
        refeicoes={refeicoes}
        dietas={dietas}
        podeEditar={podeEditar}
      />

      {/* Modal Inativação Lógica */}
      <Dialog
        open={Boolean(itemParaInativar)}
        onOpenChange={(open) => !open && setItemParaInativar(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Inativação Lógica no SND
            </DialogTitle>
            <DialogDescription className="text-xs">
              Você está inativando: <strong>{itemParaInativar?.nome}</strong>. A exclusão física é
              bloqueada para resguardar o histórico médico das prescrições já emitidas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Motivo / Justificativa da Inativação *
              </label>
              <Textarea
                rows={3}
                placeholder="Informe o motivo técnico/sanitário (ex: descontinuação de insumo, revisão de rotina hospitalar)..."
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
    </div>
  )
}
