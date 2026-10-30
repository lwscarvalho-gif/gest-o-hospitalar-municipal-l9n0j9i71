import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Paciente,
  Internacao,
  FichaProntoAtendimento,
  Setor,
  Leito,
  ItemCardapioRefeicao,
  DietaCatalogoSND,
  PrescricaoDieteticaSND,
  ItemMapaCozinhaSanitizado,
} from '@/types/hospital'
import {
  listarRefeicoesCardapio,
  listarDietasCatalogo,
  listarPrescricoesDieteticas,
  obterMapaCozinhaSanitizado,
} from '@/services/snd'
import { listarPacientes, listarSetores, listarLeitos } from '@/services/cadastros'
import { listarInternacoes } from '@/services/internacoes'
import { listarAtendimentosPA } from '@/services/prontoAtendimento'
import { CatalogoSndTab } from './snd/CatalogoSndTab'
import { PrescricaoSndTab } from './snd/PrescricaoSndTab'
import { MapaCozinhaSndTab } from './snd/MapaCozinhaSndTab'
import { RelatoriosSndTab } from './snd/RelatoriosSndTab'
import { SeletorPaciente } from '@/components/SeletorPaciente'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Utensils,
  BookOpen,
  Stethoscope,
  ChefHat,
  FileBarChart,
  RefreshCw,
  Hospital,
  AlertTriangle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export type AbaAtivaSnd = 'prescricao' | 'mapa_cozinha' | 'catalogos' | 'relatorios'

interface SndViewProps {
  onNavegarSAME?: (pacienteId?: string) => void
  pacienteIdInicial?: string
}

