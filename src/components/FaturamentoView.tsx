import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  ContaFaturamento,
  ItemContaFaturamento,
  ProducaoBPAItem,
  CompetenciaFaturamento,
  ProcedimentoSigtap,
  CID10Item,
  Paciente,
} from '@/types/hospital'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  executarConferenciaConsistencia,
  validarContaHospitalarAIH,
  validarItemProducaoBPA,
  ResultadoValidacaoContaAIH,
  ResultadoValidacaoItemBPA,
  ResumoConferenciaFaturamento,
} from '@/services/consistenciaFaturamento'
import { listarParametrosIntegracao } from '@/services/parametros'
import {
  listarContasFaturamento,
  obterContaComItens,
  alterarStatusConta,
  atualizarContaHospitalar,
  adicionarItemConta,
  removerItemConta,
  listarProducaoBPA,
  glosarItemBPA,
  reabrirItemBPA,
  listarCompetencias,
  fecharCompetencia,
  reabrirCompetencia,
  consolidarProducaoCompetencia,
  exportarRelatorioProducaoCSV,
  listarProcedimentosSigtap,
  importarTabelaSIGTAPCSV,
  executarGravacaoLoteSIGTAP,
  listarCID10,
  criarCID10,
  criarProcedimentoSigtap,
  calcularCompetenciaAtual,
  TotaisCompetencia,
} from '@/services/faturamento'
import { previsualizarSigtapCSV, PrevisualizacaoSIGTAPResultado } from '@/services/importacaoSigtap'
import { listarPacientes } from '@/services/cadastros'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Receipt,
  FileSpreadsheet,
  CalendarCheck,
  Database,
  FileText,
  Search,
  Upload,
  Download,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Eye,
  Lock,
  Unlock,
  DollarSign,
  TrendingUp,
  FolderSync,
  HelpCircle,
} from 'lucide-react'

