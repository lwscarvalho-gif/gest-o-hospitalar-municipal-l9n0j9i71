import React, { useState, useEffect } from 'react'
import {
  Paciente,
  Internacao,
  FichaProntoAtendimento,
  Leito,
  Setor,
  DietaCatalogoSND,
  ItemCardapioRefeicao,
  CategoriaDietaSND,
  PrescricaoDieteticaSND,
} from '@/types/hospital'
import { emitirPrescricaoDietetica, suspenderPrescricaoDietetica } from '@/services/snd'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Stethoscope,
  AlertCircle,
  Clock,
  ShieldCheck,
  Calendar,
  Layers,
  History,
  CheckCircle2,
  XCircle,
  FileText,
  UserCheck,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PrescricaoSndTabProps {
  pacienteSelecionado?: Paciente
  internacaoAtiva?: Internacao
  atendimentoPaAtivo?: FichaProntoAtendimento
  leitos: Leito[]
  setores: Setor[]
  dietas: DietaCatalogoSND[]
  refeicoes: ItemCardapioRefeicao[]
  prescricoesHistorico: PrescricaoDieteticaSND[]
  carregandoHistorico: boolean
  onPrescricaoCriada: () => void
  podePrescrever: boolean
  seqReferencia?: React.MutableRefObject<number>
}

