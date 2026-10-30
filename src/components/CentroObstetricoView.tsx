import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  AdmissaoObstetrica,
  RegistroTrabalhoParto,
  RegistroParto,
  RecemNascido,
  DesfechoAltaObstetrica,
  StatusAdmissaoObstetrica,
  RiscoObstetricoInformado,
  TipoParto,
  SexoRN,
  AcomodacaoRN,
  TipoDesfechoObstetrico,
  Paciente,
  Internacao,
  Leito,
} from '@/types/hospital'
import {
  listarAdmissoesObstetricas,
  registrarAdmissaoObstetrica,
  listarRegistrosTrabalhoParto,
  registrarEvolucaoTrabalhoParto,
  listarPartos,
  registrarParto,
  listarRecemNascidos,
  registrarRecemNascido,
  listarDesfechosAltas,
  registrarDesfechoAltaObstetrica,
  calcularIndicadoresCentroObstetrico,
} from '@/services/centroObstetrico'
import { listarPacientes, listarLeitos } from '@/services/cadastros'
import { listarInternacoes } from '@/services/internacoes'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { QuadroUnidadeObstetrica } from './QuadroUnidadeObstetrica'
import {
  Baby,
  HeartPulse,
  Activity,
  Bed,
  CheckCircle2,
  Users,
  Plus,
  RefreshCw,
  Search,
  FolderOpen,
  Calendar,
  Clock,
  ShieldCheck,
  FileText,
  UserCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'

interface CentroObstetricoViewProps {
  onNavegarSAME?: (pacienteId?: string) => void
}

export const CentroObstetricoView: React.FC<CentroObstetricoViewProps> = ({ onNavegarSAME }) => {
  const { user, temPermissao } = useAuth()
  const { toast } = useToast()

  const podeRegistrarClinico = temPermissao(['admin', 'gestor', 'profissional'])
  const isRecepcao = user?.role === 'recepcao'

  // Estados principais
  const [admissoes, setAdmissoes] = useState<AdmissaoObstetrica[]>([])
  const [trabalhoPartos, setTrabalhoPartos] = useState<RegistroTrabalhoParto[]>([])
  const [partos, setPartos] = useState<RegistroParto[]>([])
  const [recemNascidos, setRecemNascidos] = useState<RecemNascido[]>([])
  const [desfechos, setDesfechos] = useState<DesfechoAltaObstetrica[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [internacoesAtivas, setInternacoesAtivas] = useState<Internacao[]>([])
  const [leitosDisponiveis, setLeitosDisponiveis] = useState<Leito[]>([])
  const [loading, setLoading] = useState(false)

  // Abas de navegação interna
  const [abaAtiva, setAbaAtiva] = useState<'admissoes' | 'partos_rn' | 'quadro'>('admissoes')
  const [buscaTexto, setBuscaTexto] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  // Modais
  const [modalNovaAdmissao, setModalNovaAdmissao] = useState(false)
  const [modalNovoTrabalhoParto, setModalNovoTrabalhoParto] = useState(false)
  const [modalNovoParto, setModalNovoParto] = useState(false)
  const [modalNovoRN, setModalNovoRN] = useState(false)
  const [modalNovoDesfecho, setModalNovoDesfecho] = useState(false)
  const [modalDetalhesAdmissao, setModalDetalhesAdmissao] = useState(false)
  const [modalAvisoEscopo, setModalAvisoEscopo] = useState(false)

  // Registro Selecionado para Ações
  const [admissaoSelecionada, setAdmissaoSelecionada] = useState<AdmissaoObstetrica | null>(null)
  const [partoSelecionadoParaRN, setPartoSelecionadoParaRN] = useState<RegistroParto | null>(null)

  // 1. FORMULÁRIO: NOVA ADMISSÃO OBSTÉTRICA
  const [admPacienteId, setAdmPacienteId] = useState('')
  const [admInternacaoId, setAdmInternacaoId] = useState('')
  const [admLeitoId, setAdmLeitoId] = useState('')
  const [admDataHora, setAdmDataHora] = useState(() => {
    const d = new Date()
    return `${d.toISOString().split('T')[0]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [admGesta, setAdmGesta] = useState('')
  const [admPara, setAdmPara] = useState('')
  const [admAbortos, setAdmAbortos] = useState('')
  const [admCesareas, setAdmCesareas] = useState('')
  const [admIgSemanas, setAdmIgSemanas] = useState('')
  const [admIgDias, setAdmIgDias] = useState('')
  const [admDum, setAdmDum] = useState('')
  const [admDpp, setAdmDpp] = useState('')
  const [admRiscoInformado, setAdmRiscoInformado] = useState<RiscoObstetricoInformado>('habitual')
  const [admJustificativaRisco, setAdmJustificativaRisco] = useState('')
  const [admMotivo, setAdmMotivo] = useState('')
  const [admBcf, setAdmBcf] = useState('')
  const [admDinamica, setAdmDinamica] = useState('')
  const [admDilatacao, setAdmDilatacao] = useState('')
  const [admBolsa, setAdmBolsa] = useState('')
  const [admStatus, setAdmStatus] = useState<StatusAdmissaoObstetrica>('em_trabalho_parto')
  const [admObs, setAdmObs] = useState('')
  const [salvandoAdmissao, setSalvandoAdmissao] = useState(false)

  // 2. FORMULÁRIO: EVOLUÇÃO TRABALHO DE PARTO
  const [tpDataHora, setTpDataHora] = useState(() => {
    const d = new Date()
    return `${d.toISOString().split('T')[0]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [tpDilatacao, setTpDilatacao] = useState('')
  const [tpApagamento, setTpApagamento] = useState('')
  const [tpDeLee, setTpDeLee] = useState('')
  const [tpDinamica, setTpDinamica] = useState('')
  const [tpBcf, setTpBcf] = useState('')
  const [tpBolsa, setTpBolsa] = useState('')
  const [tpPa, setTpPa] = useState('')
  const [tpAlivioDor, setTpAlivioDor] = useState('')
  const [tpEvolucao, setTpEvolucao] = useState('')
  const [salvandoTp, setSalvandoTp] = useState(false)

  // 3. FORMULÁRIO: PARTO / NASCIMENTO
  const [partoDataHora, setPartoDataHora] = useState(() => {
    const d = new Date()
    return `${d.toISOString().split('T')[0]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [partoTipo, setPartoTipo] = useState<TipoParto>('vaginal_espontaneo')
  const [partoIndicacao, setPartoIndicacao] = useState('')
  const [partoPosicao, setPartoPosicao] = useState('')
  const [partoAnestesia, setPartoAnestesia] = useState('')
  const [partoEpisiotomia, setPartoEpisiotomia] = useState('')
  const [partoSangramento, setPartoSangramento] = useState('')
  const [partoPeleAPele, setPartoPeleAPele] = useState(true)
  const [partoAmamentacao1h, setPartoAmamentacao1h] = useState(true)
  const [partoClampeamento, setPartoClampeamento] = useState(true)
  const [partoObstetraNome, setPartoObstetraNome] = useState(user?.name || '')
  const [partoEnfermeiroNome, setPartoEnfermeiroNome] = useState('')
  const [partoPediatraNome, setPartoPediatraNome] = useState('')
  const [partoObs, setPartoObs] = useState('')
  const [salvandoParto, setSalvandoParto] = useState(false)

  // 4. FORMULÁRIO: RECÉM-NASCIDO
  const [rnIdentificacao, setRnIdentificacao] = useState('')
  const [rnDataHora, setRnDataHora] = useState(() => {
    const d = new Date()
    return `${d.toISOString().split('T')[0]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [rnSexo, setRnSexo] = useState<SexoRN>('feminino')
  const [rnPeso, setRnPeso] = useState('')
  const [rnComprimento, setRnComprimento] = useState('')
  const [rnPc, setRnPc] = useState('')
  const [rnApgar1, setRnApgar1] = useState('')
  const [rnApgar5, setRnApgar5] = useState('')
  const [rnAcomodacao, setRnAcomodacao] = useState<AcomodacaoRN>('alojamento_conjunto')
  const [rnReanimacao, setRnReanimacao] = useState(false)
  const [rnDetalhesReanimacao, setRnDetalhesReanimacao] = useState('')
  const [rnPulseira, setRnPulseira] = useState(true)
  const [rnDnv, setRnDnv] = useState('')
  const [rnObs, setRnObs] = useState('')
  const [salvandoRn, setSalvandoRn] = useState(false)

  // 5. FORMULÁRIO: DESFECHO / ALTA OBSTÉTRICA
  const [desfDataHora, setDesfDataHora] = useState(() => {
    const d = new Date()
    return `${d.toISOString().split('T')[0]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [desfTipo, setDesfTipo] = useState<TipoDesfechoObstetrico>('alta_hospitalar_mae_e_rn')
  const [desfResumo, setDesfResumo] = useState('')
  const [desfOrientacoes, setDesfOrientacoes] = useState('')
  const [desfRetornoUbs, setDesfRetornoUbs] = useState('UBS de referência em 7 a 10 dias')
  const [desfDesocuparLeito, setDesfDesocuparLeito] = useState(true)
  const [salvandoDesfecho, setSalvandoDesfecho] = useState(false)

  // Carregar dados
  const carregarDados = async () => {
    setLoading(true)
    try {
      const [adms, tps, pts, rns, dfas, pacs, interns, lts] = await Promise.all([
        listarAdmissoesObstetricas(),
        listarRegistrosTrabalhoParto(),
        listarPartos(),
        listarRecemNascidos(),
        listarDesfechosAltas(),
        listarPacientes(),
        listarInternacoes(true),
        listarLeitos(),
      ])

      setAdmissoes(adms)
      setTrabalhoPartos(tps)
      setPartos(pts)
      setRecemNascidos(rns)
      setDesfechos(dfas)
      setPacientes(pacs)
      setInternacoesAtivas(interns)
      setLeitosDisponiveis(lts)
    } catch (err: any) {
      console.error('Erro ao carregar dados do Centro Obstétrico:', err)
      toast({
        title: 'Erro ao carregar Centro Obstétrico',
        description: err.message || 'Verifique a conexão.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Indicadores da unidade obstétrica
  const indicadores = useMemo(() => {
    return calcularIndicadoresCentroObstetrico(admissoes, partos, recemNascidos)
  }, [admissoes, partos, recemNascidos])

  // Filtragem da lista de admissões
  const admissoesFiltradas = useMemo(() => {
    return admissoes.filter((adm) => {
      const matchStatus = filtroStatus === 'todos' || adm.status_admissao === filtroStatus
      const q = buscaTexto.toLowerCase().trim()
      const matchBusca =
        !q ||
        adm.paciente_nome.toLowerCase().includes(q) ||
        adm.numero_admissao.toLowerCase().includes(q) ||
        (adm.leito_codigo && adm.leito_codigo.toLowerCase().includes(q))
      return matchStatus && matchBusca
    })
  }, [admissoes, filtroStatus, buscaTexto])

  // Abertura de modal de Trabalho de Parto para uma admissão
  const abrirModalTrabalhoParto = (adm: AdmissaoObstetrica) => {
    setAdmissaoSelecionada(adm)
    setTpDilatacao(adm.dilatacao_cervical_cm || '')
    setTpDinamica(adm.dinamica_uterina || '')
    setTpBcf(adm.batimentos_cardiofetais_bcf || '')
    setTpBolsa(adm.bolsa_amniotica || '')
    setTpEvolucao('')
    setModalNovoTrabalhoParto(true)
  }

  // Abertura de modal de Parto para uma admissão
  const abrirModalParto = (adm: AdmissaoObstetrica) => {
    setAdmissaoSelecionada(adm)
    setPartoObstetraNome(user?.name || '')
    setPartoIndicacao('')
    setPartoObs('')
    setModalNovoParto(true)
  }

  // Abertura de modal de Recém-Nascido vinculado ao parto
  const abrirModalRNParaParto = (parto: RegistroParto) => {
    setPartoSelecionadoParaRN(parto)
    setRnIdentificacao(`RN de ${parto.paciente_mae_nome}`)
    setRnDataHora(parto.data_hora_parto)
    setRnPeso('')
    setRnComprimento('')
    setRnPc('')
    setRnApgar1('')
    setRnApgar5('')
    setModalNovoRN(true)
  }

  // Abertura de modal de Desfecho/Alta
  const abrirModalDesfecho = (adm: AdmissaoObstetrica) => {
    setAdmissaoSelecionada(adm)
    setDesfResumo(`Parto concluído e mãe em condições estáveis.`)
    setDesfOrientacoes(`Cuidados puerperais, higiene local, amamentação exclusiva e repouso.`)
    setModalNovoDesfecho(true)
  }

  // Abertura de detalhes
  const abrirDetalhesAdmissao = (adm: AdmissaoObstetrica) => {
    setAdmissaoSelecionada(adm)
    setModalDetalhesAdmissao(true)
  }

  // 1. HANDLER: SALVAR NOVA ADMISSÃO
  const handleSalvarAdmissao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!podeRegistrarClinico) {
      toast({
        title: 'Acesso Restrito',
        description: 'Recepção possui papel administrativo, não clínico.',
        variant: 'destructive',
      })
      return
    }

    if (!admPacienteId) {
      toast({
        title: 'Paciente Obrigatória',
        description: 'Selecione a paciente cadastrada para a admissão obstétrica.',
        variant: 'destructive',
      })
      return
    }

    if (!admMotivo.trim()) {
      toast({
        title: 'Motivo Obrigatório',
        description: 'Informe o motivo da admissão obstétrica.',
        variant: 'destructive',
      })
      return
    }

    const pacienteObj = pacientes.find((p) => p.id === admPacienteId)
    if (!pacienteObj) return

    const internacaoObj = internacoesAtivas.find((i) => i.id === admInternacaoId)
    const leitoObj = leitosDisponiveis.find((l) => l.id === admLeitoId)

    setSalvandoAdmissao(true)
    try {
      await registrarAdmissaoObstetrica({
        pacienteId: pacienteObj.id,
        pacienteNome: pacienteObj.nome,
        internacaoId: internacaoObj?.id,
        leitoId: leitoObj?.id || internacaoObj?.leito_atual,
        leitoCodigo: leitoObj?.codigo || '',
        dataHoraAdmissao: admDataHora,
        gestaPrevia: admGesta ? Number(admGesta) : undefined,
        paraPrevia: admPara ? Number(admPara) : undefined,
        abortosPrevios: admAbortos ? Number(admAbortos) : undefined,
        cesareasPrevias: admCesareas ? Number(admCesareas) : undefined,
        idadeGestacionalSemanas: admIgSemanas ? Number(admIgSemanas) : undefined,
        idadeGestacionalDias: admIgDias ? Number(admIgDias) : undefined,
        dumInformada: admDum,
        dppInformada: admDpp,
        riscoObstetricoInformado: admRiscoInformado,
        justificativaRiscoProfissional: admJustificativaRisco,
        motivoAdmissao: admMotivo,
        batimentosCardiofetaisBcf: admBcf,
        dinamicaUterina: admDinamica,
        dilatacaoCervicalCm: admDilatacao,
        bolsaAmniotica: admBolsa,
        statusAdmissao: admStatus,
        profissionalResponsavelId: user?.id,
        profissionalNome: user?.name || 'Profissional Obstetra',
        observacoesAdmissao: admObs,
      })

      toast({
        title: 'Admissão Obstétrica Registrada!',
        description: `Admissão de ${pacienteObj.nome} vinculada e lançada no Prontuário SAME.`,
      })

      setModalNovaAdmissao(false)
      // Reset
      setAdmPacienteId('')
      setAdmInternacaoId('')
      setAdmLeitoId('')
      setAdmGesta('')
      setAdmPara('')
      setAdmAbortos('')
      setAdmCesareas('')
      setAdmIgSemanas('')
      setAdmIgDias('')
      setAdmDum('')
      setAdmDpp('')
      setAdmMotivo('')
      setAdmBcf('')
      setAdmDinamica('')
      setAdmDilatacao('')
      setAdmBolsa('')
      setAdmObs('')
      carregarDados()
    } catch (err: any) {
      console.error('Erro ao salvar admissão obstétrica:', err)
      const msg = err?.message || 'Verifique os dados informados.'
      // Preservação do texto: não limpa os campos para evitar perda do registro clínico
      toast({
        title: 'Falha na Admissão Obstétrica — Registro Preservado',
        description: `${msg}. Seus dados digitados permanecem na tela.`,
        variant: 'destructive',
      })
    } finally {
      setSalvandoAdmissao(false)
    }
  }

  // 2. HANDLER: SALVAR TRABALHO DE PARTO
  const handleSalvarTrabalhoParto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!podeRegistrarClinico || !admissaoSelecionada) return

    if (!tpEvolucao.trim()) {
      toast({
        title: 'Evolução Obrigatória',
        description: 'Digite a anotação clínica profissional do trabalho de parto.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoTp(true)
    try {
      await registrarEvolucaoTrabalhoParto({
        admissaoObstetricaId: admissaoSelecionada.id,
        pacienteId: admissaoSelecionada.paciente,
        dataHoraRegistro: tpDataHora,
        dilatacaoCervicalCm: tpDilatacao,
        apagamentoCervicalPercentual: tpApagamento,
        alturaApresentacaoDeLee: tpDeLee,
        dinamicaUterinaFreqDuracao: tpDinamica,
        batimentosCardiofetaisBcf: tpBcf,
        bolsaAspectoLiquido: tpBolsa,
        pressaoArterial: tpPa,
        metodosAlivioDorInformados: tpAlivioDor,
        evolucaoAnotacaoProfissional: tpEvolucao,
        profissionalRegistroId: user?.id,
        profissionalNome: user?.name || 'Profissional Assistente',
      })

      toast({
        title: 'Evolução Registrada!',
        description: 'Evolução do trabalho de parto gravada no prontuário da paciente.',
      })

      setModalNovoTrabalhoParto(false)
      carregarDados()
    } catch (err: any) {
      console.error('Erro ao registrar evolução de parto:', err)
      const msg = err?.message || 'Falha ao registrar evolução.'
      toast({
        title: 'Erro ao Registrar Evolução — Texto Preservado',
        description: `${msg}. Suas anotações do trabalho de parto permanecem na tela.`,
        variant: 'destructive',
      })
    } finally {
      setSalvandoTp(false)
    }
  }

  // 3. HANDLER: SALVAR PARTO
  const handleSalvarParto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!podeRegistrarClinico || !admissaoSelecionada) return

    setSalvandoParto(true)
    try {
      const partoCriado = await registrarParto({
        admissaoObstetricaId: admissaoSelecionada.id,
        pacienteMaeId: admissaoSelecionada.paciente,
        pacienteMaeNome: admissaoSelecionada.paciente_nome,
        dataHoraParto: partoDataHora,
        tipoParto: partoTipo,
        indicacaoTipoParto: partoIndicacao,
        posicaoParto: partoPosicao,
        anestesiaAnalgesiaUtilizada: partoAnestesia,
        episiotomiaLaceracao: partoEpisiotomia,
        sangramentoEstimadoMl: partoSangramento ? Number(partoSangramento) : undefined,
        contatoPeleAPeleImediato: partoPeleAPele,
        amamentacaoPrimeiraHora: partoAmamentacao1h,
        clampeamentoCordaoOportuno: partoClampeamento,
        medicoObstetraId: user?.id,
        medicoObstetraNome: partoObstetraNome || user?.name || 'Obstetra Responsável',
        enfermeiroObstetraNome: partoEnfermeiroNome,
        pediatraNeonatologistaNome: partoPediatraNome,
        observacoesParto: partoObs,
      })

      toast({
        title: 'Parto Registrado com Sucesso!',
        description: `Parto de ${admissaoSelecionada.paciente_nome} lançado. Deseja cadastrar o recém-nascido?`,
      })

      setModalNovoParto(false)
      await carregarDados()

      // Sugere imediatamente abrir o cadastro do RN
      abrirModalRNParaParto(partoCriado)
    } catch (err: any) {
      console.error('Erro ao registrar parto:', err)
      const msg = err?.message || 'Falha ao registrar parto.'
      toast({
        title: 'Erro ao Registrar Parto — Registro Preservado',
        description: `${msg}. Os dados clínicos do parto permanecem na tela.`,
        variant: 'destructive',
      })
    } finally {
      setSalvandoParto(false)
    }
  }

  // 4. HANDLER: SALVAR RECÉM-NASCIDO
  const handleSalvarRN = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!podeRegistrarClinico || !partoSelecionadoParaRN) return

    if (!rnPeso || Number(rnPeso) <= 0) {
      toast({
        title: 'Peso Obrigatório',
        description: 'Informe o peso do recém-nascido em gramas.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoRn(true)
    try {
      await registrarRecemNascido({
        partoId: partoSelecionadoParaRN.id,
        admissaoObstetricaId: partoSelecionadoParaRN.admissao_obstetrica,
        maePacienteId: partoSelecionadoParaRN.paciente_mae,
        maeNome: partoSelecionadoParaRN.paciente_mae_nome,
        identificacaoRn: rnIdentificacao || `RN de ${partoSelecionadoParaRN.paciente_mae_nome}`,
        dataHoraNascimento: rnDataHora,
        sexo: rnSexo,
        pesoGramas: Number(rnPeso),
        comprimentoCm: rnComprimento ? Number(rnComprimento) : undefined,
        perimetroCefalicoCm: rnPc ? Number(rnPc) : undefined,
        apgar1Minuto: rnApgar1 !== '' ? Number(rnApgar1) : undefined,
        apgar5Minutos: rnApgar5 !== '' ? Number(rnApgar5) : undefined,
        acomodacaoRn: rnAcomodacao,
        reanimacaoNeonatalNecessaria: rnReanimacao,
        detalhesReanimacao: rnDetalhesReanimacao,
        pulseiraIdentificacaoConferida: rnPulseira,
        declaracaoNascidoVivoDnvNumero: rnDnv,
        observacoesRn: rnObs,
      })

      toast({
        title: 'Recém-Nascido Cadastrado!',
        description: `RN vinculado com sucesso à mãe ${partoSelecionadoParaRN.paciente_mae_nome}.`,
      })

      setModalNovoRN(false)
      carregarDados()
    } catch (err: any) {
      console.error('Erro ao cadastrar recém-nascido:', err)
      const msg = err?.message || 'Falha ao cadastrar RN.'
      toast({
        title: 'Erro ao Registrar RN — Dados Preservados',
        description: `${msg}. Os dados biométricos permanecem na tela para correção.`,
        variant: 'destructive',
      })
    } finally {
      setSalvandoRn(false)
    }
  }

  // 5. HANDLER: SALVAR DESFECHO / ALTA
  const handleSalvarDesfecho = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!podeRegistrarClinico || !admissaoSelecionada) return

    if (!desfResumo.trim()) {
      toast({
        title: 'Resumo Obrigatório',
        description: 'Informe o resumo clínico do desfecho/alta obstétrica.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoDesfecho(true)
    try {
      await registrarDesfechoAltaObstetrica({
        admissaoObstetricaId: admissaoSelecionada.id,
        pacienteMaeId: admissaoSelecionada.paciente,
        pacienteMaeNome: admissaoSelecionada.paciente_nome,
        dataHoraDesfecho: desfDataHora,
        tipoDesfecho: desfTipo,
        resumoDesfechoClinico: desfResumo,
        orientacoesPosPartoPuerperio: desfOrientacoes,
        encaminhamentoRetornoUbs: desfRetornoUbs,
        desocuparLeitoInternacao: desfDesocuparLeito,
        internacaoDesocupadaId: admissaoSelecionada.internacao,
        profissionalAltaId: user?.id,
        profissionalNome: user?.name || 'Médico Obstetra',
      })

      toast({
        title: 'Desfecho e Alta Obstétrica Registrados!',
        description: `Alta obstétrica concluída. ${desfDesocuparLeito ? 'Leito liberado e encaminhado para higienização.' : ''}`,
      })

      setModalNovoDesfecho(false)
      carregarDados()
    } catch (err: any) {
      console.error('Erro ao registrar desfecho obstétrico:', err)
      toast({
        title: 'Erro ao registrar desfecho',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoDesfecho(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. CABEÇALHO DO MÓDULO */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-pink-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20 shrink-0">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Centro Obstétrico</h1>
              <Badge
                variant="outline"
                className="bg-pink-50 text-pink-800 border-pink-300 text-[10px] font-bold uppercase tracking-wider"
              >
                Assistência Materno-Infantil
              </Badge>
              {isRecepcao && (
                <Badge
                  variant="outline"
                  className="bg-slate-100 text-slate-600 border-slate-300 text-[10px]"
                >
                  Visão Administrativa (Recepção)
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Admissão obstétrica, trabalho de parto, registro do nascimento, vínculo mãe-RN e alta
              • Mirante da Serra - RO
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalAvisoEscopo(true)}
            className="text-xs text-slate-600 border-slate-300 gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            Regras de Escopo
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

          {podeRegistrarClinico && (
            <Button
              size="sm"
              onClick={() => setModalNovaAdmissao(true)}
              className="bg-pink-600 hover:bg-pink-700 text-white shadow-sm gap-1.5 text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              Nova Admissão Obstétrica
            </Button>
          )}
        </div>
      </div>

      {/* 2. ABAS DO CENTRO OBSTÉTRICO */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setAbaAtiva('admissoes')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            abaAtiva === 'admissoes'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Fila de Gestantes / Admissões ({admissoes.length})
        </button>

        <button
          onClick={() => setAbaAtiva('partos_rn')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            abaAtiva === 'partos_rn'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Baby className="w-3.5 h-3.5" />
          Partos & Vínculos Mãe-RN ({partos.length} partos / {recemNascidos.length} RNs)
        </button>

        <button
          onClick={() => setAbaAtiva('quadro')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            abaAtiva === 'quadro'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Quadro de Gestão da Unidade
        </button>
      </div>

      {/* ABA 1: ADMISSÕES OBSTÉTRICAS & TRABALHO DE PARTO */}
      {abaAtiva === 'admissoes' && (
        <div className="space-y-4">
          {/* BARRA DE FILTRO E BUSCA */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="w-full sm:w-64 relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <Input
                    placeholder="Buscar gestante ou nº admissão..."
                    className="h-8 text-xs pl-8"
                    value={buscaTexto}
                    onChange={(e) => setBuscaTexto(e.target.value)}
                  />
                </div>

                <select
                  className="h-8 px-2.5 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800"
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                >
                  <option value="todos">Todos os Status</option>
                  <option value="em_trabalho_parto">Em Trabalho de Parto</option>
                  <option value="em_observacao">Em Observação</option>
                  <option value="parto_realizado">Parto Realizado</option>
                  <option value="alta">Alta Concluída</option>
                  <option value="transferida">Transferida</option>
                </select>
              </div>

              <span className="text-xs text-slate-500 font-medium">
                {admissoesFiltradas.length} admissão(ões)
              </span>
            </CardContent>
          </Card>

          {/* LISTA DE ADMISSÕES */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Admissões no Centro Obstétrico
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Acompanhamento clínico profissional de gestantes e puérperas
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Carregando admissões...
                </div>
              ) : admissoesFiltradas.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500 space-y-1">
                  <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">
                    Nenhuma admissão obstétrica encontrada.
                  </p>
                  <p className="text-slate-400">
                    Clique em "Nova Admissão Obstétrica" para iniciar.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {admissoesFiltradas.map((adm) => {
                    const statusBadgeMap: Record<string, { label: string; cls: string }> = {
                      em_trabalho_parto: {
                        label: 'Em Trabalho de Parto',
                        cls: 'bg-rose-500/15 text-rose-800 border-rose-300',
                      },
                      em_observacao: {
                        label: 'Em Observação',
                        cls: 'bg-amber-500/15 text-amber-800 border-amber-300',
                      },
                      parto_realizado: {
                        label: 'Parto Realizado',
                        cls: 'bg-purple-500/15 text-purple-800 border-purple-300',
                      },
                      alta: {
                        label: 'Alta Obstétrica',
                        cls: 'bg-emerald-500/15 text-emerald-800 border-emerald-300',
                      },
                      transferida: {
                        label: 'Transferida',
                        cls: 'bg-slate-500/15 text-slate-700 border-slate-300',
                      },
                    }
                    const badgeInfo = statusBadgeMap[adm.status_admissao] || {
                      label: adm.status_admissao,
                      cls: 'bg-slate-100 text-slate-800',
                    }

                    // Registros de trabalho de parto associados a esta admissão
                    const evolucoesDestaAdm = trabalhoPartos.filter(
                      (tp) => tp.admissao_obstetrica === adm.id,
                    )
                    // Partos associados
                    const partosDestaAdm = partos.filter((p) => p.admissao_obstetrica === adm.id)

                    return (
                      <div
                        key={adm.id}
                        className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {adm.numero_admissao}
                            </span>
                            <Badge className={`text-[11px] font-semibold border ${badgeInfo.cls}`}>
                              {badgeInfo.label}
                            </Badge>
                            {adm.risco_obstetrico_informado === 'alto_risco' ? (
                              <Badge className="bg-red-600 text-white text-[10px] font-bold">
                                Alto Risco Informado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-slate-600">
                                Risco Habitual
                              </Badge>
                            )}
                            {adm.leito_codigo && (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-blue-700 border-blue-300"
                              >
                                Leito: {adm.leito_codigo}
                              </Badge>
                            )}
                          </div>

                          <div>
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                              {adm.paciente_nome}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-0.5">
                              <span>
                                <strong>Admissão:</strong> {adm.data_hora_admissao}
                              </span>
                              {adm.idade_gestacional_semanas && (
                                <span>
                                  <strong>IG Informada:</strong> {adm.idade_gestacional_semanas} sem
                                  {adm.idade_gestacional_dias
                                    ? ` e ${adm.idade_gestacional_dias}d`
                                    : ''}
                                </span>
                              )}
                              {adm.gesta_previa !== undefined && (
                                <span>
                                  <strong>G/P/A/C:</strong> G{adm.gesta_previa || 0} P
                                  {adm.para_previa || 0} A{adm.abortos_previos || 0} C
                                  {adm.cesareas_previas || 0}
                                </span>
                              )}
                              <span>
                                <strong>Profissional:</strong> {adm.profissional_nome}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200/80">
                            <strong>Motivo:</strong> {adm.motivo_admissao}
                            {adm.batimentos_cardiofetais_bcf && (
                              <span className="ml-2">
                                • <strong>BCF:</strong> {adm.batimentos_cardiofetais_bcf}
                              </span>
                            )}
                            {adm.dinamica_uterina && (
                              <span className="ml-2">
                                • <strong>Dinâmica:</strong> {adm.dinamica_uterina}
                              </span>
                            )}
                            {adm.dilatacao_cervical_cm && (
                              <span className="ml-2">
                                • <strong>Dilatação:</strong> {adm.dilatacao_cervical_cm} cm
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                            <span>
                              Evoluções registradas: <strong>{evolucoesDestaAdm.length}</strong>
                            </span>
                            <span>
                              Partos vinculados: <strong>{partosDestaAdm.length}</strong>
                            </span>
                          </div>
                        </div>

                        {/* AÇÕES CLÍNICAS */}
                        <div className="flex flex-wrap lg:flex-col items-end gap-1.5 shrink-0">
                          {podeRegistrarClinico && adm.status_admissao !== 'alta' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => abrirModalTrabalhoParto(adm)}
                                className="text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1 h-7"
                              >
                                <Activity className="w-3.5 h-3.5" />
                                Evolução Horária
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => abrirModalParto(adm)}
                                className="text-xs bg-pink-700 hover:bg-pink-800 text-white gap-1 h-7"
                              >
                                <HeartPulse className="w-3.5 h-3.5" />
                                Registrar Parto
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => abrirModalDesfecho(adm)}
                                className="text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50 gap-1 h-7"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Desfecho / Alta
                              </Button>
                            </>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => abrirDetalhesAdmissao(adm)}
                            className="text-xs text-slate-600 gap-1 h-7"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Ver Histórico Completo
                          </Button>

                          {onNavegarSAME && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onNavegarSAME(adm.paciente)}
                              className="text-xs text-blue-700 border-blue-200 hover:bg-blue-50 gap-1 h-7"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              SAME da Mãe
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

      {/* ABA 2: PARTOS REALIZADOS & RECÉM-NASCIDOS */}
      {abaAtiva === 'partos_rn' && (
        <div className="space-y-6">
          {/* SEÇÃO 1: PARTOS REALIZADOS */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-purple-600" />
                  Registros de Partos e Nascimentos
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Partos registrados na unidade com dados preenchidos pela equipe
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono font-bold">
                {partos.length} parto(s)
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {partos.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Nenhum parto registrado no momento.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {partos.map((parto) => {
                    const tipoPartoMap: Record<string, string> = {
                      vaginal_espontaneo: 'Vaginal Espontâneo',
                      vaginal_instrumentado: 'Vaginal Instrumentado',
                      cesarea_eletiva: 'Cesariana Eletiva',
                      cesarea_urgencia: 'Cesariana Urgência',
                    }
                    const rnsDesteParto = recemNascidos.filter((rn) => rn.parto === parto.id)

                    return (
                      <div
                        key={parto.id}
                        className="p-4 hover:bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">
                              Mãe: {parto.paciente_mae_nome}
                            </span>
                            <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px]">
                              {tipoPartoMap[parto.tipo_parto] || parto.tipo_parto}
                            </Badge>
                            <span className="text-xs text-slate-500 font-mono">
                              {parto.data_hora_parto}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 space-x-2">
                            <span>
                              <strong>Obstetra:</strong> {parto.medico_obstetra_nome}
                            </span>
                            {parto.indicacao_tipo_parto && (
                              <span>• Indicação: {parto.indicacao_tipo_parto}</span>
                            )}
                            {parto.sangramento_estimado_ml && (
                              <span>• Sangramento: {parto.sangramento_estimado_ml} ml</span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                            {parto.contato_pele_a_pele_imediato && (
                              <span className="text-emerald-700 font-medium">✓ Pele a pele</span>
                            )}
                            {parto.amamentacao_primeira_hora && (
                              <span className="text-pink-700 font-medium">
                                ✓ Amamentação 1ª hora
                              </span>
                            )}
                            {parto.clampeamento_cordao_oportuno && (
                              <span className="text-blue-700 font-medium">
                                ✓ Clampeamento oportuno
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {podeRegistrarClinico && (
                            <Button
                              size="sm"
                              onClick={() => abrirModalRNParaParto(parto)}
                              className="text-xs bg-cyan-700 hover:bg-cyan-800 text-white gap-1 h-7"
                            >
                              <Baby className="w-3.5 h-3.5" />
                              Vincular Recém-Nascido ({rnsDesteParto.length})
                            </Button>
                          )}
                          {onNavegarSAME && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onNavegarSAME(parto.paciente_mae)}
                              className="text-xs text-blue-700 border-blue-200 h-7"
                            >
                              SAME
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

          {/* SEÇÃO 2: RECÉM-NASCIDOS REGISTRADOS */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Baby className="w-4 h-4 text-cyan-600" />
                  Recém-Nascidos com Vínculo Materno
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Antropometria, Apgar digitado pelo profissional e acomodação inicial
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono font-bold">
                {recemNascidos.length} recém-nascido(s)
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {recemNascidos.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Nenhum recém-nascido registrado no momento.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recemNascidos.map((rn) => {
                    const acomodacaoMap: Record<string, string> = {
                      alojamento_conjunto: 'Alojamento Conjunto',
                      unidade_cuidados_intermediarios: 'UCI',
                      uti_neonatal: 'UTI Neonatal',
                      isolamento: 'Isolamento',
                    }

                    return (
                      <div
                        key={rn.id}
                        className="p-4 hover:bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">
                              {rn.identificacao_rn}
                            </span>
                            <Badge
                              className={`text-[10px] ${
                                rn.sexo === 'feminino'
                                  ? 'bg-pink-100 text-pink-900 border-pink-300'
                                  : 'bg-cyan-100 text-cyan-900 border-cyan-300'
                              }`}
                            >
                              {rn.sexo === 'feminino'
                                ? 'Menina'
                                : rn.sexo === 'masculino'
                                  ? 'Menino'
                                  : 'Indeterminado'}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {rn.peso_gramas}g
                            </Badge>
                            <span className="text-xs text-slate-500 font-mono">
                              {rn.data_hora_nascimento}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 space-x-2">
                            <span>
                              <strong>Mãe:</strong> {rn.mae_nome}
                            </span>
                            {rn.comprimento_cm && <span>• Comp: {rn.comprimento_cm} cm</span>}
                            {rn.perimetro_cefalico_cm && (
                              <span>• PC: {rn.perimetro_cefalico_cm} cm</span>
                            )}
                            {rn.apgar_1_minuto !== undefined && rn.apgar_1_minuto !== null && (
                              <span>
                                • <strong>Apgar 1º/5º:</strong> {rn.apgar_1_minuto}/
                                {rn.apgar_5_minutos ?? '-'}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span>
                              Destino:{' '}
                              <strong>{acomodacaoMap[rn.acomodacao_rn] || rn.acomodacao_rn}</strong>
                            </span>
                            {rn.pulseira_identificacao_conferida && (
                              <span className="text-emerald-700">✓ Pulseira conferida</span>
                            )}
                            {rn.declaracao_nascido_vivo_dnv_numero && (
                              <span>DNV: {rn.declaracao_nascido_vivo_dnv_numero}</span>
                            )}
                          </div>
                        </div>

                        {onNavegarSAME && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onNavegarSAME(rn.mae_paciente)}
                            className="text-xs text-blue-700 border-blue-200 h-7 shrink-0"
                          >
                            SAME da Mãe
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ABA 3: QUADRO DE GESTÃO DA UNIDADE OBSTÉTRICA */}
      {abaAtiva === 'quadro' && <QuadroUnidadeObstetrica indicadores={indicadores} />}

      {/* MODAL 1: NOVA ADMISSÃO OBSTÉTRICA */}
      <Dialog open={modalNovaAdmissao} onOpenChange={setModalNovaAdmissao}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-pink-600" />
              Admissão no Centro Obstétrico
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Preenchimento assistencial profissional. Sem diagnósticos ou limiares de risco
              automáticos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarAdmissao} className="space-y-4 pt-2">
            {/* Bloco Paciente e Internação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Paciente Gestante / Puérpera *
                </label>
                <select
                  required
                  className="w-full h-9 px-2.5 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800"
                  value={admPacienteId}
                  onChange={(e) => setAdmPacienteId(e.target.value)}
                >
                  <option value="">Selecione a paciente cadastrada...</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.cpf ? `(CPF: ${p.cpf})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Vínculo com Internação Existente (Opcional)
                </label>
                <select
                  className="w-full h-9 px-2.5 text-xs border border-slate-300 rounded-md bg-white text-slate-800"
                  value={admInternacaoId}
                  onChange={(e) => {
                    setAdmInternacaoId(e.target.value)
                    const it = internacoesAtivas.find((i) => i.id === e.target.value)
                    if (it && it.paciente) {
                      setAdmPacienteId(it.paciente)
                    }
                  }}
                >
                  <option value="">Nenhuma internação prévia selecionada</option>
                  {internacoesAtivas.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.expand?.paciente?.nome || 'Paciente'} — Admissão{' '}
                      {it.data_admissao?.split('T')[0]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Leito e Data/Hora */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Leito Obstétrico
                </label>
                <select
                  className="w-full h-9 px-2.5 text-xs border border-slate-300 rounded-md bg-white text-slate-800"
                  value={admLeitoId}
                  onChange={(e) => setAdmLeitoId(e.target.value)}
                >
                  <option value="">Selecione o leito...</option>
                  {leitosDisponiveis.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.codigo} ({lt.tipo}) — {lt.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Data e Hora da Admissão *
                </label>
                <Input
                  required
                  type="text"
                  placeholder="AAAA-MM-DD HH:mm"
                  className="h-9 text-xs font-mono"
                  value={admDataHora}
                  onChange={(e) => setAdmDataHora(e.target.value)}
                />
              </div>
            </div>

            {/* Histórico Obstétrico e Idade Gestacional informada */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <span className="text-xs font-bold text-slate-800 block">
                Histórico Obstétrico e Idade Gestacional (Informados pelo Profissional)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 block">Gestações (G)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Ex: 2"
                    className="h-8 text-xs font-mono"
                    value={admGesta}
                    onChange={(e) => setAdmGesta(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block">Partos (P)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Ex: 1"
                    className="h-8 text-xs font-mono"
                    value={admPara}
                    onChange={(e) => setAdmPara(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block">Abortos (A)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Ex: 0"
                    className="h-8 text-xs font-mono"
                    value={admAbortos}
                    onChange={(e) => setAdmAbortos(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block">Cesáreas Prévias</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Ex: 0"
                    className="h-8 text-xs font-mono"
                    value={admCesareas}
                    onChange={(e) => setAdmCesareas(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 block">IG (Semanas)</label>
                  <Input
                    type="number"
                    min="0"
                    max="45"
                    placeholder="Ex: 39"
                    className="h-8 text-xs font-mono"
                    value={admIgSemanas}
                    onChange={(e) => setAdmIgSemanas(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block">IG (Dias)</label>
                  <Input
                    type="number"
                    min="0"
                    max="6"
                    placeholder="Ex: 3"
                    className="h-8 text-xs font-mono"
                    value={admIgDias}
                    onChange={(e) => setAdmIgDias(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block">DUM Informada</label>
                  <Input
                    type="date"
                    className="h-8 text-xs font-mono"
                    value={admDum}
                    onChange={(e) => setAdmDum(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block">DPP Informada</label>
                  <Input
                    type="date"
                    className="h-8 text-xs font-mono"
                    value={admDpp}
                    onChange={(e) => setAdmDpp(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Classificação de Risco Informada pelo Profissional
                  </label>
                  <select
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800"
                    value={admRiscoInformado}
                    onChange={(e) => setAdmRiscoInformado(e.target.value as any)}
                  >
                    <option value="habitual">Risco Habitual (Sem fatores adicionais)</option>
                    <option value="alto_risco">Alto Risco (Definido pelo profissional)</option>
                    <option value="nao_informado">Não Informado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Justificativa Clínica do Risco (se alto risco)
                  </label>
                  <Input
                    placeholder="Ex: Pré-eclâmpsia leve, DMG prévia..."
                    className="h-8 text-xs"
                    value={admJustificativaRisco}
                    onChange={(e) => setAdmJustificativaRisco(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Motivo e Parâmetros de Entrada */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Motivo da Admissão / Queixa Principal *
              </label>
              <Input
                required
                placeholder="Ex: Trabalho de parto ativo, contrações a cada 3 minutos, perda de líquido..."
                className="h-9 text-xs"
                value={admMotivo}
                onChange={(e) => setAdmMotivo(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[11px] text-slate-600 block">BCF (bpm)</label>
                <Input
                  placeholder="Ex: 142 bpm"
                  className="h-8 text-xs font-mono"
                  value={admBcf}
                  onChange={(e) => setAdmBcf(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block">Dinâmica Uterina</label>
                <Input
                  placeholder="Ex: 3/10' 35''"
                  className="h-8 text-xs"
                  value={admDinamica}
                  onChange={(e) => setAdmDinamica(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block">Dilatação Cervical</label>
                <Input
                  placeholder="Ex: 5 cm"
                  className="h-8 text-xs font-mono"
                  value={admDilatacao}
                  onChange={(e) => setAdmDilatacao(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block">Bolsa Amniótica</label>
                <Input
                  placeholder="Ex: Íntegra / Rota clara"
                  className="h-8 text-xs"
                  value={admBolsa}
                  onChange={(e) => setAdmBolsa(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label
                htmlFor="obs_admissao_obs"
                className="text-xs font-semibold text-slate-700 block mb-1 cursor-pointer"
              >
                Observações Adicionais da Equipe & Conduta Inicial
              </Label>
              <Textarea
                id="obs_admissao_obs"
                placeholder="Conduta inicial, orientações fornecidas, acompanhante presente, plano de parto..."
                rows={4}
                className="text-xs min-h-[90px]"
                value={admObs}
                onChange={(e) => setAdmObs(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovaAdmissao(false)}
                className="text-xs text-slate-600"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoAdmissao}
                className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold"
              >
                {salvandoAdmissao ? 'Gravando...' : 'Confirmar Admissão Obstétrica'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: EVOLUÇÃO DO TRABALHO DE PARTO */}
      <Dialog open={modalNovoTrabalhoParto} onOpenChange={setModalNovoTrabalhoParto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-rose-600" />
              Evolução do Trabalho de Parto
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {admissaoSelecionada?.paciente_nome} • Admissão nº{' '}
              {admissaoSelecionada?.numero_admissao}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarTrabalhoParto} className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Data e Horário do Registro *
              </label>
              <Input
                required
                type="text"
                placeholder="AAAA-MM-DD HH:mm"
                className="h-8 text-xs font-mono"
                value={tpDataHora}
                onChange={(e) => setTpDataHora(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-slate-600 block">Dilatação (cm)</label>
                <Input
                  placeholder="Ex: 6 cm"
                  className="h-8 text-xs font-mono"
                  value={tpDilatacao}
                  onChange={(e) => setTpDilatacao(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block">Apagamento (%)</label>
                <Input
                  placeholder="Ex: 80%"
                  className="h-8 text-xs font-mono"
                  value={tpApagamento}
                  onChange={(e) => setTpApagamento(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block">Plano De Lee</label>
                <Input
                  placeholder="Ex: -1 / 0 / +1"
                  className="h-8 text-xs font-mono"
                  value={tpDeLee}
                  onChange={(e) => setTpDeLee(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block">BCF (bpm)</label>
                <Input
                  placeholder="Ex: 138 bpm"
                  className="h-8 text-xs font-mono"
                  value={tpBcf}
                  onChange={(e) => setTpBcf(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block">Dinâmica Uterina</label>
                <Input
                  placeholder="Ex: 4/10' 40''"
                  className="h-8 text-xs"
                  value={tpDinamica}
                  onChange={(e) => setTpDinamica(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block">Pressão Arterial</label>
                <Input
                  placeholder="Ex: 110x70"
                  className="h-8 text-xs font-mono"
                  value={tpPa}
                  onChange={(e) => setTpPa(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Métodos de Alívio da Dor / Suporte Utilizado
              </label>
              <Input
                placeholder="Ex: Bola suíça, banho morno, massagem lombossacral..."
                className="h-8 text-xs"
                value={tpAlivioDor}
                onChange={(e) => setTpAlivioDor(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Anotação / Conduta Clínica Profissional *
              </label>
              <Textarea
                required
                placeholder="Descreva a evolução do trabalho de parto e as orientações transmitidas..."
                rows={3}
                className="text-xs resize-none"
                value={tpEvolucao}
                onChange={(e) => setTpEvolucao(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovoTrabalhoParto(false)}
                className="text-xs text-slate-600"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoTp}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
              >
                {salvandoTp ? 'Gravando...' : 'Salvar Evolução'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: REGISTRO DO PARTO */}
      <Dialog open={modalNovoParto} onOpenChange={setModalNovoParto}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-pink-600" />
              Registro do Parto e Nascimento
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Mãe: {admissaoSelecionada?.paciente_nome}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarParto} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Data e Hora do Parto *
                </label>
                <Input
                  required
                  type="text"
                  placeholder="AAAA-MM-DD HH:mm"
                  className="h-8 text-xs font-mono"
                  value={partoDataHora}
                  onChange={(e) => setPartoDataHora(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tipo de Parto *
                </label>
                <select
                  required
                  className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800"
                  value={partoTipo}
                  onChange={(e) => setPartoTipo(e.target.value as any)}
                >
                  <option value="vaginal_espontaneo">Parto Vaginal Espontâneo</option>
                  <option value="vaginal_instrumentado">
                    Parto Vaginal Instrumentado (Fórceps/Vácuo)
                  </option>
                  <option value="cesarea_urgencia">Cesariana de Urgência</option>
                  <option value="cesarea_eletiva">Cesariana Eletiva</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Indicação do Tipo de Parto (se cirúrgico/instrumentado)
                </label>
                <Input
                  placeholder="Ex: Parada de progressão, sofrimento fetal agudo..."
                  className="h-8 text-xs"
                  value={partoIndicacao}
                  onChange={(e) => setPartoIndicacao(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Posição no Parto
                </label>
                <Input
                  placeholder="Ex: Semi-sentada, de cócoras, litotômica..."
                  className="h-8 text-xs"
                  value={partoPosicao}
                  onChange={(e) => setPartoPosicao(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-slate-600 block">Anestesia / Analgesia</label>
                <Input
                  placeholder="Ex: Raquianestesia / Sem anestesia"
                  className="h-8 text-xs"
                  value={partoAnestesia}
                  onChange={(e) => setPartoAnestesia(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block">Períneo / Laceração</label>
                <Input
                  placeholder="Ex: Íntegro / Laceração grau I"
                  className="h-8 text-xs"
                  value={partoEpisiotomia}
                  onChange={(e) => setPartoEpisiotomia(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block">
                  Sangramento Estimado (ml)
                </label>
                <Input
                  type="number"
                  placeholder="Ex: 300"
                  className="h-8 text-xs font-mono"
                  value={partoSangramento}
                  onChange={(e) => setPartoSangramento(e.target.value)}
                />
              </div>
            </div>

            {/* Boas Práticas ao Nascimento */}
            <div className="p-3 bg-pink-50/50 border border-pink-200 rounded-lg space-y-2">
              <span className="text-xs font-bold text-pink-950 block">
                Boas Práticas na Assistência ao Nascimento
              </span>
              <div className="flex flex-col sm:flex-row gap-3 text-xs text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={partoPeleAPele}
                    onChange={(e) => setPartoPeleAPele(e.target.checked)}
                    className="rounded text-pink-600"
                  />
                  Contato Pele a Pele Imediato
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={partoAmamentacao1h}
                    onChange={(e) => setPartoAmamentacao1h(e.target.checked)}
                    className="rounded text-pink-600"
                  />
                  Amamentação na 1ª Hora
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={partoClampeamento}
                    onChange={(e) => setPartoClampeamento(e.target.checked)}
                    className="rounded text-pink-600"
                  />
                  Clampeamento Oportuno
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Médico Obstetra Responsável *
                </label>
                <Input
                  required
                  placeholder="Nome do médico obstetra"
                  className="h-8 text-xs"
                  value={partoObstetraNome}
                  onChange={(e) => setPartoObstetraNome(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Enfermeiro(a) Obstetra / Assistente
                </label>
                <Input
                  placeholder="Nome do enfermeiro(a)"
                  className="h-8 text-xs"
                  value={partoEnfermeiroNome}
                  onChange={(e) => setPartoEnfermeiroNome(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Observações do Parto
              </label>
              <Textarea
                placeholder="Condições maternas imediatas, desprendimento da placenta..."
                rows={2}
                className="text-xs resize-none"
                value={partoObs}
                onChange={(e) => setPartoObs(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovoParto(false)}
                className="text-xs text-slate-600"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoParto}
                className="bg-pink-700 hover:bg-pink-800 text-white text-xs font-semibold"
              >
                {salvandoParto ? 'Gravando...' : 'Salvar Parto e Prosseguir'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: CADASTRO DO RECÉM-NASCIDO COM VÍNCULO MATERNO */}
      <Dialog open={modalNovoRN} onOpenChange={setModalNovoRN}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Baby className="w-5 h-5 text-cyan-600" />
              Cadastro do Recém-Nascido (Vínculo Mãe-RN)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Mãe: {partoSelecionadoParaRN?.paciente_mae_nome} • Valores informados pelo
              profissional
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarRN} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Identificação do RN *
                </label>
                <Input
                  required
                  placeholder="Ex: RN de Maria Silva"
                  className="h-8 text-xs"
                  value={rnIdentificacao}
                  onChange={(e) => setRnIdentificacao(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Data e Hora do Nascimento *
                </label>
                <Input
                  required
                  type="text"
                  placeholder="AAAA-MM-DD HH:mm"
                  className="h-8 text-xs font-mono"
                  value={rnDataHora}
                  onChange={(e) => setRnDataHora(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[11px] text-slate-600 block">Sexo *</label>
                <select
                  required
                  className="w-full h-8 px-2 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800"
                  value={rnSexo}
                  onChange={(e) => setRnSexo(e.target.value as any)}
                >
                  <option value="feminino">Feminino</option>
                  <option value="masculino">Masculino</option>
                  <option value="indeterminado">Indeterminado</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block">Peso (gramas) *</label>
                <Input
                  required
                  type="number"
                  placeholder="Ex: 3250"
                  className="h-8 text-xs font-mono"
                  value={rnPeso}
                  onChange={(e) => setRnPeso(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block">Comprimento (cm)</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 49.5"
                  className="h-8 text-xs font-mono"
                  value={rnComprimento}
                  onChange={(e) => setRnComprimento(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block">Perímetro Cefálico (cm)</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 34"
                  className="h-8 text-xs font-mono"
                  value={rnPc}
                  onChange={(e) => setRnPc(e.target.value)}
                />
              </div>
            </div>

            {/* Apgar Digitado (Informado pelo profissional, sem cálculo automático) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                Índice de Apgar Informado (Dados digitados pelo profissional)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-600 block">
                    Apgar 1º Minuto (0 a 10)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    placeholder="Ex: 9"
                    className="h-8 text-xs font-mono"
                    value={rnApgar1}
                    onChange={(e) => setRnApgar1(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block">
                    Apgar 5º Minuto (0 a 10)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    placeholder="Ex: 10"
                    className="h-8 text-xs font-mono"
                    value={rnApgar5}
                    onChange={(e) => setRnApgar5(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Acomodação Inicial do Recém-Nascido *
              </label>
              <select
                required
                className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800"
                value={rnAcomodacao}
                onChange={(e) => setRnAcomodacao(e.target.value as any)}
              >
                <option value="alojamento_conjunto">Alojamento Conjunto (junto à mãe)</option>
                <option value="unidade_cuidados_intermediarios">
                  Unidade de Cuidados Intermediários (UCI)
                </option>
                <option value="uti_neonatal">UTI Neonatal</option>
                <option value="isolamento">Isolamento</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nº da Declaração de Nascido Vivo (DNV)
                </label>
                <Input
                  placeholder="Ex: 32145698-7"
                  className="h-8 text-xs font-mono"
                  value={rnDnv}
                  onChange={(e) => setRnDnv(e.target.value)}
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={rnPulseira}
                    onChange={(e) => setRnPulseira(e.target.checked)}
                    className="rounded text-cyan-600"
                  />
                  Pulseira dupla mãe-filho conferida
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Observações Neonatais
              </label>
              <Textarea
                placeholder="Adaptação neonatal, mecônio, diurese, reflexos observados..."
                rows={2}
                className="text-xs resize-none"
                value={rnObs}
                onChange={(e) => setRnObs(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovoRN(false)}
                className="text-xs text-slate-600"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoRn}
                className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-semibold"
              >
                {salvandoRn ? 'Gravando...' : 'Cadastrar Recém-Nascido'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: DESFECHO E ALTA OBSTÉTRICA */}
      <Dialog open={modalNovoDesfecho} onOpenChange={setModalNovoDesfecho}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Desfecho e Alta Obstétrica
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Mãe: {admissaoSelecionada?.paciente_nome} • Integração com desocupação de leito
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarDesfecho} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Data e Hora do Desfecho *
                </label>
                <Input
                  required
                  type="text"
                  placeholder="AAAA-MM-DD HH:mm"
                  className="h-8 text-xs font-mono"
                  value={desfDataHora}
                  onChange={(e) => setDesfDataHora(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tipo de Desfecho *
                </label>
                <select
                  required
                  className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800"
                  value={desfTipo}
                  onChange={(e) => setDesfTipo(e.target.value as any)}
                >
                  <option value="alta_hospitalar_mae_e_rn">
                    Alta Conjunta (Mãe e Recém-Nascido)
                  </option>
                  <option value="alta_hospitalar_apenas_mae">Alta da Mãe (RN permanece)</option>
                  <option value="transferencia_inter_hospitalar">
                    Transferência Inter-Hospitalar
                  </option>
                  <option value="alta_a_pedido">Alta a Pedido</option>
                  <option value="permanencia_internada">Permanência em Internação</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Resumo Clínico do Desfecho *
              </label>
              <Textarea
                required
                placeholder="Condições maternas de alta, ausência de sangramento anormal, sinais vitais estáveis..."
                rows={2}
                className="text-xs resize-none"
                value={desfResumo}
                onChange={(e) => setDesfResumo(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Orientações Pós-Parto e Puerpério
              </label>
              <Input
                placeholder="Ex: Cuidados com coto umbilical, higiene, sinais de alerta..."
                className="h-8 text-xs"
                value={desfOrientacoes}
                onChange={(e) => setDesfOrientacoes(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Encaminhamento / Retorno UBS
              </label>
              <Input
                placeholder="Ex: Retorno em 7 dias à UBS de Mirante da Serra"
                className="h-8 text-xs"
                value={desfRetornoUbs}
                onChange={(e) => setDesfRetornoUbs(e.target.value)}
              />
            </div>

            <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg">
              <label className="flex items-center gap-2 text-xs text-emerald-950 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={desfDesocuparLeito}
                  onChange={(e) => setDesfDesocuparLeito(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                Desocupar leito hospitalar e encaminhar para higienização
              </label>
              <span className="text-[11px] text-emerald-800 block mt-0.5">
                Atualiza o mapa de leitos de internação e o prontuário da paciente.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovoDesfecho(false)}
                className="text-xs text-slate-600"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoDesfecho}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
              >
                {salvandoDesfecho ? 'Gravando...' : 'Confirmar Alta Obstétrica'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: DETALHES COMPLETOS DA ADMISSÃO OBSTÉTRICA */}
      <Dialog open={modalDetalhesAdmissao} onOpenChange={setModalDetalhesAdmissao}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-700" />
              Prontuário da Admissão Obstétrica
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {admissaoSelecionada?.numero_admissao} • {admissaoSelecionada?.paciente_nome}
            </DialogDescription>
          </DialogHeader>

          {admissaoSelecionada && (
            <div className="space-y-3 text-xs pt-1">
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Data de Admissão:</span>
                  <span className="font-semibold text-slate-800">
                    {admissaoSelecionada.data_hora_admissao}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Profissional Responsável:</span>
                  <span className="font-semibold text-slate-800">
                    {admissaoSelecionada.profissional_nome}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Classificação de Risco:</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {admissaoSelecionada.risco_obstetrico_informado || 'Habitual'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Idade Gestacional Informada:</span>
                  <span className="font-semibold text-slate-800">
                    {admissaoSelecionada.idade_gestacional_semanas
                      ? `${admissaoSelecionada.idade_gestacional_semanas} semanas`
                      : 'Não informada'}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block">Motivo da Admissão:</span>
                <p className="p-2 bg-white rounded border border-slate-200 text-slate-800 mt-1">
                  {admissaoSelecionada.motivo_admissao}
                </p>
              </div>

              {/* Linha do tempo de evoluções desta admissão */}
              <div>
                <span className="font-bold text-slate-900 block mb-1">
                  Evoluções do Trabalho de Parto (
                  {
                    trabalhoPartos.filter((t) => t.admissao_obstetrica === admissaoSelecionada.id)
                      .length
                  }
                  )
                </span>
                <div className="space-y-1.5">
                  {trabalhoPartos
                    .filter((t) => t.admissao_obstetrica === admissaoSelecionada.id)
                    .map((tp) => (
                      <div
                        key={tp.id}
                        className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-700 space-y-1"
                      >
                        <div className="flex justify-between font-mono text-[11px] text-slate-500">
                          <span>{tp.data_hora_registro}</span>
                          <span>{tp.profissional_nome}</span>
                        </div>
                        <p className="font-medium text-slate-800">
                          {tp.evolucao_anotacao_profissional}
                        </p>
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                          {tp.dilatacao_cervical_cm && (
                            <span>Dilat: {tp.dilatacao_cervical_cm} cm</span>
                          )}
                          {tp.batimentos_cardiofetais_bcf && (
                            <span>BCF: {tp.batimentos_cardiofetais_bcf}</span>
                          )}
                          {tp.dinamica_uterina_freq_duracao && (
                            <span>Din: {tp.dinamica_uterina_freq_duracao}</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 7: AVISO DE ESCOPO E COMPLIANCE */}
      <Dialog open={modalAvisoEscopo} onOpenChange={setModalAvisoEscopo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Diretrizes do Módulo Centro Obstétrico
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Conformidade com o Guia de Referência Hospitalar e Deliberações do Codex
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs text-slate-700 py-1">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded text-blue-900 space-y-1">
              <span className="font-bold block">1. Sem Cálculos ou Limiares Automáticos</span>
              <p>
                Nenhum escore ou conduta clínica é calculada pelo sistema. Risco, idade gestacional,
                Apgar e desfechos são estritamente informados pelo profissional assistente.
              </p>
            </div>

            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-950 space-y-1">
              <span className="font-bold block">2. Integração Completa ao SAME</span>
              <p>
                Todos os eventos obstétricos (admissão, parto, recém-nascido e alta) alimentam a
                linha do tempo unificada do Prontuário SAME da mãe.
              </p>
            </div>

            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-950 space-y-1">
              <span className="font-bold block">3. Permissões e Perfis</span>
              <p>
                Recepção possui acesso apenas administrativo. Registros clínicos são restritos aos
                profissionais, gestores e administradores hospitalares.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              onClick={() => setModalAvisoEscopo(false)}
              className="text-xs bg-slate-900 text-white"
            >
              Compreendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