export function FaturamentoView() {
  const { user } = useAuth()
  const { toast } = useToast()

  // Permissões
  const podeAdministrar = user?.role === 'admin' || user?.role === 'gestor'
  const podeLancar = podeAdministrar || user?.role === 'profissional'

  // Estados principais
  const [abaAtiva, setAbaAtiva] = useState('contas')
  const [loading, setLoading] = useState(false)
  const [competenciaFiltro, setCompetenciaFiltro] = useState<string>(calcularCompetenciaAtual())

  // Dados
  const [contas, setContas] = useState<ContaFaturamento[]>([])
  const [producoesBpa, setProducoesBpa] = useState<ProducaoBPAItem[]>([])
  const [competencias, setCompetencias] = useState<CompetenciaFaturamento[]>([])
  const [sigtapList, setSigtapList] = useState<ProcedimentoSigtap[]>([])
  const [cidList, setCidList] = useState<CID10Item[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])

  // Filtros de contas
  const [filtroStatusConta, setFiltroStatusConta] = useState<string>('todos')
  const [buscaConta, setBuscaConta] = useState('')

  // Filtros de BPA
  const [filtroStatusBpa, setFiltroStatusBpa] = useState<string>('todos')
  const [buscaBpa, setBuscaBpa] = useState('')

  // Filtros SIGTAP / CID
  const [buscaSigtap, setBuscaSigtap] = useState('')
  const [buscaCid, setBuscaCid] = useState('')

  // Modal Detalhes/Edição da Conta
  const [contaSelecionada, setContaSelecionada] = useState<ContaFaturamento | null>(null)
  const [itensContaAtiva, setItensContaAtiva] = useState<ItemContaFaturamento[]>([])
  const [modalContaAberto, setModalContaAberto] = useState(false)
  const [modalGlosaContaAberto, setModalGlosaContaAberto] = useState(false)
  const [motivoGlosaTemp, setMotivoGlosaTemp] = useState('')

  // Modal Adicionar Item na Conta
  const [modalAddItemAberto, setModalAddItemAberto] = useState(false)
  const [itemTipo, setItemTipo] = useState<
    'procedimento_secundario' | 'diaria' | 'material' | 'sessao' | 'exame'
  >('procedimento_secundario')
  const [itemProcCodigo, setItemProcCodigo] = useState('')
  const [itemQuantidade, setItemQuantidade] = useState<number>(1)
  const [itemObs, setItemObs] = useState('')

  // Modal Glosa BPA
  const [bpaAlvoGlosa, setBpaAlvoGlosa] = useState<ProducaoBPAItem | null>(null)
  const [modalGlosaBpaAberto, setModalGlosaBpaAberto] = useState(false)
  const [motivoGlosaBpaTemp, setMotivoGlosaBpaTemp] = useState('')

  // Fechamento de Competência
  const [totaisConsolidados, setTotaisConsolidados] = useState<TotaisCompetencia | null>(null)
  const [consolidando, setConsolidando] = useState(false)

  // Upload e Pré-Visualização SIGTAP CSV
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingSigtap, setUploadingSigtap] = useState(false)
  const [modalPreviewSigtap, setModalPreviewSigtap] = useState(false)
  const [previewSigtapDados, setPreviewSigtapDados] =
    useState<PrevisualizacaoSIGTAPResultado | null>(null)
  const [competenciaImportacaoSigtap, setCompetenciaImportacaoSigtap] = useState<string>(
    competenciaFiltro !== 'todas' ? competenciaFiltro : calcularCompetenciaAtual(),
  )
  const [gravandoLoteSigtap, setGravandoLoteSigtap] = useState(false)
  const [abaPreviewSigtap, setAbaPreviewSigtap] = useState<'validos' | 'rejeicoes'>('validos')

  // CNES parametrizado
  const [cnesParametrizado, setCnesParametrizado] = useState<string>('7823901')

  // Modal / Visualização de inconsistências específicas
  const [contaInconsistenciasModal, setContaInconsistenciasModal] =
    useState<ResultadoValidacaoContaAIH | null>(null)
  const [bpaInconsistenciasModal, setBpaInconsistenciasModal] =
    useState<ResultadoValidacaoItemBPA | null>(null)

  // Cadastro Manual SIGTAP
  const [modalNovoSigtap, setModalNovoSigtap] = useState(false)
  const [novoCodSigtap, setNovoCodSigtap] = useState('')
  const [novoNomeSigtap, setNovoNomeSigtap] = useState('')
  const [novoShSigtap, setNovoShSigtap] = useState('0')
  const [novoSaSigtap, setNovoSaSigtap] = useState('0')
  const [novoSpSigtap, setNovoSpSigtap] = useState('0')
  const [novaModalidadeSigtap, setNovaModalidadeSigtap] = useState<
    'ambulatorial' | 'hospitalar' | 'ambulatorial_e_hospitalar'
  >('hospitalar')

  // Cadastro Manual CID-10
  const [modalNovoCid, setModalNovoCid] = useState(false)
  const [novoCodCid, setNovoCodCid] = useState('')
  const [novoDescCid, setNovoDescCid] = useState('')
  const [novoCapCid, setNovoCapCid] = useState('')

  // Carregamento inicial
  const carregarDadosGerais = async () => {
    setLoading(true)
    try {
      const [listaContas, listaBpa, listaComp, listaSig, listaCid, listaPac] = await Promise.all([
        listarContasFaturamento({ competencia: competenciaFiltro }),
        listarProducaoBPA({ competencia: competenciaFiltro }),
        listarCompetencias(),
        listarProcedimentosSigtap(),
        listarCID10(),
        listarPacientes(),
      ])

      setContas(listaContas)
      setProducoesBpa(listaBpa)
      setCompetencias(listaComp)
      setSigtapList(listaSig)
      setCidList(listaCid)
      setPacientes(listaPac)

      // Carregar CNES parametrizado
      try {
        const params = await listarParametrosIntegracao()
        const cnesParam = params.find((p) => p.codigo === 'CNES')
        if (cnesParam) {
          const cfg =
            typeof cnesParam.configuracoes === 'string'
              ? JSON.parse(cnesParam.configuracoes)
              : cnesParam.configuracoes
          if (cfg?.codigo_unidade) setCnesParametrizado(cfg.codigo_unidade)
        }
      } catch {
        // Fallback default
      }

      // Consolidar totais para a competência selecionada
      if (competenciaFiltro) {
        const totais = await consolidarProducaoCompetencia(competenciaFiltro)
        setTotaisConsolidados(totais)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados do Faturamento',
        description: err.message || 'Falha na comunicação com o banco.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDadosGerais()
  }, [competenciaFiltro])

  // Recarregar itens da conta aberta
  const recarregarContaAtiva = async (contaId: string) => {
    try {
      const { conta, itens } = await obterContaComItens(contaId)
      setContaSelecionada(conta)
      setItensContaAtiva(itens)
      // Atualizar também na lista geral
      setContas((prev) => prev.map((c) => (c.id === conta.id ? conta : c)))
    } catch (err: any) {
      toast({
        title: 'Erro ao recarregar conta',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Abertura de modal de detalhes da conta
  const abrirDetalhesConta = async (conta: ContaFaturamento) => {
    try {
      const { conta: contaAtual, itens } = await obterContaComItens(conta.id)
      setContaSelecionada(contaAtual)
      setItensContaAtiva(itens)
      setModalContaAberto(true)
    } catch (err: any) {
      toast({
        title: 'Erro ao abrir conta',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Ações da Conta: Glosar
  const handleConfirmarGlosaConta = async () => {
    if (!contaSelecionada) return
    try {
      await alterarStatusConta({
        contaId: contaSelecionada.id,
        novoStatus: 'glosada',
        motivoGlosa: motivoGlosaTemp || 'Glosa técnica/administrativa',
        responsavelNome: user?.name || 'Auditor Hospitalar',
      })
      toast({
        title: 'Conta Glosada',
        description: `A conta ${contaSelecionada.numero_conta} foi marcada como glosada com auditoria registrada.`,
      })
      setModalGlosaContaAberto(false)
      setMotivoGlosaTemp('')
      await recarregarContaAtiva(contaSelecionada.id)
      carregarDadosGerais()
    } catch (err: any) {
      toast({
        title: 'Erro ao glosar conta',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Ações da Conta: Reabrir
  const handleReabrirConta = async (contaId: string) => {
    try {
      await alterarStatusConta({
        contaId,
        novoStatus: 'aberta',
        responsavelNome: user?.name || 'Faturista',
      })
      toast({
        title: 'Conta Reaberta',
        description: 'A conta voltou para o status Aberta e está disponível para edição.',
      })
      await recarregarContaAtiva(contaId)
      carregarDadosGerais()
    } catch (err: any) {
      toast({
        title: 'Erro ao reabrir conta',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Ações da Conta: Conciliar/Enviar
  const handleConciliarConta = async (contaId: string) => {
    try {
      await alterarStatusConta({
        contaId,
        novoStatus: 'conciliada',
        responsavelNome: user?.name || 'Faturista',
      })
      toast({
        title: 'Conta Conciliada',
        description: 'Conta revisada e validada para remessa SUS.',
      })
      await recarregarContaAtiva(contaId)
      carregarDadosGerais()
    } catch (err: any) {
      toast({
        title: 'Erro ao conciliar',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Adicionar item na conta
  const handleAdicionarItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contaSelecionada || !itemProcCodigo) return

    try {
      const proc = sigtapList.find((p) => p.codigo === itemProcCodigo)
      if (!proc) {
        toast({
          title: 'Código Inválido',
          description: 'O código informado não existe no catálogo SIGTAP importado.',
          variant: 'destructive',
        })
        return
      }

      await adicionarItemConta({
        conta: contaSelecionada.id,
        tipo: itemTipo,
        procedimento_codigo: proc.codigo,
        procedimento_nome: proc.nome,
        quantidade: Number(itemQuantidade) || 1,
        profissional_executante: user?.name || '',
        observacoes: itemObs,
      })

      toast({
        title: 'Item Lançado',
        description: `${proc.codigo} adicionado à conta com recalculo de valores.`,
      })

      setItemProcCodigo('')
      setItemQuantidade(1)
      setItemObs('')
      setModalAddItemAberto(false)
      await recarregarContaAtiva(contaSelecionada.id)
      carregarDadosGerais()
    } catch (err: any) {
      toast({
        title: 'Falha ao adicionar item',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Remover item da conta
  const handleRemoverItem = async (itemId: string) => {
    if (!contaSelecionada) return
    try {
      await removerItemConta(itemId, contaSelecionada.id)
      toast({
        title: 'Item Removido',
        description: 'Item excluído da conta e valores recalculados.',
      })
      await recarregarContaAtiva(contaSelecionada.id)
      carregarDadosGerais()
    } catch (err: any) {
      toast({
        title: 'Erro ao remover item',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Glosar Item BPA
  const handleConfirmarGlosaBpa = async () => {
    if (!bpaAlvoGlosa) return
    try {
      await glosarItemBPA(
        bpaAlvoGlosa.id,
        motivoGlosaBpaTemp || 'Glosa ambulatorial',
        user?.name || 'Auditor',
      )
      toast({
        title: 'Item BPA Glosado',
        description: 'Glosa registrada na auditoria.',
      })
      setModalGlosaBpaAberto(false)
      setBpaAlvoGlosa(null)
      setMotivoGlosaBpaTemp('')
      carregarDadosGerais()
    } catch (err: any) {
      toast({
        title: 'Erro ao glosar BPA',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Reabrir Item BPA
  const handleReabrirBpa = async (bpaId: string) => {
    try {
      await reabrirItemBPA(bpaId, user?.name || 'Faturista')
      toast({
        title: 'Item BPA Reaberto',
        description: 'Status redefinido para apurado.',
      })
      carregarDadosGerais()
    } catch (err: any) {
      toast({
        title: 'Erro ao reabrir BPA',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Fechamento de Competência
  const handleFecharCompetencia = async () => {
    if (!competenciaFiltro) return
    setConsolidando(true)
    try {
      await fecharCompetencia(competenciaFiltro, user?.name || 'Administrador SUS')
      toast({
        title: 'Competência Fechada com Sucesso',
        description: `A competência ${competenciaFiltro} foi apurada e fechada. Relatório de produção finalizado.`,
      })
      carregarDadosGerais()
    } catch (err: any) {
      toast({
        title: 'Erro ao fechar competência',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setConsolidando(false)
    }
  }

  const handleReabrirCompetenciaAtual = async () => {
    if (!competenciaFiltro) return
    setConsolidando(true)
    try {
      await reabrirCompetencia(competenciaFiltro, user?.name || 'Administrador SUS')
      toast({
        title: 'Competência Reaberta',
        description: `A competência ${competenciaFiltro} foi reaberta para novos lançamentos.`,
      })
      carregarDadosGerais()
    } catch (err: any) {
      toast({
        title: 'Erro ao reabrir competência',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setConsolidando(false)
    }
  }

  // Exportar CSV
  const handleExportarCSV = () => {
    if (!totaisConsolidados || totaisConsolidados.producaoPorProcedimento.length === 0) {
      toast({
        title: 'Sem Dados para Exportação',
        description: 'Não há itens na competência atual para exportar.',
        variant: 'destructive',
      })
      return
    }
    exportarRelatorioProducaoCSV(totaisConsolidados)
    toast({
      title: 'Relatório CSV Exportado',
      description:
        'Arquivo gerado em formato UTF-8 com BOM e ponto-e-vírgula para abertura direta no Excel.',
    })
  }

  // Importação CSV SIGTAP: Pré-visualização antes de gravar
  const handleUploadSIGTAP = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingSigtap(true)
    try {
      const text = await file.text()
      const compAlvo =
        competenciaImportacaoSigtap ||
        (competenciaFiltro !== 'todas' ? competenciaFiltro : calcularCompetenciaAtual())

      const preview = previsualizarSigtapCSV({
        conteudoCSV: text,
        competencia: compAlvo,
      })

      setPreviewSigtapDados(preview)
      setAbaPreviewSigtap(preview.rejeicoes.length > 0 ? 'rejeicoes' : 'validos')
      setModalPreviewSigtap(true)

      if (preview.rejeicoes.length > 0) {
        toast({
          title: 'Pré-Visualização Carregada com Rejeições',
          description: `${preview.totalValidos} procedimentos válidos e ${preview.totalRejeitados} rejeições detectadas. Revise antes de confirmar.`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Pré-Visualização Concluída',
          description: `${preview.totalValidos} procedimentos validados com sucesso. Confirme para gravar.`,
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao processar CSV SIGTAP',
        description: err.message || 'Formato CSV incompatível.',
        variant: 'destructive',
      })
    } finally {
      setUploadingSigtap(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Confirmação Explícita de Gravação do Lote SIGTAP
  const handleConfirmarGravacaoLoteSigtap = async () => {
    if (!previewSigtapDados || previewSigtapDados.itensValidos.length === 0) {
      toast({
        title: 'Nenhum item válido',
        description: 'Não há itens válidos no lote para gravação.',
        variant: 'destructive',
      })
      return
    }

    setGravandoLoteSigtap(true)
    try {
      const compAlvo = previewSigtapDados.competencia
      const resultado = await executarGravacaoLoteSIGTAP({
        itensValidos: previewSigtapDados.itensValidos,
        competencia: compAlvo,
        usuarioNome: user?.name || 'Administrador do Faturamento',
        usuarioRole: user?.role,
      })

      toast({
        title: 'Lote SIGTAP Gravado com Sucesso',
        description: `Competência ${compAlvo}: ${resultado.inseridos} novos inseridos, ${resultado.mantidosOuAtualizados} mantidos/atualizados. Contas históricas preservadas.`,
      })

      setModalPreviewSigtap(false)
      setPreviewSigtapDados(null)
      const novos = await listarProcedimentosSigtap()
      setSigtapList(novos)
      carregarDadosGerais()
    } catch (err: any) {
      toast({
        title: 'Falha na gravação do lote SIGTAP',
        description: err.message || 'Não foi possível gravar os dados.',
        variant: 'destructive',
      })
    } finally {
      setGravandoLoteSigtap(false)
    }
  }

  // Download Modelo Exemplo SIGTAP CSV
  const handleBaixarModeloCSV = () => {
    const modelo = [
      'codigo;nome;valor_sh;valor_sa;valor_sp;complexidade;modalidade',
      '03.01.06.008-8;Atendimento de Urgência em Pronto Atendimento;0,00;12,50;0,00;basica;ambulatorial',
      '03.03.01.003-7;Tratamento de Doenças Infecciosas (Internação);280,50;0,00;135,20;media;hospitalar',
      '02.04.03.017-0;Radiografia de Tórax;0,00;19,80;0,00;media;ambulatorial_e_hospitalar',
    ].join('\r\n')

    const blob = new Blob(['\uFEFF' + modelo], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo_importacao_sigtap.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Cadastrar Procedimento Manual
  const handleCadastrarSigtapManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoCodSigtap || !novoNomeSigtap) return

    try {
      await criarProcedimentoSigtap({
        codigo: novoCodSigtap.trim(),
        nome: novoNomeSigtap.trim(),
        valor_sh: parseFloat(novoShSigtap.replace(',', '.')) || 0,
        valor_sa: parseFloat(novoSaSigtap.replace(',', '.')) || 0,
        valor_sp: parseFloat(novoSpSigtap.replace(',', '.')) || 0,
        modalidade: novaModalidadeSigtap,
        complexidade: 'media',
      })
      toast({
        title: 'Procedimento Cadastrado',
        description: `${novoCodSigtap} adicionado ao catálogo municipal.`,
      })
      setModalNovoSigtap(false)
      setNovoCodSigtap('')
      setNovoNomeSigtap('')
      setNovoShSigtap('0')
      setNovoSaSigtap('0')
      setNovoSpSigtap('0')
      const novos = await listarProcedimentosSigtap()
      setSigtapList(novos)
    } catch (err: any) {
      toast({
        title: 'Erro ao cadastrar',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Cadastrar CID-10 Manual
  const handleCadastrarCidManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoCodCid || !novoDescCid) return

    try {
      await criarCID10({
        codigo: novoCodCid.trim().toUpperCase(),
        descricao: novoDescCid.trim(),
        capitulo: novoCapCid.trim() || undefined,
      })
      toast({
        title: 'CID-10 Cadastrado',
        description: `${novoCodCid} disponível para seleção nas contas e atendimentos.`,
      })
      setModalNovoCid(false)
      setNovoCodCid('')
      setNovoDescCid('')
      setNovoCapCid('')
      const novos = await listarCID10()
      setCidList(novos)
    } catch (err: any) {
      toast({
        title: 'Erro ao cadastrar CID',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Listas filtradas
  const contasFiltradas = useMemo(() => {
    return contas.filter((c) => {
      if (filtroStatusConta !== 'todos' && c.status !== filtroStatusConta) return false
      if (buscaConta.trim()) {
        const q = buscaConta.toLowerCase()
        const matchPac = (c.expand?.paciente?.nome || '').toLowerCase().includes(q)
        const matchConta = c.numero_conta.toLowerCase().includes(q)
        const matchProc = (c.procedimento_principal_nome || '').toLowerCase().includes(q)
        const matchCid = (c.cid_principal || '').toLowerCase().includes(q)
        if (!matchPac && !matchConta && !matchProc && !matchCid) return false
      }
      return true
    })
  }, [contas, filtroStatusConta, buscaConta])

  const producoesBpaFiltradas = useMemo(() => {
    return producoesBpa.filter((b) => {
      if (filtroStatusBpa !== 'todos' && b.status !== filtroStatusBpa) return false
      if (buscaBpa.trim()) {
        const q = buscaBpa.toLowerCase()
        const matchPac = (b.expand?.paciente?.nome || '').toLowerCase().includes(q)
        const matchProc = (b.procedimento_nome || '').toLowerCase().includes(q)
        const matchCod = b.procedimento_codigo.toLowerCase().includes(q)
        if (!matchPac && !matchProc && !matchCod) return false
      }
      return true
    })
  }, [producoesBpa, filtroStatusBpa, buscaBpa])

  const sigtapFiltrados = useMemo(() => {
    if (!buscaSigtap.trim()) return sigtapList.slice(0, 50)
    const q = buscaSigtap.toLowerCase()
    return sigtapList
      .filter((p) => p.codigo.toLowerCase().includes(q) || p.nome.toLowerCase().includes(q))
      .slice(0, 100)
  }, [sigtapList, buscaSigtap])

  const cidFiltrados = useMemo(() => {
    if (!buscaCid.trim()) return cidList.slice(0, 50)
    const q = buscaCid.toLowerCase()
    return cidList
      .filter((c) => c.codigo.toLowerCase().includes(q) || c.descricao.toLowerCase().includes(q))
      .slice(0, 100)
  }, [cidList, buscaCid])

  // Contexto e Conferência de Consistência
  const resumoConferencia: ResumoConferenciaFaturamento = useMemo(() => {
    const competenciasExistentesSigtap = competencias.map((c) => c.competencia)
    return executarConferenciaConsistencia({
      competencia: competenciaFiltro,
      contas,
      itensBpa: producoesBpa,
      contexto: {
        competenciaAtiva: competenciaFiltro,
        competenciasImportadasSigtap: competenciasExistentesSigtap,
        catalogoSigtap: sigtapList,
        catalogoCid10: cidList,
        pacientesExistentes: pacientes,
        cnesUnidadeCadastrado: cnesParametrizado,
      },
    })
  }, [
    competenciaFiltro,
    contas,
    producoesBpa,
    competencias,
    sigtapList,
    cidList,
    pacientes,
    cnesParametrizado,
  ])

  // Mapa de validação para busca rápida na listagem
  const mapaValidacaoContas = useMemo(() => {
    const map = new Map<string, ResultadoValidacaoContaAIH>()
    resumoConferencia.detalhesContas.forEach((d) => map.set(d.contaId, d))
    return map
  }, [resumoConferencia.detalhesContas])

  const mapaValidacaoBpa = useMemo(() => {
    const map = new Map<string, ResultadoValidacaoItemBPA>()
    resumoConferencia.detalhesBpa.forEach((d) => map.set(d.bpaId, d))
    return map
  }, [resumoConferencia.detalhesBpa])

  const statusCompAtual =
    competencias.find((c) => c.competencia === competenciaFiltro)?.status || 'aberta'

  return (
    <div className="space-y-6">
      {/* 1. TOPO: Cabeçalho com Seletor de Competência e Totalizadores */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-700 flex items-center justify-center text-white shadow">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Faturamento SUS Municipal (SIH / AIH & SIA / BPA)
                </h1>
                <Badge
                  variant="outline"
                  className={
                    statusCompAtual === 'fechada'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 text-xs font-bold'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold'
                  }
                >
                  {statusCompAtual === 'fechada' ? 'Competência Fechada' : 'Competência Aberta'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Gestão de contas hospitalares de internação, produção ambulatorial e fechamento
                SIGTAP
              </p>
            </div>
          </div>
        </div>

        {/* Seletor de Competência e Botão Atualizar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium">
            <CalendarCheck className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600">Competência:</span>
            <select
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              value={competenciaFiltro}
              onChange={(e) => setCompetenciaFiltro(e.target.value)}
            >
              <option value="2025-05">2025-05 (Maio/2025)</option>
              <option value="2025-04">2025-04 (Abril/2025)</option>
              <option value="2025-03">2025-03 (Março/2025)</option>
              <option value="2025-06">2025-06 (Junho/2025)</option>
              <option value="todas">Todas as Competências</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={carregarDadosGerais}
            disabled={loading}
            className="text-slate-600 h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* 2. CARDS DE RESUMO DA COMPETÊNCIA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Contas Hospitalares (AIH)</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {totaisConsolidados?.totalContasAIH || 0}
              </h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                Alta e internações apuradas
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Produção Ambulatorial (BPA)</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {totaisConsolidados?.totalItensBPA || 0}
              </h3>
              <p className="text-[11px] text-teal-600 font-semibold mt-0.5">
                PA e consultas agendadas
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Geral SUS (R$)</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-1">
                R${' '}
                {(totaisConsolidados?.valorTotalGeral || 0).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">SH + SA + SP consolidados</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Catálogo SIGTAP Ativo</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{sigtapList.length}</h3>
              <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
                {cidList.length} CIDs-10 cadastrados
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. ABAS DE NAVEGAÇÃO DO MÓDULO */}
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="space-y-4">
        <TabsList className="bg-white p-1 border border-slate-200 rounded-xl shadow-sm h-auto flex flex-wrap gap-1">
          <TabsTrigger
            value="conferencia"
            className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Conferência de Consistência
            {(resumoConferencia.contasAihComErros > 0 ||
              resumoConferencia.itensBpaComErros > 0) && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-black">
                {resumoConferencia.contasAihComErros + resumoConferencia.itensBpaComErros}
              </span>
            )}
            {(resumoConferencia.contasAihComAdvertencias > 0 ||
              resumoConferencia.itensBpaComAdvertencias > 0) &&
              resumoConferencia.contasAihComErros === 0 &&
              resumoConferencia.itensBpaComErros === 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-black">
                  {resumoConferencia.contasAihComAdvertencias +
                    resumoConferencia.itensBpaComAdvertencias}
                </span>
              )}
          </TabsTrigger>

          <TabsTrigger
            value="contas"
            className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white text-xs font-semibold py-2 px-3 rounded-lg"
          >
            <Receipt className="w-3.5 h-3.5 mr-1.5" />
            Fila de Contas Hospitalares (AIH) ({contas.length})
          </TabsTrigger>

          <TabsTrigger
            value="bpa"
            className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white text-xs font-semibold py-2 px-3 rounded-lg"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Produção Ambulatorial (BPA) ({producoesBpa.length})
          </TabsTrigger>

          <TabsTrigger
            value="fechamento"
            className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white text-xs font-semibold py-2 px-3 rounded-lg"
          >
            <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
            Fechamento de Competência & Exportação
          </TabsTrigger>

          <TabsTrigger
            value="sigtap"
            className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white text-xs font-semibold py-2 px-3 rounded-lg"
          >
            <Database className="w-3.5 h-3.5 mr-1.5" />
            Catálogo SIGTAP & Importação CSV
          </TabsTrigger>

          <TabsTrigger
            value="cid10"
            className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white text-xs font-semibold py-2 px-3 rounded-lg"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Tabela CID-10 ({cidList.length})
          </TabsTrigger>
        </TabsList>

        {/* ============================================================== */}
        {/* ABA 0: PAINEL DE CONFERÊNCIA DE CONSISTÊNCIA PRÉ-EXPORTAÇÃO     */}
        {/* ============================================================== */}
        <TabsContent value="conferencia" className="space-y-4">
          {/* Header explicativo com rotulagem documental expressa */}
          <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    <h2 className="text-sm font-bold text-slate-900">
                      Conferência de Consistência do Faturamento SUS Municipal
                    </h2>
                    <Badge
                      variant="outline"
                      className="bg-white text-[10px] text-emerald-800 border-emerald-300 font-semibold"
                    >
                      Validação Administrativa Interna
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    Rotina preventiva antes de qualquer exportação ou fechamento. Compara campos
                    obrigatórios, regras de período da AIH (6 meses), catálogo SIGTAP ativo e
                    duplicidade de BPA.
                    <strong className="text-slate-800 ml-1">
                      Nenhum dado retrospectivo é alterado e nenhuma conta é marcada como enviada.
                    </strong>
                  </p>
                </div>

                <div className="text-[11px] text-slate-500 bg-white/80 p-2.5 rounded-lg border border-emerald-200 shrink-0">
                  <div className="font-bold text-slate-700 mb-0.5">
                    Fontes Oficiais Consultadas:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                    <li>Manual SIH/DATASUS 2017 (Jan/2017)</li>
                    <li>Manual Créditos Financeiros MS (2025)</li>
                    <li>SIGTAP / SIA-SUS Oficial</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards agregados de consistência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      AIH: Contas Aptas
                    </span>
                    <div className="text-xl font-black text-emerald-700 mt-0.5">
                      {resumoConferencia.contasAihValidas} /{' '}
                      {resumoConferencia.totalContasAihAvaliadas}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    AIH
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-2">
                  {resumoConferencia.contasAihComErros > 0 ? (
                    <span className="text-rose-600 font-bold">
                      {resumoConferencia.contasAihComErros} conta(s) com erros impeditivos
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium">Nenhum erro impeditivo</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      BPA: Produções Aptas
                    </span>
                    <div className="text-xl font-black text-teal-700 mt-0.5">
                      {resumoConferencia.itensBpaValidos} /{' '}
                      {resumoConferencia.totalItensBpaAvaliados}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                    BPA
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-2">
                  {resumoConferencia.itensBpaComErros > 0 ? (
                    <span className="text-rose-600 font-bold">
                      {resumoConferencia.itensBpaComErros} item(ns) com erros
                    </span>
                  ) : (
                    <span className="text-teal-700 font-medium">Nenhum erro impeditivo</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Advertências Totais
                    </span>
                    <div className="text-xl font-black text-amber-600 mt-0.5">
                      {resumoConferencia.contasAihComAdvertencias +
                        resumoConferencia.itensBpaComAdvertencias}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-2">
                  Avisos documentais e checagens administrativas
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">Duplicidades BPA</span>
                    <div className="text-xl font-black text-indigo-700 mt-0.5">
                      {resumoConferencia.itensBpaDuplicados}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    DUP
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-2">
                  Mesmo atendimento/procedimento na competência
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerta de competência SIGTAP não importada */}
          {!resumoConferencia.competenciaSigtapImportada && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                <strong>Atenção Regulatória SIGTAP:</strong> A competência {competenciaFiltro} não
                está formalmente importada na tabela SIGTAP local. Conforme diretrizes oficiais,
                procedimentos não são dados como erro falso, devendo ser validados manualmente
                contra a vigência do DATASUS.
              </div>
            </div>
          )}

          {/* Tabela de Inconsistências Detectadas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bloco 1: Inconsistências em Contas AIH */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-3.5 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-700" />
                    Consistência das Contas AIH ({resumoConferencia.detalhesContas.length})
                  </CardTitle>
                </div>
                <span className="text-[10px] text-slate-500">
                  {resumoConferencia.contasAihComErros} com erro |{' '}
                  {resumoConferencia.contasAihComAdvertencias} com aviso
                </span>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {resumoConferencia.detalhesContas.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">
                      Nenhuma conta AIH nesta competência.
                    </div>
                  ) : (
                    resumoConferencia.detalhesContas.map((det) => (
                      <div key={det.contaId} className="p-3 hover:bg-slate-50/80 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="font-mono font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            {det.numeroConta}
                            {det.valida && det.totalAdvertencias === 0 && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                                Consistente
                              </Badge>
                            )}
                            {det.totalErros > 0 && (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {det.totalErros} Erro(s)
                              </Badge>
                            )}
                            {det.totalAdvertencias > 0 && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                                {det.totalAdvertencias} Advertência(s)
                              </Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px] px-2 text-slate-600 hover:text-slate-900"
                            onClick={() => setContaInconsistenciasModal(det)}
                          >
                            Ver detalhes
                          </Button>
                        </div>

                        {/* Lista rápida de mensagens */}
                        <div className="mt-1.5 space-y-1">
                          {det.erros.map((e, idx) => (
                            <div
                              key={`err-${idx}`}
                              className="text-[11px] text-rose-700 bg-rose-50/70 p-1.5 rounded border border-rose-200/60"
                            >
                              <span className="font-bold">[{e.campo}]:</span> {e.mensagem}
                              <div className="text-[9px] text-slate-500 mt-0.5">
                                Fonte: {e.fonteOficial}
                              </div>
                            </div>
                          ))}
                          {det.advertencias.map((a, idx) => (
                            <div
                              key={`adv-${idx}`}
                              className="text-[11px] text-amber-800 bg-amber-50/70 p-1.5 rounded border border-amber-200/60"
                            >
                              <span className="font-bold">[{a.campo}]:</span> {a.mensagem}
                              <div className="text-[9px] text-slate-500 mt-0.5">
                                Fonte: {a.fonteOficial}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bloco 2: Inconsistências e Duplicidade BPA */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-3.5 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-teal-700" />
                    Consistência da Produção BPA ({resumoConferencia.detalhesBpa.length})
                  </CardTitle>
                </div>
                <span className="text-[10px] text-slate-500">
                  {resumoConferencia.itensBpaComErros} erro(s) |{' '}
                  {resumoConferencia.itensBpaDuplicados} duplicado(s)
                </span>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {resumoConferencia.detalhesBpa.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">
                      Nenhum registro BPA nesta competência.
                    </div>
                  ) : (
                    resumoConferencia.detalhesBpa.map((det) => (
                      <div key={det.bpaId} className="p-3 hover:bg-slate-50/80 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-slate-800 text-xs flex items-center gap-1.5">
                            <span className="font-mono font-bold text-blue-700">
                              {det.procedimentoCodigo}
                            </span>
                            <span className="text-slate-500 font-normal truncate max-w-[150px]">
                              {det.pacienteNome}
                            </span>
                            {det.valida && det.totalAdvertencias === 0 && (
                              <Badge className="bg-teal-100 text-teal-800 border-teal-200 text-[10px]">
                                Válido
                              </Badge>
                            )}
                            {det.duplicidadeDetectada && (
                              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]">
                                Duplicado
                              </Badge>
                            )}
                            {det.totalErros > 0 && (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                                {det.totalErros} Erro(s)
                              </Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px] px-2 text-slate-600 hover:text-slate-900"
                            onClick={() => setBpaInconsistenciasModal(det)}
                          >
                            Ver detalhes
                          </Button>
                        </div>

                        {/* Mensagens rápidas */}
                        <div className="mt-1.5 space-y-1">
                          {det.erros.map((e, idx) => (
                            <div
                              key={`bpa-err-${idx}`}
                              className="text-[11px] text-rose-700 bg-rose-50/70 p-1.5 rounded border border-rose-200/60"
                            >
                              <span className="font-bold">[{e.campo}]:</span> {e.mensagem}
                              <div className="text-[9px] text-slate-500 mt-0.5">
                                Fonte: {e.fonteOficial}
                              </div>
                            </div>
                          ))}
                          {det.advertencias.map((a, idx) => (
                            <div
                              key={`bpa-adv-${idx}`}
                              className="text-[11px] text-amber-800 bg-amber-50/70 p-1.5 rounded border border-amber-200/60"
                            >
                              <span className="font-bold">[{a.campo}]:</span> {a.mensagem}
                              <div className="text-[9px] text-slate-500 mt-0.5">
                                Fonte: {a.fonteOficial}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA 1: FILA DE CONTAS HOSPITALARES (AIH)                       */}
        {/* ============================================================== */}
        <TabsContent value="contas" className="space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Buscar por paciente, nº AIH, CID ou procedimento..."
                    value={buscaConta}
                    onChange={(e) => setBuscaConta(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>

                <select
                  className="h-8 px-2.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
                  value={filtroStatusConta}
                  onChange={(e) => setFiltroStatusConta(e.target.value)}
                >
                  <option value="todos">Todos os Status</option>
                  <option value="aberta">Aberta</option>
                  <option value="conciliada">Conciliada</option>
                  <option value="glosada">Glosada</option>
                  <option value="enviada">Enviada</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Exibindo <strong>{contasFiltradas.length}</strong> conta(s)
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Nº Conta / AIH</th>
                      <th className="py-2.5 px-3">Paciente</th>
                      <th className="py-2.5 px-3">Internação / Alta</th>
                      <th className="py-2.5 px-3">Procedimento Principal (SIGTAP)</th>
                      <th className="py-2.5 px-3">CID-10</th>
                      <th className="py-2.5 px-3 text-right">Valores (SH + SP + SA)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          Nenhuma conta hospitalar encontrada na competência atual.
                        </td>
                      </tr>
                    ) : (
                      contasFiltradas.map((conta) => (
                        <tr key={conta.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span>{conta.numero_conta}</span>
                              {mapaValidacaoContas.get(conta.id)?.totalErros ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setContaInconsistenciasModal(mapaValidacaoContas.get(conta.id)!)
                                  }
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 border border-rose-300 font-bold hover:bg-rose-200"
                                  title="Ver inconsistências detectadas conforme normas SIH"
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                  {mapaValidacaoContas.get(conta.id)!.totalErros} erro(s)
                                </button>
                              ) : mapaValidacaoContas.get(conta.id)?.totalAdvertencias ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setContaInconsistenciasModal(mapaValidacaoContas.get(conta.id)!)
                                  }
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 border border-amber-300 font-medium hover:bg-amber-200"
                                  title="Ver avisos documentais"
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                  {mapaValidacaoContas.get(conta.id)!.totalAdvertencias} aviso(s)
                                </button>
                              ) : (
                                <span className="inline-flex items-center px-1 rounded text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  consistente
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {conta.expand?.paciente?.nome || 'Paciente'}
                            <div className="text-[10px] text-slate-500 font-normal">
                              CNS: {conta.expand?.paciente?.cartao_sus || 'N/A'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <div>Entrada: {conta.data_internacao}</div>
                            {conta.data_alta && (
                              <div className="text-emerald-700 font-medium">
                                Saída: {conta.data_alta}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 max-w-[240px]">
                            <span className="font-mono text-[11px] font-bold text-blue-700 block">
                              {conta.procedimento_principal_codigo}
                            </span>
                            <span
                              className="truncate block text-slate-700"
                              title={conta.procedimento_principal_nome}
                            >
                              {conta.procedimento_principal_nome}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                            {conta.cid_principal || 'N/I'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="font-black text-slate-900">
                              R$ {(conta.valor_total || 0).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              SH: {(conta.valor_sh || 0).toFixed(2)} | SP:{' '}
                              {(conta.valor_sp || 0).toFixed(2)}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              className={
                                conta.status === 'glosada'
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : conta.status === 'conciliada' || conta.status === 'enviada'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : 'bg-blue-100 text-blue-800 border-blue-200'
                              }
                            >
                              {conta.status.toUpperCase()}
                            </Badge>
                            {conta.motivo_glosa && (
                              <div
                                className="text-[9px] text-rose-600 font-medium mt-0.5 truncate max-w-[120px]"
                                title={conta.motivo_glosa}
                              >
                                {conta.motivo_glosa}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2"
                                onClick={() => abrirDetalhesConta(conta)}
                                title="Visualizar / Lançar Itens"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                Detalhes
                              </Button>

                              {podeAdministrar && (
                                <>
                                  {conta.status === 'glosada' ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                      onClick={() => handleReabrirConta(conta.id)}
                                      title="Reabrir Conta Glosada"
                                    >
                                      <Unlock className="w-3.5 h-3.5 mr-1" />
                                      Reabrir
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs px-2 text-rose-700 border-rose-300 hover:bg-rose-50"
                                      onClick={() => {
                                        setContaSelecionada(conta)
                                        setMotivoGlosaTemp('')
                                        setModalGlosaContaAberto(true)
                                      }}
                                      title="Glosar Conta"
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                                      Glosar
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA 2: PRODUÇÃO AMBULATORIAL (BPA)                             */}
        {/* ============================================================== */}
        <TabsContent value="bpa" className="space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Buscar paciente, procedimento BPA ou código..."
                    value={buscaBpa}
                    onChange={(e) => setBuscaBpa(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>

                <select
                  className="h-8 px-2.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
                  value={filtroStatusBpa}
                  onChange={(e) => setFiltroStatusBpa(e.target.value)}
                >
                  <option value="todos">Todos os Status</option>
                  <option value="apurado">Apurado</option>
                  <option value="pendente">Pendente</option>
                  <option value="glosado">Glosado</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Exibindo <strong>{producoesBpaFiltradas.length}</strong> registro(s) BPA
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Paciente</th>
                      <th className="py-2.5 px-3">Origem</th>
                      <th className="py-2.5 px-3">Procedimento SIGTAP</th>
                      <th className="py-2.5 px-3">Profissional</th>
                      <th className="py-2.5 px-3 text-center">Qtd</th>
                      <th className="py-2.5 px-3 text-right">Valor Total (SA)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {producoesBpaFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-500">
                          Nenhum registro de produção ambulatorial BPA na competência atual.
                        </td>
                      </tr>
                    ) : (
                      producoesBpaFiltradas.map((bpa) => (
                        <tr key={bpa.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono">
                            <div>{bpa.data_atendimento}</div>
                            {mapaValidacaoBpa.get(bpa.id)?.duplicidadeDetectada && (
                              <button
                                type="button"
                                onClick={() =>
                                  setBpaInconsistenciasModal(mapaValidacaoBpa.get(bpa.id)!)
                                }
                                className="inline-flex items-center gap-0.5 px-1 rounded text-[9px] bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold mt-0.5"
                                title="Duplicidade detectada no mesmo atendimento"
                              >
                                duplicado
                              </button>
                            )}
                            {mapaValidacaoBpa.get(bpa.id)?.totalErros ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setBpaInconsistenciasModal(mapaValidacaoBpa.get(bpa.id)!)
                                }
                                className="inline-flex items-center gap-0.5 px-1 rounded text-[9px] bg-rose-100 text-rose-800 border border-rose-300 font-bold mt-0.5"
                              >
                                {mapaValidacaoBpa.get(bpa.id)!.totalErros} erro
                              </button>
                            ) : null}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {bpa.expand?.paciente?.nome || 'Paciente'}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className="text-[10px] bg-slate-50">
                              {bpa.origem_atendimento === 'pronto_atendimento'
                                ? 'Pronto Atendimento'
                                : 'Ambulatório Agendado'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-blue-700 font-bold block">
                              {bpa.procedimento_codigo}
                            </span>
                            <span className="text-slate-700">{bpa.procedimento_nome}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {bpa.profissional_nome || bpa.expand?.profissional?.nome || 'Plantão'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">{bpa.quantidade}</td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">
                            R$ {(bpa.valor_total || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              className={
                                bpa.status === 'glosado'
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }
                            >
                              {bpa.status.toUpperCase()}
                            </Badge>
                            {bpa.motivo_glosa && (
                              <div
                                className="text-[9px] text-rose-600 mt-0.5 max-w-[100px] truncate"
                                title={bpa.motivo_glosa}
                              >
                                {bpa.motivo_glosa}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {podeAdministrar && (
                              <>
                                {bpa.status === 'glosado' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[10px] px-2 text-emerald-700"
                                    onClick={() => handleReabrirBpa(bpa.id)}
                                  >
                                    Reabrir
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[10px] px-2 text-rose-700"
                                    onClick={() => {
                                      setBpaAlvoGlosa(bpa)
                                      setMotivoGlosaBpaTemp('')
                                      setModalGlosaBpaAberto(true)
                                    }}
                                  >
                                    Glosar
                                  </Button>
                                )}
                              </>
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
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA 3: FECHAMENTO DE COMPETÊNCIA & RELATÓRIO EXCEL CSV         */}
        {/* ============================================================== */}
        <TabsContent value="fechamento" className="space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-700" />
                  Fechamento da Competência: {competenciaFiltro}
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consolidação da produção hospitalar (AIH) e ambulatorial (BPA) do mês com
                  exportação CSV compatível com Excel.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleExportarCSV}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Exportar Relatório CSV (Excel UTF-8 BOM)
                </Button>

                {podeAdministrar && (
                  <>
                    {statusCompAtual === 'fechada' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleReabrirCompetenciaAtual}
                        disabled={consolidando}
                        className="text-amber-700 border-amber-300 hover:bg-amber-50"
                      >
                        <Unlock className="w-4 h-4 mr-1.5" />
                        Reabrir Competência
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleFecharCompetencia}
                        disabled={consolidando}
                        className="text-rose-700 border-rose-300 hover:bg-rose-50"
                      >
                        <Lock className="w-4 h-4 mr-1.5" />
                        Fechar Competência
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-6">
              {/* Tabela de totais por procedimento */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Produção Consolidada por Procedimento (SIGTAP)
                  </h4>
                  <span className="text-xs text-slate-500">
                    {totaisConsolidados?.producaoPorProcedimento.length || 0} procedimento(s) com
                    produção
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Código SIGTAP</th>
                        <th className="py-2.5 px-3">Nome do Procedimento</th>
                        <th className="py-2.5 px-3 text-center">Instrumento</th>
                        <th className="py-2.5 px-3 text-center">Quantidade</th>
                        <th className="py-2.5 px-3 text-right">Valor SH (R$)</th>
                        <th className="py-2.5 px-3 text-right">Valor SA (R$)</th>
                        <th className="py-2.5 px-3 text-right">Valor SP (R$)</th>
                        <th className="py-2.5 px-3 text-right">Valor Total (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {totaisConsolidados?.producaoPorProcedimento.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500">
                            Nenhuma produção computada para esta competência.
                          </td>
                        </tr>
                      ) : (
                        totaisConsolidados?.producaoPorProcedimento.map((item) => (
                          <tr
                            key={`${item.instrumento}-${item.codigo}`}
                            className="hover:bg-slate-50"
                          >
                            <td className="py-2 px-3 font-mono font-bold text-blue-700">
                              {item.codigo}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{item.nome}</td>
                            <td className="py-2 px-3 text-center">
                              <Badge variant="outline" className="text-[10px]">
                                {item.instrumento}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-center font-bold">{item.quantidade}</td>
                            <td className="py-2 px-3 text-right font-mono">
                              {item.valorSH.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {item.valorSA.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {item.valorSP.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              R$ {item.valorTotal.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
                      <tr>
                        <td colSpan={3} className="py-3 px-3 uppercase text-slate-900">
                          Total Geral da Competência
                        </td>
                        <td className="py-3 px-3 text-center text-slate-900">
                          {(totaisConsolidados?.totalContasAIH || 0) +
                            (totaisConsolidados?.totalItensBPA || 0)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-900">
                          R$ {(totaisConsolidados?.valorTotalSH || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-900">
                          R$ {(totaisConsolidados?.valorTotalSA || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-900">
                          R$ {(totaisConsolidados?.valorTotalSP || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-800 text-sm font-black">
                          R$ {(totaisConsolidados?.valorTotalGeral || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA 4: CATÁLOGO SIGTAP & IMPORTAÇÃO CSV                        */}
        {/* ============================================================== */}
        <TabsContent value="sigtap" className="space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-700" />
                  Catálogo Municipal de Procedimentos SIGTAP
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Importe o arquivo CSV oficial ou adicione procedimentos específicos para a rede
                  hospitalar e ambulatorial.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleUploadSIGTAP}
                  className="hidden"
                />

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                  <Label
                    htmlFor="comp-import-sigtap"
                    className="text-[10px] font-bold text-slate-600 uppercase"
                  >
                    Competência Alvo:
                  </Label>
                  <Input
                    id="comp-import-sigtap"
                    value={competenciaImportacaoSigtap}
                    onChange={(e) => setCompetenciaImportacaoSigtap(e.target.value)}
                    placeholder="AAAA-MM"
                    className="w-24 h-6 text-xs font-mono px-1 py-0"
                    title="Competência oficial da tabela importada (ex: 2026-09)"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBaixarModeloCSV}
                  className="text-xs h-8"
                  title="Baixar arquivo modelo CSV"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Modelo CSV
                </Button>

                {podeAdministrar && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingSigtap}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      {uploadingSigtap ? 'Processando...' : 'Importar SIGTAP (CSV)'}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setModalNovoSigtap(true)}
                      className="text-xs h-8"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Novo Procedimento
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Filtrar por código SIGTAP (ex: 03.03...) ou nome do procedimento..."
                    value={buscaSigtap}
                    onChange={(e) => setBuscaSigtap(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[480px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Nome do Procedimento</th>
                      <th className="py-2.5 px-3 text-right">SH (Hospitalar)</th>
                      <th className="py-2.5 px-3 text-right">SA (Ambulat.)</th>
                      <th className="py-2.5 px-3 text-right">SP (Profissional)</th>
                      <th className="py-2.5 px-3 text-center">Modalidade</th>
                      <th className="py-2.5 px-3 text-center">Complexidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sigtapFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-500">
                          Nenhum procedimento encontrado com o filtro informado.
                        </td>
                      </tr>
                    ) : (
                      sigtapFiltrados.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-blue-700">
                            {item.codigo}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{item.nome}</td>
                          <td className="py-2 px-3 text-right font-mono">
                            R$ {(item.valor_sh || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            R$ {(item.valor_sa || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            R$ {(item.valor_sp || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Badge variant="outline" className="text-[10px]">
                              {item.modalidade === 'ambulatorial'
                                ? 'Ambulatorial'
                                : item.modalidade === 'hospitalar'
                                  ? 'Hospitalar'
                                  : 'Amb. & Hosp.'}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">
                              {item.complexidade || 'Média'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA 5: TABELA CID-10                                           */}
        {/* ============================================================== */}
        <TabsContent value="cid10" className="space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  Lista Simplificada de CID-10 Pronto para Uso
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Códigos de Classificação Internacional de Doenças para admissões, altas e contas
                  hospitalares.
                </p>
              </div>

              {podeAdministrar && (
                <Button
                  size="sm"
                  onClick={() => setModalNovoCid(true)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Novo CID-10
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Buscar por código CID (ex: J18, I10, A09) ou descrição..."
                  value={buscaCid}
                  onChange={(e) => setBuscaCid(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[440px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Código CID</th>
                      <th className="py-2.5 px-3">Descrição da Patologia</th>
                      <th className="py-2.5 px-3 text-center">Capítulo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cidFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-slate-500">
                          Nenhum código CID-10 localizado.
                        </td>
                      </tr>
                    ) : (
                      cidFiltrados.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {item.codigo}
                          </td>
                          <td className="py-2 px-3 text-slate-800 font-medium">{item.descricao}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-500">
                            {item.capitulo || 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============================================================== */}
      {/* MODAL: DETALHES DA CONTA HOSPITALAR & LANÇAMENTO DE ITENS      */}
      {/* ============================================================== */}
      <Dialog open={modalContaAberto} onOpenChange={setModalContaAberto}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {contaSelecionada && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-700" />
                    Conta Hospitalar SUS — {contaSelecionada.numero_conta}
                  </DialogTitle>
                  <Badge
                    className={
                      contaSelecionada.status === 'glosada'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }
                  >
                    {contaSelecionada.status.toUpperCase()}
                  </Badge>
                </div>
              </DialogHeader>

              {/* Informações Gerais da Conta */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Paciente
                  </span>
                  <span className="font-semibold text-slate-900">
                    {contaSelecionada.expand?.paciente?.nome || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Data Entrada / Saída
                  </span>
                  <span className="text-slate-800">
                    {contaSelecionada.data_internacao}{' '}
                    {contaSelecionada.data_alta ? `→ ${contaSelecionada.data_alta}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    CID Principal
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {contaSelecionada.cid_principal || 'N/I'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Valor Total Atual
                  </span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    R$ {(contaSelecionada.valor_total || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Procedimento Principal */}
              <div className="border border-blue-200 bg-blue-50/70 p-3 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-blue-900 block">
                  Procedimento Principal SIGTAP
                </span>
                <div className="flex items-center justify-between mt-1">
                  <div>
                    <span className="font-mono font-bold text-blue-800">
                      {contaSelecionada.procedimento_principal_codigo}
                    </span>{' '}
                    —{' '}
                    <span className="font-medium text-slate-800">
                      {contaSelecionada.procedimento_principal_nome}
                    </span>
                  </div>
                  <div className="text-right text-xs font-mono font-bold text-blue-900">
                    SH: R$ {(contaSelecionada.valor_sh || 0).toFixed(2)} | SP: R${' '}
                    {(contaSelecionada.valor_sp || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Glosa se houver */}
              {contaSelecionada.status === 'glosada' && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                    <AlertTriangle className="w-4 h-4" /> Motivo da Glosa:
                  </div>
                  <p className="text-rose-900 font-medium">{contaSelecionada.motivo_glosa}</p>
                  <div className="text-[10px] text-rose-600">
                    Registrado por {contaSelecionada.responsavel_glosa || 'Auditor'} em{' '}
                    {contaSelecionada.data_glosa || ''}
                  </div>
                </div>
              )}

              {/* Tabela de Itens Secundários / Diárias / Materiais */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Itens Secundários, Materiais & Diárias ({itensContaAtiva.length})
                  </h4>

                  {podeLancar && contaSelecionada.status !== 'glosada' && (
                    <Button
                      size="sm"
                      onClick={() => setModalAddItemAberto(true)}
                      className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Lançar Item Secundário
                    </Button>
                  )}
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Tipo</th>
                        <th className="py-2 px-3">Código / Nome</th>
                        <th className="py-2 px-3 text-center">Qtd</th>
                        <th className="py-2 px-3 text-right">Valor Unitário</th>
                        <th className="py-2 px-3 text-right">Valor Total</th>
                        {podeLancar && contaSelecionada.status !== 'glosada' && (
                          <th className="py-2 px-3 text-center">Excluir</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itensContaAtiva.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            Nenhum procedimento secundário ou material lançado nesta conta.
                          </td>
                        </tr>
                      ) : (
                        itensContaAtiva.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3">
                              <Badge variant="outline" className="text-[9px]">
                                {item.tipo}
                              </Badge>
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-mono font-bold text-blue-700">
                                {item.procedimento_codigo}
                              </span>{' '}
                              — {item.procedimento_nome}
                            </td>
                            <td className="py-2 px-3 text-center font-bold">{item.quantidade}</td>
                            <td className="py-2 px-3 text-right font-mono">
                              R${' '}
                              {(
                                (item.valor_unitario_sh || 0) +
                                (item.valor_unitario_sa || 0) +
                                (item.valor_unitario_sp || 0)
                              ).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              R$ {(item.valor_total_item || 0).toFixed(2)}
                            </td>
                            {podeLancar && contaSelecionada.status !== 'glosada' && (
                              <td className="py-2 px-3 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoverItem(item.id)}
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <DialogFooter className="pt-2 flex flex-wrap gap-2 justify-between">
                <div className="flex items-center gap-2">
                  {podeAdministrar && contaSelecionada.status === 'aberta' && (
                    <Button
                      size="sm"
                      onClick={() => handleConciliarConta(contaSelecionada.id)}
                      className="bg-blue-700 hover:bg-blue-800 text-white text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Conciliar Conta
                    </Button>
                  )}
                </div>

                <Button variant="outline" size="sm" onClick={() => setModalContaAberto(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: LANÇAR ITEM NA CONTA COM VALIDAÇÃO SIGTAP               */}
      {/* ============================================================== */}
      <Dialog open={modalAddItemAberto} onOpenChange={setModalAddItemAberto}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAdicionarItem} className="space-y-3">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-700" />
                Lançar Item Secundário / Material na Conta
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-1">
              <Label className="text-xs">Tipo de Lançamento</Label>
              <select
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white font-medium"
                value={itemTipo}
                onChange={(e) => setItemTipo(e.target.value as any)}
              >
                <option value="procedimento_secundario">Procedimento Secundário</option>
                <option value="diaria">Diária de Internação / UTI</option>
                <option value="material">Material Especial / OPM</option>
                <option value="sessao">Sessão Terapêutica</option>
                <option value="exame">Exame Complementar</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Procedimento SIGTAP * (Código ou Seleção)</Label>
              <select
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white font-mono"
                value={itemProcCodigo}
                onChange={(e) => setItemProcCodigo(e.target.value)}
              >
                <option value="">Selecione um procedimento cadastrado...</option>
                {sigtapList.map((proc) => (
                  <option key={proc.id} value={proc.codigo}>
                    {proc.codigo} — {proc.nome.slice(0, 50)}...
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">
                Apenas códigos existentes na tabela SIGTAP importada podem ser lançados.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Quantidade *</Label>
              <Input
                type="number"
                min={1}
                required
                value={itemQuantidade}
                onChange={(e) => setItemQuantidade(Number(e.target.value))}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observações do Item</Label>
              <Input
                placeholder="Ex: Realizado em 02/05 durante plantão..."
                value={itemObs}
                onChange={(e) => setItemObs(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalAddItemAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                Confirmar Lançamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: MOTIVO DA GLOSA DE CONTA HOSPITALAR                    */}
      {/* ============================================================== */}
      <Dialog open={modalGlosaContaAberto} onOpenChange={setModalGlosaContaAberto}>
        <DialogContent className="max-w-md">
          <div className="space-y-3">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Registrar Glosa em Conta Hospitalar
              </DialogTitle>
            </DialogHeader>

            <p className="text-xs text-slate-600">
              A conta será bloqueada com registro de auditoria completo (quem, o quê, quando).
            </p>

            <div className="space-y-1">
              <Label className="text-xs">Motivo da Glosa *</Label>
              <textarea
                rows={3}
                required
                placeholder="Ex: Procedimento incompatível com diagnóstico principal / Laudo de AIH sem assinatura médica..."
                className="w-full p-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                value={motivoGlosaTemp}
                onChange={(e) => setMotivoGlosaTemp(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setModalGlosaContaAberto(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmarGlosaConta}
                className="bg-rose-700 hover:bg-rose-800 text-white"
              >
                Confirmar Glosa
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: MOTIVO DA GLOSA DE ITEM BPA                            */}
      {/* ============================================================== */}
      <Dialog open={modalGlosaBpaAberto} onOpenChange={setModalGlosaBpaAberto}>
        <DialogContent className="max-w-md">
          <div className="space-y-3">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Registrar Glosa em Produção Ambulatorial (BPA)
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-1">
              <Label className="text-xs">Motivo da Glosa *</Label>
              <textarea
                rows={3}
                required
                placeholder="Ex: Duplicidade de atendimento ambulatorial na mesma data..."
                className="w-full p-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                value={motivoGlosaBpaTemp}
                onChange={(e) => setMotivoGlosaBpaTemp(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setModalGlosaBpaAberto(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmarGlosaBpa}
                className="bg-rose-700 hover:bg-rose-800 text-white"
              >
                Confirmar Glosa
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: NOVO PROCEDIMENTO SIGTAP MANUAL                         */}
      {/* ============================================================== */}
      <Dialog open={modalNovoSigtap} onOpenChange={setModalNovoSigtap}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCadastrarSigtapManual} className="space-y-3">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-700" />
                Cadastrar Procedimento SIGTAP
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-1">
              <Label className="text-xs">Código SIGTAP * (Ex: 03.01.01.007-2)</Label>
              <Input
                required
                placeholder="00.00.00.000-0"
                value={novoCodSigtap}
                onChange={(e) => setNovoCodSigtap(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nome do Procedimento *</Label>
              <Input
                required
                placeholder="Descrição completa do procedimento..."
                value={novoNomeSigtap}
                onChange={(e) => setNovoNomeSigtap(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Valor SH (R$)</Label>
                <Input
                  value={novoShSigtap}
                  onChange={(e) => setNovoShSigtap(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor SA (R$)</Label>
                <Input
                  value={novoSaSigtap}
                  onChange={(e) => setNovoSaSigtap(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor SP (R$)</Label>
                <Input
                  value={novoSpSigtap}
                  onChange={(e) => setNovoSpSigtap(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Modalidade</Label>
              <select
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white font-medium"
                value={novaModalidadeSigtap}
                onChange={(e) => setNovaModalidadeSigtap(e.target.value as any)}
              >
                <option value="hospitalar">Hospitalar (AIH)</option>
                <option value="ambulatorial">Ambulatorial (BPA)</option>
                <option value="ambulatorial_e_hospitalar">Ambulatorial e Hospitalar</option>
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovoSigtap(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                Salvar Procedimento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: NOVO CID-10 MANUAL                                      */}
      {/* ============================================================== */}
      <Dialog open={modalNovoCid} onOpenChange={setModalNovoCid}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCadastrarCidManual} className="space-y-3">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-700" />
                Cadastrar Código CID-10
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-1">
              <Label className="text-xs">Código CID-10 * (Ex: J18.9, I10, A09)</Label>
              <Input
                required
                placeholder="Ex: J18.9"
                value={novoCodCid}
                onChange={(e) => setNovoCodCid(e.target.value)}
                className="text-xs font-mono uppercase"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Descrição da Doença / Condição *</Label>
              <Input
                required
                placeholder="Descrição da patologia..."
                value={novoDescCid}
                onChange={(e) => setNovoDescCid(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Capítulo (Opcional)</Label>
              <Input
                placeholder="Ex: X - Doenças do Aparelho Respiratório"
                value={novoCapCid}
                onChange={(e) => setNovoCapCid(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovoCid(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                Salvar CID-10
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: DETALHAMENTO DE INCONSISTÊNCIAS DE CONTA AIH             */}
      {/* ============================================================== */}
      <Dialog
        open={contaInconsistenciasModal !== null}
        onOpenChange={(aberto) => !aberto && setContaInconsistenciasModal(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-700" />
              Conferência da Conta {contaInconsistenciasModal?.numeroConta}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="flex items-center gap-2">
              {contaInconsistenciasModal?.valida ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                  Sem Erros Impeditivos
                </Badge>
              ) : (
                <Badge className="bg-rose-100 text-rose-800 border-rose-200">
                  {contaInconsistenciasModal?.totalErros} Inconsistência(s) Crítica(s)
                </Badge>
              )}
              {contaInconsistenciasModal?.totalAdvertencias ? (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                  {contaInconsistenciasModal.totalAdvertencias} Advertência(s)
                </Badge>
              ) : null}
            </div>

            {contaInconsistenciasModal?.erros.length ? (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                  Erros Impeditivos (Exigem Correção Administrativa)
                </h4>
                <div className="space-y-2">
                  {contaInconsistenciasModal.erros.map((e, idx) => (
                    <div
                      key={`modal-err-${idx}`}
                      className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-1"
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>Campo: {e.campo}</span>
                        <span className="text-[10px] font-normal text-rose-600">Erro</span>
                      </div>
                      <p>{e.mensagem}</p>
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-rose-200/60">
                        <strong>Fonte Oficial:</strong> {e.fonteOficial}
                        <br />
                        <strong>Regra:</strong> {e.regraReferencia}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {contaInconsistenciasModal?.advertencias.length ? (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Advertências e Recomendações Técnicas
                </h4>
                <div className="space-y-2">
                  {contaInconsistenciasModal.advertencias.map((a, idx) => (
                    <div
                      key={`modal-adv-${idx}`}
                      className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1"
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>Campo: {a.campo}</span>
                        <span className="text-[10px] font-normal text-amber-600">Aviso</span>
                      </div>
                      <p>{a.mensagem}</p>
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-amber-200/60">
                        <strong>Fonte Oficial:</strong> {a.fonteOficial}
                        <br />
                        <strong>Regra:</strong> {a.regraReferencia}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {contaInconsistenciasModal?.erros.length === 0 &&
              contaInconsistenciasModal?.advertencias.length === 0 && (
                <div className="p-4 text-center text-xs text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
                  Nenhuma inconsistência detectada nesta conta. Todos os campos obrigatórios e
                  prazos cronológicos estão conformes com as fontes oficiais.
                </div>
              )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setContaInconsistenciasModal(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: DETALHAMENTO DE INCONSISTÊNCIAS DE ITEM BPA             */}
      {/* ============================================================== */}
      <Dialog
        open={bpaInconsistenciasModal !== null}
        onOpenChange={(aberto) => !aberto && setBpaInconsistenciasModal(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-teal-700" />
              Conferência de Item BPA ({bpaInconsistenciasModal?.procedimentoCodigo})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-semibold">
                Paciente: {bpaInconsistenciasModal?.pacienteNome}
              </span>
              {bpaInconsistenciasModal?.duplicidadeDetectada && (
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
                  Duplicidade de Produção
                </Badge>
              )}
            </div>

            {bpaInconsistenciasModal?.erros.length ? (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                  Inconsistências Críticas
                </h4>
                {bpaInconsistenciasModal.erros.map((e, idx) => (
                  <div
                    key={`bpa-modal-err-${idx}`}
                    className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-1"
                  >
                    <div className="font-bold">[{e.campo}]</div>
                    <p>{e.mensagem}</p>
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-rose-200/60">
                      <strong>Fonte:</strong> {e.fonteOficial}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {bpaInconsistenciasModal?.advertencias.length ? (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Advertências & Avisos Administrativos
                </h4>
                {bpaInconsistenciasModal.advertencias.map((a, idx) => (
                  <div
                    key={`bpa-modal-adv-${idx}`}
                    className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1"
                  >
                    <div className="font-bold">[{a.campo}]</div>
                    <p>{a.mensagem}</p>
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-amber-200/60">
                      <strong>Fonte:</strong> {a.fonteOficial}
                      <br />
                      <strong>Regra:</strong> {a.regraReferencia}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {bpaInconsistenciasModal?.erros.length === 0 &&
              bpaInconsistenciasModal?.advertencias.length === 0 && (
                <div className="p-4 text-center text-xs text-teal-700 bg-teal-50 rounded-lg border border-teal-200">
                  Item ambulatorial consistente conforme as regras vigentes do SIA/SUS e SIGTAP.
                </div>
              )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBpaInconsistenciasModal(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: PRÉ-VISUALIZAÇÃO DE IMPORTAÇÃO SIGTAP E RELATÓRIO       */}
      {/* ============================================================== */}
      <Dialog open={modalPreviewSigtap} onOpenChange={setModalPreviewSigtap}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {previewSigtapDados && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-700" />
                    Pré-Visualização do Lote SIGTAP — Competência {previewSigtapDados.competencia}
                  </DialogTitle>
                  <Badge variant="outline" className="font-mono text-xs">
                    Delimitador: "{previewSigtapDados.delimitadorDetectado}"
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Confira o relatório linha a linha antes de gravar no banco de dados. Itens com
                  erro não entram no lote.
                </p>
              </DialogHeader>

              {/* Banner informativo de normas e limites */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs space-y-1 text-amber-900">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  Conformidade Normativa e Idempotência:
                </div>
                <p className="text-[11px] text-amber-800">
                  • Fonte Oficial DATASUS: <code>http://tabela-unificada.datasus.gov.br</code>{' '}
                  (versão oficial distribuída em layout posicional .txt pelo SIGTAP Desktop).
                  <br />• Gravação idempotente: procedimentos já existentes com mesmos atributos são
                  preservados sem duplicação; competências históricas e contas não são recalculadas
                  retroativamente.
                </p>
              </div>

              {/* Cards de Resumo */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    Total Linhas Arquivo
                  </div>
                  <div className="text-lg font-black font-mono text-slate-800">
                    {previewSigtapDados.totalLinhasArquivo}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">
                    Validados p/ Gravação
                  </div>
                  <div className="text-lg font-black font-mono text-emerald-800">
                    {previewSigtapDados.totalValidos}
                  </div>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <div className="text-[10px] uppercase font-bold text-rose-700">
                    Linhas Rejeitadas
                  </div>
                  <div className="text-lg font-black font-mono text-rose-800">
                    {previewSigtapDados.totalRejeitados}
                  </div>
                </div>
              </div>

              {/* Tabs de Itens Válidos vs Rejeições */}
              <Tabs
                value={abaPreviewSigtap}
                onValueChange={(v) => setAbaPreviewSigtap(v as 'validos' | 'rejeicoes')}
              >
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="validos" className="text-xs">
                    Itens Válidos ({previewSigtapDados.totalValidos})
                  </TabsTrigger>
                  <TabsTrigger value="rejeicoes" className="text-xs text-rose-700">
                    Relatório de Rejeições ({previewSigtapDados.totalRejeitados})
                  </TabsTrigger>
                </TabsList>

                {/* Aba Válidos */}
                <TabsContent value="validos" className="space-y-2 mt-3">
                  <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[320px]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] sticky top-0 border-b">
                        <tr>
                          <th className="py-2 px-3">Linha</th>
                          <th className="py-2 px-3">Código (Preserva Zeros)</th>
                          <th className="py-2 px-3">Nome do Procedimento</th>
                          <th className="py-2 px-3 text-right">SH</th>
                          <th className="py-2 px-3 text-right">SA</th>
                          <th className="py-2 px-3 text-right">SP</th>
                          <th className="py-2 px-3 text-center">Modalidade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewSigtapDados.itensValidos.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              Nenhum item válido identificado no arquivo.
                            </td>
                          </tr>
                        ) : (
                          previewSigtapDados.itensValidos.slice(0, 100).map((it) => (
                            <tr key={`val-${it.linha}-${it.codigo}`} className="hover:bg-slate-50">
                              <td className="py-1.5 px-3 font-mono text-slate-500">{it.linha}</td>
                              <td className="py-1.5 px-3 font-mono font-bold text-blue-700">
                                {it.codigo}
                              </td>
                              <td className="py-1.5 px-3 font-medium text-slate-800">{it.nome}</td>
                              <td className="py-1.5 px-3 text-right font-mono">
                                R$ {it.valor_sh.toFixed(2)}
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono">
                                R$ {it.valor_sa.toFixed(2)}
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono">
                                R$ {it.valor_sp.toFixed(2)}
                              </td>
                              <td className="py-1.5 px-3 text-center">
                                <Badge variant="outline" className="text-[9px]">
                                  {it.modalidade}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {previewSigtapDados.itensValidos.length > 100 && (
                    <p className="text-[11px] text-slate-500 text-center">
                      Exibindo as primeiras 100 linhas válidas de um total de{' '}
                      {previewSigtapDados.itensValidos.length}.
                    </p>
                  )}
                </TabsContent>

                {/* Aba Rejeições */}
                <TabsContent value="rejeicoes" className="space-y-2 mt-3">
                  <div className="overflow-x-auto border border-rose-200 rounded-lg max-h-[320px] bg-rose-50/20">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-rose-100/70 text-rose-900 font-bold uppercase text-[10px] sticky top-0 border-b border-rose-200">
                        <tr>
                          <th className="py-2 px-3">Linha</th>
                          <th className="py-2 px-3">Código Bruto</th>
                          <th className="py-2 px-3">Campo</th>
                          <th className="py-2 px-3">Motivo da Rejeição</th>
                          <th className="py-2 px-3">Detalhe</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100">
                        {previewSigtapDados.rejeicoes.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-8 text-center text-emerald-700 font-medium"
                            >
                              Nenhuma rejeição! Todas as linhas do arquivo foram aprovadas nas
                              validações estruturais.
                            </td>
                          </tr>
                        ) : (
                          previewSigtapDados.rejeicoes.map((rej, idx) => (
                            <tr key={`rej-${idx}-${rej.linha}`} className="hover:bg-rose-50/60">
                              <td className="py-1.5 px-3 font-mono font-bold text-rose-700">
                                {rej.linha}
                              </td>
                              <td className="py-1.5 px-3 font-mono text-slate-700">
                                {rej.codigoBruto || '-'}
                              </td>
                              <td className="py-1.5 px-3 uppercase text-[10px] font-bold text-slate-600">
                                {rej.campo || 'formato'}
                              </td>
                              <td className="py-1.5 px-3 font-semibold text-rose-900">
                                {rej.motivo}
                              </td>
                              <td className="py-1.5 px-3 text-slate-600 text-[11px]">
                                {rej.detalhe || '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Ações e Confirmação Explícita */}
              <DialogFooter className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalPreviewSigtap(false)}
                  disabled={gravandoLoteSigtap}
                >
                  Cancelar e Descartar
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">
                    {previewSigtapDados.totalValidos} itens prontos para gravação
                  </span>
                  <Button
                    size="sm"
                    onClick={handleConfirmarGravacaoLoteSigtap}
                    disabled={gravandoLoteSigtap || previewSigtapDados.totalValidos === 0}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm"
                  >
                    {gravandoLoteSigtap ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> Gravando Lote...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirmar e Gravar Lote no
                        Banco
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