export const SndView: React.FC<SndViewProps> = ({ onNavegarSAME, pacienteIdInicial }) => {
  const { user, temPermissao } = useAuth()
  const { toast } = useToast()

  // Aba ativa inicial
  const [abaAtiva, setAbaAtiva] = useState<AbaAtivaSnd>('prescricao')

  // Sessão e proteção de descarte de respostas antigas (seqRef)
  const seqRef = useRef(0)

  // Estados dos Catálogos
  const [refeicoes, setRefeicoes] = useState<ItemCardapioRefeicao[]>([])
  const [dietas, setDietas] = useState<DietaCatalogoSND[]>([])
  const [carregandoCatalogos, setCarregandoCatalogos] = useState(false)

  // Estados de Cadastros Gerais
  const [setores, setSetores] = useState<Setor[]>([])
  const [leitos, setLeitos] = useState<Leito[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])

  // Paciente Ativo e Episódios Assistenciais
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | undefined>(undefined)
  const [internacaoAtiva, setInternacaoAtiva] = useState<Internacao | undefined>(undefined)
  const [atendimentoPaAtivo, setAtendimentoPaAtivo] = useState<FichaProntoAtendimento | undefined>(
    undefined,
  )

  // Histórico de Prescrições do Paciente
  const [prescricoesHistorico, setPrescricoesHistorico] = useState<PrescricaoDieteticaSND[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  // Mapa Sanitizado da Cozinha
  const [dataOperacionalCozinha, setDataOperacionalCozinha] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [setorSelecionadoCozinha, setSetorSelecionadoCozinha] = useState<string>('')
  const [itensMapaCozinha, setItensMapaCozinha] = useState<ItemMapaCozinhaSanitizado[]>([])
  const [carregandoMapa, setCarregandoMapa] = useState(false)

  // Permissões de acordo com o perfil humano
  const podePrescrever = temPermissao(['admin', 'gestor', 'profissional'])
  const podeGerenciarCatalogos = temPermissao(['admin', 'gestor', 'profissional'])
  const podeOperarCozinha = temPermissao(['admin', 'gestor', 'profissional', 'recepcao'])
  const podeOperarEstoque = temPermissao(['admin', 'gestor', 'profissional'])

  // 1. Carregamento inicial de Catálogos e Cadastros
  const carregarDadosBase = async () => {
    seqRef.current += 1
    const seqAtual = seqRef.current
    setCarregandoCatalogos(true)

    try {
      const [refsResp, dietasResp, setoresResp, leitosResp, pacientesResp] = await Promise.all([
        listarRefeicoesCardapio(false), // traz todas para gerenciar ativas/inativas
        listarDietasCatalogo(false),
        listarSetores(),
        listarLeitos(),
        listarPacientes(),
      ])

      if (seqRef.current !== seqAtual) return

      setRefeicoes(refsResp)
      setDietas(dietasResp)
      setSetores(setoresResp)
      setLeitos(leitosResp)
      setPacientes(pacientesResp)

      // Se passou paciente inicial, tenta localizá-lo
      if (pacienteIdInicial && !pacienteSelecionado) {
        const pac = pacientesResp.find((p) => p.id === pacienteIdInicial)
        if (pac) {
          handleSelecionarPaciente(pac)
        }
      }
    } catch (err: unknown) {
      if (seqRef.current === seqAtual) {
        toast({
          title: 'Erro ao carregar dados do SND',
          description: String(err instanceof Error ? err.message : err),
          variant: 'destructive',
        })
      }
    } finally {
      if (seqRef.current === seqAtual) {
        setCarregandoCatalogos(false)
      }
    }
  }

  // 2. Consulta do Mapa da Cozinha (Sanitizado)
  const carregarMapaCozinha = async () => {
    seqRef.current += 1
    const seqAtual = seqRef.current
    setCarregandoMapa(true)

    try {
      const itens = await obterMapaCozinhaSanitizado(
        dataOperacionalCozinha,
        setorSelecionadoCozinha || undefined,
      )
      if (seqRef.current !== seqAtual) return
      setItensMapaCozinha(itens)
    } catch (err: unknown) {
      if (seqRef.current === seqAtual) {
        toast({
          title: 'Aviso ao carregar mapa de cozinha',
          description: String(err instanceof Error ? err.message : err),
          variant: 'destructive',
        })
      }
    } finally {
      if (seqRef.current === seqAtual) {
        setCarregandoMapa(false)
      }
    }
  }

  // 3. Ao selecionar um paciente, busca episódios ativos e histórico de prescrição
  const handleSelecionarPaciente = async (paciente?: Paciente) => {
    setPacienteSelecionado(paciente)
    if (!paciente) {
      setInternacaoAtiva(undefined)
      setAtendimentoPaAtivo(undefined)
      setPrescricoesHistorico([])
      return
    }

    seqRef.current += 1
    const seqAtual = seqRef.current
    setCarregandoHistorico(true)

    try {
      const [internacoesResp, paResp, prescricoesResp] = await Promise.all([
        listarInternacoes(true), // apenas ativas
        listarAtendimentosPA({ status: 'em_atendimento' }),
        listarPrescricoesDieteticas({ paciente_ref: paciente.id }),
      ])

      if (seqRef.current !== seqAtual) return

      // Localiza internação ativa vinculada
      const intAtiva = internacoesResp.find(
        (i) => i.paciente === paciente.id && i.status !== 'alta' && i.status !== 'obito',
      )
      setInternacaoAtiva(intAtiva)

      // Localiza atendimento PA se não houver internação
      const paAtivo = paResp.find((p) => p.paciente === paciente.id && p.status !== 'finalizado')
      setAtendimentoPaAtivo(paAtivo)

      setPrescricoesHistorico(prescricoesResp)
    } catch (err: unknown) {
      if (seqRef.current === seqAtual) {
        toast({
          title: 'Erro ao consultar episódios do paciente',
          description: String(err instanceof Error ? err.message : err),
          variant: 'destructive',
        })
      }
    } finally {
      if (seqRef.current === seqAtual) {
        setCarregandoHistorico(false)
      }
    }
  }

  useEffect(() => {
    carregarDadosBase()
  }, [])

  useEffect(() => {
    if (abaAtiva === 'mapa_cozinha') {
      carregarMapaCozinha()
    }
  }, [abaAtiva, dataOperacionalCozinha, setorSelecionadoCozinha])

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo SND */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Utensils className="w-6 h-6 text-emerald-600" />
              SND • Serviço de Nutrição e Dietética
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] bg-slate-100 text-slate-700 border-slate-300"
            >
              Requisito 7.4.3.5
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Prescrição dietética humana individualizada, catálogo parametrizável de dietas, mapa de
            cozinha sanitizado LGPD e rastreabilidade de distribuição.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 border-slate-300"
            onClick={() => {
              carregarDadosBase()
              if (abaAtiva === 'mapa_cozinha') carregarMapaCozinha()
              if (pacienteSelecionado) handleSelecionarPaciente(pacienteSelecionado)
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Navegação entre Sub-abas do SND */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        <Button
          variant={abaAtiva === 'prescricao' ? 'default' : 'ghost'}
          size="sm"
          className={`text-xs h-8 ${abaAtiva === 'prescricao' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
          onClick={() => setAbaAtiva('prescricao')}
        >
          <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
          Prescrição Individualizada
        </Button>

        <Button
          variant={abaAtiva === 'mapa_cozinha' ? 'default' : 'ghost'}
          size="sm"
          className={`text-xs h-8 ${abaAtiva === 'mapa_cozinha' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
          onClick={() => setAbaAtiva('mapa_cozinha')}
        >
          <ChefHat className="w-3.5 h-3.5 mr-1.5" />
          Mapa da Cozinha & Copa
        </Button>

        <Button
          variant={abaAtiva === 'catalogos' ? 'default' : 'ghost'}
          size="sm"
          className={`text-xs h-8 ${abaAtiva === 'catalogos' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
          onClick={() => setAbaAtiva('catalogos')}
        >
          <BookOpen className="w-3.5 h-3.5 mr-1.5" />
          Catálogo de Refeições & Dietas
        </Button>

        <Button
          variant={abaAtiva === 'relatorios' ? 'default' : 'ghost'}
          size="sm"
          className={`text-xs h-8 ${abaAtiva === 'relatorios' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
          onClick={() => setAbaAtiva('relatorios')}
        >
          <FileBarChart className="w-3.5 h-3.5 mr-1.5" />
          Relatório Consolidado A4
        </Button>
      </div>

      {/* Seletor de Paciente no Topo (apenas se estiver na aba de Prescrição) */}
      {abaAtiva === 'prescricao' && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Buscar Paciente Internado ou em Observação no PA:
            </span>
            {pacienteSelecionado && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-slate-500 hover:text-red-600 px-2"
                onClick={() => handleSelecionarPaciente(undefined)}
              >
                Limpar Seleção
              </Button>
            )}
          </div>
          <SeletorPaciente
            pacienteInicial={pacienteSelecionado}
            pacienteSelecionadoId={pacienteSelecionado?.id}
            onSelecionar={(p) => handleSelecionarPaciente(p || undefined)}
          />
        </div>
      )}

      {/* Conteúdo da Aba Selecionada */}
      {abaAtiva === 'prescricao' && (
        <PrescricaoSndTab
          pacienteSelecionado={pacienteSelecionado}
          internacaoAtiva={internacaoAtiva}
          atendimentoPaAtivo={atendimentoPaAtivo}
          leitos={leitos}
          setores={setores}
          dietas={dietas}
          refeicoes={refeicoes}
          prescricoesHistorico={prescricoesHistorico}
          carregandoHistorico={carregandoHistorico}
          onPrescricaoCriada={() => {
            if (pacienteSelecionado) handleSelecionarPaciente(pacienteSelecionado)
            carregarMapaCozinha()
          }}
          podePrescrever={podePrescrever}
          seqReferencia={seqRef}
        />
      )}

      {abaAtiva === 'mapa_cozinha' && (
        <MapaCozinhaSndTab
          itensMapa={itensMapaCozinha}
          setores={setores}
          refeicoes={refeicoes}
          carregando={carregandoMapa}
          dataOperacional={dataOperacionalCozinha}
          setDataOperacional={setDataOperacionalCozinha}
          setorSelecionadoId={setorSelecionadoCozinha}
          setSetorSelecionadoId={setSetorSelecionadoCozinha}
          onAtualizar={() => carregarMapaCozinha()}
          podeOperarCozinha={podeOperarCozinha}
        />
      )}

      {abaAtiva === 'catalogos' && (
        <CatalogoSndTab
          refeicoes={refeicoes}
          dietas={dietas}
          onAtualizar={() => carregarDadosBase()}
          podeEditar={podeGerenciarCatalogos}
        />
      )}

      {abaAtiva === 'relatorios' && (
        <RelatoriosSndTab
          setores={setores}
          leitos={leitos}
          pacientes={pacientes}
          refeicoes={refeicoes}
          podeOperarEstoque={podeOperarEstoque}
        />
      )}
    </div>
  )
}
