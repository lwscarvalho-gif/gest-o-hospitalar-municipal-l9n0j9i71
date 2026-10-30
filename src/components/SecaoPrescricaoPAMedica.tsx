import React, { useState, useEffect } from 'react'
import { ItemFarmacia, ViaAdministracaoMedicamento, PrescricaoMedica } from '@/types/hospital'
import { listarItensFarmacia } from '@/services/farmacia'
import {
  criarPrescricaoMedica,
  listarPrescricoes,
  ItemPrescricaoInput,
} from '@/services/prescricoes'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
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
import { Pill, Plus, Trash2, CheckCircle, Clock, AlertCircle, Syringe } from 'lucide-react'

const VIAS_DISPONIVEIS: { valor: ViaAdministracaoMedicamento; rotulo: string }[] = [
  { valor: 'oral', rotulo: 'Oral (VO)' },
  { valor: 'intravenosa', rotulo: 'Intravenosa (IV/EV)' },
  { valor: 'intramuscular', rotulo: 'Intramuscular (IM)' },
  { valor: 'subcutanea', rotulo: 'Subcutânea (SC)' },
  { valor: 'inalatoria', rotulo: 'Inalatória / Nebulização' },
  { valor: 'topica', rotulo: 'Tópica' },
  { valor: 'retal', rotulo: 'Retal' },
  { valor: 'oftalmica', rotulo: 'Oftálmica' },
  { valor: 'nasal', rotulo: 'Nasal' },
  { valor: 'outra', rotulo: 'Outra via' },
]

interface SecaoPrescricaoPAMedicaProps {
  pacienteId: string
  pacienteNome?: string
  atendimentoPaId: string
  onPrescricaoCriada?: (prescricao: PrescricaoMedica) => void
}

