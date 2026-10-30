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

  const isGestorOuAdmin = temPermissao(['admin', 'gestor'])

  // Auditoria de acesso ao painel (apenas na montagem)
  useEffect(() => {
    if (user?.name) {
      registrarAcessoPainelGestao(user.name, user.role || 'desconhecido')
    }
  }, [user?.name, user?.role])

  // Função de carregamento com tratamento de erro resiliente
  const carregar = useCallback(
    async (silencioso = false) => {
      if (silencioso) {
        setAtualizandoSilencioso(true)
      } else {
        setLoading(true)
      }

      try {
        const resultado = await carregarDadosPainelGestao(periodo)
        setDados(resultado)
        setErroAtualizacao(null)
      } catch (err: any) {
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
        setLoading(false)
        setAtualizandoSilencioso(false)
        setTempoRestante(intervaloSegundos)
      }
    },
    [periodo, intervaloSegundos, toast],
  )

  // Carga inicial e quando muda o período
  useEffect(() => {
    carregar(false)
  }, [carregar])

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

  // Assinaturas Realtime nas principais coleções para reagir a alterações na rede
  const handleRealtimeEvent = useCallback(() => {
    // Quando qualquer registro relevante mudar, agenda uma atualização silenciosa
    carregar(true)
  }, [carregar])

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
              {erroAtualizacao ? 'Conexão instável' : 'Conectado em tempo real'}
            </span>
            <span>•</span>
            <span>
              Última atualização:{' '}
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

      {/* BANNER RESILIENTE DE ERRO (SE HOUVER FALHA NA ATUALIZAÇÃO SEM QUEBRAR A TELA) */}
      {erroAtualizacao && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-xs shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong>Aviso de Atualização em Tempo Real:</strong> {erroAtualizacao}
            <p className="text-[11px] text-amber-700 mt-0.5">
              A tela continua operacional com a última fotografia íntegra dos dados. Nova tentativa
              automática ocorrerá em instantes.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => carregar(false)}
            className="h-7 text-xs border-amber-300 bg-white hover:bg-amber-100 text-amber-900"
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
            Consultando PA, mapa de leitos, exames, farmácia e faturamento SUS
          </p>
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
          onNavegar={onNavegar}
          isGestorOuAdmin={isGestorOuAdmin}
        />
      ) : null}
    </div>
  )
}
