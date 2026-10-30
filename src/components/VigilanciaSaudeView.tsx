import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  NotificacaoVigilancia,
  SituacaoCasoVigilancia,
  TipoVigilancia,
  CriterioConfirmacaoVigilancia,
  EvolucaoCasoVigilancia,
  Paciente,
  ItemHistoricoInvestigacao,
} from '@/types/hospital'
import {
  CATALOGO_AGRAVOS_VIGILANCIA,
  AgravoCatalogo,
  listarNotificacoesVigilancia,
  registrarNotificacaoVigilancia,
  atualizarSituacaoInvestigacao,
  calcularIndicadoresVigilancia,
  IndicadoresAgregadosVigilancia,
} from '@/services/vigilanciaSaude'
import { listarPacientes } from '@/services/cadastros'
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
  ShieldAlert,
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
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Building,
  HelpCircle,
} from 'lucide-react'

interface VigilanciaSaudeViewProps {
  onNavegarSAME?: (pacienteId?: string) => void
}

export const VigilanciaSaudeView: React.FC<VigilanciaSaudeViewProps> = ({ onNavegarSAME }) => {
  const { user, temPermissao } = useAuth()
  const { toast } = useToast()

  // Permissão de escrita (backend RLS bloqueia recepção; front também restringe botões)
  const podeRegistrar = temPermissao(['admin', 'gestor', 'profissional'])
  const isApenasConsulta = !podeRegistrar

  // Estados principais
  const [notificacoes, setNotificacoes] = useState<NotificacaoVigilancia[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'lista' | 'indicadores'>('lista')

  // Filtros da listagem
  const [filtroAgravo, setFiltroAgravo] = useState<string>('todos')
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todas')
  const [filtroTipoVig, setFiltroTipoVig] = useState<string>('todos')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [buscaTexto, setBuscaTexto] = useState('')

  // Modais
  const [modalNovaNotificacao, setModalNovaNotificacao] = useState(false)
  const [modalAcompanhamento, setModalAcompanhamento] = useState(false)
  const [casoSelecionado, setCasoSelecionado] = useState<NotificacaoVigilancia | null>(null)
  const [modalAjudaEscopo, setModalAjudaEscopo] = useState(false)

  // Formulário de Nova Notificação
  const [novoPacienteId, setNovoPacienteId] = useState('')
  const [novoAgravoCodigo, setNovoAgravoCodigo] = useState('')
  const [novoTipoVigilancia, setNovoTipoVigilancia] = useState<TipoVigilancia>('epidemiologica')
  const [novoCid10, setNovoCid10] = useState('')
  const [novaDataNotificacao, setNovaDataNotificacao] = useState(
    () => new Date().toISOString().split('T')[0],
  )
  const [novaDataSintomas, setNovaDataSintomas] = useState('')
  const [novasObs, setNovasObs] = useState('')
  const [salvandoNova, setSalvandoNova] = useState(false)

  // Formulário de Acompanhamento / Mudança de Situação
  const [novaSituacao, setNovaSituacao] = useState<SituacaoCasoVigilancia>('em_investigacao')
  const [novoCriterio, setNovoCriterio] = useState<CriterioConfirmacaoVigilancia>('clinico')
  const [novaEvolucao, setNovaEvolucao] = useState<EvolucaoCasoVigilancia>('em_tratamento')
  const [notaInvestigacao, setNotaInvestigacao] = useState('')
  const [salvandoAcompanhamento, setSalvandoAcompanhamento] = useState(false)

  // 1. Carregamento de dados
  const carregarDados = async () => {
    setLoading(true)
    try {
      const [listaNotifs, listaPacs] = await Promise.all([
        listarNotificacoesVigilancia({
          agravoCodigo: filtroAgravo,
          situacao: filtroSituacao as any,
          tipoVigilancia: filtroTipoVig as any,
          dataInicio: filtroDataInicio,
          dataFim: filtroDataFim,
          buscaTexto,
        }),
        listarPacientes(),
      ])
      setNotificacoes(listaNotifs)
      setPacientes(listaPacs)
    } catch (err: any) {
      console.error('Erro ao carregar notificações:', err)
      toast({
        title: 'Erro ao carregar dados de vigilância',
        description: err.message || 'Verifique sua conexão.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroAgravo, filtroSituacao, filtroTipoVig, filtroDataInicio, filtroDataFim])

  // Busca rápida na lista local
  const notificacoesFiltradas = useMemo(() => {
    if (!buscaTexto.trim()) return notificacoes
    const q = buscaTexto.toLowerCase()
    return notificacoes.filter(
      (n) =>
        n.paciente_nome.toLowerCase().includes(q) ||
        n.numero_notificacao.toLowerCase().includes(q) ||
        n.agravo_nome.toLowerCase().includes(q) ||
        (n.cid10_codigo && n.cid10_codigo.toLowerCase().includes(q)) ||
        (n.paciente_cpf && n.paciente_cpf.includes(q)),
    )
  }, [notificacoes, buscaTexto])

  // Indicadores agregados
  const indicadores: IndicadoresAgregadosVigilancia = useMemo(() => {
    return calcularIndicadoresVigilancia(notificacoes)
  }, [notificacoes])

  // Auto-preenchimento ao escolher agravo no catálogo
  const handleSelecionarAgravoCatalogo = (codigo: string) => {
    setNovoAgravoCodigo(codigo)
    const item = CATALOGO_AGRAVOS_VIGILANCIA.find((a) => a.codigo === codigo)
    if (item) {
      setNovoTipoVigilancia(item.tipoVigilancia)
      if (item.cid10Padrao) {
        setNovoCid10(item.cid10Padrao)
      }
    }
  }

  // Submissão: Criar Nova Notificação
  const handleCriarNotificacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!podeRegistrar) {
      toast({
        title: 'Acesso restrito',
        description: 'Seu perfil de usuário possui acesso apenas de consulta ao módulo.',
        variant: 'destructive',
      })
      return
    }

    if (!novoPacienteId) {
      toast({
        title: 'Paciente obrigatório',
        description: 'Selecione o paciente a ser notificado.',
        variant: 'destructive',
      })
      return
    }
    if (!novoAgravoCodigo) {
      toast({
        title: 'Agravo obrigatório',
        description: 'Selecione a doença ou agravo sob suspeita.',
        variant: 'destructive',
      })
      return
    }

    const pacienteObj = pacientes.find((p) => p.id === novoPacienteId)
    const agravoObj = CATALOGO_AGRAVOS_VIGILANCIA.find((a) => a.codigo === novoAgravoCodigo)
    if (!pacienteObj || !agravoObj) return

    setSalvandoNova(true)
    try {
      await registrarNotificacaoVigilancia({
        pacienteId: pacienteObj.id,
        pacienteNome: pacienteObj.nome,
        pacienteCpf: pacienteObj.cpf,
        pacienteCartaoSus: pacienteObj.cartao_sus,
        pacienteDataNascimento: pacienteObj.data_nascimento,
        pacienteSexo: pacienteObj.sexo,
        pacienteMunicipio: pacienteObj.cidade || 'Mirante da Serra - RO',
        pacienteBairro: pacienteObj.bairro,
        pacienteLogradouro: pacienteObj.endereco,
        pacienteTelefone: pacienteObj.telefone,
        tipoVigilancia: novoTipoVigilancia,
        agravoCodigo: agravoObj.codigo,
        agravoNome: agravoObj.nome,
        cid10Codigo: novoCid10 || agravoObj.cid10Padrao,
        periodicidade: agravoObj.periodicidade,
        situacao: 'notificado',
        dataNotificacao: novaDataNotificacao,
        dataPrimeirosSintomas: novaDataSintomas,
        profissionalNotificanteId: user?.id,
        profissionalNome: user?.name || 'Profissional de Saúde',
        profissionalRegistro: user?.registro_profissional || '',
        unidadeNotificadora: 'Hospital Municipal de Mirante da Serra - RO',
        municipioNotificacao: 'Mirante da Serra - RO',
        observacoesInvestigacao: novasObs,
      })

      toast({
        title: 'Notificação registrada com sucesso!',
        description: `Agravo "${agravoObj.nome}" inserido na fila de vigilância e integrado ao SAME.`,
      })

      // Resetar form e recarregar
      setNovoPacienteId('')
      setNovoAgravoCodigo('')
      setNovoCid10('')
      setNovaDataSintomas('')
      setNovasObs('')
      setModalNovaNotificacao(false)
      carregarDados()
    } catch (err: any) {
      console.error('Erro ao registrar notificação:', err)
      toast({
        title: 'Falha ao gravar notificação',
        description: err.message || 'Verifique as permissões de acesso e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoNova(false)
    }
  }

  // Abertura do modal de Acompanhamento
  const abrirAcompanhamento = (notif: NotificacaoVigilancia) => {
    setCasoSelecionado(notif)
    setNovaSituacao(notif.situacao)
    setNovoCriterio(notif.criterio_confirmacao || 'clinico')
    setNovaEvolucao(notif.evolucao_caso || 'em_tratamento')
    setNotaInvestigacao('')
    setModalAcompanhamento(true)
  }

  // Submissão: Atualizar Acompanhamento / Situação
  const handleSalvarAcompanhamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!podeRegistrar) {
      toast({
        title: 'Acesso restrito',
        description: 'Seu perfil possui apenas permissão de consulta.',
        variant: 'destructive',
      })
      return
    }

    if (!casoSelecionado) return
    if (!notaInvestigacao.trim()) {
      toast({
        title: 'Nota obrigatória',
        description: 'Descreva a anotação clínica ou o motivo da alteração de situação.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoAcompanhamento(true)
    try {
      await atualizarSituacaoInvestigacao({
        notificacaoId: casoSelecionado.id,
        novaSituacao,
        criterioConfirmacao: novoCriterio,
        evolucaoCaso: novaEvolucao,
        notaInvestigacao,
      })

      toast({
        title: 'Investigação atualizada',
        description: `Situação do caso alterada para "${renderSituacaoLabel(novaSituacao)}".`,
      })

      setModalAcompanhamento(false)
      setCasoSelecionado(null)
      carregarDados()
    } catch (err: any) {
      console.error('Erro ao atualizar acompanhamento:', err)
      toast({
        title: 'Erro ao salvar acompanhamento',
        description: err.message || 'Falha ao registrar histórico.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoAcompanhamento(false)
    }
  }

  // Helper de badges e rótulos
  const renderSituacaoLabel = (situacao: SituacaoCasoVigilancia): string => {
    switch (situacao) {
      case 'notificado':
        return 'Notificado'
      case 'em_investigacao':
        return 'Em Investigação'
      case 'confirmado':
        return 'Confirmado'
      case 'descartado':
        return 'Descartado'
      case 'encerrado':
        return 'Encerrado'
      default:
        return situacao
    }
  }

  const renderSituacaoBadge = (situacao: SituacaoCasoVigilancia) => {
    switch (situacao) {
      case 'notificado':
        return (
          <Badge className="bg-amber-500/15 text-amber-800 border-amber-300 text-[11px] font-semibold">
            <Clock className="w-3 h-3 mr-1" /> Notificado
          </Badge>
        )
      case 'em_investigacao':
        return (
          <Badge className="bg-blue-500/15 text-blue-800 border-blue-300 text-[11px] font-semibold">
            <Activity className="w-3 h-3 mr-1" /> Em Investigação
          </Badge>
        )
      case 'confirmado':
        return (
          <Badge className="bg-red-500/15 text-red-800 border-red-300 text-[11px] font-semibold">
            <AlertTriangle className="w-3 h-3 mr-1" /> Confirmado
          </Badge>
        )
      case 'descartado':
        return (
          <Badge className="bg-slate-500/15 text-slate-700 border-slate-300 text-[11px] font-semibold">
            <XCircle className="w-3 h-3 mr-1" /> Descartado
          </Badge>
        )
      case 'encerrado':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-800 border-emerald-300 text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Encerrado
          </Badge>
        )
    }
  }

  const parseHistorico = (notif: NotificacaoVigilancia): ItemHistoricoInvestigacao[] => {
    try {
      if (typeof notif.historico_investigacao === 'string') {
        return JSON.parse(notif.historico_investigacao) || []
      }
      if (Array.isArray(notif.historico_investigacao)) {
        return notif.historico_investigacao
      }
      return []
    } catch {
      return []
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. CABEÇALHO INSTITUCIONAL DO MÓDULO */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Vigilância em Saúde Municipal
              </h1>
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-bold uppercase tracking-wider"
              >
                Controle Interno Municipal
              </Badge>
              {isApenasConsulta && (
                <Badge
                  variant="outline"
                  className="bg-slate-100 text-slate-600 border-slate-300 text-[10px]"
                >
                  Modo Somente Consulta (Recepção)
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro, fila de investigação de agravos compulsórios e indicadores da Secretaria
              Municipal de Saúde • Mirante da Serra - RO
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalAjudaEscopo(true)}
            className="text-xs text-slate-600 border-slate-300 gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            Aviso Legal / Escopo
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={loading}
            className="text-xs text-slate-600 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          {podeRegistrar ? (
            <Button
              size="sm"
              onClick={() => setModalNovaNotificacao(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm gap-1.5 text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              Nova Notificação
            </Button>
          ) : (
            <Button
              size="sm"
              disabled
              variant="outline"
              title="Apenas médicos, enfermeiros e gestores podem registrar novas notificações"
              className="text-xs text-slate-400 cursor-not-allowed"
            >
              Registro Restrito à Assistência
            </Button>
          )}
        </div>
      </div>

      {/* 2. ALERTA OBRIGATÓRIO DE ESCOPO E NÃO-INTEGRAÇÃO SINAN/e-SUS */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950 flex items-start gap-3 shadow-xs">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-amber-900 block">
            Aviso de Conformidade — Controle Interno Municipal:
          </span>
          <p className="text-amber-800 leading-relaxed">
            Este módulo opera estritamente para <strong>acompanhamento e controle interno</strong>{' '}
            da unidade hospitalar e vigilância municipal.{' '}
            <em>Exportação/envio oficial a órgãos externos (SINAN/e-SUS) não implementado</em>.{' '}
            <strong>Não há classificação diagnóstica automatizada</strong>: cada suspeita e
            encerramento clínico é revisado e preenchido exclusivamente por profissional humano.
            Módulo sem georreferenciamento e sem vacinas (item 331 excluído).
          </p>
        </div>
      </div>

      {/* 3. RESUMO / CARDS DE INDICADORES RÁPIDOS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">
              Total Notificados
            </span>
            <div className="text-xl font-bold text-slate-900 mt-1">{indicadores.totalCasos}</div>
            <span className="text-[10px] text-slate-400">Casos registrados</span>
          </CardContent>
        </Card>

        <Card className="border-amber-200 shadow-xs bg-amber-50/40">
          <CardContent className="p-3">
            <span className="text-[11px] font-semibold text-amber-800 uppercase block">
              Aguardando
            </span>
            <div className="text-xl font-bold text-amber-900 mt-1">
              {indicadores.casosPorSituacao.notificado}
            </div>
            <span className="text-[10px] text-amber-700">Fila inicial</span>
          </CardContent>
        </Card>

        <Card className="border-blue-200 shadow-xs bg-blue-50/40">
          <CardContent className="p-3">
            <span className="text-[11px] font-semibold text-blue-800 uppercase block">
              Em Investigação
            </span>
            <div className="text-xl font-bold text-blue-900 mt-1">
              {indicadores.casosPorSituacao.em_investigacao}
            </div>
            <span className="text-[10px] text-blue-700">Acompanhamento</span>
          </CardContent>
        </Card>

        <Card className="border-red-200 shadow-xs bg-red-50/40">
          <CardContent className="p-3">
            <span className="text-[11px] font-semibold text-red-800 uppercase block">
              Confirmados
            </span>
            <div className="text-xl font-bold text-red-900 mt-1">
              {indicadores.casosPorSituacao.confirmado}
            </div>
            <span className="text-[10px] text-red-700">Clínico/Laboratorial</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-slate-50/60">
          <CardContent className="p-3">
            <span className="text-[11px] font-semibold text-slate-600 uppercase block">
              Descartados
            </span>
            <div className="text-xl font-bold text-slate-800 mt-1">
              {indicadores.casosPorSituacao.descartado}
            </div>
            <span className="text-[10px] text-slate-500">Negativos / Incompatíveis</span>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 shadow-xs bg-emerald-50/40">
          <CardContent className="p-3">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase block">
              Taxa Encerramento
            </span>
            <div className="text-xl font-bold text-emerald-900 mt-1">
              {indicadores.taxaEncerramentoPercentual}%
            </div>
            <span className="text-[10px] text-emerald-700">
              {indicadores.casosPorSituacao.encerrado + indicadores.casosPorSituacao.descartado}{' '}
              concluídos
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 4. ABAS: LISTA DE CASOS vs PAINEL DE INDICADORES AGREGADOS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setAbaAtiva('lista')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            abaAtiva === 'lista'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Fila de Notificações & Casos ({notificacoesFiltradas.length})
        </button>

        <button
          onClick={() => setAbaAtiva('indicadores')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            abaAtiva === 'indicadores'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Painel de Indicadores Agregados
        </button>
      </div>

      {/* CONTEÚDO DA ABA 1: FILA DE NOTIFICAÇÕES & FILTROS */}
      {abaAtiva === 'lista' && (
        <div className="space-y-4">
          {/* BARRA DE FILTROS: PERÍODO, AGRAVO, SITUAÇÃO E BUSCA POR PACIENTE */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Filtro Agravo */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Filtrar por Agravo / Doença
                  </label>
                  <select
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800"
                    value={filtroAgravo}
                    onChange={(e) => setFiltroAgravo(e.target.value)}
                  >
                    <option value="todos">Todos os Agravos</option>
                    {CATALOGO_AGRAVOS_VIGILANCIA.map((a) => (
                      <option key={a.codigo} value={a.codigo}>
                        {a.nome} {a.cid10Padrao ? `(${a.cid10Padrao})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro Situação */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Situação do Caso
                  </label>
                  <select
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800"
                    value={filtroSituacao}
                    onChange={(e) => setFiltroSituacao(e.target.value)}
                  >
                    <option value="todas">Todas as Situações</option>
                    <option value="notificado">Notificado (Aguardando)</option>
                    <option value="em_investigacao">Em Investigação</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="descartado">Descartado</option>
                    <option value="encerrado">Encerrado</option>
                  </select>
                </div>

                {/* Filtro Período: De */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Data Notificação (De)
                  </label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                  />
                </div>

                {/* Filtro Período: Até */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Data Notificação (Até)
                  </label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                  />
                </div>

                {/* Busca texto: Paciente, Número ou CID */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Buscar por Paciente / Nº Notif.
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <Input
                      placeholder="Nome, CPF ou nº..."
                      className="h-8 text-xs pl-8"
                      value={buscaTexto}
                      onChange={(e) => setBuscaTexto(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {(filtroAgravo !== 'todos' ||
                filtroSituacao !== 'todas' ||
                filtroDataInicio ||
                filtroDataFim ||
                buscaTexto) && (
                <div className="flex justify-end pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFiltroAgravo('todos')
                      setFiltroSituacao('todas')
                      setFiltroTipoVig('todos')
                      setFiltroDataInicio('')
                      setFiltroDataFim('')
                      setBuscaTexto('')
                    }}
                    className="h-6 text-xs text-red-600 hover:text-red-700"
                  >
                    Limpar todos os filtros
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* TABELA / LISTA DE CASOS DE NOTIFICAÇÃO */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Casos Notificados para Investigação
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Ordem cronológica das notificações com histórico clínico e anotações
                </CardDescription>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {notificacoesFiltradas.length} caso(s) encontrado(s)
              </span>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  Carregando notificações de vigilância...
                </div>
              ) : notificacoesFiltradas.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs space-y-1">
                  <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">Nenhum caso encontrado.</p>
                  <p className="text-slate-400">
                    Ajuste os filtros de período/agravo ou registre uma nova notificação.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notificacoesFiltradas.map((notif) => {
                    const historico = parseHistorico(notif)
                    const ultimaNota = historico.length > 0 ? historico[historico.length - 1] : null

                    return (
                      <div
                        key={notif.id}
                        className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        {/* Bloco 1: Identificação do Caso e Paciente */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {notif.numero_notificacao}
                            </span>
                            {renderSituacaoBadge(notif.situacao)}
                            {notif.periodicidade === 'imediata_24h' && (
                              <Badge className="bg-red-600 text-white text-[10px] font-bold">
                                Notificação Imediata (24h)
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className="text-[10px] text-slate-600 border-slate-300"
                            >
                              {notif.tipo_vigilancia === 'epidemiologica'
                                ? 'Epidemiológica'
                                : notif.tipo_vigilancia === 'sanitaria'
                                  ? 'Sanitária'
                                  : 'Saúde do Trabalhador'}
                            </Badge>
                          </div>

                          <div>
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{notif.agravo_nome}</span>
                              {notif.cid10_codigo && (
                                <span className="text-xs font-mono font-semibold text-slate-500">
                                  [{notif.cid10_codigo}]
                                </span>
                              )}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-0.5">
                              <span className="font-semibold text-slate-800 flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                {notif.paciente_nome}
                              </span>
                              {notif.paciente_cpf && <span>CPF: {notif.paciente_cpf}</span>}
                              {notif.paciente_cartao_sus && (
                                <span>SUS: {notif.paciente_cartao_sus}</span>
                              )}
                              {notif.paciente_bairro && (
                                <span>Bairro: {notif.paciente_bairro}</span>
                              )}
                            </div>
                          </div>

                          {/* Notas de investigação / Última alteração */}
                          {ultimaNota && (
                            <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200/80 mt-1">
                              <span className="font-semibold text-slate-700">
                                Última anotação de investigação (
                                {ultimaNota.data_hora?.split('T')[0]} por {ultimaNota.usuario_nome}
                                ):
                              </span>{' '}
                              <span className="italic">"{ultimaNota.nota}"</span>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-x-4 text-[11px] text-slate-500">
                            <span>
                              Notificado em: <strong>{notif.data_notificacao}</strong>
                            </span>
                            {notif.data_primeiros_sintomas && (
                              <span>
                                Início sintomas: <strong>{notif.data_primeiros_sintomas}</strong>
                              </span>
                            )}
                            <span>
                              Notificante: <strong>{notif.profissional_nome}</strong>
                            </span>
                            {notif.data_encerramento && (
                              <span className="text-emerald-700 font-semibold">
                                Encerramento: {notif.data_encerramento}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bloco 2: Ações Operacionais */}
                        <div className="flex flex-wrap lg:flex-col items-end gap-2 shrink-0">
                          {podeRegistrar ? (
                            <Button
                              size="sm"
                              onClick={() => abrirAcompanhamento(notif)}
                              className="text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1 h-8"
                            >
                              <Activity className="w-3.5 h-3.5" />
                              Acompanhar / Investigar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirAcompanhamento(notif)}
                              className="text-xs text-slate-700 gap-1 h-8"
                            >
                              <Info className="w-3.5 h-3.5" />
                              Ver Detalhes do Caso
                            </Button>
                          )}

                          {onNavegarSAME && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onNavegarSAME(notif.paciente)}
                              className="text-xs text-blue-700 border-blue-200 hover:bg-blue-50 gap-1 h-8"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              Ver Prontuário SAME
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
      )}

      {/* CONTEÚDO DA ABA 2: PAINEL DE INDICADORES AGREGADOS (SEM EXPOR DADOS PESSOAIS) */}
      {abaAtiva === 'indicadores' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Agravos mais frequentes */}
            <Card className="border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  Agravos Mais Frequentes no Município
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Agregação quantitativa de casos por agravo e situação
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {indicadores.topAgravos.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    Sem registros para consolidar no momento.
                  </p>
                ) : (
                  indicadores.topAgravos.map((ag) => (
                    <div key={ag.codigo} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-800">{ag.nome}</span>
                        <span className="font-mono text-slate-600">
                          <strong>{ag.total}</strong> caso(s) ({ag.confirmados} conf.,{' '}
                          {ag.emInvestigacao} inv.)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.round((ag.total / (indicadores.totalCasos || 1)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Distribuição por Situação de Investigação */}
            <Card className="border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Distribuição por Situação dos Casos
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Monitoramento do fluxo de investigação epidemiológica municipal
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded bg-amber-50 border border-amber-200">
                    <span className="font-semibold text-amber-900">Notificado (Aguardando)</span>
                    <span className="font-bold text-amber-900">
                      {indicadores.casosPorSituacao.notificado} caso(s)
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded bg-blue-50 border border-blue-200">
                    <span className="font-semibold text-blue-900">Em Investigação</span>
                    <span className="font-bold text-blue-900">
                      {indicadores.casosPorSituacao.em_investigacao} caso(s)
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded bg-red-50 border border-red-200">
                    <span className="font-semibold text-red-900">Casos Confirmados</span>
                    <span className="font-bold text-red-900">
                      {indicadores.casosPorSituacao.confirmado} caso(s)
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="font-semibold text-slate-700">Casos Descartados</span>
                    <span className="font-bold text-slate-800">
                      {indicadores.casosPorSituacao.descartado} caso(s)
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded bg-emerald-50 border border-emerald-200">
                    <span className="font-semibold text-emerald-900">Investigações Encerradas</span>
                    <span className="font-bold text-emerald-900">
                      {indicadores.casosPorSituacao.encerrado} caso(s)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recorte Temporal e Tipologia */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-200 shadow-xs bg-white">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-slate-500 uppercase block">
                  Notificações nos Últimos 7 Dias
                </span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {indicadores.casosUltimos7Dias}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Casos recentes com entrada nesta semana epidemiológica
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs bg-white">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-slate-500 uppercase block">
                  Notificações nos Últimos 30 Dias
                </span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {indicadores.casosUltimos30Dias}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Volume mensal de agravos sob investigação municipal
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs bg-white">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-slate-500 uppercase block">
                  Periodicidade Imediata (24h)
                </span>
                <div className="text-2xl font-black text-red-600 mt-1">
                  {indicadores.casosPorPeriodicidade.imediata_24h}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Agravos de alerta máximo com exigência de resposta em 24h
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 5. MODAL: NOVA NOTIFICAÇÃO DE VIGILÂNCIA EM SAÚDE */}
      <Dialog open={modalNovaNotificacao} onOpenChange={setModalNovaNotificacao}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              Registrar Notificação de Vigilância em Saúde
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ficha enxuta de controle interno baseada no modelo padrão do Ministério da Saúde. Cada
              campo clínico requer preenchimento humano explícito.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCriarNotificacao} className="space-y-4 text-xs">
            {/* Bloco 1: Seleção do Paciente */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 block">1. Identificação do Paciente</span>
              <div className="space-y-1">
                <label className="text-slate-600">Paciente Cadastrado *</label>
                <select
                  required
                  className="w-full h-9 px-3 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800"
                  value={novoPacienteId}
                  onChange={(e) => setNovoPacienteId(e.target.value)}
                >
                  <option value="">Selecione o paciente...</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} • SUS: {p.cartao_sus} {p.cpf ? `• CPF: ${p.cpf}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bloco 2: Agravo e Classificação */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <span className="font-bold text-slate-800 block">
                2. Doença ou Agravo Sob Suspeita
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-600">Catálogo de Agravos Obrigatórios *</label>
                  <select
                    required
                    className="w-full h-9 px-3 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800"
                    value={novoAgravoCodigo}
                    onChange={(e) => handleSelecionarAgravoCatalogo(e.target.value)}
                  >
                    <option value="">Selecione o agravo...</option>
                    {CATALOGO_AGRAVOS_VIGILANCIA.map((a) => (
                      <option key={a.codigo} value={a.codigo}>
                        {a.nome} {a.cid10Padrao ? `(${a.cid10Padrao})` : ''} —{' '}
                        {a.periodicidade === 'imediata_24h' ? '24h' : 'Semanal'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600">Tipo de Vigilância *</label>
                  <select
                    className="w-full h-9 px-3 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800"
                    value={novoTipoVigilancia}
                    onChange={(e) => setNovoTipoVigilancia(e.target.value as TipoVigilancia)}
                  >
                    <option value="epidemiologica">Vigilância Epidemiológica</option>
                    <option value="sanitaria">Vigilância Sanitária</option>
                    <option value="saude_trabalhador">Saúde do Trabalhador</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-600">Código CID-10 Sugerido</label>
                  <Input
                    className="h-8 text-xs font-mono"
                    placeholder="Ex: A90, B54"
                    value={novoCid10}
                    onChange={(e) => setNovoCid10(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600">Data da Notificação *</label>
                  <Input
                    type="date"
                    required
                    className="h-8 text-xs"
                    value={novaDataNotificacao}
                    onChange={(e) => setNovaDataNotificacao(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600">Início dos Primeiros Sintomas</label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={novaDataSintomas}
                    onChange={(e) => setNovaDataSintomas(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Bloco 3: Observações Iniciais de Investigação */}
            <div className="space-y-1">
              <label className="text-slate-600">
                Observações Clínicas / Epidemiológicas Iniciais (preenchimento humano)
              </label>
              <Textarea
                rows={3}
                placeholder="Descreva a suspeita clínica, história de exposição, vínculos e justificativa para o início da investigação..."
                value={novasObs}
                onChange={(e) => setNovasObs(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Rodapé institucional de identificação do notificante */}
            <div className="text-[11px] text-slate-500 bg-slate-100 p-2.5 rounded border border-slate-200">
              Notificante logado: <strong>{user?.name}</strong> ({user?.cargo || user?.role}) •{' '}
              {user?.registro_profissional || 'SMS Mirante da Serra - RO'}
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovaNotificacao(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoNova}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {salvandoNova ? 'Gravando Notificação...' : 'Registrar Notificação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. MODAL: ACOMPANHAMENTO / INVESTIGAÇÃO E HISTÓRICO DE MUDANÇA */}
      <Dialog open={modalAcompanhamento} onOpenChange={setModalAcompanhamento}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Acompanhamento de Investigação — Caso Nº {casoSelecionado?.numero_notificacao}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {casoSelecionado?.agravo_nome} • Paciente: {casoSelecionado?.paciente_nome}
            </DialogDescription>
          </DialogHeader>

          {casoSelecionado && (
            <div className="space-y-4 text-xs">
              {/* Histórico cronológico de mudanças e notas */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Histórico de Mudanças de Situação e Notas
                </span>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {parseHistorico(casoSelecionado).map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white rounded border border-slate-200 text-slate-700 space-y-1 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-800">
                          {item.usuario_nome} {item.usuario_cargo ? `(${item.usuario_cargo})` : ''}
                        </span>
                        <span>{item.data_hora?.replace('T', ' ').slice(0, 16)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="font-mono text-slate-500">{item.situacao_anterior}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-mono font-bold text-slate-800">
                          {item.situacao_nova}
                        </span>
                      </div>
                      <p className="text-slate-800 whitespace-pre-wrap">{item.nota}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formulário para atualizar situação e adicionar nota de investigação */}
              {podeRegistrar ? (
                <form
                  onSubmit={handleSalvarAcompanhamento}
                  className="p-3 bg-white rounded-lg border border-blue-200 space-y-3"
                >
                  <span className="font-bold text-blue-950 block">
                    Registrar Nova Anotação / Atualizar Situação
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-600 font-semibold">
                        Nova Situação do Caso *
                      </label>
                      <select
                        className="w-full h-8 px-2 text-xs border border-slate-300 rounded bg-white font-medium text-slate-800"
                        value={novaSituacao}
                        onChange={(e) => setNovaSituacao(e.target.value as SituacaoCasoVigilancia)}
                      >
                        <option value="notificado">Notificado</option>
                        <option value="em_investigacao">Em Investigação</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="descartado">Descartado</option>
                        <option value="encerrado">Encerrado</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-600 font-semibold">
                        Critério de Confirmação
                      </label>
                      <select
                        className="w-full h-8 px-2 text-xs border border-slate-300 rounded bg-white font-medium text-slate-800"
                        value={novoCriterio}
                        onChange={(e) =>
                          setNovoCriterio(e.target.value as CriterioConfirmacaoVigilancia)
                        }
                      >
                        <option value="laboratorial">Laboratorial</option>
                        <option value="clinico_epidemiologico">Clínico-Epidemiológico</option>
                        <option value="clinico">Clínico</option>
                        <option value="em_aberto">Em Aberto</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-600 font-semibold">Evolução do Caso</label>
                      <select
                        className="w-full h-8 px-2 text-xs border border-slate-300 rounded bg-white font-medium text-slate-800"
                        value={novaEvolucao}
                        onChange={(e) => setNovaEvolucao(e.target.value as EvolucaoCasoVigilancia)}
                      >
                        <option value="cura">Cura</option>
                        <option value="em_tratamento">Em Tratamento</option>
                        <option value="obito_agravo">Óbito pelo Agravo</option>
                        <option value="obito_outras_causas">Óbito por Outras Causas</option>
                        <option value="ignorado">Ignorado</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 font-semibold">
                      Nota de Investigação / Justificativa da Alteração *
                    </label>
                    <Textarea
                      required
                      rows={3}
                      placeholder="Registre a evolução da investigação, resultados de exames complementares ou justificativa para confirmação/descarte..."
                      value={notaInvestigacao}
                      onChange={(e) => setNotaInvestigacao(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setModalAcompanhamento(false)}
                    >
                      Fechar
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={salvandoAcompanhamento}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    >
                      {salvandoAcompanhamento ? 'Salvando...' : 'Salvar Alteração'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="p-3 bg-slate-100 rounded text-slate-500 text-center text-xs">
                  Apenas profissionais de saúde e gestores podem atualizar a investigação deste
                  caso.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 7. MODAL: AVISO LEGAL E DOCUMENTAÇÃO DE ESCOPO */}
      <Dialog open={modalAjudaEscopo} onOpenChange={setModalAjudaEscopo}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-600" />
              Diretrizes de Vigilância em Saúde — Controle Interno
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <strong className="text-amber-900 block mb-1">
                1. Módulo de Controle Interno Municipal
              </strong>
              Este bloco serve para a organização interna do fluxo de notificações compulsórias da
              unidade hospitalar e SMS de Mirante da Serra - RO. Não há transmissão ou exportação
              automática para os sistemas federais SINAN ou e-SUS.
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <strong className="text-blue-900 block mb-1">
                2. Não-inferência Diagnóstica Automática
              </strong>
              O software não diagnostica, não infere agravos nem altera situações de casos por
              algoritmo. Cada suspeita, critério de confirmação e encerramento clínico é
              obrigatoriamente registrado e assinado por profissional humano habilitado.
            </div>

            <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
              <strong className="text-slate-900 block mb-1">
                3. Delimitações e Itens Excluídos do Escopo
              </strong>
              Em estrita conformidade com as deliberações do projeto e guia de referência (ANEXO I):
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
                <li>Sem georreferenciamento (item 331 excluído do escopo).</li>
                <li>Sem módulo de vacinas / imunização.</li>
                <li>Integração nativa à Linha do Tempo do Prontuário SAME do paciente.</li>
                <li>Trilha de auditoria completa gravada para toda inserção e atualização.</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setModalAjudaEscopo(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
