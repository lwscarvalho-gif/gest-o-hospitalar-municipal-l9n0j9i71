import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  SolicitacaoRegulacao,
  SolicitacaoRegulacaoResumoAdmin,
  TipoSolicitacaoRegulacao,
  AtendimentoOrigemRegulacao,
  RecursoSolicitadoRegulacao,
  PrioridadeRegulacao,
  SituacaoRegulacao,
  Paciente,
  Setor,
  Leito,
  FichaProntoAtendimento,
  Internacao,
} from '@/types/hospital'
import {
  listarSolicitacoesRegulacao,
  listarRegulacaoFilaAdministrativa,
  criarSolicitacaoRegulacao,
  iniciarAvaliacaoRegulacao,
  avaliarSolicitacaoRegulacao,
  efetivarTransferenciaRegulacao,
  cancelarSolicitacaoRegulacao,
  calcularIndicadoresRegulacao,
  IndicadoresAgregadosRegulacao,
} from '@/services/regulacao'
import { listarPacientes, listarSetores, listarLeitos } from '@/services/cadastros'
import { listarAtendimentosPA } from '@/services/prontoAtendimento'
import { listarInternacoes } from '@/services/internacoes'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useToast } from '@/hooks/use-toast'
import {
  Share2,
  Search,
  Plus,
  Filter,
  BarChart3,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Activity,
  Info,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Building,
  HelpCircle,
  Lock,
  ArrowRightLeft,
  Check,
} from 'lucide-react'

interface RegulacaoViewProps {
  onNavegarSAME?: (pacienteId?: string) => void
}

