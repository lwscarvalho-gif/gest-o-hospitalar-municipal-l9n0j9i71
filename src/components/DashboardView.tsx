import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bed,
  Calendar,
  Users,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Stethoscope,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import { listarLeitos, listarPacientes, listarSetores } from '@/services/cadastros'
import { listarAgendamentos } from '@/services/agendamentos'
import { listarInternacoes } from '@/services/internacoes'
import { Leito, Paciente, Agendamento, Internacao, Setor } from '@/types/hospital'

interface DashboardViewProps {
  onNavigate: (tab: any) => void
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [leitos, setLeitos] = useState<Leito[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [internacoes, setInternacoes] = useState<Internacao[]>([])
  const [setores, setSetores] = useState<Setor[]>([])

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [l, p, a, i, s] = await Promise.all([
        listarLeitos(),
        listarPacientes(),
        listarAgendamentos(),
        listarInternacoes(true),
        listarSetores(),
      ])
      setLeitos(l)
      setPacientes(p)
      setAgendamentos(a)
      setInternacoes(i)
      setSetores(s)
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalLeitos = leitos.length
  const leitosOcupados = leitos.filter((l) => l.status === 'ocupado').length
  const leitosVagos = leitos.filter((l) => l.status === 'vago').length
  const leitosManutencao = leitos.filter(
    (l) => l.status === 'manutencao' || l.status === 'higienizacao',
  ).length
  const taxaOcupacao = totalLeitos > 0 ? Math.round((leitosOcupados / totalLeitos) * 100) : 0

  const agendamentosHoje = agendamentos.filter((ag) => ag.status !== 'cancelado')
  const atendimentosPendentes = agendamentos.filter(
    (ag) => ag.status === 'agendado' || ag.status === 'confirmado',
  )

  return (
    <div className="space-y-6">
      {/* Banner de boas-vindas com perfil */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 border border-blue-800/80 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/30 text-blue-200 border-blue-400/40 text-xs uppercase">
                Perfil Ativo: {user?.role?.toUpperCase()}
              </Badge>
              <span className="text-xs text-blue-200">Prefeitura de Mirante da Serra - RO</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Olá, {user?.name || 'Profissional'}
            </h1>
            <p className="text-sm text-blue-200/80 max-w-2xl">
              Sistema de Gestão Hospitalar Municipal. Ambiente centralizado para monitoramento de
              leitos, atendimento ambulatorial e fluxo assistencial SUS.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => onNavigate('painel_gestao')}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium shadow-md shadow-emerald-500/20 text-xs sm:text-sm"
            >
              <Activity className="w-4 h-4 mr-2" />
              Painel em Tempo Real
            </Button>
            <Button
              onClick={() => onNavigate('internacao')}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs sm:text-sm"
            >
              <Bed className="w-4 h-4 mr-2" />
              Ver Mapa de Leitos
            </Button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taxa de Ocupação */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Taxa de Ocupação Geral
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{taxaOcupacao}%</div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-blue-600">{leitosOcupados}</span> de {totalLeitos}{' '}
              leitos ocupados
            </p>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  taxaOcupacao > 85
                    ? 'bg-red-500'
                    : taxaOcupacao > 65
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(taxaOcupacao, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Leitos Vagos para Admissão */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Leitos Disponíveis
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{leitosVagos}</div>
            <p className="text-xs text-slate-500 mt-1">Prontos para admissão imediata</p>
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
              <span>{leitosManutencao} em higienização/manut.</span>
            </div>
          </CardContent>
        </Card>

        {/* Internações Ativas */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pacientes Internados
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bed className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{internacoes.length}</div>
            <p className="text-xs text-slate-500 mt-1">Com acompanhamento clínico ativo</p>
            <Button
              variant="link"
              onClick={() => onNavigate('assistencial')}
              className="p-0 h-auto text-xs text-indigo-600 hover:text-indigo-700 mt-2 flex items-center gap-1"
            >
              Ver prontuários <ArrowRight className="w-3 h-3" />
            </Button>
          </CardContent>
        </Card>

        {/* Agendamentos do Período */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Consultas & Retornos
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{agendamentosHoje.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-semibold text-amber-600">{atendimentosPendentes.length}</span> a
              serem atendidos
            </p>
            <Button
              variant="link"
              onClick={() => onNavigate('agendamentos')}
              className="p-0 h-auto text-xs text-amber-600 hover:text-amber-700 mt-2 flex items-center gap-1"
            >
              Acessar fila da agenda <ArrowRight className="w-3 h-3" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Grid com Internações Recentes e Visão Rápida dos Leitos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Internações Ativas */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Internações em Andamento
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Pacientes atualmente admitidos nas enfermarias e UTI
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('internacao')}
              className="text-xs"
            >
              Admitir / Transferir
            </Button>
          </CardHeader>
          <CardContent>
            {internacoes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Nenhum paciente internado no momento.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {internacoes.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">
                          {item.expand?.paciente?.nome || 'Paciente'}
                        </span>
                        <Badge className="bg-blue-100 text-blue-800 text-[10px] font-medium border-0">
                          {item.expand?.leito_atual?.codigo || 'Leito'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-slate-600">
                          {item.expand?.setor_atual?.nome || 'Setor'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        <strong>Motivo:</strong> {item.motivo_admissao}
                      </p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>Cartão SUS: {item.expand?.paciente?.cartao_sus || 'N/A'}</span>
                        <span>•</span>
                        <span>Admissão: {item.data_admissao}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onNavigate('assistencial')}
                        className="text-xs h-8"
                      >
                        <Stethoscope className="w-3.5 h-3.5 mr-1" />
                        Evolução
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo de Setores e Leitos */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bed className="w-5 h-5 text-indigo-600" />
              Ocupação por Setor
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Distribuição da capacidade hospitalar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {setores.map((setor) => {
              const leitosSetor = leitos.filter((l) => l.setor === setor.id)
              const ocupados = leitosSetor.filter((l) => l.status === 'ocupado').length
              const total = leitosSetor.length
              const perc = total > 0 ? Math.round((ocupados / total) * 100) : 0

              return (
                <div
                  key={setor.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">{setor.nome}</span>
                    <span className="font-bold text-slate-600">
                      {ocupados}/{total} leitos ({perc}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${perc > 80 ? 'bg-red-500' : perc > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${perc}%` }}
                    />
                  </div>
                </div>
              )
            })}

            <div className="pt-2 border-t border-slate-100 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('setores_leitos')}
                className="text-xs text-blue-600 hover:text-blue-700 w-full"
              >
                Gerenciar Setores e Leitos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
