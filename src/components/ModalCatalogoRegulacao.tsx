import React, { useState } from 'react'
import {
  ItemCatalogoRecurso,
  ItemDestinoInterno,
  CategoriaRecursoRegulacao,
  TipoDestinoInterno,
  Setor,
} from '@/types/hospital'
import {
  alternarStatusRecurso,
  salvarItemRecurso,
  alternarStatusDestino,
  salvarDestinoInterno,
} from '@/services/regulacao'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Layers,
  MapPin,
  Plus,
  Power,
  PowerOff,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  Edit2,
  Lock,
} from 'lucide-react'

interface ModalCatalogoRegulacaoProps {
  aberto: boolean
  onClose: () => void
  recursos: ItemCatalogoRecurso[]
  destinos: ItemDestinoInterno[]
  setores: Setor[]
  usuarioNome: string
  podeEditar: boolean
  onAtualizado: () => void
}

export const ModalCatalogoRegulacao: React.FC<ModalCatalogoRegulacaoProps> = ({
  aberto,
  onClose,
  recursos,
  destinos,
  setores,
  usuarioNome,
  podeEditar,
  onAtualizado,
}) => {
  const { toast } = useToast()
  const [subAba, setSubAba] = useState<'recursos' | 'destinos'>('recursos')
  const [carregandoAcao, setCarregandoAcao] = useState(false)

  // Modais de edição/criação
  const [modalFormRecurso, setModalFormRecurso] = useState(false)
  const [itemRecursoEdit, setItemRecursoEdit] = useState<ItemCatalogoRecurso | null>(null)
  const [codigoRecurso, setCodigoRecurso] = useState('')
  const [nomeRecurso, setNomeRecurso] = useState('')
  const [categoriaRecurso, setCategoriaRecurso] = useState<CategoriaRecursoRegulacao>('leito')
  const [descRecurso, setDescRecurso] = useState('')
  const [tempoAlvoMinutos, setTempoAlvoMinutos] = useState(120)
  const [ativoRecurso, setAtivoRecurso] = useState(true)

  const [modalFormDestino, setModalFormDestino] = useState(false)
  const [itemDestinoEdit, setItemDestinoEdit] = useState<ItemDestinoInterno | null>(null)
  const [codigoDestino, setCodigoDestino] = useState('')
  const [nomeDestino, setNomeDestino] = useState('')
  const [tipoDestino, setTipoDestino] = useState<TipoDestinoInterno>('enfermaria')
  const [setorVinculadoId, setSetorVinculadoId] = useState('')
  const [blocoAla, setBlocoAla] = useState('')
  const [capacidade, setCapacidade] = useState(10)
  const [obsDestino, setObsDestino] = useState('')
  const [ativoDestino, setAtivoDestino] = useState(true)

  // Soft disable / toggle recurso
  const handleToggleRecurso = async (item: ItemCatalogoRecurso) => {
    if (!podeEditar) return
    setCarregandoAcao(true)
    try {
      const novoStatus = !item.ativo
      await alternarStatusRecurso(item.id, novoStatus, usuarioNome)
      toast({
        title: novoStatus ? 'Recurso Ativado' : 'Recurso Inativado (Soft Disable)',
        description: novoStatus
          ? `O item "${item.nome}" volta a aparecer para novas solicitações.`
          : `O item "${item.nome}" foi inativado. Solicitações antigas preservam o registro intacto sem perda de histórico.`,
      })
      onAtualizado()
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar status',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setCarregandoAcao(false)
    }
  }

  // Soft disable / toggle destino
  const handleToggleDestino = async (item: ItemDestinoInterno) => {
    if (!podeEditar) return
    setCarregandoAcao(true)
    try {
      const novoStatus = !item.ativo
      await alternarStatusDestino(item.id, novoStatus, usuarioNome)
      toast({
        title: novoStatus ? 'Destino Ativado' : 'Destino Inativado (Soft Disable)',
        description: novoStatus
          ? `O destino "${item.nome}" volta a ficar disponível.`
          : `O destino "${item.nome}" foi desativado sem apagar histórico assistencial de transferências.`,
      })
      onAtualizado()
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar status',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setCarregandoAcao(false)
    }
  }

  // Abrir form recurso
  const handleNovoRecurso = () => {
    setItemRecursoEdit(null)
    setCodigoRecurso(`REC_${Date.now().toString().slice(-4)}`)
    setNomeRecurso('')
    setCategoriaRecurso('leito')
    setDescRecurso('')
    setTempoAlvoMinutos(120)
    setAtivoRecurso(true)
    setModalFormRecurso(true)
  }

  const handleEditarRecurso = (item: ItemCatalogoRecurso) => {
    setItemRecursoEdit(item)
    setCodigoRecurso(item.codigo)
    setNomeRecurso(item.nome)
    setCategoriaRecurso(item.categoria)
    setDescRecurso(item.descricao || '')
    setTempoAlvoMinutos(item.tempo_alvo_minutos || 120)
    setAtivoRecurso(item.ativo)
    setModalFormRecurso(true)
  }

  const handleSalvarRecurso = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeRecurso.trim()) return
    setCarregandoAcao(true)
    try {
      await salvarItemRecurso({
        id: itemRecursoEdit?.id,
        codigo: codigoRecurso.trim().toLowerCase().replace(/\s+/g, '_'),
        nome: nomeRecurso.trim(),
        categoria: categoriaRecurso,
        descricao: descRecurso.trim(),
        ativo: ativoRecurso,
        tempo_alvo_minutos: Number(tempoAlvoMinutos) || 120,
        usuarioNome,
      })
      toast({
        title: itemRecursoEdit ? 'Recurso Atualizado' : 'Novo Recurso Parametrizado',
        description: `Configuração do catálogo salva com sucesso.`,
      })
      setModalFormRecurso(false)
      onAtualizado()
    } catch (err: any) {
      toast({
        title: 'Falha ao salvar recurso',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setCarregandoAcao(false)
    }
  }

  // Abrir form destino
  const handleNovoDestino = () => {
    setItemDestinoEdit(null)
    setCodigoDestino(`DEST_${Date.now().toString().slice(-4)}`)
    setNomeDestino('')
    setTipoDestino('enfermaria')
    setSetorVinculadoId('')
    setBlocoAla('')
    setCapacidade(10)
    setObsDestino('')
    setAtivoDestino(true)
    setModalFormDestino(true)
  }

  const handleEditarDestino = (item: ItemDestinoInterno) => {
    setItemDestinoEdit(item)
    setCodigoDestino(item.codigo)
    setNomeDestino(item.nome)
    setTipoDestino(item.tipo)
    setSetorVinculadoId(item.setor_vinculado || '')
    setBlocoAla(item.bloco_ala || '')
    setCapacidade(item.capacidade_operacional || 10)
    setObsDestino(item.observacoes || '')
    setAtivoDestino(item.ativo)
    setModalFormDestino(true)
  }

  const handleSalvarDestino = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeDestino.trim()) return
    setCarregandoAcao(true)
    try {
      await salvarDestinoInterno({
        id: itemDestinoEdit?.id,
        codigo: codigoDestino.trim().toUpperCase().replace(/\s+/g, '_'),
        nome: nomeDestino.trim(),
        tipo: tipoDestino,
        setor_vinculado: setorVinculadoId || undefined,
        bloco_ala: blocoAla.trim(),
        capacidade_operacional: Number(capacidade) || 10,
        ativo: ativoDestino,
        observacoes: obsDestino.trim(),
        usuarioNome,
      })
      toast({
        title: itemDestinoEdit ? 'Destino Atualizado' : 'Novo Destino Criado',
        description: `Destino interno gravado com sucesso.`,
      })
      setModalFormDestino(false)
      onAtualizado()
    } catch (err: any) {
      toast({
        title: 'Falha ao salvar destino',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setCarregandoAcao(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Catálogo Administrativo da Regulação
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Parametrização de recursos, leitos, especialidades e destinos internos. Suporta
                  ativação e inativação (soft disable) preservando 100% do histórico.
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-600">
              Sem exclusão física
            </Badge>
          </div>
        </DialogHeader>

        {/* Sub-abas Recursos / Destinos */}
        <div className="flex border-b border-slate-200 mt-2 gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setSubAba('recursos')}
            className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors ${
              subAba === 'recursos'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Recursos / Especialidades ({recursos.length})
          </button>
          <button
            type="button"
            onClick={() => setSubAba('destinos')}
            className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors ${
              subAba === 'destinos'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Destinos Internos Parametrizados ({destinos.length})
          </button>
        </div>

        {/* CONTEÚDO 1: RECURSOS */}
        {subAba === 'recursos' && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Itens inativos deixam de aparecer em novas solicitações, mas são mantidos em
                solicitações anteriores.
              </p>
              {podeEditar && (
                <Button
                  size="sm"
                  onClick={handleNovoRecurso}
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Novo Recurso
                </Button>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Nome do Recurso</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3">Tempo Alvo (Espera)</th>
                    <th className="py-2.5 px-3">Status</th>
                    {podeEditar && <th className="py-2.5 px-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recursos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Nenhum recurso cadastrado no catálogo.
                      </td>
                    </tr>
                  ) : (
                    recursos.map((rec) => (
                      <tr
                        key={rec.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          !rec.ativo ? 'bg-slate-50/40 opacity-75' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-700">
                          {rec.codigo}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          <div>{rec.nome}</div>
                          {rec.descricao && (
                            <div className="text-[10px] text-slate-400 font-normal line-clamp-1">
                              {rec.descricao}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 capitalize">
                          <Badge variant="outline" className="text-[10px]">
                            {rec.categoria}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                          {rec.tempo_alvo_minutos
                            ? `${rec.tempo_alvo_minutos} min`
                            : '120 min (padrão)'}
                        </td>
                        <td className="py-2.5 px-3">
                          {rec.ativo ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              Inativo (Soft)
                            </span>
                          )}
                        </td>
                        {podeEditar && (
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditarRecurso(rec)}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800"
                                title="Editar configurações"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleRecurso(rec)}
                                disabled={carregandoAcao}
                                className={`h-7 text-[11px] ${
                                  rec.ativo
                                    ? 'text-rose-700 hover:bg-rose-50 border-rose-200'
                                    : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                                }`}
                              >
                                {rec.ativo ? (
                                  <>
                                    <PowerOff className="w-3 h-3 mr-1" /> Inativar
                                  </>
                                ) : (
                                  <>
                                    <Power className="w-3 h-3 mr-1" /> Ativar
                                  </>
                                )}
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTEÚDO 2: DESTINOS INTERNOS */}
        {subAba === 'destinos' && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Alas, setores e unidades internas para onde pacientes da regulação podem ser
                direcionados.
              </p>
              {podeEditar && (
                <Button
                  size="sm"
                  onClick={handleNovoDestino}
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Novo Destino Interno
                </Button>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Nome do Destino</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Bloco / Ala</th>
                    <th className="py-2.5 px-3">Capacidade</th>
                    <th className="py-2.5 px-3">Status</th>
                    {podeEditar && <th className="py-2.5 px-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {destinos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Nenhum destino interno configurado.
                      </td>
                    </tr>
                  ) : (
                    destinos.map((dest) => (
                      <tr
                        key={dest.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          !dest.ativo ? 'bg-slate-50/40 opacity-75' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-700">
                          {dest.codigo}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{dest.nome}</td>
                        <td className="py-2.5 px-3 capitalize text-slate-600">
                          <Badge variant="outline" className="text-[10px]">
                            {dest.tipo}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{dest.bloco_ala || 'Geral'}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">
                          {dest.capacidade_operacional || 10} leitos
                        </td>
                        <td className="py-2.5 px-3">
                          {dest.ativo ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              Inativo (Soft)
                            </span>
                          )}
                        </td>
                        {podeEditar && (
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditarDestino(dest)}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleDestino(dest)}
                                disabled={carregandoAcao}
                                className={`h-7 text-[11px] ${
                                  dest.ativo
                                    ? 'text-rose-700 hover:bg-rose-50 border-rose-200'
                                    : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                                }`}
                              >
                                {dest.ativo ? (
                                  <>
                                    <PowerOff className="w-3 h-3 mr-1" /> Inativar
                                  </>
                                ) : (
                                  <>
                                    <Power className="w-3 h-3 mr-1" /> Ativar
                                  </>
                                )}
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </DialogFooter>

        {/* MODAL INTERNO: FORM RECURSO */}
        <Dialog open={modalFormRecurso} onOpenChange={setModalFormRecurso}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">
                {itemRecursoEdit ? 'Editar Recurso/Especialidade' : 'Novo Recurso da Regulação'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Defina o código interno e tempo-alvo de resposta.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSalvarRecurso} className="space-y-3 pt-2 text-xs">
              <div>
                <Label
                  htmlFor="cat_codigo_recurso"
                  className="font-semibold text-slate-700 block mb-1 cursor-pointer"
                >
                  Código Único *
                </Label>
                <Input
                  id="cat_codigo_recurso"
                  value={codigoRecurso}
                  onChange={(e) => setCodigoRecurso(e.target.value)}
                  disabled={!!itemRecursoEdit}
                  className="h-8 font-mono"
                  placeholder="Ex: leito_uti_pediatrica"
                  required
                />
              </div>

              <div>
                <Label
                  htmlFor="cat_nome_recurso"
                  className="font-semibold text-slate-700 block mb-1 cursor-pointer"
                >
                  Nome de Exibição *
                </Label>
                <Input
                  id="cat_nome_recurso"
                  value={nomeRecurso}
                  onChange={(e) => setNomeRecurso(e.target.value)}
                  className="h-8"
                  placeholder="Ex: Leito UTI Neonatal / Pediátrico"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label
                    htmlFor="cat_categoria_rec"
                    className="font-semibold text-slate-700 block mb-1 cursor-pointer"
                  >
                    Categoria *
                  </Label>
                  <select
                    id="cat_categoria_rec"
                    value={categoriaRecurso}
                    onChange={(e) => setCategoriaRecurso(e.target.value as any)}
                    className="w-full h-8 rounded border border-slate-200 px-2 bg-white"
                  >
                    <option value="leito">Leito</option>
                    <option value="especialidade">Especialidade Médica</option>
                    <option value="procedimento">Procedimento</option>
                    <option value="suporte">Suporte Tecnológico</option>
                  </select>
                </div>

                <div>
                  <Label
                    htmlFor="cat_tempo_alvo"
                    className="font-semibold text-slate-700 block mb-1 cursor-pointer"
                  >
                    Tempo Alvo (minutos)
                  </Label>
                  <Input
                    id="cat_tempo_alvo"
                    type="number"
                    min="1"
                    value={tempoAlvoMinutos}
                    onChange={(e) => setTempoAlvoMinutos(Number(e.target.value))}
                    className="h-8 font-mono"
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="cat_desc_recurso"
                  className="font-semibold text-slate-700 block mb-1 cursor-pointer"
                >
                  Descrição Técnica
                </Label>
                <Input
                  id="cat_desc_recurso"
                  value={descRecurso}
                  onChange={(e) => setDescRecurso(e.target.value)}
                  className="h-8"
                  placeholder="Detalhes sobre a indicação ou equipamentos inclusos"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk_ativo_rec"
                  checked={ativoRecurso}
                  onChange={(e) => setAtivoRecurso(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="chk_ativo_rec" className="text-slate-700 cursor-pointer">
                  Recurso ativo para novas solicitações
                </label>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalFormRecurso(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={carregandoAcao}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Salvar Recurso
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* MODAL INTERNO: FORM DESTINO */}
        <Dialog open={modalFormDestino} onOpenChange={setModalFormDestino}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">
                {itemDestinoEdit ? 'Editar Destino Interno' : 'Novo Destino Interno'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Parametrização de destino hospitalar interno para transferências.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSalvarDestino} className="space-y-3 pt-2 text-xs">
              <div>
                <Label
                  htmlFor="cat_codigo_destino"
                  className="font-semibold text-slate-700 block mb-1 cursor-pointer"
                >
                  Código do Destino *
                </Label>
                <Input
                  id="cat_codigo_destino"
                  value={codigoDestino}
                  onChange={(e) => setCodigoDestino(e.target.value)}
                  disabled={!!itemDestinoEdit}
                  className="h-8 font-mono"
                  placeholder="Ex: DEST_UTI_02"
                  required
                />
              </div>

              <div>
                <Label
                  htmlFor="cat_nome_destino"
                  className="font-semibold text-slate-700 block mb-1 cursor-pointer"
                >
                  Nome do Destino *
                </Label>
                <Input
                  id="cat_nome_destino"
                  value={nomeDestino}
                  onChange={(e) => setNomeDestino(e.target.value)}
                  className="h-8"
                  placeholder="Ex: Unidade Coronariana - Ala Leste"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label
                    htmlFor="cat_tipo_destino"
                    className="font-semibold text-slate-700 block mb-1 cursor-pointer"
                  >
                    Tipo de Unidade
                  </Label>
                  <select
                    id="cat_tipo_destino"
                    value={tipoDestino}
                    onChange={(e) => setTipoDestino(e.target.value as any)}
                    className="w-full h-8 rounded border border-slate-200 px-2 bg-white"
                  >
                    <option value="enfermaria">Enfermaria</option>
                    <option value="uti">UTI / Semi-intensiva</option>
                    <option value="centro_cirurgico">Centro Cirúrgico</option>
                    <option value="ambulatorio">Ambulatório</option>
                    <option value="isolamento">Isolamento</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <Label
                    htmlFor="cat_setor_vinculado"
                    className="font-semibold text-slate-700 block mb-1 cursor-pointer"
                  >
                    Setor Vinculado (Opcional)
                  </Label>
                  <select
                    id="cat_setor_vinculado"
                    value={setorVinculadoId}
                    onChange={(e) => setSetorVinculadoId(e.target.value)}
                    className="w-full h-8 rounded border border-slate-200 px-2 bg-white"
                  >
                    <option value="">Nenhum vínculo direto</option>
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label
                    htmlFor="cat_bloco_ala"
                    className="font-semibold text-slate-700 block mb-1 cursor-pointer"
                  >
                    Bloco / Ala
                  </Label>
                  <Input
                    id="cat_bloco_ala"
                    value={blocoAla}
                    onChange={(e) => setBlocoAla(e.target.value)}
                    className="h-8"
                    placeholder="Ex: Bloco B - 2º Andar"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="cat_capacidade"
                    className="font-semibold text-slate-700 block mb-1 cursor-pointer"
                  >
                    Capacidade Estimada
                  </Label>
                  <Input
                    id="cat_capacidade"
                    type="number"
                    min="1"
                    value={capacidade}
                    onChange={(e) => setCapacidade(Number(e.target.value))}
                    className="h-8 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk_ativo_dest"
                  checked={ativoDestino}
                  onChange={(e) => setAtivoDestino(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="chk_ativo_dest" className="text-slate-700 cursor-pointer">
                  Destino ativo para recebimento de solicitações
                </label>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalFormDestino(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={carregandoAcao}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Salvar Destino
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