export const SecaoPrescricaoPAMedica: React.FC<SecaoPrescricaoPAMedicaProps> = ({
  pacienteId,
  pacienteNome,
  atendimentoPaId,
  onPrescricaoCriada,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [catalogoFarmacia, setCatalogoFarmacia] = useState<ItemFarmacia[]>([])
  const [prescricoesExistentes, setPrescricoesExistentes] = useState<PrescricaoMedica[]>([])
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(false)
  const [carregandoPrescricoes, setCarregandoPrescricoes] = useState(false)
  const [salvandoPrescricao, setSalvandoPrescricao] = useState(false)

  // Itens em rascunho da nova prescrição
  const [itensRascunho, setItensRascunho] = useState<ItemPrescricaoInput[]>([])

  // Formulário do item atual
  const [itemSelecionadoId, setItemSelecionadoId] = useState('')
  const [farmacoManual, setFarmacoManual] = useState('')
  const [apresentacao, setApresentacao] = useState('')
  const [dose, setDose] = useState('')
  const [posologia, setPosologia] = useState('')
  const [viaAdministracao, setViaAdministracao] =
    useState<ViaAdministracaoMedicamento>('intravenosa')
  const [orientacoes, setOrientacoes] = useState('')
  const [obsGerais, setObsGerais] = useState('')

  useEffect(() => {
    carregarCatalogo()
    carregarPrescricoesPA()
  }, [atendimentoPaId])

  const carregarCatalogo = async () => {
    setCarregandoCatalogo(true)
    try {
      const itens = await listarItensFarmacia()
      setCatalogoFarmacia(itens)
    } catch (err) {
      console.error('Erro ao carregar catálogo da farmácia:', err)
    } finally {
      setCarregandoCatalogo(false)
    }
  }

  const carregarPrescricoesPA = async () => {
    if (!atendimentoPaId) return
    setCarregandoPrescricoes(true)
    try {
      const lista = await listarPrescricoes({
        atendimentoPaId,
      })
      setPrescricoesExistentes(lista)
    } catch (err) {
      console.error('Erro ao carregar prescrições do PA:', err)
    } finally {
      setCarregandoPrescricoes(false)
    }
  }

  const handleSelecionarItemCatalogo = (itemId: string) => {
    setItemSelecionadoId(itemId)
    const item = catalogoFarmacia.find((i) => i.id === itemId)
    if (item) {
      setFarmacoManual(item.nome)
      setApresentacao(item.apresentacao || item.unidade_medida || '')
    }
  }

  const handleAdicionarItem = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()

    const nomeMedicamento = farmacoManual.trim()
    if (!nomeMedicamento) {
      toast({
        title: 'Fármaco obrigatório',
        description: 'Informe o fármaco/medicamento a ser administrado.',
        variant: 'destructive',
      })
      return
    }

    if (!posologia.trim()) {
      toast({
        title: 'Posologia obrigatória',
        description: 'Informe a posologia (ex: "Dose única agora", "8/8h se dor", etc.).',
        variant: 'destructive',
      })
      return
    }

    const itemCatalogo = catalogoFarmacia.find((i) => i.id === itemSelecionadoId)

    const doseFinal =
      [apresentacao.trim(), dose.trim()].filter(Boolean).join(' - ') || 'Dose padrão'

    const novoItem: ItemPrescricaoInput = {
      item_farmacia: itemSelecionadoId || undefined,
      medicamento_nome: nomeMedicamento,
      dose: doseFinal,
      via_administracao: viaAdministracao,
      frequencia: posologia.trim(),
      duracao: 'Urgência PA',
      instrucoes: orientacoes.trim() || undefined,
    }

    setItensRascunho((prev) => [...prev, novoItem])

    // Limpar campos de entrada
    setItemSelecionadoId('')
    setFarmacoManual('')
    setApresentacao('')
    setDose('')
    setPosologia('')
    setOrientacoes('')
    toast({
      title: 'Medicamento adicionado à lista',
      description: `${nomeMedicamento} (${viaAdministracao.toUpperCase()}) incluído na prescrição.`,
    })
  }

  const handleRemoverItem = (index: number) => {
    setItensRascunho((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleEmitirPrescricaoPA = async () => {
    if (itensRascunho.length === 0) {
      toast({
        title: 'Nenhum medicamento',
        description: 'Adicione pelo menos um medicamento para emitir a prescrição.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoPrescricao(true)
    try {
      const prescricaoCriada = await criarPrescricaoMedica({
        pacienteId,
        atendimentoPaId,
        origem: 'pronto_atendimento',
        medicoId: user?.id,
        medicoNome: user?.name || 'Médico Plantonista PA',
        observacoesGerais: obsGerais.trim() || 'Prescrição de medicação na unidade (PA)',
        itens: itensRascunho,
      })

      toast({
        title: 'Prescrição Emitida com Sucesso!',
        description: `Encaminhada automaticamente para a FARMÁCIA (dispensação) e para a ENFERMAGEM (administração e checagem).`,
      })

      // Limpar rascunho
      setItensRascunho([])
      setObsGerais('')

      // Recarregar histórico de prescrições da ficha
      await carregarPrescricoesPA()

      if (onPrescricaoCriada) {
        onPrescricaoCriada(prescricaoCriada)
      }
    } catch (err: any) {
      console.error(err)
      const msg = err?.message || 'Falha ao salvar prescrição médica no sistema.'
      // Preserva itens do rascunho em memória para não perder dados digitados
      toast({
        title: 'Erro ao Emitir Prescrição — Rascunho Preservado',
        description: `${msg}. Seus medicamentos digitados permanecem na tela.`,
        variant: 'destructive',
      })
    } finally {
      setSalvandoPrescricao(false)
    }
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-4">
      {/* Cabeçalho da seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <Syringe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Prescrição Médica na Unidade (Urgência / Emergência)
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                Integração Farmácia & Enfermagem
              </Badge>
            </h3>
            <p className="text-[11px] text-slate-600">
              Medicamentos a serem realizados <strong>na unidade</strong>. A prescrição vai
              automaticamente para a <strong>Farmácia dispensar</strong> e para a{' '}
              <strong>Enfermagem administrar e checar</strong>.
            </p>
          </div>
        </div>

        {prescricoesExistentes.length > 0 && (
          <Badge
            variant="outline"
            className="bg-white text-emerald-700 border-emerald-300 text-xs shrink-0"
          >
            {prescricoesExistentes.length} prescrição(ões) emitida(s) neste atendimento
          </Badge>
        )}
      </div>

      {/* Formulário de adição de medicamento */}
      <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm space-y-3">
        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Pill className="w-3.5 h-3.5 text-emerald-600" />
          Adicionar Medicamento (Padrão Médico: Fármaco, Apresentação, Posologia e Via)
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          {/* Fármaco / Catálogo */}
          <div className="md:col-span-5 space-y-1">
            <Label
              htmlFor="presc_farmaco_manual"
              className="text-[11px] font-semibold text-slate-700 cursor-pointer"
            >
              Fármaco / Medicamento *
            </Label>
            <div className="space-y-1.5">
              <Select value={itemSelecionadoId} onValueChange={handleSelecionarItemCatalogo}>
                <SelectTrigger
                  id="presc_item_catalogo"
                  aria-label="Selecione medicamento do catálogo"
                  className="text-xs bg-slate-50/50 h-8"
                >
                  <SelectValue placeholder="Selecione do catálogo da farmácia..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {catalogoFarmacia.map((it) => (
                    <SelectItem key={it.id} value={it.id} className="text-xs">
                      {it.nome} {it.apresentacao ? `(${it.apresentacao})` : ''} • Est:{' '}
                      {it.estoque_atual} {it.unidade_medida}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="presc_farmaco_manual"
                placeholder="Ou digite o nome do fármaco (ex: Dipirona, Morfina, Ondansetrona)..."
                value={farmacoManual}
                onChange={(e) => setFarmacoManual(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

          {/* Apresentação */}
          <div className="md:col-span-3 space-y-1">
            <Label
              htmlFor="presc_apresentacao"
              className="text-[11px] font-semibold text-slate-700 cursor-pointer"
            >
              Apresentação *
            </Label>
            <Input
              id="presc_apresentacao"
              placeholder="Ex: Ampola 500mg/mL, Frasco 100mL..."
              value={apresentacao}
              onChange={(e) => setApresentacao(e.target.value)}
              className="text-xs h-8"
            />
            <Label
              htmlFor="presc_dose"
              className="text-[11px] font-semibold text-slate-700 cursor-pointer pt-0.5 block"
            >
              Dose *
            </Label>
            <Input
              id="presc_dose"
              placeholder="Dose exata (ex: 1g, 4mg, 10 gotas)..."
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          {/* Via de Administração */}
          <div className="md:col-span-4 space-y-1">
            <Label
              htmlFor="presc_via"
              className="text-[11px] font-semibold text-slate-700 cursor-pointer"
            >
              Via de Administração *
            </Label>
            <Select
              value={viaAdministracao}
              onValueChange={(v) => setViaAdministracao(v as ViaAdministracaoMedicamento)}
            >
              <SelectTrigger
                id="presc_via"
                aria-label="Selecione a via de administração"
                className="text-xs h-8 bg-slate-50/50"
              >
                <SelectValue placeholder="Selecione a via" />
              </SelectTrigger>
              <SelectContent>
                {VIAS_DISPONIVEIS.map((via) => (
                  <SelectItem key={via.valor} value={via.valor} className="text-xs">
                    {via.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Label
              htmlFor="presc_posologia"
              className="text-[11px] font-semibold text-slate-700 pt-1 block cursor-pointer"
            >
              Posologia & Frequência *
            </Label>
            <Input
              id="presc_posologia"
              placeholder="Ex: Fazer agora em bolus; Em SF 0.9% 100mL..."
              value={posologia}
              onChange={(e) => setPosologia(e.target.value)}
              className="text-xs h-8"
            />
          </div>
        </div>

        {/* Orientações adicionais + botão de adicionar item */}
        <div className="flex flex-col sm:flex-row items-end gap-2 pt-1 border-t border-slate-100">
          <div className="flex-1 w-full space-y-1">
            <Label
              htmlFor="presc_orientacoes_enf"
              className="text-[11px] text-slate-500 cursor-pointer"
            >
              Orientações Específicas p/ Enfermagem (Opcional)
            </Label>
            <Input
              id="presc_orientacoes_enf"
              placeholder="Ex: Diluir em 100mL de SF, infundir em 20 minutos, monitorar PA..."
              value={orientacoes}
              onChange={(e) => setOrientacoes(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <Button
            type="button"
            onClick={handleAdicionarItem}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Incluir Medicamento
          </Button>
        </div>
      </div>

      {/* Rascunho da nova prescrição */}
      {itensRascunho.length > 0 && (
        <div className="bg-white rounded-lg p-3 border-2 border-emerald-400 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Itens a Prescrever no PA ({itensRascunho.length})
            </span>
            <span className="text-[11px] text-slate-500">
              Pronto para envio conjunto à Farmácia e Enfermagem
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-50/70 border-b border-emerald-100 text-slate-600 font-semibold">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Fármaco</th>
                  <th className="p-2">Apresentação / Dose</th>
                  <th className="p-2">Via</th>
                  <th className="p-2">Posologia</th>
                  <th className="p-2">Orientações</th>
                  <th className="p-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itensRascunho.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2 font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-2 font-semibold text-slate-900">{it.medicamento_nome}</td>
                    <td className="p-2 text-slate-600">{it.dose || '-'}</td>
                    <td className="p-2">
                      <Badge
                        variant="outline"
                        className="bg-slate-50 text-slate-700 font-mono text-[10px]"
                      >
                        {it.via_administracao?.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-2 text-slate-700">{it.frequencia}</td>
                    <td className="p-2 text-[11px] text-slate-500 max-w-xs truncate">
                      {it.instrucoes || '-'}
                    </td>
                    <td className="p-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoverItem(idx)}
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="presc_obs_gerais"
              className="text-[11px] font-semibold text-slate-700 cursor-pointer"
            >
              Observações Gerais da Prescrição (Opcional)
            </Label>
            <Input
              id="presc_obs_gerais"
              placeholder="Ex: Medicação imediata na sala de medicação / repouso do PA..."
              value={obsGerais}
              onChange={(e) => setObsGerais(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              onClick={handleEmitirPrescricaoPA}
              disabled={salvandoPrescricao}
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs shadow-sm font-semibold"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              {salvandoPrescricao
                ? 'Emitindo e Notificando Farmácia/Enfermagem...'
                : 'Emitir Prescrição Médica do PA'}
            </Button>
          </div>
        </div>
      )}

      {/* Histórico de prescrições já emitidas neste atendimento do PA */}
      {prescricoesExistentes.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-emerald-200">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Prescrições Emitidas para este Atendimento de PA
          </div>

          <div className="space-y-2">
            {prescricoesExistentes.map((presc) => (
              <div
                key={presc.id}
                className="bg-white rounded-lg p-3 border border-slate-200 space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      Prescrição #{presc.id.slice(-6).toUpperCase()}
                    </span>
                    <Badge
                      className={
                        presc.status === 'ativa'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : presc.status === 'suspensa'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                      }
                    >
                      {presc.status.toUpperCase()}
                    </Badge>
                    <span className="text-slate-500 text-[11px]">
                      Emitida em: {presc.data_prescricao} por{' '}
                      <strong>{presc.medico_nome || 'Médico Plantonista'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle className="w-3 h-3" /> Fila Farmácia & Checagem Enfermagem Ativas
                  </div>
                </div>

                {presc.itens && presc.itens.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {presc.itens.map((it) => (
                      <div
                        key={it.id}
                        className="p-2 rounded bg-slate-50 border border-slate-200/80 text-[11px] space-y-0.5"
                      >
                        <div className="font-bold text-slate-800 flex items-center justify-between">
                          <span>{it.medicamento_nome}</span>
                          <span className="text-[10px] text-emerald-700 uppercase font-mono">
                            {it.via_administracao}
                          </span>
                        </div>
                        <div className="text-slate-500">Dose / Apresentação: {it.dose || '-'}</div>
                        <div className="text-slate-700 font-medium">Posologia: {it.frequencia}</div>
                        {it.instrucoes && (
                          <div className="text-slate-500 italic">Obs: {it.instrucoes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Nenhum item listado.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
