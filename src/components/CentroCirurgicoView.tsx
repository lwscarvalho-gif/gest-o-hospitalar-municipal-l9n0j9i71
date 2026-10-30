import React, { useState, useEffect } from 'react'
import {
  SalaCirurgica,
  Cirurgia,
  ChecklistPreOperatorio,
  AtoOperatorio,
  RecuperacaoPosAnestesica,
  Paciente,
  Profissional,
  StatusSalaCirurgica,
  TipoAnestesia,
  DestinoSRPA,
  RiscoASA,
  TipoPacienteCirurgia,
} from '@/types/hospital'
import {
  listarSalasCirurgicas,
  atualizarStatusSalaCirurgica,
  listarCirurgias,
  agendarCirurgia,
  reagendarCirurgia,
  cancelarCirurgia,
  iniciarCirurgiaEmSala,
  encaminharParaSRPA,
  obterChecklistPorCirurgia,
  salvarChecklistPreOperatorio,
  obterAtoOperatorioPorCirurgia,
  registrarAtoOperatorio,
  obterRecuperacaoPorCirurgia,
  registrarRecuperacaoPosAnestesica,
} from '@/services/centroCirurgico'
import { listarPacientes, listarProfissionais } from '@/services/cadastros'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Scissors,
  Calendar,
  CheckSquare,
  Activity,
  HeartPulse,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Wrench,
  XCircle,
  PlayCircle,
  ArrowRightCircle,
  ShieldCheck,
  UserCheck,
  FileText,
  AlertOctagon,
  Settings2,
} from 'lucide-react'