export const RegulacaoView: React.FC<RegulacaoViewProps> = ({ onNavegarSAME }) => {
  const { user, temPermissao } = useAuth()
  const { toast } = useToast()

  // Permissões de acordo com RLS e mínimo privilégio
  const isRecepcao = user?.role === 'recepcao'
  const podeSolicitar = temPermissao(['admin', 'gestor', 'profissional'])
  const podeAvaliar = temPermissao(['admin', 'gestor', 'profissional'])

  // Estados principais
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoRegulacao[]>([])
  const [filaAdmin, setFilaAdmin] = useState<SolicitacaoRegulacaoResumoAdmin[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [leitos, setLeitos] = useState<Leito[]>([])
  const [atendimentosPA, setAtendimentosPA] = useState<FichaProntoAtendimento[]>([])
  const [internacoesAtivas, setInternacoesAtivas] = useState<Internacao[]>([])
  const [loading, setLoading] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'fila' | 'indicadores'>('fila')

  // Filtros
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todas')
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos')
  const [filtroRecurso, setFiltroRecurso] = useState<string>('todos')
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todas')
  const [termoBusca, setTermoBusca] = useState('')

  // Modais
  const [modalNovaSolicitacao, setModalNovaSolicitacao] = useState(false)
  const [modalAvaliacao, setModalAvaliacao] = useState(false)
  const [modalEfetivacao, setModalEfetivacao] = useState(false)
  const [modalCancelamento, setModalCancelamento] = useState(false)
  const [modalDetalhes, setModalDetalhes] = useState(false)
  const [modalAvisoLegal, setModalAvisoLegal] = useState(false)

  // Registro selecionado
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<SolicitacaoRegulacao | null>(
    null,
  )

  // Formulário: Nova Solicitação
  const [formTipo, setFormTipo] = useState<TipoSolicitacaoRegulacao>('transferencia_interna')
  const [formPacienteId, setFormPacienteId] = useState('')
  const [formOrigemTipo, setFormOrigemTipo] =
    useState<AtendimentoOrigemRegulacao>('pronto_atendimento')
  const [formAtendimentoPAId, setFormAtendimentoPAId] = useState('')
  const [formInternacaoId, setFormInternacaoId] = useState('')
  const [formSetorOrigemId, setFormSetorOrigemId] = useState('')
  const [formLeitoOrigemId, setFormLeitoOrigemId] = useState('')
  const [formSetorDestinoId, setFormSetorDestinoId] = useState('')
  const [formLeitoDestinoId, setFormLeitoDestinoId] = useState('')
  const [formUnidadeExterna, setFormUnidadeExterna] = useState('')
  const [formRecurso, setFormRecurso] = useState<RecursoSolicitadoRegulacao>(
    'leito_enfermaria_clinica',
  )
  const [formDescricaoRecurso, setFormDescricaoRecurso] = useState('')
  const [formPrioridade, setFormPrioridade] = useState<PrioridadeRegulacao>('urgencia_amarela')
  const [formDiagnostico, setFormDiagnostico] = useState('')
  const [formCid10, setFormCid10] = useState('')
  const [formJustificativa, setFormJustificativa] = useState('')
  const [formSinaisVitais, setFormSinaisVitais] = useState('')
  const [formTransporte, setFormTransporte] = useState('')
  const [salvandoSolicitacao, setSalvandoSolicitacao] = useState(false)

  // Formulário: Avaliação do Regulador
  const [decisaoRegulador, setDecisaoRegulador] = useState<'aceita' | 'negada'>('aceita')
  const [motivoDecisaoRegulador, setMotivoDecisaoRegulador] = useState('')
  const [avalSetorDestinoId, setAvalSetorDestinoId] = useState('')
  const [avalLeitoDestinoId, setAvalLeitoDestinoId] = useState('')
  const [avalUnidadeExterna, setAvalUnidadeExterna] = useState('')
  const [salvandoAvaliacao, setSalvandoAvaliacao] = useState(false)

  // Formulário: Efetivação da Transferência Real
  const [obsEfetivacao, setObsEfetivacao] = useState('')
  const [salvandoEfetivacao, setSalvandoEfetivacao] = useState(false)

  // Formulário: Cancelamento
  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const [salvandoCancelamento, setSalvandoCancelamento] = useState(false)

  // 1. Carregar dados
  const carregarDados = async () => {
    setLoading(true)
    try {
      if (isRecepcao) {
        // PERFIL RECEPÇÃO: Apenas view administrativa agregada (sem dados clínicos)
        const listaAdmin = await listarRegulacaoFilaAdministrativa()
        setFilaAdmin(listaAdmin)
        setSolicitacoes([])
      } else {
        const [listaSolics, listaPacs, listaSts, listaLts, listaPA, listaInts] = await Promise.all([
          listarSolicitacoesRegulacao({
            situacao: filtroSituacao as any,
            periodo: filtroPeriodo as any,
            recurso: filtroRecurso as any,
            prioridade: filtroPrioridade as any,
            termoBusca,
          }),
          listarPacientes(),
          listarSetores(),
          listarLeitos(),
          listarAtendimentosPA({ status: 'todos' }),
          listarInternacoes(),
        ])
        setSolicitacoes(listaSolics)
        setPacientes(listaPacs)
        setSetores(listaSts)
        setLeitos(listaLts)
        setAtendimentosPA(listaPA)
        setInternacoesAtivas(listaInts)
      }
    } catch (err: any) {
      console.error('Erro ao carregar regulação:', err)
      toast({
        title: 'Erro ao consultar regulação',
        description: err.message || 'Falha ao buscar dados no backend.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroSituacao, filtroPeriodo, filtroRecurso, filtroPrioridade, isRecepcao])

  // Indicadores agregados
  const indicadores: IndicadoresAgregadosRegulacao = useMemo(() => {
    if (isRecepcao) {
      return calcularIndicadoresRegulacao(filaAdmin)
    }
    return calcularIndicadoresRegulacao(solicitacoes)
  }, [solicitacoes, filaAdmin, isRecepcao])

  // Filtragem de fila administrativa para busca de texto
  const filaAdminFiltrada = useMemo(() => {
    if (!termoBusca.trim()) return filaAdmin
    const q = termoBusca.toLowerCase()
    return filaAdmin.filter(
      (f) =>
        f.paciente_nome.toLowerCase().includes(q) ||
        f.numero_solicitacao.toLowerCase().includes(q) ||
        f.setor_origem_nome.toLowerCase().includes(q),
    )
  }, [filaAdmin, termoBusca])

  // Leitos vagos para destino
  const leitosVagosDestino = useMemo(() => {
    if (!avalSetorDestinoId && !formSetorDestinoId) return []
    const setorAlvo = avalSetorDestinoId || formSetorDestinoId
    return leitos.filter((l) => l.setor === setorAlvo && l.status === 'vago')
  }, [leitos, avalSetorDestinoId, formSetorDestinoId])

  // Submissão: Nova Solicitação
  const handleCriarSolicitacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!podeSolicitar) {
      toast({
        title: 'Acesso restrito',
        description: 'Seu perfil de usuário possui acesso apenas administrativo/consulta.',
        variant: 'destructive',
      })
      return
    }

    if (!formPacienteId) {
      toast({
        title: 'Paciente obrigatório',
        description: 'Selecione um paciente real para vincular a solicitação.',
        variant: 'destructive',
      })
      return
    }

    if (!formJustificativa.trim()) {
      toast({
        title: 'Justificativa clínica obrigatória',
        description:
          'O profissional solicitante deve fundamentar a prioridade e a necessidade técnica do recurso.',
        variant: 'destructive',
      })
      return
    }

    if (!formDiagnostico.trim()) {
      toast({
        title: 'Diagnóstico obrigatório',
        description: 'Informe a hipótese ou diagnóstico principal.',
        variant: 'destructive',
      })
      return
    }

    const pacienteObj = pacientes.find((p) => p.id === formPacienteId)
    if (!pacienteObj) return

    const setorOrigemObj = setores.find((s) => s.id === formSetorOrigemId)
    const leitoOrigemObj = leitos.find((l) => l.id === formLeitoOrigemId)
    const setorDestinoObj = setores.find((s) => s.id === formSetorDestinoId)
    const leitoDestinoObj = leitos.find((l) => l.id === formLeitoDestinoId)

    setSalvandoSolicitacao(true)
    try {
      await criarSolicitacaoRegulacao({
        tipo: formTipo,
        paciente: pacienteObj.id,
        paciente_nome: pacienteObj.nome,
        atendimento_origem_tipo: formOrigemTipo,
        atendimento_pa: formAtendimentoPAId || undefined,
        internacao: formInternacaoId || undefined,
        setor_origem: setorOrigemObj?.id,
        setor_origem_nome: setorOrigemObj?.nome || 'Unidade Hospitalar Municipal',
        leito_origem: leitoOrigemObj?.id,
        leito_origem_codigo: leitoOrigemObj?.codigo,
        setor_destino: setorDestinoObj?.id,
        setor_destino_nome: setorDestinoObj?.nome,
        leito_destino: leitoDestinoObj?.id,
        leito_destino_codigo: leitoDestinoObj?.codigo,
        unidade_externa_destino: formUnidadeExterna || undefined,
        recurso_solicitado: formRecurso,
        descricao_recurso: formDescricaoRecurso,
        prioridade: formPrioridade,
        justificativa_clinica: formJustificativa,
        diagnostico_principal: formDiagnostico,
        cid10_codigo: formCid10,
        sinais_vitais_sumario: formSinaisVitais,
        condicoes_transporte: formTransporte,
        profissional_solicitante: user?.id,
        profissional_solicitante_nome: user?.name || 'Profissional Solicitante',
        profissional_solicitante_registro: user?.registro_profissional || '',
        usuarioId: user?.id,
        usuarioRole: user?.role,
      })

      toast({
        title: 'Solicitação de Regulação Registrada',
        description:
          'Encaminhamento incluído na fila da Central de Regulação com integridade de leitos preservada.',
      })

      // Resetar form
      setModalNovaSolicitacao(false)
      setFormPacienteId('')
      setFormJustificativa('')
      setFormDiagnostico('')
      setFormCid10('')
      setFormSinaisVitais('')
      setFormTransporte('')
      setFormUnidadeExterna('')
      setFormDescricaoRecurso('')
      carregarDados()
    } catch (err: any) {
      console.error('Erro ao criar solicitação:', err)
      toast({
        title: 'Falha ao gravar solicitação',
        description: err.message || 'Verifique as informações e evite duplicidades.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoSolicitacao(false)
    }
  }

  // Abertura do modal de Avaliação
  const handleAbrirAvaliacao = (solic: SolicitacaoRegulacao) => {
    setSolicitacaoSelecionada(solic)
    setDecisaoRegulador('aceita')
    setMotivoDecisaoRegulador('')
    setAvalSetorDestinoId(solic.setor_destino || '')
    setAvalLeitoDestinoId(solic.leito_destino || '')
    setAvalUnidadeExterna(solic.unidade_externa_destino || '')
    setModalAvaliacao(true)
  }

  // Iniciar Análise / Colocar em Avaliação
  const handleIniciarAnalise = async (solic: SolicitacaoRegulacao) => {
    try {
      await iniciarAvaliacaoRegulacao({
        solicitacaoId: solic.id,
        profissional_nome: user?.name || 'Regulador de Plantão',
        usuarioRole: user?.role,
      })
      toast({
        title: 'Análise Iniciada',
        description: `Solicitação ${solic.numero_solicitacao} colocada em avaliação técnica pelo regulador.`,
      })
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Transição Inválida',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Submissão: Salvar Avaliação do Regulador
  const handleSalvarAvaliacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!solicitacaoSelecionada) return

    if (!motivoDecisaoRegulador.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description:
          'O responsável regulador deve fundamentar a decisão técnica (aceite ou negativa).',
        variant: 'destructive',
      })
      return
    }

    const setorDestinoObj = setores.find((s) => s.id === avalSetorDestinoId)
    const leitoDestinoObj = leitos.find((l) => l.id === avalLeitoDestinoId)

    setSalvandoAvaliacao(true)
    try {
      await avaliarSolicitacaoRegulacao({
        solicitacaoId: solicitacaoSelecionada.id,
        decisao: decisaoRegulador,
        motivo_decisao: motivoDecisaoRegulador,
        setor_destino: setorDestinoObj?.id,
        setor_destino_nome: setorDestinoObj?.nome,
        leito_destino: leitoDestinoObj?.id,
        leito_destino_codigo: leitoDestinoObj?.codigo,
        unidade_externa_destino: avalUnidadeExterna || undefined,
        profissional_regulador: user?.id,
        profissional_regulador_nome: user?.name || 'Médico Regulador',
        usuarioId: user?.id,
        usuarioRole: user?.role,
      })

      toast({
        title: `Decisão de Regulação: ${decisaoRegulador.toUpperCase()}`,
        description:
          decisaoRegulador === 'aceita'
            ? 'Solicitação aceita. Aguarda efetivação real da transferência para movimentar o leito.'
            : 'Solicitação negada com fundamentação registrada e auditada.',
      })

      setModalAvaliacao(false)
      setSolicitacaoSelecionada(null)
      carregarDados()
    } catch (err: any) {
      console.error('Erro ao avaliar solicitação:', err)
      toast({
        title: 'Erro na avaliação',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoAvaliacao(false)
    }
  }

  // Abertura do modal de Efetivação
  const handleAbrirEfetivacao = (solic: SolicitacaoRegulacao) => {
    setSolicitacaoSelecionada(solic)
    setObsEfetivacao('')
    setModalEfetivacao(true)
  }

  // Submissão: Confirmar / Efetivar Transferência Real
  const handleConfirmarEfetivacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!solicitacaoSelecionada) return

    setSalvandoEfetivacao(true)
    try {
      await efetivarTransferenciaRegulacao({
        solicitacaoId: solicitacaoSelecionada.id,
        responsavel_nome: user?.name || 'Responsável pela Efetivação',
        observacoes_efetivacao: obsEfetivacao,
        usuarioId: user?.id,
        usuarioRole: user?.role,
      })

      toast({
        title: 'Transferência Real Efetivada',
        description:
          'Transferência assistencial confirmada. Leito e internação devidamente movimentados no mapa.',
      })

      setModalEfetivacao(false)
      setSolicitacaoSelecionada(null)
      carregarDados()
    } catch (err: any) {
      console.error('Erro ao efetivar transferência:', err)
      toast({
        title: 'Falha na efetivação',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoEfetivacao(false)
    }
  }

  // Abertura do modal de Cancelamento
  const handleAbrirCancelamento = (solic: SolicitacaoRegulacao) => {
    setSolicitacaoSelecionada(solic)
    setMotivoCancelamento('')
    setModalCancelamento(true)
  }

  // Submissão: Cancelar Solicitação
  const handleConfirmarCancelamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!solicitacaoSelecionada) return

    if (!motivoCancelamento.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe a justificativa do cancelamento.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoCancelamento(true)
    try {
      await cancelarSolicitacaoRegulacao({
        solicitacaoId: solicitacaoSelecionada.id,
        motivo_cancelamento: motivoCancelamento,
        responsavel_nome: user?.name || 'Responsável',
        usuarioId: user?.id,
        usuarioRole: user?.role,
      })

      toast({
        title: 'Solicitação Cancelada',
        description: `Cancelamento registrado com sucesso na trilha de auditoria.`,
      })

      setModalCancelamento(false)
      setSolicitacaoSelecionada(null)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao cancelar',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoCancelamento(false)
    }
  }

  // Abertura de Detalhes
  const handleAbrirDetalhes = (solic: SolicitacaoRegulacao) => {
    setSolicitacaoSelecionada(solic)
    setModalDetalhes(true)
  }

  // Helpers de Rótulos e Cores
  const formatRecurso = (r: RecursoSolicitadoRegulacao | string): string => {
    const mapa: Record<string, string> = {
      leito_enfermaria_clinica: 'Enfermaria Clínica',
      leito_uti_adulto: 'UTI Adulto',
      leito_isolamento: 'Isolamento',
      leito_cirurgico: 'Leito Cirúrgico',
      avaliacao_especializada: 'Avaliação Especializada',
      procedimento_urgencia: 'Procedimento Urgência',
      suporte_ventilatorio: 'Suporte Ventilatório',
      outro: 'Outro Recurso',
    }
    return mapa[r] || r
  }

  const formatPrioridade = (p: PrioridadeRegulacao | string): string => {
    const mapa: Record<string, string> = {
      emergencia_vermelha: 'Emergência (Vermelho)',
      urgencia_amarela: 'Urgência (Amarelo)',
      prioritario_verde: 'Prioritário (Verde)',
      eletivo_azul: 'Eletivo (Azul)',
    }
    return mapa[p] || p
  }

  const badgePrioridade = (p: PrioridadeRegulacao | string) => {
    switch (p) {
      case 'emergencia_vermelha':
        return (
          <Badge className="bg-red-600 text-white font-bold text-[11px] animate-pulse">
            Vermelho • Emergência
          </Badge>
        )
      case 'urgencia_amarela':
        return (
          <Badge className="bg-amber-500 text-amber-950 font-semibold text-[11px]">
            Amarelo • Urgência
          </Badge>
        )
      case 'prioritario_verde':
        return (
          <Badge className="bg-emerald-600 text-white font-medium text-[11px]">
            Verde • Prioritário
          </Badge>
        )
      case 'eletivo_azul':
        return (
          <Badge className="bg-blue-600 text-white font-medium text-[11px]">Azul • Eletivo</Badge>
        )
      default:
        return <Badge variant="outline">{p}</Badge>
    }
  }

  const badgeSituacao = (s: SituacaoRegulacao | string) => {
    switch (s) {
      case 'solicitada':
        return (
          <Badge className="bg-amber-500/15 text-amber-800 border-amber-300 text-[11px]">
            <Clock className="w-3 h-3 mr-1" /> Solicitada
          </Badge>
        )
      case 'em_avaliacao':
        return (
          <Badge className="bg-blue-500/15 text-blue-800 border-blue-300 text-[11px]">
            <Activity className="w-3 h-3 mr-1" /> Em Avaliação
          </Badge>
        )
      case 'aceita':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-800 border-emerald-300 text-[11px]">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Aceita (Aguardando Efetivação)
          </Badge>
        )
      case 'negada':
        return (
          <Badge className="bg-rose-500/15 text-rose-800 border-rose-300 text-[11px]">
            <XCircle className="w-3 h-3 mr-1" /> Negada pelo Regulador
          </Badge>
        )
      case 'efetivada':
        return (
          <Badge className="bg-teal-600 text-white text-[11px]">
            <ArrowRightLeft className="w-3 h-3 mr-1" /> Transferência Efetivada
          </Badge>
        )
      case 'cancelada':
        return (
          <Badge variant="outline" className="text-slate-500 text-[11px]">
            Cancelada
          </Badge>
        )
      default:
        return <Badge variant="outline">{s}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO MÓDULO */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold flex-shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Central de Regulação Interna Municipal
                </h1>
                <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-600">
                  Controle Interno
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Regulação técnica de encaminhamentos e transferências assistenciais. Decisões
                humanas auditadas, sem ranking clínico automático.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalAvisoLegal(true)}
              className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Info className="w-3.5 h-3.5 mr-1" />
              Aviso de Escopo Legal
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={carregarDados}
              disabled={loading}
              className="text-xs border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            {podeSolicitar && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setModalNovaSolicitacao(true)}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Nova Solicitação
              </Button>
            )}
          </div>
        </div>

        {/* ALERTA DE PERFIL RECEPÇÃO: MÍNIMO PRIVILÉGIO */}
        {isRecepcao && (
          <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200 rounded-lg flex items-center gap-2.5 text-xs text-amber-900">
            <Lock className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>
              <strong>Perfil Recepção (Mínimo Privilégio):</strong> Acesso restrito à fila
              administrativa de status e tempos. Dados clínicos, justificativas e diagnósticos são
              protegidos e não expostos no backend.
            </span>
          </div>
        )}

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex border-b border-slate-200 mt-5 pt-1 gap-6 text-sm font-medium">
          <button
            onClick={() => setAbaAtiva('fila')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              abaAtiva === 'fila'
                ? 'border-indigo-600 text-indigo-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            Fila de Regulação
            {indicadores.totalAtivasFila > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-bold">
                {indicadores.totalAtivasFila}
              </span>
            )}
          </button>

          <button
            onClick={() => setAbaAtiva('indicadores')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              abaAtiva === 'indicadores'
                ? 'border-indigo-600 text-indigo-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Indicadores Agregados
          </button>
        </div>
      </div>

      {/* CONTEÚDO DA ABA 1: FILA DE REGULAÇÃO */}
      {abaAtiva === 'fila' && (
        <div className="space-y-4">
          {/* BARRA DE FILTROS E BUSCA */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div className="md:col-span-2 relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Buscar paciente, protocolo ou setor..."
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <div>
                  <select
                    value={filtroSituacao}
                    onChange={(e) => setFiltroSituacao(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="todas">Situação: Todas</option>
                    <option value="ativas">Apenas Fila Ativa</option>
                    <option value="solicitada">Solicitada</option>
                    <option value="em_avaliacao">Em Avaliação</option>
                    <option value="aceita">Aceita (Aguardando)</option>
                    <option value="efetivada">Efetivada</option>
                    <option value="negada">Negada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>

                <div>
                  <select
                    value={filtroPrioridade}
                    onChange={(e) => setFiltroPrioridade(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="todas">Prioridade: Todas</option>
                    <option value="emergencia_vermelha">Vermelho (Emergência)</option>
                    <option value="urgencia_amarela">Amarelo (Urgência)</option>
                    <option value="prioritario_verde">Verde (Prioritário)</option>
                    <option value="eletivo_azul">Azul (Eletivo)</option>
                  </select>
                </div>

                <div>
                  <select
                    value={filtroPeriodo}
                    onChange={(e) => setFiltroPeriodo(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="todos">Período: Histórico Todo</option>
                    <option value="hoje">Hoje (últimas 24h)</option>
                    <option value="7dias">Últimos 7 dias</option>
                    <option value="30dias">Últimos 30 dias</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LISTAGEM PRINCIPAL: CLÍNICA OU ADMINISTRATIVA */}
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
              <p className="text-sm font-medium">Carregando fila da Central de Regulação...</p>
            </div>
          ) : isRecepcao ? (
            /* VISÃO ADMINISTRATIVA PARA RECEPÇÃO */
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Fila Administrativa de Encaminhamentos ({filaAdminFiltrada.length})
                </span>
                <span className="text-[11px] text-slate-400">
                  Visualização de controle de fluxo de recepção
                </span>
              </div>

              {filaAdminFiltrada.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  Nenhuma solicitação encontrada para os filtros atuais.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Protocolo</th>
                        <th className="py-3 px-4">Paciente</th>
                        <th className="py-3 px-4">Origem → Destino</th>
                        <th className="py-3 px-4">Recurso</th>
                        <th className="py-3 px-4">Prioridade</th>
                        <th className="py-3 px-4">Situação</th>
                        <th className="py-3 px-4">Data Solicitação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filaAdminFiltrada.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                            {item.numero_solicitacao}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {item.paciente_nome}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {item.setor_origem_nome} →{' '}
                            {item.setor_destino_nome || item.unidade_externa_destino || 'A definir'}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {formatRecurso(item.recurso_solicitado)}
                          </td>
                          <td className="py-3 px-4">{badgePrioridade(item.prioridade)}</td>
                          <td className="py-3 px-4">{badgeSituacao(item.situacao)}</td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {item.data_hora_solicitacao}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* VISÃO COMPLETA CLÍNICA (ADMIN, GESTOR, PROFISSIONAL) */
            <div className="space-y-3">
              {solicitacoes.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
                  <Share2 className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">
                    Nenhuma solicitação de regulação ativa encontrada.
                  </p>
                  <p className="text-xs text-slate-400">
                    Utilize o botão "Nova Solicitação" para registrar uma transferência ou
                    encaminhamento.
                  </p>
                </div>
              ) : (
                solicitacoes.map((solic) => (
                  <Card
                    key={solic.id}
                    className="border-slate-200 shadow-sm hover:border-indigo-200 transition-colors bg-white overflow-hidden"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {solic.numero_solicitacao}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500 capitalize">
                            {solic.tipo.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs font-medium text-slate-700">
                            Origem:{' '}
                            <strong className="text-slate-900">{solic.setor_origem_nome}</strong>
                            {solic.leito_origem_codigo && ` (${solic.leito_origem_codigo})`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {badgePrioridade(solic.prioridade)}
                          {badgeSituacao(solic.situacao)}
                        </div>
                      </div>

                      {/* CORPO DO CARD */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3 pt-1">
                        {/* Paciente e Diagnóstico */}
                        <div className="md:col-span-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-bold text-slate-900">
                              {solic.paciente_nome}
                            </span>
                            {onNavegarSAME && (
                              <button
                                onClick={() => onNavegarSAME(solic.paciente)}
                                className="text-[11px] text-blue-600 hover:underline font-medium ml-1"
                              >
                                Prontuário SAME →
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-600">
                            <strong>Diagnóstico:</strong> {solic.diagnostico_principal}
                            {solic.cid10_codigo ? ` (CID-10: ${solic.cid10_codigo})` : ''}
                          </p>
                          <p className="text-xs text-slate-500 line-clamp-2 italic bg-slate-50 p-2 rounded border border-slate-100">
                            "{solic.justificativa_clinica}"
                          </p>
                        </div>

                        {/* Recurso e Destino */}
                        <div className="space-y-1 text-xs text-slate-600">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                              Recurso Solicitado
                            </span>
                            <span className="font-semibold text-slate-800">
                              {formatRecurso(solic.recurso_solicitado)}
                            </span>
                            {solic.descricao_recurso && (
                              <p className="text-[11px] text-slate-500 truncate">
                                {solic.descricao_recurso}
                              </p>
                            )}
                          </div>

                          <div className="pt-1">
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                              Destino Designado
                            </span>
                            <span className="text-slate-800 font-medium">
                              {solic.setor_destino_nome ||
                                solic.unidade_externa_destino ||
                                'Aguardando definição técnica'}
                            </span>
                            {solic.leito_destino_codigo && (
                              <Badge
                                variant="outline"
                                className="ml-1.5 text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300"
                              >
                                Leito: {solic.leito_destino_codigo}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Profissional e Ações */}
                        <div className="flex flex-col justify-between space-y-2 text-xs">
                          <div className="text-slate-500 text-[11px]">
                            <span>
                              Solicitante: <strong>{solic.profissional_solicitante_nome}</strong>
                            </span>
                            <span className="block font-mono text-[10px] text-slate-400 mt-0.5">
                              {solic.data_hora_solicitacao}
                            </span>
                          </div>

                          {/* BOTÕES DE AÇÃO CONFORME O STATUS E REGRAS DE TRANSIÇÃO */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAbrirDetalhes(solic)}
                              className="h-7 text-[11px] border-slate-200"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              Detalhes
                            </Button>

                            {/* Se solicitada -> Iniciar Avaliação */}
                            {podeAvaliar && solic.situacao === 'solicitada' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleIniciarAnalise(solic)}
                                className="h-7 text-[11px] bg-blue-600 hover:bg-blue-500 text-white"
                              >
                                Iniciar Análise
                              </Button>
                            )}

                            {/* Se em_avaliacao -> Decidir (Aceitar / Negar) */}
                            {podeAvaliar && solic.situacao === 'em_avaliacao' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleAbrirAvaliacao(solic)}
                                className="h-7 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white"
                              >
                                Decidir (Aceite/Nega)
                              </Button>
                            )}

                            {/* Se aceita -> Confirmar Efetivação Real (Movimenta Leito) */}
                            {podeAvaliar && solic.situacao === 'aceita' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleAbrirEfetivacao(solic)}
                                className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white"
                              >
                                <ArrowRightLeft className="w-3 h-3 mr-1" />
                                Efetivar Leito
                              </Button>
                            )}

                            {/* Cancelar (permitido para solicitada, em_avaliacao ou aceita) */}
                            {podeSolicitar &&
                              (solic.situacao === 'solicitada' ||
                                solic.situacao === 'em_avaliacao' ||
                                solic.situacao === 'aceita') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAbrirCancelamento(solic)}
                                  className="h-7 text-[11px] text-rose-600 hover:bg-rose-50"
                                >
                                  Cancelar
                                </Button>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: INDICADORES AGREGADOS (SEM DADOS PESSOAIS) */}
      {abaAtiva === 'indicadores' && (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Painel Agregado da Regulação Interna Municipal
              </CardTitle>
              <CardDescription className="text-xs">
                Contagem volumétrica sem identificação ou dados pessoais dos usuários do SUS.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-5 space-y-6">
              {/* Grid 4 Cards Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                  <span className="text-[11px] font-semibold text-indigo-800 uppercase block">
                    Fila Ativa Agora
                  </span>
                  <span className="text-3xl font-extrabold text-indigo-900 mt-1 block">
                    {indicadores.totalAtivasFila}
                  </span>
                  <span className="text-[10px] text-indigo-600">
                    Aguardando decisão ou efetivação
                  </span>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-center">
                  <span className="text-[11px] font-semibold text-amber-800 uppercase block">
                    Solicitadas (Novas)
                  </span>
                  <span className="text-3xl font-extrabold text-amber-900 mt-1 block">
                    {indicadores.solicitadas}
                  </span>
                  <span className="text-[10px] text-amber-700">Aguardando regulador</span>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[11px] font-semibold text-emerald-800 uppercase block">
                    Transferências Efetivadas
                  </span>
                  <span className="text-3xl font-extrabold text-emerald-900 mt-1 block">
                    {indicadores.efetivadas}
                  </span>
                  <span className="text-[10px] text-emerald-700">Movimentações concluídas</span>
                </div>

                <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 text-center">
                  <span className="text-[11px] font-semibold text-rose-800 uppercase block">
                    Negadas pelo Regulador
                  </span>
                  <span className="text-3xl font-extrabold text-rose-900 mt-1 block">
                    {indicadores.negadas}
                  </span>
                  <span className="text-[10px] text-rose-700">Com fundamentação técnica</span>
                </div>
              </div>

              {/* Distribuição por Prioridade Clínica (Definida pelo profissional) */}
              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Distribuição por Prioridade Clínica Informada (Decisão Humana)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <span className="text-[11px] font-bold text-red-700 block uppercase">
                      Vermelho (Emergência)
                    </span>
                    <span className="text-2xl font-bold text-red-900 mt-1 block">
                      {indicadores.porPrioridade.emergencia_vermelha}
                    </span>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-[11px] font-bold text-amber-700 block uppercase">
                      Amarelo (Urgência)
                    </span>
                    <span className="text-2xl font-bold text-amber-900 mt-1 block">
                      {indicadores.porPrioridade.urgencia_amarela}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-[11px] font-bold text-emerald-700 block uppercase">
                      Verde (Prioritário)
                    </span>
                    <span className="text-2xl font-bold text-emerald-900 mt-1 block">
                      {indicadores.porPrioridade.prioritario_verde}
                    </span>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-[11px] font-bold text-blue-700 block uppercase">
                      Azul (Eletivo)
                    </span>
                    <span className="text-2xl font-bold text-blue-900 mt-1 block">
                      {indicadores.porPrioridade.eletivo_azul}
                    </span>
                  </div>
                </div>
              </div>

              {/* Distribuição por Tipo de Encaminhamento */}
              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Distribuição por Modalidade de Regulação
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Transferência Interna Hospitalar</span>
                    <strong className="text-slate-900 text-base">
                      {indicadores.porTipo.transferencia_interna}
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">
                      Transferência Externa (Inter-hospitalar)
                    </span>
                    <strong className="text-slate-900 text-base">
                      {indicadores.porTipo.transferencia_externa}
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Encaminhamento para Especialidade</span>
                    <strong className="text-slate-900 text-base">
                      {indicadores.porTipo.encaminhamento_especialidade}
                    </strong>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 1: NOVA SOLICITAÇÃO DE REGULAÇÃO */}
      <Dialog open={modalNovaSolicitacao} onOpenChange={setModalNovaSolicitacao}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Share2 className="w-5 h-5 text-indigo-600" />
              Nova Solicitação de Regulação Interna
            </DialogTitle>
            <DialogDescription className="text-xs">
              Vincule a um paciente e atendimento real. A decisão de prioridade é estritamente do
              profissional.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCriarSolicitacao} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tipo de Solicitação *
                </label>
                <select
                  value={formTipo}
                  onChange={(e) => setFormTipo(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-slate-200 px-3 text-xs bg-white"
                  required
                >
                  <option value="transferencia_interna">
                    Transferência Interna (Entre Leitos)
                  </option>
                  <option value="transferencia_externa">Transferência Externa Municipal</option>
                  <option value="encaminhamento_especialidade">
                    Encaminhamento para Especialidade
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Paciente Real Cadastrado *
                </label>
                <select
                  value={formPacienteId}
                  onChange={(e) => setFormPacienteId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 px-3 text-xs bg-white"
                  required
                >
                  <option value="">Selecione o paciente...</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} (CPF: {p.cpf || 'S/N'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vínculo com Atendimento Real */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">
                Atendimento de Origem Real *
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Tipo de Origem</label>
                  <select
                    value={formOrigemTipo}
                    onChange={(e) => setFormOrigemTipo(e.target.value as any)}
                    className="w-full h-8 rounded-md border border-slate-200 px-2 text-xs bg-white"
                  >
                    <option value="pronto_atendimento">Pronto Atendimento (PA)</option>
                    <option value="internacao">Internação Ativa</option>
                    <option value="ambulatorial">Atendimento Ambulatorial</option>
                  </select>
                </div>

                {formOrigemTipo === 'pronto_atendimento' && (
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-slate-600 block mb-1">
                      Ficha de PA Ativa
                    </label>
                    <select
                      value={formAtendimentoPAId}
                      onChange={(e) => setFormAtendimentoPAId(e.target.value)}
                      className="w-full h-8 rounded-md border border-slate-200 px-2 text-xs bg-white"
                    >
                      <option value="">Vincular ficha do PA (opcional se não houver)...</option>
                      {atendimentosPA.map((pa) => (
                        <option key={pa.id} value={pa.id}>
                          {pa.expand?.paciente?.nome || 'Paciente'} — Status: {pa.status} (
                          {pa.data_hora_chegada})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formOrigemTipo === 'internacao' && (
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-slate-600 block mb-1">
                      Internação em Andamento
                    </label>
                    <select
                      value={formInternacaoId}
                      onChange={(e) => setFormInternacaoId(e.target.value)}
                      className="w-full h-8 rounded-md border border-slate-200 px-2 text-xs bg-white"
                    >
                      <option value="">Vincular internação ativa...</option>
                      {internacoesAtivas.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.expand?.paciente?.nome || 'Paciente'} — Leito:{' '}
                          {it.expand?.leito_atual?.codigo || 'S/N'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Setor e Leito de Origem */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Setor de Origem</label>
                  <select
                    value={formSetorOrigemId}
                    onChange={(e) => setFormSetorOrigemId(e.target.value)}
                    className="w-full h-8 rounded-md border border-slate-200 px-2 text-xs bg-white"
                  >
                    <option value="">Selecione o setor de origem...</option>
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">
                    Leito de Origem (se aplicável)
                  </label>
                  <select
                    value={formLeitoOrigemId}
                    onChange={(e) => setFormLeitoOrigemId(e.target.value)}
                    className="w-full h-8 rounded-md border border-slate-200 px-2 text-xs bg-white"
                  >
                    <option value="">Selecione o leito...</option>
                    {leitos
                      .filter((l) => !formSetorOrigemId || l.setor === formSetorOrigemId)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.codigo} — Tipo: {l.tipo}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Recurso Solicitado e Prioridade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Recurso Solicitado *
                </label>
                <select
                  value={formRecurso}
                  onChange={(e) => setFormRecurso(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-slate-200 px-3 text-xs bg-white"
                  required
                >
                  <option value="leito_enfermaria_clinica">Leito de Enfermaria Clínica</option>
                  <option value="leito_uti_adulto">Leito de UTI Adulto</option>
                  <option value="leito_isolamento">Leito de Isolamento</option>
                  <option value="leito_cirurgico">Leito Cirúrgico</option>
                  <option value="avaliacao_especializada">Avaliação Médica Especializada</option>
                  <option value="procedimento_urgencia">Procedimento de Urgência</option>
                  <option value="suporte_ventilatorio">Suporte Ventilatório</option>
                  <option value="outro">Outro Recurso</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Prioridade Definida pelo Profissional *
                </label>
                <select
                  value={formPrioridade}
                  onChange={(e) => setFormPrioridade(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-slate-200 px-3 text-xs bg-white"
                  required
                >
                  <option value="emergencia_vermelha">Vermelho — Emergência Imediata</option>
                  <option value="urgencia_amarela">Amarelo — Urgência Assistencial</option>
                  <option value="prioritario_verde">Verde — Prioritário</option>
                  <option value="eletivo_azul">Azul — Eletivo</option>
                </select>
              </div>
            </div>

            {/* Diagnóstico e CID-10 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Diagnóstico Principal / Hipótese *
                </label>
                <Input
                  placeholder="Ex: Pneumonia comunitária grave, Abdome agudo..."
                  value={formDiagnostico}
                  onChange={(e) => setFormDiagnostico(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  CID-10 (opcional)
                </label>
                <Input
                  placeholder="Ex: J18.9"
                  value={formCid10}
                  onChange={(e) => setFormCid10(e.target.value)}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>
            </div>

            {/* Justificativa Clínica */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Justificativa Clínica e Fundamentação Técnica *
              </label>
              <Textarea
                placeholder="Descreva detalhadamente o quadro clínico, indicação do recurso solicitado e critérios que fundamentam a prioridade definida..."
                value={formJustificativa}
                onChange={(e) => setFormJustificativa(e.target.value)}
                className="text-xs min-h-[80px]"
                required
              />
            </div>

            {/* Sinais Vitais e Condições de Transporte */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">
                  Sinais Vitais e Exames Relevantes (opcional)
                </label>
                <Input
                  placeholder="PA, FC, SpO2, Glasgow, gasometria..."
                  value={formSinaisVitais}
                  onChange={(e) => setFormSinaisVitais(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-1">
                  Condições de Transporte (se transferência externa)
                </label>
                <Input
                  placeholder="Ambulância básica, UTI móvel, acompanhante..."
                  value={formTransporte}
                  onChange={(e) => setFormTransporte(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Aviso de Não-Movimentação de Leito na Solicitação */}
            <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded text-indigo-900 text-[11px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-700 flex-shrink-0" />
              <span>
                <strong>Regra de Integridade:</strong> Apenas o registro da solicitação NÃO libera
                nem ocupa leitos. A movimentação física ocorrerá somente na confirmação/efetivação.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovaSolicitacao(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoSolicitacao}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {salvandoSolicitacao ? (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                )}
                Registrar Solicitação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: AVALIAÇÃO TÉCNICA DO REGULADOR (DECISÃO HUMANA: ACEITE / NEGATIVA) */}
      <Dialog open={modalAvaliacao} onOpenChange={setModalAvaliacao}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Avaliação Técnica do Responsável Regulador
            </DialogTitle>
            <DialogDescription className="text-xs">
              Protocolo: <strong>{solicitacaoSelecionada?.numero_solicitacao}</strong> • Paciente:{' '}
              {solicitacaoSelecionada?.paciente_nome}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarAvaliacao} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Decisão do Regulador (Decisão Humana) *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDecisaoRegulador('aceita')}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    decisaoRegulador === 'aceita'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                  <span className="text-xs block">ACEITAR SOLICITAÇÃO</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDecisaoRegulador('negada')}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    decisaoRegulador === 'negada'
                      ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold ring-2 ring-rose-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <XCircle className="w-5 h-5 mx-auto text-rose-600 mb-1" />
                  <span className="text-xs block">NEGAR SOLICITAÇÃO</span>
                </button>
              </div>
            </div>

            {/* SE ACEITA: DEFINIR DESTINO (SETOR / LEITO) */}
            {decisaoRegulador === 'aceita' && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">
                  Designação de Destino pelo Regulador
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">
                      Setor Hospitalar de Destino
                    </label>
                    <select
                      value={avalSetorDestinoId}
                      onChange={(e) => setAvalSetorDestinoId(e.target.value)}
                      className="w-full h-8 rounded-md border border-slate-200 px-2 text-xs bg-white"
                    >
                      <option value="">Selecione o setor...</option>
                      {setores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">
                      Leito Designado (Vagos: {leitosVagosDestino.length})
                    </label>
                    <select
                      value={avalLeitoDestinoId}
                      onChange={(e) => setAvalLeitoDestinoId(e.target.value)}
                      className="w-full h-8 rounded-md border border-slate-200 px-2 text-xs bg-white"
                    >
                      <option value="">Selecione o leito vago...</option>
                      {leitosVagosDestino.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.codigo} — {l.tipo} (Vago)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">
                    Unidade Externa Destino (caso seja transferência inter-hospitalar)
                  </label>
                  <Input
                    placeholder="Ex: Hospital Regional de Cacoal, Policlínica Municipal..."
                    value={avalUnidadeExterna}
                    onChange={(e) => setAvalUnidadeExterna(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Fundamentação Técnica do Regulador *
              </label>
              <Textarea
                placeholder={
                  decisaoRegulador === 'aceita'
                    ? 'Informe o parecer técnico de deferimento, disponibilidade de vaga e orientações assistenciais...'
                    : 'Informe detalhadamente os motivos clínicos e operacionais do indeferimento...'
                }
                value={motivoDecisaoRegulador}
                onChange={(e) => setMotivoDecisaoRegulador(e.target.value)}
                className="text-xs min-h-[70px]"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalAvaliacao(false)}
                className="text-xs"
              >
                Fechar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoAvaliacao}
                className={`text-xs text-white ${
                  decisaoRegulador === 'aceita'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {salvandoAvaliacao ? (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                )}
                Registrar Decisão
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: EFETIVAÇÃO DA TRANSFERÊNCIA REAL (MOVIMENTAÇÃO DE LEITOS) */}
      <Dialog open={modalEfetivacao} onOpenChange={setModalEfetivacao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
              Confirmar Efetivação da Transferência Real
            </DialogTitle>
            <DialogDescription className="text-xs">
              Esta ação confirma o transporte físico do paciente e realiza a movimentação no mapa de
              leitos e internações.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmarEfetivacao} className="space-y-4 pt-2">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 text-xs space-y-1.5">
              <span className="font-bold block">Resumo do Movimento Físico:</span>
              <div>
                <strong>Paciente:</strong> {solicitacaoSelecionada?.paciente_nome}
              </div>
              <div>
                <strong>Origem:</strong> {solicitacaoSelecionada?.setor_origem_nome}
                {solicitacaoSelecionada?.leito_origem_codigo &&
                  ` (${solicitacaoSelecionada?.leito_origem_codigo})`}
              </div>
              <div>
                <strong>Destino Autorizado:</strong>{' '}
                {solicitacaoSelecionada?.setor_destino_nome ||
                  solicitacaoSelecionada?.unidade_externa_destino ||
                  'Destino'}
                {solicitacaoSelecionada?.leito_destino_codigo &&
                  ` (Leito ${solicitacaoSelecionada?.leito_destino_codigo})`}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Observações de Chegada / Efetivação
              </label>
              <Textarea
                placeholder="Ex: Paciente recebido estável pela equipe de enfermagem da enfermaria..."
                value={obsEfetivacao}
                onChange={(e) => setObsEfetivacao(e.target.value)}
                className="text-xs min-h-[60px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalEfetivacao(false)}
                className="text-xs"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoEfetivacao}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {salvandoEfetivacao ? (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                )}
                Confirmar e Movimentar Leito
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: CANCELAMENTO */}
      <Dialog open={modalCancelamento} onOpenChange={setModalCancelamento}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              Cancelar Solicitação de Regulação
            </DialogTitle>
            <DialogDescription className="text-xs">
              Protocolo: {solicitacaoSelecionada?.numero_solicitacao}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmarCancelamento} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Motivo do Cancelamento *
              </label>
              <Textarea
                placeholder="Informe o motivo (ex: alta médica antes da transferência, desistência da família, melhora clínica)..."
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                className="text-xs min-h-[70px]"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalCancelamento(false)}
                className="text-xs"
              >
                Fechar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoCancelamento}
                className="text-xs bg-rose-600 hover:bg-rose-500 text-white"
              >
                {salvandoCancelamento ? (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                )}
                Confirmar Cancelamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: DETALHES COMPLETOS E TRILHA AUDITADA */}
      <Dialog open={modalDetalhes} onOpenChange={setModalDetalhes}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Dossiê da Solicitação: {solicitacaoSelecionada?.numero_solicitacao}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Histórico auditado de transições e decisões da Central de Regulação
            </DialogDescription>
          </DialogHeader>

          {solicitacaoSelecionada && (
            <div className="space-y-4 text-xs pt-2">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Paciente
                  </span>
                  <strong className="text-slate-900 text-sm">
                    {solicitacaoSelecionada.paciente_nome}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Situação Atual
                  </span>
                  <div>{badgeSituacao(solicitacaoSelecionada.situacao)}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Origem
                  </span>
                  <span className="text-slate-700">
                    {solicitacaoSelecionada.setor_origem_nome}
                    {solicitacaoSelecionada.leito_origem_codigo &&
                      ` (${solicitacaoSelecionada.leito_origem_codigo})`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Destino
                  </span>
                  <span className="text-slate-700">
                    {solicitacaoSelecionada.setor_destino_nome ||
                      solicitacaoSelecionada.unidade_externa_destino ||
                      'Não definido'}
                    {solicitacaoSelecionada.leito_destino_codigo &&
                      ` (${solicitacaoSelecionada.leito_destino_codigo})`}
                  </span>
                </div>
              </div>

              <div>
                <strong className="text-slate-800 block mb-1">Justificativa Clínica:</strong>
                <p className="p-3 bg-white border border-slate-200 rounded text-slate-700 leading-relaxed">
                  {solicitacaoSelecionada.justificativa_clinica}
                </p>
              </div>

              {solicitacaoSelecionada.motivo_decisao_regulador && (
                <div>
                  <strong className="text-slate-800 block mb-1">
                    Parecer do Regulador ({solicitacaoSelecionada.decisao_regulador?.toUpperCase()}
                    ):
                  </strong>
                  <p className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-700 leading-relaxed">
                    {solicitacaoSelecionada.motivo_decisao_regulador}
                  </p>
                </div>
              )}

              {/* Linha do tempo das transições */}
              <div>
                <strong className="text-slate-800 block mb-2">
                  Histórico Auditado de Transições:
                </strong>
                <div className="space-y-2 border-l-2 border-indigo-200 ml-2 pl-3">
                  {(() => {
                    let transicoes = []
                    try {
                      transicoes =
                        typeof solicitacaoSelecionada.historico_transicoes === 'string'
                          ? JSON.parse(solicitacaoSelecionada.historico_transicoes)
                          : solicitacaoSelecionada.historico_transicoes || []
                    } catch {
                      transicoes = []
                    }

                    if (transicoes.length === 0) {
                      return (
                        <span className="text-slate-400 text-xs">
                          Nenhuma transição registrada.
                        </span>
                      )
                    }

                    return transicoes.map((tr: any, idx: number) => (
                      <div key={idx} className="space-y-0.5 relative">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-500">
                            {tr.data_hora}
                          </span>
                          <span className="font-semibold text-slate-800 text-[11px]">
                            {tr.de} → {tr.para}
                          </span>
                          <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                            {tr.responsavel_nome}
                          </span>
                        </div>
                        {tr.motivo && (
                          <p className="text-[11px] text-slate-600 pl-1">{tr.motivo}</p>
                        )}
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalDetalhes(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: AVISO LEGAL DE ESCOPO DO SISTEMA */}
      <Dialog open={modalAvisoLegal} onOpenChange={setModalAvisoLegal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-600" />
              Controle Interno Municipal
            </DialogTitle>
            <DialogDescription className="text-xs">
              Diretrizes de regulação hospitalar municipal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs text-slate-700 pt-2 leading-relaxed">
            <p>
              Este módulo destina-se estritamente ao <strong>controle interno municipal</strong> do
              fluxo de transferências assistenciais, distribuição de leitos e encaminhamentos
              especializados.
            </p>
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
              <strong className="text-slate-900 block">Esclarecimentos Legais:</strong>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                <li>
                  <strong>Sem alegação de integração externa:</strong> Não há comunicação direta ou
                  envio implementado para SISREG, RNDS ou sistemas estaduais/federais.
                </li>
                <li>
                  <strong>Decisões estritamente humanas:</strong> Não são utilizados escores,
                  algoritmos ou rankings automáticos para priorização clínica.
                </li>
                <li>
                  <strong>Mínimo privilégio:</strong> Perfil de recepção acessa apenas visões
                  administrativas, preservando o sigilo de prontuário e dados clínicos.
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setModalAvisoLegal(false)}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
