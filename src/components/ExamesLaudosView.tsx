import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  ExameItem,
  StatusExame,
  PrioridadeExame,
  Setor,
  Paciente,
  LaudoVersao,
} from '@/types/hospital'
import {
  listarExames,
  registrarColetaExame,
  iniciarAnaliseExame,
  emitirLaudoExame,
  retificarLaudoExame,
  listarVersoesLaudo,
  cancelarExame,
} from '@/services/exames'
import { mascararCPF, mascararCNS } from '@/services/identificacaoPaciente'
import { listarSetores, listarPacientes } from '@/services/cadastros'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
  FlaskConical,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  XCircle,
  Loader2,
  Plus,
  RefreshCw,
  Eye,
  Microscope,
  History,
  ShieldCheck,
  AlertOctagon,
} from 'lucide-react'
import { ModalSolicitarExame } from '@/components/ModalSolicitarExame'
import { useToast } from '@/hooks/use-toast'

export const ExamesLaudosView: React.FC = () => {
  const { user, temPermissao } = useAuth()
  const { toast } = useToast()

  const podeLaudar = user?.role === 'profissional' || user?.role === 'admin'
  const podeSolicitar = user?.role === 'profissional' || user?.role === 'admin'
  // Recepção vê a fila e pode registrar coleta, mas JAMAIS redigir laudo
  const podeColetar = Boolean(user)

  const [exames, setExames] = useState<ExameItem[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<StatusExame | 'todos'>('todos')
  const [filtroSetor, setFiltroSetor] = useState<string>('todos')
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todos')
  const [buscaTexto, setBuscaTexto] = useState('')

  // Modais de Ação
  const [modalNovoExame, setModalNovoExame] = useState(false)
  const [modalColeta, setModalColeta] = useState<ExameItem | null>(null)
  const [modalAnalise, setModalAnalise] = useState<ExameItem | null>(null)
  const [modalLaudo, setModalLaudo] = useState<ExameItem | null>(null)
  const [modalVisualizar, setModalVisualizar] = useState<ExameItem | null>(null)
  const [modalCancelar, setModalCancelar] = useState<ExameItem | null>(null)
  const [modalRetificar, setModalRetificar] = useState<ExameItem | null>(null)

  // Formulários de Ação
  const [respColetaNome, setRespColetaNome] = useState('')
  const [obsColeta, setObsColeta] = useState('')

  const [respAnaliseNome, setRespAnaliseNome] = useState('')

  const [resultadoSumario, setResultadoSumario] = useState('Normal / Sem alterações')
  const [laudoTexto, setLaudoTexto] = useState('')

  // Formulário de Retificação
  const [motivoRetificacao, setMotivoRetificacao] = useState('')
  const [resultadoSumarioRetif, setResultadoSumarioRetif] = useState('')
  const [laudoTextoRetif, setLaudoTextoRetif] = useState('')
  const [idempotencyKeyRetif, setIdempotencyKeyRetif] = useState('')

  // Histórico de Versões do Laudo (visualização)
  const [versoesVisualizar, setVersoesVisualizar] = useState<LaudoVersao[]>([])
  const [carregandoVersoes, setCarregandoVersoes] = useState(false)

  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const [processandoAcao, setProcessandoAcao] = useState(false)

  // Ref de sequência para descartar respostas obsoletas em voo
  const seqCargaRef = useRef(0)

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    seqCargaRef.current += 1
    const seqMomento = seqCargaRef.current

    setLoading(true)
    try {
      const [exList, setList, pacList] = await Promise.all([
        listarExames(),
        listarSetores(),
        listarPacientes(),
      ])
      if (seqMomento !== seqCargaRef.current) {
        return // Resposta obsoleta descartada
      }
      setExames(exList)
      setSetores(setList)
      setPacientes(pacList)
    } catch (err) {
      if (seqMomento !== seqCargaRef.current) return
      console.error(err)
      toast({
        title: 'Erro ao carregar exames',
        description: 'Falha ao buscar fila de exames e laudos.',
        variant: 'destructive',
      })
    } finally {
      if (seqMomento === seqCargaRef.current) {
        setLoading(false)
      }
    }
  }

  // Filtragem dinâmica
  const examesFiltrados = useMemo(() => {
    return exames.filter((ex) => {
      if (filtroStatus !== 'todos' && ex.status !== filtroStatus) return false
      if (filtroSetor !== 'todos' && ex.setor !== filtroSetor) return false
      if (filtroPrioridade !== 'todos' && ex.prioridade !== filtroPrioridade) return false
      if (buscaTexto.trim()) {
        const q = buscaTexto.toLowerCase()
        const matchExame = ex.tipo_exame.toLowerCase().includes(q)
        const matchPac = (ex.expand?.paciente?.nome || '').toLowerCase().includes(q)
        const matchSus = (ex.expand?.paciente?.cartao_sus || '').includes(q)
        const matchSolicitante = ex.solicitante_nome.toLowerCase().includes(q)
        if (!matchExame && !matchPac && !matchSus && !matchSolicitante) return false
      }
      return true
    })
  }, [exames, filtroStatus, filtroSetor, filtroPrioridade, buscaTexto])

  // Contadores de Fila por Status
  const contadores = useMemo(() => {
    return {
      solicitados: exames.filter((e) => e.status === 'solicitado').length,
      coletados: exames.filter((e) => e.status === 'coletado').length,
      em_analise: exames.filter((e) => e.status === 'em_analise').length,
      liberados: exames.filter((e) => e.status === 'liberado').length,
      cancelados: exames.filter((e) => e.status === 'cancelado').length,
    }
  }, [exames])

  // Ações do Fluxo
  const abrirModalColeta = (ex: ExameItem) => {
    if (ex.status === 'cancelado') {
      toast({
        title: 'Exame Cancelado',
        description: 'Não é possível registrar coleta para solicitação cancelada.',
        variant: 'destructive',
      })
      return
    }
    if (ex.status === 'liberado') {
      toast({
        title: 'Exame já Liberado',
        description: 'A coleta já foi finalizada e o laudo já foi liberado.',
        variant: 'destructive',
      })
      return
    }
    setModalColeta(ex)
    setRespColetaNome(user?.name ? `${user.name} (${user.role})` : '')
    setObsColeta('')
  }

  const handleConfirmarColeta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalColeta) return
    setProcessandoAcao(true)
    try {
      await registrarColetaExame({
        exameId: modalColeta.id,
        responsavel_coleta_nome: respColetaNome.trim() || user?.name || 'Equipe de Coleta',
        observacoes_coleta: obsColeta.trim(),
      })
      toast({
        title: 'Coleta Confirmada',
        description: `Exame "${modalColeta.tipo_exame}" marcado como coletado.`,
      })
      setModalColeta(null)
      carregar()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao registrar coleta.',
        variant: 'destructive',
      })
    } finally {
      setProcessandoAcao(false)
    }
  }

  const abrirModalAnalise = (ex: ExameItem) => {
    if (ex.status === 'cancelado' || ex.status === 'liberado') {
      toast({
        title: 'Operação Bloqueada',
        description: `Exame com status "${ex.status.toUpperCase()}" não permite início de análise.`,
        variant: 'destructive',
      })
      return
    }
    setModalAnalise(ex)
    setRespAnaliseNome(
      user?.name ? `${user.name} (Laboratório Municipal)` : 'Setor de Bioquímica / Radiologia',
    )
  }

  const handleConfirmarAnalise = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalAnalise) return
    setProcessandoAcao(true)
    try {
      await iniciarAnaliseExame({
        exameId: modalAnalise.id,
        responsavel_analise_nome: respAnaliseNome.trim() || 'Laboratório Central',
      })
      toast({
        title: 'Análise Iniciada',
        description: `Exame "${modalAnalise.tipo_exame}" entrou na bancada de análise.`,
      })
      setModalAnalise(null)
      carregar()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao iniciar análise.',
        variant: 'destructive',
      })
    } finally {
      setProcessandoAcao(false)
    }
  }

  const abrirModalLaudo = (ex: ExameItem) => {
    if (ex.status === 'cancelado') {
      toast({
        title: 'Exame Cancelado',
        description: 'Não é possível redigir laudo para exame cancelado.',
        variant: 'destructive',
      })
      return
    }
    if (ex.status === 'liberado') {
      toast({
        title: 'Laudo já Liberado',
        description:
          'Este laudo já foi finalizado. Utilize a opção "Retificar Laudo" para registrar uma nova versão formal.',
      })
      abrirModalRetificar(ex)
      return
    }
    setModalLaudo(ex)
    setResultadoSumario(ex.resultado_sumario || 'Normal / Sem alterações')
    setLaudoTexto(ex.laudo_texto || '')
  }

  const abrirModalRetificar = (ex: ExameItem) => {
    if (!podeLaudar) {
      toast({
        title: 'Permissão Negada',
        description: 'Apenas profissionais de saúde médicos/autorizados podem retificar laudos.',
        variant: 'destructive',
      })
      return
    }
    if (ex.status === 'cancelado') {
      toast({
        title: 'Operação Bloqueada',
        description: 'Exame cancelado não pode ser retificado.',
        variant: 'destructive',
      })
      return
    }
    setModalRetificar(ex)
    setMotivoRetificacao('')
    setResultadoSumarioRetif(ex.resultado_sumario || 'Alterado')
    setLaudoTextoRetif(ex.laudo_texto || '')
    setIdempotencyKeyRetif(
      `retif_exa_${ex.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    )
  }

  const handleConfirmarRetificacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalRetificar) return

    if (!motivoRetificacao.trim() || motivoRetificacao.trim().length < 5) {
      toast({
        title: 'Justificativa Obrigatória',
        description:
          'A retificação formal exige uma justificativa clínica com no mínimo 5 caracteres.',
        variant: 'destructive',
      })
      return
    }

    if (!laudoTextoRetif.trim()) {
      toast({
        title: 'Texto do Laudo Obrigatório',
        description: 'Informe o novo texto retificado do laudo.',
        variant: 'destructive',
      })
      return
    }

    setProcessandoAcao(true)
    const chaveOperacao =
      idempotencyKeyRetif ||
      `retif_exa_${modalRetificar.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    try {
      await retificarLaudoExame({
        exameId: modalRetificar.id,
        motivo_retificacao: motivoRetificacao.trim(),
        resultado_sumario: resultadoSumarioRetif.trim(),
        laudo_texto: laudoTextoRetif.trim(),
        responsavel_laudo: user?.id,
        responsavel_laudo_nome: user?.name || 'Profissional Responsável',
        responsavel_laudo_cargo: user?.cargo || user?.role || 'Médico',
        idempotencyKey: chaveOperacao,
      })

      toast({
        title: 'Laudo Retificado com Sucesso',
        description: `Nova versão gerada formalmente. A versão anterior foi arquivada no histórico imutável.`,
      })
      setModalRetificar(null)
      carregar()
    } catch (err: any) {
      console.error(err)
      // Mensagem de conflito/idempotência SEM perder o texto digitado
      toast({
        title: 'Erro ou Conflito ao Retificar Laudo',
        description: `${err.message || 'Falha ao processar retificação'}. Seu texto e justificativa foram preservados para reenvio.`,
        variant: 'destructive',
      })
    } finally {
      setProcessandoAcao(false)
    }
  }

  const handleAbrirVisualizar = async (ex: ExameItem) => {
    setModalVisualizar(ex)
    setVersoesVisualizar([])
    if (ex.status === 'liberado' || ex.tem_retificacao) {
      setCarregandoVersoes(true)
      try {
        const versoes = await listarVersoesLaudo(ex.id)
        setVersoesVisualizar(versoes)
      } catch (err) {
        console.error('Erro ao carregar versões do laudo:', err)
      } finally {
        setCarregandoVersoes(false)
      }
    }
  }

  const handleConfirmarLaudo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalLaudo) return
    if (!podeLaudar) {
      toast({
        title: 'Permissão Negada',
        description: 'Apenas profissionais de saúde médicos/autorizados podem emitir laudos.',
        variant: 'destructive',
      })
      return
    }

    if (!laudoTexto.trim()) {
      toast({
        title: 'Texto do Laudo Obrigatório',
        description: 'Digite o parecer técnico, valores de referência ou laudo descritivo.',
        variant: 'destructive',
      })
      return
    }

    setProcessandoAcao(true)
    try {
      await emitirLaudoExame({
        exameId: modalLaudo.id,
        responsavel_laudo: user?.id,
        responsavel_laudo_nome: user?.name || 'Profissional Responsável',
        resultado_sumario: resultadoSumario,
        laudo_texto: laudoTexto.trim(),
      })
      toast({
        title: 'Laudo Liberado no Prontuário',
        description: `O exame "${modalLaudo.tipo_exame}" foi liberado e já aparece na linha do tempo do paciente.`,
      })
      setModalLaudo(null)
      carregar()
    } catch (err: any) {
      toast({
        title: 'Erro ao liberar laudo',
        description: err.message || 'Falha ao salvar laudo.',
        variant: 'destructive',
      })
    } finally {
      setProcessandoAcao(false)
    }
  }

  const abrirModalCancelar = (ex: ExameItem) => {
    setModalCancelar(ex)
    setMotivoCancelamento('')
  }

  const handleConfirmarCancelamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalCancelar) return
    if (!motivoCancelamento.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Justifique formalmente o cancelamento do exame.',
        variant: 'destructive',
      })
      return
    }

    setProcessandoAcao(true)
    try {
      await cancelarExame({
        exameId: modalCancelar.id,
        motivo_cancelamento: motivoCancelamento.trim(),
        usuario_nome: user?.name || 'Operador',
      })
      toast({
        title: 'Exame Cancelado',
        description: `Exame cancelado e registrado na trilha de auditoria.`,
      })
      setModalCancelar(null)
      carregar()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao cancelar exame.',
        variant: 'destructive',
      })
    } finally {
      setProcessandoAcao(false)
    }
  }

  const renderBadgeStatus = (status: StatusExame) => {
    switch (status) {
      case 'solicitado':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1 font-semibold text-[11px]">
            <Clock className="w-3 h-3 text-amber-600" />
            1. Solicitado
          </Badge>
        )
      case 'coletado':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1 font-semibold text-[11px]">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            2. Coletado
          </Badge>
        )
      case 'em_analise':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 flex items-center gap-1 font-semibold text-[11px]">
            <Microscope className="w-3 h-3 text-purple-600" />
            3. Em Análise
          </Badge>
        )
      case 'liberado':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1 font-bold text-[11px]">
            <FlaskConical className="w-3 h-3 text-emerald-600" />
            4. Liberado / Laudado
          </Badge>
        )
      case 'cancelado':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 flex items-center gap-1 text-[11px]">
            <XCircle className="w-3 h-3 text-red-600" />
            Cancelado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. TOPO: Título e Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Módulo de Exames & Laudos Diagnósticos
                </h1>
                <Badge
                  variant="outline"
                  className="bg-teal-50 text-teal-700 border-teal-200 text-[10px]"
                >
                  Ciclo Sem Papel
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Do pedido médico à liberação do resultado integrada em tempo real ao prontuário
                eletrônico (SAME)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregar}
            disabled={loading}
            className="text-slate-600"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Fila
          </Button>

          {podeSolicitar && (
            <Button
              size="sm"
              onClick={() => setModalNovoExame(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Solicitar Novo Exame
            </Button>
          )}
        </div>
      </div>

      {/* 2. CARDS DE RESUMO DO FLUXO (KANBAN METRICS) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setFiltroStatus('solicitado')}
          className={`p-3 rounded-xl border text-left transition-all ${
            filtroStatus === 'solicitado'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase">1. Solicitados</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{contadores.solicitados}</div>
          <p className="text-[10px] text-slate-500">Aguardando Coleta</p>
        </button>

        <button
          onClick={() => setFiltroStatus('coletado')}
          className={`p-3 rounded-xl border text-left transition-all ${
            filtroStatus === 'coletado'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-800 uppercase">2. Coletados</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{contadores.coletados}</div>
          <p className="text-[10px] text-slate-500">Aguardando Análise</p>
        </button>

        <button
          onClick={() => setFiltroStatus('em_analise')}
          className={`p-3 rounded-xl border text-left transition-all ${
            filtroStatus === 'em_analise'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-800 uppercase">3. Em Análise</span>
            <Microscope className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{contadores.em_analise}</div>
          <p className="text-[10px] text-slate-500">Laboratório / Raio-X</p>
        </button>

        <button
          onClick={() => setFiltroStatus('liberado')}
          className={`p-3 rounded-xl border text-left transition-all ${
            filtroStatus === 'liberado'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase">4. Liberados</span>
            <FlaskConical className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{contadores.liberados}</div>
          <p className="text-[10px] text-slate-500">Com Laudo no Prontuário</p>
        </button>

        <button
          onClick={() => setFiltroStatus('cancelado')}
          className={`p-3 rounded-xl border text-left transition-all col-span-2 sm:col-span-1 ${
            filtroStatus === 'cancelado'
              ? 'bg-red-50 border-red-300 ring-2 ring-red-400'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-800 uppercase">Cancelados</span>
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{contadores.cancelados}</div>
          <p className="text-[10px] text-slate-500">Auditoria / Histórico</p>
        </button>
      </div>

      {/* 3. BARRA DE FILTROS */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Filtros:
            </span>

            {/* Status */}
            <Select value={filtroStatus} onValueChange={(val: any) => setFiltroStatus(val)}>
              <SelectTrigger className="text-xs h-8 w-40 bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status ({exames.length})</SelectItem>
                <SelectItem value="solicitado">1. Solicitados</SelectItem>
                <SelectItem value="coletado">2. Coletados</SelectItem>
                <SelectItem value="em_analise">3. Em Análise</SelectItem>
                <SelectItem value="liberado">4. Liberados / Laudados</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>

            {/* Setor */}
            <Select value={filtroSetor} onValueChange={setFiltroSetor}>
              <SelectTrigger className="text-xs h-8 w-44 bg-white">
                <SelectValue placeholder="Setor Solicitante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Setores</SelectItem>
                {setores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Prioridade */}
            <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
              <SelectTrigger className="text-xs h-8 w-32 bg-white">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Prioridades</SelectItem>
                <SelectItem value="urgente">Urgência</SelectItem>
                <SelectItem value="eletiva">Eletiva</SelectItem>
              </SelectContent>
            </Select>

            {(filtroStatus !== 'todos' ||
              filtroSetor !== 'todos' ||
              filtroPrioridade !== 'todos' ||
              buscaTexto) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFiltroStatus('todos')
                  setFiltroSetor('todos')
                  setFiltroPrioridade('todos')
                  setBuscaTexto('')
                }}
                className="text-xs h-8 text-red-600"
              >
                Limpar
              </Button>
            )}
          </div>

          <div className="w-full md:w-72">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="Buscar paciente, exame ou médico..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="text-xs h-8 pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. TABELA PRINCIPAL DA FILA DE EXAMES */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Microscope className="w-4 h-4 text-teal-600" />
            Fila de Exames em Andamento & Histórico
          </CardTitle>
          <span className="text-xs text-slate-500">
            Exibindo <strong>{examesFiltrados.length}</strong> de <strong>{exames.length}</strong>{' '}
            exames
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              <span>Carregando fila de exames...</span>
            </div>
          ) : examesFiltrados.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs space-y-1">
              <p className="font-semibold text-slate-700">
                Nenhum exame encontrado para estes filtros.
              </p>
              <p className="text-slate-400">
                Verifique os filtros selecionados ou cadastre uma nova solicitação.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Data / Hora</th>
                    <th className="p-3">Paciente (SUS)</th>
                    <th className="p-3">Exame Solicitado</th>
                    <th className="p-3">Prioridade</th>
                    <th className="p-3">Setor / Origem</th>
                    <th className="p-3">Status Atual</th>
                    <th className="p-3">Resultado / Parecer</th>
                    <th className="p-3 text-right">Ações no Fluxo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {examesFiltrados.map((item) => {
                    const pac = item.expand?.paciente
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Data */}
                        <td className="p-3 whitespace-nowrap text-slate-600 font-mono">
                          {item.data_solicitacao}
                        </td>

                        {/* Paciente com dados mascarados */}
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{pac?.nome || 'Paciente'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            SUS: {pac?.cartao_sus ? mascararCNS(pac.cartao_sus) : 'N/A'}
                            {pac?.cpf && ` • CPF: ${mascararCPF(pac.cpf)}`}
                          </div>
                          {pac?.alergias && (
                            <span className="text-[10px] text-red-600 font-medium block truncate max-w-[180px]">
                              Alergias: {pac.alergias}
                            </span>
                          )}
                        </td>

                        {/* Tipo Exame */}
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{item.tipo_exame}</div>
                          {item.categoria && (
                            <span className="text-[10px] text-slate-400 capitalize">
                              {item.categoria}
                            </span>
                          )}
                          {item.justificativa && (
                            <p
                              className="text-[10px] text-slate-500 italic truncate max-w-xs"
                              title={item.justificativa}
                            >
                              Justif: {item.justificativa}
                            </p>
                          )}
                        </td>

                        {/* Prioridade */}
                        <td className="p-3">
                          {item.prioridade === 'urgente' ? (
                            <Badge className="bg-red-600 text-white font-bold text-[10px]">
                              URGENTE
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-600 text-[10px]">
                              Eletiva
                            </Badge>
                          )}
                        </td>

                        {/* Setor / Origem */}
                        <td className="p-3 text-slate-600">
                          {item.expand?.setor?.nome ||
                            (item.atendimento_pa
                              ? 'Pronto Atendimento (PA)'
                              : item.internacao
                                ? 'Internação'
                                : 'Ambulatório')}
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            Por: {item.solicitante_nome}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-3">{renderBadgeStatus(item.status)}</td>

                        {/* Resultado */}
                        <td className="p-3">
                          {item.status === 'liberado' ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-emerald-800 text-[11px] block">
                                  {item.resultado_sumario || 'Concluído'}
                                </span>
                                {item.tem_retificacao && (
                                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] font-bold px-1 py-0">
                                    v{item.versao_atual || 2} Retificado
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 block">
                                Laudado: {item.responsavel_laudo_nome || 'Médico'}
                              </span>
                            </div>
                          ) : item.status === 'cancelado' ? (
                            <span
                              className="text-[10px] text-red-600 truncate max-w-[140px] block"
                              title={item.motivo_cancelamento}
                            >
                              Canc: {item.motivo_cancelamento || 'Sem motivo'}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">- Em andamento -</span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="p-3 text-right whitespace-nowrap space-x-1">
                          {/* Visualizar Ficha / Laudo */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAbrirVisualizar(item)}
                            className="h-7 text-xs text-slate-700 hover:text-blue-700"
                            title="Ver detalhes do pedido, laudo e histórico"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Ver
                          </Button>

                          {/* 1 -> 2: Coletar Material (bloqueado para liberado ou cancelado) */}
                          {item.status === 'solicitado' && podeColetar && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => abrirModalColeta(item)}
                              disabled={processandoAcao}
                              className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              Registrar Coleta
                            </Button>
                          )}

                          {/* 2 -> 3: Iniciar Análise */}
                          {item.status === 'coletado' && podeColetar && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => abrirModalAnalise(item)}
                              disabled={processandoAcao}
                              className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                            >
                              Iniciar Análise
                            </Button>
                          )}

                          {/* 3 -> 4: Redigir Laudo (Liberar) - Apenas profissional/admin */}
                          {item.status === 'em_analise' && podeLaudar && (
                            <Button
                              size="sm"
                              onClick={() => abrirModalLaudo(item)}
                              disabled={processandoAcao}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                              Redigir Laudo
                            </Button>
                          )}

                          {/* Retificar Laudo já Liberado (preserva original e cria v2 com motivo) */}
                          {item.status === 'liberado' && podeLaudar && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirModalRetificar(item)}
                              disabled={processandoAcao}
                              className="h-7 text-xs border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 font-semibold"
                              title="Retificar laudo liberado gerando nova versão formal"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-700" />
                              Retificar
                            </Button>
                          )}

                          {/* Cancelamento (apenas se não estiver liberado ou cancelado) */}
                          {item.status !== 'liberado' && item.status !== 'cancelado' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirModalCancelar(item)}
                              disabled={processandoAcao}
                              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Cancelar exame"
                            >
                              Cancelar
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL 1: REGISTRAR COLETA DE MATERIAL */}
      <Dialog open={Boolean(modalColeta)} onOpenChange={() => setModalColeta(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              Registrar Coleta do Exame
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirmar que o material biológico ou preparação radiológica foi realizada
            </DialogDescription>
          </DialogHeader>

          {modalColeta && (
            <form onSubmit={handleConfirmarColeta} className="space-y-3 pt-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                <div>
                  <strong>Paciente:</strong> {modalColeta.expand?.paciente?.nome}
                </div>
                <div>
                  <strong>Exame:</strong> {modalColeta.tipo_exame} (
                  {modalColeta.prioridade.toUpperCase()})
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Responsável pela Coleta *</Label>
                <Input
                  value={respColetaNome}
                  onChange={(e) => setRespColetaNome(e.target.value)}
                  placeholder="Nome do profissional / técnico de enfermagem"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Observações da Coleta (opcional)</Label>
                <Input
                  value={obsColeta}
                  onChange={(e) => setObsColeta(e.target.value)}
                  placeholder="Ex: Coleta a vácuo em tubo EDTA, punção única sem intercorrências..."
                  className="text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalColeta(null)}
                  disabled={processandoAcao}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={processandoAcao}
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  {processandoAcao ? 'Confirmando...' : 'Confirmar Coleta Realizada'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: INICIAR ANÁLISE NO LABORATÓRIO / RADIOLOGIA */}
      <Dialog open={Boolean(modalAnalise)} onOpenChange={() => setModalAnalise(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Microscope className="w-5 h-5 text-purple-600" />
              Iniciar Análise Laboratorial / Imagem
            </DialogTitle>
            <DialogDescription className="text-xs">
              Muda o status do exame para "Em Análise" indicando processamento técnico
            </DialogDescription>
          </DialogHeader>

          {modalAnalise && (
            <form onSubmit={handleConfirmarAnalise} className="space-y-3 pt-2">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded text-xs space-y-1 text-purple-950">
                <div>
                  <strong>Exame:</strong> {modalAnalise.tipo_exame}
                </div>
                <div>
                  <strong>Paciente:</strong> {modalAnalise.expand?.paciente?.nome}
                </div>
                <div>
                  <strong>Coletado em:</strong> {modalAnalise.data_coleta || 'N/I'} (Por:{' '}
                  {modalAnalise.responsavel_coleta_nome || 'Equipe'})
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Bancada / Setor de Análise *</Label>
                <Input
                  value={respAnaliseNome}
                  onChange={(e) => setRespAnaliseNome(e.target.value)}
                  placeholder="Ex: Laboratório Municipal - Bancada de Hematologia"
                  className="text-xs"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalAnalise(null)}
                  disabled={processandoAcao}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={processandoAcao}
                  className="bg-purple-600 hover:bg-purple-500 text-white"
                >
                  {processandoAcao ? 'Gravando...' : 'Colocar em Análise'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 3: REDIGIR LAUDO / RESULTADO (LIBERAR) */}
      <Dialog open={Boolean(modalLaudo)} onOpenChange={() => setModalLaudo(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-emerald-600" />
              Digitação e Liberação de Laudo / Resultado
            </DialogTitle>
            <DialogDescription className="text-xs">
              O laudo será anexado imediatamente ao prontuário eletrônico do paciente no SAME
            </DialogDescription>
          </DialogHeader>

          {modalLaudo && (
            <form onSubmit={handleConfirmarLaudo} className="space-y-4 pt-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">
                    Paciente: {modalLaudo.expand?.paciente?.nome}
                  </span>
                  <span className="font-mono text-slate-500">
                    SUS: {modalLaudo.expand?.paciente?.cartao_sus}
                  </span>
                </div>
                <div>
                  <strong>Exame:</strong> {modalLaudo.tipo_exame}
                </div>
                {modalLaudo.justificativa && (
                  <div className="text-slate-600 italic">Indicação: {modalLaudo.justificativa}</div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Conclusão / Sumário do Resultado *</Label>
                <Input
                  value={resultadoSumario}
                  onChange={(e) => setResultadoSumario(e.target.value)}
                  placeholder="Ex: Normal, Alterado com Leucocitose, Infiltrado Alveolar em Base Direita..."
                  className="text-xs font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Texto Completo do Laudo / Parâmetros Técnicos *
                </Label>
                <Textarea
                  value={laudoTexto}
                  onChange={(e) => setLaudoTexto(e.target.value)}
                  placeholder="Descreva os achados, parâmetros laboratoriais com valores de referência, ou relatório radiológico minucioso..."
                  className="text-xs font-mono"
                  rows={8}
                  required
                />
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-950 space-y-1">
                <div className="font-bold">Responsável pela Emissão:</div>
                <div>
                  {user?.name} ({user?.cargo || user?.role} • {user?.registro_profissional || 'SMS'}
                  )
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalLaudo(null)}
                  disabled={processandoAcao}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={processandoAcao}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {processandoAcao ? 'Liberando Laudo...' : 'Liberar Laudo no Prontuário'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 4: VISUALIZAR LAUDO COMPLETO E HISTÓRICO */}
      <Dialog open={Boolean(modalVisualizar)} onOpenChange={() => setModalVisualizar(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Ficha Completa do Exame & Laudo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Trilha de eventos, solicitação, coleta e resultado laudo
            </DialogDescription>
          </DialogHeader>

          {modalVisualizar && (
            <div className="space-y-4 text-xs pt-1">
              {/* Paciente e Exame */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-sm">
                    {modalVisualizar.expand?.paciente?.nome}
                  </span>
                  {renderBadgeStatus(modalVisualizar.status)}
                </div>
                <div className="text-slate-500">
                  SUS: {modalVisualizar.expand?.paciente?.cartao_sus}
                </div>
                <div className="pt-1 text-slate-800 font-semibold">
                  Exame: {modalVisualizar.tipo_exame} ({modalVisualizar.prioridade.toUpperCase()})
                </div>
              </div>

              {/* Detalhes do Ciclo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-white border border-slate-200 rounded-lg">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Solicitação
                  </span>
                  <div className="text-slate-800">{modalVisualizar.data_solicitacao}</div>
                  <div className="text-slate-500 text-[11px]">
                    Por: {modalVisualizar.solicitante_nome}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Coleta do Material
                  </span>
                  <div className="text-slate-800">{modalVisualizar.data_coleta || 'Pendente'}</div>
                  <div className="text-slate-500 text-[11px]">
                    {modalVisualizar.responsavel_coleta_nome
                      ? `Por: ${modalVisualizar.responsavel_coleta_nome}`
                      : ''}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Início da Análise
                  </span>
                  <div className="text-slate-800">
                    {modalVisualizar.data_inicio_analise || 'Pendente'}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    {modalVisualizar.responsavel_analise_nome || ''}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Liberação do Laudo
                  </span>
                  <div className="text-slate-800">{modalVisualizar.data_laudo || 'Aguardando'}</div>
                  <div className="text-slate-500 text-[11px]">
                    {modalVisualizar.responsavel_laudo_nome
                      ? `Por: ${modalVisualizar.responsavel_laudo_nome}`
                      : ''}
                  </div>
                </div>
              </div>

              {/* Justificativa */}
              {modalVisualizar.justificativa && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">
                    Justificativa Clínica:
                  </span>
                  <p className="bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-800">
                    {modalVisualizar.justificativa}
                  </p>
                </div>
              )}

              {/* Laudo e Resultado (Se liberado) - Versão Vigente e Histórico Completo */}
              {modalVisualizar.status === 'liberado' && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50/70 border-2 border-emerald-500 rounded-lg space-y-2">
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-950 uppercase tracking-wide">
                          Resultado / Laudo Conclusivo
                        </span>
                        <Badge className="bg-emerald-700 text-white font-bold text-[10px]">
                          VERSÃO VIGENTE{' '}
                          {modalVisualizar.versao_atual
                            ? `(v${modalVisualizar.versao_atual})`
                            : '(v1)'}
                        </Badge>
                      </div>
                      <Badge className="bg-emerald-600 text-white font-bold">
                        {modalVisualizar.resultado_sumario || 'Liberado'}
                      </Badge>
                    </div>
                    <p className="whitespace-pre-wrap font-mono text-slate-800 bg-white p-3 rounded border border-emerald-200 leading-relaxed">
                      {modalVisualizar.laudo_texto || 'Sem texto descritivo.'}
                    </p>
                    <div className="text-[11px] text-emerald-900 flex justify-between pt-1">
                      <span>
                        Responsável:{' '}
                        <strong>{modalVisualizar.responsavel_laudo_nome || 'Profissional'}</strong>
                      </span>
                      <span>Liberado em: {modalVisualizar.data_laudo || 'Data registrada'}</span>
                    </div>
                  </div>

                  {/* Bloco de Histórico de Versões do Laudo */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <History className="w-4 h-4 text-purple-600" />
                        Histórico de Versões do Laudo (Imutabilidade Registrada)
                      </span>
                      {versoesVisualizar.length > 1 && (
                        <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px]">
                          {versoesVisualizar.length} Versões Registradas
                        </Badge>
                      )}
                    </div>

                    {carregandoVersoes ? (
                      <div className="py-2 text-center text-slate-500 text-xs flex items-center justify-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                        Carregando versões anteriores...
                      </div>
                    ) : versoesVisualizar.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">
                        Laudo em sua 1ª versão original, sem retificações posteriores.
                      </p>
                    ) : (
                      <div className="space-y-2 pt-1">
                        {versoesVisualizar.map((ver) => {
                          const isVigente =
                            ver.numero_versao ===
                            (modalVisualizar.versao_atual ||
                              versoesVisualizar[versoesVisualizar.length - 1]?.numero_versao)
                          return (
                            <div
                              key={ver.id}
                              className={`p-2.5 rounded border text-xs space-y-1 ${
                                isVigente
                                  ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">
                                  Versão {ver.numero_versao} {isVigente && '(VIGENTE ATUAL)'}
                                </span>
                                <Badge
                                  className={
                                    isVigente
                                      ? 'bg-emerald-600 text-white text-[9px]'
                                      : 'bg-slate-200 text-slate-700 text-[9px]'
                                  }
                                >
                                  {isVigente ? 'Vigente' : 'Versão Arquivada'}
                                </Badge>
                              </div>

                              <div className="text-[11px] text-slate-600">
                                Emitido em: <strong>{ver.data_laudo}</strong> por{' '}
                                <strong>{ver.responsavel_laudo_nome}</strong>
                                {ver.responsavel_laudo_cargo && ` (${ver.responsavel_laudo_cargo})`}
                              </div>

                              {ver.motivo_retificacao && (
                                <div className="p-1.5 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-950">
                                  <strong>Motivo da retificação:</strong> {ver.motivo_retificacao}
                                </div>
                              )}

                              <div className="text-[11px] font-mono text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-100 mt-1">
                                <strong>Sumário:</strong> {ver.resultado_sumario}
                                <div className="mt-0.5 text-slate-600 truncate max-w-lg">
                                  {ver.laudo_texto}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Cancelamento (se cancelado) */}
              {modalVisualizar.status === 'cancelado' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 space-y-1">
                  <span className="font-bold">Motivo do Cancelamento:</span>
                  <p className="text-slate-700 bg-white p-2 rounded border border-red-100">
                    {modalVisualizar.motivo_cancelamento || 'Não detalhado'}
                  </p>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalVisualizar(null)}
                >
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 6: RETIFICAÇÃO FORMAL DE LAUDO (COM JUSTIFICATIVA OBRIGATÓRIA MIN 5) */}
      <Dialog
        open={Boolean(modalRetificar)}
        onOpenChange={() => !processandoAcao && setModalRetificar(null)}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-amber-950">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              Retificação Formal de Laudo Finalizado
            </DialogTitle>
            <DialogDescription className="text-xs">
              Gera uma nova versão formal no banco. A versão original é 100% preservada na coleção
              imutável com justificativa clínica, autor e data.
            </DialogDescription>
          </DialogHeader>

          {modalRetificar && (
            <form onSubmit={handleConfirmarRetificacao} className="space-y-4 pt-1">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs space-y-1 text-amber-950">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-amber-900">
                    Paciente: {modalRetificar.expand?.paciente?.nome}
                  </span>
                  <Badge className="bg-amber-600 text-white text-[10px]">
                    Versão Atual: v{modalRetificar.versao_atual || 1}
                  </Badge>
                </div>
                <div>
                  <strong>Exame:</strong> {modalRetificar.tipo_exame}
                </div>
                <div className="text-[11px] text-amber-800">
                  Laudo vigente liberado por: {modalRetificar.responsavel_laudo_nome || 'Médico'} em{' '}
                  {modalRetificar.data_laudo || 'Data'}
                </div>
              </div>

              {/* Justificativa Obrigatória (mínimo 5 caracteres) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-rose-950 flex items-center gap-1">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                    Motivo / Justificativa Clínica da Retificação *
                  </Label>
                  <span className="text-[10px] text-slate-500">Mínimo 5 caracteres</span>
                </div>
                <Textarea
                  value={motivoRetificacao}
                  onChange={(e) => setMotivoRetificacao(e.target.value)}
                  placeholder="Informe detalhadamente a razão técnica/clínica da correção (ex: Correção de digitação de valores de plaquetas conforme nova lâmina manual)..."
                  className="text-xs border-amber-300 focus-visible:ring-amber-500"
                  rows={3}
                  required
                  disabled={processandoAcao}
                />
              </div>

              {/* Novo Sumário / Parecer */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Novo Sumário / Conclusão *</Label>
                <Input
                  value={resultadoSumarioRetif}
                  onChange={(e) => setResultadoSumarioRetif(e.target.value)}
                  placeholder="Ex: Alterado - Plaquetopenia Leve"
                  className="text-xs font-semibold"
                  required
                  disabled={processandoAcao}
                />
              </div>

              {/* Novo Texto do Laudo */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Texto Completo do Laudo Retificado *
                </Label>
                <Textarea
                  value={laudoTextoRetif}
                  onChange={(e) => setLaudoTextoRetif(e.target.value)}
                  placeholder="Descreva o novo laudo retificado na íntegra..."
                  className="text-xs font-mono"
                  rows={7}
                  required
                  disabled={processandoAcao}
                />
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 space-y-1">
                <div>
                  <strong>Profissional Responsável pela Retificação:</strong> {user?.name} (
                  {user?.cargo || user?.role})
                </div>
                <div className="text-[10px] text-slate-500">
                  Proteção de idempotência ativa com chave única. O original não será sobrescrito
                  nem apagado.
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalRetificar(null)}
                  disabled={processandoAcao}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={processandoAcao}
                  className="bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5"
                >
                  {processandoAcao ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gravando Nova Versão...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Emitir Retificação Formal
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 5: CANCELAR EXAME */}
      <Dialog open={Boolean(modalCancelar)} onOpenChange={() => setModalCancelar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5 text-red-600" />
              Cancelar Pedido de Exame
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe a justificativa do cancelamento para registrar na trilha de auditoria
            </DialogDescription>
          </DialogHeader>

          {modalCancelar && (
            <form onSubmit={handleConfirmarCancelamento} className="space-y-3 pt-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                <div>
                  <strong>Exame:</strong> {modalCancelar.tipo_exame}
                </div>
                <div>
                  <strong>Paciente:</strong> {modalCancelar.expand?.paciente?.nome}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Motivo do Cancelamento *</Label>
                <Textarea
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  placeholder="Ex: Paciente recebeu alta antes da coleta, amostra hemolisada com recusa do paciente, pedido duplicado..."
                  className="text-xs"
                  rows={3}
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalCancelar(null)}
                  disabled={processandoAcao}
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={processandoAcao}
                  className="bg-red-600 hover:bg-red-500 text-white"
                >
                  {processandoAcao ? 'Cancelando...' : 'Confirmar Cancelamento'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE SOLICITAÇÃO DIRETA NO MÓDULO */}
      <ModalSolicitarExame
        aberto={modalNovoExame}
        onClose={() => setModalNovoExame(false)}
        paciente={pacientes[0]}
        onSucesso={() => carregar()}
      />
    </div>
  )
}
