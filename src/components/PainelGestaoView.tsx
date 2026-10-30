import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  carregarDadosPainelGestao,
  registrarAcessoPainelGestao,
  PainelGestaoDados,
  PeriodoApuracao,
} from '@/services/painelGestao'
import { ActiveTab } from './NavigationBar'
import { SecoesPainelGestao } from './SecoesPainelGestao'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Activity,
  RefreshCw,
  AlertCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'

interface PainelGestaoViewProps {
  onNavegar?: (aba: ActiveTab) => void
}

export const PainelGestaoView: React.FC<PainelGestaoViewProps> = ({ onNavegar }) => {
  const { user, temPermissao } = useAuth()
  const { toast } = useToast()

  const [periodo, setPeriodo] = useState<PeriodoApuracao>('hoje')
  const [dados, setDados] = useState<PainelGestaoDados | null>(null)
  const [loading, setLoading] = useState(true)
  const [atualizandoSilencioso, setAtualizandoSilencioso] = useState(false)
  const [erroAtualizacao, setErroAtualizacao] = useState<string | null>(null)
  const [intervaloSegundos, setIntervaloSegundos] = useState<number>(30)
  const [tempoRestante, setTempoRestante] = useState<number>(30)
  const [autoRefreshAtivo, setAutoRefreshAtivo] = useState(true)

  // Identificador da sessão atual: combinação única de id do usuário e papel (role)
  const idSessaoAtual = user ? `${user.id}:${user.role}` : 'anonimo'

  // Controle de sequência e sessão para evitar vazamento entre perfis ou inversão assíncrona
  const sequenciaCarregamentoRef = useRef<number>(0)
  const sessaoAtivaRef = useRef<string>(idSessaoAtual)

  const isGestorOuAdmin = temPermissao(['admin', 'gestor'])

  // Limpeza estrita e descarte de requisições em voo na troca de usuário/perfil
  useEffect(() => {
    // Incrementa sequência para invalidar imediatamente qualquer requisição em voo da sessão anterior
    sequenciaCarregamentoRef.current += 1
    sessaoAtivaRef.current = idSessaoAtual

    // Limpa sumariamente os dados anteriores do painel (sobretudo indicadores financeiros)
    setDados(null)
    setErroAtualizacao(null)
    setLoading(true)

    if (user?.name) {
      registrarAcessoPainelGestao(user.name, user.role || 'desconhecido')
    }
  }, [idSessaoAtual, user?.name, user?.role])

  // Função de carregamento com tratamento de erro resiliente e isolamento por sessão
  const carregar = useCallback(
    async (silencioso = false) => {
      if (silencioso) {
        setAtualizandoSilencioso(true)
      } else {
        setLoading(true)
      }

      const seqMomento = ++sequenciaCarregamentoRef.current
      const sessaoDesteDisparo = sessaoAtivaRef.current

      try {
        const resultado = await carregarDadosPainelGestao(periodo)

        // Controle de sequência e sessão:
        // 1. Se a sessão/perfil mudou durante a requisição em voo, descarta sumariamente
        // 2. Se outra requisição mais nova foi disparada (troca de período ou auto-refresh), descarta
        if (
          seqMomento !== sequenciaCarregamentoRef.current ||
          sessaoDesteDisparo !== sessaoAtivaRef.current
        ) {
          return
        }

        setDados(resultado)
        setErroAtualizacao(null)
      } catch (err: any) {
        if (
          seqMomento !== sequenciaCarregamentoRef.current ||
          sessaoDesteDisparo !== sessaoAtivaRef.current
        ) {
          return
        }
        console.error('Falha ao atualizar painel de gestão:', err)
        const msg =
          err?.message ||
          'Não foi possível atualizar os dados agora. Mantendo os últimos indicadores válidos.'
        setErroAtualizacao(msg)

        if (!silencioso) {
          toast({
            title: 'Erro de Conexão',
            description: msg,
            variant: 'destructive',
          })
        }
      } finally {
        if (
          seqMomento === sequenciaCarregamentoRef.current &&
          sessaoDesteDisparo === sessaoAtivaRef.current
        ) {
          setLoading(false)
          setAtualizandoSilencioso(false)
          setTempoRestante(intervaloSegundos)
        }
      }
    },
    [periodo, intervaloSegundos, toast],
  )

  // Carga inicial e quando muda o período ou a sessão
  useEffect(() => {
    carregar(false)
  }, [carregar, idSessaoAtual])

  // Temporizador de atualização automática em intervalos de 30-60s
  useEffect(() => {
    if (!autoRefreshAtivo) return

    const timer = setInterval(() => {
      setTempoRestante((prev) => {
        if (prev <= 1) {
          carregar(true)
          return intervaloSegundos
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [autoRefreshAtivo, intervaloSegundos, carregar])

  // Debounce e ref para evitar consultas repetidas desnecessárias com realtime
  const debounceRealtimeRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleRealtimeEvent = useCallback(() => {
    // Coalesce eventos realtime num intervalo de 2.5s para evitar rajada de requests redundantes
    if (debounceRealtimeRef.current) {
      clearTimeout(debounceRealtimeRef.current)
    }
    debounceRealtimeRef.current = setTimeout(() => {
      carregar(true)
    }, 2500)
  }, [carregar])

  useEffect(() => {
    return () => {
      if (debounceRealtimeRef.current) {
        clearTimeout(debounceRealtimeRef.current)
      }
    }
  }, [])

  useRealtime('pronto_atendimento', handleRealtimeEvent, autoRefreshAtivo)
  useRealtime('leitos', handleRealtimeEvent, autoRefreshAtivo)
  useRealtime('internacoes', handleRealtimeEvent, autoRefreshAtivo)
  useRealtime('exames', handleRealtimeEvent, autoRefreshAtivo)
  useRealtime('prescricoes', handleRealtimeEvent, autoRefreshAtivo)
  useRealtime('farmacia_dispensacoes', handleRealtimeEvent, autoRefreshAtivo)
  useRealtime('cirurgias', handleRealtimeEvent, autoRefreshAtivo)

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO PAINEL DE GESTÃO */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-blue-600/80 text-blue-100 border-blue-500/40 text-[11px] px-2.5 py-0.5">
                <Activity className="w-3 h-3 mr-1 animate-pulse" />
                TEMPO REAL
              </Badge>
              <Badge variant="outline" className="text-slate-300 border-slate-700 text-[11px]">
                <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" />
                Dados Agregados & Anonimizados (LGPD / SUS)
              </Badge>
              <span className="text-xs text-blue-300">
                Prefeitura Municipal • Mirante da Serra - RO
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Painel de Gestão Hospitalar & Sala de Controle
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Consolidação gerencial em tempo real: fila do Pronto Atendimento com classificação de
              risco Manchester, tempos médios de espera, ocupação de leitos, fluxo de internações,
              fila diagnóstica, ciclo farmacêutico e faturamento SUS.
            </p>
          </div>

          {/* Controles de Atualização & Período */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {/* Seletor de Período */}
            <div className="bg-slate-800/80 p-1 rounded-lg border border-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400 ml-1.5" />
              <Select value={periodo} onValueChange={(val: any) => setPeriodo(val)}>
                <SelectTrigger className="h-8 text-xs bg-transparent border-0 text-white focus:ring-0 focus:ring-offset-0 w-[130px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje (24 horas)</SelectItem>
                  <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  <SelectItem value="geral">Todo o Histórico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botão de Auto-refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefreshAtivo(!autoRefreshAtivo)}
              className={`h-8 text-xs border-slate-700 ${
                autoRefreshAtivo
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
              title="Ativar/desativar atualização automática"
            >
              <Clock className="w-3 h-3 mr-1" />
              {autoRefreshAtivo ? `Auto: ${tempoRestante}s` : 'Pausado'}
            </Button>

            {/* Botão Forçar Atualização */}
            <Button
              variant="default"
              size="sm"
              onClick={() => carregar(false)}
              disabled={loading || atualizandoSilencioso}
              className="h-8 bg-blue-600 hover:bg-blue-500 text-white text-xs shadow-md shadow-blue-500/20"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${
                  loading || atualizandoSilencioso ? 'animate-spin' : ''
                }`}
              />
              Atualizar Agora
            </Button>
          </div>
        </div>

        {/* Barra de Status e Timestamp */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  erroAtualizacao ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                }`}
              />
              {erroAtualizacao ? (
                <span className="text-amber-300 font-medium">
                  Estado desatualizado (conexão instável)
                </span>
              ) : (
                'Conectado em tempo real'
              )}
            </span>
            <span>•</span>
            <span className={erroAtualizacao ? 'text-amber-200' : ''}>
              Última atualização íntegra:{' '}
              <strong className="text-white">{dados?.dataHoraAtualizacao || '—'}</strong>
            </span>
            <span>•</span>
            <span>
              Período apurado:{' '}
              <strong className="text-blue-300">
                {periodo === 'hoje'
                  ? 'Hoje (24h)'
                  : periodo === '7dias'
                    ? 'Últimos 7 dias'
                    : periodo === '30dias'
                      ? 'Últimos 30 dias'
                      : 'Histórico Geral'}
              </strong>
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            Intervalo regular de atualização: <strong>{intervaloSegundos}s</strong>
          </div>
        </div>
      </div>

      {/* BANNER RESILIENTE DE ERRO / ESTADO DESATUALIZADO OU INDISPONÍVEL */}
      {erroAtualizacao && (
        <div
          className={`p-3.5 rounded-xl flex items-start gap-3 text-xs shadow-sm border ${
            dados
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <AlertCircle
            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${dados ? 'text-amber-600' : 'text-rose-600'}`}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <strong className={dados ? 'text-amber-950' : 'text-rose-950'}>
                {dados
                  ? 'Aviso: Falha parcial de atualização do painel'
                  : 'Indicadores Indisponíveis'}
              </strong>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  dados
                    ? 'border-amber-400 text-amber-800 bg-amber-100/60'
                    : 'border-rose-400 text-rose-800 bg-rose-100/60'
                }`}
              >
                {dados ? 'Estado Desatualizado' : 'Sem Dados Prévios'}
              </Badge>
            </div>
            <p className={dados ? 'text-amber-900 mt-1' : 'text-rose-900 mt-1'}>
              {erroAtualizacao}
            </p>
            <p className={`text-[11px] mt-1 ${dados ? 'text-amber-800' : 'text-rose-800'}`}>
              {dados ? (
                <>
                  Os dados autorizados anteriores <strong>foram preservados</strong> (última
                  fotografia válida mantida às{' '}
                  <strong>{dados.dataHoraAtualizacao || 'indisponível'}</strong>). Nenhum fallback
                  baixa registros clínicos no navegador e nenhum falso sucesso é exibido.
                </>
              ) : (
                <>
                  Nenhum indicador prévio autorizado está em cache para esta sessão. Conforme a
                  política de privacidade da LGPD, o painel{' '}
                  <strong>não baixa dados clínicos detalhados</strong> como contorno de acesso.
                  Aguardando restabelecimento do endpoint agregado.
                </>
              )}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => carregar(false)}
            className={`h-7 text-xs bg-white ${
              dados
                ? 'border-amber-400 hover:bg-amber-100 text-amber-900'
                : 'border-rose-400 hover:bg-rose-100 text-rose-900'
            }`}
          >
            Tentar Novamente
          </Button>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL: SEÇÕES DE INDICADORES */}
      {loading && !dados ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm font-medium">Carregando indicadores em tempo real...</p>
          <p className="text-xs text-slate-400">
            Consultando agregação no servidor (PocketBase pb_hook)
          </p>
        </div>
      ) : !dados && erroAtualizacao ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-slate-400" />
          <p className="text-base font-semibold text-slate-800">
            Painel temporariamente indisponível
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Não foi possível obter os indicadores agregados do servidor e não há resultado
            autorizado prévio para esta sessão.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => carregar(false)}
            className="text-xs mt-2"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Tentar Novamente
          </Button>
        </div>
      ) : dados ? (
        <SecoesPainelGestao
          pa={dados.pa}
          leitos={dados.leitos}
          internacoes={dados.internacoes}
          exames={dados.exames}
          farmacia={dados.farmacia}
          faturamento={dados.faturamento}
          cirurgico={dados.cirurgico}
          regulacao={dados.regulacao}
          onNavegar={onNavegar}
          isGestorOuAdmin={isGestorOuAdmin}
        />
      ) : null}
    </div>
  )
}
