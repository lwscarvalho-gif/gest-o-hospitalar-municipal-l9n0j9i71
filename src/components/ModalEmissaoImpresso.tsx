import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Printer,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Copy,
  Eye,
  Edit3,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  Paciente,
  Profissional,
  TipoImpressoAssistencial,
  OrigemImpressoAssistencial,
  ItemReceitaAssistencial,
  ConteudoReceitaAssistencial,
  ConteudoAtestadoAssistencial,
  ConteudoResumoAltaAssistencial,
  ImpressoAssistencial,
  PrescricaoMedica,
  ViaAdministracaoMedicamento,
} from '@/types/hospital'
import { emitirImpressoAssistencial } from '@/services/impressosAssistenciais'
import { FolhaImpressoA4 } from './FolhaImpressoA4'
import { formatarDataHoraFuso } from '@/services/dataFusoUnidade'

interface ModalEmissaoImpressoProps {
  aberto: boolean
  onClose: () => void
  paciente: Paciente | null
  origem: OrigemImpressoAssistencial
  atendimentoPaId?: string
  internacaoId?: string
  dadosInternacao?: {
    dataAdmissao?: string
    leitoSetor?: string
    motivoInternacao?: string
    diagnosticoAdmissao?: string
    cid10Admissao?: string
    procedimentos?: string
  }
  prescricoesExistentes?: PrescricaoMedica[]
  profissionaisList: Profissional[]
  usuarioAtual?: {
    id: string
    nome: string
    role: string
    email?: string
  }
  tipoInicial?: TipoImpressoAssistencial
  onImpressoEmitido?: (impresso: ImpressoAssistencial) => void
}

const VIAS_ADMINISTRACAO: ViaAdministracaoMedicamento[] = [
  'oral',
  'intravenosa',
  'intramuscular',
  'subcutanea',
  'inalatoria',
  'topica',
  'retal',
  'oftalmica',
  'nasal',
  'outra',
]

