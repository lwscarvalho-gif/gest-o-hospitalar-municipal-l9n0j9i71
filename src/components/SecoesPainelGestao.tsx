import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Bed,
  Flame,
  Clock,
  AlertTriangle,
  FlaskConical,
  Pill,
  Receipt,
  Scissors,
  HelpCircle,
  Share2,
} from 'lucide-react'
import {
  IndicadoresFilaPA,
  IndicadoresLeitos,
  IndicadoresInternacoes,
  IndicadoresExames,
  IndicadoresFarmaciaPrescricoes,
  IndicadoresFaturamento,
  IndicadoresCirurgias,
  IndicadoresRegulacaoPainel,
  CRITERIOS_INDICADORES,
} from '@/services/painelGestao'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { ActiveTab } from './NavigationBar'

interface SecoesPainelGestaoProps {
  pa: IndicadoresFilaPA
  leitos: IndicadoresLeitos
  internacoes: IndicadoresInternacoes
  exames: IndicadoresExames
  farmacia: IndicadoresFarmaciaPrescricoes
  faturamento: IndicadoresFaturamento
  cirurgico: IndicadoresCirurgias
  regulacao?: IndicadoresRegulacaoPainel
  onNavegar?: (aba: ActiveTab) => void
  isGestorOuAdmin: boolean
}

