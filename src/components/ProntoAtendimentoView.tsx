import React, { useState, useEffect, useMemo } from 'react'
import {
  FichaProntoAtendimento,
  Paciente,
  Profissional,
  Leito,
  Setor,
  ClassificacaoRisco,
  CondutaPA,
} from '@/types/hospital'
import {
  listarAtendimentosPA,
  criarEntradaPA,
  registrarTriagemPA,
  iniciarAtendimentoPA,
  finalizarAtendimentoPA,
  PESO_RISCO,
} from '@/services/prontoAtendimento'
import {
  listarPacientes,
  listarProfissionais,
  listarLeitos,
  listarSetores,
} from '@/services/cadastros'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Flame,
  UserPlus,
  Stethoscope,
  Activity,
  Bed,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
  Check,
  ShieldAlert,
  FlaskConical,
  Maximize2,
  Minimize2,
  Pill,
  Printer,
} from 'lucide-react'
import { ModalSolicitarExame } from '@/components/ModalSolicitarExame'
import { SecaoPrescricaoPAMedica } from '@/components/SecaoPrescricaoPAMedica'
import { ModalEmissaoImpresso } from '@/components/ModalEmissaoImpresso'
import { TipoImpressoAssistencial } from '@/types/hospital'

export const ProntoAtendimentoView: React.FC<{
  onNavegarInternacao?: () => void
  onNavegarAgendamento?: () => void
}> = ({ onNavegarInternacao, onNavegarAgendamento }) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [atendimentos, setAtendimentos] = useState<FichaProntoAtendimento[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [leitos, setLeitos] = useState<Leito[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState(false)

  // Filtros de Histórico
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroRisco, setFiltroRisco] = useState('todos')

  // Modais
  const [modalEntradaAberto, setModalEntradaAberto] = useState(false)
  const [modalTriagemAberto, setModalTriagemAberto] = useState(false)
  const [modalAtendimentoAberto, setModalAtendimentoAberto] = useState(false)
  const [modalAtendimentoMaximizado, setModalAtendimentoMaximizado] = useState(false)
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false)
  const [modalExamePAAberto, setModalExamePAAberto] = useState(false)
  const [modalImpressoAberto, setModalImpressoAberto] = useState(false)
  const [tipoImpressoInicial, setTipoImpressoInicial] =
    useState<TipoImpressoAssistencial>('receita')

  // Ficha em Foco
  const [fichaEmFoco, setFichaEmFoco] = useState<FichaProntoAtendimento | null>(null)

  // Form Entrada / Acolhimento
  const [buscaPacienteEntrada, setBuscaPacienteEntrada] = useState('')
  const [pacienteSelecionadoId, setPacienteSelecionadoId] = useState('')
  const [queixaEntrada, setQueixaEntrada] = useState('')

  // Form Triagem
  const [riscoTriagem, setRiscoTriagem] = useState<ClassificacaoRisco>('verde')
  const [queixaTriagem, setQueixaTriagem] = useState('')
  const [paTriagem, setPaTriagem] = useState('120/80')
  const [fcTriagem, setFcTriagem] = useState('78')
  const [tempTriagem, setTempTriagem] = useState('36.5')
  const [sato2Triagem, setSato2Triagem] = useState('98')
  const [discriminadorTriagem, setDiscriminadorTriagem] = useState('')

  // Form Atendimento Médico
  const [evolucaoAtend, setEvolucaoAtend] = useState('')
  const [diagnosticoAtend, setDiagnosticoAtend] = useState('')
  const [cid10Atend, setCid10Atend] = useState('')
  const [condutaAtend, setCondutaAtend] = useState<CondutaPA>('alta')
  const [obsCondutaAtend, setObsCondutaAtend] = useState('')
  const [erroAtendimento, setErroAtendimento] = useState<string | null>(null)
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null)

  // Conduta Extra: Internação
  const [leitoInternacaoId, setLeitoInternacaoId] = useState('')

  // Conduta Extra: Ambulatório
  const [profissionalAgendaId, setProfissionalAgendaId] = useState('')
  const [dataHoraAgenda, setDataHoraAgenda] = useState('')

  // Permissões
  const isRecepcao = user?.role === 'recepcao'
  const isProfissional = user?.role === 'profissional'
  const isGestorOuAdmin = user?.role === 'admin' || user?.role === 'gestor'
  const podeFazerTriagem = isRecepcao || isGestorOuAdmin
  const podeAtender = isProfissional || isGestorOuAdmin
  // Emissão de impressos assistenciais: restrito exclusivamente ao perfil profissional de saúde (conforme requisito 6)
  const podeEmitirImpresso = isProfissional

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    setErroCarregamento(null)
    try {
      const [ats, pacs, profs, lts, sts] = await Promise.all([
        listarAtendimentosPA(),
        listarPacientes(),
        listarProfissionais(),
        listarLeitos(),
        listarSetores(),
      ])
      setAtendimentos(ats)
      setPacientes(pacs)
      setProfissionais(profs)
      setLeitos(lts)
      setSetores(sts)
    } catch (err: any) {
      console.error(err)
      const msg = err?.message || 'Falha ao carregar dados do Pronto Atendimento.'
      setErroCarregamento(msg)
      toast({
        title: 'Erro de Carregamento',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Leitos vagos para conduta de internação
  const leitosVagos = useMemo(() => {
    return leitos.filter((l) => l.status === 'vago')
  }, [leitos])

  // Pacientes filtrados na busca do acolhimento
  const pacientesFiltrados = useMemo(() => {
    if (!buscaPacienteEntrada.trim()) return pacientes.slice(0, 10)
    const termo = buscaPacienteEntrada.toLowerCase()
    return pacientes.filter(
      (p) =>
        p.nome.toLowerCase().includes(termo) ||
        p.cartao_sus.includes(termo) ||
        (p.cpf && p.cpf.includes(termo)),
    )
  }, [pacientes, buscaPacienteEntrada])

  // Fila de Atendimento Ordenada por Gravidade (Risco Manchester) e depois Horário de Chegada
  const filaAtiva = useMemo(() => {
    const ativas = atendimentos.filter((a) => a.status !== 'finalizado')

    return ativas.sort((a, b) => {
      // 1º critério: Classificação de risco (vermelho > laranja > amarelo > verde > azul > sem triagem)
      const pesoA = a.classificacao_risco ? PESO_RISCO[a.classificacao_risco] : 99
      const pesoB = b.classificacao_risco ? PESO_RISCO[b.classificacao_risco] : 99

      if (pesoA !== pesoB) {
        return pesoA - pesoB
      }

      // 2º critério: Ordem de chegada mais antiga primeiro
      return a.data_hora_chegada.localeCompare(b.data_hora_chegada)
    })
  }, [atendimentos])

  // Histórico Filtrado
  const historicoFiltrado = useMemo(() => {
    return atendimentos.filter((a) => {
      const matchStatus = filtroStatus === 'todos' || a.status === filtroStatus
      const matchRisco = filtroRisco === 'todos' || a.classificacao_risco === filtroRisco

      let matchTexto = true
      if (filtroTexto.trim()) {
        const t = filtroTexto.toLowerCase()
        const nomePac = a.expand?.paciente?.nome?.toLowerCase() || ''
        const sus = a.expand?.paciente?.cartao_sus || ''
        const queixa = a.queixa_principal?.toLowerCase() || ''
        const diag = a.diagnostico?.toLowerCase() || ''
        matchTexto =
          nomePac.includes(t) || sus.includes(t) || queixa.includes(t) || diag.includes(t)
      }

      return matchStatus && matchRisco && matchTexto
    })
  }, [atendimentos, filtroStatus, filtroRisco, filtroTexto])

  // AÇÕES
  // 1. Abrir Modal de Entrada
  const abrirNovaEntrada = () => {
    setBuscaPacienteEntrada('')
    setPacienteSelecionadoId(pacientes[0]?.id || '')
    setQueixaEntrada('')
    setModalEntradaAberto(true)
  }

  const handleSalvarEntrada = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pacienteSelecionadoId) {
      toast({
        title: 'Selecione o paciente',
        description: 'É necessário vincular um paciente cadastrado pelo SUS.',
        variant: 'destructive',
      })
      return
    }

    const pacObj = pacientes.find((p) => p.id === pacienteSelecionadoId)
    setProcessando(true)
    try {
      await criarEntradaPA({
        paciente: pacienteSelecionadoId,
        queixa_principal: queixaEntrada.trim(),
        pacienteNome: pacObj?.nome,
      })

      toast({
        title: 'Acolhimento Realizado',
        description: `${pacObj?.nome || 'Paciente'} entrou na fila e está aguardando triagem.`,
      })
      setModalEntradaAberto(false)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao registrar entrada no PA.',
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  // 2. Abrir Modal de Triagem
  const abrirTriagem = (ficha: FichaProntoAtendimento) => {
    setFichaEmFoco(ficha)
    setRiscoTriagem(ficha.classificacao_risco || 'verde')
    setQueixaTriagem(ficha.queixa_principal || '')
    setDiscriminadorTriagem(ficha.discriminador || '')
    setPaTriagem('120/80')
    setFcTriagem('78')
    setTempTriagem('36.5')
    setSato2Triagem('98')
    setModalTriagemAberto(true)
  }

  const handleSalvarTriagem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fichaEmFoco) return

    if (!queixaTriagem.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe a queixa principal identificada na triagem.',
        variant: 'destructive',
      })
      return
    }

    const sinaisVitaisFormatados = `PA: ${paTriagem} mmHg | FC: ${fcTriagem} bpm | Temp: ${tempTriagem}°C | SatO2: ${sato2Triagem}%`

    setProcessando(true)
    try {
      await registrarTriagemPA({
        id: fichaEmFoco.id,
        classificacao_risco: riscoTriagem,
        queixa_principal: queixaTriagem.trim(),
        sinais_vitais: sinaisVitaisFormatados,
        discriminador: discriminadorTriagem.trim(),
        triador_nome: `${user?.name || 'Triador'} (${user?.cargo || user?.role || 'Triagem'})`,
        pacienteNome: fichaEmFoco.expand?.paciente?.nome,
      })

      toast({
        title: 'Triagem Registrada',
        description: `Paciente classificado como ${riscoTriagem.toUpperCase()} e liberado para atendimento médico.`,
      })
      setModalTriagemAberto(false)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao salvar triagem.',
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  // 3. Iniciar / Abrir Atendimento Médico
  const abrirAtendimento = async (ficha: FichaProntoAtendimento) => {
    setFichaEmFoco(ficha)
    setErroAtendimento(null)
    setEvolucaoAtend(ficha.evolucao_clinica || '')
    setDiagnosticoAtend(ficha.diagnostico || '')
    setCid10Atend(ficha.cid10 || '')
    setCondutaAtend(ficha.conduta || 'alta')
    setObsCondutaAtend(ficha.observacoes_conduta || '')
    setLeitoInternacaoId(leitosVagos[0]?.id || '')

    // Profissional para agenda (primeiro médico disponível)
    const medicos = profissionais.filter((p) => p.categoria === 'medico')
    setProfissionalAgendaId(medicos[0]?.id || profissionais[0]?.id || '')

    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    amanha.setHours(14, 0, 0, 0)
    setDataHoraAgenda(amanha.toISOString().slice(0, 16))

    // Se estiver apenas aguardando atendimento, avança o status para "em_atendimento"
    if (ficha.status === 'aguardando_atendimento') {
      try {
        const profId =
          profissionais.find((p) => p.email === user?.email)?.id ||
          profissionais[0]?.id ||
          user?.id ||
          ''
        await iniciarAtendimentoPA({
          id: ficha.id,
          profissionalId: profId,
          profissionalNome: user?.name,
        })
        carregarDados()
      } catch (err) {
        console.warn('Erro ao atualizar status para em_atendimento:', err)
      }
    }

    setModalAtendimentoAberto(true)
  }

  const handleSalvarAtendimento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fichaEmFoco) return

    if (!evolucaoAtend.trim() || !diagnosticoAtend.trim()) {
      toast({
        title: 'Campos Obrigatórios',
        description: 'Informe a evolução clínica e o diagnóstico do paciente.',
        variant: 'destructive',
      })
      return
    }

    if (condutaAtend === 'internacao' && !leitoInternacaoId) {
      toast({
        title: 'Leito Não Selecionado',
        description: 'Não há leito vago selecionado para a internação.',
        variant: 'destructive',
      })
      return
    }

    const leitoObj = leitos.find((l) => l.id === leitoInternacaoId)
    const profObj = profissionais.find((p) => p.id === profissionalAgendaId)

    if (processando) return
    setProcessando(true)
    setErroAtendimento(null)
    try {
      const profId =
        profissionais.find((p) => p.email === user?.email)?.id ||
        profissionais[0]?.id ||
        user?.id ||
        ''

      await finalizarAtendimentoPA({
        id: fichaEmFoco.id,
        ficha: fichaEmFoco,
        evolucao_clinica: evolucaoAtend.trim(),
        diagnostico: diagnosticoAtend.trim(),
        cid10: cid10Atend.trim(),
        conduta: condutaAtend,
        observacoes_conduta: obsCondutaAtend.trim(),
        profissionalId: profId,
        profissionalNome: user?.name || 'Profissional de Saúde',
        // Internação
        leitoInternacaoId: condutaAtend === 'internacao' ? leitoInternacaoId : undefined,
        setorInternacaoId: condutaAtend === 'internacao' ? leitoObj?.setor : undefined,
        leitoCodigo: leitoObj?.codigo,
        // Ambulatório
        profissionalAgendaId: condutaAtend === 'ambulatorio' ? profissionalAgendaId : undefined,
        setorAgendaId: profObj?.setor_padrao,
        dataHoraAgenda: condutaAtend === 'ambulatorio' ? dataHoraAgenda : undefined,
      })

      let descToast = 'Atendimento concluído com alta hospitalar.'
      if (condutaAtend === 'internacao') {
        descToast = `Atendimento concluído. Paciente internado no leito ${leitoObj?.codigo} com sucesso!`
      } else if (condutaAtend === 'ambulatorio') {
        descToast = `Atendimento concluído. Agendamento ambulatorial criado para ${dataHoraAgenda}.`
      }

      toast({
        title: 'Atendimento de PA Finalizado',
        description: descToast,
      })

      setErroAtendimento(null)
      setModalAtendimentoAberto(false)
      carregarDados()
    } catch (err: any) {
      const msg = err?.message || 'Falha ao registrar conduta no sistema.'
      // Preservação do texto: o modal permanece aberto e o estado do formulário NÃO é resetado
      setErroAtendimento(
        `A gravação falhou: ${msg}. Seu texto digitado foi preservado na tela para que não haja perda do registro clínico. Verifique e tente novamente.`,
      )
      toast({
        title: 'Falha na Gravação — Texto Preservado',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  // Cores de Badge de Risco
  const renderBadgeRisco = (risco?: ClassificacaoRisco) => {
    switch (risco) {
      case 'vermelho':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white shadow-sm">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Vermelho (Emergência)
          </span>
        )
      case 'laranja':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white shadow-sm">
            Laranja (Muito Urgente)
          </span>
        )
      case 'amarelo':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm">
            Amarelo (Urgente)
          </span>
        )
      case 'verde':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm">
            Verde (Pouco Urgente)
          </span>
        )
      case 'azul':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm">
            Azul (Não Urgente)
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
            Aguardando Triagem
          </span>
        )
    }
  }

  const renderBadgeStatus = (status: string) => {
    switch (status) {
      case 'aguardando_triagem':
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
            Aguardando Triagem
          </Badge>
        )
      case 'aguardando_atendimento':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
            Aguardando Atendimento
          </Badge>
        )
      case 'em_atendimento':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            Em Atendimento
          </Badge>
        )
      case 'finalizado':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
            Finalizado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-600" />
            Pronto Atendimento Municipal (PA / Urgência & Emergência)
          </h1>
          <p className="text-xs text-slate-500">
            Acolhimento, Classificação de Risco (Protocolo Manchester/SUS), Fila Dinâmica e Condutas
            Integradas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={loading}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          {podeFazerTriagem && (
            <Button
              onClick={abrirNovaEntrada}
              className="bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm shadow-sm h-9"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Nova Entrada no PA
            </Button>
          )}
        </div>
      </div>

      {/* Alerta de Falha de Carregamento */}
      {erroCarregamento && (
        <div
          role="alert"
          className="p-3.5 rounded-lg border border-red-300 bg-red-50 text-red-900 text-xs flex items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{erroCarregamento}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={carregarDados}
            className="h-7 text-xs bg-white text-red-700 border-red-300 hover:bg-red-100"
          >
            Tentar Novamente
          </Button>
        </div>
      )}

      {/* Cartões de Indicadores Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="text-xs text-slate-500 font-medium">Aguardando Triagem</div>
            <div className="text-2xl font-bold text-slate-800">
              {atendimentos.filter((a) => a.status === 'aguardando_triagem').length}
            </div>
            <div className="text-[11px] text-slate-400">Recepção / Enfermagem</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="text-xs text-slate-500 font-medium">Aguardando Consulta</div>
            <div className="text-2xl font-bold text-amber-600">
              {atendimentos.filter((a) => a.status === 'aguardando_atendimento').length}
            </div>
            <div className="text-[11px] text-slate-400">Fila por gravidade</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="text-xs text-slate-500 font-medium">Em Atendimento</div>
            <div className="text-2xl font-bold text-blue-600">
              {atendimentos.filter((a) => a.status === 'em_atendimento').length}
            </div>
            <div className="text-[11px] text-slate-400">Consultório médico</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="text-xs text-slate-500 font-medium">Leitos Vagos no Hospital</div>
            <div className="text-2xl font-bold text-emerald-600">{leitosVagos.length}</div>
            <div className="text-[11px] text-slate-400">Disponíveis p/ internação</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="fila" className="w-full">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="fila" className="text-xs sm:text-sm">
            Fila Ativa de Atendimento ({filaAtiva.length})
          </TabsTrigger>
          <TabsTrigger value="historico" className="text-xs sm:text-sm">
            Histórico & Atendimentos ({atendimentos.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FILA DINÂMICA DE PRONTO ATENDIMENTO */}
        <TabsContent value="fila" className="space-y-4 pt-2">
          {loading ? (
            <Card className="border-slate-200 text-center py-12">
              <CardContent className="space-y-2">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-700">
                  Carregando fila de pronto atendimento...
                </p>
                <p className="text-xs text-slate-400">
                  Consultando triagens e atendimentos médicos ativos
                </p>
              </CardContent>
            </Card>
          ) : filaAtiva.length === 0 ? (
            <Card className="border-slate-200 text-center py-12">
              <CardContent className="space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">Fila de PA zerada!</p>
                <p className="text-xs text-slate-400">
                  Nenhum paciente aguardando triagem ou atendimento médico no momento.
                </p>
                {podeFazerTriagem && (
                  <Button
                    onClick={abrirNovaEntrada}
                    variant="outline"
                    size="sm"
                    className="mt-2 text-xs"
                  >
                    Registrar Chegada de Paciente
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filaAtiva.map((item, idx) => {
                const pac = item.expand?.paciente
                return (
                  <Card
                    key={item.id}
                    className={`border transition-all shadow-sm ${
                      item.classificacao_risco === 'vermelho'
                        ? 'border-red-400 bg-red-50/20'
                        : item.classificacao_risco === 'laranja'
                          ? 'border-orange-300 bg-orange-50/20'
                          : item.classificacao_risco === 'amarelo'
                            ? 'border-amber-300 bg-amber-50/20'
                            : 'border-slate-200 bg-white'
                    }`}
                  >
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Coluna Esquerda: Paciente e Classificação */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                          <span className="font-semibold text-base text-slate-900">
                            {pac?.nome || 'Paciente não identificado'}
                          </span>
                          {renderBadgeRisco(item.classificacao_risco)}
                          {renderBadgeStatus(item.status)}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>
                            <strong>SUS:</strong> {pac?.cartao_sus || 'N/A'}
                          </span>
                          <span>
                            <strong>Idade:</strong> {pac?.data_nascimento || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Chegada: {item.data_hora_chegada}
                          </span>
                          {item.triador_nome && (
                            <span>
                              <strong>Triado por:</strong> {item.triador_nome}
                            </span>
                          )}
                        </div>

                        {/* Queixa & Sinais Vitais */}
                        <div className="text-xs bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 space-y-1">
                          <div>
                            <strong className="text-slate-700">Queixa Principal:</strong>{' '}
                            <span className="text-slate-600">
                              {item.queixa_principal || 'Sem queixa registrada'}
                            </span>
                          </div>
                          {item.discriminador && (
                            <div>
                              <strong className="text-slate-700">Discriminador:</strong>{' '}
                              <span className="text-slate-600">{item.discriminador}</span>
                            </div>
                          )}
                          {item.sinais_vitais && (
                            <div>
                              <strong className="text-slate-700">Sinais Vitais:</strong>{' '}
                              <span className="text-slate-600">{item.sinais_vitais}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Coluna Direita: Ações por perfil */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                        {/* Se aguarda triagem */}
                        {item.status === 'aguardando_triagem' && podeFazerTriagem && (
                          <Button
                            onClick={() => abrirTriagem(item)}
                            className="bg-blue-600 hover:bg-blue-500 text-xs shadow-sm"
                          >
                            <Activity className="w-3.5 h-3.5 mr-1.5" />
                            Realizar Triagem
                          </Button>
                        )}

                        {/* Se aguarda atendimento ou em atendimento */}
                        {(item.status === 'aguardando_atendimento' ||
                          item.status === 'em_atendimento') &&
                          podeAtender && (
                            <Button
                              onClick={() => abrirAtendimento(item)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-xs shadow-sm"
                            >
                              <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
                              {item.status === 'em_atendimento'
                                ? 'Continuar Consulta'
                                : 'Chamar Paciente'}
                            </Button>
                          )}

                        {/* Botão de Ver Ficha Completa */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFichaEmFoco(item)
                            setModalDetalhesAberto(true)
                          }}
                          className="text-xs"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" /> Detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: HISTÓRICO GERAL COM FILTROS */}
        <TabsContent value="historico" className="space-y-4 pt-2">
          {/* Filtros */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Filtrar por nome do paciente, cartão SUS ou diagnóstico..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="text-xs h-9 w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="aguardando_triagem">Aguardando Triagem</SelectItem>
                  <SelectItem value="aguardando_atendimento">Aguardando Atendimento</SelectItem>
                  <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                  <SelectItem value="finalizado">Finalizados</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroRisco} onValueChange={setFiltroRisco}>
                <SelectTrigger className="text-xs h-9 w-40">
                  <SelectValue placeholder="Risco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Riscos</SelectItem>
                  <SelectItem value="vermelho">Vermelho (Emergência)</SelectItem>
                  <SelectItem value="laranja">Laranja (Muito Urgente)</SelectItem>
                  <SelectItem value="amarelo">Amarelo (Urgente)</SelectItem>
                  <SelectItem value="verde">Verde (Pouco Urgente)</SelectItem>
                  <SelectItem value="azul">Azul (Não Urgente)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Listagem do Histórico */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="p-3">Data / Hora</th>
                    <th className="p-3">Paciente (Cartão SUS)</th>
                    <th className="p-3">Classificação</th>
                    <th className="p-3">Queixa Principal</th>
                    <th className="p-3">Conduta</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historicoFiltrado.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        Nenhum atendimento encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    historicoFiltrado.map((item) => {
                      const pac = item.expand?.paciente
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 whitespace-nowrap text-slate-500">
                            {item.data_hora_chegada}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">
                              {pac?.nome || 'Paciente'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              SUS: {pac?.cartao_sus || 'N/A'}
                            </div>
                          </td>
                          <td className="p-3">{renderBadgeRisco(item.classificacao_risco)}</td>
                          <td className="p-3 max-w-xs truncate text-slate-600">
                            {item.queixa_principal || '-'}
                          </td>
                          <td className="p-3">
                            {item.conduta === 'internacao' ? (
                              <Badge className="bg-red-100 text-red-700 border-red-200">
                                Internação ({item.expand?.leito_encaminhado?.codigo || 'Leito'})
                              </Badge>
                            ) : item.conduta === 'ambulatorio' ? (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                Ambulatório
                              </Badge>
                            ) : item.conduta === 'alta' ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                Alta Médica
                              </Badge>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3">{renderBadgeStatus(item.status)}</td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFichaEmFoco(item)
                                setModalDetalhesAberto(true)
                              }}
                              className="text-xs h-7 text-blue-600 hover:text-blue-700"
                            >
                              Ver Ficha
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: ENTRADA / ACOLHIMENTO */}
      <Dialog open={modalEntradaAberto} onOpenChange={setModalEntradaAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserPlus className="w-5 h-5 text-red-600" />
              Acolhimento de Paciente - Entrada no PA
            </DialogTitle>
            <DialogDescription className="text-xs">
              Localize o paciente cadastrado e registre o horário de chegada para triagem
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarEntrada} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="pa_busca_paciente" className="text-xs cursor-pointer">
                Buscar Paciente (Nome ou Cartão SUS)
              </Label>
              <Input
                id="pa_busca_paciente"
                placeholder="Digite para filtrar..."
                value={buscaPacienteEntrada}
                onChange={(e) => setBuscaPacienteEntrada(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pa_paciente_selecionado" className="text-xs cursor-pointer">
                Paciente Selecionado *
              </Label>
              <Select value={pacienteSelecionadoId} onValueChange={setPacienteSelecionadoId}>
                <SelectTrigger id="pa_paciente_selecionado" className="text-xs">
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {pacientesFiltrados.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} • SUS: {p.cartao_sus}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pa_queixa_entrada" className="text-xs cursor-pointer">
                Queixa Relatada na Recepção
              </Label>
              <Textarea
                id="pa_queixa_entrada"
                placeholder="Ex: Cefaleia intensa, dor no peito, febre..."
                value={queixaEntrada}
                onChange={(e) => setQueixaEntrada(e.target.value)}
                className="text-xs min-h-[70px]"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalEntradaAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={processando}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                {processando ? 'Registrando...' : 'Confirmar Entrada no PA'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: TRIAGEM COM CLASSIFICAÇÃO DE RISCO */}
      <Dialog open={modalTriagemAberto} onOpenChange={setModalTriagemAberto}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Activity className="w-5 h-5 text-blue-600" />
              Triagem e Classificação de Risco (Manchester / SUS)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Paciente:{' '}
              <strong className="text-slate-800">
                {fichaEmFoco?.expand?.paciente?.nome || 'N/A'}
              </strong>{' '}
              • SUS: {fichaEmFoco?.expand?.paciente?.cartao_sus}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarTriagem} className="space-y-4 pt-2">
            {/* Seletor de Risco Visual */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Classificação de Risco (Selecione a Gravidade) *
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setRiscoTriagem('vermelho')}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    riscoTriagem === 'vermelho'
                      ? 'border-red-600 bg-red-600 text-white font-bold ring-2 ring-red-400'
                      : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  <div className="text-xs font-bold">VERMELHO</div>
                  <div className="text-[10px]">Emergência (0 min)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRiscoTriagem('laranja')}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    riscoTriagem === 'laranja'
                      ? 'border-orange-500 bg-orange-500 text-white font-bold ring-2 ring-orange-400'
                      : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
                  }`}
                >
                  <div className="text-xs font-bold">LARANJA</div>
                  <div className="text-[10px]">Muito Urgente (10m)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRiscoTriagem('amarelo')}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    riscoTriagem === 'amarelo'
                      ? 'border-amber-500 bg-amber-500 text-white font-bold ring-2 ring-amber-400'
                      : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  <div className="text-xs font-bold">AMARELO</div>
                  <div className="text-[10px]">Urgente (60 min)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRiscoTriagem('verde')}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    riscoTriagem === 'verde'
                      ? 'border-emerald-600 bg-emerald-600 text-white font-bold ring-2 ring-emerald-400'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <div className="text-xs font-bold">VERDE</div>
                  <div className="text-[10px]">Pouco Urgente</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRiscoTriagem('azul')}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    riscoTriagem === 'azul'
                      ? 'border-blue-600 bg-blue-600 text-white font-bold ring-2 ring-blue-400'
                      : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <div className="text-xs font-bold">AZUL</div>
                  <div className="text-[10px]">Não Urgente</div>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="triagem_queixa" className="text-xs cursor-pointer">
                Queixa Principal / Histórico do Episódio *
              </Label>
              <Textarea
                id="triagem_queixa"
                placeholder="Descreva a queixa com detalhamento clínico..."
                value={queixaTriagem}
                onChange={(e) => setQueixaTriagem(e.target.value)}
                className="text-xs min-h-[60px]"
                rows={2}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="triagem_discriminador" className="text-xs cursor-pointer">
                Discriminador do Protocolo
              </Label>
              <Input
                id="triagem_discriminador"
                placeholder="Ex: Dor torácica opressiva, dispneia intensa, convulsão recente..."
                value={discriminadorTriagem}
                onChange={(e) => setDiscriminadorTriagem(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Sinais Vitais Iniciais */}
            <div className="border border-slate-200 p-3 rounded-lg bg-slate-50 space-y-2">
              <span className="text-xs font-semibold text-slate-700 block">
                Sinais Vitais Iniciais
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <Label
                    htmlFor="triagem_pa"
                    className="text-[11px] text-slate-500 cursor-pointer block mb-0.5"
                  >
                    PA (mmHg)
                  </Label>
                  <Input
                    id="triagem_pa"
                    value={paTriagem}
                    onChange={(e) => setPaTriagem(e.target.value)}
                    placeholder="120/80"
                    className="text-xs h-8 bg-white"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="triagem_fc"
                    className="text-[11px] text-slate-500 cursor-pointer block mb-0.5"
                  >
                    FC (bpm)
                  </Label>
                  <Input
                    id="triagem_fc"
                    value={fcTriagem}
                    onChange={(e) => setFcTriagem(e.target.value)}
                    placeholder="78"
                    className="text-xs h-8 bg-white"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="triagem_temp"
                    className="text-[11px] text-slate-500 cursor-pointer block mb-0.5"
                  >
                    Temperatura (°C)
                  </Label>
                  <Input
                    id="triagem_temp"
                    value={tempTriagem}
                    onChange={(e) => setTempTriagem(e.target.value)}
                    placeholder="36.5"
                    className="text-xs h-8 bg-white"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="triagem_sato2"
                    className="text-[11px] text-slate-500 cursor-pointer block mb-0.5"
                  >
                    SatO2 (%)
                  </Label>
                  <Input
                    id="triagem_sato2"
                    value={sato2Triagem}
                    onChange={(e) => setSato2Triagem(e.target.value)}
                    placeholder="98"
                    className="text-xs h-8 bg-white"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalTriagemAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={processando}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                {processando ? 'Salvando...' : 'Concluir Triagem & Enviar p/ Fila'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: ATENDIMENTO MÉDICO COM CONDUTAS */}
      <Dialog open={modalAtendimentoAberto} onOpenChange={setModalAtendimentoAberto}>
        <DialogContent
          className={`transition-all duration-200 overflow-y-auto ${
            modalAtendimentoMaximizado
              ? 'max-w-[98vw] w-[98vw] h-[96vh] max-h-[96vh] p-4 sm:p-6'
              : 'max-w-4xl w-[95vw] max-h-[92vh] p-4 sm:p-6'
          }`}
        >
          <DialogHeader className="border-b border-slate-100 pb-2.5">
            <div className="flex items-start sm:items-center justify-between gap-2 pr-6">
              <div className="space-y-0.5 min-w-0">
                <DialogTitle className="flex items-center gap-2 text-base text-slate-900 font-bold truncate">
                  <Stethoscope className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Atendimento Médico / Conduta do PA</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600">
                  Paciente:{' '}
                  <strong className="text-slate-900 font-bold">
                    {fichaEmFoco?.expand?.paciente?.nome || 'N/A'}
                  </strong>{' '}
                  • SUS: {fichaEmFoco?.expand?.paciente?.cartao_sus || 'N/A'} • Risco:{' '}
                  <span className="font-bold text-slate-800">
                    {fichaEmFoco?.classificacao_risco?.toUpperCase()}
                  </span>
                </DialogDescription>
              </div>

              {/* Botão Maximizar / Restaurar Janela */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalAtendimentoMaximizado((prev) => !prev)}
                title={
                  modalAtendimentoMaximizado ? 'Restaurar tamanho' : 'Maximizar janela (tela cheia)'
                }
                className="h-8 px-2.5 text-xs text-slate-700 hover:bg-slate-100 shrink-0 gap-1.5 focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                {modalAtendimentoMaximizado ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Restaurar</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Maximizar</span>
                  </>
                )}
              </Button>
            </div>
          </DialogHeader>

          {/* Mensagem em caso de erro na gravação: texto preservado */}
          {erroAtendimento && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3 rounded-lg border-2 border-amber-400 bg-amber-50 text-amber-950 text-xs flex items-start gap-2.5 shadow-sm"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 flex-1">
                <strong className="font-bold block">Atenção Médica:</strong>
                <span>{erroAtendimento}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSalvarAtendimento} className="space-y-4 pt-2">
            {/* Botão de Solicitação de Exame no Atendimento do PA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-blue-50/70 border border-blue-200 gap-2">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-blue-600 shrink-0" />
                  Necessita de Exames Complementares (Urgência)?
                </span>
                <p className="text-[11px] text-blue-700">
                  Solicite hemograma, raio-x, urina ou ecg imediatamente para apoiar a conduta
                  médica
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalExamePAAberto(true)}
                  className="bg-white border-blue-300 text-blue-700 hover:bg-blue-100 text-xs"
                >
                  + Solicitar Exame
                </Button>

                {podeEmitirImpresso && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTipoImpressoInicial('receita')
                        setModalImpressoAberto(true)
                      }}
                      className="bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100 text-xs gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Receita A4
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTipoImpressoInicial('atestado')
                        setModalImpressoAberto(true)
                      }}
                      className="bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 text-xs gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Atestado A4
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* ALERTA CLÍNICO DE ALERGIAS E COMORBIDADES DO PACIENTE NO PA */}
            {fichaEmFoco?.expand?.paciente && (
              <div className="rounded-lg border-2 border-red-500 bg-red-50 p-3 text-red-950 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-xs font-black uppercase text-red-900 tracking-wide">
                    ALERTA DE ALERGIA & COMORBIDADES (SAME):
                  </span>
                </div>
                <div className="text-xs font-bold text-red-800">
                  Alergias: {fichaEmFoco.expand.paciente.alergias || 'Nenhuma alergia conhecida'}
                </div>
                {fichaEmFoco.expand.paciente.condicoes_cronicas && (
                  <div className="text-[11px] text-red-900 font-medium">
                    Condições Crônicas: {fichaEmFoco.expand.paciente.condicoes_cronicas}
                  </div>
                )}
              </div>
            )}

            {/* Resumo da Triagem */}
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs space-y-1">
              <div>
                <strong>Queixa na Triagem:</strong> {fichaEmFoco?.queixa_principal}
              </div>
              <div>
                <strong>Sinais Vitais Registrados:</strong> {fichaEmFoco?.sinais_vitais}
              </div>
            </div>

            {/* ÁREA AMPLA: EVOLUÇÃO CLÍNICA MÉDICA */}
            <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <Label
                  htmlFor="pa_evolucao_clinica"
                  className="text-xs font-bold text-slate-900 flex items-center gap-1.5 cursor-pointer"
                >
                  <Stethoscope className="w-4 h-4 text-emerald-600 shrink-0" />
                  Evolução Clínica Médica (Anamnese & Exame Físico) *
                </Label>
                <span className="text-[11px] text-slate-500">
                  Espaço amplo para registro detalhado do atendimento de emergência
                </span>
              </div>
              <Textarea
                id="pa_evolucao_clinica"
                placeholder="Descreva a anamnese completa, história pregressa, exame físico detalhado (GCS, pupilas, ausculta cardiopulmonar, abdome, extremidades), hipóteses diagnósticas e justificativas clínicas..."
                value={evolucaoAtend}
                onChange={(e) => setEvolucaoAtend(e.target.value)}
                className="text-xs font-mono leading-relaxed min-h-[160px]"
                rows={modalAtendimentoMaximizado ? 14 : 9}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="pa_diagnostico_principal"
                  className="text-xs font-semibold cursor-pointer"
                >
                  Diagnóstico Principal *
                </Label>
                <Input
                  id="pa_diagnostico_principal"
                  placeholder="Ex: Crise Hipertensiva, Amigdalite Aguda, IAM sem supra..."
                  value={diagnosticoAtend}
                  onChange={(e) => setDiagnosticoAtend(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pa_cid10" className="text-xs cursor-pointer">
                  Código CID-10 (opcional)
                </Label>
                <Input
                  id="pa_cid10"
                  placeholder="Ex: I10, J03.9, K29.7, I21..."
                  value={cid10Atend}
                  onChange={(e) => setCid10Atend(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* SEÇÃO 4: PRESCRIÇÃO MÉDICA NA UNIDADE (FÁRMACO, APRESENTAÇÃO, POSOLOGIA E VIA) */}
            {fichaEmFoco?.paciente && (
              <SecaoPrescricaoPAMedica
                pacienteId={fichaEmFoco.paciente}
                pacienteNome={fichaEmFoco.expand?.paciente?.nome}
                atendimentoPaId={fichaEmFoco.id}
              />
            )}

            {/* SEÇÃO PRÓPRIA DE CONDUTA MÉDICA */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2 gap-1">
                <Label
                  htmlFor="pa_obs_conduta"
                  className="text-xs font-bold text-slate-900 flex items-center gap-1.5 cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-blue-600 shrink-0" />
                  Conduta Médica & Plano Terapêutico
                </Label>
                <span className="text-[11px] text-slate-500">
                  Condutas imediatas na unidade e desfecho final
                </span>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="pa_obs_conduta"
                  className="text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Descrição Detalhada da Conduta Médica Realizada / Planejada *
                </Label>
                <Textarea
                  id="pa_obs_conduta"
                  placeholder="Descreva as condutas médicas: hidratação venosa, oxigenoterapia, monitorização contínua, nebulização, repouso sob observação, pedidos de reavaliação após medicação..."
                  value={obsCondutaAtend}
                  onChange={(e) => setObsCondutaAtend(e.target.value)}
                  className="text-xs min-h-[100px]"
                  rows={modalAtendimentoMaximizado ? 7 : 4}
                  required
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold text-slate-900">
                  Desfecho / Destino do Paciente *
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCondutaAtend('alta')}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      condutaAtend === 'alta'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold ring-2 ring-emerald-400'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Check className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <div className="text-xs">ALTA MÉDICA</div>
                    <div className="text-[10px] text-slate-400">Receita & Orientações de Saída</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCondutaAtend('internacao')}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      condutaAtend === 'internacao'
                        ? 'border-red-600 bg-red-50 text-red-800 font-bold ring-2 ring-red-400'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Bed className="w-4 h-4 mx-auto mb-1 text-red-600" />
                    <div className="text-xs">INTERNAÇÃO</div>
                    <div className="text-[10px] text-slate-400">Encaminhar ao Leito Hospitalar</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCondutaAtend('ambulatorio')}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      condutaAtend === 'ambulatorio'
                        ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold ring-2 ring-blue-400'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Calendar className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                    <div className="text-xs">AMBULATÓRIO</div>
                    <div className="text-[10px] text-slate-400">Agendar Retorno / Especialista</div>
                  </button>
                </div>
              </div>

              {/* Seção Condicional: INTERNAÇÃO */}
              {condutaAtend === 'internacao' && (
                <div className="p-3 bg-red-50/50 border border-red-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-800">
                    <Bed className="w-4 h-4" />
                    Encaminhamento para Internação (Escolha o Leito VAGO)
                  </div>

                  {leitosVagos.length === 0 ? (
                    <div className="p-2 bg-red-100 text-red-800 text-xs rounded">
                      Atenção: Não há leitos vagos disponíveis no momento. Libere um leito no mapa
                      de leitos ou transfira outro paciente.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Leito Vago *</Label>
                      <Select value={leitoInternacaoId} onValueChange={setLeitoInternacaoId}>
                        <SelectTrigger className="text-xs bg-white">
                          <SelectValue placeholder="Selecione o leito vago" />
                        </SelectTrigger>
                        <SelectContent>
                          {leitosVagos.map((l) => {
                            const setorNome = l.expand?.setor?.nome || 'Setor'
                            return (
                              <SelectItem key={l.id} value={l.id}>
                                {l.codigo} ({setorNome}) - Tipo: {l.tipo}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-slate-500">
                        O leito será automaticamente marcado como <strong>ocupado</strong> e o
                        registro de internação será criado no prontuário.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Seção Condicional: AMBULATÓRIO */}
              {condutaAtend === 'ambulatorio' && (
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-800">
                    <Calendar className="w-4 h-4" />
                    Encaminhamento para Ambulatório (Agendamento de Retorno)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Profissional / Especialista *</Label>
                      <Select value={profissionalAgendaId} onValueChange={setProfissionalAgendaId}>
                        <SelectTrigger className="text-xs bg-white">
                          <SelectValue placeholder="Selecione o médico" />
                        </SelectTrigger>
                        <SelectContent>
                          {profissionais.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome} ({p.especialidade})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Data e Horário do Retorno *</Label>
                      <Input
                        type="datetime-local"
                        value={dataHoraAgenda}
                        onChange={(e) => setDataHoraAgenda(e.target.value)}
                        className="text-xs bg-white h-9"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalAtendimentoAberto(false)}
              >
                Fechar / Continuar Depois
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  processando || (condutaAtend === 'internacao' && leitosVagos.length === 0)
                }
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                {processando ? 'Processando Conduta...' : 'Concluir Atendimento de PA'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL SOLICITAÇÃO DE EXAMES NO PA */}
      <ModalSolicitarExame
        aberto={modalExamePAAberto}
        onClose={() => setModalExamePAAberto(false)}
        paciente={fichaEmFoco?.expand?.paciente}
        atendimentoPaId={fichaEmFoco?.id}
        onSucesso={() => carregarDados()}
      />

      {/* MODAL DE EMISSÃO DE IMPRESSOS ASSISTENCIAIS (RECEITA / ATESTADO) */}
      <ModalEmissaoImpresso
        aberto={modalImpressoAberto}
        onClose={() => setModalImpressoAberto(false)}
        paciente={fichaEmFoco?.expand?.paciente || null}
        origem="pronto_atendimento"
        atendimentoPaId={fichaEmFoco?.id}
        profissionaisList={profissionais}
        usuarioAtual={
          user ? { id: user.id, nome: user.name, role: user.role, email: user.email } : undefined
        }
        tipoInicial={tipoImpressoInicial}
        onImpressoEmitido={() => {
          toast({
            title: 'Impresso Emitido',
            description: 'Documento registrado no prontuário do paciente e na auditoria.',
          })
        }}
      />

      {/* MODAL 4: DETALHES COMPLETOS DA FICHA DE PA */}
      <Dialog open={modalDetalhesAberto} onOpenChange={setModalDetalhesAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Ficha de Pronto Atendimento
            </DialogTitle>
            <DialogDescription className="text-xs">
              Histórico do atendimento no serviço de emergência
            </DialogDescription>
          </DialogHeader>

          {fichaEmFoco && (
            <div className="space-y-3 text-xs pt-1">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div>
                  <strong>Paciente:</strong> {fichaEmFoco.expand?.paciente?.nome}
                </div>
                <div>
                  <strong>Cartão SUS:</strong> {fichaEmFoco.expand?.paciente?.cartao_sus}
                </div>
                <div>
                  <strong>Data/Hora Chegada:</strong> {fichaEmFoco.data_hora_chegada}
                </div>
                <div>
                  <strong>Classificação:</strong>{' '}
                  {fichaEmFoco.classificacao_risco
                    ? fichaEmFoco.classificacao_risco.toUpperCase()
                    : 'Aguardando'}
                </div>
              </div>

              <div>
                <strong>Queixa Principal:</strong>
                <p className="text-slate-600 bg-white p-2 rounded border border-slate-200 mt-1">
                  {fichaEmFoco.queixa_principal || 'Não informada'}
                </p>
              </div>

              {fichaEmFoco.sinais_vitais && (
                <div>
                  <strong>Sinais Vitais na Triagem:</strong>
                  <p className="text-slate-600 bg-white p-2 rounded border border-slate-200 mt-1">
                    {fichaEmFoco.sinais_vitais}
                  </p>
                </div>
              )}

              {fichaEmFoco.evolucao_clinica && (
                <div>
                  <strong>Evolução Clínica / Diagnóstico:</strong>
                  <p className="text-slate-600 bg-white p-2 rounded border border-slate-200 mt-1">
                    {fichaEmFoco.evolucao_clinica}
                  </p>
                  <p className="mt-1 text-slate-700">
                    <strong>Diagnóstico:</strong> {fichaEmFoco.diagnostico}{' '}
                    {fichaEmFoco.cid10 ? `(CID: ${fichaEmFoco.cid10})` : ''}
                  </p>
                </div>
              )}

              <div>
                <strong>Conduta Registrada:</strong>
                <p className="text-slate-600 bg-white p-2 rounded border border-slate-200 mt-1">
                  {fichaEmFoco.conduta ? fichaEmFoco.conduta.toUpperCase() : 'Em andamento'}
                  {fichaEmFoco.observacoes_conduta && ` - ${fichaEmFoco.observacoes_conduta}`}
                </p>
              </div>

              {fichaEmFoco.expand?.leito_encaminhado && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded">
                  <strong>Encaminhado para leito:</strong>{' '}
                  {fichaEmFoco.expand.leito_encaminhado.codigo}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalDetalhesAberto(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
