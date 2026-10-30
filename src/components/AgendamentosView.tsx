import React, { useState, useEffect } from 'react'
import { Agendamento, Paciente, Profissional, Setor } from '@/types/hospital'
import {
  listarAgendamentos,
  criarAgendamento,
  atualizarStatusAgendamento,
} from '@/services/agendamentos'
import { listarPacientes, listarProfissionais, listarSetores } from '@/services/cadastros'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  Calendar,
  Plus,
  Clock,
  User,
  CheckCircle,
  XCircle,
  PlayCircle,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const AgendamentosView: React.FC = () => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroProfissional, setFiltroProfissional] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  // Modal
  const [dialogAberto, setDialogAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Form
  const [formPaciente, setFormPaciente] = useState('')
  const [formProfissional, setFormProfissional] = useState('')
  const [formSetor, setFormSetor] = useState('')
  const [formTipo, setFormTipo] = useState<'consulta' | 'retorno' | 'procedimento' | 'urgencia'>(
    'consulta',
  )
  const [formDataHora, setFormDataHora] = useState('')
  const [formMotivo, setFormMotivo] = useState('')
  const [formObs, setFormObs] = useState('')

  const { toast } = useToast()

  useEffect(() => {
    carregarTudo()
  }, [filtroProfissional, filtroStatus])

  const carregarTudo = async () => {
    setLoading(true)
    try {
      const [ags, pacs, profs, sets] = await Promise.all([
        listarAgendamentos({
          profissionalId: filtroProfissional,
          status: filtroStatus,
        }),
        listarPacientes(),
        listarProfissionais(),
        listarSetores(),
      ])
      setAgendamentos(ags)
      setPacientes(pacs)
      setProfissionais(profs)
      setSetores(sets)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar agendamentos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const abrirNovoAgendamento = () => {
    setFormPaciente(pacientes[0]?.id || '')
    setFormProfissional(profissionais[0]?.id || '')
    setFormSetor(setores[0]?.id || '')
    setFormTipo('consulta')

    const agora = new Date()
    agora.setMinutes(agora.getMinutes() + 30)
    const dataHoraIso = agora.toISOString().slice(0, 16)
    setFormDataHora(dataHoraIso)

    setFormMotivo('')
    setFormObs('')
    setDialogAberto(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formPaciente || !formProfissional || !formDataHora) {
      toast({
        title: 'Atenção',
        description: 'Selecione o paciente, o profissional e o horário.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      await criarAgendamento({
        paciente: formPaciente,
        profissional: formProfissional,
        setor: formSetor || undefined,
        tipo: formTipo,
        data_hora: formDataHora,
        status: 'agendado',
        motivo: formMotivo.trim(),
        observacoes: formObs.trim(),
      })

      toast({ title: 'Sucesso', description: 'Consulta agendada com sucesso!' })
      setDialogAberto(false)
      carregarTudo()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao gravar agendamento.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleMudarStatus = async (
    id: string,
    novoStatus: 'agendado' | 'confirmado' | 'em_atendimento' | 'atendido' | 'cancelado',
  ) => {
    try {
      await atualizarStatusAgendamento(id, novoStatus)
      toast({ title: 'Status Atualizado', description: `Agendamento marcado como: ${novoStatus}` })
      carregarTudo()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status.',
        variant: 'destructive',
      })
    }
  }

  const formatarDataHora = (iso: string) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return iso
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  const renderBadgeStatus = (status: string) => {
    switch (status) {
      case 'confirmado':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Confirmado</Badge>
        )
      case 'agendado':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Agendado</Badge>
      case 'em_atendimento':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300">Em Atendimento</Badge>
        )
      case 'atendido':
        return (
          <Badge className="bg-slate-100 text-slate-800 border-slate-300">
            Atendido / Finalizado
          </Badge>
        )
      case 'cancelado':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Cancelado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Agenda de Consultas & Procedimentos
          </h1>
          <p className="text-xs text-slate-500">
            Marcação ambulatorial por profissional de saúde, confirmação e recepção de fila
          </p>
        </div>
        <Button
          onClick={abrirNovoAgendamento}
          className="bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Marcar Consulta
        </Button>
      </div>

      {/* Barra de Filtros */}
      <Card className="border-slate-200">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-slate-500">Filtrar por Profissional</Label>
            <Select value={filtroProfissional} onValueChange={setFiltroProfissional}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Todos os Profissionais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Profissionais</SelectItem>
                {profissionais.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} ({p.especialidade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-56 space-y-1">
            <Label className="text-xs text-slate-500">Filtrar por Status</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                <SelectItem value="atendido">Atendido</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Consultas */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">
            Atendimentos na Agenda ({agendamentos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              Carregando agendamentos...
            </div>
          ) : agendamentos.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Nenhuma consulta agendada para os filtros selecionados.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {agendamentos.map((ag) => (
                <div
                  key={ag.id}
                  className="py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">
                        {ag.expand?.paciente?.nome || 'Paciente'}
                      </span>
                      {renderBadgeStatus(ag.status)}
                      <Badge variant="outline" className="text-[11px] uppercase">
                        {ag.tipo}
                      </Badge>
                      <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatarDataHora(ag.data_hora)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                      <span>
                        <strong>Profissional:</strong> {ag.expand?.profissional?.nome || 'N/A'} (
                        {ag.expand?.profissional?.especialidade || 'Geral'})
                      </span>
                      {ag.expand?.setor && (
                        <span>
                          <strong>Local:</strong> {ag.expand?.setor.nome}
                        </span>
                      )}
                      <span>
                        <strong>SUS:</strong> {ag.expand?.paciente?.cartao_sus || 'N/A'}
                      </span>
                    </div>

                    {ag.motivo && (
                      <p className="text-xs text-slate-500">
                        <strong>Motivo:</strong> {ag.motivo}
                      </p>
                    )}
                  </div>

                  {/* Ações de Status */}
                  <div className="flex flex-wrap items-center gap-1.5 self-end lg:self-center">
                    {ag.status === 'agendado' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMudarStatus(ag.id, 'confirmado')}
                        className="text-xs h-7 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Confirmar Presença
                      </Button>
                    )}

                    {(ag.status === 'agendado' || ag.status === 'confirmado') && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleMudarStatus(ag.id, 'em_atendimento')}
                        className="text-xs h-7 bg-amber-100 text-amber-800 hover:bg-amber-200"
                      >
                        <PlayCircle className="w-3.5 h-3.5 mr-1" />
                        Chamar P/ Atendimento
                      </Button>
                    )}

                    {ag.status === 'em_atendimento' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleMudarStatus(ag.id, 'atendido')}
                        className="text-xs h-7 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Concluir Atendimento
                      </Button>
                    )}

                    {ag.status !== 'cancelado' && ag.status !== 'atendido' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMudarStatus(ag.id, 'cancelado')}
                        className="text-xs h-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIALOG MARCAR CONSULTA */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Marcar Consulta / Procedimento</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Vincule o paciente a um profissional com data e horário reservado
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Paciente (SUS) *</Label>
              <Select value={formPaciente} onValueChange={setFormPaciente}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} — CNS: {p.cartao_sus}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Profissional de Saúde *</Label>
              <Select value={formProfissional} onValueChange={setFormProfissional}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {profissionais.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} — {p.especialidade} ({p.registro_conselho})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data e Hora *</Label>
                <Input
                  type="datetime-local"
                  required
                  value={formDataHora}
                  onChange={(e) => setFormDataHora(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tipo de Agendamento</Label>
                <Select value={formTipo} onValueChange={(val: any) => setFormTipo(val)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consulta">Consulta Médica</SelectItem>
                    <SelectItem value="retorno">Retorno</SelectItem>
                    <SelectItem value="procedimento">Procedimento / Enfermagem</SelectItem>
                    <SelectItem value="urgencia">Urgência / Encaixe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Setor / Consultório</Label>
              <Select value={formSetor} onValueChange={setFormSetor}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Local de atendimento (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {setores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Motivo da Consulta / Queixa Principal</Label>
              <Input
                placeholder="Ex: Cefaleia constante, renovação de receita, avaliação cardiológica..."
                value={formMotivo}
                onChange={(e) => setFormMotivo(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observações da Recepção</Label>
              <Input
                placeholder="Ex: Paciente cadeirante, prioridade idoso..."
                value={formObs}
                onChange={(e) => setFormObs(e.target.value)}
                className="text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogAberto(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando} className="bg-blue-600 hover:bg-blue-500">
                {salvando ? 'Agendando...' : 'Confirmar Agendamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
