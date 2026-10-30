import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  ApacSolicitacao,
  ApacFaixaSequencia,
  TipoLaudoApac,
  ModalidadeApac,
  StatusSolicitacaoApac,
  Paciente,
  Internacao,
  FichaProntoAtendimento,
  RascunhoApacDoPep,
  CriarSolicitacaoApacParams,
  RetificarSolicitacaoApacParams,
  CriarFaixaSequenciaParams,
} from '@/types/hospital'
import {
  listarSolicitacoesApacPaginado,
  obterSolicitacaoApacPorId,
  criarSolicitacaoApac,
  retificarSolicitacaoApac,
  cancelarSolicitacaoApac,
  listarFaixasSequenciasApac,
  cadastrarFaixaSequenciaApac,
  gerarRascunhoApacDoPep,
  reservarNumeroApacTransacional,
} from '@/services/apac'
import { listarPacientes } from '@/services/cadastros'
import { listarInternacoes } from '@/services/internacoes'
import { listarAtendimentosPA } from '@/services/prontoAtendimento'
import { mascararCPF, mascararCNS } from '@/services/identificacaoPaciente'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  FileText,
  Search,
  Filter,
  PlusCircle,
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck2,
  Calendar,
  User,
  Building,
  Layers,
  Sparkles,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Hash,
  Stethoscope,
  Lock,
  ArrowRight,
} from 'lucide-react'

const TIPOS_LAUDO_OPCOES: { valor: TipoLaudoApac; rotulo: string }[] = [
  { valor: 'laudo_geral', rotulo: 'Laudo Geral' },
  { valor: 'medicamentos', rotulo: 'Medicamentos' },
  { valor: 'nefrologia', rotulo: 'Nefrologia' },
  { valor: 'quimioterapia', rotulo: 'Quimioterapia' },
  { valor: 'radioterapia', rotulo: 'Radioterapia' },
  { valor: 'bariatrica', rotulo: 'Cirurgia Bariátrica' },
]

const MODALIDADES_OPCOES: { valor: ModalidadeApac; rotulo: string }[] = [
  { valor: 'inicial', rotulo: 'Inicial' },
  { valor: 'continuidade', rotulo: 'Continuidade' },
  { valor: 'sem_continuidade', rotulo: 'Sem Continuidade' },
]

interface ApacViewProps {
  onNavegarSAME?: (pacienteId?: string) => void
}

