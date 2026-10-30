import React, { useState, useEffect, useMemo } from 'react'
import { Paciente, EventoProntuarioUnificado, TipoEventoProntuario } from '@/types/hospital'
import { listarPacientes } from '@/services/cadastros'
import { carregarProntuarioUnificado } from '@/services/prontuarioSAME'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FolderOpen,
  Search,
  Printer,
  AlertOctagon,
  HeartPulse,
  Flame,
  Bed,
  Stethoscope,
  Pill,
  Calendar,
  CheckCircle2,
  Filter,
  User,
  Phone,
  Clock,
  ArrowRightLeft,
  LogOut,
  ClipboardList,
  Loader2,
  RefreshCw,
  FileText,
  ShieldAlert,
  FlaskConical,
  Microscope,
  Scissors,
  CheckSquare,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ProntuarioSAMEViewProps {
  pacienteIdInicial?: string
}

export const ProntuarioSAMEView: React.FC<ProntuarioSAMEViewProps> = ({ pacienteIdInicial }) => {
  const { toast } = useToast()

  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [pacienteSelecionadoId, setPacienteSelecionadoId] = useState<string>(
    pacienteIdInicial || '',
  )
  const [pacienteAtivo, setPacienteAtivo] = useState<Paciente | null>(null)
  const [eventos, setEventos] = useState<EventoProntuarioUnificado[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingPacientes, setLoadingPacientes] = useState(true)

  // Busca e Filtros
  const [termoBuscaPaciente, setTermoBuscaPaciente] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [buscaTextoEvento, setBuscaTextoEvento] = useState('')

  // 1. Carregar lista de pacientes para busca
  useEffect(() => {
    async function carregarListaPacientes() {
      setLoadingPacientes(true)
      try {
        const lista = await listarPacientes()
        setPacientes(lista)
        if (!pacienteSelecionadoId && lista.length > 0) {
          setPacienteSelecionadoId(lista[0].id)
        }
      } catch (err) {
        console.error('Erro ao listar pacientes no SAME:', err)
      } finally {
        setLoadingPacientes(false)
      }
    }
    carregarListaPacientes()
  }, [])

  // 2. Carregar o prontuário do paciente selecionado
  useEffect(() => {
    if (pacienteSelecionadoId) {
      carregarDadosProntuario(pacienteSelecionadoId)
    }
  }, [pacienteSelecionadoId])

  const carregarDadosProntuario = async (pId: string) => {
    setLoading(true)
    try {
      const res = await carregarProntuarioUnificado(pId)
      setPacienteAtivo(res.paciente)
      setEventos(res.eventos)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao carregar prontuário',
        description: err.message || 'Não foi possível carregar a linha do tempo do paciente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Pacientes filtrados na busca rápida da barra
  const pacientesFiltrados = useMemo(() => {
    if (!termoBuscaPaciente.trim()) return pacientes
    const t = termoBuscaPaciente.toLowerCase()
    return pacientes.filter(
      (p) =>
        p.nome.toLowerCase().includes(t) ||
        p.cartao_sus.includes(t) ||
        (p.cpf && p.cpf.includes(t)),
    )
  }, [pacientes, termoBuscaPaciente])

  // Eventos filtrados pela busca e tipo
  const eventosFiltrados = useMemo(() => {
    return eventos.filter((ev) => {
      // Filtro tipo
      if (filtroTipo !== 'todos') {
        if (filtroTipo === 'pa' && !ev.tipo.startsWith('pa_')) return false
        if (filtroTipo === 'internacao' && !ev.tipo.startsWith('internacao_')) return false
        if (filtroTipo === 'assistencial' && ev.tipo !== 'evolucao_clinica') return false
        if (filtroTipo === 'prescricao' && ev.tipo !== 'prescricao_medica') return false
        if (filtroTipo === 'enfermagem' && ev.tipo !== 'administracao_enfermagem') return false
        if (filtroTipo === 'farmacia' && ev.tipo !== 'dispensacao_farmacia') return false
        if (filtroTipo === 'agendamento' && ev.tipo !== 'agendamento') return false
        if (filtroTipo === 'exames' && !ev.tipo.startsWith('exame_')) return false
        if (filtroTipo === 'cirurgia' && !ev.tipo.startsWith('cirurgia_')) return false
      }

      // Filtro período
      if (filtroDataInicio && ev.dataHora < filtroDataInicio) return false
      if (filtroDataFim && ev.dataHora > `${filtroDataFim} 23:59:59`) return false

      // Filtro de texto no título, descrição ou profissional
      if (buscaTextoEvento.trim()) {
        const q = buscaTextoEvento.toLowerCase()
        const matchTitulo = ev.titulo.toLowerCase().includes(q)
        const matchDesc = (ev.descricao || '').toLowerCase().includes(q)
        const matchProf = (ev.profissionalNome || '').toLowerCase().includes(q)
        if (!matchTitulo && !matchDesc && !matchProf) return false
      }

      return true
    })
  }, [eventos, filtroTipo, filtroDataInicio, filtroDataFim, buscaTextoEvento])

  // Ícone por tipo de evento
  const renderIconeEvento = (tipo: TipoEventoProntuario) => {
    switch (tipo) {
      case 'pa_triagem':
      case 'pa_atendimento':
        return <Flame className="w-4 h-4 text-red-600" />
      case 'internacao_admissao':
        return <Bed className="w-4 h-4 text-indigo-600" />
      case 'internacao_transferencia':
        return <ArrowRightLeft className="w-4 h-4 text-amber-600" />
      case 'internacao_alta':
        return <LogOut className="w-4 h-4 text-emerald-600" />
      case 'evolucao_clinica':
        return <Stethoscope className="w-4 h-4 text-blue-600" />
      case 'prescricao_medica':
        return <FileText className="w-4 h-4 text-purple-600" />
      case 'administracao_enfermagem':
        return <CheckCircle2 className="w-4 h-4 text-teal-600" />
      case 'dispensacao_farmacia':
        return <Pill className="w-4 h-4 text-emerald-600" />
      case 'agendamento':
        return <Calendar className="w-4 h-4 text-slate-600" />
      case 'exame_laudado':
        return <FlaskConical className="w-4 h-4 text-teal-600" />
      case 'exame_solicitado':
      case 'exame_coletado':
      case 'exame_em_analise':
      case 'exame_cancelado':
        return <Microscope className="w-4 h-4 text-purple-600" />
      case 'cirurgia_agendada':
      case 'cirurgia_cancelada':
        return <Scissors className="w-4 h-4 text-rose-600" />
      case 'cirurgia_checklist':
        return <CheckSquare className="w-4 h-4 text-amber-600" />
      case 'cirurgia_ato_operatorio':
        return <Scissors className="w-4 h-4 text-red-700" />
      case 'cirurgia_recuperacao_srpa':
        return <HeartPulse className="w-4 h-4 text-indigo-600" />
      default:
        return <HeartPulse className="w-4 h-4 text-blue-600" />
    }
  }

  // Impressão nativa do navegador em layout otimizado
  const handleImprimir = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* 1. TOPO: Identificação e Busca de Prontuário SAME (Oculto na impressão) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  SAME — Serviço de Arquivo Médico e Prontuário Eletrônico Único
                </h1>
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]"
                >
                  Histórico Consolidado SUS
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Linha do tempo única: Atendimentos PA, Internações, Evoluções, Prescrições,
                Checagens de Enfermagem, Farmácia e Exames
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => carregarDadosProntuario(pacienteSelecionadoId)}
            disabled={loading}
            className="text-slate-600"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            size="sm"
            onClick={handleImprimir}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Imprimir Prontuário
          </Button>
        </div>
      </div>

      {/* 2. BARRA DE SELEÇÃO RÁPIDA DE PACIENTE (Oculto na impressão) */}
      <Card className="print:hidden border-slate-200 shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 space-y-1">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-slate-400" /> Selecionar Paciente (Nome, Cartão
              SUS ou CPF)
            </span>
            <div className="flex gap-2">
              <select
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                value={pacienteSelecionadoId}
                onChange={(e) => setPacienteSelecionadoId(e.target.value)}
              >
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} • SUS: {p.cartao_sus} {p.cpf ? `• CPF: ${p.cpf}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-full md:w-64 space-y-1">
            <span className="text-xs text-slate-500">Filtrar lista de pacientes</span>
            <Input
              placeholder="Digite para filtrar a lista..."
              value={termoBuscaPaciente}
              onChange={(e) => setTermoBuscaPaciente(e.target.value)}
              className="text-xs h-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. CABEÇALHO DO PACIENTE + ALERTA DE ALERGIAS (LAYOUT DE IMPRESSÃO E TELA) */}
      {pacienteAtivo && (
        <div className="space-y-4">
          {/* BANNER VERMELHO DE DESTAQUE: ALERGIAS E CONDIÇÕES CRÔNICAS */}
          <div className="rounded-xl border-2 border-red-500 bg-red-50/90 p-4 shadow-sm text-red-950">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow">
                  <AlertOctagon className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black uppercase tracking-wider text-red-900">
                      ALERTA CLÍNICO OBRIGATÓRIO — ALERGIAS & RISCOS
                    </span>
                    <Badge className="bg-red-600 text-white text-[10px] font-bold uppercase border-0">
                      Atenção Farmacêutica & Médica
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold text-red-800 mt-0.5">
                    {pacienteAtivo.alergias
                      ? pacienteAtivo.alergias
                      : 'NENHUMA ALERGIA MEDICAMENTOSA OU ALIMENTAR REGISTRADA ATÉ O MOMENTO'}
                  </p>
                </div>
              </div>

              {pacienteAtivo.condicoes_cronicas && (
                <div className="sm:text-right bg-white/80 p-2 rounded-lg border border-red-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Condições Crônicas
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {pacienteAtivo.condicoes_cronicas}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* DADOS CADASTRAIS DO PACIENTE */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-slate-900">{pacienteAtivo.nome}</span>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                      CNS: {pacienteAtivo.cartao_sus}
                    </Badge>
                    {pacienteAtivo.cpf && (
                      <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        CPF: {pacienteAtivo.cpf}
                      </span>
                    )}
                    {pacienteAtivo.tipo_sanguineo && (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-xs font-bold">
                        Tipo: {pacienteAtivo.tipo_sanguineo}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {pacienteAtivo.data_nascimento && (
                      <span>
                        Nascimento: <strong>{pacienteAtivo.data_nascimento}</strong>
                      </span>
                    )}
                    {pacienteAtivo.sexo && (
                      <span>
                        Sexo:{' '}
                        <strong>
                          {pacienteAtivo.sexo === 'M'
                            ? 'Masculino'
                            : pacienteAtivo.sexo === 'F'
                              ? 'Feminino'
                              : 'Outro'}
                        </strong>
                      </span>
                    )}
                    {pacienteAtivo.nome_mae && (
                      <span>
                        Mãe: <strong>{pacienteAtivo.nome_mae}</strong>
                      </span>
                    )}
                    {pacienteAtivo.telefone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {pacienteAtivo.telefone}
                      </span>
                    )}
                  </div>
                  {pacienteAtivo.endereco && (
                    <p className="text-[11px] text-slate-500">
                      Endereço: {pacienteAtivo.endereco}
                      {pacienteAtivo.bairro ? `, ${pacienteAtivo.bairro}` : ''} (
                      {pacienteAtivo.cidade || 'Mirante da Serra - RO'})
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                  <div className="text-xs text-slate-500">Prontuário SAME</div>
                  <div className="text-xl font-black text-slate-900">
                    #{pacienteAtivo.id.slice(0, 8)}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold">
                    {eventos.length} ocorrência(s) registrada(s)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. BARRA DE FILTROS DA LINHA DO TEMPO (Oculto na impressão) */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Filtrar Ocorrências:
          </span>

          <select
            className="h-8 px-2.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="todos">Todos os Eventos ({eventos.length})</option>
            <option value="cirurgia">Centro Cirúrgico (Ato, SRPA, Checklist)</option>
            <option value="pa">Pronto Atendimento (PA)</option>
            <option value="internacao">Internações & Transferências</option>
            <option value="prescricao">Prescrições Médicas</option>
            <option value="enfermagem">Checagens de Enfermagem</option>
            <option value="assistencial">Evoluções Clínicas</option>
            <option value="exames">Exames & Laudos</option>
            <option value="farmacia">Dispensações de Medicamentos</option>
            <option value="agendamento">Agendamentos</option>
          </select>

          <Input
            type="date"
            className="h-8 text-xs w-36"
            value={filtroDataInicio}
            onChange={(e) => setFiltroDataInicio(e.target.value)}
            title="Data inicial"
          />
          <span className="text-xs text-slate-400">até</span>
          <Input
            type="date"
            className="h-8 text-xs w-36"
            value={filtroDataFim}
            onChange={(e) => setFiltroDataFim(e.target.value)}
            title="Data final"
          />

          {(filtroTipo !== 'todos' || filtroDataInicio || filtroDataFim || buscaTextoEvento) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFiltroTipo('todos')
                setFiltroDataInicio('')
                setFiltroDataFim('')
                setBuscaTextoEvento('')
              }}
              className="text-xs h-8 text-red-600"
            >
              Limpar Filtros
            </Button>
          )}
        </div>

        <div className="w-full md:w-64">
          <Input
            placeholder="Buscar por termo ou profissional..."
            value={buscaTextoEvento}
            onChange={(e) => setBuscaTextoEvento(e.target.value)}
            className="text-xs h-8"
          />
        </div>
      </div>

      {/* 5. LINHA DO TEMPO CONSOLIDADA DO SAME */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Linha do Tempo Cronológica — Histórico Clínico Integrado
          </CardTitle>
          <span className="text-xs text-slate-500">
            Exibindo <strong>{eventosFiltrados.length}</strong> de <strong>{eventos.length}</strong>{' '}
            eventos
          </span>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span>Consolidando prontuário eletrônico unificado...</span>
            </div>
          ) : eventosFiltrados.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm space-y-1">
              <p className="font-semibold text-slate-700">
                Nenhum evento registrado com os filtros atuais.
              </p>
              <p className="text-xs text-slate-400">
                Selecione outro paciente ou remova os filtros de data e tipo.
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-4 md:ml-6 pl-4 md:pl-6 space-y-6">
              {eventosFiltrados.map((ev) => (
                <div key={ev.id} className="relative group">
                  {/* Marcador na Linha do Tempo */}
                  <div className="absolute -left-[27px] md:-left-[35px] top-1 w-6 h-6 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center shadow-sm">
                    {renderIconeEvento(ev.tipo)}
                  </div>

                  {/* Card do Evento */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300 transition-all space-y-2">
                    {/* Linha superior: Data/Hora e Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {ev.dataHora}
                        </span>
                        <Badge className={`text-[10px] font-bold ${ev.badgeCor}`}>
                          {ev.badgeTexto}
                        </Badge>
                      </div>

                      {ev.profissionalNome && (
                        <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {ev.profissionalNome}
                        </span>
                      )}
                    </div>

                    {/* Título e Subtítulo */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{ev.titulo}</h3>
                      {ev.subtitulo && (
                        <p className="text-xs text-slate-500 mt-0.5">{ev.subtitulo}</p>
                      )}
                    </div>

                    {/* Descrição principal */}
                    {ev.descricao && (
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/70">
                        {ev.descricao}
                      </p>
                    )}

                    {/* Detalhes extras específicos */}
                    {ev.detalhes && (
                      <div className="text-[11px] text-slate-600 space-y-1 pt-1">
                        {ev.detalhes.sinais_vitais && (
                          <div className="flex items-center gap-1.5 text-slate-700 bg-red-50/50 p-1.5 rounded border border-red-100">
                            <HeartPulse className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span>
                              <strong>Sinais Vitais:</strong> {ev.detalhes.sinais_vitais}
                            </span>
                          </div>
                        )}
                        {ev.detalhes.diagnostico && (
                          <div className="bg-purple-50 p-1.5 rounded border border-purple-100 text-purple-900">
                            <strong>Diagnóstico / CID:</strong> {ev.detalhes.diagnostico}{' '}
                            {ev.detalhes.cid10 ? `(CID: ${ev.detalhes.cid10})` : ''}
                          </div>
                        )}
                        {ev.detalhes.conduta && (
                          <div className="bg-emerald-50 p-1.5 rounded border border-emerald-100 text-emerald-900">
                            <strong>Conduta:</strong> {ev.detalhes.conduta}
                          </div>
                        )}
                        {ev.detalhes.itens && Array.isArray(ev.detalhes.itens) && (
                          <div className="bg-purple-50/60 p-2 rounded border border-purple-200 mt-1">
                            <p className="font-semibold text-purple-950 mb-1">Itens Prescritos:</p>
                            <ul className="list-disc list-inside space-y-0.5 text-purple-900">
                              {ev.detalhes.itens.map((it: any, i: number) => (
                                <li key={i}>
                                  <strong>{it.medicamento_nome}</strong> — Dose: {it.dose} • Via:{' '}
                                  {it.via_administracao} • Freq: {it.frequencia}
                                  {it.duracao ? ` • Duração: ${it.duracao}` : ''}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. RODAPÉ DE IMPRESSÃO (visível apenas na impressão) */}
      <div className="hidden print:block text-center text-xs text-slate-500 pt-8 border-t border-slate-300">
        <p className="font-bold">Secretaria Municipal de Saúde • Mirante da Serra - RO</p>
        <p>
          Prontuário Eletrônico Unificado do Paciente — Impresso em{' '}
          {new Date().toLocaleString('pt-BR')}
        </p>
        <p className="mt-8">_____________________________________________________________</p>
        <p>Assinatura e Carimbo do Responsável Técnico</p>
      </div>
    </div>
  )
}
