import React, { useState, useEffect } from 'react'
import {
  PrescricaoMedica,
  PrescricaoItem,
  AdministracaoMedicamento,
  Paciente,
  Internacao,
  Profissional,
  ItemFarmacia,
  ViaAdministracaoMedicamento,
  StatusAdministracao,
} from '@/types/hospital'
import {
  listarPrescricoes,
  criarPrescricaoMedica,
  atualizarStatusPrescricao,
  registrarAdministracaoMedicamento,
  listarAdministracoesMedicamentos,
  ItemPrescricaoInput,
} from '@/services/prescricoes'
import { listarItensFarmacia } from '@/services/farmacia'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Pill,
  User,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Activity,
  AlertOctagon,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

interface PrescricaoEnfermagemTabProps {
  pacienteSelecionadoId?: string
  internacaoSelecionadaId?: string
  pacientes: Paciente[]
  internacoes: Internacao[]
  profissionais: Profissional[]
  podePrescrever: boolean // Perfil 'profissional' (médico)
}

export const PrescricaoEnfermagemTab: React.FC<PrescricaoEnfermagemTabProps> = ({
  pacienteSelecionadoId,
  internacaoSelecionadaId,
  pacientes,
  internacoes,
  profissionais,
  podePrescrever,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [prescricoes, setPrescricoes] = useState<PrescricaoMedica[]>([])
  const [administracoes, setAdministracoes] = useState<AdministracaoMedicamento[]>([])
  const [itensFarmacia, setItensFarmacia] = useState<ItemFarmacia[]>([])

  // Filtros internos
  const [pacienteId, setPacienteId] = useState<string>(
    pacienteSelecionadoId && pacienteSelecionadoId !== 'todos' ? pacienteSelecionadoId : '',
  )

  // Dialog Nova Prescrição
  const [modalNovaPrescAberto, setModalNovaPrescAberto] = useState(false)
  const [salvandoPresc, setSalvandoPresc] = useState(false)
  const [prescInternacaoId, setPrescInternacaoId] = useState('')
  const [prescMedicoNome, setPrescMedicoNome] = useState(user?.name || '')
  const [prescObs, setPrescObs] = useState('')
  const [itensForm, setItensForm] = useState<ItemPrescricaoInput[]>([
    {
      medicamento_nome: '',
      dose: '1 comprimido',
      via_administracao: 'oral',
      frequencia: '8/8h',
      duracao: '5 dias',
      instrucoes: '',
    },
  ])

  // Dialog de Checagem / Administração ao leito (Enfermagem)
  const [modalChecagemAberto, setModalChecagemAberto] = useState(false)
  const [salvandoChecagem, setSalvandoChecagem] = useState(false)
  const [itemParaChecar, setItemParaChecar] = useState<{
    prescricao: PrescricaoMedica
    item: PrescricaoItem
  } | null>(null)
  const [checagemStatus, setChecagemStatus] = useState<StatusAdministracao>('administrado')
  const [checagemDose, setChecagemDose] = useState('')
  const [checagemVia, setChecagemVia] = useState('')
  const [checagemResponsavel, setChecagemResponsavel] = useState(
    user?.name || 'Enfermeiro(a) Plantonista',
  )
  const [checagemCargo, setChecagemCargo] = useState('Enfermagem Leito')
  const [checagemObs, setChecagemObs] = useState('')

  // Carregar catálogo da farmácia
  useEffect(() => {
    listarItensFarmacia()
      .then((itens) => setItensFarmacia(itens))
      .catch(() => {})
  }, [])

  // Sincronizar com prop de paciente quando mudar no componente pai
  useEffect(() => {
    if (pacienteSelecionadoId && pacienteSelecionadoId !== 'todos') {
      setPacienteId(pacienteSelecionadoId)
    } else if (!pacienteId && pacientes.length > 0) {
      setPacienteId(pacientes[0].id)
    }
  }, [pacienteSelecionadoId, pacientes])

  // Carregar prescrições e administrações do paciente
  useEffect(() => {
    if (pacienteId) {
      carregarDados()
    }
  }, [pacienteId])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [prescs, adms] = await Promise.all([
        listarPrescricoes({ pacienteId }),
        listarAdministracoesMedicamentos({ pacienteId }),
      ])
      setPrescricoes(prescs)
      setAdministracoes(adms)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar prescrições',
        description: 'Não foi possível buscar as prescrições médicas deste paciente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Paciente selecionado objeto
  const pacienteObj = pacientes.find((p) => p.id === pacienteId)

  // Internações ativas do paciente
  const internacoesDoPaciente = internacoes.filter((i) => i.paciente === pacienteId)

  // Manipular itens da nova prescrição
  const adicionarLinhaItem = () => {
    setItensForm([
      ...itensForm,
      {
        medicamento_nome: '',
        dose: '',
        via_administracao: 'oral',
        frequencia: '8/8h',
        duracao: '',
        instrucoes: '',
      },
    ])
  }

  const removerLinhaItem = (idx: number) => {
    if (itensForm.length <= 1) return
    setItensForm(itensForm.filter((_, i) => i !== idx))
  }

  const atualizarItemForm = (idx: number, campo: keyof ItemPrescricaoInput, valor: any) => {
    const novos = [...itensForm]
    novos[idx] = { ...novos[idx], [campo]: valor }

    // Se selecionou item do catálogo da farmácia, preencher nome
    if (campo === 'item_farmacia') {
      const itemF = itensFarmacia.find((it) => it.id === valor)
      if (itemF) {
        novos[idx].medicamento_nome = itemF.nome
        if (itemF.apresentacao) {
          novos[idx].dose = itemF.apresentacao
        }
      }
    }

    setItensForm(novos)
  }

  const abrirModalNovaPresc = () => {
    if (!podePrescrever) {
      toast({
        title: 'Acesso Restrito',
        description: 'Apenas profissionais de saúde (médicos) podem emitir novas prescrições.',
        variant: 'destructive',
      })
      return
    }

    const inter =
      internacoesDoPaciente.find((i) => i.status === 'ativa') || internacoesDoPaciente[0]
    setPrescInternacaoId(inter?.id || internacoes[0]?.id || '')
    setPrescMedicoNome(user?.name || 'Dr(a). Plantonista')
    setPrescObs('')
    setItensForm([
      {
        medicamento_nome: '',
        dose: '500mg',
        via_administracao: 'oral',
        frequencia: '8/8h',
        duracao: '3 dias',
        instrucoes: 'Após as refeições',
      },
    ])
    setModalNovaPrescAberto(true)
  }

  const handleSalvarPrescricao = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!prescInternacaoId) {
      toast({
        title: 'Internação obrigatória',
        description:
          'A prescrição médica hospitalar deve estar vinculada a uma internação do paciente.',
        variant: 'destructive',
      })
      return
    }

    const itensValidos = itensForm.filter((i) => i.medicamento_nome.trim().length > 0)
    if (itensValidos.length === 0) {
      toast({
        title: 'Medicamentos obrigatórios',
        description: 'Informe ao menos um medicamento na prescrição.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoPresc(true)
    try {
      await criarPrescricaoMedica({
        pacienteId,
        internacaoId: prescInternacaoId,
        medicoNome: prescMedicoNome.trim(),
        observacoesGerais: prescObs.trim(),
        itens: itensValidos,
      })

      toast({
        title: 'Prescrição Emitida com Sucesso',
        description:
          'A prescrição médica digital está ativa e disponível para a farmácia e enfermagem.',
      })

      setModalNovaPrescAberto(false)
      carregarDados()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao emitir prescrição',
        description: err.message || 'Falha ao salvar no banco.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoPresc(false)
    }
  }

  const handleSuspenderPrescricao = async (prescId: string) => {
    try {
      await atualizarStatusPrescricao(prescId, 'suspensa')
      toast({
        title: 'Prescrição Suspensa',
        description: 'O status da prescrição foi alterado para suspensa.',
      })
      carregarDados()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  // Abertura do modal de checagem da enfermagem
  const abrirModalChecagem = (presc: PrescricaoMedica, item: PrescricaoItem) => {
    setItemParaChecar({ prescricao: presc, item })
    setChecagemStatus('administrado')
    setChecagemDose(item.dose)
    setChecagemVia(item.via_administracao)
    setChecagemResponsavel(user?.name || 'Técnico(a) Enfermagem')
    setChecagemCargo('Equipe de Enfermagem')
    setChecagemObs('')
    setModalChecagemAberto(true)
  }

  const handleSalvarChecagem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemParaChecar) return

    setSalvandoChecagem(true)
    try {
      await registrarAdministracaoMedicamento({
        pacienteId: itemParaChecar.prescricao.paciente,
        internacaoId: itemParaChecar.prescricao.internacao,
        prescricaoId: itemParaChecar.prescricao.id,
        prescricaoItemId: itemParaChecar.item.id,
        medicamentoNome: itemParaChecar.item.medicamento_nome,
        doseAdministrada: checagemDose.trim(),
        viaAdministrada: checagemVia.trim(),
        responsavelNome: checagemResponsavel.trim(),
        responsavelCargo: checagemCargo.trim(),
        status: checagemStatus,
        observacoes: checagemObs.trim(),
      })

      toast({
        title: 'Checagem Registrada ao Leito',
        description: `Medicamento ${itemParaChecar.item.medicamento_nome} registrado como ${checagemStatus.toUpperCase()}.`,
      })

      setModalChecagemAberto(false)
      carregarDados()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao registrar checagem',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoChecagem(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* SELETOR DE PACIENTE + ALERTA DE ALERGIA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-700">
            Paciente para Prescrição & Checagem
          </Label>
          <Select value={pacienteId} onValueChange={setPacienteId}>
            <SelectTrigger className="text-xs bg-white h-9">
              <SelectValue placeholder="Selecione o paciente" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {pacientes.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome} (CNS: {p.cartao_sus})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ALERTA DE ALERGIAS EM DESTAQUE */}
        <div className="md:col-span-2">
          {pacienteObj && (
            <div className="rounded-lg border-2 border-red-500 bg-red-50 p-2.5 text-red-950 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 animate-pulse" />
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-900 block">
                    Alerta Clínico / Alergias Conhecidas:
                  </span>
                  <span className="text-xs font-bold text-red-800">
                    {pacienteObj.alergias || 'Nenhuma alergia relatada'}
                  </span>
                  {pacienteObj.condicoes_cronicas && (
                    <span className="text-[11px] text-slate-600 block">
                      Condições: {pacienteObj.condicoes_cronicas}
                    </span>
                  )}
                </div>
              </div>
              <Badge className="bg-red-600 text-white text-[10px] uppercase font-bold shrink-0">
                Checar ao Prescrever
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* CABEÇALHO DE AÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Prescrições Médicas Hospitalares & Aprazamento de Enfermagem
          </h2>
          <p className="text-xs text-slate-500">
            Prescrição digital de medicamentos da farmácia, doses, vias e horários de checagem ao
            leito
          </p>
        </div>

        {podePrescrever && (
          <Button
            onClick={abrirModalNovaPresc}
            size="sm"
            className="bg-purple-700 hover:bg-purple-600 text-white shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nova Prescrição Médica
          </Button>
        )}
      </div>

      {/* LISTA DE PRESCRIÇÕES DO PACIENTE */}
      {loading ? (
        <div className="py-12 flex justify-center items-center gap-2 text-slate-500 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
          Carregando prescrições e horários de checagem...
        </div>
      ) : prescricoes.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center text-slate-500 text-xs space-y-2">
            <p className="font-semibold text-slate-700">
              Nenhuma prescrição médica cadastrada para este paciente.
            </p>
            <p className="text-slate-400">
              {podePrescrever
                ? 'Clique em "Nova Prescrição Médica" acima para prescrever medicamentos e dietas para a internação.'
                : 'Apenas usuários com perfil "Profissional" (médico) podem prescrever.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {prescricoes.map((presc) => (
            <Card key={presc.id} className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/80 py-3 px-4 border-b border-slate-200 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                    {presc.data_prescricao}
                  </span>
                  <Badge
                    className={
                      presc.status === 'ativa'
                        ? 'bg-emerald-600 text-white'
                        : presc.status === 'suspensa'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-600 text-white'
                    }
                  >
                    {presc.status.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-slate-600 font-medium">
                    Médico: <strong>{presc.medico_nome || 'Médico Plantonista'}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {podePrescrever && presc.status === 'ativa' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuspenderPrescricao(presc.id)}
                      className="text-xs h-7 text-rose-600 hover:text-rose-700 border-rose-200"
                    >
                      Suspender Prescrição
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {presc.observacoes_gerais && (
                  <p className="text-xs text-slate-600 italic bg-purple-50/40 p-2 rounded border border-purple-100">
                    <strong>Observações / Orientações:</strong> {presc.observacoes_gerais}
                  </p>
                )}

                {/* TABELA DE ITENS DA PRESCRIÇÃO E CHECAGEM AO LEITO */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                    Medicamentos e Itens Prescritos:
                  </span>

                  <div className="grid grid-cols-1 gap-2.5">
                    {presc.itens &&
                      presc.itens.map((item) => {
                        // Administrações vinculadas a este item
                        const admsItem = administracoes.filter(
                          (a) =>
                            a.prescricao_item === item.id ||
                            a.medicamento_nome === item.medicamento_nome,
                        )

                        return (
                          <div
                            key={item.id}
                            className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Pill className="w-4 h-4 text-purple-600 shrink-0" />
                                <span className="text-xs font-bold text-slate-900">
                                  {item.medicamento_nome}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-slate-300 text-slate-700"
                                >
                                  Dose: {item.dose}
                                </Badge>
                                <Badge variant="secondary" className="text-[10px]">
                                  Via: {item.via_administracao}
                                </Badge>
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                                  Freq: {item.frequencia}
                                </Badge>
                                {item.duracao && (
                                  <span className="text-[11px] text-slate-500">
                                    Duração: {item.duracao}
                                  </span>
                                )}
                              </div>

                              {item.instrucoes && (
                                <p className="text-[11px] text-slate-600">
                                  <em>Instruções:</em> {item.instrucoes}
                                </p>
                              )}

                              {/* Histórico recente de checagens ao leito */}
                              {admsItem.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                  <span className="text-[10px] font-semibold text-slate-500">
                                    Últimas administrações:
                                  </span>
                                  {admsItem.slice(0, 3).map((a) => (
                                    <Badge
                                      key={a.id}
                                      className={`text-[9px] ${
                                        a.status === 'administrado'
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                          : 'bg-rose-100 text-rose-800 border-rose-300'
                                      }`}
                                    >
                                      {a.data_hora_administracao.slice(5, 16)} •{' '}
                                      {a.responsavel_nome.split(' ')[0]} ({a.status})
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* BOTÃO DA ENFERMAGEM: CHECAGEM AO LEITO */}
                            <div className="shrink-0 flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => abrirModalChecagem(presc, item)}
                                disabled={presc.status !== 'ativa'}
                                className="text-xs h-8 bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1 shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Checar ao Leito (Enfermagem)
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL: NOVA PRESCRIÇÃO MÉDICA */}
      <Dialog open={modalNovaPrescAberto} onOpenChange={setModalNovaPrescAberto}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Prescrição Médica Hospitalar (Digital)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Emissão de prescrição digital para o paciente internado com baixa rastreável na
              farmácia
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarPrescricao} className="space-y-4 pt-2">
            {/* ALERTA DE ALERGIA VISÍVEL DENTRO DO FORMULÁRIO DE PRESCRIÇÃO */}
            {pacienteObj && (
              <div className="rounded-lg border-2 border-red-500 bg-red-50 p-2.5 text-red-950 space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-900 block">
                  Atenção Médica — Alergias e Restrições do Paciente:
                </span>
                <p className="text-xs font-bold text-red-800">
                  {pacienteObj.alergias || 'Nenhuma alergia conhecida'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Vincular à Internação do Paciente *</Label>
                <Select value={prescInternacaoId} onValueChange={setPrescInternacaoId}>
                  <SelectTrigger className="text-xs bg-white">
                    <SelectValue placeholder="Selecione a internação" />
                  </SelectTrigger>
                  <SelectContent>
                    {internacoesDoPaciente.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        Leito: {i.expand?.leito_atual?.codigo || 'Leito'} • Motivo:{' '}
                        {i.motivo_admissao}
                      </SelectItem>
                    ))}
                    {internacoesDoPaciente.length === 0 && (
                      <SelectItem value="sem_internacao" disabled>
                        Paciente não possui internação ativa
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Médico Responsável / Prescritor *</Label>
                <Input
                  value={prescMedicoNome}
                  onChange={(e) => setPrescMedicoNome(e.target.value)}
                  placeholder="Nome do médico prescritor"
                  className="text-xs h-9"
                  required
                />
              </div>
            </div>

            {/* ITENS DA PRESCRIÇÃO */}
            <div className="space-y-3 border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900">
                  Medicamentos e Materiais Prescritos *
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adicionarLinhaItem}
                  className="text-xs h-7 text-purple-700 border-purple-200 hover:bg-purple-50"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Medicamento
                </Button>
              </div>

              <div className="space-y-3">
                {itensForm.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">Item #{idx + 1}</span>
                      {itensForm.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removerLinhaItem(idx)}
                          className="text-xs h-6 px-1.5 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[11px] text-slate-500">
                          Catálogo da Farmácia (opcional para preenchimento rápido)
                        </Label>
                        <Select
                          value={item.item_farmacia || ''}
                          onValueChange={(val) => atualizarItemForm(idx, 'item_farmacia', val)}
                        >
                          <SelectTrigger className="text-xs bg-white h-8">
                            <SelectValue placeholder="Selecione do estoque da farmácia..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            {itensFarmacia.map((it) => (
                              <SelectItem key={it.id} value={it.id}>
                                {it.nome} ({it.apresentacao || ''}) — Estoque: {it.estoque_atual}{' '}
                                {it.unidade_medida}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Nome do Medicamento *</Label>
                        <Input
                          value={item.medicamento_nome}
                          onChange={(e) =>
                            atualizarItemForm(idx, 'medicamento_nome', e.target.value)
                          }
                          placeholder="Ex: Dipirona 500mg"
                          className="text-xs bg-white h-8"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Dose *</Label>
                        <Input
                          value={item.dose}
                          onChange={(e) => atualizarItemForm(idx, 'dose', e.target.value)}
                          placeholder="Ex: 500mg, 1 ampola"
                          className="text-xs bg-white h-8"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Via de Adm. *</Label>
                        <Select
                          value={item.via_administracao}
                          onValueChange={(val: any) =>
                            atualizarItemForm(idx, 'via_administracao', val)
                          }
                        >
                          <SelectTrigger className="text-xs bg-white h-8">
                            <SelectValue placeholder="Via" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="oral">Oral (VO)</SelectItem>
                            <SelectItem value="intravenosa">Intravenosa (EV)</SelectItem>
                            <SelectItem value="intramuscular">Intramuscular (IM)</SelectItem>
                            <SelectItem value="subcutanea">Subcutânea (SC)</SelectItem>
                            <SelectItem value="inalatoria">Inalatória</SelectItem>
                            <SelectItem value="topica">Tópica</SelectItem>
                            <SelectItem value="oftalmica">Oftálmica</SelectItem>
                            <SelectItem value="nasal">Nasal</SelectItem>
                            <SelectItem value="retal">Retal</SelectItem>
                            <SelectItem value="outra">Outra</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Frequência *</Label>
                        <Input
                          value={item.frequencia}
                          onChange={(e) => atualizarItemForm(idx, 'frequencia', e.target.value)}
                          placeholder="Ex: 6/6h, 8/8h, 1x/dia, se dor"
                          className="text-xs bg-white h-8"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Duração</Label>
                        <Input
                          value={item.duracao || ''}
                          onChange={(e) => atualizarItemForm(idx, 'duracao', e.target.value)}
                          placeholder="Ex: 5 dias, contínuo"
                          className="text-xs bg-white h-8"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">
                        Instruções Específicas / Diluição
                      </Label>
                      <Input
                        value={item.instrucoes || ''}
                        onChange={(e) => atualizarItemForm(idx, 'instrucoes', e.target.value)}
                        placeholder="Ex: Diluir em SF 100ml em 30min; administrar em jejum..."
                        className="text-xs bg-white h-8"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observações Gerais / Cuidados Especiais</Label>
              <Textarea
                value={prescObs}
                onChange={(e) => setPrescObs(e.target.value)}
                placeholder="Ex: Dieta branda hipossódica, cabeceira elevada a 30°, monitorar diurese..."
                className="text-xs"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovaPrescAberto(false)}
                disabled={salvandoPresc}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoPresc}
                className="bg-purple-700 hover:bg-purple-600 text-white"
              >
                {salvandoPresc ? 'Emitindo Prescrição...' : 'Concluir Prescrição Médica'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: CHECAGEM / ADMINISTRAÇÃO DE MEDICAMENTO AO LEITO (ENFERMAGEM) */}
      <Dialog open={modalChecagemAberto} onOpenChange={setModalChecagemAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
              Checagem de Medicamento ao Leito (Enfermagem)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registro com data, hora, dose administrada e profissional responsável
            </DialogDescription>
          </DialogHeader>

          {itemParaChecar && (
            <form onSubmit={handleSalvarChecagem} className="space-y-3 pt-2">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs space-y-1 text-teal-950">
                <div className="font-bold text-sm text-teal-900">
                  {itemParaChecar.item.medicamento_nome}
                </div>
                <div>
                  <strong>Prescrito:</strong> {itemParaChecar.item.dose} •{' '}
                  {itemParaChecar.item.via_administracao} • {itemParaChecar.item.frequencia}
                </div>
                {itemParaChecar.item.instrucoes && (
                  <div>
                    <strong>Instruções:</strong> {itemParaChecar.item.instrucoes}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Status da Administração *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChecagemStatus('administrado')}
                    className={`p-2 rounded-lg border text-center text-xs font-semibold ${
                      checagemStatus === 'administrado'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Administrado com Sucesso
                  </button>
                  <button
                    type="button"
                    onClick={() => setChecagemStatus('recusado')}
                    className={`p-2 rounded-lg border text-center text-xs font-semibold ${
                      checagemStatus === 'recusado'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Paciente Recusou
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Dose Real Administrada</Label>
                  <Input
                    value={checagemDose}
                    onChange={(e) => setChecagemDose(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Via Utilizada</Label>
                  <Input
                    value={checagemVia}
                    onChange={(e) => setChecagemVia(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Profissional de Enfermagem Responsável *</Label>
                <Input
                  value={checagemResponsavel}
                  onChange={(e) => setChecagemResponsavel(e.target.value)}
                  placeholder="Nome do enfermeiro(a) / técnico(a)"
                  className="text-xs h-8"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Cargo / Conselho (COREN)</Label>
                <Input
                  value={checagemCargo}
                  onChange={(e) => setChecagemCargo(e.target.value)}
                  placeholder="Ex: Téc. Enfermagem COREN-RO 12345"
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Observações da Administração / Intercorrências</Label>
                <Textarea
                  value={checagemObs}
                  onChange={(e) => setChecagemObs(e.target.value)}
                  placeholder="Ex: Paciente aceitou bem, sem queixas álgicas imediatas..."
                  className="text-xs"
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalChecagemAberto(false)}
                  disabled={salvandoChecagem}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={salvandoChecagem}
                  className="bg-teal-600 hover:bg-teal-500 text-white"
                >
                  {salvandoChecagem ? 'Registrando...' : 'Confirmar Checagem ao Leito'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
