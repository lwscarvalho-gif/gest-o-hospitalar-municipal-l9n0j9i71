import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  TfdProcesso,
  TfdHistoricoEstado,
  StatusProcessoTFD,
  TipoAtendimentoTFD,
  CriarProcessoTfdParams,
  TransitarEstadoTfdParams,
  RenovarProcessoTfdParams,
  ItemViagemLoteInput,
  PreviaViagemLoteResultado,
  ConfirmarViagemLoteResultado,
  TransporteVeiculo,
  TransporteMotorista,
  Paciente,
  Profissional,
} from '@/types/hospital'
import {
  listarProcessosTfd,
  obterProcessoTfdPorId,
  criarProcessoTfd,
  transitarEstadoTfd,
  renovarProcessoTfd,
  obterPreviaViagensLoteTfd,
  confirmarViagensLoteTfd,
  listarHistoricoEstadosTfd,
  listarViagensDoProcessoTfd,
  obterTotaisAgregadosPorLocalidade,
  AgregadoLocalidadeTfd,
  validarTransicaoEstadoTfd,
  validarCoerenciaPacienteTfdViagem,
} from '@/services/tfd'
import { listarVeiculos, listarMotoristas } from '@/services/transporte'
import { listarPacientes, listarProfissionais } from '@/services/cadastros'
import { mascararCPF, mascararCNS } from '@/services/identificacaoPaciente'
import { SeletorPaciente } from '@/components/SeletorPaciente'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Bus,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  AlertTriangle,
  Layers,
  History,
  Building2,
  Calendar,
  Lock,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Trash2,
  User,
  ShieldAlert,
  Eye,
} from 'lucide-react'

interface TfdViewProps {
  onNavegarTransporte?: () => void
  onNavegarSAME?: (pacienteId?: string) => void
}

type TabSecao = 'processos' | 'detalhes' | 'novo_processo' | 'lote_viagens' | 'painel_agregado'

