import React, { useState, useEffect } from 'react'
import {
  Leito,
  Setor,
  Paciente,
  Profissional,
  Internacao,
  MovimentacaoLeito,
} from '@/types/hospital'
import {
  listarLeitos,
  listarSetores,
  listarPacientes,
  listarProfissionais,
  atualizarLeito,
} from '@/services/cadastros'
import {
  listarInternacoes,
  admitirPaciente,
  transferirLeito,
  darAltaPaciente,
} from '@/services/internacoes'
import { useAuth } from '@/contexts/AuthContext'
import { ModalEmissaoImpresso } from '@/components/ModalEmissaoImpresso'
import { TipoImpressoAssistencial } from '@/types/hospital'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bed,
  UserPlus,
  ArrowRightLeft,
  LogOut,
  History,
  Activity,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Clock,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const InternacaoView: React.FC<{
  onAbrirEvolucao?: (internacaoId: string, pacienteId: string) => void
}> = ({ onAbrirEvolucao }) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [leitos, setLeitos] = useState<Leito[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [internacoesAtivas, setInternacoesAtivas] = useState<Internacao[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros mapa de leitos
  const [filtroSetor, setFiltroSetor] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  // Modais
  const [modalAdmissaoAberto, setModalAdmissaoAberto] = useState(false)
  const [modalTransferenciaAberto, setModalTransferenciaAberto] = useState(false)
  const [modalAltaAberto, setModalAltaAberto] = useState(false)
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false)
  const [modalImpressoAberto, setModalImpressoAberto] = useState(false)
  const [tipoImpressoInicial, setTipoImpressoInicial] =
    useState<TipoImpressoAssistencial>('resumo_alta')
  const [internacaoParaImpresso, setInternacaoParaImpresso] = useState<Internacao | null>(null)

  // Form Admissão
  const [formAdmPaciente, setFormAdmPaciente] = useState('')
  const [formAdmLeito, setFormAdmLeito] = useState('')
  const [formAdmMedico, setFormAdmMedico] = useState('')
  const [formAdmMotivo, setFormAdmMotivo] = useState('')
  const [formAdmDiag, setFormAdmDiag] = useState('')
  const [formAdmCid, setFormAdmCid] = useState('')

  // Form Transferência
  const [transferenciaAlvo, setTransferenciaAlvo] = useState<Internacao | null>(null)
  const [formTransfNovoLeito, setFormTransfNovoLeito] = useState('')
  const [formTransfMotivo, setFormTransfMotivo] = useState('')

  // Form Alta
  const [altaAlvo, setAltaAlvo] = useState<Internacao | null>(null)
  const [formAltaMotivo, setFormAltaMotivo] = useState('Melhora clínica e alta médica consentida')

  // Histórico
  const [historicoAlvo, setHistoricoAlvo] = useState<Internacao | null>(null)

  const [processando, setProcessando] = useState(false)
  const isProfissional = user?.role === 'profissional'
  const podeEmitirImpresso = isProfissional

  useEffect(() => {
    carregarTudo()
  }, [])

  const carregarTudo = async () => {
    setLoading(true)
    try {
      const [l, s, p, profs, ints] = await Promise.all([
        listarLeitos(),
        listarSetores(),
        listarPacientes(),
        listarProfissionais(),
        listarInternacoes(true),
      ])
      setLeitos(l)
      setSetores(s)
      setPacientes(p)
      setProfissionais(profs)
      setInternacoesAtivas(ints)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados de internação.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Abrir admissão a partir de um leito vago específico
  const abrirAdmissaoParaLeito = (leitoId?: string) => {
    const leitoVago = leitoId || leitos.find((l) => l.status === 'vago')?.id || ''
    setFormAdmLeito(leitoVago)
    setFormAdmPaciente(pacientes[0]?.id || '')
    setFormAdmMedico(profissionais.find((p) => p.categoria === 'medico')?.id || '')
    setFormAdmMotivo('')
    setFormAdmDiag('')
    setFormAdmCid('')
    setModalAdmissaoAberto(true)
  }

  const handleExecutarAdmissao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formAdmPaciente || !formAdmLeito || !formAdmMotivo.trim()) {
      toast({
        title: 'Atenção',
        description: 'Preencha paciente, leito vago e motivo da admissão.',
        variant: 'destructive',
      })
      return
    }

    const leitoObj = leitos.find((l) => l.id === formAdmLeito)
    if (!leitoObj) return

    setProcessando(true)
    try {
      await admitirPaciente({
        paciente: formAdmPaciente,
        leito_atual: formAdmLeito,
        setor_atual: leitoObj.setor,
        medico_responsavel: formAdmMedico || undefined,
        motivo_admissao: formAdmMotivo.trim(),
        diagnostico_inicial: formAdmDiag.trim(),
        cid10_admissao: formAdmCid.trim(),
        leitoCodigo: leitoObj.codigo,
        usuarioNome: user?.name || 'Recepção',
      })

      toast({
        title: 'Admissão Realizada',
        description: `Paciente internado com sucesso no leito ${leitoObj.codigo}.`,
      })
      setModalAdmissaoAberto(false)
      carregarTudo()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao admitir paciente.',
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  // Transferência
  const abrirTransferencia = (internacao: Internacao) => {
    setTransferenciaAlvo(internacao)
    const primeiroVago = leitos.find((l) => l.status === 'vago' && l.id !== internacao.leito_atual)
    setFormTransfNovoLeito(primeiroVago?.id || '')
    setFormTransfMotivo('Transferência por necessidade de assistência específica')
    setModalTransferenciaAberto(true)
  }

  const handleExecutarTransferencia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transferenciaAlvo || !formTransfNovoLeito) {
      toast({
        title: 'Atenção',
        description: 'Selecione o novo leito vago.',
        variant: 'destructive',
      })
      return
    }

    const novoLeitoObj = leitos.find((l) => l.id === formTransfNovoLeito)
    const leitoAntigoObj = leitos.find((l) => l.id === transferenciaAlvo.leito_atual)
    if (!novoLeitoObj) return

    let historicoArray: MovimentacaoLeito[] = []
    try {
      if (typeof transferenciaAlvo.historico_leitos === 'string') {
        historicoArray = JSON.parse(transferenciaAlvo.historico_leitos) || []
      } else if (Array.isArray(transferenciaAlvo.historico_leitos)) {
        historicoArray = transferenciaAlvo.historico_leitos
      }
    } catch {
      historicoArray = []
    }

    setProcessando(true)
    try {
      await transferirLeito({
        internacaoId: transferenciaAlvo.id,
        leitoAntigoId: transferenciaAlvo.leito_atual,
        leitoNovoId: formTransfNovoLeito,
        setorNovoId: novoLeitoObj.setor,
        motivo: formTransfMotivo,
        leitoAntigoCodigo: leitoAntigoObj?.codigo || 'Leito Anterior',
        leitoNovoCodigo: novoLeitoObj.codigo,
        usuarioNome: user?.name || 'Recepção',
        historicoAtual: historicoArray,
      })

      toast({
        title: 'Transferência Concluída',
        description: `Paciente transferido para ${novoLeitoObj.codigo}. O leito anterior foi encaminhado para higienização.`,
      })
      setModalTransferenciaAberto(false)
      carregarTudo()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao transferir leito.',
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  // Alta
  const abrirAlta = (internacao: Internacao) => {
    setAltaAlvo(internacao)
    setFormAltaMotivo('Melhora clínica com prescrição pós-alta')
    setModalAltaAberto(true)
  }

  const handleExecutarAlta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!altaAlvo) return
    const leitoObj = leitos.find((l) => l.id === altaAlvo.leito_atual)

    setProcessando(true)
    try {
      await darAltaPaciente({
        internacaoId: altaAlvo.id,
        leitoId: altaAlvo.leito_atual,
        motivo_alta: formAltaMotivo,
        leitoCodigo: leitoObj?.codigo || 'Leito',
        usuarioNome: user?.name || 'Médico Responsável',
      })

      toast({
        title: 'Alta Registrada',
        description: `Alta confirmada. O leito ${leitoObj?.codigo || ''} foi liberado para higienização.`,
      })
      setModalAltaAberto(false)
      carregarTudo()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao dar alta.',
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  // Alterar leito de higienização ou manutenção para vago
  const handleLiberarLeito = async (leito: Leito) => {
    try {
      await atualizarLeito(leito.id, { status: 'vago' })
      toast({
        title: 'Leito Liberado',
        description: `${leito.codigo} está disponível para nova admissão!`,
      })
      carregarTudo()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível liberar o leito.',
        variant: 'destructive',
      })
    }
  }

  // Leitos filtrados
  const leitosFiltrados = leitos.filter((l) => {
    const matchSetor = filtroSetor === 'todos' || l.setor === filtroSetor
    const matchStatus = filtroStatus === 'todos' || l.status === filtroStatus
    return matchSetor && matchStatus
  })

  // Mapear internação ativa para cada leito
  const internacaoPorLeito = new Map<string, Internacao>()
  internacoesAtivas.forEach((i) => {
    internacaoPorLeito.set(i.leito_atual, i)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bed className="w-5 h-5 text-blue-600" />
            Mapa de Leitos & Gestão de Internação
          </h1>
          <p className="text-xs text-slate-500">
            Admissão hospitalar em leitos vagos, movimentação entre setores e registro de alta
          </p>
        </div>

        <Button
          onClick={() => abrirAdmissaoParaLeito()}
          className="bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm shadow-sm"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Admitir Paciente
        </Button>
      </div>

      <Tabs defaultValue="mapa" className="w-full">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="mapa" className="text-xs sm:text-sm">
            Mapa Visual de Leitos ({leitos.length})
          </TabsTrigger>
          <TabsTrigger value="internados" className="text-xs sm:text-sm">
            Pacientes Internados Ativos ({internacoesAtivas.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MAPA DE LEITOS */}
        <TabsContent value="mapa" className="space-y-4 pt-2">
          {/* Barra de Filtros e Legendas */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                Vago ({leitos.filter((l) => l.status === 'vago').length})
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                Ocupado ({leitos.filter((l) => l.status === 'ocupado').length})
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                Higienização ({leitos.filter((l) => l.status === 'higienizacao').length})
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" />
                Manutenção ({leitos.filter((l) => l.status === 'manutencao').length})
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                <SelectTrigger className="text-xs h-8 w-44">
                  <SelectValue placeholder="Todos os Setores" />
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

              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="text-xs h-8 w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="vago">Vago</SelectItem>
                  <SelectItem value="ocupado">Ocupado</SelectItem>
                  <SelectItem value="higienizacao">Higienização</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid de Cards de Leito */}
          {loading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              Carregando mapa hospitalar...
            </div>
          ) : leitosFiltrados.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Nenhum leito encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {leitosFiltrados.map((leito) => {
                const internacao = internacaoPorLeito.get(leito.id)
                const isVago = leito.status === 'vago'
                const isOcupado = leito.status === 'ocupado'
                const isHigienizacao = leito.status === 'higienizacao'
                const isManutencao = leito.status === 'manutencao'

                return (
                  <Card
                    key={leito.id}
                    className={`border transition-all shadow-sm ${
                      isOcupado
                        ? 'border-red-200 bg-red-50/30'
                        : isVago
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : isHigienizacao
                            ? 'border-amber-200 bg-amber-50/30'
                            : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    <CardHeader className="p-3.5 pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                            <Bed
                              className={`w-4 h-4 ${
                                isOcupado
                                  ? 'text-red-600'
                                  : isVago
                                    ? 'text-emerald-600'
                                    : isHigienizacao
                                      ? 'text-amber-600'
                                      : 'text-slate-500'
                              }`}
                            />
                            {leito.codigo}
                          </CardTitle>
                          <span className="text-[11px] text-slate-500 block truncate max-w-[150px]">
                            {leito.expand?.setor?.nome || 'Setor'}
                          </span>
                        </div>

                        <Badge
                          className={`text-[10px] uppercase font-bold border-0 ${
                            isOcupado
                              ? 'bg-red-600 text-white'
                              : isVago
                                ? 'bg-emerald-600 text-white'
                                : isHigienizacao
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-slate-600 text-white'
                          }`}
                        >
                          {leito.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3.5 pt-1 space-y-2.5">
                      <div className="text-[11px] text-slate-500 flex justify-between">
                        <span>Tipo: {leito.tipo}</span>
                        {leito.observacoes && (
                          <span className="truncate max-w-[120px]">{leito.observacoes}</span>
                        )}
                      </div>

                      {/* Informações do Paciente quando ocupado */}
                      {isOcupado && internacao ? (
                        <div className="p-2.5 rounded-lg bg-white border border-red-100 space-y-1">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {internacao.expand?.paciente?.nome || 'Paciente'}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            SUS: {internacao.expand?.paciente?.cartao_sus || 'N/A'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Admissão: {internacao.data_admissao}
                          </p>
                        </div>
                      ) : isVago ? (
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
                          <p className="text-xs font-medium text-emerald-800">
                            Pronto para receber paciente
                          </p>
                        </div>
                      ) : isHigienizacao ? (
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-100 text-center space-y-1">
                          <p className="text-xs font-medium text-amber-800 flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3" /> Higienização Terminal
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLiberarLeito(leito)}
                            className="text-[10px] h-6 w-full border-amber-300 text-amber-900 bg-white"
                          >
                            Concluir & Liberar Leito
                          </Button>
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-center space-y-1">
                          <p className="text-xs font-medium text-slate-700 flex items-center justify-center gap-1">
                            <Wrench className="w-3 h-3" /> Em Reparo
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLiberarLeito(leito)}
                            className="text-[10px] h-6 w-full text-slate-800 bg-white"
                          >
                            Finalizar Manutenção
                          </Button>
                        </div>
                      )}

                      {/* Botões de Ação rápida do Leito */}
                      <div className="pt-1 flex flex-wrap gap-1">
                        {isVago && (
                          <Button
                            size="sm"
                            onClick={() => abrirAdmissaoParaLeito(leito.id)}
                            className="w-full text-xs h-7 bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            <UserPlus className="w-3 h-3 mr-1" />
                            Admitir Aqui
                          </Button>
                        )}
                        {isOcupado && internacao && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirTransferencia(internacao)}
                              className="flex-1 text-[11px] h-7 border-slate-300"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
                              Transferir
                            </Button>

                            {podeEmitirImpresso && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setInternacaoParaImpresso(internacao)
                                  setTipoImpressoInicial('resumo_alta')
                                  setModalImpressoAberto(true)
                                }}
                                className="text-[11px] h-7 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2"
                                title="Emitir Resumo de Alta / Receita A4"
                              >
                                <Bed className="w-3 h-3 mr-1" />
                                Resumo Alta
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => abrirAlta(internacao)}
                              className="flex-1 text-[11px] h-7 bg-red-100 text-red-800 hover:bg-red-200"
                            >
                              <LogOut className="w-3.5 h-3.5 mr-1" />
                              Alta
                            </Button>
                          </>
                        )}{' '}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: LISTA DE INTERNADOS */}
        <TabsContent value="internados" className="space-y-4 pt-2">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800">
                Pacientes Admitidos no Hospital ({internacoesAtivas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {internacoesAtivas.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  Nenhum paciente internado no momento.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {internacoesAtivas.map((item) => (
                    <div
                      key={item.id}
                      className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {item.expand?.paciente?.nome || 'Paciente'}
                          </span>
                          <Badge className="bg-red-100 text-red-800 text-xs border-0 font-bold">
                            {item.expand?.leito_atual?.codigo || 'Leito'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {item.expand?.setor_atual?.nome || 'Setor'}
                          </Badge>
                          {item.cid10_admissao && (
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              CID-10: {item.cid10_admissao}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                          <span>
                            <strong>Admissão:</strong> {item.data_admissao}
                          </span>
                          <span>
                            <strong>Médico:</strong>{' '}
                            {item.expand?.medico_responsavel?.nome || 'Plantão'}
                          </span>
                          <span>
                            <strong>SUS:</strong> {item.expand?.paciente?.cartao_sus || 'N/A'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600">
                          <strong>Motivo:</strong> {item.motivo_admissao}
                        </p>
                        {item.diagnostico_inicial && (
                          <p className="text-xs text-slate-500">
                            <strong>Diagnóstico Inicial:</strong> {item.diagnostico_inicial}
                          </p>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                        {onAbrirEvolucao && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAbrirEvolucao(item.id, item.paciente)}
                            className="text-xs h-8"
                          >
                            <Activity className="w-3.5 h-3.5 mr-1 text-blue-600" />
                            Evolução Clínica
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setHistoricoAlvo(item)
                            setModalHistoricoAberto(true)
                          }}
                          className="text-xs h-8"
                        >
                          <History className="w-3.5 h-3.5 mr-1" />
                          Movimentações
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirTransferencia(item)}
                          className="text-xs h-8"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
                          Transferir
                        </Button>

                        {podeEmitirImpresso && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setInternacaoParaImpresso(item)
                              setTipoImpressoInicial('resumo_alta')
                              setModalImpressoAberto(true)
                            }}
                            className="text-xs h-8 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                          >
                            <Bed className="w-3.5 h-3.5 mr-1" />
                            Resumo de Alta A4
                          </Button>
                        )}

                        <Button
                          size="sm"
                          onClick={() => abrirAlta(item)}
                          className="text-xs h-8 bg-red-600 hover:bg-red-500 text-white"
                        >
                          <LogOut className="w-3.5 h-3.5 mr-1" />
                          Dar Alta
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL ADMISSÃO */}
      <Dialog open={modalAdmissaoAberto} onOpenChange={setModalAdmissaoAberto}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Admissão Hospitalar de Paciente</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Vincule um paciente ao leito vago com o motivo de internação e hipótese diagnóstica
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExecutarAdmissao} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Paciente (SUS) *</Label>
              <Select value={formAdmPaciente} onValueChange={setFormAdmPaciente}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} — CNS: {p.cartao_sus}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ALERTA DE ALERGIAS E COMORBIDADES NA ADMISSÃO HOSPITALAR */}
            {formAdmPaciente &&
              (() => {
                const pacSel = pacientes.find((p) => p.id === formAdmPaciente)
                if (!pacSel) return null
                return (
                  <div className="rounded-lg border-2 border-red-500 bg-red-50 p-2.5 text-red-950 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                      <span className="text-xs font-black uppercase text-red-900 tracking-wide">
                        ALERTA OBRIGATÓRIO DE ADMISSÃO — ALERGIAS DO PACIENTE:
                      </span>
                    </div>
                    <div className="text-xs font-bold text-red-800">
                      Alergias: {pacSel.alergias || 'Nenhuma alergia conhecida'}
                    </div>
                    {pacSel.condicoes_cronicas && (
                      <div className="text-[11px] text-red-900 font-medium">
                        Condições Crônicas: {pacSel.condicoes_cronicas}
                      </div>
                    )}
                  </div>
                )
              })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Leito Vago *</Label>
                <Select value={formAdmLeito} onValueChange={setFormAdmLeito}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione o leito" />
                  </SelectTrigger>
                  <SelectContent>
                    {leitos
                      .filter((l) => l.status === 'vago')
                      .map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.codigo} ({l.tipo} - {l.expand?.setor?.nome})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Médico Responsável</Label>
                <Select value={formAdmMedico} onValueChange={setFormAdmMedico}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Médico do plantão" />
                  </SelectTrigger>
                  <SelectContent>
                    {profissionais
                      .filter((p) => p.categoria === 'medico')
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome} ({p.registro_conselho})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Motivo da Admissão *</Label>
              <Input
                required
                placeholder="Ex: Crise asmática grave, pneumonia bacteriana, pós-operatório..."
                value={formAdmMotivo}
                onChange={(e) => setFormAdmMotivo(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Diagnóstico Inicial</Label>
                <Input
                  placeholder="Hipótese clínica principal"
                  value={formAdmDiag}
                  onChange={(e) => setFormAdmDiag(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">CID-10</Label>
                <Input
                  placeholder="Ex: J18.9, I10"
                  value={formAdmCid}
                  onChange={(e) => setFormAdmCid(e.target.value)}
                  className="text-sm font-mono uppercase"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalAdmissaoAberto(false)}
                disabled={processando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={processando}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {processando ? 'Admitindo...' : 'Concluir Admissão'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL TRANSFERÊNCIA DE LEITO */}
      <Dialog open={modalTransferenciaAberto} onOpenChange={setModalTransferenciaAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir Paciente de Leito</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Movimente o paciente para outro leito disponível. O leito de origem será enviado para
              higienização.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExecutarTransferencia} className="space-y-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 border border-slate-200">
              <p>
                <strong>Paciente:</strong> {transferenciaAlvo?.expand?.paciente?.nome}
              </p>
              <p>
                <strong>Leito Atual:</strong> {transferenciaAlvo?.expand?.leito_atual?.codigo} (
                {transferenciaAlvo?.expand?.setor_atual?.nome})
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Novo Leito de Destino (Vago) *</Label>
              <Select value={formTransfNovoLeito} onValueChange={setFormTransfNovoLeito}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecione o leito de destino" />
                </SelectTrigger>
                <SelectContent>
                  {leitos
                    .filter((l) => l.status === 'vago' && l.id !== transferenciaAlvo?.leito_atual)
                    .map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.codigo} — {l.tipo} ({l.expand?.setor?.nome})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Motivo da Movimentação *</Label>
              <Input
                required
                placeholder="Ex: Agravamento clínico com necessidade de UTI, isolamento..."
                value={formTransfMotivo}
                onChange={(e) => setFormTransfMotivo(e.target.value)}
                className="text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalTransferenciaAberto(false)}
                disabled={processando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={processando}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {processando ? 'Transferindo...' : 'Confirmar Transferência'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL ALTA HOSPITALAR */}
      <Dialog open={modalAltaAberto} onOpenChange={setModalAltaAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conceder Alta Hospitalar</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Finaliza a internação ativa e libera o leito para processo de desinfecção e
              higienização.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExecutarAlta} className="space-y-3 pt-2">
            <div className="p-3 bg-red-50 rounded-lg text-xs space-y-1 border border-red-200 text-red-900">
              <p>
                <strong>Paciente:</strong> {altaAlvo?.expand?.paciente?.nome}
              </p>
              <p>
                <strong>Leito:</strong> {altaAlvo?.expand?.leito_atual?.codigo}
              </p>
              <p>
                <strong>Admissão em:</strong> {altaAlvo?.data_admissao}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Motivo / Condição de Alta *</Label>
              <Input
                required
                placeholder="Ex: Melhora clínica, transferência intermunicipal, alta a pedido..."
                value={formAltaMotivo}
                onChange={(e) => setFormAltaMotivo(e.target.value)}
                className="text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalAltaAberto(false)}
                disabled={processando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={processando}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                {processando ? 'Processando...' : 'Confirmar Alta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE EMISSÃO DE IMPRESSO ASSISTENCIAL (RESUMO DE ALTA / RECEITA NA INTERNAÇÃO) */}
      <ModalEmissaoImpresso
        aberto={modalImpressoAberto}
        onClose={() => {
          setModalImpressoAberto(false)
          setInternacaoParaImpresso(null)
        }}
        paciente={internacaoParaImpresso?.expand?.paciente || null}
        origem="internacao"
        internacaoId={internacaoParaImpresso?.id}
        dadosInternacao={
          internacaoParaImpresso
            ? {
                dataAdmissao: internacaoParaImpresso.data_admissao,
                leitoSetor: `${internacaoParaImpresso.expand?.leito_atual?.codigo || 'Leito'} (${internacaoParaImpresso.expand?.setor_atual?.nome || 'Setor'})`,
                motivoInternacao: internacaoParaImpresso.motivo_admissao,
                diagnosticoAdmissao: internacaoParaImpresso.diagnostico_inicial,
                cid10Admissao: internacaoParaImpresso.cid10_admissao,
              }
            : undefined
        }
        profissionaisList={profissionais}
        usuarioAtual={
          user ? { id: user.id, nome: user.name, role: user.role, email: user.email } : undefined
        }
        tipoInicial={tipoImpressoInicial}
        onImpressoEmitido={() => {
          toast({
            title: 'Impresso Emitido com Sucesso',
            description: 'Documento registrado no prontuário do paciente e na auditoria.',
          })
        }}
      />

      {/* MODAL HISTÓRICO DE MOVIMENTAÇÕES DO LEITO */}
      <Dialog open={modalHistoricoAberto} onOpenChange={setModalHistoricoAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Trilha de Movimentação do Paciente</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Histórico completo de leitos e setores ocupados durante a internação
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {historicoAlvo &&
              (() => {
                let hist: MovimentacaoLeito[] = []
                try {
                  if (typeof historicoAlvo.historico_leitos === 'string') {
                    hist = JSON.parse(historicoAlvo.historico_leitos) || []
                  } else if (Array.isArray(historicoAlvo.historico_leitos)) {
                    hist = historicoAlvo.historico_leitos
                  }
                } catch {
                  hist = []
                }

                if (hist.length === 0) {
                  return (
                    <p className="text-xs text-slate-500 py-4 text-center">
                      Nenhum histórico registrado além da admissão.
                    </p>
                  )
                }

                return (
                  <div className="space-y-2 divide-y divide-slate-100">
                    {hist.map((m, idx) => (
                      <div key={idx} className="pt-2 text-xs space-y-0.5">
                        <div className="flex justify-between items-center text-slate-800 font-semibold">
                          <span>
                            {m.de} → {m.para}
                          </span>
                          <span className="text-[11px] font-normal text-slate-500">{m.data}</span>
                        </div>
                        {m.motivo && <p className="text-slate-600">Motivo: {m.motivo}</p>}
                        {m.responsavel && (
                          <p className="text-[11px] text-slate-400">Responsável: {m.responsavel}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })()}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalHistoricoAberto(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