export const ModalEmissaoImpresso: React.FC<ModalEmissaoImpressoProps> = ({
  aberto,
  onClose,
  paciente,
  origem,
  atendimentoPaId,
  internacaoId,
  dadosInternacao,
  prescricoesExistentes = [],
  profissionaisList = [],
  usuarioAtual,
  tipoInicial = 'receita',
  onImpressoEmitido,
}) => {
  const { toast } = useToast()

  const [tipo, setTipo] = useState<TipoImpressoAssistencial>(tipoInicial)
  const [modoVisualizacao, setModoVisualizacao] = useState<'formulario' | 'preview'>('formulario')
  const [salvando, setSalvando] = useState(false)
  const [impressoSalvo, setImpressoSalvo] = useState<ImpressoAssistencial | null>(null)

  // Identificação do profissional
  const [profissionalSelecionadoId, setProfissionalSelecionadoId] = useState<string>('')
  const [profissionalNome, setProfissionalNome] = useState<string>('')
  const [profissionalProfissao, setProfissionalProfissao] = useState<string>('Médico(a)')
  const [profissionalRegistro, setProfissionalRegistro] = useState<string>('')
  const [unidadeNome, setUnidadeNome] = useState<string>('Hospital Municipal de Mirante da Serra')
  const [municipioUf, setMunicipioUf] = useState<string>('Mirante da Serra - RO')

  // Estado da Receita
  const [itensReceita, setItensReceita] = useState<ItemReceitaAssistencial[]>([
    {
      medicamento_nome: '',
      apresentacao: '',
      dose: '',
      via_administracao: 'oral',
      frequencia_posologia: '',
      duracao_quantidade: '',
      orientacoes: '',
    },
  ])
  const [usoContinuo, setUsoContinuo] = useState(false)
  const [observacoesGeraisReceita, setObservacoesGeraisReceita] = useState('')

  // Estado do Atestado
  const [tipoAtestado, setTipoAtestado] = useState<
    'afastamento_laboral' | 'comparecimento' | 'aptidao_fisica' | 'acompanhante'
  >('afastamento_laboral')
  const [periodoDias, setPeriodoDias] = useState<number>(1)
  const [periodoHoras, setPeriodoHoras] = useState<string>('')
  const [dataInicio, setDataInicio] = useState<string>(new Date().toISOString().split('T')[0])
  const [dataFim, setDataFim] = useState<string>('')
  const [textoAtestado, setTextoAtestado] = useState('')

  // Regra crítica: CID com consentimento explícito
  const [cidConsentimento, setCidConsentimento] = useState<boolean>(false)
  const [cid10Codigo, setCid10Codigo] = useState('')
  const [cid10Descricao, setCid10Descricao] = useState('')
  const [cidConsentimentoHora, setCidConsentimentoHora] = useState('')

  // Estado do Resumo de Alta
  const [dataAdmissaoAlta, setDataAdmissaoAlta] = useState(dadosInternacao?.dataAdmissao || '')
  const [dataAlta, setDataAlta] = useState(new Date().toISOString().split('T')[0])
  const [leitoSetorAlta, setLeitoSetorAlta] = useState(dadosInternacao?.leitoSetor || '')
  const [motivoInternacaoAlta, setMotivoInternacaoAlta] = useState(
    dadosInternacao?.motivoInternacao || '',
  )
  const [diagAdmissaoAlta, setDiagAdmissaoAlta] = useState(
    dadosInternacao?.diagnosticoAdmissao || '',
  )
  const [cidAdmissaoAlta, setCidAdmissaoAlta] = useState(dadosInternacao?.cid10Admissao || '')
  const [procedimentosAlta, setProcedimentosAlta] = useState(dadosInternacao?.procedimentos || '')
  const [resumoEvolucaoAlta, setResumoEvolucaoAlta] = useState('')
  const [diagnosticoAlta, setDiagnosticoAlta] = useState('')
  const [cidAlta, setCidAlta] = useState('')
  const [condutaMedicacaoAlta, setCondutaMedicacaoAlta] = useState('')
  const [recomendacoesAlta, setRecomendacoesAlta] = useState('')
  const [retornoAmbulatorialAlta, setRetornoAmbulatorialAlta] = useState('')
  const [condicaoAlta, setCondicaoAlta] = useState<
    'curado' | 'melhorado' | 'inalterado' | 'a_pedido' | 'transferido' | 'obito'
  >('melhorado')

  // Auto-vincular profissional logado se encontrado
  useEffect(() => {
    if (profissionaisList.length > 0) {
      const match = profissionaisList.find(
        (p) =>
          (usuarioAtual?.nome && p.nome.toLowerCase().includes(usuarioAtual.nome.toLowerCase())) ||
          p.registro_conselho,
      )
      const prof = match || profissionaisList[0]
      if (prof) {
        setProfissionalSelecionadoId(prof.id)
        setProfissionalNome(prof.nome)
        setProfissionalProfissao(prof.especialidade || prof.categoria?.toUpperCase() || 'Médico(a)')
        setProfissionalRegistro(prof.registro_conselho || 'CRM/RO')
      }
    }
  }, [profissionaisList, usuarioAtual])

  useEffect(() => {
    setTipo(tipoInicial)
  }, [tipoInicial])

  // Atualizar dados de internação quando abertos para resumo de alta
  useEffect(() => {
    if (dadosInternacao) {
      if (dadosInternacao.dataAdmissao) setDataAdmissaoAlta(dadosInternacao.dataAdmissao)
      if (dadosInternacao.leitoSetor) setLeitoSetorAlta(dadosInternacao.leitoSetor)
      if (dadosInternacao.motivoInternacao)
        setMotivoInternacaoAlta(dadosInternacao.motivoInternacao)
      if (dadosInternacao.diagnosticoAdmissao)
        setDiagAdmissaoAlta(dadosInternacao.diagnosticoAdmissao)
      if (dadosInternacao.cid10Admissao) setCidAdmissaoAlta(dadosInternacao.cid10Admissao)
      if (dadosInternacao.procedimentos) setProcedimentosAlta(dadosInternacao.procedimentos)
    }
  }, [dadosInternacao])

  const selecionarProfissional = (id: string) => {
    setProfissionalSelecionadoId(id)
    const p = profissionaisList.find((prof) => prof.id === id)
    if (p) {
      setProfissionalNome(p.nome)
      setProfissionalProfissao(p.especialidade || p.categoria?.toUpperCase() || 'Médico(a)')
      setProfissionalRegistro(p.registro_conselho || 'CRM/RO')
    }
  }

  // Importar prescrição existente na receita
  const importarPrescricaoExistente = (prescricao: PrescricaoMedica) => {
    if (!prescricao.itens || prescricao.itens.length === 0) {
      toast({
        title: 'Prescrição vazia',
        description: 'Essa prescrição não possui itens cadastrados.',
        variant: 'destructive',
      })
      return
    }

    const novosItens: ItemReceitaAssistencial[] = prescricao.itens.map((it) => ({
      medicamento_nome: it.medicamento_nome,
      apresentacao: '',
      dose: it.dose || '',
      via_administracao: it.via_administracao || 'oral',
      frequencia_posologia: it.frequencia || '',
      duracao_quantidade: it.duracao || '',
      orientacoes: it.instrucoes || '',
    }))

    setItensReceita((prev) => {
      const semVazios = prev.filter((p) => p.medicamento_nome.trim() !== '')
      return [...semVazios, ...novosItens]
    })

    toast({
      title: 'Prescrição importada',
      description: `${novosItens.length} item(ns) copiados da prescrição #${prescricao.id.slice(0, 6)}. Revise e ajuste conforme necessário.`,
    })
  }

  // Manipulação de itens da receita
  const adicionarItemReceita = () => {
    setItensReceita((prev) => [
      ...prev,
      {
        medicamento_nome: '',
        apresentacao: '',
        dose: '',
        via_administracao: 'oral',
        frequencia_posologia: '',
        duracao_quantidade: '',
        orientacoes: '',
      },
    ])
  }

  const removerItemReceita = (idx: number) => {
    setItensReceita((prev) => prev.filter((_, i) => i !== idx))
  }

  const atualizarItemReceita = (
    idx: number,
    campo: keyof ItemReceitaAssistencial,
    valor: string,
  ) => {
    setItensReceita((prev) => {
      const copia = [...prev]
      copia[idx] = { ...copia[idx], [campo]: valor }
      return copia
    })
  }

  // Geração de texto padrão do atestado com base nos dados
  useEffect(() => {
    const nomePaciente = paciente?.nome || 'o(a) paciente'
    if (tipoAtestado === 'afastamento_laboral') {
      setTextoAtestado(
        `Atesto para os devidos fins que o(a) paciente ${nomePaciente}, portador(a) do CNS nº ${paciente?.cartao_sus || '—'}, foi atendido(a) nesta unidade de saúde e deve permanecer afastado(a) de suas atividades laborais e escolares por um período de ${periodoDias} dia(s), a contar de ${dataInicio}${dataFim ? ` até ${dataFim}` : ''}.`,
      )
    } else if (tipoAtestado === 'comparecimento') {
      setTextoAtestado(
        `Atesto para os devidos fins que o(a) paciente ${nomePaciente}, portador(a) do CNS nº ${paciente?.cartao_sus || '—'}, compareceu a esta unidade de saúde na data de ${dataInicio}${periodoHoras ? ` no período/horário de ${periodoHoras}` : ''} para realização de atendimento e avaliação clínica.`,
      )
    } else if (tipoAtestado === 'acompanhante') {
      setTextoAtestado(
        `Atesto para os devidos fins que o(a) senhor(a) _____________________________________, esteve acompanhando o(a) paciente ${nomePaciente} nesta unidade de saúde no dia ${dataInicio}.`,
      )
    } else {
      setTextoAtestado(
        `Atesto para os devidos fins de aptidão física que examinei nesta data o(a) paciente ${nomePaciente}, encontrando-se apto(a) para a prática de atividades físicas habituais, não apresentando contraindicações clínicas no momento do exame.`,
      )
    }
  }, [tipoAtestado, periodoDias, periodoHoras, dataInicio, dataFim, paciente])

  // Toggle do consentimento de CID com registro de timestamp
  const alternarConsentimentoCid = (ativar: boolean) => {
    setCidConsentimento(ativar)
    if (ativar) {
      const agora = formatarDataHoraFuso(new Date(), undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: undefined,
      })
      setCidConsentimentoHora(agora)
      toast({
        title: 'Consentimento de CID registrado',
        description: `Consentimento do paciente registrado às ${agora}. O campo de CID foi desbloqueado.`,
      })
    } else {
      setCidConsentimentoHora('')
      setCid10Codigo('')
      setCid10Descricao('')
    }
  }

  // Montagem do objeto de pré-visualização em memória
  const objetoImpressoPreview: Partial<ImpressoAssistencial> = {
    id: impressoSalvo?.id || 'PREVIEW-A4',
    tipo,
    paciente: paciente?.id || '',
    profissional_nome: profissionalNome || usuarioAtual?.nome || 'Profissional de Saúde',
    profissional_profissao: profissionalProfissao,
    profissional_registro: profissionalRegistro || 'CRM / COREN não informado',
    unidade_nome: unidadeNome,
    municipio_uf: municipioUf,
    origem,
    atendimento_pa: atendimentoPaId,
    internacao: internacaoId,
    data_hora_emissao: formatarDataHoraFuso(new Date(), undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: undefined,
    }),
    cid_consentimento_registrado: cidConsentimento,
    cid_consentimento_data_hora: cidConsentimentoHora,
    cid10_codigo: cid10Codigo,
    cid10_descricao: cid10Descricao,
    conteudo:
      tipo === 'receita'
        ? ({
            itens: itensReceita.filter((it) => it.medicamento_nome.trim() !== ''),
            observacoes_gerais: observacoesGeraisReceita,
            uso_continuo: usoContinuo,
          } as ConteudoReceitaAssistencial)
        : tipo === 'atestado'
          ? ({
              tipo_atestado: tipoAtestado,
              periodo_dias: periodoDias,
              periodo_horas: periodoHoras,
              data_inicio: dataInicio,
              data_fim: dataFim,
              texto_atestado: textoAtestado,
              cid_consentimento_declarado: cidConsentimento,
              cid_termo_consentimento: cidConsentimento
                ? `Autorizado pelo paciente às ${cidConsentimentoHora}`
                : undefined,
            } as ConteudoAtestadoAssistencial)
          : ({
              data_admissao: dataAdmissaoAlta,
              data_alta: dataAlta,
              leito_setor: leitoSetorAlta,
              motivo_internacao: motivoInternacaoAlta,
              diagnostico_admissao: diagAdmissaoAlta,
              cid10_admissao: cidAdmissaoAlta,
              procedimentos_cirurgias_realizados: procedimentosAlta,
              resumo_evolucao_clinica: resumoEvolucaoAlta,
              diagnostico_alta: diagnosticoAlta,
              cid10_alta: cidAlta,
              conduta_medicacao_alta: condutaMedicacaoAlta,
              recomendacoes_cuidados: recomendacoesAlta,
              retorno_ambulatorial: retornoAmbulatorialAlta,
              condicao_alta: condicaoAlta,
            } as ConteudoResumoAltaAssistencial),
  }

  // Validação e Gravação do Impresso com Auditoria
  const handleGravarEEmitir = async (imprimirDireto: boolean = false) => {
    if (!paciente) {
      toast({
        title: 'Paciente não selecionado',
        description: 'É necessário selecionar um paciente.',
        variant: 'destructive',
      })
      return
    }

    if (!profissionalNome.trim()) {
      toast({
        title: 'Profissional obrigatório',
        description: 'Informe o profissional emissor e seu número de registro.',
        variant: 'destructive',
      })
      return
    }

    // Validações por tipo
    if (tipo === 'receita') {
      const itensValidos = itensReceita.filter((it) => it.medicamento_nome.trim() !== '')
      if (itensValidos.length === 0) {
        toast({
          title: 'Receita sem medicamentos',
          description: 'Adicione ao menos um medicamento com dose e posologia.',
          variant: 'destructive',
        })
        return
      }
    } else if (tipo === 'atestado') {
      if (!textoAtestado.trim()) {
        toast({
          title: 'Texto do atestado vazio',
          description: 'O texto do atestado deve ser preenchido.',
          variant: 'destructive',
        })
        return
      }
      if (cid10Codigo && !cidConsentimento) {
        toast({
          title: 'CID requer consentimento',
          description:
            'O código de CID só pode ser incluído com o consentimento explícito registrado.',
          variant: 'destructive',
        })
        return
      }
    } else if (tipo === 'resumo_alta') {
      if (!diagnosticoAlta.trim() || !resumoEvolucaoAlta.trim()) {
        toast({
          title: 'Campos clínicos obrigatórios',
          description: 'Preencha o diagnóstico final e o resumo da evolução clínica da internação.',
          variant: 'destructive',
        })
        return
      }
    }

    try {
      setSalvando(true)

      let conteudoFormatado: any
      if (tipo === 'receita') {
        conteudoFormatado = {
          itens: itensReceita.filter((it) => it.medicamento_nome.trim() !== ''),
          observacoes_gerais: observacoesGeraisReceita,
          uso_continuo: usoContinuo,
        }
      } else if (tipo === 'atestado') {
        conteudoFormatado = {
          tipo_atestado: tipoAtestado,
          periodo_dias: periodoDias,
          periodo_horas: periodoHoras,
          data_inicio: dataInicio,
          data_fim: dataFim,
          texto_atestado: textoAtestado,
          cid_consentimento_declarado: cidConsentimento,
          cid_termo_consentimento: cidConsentimento
            ? `Autorizado expressamente pelo paciente às ${cidConsentimentoHora}`
            : undefined,
        }
      } else {
        conteudoFormatado = {
          data_admissao: dataAdmissaoAlta,
          data_alta: dataAlta,
          leito_setor: leitoSetorAlta,
          motivo_internacao: motivoInternacaoAlta,
          diagnostico_admissao: diagAdmissaoAlta,
          cid10_admissao: cidAdmissaoAlta,
          procedimentos_cirurgias_realizados: procedimentosAlta,
          resumo_evolucao_clinica: resumoEvolucaoAlta,
          diagnostico_alta: diagnosticoAlta,
          cid10_alta: cidAlta,
          conduta_medicacao_alta: condutaMedicacaoAlta,
          recomendacoes_cuidados: recomendacoesAlta,
          retorno_ambulatorial: retornoAmbulatorialAlta,
          condicao_alta: condicaoAlta,
        }
      }

      const impresso = await emitirImpressoAssistencial({
        tipo,
        pacienteId: paciente.id,
        profissionalId: profissionalSelecionadoId || undefined,
        profissionalNome,
        profissionalProfissao,
        profissionalRegistro,
        unidadeNome,
        municipioUf,
        origem,
        atendimentoPaId,
        internacaoId,
        cidConsentimentoRegistrado: cidConsentimento,
        cidConsentimentoDataHora: cidConsentimentoHora,
        cid10Codigo:
          cidConsentimento || tipo === 'resumo_alta' ? cid10Codigo || cidAlta : undefined,
        cid10Descricao: cidConsentimento ? cid10Descricao : undefined,
        conteudo: conteudoFormatado,
        observacoesGerais: tipo === 'receita' ? observacoesGeraisReceita : undefined,
      })

      setImpressoSalvo(impresso)
      if (onImpressoEmitido) {
        onImpressoEmitido(impresso)
      }

      toast({
        title: 'Impresso emitido com sucesso',
        description: `Documento #${impresso.id.slice(0, 8)} gravado no prontuário do paciente e registrado na auditoria.`,
      })

      setModoVisualizacao('preview')

      if (imprimirDireto) {
        setTimeout(() => {
          window.print()
        }, 500)
      }
    } catch (err: any) {
      console.error('Erro ao emitir impresso assistencial:', err)
      toast({
        title: 'Erro ao emitir impresso',
        description: err?.message || 'Falha ao gravar documento no sistema.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const executarImpressaoNativa = () => {
    window.print()
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white text-slate-900">
        {/* Cabeçalho do Modal */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 shrink-0 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  Emissão de Impressos Assistenciais
                  <Badge
                    variant="outline"
                    className="border-purple-300 text-purple-800 bg-purple-50"
                  >
                    A4 Padrão SUS
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Paciente:{' '}
                  <strong className="text-slate-800 uppercase">{paciente?.nome || '—'}</strong> •
                  CNS: {paciente?.cartao_sus || '—'}
                </p>
              </div>
            </div>

            {/* Alternância Formulário / Pré-visualização */}
            <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-lg">
              <Button
                size="sm"
                variant={modoVisualizacao === 'formulario' ? 'default' : 'ghost'}
                className="h-8 text-xs font-medium"
                onClick={() => setModoVisualizacao('formulario')}
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                Edição Clínica
              </Button>
              <Button
                size="sm"
                variant={modoVisualizacao === 'preview' ? 'default' : 'ghost'}
                className="h-8 text-xs font-medium"
                onClick={() => setModoVisualizacao('preview')}
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                Pré-visualização A4
              </Button>
            </div>
          </div>

          {/* Abas de Tipos (quando em edição) */}
          {modoVisualizacao === 'formulario' && (
            <Tabs
              value={tipo}
              onValueChange={(v) => setTipo(v as TipoImpressoAssistencial)}
              className="mt-3"
            >
              <TabsList className="grid grid-cols-3 bg-slate-200">
                <TabsTrigger value="receita" className="text-xs font-semibold">
                  Receita Médica
                </TabsTrigger>
                <TabsTrigger value="atestado" className="text-xs font-semibold">
                  Atestado Médico (Trava CID)
                </TabsTrigger>
                <TabsTrigger value="resumo_alta" className="text-xs font-semibold">
                  Resumo de Alta Hospitalar
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </DialogHeader>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60">
          {modoVisualizacao === 'preview' ? (
            /* VISUALIZAÇÃO A4 LEGÍVEL */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 print:hidden">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>
                    Layout A4 legível pronto para impressão. O cabeçalho inclui unidade, paciente e
                    identificação do profissional sem assinatura digital simulada.
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={executarImpressaoNativa}
                  className="bg-blue-700 hover:bg-blue-800 text-white shrink-0"
                >
                  <Printer className="w-4 h-4 mr-1.5" />
                  Imprimir A4 (Ctrl+P)
                </Button>
              </div>

              {/* Folha A4 formatada */}
              <FolhaImpressoA4
                impresso={impressoSalvo || objetoImpressoPreview}
                paciente={paciente}
              />
            </div>
          ) : (
            /* FORMULÁRIO DE EDIÇÃO CLÍNICA */
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Identificação da Unidade e Profissional */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Identificação do Profissional Emissor & Unidade
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <Label className="text-xs">Profissional no Sistema</Label>
                    <select
                      value={profissionalSelecionadoId}
                      onChange={(e) => selecionarProfissional(e.target.value)}
                      className="w-full mt-1 h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs focus:ring-1 focus:ring-purple-600"
                    >
                      <option value="">-- Selecione ou digite abaixo --</option>
                      {profissionaisList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} (
                          {p.profissao || p.especialidade || p.categoria?.toUpperCase() || 'Médico'}{' '}
                          •{' '}
                          {p.registro_conselho ||
                            (p.conselho_regional && p.conselho_numero
                              ? `${p.conselho_regional} ${p.conselho_numero}`
                              : 'CRM/RO')}
                          )
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs">Nome Completo do Profissional</Label>
                    <Input
                      value={profissionalNome}
                      onChange={(e) => setProfissionalNome(e.target.value)}
                      placeholder="Dr(a). Nome do Médico"
                      className="mt-1 h-9 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Profissão / Especialidade</Label>
                    <Input
                      value={profissionalProfissao}
                      onChange={(e) => setProfissionalProfissao(e.target.value)}
                      placeholder="Médico Clínico Geral"
                      className="mt-1 h-9 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Registro no Conselho (CRM / COREN)</Label>
                    <Input
                      value={profissionalRegistro}
                      onChange={(e) => setProfissionalRegistro(e.target.value)}
                      placeholder="CRM/RO 12345"
                      className="mt-1 h-9 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Unidade: <strong>{unidadeNome}</strong> ({municipioUf})
                  </span>
                  <span className="italic">Sem assinatura digital simulada (impressão física)</span>
                </div>
              </div>

              {/* ABA 1: FORMULÁRIO DE RECEITA MÉDICA */}
              {tipo === 'receita' && (
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Itens da Receita Médica</h3>
                      <p className="text-xs text-slate-500">
                        Preencha dose, via, posologia e duração para cada medicamento.
                      </p>
                    </div>

                    {/* Aproveitar prescrição do atendimento se houver */}
                    {prescricoesExistentes.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">
                          Prescrições do PA/Internação:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {prescricoesExistentes.map((presc) => (
                            <Button
                              key={presc.id}
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => importarPrescricaoExistente(presc)}
                              className="h-7 text-[11px] border-purple-200 text-purple-700 hover:bg-purple-50"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copiar Prescrição #{presc.id.slice(0, 5)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lista de medicamentos digitados/revisados pelo profissional */}
                  <div className="space-y-3">
                    {itensReceita.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 relative"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-900">Item {idx + 1}</span>
                          {itensReceita.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removerItemReceita(idx)}
                              className="text-xs text-red-600 hover:text-red-800 p-1 rounded"
                              title="Remover medicamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div className="sm:col-span-2">
                            <Label className="text-[11px]">Nome do Medicamento / Fármaco *</Label>
                            <Input
                              value={item.medicamento_nome}
                              onChange={(e) =>
                                atualizarItemReceita(idx, 'medicamento_nome', e.target.value)
                              }
                              placeholder="Ex.: Amoxicilina + Clavulanato, Dipirona, Losartana"
                              className="h-8 text-xs mt-0.5"
                            />
                          </div>

                          <div>
                            <Label className="text-[11px]">Apresentação</Label>
                            <Input
                              value={item.apresentacao}
                              onChange={(e) =>
                                atualizarItemReceita(idx, 'apresentacao', e.target.value)
                              }
                              placeholder="Ex.: Comprimido 500mg, Frasco 100ml"
                              className="h-8 text-xs mt-0.5"
                            />
                          </div>

                          <div>
                            <Label className="text-[11px]">Dose / Quantidade *</Label>
                            <Input
                              value={item.dose}
                              onChange={(e) => atualizarItemReceita(idx, 'dose', e.target.value)}
                              placeholder="Ex.: 1 comprimido, 10ml, 500mg"
                              className="h-8 text-xs mt-0.5"
                            />
                          </div>

                          <div>
                            <Label className="text-[11px]">Via de Administração</Label>
                            <select
                              value={item.via_administracao}
                              onChange={(e) =>
                                atualizarItemReceita(idx, 'via_administracao', e.target.value)
                              }
                              className="w-full h-8 mt-0.5 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                            >
                              {VIAS_ADMINISTRACAO.map((v) => (
                                <option key={v} value={v}>
                                  {v.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <Label className="text-[11px]">Frequência / Posologia *</Label>
                            <Input
                              value={item.frequencia_posologia}
                              onChange={(e) =>
                                atualizarItemReceita(idx, 'frequencia_posologia', e.target.value)
                              }
                              placeholder="Ex.: De 8 em 8 horas após as refeições"
                              className="h-8 text-xs mt-0.5"
                            />
                          </div>

                          <div>
                            <Label className="text-[11px]">Duração do Tratamento</Label>
                            <Input
                              value={item.duracao_quantidade}
                              onChange={(e) =>
                                atualizarItemReceita(idx, 'duracao_quantidade', e.target.value)
                              }
                              placeholder="Ex.: Por 7 dias, ou 1 caixa"
                              className="h-8 text-xs mt-0.5"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <Label className="text-[11px]">
                              Orientações Específicas ao Paciente
                            </Label>
                            <Input
                              value={item.orientacoes}
                              onChange={(e) =>
                                atualizarItemReceita(idx, 'orientacoes', e.target.value)
                              }
                              placeholder="Ex.: Ingerir com bastante líquido; não interromper"
                              className="h-8 text-xs mt-0.5"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={adicionarItemReceita}
                      className="w-full border-dashed border-slate-300 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Adicionar Outro Medicamento
                    </Button>
                  </div>

                  {/* Informações Complementares da Receita */}
                  <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="checkUsoContinuo"
                        checked={usoContinuo}
                        onChange={(e) => setUsoContinuo(e.target.checked)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <Label
                        htmlFor="checkUsoContinuo"
                        className="text-xs font-semibold cursor-pointer"
                      >
                        Medicamento de Uso Contínuo (imprime indicação de validade estendida)
                      </Label>
                    </div>

                    <div>
                      <Label className="text-xs">Orientações Gerais ao Paciente (opcional)</Label>
                      <Textarea
                        value={observacoesGeraisReceita}
                        onChange={(e) => setObservacoesGeraisReceita(e.target.value)}
                        placeholder="Ex.: Em caso de febre persistente ou piora dos sintomas, retornar ao Pronto Atendimento imediatamente."
                        rows={2}
                        className="text-xs mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: FORMULÁRIO DE ATESTADO COM TRAVA DE CONSENTIMENTO DE CID */}
              {tipo === 'atestado' && (
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Dados do Atestado Médico</h3>
                    <p className="text-xs text-slate-500">
                      Defina o tipo, período e os termos do atestado. O CID exige consentimento
                      explícito.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <Label className="text-xs">Finalidade do Atestado</Label>
                      <select
                        value={tipoAtestado}
                        onChange={(e) => setTipoAtestado(e.target.value as any)}
                        className="w-full mt-1 h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs"
                      >
                        <option value="afastamento_laboral">Afastamento Laboral / Repouso</option>
                        <option value="comparecimento">Declaração de Comparecimento</option>
                        <option value="acompanhante">Declaração de Acompanhante</option>
                        <option value="aptidao_fisica">Aptidão Física / Avaliação</option>
                      </select>
                    </div>

                    {tipoAtestado === 'afastamento_laboral' ? (
                      <div>
                        <Label className="text-xs">Dias de Afastamento</Label>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={periodoDias}
                          onChange={(e) => setPeriodoDias(parseInt(e.target.value) || 1)}
                          className="mt-1 h-9 text-xs"
                        />
                      </div>
                    ) : (
                      <div>
                        <Label className="text-xs">Horário / Período de Atendimento</Label>
                        <Input
                          value={periodoHoras}
                          onChange={(e) => setPeriodoHoras(e.target.value)}
                          placeholder="Ex.: 08h30 às 11h45"
                          className="mt-1 h-9 text-xs"
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-xs">Data de Início</Label>
                      <Input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Texto Narrativo do Atestado *</Label>
                    <Textarea
                      value={textoAtestado}
                      onChange={(e) => setTextoAtestado(e.target.value)}
                      rows={4}
                      className="mt-1 text-xs leading-relaxed"
                    />
                  </div>

                  {/* BLOCO MANDATÓRIO: CONSENTIMENTO EXPLÍCITO PARA INCLUSÃO DE CID */}
                  <div
                    className={`p-4 rounded-xl border transition-colors ${
                      cidConsentimento
                        ? 'bg-emerald-50/80 border-emerald-300'
                        : 'bg-amber-50/70 border-amber-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          cidConsentimento
                            ? 'bg-emerald-200 text-emerald-800'
                            : 'bg-amber-200 text-amber-800'
                        }`}
                      >
                        {cidConsentimento ? (
                          <Unlock className="w-4 h-4" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-2 flex-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-xs font-bold text-slate-900">
                            Diagnóstico CID-10 no Atestado (Resolução CFM nº 1.658/2002 e
                            1.851/2008)
                          </strong>
                          <Badge
                            variant={cidConsentimento ? 'default' : 'secondary'}
                            className={`text-[10px] ${
                              cidConsentimento
                                ? 'bg-emerald-700 text-white'
                                : 'bg-amber-200 text-amber-900'
                            }`}
                          >
                            {cidConsentimento
                              ? 'CONSENTIMENTO REGISTRADO'
                              : 'CID BLOQUEADO POR PADRÃO'}
                          </Badge>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          O diagnóstico e respectivo código da CID só podem constar no atestado
                          mediante <strong>expressa autorização do paciente</strong> ou de seu
                          representante legal, respeitando o sigilo médico profissional.
                        </p>

                        <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="checkConsentimentoCid"
                            checked={cidConsentimento}
                            onChange={(e) => alternarConsentimentoCid(e.target.checked)}
                            className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 w-4 h-4"
                          />
                          <Label
                            htmlFor="checkConsentimentoCid"
                            className="text-xs font-bold text-slate-900 cursor-pointer"
                          >
                            Registrar consentimento explícito do paciente para inclusão do CID neste
                            documento
                          </Label>
                        </div>

                        {/* Campos de CID só aparecem se consentimento for registrado */}
                        {cidConsentimento ? (
                          <div className="mt-3 pt-3 border-t border-emerald-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <Label className="text-[11px] font-semibold text-emerald-950">
                                Código CID-10 *
                              </Label>
                              <Input
                                value={cid10Codigo}
                                onChange={(e) => setCid10Codigo(e.target.value.toUpperCase())}
                                placeholder="Ex.: J06.9, R50.9, K52.9"
                                className="h-8 text-xs mt-0.5 font-mono uppercase bg-white border-emerald-300"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label className="text-[11px] font-semibold text-emerald-950">
                                Descrição do Diagnóstico (opcional)
                              </Label>
                              <Input
                                value={cid10Descricao}
                                onChange={(e) => setCid10Descricao(e.target.value)}
                                placeholder="Ex.: Infecção aguda das vias aéreas superiores, não especificada"
                                className="h-8 text-xs mt-0.5 bg-white border-emerald-300"
                              />
                            </div>
                            <div className="sm:col-span-3 text-[10px] text-emerald-800">
                              Registro gravado: Consentimento autorizado às {cidConsentimentoHora}{' '}
                              (auditado no banco).
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-800 italic pt-1">
                            O atestado será emitido sem nenhuma referência ao CID, em total
                            conformidade com a legislação médica.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 3: FORMULÁRIO DE RESUMO DE ALTA HOSPITALAR */}
              {tipo === 'resumo_alta' && (
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Resumo de Alta Hospitalar (Sumário Clínico)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Dados objetivos da internação com preenchimento clínico obrigatório pelo
                      profissional.
                    </p>
                  </div>

                  {/* Dados objetivos pré-preenchidos */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-600 block">
                      Dados Objetivos do Histórico de Internação
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <Label className="text-[10px]">Data de Entrada</Label>
                        <Input
                          value={dataAdmissaoAlta}
                          onChange={(e) => setDataAdmissaoAlta(e.target.value)}
                          className="h-7 text-xs mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Data da Alta *</Label>
                        <Input
                          type="date"
                          value={dataAlta}
                          onChange={(e) => setDataAlta(e.target.value)}
                          className="h-7 text-xs mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Setor / Leito</Label>
                        <Input
                          value={leitoSetorAlta}
                          onChange={(e) => setLeitoSetorAlta(e.target.value)}
                          className="h-7 text-xs mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Condição na Alta</Label>
                        <select
                          value={condicaoAlta}
                          onChange={(e) => setCondicaoAlta(e.target.value as any)}
                          className="w-full h-7 mt-0.5 rounded border border-slate-300 bg-white px-2 text-xs"
                        >
                          <option value="melhorado">Melhorado(a)</option>
                          <option value="curado">Curado(a)</option>
                          <option value="inalterado">Inalterado</option>
                          <option value="a_pedido">Alta a Pedido</option>
                          <option value="transferido">Transferido</option>
                          <option value="obito">Óbito</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <Label className="text-[10px]">Diagnóstico de Entrada</Label>
                        <Input
                          value={diagAdmissaoAlta}
                          onChange={(e) => setDiagAdmissaoAlta(e.target.value)}
                          placeholder="Hipótese ou diagnóstico de admissão"
                          className="h-7 text-xs mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">CID Entrada</Label>
                        <Input
                          value={cidAdmissaoAlta}
                          onChange={(e) => setCidAdmissaoAlta(e.target.value)}
                          placeholder="Ex.: J18.9"
                          className="h-7 text-xs mt-0.5 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-[10px]">Procedimentos e Cirurgias Realizadas</Label>
                      <Input
                        value={procedimentosAlta}
                        onChange={(e) => setProcedimentosAlta(e.target.value)}
                        placeholder="Ex.: Apendicectomia videolaparoscópica, suturas, drenagens"
                        className="h-7 text-xs mt-0.5"
                      />
                    </div>
                  </div>

                  {/* Campos clínicos digitados pelo profissional */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <Label className="text-xs font-semibold text-slate-800">
                        Resumo da Evolução Clínica durante a Internação *
                      </Label>
                      <Textarea
                        value={resumoEvolucaoAlta}
                        onChange={(e) => setResumoEvolucaoAlta(e.target.value)}
                        rows={3}
                        placeholder="Descreva a evolução do quadro clínico, resposta terapêutica, exames relevantes e justificativa da alta..."
                        className="mt-1 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <Label className="text-xs font-semibold text-slate-800">
                          Diagnóstico Principal de Alta *
                        </Label>
                        <Input
                          value={diagnosticoAlta}
                          onChange={(e) => setDiagnosticoAlta(e.target.value)}
                          placeholder="Ex.: Pneumonia bacteriana comunitária resolvida"
                          className="h-8 text-xs mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-800">
                          CID-10 de Alta
                        </Label>
                        <Input
                          value={cidAlta}
                          onChange={(e) => setCidAlta(e.target.value.toUpperCase())}
                          placeholder="Ex.: J15.9"
                          className="h-8 text-xs mt-0.5 font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-slate-800">
                        Conduta Pós-Alta & Prescrição Domiciliar *
                      </Label>
                      <Textarea
                        value={condutaMedicacaoAlta}
                        onChange={(e) => setCondutaMedicacaoAlta(e.target.value)}
                        rows={3}
                        placeholder="Medicamentos que o paciente deve continuar tomando em casa, dosagens, horários e duração..."
                        className="mt-1 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Recomendações e Cuidados Gerais</Label>
                        <Textarea
                          value={recomendacoesAlta}
                          onChange={(e) => setRecomendacoesAlta(e.target.value)}
                          rows={2}
                          placeholder="Ex.: Dieta branda, repouso relativo, curativo diário..."
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Retorno Ambulatorial / Encaminhamento</Label>
                        <Textarea
                          value={retornoAmbulatorialAlta}
                          onChange={(e) => setRetornoAmbulatorialAlta(e.target.value)}
                          rows={2}
                          placeholder="Ex.: Retorno em 7 dias para retirada de pontos ou agendamento na UBS..."
                          className="mt-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <DialogFooter className="p-4 sm:p-5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
          <div className="text-xs text-slate-500">
            {impressoSalvo ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Documento gravado no prontuário #{impressoSalvo.id.slice(0, 8)}
              </span>
            ) : (
              <span>Auditoria e gravação imediata na emissão</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={salvando}>
              Fechar
            </Button>

            {modoVisualizacao === 'formulario' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModoVisualizacao('preview')}
                  className="text-slate-700"
                >
                  <Eye className="w-4 h-4 mr-1.5" />
                  Ver Prévia A4
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleGravarEEmitir(false)}
                  disabled={salvando}
                  className="bg-purple-700 hover:bg-purple-800 text-white"
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  {salvando ? 'Gravando...' : 'Gravar no Prontuário'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleGravarEEmitir(true)}
                  disabled={salvando}
                  className="bg-slate-900 hover:bg-black text-white"
                >
                  <Printer className="w-4 h-4 mr-1.5" />
                  {salvando ? 'Processando...' : 'Emitir & Imprimir A4'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModoVisualizacao('formulario')}
                >
                  <Edit3 className="w-4 h-4 mr-1.5" />
                  Voltar à Edição
                </Button>
                <Button
                  size="sm"
                  onClick={executarImpressaoNativa}
                  className="bg-slate-900 hover:bg-black text-white"
                >
                  <Printer className="w-4 h-4 mr-1.5" />
                  Imprimir Documento A4
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
