import React, { useState, useEffect } from 'react'
import { EvolucaoClinica, Paciente, Internacao, Profissional } from '@/types/hospital'
import { listarEvolucoes, criarEvolucaoClinica, listarInternacoes } from '@/services/internacoes'
import { listarPacientes, listarProfissionais } from '@/services/cadastros'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  Stethoscope,
  Plus,
  Activity,
  HeartPulse,
  User,
  Calendar,
  FileText,
  Loader2,
  Pill,
  FlaskConical,
  Printer,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PrescricaoEnfermagemTab } from '@/components/PrescricaoEnfermagemTab'
import { ModalSolicitarExame } from '@/components/ModalSolicitarExame'
import { ModalEmissaoImpresso } from '@/components/ModalEmissaoImpresso'
import { TipoImpressoAssistencial } from '@/types/hospital'
import { useToast } from '@/hooks/use-toast'

interface AssistencialViewProps {
  internacaoIdFoco?: string
  pacienteIdFoco?: string
}

export const AssistencialView: React.FC<AssistencialViewProps> = ({
  internacaoIdFoco,
  pacienteIdFoco,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const podePrescrever = user?.role === 'profissional' || user?.role === 'admin'

  const [evolucoes, setEvolucoes] = useState<EvolucaoClinica[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [internacoes, setInternacoes] = useState<Internacao[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(true)

  // Sub-abas
  const [subAba, setSubAba] = useState<'evolucoes' | 'prescricao'>('evolucoes')

  // Filtros
  const [pacienteSelecionado, setPacienteSelecionado] = useState<string>(pacienteIdFoco || 'todos')

  // Modal Evolução
  const [dialogAberto, setDialogAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Modal Exame
  const [modalExameAberto, setModalExameAberto] = useState(false)
  const [modalImpressoAberto, setModalImpressoAberto] = useState(false)
  const [tipoImpressoInicial, setTipoImpressoInicial] =
    useState<TipoImpressoAssistencial>('receita')

  // Form
  const [formPaciente, setFormPaciente] = useState(pacienteIdFoco || '')
  const [formInternacao, setFormInternacao] = useState(internacaoIdFoco || 'none')
  const [formProfissional, setFormProfissional] = useState('')
  const [formTipo, setFormTipo] = useState<
    'evolucao_medica' | 'anotacao_enfermagem' | 'diagnostico' | 'prescricao' | 'alta'
  >('evolucao_medica')
  const [formDescricao, setFormDescricao] = useState('')
  const [formDiagnostico, setFormDiagnostico] = useState('')
  const [formCid, setFormCid] = useState('')
  const [formSinaisVitais, setFormSinaisVitais] = useState('')
  const [formConduta, setFormConduta] = useState('')

  useEffect(() => {
    carregar()
  }, [pacienteSelecionado])

  const carregar = async () => {
    setLoading(true)
    try {
      const pId = pacienteSelecionado !== 'todos' ? pacienteSelecionado : undefined
      const [evs, pacs, ints, profs] = await Promise.all([
        listarEvolucoes(pId),
        listarPacientes(),
        listarInternacoes(),
        listarProfissionais(),
      ])
      setEvolucoes(evs)
      setPacientes(pacs)
      setInternacoes(ints)
      setProfissionais(profs)

      if (!formProfissional && profs.length > 0) {
        setFormProfissional(profs[0].id)
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar registros clínicos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const abrirNovaEvolucao = () => {
    setFormPaciente(pacienteSelecionado !== 'todos' ? pacienteSelecionado : pacientes[0]?.id || '')
    setFormInternacao(internacaoIdFoco || 'none')
    setFormTipo('evolucao_medica')
    setFormDescricao('')
    setFormDiagnostico('')
    setFormCid('')
    setFormSinaisVitais('PA: 120/80 mmHg | FC: 78 bpm | Temp: 36.5°C | SatO2: 98%')
    setFormConduta('')
    setDialogAberto(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formPaciente || !formDescricao.trim()) {
      toast({
        title: 'Atenção',
        description: 'Selecione o paciente e descreva a evolução clínica.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      await criarEvolucaoClinica({
        paciente: formPaciente,
        internacao: formInternacao !== 'none' ? formInternacao : undefined,
        profissional: formProfissional || undefined,
        tipo: formTipo,
        descricao: formDescricao.trim(),
        diagnostico: formDiagnostico.trim(),
        cid10: formCid.trim(),
        sinais_vitais: formSinaisVitais.trim(),
        conduta: formConduta.trim(),
      })

      toast({ title: 'Registro Salvo', description: 'Evolução clínica registrada no prontuário!' })
      setDialogAberto(false)
      carregar()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao gravar prontuário.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const tipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'evolucao_medica':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Evolução Médica</Badge>
      case 'anotacao_enfermagem':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
            Anotação Enfermagem
          </Badge>
        )
      case 'diagnostico':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300">
            Diagnóstico Clínico
          </Badge>
        )
      case 'prescricao':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300">
            Prescrição Terapêutica
          </Badge>
        )
      case 'alta':
        return (
          <Badge className="bg-slate-100 text-slate-800 border-slate-300">Sumário de Alta</Badge>
        )
      default:
        return <Badge variant="outline">{tipo}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-blue-600" />
            Registro Assistencial Hospitalar & Prescrição
          </h1>
          <p className="text-xs text-slate-500">
            Evoluções clínicas, prescrições médicas na internação e checagem de enfermagem ao leito
          </p>
        </div>

        <div className="flex items-center gap-2">
          {podePrescrever && (
            <>
              <Button
                variant="outline"
                onClick={() => setModalExameAberto(true)}
                className="border-blue-300 text-blue-700 hover:bg-blue-50 text-xs sm:text-sm flex items-center gap-1.5"
              >
                <FlaskConical className="w-4 h-4 text-blue-600" />
                Solicitar Exame
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTipoImpressoInicial('receita')
                  setModalImpressoAberto(true)
                }}
                className="border-purple-300 text-purple-700 hover:bg-purple-50 text-xs sm:text-sm flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-purple-600" />
                Emitir Receita A4
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTipoImpressoInicial('atestado')
                  setModalImpressoAberto(true)
                }}
                className="border-amber-300 text-amber-800 hover:bg-amber-50 text-xs sm:text-sm flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-amber-600" />
                Emitir Atestado A4
              </Button>
            </>
          )}

          {subAba === 'evolucoes' && (
            <Button
              onClick={abrirNovaEvolucao}
              className="bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Registrar Evolução
            </Button>
          )}
        </div>
      </div>

      {/* ABAS SUPERIORES: EVOLUÇÕES vs PRESCRIÇÃO MÉDICA / ENFERMAGEM */}
      <Tabs value={subAba} onValueChange={(val: any) => setSubAba(val)} className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger
            value="evolucoes"
            className="text-xs flex items-center gap-1.5 data-[state=active]:bg-white"
          >
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            Evoluções & Anotações de Enfermagem
          </TabsTrigger>
          <TabsTrigger
            value="prescricao"
            className="text-xs flex items-center gap-1.5 data-[state=active]:bg-white"
          >
            <Pill className="w-3.5 h-3.5 text-purple-600" />
            Prescrição Médica & Checagem ao Leito
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evolucoes" className="space-y-4">
          {/* Filtro por Paciente */}
          <Card className="border-slate-200">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="w-full sm:w-96 space-y-1">
                <Label className="text-xs text-slate-500">Filtrar por Paciente</Label>
                <Select value={pacienteSelecionado} onValueChange={setPacienteSelecionado}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Todos os pacientes" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="todos">Todos os Pacientes</SelectItem>
                    {pacientes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} (CNS: {p.cartao_sus})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-slate-500">
                Exibindo <strong>{evolucoes.length}</strong> registro(s) assistenciais
              </p>
            </CardContent>
          </Card>

          {/* Lista de Registros Clínicos */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800">
                Histórico de Evoluções e Anotações Clínicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 flex justify-center items-center gap-2 text-slate-500 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  Carregando prontuário...
                </div>
              ) : evolucoes.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  Nenhuma evolução clínica registrada até o momento.
                </div>
              ) : (
                <div className="space-y-4">
                  {evolucoes.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {ev.expand?.paciente?.nome || 'Paciente'}
                          </span>
                          {tipoBadge(ev.tipo)}
                          {ev.cid10 && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              CID-10: {ev.cid10}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {ev.data_hora}
                        </span>
                      </div>

                      <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {ev.descricao}
                      </p>

                      {ev.diagnostico && (
                        <div className="p-2 rounded bg-purple-50 border border-purple-200 text-xs text-purple-900">
                          <strong>Diagnóstico / Hipótese:</strong> {ev.diagnostico}
                        </div>
                      )}

                      {ev.sinais_vitais && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white p-2 rounded border border-slate-200">
                          <HeartPulse className="w-4 h-4 text-red-500" />
                          <span>
                            <strong>Sinais Vitais:</strong> {ev.sinais_vitais}
                          </span>
                        </div>
                      )}

                      {ev.conduta && (
                        <div className="text-xs text-slate-700 bg-emerald-50/60 p-2 rounded border border-emerald-200">
                          <strong>Conduta Terapêutica / Prescrição:</strong> {ev.conduta}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
                        <span>
                          Registrado por:{' '}
                          <strong>
                            {ev.expand?.profissional?.nome || 'Profissional de Plantão'}
                          </strong>{' '}
                          ({ev.expand?.profissional?.registro_conselho || 'SMS'})
                        </span>
                        {ev.expand?.internacao && (
                          <span className="text-blue-600">Vinculado à Internação</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescricao" className="space-y-4">
          <PrescricaoEnfermagemTab
            pacienteSelecionadoId={pacienteSelecionado}
            internacaoSelecionadaId={internacaoIdFoco}
            pacientes={pacientes}
            internacoes={internacoes}
            profissionais={profissionais}
            podePrescrever={podePrescrever}
          />
        </TabsContent>
      </Tabs>

      {/* MODAL REGISTRAR EVOLUÇÃO */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Evolução Clínica / Prontuário</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Anotações clínicas e diagnósticas vinculadas ao paciente ou internação
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Paciente *</Label>
              <Select value={formPaciente} onValueChange={setFormPaciente}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} (CNS: {p.cartao_sus})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Registro</Label>
                <Select value={formTipo} onValueChange={(val: any) => setFormTipo(val)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evolucao_medica">Evolução Médica</SelectItem>
                    <SelectItem value="anotacao_enfermagem">Anotação de Enfermagem</SelectItem>
                    <SelectItem value="diagnostico">Diagnóstico / Hipótese</SelectItem>
                    <SelectItem value="prescricao">Prescrição Terapêutica</SelectItem>
                    <SelectItem value="alta">Sumário de Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Profissional Responsável</Label>
                <Select value={formProfissional} onValueChange={setFormProfissional}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {profissionais.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} ({p.registro_conselho})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Sinais Vitais</Label>
              <Input
                placeholder="Ex: PA: 120/80 mmHg | FC: 78 bpm | Temp: 36.5°C | SatO2: 98%"
                value={formSinaisVitais}
                onChange={(e) => setFormSinaisVitais(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Descrição Clínica / Anamnese / Evolução *</Label>
              <Textarea
                required
                rows={4}
                placeholder="Descreva o estado geral do paciente, queixas, exame físico, ausculta..."
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Diagnóstico / Impressão</Label>
                <Input
                  placeholder="Diagnóstico clínico"
                  value={formDiagnostico}
                  onChange={(e) => setFormDiagnostico(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">CID-10</Label>
                <Input
                  placeholder="Ex: I10, J18.9"
                  value={formCid}
                  onChange={(e) => setFormCid(e.target.value)}
                  className="text-sm font-mono uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Conduta / Medicamentos Prescritos</Label>
              <Input
                placeholder="Ex: Dipirona 500mg EV se dor, hidratação venosa, repouso..."
                value={formConduta}
                onChange={(e) => setFormConduta(e.target.value)}
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
                {salvando ? 'Salvando...' : 'Salvar no Prontuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL SOLICITAÇÃO DE EXAMES */}
      <ModalSolicitarExame
        aberto={modalExameAberto}
        onClose={() => setModalExameAberto(false)}
        paciente={
          pacienteSelecionado !== 'todos'
            ? pacientes.find((p) => p.id === pacienteSelecionado)
            : pacientes[0]
        }
        internacaoId={internacaoIdFoco}
        onSucesso={() => carregar()}
      />

      {/* MODAL EMISSÃO DE IMPRESSOS ASSISTENCIAIS */}
      <ModalEmissaoImpresso
        aberto={modalImpressoAberto}
        onClose={() => setModalImpressoAberto(false)}
        paciente={
          pacienteSelecionado !== 'todos'
            ? pacientes.find((p) => p.id === pacienteSelecionado) || null
            : pacientes[0] || null
        }
        origem="ambulatorio"
        internacaoId={internacaoIdFoco}
        profissionaisList={profissionais}
        usuarioAtual={
          user ? { id: user.id, nome: user.name, role: user.role, email: user.email } : undefined
        }
        tipoInicial={tipoImpressoInicial}
        onImpressoEmitido={() => carregar()}
      />
    </div>
  )
}