export const SecoesPainelGestao: React.FC<SecoesPainelGestaoProps> = ({
  pa,
  leitos,
  internacoes,
  exames,
  farmacia,
  faturamento,
  cirurgico,
  regulacao,
  onNavegar,
  isGestorOuAdmin,
}) => {
  const [criterioModal, setCriterioModal] = useState<string | null>(null)

  const abrirCriterio = (chave: string) => {
    setCriterioModal(chave)
  }

  const criterioAtivo = criterioModal ? CRITERIOS_INDICADORES[criterioModal] : null

  return (
    <div className="space-y-6">
      {/* 1. FILA DO PRONTO ATENDIMENTO & TEMPOS DE ESPERA */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                Pronto Atendimento (PA) — Fila de Espera & Manchester
                {pa.casosCriticosAlerta > 0 && (
                  <Badge className="bg-red-600 text-white text-[10px] animate-pulse">
                    {pa.casosCriticosAlerta} crítico(s) aguardando
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-slate-500">
                Tempos de espera e distribuição por classificação de risco SUS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => abrirCriterio('pa_fila')}
              className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200"
              title="Critério de cálculo do PA"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Critério de Cálculo</span>
            </button>
            {onNavegar && (
              <button
                onClick={() => onNavegar('pronto_atendimento')}
                className="text-xs text-blue-600 hover:underline font-medium px-2 py-1"
              >
                Abrir PA →
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Métricas Principais da Fila */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[11px] font-medium text-slate-500 uppercase">
                Aguardando Triagem
              </span>
              <div className="text-2xl font-bold text-slate-800 mt-1">{pa.aguardandoTriagem}</div>
              <span className="text-[10px] text-slate-400">Acolhidos na recepção</span>
            </div>

            <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-100">
              <span className="text-[11px] font-medium text-amber-800 uppercase">
                Aguardando Atendimento
              </span>
              <div className="text-2xl font-bold text-amber-700 mt-1">
                {pa.aguardandoAtendimento}
              </div>
              <span className="text-[10px] text-amber-600">Triados / aguardando médico</span>
            </div>

            <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-100">
              <span className="text-[11px] font-medium text-blue-800 uppercase">
                Em Atendimento Médico
              </span>
              <div className="text-2xl font-bold text-blue-700 mt-1">{pa.emAtendimento}</div>
              <span className="text-[10px] text-blue-600">Consultório em andamento</span>
            </div>

            <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-100">
              <span className="text-[11px] font-medium text-emerald-800 uppercase">
                Atendimentos Concluídos
              </span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {pa.finalizadosPeriodo}
              </div>
              <span className="text-[10px] text-emerald-600">No período selecionado</span>
            </div>
          </div>

          {/* Manchester Bar: Distribuição por Classificação de Risco */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700">
                Distribuição da Fila por Classificação de Risco
              </span>
              <span className="text-slate-400 text-[11px]">
                Total na fila: {pa.totalAguardando + pa.emAtendimento} paciente(s)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="bg-red-500 text-white p-2.5 rounded-lg flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase">Vermelho</span>
                  <span className="text-[10px] bg-red-700/60 px-1.5 py-0.5 rounded">0 min</span>
                </div>
                <div className="text-xl font-bold mt-1">{pa.porClassificacao.vermelho}</div>
                <span className="text-[10px] opacity-90">Emergência imediata</span>
              </div>

              <div className="bg-orange-500 text-white p-2.5 rounded-lg flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase">Laranja</span>
                  <span className="text-[10px] bg-orange-700/60 px-1.5 py-0.5 rounded">10 min</span>
                </div>
                <div className="text-xl font-bold mt-1">{pa.porClassificacao.laranja}</div>
                <span className="text-[10px] opacity-90">Muito urgente</span>
              </div>

              <div className="bg-yellow-400 text-yellow-950 p-2.5 rounded-lg flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase">Amarelo</span>
                  <span className="text-[10px] bg-yellow-600/30 px-1.5 py-0.5 rounded">60 min</span>
                </div>
                <div className="text-xl font-bold mt-1">{pa.porClassificacao.amarelo}</div>
                <span className="text-[10px] opacity-90">Urgente</span>
              </div>

              <div className="bg-emerald-600 text-white p-2.5 rounded-lg flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase">Verde</span>
                  <span className="text-[10px] bg-emerald-800/60 px-1.5 py-0.5 rounded">
                    120 min
                  </span>
                </div>
                <div className="text-xl font-bold mt-1">{pa.porClassificacao.verde}</div>
                <span className="text-[10px] opacity-90">Pouco urgente</span>
              </div>

              <div className="bg-blue-600 text-white p-2.5 rounded-lg flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase">Azul</span>
                  <span className="text-[10px] bg-blue-800/60 px-1.5 py-0.5 rounded">240 min</span>
                </div>
                <div className="text-xl font-bold mt-1">{pa.porClassificacao.azul}</div>
                <span className="text-[10px] opacity-90">Não urgente</span>
              </div>
            </div>
          </div>

          {/* Tempos Médios da Fila */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg">
              <Clock className="w-4 h-4 text-slate-500" />
              <div>
                <span className="text-slate-500 text-[11px] block">
                  Tempo Médio de Espera (Acolhimento → Triagem)
                </span>
                <strong className="text-slate-800 text-sm">
                  {pa.tempoMedioEsperaTriagemMin !== null
                    ? `${pa.tempoMedioEsperaTriagemMin} minutos`
                    : 'Sem histórico suficiente'}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg">
              <Clock className="w-4 h-4 text-amber-600" />
              <div>
                <span className="text-slate-500 text-[11px] block">
                  Tempo Médio de Espera (Triagem → Atendimento)
                </span>
                <strong className="text-slate-800 text-sm">
                  {pa.tempoMedioEsperaAtendimentoMin !== null
                    ? `${pa.tempoMedioEsperaAtendimentoMin} minutos`
                    : 'Sem histórico suficiente'}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <span className="text-slate-500 text-[11px] block">
                  Duração Média da Consulta Médica no PA
                </span>
                <strong className="text-slate-800 text-sm">
                  {pa.tempoMedioAtendimentoMin !== null
                    ? `${pa.tempoMedioAtendimentoMin} minutos`
                    : 'Sem histórico suficiente'}
                </strong>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. MAPA DE LEITOS & INTERNAÇÕES / ALTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leitos */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <Bed className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Ocupação de Leitos Hospitalares
                </CardTitle>
                <p className="text-xs text-slate-500">Capacidade e status operacional imediato</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => abrirCriterio('leitos_ocupacao')}
                className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 p-1 rounded"
                title="Critério de cálculo de leitos"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              </button>
              {onNavegar && (
                <button
                  onClick={() => onNavegar('internacao')}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Mapa →
                </button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-extrabold text-slate-900">
                  {leitos.taxaOcupacaoGeral}%
                </span>
                <span className="text-xs text-slate-500 ml-2">Taxa de ocupação geral</span>
              </div>
              <Badge
                className={`text-xs ${
                  leitos.taxaOcupacaoGeral > 85
                    ? 'bg-red-600 text-white'
                    : leitos.taxaOcupacaoGeral > 65
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-600 text-white'
                }`}
              >
                {leitos.taxaOcupacaoGeral > 85
                  ? 'Alerta: Sobrecarga'
                  : leitos.taxaOcupacaoGeral > 65
                    ? 'Atenção'
                    : 'Capacidade Confortável'}
              </Badge>
            </div>

            <Progress value={leitos.taxaOcupacaoGeral} className="h-2.5" />

            {/* Grid 4 status */}
            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
              <div className="p-2 rounded bg-red-50 border border-red-100">
                <span className="text-[10px] text-red-700 uppercase font-semibold block">
                  Ocupados
                </span>
                <span className="text-lg font-bold text-red-800">{leitos.ocupados}</span>
              </div>
              <div className="p-2 rounded bg-emerald-50 border border-emerald-100">
                <span className="text-[10px] text-emerald-700 uppercase font-semibold block">
                  Vagos
                </span>
                <span className="text-lg font-bold text-emerald-800">{leitos.vagos}</span>
              </div>
              <div className="p-2 rounded bg-amber-50 border border-amber-100">
                <span className="text-[10px] text-amber-700 uppercase font-semibold block">
                  Higienização
                </span>
                <span className="text-lg font-bold text-amber-800">{leitos.higienizacao}</span>
              </div>
              <div className="p-2 rounded bg-slate-100 border border-slate-200">
                <span className="text-[10px] text-slate-700 uppercase font-semibold block">
                  Manutenção
                </span>
                <span className="text-lg font-bold text-slate-800">{leitos.manutencao}</span>
              </div>
            </div>

            {/* Ocupação por Setor */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700 block">
                Detalhamento por Setor
              </span>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {leitos.distribuicaoPorSetor.map((st) => (
                  <div key={st.setorId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 truncate">{st.setorNome}</span>
                      <span className="text-slate-500 font-mono">
                        {st.ocupados}/{st.total} ({st.taxa}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          st.taxa > 85
                            ? 'bg-red-500'
                            : st.taxa > 60
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(st.taxa, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Censo & Internações */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                <Bed className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Censo & Giro de Internações
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Admissões, altas e permanência média hospitalar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => abrirCriterio('internacoes_fluxo')}
                className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 p-1 rounded"
                title="Critério de fluxo de internações"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              </button>
              {onNavegar && (
                <button
                  onClick={() => onNavegar('assistencial')}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Prontuários →
                </button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-teal-50/70 rounded-lg border border-teal-100">
                <span className="text-[11px] text-teal-800 uppercase font-semibold">
                  Pacientes Internados
                </span>
                <div className="text-2xl font-bold text-teal-900 mt-1">
                  {internacoes.internacoesAtivas}
                </div>
                <span className="text-[10px] text-teal-600">Censo ativo atual</span>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-100">
                <span className="text-[11px] text-blue-800 uppercase font-semibold">
                  Novas Admissões
                </span>
                <div className="text-2xl font-bold text-blue-900 mt-1">
                  {internacoes.admissoesPeriodo}
                </div>
                <span className="text-[10px] text-blue-600">No período de apuração</span>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-100">
                <span className="text-[11px] text-emerald-800 uppercase font-semibold">
                  Altas Clínicas
                </span>
                <div className="text-2xl font-bold text-emerald-900 mt-1">
                  {internacoes.altasPeriodo}
                </div>
                <span className="text-[10px] text-emerald-600">Liberações com sucesso</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-[11px] block">
                    Tempo Médio de Permanência
                  </span>
                  <strong className="text-slate-800 text-sm">
                    {internacoes.mediaPermanenciaDiasEstimada !== null
                      ? `${internacoes.mediaPermanenciaDiasEstimada} dias`
                      : 'Em apuração'}
                  </strong>
                </div>
                <Clock className="w-5 h-5 text-slate-400" />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-[11px] block">Óbitos / Transferências</span>
                  <strong className="text-slate-800 text-sm">
                    {internacoes.obitosPeriodo} óbito(s) • {internacoes.transferenciasPeriodo}{' '}
                    transf.
                  </strong>
                </div>
                <AlertTriangle className="w-5 h-5 text-slate-400" />
              </div>
            </div>

            {/* Distribuição por Setor */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 block">
                Pacientes Ativos por Setor Hospitalar
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(internacoes.distribuicaoPorEspecialidadeSetor).map(
                  ([setorNome, qtd]) => (
                    <Badge key={setorNome} variant="outline" className="text-xs py-1 px-2">
                      {setorNome}: <strong className="ml-1 text-blue-700">{qtd}</strong>
                    </Badge>
                  ),
                )}
                {Object.keys(internacoes.distribuicaoPorEspecialidadeSetor).length === 0 && (
                  <span className="text-xs text-slate-400">
                    Nenhuma admissão no período selecionado.
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. EXAMES PENDENTES & PRESCRIÇÕES/DISPENSAÇÕES/ENFERMAGEM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exames */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Exames & Laudos
                  {exames.urgentesPendentes > 0 && (
                    <Badge className="bg-red-500 text-white text-[10px]">
                      {exames.urgentesPendentes} urgente(s)
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-slate-500">Fila diagnóstica: laboratório e imagem SUS</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => abrirCriterio('exames_pendentes')}
                className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 p-1 rounded"
                title="Critério de exames"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              </button>
              {onNavegar && (
                <button
                  onClick={() => onNavegar('exames_laudos')}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Fila →
                </button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-slate-500 text-[10px] uppercase block">Solicitados</span>
                <span className="text-lg font-bold text-amber-700">{exames.solicitados}</span>
                <span className="text-[10px] text-amber-600 block">Aguardando coleta</span>
              </div>

              <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                <span className="text-slate-500 text-[10px] uppercase block">Coletados</span>
                <span className="text-lg font-bold text-blue-700">{exames.coletados}</span>
                <span className="text-[10px] text-blue-600 block">Triagem técnica</span>
              </div>

              <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-100">
                <span className="text-slate-500 text-[10px] uppercase block">Em Análise</span>
                <span className="text-lg font-bold text-purple-700">{exames.emAnalise}</span>
                <span className="text-[10px] text-purple-600 block">Laudo pendente</span>
              </div>

              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                <span className="text-slate-500 text-[10px] uppercase block">Liberados</span>
                <span className="text-lg font-bold text-emerald-700">{exames.liberados}</span>
                <span className="text-[10px] text-emerald-600 block">Com resultado</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600">Tempo Médio de Liberação do Laudo:</span>
              <strong className="text-slate-800 font-mono">
                {exames.tempoMedioLiberacaoHoras !== null
                  ? `${exames.tempoMedioLiberacaoHoras} horas`
                  : 'Em apuração'}
              </strong>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">
                Laboratório: <strong>{exames.porCategoria.laboratorial}</strong>
              </Badge>
              <Badge variant="outline">
                Imagem / RX: <strong>{exames.porCategoria.imagem}</strong>
              </Badge>
              <Badge variant="outline">
                Gráficos (ECG): <strong>{exames.porCategoria.grafico}</strong>
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Farmácia & Enfermagem */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center font-bold">
                <Pill className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Prescrições, Farmácia & Enfermagem
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Ciclo de medicação: médico → farmácia → beira-leito
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => abrirCriterio('farmacia_medicamentos')}
                className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 p-1 rounded"
                title="Critério de medicação"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              </button>
              {onNavegar && (
                <button
                  onClick={() => onNavegar('farmacia')}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Farmácia →
                </button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 text-[10px] uppercase block font-semibold">
                  Prescrições Ativas
                </span>
                <span className="text-2xl font-bold text-slate-800 mt-1 block">
                  {farmacia.totalPrescricoesAtivas}
                </span>
                <span className="text-[10px] text-slate-400">Em vigor hoje</span>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-100">
                <span className="text-amber-800 text-[10px] uppercase block font-semibold">
                  Checagens Pendentes
                </span>
                <span className="text-2xl font-bold text-amber-700 mt-1 block">
                  {farmacia.administracoesPendentesChecagem}
                </span>
                <span className="text-[10px] text-amber-600">Prescrições a checar</span>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-100">
                <span className="text-emerald-800 text-[10px] uppercase block font-semibold">
                  Doses Checadas
                </span>
                <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                  {farmacia.administracoesRealizadasPeriodo}
                </span>
                <span className="text-[10px] text-emerald-600">Pela enfermagem</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-500 text-[11px] block">Dispensações da Farmácia</span>
                <strong className="text-slate-800 text-sm">
                  {farmacia.totalDispensacoesPeriodo} saídas ({farmacia.itensDispensadosVolume}{' '}
                  unidades)
                </strong>
              </div>

              <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-500 text-[11px] block">
                  Recusas / Não Administrados
                </span>
                <strong className="text-slate-800 text-sm">
                  {farmacia.recusasOuNaoAdministrados} registro(s)
                </strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. FATURAMENTO SUS & BLOCO CIRÚRGICO */}
      <div className={`grid grid-cols-1 ${isGestorOuAdmin ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Faturamento SUS — Restrito apenas a administradores e gestores da saúde */}
        {isGestorOuAdmin && (
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Faturamento SUS — Produção Financeira
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Competência {faturamento.competenciaAtual} • AIH & BPA SIGTAP
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => abrirCriterio('faturamento_producao')}
                  className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 p-1 rounded"
                  title="Critério de faturamento"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                </button>
                {onNavegar && isGestorOuAdmin && (
                  <button
                    onClick={() => onNavegar('faturamento_sus')}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Faturamento →
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <div>
                  <span className="text-[11px] uppercase font-bold text-emerald-800 block">
                    Valor Total Produzido SUS
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
                    R${' '}
                    {faturamento.valorTotalGeral.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <Badge className="bg-emerald-700 text-white text-xs">
                  {faturamento.statusCompetencia.toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 text-[11px] block">AIH Hospitalar</span>
                  <strong className="text-slate-800 text-base">
                    R${' '}
                    {faturamento.valorTotalAIH.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {faturamento.totalContasAIH} conta(s) registradas
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 text-[11px] block">BPA Ambulatorial</span>
                  <strong className="text-slate-800 text-base">
                    R${' '}
                    {faturamento.valorTotalBPA.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {faturamento.itensBpaApurados} procedimento(s)
                  </span>
                </div>
              </div>

              {/* Contas por Status */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block">Abertas</span>
                  <strong className="text-slate-700">{faturamento.totalContasAbertas}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-blue-600 block">Conciliadas</span>
                  <strong className="text-blue-700">{faturamento.totalContasConciliadas}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-red-500 block">Glosadas</span>
                  <strong className="text-red-700">{faturamento.totalContasGlosadas}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 block">Enviadas</span>
                  <strong className="text-emerald-700">{faturamento.totalContasEnviadas}</strong>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bloco: Central de Regulação Interna Municipal */}
        {regulacao && (
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Central de Regulação Interna
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Transferências e encaminhamentos (decisão humana)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => abrirCriterio('regulacao_interna')}
                  className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 p-1 rounded"
                  title="Critério da regulação interna"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                </button>
                {onNavegar && (
                  <button
                    onClick={() => onNavegar('regulacao' as ActiveTab)}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Fila →
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 text-center">
                  <span className="text-[11px] font-semibold text-indigo-800 uppercase block">
                    Fila Ativa Agora
                  </span>
                  <span className="text-2xl font-bold text-indigo-900 mt-1 block">
                    {regulacao.filaAtivaAgora}
                  </span>
                  <span className="text-[10px] text-indigo-600">
                    {regulacao.solicitadas} solicitadas • {regulacao.emAvaliacao} em análise
                  </span>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                  <span className="text-[11px] font-semibold text-emerald-800 uppercase block">
                    Efetivadas no Período
                  </span>
                  <span className="text-2xl font-bold text-emerald-900 mt-1 block">
                    {regulacao.efetivadasPeriodo}
                  </span>
                  <span className="text-[10px] text-emerald-700">Com movimentação de leito</span>
                </div>
              </div>

              {regulacao.emergenciasCriticasPendentes > 0 && (
                <div className="p-2.5 bg-red-50 text-red-900 rounded border border-red-200 flex items-center justify-between text-xs">
                  <span className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Emergências vermelhas pendentes:
                  </span>
                  <Badge className="bg-red-600 text-white font-bold text-xs">
                    {regulacao.emergenciasCriticasPendentes} caso(s)
                  </Badge>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Autorizadas/Aceitas</span>
                  <strong className="text-slate-800 text-sm">
                    {regulacao.aceitasAguardandoEfetivacao}
                  </strong>
                </div>
                <div className="p-2 bg-rose-50 rounded border border-rose-100">
                  <span className="text-[10px] text-rose-700 block">Negadas</span>
                  <strong className="text-rose-800 text-sm">{regulacao.negadasPeriodo}</strong>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Canceladas</span>
                  <strong className="text-slate-700 text-sm">{regulacao.canceladasPeriodo}</strong>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bloco Cirúrgico */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                <Scissors className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Centro Cirúrgico & SRPA
                </CardTitle>
                <p className="text-xs text-slate-500">Salas em cirurgia e recuperação anestésica</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => abrirCriterio('bloco_cirurgico')}
                className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 p-1 rounded"
                title="Critério do bloco cirúrgico"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              </button>
              {onNavegar && (
                <button
                  onClick={() => onNavegar('centro_cirurgico')}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Bloco →
                </button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-sky-50 rounded-lg border border-sky-100 text-center">
                <span className="text-[11px] font-semibold text-sky-800 uppercase block">
                  Em Sala Agora
                </span>
                <span className="text-2xl font-bold text-sky-900 mt-1 block">
                  {cirurgico.emSalaAgora}
                </span>
                <span className="text-[10px] text-sky-600">Ato cirúrgico em andamento</span>
              </div>

              <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 text-center">
                <span className="text-[11px] font-semibold text-indigo-800 uppercase block">
                  Em Recuperação (SRPA)
                </span>
                <span className="text-2xl font-bold text-indigo-900 mt-1 block">
                  {cirurgico.emRecuperacaoAgora}
                </span>
                <span className="text-[10px] text-indigo-600">Escala de Aldrete em checagem</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Agendadas</span>
                <strong className="text-slate-800 text-sm">{cirurgico.agendadasPeriodo}</strong>
              </div>
              <div className="p-2 bg-emerald-50 rounded border border-emerald-100">
                <span className="text-[10px] text-emerald-700 block">Concluídas</span>
                <strong className="text-emerald-800 text-sm">{cirurgico.concluidasPeriodo}</strong>
              </div>
              <div className="p-2 bg-red-50 rounded border border-red-100">
                <span className="text-[10px] text-red-600 block">Canceladas</span>
                <strong className="text-red-800 text-sm">{cirurgico.canceladasPeriodo}</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DIALOG EXPLICATIVO DE CRITÉRIOS DE CÁLCULO E PERÍODO */}
      <Dialog open={!!criterioModal} onOpenChange={(open) => !open && setCriterioModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              {criterioAtivo?.titulo}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Fórmula e critérios operacionais do Sistema de Gestão Hospitalar Municipal
            </DialogDescription>
          </DialogHeader>

          {criterioAtivo && (
            <div className="space-y-3 text-xs text-slate-700 pt-2">
              <div>
                <strong className="text-slate-900 block mb-0.5">Descrição:</strong>
                <p className="text-slate-600 leading-relaxed">{criterioAtivo.descricao}</p>
              </div>

              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <strong className="text-slate-900 block mb-0.5">Fórmula de Cálculo:</strong>
                <code className="text-[11px] text-blue-800 font-mono">{criterioAtivo.formula}</code>
              </div>

              <div>
                <strong className="text-slate-900 block mb-0.5">Fonte dos Dados:</strong>
                <span className="text-slate-600">{criterioAtivo.fonteDados}</span>
              </div>

              {criterioAtivo.metaRecomendada && (
                <div className="p-2 bg-emerald-50 text-emerald-900 rounded border border-emerald-200">
                  <strong>Meta / Referência SUS:</strong> {criterioAtivo.metaRecomendada}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
