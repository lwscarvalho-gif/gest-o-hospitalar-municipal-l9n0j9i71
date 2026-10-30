import React, { useState, useEffect } from 'react'
import {
  Bus,
  Users,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  UserCheck,
  Shield,
  ArrowRight,
  Check,
  Ban,
  Wrench,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  TransporteVeiculo,
  TransporteTipoVeiculo,
  TransporteMotorista,
  TransporteRota,
  TransporteDestino,
  TransporteViagem,
  TransportePassageiro,
  TipoViagemSanitaria,
  StatusVeiculo,
  CombustivelVeiculo,
  TrechoViagem,
  Paciente,
} from '@/types/hospital'
import {
  listarTiposVeiculos,
  listarVeiculos,
  cadastrarVeiculo,
  listarMotoristas,
  cadastrarMotorista,
  listarRotas,
  cadastrarRota,
  listarDestinos,
  cadastrarDestino,
  listarViagensPaginado,
  programarViagem,
  cancelarViagem,
  finalizarViagem,
  listarPassageirosViagemPaginado,
  reservarVagasComIdempotencia,
  cancelarPassageiro,
  formatarDataHoraViagemFuso,
  calcularKmViagem,
  ResultadoPaginadoViagens,
  ResultadoPaginadoPassageiros,
} from '@/services/transporte'
import { SeletorPaciente } from '@/components/SeletorPaciente'
import { mascararCPF, mascararCNS } from '@/services/identificacaoPaciente'