export const PrescricaoSndTab: React.FC<PrescricaoSndTabProps> = ({
  pacienteSelecionado,
  internacaoAtiva,
  atendimentoPaAtivo,
  leitos,
  setores,
  dietas,
  refeicoes,
  prescricoesHistorico,
  carregandoHistorico,
  onPrescricaoCriada,
  podePrescrever,
  seqReferencia,
}) => {
  const { toast } = useToast()

  // Prescrição Ativa Vigente (se houver no histórico)
  const prescricaoAtivaVigente = prescricoesHistorico.find((p) => p.status === 'ativa')

  // Formulário da Prescrição Humana
  const [dietaSelecionadaId, setDietaSelecionadaId] = useState<string>('')
  const [consistencia, setConsistencia] = useState<string>('')
  const [viaAdministracao, setViaAdministracao] = useState<string>('oral')
  const [quantidade, setQuantidade] = useState<string>('')
  const [unidadeMedida, setUnidadeMedida] = useState<string>('ml')
  const [fracionamento, setFracionamento] = useState<string>('6x ao dia (padrão SND)')
  const [vigenciaInicio, setVigenciaInicio] = useState<string>(() =>
    new Date().toISOString().slice(0, 16),
  )
  const [restricoesAlimentares, setRestricoesAlimentares] = useState<string>('')
  const [alergiasVerificadas, setAlergiasVerificadas] = useState<string>('')
  const [observacoesProfissionais, setObservacoesProfissionais] = useState<string>('')
  const [diagnosticoJustificativa, setDiagnosticoJustificativa] = useState<string>('')
  const [horariosMarcados, setHorariosMarcados] = useState<Record<string, boolean>>({})

  // Estado de submissão e idempotência persistente
  const [salvando, setSalvando] = useState(false)
  const [chaveIdempotenciaAtual, setChaveIdempotenciaAtual] = useState<string>(
    () => `snd-presc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  )

  // Suspensão / Cancelamento de Prescrição
  const [modalSuspenderAberta, setModalSuspenderAberta] = useState(false)
  const [prescricaoParaSuspender, setPrescricaoParaSuspender] =
    useState<PrescricaoDieteticaSND | null>(null)
  const [motivoSuspensao, setMotivoSuspensao] = useState('')
  const [suspendendo, setSuspendendo] = useState(false)

  // Atualiza horários padrão quando o cardápio carregar
  useEffect(() => {
    const iniciais: Record<string, boolean> = {}
    refeicoes
      .filter((r) => r.ativo)
      .forEach((r) => {
        iniciais[r.codigo] = true
      })
    setHorariosMarcados(iniciais)
  }, [refeicoes])

  // Ao selecionar um tipo de dieta, auto-preenche consistência padrão
  const handleSelecionarDieta = (dietaId: string) => {
    setDietaSelecionadaId(dietaId)
    const encontrada = dietas.find((d) => d.id === dietaId)
    if (encontrada) {
      if (encontrada.consistencia) {
        setConsistencia(encontrada.consistencia)
      }
      if (encontrada.categoria === 'enteral') {
        setViaAdministracao('sonda_nasoenteral')
        setUnidadeMedida('ml')
      } else if (encontrada.categoria === 'parenteral') {
        setViaAdministracao('parenteral_central')
        setUnidadeMedida('ml/h')
      } else {
        setViaAdministracao('oral')
      }
    }
  }

  const handleToggleHorario = (cod: string) => {
    setHorariosMarcados((prev) => ({
      ...prev,
      [cod]: !prev[cod],
    }))
  }

  // Submissão da Prescrição com Proteção de Conflito e Sem Perda de Texto
  const handleGravarPrescricao = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!pacienteSelecionado) {
      toast({
        title: 'Paciente não selecionado',
        description: 'Selecione um paciente ativo para emitir a prescrição dietética.',
        variant: 'destructive',
      })
      return
    }

    if (!internacaoAtiva && !atendimentoPaAtivo) {
      toast({
        title: 'Episódio assistencial obrigatório',
        description:
          'A prescrição dietética humana exige vínculo estrito com uma internação ativa ou atendimento de PA em observação.',
        variant: 'destructive',
      })
      return
    }

    if (!dietaSelecionadaId) {
      toast({
        title: 'Tipo de dieta obrigatório',
        description: 'Selecione o tipo de dieta do catálogo institucional.',
        variant: 'destructive',
      })
      return
    }

    const dietaObj = dietas.find((d) => d.id === dietaSelecionadaId)
    if (!dietaObj) {
      toast({
        title: 'Dieta não encontrada',
        description: 'Selecione uma dieta válida no catálogo.',
        variant: 'destructive',
      })
      return
    }

    // Monta array de horários selecionados
    const listaHorarios = refeicoes
      .filter((r) => r.ativo && horariosMarcados[r.codigo])
      .map((r) => ({
        refeicao_codigo: r.codigo,
        horario: r.horario_padrao,
      }))

    setSalvando(true)
    const seqMomento = seqReferencia?.current

    try {
      await emitirPrescricaoDietetica({
        paciente_ref: pacienteSelecionado.id,
        internacao_ref: internacaoAtiva?.id,
        atendimento_pa_ref: atendimentoPaAtivo?.id,
        leito_ref: internacaoAtiva?.leito_atual || undefined,
        setor_ref: internacaoAtiva?.setor_atual || undefined,
        dieta_catalogo_ref: dietaSelecionadaId,
        categoria_dieta: dietaObj.categoria,
        consistencia: consistencia.trim() || undefined,
        via_administracao: viaAdministracao,
        quantidade: quantidade ? Number(quantidade) : undefined,
        unidade_medida: unidadeMedida,
        fracionamento: fracionamento.trim() || undefined,
        horarios_refeicoes: listaHorarios,
        vigencia_inicio: vigenciaInicio ? new Date(vigenciaInicio).toISOString() : undefined,
        restricoes_alimentares: restricoesAlimentares.trim() || undefined,
        alergias_verificadas: alergiasVerificadas.trim() || undefined,
        observacoes_profissionais: observacoesProfissionais.trim() || undefined,
        diagnostico_justificativa_clinica: diagnosticoJustificativa.trim() || undefined,
        prescricao_anterior_ref: prescricaoAtivaVigente?.id,
        idempotency_key: chaveIdempotenciaAtual,
      })

      // Verifica se a resposta não é de uma sessão antiga (seqRef)
      if (seqReferencia && seqMomento !== undefined && seqReferencia.current !== seqMomento) {
        return
      }

      toast({
        title: 'Prescrição Emitida com Sucesso',
        description: `Prescrição dietética humana homologada no SND para ${pacienteSelecionado.nome}.`,
      })

      // Gera nova chave para a próxima emissão e limpa os campos clínicos
      setChaveIdempotenciaAtual(
        `snd-presc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      )
      setDiagnosticoJustificativa('')
      setObservacoesProfissionais('')
      onPrescricaoCriada()
    } catch (err: unknown) {
      // Conflito mantém o formulário intacto (sem perda de texto digitado)
      // Mantém a mesma chave de idempotência para retentativa segura
      const msg = String(err instanceof Error ? err.message : err)
      toast({
        title: 'Atenção no Registro da Prescrição',
        description: msg.includes('IDEMPOTENT_HIT')
          ? 'Esta prescrição já foi processada anteriormente com sucesso.'
          : msg,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Confirmação de Suspensão de Prescrição Anterior
  const handleConfirmarSuspensao = async () => {
    if (!prescricaoParaSuspender) return
    if (!motivoSuspensao.trim() || motivoSuspensao.trim().length < 3) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe o motivo clínico/assistencial da suspensão (mínimo 3 caracteres).',
        variant: 'destructive',
      })
      return
    }

    setSuspendendo(true)
    try {
      await suspenderPrescricaoDietetica({
        prescricao_id: prescricaoParaSuspender.id,
        motivo: motivoSuspensao.trim(),
      })

      toast({
        title: 'Prescrição Suspensa',
        description:
          'Prescrição dietética suspensa no SND. O histórico anterior permanece preservado.',
      })
      setModalSuspenderAberta(false)
      setPrescricaoParaSuspender(null)
      setMotivoSuspensao('')
      onPrescricaoCriada()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao suspender',
        description: String(err instanceof Error ? err.message : err),
        variant: 'destructive',
      })
    } finally {
      setSuspendendo(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Aviso de Segurança Assistencial (Humano exclusivo) */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-900 leading-relaxed space-y-1">
          <p className="font-semibold text-amber-950">
            Prescrição Humana Exclusiva (Requisito 7.4.3.5.a.i–ii e Anexo I)
          </p>
          <p>
            O sistema NÃO efetua recomendação nutricional automática, cálculo de calorias ou decisão
            automática de dieta. Todas as orientações, horários, restrições e composições decorrem
            estritamente da avaliação e prescrição clínica de médico ou nutricionista habilitado com
            identificação profissional registrada.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 e 2: Formulário de Prescrição */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  Prescrição Dietética Individualizada
                </CardTitle>
                <p className="text-xs text-slate-500">
                  {pacienteSelecionado
                    ? `Paciente: ${pacienteSelecionado.nome}`
                    : 'Selecione um paciente para iniciar a prescrição'}
                </p>
              </div>
              {prescricaoAtivaVigente && (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-2 py-0.5">
                  Dieta Ativa Vigente
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-4">
              {!pacienteSelecionado ? (
                <div className="text-center py-10 text-slate-400 space-y-2">
                  <UserCheck className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs">
                    Nenhum paciente selecionado. Utilize a busca acima para vincular o prontuário.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleGravarPrescricao} className="space-y-4 text-xs">
                  {/* Dados do Episódio Assistencial Vinculado */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Episódio Assistencial:</span>
                      <strong className="text-slate-800">
                        {internacaoAtiva
                          ? `Internação Ativa (#${internacaoAtiva.id.substring(0, 8)})`
                          : atendimentoPaAtivo
                            ? `Pronto Atendimento (#${atendimentoPaAtivo.id.substring(0, 8)})`
                            : 'Sem internação ou PA ativo'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Leito / Acomodação:</span>
                      <strong className="text-slate-800">
                        {internacaoAtiva?.leito_atual
                          ? leitos.find((l) => l.id === internacaoAtiva.leito_atual)?.codigo ||
                            internacaoAtiva.leito_atual
                          : 'Ambulatório / Observação PA'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Setor / Unidade:</span>
                      <strong className="text-slate-800">
                        {internacaoAtiva?.setor_atual
                          ? setores.find((s) => s.id === internacaoAtiva.setor_atual)?.nome ||
                            internacaoAtiva.setor_atual
                          : 'Pronto Socorro / Geral'}
                      </strong>
                    </div>
                  </div>

                  {/* Seleção do Tipo de Dieta */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Tipo de Dieta (Catálogo Vigente) *
                      </label>
                      <select
                        className="w-full h-9 rounded-md border border-slate-300 px-3 bg-white text-xs"
                        value={dietaSelecionadaId}
                        onChange={(e) => handleSelecionarDieta(e.target.value)}
                        required
                        disabled={!podePrescrever || salvando}
                      >
                        <option value="">Selecione a dieta homologada...</option>
                        {dietas
                          .filter((d) => d.ativo)
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              [{d.categoria.toUpperCase()}] {d.nome} (v{d.versao || 1})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Consistência / Textura
                      </label>
                      <Input
                        placeholder="ex: pastosa, líquida completa, branda, infundível"
                        value={consistencia}
                        onChange={(e) => setConsistencia(e.target.value)}
                        disabled={!podePrescrever || salvando}
                      />
                    </div>
                  </div>

                  {/* Via de Administração e Fracionamento */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Via de Administração *
                      </label>
                      <select
                        className="w-full h-9 rounded-md border border-slate-300 px-3 bg-white text-xs"
                        value={viaAdministracao}
                        onChange={(e) => setViaAdministracao(e.target.value)}
                        disabled={!podePrescrever || salvando}
                      >
                        <option value="oral">Via Oral</option>
                        <option value="sonda_nasogastrica">Sonda Nasogástrica (SNG)</option>
                        <option value="sonda_nasoenteral">Sonda Nasoenteral (SNE)</option>
                        <option value="gastrostomia">Gastrostomia (GTT)</option>
                        <option value="jejunostomia">Jejunostomia</option>
                        <option value="parenteral_central">Parenteral Central</option>
                        <option value="parenteral_periferica">Parenteral Periférica</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Volume / Quantidade por Horário
                      </label>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          placeholder="ex: 250"
                          value={quantidade}
                          onChange={(e) => setQuantidade(e.target.value)}
                          disabled={!podePrescrever || salvando}
                        />
                        <select
                          className="w-24 h-9 rounded-md border border-slate-300 px-2 bg-white text-xs"
                          value={unidadeMedida}
                          onChange={(e) => setUnidadeMedida(e.target.value)}
                          disabled={!podePrescrever || salvando}
                        >
                          <option value="ml">ml</option>
                          <option value="g">gramas</option>
                          <option value="kcal">kcal</option>
                          <option value="ml/h">ml/h</option>
                          <option value="gotas/min">gotas/min</option>
                          <option value="porcao">porção</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Fracionamento / Frequência
                      </label>
                      <Input
                        placeholder="ex: 6x ao dia, contínuo 24h, 3 em 3h"
                        value={fracionamento}
                        onChange={(e) => setFracionamento(e.target.value)}
                        disabled={!podePrescrever || salvando}
                      />
                    </div>
                  </div>

                  {/* Horários e Refeições Previstas */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Horários de Distribuição Selecionados para Esta Prescrição
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                      {refeicoes
                        .filter((r) => r.ativo)
                        .map((r) => {
                          const marcado = Boolean(horariosMarcados[r.codigo])
                          return (
                            <button
                              type="button"
                              key={r.id}
                              onClick={() => handleToggleHorario(r.codigo)}
                              disabled={!podePrescrever || salvando}
                              className={`p-2 rounded-lg border text-left transition-all ${
                                marcado
                                  ? 'bg-blue-50 border-blue-400 text-blue-900 font-medium'
                                  : 'bg-white border-slate-200 text-slate-400 opacity-60'
                              }`}
                            >
                              <div className="text-[11px] font-semibold">{r.nome}</div>
                              <div className="text-[10px] text-slate-500">{r.horario_padrao}</div>
                            </button>
                          )
                        })}
                    </div>
                  </div>

                  {/* Restrições e Alergias Alimentares */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Restrições Alimentares (Enviado à Cozinha)
                      </label>
                      <Input
                        placeholder="ex: Hipossódica, sem açúcar, sem glúten, rica em resíduos..."
                        value={restricoesAlimentares}
                        onChange={(e) => setRestricoesAlimentares(e.target.value)}
                        disabled={!podePrescrever || salvando}
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Alergias Verificadas (Alerta Cozinha)
                      </label>
                      <Input
                        placeholder="ex: Proteína do leite de vaca (APLV), frutos do mar, soja..."
                        value={alergiasVerificadas}
                        onChange={(e) => setAlergiasVerificadas(e.target.value)}
                        disabled={!podePrescrever || salvando}
                      />
                    </div>
                  </div>

                  {/* Observações Operacionais e Início da Vigência */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Observações Operacionais (Cozinha/Copa)
                      </label>
                      <Textarea
                        rows={2}
                        placeholder="ex: Servir em temperatura ambiente; ofertar água filtrada nos intervalos..."
                        value={observacoesProfissionais}
                        onChange={(e) => setObservacoesProfissionais(e.target.value)}
                        disabled={!podePrescrever || salvando}
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Início da Vigência da Prescrição *
                      </label>
                      <Input
                        type="datetime-local"
                        value={vigenciaInicio}
                        onChange={(e) => setVigenciaInicio(e.target.value)}
                        required
                        disabled={!podePrescrever || salvando}
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">
                        A confirmação desta prescrição encerra automaticamente qualquer prescrição
                        dietética anterior desta internação, preservando o histórico imutável.
                      </span>
                    </div>
                  </div>

                  {/* Campo Clínico Restrito: Diagnóstico / Justificativa Clínica */}
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                    <label className="font-semibold text-rose-900 block mb-1 flex items-center justify-between">
                      <span>Diagnóstico e Justificativa Clínica (MÉDICA/NUTRICIONAL RESTRITA)</span>
                      <span className="text-[10px] text-rose-700 font-normal">
                        Sigilo LGPD: Não é exposto à cozinha/copa
                      </span>
                    </label>
                    <Textarea
                      rows={2}
                      placeholder="Diagnóstico clínico, CID ou justificativa assistencial restrita para o prontuário..."
                      value={diagnosticoJustificativa}
                      onChange={(e) => setDiagnosticoJustificativa(e.target.value)}
                      disabled={!podePrescrever || salvando}
                      className="bg-white"
                    />
                  </div>

                  {/* Botão de Confirmação Humana */}
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Chave Idempotência: {chaveIdempotenciaAtual.substring(0, 20)}...
                    </span>
                    <div className="flex gap-2">
                      {prescricaoAtivaVigente && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-amber-300 text-amber-800 hover:bg-amber-50"
                          onClick={() => {
                            setPrescricaoParaSuspender(prescricaoAtivaVigente)
                            setModalSuspenderAberta(true)
                          }}
                          disabled={!podePrescrever || salvando}
                        >
                          Suspender Prescrição Atual
                        </Button>
                      )}
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                        disabled={!podePrescrever || salvando}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {salvando ? 'Confirmando no Servidor...' : 'Confirmar Prescrição Dietética'}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna 3: Histórico e Rastreabilidade de Versões */}
        <div className="space-y-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <History className="w-4 h-4 text-purple-600" />
                Histórico de Prescrições (Auditável)
              </CardTitle>
              <p className="text-xs text-slate-500">Versões anteriores e vigentes deste paciente</p>
            </CardHeader>
            <CardContent className="p-3 space-y-2.5">
              {carregandoHistorico ? (
                <p className="text-xs text-slate-400 py-6 text-center">Consultando histórico...</p>
              ) : prescricoesHistorico.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  Nenhuma prescrição dietética emitida para este paciente.
                </p>
              ) : (
                prescricoesHistorico.map((presc) => {
                  const statusColors: Record<string, string> = {
                    ativa: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                    alterada: 'bg-slate-100 text-slate-700 border-slate-300',
                    suspensa: 'bg-amber-100 text-amber-800 border-amber-300',
                    encerrada: 'bg-rose-100 text-rose-800 border-rose-300',
                  }
                  return (
                    <div
                      key={presc.id}
                      className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1.5 transition-all hover:border-slate-300"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="font-semibold text-slate-900 text-[13px]">
                            {presc.dieta_nome_snapshot || 'Dieta'}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Versão {presc.versao_numero || 1} •{' '}
                            {presc.categoria_dieta?.toUpperCase()}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-1.5 ${
                            statusColors[presc.status] || statusColors.alterada
                          }`}
                        >
                          {presc.status}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        {presc.consistencia && (
                          <div>
                            <span className="text-slate-400">Consistência:</span>{' '}
                            {presc.consistencia}
                          </div>
                        )}
                        {presc.via_administracao && (
                          <div>
                            <span className="text-slate-400">Via:</span> {presc.via_administracao}
                          </div>
                        )}
                        {presc.restricoes_alimentares && (
                          <div>
                            <span className="text-slate-400">Restrições:</span>{' '}
                            {presc.restricoes_alimentares}
                          </div>
                        )}
                        <div>
                          <span className="text-slate-400">Prescritor:</span>{' '}
                          <strong>{presc.prescritor_nome}</strong> ({presc.prescritor_perfil})
                        </div>
                        <div>
                          <span className="text-slate-400">Emitida em:</span>{' '}
                          {new Date(presc.data_hora_prescricao_utc || presc.created).toLocaleString(
                            'pt-BR',
                          )}
                        </div>
                        {presc.motivo_alteracao_suspensao && (
                          <div className="p-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-700 italic">
                            {presc.motivo_alteracao_suspensao}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Suspensão Formal de Prescrição */}
      <Dialog open={modalSuspenderAberta} onOpenChange={setModalSuspenderAberta}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-amber-900">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Suspender Prescrição Dietética
            </DialogTitle>
            <DialogDescription className="text-xs">
              A suspensão encerra o ciclo operacional da dieta sem apagar registros anteriores. É
              obrigatório informar a justificativa clínica/assistencial formal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Motivo da Suspensão *
              </label>
              <Textarea
                rows={3}
                placeholder="ex: Paciente colocado em jejum para procedimento cirúrgico; alteração de quadro clínico..."
                value={motivoSuspensao}
                onChange={(e) => setMotivoSuspensao(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalSuspenderAberta(false)}
              disabled={suspendendo}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleConfirmarSuspensao}
              disabled={suspendendo}
            >
              {suspendendo ? 'Suspendendo...' : 'Confirmar Suspensão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
