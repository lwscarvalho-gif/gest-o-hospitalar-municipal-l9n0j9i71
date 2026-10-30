import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  ItemFilaRIS,
  FiltrosFilaRIS,
  ModalidadeRIS,
  StatusFilaRIS,
  TipoExecucaoRIS,
  RisModeloLaudo,
  RisHistoricoTransicao,
  RisAgenda,
  ComprovanteAgendamentoRISSnapshot,
} from '@/types/hospital'
import {
  listarFilaRIS,
  transitarStatusRIS,
  agendarExameRIS,
  reagendarExameRIS,
  cancelarAgendamentoRIS,
  registrarExameExternoRIS,
  salvarModeloLaudoRIS,
  inativarModeloLaudoRIS,
  listarModelosLaudoRIS,
  aplicarModeloLaudoComoRascunho,
  listarHistoricoTransicoesRIS,
  listarAgendasDoExameRIS,
} from '@/services/ris'
import { emitirLaudoExame } from '@/services/exames'
import { listarSetores, listarProfissionais } from '@/services/cadastros'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Camera,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Printer,
  ChevronLeft,
  ChevronRight,
  History,
  Building,
  UserCheck,
  ShieldCheck,
  FileCheck,
  XCircle,
  Plus,
  RotateCcw,
  Eye,
} from 'lucide-react'
import { EditorFormatadoRIS } from '@/components/EditorFormatadoRIS'
import { TabEntregasRIS } from '@/components/TabEntregasRIS'
import { ModalEntregaLaudoRIS } from '@/components/ModalEntregaLaudoRIS'

interface RisViewProps {
  onNavegarSAME?: (pacienteId?: string) => void
}

type TabRIS = 'fila' | 'agendamentos' | 'modelos' | 'entregas'