export const TfdView: React.FC<TfdViewProps> = ({ onNavegarTransporte, onNavegarSAME }) => {
  const { user, temPermissao } = useAuth()
  const { toast } = useToast()

  const ehRecepcao = user?.role === 'recepcao'
  const podeGerenciarEstados = temPermissao(['admin', 'gestor', 'profissional'])
  const podeCriarProcesso = temPermissao(['admin', 'gestor', 'profissional'])

  // Aba principal
  const [tabAtiva, setTabAtiva] = useState<TabSecao>('processos')

  // Filtros de listagem de processos
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroBusca, setFiltroBusca] = useState<string>('')
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('')
  const [filtroDataFim, setFiltroDataFim] = useState<string>('')
  const [paginaAtual, setPaginaAtual] = useState<number>(1)
  const [totalPaginas, setTotalPaginas] = useState<number>(1)
  const [totalItens, setTotalItens] = useState<number>(0)
  const [isolamentoAplicado, setIsolamentoAplicado] = useState<boolean>(false)

  // Estado de listagem
  const [processos, setProcessos] = useState<TfdProcesso[]>([])
  const [carregandoProcessos, setCarregandoProcessos] = useState<boolean>(false)

  // Detalhe de Processo Selecionado
  const [processoSelecionado, setProcessoSelecionado] = useState<TfdProcesso | null>(null)
  const [historicoEstados, setHistoricoEstados] = useState<TfdHistoricoEstado[]>([])
  const [viagensVinculadas, setViagensVinculadas] = useState<any[]>([])
  const [carregandoDetalhe, setCarregandoDetalhe] = useState<boolean>(false)

  // Catálogos de apoio
  const [pacientesCadastrados, setPacientesCadastrados] = useState<Paciente[]>([])
  const [profissionaisCadastrados, setProfissionaisCadastrados] = useState<Profissional[]>([])
  const [veiculosDisponiveis, setVeiculosDisponiveis] = useState<TransporteVeiculo[]>([])
  const [motoristasDisponiveis, setMotoristasDisponiveis] = useState<TransporteMotorista[]>([])

  // Formulário de Criação de Processo (sem perder texto em erro)
  const [formNovoPaciente, setFormNovoPaciente] = useState<Paciente | null>(null)
  const [formNovoProfissionalId, setFormNovoProfissionalId] = useState<string>('')
  const [formNovoCid10, setFormNovoCid10] = useState<string>('')
  const [formNovoTratamento, setFormNovoTratamento] = useState<string>('')
  const [formNovoTipoAtendimento, setFormNovoTipoAtendimento] =
    useState<TipoAtendimentoTFD>('consulta_especializada')
  const [formNovoJustificativa, setFormNovoJustificativa] = useState<string>('')
  const [formNovoMunicipioDestino, setFormNovoMunicipioDestino] = useState<string>('Porto Velho')
  const [formNovoEstabelecimentoDestino, setFormNovoEstabelecimentoDestino] = useState<string>('')
  const [formNovoTipoTransporte, setFormNovoTipoTransporte] = useState<string>(
    'Veículo Sanitário Convencional',
  )
  const [formNovoExigeAcompanhante, setFormNovoExigeAcompanhante] = useState<boolean>(false)
  const [formNovoJustificativaAcompanhante, setFormNovoJustificativaAcompanhante] =
    useState<string>('')
  const [formNovoObservacoes, setFormNovoObservacoes] = useState<string>('')
  const [chaveIdempotenciaNovo, setChaveIdempotenciaNovo] = useState<string>('')
  const [salvandoNovoProcesso, setSalvandoNovoProcesso] = useState<boolean>(false)
  const [erroCriacao, setErroCriacao] = useState<string | null>(null)

  // Refs de controle de sequência contra respostas em voo (padrão de sequência)
  const seqPacienteRef = useRef<number>(0)
  const seqListaProcessosRef = useRef<number>(0)

  // Modal de Transição de Estado
  const [dialogTransicaoAberto, setDialogTransicaoAberto] = useState<boolean>(false)
  const [transicaoNovoStatus, setTransicaoNovoStatus] = useState<StatusProcessoTFD>('autorizado')
  const [transicaoMotivo, setTransicaoMotivo] = useState<string>('')
  const [transicaoObservacoes, setTransicaoObservacoes] = useState<string>('')
  const [transitandoEstado, setTransitandoEstado] = useState<boolean>(false)
  const [erroTransicao, setErroTransicao] = useState<string | null>(null)

  // Modal de Renovação
  const [dialogRenovacaoAberto, setDialogRenovacaoAberto] = useState<boolean>(false)
  const [renovacaoMotivo, setRenovacaoMotivo] = useState<string>('')
  const [renovacaoNovoTratamento, setRenovacaoNovoTratamento] = useState<string>('')
  const [renovacaoNovaJustificativa, setRenovacaoNovaJustificativa] = useState<string>('')
  const [chaveIdempotenciaRenovacao, setChaveIdempotenciaRenovacao] = useState<string>('')
  const [renovandoProcesso, setRenovandoProcesso] = useState<boolean>(false)
  const [erroRenovacao, setErroRenovacao] = useState<string | null>(null)

  // Modal de Criação de Viagem Direta vinculada
  const [dialogCriarViagemAberto, setDialogCriarViagemAberto] = useState<boolean>(false)
  const [viagemDiretaSaida, setViagemDiretaSaida] = useState<string>('')
  const [viagemDiretaRetorno, setViagemDiretaRetorno] = useState<string>('')
  const [viagemDiretaVeiculoId, setViagemDiretaVeiculoId] = useState<string>('')
  const [viagemDiretaMotoristaId, setViagemDiretaMotoristaId] = useState<string>('')
  const [viagemDiretaDestinoCidade, setViagemDiretaDestinoCidade] = useState<string>('')
  const [viagemDiretaDestinoLocal, setViagemDiretaDestinoLocal] = useState<string>('')
  const [criandoViagemDireta, setCriandoViagemDireta] = useState<boolean>(false)
  const [erroViagemDireta, setErroViagemDireta] = useState<string | null>(null)

  // Planejamento de LOTE de Viagens
  const [loteProcessoAlvo, setLoteProcessoAlvo] = useState<TfdProcesso | null>(null)
  const [itensLoteInput, setItensLoteInput] = useState<
    Array<{
      idTemp: string
      item_idempotency_key: string
      data_saida: string
      data_retorno_previsto: string
      veiculo_id: string
      motorista_id: string
      cidade_destino: string
      local_destino: string
    }>
  >([])
  const [chaveIdempotenciaLote, setChaveIdempotenciaLote] = useState<string>('')
  const [previaLoteResultado, setPreviaLoteResultado] = useState<PreviaViagemLoteResultado | null>(
    null,
  )
  const [resultadoConfirmacaoLote, setResultadoConfirmacaoLote] =
    useState<ConfirmarViagemLoteResultado | null>(null)
  const [gerandoPreviaLote, setGerandoPreviaLote] = useState<boolean>(false)
  const [confirmandoLote, setConfirmandoLote] = useState<boolean>(false)
  const [erroLote, setErroLote] = useState<string | null>(null)

  // Painel Agregado por Localidade
  const [agregadosLocalidade, setAgregadosLocalidade] = useState<AgregadoLocalidadeTfd[]>([])
  const [filtroAgregadoLocalidade, setFiltroAgregadoLocalidade] = useState<string>('')
  const [carregandoAgregados, setCarregandoAgregados] = useState<boolean>(false)

  // 1. Carga inicial de catálogos
  useEffect(() => {
    carregarCatalogosApoio()
  }, [])

  // 2. Consulta paginada/filtrada com cancelamento seguro
  useEffect(() => {
    carregarListaProcessos()
  }, [filtroStatus, filtroDataInicio, filtroDataFim, paginaAtual])

  const carregarCatalogosApoio = async () => {
    try {
      const [pacs, profs, veics, mots] = await Promise.all([
        listarPacientes(),
        listarProfissionais(),
        listarVeiculos(true),
        listarMotoristas(true),
      ])
      setPacientesCadastrados(pacs)
      setProfissionaisCadastrados(profs)
      setVeiculosDisponiveis(veics.filter((v) => v.status === 'disponivel'))
      setMotoristasDisponiveis(mots)
    } catch (err) {
      console.warn('Erro ao carregar catálogos auxiliares TFD:', err)
    }
  }

  const carregarListaProcessos = async () => {
    seqListaProcessosRef.current += 1
    const seqMomento = seqListaProcessosRef.current

    setCarregandoProcessos(true)
    try {
      const res = await listarProcessosTfd({
        status: (filtroStatus as StatusProcessoTFD) || 'todos',
        busca: filtroBusca.trim() || undefined,
        dataInicio: filtroDataInicio || undefined,
        dataFim: filtroDataFim || undefined,
        page: paginaAtual,
        perPage: 10,
      })

      // Se nova busca começou em voo, descarta resultado obsoleto
      if (seqMomento !== seqListaProcessosRef.current) return

      setProcessos(res.items || [])
      setTotalPaginas(res.totalPages || 1)
      setTotalItens(res.totalItems || 0)
      setIsolamentoAplicado(Boolean(res.isolamento_clinico_aplicado))
    } catch (err: any) {
      if (seqMomento !== seqListaProcessosRef.current) return
      toast({
        title: 'Erro ao consultar processos TFD',
        description: err.message || 'Falha de comunicação com o servidor.',
        variant: 'destructive',
      })
    } finally {
      if (seqMomento === seqListaProcessosRef.current) {
        setCarregandoProcessos(false)
      }
    }
  }

  const handleBuscarTexto = (e: React.FormEvent) => {
    e.preventDefault()
    setPaginaAtual(1)
    carregarListaProcessos()
  }

  // Carregar detalhe completo do processo selecionado
  const handleSelecionarProcesso = async (processo: TfdProcesso) => {
    setCarregandoDetalhe(true)
    setProcessoSelecionado(processo)
    setTabAtiva('detalhes')
    try {
      const [procAtualizado, hist, viags] = await Promise.all([
        obterProcessoTfdPorId(processo.id),
        listarHistoricoEstadosTfd(processo.id),
        listarViagensDoProcessoTfd(processo.id),
      ])
      setProcessoSelecionado(procAtualizado)
      setHistoricoEstados(hist)
      setViagensVinculadas(viags)
    } catch (err: any) {
      toast({
        title: 'Aviso ao carregar detalhe',
        description: err.message || 'Não foi possível buscar os dados detalhados.',
        variant: 'destructive',
      })
    } finally {
      setCarregandoDetalhe(false)
    }
  }

  // Troca de paciente no formulário de criação com descarte de voo
  const handleTrocarPacienteNovo = (pac: Paciente | null) => {
    seqPacienteRef.current += 1
    const seqMomento = seqPacienteRef.current

    setFormNovoPaciente(pac)
    setErroCriacao(null)

    if (!pac) {
      return
    }

    // Gera chave de idempotência atrelada ao paciente selecionado
    const novaChave = `tfd_novo_${pac.id}_${Date.now()}`
    setChaveIdempotenciaNovo(novaChave)

    // Se houver qualquer processamento assíncrono vinculado ao paciente, validação pelo ref seqMomento
    if (seqMomento !== seqPacienteRef.current) {
      return
    }
  }

  // Criar Processo TFD (sem perder texto digitado em caso de erro)
  const handleSubmeterCriacaoProcesso = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!podeCriarProcesso) {
      toast({
        title: 'Acesso Negado',
        description: 'Perfil de recepção não possui permissão para abrir processos de TFD.',
        variant: 'destructive',
      })
      return
    }

    if (!formNovoPaciente) {
      setErroCriacao('Selecione o paciente titular do processo.')
      return
    }
    if (!formNovoProfissionalId) {
      setErroCriacao('Selecione o profissional médico/assistencial responsável.')
      return
    }
    if (!formNovoCid10.trim() || formNovoCid10.trim().length < 2) {
      setErroCriacao('O código CID-10 é obrigatório.')
      return
    }
    if (!formNovoTratamento.trim()) {
      setErroCriacao('Informe o tratamento ou procedimento solicitado.')
      return
    }
    if (!formNovoJustificativa.trim() || formNovoJustificativa.trim().length < 5) {
      setErroCriacao('A justificativa clínica fundamentada é obrigatória (mínimo 5 caracteres).')
      return
    }

    setSalvandoNovoProcesso(true)
    setErroCriacao(null)

    const chave = chaveIdempotenciaNovo || `tfd_abertura_${formNovoPaciente.id}_${Date.now()}`
    if (!chaveIdempotenciaNovo) {
      setChaveIdempotenciaNovo(chave)
    }

    const params: CriarProcessoTfdParams = {
      paciente: formNovoPaciente.id,
      profissional_responsavel: formNovoProfissionalId,
      cid10: formNovoCid10.trim().toUpperCase(),
      tratamento_solicitado: formNovoTratamento.trim(),
      tipo_atendimento: formNovoTipoAtendimento,
      justificativa_clinica: formNovoJustificativa.trim(),
      status: 'inconcluso', // Estado inicial conforme requisito
      motivo_situacao: 'Abertura formal de processo TFD pelo solicitante.',
      observacoes_gerais: formNovoObservacoes.trim(),
      municipio_destino: formNovoMunicipioDestino.trim(),
      estabelecimento_destino: formNovoEstabelecimentoDestino.trim(),
      tipo_transporte_recomendado: formNovoTipoTransporte.trim(),
      exige_acompanhante: formNovoExigeAcompanhante,
      justificativa_acompanhante: formNovoJustificativaAcompanhante.trim(),
      idempotency_key: chave,
    }

    try {
      const novoProc = await criarProcessoTfd(params)
      toast({
        title: 'Processo TFD Aberto com Sucesso',
        description: `Número interno: ${novoProc.numero_processo}. Status inicial: Inconcluso.`,
      })

      // Limpa dados de formulário apenas em caso de sucesso
      setFormNovoPaciente(null)
      setFormNovoCid10('')
      setFormNovoTratamento('')
      setFormNovoJustificativa('')
      setFormNovoObservacoes('')
      setFormNovoJustificativaAcompanhante('')
      setChaveIdempotenciaNovo('')

      // Redireciona e atualiza lista
      await carregarListaProcessos()
      await handleSelecionarProcesso(novoProc)
    } catch (err: any) {
      // Erro: texto digitado permanece preservado nas variáveis de estado!
      const msg = err.message || 'Falha ao registrar abertura de processo TFD.'
      setErroCriacao(`${msg} (Seus dados foram mantidos no formulário para correção ou reenvio).`)
      toast({
        title: 'Falha no cadastro',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSalvandoNovoProcesso(false)
    }
  }

  // Transição de Estado
  const handleAbrirTransicaoEstado = (statusDestino: StatusProcessoTFD) => {
    if (!podeGerenciarEstados) {
      toast({
        title: 'Permissão Insuficiente',
        description: 'Perfil de recepção não possui autorização para transitar estados de TFD.',
        variant: 'destructive',
      })
      return
    }
    setTransicaoNovoStatus(statusDestino)
    setTransicaoMotivo('')
    setTransicaoObservacoes('')
    setErroTransicao(null)
    setDialogTransicaoAberto(true)
  }

  const handleConfirmarTransicaoEstado = async () => {
    if (!processoSelecionado) return

    const validacaoPrevia = validarTransicaoEstadoTfd(
      processoSelecionado.status,
      transicaoNovoStatus,
      transicaoMotivo,
      user?.role,
    )

    if (!validacaoPrevia.valido) {
      setErroTransicao(validacaoPrevia.erro || 'Transição inválida.')
      return
    }

    setTransitandoEstado(true)
    setErroTransicao(null)

    try {
      await transitarEstadoTfd({
        processo_id: processoSelecionado.id,
        novo_status: transicaoNovoStatus,
        motivo_justificativa: transicaoMotivo.trim(),
        observacoes: transicaoObservacoes.trim(),
      })

      toast({
        title: 'Estado Transicionado',
        description: `O processo foi atualizado para "${transicaoNovoStatus}".`,
      })

      setDialogTransicaoAberto(false)
      // Recarrega detalhe e histórico
      await handleSelecionarProcesso(processoSelecionado)
      await carregarListaProcessos()
    } catch (err: any) {
      setErroTransicao(err.message || 'Falha ao aplicar transição de estado.')
    } finally {
      setTransitandoEstado(false)
    }
  }

  // Renovação de Processo
  const handleAbrirRenovacao = () => {
    if (!processoSelecionado) return
    if (processoSelecionado.status === 'cancelado') {
      toast({
        title: 'Operação Não Permitida',
        description: 'Processos de TFD cancelados não podem ser renovados.',
        variant: 'destructive',
      })
      return
    }

    setRenovacaoMotivo('')
    setRenovacaoNovoTratamento(processoSelecionado.tratamento_solicitado)
    setRenovacaoNovaJustificativa(processoSelecionado.justificativa_clinica)
    setChaveIdempotenciaRenovacao(`renov_${processoSelecionado.id}_${Date.now()}`)
    setErroRenovacao(null)
    setDialogRenovacaoAberto(true)
  }

  const handleConfirmarRenovacao = async () => {
    if (!processoSelecionado) return

    if (!renovacaoMotivo.trim() || renovacaoMotivo.trim().length < 5) {
      setErroRenovacao('O motivo da renovação exige no mínimo 5 caracteres explicativos.')
      return
    }

    setRenovandoProcesso(true)
    setErroRenovacao(null)

    try {
      const res = await renovarProcessoTfd({
        processo_original_id: processoSelecionado.id,
        motivo_renovacao: renovacaoMotivo.trim(),
        tratamento_solicitado: renovacaoNovoTratamento.trim() || undefined,
        justificativa_clinica: renovacaoNovaJustificativa.trim() || undefined,
        idempotency_key: chaveIdempotenciaRenovacao,
      })

      toast({
        title: 'Processo Renovado com Sucesso',
        description: `Novo processo criado: ${res.novo_numero_processo} vinculado ao original ${processoSelecionado.numero_processo}.`,
      })

      setDialogRenovacaoAberto(false)
      await carregarListaProcessos()

      // Carrega o novo processo criado
      const novoCarregado = await obterProcessoTfdPorId(res.novo_processo_id)
      await handleSelecionarProcesso(novoCarregado)
    } catch (err: any) {
      setErroRenovacao(err.message || 'Falha ao renovar processo TFD.')
    } finally {
      setRenovandoProcesso(false)
    }
  }

  // Criação de Viagem Direta vinculada ao Processo (com coerência de paciente)
  const handleAbrirCriarViagemDireta = () => {
    if (!processoSelecionado) return
    setViagemDiretaSaida(new Date().toISOString().substring(0, 16))
    // Retorno estimado 8 horas depois
    const dtRet = new Date(Date.now() + 8 * 3600 * 1000)
    setViagemDiretaRetorno(dtRet.toISOString().substring(0, 16))
    setViagemDiretaVeiculoId(veiculosDisponiveis[0]?.id || '')
    setViagemDiretaMotoristaId(motoristasDisponiveis[0]?.id || '')
    setViagemDiretaDestinoCidade(processoSelecionado.municipio_destino || 'Porto Velho')
    setViagemDiretaDestinoLocal(processoSelecionado.estabelecimento_destino || '')
    setErroViagemDireta(null)
    setDialogCriarViagemAberto(true)
  }

  const handleConfirmarCriarViagemDireta = async () => {
    if (!processoSelecionado) return

    if (!viagemDiretaVeiculoId || !viagemDiretaMotoristaId) {
      setErroViagemDireta('Selecione veículo e motorista disponíveis.')
      return
    }

    setCriandoViagemDireta(true)
    setErroViagemDireta(null)

    try {
      // Cria a viagem através do fluxo lote com 1 item (que já implementa todas as validações atômicas de agenda e vínculo de paciente)
      const chaveItem = `via_dir_${processoSelecionado.id}_${Date.now()}`
      const chaveLote = `lote_dir_${processoSelecionado.id}_${Date.now()}`

      const itemInput: ItemViagemLoteInput = {
        item_idempotency_key: chaveItem,
        data_saida: new Date(viagemDiretaSaida).toISOString(),
        data_retorno_previsto: new Date(viagemDiretaRetorno).toISOString(),
        veiculo_id: viagemDiretaVeiculoId,
        motorista_id: viagemDiretaMotoristaId,
        cidade_destino: viagemDiretaDestinoCidade.trim(),
        local_destino: viagemDiretaDestinoLocal.trim(),
      }

      // Confirmação atômica com vínculo de paciente titular verificado no backend
      const res = await confirmarViagensLoteTfd({
        processo_id: processoSelecionado.id,
        lote_idempotency_key: chaveLote,
        confirmado: true,
        itens: [itemInput],
      })

      if (res.itens_conflito_total && res.itens_conflito_total > 0) {
        const c = res.conflitos?.[0]
        throw new Error(c?.motivo_conflito || 'Conflito de agenda ou veículo indisponível.')
      }

      toast({
        title: 'Viagem Programada e Vinculada',
        description: `Viagem vinculada ao processo ${processoSelecionado.numero_processo} com reserva para o paciente titular.`,
      })

      setDialogCriarViagemAberto(false)
      const viags = await listarViagensDoProcessoTfd(processoSelecionado.id)
      setViagensVinculadas(viags)
    } catch (err: any) {
      setErroViagemDireta(err.message || 'Falha ao programar viagem vinculada.')
    } finally {
      setCriandoViagemDireta(false)
    }
  }

  // LOTE DE VIAGENS: Iniciar planejamento
  const handleIniciarLoteParaProcesso = (proc: TfdProcesso) => {
    setLoteProcessoAlvo(proc)
    setItensLoteInput([])
    setPreviaLoteResultado(null)
    setResultadoConfirmacaoLote(null)
    setChaveIdempotenciaLote(`lote_tfd_${proc.id}_${Date.now()}`)
    setErroLote(null)
    setTabAtiva('lote_viagens')
  }

  const handleAdicionarItemAoLote = () => {
    if (!loteProcessoAlvo) return
    const agora = new Date()
    const proximoDia = new Date(agora.getTime() + (itensLoteInput.length + 1) * 86400 * 1000)
    proximoDia.setHours(6, 0, 0, 0)
    const retorno = new Date(proximoDia.getTime() + 12 * 3600 * 1000)

    const novoItem = {
      idTemp: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      item_idempotency_key: `item_lote_${loteProcessoAlvo.id}_${itensLoteInput.length + 1}_${Date.now()}`,
      data_saida: proximoDia.toISOString().substring(0, 16),
      data_retorno_previsto: retorno.toISOString().substring(0, 16),
      veiculo_id: veiculosDisponiveis[0]?.id || '',
      motorista_id: motoristasDisponiveis[0]?.id || '',
      cidade_destino: loteProcessoAlvo.municipio_destino || 'Porto Velho',
      local_destino: loteProcessoAlvo.estabelecimento_destino || '',
    }

    setItensLoteInput([...itensLoteInput, novoItem])
    // Se havia prévia gerada, invalida pois o lote mudou
    setPreviaLoteResultado(null)
  }

  const handleRemoverItemDoLote = (index: number) => {
    const novos = itensLoteInput.filter((_, i) => i !== index)
    setItensLoteInput(novos)
    setPreviaLoteResultado(null)
  }

  const handleAtualizarItemLote = (index: number, campo: string, valor: string) => {
    const novos = [...itensLoteInput]
    novos[index] = { ...novos[index], [campo]: valor }
    setItensLoteInput(novos)
    setPreviaLoteResultado(null)
  }

  // Gerar Prévia do Lote para Revisão Humana (SEM GRAVAÇÃO FÍSICA)
  const handleGerarPreviaLote = async () => {
    if (!loteProcessoAlvo) return
    if (itensLoteInput.length === 0) {
      setErroLote('Adicione ao menos 1 item de viagem ao lote.')
      return
    }

    setGerandoPreviaLote(true)
    setErroLote(null)
    setResultadoConfirmacaoLote(null)

    try {
      const payloadItens: ItemViagemLoteInput[] = itensLoteInput.map((it) => ({
        item_idempotency_key: it.item_idempotency_key,
        data_saida: new Date(it.data_saida).toISOString(),
        data_retorno_previsto: new Date(it.data_retorno_previsto).toISOString(),
        veiculo_id: it.veiculo_id,
        motorista_id: it.motorista_id,
        cidade_destino: it.cidade_destino,
        local_destino: it.local_destino,
      }))

      const previa = await obterPreviaViagensLoteTfd(loteProcessoAlvo.id, payloadItens)
      setPreviaLoteResultado(previa)

      toast({
        title: 'Prévia do Lote Gerada',
        description: `Revisão humana: ${previa.total_aptos} viagem(ns) apta(s) e ${previa.total_conflitos} conflito(s). Nenhuma viagem gravada ainda.`,
      })
    } catch (err: any) {
      setErroLote(err.message || 'Falha ao simular prévia do lote.')
    } finally {
      setGerandoPreviaLote(false)
    }
  }

  // Confirmação Explícita do Lote pelo Usuário
  const handleConfirmarGravacaoLote = async () => {
    if (!loteProcessoAlvo || !previaLoteResultado) return

    setConfirmandoLote(true)
    setErroLote(null)

    try {
      const payloadItens: ItemViagemLoteInput[] = itensLoteInput.map((it) => ({
        item_idempotency_key: it.item_idempotency_key,
        data_saida: new Date(it.data_saida).toISOString(),
        data_retorno_previsto: new Date(it.data_retorno_previsto).toISOString(),
        veiculo_id: it.veiculo_id,
        motorista_id: it.motorista_id,
        cidade_destino: it.cidade_destino,
        local_destino: it.local_destino,
      }))

      const resultado = await confirmarViagensLoteTfd({
        processo_id: loteProcessoAlvo.id,
        lote_idempotency_key: chaveIdempotenciaLote,
        confirmado: true,
        itens: payloadItens,
      })

      setResultadoConfirmacaoLote(resultado)

      toast({
        title: 'Lote Confirmado',
        description: `Lote ${resultado.lote_codigo} processado. Criados: ${resultado.itens_criados_total}, Conflitos: ${resultado.itens_conflito_total}.`,
      })
    } catch (err: any) {
      setErroLote(err.message || 'Falha ao confirmar gravação do lote de viagens.')
    } finally {
      setConfirmandoLote(false)
    }
  }

  // Carregar Painel Agregado por Localidade (SEM MAPAS / SEM GEORREFERENCIAMENTO)
  const handleCarregarPainelAgregado = async () => {
    setCarregandoAgregados(true)
    try {
      const dados = await obterTotaisAgregadosPorLocalidade()
      setAgregadosLocalidade(dados)
    } catch (err) {
      console.warn('Erro ao carregar agregados por localidade:', err)
    } finally {
      setCarregandoAgregados(false)
    }
  }

  useEffect(() => {
    if (tabAtiva === 'painel_agregado') {
      handleCarregarPainelAgregado()
    }
  }, [tabAtiva])

  // Badge visual de Status do Processo TFD
  const renderBadgeStatus = (status: StatusProcessoTFD) => {
    switch (status) {
      case 'autorizado':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Autorizado
          </Badge>
        )
      case 'enviado_para_estado':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1">
            <Send className="w-3 h-3 text-blue-600" /> Enviado para Estado
          </Badge>
        )
      case 'negado':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" /> Negado
          </Badge>
        )
      case 'cancelado':
        return (
          <Badge className="bg-slate-200 text-slate-700 border-slate-300 flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-500" /> Cancelado (Imutável)
          </Badge>
        )
      case 'inconcluso':
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" /> Inconcluso
          </Badge>
        )
    }
  }

  const renderNomePaciente = (pId: string) => {
    const pac = pacientesCadastrados.find((p) => p.id === pId)
    if (!pac) return `Paciente ${pId.substring(0, 8)}`
    return `${pac.nome} (CNS: ${mascararCNS(pac.cartao_sus)})`
  }

  const renderNomeProfissional = (profId: string) => {
    const prof = profissionaisCadastrados.find((p) => p.id === profId)
    if (!prof) return `Profissional ${profId.substring(0, 8)}`
    return `${prof.nome} (${prof.especialidade || prof.categoria || 'Responsável'})`
  }

  // Filtragem dos agregados por município
  const agregadosFiltrados = agregadosLocalidade.filter((item) =>
    item.municipio.toLowerCase().includes(filtroAgregadoLocalidade.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO MÓDULO */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Tratamento Fora do Domicílio (TFD)
                </h1>
                <Badge
                  variant="outline"
                  className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                >
                  Seção 7.4.4.2.e
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Processos formais de TFD, auditoria de estados com motivo obrigatório, viagens
                vinculadas e lote
              </p>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg flex-wrap">
          <Button
            variant={tabAtiva === 'processos' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTabAtiva('processos')}
            className={`text-xs h-8 ${tabAtiva === 'processos' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'}`}
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Processos ({totalItens})
          </Button>

          {processoSelecionado && (
            <Button
              variant={tabAtiva === 'detalhes' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTabAtiva('detalhes')}
              className={`text-xs h-8 ${tabAtiva === 'detalhes' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'}`}
            >
              <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Detalhes ({processoSelecionado.numero_processo})
            </Button>
          )}

          {podeCriarProcesso && (
            <Button
              variant={tabAtiva === 'novo_processo' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setChaveIdempotenciaNovo(`tfd_abertura_${Date.now()}`)
                setTabAtiva('novo_processo')
              }}
              className={`text-xs h-8 ${tabAtiva === 'novo_processo' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'}`}
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Novo Processo
            </Button>
          )}

          <Button
            variant={tabAtiva === 'lote_viagens' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              if (!loteProcessoAlvo && processos.length > 0) {
                setLoteProcessoAlvo(processos[0])
              }
              setTabAtiva('lote_viagens')
            }}
            className={`text-xs h-8 ${tabAtiva === 'lote_viagens' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'}`}
          >
            <Layers className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
            Viagens em Lote
          </Button>

          <Button
            variant={tabAtiva === 'painel_agregado' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTabAtiva('painel_agregado')}
            className={`text-xs h-8 ${tabAtiva === 'painel_agregado' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'}`}
          >
            <Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-700" />
            Totais por Localidade
          </Button>
        </div>
      </div>

      {/* AVISO DE ISOLAMENTO CLÍNICO QUANDO PERFIL É RECEPÇÃO */}
      {ehRecepcao && (
        <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-lg flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Perfil Recepção / Administrativo:</strong> Em cumprimento à Seção 7.4.4.2.e e
              à LGPD clínica, dados médicos confidenciais (CID-10, justificativa clínica detalhada e
              justificativa de acompanhante) estão restritos aos profissionais de saúde e gestores.
            </span>
          </div>
          <Badge variant="outline" className="bg-white text-amber-800 border-amber-300">
            Isolamento Clínico Ativo
          </Badge>
        </div>
      )}

      {/* ABA 1: LISTAGEM DE PROCESSOS TFD */}
      {tabAtiva === 'processos' && (
        <div className="space-y-4">
          {/* BARRA DE FILTROS */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <form
              onSubmit={handleBuscarTexto}
              className="flex flex-col md:flex-row gap-3 items-end"
            >
              <div className="flex-1 space-y-1 w-full">
                <Label className="text-xs font-semibold text-slate-700">Busca Rápida</Label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Buscar por número interno, tratamento ou município de destino..."
                    value={filtroBusca}
                    onChange={(e) => setFiltroBusca(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>
              </div>

              <div className="w-full md:w-48 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Status do Processo</Label>
                <Select
                  value={filtroStatus}
                  onValueChange={(val) => {
                    setFiltroStatus(val)
                    setPaginaAtual(1)
                  }}
                >
                  <SelectTrigger className="text-xs h-9 bg-white">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="inconcluso">Inconcluso</SelectItem>
                    <SelectItem value="autorizado">Autorizado</SelectItem>
                    <SelectItem value="enviado_para_estado">Enviado para Estado</SelectItem>
                    <SelectItem value="negado">Negado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-36 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Abertura (Início)</Label>
                <Input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => {
                    setFiltroDataInicio(e.target.value)
                    setPaginaAtual(1)
                  }}
                  className="text-xs h-9"
                />
              </div>

              <div className="w-full md:w-36 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Abertura (Fim)</Label>
                <Input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => {
                    setFiltroDataFim(e.target.value)
                    setPaginaAtual(1)
                  }}
                  className="text-xs h-9"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 px-4 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  <Filter className="w-3.5 h-3.5 mr-1" /> Filtrar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiltroBusca('')
                    setFiltroStatus('todos')
                    setFiltroDataInicio('')
                    setFiltroDataFim('')
                    setPaginaAtual(1)
                  }}
                  className="h-9 px-3 text-xs"
                >
                  Limpar
                </Button>
              </div>
            </form>
          </div>

          {/* TABELA DE PROCESSOS */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="text-xs font-semibold text-slate-700">
                Processos Cadastrados ({totalItens} no total)
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={carregarListaProcessos}
                disabled={carregandoProcessos}
                className="text-xs h-7 text-slate-600"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 mr-1 ${carregandoProcessos ? 'animate-spin' : ''}`}
                />
                Atualizar
              </Button>
            </div>

            {carregandoProcessos ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                Carregando processos de TFD...
              </div>
            ) : processos.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                Nenhum processo de TFD localizado com os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Número Interno</th>
                      <th className="py-2.5 px-4">Abertura</th>
                      <th className="py-2.5 px-4">Paciente Titular</th>
                      <th className="py-2.5 px-4">Tratamento / Destino</th>
                      <th className="py-2.5 px-4">CID-10</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processos.map((proc) => (
                      <tr key={proc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-blue-700">
                          {proc.numero_processo}
                          {proc.is_renovacao && (
                            <Badge
                              variant="outline"
                              className="ml-1.5 text-[9px] bg-purple-50 text-purple-700 border-purple-200"
                            >
                              Renovação
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{proc.data_abertura}</td>
                        <td className="py-3 px-4 text-slate-900 font-medium">
                          {renderNomePaciente(proc.paciente)}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <div className="font-medium truncate max-w-xs">
                            {proc.tratamento_solicitado}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {proc.municipio_destino || 'Destino não inf.'}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {proc.cid10 === '[DADO CLÍNICO RESTRITO]' ? (
                            <span className="text-amber-700 text-[11px] font-sans italic flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Restrito
                            </span>
                          ) : (
                            proc.cid10
                          )}
                        </td>
                        <td className="py-3 px-4">{renderBadgeStatus(proc.status)}</td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelecionarProcesso(proc)}
                            className="h-7 text-xs px-2.5 border-slate-300"
                          >
                            Ver Detalhes
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleIniciarLoteParaProcesso(proc)}
                            className="h-7 text-xs px-2 text-purple-700 hover:bg-purple-50"
                            title="Planejar viagens em lote para este processo"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINAÇÃO */}
            <div className="p-3 border-t border-slate-200 flex items-center justify-between bg-slate-50 text-xs text-slate-600">
              <div>
                Página {paginaAtual} de {totalPaginas} ({totalItens} registros)
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  disabled={paginaAtual <= 1 || carregandoProcessos}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual >= totalPaginas || carregandoProcessos}
                  className="h-7 px-2"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: DETALHES DO PROCESSO SELECIONADO & HISTÓRICO AUDITÁVEL */}
      {tabAtiva === 'detalhes' && processoSelecionado && (
        <div className="space-y-6">
          {/* CABEÇALHO DO PROCESSO */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900 font-mono">
                  {processoSelecionado.numero_processo}
                </span>
                {renderBadgeStatus(processoSelecionado.status)}
                {processoSelecionado.is_renovacao && (
                  <Badge
                    variant="outline"
                    className="bg-purple-50 text-purple-700 border-purple-200 text-xs"
                  >
                    Renovação Formal
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Aberto em {processoSelecionado.data_abertura} • Paciente:{' '}
                {renderNomePaciente(processoSelecionado.paciente)}
              </p>
            </div>

            {/* AÇÕES DE ESTADO CONFORME PERMISSOES */}
            <div className="flex items-center gap-2 flex-wrap">
              {podeGerenciarEstados && processoSelecionado.status !== 'cancelado' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAbrirTransicaoEstado('autorizado')}
                    className="h-8 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Autorizar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAbrirTransicaoEstado('enviado_para_estado')}
                    className="h-8 text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" /> Enviar ao Estado
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAbrirTransicaoEstado('negado')}
                    className="h-8 text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Negar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAbrirTransicaoEstado('cancelado')}
                    className="h-8 text-xs text-slate-700 border-slate-300 hover:bg-slate-100"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1 text-slate-500" /> Cancelar Processo
                  </Button>
                </>
              )}

              {/* Ação de Renovação: só permitida se não cancelado */}
              {podeGerenciarEstados && processoSelecionado.status !== 'cancelado' && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleAbrirRenovacao}
                  className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Renovar Processo
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={handleAbrirCriarViagemDireta}
                className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" /> Nova Viagem
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleIniciarLoteParaProcesso(processoSelecionado)}
                className="h-8 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Layers className="w-3.5 h-3.5 mr-1" /> Lote de Viagens
              </Button>
            </div>
          </div>

          {/* GRID COM DADOS CLÍNICOS E ADMINISTRATIVOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bloco 1: Dados do Atendimento e Destino */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3.5 text-xs">
              <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> Dados da Solicitação e Destino
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">Tipo de Atendimento</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {processoSelecionado.tipo_atendimento?.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Profissional Solicitante</span>
                  <span className="font-semibold text-slate-800">
                    {renderNomeProfissional(processoSelecionado.profissional_responsavel)}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block">Tratamento / Procedimento Solicitado</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {processoSelecionado.tratamento_solicitado}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">Município de Destino</span>
                  <span className="font-semibold text-slate-800">
                    {processoSelecionado.municipio_destino || 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Estabelecimento de Saúde de Destino</span>
                  <span className="font-semibold text-slate-800">
                    {processoSelecionado.estabelecimento_destino || 'Não informado'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">Transporte Recomendado</span>
                  <span className="font-semibold text-slate-800">
                    {processoSelecionado.tipo_transporte_recomendado || 'Não especificado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Exige Acompanhante?</span>
                  <span className="font-semibold text-slate-800">
                    {processoSelecionado.exige_acompanhante ? 'Sim' : 'Não'}
                  </span>
                </div>
              </div>

              {processoSelecionado.is_renovacao && processoSelecionado.processo_anterior_ref && (
                <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200 text-purple-900">
                  <span className="font-semibold block">Vínculo de Renovação:</span>
                  Este processo é originado da renovação formal do processo ID:{' '}
                  {processoSelecionado.processo_anterior_ref}.
                </div>
              )}
            </div>

            {/* Bloco 2: Justificativa Clínica e Diagnóstico (Isolamento da Recepção) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3.5 text-xs">
              <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-600" /> Diagnóstico e Justificativa
                  Clínica
                </span>
                {ehRecepcao && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-amber-50 text-amber-800 border-amber-300"
                  >
                    Restrito Recepção
                  </Badge>
                )}
              </h2>

              <div>
                <span className="text-slate-500 block">Diagnóstico Principal (CID-10)</span>
                {processoSelecionado.cid10 === '[DADO CLÍNICO RESTRITO]' ? (
                  <div className="p-2 bg-slate-100 rounded text-slate-500 italic flex items-center gap-1.5 font-mono">
                    <Lock className="w-3.5 h-3.5 text-amber-600" /> [DADO CLÍNICO RESTRITO AO PERFIL
                    ASSISTENCIAL]
                  </div>
                ) : (
                  <span className="font-mono text-sm font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                    {processoSelecionado.cid10}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block">Justificativa Clínica Fundamentada</span>
                {processoSelecionado.justificativa_clinica?.includes('RESTRITO') ? (
                  <div className="p-3 bg-slate-100 rounded text-slate-500 italic flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" /> [DADO CLÍNICO RESTRITO AO PERFIL
                    ASSISTENCIAL]
                  </div>
                ) : (
                  <p className="p-3 bg-slate-50 rounded border border-slate-100 text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {processoSelecionado.justificativa_clinica}
                  </p>
                )}
              </div>

              {processoSelecionado.exige_acompanhante && (
                <div>
                  <span className="text-slate-500 block">Justificativa do Acompanhante</span>
                  {processoSelecionado.justificativa_acompanhante?.includes('RESTRITO') ? (
                    <div className="p-2 bg-slate-100 rounded text-slate-500 italic flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" /> [DADO RESTRITO]
                    </div>
                  ) : (
                    <p className="p-2 bg-slate-50 rounded border border-slate-100 text-slate-700">
                      {processoSelecionado.justificativa_acompanhante ||
                        'Sem justificativa informada.'}
                    </p>
                  )}
                </div>
              )}

              <div>
                <span className="text-slate-500 block">Último Motivo / Situação</span>
                <p className="text-slate-700 italic">
                  "{processoSelecionado.motivo_situacao || 'Abertura inicial'}"
                </p>
              </div>
            </div>
          </div>

          {/* HISTÓRICO AUDITÁVEL DE ESTADOS (tfd_historico_estados) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600" /> Trilha Auditável e Permanente de
              Transições de Estado
            </h2>
            <p className="text-xs text-slate-500">
              Registros imutáveis com autor da sessão, carimbo de data/hora e justificativa
              obrigatória conforme auditoria SUS.
            </p>

            {historicoEstados.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
                Nenhuma transição de estado registrada além da abertura inicial.
              </div>
            ) : (
              <div className="space-y-3">
                {historicoEstados.map((h, idx) => (
                  <div
                    key={h.id || idx}
                    className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono">
                          {h.estado_anterior || 'abertura'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-900 uppercase">
                          {h.estado_novo}
                        </span>
                        {renderBadgeStatus(h.estado_novo)}
                      </div>
                      <div className="text-slate-500 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {h.data_hora ? new Date(h.data_hora).toLocaleString('pt-BR') : h.created}
                        </span>
                        <span>• Autor ID: {h.usuario_autor_id?.substring(0, 8)}</span>
                      </div>
                    </div>
                    <div className="text-slate-800 bg-white p-2.5 rounded border border-slate-200">
                      <strong>Motivo formal obrigatório:</strong> {h.motivo_justificativa}
                    </div>
                    {h.observacoes && (
                      <div className="text-slate-600 text-[11px]">
                        <strong>Observações:</strong> {h.observacoes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VIAGENS VINCULADAS AO PROCESSO */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Bus className="w-4 h-4 text-blue-600" /> Viagens Sanitárias Vinculadas (
                {viagensVinculadas.length})
              </h2>
              {onNavegarTransporte && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNavegarTransporte}
                  className="text-xs h-7 text-blue-600"
                >
                  Ir para Transporte Sanitário <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </div>

            {viagensVinculadas.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
                Nenhuma viagem vinculada a este processo de TFD até o momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Código Viagem</th>
                      <th className="py-2 px-3">Saída</th>
                      <th className="py-2 px-3">Retorno Previsto</th>
                      <th className="py-2 px-3">Destino</th>
                      <th className="py-2 px-3">Veículo / Motorista</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viagensVinculadas.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-medium text-blue-700">
                          {v.codigo_viagem}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {v.data_saida ? new Date(v.data_saida).toLocaleString('pt-BR') : ''}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {v.data_retorno_previsto
                            ? new Date(v.data_retorno_previsto).toLocaleString('pt-BR')
                            : ''}
                        </td>
                        <td className="py-2 px-3 text-slate-800">{v.cidade_destino}</td>
                        <td className="py-2 px-3 text-slate-600">
                          {v.expand?.veiculo?.placa || v.veiculo} •{' '}
                          {v.expand?.motorista?.nome || v.motorista}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {v.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: NOVO PROCESSO DE TFD (SEM PERDER TEXTO EM ERRO) */}
      {tabAtiva === 'novo_processo' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-600" /> Abertura de Novo Processo de TFD
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Registro formal com numeração interna sequencial, validação de paciente e
              justificativa fundamentada.
            </p>
          </div>

          {erroCriacao && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erroCriacao}</span>
            </div>
          )}

          <form onSubmit={handleSubmeterCriacaoProcesso} className="space-y-4">
            {/* SELETOR DE PACIENTE COM DESCARTE DE RESPOSTA EM VOO */}
            <div className="space-y-1">
              <SeletorPaciente
                label="Paciente Titular do Processo"
                obrigatorio
                pacienteInicial={formNovoPaciente}
                onSelecionar={handleTrocarPacienteNovo}
                idPrefix="tfd_novo_pac"
                placeholder="Busque por nome, CPF ou CNS..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Profissional Solicitante / Responsável <span className="text-rose-600">*</span>
                </Label>
                <Select value={formNovoProfissionalId} onValueChange={setFormNovoProfissionalId}>
                  <SelectTrigger className="text-xs h-9 bg-white">
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {profissionaisCadastrados.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.nome} ({prof.especialidade || prof.categoria || 'Profissional'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Tipo de Atendimento Solicitado <span className="text-rose-600">*</span>
                </Label>
                <Select
                  value={formNovoTipoAtendimento}
                  onValueChange={(val) => setFormNovoTipoAtendimento(val as TipoAtendimentoTFD)}
                >
                  <SelectTrigger className="text-xs h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consulta_especializada">Consulta Especializada</SelectItem>
                    <SelectItem value="exame_alta_complexidade">
                      Exame de Alta Complexidade
                    </SelectItem>
                    <SelectItem value="procedimento_cirurgico">Procedimento Cirúrgico</SelectItem>
                    <SelectItem value="tratamento_oncologico">Tratamento Oncológico</SelectItem>
                    <SelectItem value="terapia_renal_substitutiva">
                      Terapia Renal Substitutiva
                    </SelectItem>
                    <SelectItem value="urgencia_emergencia">Urgência / Emergência</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Código CID-10 <span className="text-rose-600">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: C50.9, I20.0"
                  value={formNovoCid10}
                  onChange={(e) => setFormNovoCid10(e.target.value)}
                  className="text-xs h-9 uppercase font-mono"
                  required
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">
                  Tratamento / Procedimento Solicitado <span className="text-rose-600">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: Quimioterapia de alta complexidade, cirurgia cardíaca..."
                  value={formNovoTratamento}
                  onChange={(e) => setFormNovoTratamento(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Justificativa Clínica Fundamentada <span className="text-rose-600">*</span>
              </Label>
              <Textarea
                placeholder="Descreva detalhadamente o quadro clínico, exames anexados e a indisponibilidade do procedimento no município de origem..."
                value={formNovoJustificativa}
                onChange={(e) => setFormNovoJustificativa(e.target.value)}
                rows={3}
                className="text-xs"
                required
              />
              <p className="text-[11px] text-slate-400">
                Mínimo de 5 caracteres. Protegida contra visualização por perfis de recepção.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Município de Destino</Label>
                <Input
                  type="text"
                  value={formNovoMunicipioDestino}
                  onChange={(e) => setFormNovoMunicipioDestino(e.target.value)}
                  className="text-xs h-9"
                  placeholder="Ex: Porto Velho, Cacoal"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Estabelecimento de Saúde de Destino
                </Label>
                <Input
                  type="text"
                  value={formNovoEstabelecimentoDestino}
                  onChange={(e) => setFormNovoEstabelecimentoDestino(e.target.value)}
                  className="text-xs h-9"
                  placeholder="Ex: Hospital de Base, Hospital do Câncer"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Transporte Recomendado
                </Label>
                <Input
                  type="text"
                  value={formNovoTipoTransporte}
                  onChange={(e) => setFormNovoTipoTransporte(e.target.value)}
                  className="text-xs h-9"
                  placeholder="Ex: Ambulância tipo B, Van Sanitária"
                />
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk_exige_acomp"
                  checked={formNovoExigeAcompanhante}
                  onChange={(e) => setFormNovoExigeAcompanhante(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <Label
                  htmlFor="chk_exige_acomp"
                  className="text-xs font-medium text-slate-800 cursor-pointer"
                >
                  Paciente necessita de acompanhante durante a viagem e o tratamento
                </Label>
              </div>

              {formNovoExigeAcompanhante && (
                <div className="space-y-1 pl-6">
                  <Label className="text-xs font-semibold text-slate-700">
                    Justificativa da Necessidade de Acompanhante
                  </Label>
                  <Input
                    type="text"
                    value={formNovoJustificativaAcompanhante}
                    onChange={(e) => setFormNovoJustificativaAcompanhante(e.target.value)}
                    placeholder="Ex: Paciente idoso com mobilidade reduzida, menor de idade..."
                    className="text-xs h-9 bg-white"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Observações Gerais</Label>
              <Input
                type="text"
                value={formNovoObservacoes}
                onChange={(e) => setFormNovoObservacoes(e.target.value)}
                placeholder="Informações adicionais de logística ou contato..."
                className="text-xs h-9"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTabAtiva('processos')}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoNovoProcesso}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-5"
              >
                {salvandoNovoProcesso ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Abrir Processo TFD
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ABA 4: VIAGENS EM LOTE COM PRÉVIA PARA REVISÃO HUMANA E CONFIRMAÇÃO EXPLÍCITA */}
      {tabAtiva === 'lote_viagens' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" /> Planejamento de Viagens em Lote (TFD)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Conferência prévia humana sem gravação + confirmação explícita com segregação de
                conflitos e idempotência.
              </p>
            </div>

            {/* SELEÇÃO DO PROCESSO ALVO DO LOTE */}
            <div className="w-full md:w-72">
              <Label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Processo TFD Selecionado
              </Label>
              <Select
                value={loteProcessoAlvo?.id || ''}
                onValueChange={(val) => {
                  const p = processos.find((item) => item.id === val)
                  if (p) setLoteProcessoAlvo(p)
                  setPreviaLoteResultado(null)
                  setResultadoConfirmacaoLote(null)
                }}
              >
                <SelectTrigger className="text-xs h-9 bg-white font-mono">
                  <SelectValue placeholder="Selecione um processo" />
                </SelectTrigger>
                <SelectContent>
                  {processos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.numero_processo} - {p.municipio_destino}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {erroLote && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erroLote}</span>
            </div>
          )}

          {loteProcessoAlvo && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 flex items-center justify-between">
              <div>
                <strong>Processo:</strong> {loteProcessoAlvo.numero_processo} •{' '}
                <strong>Titular:</strong> {renderNomePaciente(loteProcessoAlvo.paciente)} •{' '}
                <strong>Destino:</strong> {loteProcessoAlvo.municipio_destino}
              </div>
              <Badge variant="outline" className="bg-white text-purple-800 border-purple-300">
                {loteProcessoAlvo.status}
              </Badge>
            </div>
          )}

          {/* LISTA DE ITENS DO LOTE A PREPARAR */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Itens de Viagem do Lote ({itensLoteInput.length})
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAdicionarItemAoLote}
                className="text-xs h-8 border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Adicionar Viagem ao Lote
              </Button>
            </div>

            {itensLoteInput.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                Nenhuma viagem adicionada ao lote ainda. Clique em "Adicionar Viagem ao Lote" para
                compor a grade.
              </div>
            ) : (
              <div className="space-y-3">
                {itensLoteInput.map((it, idx) => (
                  <div
                    key={it.idTemp}
                    className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-3 items-end text-xs"
                  >
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Item #{idx + 1} Saída</Label>
                      <Input
                        type="datetime-local"
                        value={it.data_saida}
                        onChange={(e) => handleAtualizarItemLote(idx, 'data_saida', e.target.value)}
                        className="text-xs h-8 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Retorno Previsto</Label>
                      <Input
                        type="datetime-local"
                        value={it.data_retorno_previsto}
                        onChange={(e) =>
                          handleAtualizarItemLote(idx, 'data_retorno_previsto', e.target.value)
                        }
                        className="text-xs h-8 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Veículo</Label>
                      <Select
                        value={it.veiculo_id}
                        onValueChange={(val) => handleAtualizarItemLote(idx, 'veiculo_id', val)}
                      >
                        <SelectTrigger className="text-xs h-8 bg-white">
                          <SelectValue placeholder="Veículo" />
                        </SelectTrigger>
                        <SelectContent>
                          {veiculosDisponiveis.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.placa} ({v.descricao})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Motorista</Label>
                      <Select
                        value={it.motorista_id}
                        onValueChange={(val) => handleAtualizarItemLote(idx, 'motorista_id', val)}
                      >
                        <SelectTrigger className="text-xs h-8 bg-white">
                          <SelectValue placeholder="Motorista" />
                        </SelectTrigger>
                        <SelectContent>
                          {motoristasDisponiveis.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Cidade Destino</Label>
                      <Input
                        type="text"
                        value={it.cidade_destino}
                        onChange={(e) =>
                          handleAtualizarItemLote(idx, 'cidade_destino', e.target.value)
                        }
                        className="text-xs h-8 bg-white"
                      />
                    </div>

                    <div className="flex items-center justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoverItemDoLote(idx)}
                        className="h-8 text-rose-600 hover:bg-rose-50 px-2"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BOTÃO GERAR PRÉVIA PARA REVISÃO HUMANA */}
          {itensLoteInput.length > 0 && !previaLoteResultado && (
            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                onClick={handleGerarPreviaLote}
                disabled={gerandoPreviaLote}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
              >
                {gerandoPreviaLote ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Verificando Conflitos
                    no Servidor...
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> Gerar Prévia para Revisão Humana
                  </>
                )}
              </Button>
            </div>
          )}

          {/* PAINEL DE RESULTADO DA PRÉVIA HUMANA (SEM GRAVAÇÃO FÍSICA) */}
          {previaLoteResultado && (
            <div className="p-5 bg-slate-50 border border-purple-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-purple-600" /> Prévia do Lote Gerada para
                    Revisão Humana
                  </h3>
                  <p className="text-[11px] text-purple-700 mt-0.5">
                    {previaLoteResultado.mensagem}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                    Aptos: {previaLoteResultado.total_aptos}
                  </Badge>
                  <Badge className="bg-rose-100 text-rose-800 border-rose-300">
                    Conflitos: {previaLoteResultado.total_conflitos}
                  </Badge>
                </div>
              </div>

              {/* Tabela de itens da prévia */}
              <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Saída</th>
                      <th className="py-2 px-3">Retorno</th>
                      <th className="py-2 px-3">Situação</th>
                      <th className="py-2 px-3">Diagnóstico da Análise</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previaLoteResultado.itens.map((it) => (
                      <tr
                        key={it.item_idempotency_key}
                        className={it.apto ? 'bg-emerald-50/30' : 'bg-rose-50/40'}
                      >
                        <td className="py-2.5 px-3 font-semibold">{it.indice + 1}</td>
                        <td className="py-2.5 px-3 font-mono">
                          {new Date(it.data_saida).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {new Date(it.data_retorno_previsto).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-3">
                          {it.apto ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                              Apto para Gravação
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                              Conflito Detectado
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {it.apto ? (
                            <span className="text-emerald-700 font-medium">
                              Veículo e motorista livres sem sobreposição
                            </span>
                          ) : (
                            <span className="text-rose-700 font-medium">{it.motivo_rejeicao}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CONFIRMAÇÃO EXPLÍCITA OBRIGATÓRIA */}
              {!resultadoConfirmacaoLote && (
                <div className="pt-2 flex items-center justify-between border-t border-purple-200">
                  <span className="text-xs text-slate-500">
                    Chave de Idempotência:{' '}
                    <code className="font-mono text-purple-700">{chaveIdempotenciaLote}</code>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviaLoteResultado(null)}
                      className="text-xs"
                    >
                      Ajustar Itens
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleConfirmarGravacaoLote}
                      disabled={confirmandoLote}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4"
                    >
                      {confirmandoLote ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Confirmando e
                          Gravando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Confirmar Gravação
                          Definitiva do Lote
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUMÁRIO APÓS CONFIRMAÇÃO EXPLÍCITA */}
          {resultadoConfirmacaoLote && (
            <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Lote Confirmado com
                    Sucesso: {resultadoConfirmacaoLote.lote_codigo}
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {resultadoConfirmacaoLote.mensagem}
                  </p>
                </div>
                {resultadoConfirmacaoLote.idempotente && (
                  <Badge
                    variant="outline"
                    className="bg-white text-blue-700 border-blue-300 text-xs"
                  >
                    Reenvio Idempotente Reconhecido
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                <div className="p-3 bg-white rounded border border-emerald-200">
                  <span className="text-slate-500 block">Viagens Criadas com Sucesso</span>
                  <span className="text-lg font-bold text-emerald-700">
                    {resultadoConfirmacaoLote.itens_criados_total} viagem(ns)
                  </span>
                </div>
                <div className="p-3 bg-white rounded border border-rose-200">
                  <span className="text-slate-500 block">Viagens com Conflito (Não gravadas)</span>
                  <span className="text-lg font-bold text-rose-700">
                    {resultadoConfirmacaoLote.itens_conflito_total} item(ns)
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setTabAtiva('processos')
                    carregarListaProcessos()
                  }}
                  className="text-xs bg-slate-900 text-white"
                >
                  Voltar à Lista de Processos
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 5: PAINEL AGREGADO INTERNO POR LOCALIDADE (SEM MAPAS / SEM DADOS PESSOAIS) */}
      {tabAtiva === 'painel_agregado' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" /> Painel Agregado Interno por
                Localidade
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Estatísticas agregadas de processos e viagens por município de destino • Sem mapas,
                sem georreferenciamento e sem dados pessoais.
              </p>
            </div>

            <div className="w-full md:w-64">
              <Input
                type="text"
                placeholder="Filtrar por município..."
                value={filtroAgregadoLocalidade}
                onChange={(e) => setFiltroAgregadoLocalidade(e.target.value)}
                className="text-xs h-9 bg-white"
              />
            </div>
          </div>

          {carregandoAgregados ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              Apurando totais agregados por localidade...
            </div>
          ) : agregadosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              Nenhuma localidade registrada até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Município de Destino</th>
                    <th className="py-2.5 px-4 text-center">Total Processos</th>
                    <th className="py-2.5 px-4 text-center">Autorizados</th>
                    <th className="py-2.5 px-4 text-center">Enviados ao Estado</th>
                    <th className="py-2.5 px-4 text-center">Inconclusos</th>
                    <th className="py-2.5 px-4 text-center">Viagens Programadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agregadosFiltrados.map((item) => (
                    <tr key={item.municipio} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {item.municipio}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {item.totalProcessos}
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-semibold">
                        {item.totalAutorizados}
                      </td>
                      <td className="py-3 px-4 text-center text-blue-700 font-semibold">
                        {item.totalEnviadosEstado}
                      </td>
                      <td className="py-3 px-4 text-center text-amber-700 font-semibold">
                        {item.totalInconclusos}
                      </td>
                      <td className="py-3 px-4 text-center text-purple-700 font-semibold">
                        {item.totalViagensVinculadas}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: TRANSIÇÃO FORMAL DE ESTADO COM MOTIVO OBRIGATÓRIO */}
      <Dialog open={dialogTransicaoAberto} onOpenChange={setDialogTransicaoAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" /> Transição de Estado do Processo TFD
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              A alteração de estado exige fundamentação/motivo formal com no mínimo 5 caracteres
              para auditoria SUS.
            </DialogDescription>
          </DialogHeader>

          {erroTransicao && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded text-xs text-rose-800">
              {erroTransicao}
            </div>
          )}

          <div className="space-y-3.5 py-2">
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-xs flex justify-between items-center">
              <span>
                Estado Atual: <strong>{processoSelecionado?.status}</strong>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <span>
                Novo Estado:{' '}
                <strong className="text-blue-700 capitalize">{transicaoNovoStatus}</strong>
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Motivo / Justificativa Formal <span className="text-rose-600">*</span>
              </Label>
              <Textarea
                placeholder="Descreva o motivo formal da decisão (laudo emitido, parecer da regulação estadual, cancelamento a pedido...)"
                value={transicaoMotivo}
                onChange={(e) => setTransicaoMotivo(e.target.value)}
                rows={3}
                className="text-xs"
                required
              />
              <p className="text-[10px] text-slate-400">Mínimo de 5 caracteres obrigatórios.</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Observações Gerais Complementares
              </Label>
              <Input
                type="text"
                placeholder="Instruções complementares..."
                value={transicaoObservacoes}
                onChange={(e) => setTransicaoObservacoes(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogTransicaoAberto(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmarTransicaoEstado}
              disabled={transitandoEstado}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              {transitandoEstado ? 'Atualizando...' : 'Confirmar Transição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: RENOVAÇÃO FORMAL DE PROCESSO TFD CONCLUÍDO */}
      <Dialog open={dialogRenovacaoAberto} onOpenChange={setDialogRenovacaoAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-purple-600" /> Renovação Formal de Processo TFD
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Gera um NOVO processo de TFD com novo número interno, vinculado ao original,
              preservando o histórico e começando no estado inicial inconcluso (sem herança de
              aprovação).
            </DialogDescription>
          </DialogHeader>

          {erroRenovacao && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded text-xs text-rose-800">
              {erroRenovacao}
            </div>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div className="p-2.5 bg-purple-50 rounded border border-purple-200 text-purple-900">
              <strong>Processo Anterior a Renovar:</strong> {processoSelecionado?.numero_processo} •
              Paciente: {renderNomePaciente(processoSelecionado?.paciente || '')}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Motivo Formal da Renovação <span className="text-rose-600">*</span>
              </Label>
              <Textarea
                placeholder="Ex: Continuidade do ciclo de tratamento quimioterápico; solicitação de renovação semestral..."
                value={renovacaoMotivo}
                onChange={(e) => setRenovacaoMotivo(e.target.value)}
                rows={3}
                className="text-xs"
                required
              />
              <p className="text-[10px] text-slate-400">Mínimo de 5 caracteres.</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Tratamento Solicitado</Label>
              <Input
                type="text"
                value={renovacaoNovoTratamento}
                onChange={(e) => setRenovacaoNovoTratamento(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Justificativa Clínica Atualizada
              </Label>
              <Textarea
                value={renovacaoNovaJustificativa}
                onChange={(e) => setRenovacaoNovaJustificativa(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogRenovacaoAberto(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmarRenovacao}
              disabled={renovandoProcesso}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              {renovandoProcesso ? 'Processando Renovação...' : 'Confirmar e Criar Novo Processo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: PROGRAMAR VIAGEM DIRETA VINCULADA AO PROCESSO */}
      <Dialog open={dialogCriarViagemAberto} onOpenChange={setDialogCriarViagemAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bus className="w-4 h-4 text-blue-600" /> Programar Viagem Vinculada ao Processo TFD
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cria viagem com reserva direta para o paciente titular do processo (
              {processoSelecionado?.numero_processo}).
            </DialogDescription>
          </DialogHeader>

          {erroViagemDireta && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded text-xs text-rose-800">
              {erroViagemDireta}
            </div>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">
                  Data e Hora de Saída
                </Label>
                <Input
                  type="datetime-local"
                  value={viagemDiretaSaida}
                  onChange={(e) => setViagemDiretaSaida(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Retorno Previsto</Label>
                <Input
                  type="datetime-local"
                  value={viagemDiretaRetorno}
                  onChange={(e) => setViagemDiretaRetorno(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700">Veículo Disponível</Label>
              <Select value={viagemDiretaVeiculoId} onValueChange={setViagemDiretaVeiculoId}>
                <SelectTrigger className="text-xs h-8 bg-white">
                  <SelectValue placeholder="Selecione o veículo" />
                </SelectTrigger>
                <SelectContent>
                  {veiculosDisponiveis.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.placa} ({v.descricao}) - Lotação: {v.capacidade_lotacao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700">Motorista Escala</Label>
              <Select value={viagemDiretaMotoristaId} onValueChange={setViagemDiretaMotoristaId}>
                <SelectTrigger className="text-xs h-8 bg-white">
                  <SelectValue placeholder="Selecione o motorista" />
                </SelectTrigger>
                <SelectContent>
                  {motoristasDisponiveis.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome} (CNH: {m.cnh_categoria})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Cidade Destino</Label>
                <Input
                  type="text"
                  value={viagemDiretaDestinoCidade}
                  onChange={(e) => setViagemDiretaDestinoCidade(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Local de Destino</Label>
                <Input
                  type="text"
                  value={viagemDiretaDestinoLocal}
                  onChange={(e) => setViagemDiretaDestinoLocal(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogCriarViagemAberto(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmarCriarViagemDireta}
              disabled={criandoViagemDireta}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              {criandoViagemDireta ? 'Criando e Reservando...' : 'Programar Viagem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
