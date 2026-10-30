import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Vacina,
  RegistroImunizacao,
  Paciente,
  Profissional,
  DoseVacina,
  ViaAdministracaoVacina,
} from '@/types/hospital'
import {
  listarVacinas,
  criarVacina,
  atualizarVacina,
  registrarAplicacaoVacina,
  listarAplicacoesVacinas,
} from '@/services/imunizacao'
import { listarPacientes, listarProfissionais } from '@/services/cadastros'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  Syringe,
  ShieldCheck,
  Plus,
  Search,
  History,
  CheckCircle2,
  Layers,
  User,
  Calendar,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'

export const ImunizacaoView: React.FC = () => {
  const { user, temPermissao } = useAuth()
  const { toast } = useToast()

  const podeCadastrarCatalogo = temPermissao(['admin', 'gestor'])

  // Estados principais
  const [activeSubTab, setActiveSubTab] = useState<
    'registro' | 'cartao' | 'catalogo' | 'historico'
  >('registro')
  const [vacinas, setVacinas] = useState<Vacina[]>([])
  const [aplicacoes, setAplicacoes] = useState<RegistroImunizacao[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros de busca
  const [buscaVacina, setBuscaVacina] = useState('')
  const [pacienteSelecionadoCartao, setPacienteSelecionadoCartao] = useState<string>('')
  const [filtroHistoricoVacina, setFiltroHistoricoVacina] = useState('')
  const [filtroHistoricoDataInicio, setFiltroHistoricoDataInicio] = useState('')
  const [filtroHistoricoDataFim, setFiltroHistoricoDataFim] = useState('')

  // Modais
  const [modalVacinaAberto, setModalVacinaAberto] = useState(false)
  const [vacinaEmEdicao, setVacinaEmEdicao] = useState<Vacina | null>(null)
  const [modalAplicacaoAberto, setModalAplicacaoAberto] = useState(false)

  // Formulário do Catálogo de Vacinas
  const [formVacNome, setFormVacNome] = useState('')
  const [formVacFabricante, setFormVacFabricante] = useState('')
  const [formVacIndicacao, setFormVacIndicacao] = useState('')
  const [formVacVia, setFormVacVia] = useState<ViaAdministracaoVacina>('intramuscular')
  const [formVacLotePadrao, setFormVacLotePadrao] = useState('')
  const [formVacValidadeLote, setFormVacValidadeLote] = useState('')
  const [formVacDosesPrevistas, setFormVacDosesPrevistas] = useState('1')
  const [formVacEstoque, setFormVacEstoque] = useState('100')
  const [formVacAtivo, setFormVacAtivo] = useState(true)
  const [formVacObservacoes, setFormVacObservacoes] = useState('')
  const [salvandoVacina, setSalvandoVacina] = useState(false)

  // Formulário de Aplicação de Vacina
  const [aplPacienteId, setAplPacienteId] = useState('')
  const [aplVacinaId, setAplVacinaId] = useState('')
  const [aplDose, setAplDose] = useState<DoseVacina>('1a_dose')
  const [aplLote, setAplLote] = useState('')
  const [aplValidadeLote, setAplValidadeLote] = useState('')
  const [aplData, setAplData] = useState(new Date().toISOString().slice(0, 10))
  const [aplProfissionalId, setAplProfissionalId] = useState('')
  const [aplLocal, setAplLocal] = useState('Deltoide Direito')
  const [aplObservacoes, setAplObservacoes] = useState('')
  const [salvandoAplicacao, setSalvandoAplicacao] = useState(false)

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [vacData, pacData, profData, aplData] = await Promise.all([
        listarVacinas(),
        listarPacientes(),
        listarProfissionais(),
        listarAplicacoesVacinas(),
      ])
      setVacinas(vacData)
      setPacientes(pacData)
      setProfissionais(profData)
      setAplicacoes(aplData)

      if (!pacienteSelecionadoCartao && pacData.length > 0) {
        setPacienteSelecionadoCartao(pacData[0].id)
      }
    } catch (e) {
      console.error(e)
      toast({
        title: 'Erro ao carregar imunização',
        description: 'Tente recarregar a página.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Limpar e abrir modal de vacina
  const abrirModalNovaVacina = () => {
    setVacinaEmEdicao(null)
    setFormVacNome('')
    setFormVacFabricante('')
    setFormVacIndicacao('')
    setFormVacVia('intramuscular')
    setFormVacLotePadrao('')
    setFormVacValidadeLote('')
    setFormVacDosesPrevistas('1')
    setFormVacEstoque('100')
    setFormVacAtivo(true)
    setFormVacObservacoes('')
    setModalVacinaAberto(true)
  }

  const abrirModalEditarVacina = (v: Vacina) => {
    setVacinaEmEdicao(v)
    setFormVacNome(v.nome)
    setFormVacFabricante(v.fabricante || '')
    setFormVacIndicacao(v.indicacao || '')
    setFormVacVia(v.via_administracao)
    setFormVacLotePadrao(v.lote_padrao || '')
    setFormVacValidadeLote(v.validade_lote || '')
    setFormVacDosesPrevistas(String(v.doses_previstas || 1))
    setFormVacEstoque(String(v.estoque_doses))
    setFormVacAtivo(v.ativo !== false)
    setFormVacObservacoes(v.observacoes || '')
    setModalVacinaAberto(true)
  }

  const handleSalvarVacina = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formVacNome.trim()) {
      toast({ title: 'Informe o nome da vacina.', variant: 'destructive' })
      return
    }

    setSalvandoVacina(true)
    try {
      const dados: Partial<Vacina> = {
        nome: formVacNome.trim(),
        fabricante: formVacFabricante.trim(),
        indicacao: formVacIndicacao.trim(),
        via_administracao: formVacVia,
        lote_padrao: formVacLotePadrao.trim(),
        validade_lote: formVacValidadeLote,
        doses_previstas: Number(formVacDosesPrevistas || 1),
        estoque_doses: Number(formVacEstoque || 0),
        ativo: formVacAtivo,
        observacoes: formVacObservacoes.trim(),
      }

      if (vacinaEmEdicao) {
        await atualizarVacina(vacinaEmEdicao.id, dados)
        toast({ title: 'Vacina atualizada com sucesso!' })
      } else {
        await criarVacina(dados)
        toast({ title: 'Vacina cadastrada no catálogo!' })
      }

      setModalVacinaAberto(false)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar vacina',
        description: err.message || 'Verifique os campos.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoVacina(false)
    }
  }

  // Abertura do formulário de aplicação
  const abrirModalAplicacao = (vacinaPreSelecionadaId?: string, pacientePreId?: string) => {
    const defaultVacId = vacinaPreSelecionadaId || (vacinas.length > 0 ? vacinas[0].id : '')
    setAplVacinaId(defaultVacId)

    const vacObj = vacinas.find((v) => v.id === defaultVacId)
    setAplLote(vacObj?.lote_padrao || '')
    setAplValidadeLote(vacObj?.validade_lote || '')

    setAplPacienteId(
      pacientePreId || pacienteSelecionadoCartao || (pacientes.length > 0 ? pacientes[0].id : ''),
    )
    setAplDose('1a_dose')
    setAplData(new Date().toISOString().slice(0, 10))
    setAplProfissionalId(profissionais.length > 0 ? profissionais[0].id : '')
    setAplLocal('Deltoide Direito')
    setAplObservacoes('')
    setModalAplicacaoAberto(true)
  }

  const handleMudarVacinaAplicacao = (vId: string) => {
    setAplVacinaId(vId)
    const vac = vacinas.find((v) => v.id === vId)
    if (vac) {
      setAplLote(vac.lote_padrao || '')
      setAplValidadeLote(vac.validade_lote || '')
    }
  }

  const vacinaSelecionadaParaApl = vacinas.find((v) => v.id === aplVacinaId)

  const handleSalvarAplicacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aplPacienteId) {
      toast({ title: 'Selecione o paciente recebedor da vacina.', variant: 'destructive' })
      return
    }
    if (!aplVacinaId) {
      toast({ title: 'Selecione a vacina a ser aplicada.', variant: 'destructive' })
      return
    }

    if (vacinaSelecionadaParaApl && vacinaSelecionadaParaApl.estoque_doses <= 0) {
      toast({
        title: 'Estoque de vacina zerado!',
        description: `Não há doses disponíveis no lote de "${vacinaSelecionadaParaApl.nome}".`,
        variant: 'destructive',
      })
      return
    }

    setSalvandoAplicacao(true)
    try {
      const profObj = profissionais.find((p) => p.id === aplProfissionalId)

      await registrarAplicacaoVacina({
        pacienteId: aplPacienteId,
        vacinaId: aplVacinaId,
        dose: aplDose,
        lote: aplLote.trim() || vacinaSelecionadaParaApl?.lote_padrao || 'PADRAO',
        validadeLote: aplValidadeLote || vacinaSelecionadaParaApl?.validade_lote,
        dataAplicacao: aplData,
        profissionalAplicadorId: aplProfissionalId || undefined,
        aplicadorNome: profObj ? profObj.nome : user?.name || 'Vacinador Municipal',
        localAplicacao: aplLocal.trim(),
        observacoes: aplObservacoes.trim(),
      })

      toast({
        title: 'Aplicação registrada com sucesso!',
        description: `1 dose baixada do lote da vacina no estoque municipal.`,
      })

      // Se aplicou no paciente em foco, manter ele selecionado no cartão
      setPacienteSelecionadoCartao(aplPacienteId)
      setModalAplicacaoAberto(false)
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Falha ao registrar aplicação',
        description: err.message || 'Verifique as informações.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoAplicacao(false)
    }
  }

  // Formatação de label da dose
  const rotuloDose = (d: DoseVacina) => {
    switch (d) {
      case '1a_dose':
        return '1ª Dose'
      case '2a_dose':
        return '2ª Dose'
      case '3a_dose':
        return '3ª Dose'
      case 'reforco':
        return 'Reforço'
      case 'anual':
        return 'Campanha Anual'
      case 'dose_unica':
        return 'Dose Única'
      default:
        return d
    }
  }

  // Filtragens
  const vacinasFiltradas = vacinas.filter((v) => {
    if (buscaVacina.trim()) {
      const q = buscaVacina.toLowerCase()
      const mNome = v.nome.toLowerCase().includes(q)
      const mFab = (v.fabricante || '').toLowerCase().includes(q)
      const mInd = (v.indicacao || '').toLowerCase().includes(q)
      if (!mNome && !mFab && !mInd) return false
    }
    return true
  })

  const aplicacoesDoPacienteCartao = aplicacoes
    .filter((a) => a.paciente === pacienteSelecionadoCartao)
    .sort((a, b) => (a.data_aplicacao > b.data_aplicacao ? 1 : -1))

  const pacienteCartaoObj = pacientes.find((p) => p.id === pacienteSelecionadoCartao)

  const aplicacoesFiltradasGeral = aplicacoes.filter((a) => {
    if (filtroHistoricoVacina && a.vacina !== filtroHistoricoVacina) return false
    if (filtroHistoricoDataInicio && a.data_aplicacao < filtroHistoricoDataInicio) return false
    if (filtroHistoricoDataFim && a.data_aplicacao > filtroHistoricoDataFim) return false
    return true
  })

  // Métricas
  const totalDosesAplicadas = aplicacoes.length
  const totalDosesEstoque = vacinas.reduce((acc, v) => acc + (v.estoque_doses || 0), 0)
  const vacinasCriticas = vacinas.filter((v) => v.estoque_doses <= 10).length

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow">
              <Syringe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Módulo de Imunização & Sala de Vacina
              </h1>
              <p className="text-xs text-slate-500">
                Registro de aplicação de doses, controle de lote com baixa de estoque e consulta do
                histórico/cartão vacinal
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <Button
            size="sm"
            onClick={() => abrirModalAplicacao()}
            className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center gap-1.5"
          >
            <Syringe className="w-4 h-4" /> Registrar Aplicação
          </Button>

          {podeCadastrarCatalogo && (
            <Button
              size="sm"
              onClick={abrirModalNovaVacina}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Cadastrar Vacina
            </Button>
          )}
        </div>
      </div>

      {/* Indicadores rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Catálogo de Vacinas</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{vacinas.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Imunobiológicos cadastrados</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Syringe className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Doses Aplicadas</p>
              <p className="text-2xl font-bold text-teal-700 mt-1">{totalDosesAplicadas}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Aplicações registradas</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Doses em Estoque</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{totalDosesEstoque}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Saldo em câmara fria</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Alerta de Reposição</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{vacinasCriticas}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Vacinas com &le; 10 doses</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas: Registro Rápido / Cartão Vacinal / Catálogo / Histórico */}
      <Tabs
        value={activeSubTab}
        onValueChange={(v) => setActiveSubTab(v as any)}
        className="w-full"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <TabsList className="bg-slate-200/80 p-1">
            <TabsTrigger
              value="registro"
              className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-teal-700"
            >
              <Syringe className="w-3.5 h-3.5 mr-1.5" />
              Registro de Aplicação
            </TabsTrigger>
            <TabsTrigger
              value="cartao"
              className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              Histórico / Cartão Vacinal do Paciente
            </TabsTrigger>
            <TabsTrigger
              value="catalogo"
              className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-700"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              Catálogo de Vacinas ({vacinas.length})
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-purple-700"
            >
              <History className="w-3.5 h-3.5 mr-1.5" />
              Geral de Aplicações ({aplicacoes.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. ABA REGISTRO DE APLICAÇÃO */}
        <TabsContent value="registro" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulário Direto */}
            <Card className="lg:col-span-1 border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                  <Syringe className="w-4 h-4 text-teal-600" />
                  Lançar Aplicação de Vacina
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleSalvarAplicacao} className="space-y-3.5">
                  <div>
                    <Label className="text-xs text-slate-700 font-medium">Paciente *</Label>
                    <select
                      className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
                      value={aplPacienteId}
                      onChange={(e) => setAplPacienteId(e.target.value)}
                      required
                    >
                      <option value="">Selecione o paciente...</option>
                      {pacientes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} {p.cartao_sus ? `(SUS: ${p.cartao_sus})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-700 font-medium">
                      Vacina / Imunobiológico *
                    </Label>
                    <select
                      className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
                      value={aplVacinaId}
                      onChange={(e) => handleMudarVacinaAplicacao(e.target.value)}
                      required
                    >
                      <option value="">Selecione a vacina...</option>
                      {vacinas.map((v) => (
                        <option key={v.id} value={v.id} disabled={v.estoque_doses <= 0}>
                          {v.nome} • Saldo: {v.estoque_doses} doses
                          {v.estoque_doses <= 0 ? ' (ZERADO)' : ''}
                        </option>
                      ))}
                    </select>
                    {vacinaSelecionadaParaApl && (
                      <div className="mt-1.5 p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Estoque Disponível:</span>
                          <strong
                            className={
                              vacinaSelecionadaParaApl.estoque_doses <= 0
                                ? 'text-red-600'
                                : 'text-teal-700'
                            }
                          >
                            {vacinaSelecionadaParaApl.estoque_doses} dose(s)
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Via Recomendada:</span>
                          <span className="capitalize">
                            {vacinaSelecionadaParaApl.via_administracao}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-700 font-medium">Dose *</Label>
                      <select
                        className="w-full mt-1 h-8 px-2 text-xs border border-slate-300 rounded-md bg-white"
                        value={aplDose}
                        onChange={(e) => setAplDose(e.target.value as any)}
                        required
                      >
                        <option value="1a_dose">1ª Dose</option>
                        <option value="2a_dose">2ª Dose</option>
                        <option value="3a_dose">3ª Dose</option>
                        <option value="reforco">Reforço</option>
                        <option value="anual">Campanha Anual</option>
                        <option value="dose_unica">Dose Única</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs text-slate-700 font-medium">Data Aplicação *</Label>
                      <Input
                        type="date"
                        value={aplData}
                        onChange={(e) => setAplData(e.target.value)}
                        className="h-8 text-xs mt-1"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-700 font-medium">Lote da Vacina *</Label>
                      <Input
                        placeholder="Ex: LOTE24"
                        value={aplLote}
                        onChange={(e) => setAplLote(e.target.value)}
                        className="h-8 text-xs mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-700 font-medium">Validade Lote</Label>
                      <Input
                        type="date"
                        value={aplValidadeLote}
                        onChange={(e) => setAplValidadeLote(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-700 font-medium">
                      Profissional Aplicador
                    </Label>
                    <select
                      className="w-full mt-1 h-8 px-2 text-xs border border-slate-300 rounded-md bg-white"
                      value={aplProfissionalId}
                      onChange={(e) => setAplProfissionalId(e.target.value)}
                    >
                      <option value="">Selecione o profissional...</option>
                      {profissionais.map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.nome} ({pr.categoria})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-700 font-medium">Local de Aplicação</Label>
                    <Input
                      placeholder="Ex: Deltoide D / Vasto Lateral E"
                      value={aplLocal}
                      onChange={(e) => setAplLocal(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-slate-700 font-medium">
                      Observações da Aplicação
                    </Label>
                    <Textarea
                      placeholder="Reações imediatas, lote emergencial ou orientações ao paciente..."
                      value={aplObservacoes}
                      onChange={(e) => setAplObservacoes(e.target.value)}
                      className="text-xs mt-1 min-h-[50px]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={
                      salvandoAplicacao ||
                      !vacinaSelecionadaParaApl ||
                      vacinaSelecionadaParaApl.estoque_doses <= 0
                    }
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold py-2"
                  >
                    {salvandoAplicacao
                      ? 'Gravando aplicação...'
                      : 'Confirmar Aplicação & Baixar Dose'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Painel com as últimas aplicações e atalho para o cartão */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    Últimas Aplicações Registradas na Sala de Vacina
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-teal-700"
                    onClick={() => setActiveSubTab('cartao')}
                  >
                    Ver Cartão Vacinal &rarr;
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {aplicacoes.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Nenhuma aplicação lançada. Utilize o formulário ao lado para registrar a
                      primeira vacina.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs">
                      {aplicacoes.slice(0, 7).map((a) => (
                        <div
                          key={a.id}
                          className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">
                                {a.expand?.vacina?.nome || 'Vacina'}
                              </span>
                              <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100 text-[10px] border-0">
                                {rotuloDose(a.dose)}
                              </Badge>
                              <span className="text-[10px] text-slate-400">Lote: {a.lote}</span>
                            </div>
                            <div className="text-slate-500 flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                <strong>{a.expand?.paciente?.nome || 'Paciente'}</strong>
                              </span>
                              {a.local_aplicacao && <span>• Local: {a.local_aplicacao}</span>}
                            </div>
                          </div>
                          <div className="text-right text-slate-400 text-[11px] shrink-0">
                            <div className="font-medium text-slate-700">{a.data_aplicacao}</div>
                            <div className="text-slate-500">
                              {a.aplicador_nome ||
                                a.expand?.profissional_aplicador?.nome ||
                                'Vacinador'}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] text-blue-600 px-1 hover:underline"
                              onClick={() => {
                                setPacienteSelecionadoCartao(a.paciente)
                                setActiveSubTab('cartao')
                              }}
                            >
                              Ver Cartão
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 2. ABA CARTÃO VACINAL DO PACIENTE */}
        <TabsContent value="cartao" className="mt-4 space-y-4">
          {/* Seletor do paciente */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <Label className="text-xs text-slate-700 font-medium">
                Selecione o Paciente para Consulta
              </Label>
              <select
                className="w-full mt-1 h-9 px-3 text-xs border border-slate-300 rounded-md bg-white"
                value={pacienteSelecionadoCartao}
                onChange={(e) => setPacienteSelecionadoCartao(e.target.value)}
              >
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} {p.cartao_sus ? `• SUS: ${p.cartao_sus}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <Button
              size="sm"
              onClick={() => abrirModalAplicacao(undefined, pacienteSelecionadoCartao)}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-9"
              disabled={!pacienteSelecionadoCartao}
            >
              <Syringe className="w-3.5 h-3.5 mr-1.5" />
              Vacinar este Paciente
            </Button>
          </div>

          {/* Cartão Visual do Paciente */}
          {pacienteCartaoObj ? (
            <Card className="border-teal-200 shadow-sm bg-white overflow-hidden">
              <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-6 h-6 text-teal-300" />
                      <h2 className="text-lg font-bold tracking-tight">
                        Cartão / Histórico Vacinal do Paciente
                      </h2>
                    </div>
                    <p className="text-xs text-teal-100 mt-0.5">
                      Consulta interna do histórico de imunização • Secretaria Municipal de Saúde
                    </p>
                  </div>
                  <div className="text-right text-xs bg-teal-900/50 px-3 py-1.5 rounded-lg border border-teal-500/30">
                    <div>Total de Doses Registradas</div>
                    <div className="text-lg font-bold text-teal-200">
                      {aplicacoesDoPacienteCartao.length} dose(s)
                    </div>
                  </div>
                </div>

                {/* Dados do Paciente */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-teal-600/60 text-xs">
                  <div>
                    <span className="text-teal-200 block text-[10px] uppercase">Paciente</span>
                    <strong className="text-white text-sm">{pacienteCartaoObj.nome}</strong>
                  </div>
                  <div>
                    <span className="text-teal-200 block text-[10px] uppercase">Cartão SUS</span>
                    <strong className="text-white">{pacienteCartaoObj.cartao_sus || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-teal-200 block text-[10px] uppercase">Nascimento</span>
                    <span className="text-white">{pacienteCartaoObj.data_nascimento || '—'}</span>
                  </div>
                  <div>
                    <span className="text-teal-200 block text-[10px] uppercase">CPF</span>
                    <span className="text-white">{pacienteCartaoObj.cpf || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Linha do Tempo / Histórico de Doses */}
              <div className="p-5">
                {aplicacoesDoPacienteCartao.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                    <p>Nenhuma dose de vacina foi registrada para este paciente ainda.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-teal-700 border-teal-300"
                      onClick={() => abrirModalAplicacao(undefined, pacienteCartaoObj.id)}
                    >
                      Registrar primeira dose agora
                    </Button>
                  </div>
                ) : (
                  <div className="relative pl-6 border-l-2 border-teal-200 space-y-6 my-2">
                    {aplicacoesDoPacienteCartao.map((apl) => (
                      <div key={apl.id} className="relative group">
                        {/* Ponto na timeline */}
                        <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-teal-600 border-2 border-white shadow-sm flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 hover:border-teal-300 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-800 text-sm">
                                {apl.expand?.vacina?.nome || 'Vacina'}
                              </h3>
                              <Badge className="bg-teal-100 text-teal-800 text-[10px] border-0">
                                {rotuloDose(apl.dose)}
                              </Badge>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-teal-600" />
                              {apl.data_aplicacao}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Lote</span>
                              <span className="font-mono font-medium text-slate-700">
                                {apl.lote}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">Via / Local</span>
                              <span>{apl.local_aplicacao || 'Deltoide'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">Aplicador</span>
                              <span>
                                {apl.aplicador_nome ||
                                  apl.expand?.profissional_aplicador?.nome ||
                                  'Vacinador'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">Observações</span>
                              <span>{apl.observacoes || 'Sem intercorrências'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-lg border border-slate-200">
              Selecione um paciente para visualizar o histórico de doses.
            </div>
          )}
        </TabsContent>

        {/* 3. ABA CATÁLOGO DE VACINAS */}
        <TabsContent value="catalogo" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Buscar vacina por nome, fabricante ou indicação..."
                value={buscaVacina}
                onChange={(e) => setBuscaVacina(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-3">Vacina / Fabricante</th>
                    <th className="p-3">Indicação Clínica</th>
                    <th className="p-3">Via / Esquema</th>
                    <th className="p-3">Lote Padrão / Validade</th>
                    <th className="p-3 text-right">Estoque de Doses</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vacinasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        Nenhuma vacina localizada com esse filtro.
                      </td>
                    </tr>
                  ) : (
                    vacinasFiltradas.map((v) => {
                      const zerado = v.estoque_doses <= 0
                      const alerta = v.estoque_doses <= 10

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/80">
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{v.nome}</div>
                            {v.fabricante && (
                              <div className="text-[11px] text-slate-500">{v.fabricante}</div>
                            )}
                          </td>
                          <td className="p-3 max-w-xs text-slate-600">
                            {v.indicacao || 'Imunobiológico do calendário municipal'}
                          </td>
                          <td className="p-3">
                            <div className="capitalize font-medium text-slate-700">
                              {v.via_administracao}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {v.doses_previstas || 1} dose(s) previstas
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-mono text-slate-700">{v.lote_padrao || 'N/I'}</div>
                            {v.validade_lote && (
                              <div className="text-[10px] text-slate-400">
                                Val: {v.validade_lote}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <span
                              className={`font-bold px-2 py-0.5 rounded ${
                                zerado
                                  ? 'bg-red-100 text-red-700'
                                  : alerta
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-teal-50 text-teal-800'
                              }`}
                            >
                              {v.estoque_doses} dose(s)
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {v.ativo !== false ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] border-0">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400 text-[10px]">
                                Inativo
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] px-2 text-teal-700 border-teal-300 hover:bg-teal-50"
                              onClick={() => abrirModalAplicacao(v.id)}
                              disabled={zerado}
                            >
                              Aplicar
                            </Button>
                            {podeCadastrarCatalogo && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] px-2 text-slate-600"
                                onClick={() => abrirModalEditarVacina(v)}
                              >
                                Editar
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 4. ABA HISTÓRICO GERAL DE APLICAÇÕES */}
        <TabsContent value="historico" className="mt-4 space-y-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <Label className="text-xs text-slate-700 font-medium">Filtrar por Vacina</Label>
              <select
                className="w-full mt-1 h-9 px-2 text-xs border border-slate-300 rounded-md bg-white"
                value={filtroHistoricoVacina}
                onChange={(e) => setFiltroHistoricoVacina(e.target.value)}
              >
                <option value="">Todas as vacinas</option>
                {vacinas.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-700 font-medium">Data Início</Label>
              <Input
                type="date"
                value={filtroHistoricoDataInicio}
                onChange={(e) => setFiltroHistoricoDataInicio(e.target.value)}
                className="h-9 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-700 font-medium">Data Fim</Label>
              <Input
                type="date"
                value={filtroHistoricoDataFim}
                onChange={(e) => setFiltroHistoricoDataFim(e.target.value)}
                className="h-9 text-xs mt-1"
              />
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs w-full"
                onClick={() => {
                  setFiltroHistoricoVacina('')
                  setFiltroHistoricoDataInicio('')
                  setFiltroHistoricoDataFim('')
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-3">Data</th>
                    <th className="p-3">Paciente</th>
                    <th className="p-3">Vacina Aplicada</th>
                    <th className="p-3">Dose</th>
                    <th className="p-3">Lote / Validade</th>
                    <th className="p-3">Local de Aplicação</th>
                    <th className="p-3">Profissional / Vacinador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aplicacoesFiltradasGeral.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Nenhum registro de aplicação localizado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    aplicacoesFiltradasGeral.map((apl) => (
                      <tr key={apl.id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-700 whitespace-nowrap">
                          {apl.data_aplicacao}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">
                            {apl.expand?.paciente?.nome || 'Paciente'}
                          </div>
                          {apl.expand?.paciente?.cartao_sus && (
                            <div className="text-[10px] text-slate-400">
                              SUS: {apl.expand.paciente.cartao_sus}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-medium text-slate-800">
                          {apl.expand?.vacina?.nome || 'Vacina'}
                        </td>
                        <td className="p-3">
                          <Badge className="bg-teal-100 text-teal-800 text-[10px] border-0">
                            {rotuloDose(apl.dose)}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">{apl.lote}</td>
                        <td className="p-3 text-slate-600">{apl.local_aplicacao || 'Deltoide'}</td>
                        <td className="p-3 text-slate-600">
                          {apl.aplicador_nome ||
                            apl.expand?.profissional_aplicador?.nome ||
                            'Vacinador'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: CADASTRAR / EDITAR VACINA */}
      <Dialog open={modalVacinaAberto} onOpenChange={setModalVacinaAberto}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">
              {vacinaEmEdicao ? 'Editar Vacina' : 'Cadastrar Vacina no Catálogo'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarVacina} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs font-medium text-slate-700">Nome da Vacina *</Label>
                <Input
                  placeholder="Ex: Febre Amarela / Influenza / Covid-19"
                  value={formVacNome}
                  onChange={(e) => setFormVacNome(e.target.value)}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">
                  Fabricante / Laboratório
                </Label>
                <Input
                  placeholder="Ex: Bio-Manguinhos / Fiocruz ou Butantan"
                  value={formVacFabricante}
                  onChange={(e) => setFormVacFabricante(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Via de Administração *</Label>
                <select
                  className="w-full mt-1 h-8 px-2 text-xs border border-slate-300 rounded-md bg-white"
                  value={formVacVia}
                  onChange={(e) => setFormVacVia(e.target.value as any)}
                >
                  <option value="intramuscular">Intramuscular</option>
                  <option value="subcutanea">Subcutânea</option>
                  <option value="intradermica">Intradérmica</option>
                  <option value="oral">Oral</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs font-medium text-slate-700">
                  Indicação / Doenças Evitadas
                </Label>
                <Input
                  placeholder="Ex: Proteção contra vírus Influenza tipos A e B"
                  value={formVacIndicacao}
                  onChange={(e) => setFormVacIndicacao(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Lote Padrão</Label>
                <Input
                  placeholder="Ex: LOTE2024"
                  value={formVacLotePadrao}
                  onChange={(e) => setFormVacLotePadrao(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Validade do Lote</Label>
                <Input
                  type="date"
                  value={formVacValidadeLote}
                  onChange={(e) => setFormVacValidadeLote(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">
                  Doses Previstas no Esquema
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={formVacDosesPrevistas}
                  onChange={(e) => setFormVacDosesPrevistas(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">
                  Estoque Inicial (Doses) *
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formVacEstoque}
                  onChange={(e) => setFormVacEstoque(e.target.value)}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={formVacAtivo}
                    onChange={(e) => setFormVacAtivo(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  Vacina Ativa (disponível para novas aplicações na sala de vacina)
                </label>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs font-medium text-slate-700">Observações Gerais</Label>
                <Textarea
                  placeholder="Cuidados de conservação (ex: câmara fria entre +2°C e +8°C)..."
                  value={formVacObservacoes}
                  onChange={(e) => setFormVacObservacoes(e.target.value)}
                  className="text-xs mt-1 min-h-[60px]"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalVacinaAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoVacina}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {salvandoVacina ? 'Salvando...' : 'Salvar Vacina'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
