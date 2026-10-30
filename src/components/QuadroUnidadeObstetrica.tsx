import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Baby,
  HeartPulse,
  Activity,
  Bed,
  CheckCircle2,
  Users,
  ShieldCheck,
  Award,
  Sparkles,
} from 'lucide-react'
import { IndicadoresCentroObstetrico } from '@/services/centroObstetrico'

interface QuadroUnidadeObstetricaProps {
  indicadores: IndicadoresCentroObstetrico
}

export const QuadroUnidadeObstetrica: React.FC<QuadroUnidadeObstetricaProps> = ({
  indicadores,
}) => {
  return (
    <div className="space-y-4">
      {/* 1. CARDS DE MONITORAMENTO OPERACIONAL EM TEMPO REAL */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-pink-200 bg-pink-50/50 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-pink-900">Total Admissões</span>
              <Activity className="w-3.5 h-3.5 text-pink-600" />
            </div>
            <div className="text-xl font-bold text-pink-950 font-mono">
              {indicadores.totalAdmissoes}
            </div>
            <span className="text-[10px] text-pink-700">Registros do período</span>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-900">Trabalho de Parto</span>
              <HeartPulse className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-950 font-mono">
              {indicadores.admissoesAtivasEmTrabalhoParto}
            </div>
            <span className="text-[10px] text-amber-700">Em acompanhamento ativo</span>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-900">Em Observação</span>
              <Bed className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-bold text-blue-950 font-mono">
              {indicadores.admissoesEmObservacao}
            </div>
            <span className="text-[10px] text-blue-700">Pré-parto / Avaliação</span>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-purple-900">Partos Realizados</span>
              <Award className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-xl font-bold text-purple-950 font-mono">
              {indicadores.partosRealizados}
            </div>
            <span className="text-[10px] text-purple-700">Nascimentos no centro</span>
          </CardContent>
        </Card>

        <Card className="border-cyan-200 bg-cyan-50/50 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-cyan-900">Recém-Nascidos</span>
              <Baby className="w-3.5 h-3.5 text-cyan-600" />
            </div>
            <div className="text-xl font-bold text-cyan-950 font-mono">
              {indicadores.totalRecemNascidos}
            </div>
            <span className="text-[10px] text-cyan-700">Vínculos mãe-RN</span>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-900">Altas Concluídas</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-950 font-mono">
              {indicadores.altasConcluidas}
            </div>
            <span className="text-[10px] text-emerald-700">Com leito desocupado</span>
          </CardContent>
        </Card>
      </div>

      {/* 2. DISTRIBUIÇÃO POR TIPOS DE PARTO & BOAS PRÁTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tipos de Parto */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <HeartPulse className="w-3.5 h-3.5 text-pink-600" />
              Tipos de Parto Realizados
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-500">
              Registros clínicos consolidados da unidade
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-800">Parto Vaginal Espontâneo</span>
              <Badge className="bg-emerald-600 text-white font-mono">
                {indicadores.partosPorTipo.vaginal_espontaneo}
              </Badge>
            </div>

            <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-800">Parto Vaginal Instrumentado</span>
              <Badge className="bg-teal-600 text-white font-mono">
                {indicadores.partosPorTipo.vaginal_instrumentado}
              </Badge>
            </div>

            <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-800">Cesariana de Urgência</span>
              <Badge className="bg-amber-600 text-white font-mono">
                {indicadores.partosPorTipo.cesarea_urgencia}
              </Badge>
            </div>

            <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-800">Cesariana Eletiva</span>
              <Badge className="bg-indigo-600 text-white font-mono">
                {indicadores.partosPorTipo.cesarea_eletiva}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Acomodação do Recém-Nascido */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Baby className="w-3.5 h-3.5 text-cyan-600" />
              Destino / Acomodação dos RNs
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-500">
              Decisão assistencial preenchida pelo profissional
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-2 rounded bg-emerald-50/70 border border-emerald-200">
              <span className="font-semibold text-emerald-950">
                Alojamento Conjunto (com a mãe)
              </span>
              <Badge className="bg-emerald-700 text-white font-mono">
                {indicadores.recemNascidosPorAcomodacao.alojamento_conjunto}
              </Badge>
            </div>

            <div className="flex justify-between items-center p-2 rounded bg-blue-50/70 border border-blue-200">
              <span className="font-semibold text-blue-950">
                Unidade de Cuidados Intermed. (UCI)
              </span>
              <Badge className="bg-blue-700 text-white font-mono">
                {indicadores.recemNascidosPorAcomodacao.unidade_cuidados_intermediarios}
              </Badge>
            </div>

            <div className="flex justify-between items-center p-2 rounded bg-amber-50/70 border border-amber-200">
              <span className="font-semibold text-amber-950">UTI Neonatal</span>
              <Badge className="bg-amber-700 text-white font-mono">
                {indicadores.recemNascidosPorAcomodacao.uti_neonatal}
              </Badge>
            </div>

            <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-800">Isolamento Neonatal</span>
              <Badge className="bg-slate-700 text-white font-mono">
                {indicadores.recemNascidosPorAcomodacao.isolamento}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Boas Práticas ao Parto (Humanização sem limiares inventados) */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Boas Práticas na Assistência ao Parto
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-500">
              Indicadores de humanização do parto e nascimento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <span className="text-slate-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Contato Pele a Pele Imediato
                </span>
                <span className="font-bold text-slate-900 font-mono">
                  {indicadores.taxaContatoPeleAPele}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{ width: `${indicadores.taxaContatoPeleAPele}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <span className="text-slate-700 flex items-center gap-1">
                  <HeartPulse className="w-3.5 h-3.5 text-pink-600" />
                  Amamentação na 1ª Hora de Vida
                </span>
                <span className="font-bold text-slate-900 font-mono">
                  {indicadores.taxaAmamentacaoPrimeiraHora}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-pink-600 h-2 rounded-full transition-all"
                  style={{ width: `${indicadores.taxaAmamentacaoPrimeiraHora}%` }}
                />
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  Recém-nascidos por sexo:{' '}
                  <strong>{indicadores.recemNascidosPorSexo.feminino}</strong> Menina(s),{' '}
                  <strong>{indicadores.recemNascidosPorSexo.masculino}</strong> Menino(s)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