export const ApacView: React.FC<ApacViewProps> = ({ onNavegarSAME }) => {
  const { user, temPermissao } = useAuth()
  const { toast } = useToast()

  // Abas do módulo:
  // 'solicitacoes' | 'nova_solicitacao' | 'rascunho_pep' | 'detalhe' | 'faixas'
  const [abaAtiva, setAbaAtiva] = useState<
    'solicitacoes' | 'nova_solicitacao' | 'rascunho_pep' | 'detalhe' | 'faixas'
  >('solicitacoes')

  // Controle de permissões do operador
  const ehRecepcao = user?.role === 'recepcao'
  const ehOperadorFaixas = temPermissao(['admin', 'gestor'])
  const podeEmitir = temPermissao(['admin', 'gestor', 'profissional'])

  // Lista de Solicitações
  const [solicitacoes, setSolicitacoes] = useState<ApacSolicitacao[]>([])
  const [carregandoLista, setCarregandoLista] = useState<boolean>(false)
  const [filtroTipo, setFiltroTipo] = useState<TipoLaudoApac | 'todos'>('todos')
  const [filtroModalidade, setFiltroModalidade] = useState<ModalidadeApac | 'todos'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<StatusSolicitacaoApac | 'todos'>('todos')
  const [buscaTexto, setBuscaTexto] = useState<string>('')
  const [buscaDebounced, setBuscaDebounced] = useState<string>('')
  const [pagina, setPagina] = useState<number>(1)
  const [porPagina] = useState<number>(20)
  const [totalPaginas, setTotalPaginas] = useState<number>(1)
  const [totalItens, setTotalItens] = useState<number>(0)

  // Detalhe de Solicitação
  const [solicitacaoAtiva, setSolicitacaoAtiva] = useState<ApacSolicitacao | null>(null)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState<boolean>(false)

  // Modal / Formulário de Retificação e Cancelamento
  const [exibirModalRetificar, setExibirModalRetificar] = useState<boolean>(false)
  const [motivoRetificacao, setMotivoRetificacao] = useState<string>('')
  const [cidPrincipalRetificacao, setCidPrincipalRetificacao] = useState<string>('')
  const [prestadorRetificacao, setPrestadorRetificacao] = useState<string>('')
  const [processandoRetificacao, setProcessandoRetificacao] = useState<boolean>(false)

  const [exibirModalCancelar, setExibirModalCancelar] = useState<boolean>(false)
  const [motivoCancelamento, setMotivoCancelamento] = useState<string>('')
  const [processandoCancelamento, setProcessandoCancelamento] = useState<boolean>(false)

  // Reserva de número transacional (ação administrativa)
  const [processandoReserva, setProcessandoReserva] = useState<boolean>(false)

  // Gestão de Faixas (operador autorizado)
  const [faixas, setFaixas] = useState<ApacFaixaSequencia[]>([])
  const [carregandoFaixas, setCarregandoFaixas] = useState<boolean>(false)
  const [anoFiltroFaixas, setAnoFiltroFaixas] = useState<number>(new Date().getFullYear())
  const [exibirModalNovaFaixa, setExibirModalNovaFaixa] = useState<boolean>(false)
  const [formFaixaAno, setFormFaixaAno] = useState<number>(new Date().getFullYear())
  const [formFaixaUf, setFormFaixaUf] = useState<string>('RO')
  const [formFaixaTipo, setFormFaixaTipo] = useState<TipoLaudoApac>('laudo_geral')
  const [formFaixaInicial, setFormFaixaInicial] = useState<number>(1000)
  const [formFaixaFinal, setFormFaixaFinal] = useState<number>(5000)
  const [formFaixaValidadeIni, setFormFaixaValidadeIni] = useState<string>(
    new Date().toISOString().slice(0, 10),
  )
  const [formFaixaValidadeFim, setFormFaixaValidadeFim] = useState<string>(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [formFaixaObs, setFormFaixaObs] = useState<string>('')
  const [salvandoFaixa, setSalvandoFaixa] = useState<boolean>(false)

  // Pacientes e Prontuários para seleção
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [carregandoPacientes, setCarregandoPacientes] = useState<boolean>(false)
  const [pacienteSelecionadoId, setPacienteSelecionadoId] = useState<string>('')

  // Atendimentos do paciente selecionado (PEP/PA/Internações)
  const [internacoesPaciente, setInternacoesPaciente] = useState<Internacao[]>([])
  const [atendimentosPaPaciente, setAtendimentosPaPaciente] = useState<FichaProntoAtendimento[]>([])
  const [carregandoAtendimentosPep, setCarregandoAtendimentosPep] = useState<boolean>(false)

  // Rascunho vindo do PEP
  const [atendimentoPepSelecionadoTipo, setAtendimentoPepSelecionadoTipo] = useState<
    'nenhum' | 'pa' | 'internacao'
  >('nenhum')
  const [atendimentoPepId, setAtendimentoPepId] = useState<string>('')
  const [rascunhoGerado, setRascunhoGerado] = useState<RascunhoApacDoPep | null>(null)

  // Formulário de Criação de Solicitação
  const [formPacienteId, setFormPacienteId] = useState<string>('')
  const [formInternacaoId, setFormInternacaoId] = useState<string>('')
  const [formAtendimentoPaId, setFormAtendimentoPaId] = useState<string>('')
  const [formUnidadeSolicitante, setFormUnidadeSolicitante] = useState<string>(
    'Hospital Municipal de Mirante da Serra',
  )
  const [formProfissionalNome, setFormProfissionalNome] = useState<string>(user?.name || '')
  const [formDataSolicitacao, setFormDataSolicitacao] = useState<string>(
    new Date().toISOString().slice(0, 10),
  )
  const [formNumeroLaudo, setFormNumeroLaudo] = useState<string>('')
  const [formTipoLaudo, setFormTipoLaudo] = useState<TipoLaudoApac>('laudo_geral')
  const [formModalidade, setFormModalidade] = useState<ModalidadeApac>('inicial')
  const [formApacAnteriorNumero, setFormApacAnteriorNumero] = useState<string>('')
  const [formApacAnteriorRef, setFormApacAnteriorRef] = useState<string>('')
  const [formPrestadorNome, setFormPrestadorNome] = useState<string>(
    'Centro de Especialidades e Alta Complexidade SUS',
  )
  const [formPrestadorCnes, setFormPrestadorCnes] = useState<string>('2498765')
  const [formCidPrincipal, setFormCidPrincipal] = useState<string>('')
  const [formCidSecundario, setFormCidSecundario] = useState<string>('')
  const [formCidCausasAssociadas, setFormCidCausasAssociadas] = useState<string>('')
  const [formValidadeInicial, setFormValidadeInicial] = useState<string>(
    new Date().toISOString().slice(0, 10),
  )
  const [formValidadeFinal, setFormValidadeFinal] = useState<string>(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 3)
    return d.toISOString().slice(0, 10)
  })

  // Estados de Envio / Idempotência e Preservação de Texto
  const [enviandoSolicitacao, setEnviandoSolicitacao] = useState<boolean>(false)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [avisoReenvio, setAvisoReenvio] = useState<string | null>(null)
  const [idempotencyKeyAtual, setIdempotencyKeyAtual] = useState<string>('')

  // Refs de controle de sequência contra respostas atrasadas em voo
  const seqListaRef = useRef<number>(0)
  const seqPacienteRef = useRef<number>(0)

  // Debounce do campo de busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(buscaTexto.trim())
      setPagina(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [buscaTexto])

  // Carga inicial dos pacientes para seleção rápida
  useEffect(() => {
    async function carregar() {
      setCarregandoPacientes(true)
      try {
        const lista = await listarPacientes()
        setPacientes(lista)
      } catch (err) {
        console.error('Erro ao carregar pacientes:', err)
      } finally {
        setCarregandoPacientes(false)
      }
    }
    carregar()
  }, [])

  // Carga das solicitações paginadas com controle de sequência
  const carregarSolicitacoes = useCallback(async () => {
    seqListaRef.current += 1
    const seqMomento = seqListaRef.current

    setCarregandoLista(true)
    try {
      const res = await listarSolicitacoesApacPaginado({
        tipo_laudo: filtroTipo,
        modalidade: filtroModalidade,
        status: filtroStatus,
        busca: buscaDebounced || undefined,
        pagina,
        porPagina,
      })

      // Se outra requisição foi disparada, descarta
      if (seqMomento !== seqListaRef.current) return

      setSolicitacoes(res.items)
      setTotalPaginas(res.totalPages || 1)
      setTotalItens(res.totalItems || 0)
    } catch (err: any) {
      if (seqMomento !== seqListaRef.current) return
      toast({
        title: 'Erro ao listar APACs',
        description: err.message || 'Falha na comunicação com o servidor.',
        variant: 'destructive',
      })
    } finally {
      if (seqMomento === seqListaRef.current) {
        setCarregandoLista(false)
      }
    }
  }, [filtroTipo, filtroModalidade, filtroStatus, buscaDebounced, pagina, porPagina, toast])

  useEffect(() => {
    carregarSolicitacoes()
  }, [carregarSolicitacoes])

  // Carga das faixas para operador
  const carregarFaixas = useCallback(async () => {
    if (!ehOperadorFaixas) return
    setCarregandoFaixas(true)
    try {
      const lista = await listarFaixasSequenciasApac(anoFiltroFaixas)
      setFaixas(lista)
    } catch (err: any) {
      toast({
        title: 'Erro ao listar faixas',
        description: err.message || 'Falha ao buscar faixas de sequência.',
        variant: 'destructive',
      })
    } finally {
      setCarregandoFaixas(false)
    }
  }, [ehOperadorFaixas, anoFiltroFaixas, toast])

  useEffect(() => {
    if (abaAtiva === 'faixas') {
      carregarFaixas()
    }
  }, [abaAtiva, carregarFaixas])

  // Troca de paciente no rascunho PEP com descarte de voo
  const handleSelecionarPacientePep = async (pId: string) => {
    setPacienteSelecionadoId(pId)
    setAtendimentoPepSelecionadoTipo('nenhum')
    setAtendimentoPepId('')
    setRascunhoGerado(null)

    if (!pId) {
      setInternacoesPaciente([])
      setAtendimentosPaPaciente([])
      return
    }

    seqPacienteRef.current += 1
    const seqMomento = seqPacienteRef.current

    setCarregandoAtendimentosPep(true)
    try {
      const [internacoes, atendimentosPa] = await Promise.all([
        listarInternacoes(),
        listarAtendimentosPA(),
      ])

      // Se o usuário trocou de paciente enquanto a requisição estava em voo, descarta resposta
      if (seqMomento !== seqPacienteRef.current) return

      const doPacienteInter = internacoes.filter((i) => i.paciente === pId)
      const doPacientePa = atendimentosPa.filter((pa) => pa.paciente === pId)

      setInternacoesPaciente(doPacienteInter)
      setAtendimentosPaPaciente(doPacientePa)
    } catch (err: any) {
      if (seqMomento !== seqPacienteRef.current) return
      toast({
        title: 'Aviso',
        description: 'Não foi possível buscar o histórico de atendimentos clínicos deste paciente.',
        variant: 'destructive',
      })
    } finally {
      if (seqMomento === seqPacienteRef.current) {
        setCarregandoAtendimentosPep(false)
      }
    }
  }

  // Gerar rascunho de pré-preenchimento vindo do PEP
  const handleGerarRascunhoPep = () => {
    const pacienteObj = pacientes.find((p) => p.id === pacienteSelecionadoId)
    if (!pacienteObj) {
      toast({
        title: 'Selecione um Paciente',
        description: 'É necessário selecionar o paciente ativo do PEP para gerar o rascunho.',
        variant: 'destructive',
      })
      return
    }

    let interObj: Internacao | undefined
    let paObj: FichaProntoAtendimento | undefined

    if (atendimentoPepSelecionadoTipo === 'internacao' && atendimentoPepId) {
      interObj = internacoesPaciente.find((i) => i.id === atendimentoPepId)
    } else if (atendimentoPepSelecionadoTipo === 'pa' && atendimentoPepId) {
      paObj = atendimentosPaPaciente.find((p) => p.id === atendimentoPepId)
    }

    const rascunho = gerarRascunhoApacDoPep({
      paciente: pacienteObj,
      internacao: interObj,
      atendimentoPa: paObj,
      profissionalNome: user?.name,
      profissionalId: user?.id,
      unidadeSolicitante: 'Hospital Municipal de Mirante da Serra',
    })

    setRascunhoGerado(rascunho)

    // Preenche o formulário para revisão profissional humana
    setFormPacienteId(rascunho.paciente)
    setFormInternacaoId(rascunho.internacao || '')
    setFormAtendimentoPaId(rascunho.atendimento_pa || '')
    setFormUnidadeSolicitante(rascunho.unidade_solicitante)
    setFormProfissionalNome(rascunho.profissional_solicitante_nome)
    setFormDataSolicitacao(rascunho.data_solicitacao)
    setFormNumeroLaudo(rascunho.numero_laudo_sugerido)
    setFormTipoLaudo(rascunho.tipo_laudo_padrao)
    setFormModalidade(rascunho.modalidade_padrao)
    setFormPrestadorNome(rascunho.executante_prestador_sugerido)
    setFormCidPrincipal(rascunho.cid_principal)
    setFormCidSecundario(rascunho.cid_secundario || '')
    setFormValidadeInicial(rascunho.validade_inicial_sugerida)
    setFormValidadeFinal(rascunho.validade_final_sugerida)

    toast({
      title: 'Rascunho Gerado com Sucesso',
      description:
        'Dados clínicos e cadastrais pré-preenchidos. Revise os diagnósticos antes de emitir a solicitação.',
    })
  }

  // Aplicar rascunho e abrir formulário de solicitação
  const handleRevisarEEmitirRascunho = () => {
    if (!rascunhoGerado) return
    setAbaAtiva('nova_solicitacao')
  }

  // Visualizar Detalhes
  const handleVerDetalhes = async (id: string) => {
    setCarregandoDetalhe(true)
    setSolicitacaoAtiva(null)
    setAbaAtiva('detalhe')
    try {
      const registro = await obterSolicitacaoApacPorId(id)
      setSolicitacaoAtiva(registro)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar detalhe',
        description: err.message || 'Solicitação não localizada.',
        variant: 'destructive',
      })
      setAbaAtiva('solicitacoes')
    } finally {
      setCarregandoDetalhe(false)
    }
  }

  // Envio de Nova Solicitação com Idempotência Estável
  const handleCriarSolicitacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (enviandoSolicitacao) return

    if (!podeEmitir) {
      toast({
        title: 'Acesso Restrito',
        description: 'Perfil de recepção possui apenas permissão de consulta administrativa.',
        variant: 'destructive',
      })
      return
    }

    if (!formPacienteId) {
      setErroEnvio('Selecione o paciente.')
      return
    }
    if (!formNumeroLaudo.trim()) {
      setErroEnvio('Informe o número do laudo médico/multiprofissional.')
      return
    }
    if (!formCidPrincipal.trim()) {
      setErroEnvio('O CID-10 Principal é obrigatório.')
      return
    }
    if (formModalidade === 'continuidade' && !formApacAnteriorNumero.trim()) {
      setErroEnvio('Para modalidade "Continuidade", informe o número da APAC anterior.')
      return
    }

    setEnviandoSolicitacao(true)
    setErroEnvio(null)
    setAvisoReenvio(null)

    // Reutiliza ou gera chave de idempotência
    const chave =
      idempotencyKeyAtual ||
      `apac_ui_${formPacienteId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    if (!idempotencyKeyAtual) {
      setIdempotencyKeyAtual(chave)
    }

    const params: CriarSolicitacaoApacParams = {
      paciente: formPacienteId,
      internacao: formInternacaoId || undefined,
      atendimento_pa: formAtendimentoPaId || undefined,
      unidade_solicitante: formUnidadeSolicitante.trim(),
      profissional_solicitante: user?.id,
      profissional_solicitante_nome: formProfissionalNome.trim() || user?.name || 'Profissional',
      data_solicitacao: formDataSolicitacao,
      numero_laudo: formNumeroLaudo.trim(),
      tipo_laudo: formTipoLaudo,
      modalidade: formModalidade,
      apac_anterior_numero: formApacAnteriorNumero.trim() || undefined,
      apac_anterior_ref: formApacAnteriorRef || undefined,
      executante_prestador_nome: formPrestadorNome.trim(),
      executante_cnes: formPrestadorCnes.trim() || undefined,
      cid_principal: formCidPrincipal.trim().toUpperCase(),
      cid_secundario: formCidSecundario.trim().toUpperCase() || undefined,
      cid_causas_associadas: formCidCausasAssociadas.trim().toUpperCase() || undefined,
      validade_inicial: formValidadeInicial,
      validade_final: formValidadeFinal,
      idempotency_key: chave,
    }

    try {
      const criada = await criarSolicitacaoApac(params)
      toast({
        title: 'Solicitação de APAC Emitida',
        description: `Laudo ${criada.numero_laudo} registrado com sucesso para análise e autorização.`,
      })

      // Limpar formulário e chave
      setIdempotencyKeyAtual('')
      setAbaAtiva('detalhe')
      setSolicitacaoAtiva(criada)
      carregarSolicitacoes()
    } catch (err: any) {
      const msg = err?.message || 'Falha ao registrar solicitação de APAC.'
      if (msg.includes('CONFLITO_IDEMPOTENCIA') || msg.includes('IDEMPOTENCY_PAYLOAD_CONFLICT')) {
        setErroEnvio(
          'Conflito de envio: esta chave foi protocolada anteriormente com parâmetros divergentes. Seu texto foi preservado.',
        )
        setAvisoReenvio(
          'Para forçar um novo protocolo, gere uma nova chave ou ajuste os campos e tente novamente.',
        )
      } else {
        setErroEnvio(`${msg} — Os dados preenchidos foram preservados para retentativa segura.`)
        setAvisoReenvio(
          'A mesma chave de idempotência será enviada no retry para evitar duplicidade de registro.',
        )
      }
    } finally {
      setEnviandoSolicitacao(false)
    }
  }

  // Retificação de Solicitação
  const handleConfirmarRetificacao = async () => {
    if (!solicitacaoAtiva) return
    if (!motivoRetificacao.trim() || motivoRetificacao.trim().length < 5) {
      toast({
        title: 'Motivo Obrigatório',
        description: 'A justificativa de retificação exige no mínimo 5 caracteres.',
        variant: 'destructive',
      })
      return
    }

    setProcessandoRetificacao(true)
    try {
      const params: RetificarSolicitacaoApacParams = {
        solicitacao_original_id: solicitacaoAtiva.id,
        motivo_retificacao: motivoRetificacao.trim(),
        cid_principal: cidPrincipalRetificacao.trim() || undefined,
        executante_prestador_nome: prestadorRetificacao.trim() || undefined,
      }

      const retificada = await retificarSolicitacaoApac(params)
      toast({
        title: 'Retificação Registrada',
        description: `Nova versão (${retificada.numero_versao}) vinculada ao histórico original com sucesso.`,
      })

      setExibirModalRetificar(false)
      setMotivoRetificacao('')
      setSolicitacaoAtiva(retificada)
      carregarSolicitacoes()
    } catch (err: any) {
      toast({
        title: 'Erro na Retificação',
        description: err.message || 'Falha ao retificar solicitação de APAC.',
        variant: 'destructive',
      })
    } finally {
      setProcessandoRetificacao(false)
    }
  }

  // Cancelamento de Solicitação
  const handleConfirmarCancelamento = async () => {
    if (!solicitacaoAtiva) return
    if (!motivoCancelamento.trim() || motivoCancelamento.trim().length < 5) {
      toast({
        title: 'Motivo Obrigatório',
        description: 'O cancelamento exige justificativa formal com no mínimo 5 caracteres.',
        variant: 'destructive',
      })
      return
    }

    setProcessandoCancelamento(true)
    try {
      const cancelada = await cancelarSolicitacaoApac(
        solicitacaoAtiva.id,
        motivoCancelamento.trim(),
      )
      toast({
        title: 'APAC Cancelada',
        description: 'A solicitação foi cancelada e seu número não será reutilizado.',
      })

      setExibirModalCancelar(false)
      setMotivoCancelamento('')
      setSolicitacaoAtiva(cancelada)
      carregarSolicitacoes()
    } catch (err: any) {
      toast({
        title: 'Erro ao Cancelar',
        description: err.message || 'Não foi possível cancelar a solicitação.',
        variant: 'destructive',
      })
    } finally {
      setProcessandoCancelamento(false)
    }
  }

  // Reserva de Número Transacional
  const handleReservarNumeroTransacional = async () => {
    if (!solicitacaoAtiva) return
    if (!ehOperadorFaixas) {
      toast({
        title: 'Acesso Restrito',
        description:
          'Apenas o operador municipal autorizado pode realizar a atribuição de numeração da faixa.',
        variant: 'destructive',
      })
      return
    }

    setProcessandoReserva(true)
    try {
      const res = await reservarNumeroApacTransacional({
        solicitacao_id: solicitacaoAtiva.id,
        idempotency_key: `reserva_${solicitacaoAtiva.id}_${Date.now()}`,
        ano: new Date().getFullYear(),
        uf: 'RO',
        tipo_laudo: solicitacaoAtiva.tipo_laudo,
      })

      toast({
        title: 'Número Atribuído com Sucesso',
        description: `Número APAC ${res.numero_apac} vinculado atomicamente à solicitação.`,
      })

      // Recarrega detalhe
      const atualizada = await obterSolicitacaoApacPorId(solicitacaoAtiva.id)
      if (atualizada) setSolicitacaoAtiva(atualizada)
      carregarSolicitacoes()
    } catch (err: any) {
      toast({
        title: 'Falha na Atribuição',
        description: err.message || 'Faixa não cadastrada ou esgotada para o tipo solicitado.',
        variant: 'destructive',
      })
    } finally {
      setProcessandoReserva(false)
    }
  }

  // Cadastro de Faixa pelo Operador Autorizado
  const handleCadastrarFaixa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ehOperadorFaixas) return

    if (formFaixaInicial >= formFaixaFinal) {
      toast({
        title: 'Intervalo Inválido',
        description: 'A faixa inicial deve ser estritamente menor que a faixa final.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoFaixa(true)
    try {
      const params: CriarFaixaSequenciaParams = {
        ano: formFaixaAno,
        uf: formFaixaUf.trim().toUpperCase(),
        tipo_apac: formFaixaTipo,
        faixa_inicial: Number(formFaixaInicial),
        faixa_final: Number(formFaixaFinal),
        validade_inicial: formFaixaValidadeIni,
        validade_final: formFaixaValidadeFim,
        ativo: true,
        observacoes: formFaixaObs.trim() || undefined,
      }

      const nova = await cadastrarFaixaSequenciaApac(params)
      toast({
        title: 'Faixa Cadastrada',
        description: `Sequência ${nova.faixa_inicial} a ${nova.faixa_final} (${nova.tipo_apac}) habilitada para o ano ${nova.ano}.`,
      })

      setExibirModalNovaFaixa(false)
      setFormFaixaObs('')
      carregarFaixas()
    } catch (err: any) {
      toast({
        title: 'Erro ao Cadastrar Faixa',
        description: err.message || 'Falha ao registrar sequência no banco.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoFaixa(false)
    }
  }

  // Badge de Status da Solicitação
  const renderBadgeStatus = (status: StatusSolicitacaoApac) => {
    switch (status) {
      case 'autorizada':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Autorizada
          </Badge>
        )
      case 'em_analise':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1">
            <Layers className="w-3 h-3 text-blue-600" /> Em Análise
          </Badge>
        )
      case 'cancelada':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" /> Cancelada
          </Badge>
        )
      case 'solicitada':
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Solicitada
          </Badge>
        )
    }
  }

  // Nome legível do tipo de laudo
  const getRotuloTipoLaudo = (tipo: TipoLaudoApac): string => {
    const item = TIPOS_LAUDO_OPCOES.find((t) => t.valor === tipo)
    return item ? item.rotulo : tipo
  }

  return (
    <div className="space-y-6">
      {/* 1. CABEÇALHO DO MÓDULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white shadow">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Gerenciamento de APACs — Alta Complexidade
                </h1>
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                >
                  Seção 7.4.4.4 SUS
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Laudos, modalidades, sequências por ano/UF/tipo, pré-preenchimento no PEP e reserva
                atômica (Mirante da Serra - RO).
              </p>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO DE SUB-ABAS */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
          <Button
            size="sm"
            variant={abaAtiva === 'solicitacoes' ? 'default' : 'ghost'}
            className={
              abaAtiva === 'solicitacoes'
                ? 'bg-blue-600 text-white text-xs h-8 shadow-sm'
                : 'text-slate-600 text-xs h-8'
            }
            onClick={() => setAbaAtiva('solicitacoes')}
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Solicitações ({totalItens})
          </Button>

          {podeEmitir && (
            <Button
              size="sm"
              variant={abaAtiva === 'rascunho_pep' ? 'default' : 'ghost'}
              className={
                abaAtiva === 'rascunho_pep'
                  ? 'bg-blue-600 text-white text-xs h-8 shadow-sm'
                  : 'text-slate-600 text-xs h-8'
              }
              onClick={() => setAbaAtiva('rascunho_pep')}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Rascunho do PEP
            </Button>
          )}

          {podeEmitir && (
            <Button
              size="sm"
              variant={abaAtiva === 'nova_solicitacao' ? 'default' : 'ghost'}
              className={
                abaAtiva === 'nova_solicitacao'
                  ? 'bg-blue-600 text-white text-xs h-8 shadow-sm'
                  : 'text-slate-600 text-xs h-8'
              }
              onClick={() => setAbaAtiva('nova_solicitacao')}
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Nova Solicitação
            </Button>
          )}

          {ehOperadorFaixas && (
            <Button
              size="sm"
              variant={abaAtiva === 'faixas' ? 'default' : 'ghost'}
              className={
                abaAtiva === 'faixas'
                  ? 'bg-blue-600 text-white text-xs h-8 shadow-sm'
                  : 'text-slate-600 text-xs h-8'
              }
              onClick={() => setAbaAtiva('faixas')}
            >
              <Hash className="w-3.5 h-3.5 mr-1.5" /> Gestão de Faixas
            </Button>
          )}
        </div>
      </div>

      {/* AVISO REGULATÓRIO E RESTRIÇÃO DE RECEPÇÃO */}
      {ehRecepcao && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Acesso Administrativo Mínimo:</strong> Seu perfil de recepção possui permissão
            exclusivamente para consulta e acompanhamento de status de solicitações de APAC. Emissão
            de laudos, reserva e retificação exigem perfil médico/gestor autorizado.
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: LISTAGEM DE SOLICITAÇÕES PAGINADAS COM MÁSCARA LGPD */}
      {/* ========================================================================= */}
      {abaAtiva === 'solicitacoes' && (
        <div className="space-y-4">
          {/* BARRA DE FILTROS E BUSCA */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <Input
                    placeholder="Buscar por laudo, APAC, CID, solicitante ou executante..."
                    value={buscaTexto}
                    onChange={(e) => setBuscaTexto(e.target.value)}
                    className="text-xs pl-8 h-8"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    className="h-8 px-2 text-xs border border-slate-300 rounded-md bg-white font-medium"
                    value={filtroTipo}
                    onChange={(e) => {
                      setFiltroTipo(e.target.value as any)
                      setPagina(1)
                    }}
                  >
                    <option value="todos">Todos os Tipos de Laudo</option>
                    {TIPOS_LAUDO_OPCOES.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.rotulo}
                      </option>
                    ))}
                  </select>

                  <select
                    className="h-8 px-2 text-xs border border-slate-300 rounded-md bg-white font-medium"
                    value={filtroModalidade}
                    onChange={(e) => {
                      setFiltroModalidade(e.target.value as any)
                      setPagina(1)
                    }}
                  >
                    <option value="todos">Todas Modalidades</option>
                    {MODALIDADES_OPCOES.map((m) => (
                      <option key={m.valor} value={m.valor}>
                        {m.rotulo}
                      </option>
                    ))}
                  </select>

                  <select
                    className="h-8 px-2 text-xs border border-slate-300 rounded-md bg-white font-medium"
                    value={filtroStatus}
                    onChange={(e) => {
                      setFiltroStatus(e.target.value as any)
                      setPagina(1)
                    }}
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="solicitada">Solicitada</option>
                    <option value="em_analise">Em Análise</option>
                    <option value="autorizada">Autorizada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={carregarSolicitacoes}
                  disabled={carregandoLista}
                  className="text-xs h-8"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 mr-1 ${carregandoLista ? 'animate-spin' : ''}`}
                  />
                  Atualizar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* TABELA PAGINADA DE SOLICITAÇÕES */}
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Laudo / APAC</th>
                    <th className="py-3 px-4">Paciente (LGPD)</th>
                    <th className="py-3 px-4">Tipo & Modalidade</th>
                    <th className="py-3 px-4">CID Principal</th>
                    <th className="py-3 px-4">Validade SUS</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {carregandoLista ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                        Carregando solicitações de APAC...
                      </td>
                    </tr>
                  ) : solicitacoes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        Nenhuma solicitação de APAC localizada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    solicitacoes.map((item) => {
                      const pac = item.expand?.paciente
                      const snap = item.dados_paciente_snapshot
                      const nomePac = snap?.nome || pac?.nome || 'Paciente não identificado'
                      const cnsMasc =
                        snap?.cns || (pac?.cartao_sus ? mascararCNS(pac.cartao_sus) : '—')
                      const cpfMasc = snap?.cpf || (pac?.cpf ? mascararCPF(pac.cpf) : '')

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{item.numero_laudo}</div>
                            {item.numero_apac ? (
                              <div className="text-[11px] font-mono text-blue-700 font-bold">
                                APAC: {item.numero_apac}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 italic">
                                Número pendente de atribuição
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">{nomePac}</div>
                            <div className="text-[11px] text-slate-500">
                              CNS: <span className="font-mono">{cnsMasc}</span>
                              {cpfMasc ? ` • CPF: ${cpfMasc}` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">
                              {getRotuloTipoLaudo(item.tipo_laudo)}
                            </div>
                            <div className="text-[11px] text-slate-500 capitalize">
                              {item.modalidade.replace('_', ' ')}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className="font-mono text-slate-700 bg-slate-50"
                            >
                              {item.cid_principal}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>{item.validade_inicial}</div>
                            <div className="text-[10px] text-slate-400">
                              até {item.validade_final}
                            </div>
                          </td>
                          <td className="py-3 px-4">{renderBadgeStatus(item.status)}</td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerDetalhes(item.id)}
                              className="text-xs h-7 px-2.5 text-blue-700 border-blue-200 hover:bg-blue-50"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Detalhes
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* BARRA DE PAGINAÇÃO */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <div>
                Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong> • Total de{' '}
                <strong>{totalItens}</strong> registros
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagina <= 1 || carregandoLista}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagina >= totalPaginas || carregandoLista}
                  onClick={() => setPagina((p) => p + 1)}
                  className="h-7 px-2"
                >
                  Próxima <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: RASCUNHO GERADO NO PEP (SEM AUTOAUTORIZAÇÃO - APENAS PRÉ-PREENCHIMENTO) */}
      {/* ========================================================================= */}
      {abaAtiva === 'rascunho_pep' && podeEmitir && (
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-base font-bold text-slate-900">
                  Emissão Direta no Prontuário Eletrônico do Paciente (PEP)
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Conforme Seção 7.4.4.4.c.i: Pré-preenchimento automático dos dados clínicos e
                cadastrais do paciente ativo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ALERTA DE SEGURANÇA OBRIGATÓRIO: NUNCA AUTOAUTORIZAR */}
              <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/70 text-blue-900 text-xs flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Revisão Profissional Obrigatória:</strong> Este mecanismo gera
                  estritamente um <em>rascunho de pré-preenchimento</em> para conferência e
                  assinatura pelo profissional de saúde no ato da consulta. Nenhuma autorização de
                  procedimento de alta complexidade é concedida automaticamente.
                </div>
              </div>

              {/* SELEÇÃO DO PACIENTE E ATENDIMENTO DO PEP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Paciente Ativo no PEP:
                  </label>
                  <select
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-900"
                    value={pacienteSelecionadoId}
                    onChange={(e) => handleSelecionarPacientePep(e.target.value)}
                  >
                    <option value="">Selecione o paciente...</option>
                    {pacientes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} • SUS: {mascararCNS(p.cartao_sus)}{' '}
                        {p.cpf ? `• CPF: ${mascararCPF(p.cpf)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" /> Origem Clínica do
                    Atendimento:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="px-2.5 py-2 text-xs border border-slate-300 rounded-md bg-white font-medium"
                      value={atendimentoPepSelecionadoTipo}
                      onChange={(e) => {
                        setAtendimentoPepSelecionadoTipo(e.target.value as any)
                        setAtendimentoPepId('')
                      }}
                      disabled={!pacienteSelecionadoId}
                    >
                      <option value="nenhum">Consulta Geral (Sem internação/PA)</option>
                      <option value="pa">Pronto Atendimento (PA)</option>
                      <option value="internacao">Internação Hospitalar</option>
                    </select>

                    {atendimentoPepSelecionadoTipo === 'internacao' && (
                      <select
                        className="px-2.5 py-2 text-xs border border-slate-300 rounded-md bg-white font-medium"
                        value={atendimentoPepId}
                        onChange={(e) => setAtendimentoPepId(e.target.value)}
                      >
                        <option value="">Selecione a internação...</option>
                        {internacoesPaciente.map((i) => (
                          <option key={i.id} value={i.id}>
                            Admissão {i.data_admissao} (CID: {i.cid10_admissao || 'S/D'})
                          </option>
                        ))}
                      </select>
                    )}

                    {atendimentoPepSelecionadoTipo === 'pa' && (
                      <select
                        className="px-2.5 py-2 text-xs border border-slate-300 rounded-md bg-white font-medium"
                        value={atendimentoPepId}
                        onChange={(e) => setAtendimentoPepId(e.target.value)}
                      >
                        <option value="">Selecione a ficha PA...</option>
                        {atendimentosPaPaciente.map((pa) => (
                          <option key={pa.id} value={pa.id}>
                            Chegada {pa.data_hora_chegada?.slice(0, 10)} (CID: {pa.cid10 || 'S/D'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <Button
                  onClick={handleGerarRascunhoPep}
                  disabled={!pacienteSelecionadoId || carregandoAtendimentosPep}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Gerar Rascunho com Dados do PEP
                </Button>
              </div>

              {/* CARD DE PRÉ-VISUALIZAÇÃO DO RASCUNHO GERADO */}
              {rascunhoGerado && (
                <div className="p-4 rounded-xl border border-blue-200 bg-slate-50 space-y-3 mt-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-blue-600" />
                      Rascunho Pré-preenchido para Revisão do Profissional
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                      Aguardando Revisão Humana
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Paciente:</span>
                      <strong className="text-slate-900">
                        {rascunhoGerado.dados_paciente_snapshot.nome}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">CNS / CPF:</span>
                      <span className="font-mono text-slate-800">
                        {mascararCNS(rascunhoGerado.dados_paciente_snapshot.cns || '')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">CID Herdado do PEP:</span>
                      <Badge variant="outline" className="font-mono font-bold text-blue-800">
                        {rascunhoGerado.cid_principal}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Laudo Sugerido:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {rascunhoGerado.numero_laudo_sugerido}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Validade Proposta:</span>
                      <span className="text-slate-800">
                        {rascunhoGerado.validade_inicial_sugerida} até{' '}
                        {rascunhoGerado.validade_final_sugerida}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">
                        Prestador Executante:
                      </span>
                      <span className="text-slate-800">
                        {rascunhoGerado.executante_prestador_sugerido}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                    <Button
                      size="sm"
                      onClick={handleRevisarEEmitirRascunho}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      Revisar Dados e Emitir Solicitação <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: FORMULÁRIO DE NOVA SOLICITAÇÃO (OU REVISÃO DO RASCUNHO) */}
      {/* ========================================================================= */}
      {abaAtiva === 'nova_solicitacao' && podeEmitir && (
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-600" />
              Formulário de Solicitação de APAC
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Registro formal do laudo médico/multiprofissional para procedimento de alta
              complexidade no SUS.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleCriarSolicitacao} className="space-y-4">
              {/* ERRO DE ENVIO COM PRESERVAÇÃO DE TEXTO */}
              {erroEnvio && (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Atenção: Falha no Protocolo
                  </div>
                  <div>{erroEnvio}</div>
                  {avisoReenvio && <div className="text-slate-600 italic">{avisoReenvio}</div>}
                </div>
              )}

              {/* SELEÇÃO DO PACIENTE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Paciente Solicitante <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white font-medium"
                    value={formPacienteId}
                    onChange={(e) => setFormPacienteId(e.target.value)}
                    required
                  >
                    <option value="">Selecione o paciente...</option>
                    {pacientes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} • SUS: {mascararCNS(p.cartao_sus)}{' '}
                        {p.cpf ? `• CPF: ${mascararCPF(p.cpf)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Profissional Solicitante
                  </label>
                  <Input
                    className="text-xs h-9"
                    value={formProfissionalNome}
                    onChange={(e) => setFormProfissionalNome(e.target.value)}
                    placeholder="Nome e registro profissional do médico/equipe"
                  />
                </div>
              </div>

              {/* DADOS DO LAUDO, TIPO E MODALIDADE */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Número do Laudo <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className="text-xs h-9 font-mono"
                    value={formNumeroLaudo}
                    onChange={(e) => setFormNumeroLaudo(e.target.value)}
                    placeholder="Ex: LAUDO-2026-0042"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Data da Solicitação <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    className="text-xs h-9"
                    value={formDataSolicitacao}
                    onChange={(e) => setFormDataSolicitacao(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Tipo do Laudo <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-md bg-white font-medium"
                    value={formTipoLaudo}
                    onChange={(e) => setFormTipoLaudo(e.target.value as any)}
                  >
                    {TIPOS_LAUDO_OPCOES.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.rotulo}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Modalidade da APAC <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-md bg-white font-medium"
                    value={formModalidade}
                    onChange={(e) => setFormModalidade(e.target.value as any)}
                  >
                    {MODALIDADES_OPCOES.map((m) => (
                      <option key={m.valor} value={m.valor}>
                        {m.rotulo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SE MODALIDADE FOR CONTINUIDADE, EXIGE APAC ANTERIOR */}
              {formModalidade === 'continuidade' && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-amber-900">
                      Número da APAC Anterior <span className="text-red-500">*</span>
                    </label>
                    <Input
                      className="text-xs h-9 font-mono"
                      value={formApacAnteriorNumero}
                      onChange={(e) => setFormApacAnteriorNumero(e.target.value)}
                      placeholder="Ex: RO20250001234"
                      required
                    />
                  </div>
                  <div className="text-[11px] text-amber-800 flex items-center">
                    Atenção: A APAC anterior deve obrigatoriamente pertencer ao mesmo paciente para
                    garantir a rastreabilidade do tratamento contínuo.
                  </div>
                </div>
              )}

              {/* DIAGNÓSTICOS CID-10 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    CID-10 Principal <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className="text-xs h-9 font-mono uppercase"
                    value={formCidPrincipal}
                    onChange={(e) => setFormCidPrincipal(e.target.value.toUpperCase())}
                    placeholder="Ex: N18.0 ou C50.9"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">CID-10 Secundário</label>
                  <Input
                    className="text-xs h-9 font-mono uppercase"
                    value={formCidSecundario}
                    onChange={(e) => setFormCidSecundario(e.target.value.toUpperCase())}
                    placeholder="Ex: I10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    CID Causas Associadas
                  </label>
                  <Input
                    className="text-xs h-9 font-mono uppercase"
                    value={formCidCausasAssociadas}
                    onChange={(e) => setFormCidCausasAssociadas(e.target.value.toUpperCase())}
                    placeholder="Ex: E14.9"
                  />
                </div>
              </div>

              {/* PRAZOS DE VALIDADE E PRESTADOR EXECUTANTE */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Clínica / Prestador Executante <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className="text-xs h-9"
                    value={formPrestadorNome}
                    onChange={(e) => setFormPrestadorNome(e.target.value)}
                    placeholder="Nome da clínica ou hospital de alta complexidade"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Início da Validade <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    className="text-xs h-9"
                    value={formValidadeInicial}
                    onChange={(e) => setFormValidadeInicial(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Final da Validade <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    className="text-xs h-9"
                    value={formValidadeFinal}
                    onChange={(e) => setFormValidadeFinal(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAbaAtiva('solicitacoes')}
                  className="text-xs"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={enviandoSolicitacao}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5"
                >
                  {enviandoSolicitacao ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Protocolando...
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="w-3.5 h-3.5 mr-1.5" /> Emitir Solicitação de APAC
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: DETALHES DA SOLICITAÇÃO (TIPOS, MODALIDADES, HISTÓRICO, AÇÕES) */}
      {/* ========================================================================= */}
      {abaAtiva === 'detalhe' && (
        <div className="space-y-4">
          {carregandoDetalhe ? (
            <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              Carregando dados da solicitação...
            </div>
          ) : !solicitacaoAtiva ? (
            <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              Solicitação não encontrada.
            </div>
          ) : (
            <div className="space-y-4">
              {/* TOPO COM LAUDO, NÚMERO APAC E STATUS */}
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-bold text-slate-900">
                        Laudo: {solicitacaoAtiva.numero_laudo}
                      </CardTitle>
                      {renderBadgeStatus(solicitacaoAtiva.status)}
                      {solicitacaoAtiva.tipo_registro === 'retificacao' && (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px]">
                          Versão {solicitacaoAtiva.numero_versao || 2} (Retificada)
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs text-slate-500">
                      ID do Registro: {solicitacaoAtiva.id} • Criado em:{' '}
                      {solicitacaoAtiva.created?.slice(0, 10)}
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAbaAtiva('solicitacoes')}
                      className="text-xs h-8"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Voltar à Lista
                    </Button>

                    {/* Botão de Reserva Atômica (para operador autorizado e quando não tiver número ainda) */}
                    {ehOperadorFaixas &&
                      !solicitacaoAtiva.numero_apac &&
                      solicitacaoAtiva.status !== 'cancelada' && (
                        <Button
                          size="sm"
                          onClick={handleReservarNumeroTransacional}
                          disabled={processandoReserva}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 shadow-sm"
                        >
                          <Hash className="w-3.5 h-3.5 mr-1" />
                          {processandoReserva ? 'Reservando...' : 'Atribuir Número da Faixa'}
                        </Button>
                      )}

                    {podeEmitir && solicitacaoAtiva.status !== 'cancelada' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCidPrincipalRetificacao(solicitacaoAtiva.cid_principal)
                          setPrestadorRetificacao(solicitacaoAtiva.executante_prestador_nome)
                          setMotivoRetificacao('')
                          setExibirModalRetificar(true)
                        }}
                        className="text-xs h-8 border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        Retificar Laudo
                      </Button>
                    )}

                    {podeEmitir && solicitacaoAtiva.status !== 'cancelada' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMotivoCancelamento('')
                          setExibirModalCancelar(true)
                        }}
                        className="text-xs h-8 border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* PAINEL DE NÚMERO DE APAC OU ALERTA */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Número de APAC do Procedimento
                      </span>
                      {solicitacaoAtiva.numero_apac ? (
                        <div className="text-xl font-mono font-black text-blue-900 tracking-tight">
                          {solicitacaoAtiva.numero_apac}
                        </div>
                      ) : (
                        <div className="text-xs text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Número de APAC ainda não atribuído. Aguardando processamento da faixa
                          municipal.
                        </div>
                      )}
                    </div>

                    {solicitacaoAtiva.apac_anterior_numero && (
                      <div className="sm:text-right">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          APAC Antecessora (Continuidade)
                        </span>
                        <div className="text-sm font-mono font-bold text-slate-800">
                          {solicitacaoAtiva.apac_anterior_numero}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* DADOS DO PACIENTE COM MÁSCARA LGPD */}
                  <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" /> Identificação do Paciente
                        (LGPD Protegida)
                      </span>
                      {onNavegarSAME && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onNavegarSAME(solicitacaoAtiva.paciente)}
                          className="text-[11px] h-6 text-blue-600 hover:text-blue-800"
                        >
                          Abrir Prontuário SAME
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Nome do Paciente:</span>
                        <strong className="text-slate-900">
                          {solicitacaoAtiva.dados_paciente_snapshot?.nome ||
                            solicitacaoAtiva.expand?.paciente?.nome ||
                            '—'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">
                          Cartão SUS (CNS Mascarado):
                        </span>
                        <span className="font-mono text-slate-800">
                          {solicitacaoAtiva.dados_paciente_snapshot?.cns ||
                            (solicitacaoAtiva.expand?.paciente?.cartao_sus
                              ? mascararCNS(solicitacaoAtiva.expand.paciente.cartao_sus)
                              : '—')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">CPF (Mascarado):</span>
                        <span className="font-mono text-slate-800">
                          {solicitacaoAtiva.dados_paciente_snapshot?.cpf ||
                            (solicitacaoAtiva.expand?.paciente?.cpf
                              ? mascararCPF(solicitacaoAtiva.expand.paciente.cpf)
                              : '—')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* DADOS TÉCNICOS E CLÍNICOS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Tipo de Laudo:</span>
                      <strong className="text-slate-900">
                        {getRotuloTipoLaudo(solicitacaoAtiva.tipo_laudo)}
                      </strong>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Modalidade:</span>
                      <strong className="text-slate-900 capitalize">
                        {solicitacaoAtiva.modalidade.replace('_', ' ')}
                      </strong>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">
                        Diagnóstico Principal:
                      </span>
                      <Badge variant="outline" className="font-mono font-bold text-blue-900">
                        {solicitacaoAtiva.cid_principal}
                      </Badge>
                      {solicitacaoAtiva.cid_secundario && (
                        <span className="ml-1 text-[11px] text-slate-500">
                          Sec: {solicitacaoAtiva.cid_secundario}
                        </span>
                      )}
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">
                        Clínica / Prestador Executante:
                      </span>
                      <span className="text-slate-900 font-medium">
                        {solicitacaoAtiva.executante_prestador_nome}
                      </span>
                      {solicitacaoAtiva.executante_cnes && (
                        <div className="text-[11px] text-slate-500">
                          CNES: {solicitacaoAtiva.executante_cnes}
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">
                        Início e Final da Validade:
                      </span>
                      <span className="text-slate-900 font-semibold">
                        {solicitacaoAtiva.validade_inicial}
                      </span>{' '}
                      até{' '}
                      <span className="text-slate-900 font-semibold">
                        {solicitacaoAtiva.validade_final}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">
                        Unidade & Profissional:
                      </span>
                      <span className="text-slate-800">
                        {solicitacaoAtiva.profissional_solicitante_nome}
                      </span>
                      <div className="text-[11px] text-slate-500">
                        {solicitacaoAtiva.unidade_solicitante}
                      </div>
                    </div>
                  </div>

                  {/* INFORMAÇÕES DE RETIFICAÇÃO OU CANCELAMENTO */}
                  {solicitacaoAtiva.motivo_retificacao && (
                    <div className="p-3 rounded-lg border border-purple-200 bg-purple-50 text-xs text-purple-900 space-y-1">
                      <strong>Motivo da Retificação Registrada:</strong>
                      <p>{solicitacaoAtiva.motivo_retificacao}</p>
                    </div>
                  )}

                  {solicitacaoAtiva.motivo_cancelamento && (
                    <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-900 space-y-1">
                      <strong>Motivo do Cancelamento Auditado:</strong>
                      <p>{solicitacaoAtiva.motivo_cancelamento}</p>
                      <div className="text-[11px] text-rose-700">
                        Data do cancelamento: {solicitacaoAtiva.data_cancelamento?.slice(0, 10)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* MODAL DE RETIFICAÇÃO */}
              {exibirModalRetificar && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-bold text-slate-900 text-sm">
                        Retificar Solicitação de APAC
                      </h3>
                      <button
                        onClick={() => setExibirModalRetificar(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-xs text-slate-500">
                      O registro original será mantido imutável para auditoria SUS. Uma nova versão
                      será gerada com o motivo e autor registrado.
                    </p>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Motivo Formal da Retificação <span className="text-red-500">*</span>:
                        </label>
                        <textarea
                          rows={3}
                          value={motivoRetificacao}
                          onChange={(e) => setMotivoRetificacao(e.target.value)}
                          placeholder="Informe a justificativa clínica ou administrativa (mínimo 5 caracteres)..."
                          className="w-full p-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          CID Principal (Opcional):
                        </label>
                        <Input
                          className="text-xs h-8 uppercase font-mono"
                          value={cidPrincipalRetificacao}
                          onChange={(e) => setCidPrincipalRetificacao(e.target.value.toUpperCase())}
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Prestador Executante (Opcional):
                        </label>
                        <Input
                          className="text-xs h-8"
                          value={prestadorRetificacao}
                          onChange={(e) => setPrestadorRetificacao(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExibirModalRetificar(false)}
                        className="text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleConfirmarRetificacao}
                        disabled={processandoRetificacao}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                      >
                        {processandoRetificacao ? 'Salvando...' : 'Gravar Retificação'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL DE CANCELAMENTO */}
              {exibirModalCancelar && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-bold text-red-900 text-sm flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-600" /> Cancelamento Auditado de
                        APAC
                      </h3>
                      <button
                        onClick={() => setExibirModalCancelar(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-xs text-slate-600">
                      O cancelamento é permanente e auditado. O número de APAC vinculado NÃO será
                      reutilizado silenciosamente.
                    </p>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1 text-xs">
                        Motivo do Cancelamento <span className="text-red-500">*</span>:
                      </label>
                      <textarea
                        rows={3}
                        value={motivoCancelamento}
                        onChange={(e) => setMotivoCancelamento(e.target.value)}
                        placeholder="Informe a justificativa formal para o cancelamento (mínimo 5 caracteres)..."
                        className="w-full p-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-red-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExibirModalCancelar(false)}
                        className="text-xs"
                      >
                        Voltar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleConfirmarCancelamento}
                        disabled={processandoCancelamento}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs"
                      >
                        {processandoCancelamento ? 'Cancelando...' : 'Confirmar Cancelamento'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 5: GESTÃO DE FAIXAS DE SEQUÊNCIAS (RESTRITA AO OPERADOR AUTORIZADO) */}
      {/* ========================================================================= */}
      {abaAtiva === 'faixas' && ehOperadorFaixas && (
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-blue-600" />
                  Controle de Sequências de Números de APACs
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Conforme Seção 7.4.4.4.a.ii: Gestão de faixas disponíveis para o município por
                  ano, UF e tipo de laudo.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setExibirModalNovaFaixa(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 shadow-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  Cadastrar Nova Faixa
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* FILTRO DE ANO */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-semibold">Ano de Referência:</span>
                <select
                  className="h-8 px-2.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
                  value={anoFiltroFaixas}
                  onChange={(e) => setAnoFiltroFaixas(Number(e.target.value))}
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={carregarFaixas}
                  disabled={carregandoFaixas}
                  className="text-xs h-8"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 mr-1 ${carregandoFaixas ? 'animate-spin' : ''}`}
                  />
                  Filtrar
                </Button>
              </div>

              {/* TABELA DE FAIXAS CONFIGURADAS */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Ano / UF</th>
                      <th className="py-2.5 px-3">Tipo de APAC</th>
                      <th className="py-2.5 px-3">Intervalo (Inicial – Final)</th>
                      <th className="py-2.5 px-3">Número Atual</th>
                      <th className="py-2.5 px-3">Validade</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {carregandoFaixas ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400">
                          Carregando faixas...
                        </td>
                      </tr>
                    ) : faixas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400">
                          Nenhuma faixa de sequência cadastrada para este ano.
                        </td>
                      </tr>
                    ) : (
                      faixas.map((fx) => (
                        <tr key={fx.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {fx.ano} / {fx.uf}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {getRotuloTipoLaudo(fx.tipo_apac)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            {fx.faixa_inicial} a {fx.faixa_final}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                            {fx.numero_atual >= fx.faixa_inicial ? fx.numero_atual : 'Não iniciada'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {fx.validade_inicial} até {fx.validade_final}
                          </td>
                          <td className="py-2.5 px-3">
                            {fx.ativo ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                                Ativa
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[10px]">
                                Inativa
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* MODAL DE CADASTRO DE NOVA FAIXA */}
          {exibirModalNovaFaixa && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-lg w-full p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-blue-600" /> Cadastrar Faixa de Sequência
                  </h3>
                  <button
                    onClick={() => setExibirModalNovaFaixa(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCadastrarFaixa} className="space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Ano:</label>
                      <Input
                        type="number"
                        className="text-xs h-8"
                        value={formFaixaAno}
                        onChange={(e) => setFormFaixaAno(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">UF:</label>
                      <Input
                        className="text-xs h-8 uppercase"
                        maxLength={2}
                        value={formFaixaUf}
                        onChange={(e) => setFormFaixaUf(e.target.value.toUpperCase())}
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Tipo de APAC:
                      </label>
                      <select
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
                        value={formFaixaTipo}
                        onChange={(e) => setFormFaixaTipo(e.target.value as any)}
                      >
                        {TIPOS_LAUDO_OPCOES.map((t) => (
                          <option key={t.valor} value={t.valor}>
                            {t.rotulo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Faixa Inicial:
                      </label>
                      <Input
                        type="number"
                        className="text-xs h-8 font-mono"
                        value={formFaixaInicial}
                        onChange={(e) => setFormFaixaInicial(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Faixa Final:
                      </label>
                      <Input
                        type="number"
                        className="text-xs h-8 font-mono"
                        value={formFaixaFinal}
                        onChange={(e) => setFormFaixaFinal(Number(e.target.value))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Início da Validade:
                      </label>
                      <Input
                        type="date"
                        className="text-xs h-8"
                        value={formFaixaValidadeIni}
                        onChange={(e) => setFormFaixaValidadeIni(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Final da Validade:
                      </label>
                      <Input
                        type="date"
                        className="text-xs h-8"
                        value={formFaixaValidadeFim}
                        onChange={(e) => setFormFaixaValidadeFim(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Observações:</label>
                    <Input
                      className="text-xs h-8"
                      value={formFaixaObs}
                      onChange={(e) => setFormFaixaObs(e.target.value)}
                      placeholder="Ex: Faixa anual liberada pela Secretaria Estadual de Saúde"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setExibirModalNovaFaixa(false)}
                      className="text-xs"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={salvandoFaixa}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    >
                      {salvandoFaixa ? 'Salvando...' : 'Habilitar Faixa'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
