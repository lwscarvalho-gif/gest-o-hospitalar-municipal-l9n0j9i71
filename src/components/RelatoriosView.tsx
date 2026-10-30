import React, { useState, useEffect } from 'react'
import { Leito, Setor, Agendamento, Internacao, Profissional } from '@/types/hospital'
import { listarLeitos, listarSetores, listarProfissionais } from '@/services/cadastros'
import { listarAgendamentos } from '@/services/agendamentos'
import { listarInternacoes } from '@/services/internacoes'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  Download,
  TrendingUp,
  Users,
  Calendar,
  Bed,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const RelatoriosView: React.FC = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)

  const [leitos, setLeitos] = useState<Leito[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [internacoes, setInternacoes] = useState<Internacao[]>([])

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    setLoading(true)
    try {
      const [l, s, p, a, i] = await Promise.all([
        listarLeitos(),
        listarSetores(),
        listarProfissionais(),
        listarAgendamentos(),
        listarInternacoes(),
      ])
      setLeitos(l)
      setSetores(s)
      setProfissionais(p)
      setAgendamentos(a)
      setInternacoes(i)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível compilar dados estatísticos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Exportador genérico para CSV UTF-8
  const baixarCsv = (nomeArquivo: string, cabecalhos: string[], linhas: (string | number)[][]) => {
    const conteudoLinhas = linhas.map((linha) =>
      linha.map((celula) => `"${String(celula).replace(/"/g, '""')}"`).join(';'),
    )
    const csvCompleto = [cabecalhos.join(';'), ...conteudoLinhas].join('\r\n')
    const blob = new Blob(['\uFEFF' + csvCompleto], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${nomeArquivo}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({
      title: 'Exportação Concluída',
      description: `Arquivo ${nomeArquivo}.csv baixado com sucesso.`,
    })
  }

  // 1. Exportar Ocupação de Leitos
  const exportarOcupacaoLeitos = () => {
    const cabecalhos = ['Código Leito', 'Setor', 'Tipo de Leito', 'Status Atual', 'Observações']
    const linhas = leitos.map((l) => [
      l.codigo,
      l.expand?.setor?.nome || 'N/A',
      l.tipo,
      l.status,
      l.observacoes || '',
    ])
    baixarCsv('relatorio_ocupacao_leitos', cabecalhos, linhas)
  }

  // 2. Exportar Produção por Profissional
  const exportarProducaoProfissionais = () => {
    const cabecalhos = [
      'Profissional',
      'Conselho / Registro',
      'Especialidade',
      'Consultas Agendadas',
      'Consultas Realizadas',
      'Taxa de Atendimento (%)',
    ]
    const linhas = profissionais.map((p) => {
      const ags = agendamentos.filter((a) => a.profissional === p.id)
      const atendidos = ags.filter((a) => a.status === 'atendido').length
      const total = ags.length
      const taxa = total > 0 ? Math.round((atendidos / total) * 100) : 0
      return [p.nome, p.registro_conselho, p.especialidade, total, atendidos, `${taxa}%`]
    })
    baixarCsv('relatorio_producao_profissionais', cabecalhos, linhas)
  }

  // 3. Exportar Atendimentos Gerais
  const exportarAtendimentosGerais = () => {
    const cabecalhos = [
      'Data e Hora',
      'Paciente',
      'Cartão SUS',
      'Profissional',
      'Tipo',
      'Status',
      'Motivo',
    ]
    const linhas = agendamentos.map((a) => [
      a.data_hora,
      a.expand?.paciente?.nome || 'Paciente',
      a.expand?.paciente?.cartao_sus || '',
      a.expand?.profissional?.nome || 'Profissional',
      a.tipo,
      a.status,
      a.motivo || '',
    ])
    baixarCsv('relatorio_atendimentos_periodo', cabecalhos, linhas)
  }

  // Cálculos de resumo
  const totalLeitos = leitos.length
  const leitosOcupados = leitos.filter((l) => l.status === 'ocupado').length
  const totalAgendados = agendamentos.length
  const totalAtendidos = agendamentos.filter((a) => a.status === 'atendido').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Relatórios Gerenciais & Indicadores SUS
          </h1>
          <p className="text-xs text-slate-500">
            Métricas de ocupação de leitos, produção clínica por profissional e exportação para
            planilhas (CSV)
          </p>
        </div>
      </div>

      <Tabs defaultValue="ocupacao" className="w-full">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="ocupacao" className="text-xs sm:text-sm">
            Ocupação de Leitos
          </TabsTrigger>
          <TabsTrigger value="producao" className="text-xs sm:text-sm">
            Produção por Profissional
          </TabsTrigger>
          <TabsTrigger value="atendimentos" className="text-xs sm:text-sm">
            Atendimentos do Período
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OCUPAÇÃO DE LEITOS */}
        <TabsContent value="ocupacao" className="space-y-4 pt-2">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Demonstrativo de Ocupação Hospitalar
              </h2>
              <p className="text-xs text-slate-500">
                Detalhamento por setor com taxa de utilização dos leitos
              </p>
            </div>
            <Button
              onClick={exportarOcupacaoLeitos}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-xs text-white"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Exportar CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {setores.map((s) => {
              const leitosSetor = leitos.filter((l) => l.setor === s.id)
              const ocup = leitosSetor.filter((l) => l.status === 'ocupado').length
              const vagos = leitosSetor.filter((l) => l.status === 'vago').length
              const hig = leitosSetor.filter(
                (l) => l.status === 'higienizacao' || l.status === 'manutencao',
              ).length
              const perc =
                leitosSetor.length > 0 ? Math.round((ocup / leitosSetor.length) * 100) : 0

              return (
                <Card key={s.id} className="border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-slate-900">{s.nome}</CardTitle>
                    <CardDescription className="text-xs">
                      Capacidade: {s.capacidade || leitosSetor.length} leitos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ocupação Atual:</span>
                      <strong className="text-blue-700">{perc}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Leitos Ocupados:</span>
                      <strong className="text-red-600">{ocup}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Leitos Disponíveis:</span>
                      <strong className="text-emerald-600">{vagos}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Higienização / Manutenção:</span>
                      <strong className="text-amber-600">{hig}</strong>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Tabela Sintética de Leitos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-2.5">Código</th>
                      <th className="p-2.5">Unidade / Setor</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Equipamentos / Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leitos.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold font-mono">{l.codigo}</td>
                        <td className="p-2.5">{l.expand?.setor?.nome || 'N/A'}</td>
                        <td className="p-2.5 capitalize">{l.tipo}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              l.status === 'ocupado'
                                ? 'bg-red-100 text-red-800'
                                : l.status === 'vago'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-500">{l.observacoes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: PRODUÇÃO POR PROFISSIONAL */}
        <TabsContent value="producao" className="space-y-4 pt-2">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Produção Ambulatorial por Profissional
              </h2>
              <p className="text-xs text-slate-500">
                Volume de agendamentos realizados, em espera e taxa de absenteísmo
              </p>
            </div>
            <Button
              onClick={exportarProducaoProfissionais}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-xs text-white"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Exportar CSV
            </Button>
          </div>

          <Card className="border-slate-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-3">Profissional</th>
                      <th className="p-3">Registro / Conselho</th>
                      <th className="p-3">Especialidade</th>
                      <th className="p-3 text-center">Consultas Marcadas</th>
                      <th className="p-3 text-center">Concluídas</th>
                      <th className="p-3 text-center">Aguardando / Outros</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {profissionais.map((p) => {
                      const ags = agendamentos.filter((a) => a.profissional === p.id)
                      const concluidas = ags.filter((a) => a.status === 'atendido').length
                      const pendentes = ags.filter(
                        (a) => a.status !== 'atendido' && a.status !== 'cancelado',
                      ).length

                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900">{p.nome}</td>
                          <td className="p-3 font-mono">{p.registro_conselho}</td>
                          <td className="p-3 text-blue-700">{p.especialidade}</td>
                          <td className="p-3 text-center font-bold">{ags.length}</td>
                          <td className="p-3 text-center text-emerald-700 font-bold">
                            {concluidas}
                          </td>
                          <td className="p-3 text-center text-amber-700">{pendentes}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: ATENDIMENTOS DO PERÍODO */}
        <TabsContent value="atendimentos" className="space-y-4 pt-2">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Espelho Geral de Atendimentos Agendados
              </h2>
              <p className="text-xs text-slate-500">Total de atendimentos registrados no sistema</p>
            </div>
            <Button
              onClick={exportarAtendimentosGerais}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-xs text-white"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Exportar CSV
            </Button>
          </div>

          <Card className="border-slate-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-3">Data e Hora</th>
                      <th className="p-3">Paciente</th>
                      <th className="p-3">Cartão SUS</th>
                      <th className="p-3">Profissional</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {agendamentos.map((ag) => (
                      <tr key={ag.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono">{ag.data_hora}</td>
                        <td className="p-3 font-semibold">
                          {ag.expand?.paciente?.nome || 'Paciente'}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {ag.expand?.paciente?.cartao_sus || '—'}
                        </td>
                        <td className="p-3">{ag.expand?.profissional?.nome || '—'}</td>
                        <td className="p-3 capitalize">{ag.tipo}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {ag.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