export function TransporteView() {
  const { user } = useAuth()
  const { toast } = useToast()

  // Perfis de acesso
  const isRecepcao = user?.role === 'recepcao'
  const isClinico = user?.role === 'profissional' || user?.role === 'admin'
  const podeGerenciarCadastros =
    user?.role === 'admin' || user?.role === 'gestor' || user?.role === 'recepcao'

  // Aba ativa principal
  const [abaAtiva, setAbaAtiva] = useState<string>('viagens')

  // Estados de dados auxiliares
  const [tiposVeiculo, setTiposVeiculo] = useState<TransporteTipoVeiculo[]>([])
  const [veiculos, setVeiculos] = useState<TransporteVeiculo[]>([])
  const [motoristas, setMotoristas] = useState<TransporteMotorista[]>([])
  const [rotas, setRotas] = useState<TransporteRota[]>([])
  const [destinos, setDestinos] = useState<TransporteDestino[]>([])

  // Estado de Viagens (paginado)
  const [carregandoViagens, setCarregandoViagens] = useState(false)
  const [dadosViagens, setDadosViagens] = useState<ResultadoPaginadoViagens>({
    items: [],
    page: 1,
    perPage: 10,
    totalItems: 0,
    totalPages: 1,
  })
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroVeiculo, setFiltroVeiculo] = useState<string>('todos')
  const [filtroMotorista, setFiltroMotorista] = useState<string>('todos')
  const [filtroBusca, setFiltroBusca] = useState<string>('')
  const [paginaViagens, setPaginaViagens] = useState<number>(1)

  // Viagem selecionada para visualização/gestão de passageiros
  const [viagemSelecionada, setViagemSelecionada] = useState<TransporteViagem | null>(null)
  const [passageirosViagem, setPassageirosViagem] = useState<ResultadoPaginadoPassageiros>({
    items: [],
    page: 1,
    perPage: 10,
    totalItems: 0,
    totalPages: 1,
  })
  const [carregandoPassageiros, setCarregandoPassageiros] = useState(false)
  const [paginaPassageiros, setPaginaPassageiros] = useState<number>(1)

  // Modais
  const [modalNovaViagemAberto, setModalNovaViagemAberto] = useState(false)
  const [modalReservaAberto, setModalReservaAberto] = useState(false)
  const [modalNovoVeiculoAberto, setModalNovoVeiculoAberto] = useState(false)
  const [modalNovoMotoristaAberto, setModalNovoMotoristaAberto] = useState(false)
  const [modalNovaRotaAberto, setModalNovaRotaAberto] = useState(false)
  const [modalNovoDestinoAberto, setModalNovoDestinoAberto] = useState(false)
  const [modalFinalizarViagemAberto, setModalFinalizarViagemAberto] = useState(false)

  // Submissão / Travamento / Idempotência
  const [salvandoViagem, setSalvandoViagem] = useState(false)
  const [erroFormViagem, setErroFormViagem] = useState<string | null>(null)

  const [salvandoReserva, setSalvandoReserva] = useState(false)
  const [erroFormReserva, setErroFormReserva] = useState<string | null>(null)
  const [conflitoFormReserva, setConflitoFormReserva] = useState<string | null>(null)

  // Formulário Nova Viagem
  const [formViagem, setFormViagem] = useState({
    codigo_viagem: '',
    tipo_viagem: 'sanitario_eletivo' as TipoViagemSanitaria,
    veiculoId: '',
    motoristaId: '',
    rotaId: '',
    destinoId: '',
    cidade_destino: '',
    local_destino: '',
    data_saida: '',
    data_retorno_previsto: '',
    km_inicial: '',
    observacoes: '',
  })

  // Formulário Reserva de Vagas (Idempotência e Sequência de Pacientes)
  const [chaveIdempotenciaReserva, setChaveIdempotenciaReserva] = useState<string>('')
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null)
  const [seqRequisicaoPaciente, setSeqRequisicaoPaciente] = useState<number>(0)
  const [trechoSelecionado, setTrechoSelecionado] = useState<TrechoViagem>('ida_e_volta')
  const [incluirAcompanhante, setIncluirAcompanhante] = useState<boolean>(false)
  const [dadosAcompanhante, setDadosAcompanhante] = useState({
    nome_completo: '',
    documento_numero: '',
    telefone: '',
  })
  const [justificativaClinicaPaciente, setJustificativaClinicaPaciente] = useState<string>('')

  // Formulário Finalizar Viagem (Km Final)
  const [viagemParaFinalizar, setViagemParaFinalizar] = useState<TransporteViagem | null>(null)
  const [kmFinalInput, setKmFinalInput] = useState<string>('')
  const [dataRetornoRealInput, setDataRetornoRealInput] = useState<string>('')
  const [salvandoFinalizacao, setSalvandoFinalizacao] = useState(false)
  const [erroFinalizacao, setErroFinalizacao] = useState<string | null>(null)

  // Formulários de Cadastros Básicos
  const [formVeiculo, setFormVeiculo] = useState({
    placa: '',
    descricao: '',
    marca: '',
    ano: new Date().getFullYear(),
    tipo: '',
    capacidade_lotacao: 4,
    tipo_combustivel: 'flex' as CombustivelVeiculo,
    status: 'disponivel' as StatusVeiculo,
    motivo_indisponibilidade: '',
    observacoes: '',
  })

  const [formMotorista, setFormMotorista] = useState({
    nome: '',
    cpf: '',
    cnh_numero: '',
    cnh_categoria: 'D',
    cnh_vencimento: '',
    telefone: '',
    observacoes: '',
  })

  const [formRota, setFormRota] = useState({
    descricao: '',
    municipio_saida: 'Mirante da Serra',
    distancia_estimada_km: 0,
    observacoes: '',
  })

  const [formDestino, setFormDestino] = useState({
    nome: '',
    municipio_localizacao: 'Cacoal',
    endereco: '',
    telefone: '',
  })

  // Carregamento inicial de cadastros
  const carregarCadastrosGerais = async () => {
    try {
      const [tipos, veics, mots, rts, dsts] = await Promise.all([
        listarTiposVeiculos(),
        listarVeiculos(false),
        listarMotoristas(false),
        listarRotas(false),
        listarDestinos(false),
      ])
      setTiposVeiculo(tipos)
      setVeiculos(veics)
      setMotoristas(mots)
      setRotas(rts)
      setDestinos(dsts)
    } catch (err) {
      console.warn('Erro ao carregar cadastros de transporte:', err)
    }
  }

  useEffect(() => {
    carregarCadastrosGerais()
  }, [])

  // Carregar Viagens Paginadas
  const carregarViagens = async () => {
    setCarregandoViagens(true)
    try {
      const res = await listarViagensPaginado({
        status: filtroStatus,
        veiculoId: filtroVeiculo,
        motoristaId: filtroMotorista,
        busca: filtroBusca,
        pagina: paginaViagens,
        porPagina: 10,
      })
      setDadosViagens(res)
      if (viagemSelecionada) {
        const atualizada = res.items.find((v) => v.id === viagemSelecionada.id)
        if (atualizada) {
          setViagemSelecionada(atualizada)
        }
      }
    } catch (err) {
      console.error('Erro ao listar viagens:', err)
    } finally {
      setCarregandoViagens(false)
    }
  }

  useEffect(() => {
    carregarViagens()
  }, [paginaViagens, filtroStatus, filtroVeiculo, filtroMotorista])

  // Recarregar passageiros quando a viagem selecionada ou página muda
  const carregarPassageiros = async (viagemId: string, page = 1) => {
    setCarregandoPassageiros(true)
    try {
      const res = await listarPassageirosViagemPaginado(viagemId, page, 10, false)
      setPassageirosViagem(res)
    } catch (err) {
      console.error('Erro ao listar passageiros:', err)
    } finally {
      setCarregandoPassageiros(false)
    }
  }

  useEffect(() => {
    if (viagemSelecionada) {
      carregarPassageiros(viagemSelecionada.id, paginaPassageiros)
    } else {
      setPassageirosViagem({
        items: [],
        page: 1,
        perPage: 10,
        totalItems: 0,
        totalPages: 1,
      })
    }
  }, [viagemSelecionada?.id, paginaPassageiros])

  // Gerar chave de idempotência ao abrir modal de reserva
  const abrirModalReserva = (viagem: TransporteViagem) => {
    setViagemSelecionada(viagem)
    const novaChave = `transp-res-${viagem.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    setChaveIdempotenciaReserva(novaChave)
    setPacienteSelecionado(null)
    setSeqRequisicaoPaciente((prev) => prev + 1)
    setTrechoSelecionado('ida_e_volta')
    setIncluirAcompanhante(false)
    setDadosAcompanhante({
      nome_completo: '',
      documento_numero: '',
      telefone: '',
    })
    setJustificativaClinicaPaciente('')
    setErroFormReserva(null)
    setConflitoFormReserva(null)
    setModalReservaAberto(true)
  }

  // Manipulação de Troca de Paciente (Descarte de Resposta Antiga em Voo e Sequência)
  const handleTrocaPaciente = (novoPac: Paciente | null) => {
    setSeqRequisicaoPaciente((prev) => prev + 1)
    setPacienteSelecionado(novoPac)
    setErroFormReserva(null)
    setConflitoFormReserva(null)
  }

  // Submissão de Programação de Nova Viagem
  const handleProgramarViagem = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroFormViagem(null)

    if (!formViagem.veiculoId || !formViagem.motoristaId || !formViagem.data_saida) {
      setErroFormViagem('Veículo, motorista e data/hora de saída são obrigatórios.')
      return
    }

    const veiculoEscolhido = veiculos.find((v) => v.id === formViagem.veiculoId)
    if (veiculoEscolhido && veiculoEscolhido.status !== 'disponivel') {
      setErroFormViagem(
        `Atenção: O veículo ${veiculoEscolhido.placa} está marcado como ${veiculoEscolhido.status.toUpperCase()}${
          veiculoEscolhido.motivo_indisponibilidade
            ? `: ${veiculoEscolhido.motivo_indisponibilidade}`
            : ''
        }. Não é permitido programar viagens com veículos em manutenção ou inativos.`,
      )
      return
    }

    const motoristaEscolhido = motoristas.find((m) => m.id === formViagem.motoristaId)
    if (motoristaEscolhido && !motoristaEscolhido.ativo) {
      setErroFormViagem(
        `Atenção: O motorista ${motoristaEscolhido.nome} está inativo e não pode ser escalado.`,
      )
      return
    }

    setSalvandoViagem(true)
    try {
      const codigoGerado =
        formViagem.codigo_viagem.trim() ||
        `TR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

      const kmIni = formViagem.km_inicial ? parseInt(formViagem.km_inicial, 10) : undefined

      const nova = await programarViagem({
        codigo_viagem: codigoGerado,
        tipo_viagem: formViagem.tipo_viagem,
        veiculo: formViagem.veiculoId,
        motorista: formViagem.motoristaId,
        rota: formViagem.rotaId || undefined,
        destino: formViagem.destinoId || undefined,
        cidade_destino: formViagem.cidade_destino || 'Destino não informado',
        local_destino: formViagem.local_destino || undefined,
        data_saida: formViagem.data_saida,
        data_retorno_previsto: formViagem.data_retorno_previsto || formViagem.data_saida,
        km_inicial: isNaN(kmIni as number) ? undefined : kmIni,
        observacoes: formViagem.observacoes || undefined,
      })

      toast({
        title: 'Viagem Programada',
        description: `Viagem ${nova.codigo_viagem} cadastrada com sucesso!`,
      })
      setModalNovaViagemAberto(false)
      setFormViagem({
        codigo_viagem: '',
        tipo_viagem: 'sanitario_eletivo',
        veiculoId: '',
        motoristaId: '',
        rotaId: '',
        destinoId: '',
        cidade_destino: '',
        local_destino: '',
        data_saida: '',
        data_retorno_previsto: '',
        km_inicial: '',
        observacoes: '',
      })
      carregarViagens()
    } catch (err: any) {
      console.error('Erro ao programar viagem:', err)
      const msg = err?.data?.message || err?.message || 'Erro ao programar viagem.'
      setErroFormViagem(msg)
    } finally {
      setSalvandoViagem(false)
    }
  }

  // Submissão de Reserva de Vagas (Transacional + Idempotente)
  const handleConfirmarReserva = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!viagemSelecionada) return
    setErroFormReserva(null)
    setConflitoFormReserva(null)

    if (!pacienteSelecionado) {
      setErroFormReserva('Selecione um paciente para reservar a vaga.')
      return
    }

    if (incluirAcompanhante && !dadosAcompanhante.nome_completo.trim()) {
      setErroFormReserva('Informe o nome do acompanhante.')
      return
    }

    const seqAtual = seqRequisicaoPaciente
    setSalvandoReserva(true)

    try {
      const acompanhantesPayload = incluirAcompanhante
        ? [
            {
              nome_completo: dadosAcompanhante.nome_completo.trim(),
              documento_numero: dadosAcompanhante.documento_numero.trim() || undefined,
              telefone: dadosAcompanhante.telefone.trim() || undefined,
            },
          ]
        : []

      const res = await reservarVagasComIdempotencia({
        viagem_id: viagemSelecionada.id,
        paciente_id: pacienteSelecionado.id,
        nome_completo: pacienteSelecionado.nome,
        documento_numero: pacienteSelecionado.cpf || pacienteSelecionado.cartao_sus,
        documento_tipo: pacienteSelecionado.cpf ? 'cpf' : 'cns',
        telefone: pacienteSelecionado.telefone || undefined,
        trecho: trechoSelecionado,
        acompanhantes: acompanhantesPayload,
        idempotency_key: chaveIdempotenciaReserva,
      })

      if (seqAtual !== seqRequisicaoPaciente) {
        console.warn('Resposta descartada: sequência de seleção de paciente desatualizada.')
        return
      }

      toast({
        title: 'Vagas Reservadas!',
        description: res.mensagem || 'Vagas confirmadas com sucesso.',
      })

      setModalReservaAberto(false)
      carregarViagens()
      carregarPassageiros(viagemSelecionada.id, 1)
    } catch (err: any) {
      if (seqAtual !== seqRequisicaoPaciente) return
      console.error('Erro na reserva de vagas:', err)
      const msg = err?.message || 'Falha ao reservar vagas.'
      if (msg.includes('Lotação') || msg.includes('esgotada') || msg.includes('conflito')) {
        setConflitoFormReserva(msg)
      } else {
        setErroFormReserva(msg)
      }
    } finally {
      if (seqAtual === seqRequisicaoPaciente) {
        setSalvandoReserva(false)
      }
    }
  }

  // Cancelar Passageiro
  const handleCancelarPassageiro = async (passageiro: TransportePassageiro) => {
    const motivo = window.prompt(
      `Confirma o cancelamento da vaga de "${passageiro.nome_completo}"?\nInforme o motivo do cancelamento (mínimo 5 letras):`,
      'Cancelamento solicitado pelo usuário/família',
    )
    if (!motivo) return

    try {
      await cancelarPassageiro({
        passageiro_id: passageiro.id,
        motivo_cancelamento: motivo,
      })
      toast({
        title: 'Vaga Cancelada',
        description: 'Vaga cancelada e liberada para a viagem.',
      })
      if (viagemSelecionada) {
        carregarPassageiros(viagemSelecionada.id, paginaPassageiros)
        carregarViagens()
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao cancelar vaga',
        description: err?.message || 'Falha na operação.',
        variant: 'destructive',
      })
    }
  }

  // Finalizar Viagem com Km Final
  const handleFinalizarViagem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!viagemParaFinalizar) return
    setErroFinalizacao(null)

    const kmFim = kmFinalInput ? parseInt(kmFinalInput, 10) : NaN
    if (isNaN(kmFim) || kmFim < 0) {
      setErroFinalizacao('Informe um odômetro final válido e positivo.')
      return
    }

    if (viagemParaFinalizar.km_inicial !== null && viagemParaFinalizar.km_inicial !== undefined) {
      const calculo = calcularKmViagem(viagemParaFinalizar.km_inicial, kmFim)
      if (!calculo.valido) {
        setErroFinalizacao(
          calculo.erro ||
            `Quilometragem final (${kmFim} km) não pode ser menor que a inicial (${viagemParaFinalizar.km_inicial} km).`,
        )
        return
      }
    }

    setSalvandoFinalizacao(true)
    try {
      await finalizarViagem({
        viagemId: viagemParaFinalizar.id,
        km_final: kmFim,
        data_retorno_real: dataRetornoRealInput || undefined,
      })

      toast({
        title: 'Viagem Finalizada',
        description: `Viagem ${viagemParaFinalizar.codigo_viagem} concluída e auditada.`,
      })
      setModalFinalizarViagemAberto(false)
      setViagemParaFinalizar(null)
      carregarViagens()
    } catch (err: any) {
      setErroFinalizacao(err?.message || 'Erro ao finalizar viagem.')
    } finally {
      setSalvandoFinalizacao(false)
    }
  }

  // Cancelar Viagem
  const handleCancelarViagem = async (viagem: TransporteViagem) => {
    const motivo = window.prompt(
      `Confirma o cancelamento da viagem "${viagem.codigo_viagem}"?\nInforme o motivo (mínimo 5 letras):`,
      'Necessidade de manutenção ou reagendamento de rota',
    )
    if (!motivo) return

    try {
      await cancelarViagem({
        viagem_id: viagem.id,
        motivo_cancelamento: motivo,
      })
      toast({
        title: 'Viagem Cancelada',
        description: `Viagem ${viagem.codigo_viagem} cancelada.`,
      })
      carregarViagens()
    } catch (err: any) {
      toast({
        title: 'Erro ao cancelar viagem',
        description: err?.message || 'Falha na operação.',
        variant: 'destructive',
      })
    }
  }

  // Cadastros Básicos: Criar Veículo
  const handleCriarVeiculo = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const v = await cadastrarVeiculo({
        placa: formVeiculo.placa.trim().toUpperCase(),
        descricao: formVeiculo.descricao.trim(),
        marca: formVeiculo.marca.trim() || undefined,
        ano: Number(formVeiculo.ano) || undefined,
        tipo: formVeiculo.tipo || undefined,
        capacidade_lotacao: Number(formVeiculo.capacidade_lotacao) || 4,
        tipo_combustivel: formVeiculo.tipo_combustivel,
        status: formVeiculo.status,
        motivo_indisponibilidade: formVeiculo.motivo_indisponibilidade || undefined,
        observacoes: formVeiculo.observacoes || undefined,
      })
      toast({
        title: 'Veículo Cadastrado',
        description: `Veículo ${v.placa} registrado com sucesso.`,
      })
      setModalNovoVeiculoAberto(false)
      carregarCadastrosGerais()
    } catch (err: any) {
      toast({
        title: 'Erro ao cadastrar veículo',
        description: err?.message || 'Falha no cadastro.',
        variant: 'destructive',
      })
    }
  }

  // Cadastros Básicos: Criar Motorista
  const handleCriarMotorista = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const m = await cadastrarMotorista({
        nome: formMotorista.nome.trim(),
        cpf: formMotorista.cpf.replace(/\D/g, ''),
        cnh_numero: formMotorista.cnh_numero.trim(),
        cnh_categoria: formMotorista.cnh_categoria,
        cnh_vencimento: formMotorista.cnh_vencimento,
        telefone: formMotorista.telefone.trim() || undefined,
        observacoes: formMotorista.observacoes || undefined,
      })
      toast({
        title: 'Motorista Cadastrado',
        description: `Motorista ${m.nome} registrado com sucesso.`,
      })
      setModalNovoMotoristaAberto(false)
      carregarCadastrosGerais()
    } catch (err: any) {
      toast({
        title: 'Erro ao cadastrar motorista',
        description: err?.message || 'Falha no cadastro.',
        variant: 'destructive',
      })
    }
  }

  // Cadastros Básicos: Criar Rota
  const handleCriarRota = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const r = await cadastrarRota({
        descricao: formRota.descricao.trim(),
        municipio_saida: formRota.municipio_saida.trim(),
        distancia_estimada_km: Number(formRota.distancia_estimada_km) || undefined,
        observacoes: formRota.observacoes || undefined,
      })
      toast({
        title: 'Rota Cadastrada',
        description: `Rota ${r.descricao} registrada com sucesso.`,
      })
      setModalNovaRotaAberto(false)
      carregarCadastrosGerais()
    } catch (err: any) {
      toast({
        title: 'Erro ao cadastrar rota',
        description: err?.message || 'Falha no cadastro.',
        variant: 'destructive',
      })
    }
  }

  // Cadastros Básicos: Criar Destino
  const handleCriarDestino = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const d = await cadastrarDestino({
        nome: formDestino.nome.trim(),
        municipio_localizacao: formDestino.municipio_localizacao.trim(),
        endereco: formDestino.endereco.trim() || undefined,
        telefone: formDestino.telefone.trim() || undefined,
      })
      toast({
        title: 'Destino Cadastrado',
        description: `Destino ${d.nome} registrado com sucesso.`,
      })
      setModalNovoDestinoAberto(false)
      carregarCadastrosGerais()
    } catch (err: any) {
      toast({
        title: 'Erro ao cadastrar destino',
        description: err?.message || 'Falha no cadastro.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Bus className="w-7 h-7 text-emerald-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Transporte Sanitário Interno
            </h1>
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold"
            >
              SUS 7.4.4.2.a–b
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gestão operacional de veículos, motoristas com CNH, rotas, viagens programadas e reserva
            atômica de vagas separadas ida/volta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isRecepcao && (
            <Badge
              variant="secondary"
              className="bg-amber-100 text-amber-800 border-amber-300 text-xs flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              Acesso Recepção (Dados Administrativos)
            </Badge>
          )}
          {isClinico && (
            <Badge
              variant="secondary"
              className="bg-sky-100 text-sky-800 border-sky-300 text-xs flex items-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Acesso Clínico / Assistencial Autorizado
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              carregarCadastrosGerais()
              carregarViagens()
            }}
            disabled={carregandoViagens}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${carregandoViagens ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => {
              setErroFormViagem(null)
              setModalNovaViagemAberto(true)
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Programar Viagem
          </Button>
        </div>
      </div>

      {/* Navegação entre Abas */}
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="viagens" className="flex items-center gap-1.5 text-xs font-semibold">
            <Calendar className="w-4 h-4" />
            Viagens Programadas
          </TabsTrigger>
          <TabsTrigger value="veiculos" className="flex items-center gap-1.5 text-xs font-semibold">
            <Bus className="w-4 h-4" />
            Veículos & Manutenção
          </TabsTrigger>
          <TabsTrigger
            value="motoristas"
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <Users className="w-4 h-4" />
            Motoristas & CNH
          </TabsTrigger>
          <TabsTrigger value="rotas" className="flex items-center gap-1.5 text-xs font-semibold">
            <ArrowRight className="w-4 h-4" />
            Rotas
          </TabsTrigger>
          <TabsTrigger value="destinos" className="flex items-center gap-1.5 text-xs font-semibold">
            <MapPin className="w-4 h-4" />
            Destinos
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* ABA: VIAGENS PROGRAMADAS & VAGAS                                          */}
        {/* ========================================================================= */}
        <TabsContent value="viagens" className="space-y-4 pt-2">
          {/* Filtros de Viagens */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-slate-600">Busca por Código / Destino</Label>
                  <div className="relative mt-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    <Input
                      placeholder="Ex: TR-2025, Porto Velho..."
                      value={filtroBusca}
                      onChange={(e) => setFiltroBusca(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && carregarViagens()}
                      className="pl-8 text-xs h-9"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-600">Status da Viagem</Label>
                  <Select
                    value={filtroStatus}
                    onValueChange={(val) => {
                      setFiltroStatus(val)
                      setPaginaViagens(1)
                    }}
                  >
                    <SelectTrigger className="mt-1 text-xs h-9">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      <SelectItem value="programada">Programada</SelectItem>
                      <SelectItem value="em_transito">Em Trânsito</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-600">Veículo</Label>
                  <Select
                    value={filtroVeiculo}
                    onValueChange={(val) => {
                      setFiltroVeiculo(val)
                      setPaginaViagens(1)
                    }}
                  >
                    <SelectTrigger className="mt-1 text-xs h-9">
                      <SelectValue placeholder="Todos os veículos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os veículos</SelectItem>
                      {veiculos.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.placa} - {v.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-600">Motorista</Label>
                  <Select
                    value={filtroMotorista}
                    onValueChange={(val) => {
                      setFiltroMotorista(val)
                      setPaginaViagens(1)
                    }}
                  >
                    <SelectTrigger className="mt-1 text-xs h-9">
                      <SelectValue placeholder="Todos os motoristas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os motoristas</SelectItem>
                      {motoristas.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grid ou Listagem de Viagens */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lista de Viagens (coluna esquerda) */}
            <div className={`${viagemSelecionada ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Viagens Registradas ({dadosViagens.totalItems} total)
                </span>
                {carregandoViagens && (
                  <span className="text-xs text-emerald-600 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Carregando...
                  </span>
                )}
              </div>

              {dadosViagens.items.length === 0 && !carregandoViagens ? (
                <Card className="border-dashed p-8 text-center text-slate-500">
                  <Bus className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">Nenhuma viagem encontrada.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Ajuste os filtros ou utilize o botão "Programar Viagem" para iniciar.
                  </p>
                </Card>
              ) : (
                dadosViagens.items.map((viagem) => {
                  const veic = viagem.expand?.veiculo
                  const mot = viagem.expand?.motorista
                  const isSelecionada = viagemSelecionada?.id === viagem.id

                  const statusColors: Record<string, string> = {
                    programada: 'bg-sky-50 text-sky-700 border-sky-200',
                    em_transito: 'bg-amber-50 text-amber-700 border-amber-200',
                    concluida: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    cancelada: 'bg-rose-50 text-rose-700 border-rose-200',
                  }

                  return (
                    <Card
                      key={viagem.id}
                      className={`cursor-pointer transition-all border ${
                        isSelecionada
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => {
                        setViagemSelecionada(viagem)
                        setPaginaPassageiros(1)
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-slate-900">
                                {viagem.codigo_viagem}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] uppercase font-bold ${
                                  statusColors[viagem.status] || ''
                                }`}
                              >
                                {viagem.status.replace('_', ' ')}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className="text-[10px] bg-slate-100 text-slate-700"
                              >
                                {viagem.tipo_viagem}
                              </Badge>
                            </div>

                            <div className="text-xs text-slate-600 mt-2 flex items-center gap-3 flex-wrap">
                              <span className="flex items-center gap-1 font-medium text-slate-900">
                                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                {viagem.cidade_destino || 'Destino não informado'}
                                {viagem.local_destino ? ` • ${viagem.local_destino}` : ''}
                              </span>

                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                Saída: {formatarDataHoraViagemFuso(viagem.data_saida)}
                              </span>
                            </div>

                            <div className="text-xs text-slate-500 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2 rounded-md">
                              <div>
                                <span className="font-semibold text-slate-700">Veículo: </span>
                                {veic ? `${veic.placa} (${veic.descricao})` : 'Não vinculado'}
                                {veic?.status && veic.status !== 'disponivel' && (
                                  <Badge
                                    variant="outline"
                                    className="ml-1 text-[9px] bg-rose-50 text-rose-700 border-rose-300"
                                  >
                                    {veic.status}
                                  </Badge>
                                )}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-700">Motorista: </span>
                                {mot ? mot.nome : 'Não vinculado'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 space-y-1.5">
                            <div className="flex items-center gap-1 justify-end pt-1">
                              {viagem.status === 'programada' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    abrirModalReserva(viagem)
                                  }}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Vagas
                                </Button>
                              )}

                              {viagem.status === 'programada' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs text-slate-600 hover:bg-slate-100"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setViagemParaFinalizar(viagem)
                                    setKmFinalInput(
                                      viagem.km_inicial !== null && viagem.km_inicial !== undefined
                                        ? String(viagem.km_inicial)
                                        : '',
                                    )
                                    setDataRetornoRealInput('')
                                    setErroFinalizacao(null)
                                    setModalFinalizarViagemAberto(true)
                                  }}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Concluir
                                </Button>
                              )}

                              {viagem.status === 'programada' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                                  title="Cancelar Viagem"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCancelarViagem(viagem)
                                  }}
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}

              {/* Paginação de Viagens */}
              {dadosViagens.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">
                    Página {dadosViagens.page} de {dadosViagens.totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={dadosViagens.page <= 1}
                      onClick={() => setPaginaViagens((p) => Math.max(1, p - 1))}
                      className="h-7 px-2 text-xs"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={dadosViagens.page >= dadosViagens.totalPages}
                      onClick={() => setPaginaViagens((p) => p + 1)}
                      className="h-7 px-2 text-xs"
                    >
                      Próxima <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Detalhes da Viagem Selecionada & Gestão de Passageiros (coluna direita) */}
            {viagemSelecionada && (
              <div className="lg:col-span-5 space-y-4">
                <Card className="border-emerald-300 shadow-sm sticky top-4">
                  <CardHeader className="bg-slate-50 border-b border-slate-200 py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Bus className="w-4 h-4 text-emerald-600" />
                          Passageiros • {viagemSelecionada.codigo_viagem}
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Destino: {viagemSelecionada.cidade_destino}
                        </p>
                      </div>

                      {viagemSelecionada.status === 'programada' && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                          onClick={() => abrirModalReserva(viagemSelecionada)}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Reservar Vaga
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    {/* Lista Paginada de Passageiros da Viagem */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">
                          Passageiros Vinculados ({passageirosViagem.totalItems})
                        </span>
                        {carregandoPassageiros && (
                          <RefreshCw className="w-3 h-3 text-emerald-600 animate-spin" />
                        )}
                      </div>

                      {passageirosViagem.items.length === 0 && !carregandoPassageiros ? (
                        <div className="text-center py-6 text-slate-400 text-xs border border-dashed rounded-md">
                          Nenhum passageiro ou acompanhante reservado nesta viagem.
                        </div>
                      ) : (
                        passageirosViagem.items.map((pass) => {
                          const isAcomp = pass.tipo_passageiro === 'acompanhante'
                          const nomeExibicao = pass.nome_completo
                          const docExibicao = pass.documento_numero
                            ? `Doc: ${pass.documento_numero}`
                            : 'Sem documento'
                          const isCancelado = pass.status === 'cancelado'

                          return (
                            <div
                              key={pass.id}
                              className={`p-2.5 rounded-md border text-xs transition-colors ${
                                isCancelado
                                  ? 'bg-rose-50/50 border-rose-200 opacity-60'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-800 uppercase">
                                      {nomeExibicao}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] py-0 px-1 font-semibold ${
                                        isAcomp
                                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                                          : 'bg-sky-50 text-sky-700 border-sky-200'
                                      }`}
                                    >
                                      {isAcomp ? 'Acompanhante' : 'Paciente'}
                                    </Badge>
                                    {isCancelado && (
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] bg-rose-100 text-rose-800 border-rose-300 py-0"
                                      >
                                        Cancelado
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    {docExibicao}
                                    {pass.telefone ? ` • Tel: ${pass.telefone}` : ''}
                                  </div>

                                  {/* Trechos confirmados */}
                                  <div className="flex items-center gap-2 mt-1">
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                        pass.vagas_ida > 0
                                          ? 'bg-emerald-100 text-emerald-800 font-semibold'
                                          : 'bg-slate-100 text-slate-400 line-through'
                                      }`}
                                    >
                                      Ida ({pass.vagas_ida})
                                    </span>
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                        pass.vagas_volta > 0
                                          ? 'bg-emerald-100 text-emerald-800 font-semibold'
                                          : 'bg-slate-100 text-slate-400 line-through'
                                      }`}
                                    >
                                      Volta ({pass.vagas_volta})
                                    </span>
                                  </div>
                                </div>

                                {!isCancelado && viagemSelecionada.status === 'programada' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                                    title="Cancelar Vaga do Passageiro"
                                    onClick={() => handleCancelarPassageiro(pass)}
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}

                      {/* Paginação de Passageiros */}
                      {passageirosViagem.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[11px] text-slate-500">
                            Pág. {passageirosViagem.page}/{passageirosViagem.totalPages}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={passageirosViagem.page <= 1}
                              onClick={() => setPaginaPassageiros((p) => Math.max(1, p - 1))}
                              className="h-6 px-1.5 text-[10px]"
                            >
                              Anterior
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={passageirosViagem.page >= passageirosViagem.totalPages}
                              onClick={() => setPaginaPassageiros((p) => p + 1)}
                              className="h-6 px-1.5 text-[10px]"
                            >
                              Próxima
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA: VEÍCULOS & MANUTENÇÃO                                                */}
        {/* ========================================================================= */}
        <TabsContent value="veiculos" className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Frota de Veículos Sanitários</h2>
              <p className="text-xs text-slate-500">
                Cadastro de ambulâncias, vans e micro-ônibus com capacidade de passageiros e status
                operacional.
              </p>
            </div>
            {podeGerenciarCadastros && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setModalNovoVeiculoAberto(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Cadastrar Veículo
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {veiculos.map((v) => {
              const statusBadgeColors: Record<string, string> = {
                disponivel: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                em_viagem: 'bg-sky-100 text-sky-800 border-sky-300',
                manutencao: 'bg-amber-100 text-amber-800 border-amber-300',
                indisponivel: 'bg-rose-100 text-rose-800 border-rose-300',
                inativo: 'bg-rose-100 text-rose-800 border-rose-300',
              }

              return (
                <Card key={v.id} className="border-slate-200">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-bold text-slate-900">
                          {v.placa}
                        </CardTitle>
                        <p className="text-xs text-slate-500">
                          {v.descricao} {v.marca ? `• ${v.marca}` : ''}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold ${
                          statusBadgeColors[v.status] || ''
                        }`}
                      >
                        {v.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-800">Lotação:</span>{' '}
                        {v.capacidade_lotacao} lugares
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Combustível:</span>{' '}
                        {v.tipo_combustivel || 'N/D'}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Ano:</span> {v.ano || 'N/D'}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Extintor:</span>{' '}
                        {v.data_validade_extintor || 'N/D'}
                      </div>
                    </div>

                    {v.status === 'manutencao' && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-900 flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <span className="font-semibold">Veículo em Manutenção:</span>
                          <p className="text-[11px]">
                            {v.motivo_indisponibilidade || 'Em manutenção preventiva/corretiva.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {(v.status === 'inativo' || v.status === 'indisponivel') && (
                      <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded text-rose-900 flex items-center gap-2">
                        <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                        <div>
                          <span className="font-semibold">Veículo Indisponível / Inativado:</span>
                          <p className="text-[11px]">
                            {v.motivo_indisponibilidade || 'Fora de operação.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA: MOTORISTAS & VALIDADE CNH                                            */}
        {/* ========================================================================= */}
        <TabsContent value="motoristas" className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Quadro de Motoristas</h2>
              <p className="text-xs text-slate-500">
                Cadastro de condutores com controle de validade e categoria de CNH para conformidade
                operacional.
              </p>
            </div>
            {podeGerenciarCadastros && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setModalNovoMotoristaAberto(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Cadastrar Motorista
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {motoristas.map((m) => {
              const cnhVencida = m.cnh_vencimento ? new Date(m.cnh_vencimento) < new Date() : false

              return (
                <Card key={m.id} className="border-slate-200">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-bold text-slate-900">
                          {m.nome}
                        </CardTitle>
                        <p className="text-xs text-slate-500">
                          {m.telefone ? `Tel: ${m.telefone}` : 'Sem telefone registrado'}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          m.ativo
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {m.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-2 text-xs">
                    <div className="space-y-1 text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-800">CNH:</span> {m.cnh_numero}{' '}
                        (Cat. {m.cnh_categoria})
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">Validade CNH:</span>{' '}
                        <span>
                          {m.cnh_vencimento
                            ? new Date(m.cnh_vencimento).toLocaleDateString('pt-BR')
                            : 'Não informada'}
                        </span>
                        {cnhVencida && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] py-0 px-1 font-bold ml-1"
                          >
                            VENCIDA
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA: ROTAS                                                                */}
        {/* ========================================================================= */}
        <TabsContent value="rotas" className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Rotas e Itinerários</h2>
              <p className="text-xs text-slate-500">
                Trajetos parametrizados com estimativa de distância (km) e tempo de percurso.
              </p>
            </div>
            {podeGerenciarCadastros && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setModalNovaRotaAberto(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Cadastrar Rota
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rotas.map((r) => (
              <Card key={r.id} className="border-slate-200">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <ArrowRight className="w-4 h-4 text-emerald-600" />
                    {r.descricao}
                  </CardTitle>
                  <p className="text-xs text-slate-500">Origem: {r.municipio_saida}</p>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-1 text-xs text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-800">Distância:</span>{' '}
                    {r.distancia_estimada_km ? `${r.distancia_estimada_km} km` : 'Não informada'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA: DESTINOS                                                             */}
        {/* ========================================================================= */}
        <TabsContent value="destinos" className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Destinos e Unidades de Saúde</h2>
              <p className="text-xs text-slate-500">
                Hospitais de referência, policlínicas e centros de oncologia/hemodiálise para onde
                pacientes são transportados.
              </p>
            </div>
            {podeGerenciarCadastros && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setModalNovoDestinoAberto(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Cadastrar Destino
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {destinos.map((d) => (
              <Card key={d.id} className="border-slate-200">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    {d.nome}
                  </CardTitle>
                  <p className="text-xs text-slate-500">{d.municipio_localizacao}</p>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-1 text-xs text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-800">Endereço:</span>{' '}
                    {d.endereco || 'Não informado'}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">Telefone:</span>{' '}
                    {d.telefone || 'Não informado'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL: PROGRAMAR VIAGEM                                                    */}
      {/* ========================================================================= */}
      <Dialog open={modalNovaViagemAberto} onOpenChange={setModalNovaViagemAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Bus className="w-5 h-5 text-emerald-600" />
              Programar Nova Viagem Sanitária
            </DialogTitle>
            <DialogDescription>
              Escala de veículo, motorista com CNH, rota e datas de saída/retorno previsto no fuso
              da unidade.
            </DialogDescription>
          </DialogHeader>

          {erroFormViagem && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erroFormViagem}</span>
            </div>
          )}

          <form onSubmit={handleProgramarViagem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">
                  Código da Viagem (Opcional - auto gerado se vazio)
                </Label>
                <Input
                  placeholder="Ex: TR-2025-001"
                  value={formViagem.codigo_viagem}
                  onChange={(e) => setFormViagem({ ...formViagem, codigo_viagem: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Tipo de Viagem</Label>
                <Select
                  value={formViagem.tipo_viagem}
                  onValueChange={(val: any) => setFormViagem({ ...formViagem, tipo_viagem: val })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sanitario_eletivo">Transporte Sanitário Eletivo</SelectItem>
                    <SelectItem value="tfd_intermunicipal">TFD Intermunicipal</SelectItem>
                    <SelectItem value="urgencia_emergencia">Urgência e Emergência</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Veículo Escala <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formViagem.veiculoId}
                  onValueChange={(val) => setFormViagem({ ...formViagem, veiculoId: val })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue placeholder="Selecione o veículo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {veiculos.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.placa} - {v.descricao} ({v.capacidade_lotacao} vagas)
                        {v.status !== 'disponivel' ? ` [${v.status.toUpperCase()}]` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Motorista Escala <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formViagem.motoristaId}
                  onValueChange={(val) => setFormViagem({ ...formViagem, motoristaId: val })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue placeholder="Selecione o motorista..." />
                  </SelectTrigger>
                  <SelectContent>
                    {motoristas.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome} (CNH: Cat. {m.cnh_categoria}) {!m.ativo ? '[INATIVO]' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Data e Hora de Saída Prevista <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={formViagem.data_saida}
                  onChange={(e) => setFormViagem({ ...formViagem, data_saida: e.target.value })}
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div>
                <Label className="text-xs">Data e Hora de Retorno Prevista</Label>
                <Input
                  type="datetime-local"
                  value={formViagem.data_retorno_previsto}
                  onChange={(e) =>
                    setFormViagem({ ...formViagem, data_retorno_previsto: e.target.value })
                  }
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Cidade Destino</Label>
                <Input
                  placeholder="Ex: Cacoal, Porto Velho, Ji-Paraná"
                  value={formViagem.cidade_destino}
                  onChange={(e) => setFormViagem({ ...formViagem, cidade_destino: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Local / Hospital de Destino</Label>
                <Input
                  placeholder="Ex: Hospital Regional, Policlínica"
                  value={formViagem.local_destino}
                  onChange={(e) => setFormViagem({ ...formViagem, local_destino: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Rota Cadastrada (Opcional)</Label>
                <Select
                  value={formViagem.rotaId}
                  onValueChange={(val) => setFormViagem({ ...formViagem, rotaId: val })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue placeholder="Selecione uma rota..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rotas.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.descricao} (
                        {r.distancia_estimada_km ? `${r.distancia_estimada_km} km` : ''})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Km Inicial do Odômetro</Label>
                <Input
                  type="number"
                  placeholder="Ex: 45200"
                  value={formViagem.km_inicial}
                  onChange={(e) => setFormViagem({ ...formViagem, km_inicial: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Observações Operacionais</Label>
              <Input
                placeholder="Observações da rota, pontos de apoio ou abastecimento..."
                value={formViagem.observacoes}
                onChange={(e) => setFormViagem({ ...formViagem, observacoes: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovaViagemAberto(false)}
                disabled={salvandoViagem}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={salvandoViagem}
              >
                {salvandoViagem ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> Programando...
                  </>
                ) : (
                  'Salvar Programação'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: RESERVA DE VAGAS COM IDEMPOTÊNCIA E CONTROLE DE SEQUÊNCIA          */}
      {/* ========================================================================= */}
      <Dialog open={modalReservaAberto} onOpenChange={setModalReservaAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Users className="w-5 h-5 text-emerald-600" />
              Reserva Atômica de Vagas • Viagem {viagemSelecionada?.codigo_viagem}
            </DialogTitle>
            <DialogDescription>
              Reserva por trecho (ida e/ou volta) para pacientes e acompanhantes em vagas separadas
              com chave idempotente.
            </DialogDescription>
          </DialogHeader>

          {conflitoFormReserva && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-md text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Conflito Detectado:</span>
                <p className="mt-0.5">{conflitoFormReserva}</p>
                <p className="text-[11px] text-amber-700 mt-1">
                  Seus dados digitados continuam preenchidos abaixo. Ajuste o trecho ou o
                  acompanhante para reenviar.
                </p>
              </div>
            </div>
          )}

          {erroFormReserva && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Falha no Processamento:</span>
                <p className="mt-0.5">{erroFormReserva}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleConfirmarReserva} className="space-y-4">
            <div className="space-y-1">
              <SeletorPaciente
                label="Identificação do Paciente Titular"
                obrigatorio
                pacienteInicial={pacienteSelecionado}
                onSelecionar={handleTrocaPaciente}
              />
              <span className="text-[10px] text-slate-400 block">
                Chave idempotente:{' '}
                <code className="font-mono text-slate-600">{chaveIdempotenciaReserva}</code>
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <Label className="text-xs font-semibold text-slate-800 block">
                Trecho Solicitado:
              </Label>
              <Select
                value={trechoSelecionado}
                onValueChange={(val: any) => setTrechoSelecionado(val)}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ida_e_volta">Ida e Volta (Ambos os trechos)</SelectItem>
                  <SelectItem value="ida">Apenas Ida</SelectItem>
                  <SelectItem value="volta">Apenas Volta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isClinico ? (
              <div>
                <Label className="text-xs font-semibold text-sky-900 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-sky-600" />
                  Justificativa Clínica do Encaminhamento (Acesso Assistencial)
                </Label>
                <Input
                  placeholder="Ex: Consulta especializada em oncologia / hemodiálise eletiva regulada..."
                  value={justificativaClinicaPaciente}
                  onChange={(e) => setJustificativaClinicaPaciente(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            ) : (
              <div className="p-2.5 bg-slate-100/70 border border-slate-200 rounded text-[11px] text-slate-500 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Perfil Recepção: Dados estritamente administrativos. Justificativas clínicas e
                  diagnósticos permanecem no prontuário clínico autorizado.
                </span>
              </div>
            )}

            <div className="border border-slate-200 rounded-lg p-3 space-y-3 bg-white">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluirAcompanhante}
                  onChange={(e) => setIncluirAcompanhante(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  Incluir Acompanhante (Ocupa Vaga SEPARADA no Veículo)
                </span>
              </label>

              {incluirAcompanhante && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">
                        Nome do Acompanhante <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        placeholder="Nome completo do acompanhante"
                        value={dadosAcompanhante.nome_completo}
                        onChange={(e) =>
                          setDadosAcompanhante({
                            ...dadosAcompanhante,
                            nome_completo: e.target.value,
                          })
                        }
                        className="mt-1 text-xs"
                        required={incluirAcompanhante}
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Documento (CPF ou RG)</Label>
                      <Input
                        placeholder="Documento do acompanhante"
                        value={dadosAcompanhante.documento_numero}
                        onChange={(e) =>
                          setDadosAcompanhante({
                            ...dadosAcompanhante,
                            documento_numero: e.target.value,
                          })
                        }
                        className="mt-1 text-xs"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-xs">Telefone do Acompanhante</Label>
                      <Input
                        placeholder="(69) 99999-9999"
                        value={dadosAcompanhante.telefone}
                        onChange={(e) =>
                          setDadosAcompanhante({ ...dadosAcompanhante, telefone: e.target.value })
                        }
                        className="mt-1 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalReservaAberto(false)}
                disabled={salvandoReserva}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={salvandoReserva}
              >
                {salvandoReserva ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> Processando Reserva...
                  </>
                ) : (
                  'Confirmar Reserva de Vagas'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: FINALIZAR VIAGEM COM KM FINAL                                       */}
      {/* ========================================================================= */}
      <Dialog open={modalFinalizarViagemAberto} onOpenChange={setModalFinalizarViagemAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Finalizar Viagem • {viagemParaFinalizar?.codigo_viagem}
            </DialogTitle>
            <DialogDescription>
              Registro do retorno e apuração da quilometragem real percorrida.
            </DialogDescription>
          </DialogHeader>

          {erroFinalizacao && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">
              {erroFinalizacao}
            </div>
          )}

          <form onSubmit={handleFinalizarViagem} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <div>
                <span className="font-semibold text-slate-700">Km Inicial do Odômetro:</span>{' '}
                {viagemParaFinalizar?.km_inicial ?? 'Não registrado'} km
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Km Final no Retorno</Label>
              <Input
                type="number"
                placeholder="Ex: 45680"
                value={kmFinalInput}
                onChange={(e) => setKmFinalInput(e.target.value)}
                className="mt-1 text-xs"
                required
              />
            </div>

            <div>
              <Label className="text-xs">Data e Hora de Retorno Real</Label>
              <Input
                type="datetime-local"
                value={dataRetornoRealInput}
                onChange={(e) => setDataRetornoRealInput(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalFinalizarViagemAberto(false)}
                disabled={salvandoFinalizacao}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={salvandoFinalizacao}
              >
                {salvandoFinalizacao ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> Finalizando...
                  </>
                ) : (
                  'Concluir Viagem'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAIS DE CADASTROS BÁSICOS: VEÍCULO, MOTORISTA, ROTA, DESTINO             */}
      {/* ========================================================================= */}
      <Dialog open={modalNovoVeiculoAberto} onOpenChange={setModalNovoVeiculoAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bus className="w-5 h-5 text-emerald-600" /> Cadastrar Veículo
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriarVeiculo} className="space-y-3">
            <div>
              <Label className="text-xs">Placa</Label>
              <Input
                placeholder="Ex: ABC1D23"
                value={formVeiculo.placa}
                onChange={(e) => setFormVeiculo({ ...formVeiculo, placa: e.target.value })}
                className="mt-1 text-xs uppercase"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Descrição / Modelo</Label>
              <Input
                placeholder="Ex: Ducato Minibus"
                value={formVeiculo.descricao}
                onChange={(e) => setFormVeiculo({ ...formVeiculo, descricao: e.target.value })}
                className="mt-1 text-xs"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Marca</Label>
                <Input
                  placeholder="Ex: Fiat"
                  value={formVeiculo.marca}
                  onChange={(e) => setFormVeiculo({ ...formVeiculo, marca: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Capacidade Lotação (Lugares)</Label>
                <Input
                  type="number"
                  value={formVeiculo.capacidade_lotacao}
                  onChange={(e) =>
                    setFormVeiculo({
                      ...formVeiculo,
                      capacidade_lotacao: Number(e.target.value),
                    })
                  }
                  className="mt-1 text-xs"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Status Inicial</Label>
                <Select
                  value={formVeiculo.status}
                  onValueChange={(val: any) => setFormVeiculo({ ...formVeiculo, status: val })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponivel">Disponível</SelectItem>
                    <SelectItem value="manutencao">Em Manutenção</SelectItem>
                    <SelectItem value="indisponivel">Indisponível</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Ano Fabricação</Label>
                <Input
                  type="number"
                  value={formVeiculo.ano}
                  onChange={(e) => setFormVeiculo({ ...formVeiculo, ano: Number(e.target.value) })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
            {formVeiculo.status !== 'disponivel' && (
              <div>
                <Label className="text-xs">Motivo de Manutenção / Indisponibilidade</Label>
                <Input
                  placeholder="Ex: Troca de pastilhas de freio..."
                  value={formVeiculo.motivo_indisponibilidade}
                  onChange={(e) =>
                    setFormVeiculo({ ...formVeiculo, motivo_indisponibilidade: e.target.value })
                  }
                  className="mt-1 text-xs"
                />
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovoVeiculoAberto(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 text-white">
                Salvar Veículo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* NOVO MOTORISTA */}
      <Dialog open={modalNovoMotoristaAberto} onOpenChange={setModalNovoMotoristaAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" /> Cadastrar Motorista
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriarMotorista} className="space-y-3">
            <div>
              <Label className="text-xs">Nome Completo</Label>
              <Input
                placeholder="Ex: João da Silva"
                value={formMotorista.nome}
                onChange={(e) => setFormMotorista({ ...formMotorista, nome: e.target.value })}
                className="mt-1 text-xs"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Número CNH</Label>
                <Input
                  placeholder="Registro CNH"
                  value={formMotorista.cnh_numero}
                  onChange={(e) =>
                    setFormMotorista({ ...formMotorista, cnh_numero: e.target.value })
                  }
                  className="mt-1 text-xs"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Categoria CNH</Label>
                <Select
                  value={formMotorista.cnh_categoria}
                  onValueChange={(val) =>
                    setFormMotorista({ ...formMotorista, cnh_categoria: val })
                  }
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D (Passageiros)</SelectItem>
                    <SelectItem value="E">E</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Validade CNH</Label>
                <Input
                  type="date"
                  value={formMotorista.cnh_vencimento}
                  onChange={(e) =>
                    setFormMotorista({ ...formMotorista, cnh_vencimento: e.target.value })
                  }
                  className="mt-1 text-xs"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Telefone</Label>
                <Input
                  placeholder="(69) 99999-9999"
                  value={formMotorista.telefone}
                  onChange={(e) => setFormMotorista({ ...formMotorista, telefone: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovoMotoristaAberto(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 text-white">
                Salvar Motorista
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* NOVA ROTA */}
      <Dialog open={modalNovaRotaAberto} onOpenChange={setModalNovaRotaAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-emerald-600" /> Cadastrar Rota
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriarRota} className="space-y-3">
            <div>
              <Label className="text-xs">Descrição da Rota</Label>
              <Input
                placeholder="Ex: Linha Mirante - Porto Velho"
                value={formRota.descricao}
                onChange={(e) => setFormRota({ ...formRota, descricao: e.target.value })}
                className="mt-1 text-xs"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Município Saída</Label>
                <Input
                  value={formRota.municipio_saida}
                  onChange={(e) => setFormRota({ ...formRota, municipio_saida: e.target.value })}
                  className="mt-1 text-xs"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Distância (km)</Label>
                <Input
                  type="number"
                  value={formRota.distancia_estimada_km}
                  onChange={(e) =>
                    setFormRota({ ...formRota, distancia_estimada_km: Number(e.target.value) })
                  }
                  className="mt-1 text-xs"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovaRotaAberto(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 text-white">
                Salvar Rota
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* NOVO DESTINO */}
      <Dialog open={modalNovoDestinoAberto} onOpenChange={setModalNovoDestinoAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-500" /> Cadastrar Destino / Unidade
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriarDestino} className="space-y-3">
            <div>
              <Label className="text-xs">Nome do Estabelecimento</Label>
              <Input
                placeholder="Ex: Hospital de Base Dr. Ary Pinheiro"
                value={formDestino.nome}
                onChange={(e) => setFormDestino({ ...formDestino, nome: e.target.value })}
                className="mt-1 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Município Localização</Label>
              <Input
                placeholder="Ex: Porto Velho"
                value={formDestino.municipio_localizacao}
                onChange={(e) =>
                  setFormDestino({ ...formDestino, municipio_localizacao: e.target.value })
                }
                className="mt-1 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Endereço</Label>
              <Input
                placeholder="Av. Jorge Teixeira, ..."
                value={formDestino.endereco}
                onChange={(e) => setFormDestino({ ...formDestino, endereco: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input
                placeholder="(69) 99999-9999"
                value={formDestino.telefone}
                onChange={(e) => setFormDestino({ ...formDestino, telefone: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovoDestinoAberto(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 text-white">
                Salvar Destino
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