export const CentroCirurgicoView: React.FC = () => {
  const { user, temPermissao } = useAuth()
  const { toast } = useToast()

  // Permissões
  const podeGerenciarAgendaESalas = temPermissao(['admin', 'gestor'])
  const podeRegistrarAtosEChecklist = temPermissao(['admin', 'gestor', 'profissional'])

  // Abas do Módulo Centro Cirúrgico
  const [subAbaAtiva, setSubAbaAtiva] = useState<
    'mapa_salas' | 'agenda' | 'checklist' | 'ato_operatorio' | 'srpa'
  >('mapa_salas')

  // Dados principais
  const [salas, setSalas] = useState<SalaCirurgica[]>([])
  const [cirurgias, setCirurgias] = useState<Cirurgia[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(false)

  // Cirurgia atualmente em foco (para checklist, ato operatório ou SRPA)
  const [cirurgiaFocoId, setCirurgiaFocoId] = useState<string>('')
  const cirurgiaFoco = cirurgias.find((c) => c.id === cirurgiaFocoId) || null

  // Modais e formulários
  const [modalNovoAgendamento, setModalNovoAgendamento] = useState(false)
  const [modalReagendamento, setModalReagendamento] = useState(false)
  const [modalCancelar, setModalCancelar] = useState(false)
  const [modalStatusSala, setModalStatusSala] = useState<SalaCirurgica | null>(null)
  const [cirurgiaParaAcao, setCirurgiaParaAcao] = useState<Cirurgia | null>(null)

  // Estado dos formulários de ação rápida
  const [formAgendamento, setFormAgendamento] = useState({
    paciente: '',
    tipo_paciente: 'internado' as TipoPacienteCirurgia,
    sala: '',
    procedimento_codigo: '',
    procedimento_nome: '',
    data_horario_previsto: '',
    duracao_estimada_minutos: 120,
    cirurgiao_principal: '',
    anestesista: '',
    instrumentador: '',
    equipe_adicional: '',
    observacoes_agendamento: '',
  })

  const [formReagendar, setFormReagendar] = useState({
    novaDataHora: '',
    novaSalaId: '',
    motivo: '',
  })

  const [motivoCancelamento, setMotivoCancelamento] = useState('')

  // Estado do Checklist Pré-Operatório
  const [checklistAtual, setChecklistAtual] = useState<ChecklistPreOperatorio | null>(null)
  const [formChecklist, setFormChecklist] = useState({
    jejum_confirmado: false,
    jejum_horas: 8,
    exames_pre_operatorios_ok: false,
    detalhes_exames: '',
    consentimento_informado_assinado: false,
    avaliacao_risco_anestesico_concluida: false,
    risco_asa: 'ASA_I' as RiscoASA,
    demarcacao_lateralidade: false,
    alergias_checadas: false,
    reserva_sangue_hemoderivados: false,
    retirada_proteses_adornos: false,
    acesso_venoso_permeavel: false,
    liberado_centro_cirurgico: false,
    observacoes: '',
  })

  // Estado do Ato Operatório
  const [atoAtual, setAtoAtual] = useState<AtoOperatorio | null>(null)
  const [formAto, setFormAto] = useState({
    procedimento_realizado: '',
    codigo_procedimento: '',
    tecnica_cirurgica: '',
    tipo_anestesia: 'geral' as TipoAnestesia,
    data_hora_inicio: '',
    data_hora_fim: '',
    duracao_minutos: 90,
    diagnostico_pre_operatorio: '',
    diagnostico_pos_operatorio: '',
    cid10: '',
    descricao_ato: '',
    complicacoes_intercorrencias: '',
    perda_sanguinea_estimada_ml: 100,
    materiais_implantes_utilizados: '',
    envio_anatomo_patologico: false,
    equipe_participante: '',
  })

  // Estado da Recuperação Pós-Anestésica (SRPA)
  const [srpaAtual, setSrpaAtual] = useState<RecuperacaoPosAnestesica | null>(null)
  const [formSrpa, setFormSrpa] = useState({
    data_hora_admissao_srpa: '',
    data_hora_alta_srpa: '',
    escala_aldrete_kroulik: 9,
    sinais_vitais_admissao: 'PA: 120/80 mmHg, FC: 78 bpm, SpO2: 98%',
    sinais_vitais_alta: 'PA: 125/82 mmHg, FC: 75 bpm, SpO2: 99%',
    nivel_consciencia: 'Lúcido, orientado no tempo e espaço',
    dor_escala_analogica: '2 (Leve controlada com analgesia)',
    nauseas_vomitos: false,
    evolucao_pos_operatoria: '',
    destino_pos_alta: 'retorno_leito' as DestinoSRPA,
    leito_destino: '',
    orientacoes_alta: '',
  })

  // Carregar dados gerais
  const carregarDados = async () => {
    setLoading(true)
    try {
      const [listaSalas, listaCir, listaPac, listaProf] = await Promise.all([
        listarSalasCirurgicas(),
        listarCirurgias(),
        listarPacientes(),
        listarProfissionais(),
      ])
      setSalas(listaSalas)
      setCirurgias(listaCir)
      setPacientes(listaPac)
      setProfissionais(listaProf)

      if (listaCir.length > 0 && !cirurgiaFocoId) {
        setCirurgiaFocoId(listaCir[0].id)
      }
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao carregar dados do Centro Cirúrgico',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Atualizar dados de Checklist quando mudar cirurgia em foco
  useEffect(() => {
    if (!cirurgiaFocoId) return

    async function carregarDetalhesCirurgia() {
      const [chk, ato, rec] = await Promise.all([
        obterChecklistPorCirurgia(cirurgiaFocoId),
        obterAtoOperatorioPorCirurgia(cirurgiaFocoId),
        obterRecuperacaoPorCirurgia(cirurgiaFocoId),
      ])

      setChecklistAtual(chk)
      if (chk) {
        setFormChecklist({
          jejum_confirmado: !!chk.jejum_confirmado,
          jejum_horas: chk.jejum_horas || 8,
          exames_pre_operatorios_ok: !!chk.exames_pre_operatorios_ok,
          detalhes_exames: chk.detalhes_exames || '',
          consentimento_informado_assinado: !!chk.consentimento_informado_assinado,
          avaliacao_risco_anestesico_concluida: !!chk.avaliacao_risco_anestesico_concluida,
          risco_asa: chk.risco_asa || 'ASA_I',
          demarcacao_lateralidade: !!chk.demarcacao_lateralidade,
          alergias_checadas: !!chk.alergias_checadas,
          reserva_sangue_hemoderivados: !!chk.reserva_sangue_hemoderivados,
          retirada_proteses_adornos: !!chk.retirada_proteses_adornos,
          acesso_venoso_permeavel: !!chk.acesso_venoso_permeavel,
          liberado_centro_cirurgico: !!chk.liberado_centro_cirurgico,
          observacoes: chk.observacoes || '',
        })
      } else {
        setFormChecklist({
          jejum_confirmado: false,
          jejum_horas: 8,
          exames_pre_operatorios_ok: false,
          detalhes_exames: '',
          consentimento_informado_assinado: false,
          avaliacao_risco_anestesico_concluida: false,
          risco_asa: 'ASA_I',
          demarcacao_lateralidade: false,
          alergias_checadas: false,
          reserva_sangue_hemoderivados: false,
          retirada_proteses_adornos: false,
          acesso_venoso_permeavel: false,
          liberado_centro_cirurgico: false,
          observacoes: '',
        })
      }

      setAtoAtual(ato)
      if (ato) {
        setFormAto({
          procedimento_realizado: ato.procedimento_realizado,
          codigo_procedimento: ato.codigo_procedimento || '',
          tecnica_cirurgica: ato.tecnica_cirurgica,
          tipo_anestesia: ato.tipo_anestesia,
          data_hora_inicio: ato.data_hora_inicio,
          data_hora_fim: ato.data_hora_fim,
          duracao_minutos: ato.duracao_minutos || 90,
          diagnostico_pre_operatorio: ato.diagnostico_pre_operatorio || '',
          diagnostico_pos_operatorio: ato.diagnostico_pos_operatorio || '',
          cid10: ato.cid10 || '',
          descricao_ato: ato.descricao_ato,
          complicacoes_intercorrencias: ato.complicacoes_intercorrencias || '',
          perda_sanguinea_estimada_ml: ato.perda_sanguinea_estimada_ml || 100,
          materiais_implantes_utilizados: ato.materiais_implantes_utilizados || '',
          envio_anatomo_patologico: !!ato.envio_anatomo_patologico,
          equipe_participante: ato.equipe_participante || '',
        })
      } else if (cirurgiaFoco) {
        setFormAto({
          procedimento_realizado: cirurgiaFoco.procedimento_nome,
          codigo_procedimento: cirurgiaFoco.procedimento_codigo || '',
          tecnica_cirurgica: 'Videolaparoscopia / Convencional',
          tipo_anestesia: 'geral',
          data_hora_inicio:
            cirurgiaFoco.data_hora_inicio ||
            new Date().toISOString().slice(0, 16).replace('T', ' '),
          data_hora_fim: new Date().toISOString().slice(0, 16).replace('T', ' '),
          duracao_minutos: cirurgiaFoco.duracao_estimada_minutos || 90,
          diagnostico_pre_operatorio: '',
          diagnostico_pos_operatorio: '',
          cid10: '',
          descricao_ato: '',
          complicacoes_intercorrencias: 'Sem intercorrências anestésico-cirúrgicas.',
          perda_sanguinea_estimada_ml: 50,
          materiais_implantes_utilizados:
            'Fios absorvíveis, drenos de aspiração, compressas contadas.',
          envio_anatomo_patologico: false,
          equipe_participante: `${cirurgiaFoco.cirurgiao_principal_nome}${cirurgiaFoco.anestesista_nome ? `, ${cirurgiaFoco.anestesista_nome}` : ''}`,
        })
      }

      setSrpaAtual(rec)
      if (rec) {
        setFormSrpa({
          data_hora_admissao_srpa: rec.data_hora_admissao_srpa,
          data_hora_alta_srpa: rec.data_hora_alta_srpa || '',
          escala_aldrete_kroulik: rec.escala_aldrete_kroulik || 9,
          sinais_vitais_admissao: rec.sinais_vitais_admissao || '',
          sinais_vitais_alta: rec.sinais_vitais_alta || '',
          nivel_consciencia: rec.nivel_consciencia || '',
          dor_escala_analogica: rec.dor_escala_analogica || '',
          nauseas_vomitos: !!rec.nauseas_vomitos,
          evolucao_pos_operatoria: rec.evolucao_pos_operatoria,
          destino_pos_alta: rec.destino_pos_alta,
          leito_destino: rec.leito_destino || '',
          orientacoes_alta: rec.orientacoes_alta || '',
        })
      } else {
        const agora = new Date().toISOString().slice(0, 16).replace('T', ' ')
        setFormSrpa({
          data_hora_admissao_srpa: agora,
          data_hora_alta_srpa: '',
          escala_aldrete_kroulik: 9,
          sinais_vitais_admissao: 'PA: 120/80 mmHg, FC: 78 bpm, SpO2: 98%',
          sinais_vitais_alta: '',
          nivel_consciencia: 'Consciente, contactando bem',
          dor_escala_analogica: '2 (Leve)',
          nauseas_vomitos: false,
          evolucao_pos_operatoria:
            'Paciente admitido em recuperação pós-anestésica, hemodinamicamente estável, afebril, curativo oclusivo limpo e seco.',
          destino_pos_alta: 'retorno_leito',
          leito_destino: 'Enfermaria Cirúrgica - Leito 02',
          orientacoes_alta: 'Dieta leve após 4h, hidratação venosa e analgesia prescrita.',
        })
      }
    }

    carregarDetalhesCirurgia()
  }, [cirurgiaFocoId, cirurgias])

  // AÇÕES: Agendar Cirurgia
  const handleSalvarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !formAgendamento.paciente ||
      !formAgendamento.procedimento_nome ||
      !formAgendamento.sala ||
      !formAgendamento.cirurgiao_principal ||
      !formAgendamento.data_horario_previsto
    ) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione paciente, procedimento, sala, cirurgião e data/horário.',
        variant: 'destructive',
      })
      return
    }

    try {
      const cirurgiaoObj = profissionais.find((p) => p.id === formAgendamento.cirurgiao_principal)
      const anestObj = profissionais.find((p) => p.id === formAgendamento.anestesista)
      const instObj = profissionais.find((p) => p.id === formAgendamento.instrumentador)

      await agendarCirurgia({
        paciente: formAgendamento.paciente,
        tipo_paciente: formAgendamento.tipo_paciente,
        sala: formAgendamento.sala,
        procedimento_codigo: formAgendamento.procedimento_codigo,
        procedimento_nome: formAgendamento.procedimento_nome,
        data_horario_previsto: formAgendamento.data_horario_previsto,
        duracao_estimada_minutos: Number(formAgendamento.duracao_estimada_minutos) || 120,
        cirurgiao_principal: formAgendamento.cirurgiao_principal,
        cirurgiao_principal_nome: cirurgiaoObj?.nome || 'Cirurgião Responsável',
        anestesista: formAgendamento.anestesista || undefined,
        anestesista_nome: anestObj?.nome || undefined,
        instrumentador: formAgendamento.instrumentador || undefined,
        instrumentador_nome: instObj?.nome || undefined,
        equipe_adicional: formAgendamento.equipe_adicional,
        observacoes_agendamento: formAgendamento.observacoes_agendamento,
      })

      toast({
        title: 'Cirurgia agendada com sucesso',
        description: 'Procedimento registrado na grade do Centro Cirúrgico.',
      })
      setModalNovoAgendamento(false)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao agendar cirurgia',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // AÇÕES: Reagendar Cirurgia
  const handleSalvarReagendamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cirurgiaParaAcao || !formReagendar.novaDataHora) return

    try {
      await reagendarCirurgia(
        cirurgiaParaAcao.id,
        formReagendar.novaDataHora,
        formReagendar.novaSalaId || undefined,
        formReagendar.motivo,
      )
      toast({
        title: 'Cirurgia reagendada',
        description: `Procedimento movido para ${formReagendar.novaDataHora}.`,
      })
      setModalReagendamento(false)
      setCirurgiaParaAcao(null)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao reagendar',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // AÇÕES: Cancelar Cirurgia
  const handleSalvarCancelamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cirurgiaParaAcao || !motivoCancelamento.trim()) {
      toast({
        title: 'Informe o motivo',
        description: 'O motivo do cancelamento é obrigatório para a auditoria.',
        variant: 'destructive',
      })
      return
    }

    try {
      await cancelarCirurgia(cirurgiaParaAcao.id, motivoCancelamento)
      toast({
        title: 'Cirurgia cancelada',
        description: 'Status atualizado e sala cirúrgica liberada.',
      })
      setModalCancelar(false)
      setCirurgiaParaAcao(null)
      setMotivoCancelamento('')
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao cancelar cirurgia',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // AÇÕES: Iniciar Cirurgia em Sala (Muda Sala para OCUPADA)
  const handleIniciarCirurgia = async (cirurgia: Cirurgia) => {
    try {
      await iniciarCirurgiaEmSala(cirurgia.id, cirurgia.sala)
      toast({
        title: 'Cirurgia iniciada',
        description: 'Paciente em sala cirúrgica. Sala marcada como OCUPADA.',
      })
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao iniciar cirurgia',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // AÇÕES: Encaminhar para SRPA (Muda Sala para LIMPEZA)
  const handleEncaminharSRPA = async (cirurgia: Cirurgia) => {
    try {
      await encaminharParaSRPA(cirurgia.id, cirurgia.sala)
      toast({
        title: 'Paciente encaminhado para a SRPA',
        description: 'Sala cirúrgica liberada e colocada em status de LIMPEZA.',
      })
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao encaminhar para SRPA',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // AÇÕES: Alterar Status Manual da Sala (Limpeza, Manutenção, Livre)
  const handleSalvarStatusSala = async (status: StatusSalaCirurgica, motivo?: string) => {
    if (!modalStatusSala) return
    try {
      await atualizarStatusSalaCirurgica(modalStatusSala.id, status, motivo)
      toast({
        title: 'Status da sala atualizado',
        description: `Sala "${modalStatusSala.nome}" agora está ${status.toUpperCase()}.`,
      })
      setModalStatusSala(null)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar sala',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // AÇÕES: Salvar Checklist Pré-Operatório
  const handleSalvarChecklist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cirurgiaFoco) return

    // Validação estrita: para marcar "liberado_centro_cirurgico", itens essenciais devem ser conferidos
    if (formChecklist.liberado_centro_cirurgico) {
      if (
        !formChecklist.jejum_confirmado ||
        !formChecklist.exames_pre_operatorios_ok ||
        !formChecklist.consentimento_informado_assinado ||
        !formChecklist.avaliacao_risco_anestesico_concluida
      ) {
        toast({
          title: 'Checklist Incompleto',
          description:
            'Para liberar o paciente para o centro cirúrgico é obrigatório confirmar: Jejum, Exames Pré-Operatórios, Consentimento Informado e Avaliação de Risco Anestésico.',
          variant: 'destructive',
        })
        return
      }
    }

    try {
      await salvarChecklistPreOperatorio(
        {
          cirurgia: cirurgiaFoco.id,
          paciente: cirurgiaFoco.paciente,
          data_conferencia: new Date().toISOString().slice(0, 16).replace('T', ' '),
          responsavel: user?.id,
          responsavel_nome: user?.name || 'Profissional de Saúde',
          ...formChecklist,
        },
        checklistAtual?.id,
      )

      toast({
        title: formChecklist.liberado_centro_cirurgico
          ? 'Checklist concluído: PACIENTE LIBERADO'
          : 'Checklist salvo com sucesso',
        description: formChecklist.liberado_centro_cirurgico
          ? 'Paciente apto e transferido para o fluxo cirúrgico.'
          : 'Dados pré-operatórios atualizados no prontuário.',
      })
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar checklist',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // AÇÕES: Salvar Ato Operatório
  const handleSalvarAtoOperatorio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cirurgiaFoco) return
    if (!formAto.procedimento_realizado || !formAto.tecnica_cirurgica || !formAto.descricao_ato) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o procedimento realizado, técnica e descrição do ato.',
        variant: 'destructive',
      })
      return
    }

    try {
      await registrarAtoOperatorio(
        {
          cirurgia: cirurgiaFoco.id,
          paciente: cirurgiaFoco.paciente,
          cirurgiao: user?.id,
          cirurgiao_nome: user?.name || cirurgiaFoco.cirurgiao_principal_nome,
          ...formAto,
        },
        atoAtual?.id,
      )

      toast({
        title: 'Ato Operatório Registrado',
        description: 'Descrição cirúrgica salva e integrada à linha do tempo do prontuário.',
      })
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar ato operatório',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // AÇÕES: Salvar Recuperação Pós-Anestésica (SRPA)
  const handleSalvarSRPA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cirurgiaFoco) return
    if (!formSrpa.evolucao_pos_operatoria || !formSrpa.data_hora_admissao_srpa) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe data/hora de admissão na SRPA e a evolução clínica.',
        variant: 'destructive',
      })
      return
    }

    try {
      await registrarRecuperacaoPosAnestesica(
        {
          cirurgia: cirurgiaFoco.id,
          paciente: cirurgiaFoco.paciente,
          responsavel: user?.id,
          responsavel_nome: user?.name || 'Equipe SRPA',
          ...formSrpa,
        },
        srpaAtual?.id,
      )

      toast({
        title: formSrpa.data_hora_alta_srpa
          ? 'Alta da SRPA registrada com sucesso'
          : 'Evolução na SRPA salva',
        description: formSrpa.data_hora_alta_srpa
          ? `Destino: ${formSrpa.destino_pos_alta.toUpperCase()} • Cirurgia concluída.`
          : 'Registro pós-anestésico gravado no prontuário do paciente.',
      })
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar SRPA',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Estilização das salas cirúrgicas no mapa
  const renderCorSala = (status: StatusSalaCirurgica) => {
    switch (status) {
      case 'livre':
        return {
          bg: 'bg-emerald-50 border-emerald-300',
          badge: 'bg-emerald-600 text-white',
          titulo: 'text-emerald-950',
          icone: <Sparkles className="w-5 h-5 text-emerald-600" />,
          texto: 'Livre / Disponível',
        }
      case 'ocupada':
        return {
          bg: 'bg-rose-50 border-rose-400',
          badge: 'bg-rose-600 text-white animate-pulse',
          titulo: 'text-rose-950',
          icone: <Scissors className="w-5 h-5 text-rose-600" />,
          texto: 'Ocupada em Procedimento',
        }
      case 'limpeza':
        return {
          bg: 'bg-amber-50 border-amber-300',
          badge: 'bg-amber-600 text-white',
          titulo: 'text-amber-950',
          icone: <RefreshCw className="w-5 h-5 text-amber-600 animate-spin" />,
          texto: 'Higienização / Limpeza',
        }
      case 'manutencao':
        return {
          bg: 'bg-slate-100 border-slate-300',
          badge: 'bg-slate-700 text-white',
          titulo: 'text-slate-900',
          icone: <Wrench className="w-5 h-5 text-slate-600" />,
          texto: 'Manutenção Preventiva',
        }
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. CABEÇALHO DO MÓDULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Scissors className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Centro Cirúrgico Hospitalar</h1>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                Bloco Operatório • SUS
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Agenda Cirúrgica, Mapa de Salas, Checklist Pré-Operatório OMS, Registro do Ato
              Operatório e SRPA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={loading}
            className="text-slate-600"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          {podeGerenciarAgendaESalas && (
            <Button
              size="sm"
              onClick={() => setModalNovoAgendamento(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Agendar Cirurgia
            </Button>
          )}
        </div>
      </div>

      {/* 2. BARRA DE NAVEGAÇÃO DE SUB-ABAS */}
      <div className="flex flex-wrap items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
        <button
          onClick={() => setSubAbaAtiva('mapa_salas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            subAbaAtiva === 'mapa_salas'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          Mapa das Salas Cirúrgicas ({salas.length})
        </button>

        <button
          onClick={() => setSubAbaAtiva('agenda')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            subAbaAtiva === 'agenda'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Agenda Cirúrgica ({cirurgias.length})
        </button>

        <button
          onClick={() => setSubAbaAtiva('checklist')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            subAbaAtiva === 'checklist'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Checklist Pré-Operatório
        </button>

        <button
          onClick={() => setSubAbaAtiva('ato_operatorio')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            subAbaAtiva === 'ato_operatorio'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          Registro do Ato Operatório
        </button>

        <button
          onClick={() => setSubAbaAtiva('srpa')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            subAbaAtiva === 'srpa'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          SRPA / Recuperação Pós-Anestésica
        </button>
      </div>

      {/* SELEÇÃO RÁPIDA DE CIRURGIA EM FOCO (visível quando na aba de checklist, ato ou srpa) */}
      {subAbaAtiva !== 'mapa_salas' && subAbaAtiva !== 'agenda' && (
        <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 space-y-1">
              <span className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-blue-700" />
                Selecione o Procedimento / Paciente para Registro Clínico:
              </span>
              <select
                className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg bg-white font-medium text-slate-800"
                value={cirurgiaFocoId}
                onChange={(e) => setCirurgiaFocoId(e.target.value)}
              >
                {cirurgias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.procedimento_nome} • Paciente: {c.expand?.paciente?.nome || 'N/I'} • Data:{' '}
                    {c.data_horario_previsto} • Cirurgião: {c.cirurgiao_principal_nome} [
                    {c.status.toUpperCase()}]
                  </option>
                ))}
              </select>
            </div>

            {cirurgiaFoco && (
              <div className="text-right shrink-0">
                <span className="text-[11px] text-slate-500 block">Status Atual da Cirurgia</span>
                <Badge
                  className={
                    cirurgiaFoco.status === 'em_sala'
                      ? 'bg-rose-600 text-white'
                      : cirurgiaFoco.status === 'concluida'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 text-white'
                  }
                >
                  {cirurgiaFoco.status.toUpperCase()}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          SUB-ABA 1: MAPA DAS SALAS CIRÚRGICAS (STATUS COLORIDO, CICLO E MANUTENÇÃO)
          ========================================================================= */}
      {subAbaAtiva === 'mapa_salas' && (
        <div className="space-y-6">
          {/* Legenda de Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-700">
              Legenda das Salas Cirúrgicas:
            </span>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Livre / Pronta
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span> Ocupada (Em Cirurgia)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span> Limpeza / Higienização
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-500"></span> Manutenção Preventiva
              </span>
            </div>
          </div>

          {/* Grid de Salas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {salas.map((sala) => {
              const cor = renderCorSala(sala.status)
              // Procura cirurgia atualmente em sala ou agendada
              const cirurgiaAtiva = cirurgias.find(
                (c) =>
                  c.sala === sala.id &&
                  (c.status === 'em_sala' || c.status === 'checklist_concluido'),
              )

              return (
                <Card
                  key={sala.id}
                  className={`border-2 ${cor.bg} shadow-sm transition-all hover:shadow-md flex flex-col justify-between`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {cor.icone}
                        <div>
                          <CardTitle className={`text-base font-bold ${cor.titulo}`}>
                            {sala.nome}
                          </CardTitle>
                          <span className="text-[11px] text-slate-500">
                            {sala.bloco || 'Bloco Cirúrgico Central'}
                          </span>
                        </div>
                      </div>
                      <Badge className={`text-[10px] font-bold ${cor.badge}`}>{cor.texto}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-2 pb-4 space-y-3 text-xs flex-1 flex flex-col justify-between">
                    {/* Detalhes da cirurgia em andamento (se ocupada) */}
                    {sala.status === 'ocupada' && cirurgiaAtiva ? (
                      <div className="bg-white/80 p-2.5 rounded-lg border border-rose-200 space-y-1">
                        <div className="flex items-center gap-1 text-rose-900 font-bold">
                          <Scissors className="w-3.5 h-3.5" />
                          <span>{cirurgiaAtiva.procedimento_nome}</span>
                        </div>
                        <p className="text-slate-700">
                          Paciente:{' '}
                          <strong>{cirurgiaAtiva.expand?.paciente?.nome || 'Paciente'}</strong>
                        </p>
                        <p className="text-slate-600">
                          Cirurgião: {cirurgiaAtiva.cirurgiao_principal_nome}
                        </p>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-1 border-t border-rose-100">
                          <Clock className="w-3 h-3 text-rose-500" />
                          Início:{' '}
                          {cirurgiaAtiva.data_hora_inicio || cirurgiaAtiva.data_horario_previsto}
                        </div>
                      </div>
                    ) : sala.status === 'limpeza' ? (
                      <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200 space-y-1 text-amber-900">
                        <p className="font-semibold flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 text-amber-600" /> Higienização Terminal
                        </p>
                        <p className="text-[11px] text-slate-600">
                          {sala.motivo_bloqueio ||
                            'Desinfecção de superfícies e troca de filtros de ar.'}
                        </p>
                      </div>
                    ) : sala.status === 'manutencao' ? (
                      <div className="bg-white/80 p-2.5 rounded-lg border border-slate-300 space-y-1 text-slate-800">
                        <p className="font-semibold flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-slate-600" /> Intervenção Técnica
                        </p>
                        <p className="text-[11px] text-slate-600">
                          {sala.motivo_bloqueio ||
                            'Calibração preventiva dos equipamentos cirúrgicos.'}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 text-emerald-900 space-y-1">
                        <p className="font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sala Pronta para
                          Uso
                        </p>
                        <p className="text-[11px] text-slate-600">
                          Equipamentos esterilizados e equipe de enfermagem disponível.
                        </p>
                      </div>
                    )}

                    {/* Equipamentos instalados */}
                    {sala.equipamentos && (
                      <p className="text-[11px] text-slate-500 italic">
                        <strong>Recursos:</strong> {sala.equipamentos}
                      </p>
                    )}

                    {/* Botões de Ação na Sala */}
                    {podeGerenciarAgendaESalas && (
                      <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                        {sala.status !== 'livre' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7 bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                            onClick={() => handleSalvarStatusSala('livre')}
                          >
                            Liberar Sala
                          </Button>
                        )}
                        {sala.status !== 'limpeza' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7 bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
                            onClick={() => {
                              setModalStatusSala(sala)
                            }}
                          >
                            Limpeza
                          </Button>
                        )}
                        {sala.status !== 'manutencao' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7 bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                            onClick={() => {
                              setModalStatusSala(sala)
                            }}
                          >
                            Manutenção
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-ABA 2: AGENDA CIRÚRGICA (LISTA, REAGENDAMENTO E CANCELAMENTO)
          ========================================================================= */}
      {subAbaAtiva === 'agenda' && (
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Grade de Cirurgias Agendadas
              </CardTitle>
              <p className="text-xs text-slate-500">
                Controle de procedimentos cirúrgicos internados, ambulatoriais e de urgência
              </p>
            </div>
            {podeGerenciarAgendaESalas && (
              <Button
                size="sm"
                onClick={() => setModalNovoAgendamento(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Nova Cirurgia
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {cirurgias.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                Nenhuma cirurgia agendada no momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Data & Horário</th>
                      <th className="py-3 px-4">Paciente</th>
                      <th className="py-3 px-4">Procedimento</th>
                      <th className="py-3 px-4">Sala Cirúrgica</th>
                      <th className="py-3 px-4">Equipe Médica</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações do Ciclo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cirurgias.map((cir) => {
                      const salaNome = cir.expand?.sala?.nome || 'Sala'
                      const isCancelada = cir.status === 'cancelada'
                      const isConcluida = cir.status === 'concluida'

                      return (
                        <tr
                          key={cir.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isCancelada ? 'opacity-60 bg-slate-50' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            {cir.data_horario_previsto}
                            {cir.duracao_estimada_minutos && (
                              <span className="block text-[10px] font-normal text-slate-400">
                                Prev: {cir.duracao_estimada_minutos} min
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">
                              {cir.expand?.paciente?.nome || 'Paciente'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Tipo: {cir.tipo_paciente.toUpperCase()}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-semibold text-blue-900 block">
                              {cir.procedimento_nome}
                            </span>
                            {cir.procedimento_codigo && (
                              <span className="text-[10px] font-mono text-slate-500">
                                SIGTAP: {cir.procedimento_codigo}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-medium text-slate-700">{salaNome}</td>

                          <td className="py-3 px-4 text-slate-700">
                            <div>
                              <strong>Cirurgião:</strong> {cir.cirurgiao_principal_nome}
                            </div>
                            {cir.anestesista_nome && (
                              <div className="text-[11px] text-slate-500">
                                <strong>Anestesista:</strong> {cir.anestesista_nome}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <Badge
                              className={
                                cir.status === 'agendada'
                                  ? 'bg-blue-600 text-white'
                                  : cir.status === 'checklist_concluido'
                                    ? 'bg-amber-600 text-white'
                                    : cir.status === 'em_sala'
                                      ? 'bg-rose-600 text-white animate-pulse'
                                      : cir.status === 'em_recuperacao'
                                        ? 'bg-purple-600 text-white'
                                        : cir.status === 'concluida'
                                          ? 'bg-emerald-700 text-white'
                                          : 'bg-slate-600 text-white'
                              }
                            >
                              {cir.status.toUpperCase()}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                            {/* Passos do ciclo cirúrgico */}
                            {cir.status === 'checklist_concluido' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleIniciarCirurgia(cir)}
                                className="h-7 text-xs bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
                              >
                                <PlayCircle className="w-3.5 h-3.5 mr-1" /> Entrar em Sala
                              </Button>
                            )}

                            {cir.status === 'em_sala' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEncaminharSRPA(cir)}
                                className="h-7 text-xs bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                              >
                                <ArrowRightCircle className="w-3.5 h-3.5 mr-1" /> Ir para SRPA
                              </Button>
                            )}

                            {/* Ir para checklist */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setCirurgiaFocoId(cir.id)
                                setSubAbaAtiva('checklist')
                              }}
                              className="h-7 text-xs text-blue-700 hover:bg-blue-50"
                              title="Ver/Editar Checklist"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                            </Button>

                            {/* Reagendar e Cancelar */}
                            {podeGerenciarAgendaESalas && !isCancelada && !isConcluida && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setCirurgiaParaAcao(cir)
                                    setFormReagendar({
                                      novaDataHora: cir.data_horario_previsto,
                                      novaSalaId: cir.sala,
                                      motivo: '',
                                    })
                                    setModalReagendamento(true)
                                  }}
                                  className="h-7 text-xs text-slate-700 hover:bg-slate-100"
                                  title="Reagendar Cirurgia"
                                >
                                  Reagendar
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setCirurgiaParaAcao(cir)
                                    setModalCancelar(true)
                                  }}
                                  className="h-7 text-xs text-rose-600 hover:bg-rose-50"
                                  title="Cancelar Cirurgia"
                                >
                                  Cancelar
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          SUB-ABA 3: CHECKLIST PRÉ-OPERATÓRIO OBRIGATÓRIO (SEGURANÇA CIRÚRGICA OMS)
          ========================================================================= */}
      {subAbaAtiva === 'checklist' && (
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  Checklist Pré-Operatório Obrigatório (Protocolo de Segurança do Paciente)
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Conferência estrita de segurança antes de autorizar a entrada do paciente no
                  Centro Cirúrgico
                </p>
              </div>

              {checklistAtual?.liberado_centro_cirurgico && (
                <Badge className="bg-emerald-600 text-white font-bold text-xs py-1 px-3">
                  PACIENTE LIBERADO PARA O CENTRO CIRÚRGICO
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {!cirurgiaFoco ? (
              <p className="text-xs text-slate-500">
                Selecione uma cirurgia para conferir o checklist.
              </p>
            ) : (
              <form onSubmit={handleSalvarChecklist} className="space-y-6">
                {/* Destaque das informações do paciente e cirurgia */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Paciente:</span>
                    <strong className="text-slate-900 text-sm">
                      {cirurgiaFoco.expand?.paciente?.nome}
                    </strong>
                    <span className="text-[11px] text-slate-500 block">
                      CNS: {cirurgiaFoco.expand?.paciente?.cartao_sus}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Procedimento Previsto:</span>
                    <strong className="text-blue-900 text-sm">
                      {cirurgiaFoco.procedimento_nome}
                    </strong>
                    <span className="text-[11px] text-slate-500 block">
                      Sala: {cirurgiaFoco.expand?.sala?.nome}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Cirurgião & Horário:</span>
                    <strong className="text-slate-900">
                      {cirurgiaFoco.cirurgiao_principal_nome}
                    </strong>
                    <span className="text-[11px] text-slate-500 block">
                      Data: {cirurgiaFoco.data_horario_previsto}
                    </span>
                  </div>
                </div>

                {/* Grid de Itens do Checklist */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Item 1: Jejum */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-900 text-xs">
                      <input
                        type="checkbox"
                        checked={formChecklist.jejum_confirmado}
                        onChange={(e) =>
                          setFormChecklist({ ...formChecklist, jejum_confirmado: e.target.checked })
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>1. Confirmação do Jejum Pré-Operatório</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Verificação do tempo de jejum para sólidos e líquidos claros.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-slate-600">Horas de jejum:</span>
                      <Input
                        type="number"
                        min="0"
                        max="48"
                        className="h-8 w-24 text-xs"
                        value={formChecklist.jejum_horas}
                        onChange={(e) =>
                          setFormChecklist({
                            ...formChecklist,
                            jejum_horas: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Item 2: Exames Pré-Operatórios */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-900 text-xs">
                      <input
                        type="checkbox"
                        checked={formChecklist.exames_pre_operatorios_ok}
                        onChange={(e) =>
                          setFormChecklist({
                            ...formChecklist,
                            exames_pre_operatorios_ok: e.target.checked,
                          })
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>2. Exames Laboratoriais e Radiológicos Conferidos</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Hemograma, coagulograma, ECG e exames de imagem no prontuário.
                    </p>
                    <Input
                      placeholder="Detalhes dos exames (ex: Coagulograma normal, ECG sem alterações)"
                      className="h-8 text-xs"
                      value={formChecklist.detalhes_exames}
                      onChange={(e) =>
                        setFormChecklist({ ...formChecklist, detalhes_exames: e.target.value })
                      }
                    />
                  </div>

                  {/* Item 3: Termo de Consentimento */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-900 text-xs">
                      <input
                        type="checkbox"
                        checked={formChecklist.consentimento_informado_assinado}
                        onChange={(e) =>
                          setFormChecklist({
                            ...formChecklist,
                            consentimento_informado_assinado: e.target.checked,
                          })
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>3. Termo de Consentimento Informado Assinado</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Documento assinado pelo paciente ou responsável legal devidamente anexado.
                    </p>
                  </div>

                  {/* Item 4: Avaliação de Risco Anestésico */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-900 text-xs">
                      <input
                        type="checkbox"
                        checked={formChecklist.avaliacao_risco_anestesico_concluida}
                        onChange={(e) =>
                          setFormChecklist({
                            ...formChecklist,
                            avaliacao_risco_anestesico_concluida: e.target.checked,
                          })
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>4. Avaliação Pré-Anestésica Concluída</span>
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-slate-600">Classificação ASA:</span>
                      <select
                        className="h-8 px-2.5 text-xs border border-slate-300 rounded bg-white font-medium"
                        value={formChecklist.risco_asa}
                        onChange={(e) =>
                          setFormChecklist({
                            ...formChecklist,
                            risco_asa: e.target.value as RiscoASA,
                          })
                        }
                      >
                        <option value="ASA_I">ASA I - Paciente saudável</option>
                        <option value="ASA_II">ASA II - Doença sistêmica leve</option>
                        <option value="ASA_III">ASA III - Doença sistêmica grave limitante</option>
                        <option value="ASA_IV">ASA IV - Ameaça constante à vida</option>
                        <option value="ASA_V">ASA V - Moribundo</option>
                        <option value="ASA_VI">ASA VI - Morte encefálica / Doador</option>
                      </select>
                    </div>
                  </div>

                  {/* Item 5: Demarcação de Lateralidade */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-900 text-xs">
                      <input
                        type="checkbox"
                        checked={formChecklist.demarcacao_lateralidade}
                        onChange={(e) =>
                          setFormChecklist({
                            ...formChecklist,
                            demarcacao_lateralidade: e.target.checked,
                          })
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>5. Demarcação do Sítio Cirúrgico / Lateralidade</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Marcação cirúrgica com caneta dermográfica (quando aplicável).
                    </p>
                  </div>

                  {/* Item 6: Alergias Checadas */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-900 text-xs">
                      <input
                        type="checkbox"
                        checked={formChecklist.alergias_checadas}
                        onChange={(e) =>
                          setFormChecklist({
                            ...formChecklist,
                            alergias_checadas: e.target.checked,
                          })
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>6. Pulseira de Identificação & Alergias Checadas</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Checar pulseira vermelha e histórico de reações a medicamentos/látex.
                    </p>
                  </div>

                  {/* Item 7: Reserva de Hemoderivados */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-900 text-xs">
                      <input
                        type="checkbox"
                        checked={formChecklist.reserva_sangue_hemoderivados}
                        onChange={(e) =>
                          setFormChecklist({
                            ...formChecklist,
                            reserva_sangue_hemoderivados: e.target.checked,
                          })
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>7. Reserva de Sangue / Hemoderivados</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Agência transfusional notificada / concentrado de hemácias reservado.
                    </p>
                  </div>

                  {/* Item 8: Retirada de Próteses e Acesso Venoso */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-900 text-xs">
                      <input
                        type="checkbox"
                        checked={formChecklist.retirada_proteses_adornos}
                        onChange={(e) =>
                          setFormChecklist({
                            ...formChecklist,
                            retirada_proteses_adornos: e.target.checked,
                          })
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>8. Retirada de Próteses Dentárias, Joias e Adornos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-900 text-xs pt-2">
                      <input
                        type="checkbox"
                        checked={formChecklist.acesso_venoso_permeavel}
                        onChange={(e) =>
                          setFormChecklist({
                            ...formChecklist,
                            acesso_venoso_permeavel: e.target.checked,
                          })
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Acesso Venoso Periférico Calibroso e Permeável</span>
                    </label>
                  </div>
                </div>

                {/* Observações Gerais */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Observações de Enfermagem / Bloco Cirúrgico:
                  </label>
                  <Input
                    placeholder="Anotações adicionais relevantes para a entrada em sala..."
                    className="text-xs"
                    value={formChecklist.observacoes}
                    onChange={(e) =>
                      setFormChecklist({ ...formChecklist, observacoes: e.target.value })
                    }
                  />
                </div>

                {/* BOTÃO DECISIVO: LIBERAR PARA CENTRO CIRÚRGICO */}
                <div className="bg-amber-50 p-4 rounded-xl border-2 border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-950 text-sm">
                      <input
                        type="checkbox"
                        checked={formChecklist.liberado_centro_cirurgico}
                        onChange={(e) =>
                          setFormChecklist({
                            ...formChecklist,
                            liberado_centro_cirurgico: e.target.checked,
                          })
                        }
                        className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 w-5 h-5"
                      />
                      <span>AUTORIZAR ENTRADA NO CENTRO CIRÚRGICO</span>
                    </label>
                    <p className="text-xs text-amber-800">
                      O paciente só poderá ser encaminhado à sala após este checklist ser
                      integralmente conferido.
                    </p>
                  </div>

                  {podeRegistrarAtosEChecklist && (
                    <Button
                      type="submit"
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow"
                    >
                      Salvar Checklist Pré-Operatório
                    </Button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          SUB-ABA 4: REGISTRO DO ATO OPERATÓRIO (CIRURGIÃO)
          ========================================================================= */}
      {subAbaAtiva === 'ato_operatorio' && (
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-rose-600" />
                  Registro do Ato Operatório (Descrição Cirúrgica Oficial)
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Preenchimento do tempo cirúrgico, técnica empregada, achados e ocorrências pelo
                  profissional
                </p>
              </div>

              {atoAtual && (
                <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-xs">
                  Ato Operatório Registrado
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {!cirurgiaFoco ? (
              <p className="text-xs text-slate-500">
                Selecione uma cirurgia para descrever o ato operatório.
              </p>
            ) : (
              <form onSubmit={handleSalvarAtoOperatorio} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Procedimento Realizado *
                    </label>
                    <Input
                      required
                      className="text-xs"
                      value={formAto.procedimento_realizado}
                      onChange={(e) =>
                        setFormAto({ ...formAto, procedimento_realizado: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Código SIGTAP / SUS
                    </label>
                    <Input
                      placeholder="Ex: 04.07.01.003-2"
                      className="text-xs font-mono"
                      value={formAto.codigo_procedimento}
                      onChange={(e) =>
                        setFormAto({ ...formAto, codigo_procedimento: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Técnica Cirúrgica *
                    </label>
                    <Input
                      required
                      placeholder="Ex: Laparoscopia, Laparotomia exploradora, Aberta..."
                      className="text-xs"
                      value={formAto.tecnica_cirurgica}
                      onChange={(e) =>
                        setFormAto({ ...formAto, tecnica_cirurgica: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Tipo de Anestesia *
                    </label>
                    <select
                      className="w-full h-9 px-3 text-xs border border-slate-300 rounded-md bg-white font-medium"
                      value={formAto.tipo_anestesia}
                      onChange={(e) =>
                        setFormAto({ ...formAto, tipo_anestesia: e.target.value as TipoAnestesia })
                      }
                    >
                      <option value="geral">Anestesia Geral</option>
                      <option value="raquianestesia">Raquianestesia</option>
                      <option value="peridural">Peridural</option>
                      <option value="sedacao_local">Sedação + Local</option>
                      <option value="bloqueio_regional">Bloqueio Regional</option>
                      <option value="local">Infiltração Local</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Início da Cirurgia *
                    </label>
                    <Input
                      type="datetime-local"
                      required
                      className="text-xs"
                      value={formAto.data_hora_inicio.replace(' ', 'T')}
                      onChange={(e) =>
                        setFormAto({
                          ...formAto,
                          data_hora_inicio: e.target.value.replace('T', ' '),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Término da Cirurgia *
                    </label>
                    <Input
                      type="datetime-local"
                      required
                      className="text-xs"
                      value={formAto.data_hora_fim.replace(' ', 'T')}
                      onChange={(e) =>
                        setFormAto({
                          ...formAto,
                          data_hora_fim: e.target.value.replace('T', ' '),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Duração (Minutos)
                    </label>
                    <Input
                      type="number"
                      className="text-xs"
                      value={formAto.duracao_minutos}
                      onChange={(e) =>
                        setFormAto({ ...formAto, duracao_minutos: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Diagnóstico Pré-Operatório
                    </label>
                    <Input
                      placeholder="Diagnóstico antes da intervenção"
                      className="text-xs"
                      value={formAto.diagnostico_pre_operatorio}
                      onChange={(e) =>
                        setFormAto({ ...formAto, diagnostico_pre_operatorio: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Diagnóstico Pós-Operatório
                    </label>
                    <Input
                      placeholder="Achados confirmatórios"
                      className="text-xs"
                      value={formAto.diagnostico_pos_operatorio}
                      onChange={(e) =>
                        setFormAto({ ...formAto, diagnostico_pos_operatorio: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">CID-10 Principal</label>
                    <Input
                      placeholder="Ex: K35.8, K80.2"
                      className="text-xs uppercase font-mono"
                      value={formAto.cid10}
                      onChange={(e) => setFormAto({ ...formAto, cid10: e.target.value })}
                    />
                  </div>
                </div>

                {/* Descrição Minuciosa do Ato */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Descrição Detalhada do Ato Cirúrgico *
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Descreva a assepsia, incisão cirúrgica, inventário da cavidade, tempos hemostáticos, ressecção/correção, síntese por planos e curativo..."
                    className="w-full p-3 text-xs border border-slate-300 rounded-lg bg-white font-mono focus:ring-1 focus:ring-blue-500"
                    value={formAto.descricao_ato}
                    onChange={(e) => setFormAto({ ...formAto, descricao_ato: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Complicações / Intercorrências
                    </label>
                    <Input
                      placeholder="Descreva se houve sangramento volumoso, instabilidade, etc."
                      className="text-xs"
                      value={formAto.complicacoes_intercorrencias}
                      onChange={(e) =>
                        setFormAto({ ...formAto, complicacoes_intercorrencias: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Materiais / Órteses / Próteses / Implantes
                    </label>
                    <Input
                      placeholder="Fios cirúrgicos, drenos de Blake/Portovac, telas..."
                      className="text-xs"
                      value={formAto.materiais_implantes_utilizados}
                      onChange={(e) =>
                        setFormAto({ ...formAto, materiais_implantes_utilizados: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-slate-800">
                    <input
                      type="checkbox"
                      checked={formAto.envio_anatomo_patologico}
                      onChange={(e) =>
                        setFormAto({ ...formAto, envio_anatomo_patologico: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Peça Cirúrgica encaminhada para Exame Anátomo-Patológico (Biópsia)</span>
                  </label>

                  {podeRegistrarAtosEChecklist && (
                    <Button
                      type="submit"
                      className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs"
                    >
                      Salvar Ato Operatório no Prontuário
                    </Button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          SUB-ABA 5: SRPA / RECUPERAÇÃO PÓS-ANESTÉSICA (EVOLUÇÃO E DESTINO)
          ========================================================================= */}
      {subAbaAtiva === 'srpa' && (
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-indigo-600" />
                  Sala de Recuperação Pós-Anestésica (SRPA)
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Monitorização pós-operatória imediata, Escala de Aldrete-Kroulik e definição de
                  destino
                </p>
              </div>

              {srpaAtual?.data_hora_alta_srpa && (
                <Badge className="bg-indigo-600 text-white text-xs font-bold py-1 px-3">
                  ALTA DA SRPA LIBERADA
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {!cirurgiaFoco ? (
              <p className="text-xs text-slate-500">
                Selecione uma cirurgia para registrar a recuperação.
              </p>
            ) : (
              <form onSubmit={handleSalvarSRPA} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Data/Hora de Admissão na SRPA *
                    </label>
                    <Input
                      type="datetime-local"
                      required
                      className="text-xs"
                      value={formSrpa.data_hora_admissao_srpa.replace(' ', 'T')}
                      onChange={(e) =>
                        setFormSrpa({
                          ...formSrpa,
                          data_hora_admissao_srpa: e.target.value.replace('T', ' '),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Data/Hora de Alta da SRPA
                    </label>
                    <Input
                      type="datetime-local"
                      className="text-xs"
                      value={
                        formSrpa.data_hora_alta_srpa
                          ? formSrpa.data_hora_alta_srpa.replace(' ', 'T')
                          : ''
                      }
                      onChange={(e) =>
                        setFormSrpa({
                          ...formSrpa,
                          data_hora_alta_srpa: e.target.value
                            ? e.target.value.replace('T', ' ')
                            : '',
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Índice de Aldrete-Kroulik (0 a 10)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      className="text-xs font-bold text-indigo-900"
                      value={formSrpa.escala_aldrete_kroulik}
                      onChange={(e) =>
                        setFormSrpa({
                          ...formSrpa,
                          escala_aldrete_kroulik: Number(e.target.value) || 0,
                        })
                      }
                    />
                    <span className="text-[10px] text-slate-500">
                      Critério de alta segura: pontuação ≥ 8 ou 9
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Sinais Vitais na Admissão da SRPA
                    </label>
                    <Input
                      className="text-xs"
                      value={formSrpa.sinais_vitais_admissao}
                      onChange={(e) =>
                        setFormSrpa({ ...formSrpa, sinais_vitais_admissao: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Sinais Vitais na Alta da SRPA
                    </label>
                    <Input
                      placeholder="PA, FC, FR, SpO2 no momento da liberação"
                      className="text-xs"
                      value={formSrpa.sinais_vitais_alta}
                      onChange={(e) =>
                        setFormSrpa({ ...formSrpa, sinais_vitais_alta: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Nível de Consciência
                    </label>
                    <Input
                      className="text-xs"
                      value={formSrpa.nivel_consciencia}
                      onChange={(e) =>
                        setFormSrpa({ ...formSrpa, nivel_consciencia: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Escala de Dor (EVA)
                    </label>
                    <Input
                      className="text-xs"
                      value={formSrpa.dor_escala_analogica}
                      onChange={(e) =>
                        setFormSrpa({ ...formSrpa, dor_escala_analogica: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        checked={formSrpa.nauseas_vomitos}
                        onChange={(e) =>
                          setFormSrpa({ ...formSrpa, nauseas_vomitos: e.target.checked })
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Náuseas ou vômitos pós-operatórios</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Evolução Clínica Pós-Operatória *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Registrar estado geral, permeabilidade de vias aéreas, padrão respiratório, curativo e queixas do paciente..."
                    className="w-full p-3 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 font-sans"
                    value={formSrpa.evolucao_pos_operatoria}
                    onChange={(e) =>
                      setFormSrpa({ ...formSrpa, evolucao_pos_operatoria: e.target.value })
                    }
                  />
                </div>

                {/* DESTINO PÓS-ALTA DA SRPA */}
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-indigo-950">
                      Destino do Paciente *
                    </label>
                    <select
                      className="w-full h-9 px-3 text-xs border border-indigo-300 rounded bg-white font-medium text-slate-800"
                      value={formSrpa.destino_pos_alta}
                      onChange={(e) =>
                        setFormSrpa({
                          ...formSrpa,
                          destino_pos_alta: e.target.value as DestinoSRPA,
                        })
                      }
                    >
                      <option value="retorno_leito">Retorno ao Leito / Enfermaria</option>
                      <option value="alta_hospitalar">Alta Hospitalar Direta (Ambulatorial)</option>
                      <option value="uti">Transferência para UTI</option>
                      <option value="observacao_srpa">Manter em Observação na SRPA</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-indigo-950">
                      Leito / Setor de Destino
                    </label>
                    <Input
                      placeholder="Ex: Leito 04 - Enfermaria Cirúrgica"
                      className="text-xs bg-white"
                      value={formSrpa.leito_destino}
                      onChange={(e) => setFormSrpa({ ...formSrpa, leito_destino: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-indigo-950">
                      Orientações de Alta / Pós-Op
                    </label>
                    <Input
                      placeholder="Prescrição de analgesia, dieta, curativo..."
                      className="text-xs bg-white"
                      value={formSrpa.orientacoes_alta}
                      onChange={(e) =>
                        setFormSrpa({ ...formSrpa, orientacoes_alta: e.target.value })
                      }
                    />
                  </div>
                </div>

                {podeRegistrarAtosEChecklist && (
                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs"
                    >
                      Salvar Registro de SRPA
                    </Button>
                  </div>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          MODAL: NOVO AGENDAMENTO CIRÚRGICO
          ========================================================================= */}
      {modalNovoAgendamento && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Scissors className="w-5 h-5 text-blue-600" />
                Agendar Procedimento Cirúrgico
              </h2>
              <button
                onClick={() => setModalNovoAgendamento(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarAgendamento} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Paciente *</label>
                  <select
                    required
                    className="w-full h-9 px-3 text-xs border border-slate-300 rounded-md bg-white"
                    value={formAgendamento.paciente}
                    onChange={(e) =>
                      setFormAgendamento({ ...formAgendamento, paciente: e.target.value })
                    }
                  >
                    <option value="">Selecione o paciente cadastrado...</option>
                    {pacientes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} (CNS: {p.cartao_sus})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Origem do Paciente *
                  </label>
                  <select
                    className="w-full h-9 px-3 text-xs border border-slate-300 rounded-md bg-white"
                    value={formAgendamento.tipo_paciente}
                    onChange={(e) =>
                      setFormAgendamento({
                        ...formAgendamento,
                        tipo_paciente: e.target.value as TipoPacienteCirurgia,
                      })
                    }
                  >
                    <option value="internado">Internado no Hospital</option>
                    <option value="ambulatorial">Ambulatorial (Eletiva)</option>
                    <option value="urgencia_pa">Pronto Atendimento (Urgência)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Nome do Procedimento *
                  </label>
                  <Input
                    required
                    placeholder="Ex: Colecistectomia Videolaparoscópica, Hernioplastia Inguinal..."
                    className="text-xs"
                    value={formAgendamento.procedimento_nome}
                    onChange={(e) =>
                      setFormAgendamento({
                        ...formAgendamento,
                        procedimento_nome: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Código SIGTAP</label>
                  <Input
                    placeholder="Ex: 04.07.01.003-2"
                    className="text-xs font-mono"
                    value={formAgendamento.procedimento_codigo}
                    onChange={(e) =>
                      setFormAgendamento({
                        ...formAgendamento,
                        procedimento_codigo: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Sala Cirúrgica *</label>
                  <select
                    required
                    className="w-full h-9 px-3 text-xs border border-slate-300 rounded-md bg-white"
                    value={formAgendamento.sala}
                    onChange={(e) =>
                      setFormAgendamento({ ...formAgendamento, sala: e.target.value })
                    }
                  >
                    <option value="">Selecione a sala...</option>
                    {salas.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome} [{s.status.toUpperCase()}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Data e Horário Previsto *
                  </label>
                  <Input
                    type="datetime-local"
                    required
                    className="text-xs"
                    value={formAgendamento.data_horario_previsto.replace(' ', 'T')}
                    onChange={(e) =>
                      setFormAgendamento({
                        ...formAgendamento,
                        data_horario_previsto: e.target.value.replace('T', ' '),
                      })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Duração Estimada (min)
                  </label>
                  <Input
                    type="number"
                    min="15"
                    className="text-xs"
                    value={formAgendamento.duracao_estimada_minutos}
                    onChange={(e) =>
                      setFormAgendamento({
                        ...formAgendamento,
                        duracao_estimada_minutos: Number(e.target.value) || 120,
                      })
                    }
                  />
                </div>
              </div>

              {/* Equipe médica */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Cirurgião Principal *
                  </label>
                  <select
                    required
                    className="w-full h-9 px-3 text-xs border border-slate-300 rounded-md bg-white"
                    value={formAgendamento.cirurgiao_principal}
                    onChange={(e) =>
                      setFormAgendamento({
                        ...formAgendamento,
                        cirurgiao_principal: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecione o cirurgião...</option>
                    {profissionais
                      .filter((p) => p.categoria === 'medico' || p.categoria === 'outro')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} ({p.especialidade})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Anestesista</label>
                  <select
                    className="w-full h-9 px-3 text-xs border border-slate-300 rounded-md bg-white"
                    value={formAgendamento.anestesista}
                    onChange={(e) =>
                      setFormAgendamento({
                        ...formAgendamento,
                        anestesista: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecione o anestesista (se houver)...</option>
                    {profissionais
                      .filter((p) => p.categoria === 'medico')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Instrumentador</label>
                  <select
                    className="w-full h-9 px-3 text-xs border border-slate-300 rounded-md bg-white"
                    value={formAgendamento.instrumentador}
                    onChange={(e) =>
                      setFormAgendamento({
                        ...formAgendamento,
                        instrumentador: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecione o instrumentador...</option>
                    {profissionais.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.categoria})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Equipe Adicional & Observações
                </label>
                <Input
                  placeholder="Circulantes de sala, 1º auxiliar, reserva especial de materiais..."
                  className="text-xs"
                  value={formAgendamento.observacoes_agendamento}
                  onChange={(e) =>
                    setFormAgendamento({
                      ...formAgendamento,
                      observacoes_agendamento: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalNovoAgendamento(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Confirmar Agendamento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: REAGENDAR CIRURGIA
          ========================================================================= */}
      {modalReagendamento && cirurgiaParaAcao && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Reagendar Cirurgia: {cirurgiaParaAcao.procedimento_nome}
            </h3>
            <p className="text-xs text-slate-500">
              Paciente: <strong>{cirurgiaParaAcao.expand?.paciente?.nome}</strong>
            </p>

            <form onSubmit={handleSalvarReagendamento} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Nova Data e Horário *
                </label>
                <Input
                  type="datetime-local"
                  required
                  className="text-xs"
                  value={formReagendar.novaDataHora.replace(' ', 'T')}
                  onChange={(e) =>
                    setFormReagendar({
                      ...formReagendar,
                      novaDataHora: e.target.value.replace('T', ' '),
                    })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nova Sala (Opcional)</label>
                <select
                  className="w-full h-9 px-3 text-xs border border-slate-300 rounded bg-white"
                  value={formReagendar.novaSalaId}
                  onChange={(e) =>
                    setFormReagendar({ ...formReagendar, novaSalaId: e.target.value })
                  }
                >
                  <option value="">Manter a mesma sala</option>
                  {salas.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} [{s.status.toUpperCase()}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Motivo do Reagendamento
                </label>
                <Input
                  placeholder="Justificativa para a auditoria..."
                  className="text-xs"
                  value={formReagendar.motivo}
                  onChange={(e) => setFormReagendar({ ...formReagendar, motivo: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalReagendamento(false)}
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Salvar Reagendamento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CANCELAR CIRURGIA
          ========================================================================= */}
      {modalCancelar && cirurgiaParaAcao && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-rose-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" /> Cancelar Cirurgia Agendada
            </h3>
            <p className="text-xs text-slate-600">
              Tem certeza que deseja cancelar a cirurgia{' '}
              <strong>{cirurgiaParaAcao.procedimento_nome}</strong> do paciente{' '}
              <strong>{cirurgiaParaAcao.expand?.paciente?.nome}</strong>?
            </p>

            <form onSubmit={handleSalvarCancelamento} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Motivo do Cancelamento *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Informe a razão clínica ou operacional do cancelamento..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-white"
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setModalCancelar(false)}>
                  Voltar
                </Button>
                <Button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Confirmar Cancelamento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ALTERAR STATUS DA SALA (LIMPEZA OU MANUTENÇÃO)
          ========================================================================= */}
      {modalStatusSala && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-600" />
              Alterar Estado Operacional: {modalStatusSala.nome}
            </h3>
            <p className="text-xs text-slate-500">
              Defina se a sala entrará em protocolo de higienização ou manutenção preventiva
            </p>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-xs border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                onClick={() =>
                  handleSalvarStatusSala('limpeza', 'Higienização terminal e desinfecção')
                }
              >
                <RefreshCw className="w-4 h-4 mr-2 text-amber-600" /> Colocar em Limpeza /
                Higienização
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start text-xs border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100"
                onClick={() =>
                  handleSalvarStatusSala('manutencao', 'Calibração preventiva e reparos técnicos')
                }
              >
                <Wrench className="w-4 h-4 mr-2 text-slate-600" /> Colocar em Manutenção Preventiva
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start text-xs border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                onClick={() => handleSalvarStatusSala('livre')}
              >
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> Liberar Sala (Status
                Livre)
              </Button>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalStatusSala(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