export const RisView: React.FC<RisViewProps> = ({ onNavegarSAME }) => {
  const { user } = useAuth()
  const { toast } = useToast()

  // Controle de permissão de perfis
  const role = user?.role || 'recepcao'
  const isRecepcao = role === 'recepcao'
  const podeAcoesClinicas = !isRecepcao // profissional, gestor, admin
  const podeLaudar = role === 'profissional' || role === 'admin'

  // Aba ativa
  const [activeTab, setActiveTab] = useState<TabRIS>('fila')

  // Fila RIS
  const [itensFila, setItensFila] = useState<ItemFilaRIS[]>([])
  const [carregandoFila, setCarregandoFila] = useState(false)
  const [erroFila, setErroFila] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [totalItens, setTotalItens] = useState(0)
  const [isolamentoAtivo, setIsolamentoAtivo] = useState(false)

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<StatusFilaRIS | 'todos'>('todos')
  const [filtroModalidade, setFiltroModalidade] = useState<ModalidadeRIS | 'todos'>('todos')
  const [filtroSetor, setFiltroSetor] = useState<string>('todos')
  const [filtroTipoExecucao, setFiltroTipoExecucao] = useState<TipoExecucaoRIS | 'todos'>('todos')
  const [buscaTexto, setBuscaTexto] = useState('')

  // Auxiliares
  const [setores, setSetores] = useState<Array<{ id: string; nome: string }>>([])
  const [profissionais, setProfissionais] = useState<Array<{ id: string; nome: string }>>([])

  // Descarte de resposta antiga em voo (SeqRef)
  const seqBuscaRef = useRef(0)
  const seqAcaoRef = useRef(0)

  // Exame em foco / Detalhe
  const [exameFoco, setExameFoco] = useState<ItemFilaRIS | null>(null)
  const [modalDetalheAberto, setModalDetalheAberto] = useState(false)
  const [historicoTransicoes, setHistoricoTransicoes] = useState<RisHistoricoTransicao[]>([])
  const [agendasDoExame, setAgendasDoExame] = useState<RisAgenda[]>([])
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)

  // Modais de Operação
  const [modalAgendarAberto, setModalAgendarAberto] = useState(false)
  const [modalReagendarAberto, setModalReagendarAberto] = useState(false)
  const [modalCancelarAgendaAberto, setModalCancelarAgendaAberto] = useState(false)
  const [modalExternoAberto, setModalExternoAberto] = useState(false)
  const [modalModeloAberto, setModalModeloAberto] = useState(false)
  const [modalLaudoRascunhoAberto, setModalLaudoRascunhoAberto] = useState(false)
  const [modalNovoModeloAberto, setModalNovoModeloAberto] = useState(false)
  const [modalComprovanteAberto, setModalComprovanteAberto] = useState(false)

  // Formulário de Agendamento (preserva texto em caso de erro/conflito)
  const [formAgendar, setFormAgendar] = useState({
    sala_equipamento: '',
    data_hora_inicio: '',
    data_hora_fim: '',
    unidade_setor_id: '',
    profissional_id: '',
    profissional_nome: '',
    preparo_orientacoes: '',
  })
  const [chaveIdempAgendar, setChaveIdempAgendar] = useState('')
  const [salvandoAgendamento, setSalvandoAgendamento] = useState(false)
  const [erroAgendar, setErroAgendar] = useState<string | null>(null)

  // Formulário de Reagendamento
  const [agendaSelecionada, setAgendaSelecionada] = useState<RisAgenda | null>(null)
  const [formReagendar, setFormReagendar] = useState({
    nova_data_hora_inicio: '',
    nova_data_hora_fim: '',
    nova_sala_equipamento: '',
    novo_profissional_id: '',
    novo_profissional_nome: '',
    preparo_orientacoes: '',
    motivo: '',
  })
  const [salvandoReagendamento, setSalvandoReagendamento] = useState(false)
  const [erroReagendar, setErroReagendar] = useState<string | null>(null)

  // Cancelamento de Agenda
  const [motivoCancelamentoAgenda, setMotivoCancelamentoAgenda] = useState('')
  const [salvandoCancelamentoAgenda, setSalvandoCancelamentoAgenda] = useState(false)
  const [erroCancelarAgenda, setErroCancelarAgenda] = useState<string | null>(null)

  // Registro de Exame Externo
  const [formExterno, setFormExterno] = useState({
    prestador_externo_nome: '',
    prestador_externo_cnes: '',
    prestador_externo_uf: '',
    observacoes: '',
  })
  const [salvandoExterno, setSalvandoExterno] = useState(false)
  const [erroExterno, setErroExterno] = useState<string | null>(null)

  // Modal do Editor Formatado Completo RIS (DOC-02 Seção 7.4.3.4.b.i–iii)
  const [modalEditorFormatadoAberto, setModalEditorFormatadoAberto] = useState(false)
  const [exameEditorAtivo, setExameEditorAtivo] = useState<ItemFilaRIS | null>(null)

  // Modelos de Laudo
  const [modelosLaudo, setModelosLaudo] = useState<RisModeloLaudo[]>([])
  const [carregandoModelos, setCarregandoModelos] = useState(false)
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState<string>('')
  const [aplicandoModelo, setAplicandoModelo] = useState(false)
  const [erroAplicarModelo, setErroAplicarModelo] = useState<string | null>(null)

  // Edição e Emissão de Laudo (Rascunho via modelo e envio formal para o PEP)
  const [textoRascunhoLaudo, setTextoRascunhoLaudo] = useState('')
  const [sumarioResultadoLaudo, setSumarioResultadoLaudo] = useState('')
  const [salvandoLaudoFinal, setSalvandoLaudoFinal] = useState(false)
  const [erroLaudoFinal, setErroLaudoFinal] = useState<string | null>(null)

  // Cadastro de Novo Modelo
  const [formNovoModelo, setFormNovoModelo] = useState({
    titulo: '',
    modalidade: 'rx' as ModalidadeRIS,
    procedimento_nome: '',
    codigo_procedimento: '',
    texto_padrao: '',
    modelo_anterior_id: '',
    motivo_alteracao: '',
  })
  const [salvandoNovoModelo, setSalvandoNovoModelo] = useState(false)
  const [erroNovoModelo, setErroNovoModelo] = useState<string | null>(null)

  // Comprovante em Snapshot Seguro para visualização/impressão
  const [comprovanteAtivo, setComprovanteAtivo] =
    useState<ComprovanteAgendamentoRISSnapshot | null>(null)

  // Modal de Entrega Formal de Laudos Liberados (7.4.3.4.c.i)
  const [modalEntregaAberto, setModalEntregaAberto] = useState(false)
  const [exameParaEntrega, setExameParaEntrega] = useState<ItemFilaRIS | null>(null)

  // Transição de Status Manual
  const [transitandoStatus, setTransitandoStatus] = useState(false)

  // Carrega Setores e Profissionais para seletores
  useEffect(() => {
    async function carregarAuxiliares() {
      try {
        const [listaSet, listaProf] = await Promise.all([
          listarSetores().catch(() => []),
          listarProfissionais().catch(() => []),
        ])
        setSetores(listaSet.map((s) => ({ id: s.id, nome: s.nome })))
        setProfissionais(listaProf.map((p) => ({ id: p.id, nome: p.nome })))
      } catch {
        /* silencia */
      }
    }
    carregarAuxiliares()
  }, [])

  // Carregar Fila com descarte de resposta antiga em voo (seqBuscaRef)
  const carregarFila = useCallback(async () => {
    const seq = ++seqBuscaRef.current
    setCarregandoFila(true)
    setErroFila(null)

    try {
      const filtros: FiltrosFilaRIS = {
        page: pagina,
        perPage: 15,
      }
      if (filtroStatus !== 'todos') filtros.status = filtroStatus
      if (filtroModalidade !== 'todos') filtros.modalidade = filtroModalidade
      if (filtroSetor !== 'todos') filtros.setor = filtroSetor
      if (filtroTipoExecucao !== 'todos') filtros.tipo_execucao = filtroTipoExecucao
      if (buscaTexto.trim()) filtros.busca = buscaTexto.trim()

      const res = await listarFilaRIS(filtros)

      if (seq !== seqBuscaRef.current) {
        // Resposta antiga em voo descartada
        return
      }

      setItensFila(res.items || [])
      setTotalPaginas(res.totalPages || 1)
      setTotalItens(res.totalItems || 0)
      setIsolamentoAtivo(res.isolamento_clinico_aplicado || false)
    } catch (err: unknown) {
      if (seq !== seqBuscaRef.current) return
      const msg = err instanceof Error ? err.message : 'Falha ao carregar fila RIS.'
      setErroFila(msg)
    } finally {
      if (seq === seqBuscaRef.current) {
        setCarregandoFila(false)
      }
    }
  }, [pagina, filtroStatus, filtroModalidade, filtroSetor, filtroTipoExecucao, buscaTexto])

  useEffect(() => {
    if (activeTab === 'fila') {
      carregarFila()
    }
  }, [activeTab, carregarFila])

  // Carregar Modelos de Laudo
  const carregarModelos = useCallback(async () => {
    setCarregandoModelos(true)
    try {
      const lista = await listarModelosLaudoRIS(undefined, false)
      setModelosLaudo(lista)
    } catch {
      toast({
        title: 'Modelos de laudo',
        description: 'Não foi possível carregar modelos versionados.',
        variant: 'destructive',
      })
    } finally {
      setCarregandoModelos(false)
    }
  }, [toast])

  useEffect(() => {
    if (activeTab === 'modelos') {
      carregarModelos()
    }
  }, [activeTab, carregarModelos])

  // Abrir Detalhe do Exame com Histórico e Agendas
  const handleAbrirDetalhe = async (ex: ItemFilaRIS) => {
    setExameFoco(ex)
    setModalDetalheAberto(true)
    setCarregandoDetalhe(true)
    try {
      const [transicoes, agendas] = await Promise.all([
        listarHistoricoTransicoesRIS(ex.id).catch(() => []),
        listarAgendasDoExameRIS(ex.id).catch(() => []),
      ])
      setHistoricoTransicoes(transicoes)
      setAgendasDoExame(agendas)
    } catch {
      /* silencia */
    } finally {
      setCarregandoDetalhe(false)
    }
  }

  // Iniciar Agendamento
  const handleAbrirAgendar = (ex: ItemFilaRIS) => {
    setExameFoco(ex)
    setErroAgendar(null)
    setChaveIdempAgendar(`ris-ag-${ex.id}-${Date.now().toString(36)}`)
    setFormAgendar((prev) => ({
      ...prev,
      sala_equipamento:
        prev.sala_equipamento ||
        (ex.modalidade_ris === 'tc' ? 'Sala Tomografia 01' : 'Sala Raio-X 01'),
      unidade_setor_id: ex.setor_id || '',
    }))
    setModalAgendarAberto(true)
  }

  const handleSubmeterAgendamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!exameFoco) return
    setErroAgendar(null)

    if (!formAgendar.sala_equipamento.trim()) {
      setErroAgendar('A identificação da sala/equipamento é obrigatória.')
      return
    }
    if (!formAgendar.data_hora_inicio || !formAgendar.data_hora_fim) {
      setErroAgendar('Horários de início e término são obrigatórios.')
      return
    }
    if (formAgendar.data_hora_inicio >= formAgendar.data_hora_fim) {
      setErroAgendar('O horário de início deve ser anterior ao de término.')
      return
    }

    const seq = ++seqAcaoRef.current
    setSalvandoAgendamento(true)

    try {
      const res = await agendarExameRIS({
        exame_id: exameFoco.id,
        sala_equipamento: formAgendar.sala_equipamento.trim(),
        data_hora_inicio: formAgendar.data_hora_inicio,
        data_hora_fim: formAgendar.data_hora_fim,
        unidade_setor_id: formAgendar.unidade_setor_id || undefined,
        profissional_id: formAgendar.profissional_id || undefined,
        profissional_nome: formAgendar.profissional_nome || undefined,
        preparo_orientacoes: formAgendar.preparo_orientacoes.trim() || undefined,
        idempotency_key: chaveIdempAgendar,
      })

      if (seq !== seqAcaoRef.current) return

      toast({
        title: res.idempotente ? 'Agendamento Reenviado (Idempotente)' : 'Agendamento Confirmado',
        description: `Exame agendado com sucesso. Comprovante emitido.`,
      })

      setComprovanteAtivo(res.comprovante)
      setModalAgendarAberto(false)
      setModalComprovanteAberto(true)
      carregarFila()
      if (modalDetalheAberto && exameFoco) {
        handleAbrirDetalhe(exameFoco)
      }
    } catch (err: unknown) {
      if (seq !== seqAcaoRef.current) return
      // NÃO limpa os campos de digitação: usuário preserva seu texto!
      const msg = err instanceof Error ? err.message : 'Falha ao agendar exame.'
      setErroAgendar(msg)
    } finally {
      if (seq === seqAcaoRef.current) {
        setSalvandoAgendamento(false)
      }
    }
  }

  // Iniciar Reagendamento
  const handleAbrirReagendar = (agenda: RisAgenda, ex: ItemFilaRIS) => {
    setExameFoco(ex)
    setAgendaSelecionada(agenda)
    setErroReagendar(null)
    setFormReagendar({
      nova_data_hora_inicio: '',
      nova_data_hora_fim: '',
      nova_sala_equipamento: agenda.sala_equipamento || '',
      novo_profissional_id: agenda.profissional_responsavel || '',
      novo_profissional_nome: agenda.profissional_nome || '',
      preparo_orientacoes: agenda.preparo_orientacoes || '',
      motivo: '',
    })
    setModalReagendarAberto(true)
  }

  const handleSubmeterReagendamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agendaSelecionada) return
    setErroReagendar(null)

    if (!formReagendar.motivo.trim() || formReagendar.motivo.trim().length < 5) {
      setErroReagendar('A justificativa de reagendamento é obrigatória (mínimo de 5 caracteres).')
      return
    }
    if (!formReagendar.nova_data_hora_inicio || !formReagendar.nova_data_hora_fim) {
      setErroReagendar('Novas datas/horários de início e fim são obrigatórios.')
      return
    }

    setSalvandoReagendamento(true)
    try {
      const res = await reagendarExameRIS(agendaSelecionada.id, {
        motivo: formReagendar.motivo.trim(),
        nova_data_hora_inicio: formReagendar.nova_data_hora_inicio,
        nova_data_hora_fim: formReagendar.nova_data_hora_fim,
        nova_sala_equipamento: formReagendar.nova_sala_equipamento.trim() || undefined,
        novo_profissional_id: formReagendar.novo_profissional_id || undefined,
        novo_profissional_nome: formReagendar.novo_profissional_nome || undefined,
        preparo_orientacoes: formReagendar.preparo_orientacoes.trim() || undefined,
      })

      toast({
        title: 'Reagendamento Concluído',
        description: 'Histórico anterior arquivado e nova agenda gerada.',
      })

      setComprovanteAtivo(res.comprovante)
      setModalReagendarAberto(false)
      setModalComprovanteAberto(true)
      carregarFila()
      if (exameFoco) handleAbrirDetalhe(exameFoco)
    } catch (err: unknown) {
      // Preserva o texto digitado
      const msg = err instanceof Error ? err.message : 'Falha ao reagendar exame.'
      setErroReagendar(msg)
    } finally {
      setSalvandoReagendamento(false)
    }
  }

  // Cancelar Agenda
  const handleAbrirCancelarAgenda = (agenda: RisAgenda, ex: ItemFilaRIS) => {
    setExameFoco(ex)
    setAgendaSelecionada(agenda)
    setMotivoCancelamentoAgenda('')
    setErroCancelarAgenda(null)
    setModalCancelarAgendaAberto(true)
  }

  const handleSubmeterCancelarAgenda = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agendaSelecionada) return
    setErroCancelarAgenda(null)

    if (!motivoCancelamentoAgenda.trim() || motivoCancelamentoAgenda.trim().length < 5) {
      setErroCancelarAgenda('Motivo formal de cancelamento obrigatório (mínimo de 5 caracteres).')
      return
    }

    setSalvandoCancelamentoAgenda(true)
    try {
      await cancelarAgendamentoRIS(agendaSelecionada.id, motivoCancelamentoAgenda.trim())
      toast({
        title: 'Agendamento Cancelado',
        description: 'Agendamento cancelado mantendo o histórico auditável.',
      })
      setModalCancelarAgendaAberto(false)
      carregarFila()
      if (exameFoco) handleAbrirDetalhe(exameFoco)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cancelar agendamento.'
      setErroCancelarAgenda(msg)
    } finally {
      setSalvandoCancelamentoAgenda(false)
    }
  }

  // Transição Manual de Status do Exame (Ex: realizado -> aguardando laudo)
  const handleTransitarStatus = async (novoStatus: StatusFilaRIS, motivoPadrao?: string) => {
    if (!exameFoco) return
    const motivo =
      motivoPadrao ||
      window.prompt(
        `Informe a justificativa formal para transitar o exame para "${novoStatus}":`,
        novoStatus === 'realizado_aguardando_laudo'
          ? 'Procedimento executado pelo operador do setor; aguardando emissão do laudo.'
          : 'Atualização autorizada de fluxo',
      )

    if (!motivo) return

    setTransitandoStatus(true)
    try {
      const res = await transitarStatusRIS(exameFoco.id, {
        novo_status: novoStatus,
        motivo_justificativa: motivo,
      })
      toast({
        title: 'Status Atualizado na Fila RIS',
        description: `${res.status_anterior} ➜ ${res.status_novo}`,
      })
      carregarFila()
      handleAbrirDetalhe({ ...exameFoco, status_ris: novoStatus })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao transitar status.'
      toast({
        title: 'Erro na transição',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setTransitandoStatus(false)
    }
  }

  // Registro de Exame Externo
  const handleAbrirRegistroExterno = (ex: ItemFilaRIS) => {
    setExameFoco(ex)
    setErroExterno(null)
    setFormExterno({
      prestador_externo_nome: ex.prestador_externo_nome || '',
      prestador_externo_cnes: ex.prestador_externo_cnes || '',
      prestador_externo_uf: ex.prestador_externo_uf || 'RO',
      observacoes: '',
    })
    setModalExternoAberto(true)
  }

  const handleSubmeterExterno = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!exameFoco) return
    setErroExterno(null)

    if (
      !formExterno.prestador_externo_nome.trim() ||
      formExterno.prestador_externo_nome.trim().length < 3
    ) {
      setErroExterno('Nome do prestador credenciado é obrigatório (mínimo de 3 caracteres).')
      return
    }

    setSalvandoExterno(true)
    try {
      const res = await registrarExameExternoRIS(exameFoco.id, {
        prestador_externo_nome: formExterno.prestador_externo_nome.trim(),
        prestador_externo_cnes: formExterno.prestador_externo_cnes.trim() || undefined,
        prestador_externo_uf: formExterno.prestador_externo_uf.trim() || undefined,
        observacoes: formExterno.observacoes.trim() || undefined,
      })

      toast({
        title: 'Execução Externa Registrada',
        description: `Prestador: ${res.prestador_externo_nome}. Fila atualizada para ${res.status_ris}.`,
      })

      setModalExternoAberto(false)
      carregarFila()
      if (modalDetalheAberto) {
        handleAbrirDetalhe({
          ...exameFoco,
          tipo_execucao: 'externo',
          prestador_externo_nome: res.prestador_externo_nome,
          status_ris: 'realizado_aguardando_laudo',
        })
      }
    } catch (err: unknown) {
      // Preserva texto digitado
      const msg = err instanceof Error ? err.message : 'Falha ao registrar exame externo.'
      setErroExterno(msg)
    } finally {
      setSalvandoExterno(false)
    }
  }

  // Aplicação de Modelo como Rascunho para Revisão Humana
  const handleAbrirAplicarModelo = async (ex: ItemFilaRIS) => {
    setExameFoco(ex)
    setErroAplicarModelo(null)
    setModeloSelecionadoId('')
    await carregarModelos()
    setModalModeloAberto(true)
  }

  const handleSubmeterAplicarModelo = async () => {
    if (!exameFoco || !modeloSelecionadoId) {
      setErroAplicarModelo('Selecione um modelo de laudo ativo.')
      return
    }
    setAplicandoModelo(true)
    setErroAplicarModelo(null)

    try {
      const res = await aplicarModeloLaudoComoRascunho(exameFoco.id, modeloSelecionadoId)
      toast({
        title: 'Modelo Aplicado como Rascunho',
        description: `Modelo "${res.modelo_titulo}" inserido para revisão humana. Sem liberação clínica automática.`,
      })
      setTextoRascunhoLaudo(res.rascunho_gerado)
      setSumarioResultadoLaudo(
        exameFoco.resultado_sumario ||
          `Achados radiológicos compatíveis com o padrão ${res.modelo_titulo}`,
      )
      setModalModeloAberto(false)
      setModalLaudoRascunhoAberto(true)
      carregarFila()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao aplicar modelo.'
      setErroAplicarModelo(msg)
    } finally {
      setAplicandoModelo(false)
    }
  }

  // Redigir / Finalizar Laudo Clínico: Abre o Editor Formatado Completo RIS
  const handleAbrirRedacaoLaudo = (ex: ItemFilaRIS) => {
    setExameFoco(ex)
    setExameEditorAtivo(ex)
    setModalEditorFormatadoAberto(true)
  }

  const handleSubmeterLaudoFinal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!exameFoco) return
    setErroLaudoFinal(null)

    if (!textoRascunhoLaudo.trim()) {
      setErroLaudoFinal('O parecer técnico e descritivo do laudo é obrigatório.')
      return
    }
    if (!sumarioResultadoLaudo.trim()) {
      setErroLaudoFinal('O parecer conclusivo / sumário de resultado é obrigatório para liberação.')
      return
    }

    setSalvandoLaudoFinal(true)
    try {
      await emitirLaudoExame({
        exameId: exameFoco.id,
        responsavel_laudo: user?.id,
        responsavel_laudo_nome: user?.name || 'Médico Radiologista',
        resultado_sumario: sumarioResultadoLaudo.trim(),
        laudo_texto: textoRascunhoLaudo.trim(),
      })

      // Transita também o status RIS para laudado
      await transitarStatusRIS(exameFoco.id, {
        novo_status: 'laudado',
        motivo_justificativa: 'Emissão e liberação de laudo médico formal',
      })

      toast({
        title: 'Laudo Liberado no PEP',
        description: 'Laudo assinado e disponível no prontuário do paciente.',
      })

      setModalLaudoRascunhoAberto(false)
      carregarFila()
      if (modalDetalheAberto) {
        handleAbrirDetalhe({
          ...exameFoco,
          status_ris: 'laudado',
          laudo_texto: textoRascunhoLaudo.trim(),
          resultado_sumario: sumarioResultadoLaudo.trim(),
        })
      }
    } catch (err: unknown) {
      // Preserva o texto digitado no formulário!
      const msg = err instanceof Error ? err.message : 'Erro ao liberar laudo.'
      setErroLaudoFinal(msg)
    } finally {
      setSalvandoLaudoFinal(false)
    }
  }

  // Salvar Novo Modelo de Laudo
  const handleSubmeterNovoModelo = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroNovoModelo(null)

    if (
      !formNovoModelo.titulo.trim() ||
      !formNovoModelo.procedimento_nome.trim() ||
      !formNovoModelo.texto_padrao.trim()
    ) {
      setErroNovoModelo('Título, procedimento e texto padrão são obrigatórios.')
      return
    }

    setSalvandoNovoModelo(true)
    try {
      const res = await salvarModeloLaudoRIS({
        titulo: formNovoModelo.titulo.trim(),
        modalidade: formNovoModelo.modalidade,
        procedimento_nome: formNovoModelo.procedimento_nome.trim(),
        codigo_procedimento: formNovoModelo.codigo_procedimento.trim() || undefined,
        texto_padrao: formNovoModelo.texto_padrao.trim(),
        modelo_anterior_id: formNovoModelo.modelo_anterior_id || undefined,
        motivo_alteracao: formNovoModelo.motivo_alteracao.trim() || undefined,
      })

      toast({
        title: 'Modelo Cadastrado',
        description: `Modelo salvo na versão ${res.versao}.`,
      })

      setModalNovoModeloAberto(false)
      setFormNovoModelo({
        titulo: '',
        modalidade: 'rx',
        procedimento_nome: '',
        codigo_procedimento: '',
        texto_padrao: '',
        modelo_anterior_id: '',
        motivo_alteracao: '',
      })
      carregarModelos()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar modelo.'
      setErroNovoModelo(msg)
    } finally {
      setSalvandoNovoModelo(false)
    }
  }

  // Inativar Modelo
  const handleInativarModelo = async (modelo: RisModeloLaudo) => {
    if (!window.confirm(`Deseja inativar o modelo "${modelo.titulo}" (v${modelo.versao})?`)) return
    try {
      await inativarModeloLaudoRIS(modelo.id)
      toast({
        title: 'Modelo Inativado',
        description: 'Modelo mantido no histórico auditável e desativado para novos laudos.',
      })
      carregarModelos()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao inativar modelo.'
      toast({
        title: 'Erro',
        description: msg,
        variant: 'destructive',
      })
    }
  }

  // Renderizador de Badge de Status da Fila RIS
  const renderBadgeStatusRIS = (status: StatusFilaRIS | string) => {
    switch (status) {
      case 'solicitado':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold text-[11px] flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            1. Solicitado
          </Badge>
        )
      case 'agendado':
        return (
          <Badge className="bg-sky-100 text-sky-800 border-sky-300 font-semibold text-[11px] flex items-center gap-1">
            <Calendar className="w-3 h-3 text-sky-600" />
            2. Agendado
          </Badge>
        )
      case 'realizado_aguardando_laudo':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-semibold text-[11px] flex items-center gap-1">
            <Camera className="w-3 h-3 text-purple-600" />
            3. Realizado (Aguardando Laudo)
          </Badge>
        )
      case 'laudado':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            4. Laudado / Liberado
          </Badge>
        )
      case 'cancelado':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 font-semibold text-[11px] flex items-center gap-1">
            <XCircle className="w-3 h-3 text-red-600" />
            Cancelado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const renderBadgeModalidade = (mod: ModalidadeRIS | string) => {
    const labels: Record<string, string> = {
      rx: 'Raio-X (RX)',
      tc: 'Tomografia (TC)',
      ecg: 'Eletrocardiograma (ECG)',
      us: 'Ultrassom (USG)',
      outro: 'Outro Método Gráfico',
    }
    return (
      <Badge
        variant="outline"
        className="text-[10px] font-mono uppercase bg-slate-50 border-slate-300"
      >
        {labels[mod] || mod}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. TOPO: Título e Navegação de Abas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-sky-700 flex items-center justify-center text-white shadow-md shadow-sky-600/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Módulo RIS — Radiologia e Diagnóstico por Imagem
                </h1>
                <Badge
                  variant="outline"
                  className="bg-sky-50 text-sky-800 border-sky-300 text-[10px] font-semibold"
                >
                  SUS 7.4.3.4 (Itens 313–316)
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Fila de exames de imagem e métodos gráficos com agendamento municipal, comprovante
                seguro e modelos versionados para laudo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isolamentoAtivo && (
            <Badge className="bg-amber-50 text-amber-800 border-amber-300 text-xs px-2.5 py-1">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-600" />
              Isolamento Clínico Ativo (Recepção)
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={activeTab === 'fila' ? carregarFila : carregarModelos}
            disabled={carregandoFila || carregandoModelos}
            className="text-slate-700 border-slate-300"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${carregandoFila || carregandoModelos ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>

          {podeAcoesClinicas && activeTab === 'modelos' && (
            <Button
              size="sm"
              onClick={() => {
                setFormNovoModelo({
                  titulo: '',
                  modalidade: 'rx',
                  procedimento_nome: '',
                  codigo_procedimento: '',
                  texto_padrao: '',
                  modelo_anterior_id: '',
                  motivo_alteracao: '',
                })
                setModalNovoModeloAberto(true)
              }}
              className="bg-sky-700 hover:bg-sky-600 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Modelo de Laudo
            </Button>
          )}
        </div>
      </div>

      {/* 2. BARRA DE NAVEGAÇÃO DE SUB-ABAS RIS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('fila')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'fila'
              ? 'bg-sky-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Camera className="w-4 h-4" />
          Fila de Imagem & Exames ({totalItens})
        </button>

        <button
          onClick={() => setActiveTab('entregas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'entregas'
              ? 'bg-sky-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Entrega Formal de Laudos (DOC-02)
        </button>

        <button
          onClick={() => setActiveTab('modelos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'modelos'
              ? 'bg-sky-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          Modelos de Laudo Versionados
        </button>
      </div>

      {/* ==================================================================== */}
      {/* ABA 1: FILA DE EXAMES RIS */}
      {/* ==================================================================== */}
      {activeTab === 'fila' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-slate-400" /> Filtros RIS:
                </span>

                {/* Status */}
                <Select
                  value={filtroStatus}
                  onValueChange={(val) => {
                    setFiltroStatus(val as StatusFilaRIS | 'todos')
                    setPagina(1)
                  }}
                >
                  <SelectTrigger className="text-xs h-8 w-44 bg-white">
                    <SelectValue placeholder="Status RIS" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="solicitado">1. Solicitados</SelectItem>
                    <SelectItem value="agendado">2. Agendados</SelectItem>
                    <SelectItem value="realizado_aguardando_laudo">
                      3. Realizados (Aguardando Laudo)
                    </SelectItem>
                    <SelectItem value="laudado">4. Laudados / Liberados</SelectItem>
                    <SelectItem value="cancelado">Cancelados</SelectItem>
                  </SelectContent>
                </Select>

                {/* Modalidade */}
                <Select
                  value={filtroModalidade}
                  onValueChange={(val) => {
                    setFiltroModalidade(val as ModalidadeRIS | 'todos')
                    setPagina(1)
                  }}
                >
                  <SelectTrigger className="text-xs h-8 w-36 bg-white">
                    <SelectValue placeholder="Modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas Modalidades</SelectItem>
                    <SelectItem value="rx">Raio-X (RX)</SelectItem>
                    <SelectItem value="tc">Tomografia (TC)</SelectItem>
                    <SelectItem value="ecg">Eletrocardiograma (ECG)</SelectItem>
                    <SelectItem value="us">Ultrassom (USG)</SelectItem>
                    <SelectItem value="outro">Outro Método</SelectItem>
                  </SelectContent>
                </Select>

                {/* Setor */}
                <Select
                  value={filtroSetor}
                  onValueChange={(val) => {
                    setFiltroSetor(val)
                    setPagina(1)
                  }}
                >
                  <SelectTrigger className="text-xs h-8 w-40 bg-white">
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

                {/* Tipo de Execução (Interno vs Externo) */}
                <Select
                  value={filtroTipoExecucao}
                  onValueChange={(val) => {
                    setFiltroTipoExecucao(val as TipoExecucaoRIS | 'todos')
                    setPagina(1)
                  }}
                >
                  <SelectTrigger className="text-xs h-8 w-36 bg-white">
                    <SelectValue placeholder="Execução" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Execução: Todas</SelectItem>
                    <SelectItem value="interno">Interno (Hospital)</SelectItem>
                    <SelectItem value="externo">Externo (Credenciado)</SelectItem>
                  </SelectContent>
                </Select>

                {(filtroStatus !== 'todos' ||
                  filtroModalidade !== 'todos' ||
                  filtroSetor !== 'todos' ||
                  filtroTipoExecucao !== 'todos' ||
                  buscaTexto) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFiltroStatus('todos')
                      setFiltroModalidade('todos')
                      setFiltroSetor('todos')
                      setFiltroTipoExecucao('todos')
                      setBuscaTexto('')
                      setPagina(1)
                    }}
                    className="text-xs h-8 text-red-600"
                  >
                    Limpar
                  </Button>
                )}
              </div>

              <div className="w-full md:w-64">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <Input
                    placeholder="Buscar exame ou médico..."
                    value={buscaTexto}
                    onChange={(e) => {
                      setBuscaTexto(e.target.value)
                      setPagina(1)
                    }}
                    className="text-xs h-8 pl-8"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Exames da Fila RIS */}
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-700" />
                Fila de Radiologia e Imagem (Serviço Integrado ao PEP)
              </CardTitle>
              <span className="text-xs text-slate-500">
                Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong> ({totalItens}{' '}
                total)
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {carregandoFila ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin text-sky-700" />
                  <span>Consultando fila RIS no servidor...</span>
                </div>
              ) : erroFila ? (
                <div className="py-12 px-4 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800">{erroFila}</p>
                  <Button variant="outline" size="sm" onClick={carregarFila}>
                    Tentar Novamente
                  </Button>
                </div>
              ) : itensFila.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs space-y-1">
                  <p className="font-semibold text-slate-700">
                    Nenhum exame de imagem encontrado para estes filtros.
                  </p>
                  <p className="text-slate-400">
                    Novas solicitações geradas a partir do PEP entram automaticamente nesta fila.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Data / Hora</th>
                        <th className="p-3">Paciente (LGPD)</th>
                        <th className="p-3">Exame / Modalidade</th>
                        <th className="p-3">Execução</th>
                        <th className="p-3">Status RIS</th>
                        <th className="p-3">Solicitante</th>
                        <th className="p-3 text-right">Ações no Fluxo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itensFila.map((item) => {
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Data */}
                            <td className="p-3 whitespace-nowrap text-slate-600 font-mono">
                              {item.data_solicitacao ||
                                item.created?.slice(0, 16).replace('T', ' ')}
                            </td>

                            {/* Paciente com Máscara LGPD rigorosa */}
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{item.paciente_nome}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {item.paciente_cns_mascarado
                                  ? `CNS: ${item.paciente_cns_mascarado}`
                                  : 'CNS: [Omitido]'}
                                {item.paciente_cpf_mascarado &&
                                  ` • CPF: ${item.paciente_cpf_mascarado}`}
                              </div>
                            </td>

                            {/* Exame e Modalidade */}
                            <td className="p-3">
                              <div className="font-semibold text-slate-900">{item.tipo_exame}</div>
                              <div className="mt-0.5">
                                {renderBadgeModalidade(item.modalidade_ris)}
                              </div>
                            </td>

                            {/* Execução: Interno vs Externo */}
                            <td className="p-3">
                              {item.tipo_execucao === 'externo' ? (
                                <div>
                                  <Badge className="bg-amber-50 text-amber-900 border-amber-300 text-[10px]">
                                    <Building className="w-3 h-3 mr-1 text-amber-700" />
                                    Externo Credenciado
                                  </Badge>
                                  <div className="text-[10px] text-slate-600 mt-0.5 truncate max-w-[160px]">
                                    {item.prestador_externo_nome}
                                    {item.prestador_externo_cnes &&
                                      ` (CNES: ${item.prestador_externo_cnes})`}
                                  </div>
                                </div>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] text-slate-700 border-slate-300"
                                >
                                  Interno (Hospital)
                                </Badge>
                              )}
                            </td>

                            {/* Status RIS */}
                            <td className="p-3">{renderBadgeStatusRIS(item.status_ris)}</td>

                            {/* Solicitante */}
                            <td className="p-3 text-slate-600">
                              <div>{item.solicitante_nome || 'Médico Assistente'}</div>
                              {item.prioridade === 'urgente' && (
                                <span className="text-[10px] font-bold text-red-600">URGÊNCIA</span>
                              )}
                            </td>

                            {/* Ações operacionais */}
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Botão de Detalhes / Histórico */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAbrirDetalhe(item)}
                                  className="h-7 text-[11px] px-2 text-slate-700"
                                >
                                  <History className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                  Detalhes
                                </Button>

                                {/* Agendamento (disponível para solicitado ou reagendamento) */}
                                {item.status_ris === 'solicitado' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleAbrirAgendar(item)}
                                    className="h-7 text-[11px] px-2 bg-sky-700 hover:bg-sky-600 text-white"
                                  >
                                    <Calendar className="w-3.5 h-3.5 mr-1" />
                                    Agendar
                                  </Button>
                                )}

                                {/* Registrar Execução Externa caso seja solicitado/agendado */}
                                {(item.status_ris === 'solicitado' ||
                                  item.status_ris === 'agendado') && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAbrirRegistroExterno(item)}
                                    className="h-7 text-[11px] px-2 text-amber-800 border-amber-300 hover:bg-amber-50"
                                  >
                                    <Building className="w-3.5 h-3.5 mr-1 text-amber-600" />
                                    Exec. Externa
                                  </Button>
                                )}

                                {/* Confirmar Realização Interna */}
                                {item.status_ris === 'agendado' && podeAcoesClinicas && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleTransitarStatus(
                                        'realizado_aguardando_laudo',
                                        'Exame realizado no setor interno pelo técnico/operador.',
                                      )
                                    }
                                    className="h-7 text-[11px] px-2 bg-purple-700 hover:bg-purple-600 text-white"
                                  >
                                    <Camera className="w-3.5 h-3.5 mr-1" />
                                    Marcar Realizado
                                  </Button>
                                )}

                                {/* Laudar / Aplicar Modelo (perfil clínico) */}
                                {item.status_ris === 'realizado_aguardando_laudo' && podeLaudar && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleAbrirAplicarModelo(item)}
                                      className="h-7 text-[11px] px-2 bg-indigo-700 hover:bg-indigo-600 text-white"
                                    >
                                      <FileText className="w-3.5 h-3.5 mr-1" />
                                      Modelo Rascunho
                                    </Button>

                                    <Button
                                      size="sm"
                                      onClick={() => handleAbrirRedacaoLaudo(item)}
                                      className="h-7 text-[11px] px-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold"
                                    >
                                      <FileCheck className="w-3.5 h-3.5 mr-1" />
                                      Editor Laudo RIS
                                    </Button>
                                  </>
                                )}

                                {/* Laudo Já Emitido: Botão para Consulta de Versões / Retificação / Impressão no Editor Formatado */}
                                {(item.status_ris === 'laudado' ||
                                  item.status_exame_legado === 'liberado') && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleAbrirRedacaoLaudo(item)}
                                      className="h-7 text-[11px] px-2 border-emerald-600 text-emerald-800 hover:bg-emerald-50"
                                      title="Consultar Laudo Formatado e Versões"
                                    >
                                      <Eye className="w-3.5 h-3.5 mr-1" />
                                      Ver Laudo V{item.versao_atual || 1}
                                    </Button>
                                    {podeLaudar && (
                                      <Button
                                        size="sm"
                                        onClick={() => handleAbrirRedacaoLaudo(item)}
                                        className="h-7 text-[11px] px-2 bg-amber-700 hover:bg-amber-600 text-white"
                                        title="Retificar Laudo Emitido (Nova Versão)"
                                      >
                                        <RotateCcw className="w-3 h-3 mr-1" />
                                        Retificar
                                      </Button>
                                    )}
                                    {/* Botão de Entrega Formal Presencial */}
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setExameParaEntrega(item)
                                        setModalEntregaAberto(true)
                                      }}
                                      className="h-7 text-[11px] px-2 bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm"
                                      title="Registrar Entrega Presencial ao Paciente/Destinatário"
                                    >
                                      <FileCheck className="w-3.5 h-3.5 mr-1" />
                                      Entregar Laudo
                                    </Button>
                                  </>
                                )}

                                {/* Navegar para prontuário SAME */}
                                {onNavegarSAME && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onNavegarSAME(item.paciente_id)}
                                    className="h-7 text-[11px] px-2 text-slate-500 hover:text-slate-800"
                                    title="Abrir no Prontuário (SAME)"
                                  >
                                    PEP
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Paginação */}
              <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Mostrando página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagina <= 1}
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    className="h-8 px-2 text-xs"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagina >= totalPaginas}
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    className="h-8 px-2 text-xs"
                  >
                    Próxima <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 2: ENTREGA FORMAL DE RESULTADOS RIS (DOC-02 7.4.3.4.c.i) */}
      {/* ==================================================================== */}
      {activeTab === 'entregas' && (
        <TabEntregasRIS
          examesFila={itensFila}
          onAbrirEntregaExame={(ex) => {
            setExameParaEntrega(ex)
            setModalEntregaAberto(true)
          }}
          onAtualizarFilaGeral={carregarFila}
        />
      )}

      {/* ==================================================================== */}
      {/* ABA 3: MODELOS DE LAUDO VERSIONADOS */}
      {/* ==================================================================== */}
      {activeTab === 'modelos' && (
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-700" />
                Catálogo de Modelos de Laudo Versionados (ANEXO I Item 316)
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Modelos padronizados por modalidade e procedimento para acelerar digitação humana
                com versionamento e histórico.
              </p>
            </div>
            {podeAcoesClinicas && (
              <Button
                size="sm"
                onClick={() => setModalNovoModeloAberto(true)}
                className="bg-sky-700 hover:bg-sky-600 text-white text-xs h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Novo Modelo
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {carregandoModelos ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-sky-700" />
                <span>Carregando catálogo de modelos...</span>
              </div>
            ) : modelosLaudo.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                Nenhum modelo de laudo cadastrado ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Título do Modelo</th>
                      <th className="p-3">Modalidade</th>
                      <th className="p-3">Procedimento</th>
                      <th className="p-3">Versão</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Texto Padrão (Prévia)</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modelosLaudo.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-bold text-slate-900">{m.titulo}</td>
                        <td className="p-3">{renderBadgeModalidade(m.modalidade)}</td>
                        <td className="p-3 text-slate-700">
                          {m.procedimento_nome}
                          {m.codigo_procedimento && (
                            <span className="font-mono text-slate-400 block text-[10px]">
                              {m.codigo_procedimento}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-sky-800">v{m.versao}</td>
                        <td className="p-3">
                          {m.ativo ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-slate-400 border-slate-300 text-[10px]"
                            >
                              Inativo / Substituído
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 max-w-xs truncate text-slate-500 font-mono text-[11px]">
                          {m.texto_padrao}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {podeAcoesClinicas && m.ativo && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setFormNovoModelo({
                                      titulo: m.titulo,
                                      modalidade: m.modalidade,
                                      procedimento_nome: m.procedimento_nome,
                                      codigo_procedimento: m.codigo_procedimento || '',
                                      texto_padrao: m.texto_padrao,
                                      modelo_anterior_id: m.id,
                                      motivo_alteracao: '',
                                    })
                                    setModalNovoModeloAberto(true)
                                  }}
                                  className="h-7 text-[11px] px-2 text-slate-700"
                                >
                                  Versionar (v{m.versao + 1})
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleInativarModelo(m)}
                                  className="h-7 text-[11px] px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  Inativar
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: DETALHE DO EXAME + TRILHA DE AUDITORIA E AGENDAS */}
      {/* ==================================================================== */}
      <Dialog open={modalDetalheAberto} onOpenChange={setModalDetalheAberto}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Camera className="w-4 h-4 text-sky-700" />
              Detalhes do Exame RIS #{exameFoco?.id.slice(-6)}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Trilha auditável de transições, agendamentos vinculados e dados da requisição.
            </DialogDescription>
          </DialogHeader>

          {exameFoco && (
            <div className="space-y-4 text-xs">
              {/* Cartão de Identificação */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Paciente
                  </span>
                  <strong className="text-slate-900 text-sm">{exameFoco.paciente_nome}</strong>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {exameFoco.paciente_cns_mascarado}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Exame / Modalidade
                  </span>
                  <strong className="text-slate-900">{exameFoco.tipo_exame}</strong>
                  <div className="mt-0.5">{renderBadgeModalidade(exameFoco.modalidade_ris)}</div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Status Atual
                  </span>
                  <div className="mt-0.5">{renderBadgeStatusRIS(exameFoco.status_ris)}</div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Execução
                  </span>
                  <strong>
                    {exameFoco.tipo_execucao === 'externo'
                      ? 'Prestador Externo'
                      : 'Interno (Hospital)'}
                  </strong>
                  {exameFoco.prestador_externo_nome && (
                    <div className="text-[10px] text-slate-600">
                      {exameFoco.prestador_externo_nome} (CNES:{' '}
                      {exameFoco.prestador_externo_cnes || 'N/A'})
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Solicitante
                  </span>
                  <span className="text-slate-800">{exameFoco.solicitante_nome}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Data da Solicitação
                  </span>
                  <span className="font-mono text-slate-700">{exameFoco.data_solicitacao}</span>
                </div>
              </div>

              {/* Justificativa Clínica (respeitando isolamento de recepção) */}
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Justificativa Clínica Informada no PEP
                </span>
                <p className="text-slate-800 italic">
                  {exameFoco.justificativa_clinica || 'Nenhuma justificativa clínica registrada.'}
                </p>
              </div>

              {/* Se houver Laudo / Rascunho */}
              {(exameFoco.laudo_texto || exameFoco.rascunho_laudo) && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-700 uppercase">
                      {exameFoco.laudo_texto
                        ? 'Laudo Emitido no Prontuário'
                        : 'Rascunho de Laudo Aplicado (Revisão Humana)'}
                    </span>
                    {exameFoco.resultado_sumario && (
                      <span className="text-[11px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                        {exameFoco.resultado_sumario}
                      </span>
                    )}
                  </div>
                  <pre className="font-mono text-[11px] whitespace-pre-wrap text-slate-800 bg-white p-2.5 rounded border border-slate-200 max-h-40 overflow-y-auto">
                    {exameFoco.laudo_texto || exameFoco.rascunho_laudo}
                  </pre>
                </div>
              )}

              {/* Agendas Vinculadas */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-700" />
                  Agendamentos e Comprovantes Registrados ({agendasDoExame.length})
                </h4>
                {agendasDoExame.length === 0 ? (
                  <p className="text-slate-400 italic">Nenhum agendamento ativo para este exame.</p>
                ) : (
                  <div className="space-y-1.5">
                    {agendasDoExame.map((ag) => {
                      let snapshot: ComprovanteAgendamentoRISSnapshot | null = null
                      if (ag.comprovante_snapshot) {
                        try {
                          snapshot =
                            typeof ag.comprovante_snapshot === 'string'
                              ? JSON.parse(ag.comprovante_snapshot)
                              : ag.comprovante_snapshot
                        } catch {
                          /* silencia */
                        }
                      }

                      return (
                        <div
                          key={ag.id}
                          className="p-2.5 bg-white border border-slate-200 rounded flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-semibold text-slate-900">
                              {ag.sala_equipamento} • {ag.data_hora_inicio} até {ag.data_hora_fim}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Status: <strong className="uppercase">{ag.status}</strong>
                              {ag.profissional_nome && ` • Profissional: ${ag.profissional_nome}`}
                              {ag.motivo_cancelamento_reagendamento && (
                                <span className="text-amber-800 block">
                                  Motivo: {ag.motivo_cancelamento_reagendamento}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {snapshot && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setComprovanteAtivo(snapshot)
                                  setModalComprovanteAberto(true)
                                }}
                                className="h-7 text-[11px] px-2 text-slate-700"
                              >
                                <Printer className="w-3.5 h-3.5 mr-1" />
                                Comprovante
                              </Button>
                            )}

                            {ag.status === 'agendado' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAbrirReagendar(ag, exameFoco)}
                                  className="h-7 text-[11px] px-2 text-sky-800 border-sky-300"
                                >
                                  Reagendar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAbrirCancelarAgenda(ag, exameFoco)}
                                  className="h-7 text-[11px] px-2 text-red-600 hover:text-red-700"
                                >
                                  Cancelar
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Histórico Auditável de Transições */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-600" />
                  Trilha Auditável de Transições de Fluxo ({historicoTransicoes.length})
                </h4>
                {carregandoDetalhe ? (
                  <p className="text-slate-400 italic">Carregando trilha auditável...</p>
                ) : historicoTransicoes.length === 0 ? (
                  <p className="text-slate-400 italic">Nenhum evento registrado ainda.</p>
                ) : (
                  <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {historicoTransicoes.map((h) => (
                      <div key={h.id} className="p-2 bg-white text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            {h.status_anterior} ➜ {h.status_novo}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {h.data_hora}
                          </span>
                        </div>
                        <div className="text-slate-600 mt-0.5">
                          <strong>Justificativa: </strong>
                          {h.motivo_justificativa}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Autor: {h.usuario_autor_nome} ({h.usuario_cargo || 'Operador'})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalDetalheAberto(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 2: AGENDAR EXAME (COM IDEMPOTÊNCIA E PRESERVAÇÃO DE TEXTO) */}
      {/* ==================================================================== */}
      <Dialog open={modalAgendarAberto} onOpenChange={setModalAgendarAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-700" />
              Agendar Exame de Imagem
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Gera agenda com validação de conflito de sala/profissional e emissão de comprovante
              seguro.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmeterAgendamento} className="space-y-3 text-xs">
            {erroAgendar && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                <strong>Atenção:</strong> {erroAgendar}
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Sala / Equipamento Diagnóstico *
              </label>
              <Input
                placeholder="Ex: Sala Raio-X 01, Tomógrafo Siemens, etc."
                value={formAgendar.sala_equipamento}
                onChange={(e) =>
                  setFormAgendar({ ...formAgendar, sala_equipamento: e.target.value })
                }
                className="text-xs h-8"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Início do Exame *</label>
                <Input
                  type="datetime-local"
                  value={formAgendar.data_hora_inicio}
                  onChange={(e) =>
                    setFormAgendar({ ...formAgendar, data_hora_inicio: e.target.value })
                  }
                  className="text-xs h-8 font-mono"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Término Previsto *
                </label>
                <Input
                  type="datetime-local"
                  value={formAgendar.data_hora_fim}
                  onChange={(e) =>
                    setFormAgendar({ ...formAgendar, data_hora_fim: e.target.value })
                  }
                  className="text-xs h-8 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Profissional Responsável (Opcional)
              </label>
              <Select
                value={formAgendar.profissional_id}
                onValueChange={(val) => {
                  const prof = profissionais.find((p) => p.id === val)
                  setFormAgendar({
                    ...formAgendar,
                    profissional_id: val,
                    profissional_nome: prof ? prof.nome : '',
                  })
                }}
              >
                <SelectTrigger className="text-xs h-8 bg-white">
                  <SelectValue placeholder="Selecione o profissional executor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Não especificar</SelectItem>
                  {profissionais.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Preparo e Orientações ao Paciente
              </label>
              <Input
                placeholder="Ex: Jejum de 4h, trazer exames anteriores..."
                value={formAgendar.preparo_orientacoes}
                onChange={(e) =>
                  setFormAgendar({ ...formAgendar, preparo_orientacoes: e.target.value })
                }
                className="text-xs h-8"
              />
            </div>

            <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-500 font-mono">
              Chave de Idempotência: {chaveIdempAgendar}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalAgendarAberto(false)}
                disabled={salvandoAgendamento}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoAgendamento}
                className="bg-sky-700 hover:bg-sky-600 text-white text-xs"
              >
                {salvandoAgendamento ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                )}
                Confirmar Agendamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 3: REAGENDAMENTO (HISTÓRICO AUDITÁVEL PRESERVADO) */}
      {/* ==================================================================== */}
      <Dialog open={modalReagendarAberto} onOpenChange={setModalReagendarAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-700" />
              Reagendar Exame RIS
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Inativa o agendamento anterior e cria uma nova agenda com comprovante atualizado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmeterReagendamento} className="space-y-3 text-xs">
            {erroReagendar && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                <strong>Atenção:</strong> {erroReagendar}
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Motivo / Justificativa do Reagendamento *
              </label>
              <Input
                placeholder="Ex: Manutenção preventiva do aparelho, pedido do paciente..."
                value={formReagendar.motivo}
                onChange={(e) => setFormReagendar({ ...formReagendar, motivo: e.target.value })}
                className="text-xs h-8"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nova Data Início *
                </label>
                <Input
                  type="datetime-local"
                  value={formReagendar.nova_data_hora_inicio}
                  onChange={(e) =>
                    setFormReagendar({ ...formReagendar, nova_data_hora_inicio: e.target.value })
                  }
                  className="text-xs h-8 font-mono"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nova Data Término *
                </label>
                <Input
                  type="datetime-local"
                  value={formReagendar.nova_data_hora_fim}
                  onChange={(e) =>
                    setFormReagendar({ ...formReagendar, nova_data_hora_fim: e.target.value })
                  }
                  className="text-xs h-8 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Sala / Equipamento</label>
              <Input
                value={formReagendar.nova_sala_equipamento}
                onChange={(e) =>
                  setFormReagendar({ ...formReagendar, nova_sala_equipamento: e.target.value })
                }
                className="text-xs h-8"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalReagendarAberto(false)}
                disabled={salvandoReagendamento}
                className="text-xs"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoReagendamento}
                className="bg-sky-700 hover:bg-sky-600 text-white text-xs"
              >
                {salvandoReagendamento ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                )}
                Confirmar Reagendamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 4: CANCELAMENTO DE AGENDAMENTO */}
      {/* ==================================================================== */}
      <Dialog open={modalCancelarAgendaAberto} onOpenChange={setModalCancelarAgendaAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-red-700">
              <XCircle className="w-4 h-4 text-red-600" />
              Cancelar Agendamento RIS
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registra o motivo no histórico e reabre o exame na fila de solicitados.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmeterCancelarAgenda} className="space-y-3 text-xs">
            {erroCancelarAgenda && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                {erroCancelarAgenda}
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Motivo Formal do Cancelamento *
              </label>
              <Input
                placeholder="Ex: Não comparecimento do paciente, indisponibilidade técnica..."
                value={motivoCancelamentoAgenda}
                onChange={(e) => setMotivoCancelamentoAgenda(e.target.value)}
                className="text-xs h-8"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalCancelarAgendaAberto(false)}
                disabled={salvandoCancelamentoAgenda}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoCancelamentoAgenda}
                className="bg-red-700 hover:bg-red-600 text-white"
              >
                {salvandoCancelamentoAgenda ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 5: REGISTRO DE EXAME EXTERNO (PRESTADOR / ORIGEM) */}
      {/* ==================================================================== */}
      <Dialog open={modalExternoAberto} onOpenChange={setModalExternoAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <Building className="w-4 h-4 text-amber-600" />
              Registrar Exame por Prestador Credenciado (Externo)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registra realização externa sem falsear execução interna do hospital (7.4.3.4.c.ii).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmeterExterno} className="space-y-3 text-xs">
            {erroExterno && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                {erroExterno}
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Nome do Prestador Externo / Clínica Credenciada *
              </label>
              <Input
                placeholder="Ex: Centro de Diagnóstico por Imagem Guaporé..."
                value={formExterno.prestador_externo_nome}
                onChange={(e) =>
                  setFormExterno({ ...formExterno, prestador_externo_nome: e.target.value })
                }
                className="text-xs h-8"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  CNES do Prestador (Opcional)
                </label>
                <Input
                  placeholder="Ex: 2345678"
                  value={formExterno.prestador_externo_cnes}
                  onChange={(e) =>
                    setFormExterno({ ...formExterno, prestador_externo_cnes: e.target.value })
                  }
                  className="text-xs h-8 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">UF do Prestador</label>
                <Input
                  placeholder="Ex: RO"
                  value={formExterno.prestador_externo_uf}
                  onChange={(e) =>
                    setFormExterno({ ...formExterno, prestador_externo_uf: e.target.value })
                  }
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Observações Operacionais
              </label>
              <Input
                placeholder="Número da guia, protocolo externo ou detalhes do laudo..."
                value={formExterno.observacoes}
                onChange={(e) => setFormExterno({ ...formExterno, observacoes: e.target.value })}
                className="text-xs h-8"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalExternoAberto(false)}
                disabled={salvandoExterno}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoExterno}
                className="bg-amber-700 hover:bg-amber-600 text-white"
              >
                {salvandoExterno ? 'Registrando...' : 'Confirmar Execução Externa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 6: APLICAR MODELO DE LAUDO (GERA APENAS RASCUNHO) */}
      {/* ==================================================================== */}
      <Dialog open={modalModeloAberto} onOpenChange={setModalModeloAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <FileText className="w-4 h-4 text-indigo-700" />
              Aplicar Modelo como Rascunho
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Gera rascunho de texto para revisão humana; proibida liberação automática de laudo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            {erroAplicarModelo && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700">
                {erroAplicarModelo}
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Selecione o Modelo Padronizado:
              </label>
              <Select value={modeloSelecionadoId} onValueChange={setModeloSelecionadoId}>
                <SelectTrigger className="text-xs h-8 bg-white">
                  <SelectValue placeholder="Selecione o modelo cadastrado" />
                </SelectTrigger>
                <SelectContent>
                  {modelosLaudo
                    .filter((m) => m.ativo)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.titulo} ({m.modalidade.toUpperCase()} - v{m.versao})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {modeloSelecionadoId && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Prévia do Texto do Modelo:
                </span>
                <p className="text-slate-800 font-mono text-[11px] whitespace-pre-wrap">
                  {modelosLaudo.find((m) => m.id === modeloSelecionadoId)?.texto_padrao}
                </p>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalModeloAberto(false)}
                disabled={aplicandoModelo}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSubmeterAplicarModelo}
                disabled={aplicandoModelo || !modeloSelecionadoId}
                className="bg-indigo-700 hover:bg-indigo-600 text-white"
              >
                {aplicandoModelo ? 'Aplicando...' : 'Aplicar como Rascunho'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL EDITOR FORMATADO COMPLETO RIS (PARTE 2 / 7.4.3.4.b.i–iii) */}
      {/* ==================================================================== */}
      {exameEditorAtivo && (
        <EditorFormatadoRIS
          exame={exameEditorAtivo}
          aberto={modalEditorFormatadoAberto}
          onClose={() => {
            setModalEditorFormatadoAberto(false)
            setExameEditorAtivo(null)
          }}
          onSucessoPublicacao={() => {
            setModalEditorFormatadoAberto(false)
            setExameEditorAtivo(null)
            carregarFila()
          }}
        />
      )}

      {/* ==================================================================== */}
      {/* MODAL 7: REDIGIR / EMITIR LAUDO (REVISÃO HUMANA FORMAL - MANTIDO PARA FALLBACK) */}
      {/* ==================================================================== */}
      <Dialog open={modalLaudoRascunhoAberto} onOpenChange={setModalLaudoRascunhoAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <FileCheck className="w-4 h-4 text-emerald-700" />
              Revisão Humana e Emissão de Laudo Diagnóstico
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Revise o rascunho descritivo e registre o parecer conclusivo para liberação no PEP.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmeterLaudoFinal} className="space-y-3 text-xs">
            {erroLaudoFinal && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700">
                <strong>Atenção:</strong> {erroLaudoFinal}
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Parecer Conclusivo / Sumário do Resultado *
              </label>
              <Input
                placeholder="Ex: Exame dentro dos padrões da normalidade; ou Fratura distal de rádio sem desvio."
                value={sumarioResultadoLaudo}
                onChange={(e) => setSumarioResultadoLaudo(e.target.value)}
                className="text-xs h-8 font-semibold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Descrição Técnica do Laudo (Texto Formatado / Rascunho Revisado) *
              </label>
              <textarea
                value={textoRascunhoLaudo}
                onChange={(e) => setTextoRascunhoLaudo(e.target.value)}
                rows={10}
                className="w-full text-xs font-mono p-3 border border-slate-300 rounded focus:ring-2 focus:ring-sky-500 outline-none leading-relaxed"
                placeholder="Descreva detalhadamente a técnica, achados tomográficos/radiológicos e conclusões..."
                required
              />
            </div>

            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-950 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Responsável Clínico: <strong>{user?.name || 'Médico Radiologista'}</strong> (
                {user?.cargo || user?.role}) • A emissão do laudo integrará diretamente a linha do
                tempo assistencial (PEP).
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalLaudoRascunhoAberto(false)}
                disabled={salvandoLaudoFinal}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoLaudoFinal}
                className="bg-emerald-700 hover:bg-emerald-600 text-white"
              >
                {salvandoLaudoFinal ? 'Liberando...' : 'Liberar Laudo no Prontuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 8: CADASTRAR OU VERSIONAR MODELO DE LAUDO */}
      {/* ==================================================================== */}
      <Dialog open={modalNovoModeloAberto} onOpenChange={setModalNovoModeloAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-700" />
              {formNovoModelo.modelo_anterior_id
                ? 'Versionar Modelo de Laudo'
                : 'Novo Modelo de Laudo'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {formNovoModelo.modelo_anterior_id
                ? 'Cria uma nova versão do modelo inativando a anterior no catálogo.'
                : 'Cadastra modelo padronizado versionado por modalidade.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmeterNovoModelo} className="space-y-3 text-xs">
            {erroNovoModelo && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700">
                {erroNovoModelo}
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Título do Modelo *</label>
              <Input
                placeholder="Ex: Raio-X de Tórax PA/Perfil Padrão Normal"
                value={formNovoModelo.titulo}
                onChange={(e) => setFormNovoModelo({ ...formNovoModelo, titulo: e.target.value })}
                className="text-xs h-8"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Modalidade *</label>
                <Select
                  value={formNovoModelo.modalidade}
                  onValueChange={(val) =>
                    setFormNovoModelo({ ...formNovoModelo, modalidade: val as ModalidadeRIS })
                  }
                >
                  <SelectTrigger className="text-xs h-8 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rx">Raio-X (RX)</SelectItem>
                    <SelectItem value="tc">Tomografia (TC)</SelectItem>
                    <SelectItem value="ecg">Eletrocardiograma (ECG)</SelectItem>
                    <SelectItem value="us">Ultrassom (USG)</SelectItem>
                    <SelectItem value="outro">Outro Método</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Procedimento Nome *
                </label>
                <Input
                  placeholder="Ex: Radiografia de Tórax"
                  value={formNovoModelo.procedimento_nome}
                  onChange={(e) =>
                    setFormNovoModelo({ ...formNovoModelo, procedimento_nome: e.target.value })
                  }
                  className="text-xs h-8"
                  required
                />
              </div>
            </div>

            {formNovoModelo.modelo_anterior_id && (
              <div>
                <label className="font-semibold text-amber-900 block mb-1">
                  Motivo da Nova Versão (Obrigatório para Versionamento)
                </label>
                <Input
                  placeholder="Ex: Atualização do protocolo descritivo segundo recomendação da CBR..."
                  value={formNovoModelo.motivo_alteracao}
                  onChange={(e) =>
                    setFormNovoModelo({ ...formNovoModelo, motivo_alteracao: e.target.value })
                  }
                  className="text-xs h-8"
                />
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Texto Padrão do Laudo *
              </label>
              <textarea
                value={formNovoModelo.texto_padrao}
                onChange={(e) =>
                  setFormNovoModelo({ ...formNovoModelo, texto_padrao: e.target.value })
                }
                rows={6}
                className="w-full text-xs font-mono p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-sky-500 outline-none"
                placeholder="Insira o texto padronizado com campos e conclusões..."
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovoModeloAberto(false)}
                disabled={salvandoNovoModelo}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoNovoModelo}
                className="bg-sky-700 hover:bg-sky-600 text-white"
              >
                {salvandoNovoModelo ? 'Salvando...' : 'Salvar Modelo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 9: COMPROVANTE DE AGENDAMENTO SEGURO (TEXTO PURO, SEM INNERHTML) */}
      {/* ==================================================================== */}
      <Dialog open={modalComprovanteAberto} onOpenChange={setModalComprovanteAberto}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Printer className="w-4 h-4 text-sky-700" />
              Comprovante Oficial de Agendamento RIS
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Renderizado como texto puro em snapshot imutável para entrega ao paciente
              (7.4.3.4.c.ii).
            </DialogDescription>
          </DialogHeader>

          {comprovanteAtivo && (
            <div className="border border-slate-300 p-6 rounded-lg bg-white font-sans text-xs space-y-4 print:p-0 print:border-none">
              {/* Cabeçalho */}
              <div className="border-b-2 border-slate-800 pb-3 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">
                  SISTEMA ÚNICO DE SAÚDE (SUS) • PREFEITURA MUNICIPAL DE MIRANTE DA SERRA
                </span>
                <h3 className="text-base font-black uppercase text-slate-900">
                  COMPROVANTE DE AGENDAMENTO DE EXAME DE IMAGEM
                </h3>
                <span className="font-mono text-[10px] text-slate-600 block">
                  Identificador: {comprovanteAtivo.comprovante_id} • Emitido em:{' '}
                  {comprovanteAtivo.data_hora_emissao}
                </span>
              </div>

              {/* Paciente */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Paciente:</span>
                  <strong className="text-slate-900 uppercase">
                    {comprovanteAtivo.paciente_nome}
                  </strong>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>CNS: {comprovanteAtivo.paciente_cns}</span>
                  <span>CPF: {comprovanteAtivo.paciente_cpf}</span>
                </div>
              </div>

              {/* Detalhes do Exame e Horário */}
              <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Procedimento / Exame
                  </span>
                  <strong className="text-slate-900 text-sm">{comprovanteAtivo.tipo_exame}</strong>
                  <span className="text-[10px] text-slate-600 uppercase block">
                    Modalidade: {comprovanteAtivo.modalidade_ris}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Local / Sala
                  </span>
                  <strong className="text-slate-900 text-sm">
                    {comprovanteAtivo.sala_equipamento}
                  </strong>
                  <span className="text-[10px] text-slate-600 block">
                    Setor: {comprovanteAtivo.unidade_setor}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Horário Marcado
                  </span>
                  <strong className="text-sky-900 text-sm font-mono">
                    {comprovanteAtivo.data_hora_inicio}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Término Previsto
                  </span>
                  <strong className="text-slate-800 text-sm font-mono">
                    {comprovanteAtivo.data_hora_fim}
                  </strong>
                </div>
              </div>

              {/* Instruções de Preparo */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-950 space-y-1">
                <span className="text-[10px] uppercase font-bold block">
                  Orientações e Preparo ao Paciente:
                </span>
                <p className="leading-relaxed whitespace-pre-wrap">
                  {comprovanteAtivo.preparo_orientacoes}
                </p>
              </div>

              {comprovanteAtivo.motivo_reagendamento && (
                <div className="p-2 bg-slate-100 rounded text-[11px] text-slate-700">
                  <strong>Reagendamento:</strong> {comprovanteAtivo.motivo_reagendamento}
                </div>
              )}

              {/* Rodapé e Autenticação */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Operador Emissor: {comprovanteAtivo.emissor_nome}</span>
                <span>Hash Seguro: {comprovanteAtivo.seguranca_hash}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Imprimir Comprovante
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setModalComprovanteAberto(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Registro de Entrega Formal */}
      {modalEntregaAberto && exameParaEntrega && (
        <ModalEntregaLaudoRIS
          aberto={modalEntregaAberto}
          onOpenChange={(ab) => {
            setModalEntregaAberto(ab)
            if (!ab) setExameParaEntrega(null)
          }}
          exame={exameParaEntrega}
          onSucesso={() => {
            carregarFila()
          }}
        />
      )}
    </div>
  )
}
