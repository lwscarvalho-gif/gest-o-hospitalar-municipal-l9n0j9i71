import React, { useState, useEffect } from 'react'
import { ItemFilaRIS, FormaRecebimentoEntregaRIS, RisEntregaLaudo } from '@/types/hospital'
import {
  registrarEntregaLaudo,
  ConflitoVersaoRetificadaError,
  IdempotenciaConflitoPayloadError,
} from '@/services/ris'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  ShieldAlert,
  Printer,
  RotateCcw,
  UserCheck,
} from 'lucide-react'
import {
  ReciboSanitizadoEntregaA4,
  criarSnapshotReciboEntrega,
  ReciboEntregaRISSnapshot,
} from '@/components/ReciboSanitizadoEntregaA4'

interface ModalEntregaLaudoRISProps {
  aberto: boolean
  onOpenChange: (aberto: boolean) => void
  exame: ItemFilaRIS | null
  onSucesso: (entrega: RisEntregaLaudo) => void
  eventoAnteriorParaCorrecao?: RisEntregaLaudo | null
}

interface FormEntregaState {
  destinatario_nome: string
  destinatario_documento: string
  destinatario_parentesco_grau: string
  forma_recebimento: FormaRecebimentoEntregaRIS
  observacao: string
  motivo_correcao: string
  versao_solicitada: number
}

interface EstadoConflitoRetificacao {
  ativo: boolean
  versaoSolicitada: number
  versaoVigente: number
  versaoVigenteId?: string
  motivoRetificacao?: string
  dataRetificacao?: string
}

export const ModalEntregaLaudoRIS: React.FC<ModalEntregaLaudoRISProps> = ({
  aberto,
  onOpenChange,
  exame,
  onSucesso,
  eventoAnteriorParaCorrecao,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  // Chave de idempotência estável por sessão de submissão
  const [idempotencyKey, setIdempotencyKey] = useState('')

  // Formulário: preserva texto em caso de erro 409 para revisão humana
  const [form, setForm] = useState<FormEntregaState>({
    destinatario_nome: '',
    destinatario_documento: '',
    destinatario_parentesco_grau: 'Próprio Paciente',
    forma_recebimento: 'presencial_proprio_paciente',
    observacao: '',
    motivo_correcao: '',
    versao_solicitada: 1,
  })

  // Controle de submissão
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  // Estado de conflito 409 de retificação posterior detectada
  const [conflitoRetificacao, setConflitoRetificacao] = useState<EstadoConflitoRetificacao | null>(
    null,
  )
  const [confirmacaoExplicitaVersao, setConfirmacaoExplicitaVersao] = useState(false)

  // Prévia e Recibo Emitido
  const [etapa, setEtapa] = useState<'formulario' | 'previa' | 'recibo_emitido'>('formulario')
  const [reciboSnapshot, setReciboSnapshot] = useState<ReciboEntregaRISSnapshot | null>(null)

  // Inicializa dados ao abrir ou ao trocar de exame/evento
  useEffect(() => {
    if (!aberto || !exame) {
      setConflitoRetificacao(null)
      setConfirmacaoExplicitaVersao(false)
      setErroForm(null)
      setEtapa('formulario')
      setReciboSnapshot(null)
      return
    }

    const versaoBase = exame.versao_atual || 1
    const novaChave = `ris-ent-${exame.id}-v${versaoBase}-${Date.now().toString(36)}`
    setIdempotencyKey(novaChave)

    if (eventoAnteriorParaCorrecao) {
      setForm({
        destinatario_nome: eventoAnteriorParaCorrecao.destinatario_nome,
        destinatario_documento: eventoAnteriorParaCorrecao.destinatario_documento,
        destinatario_parentesco_grau:
          eventoAnteriorParaCorrecao.destinatario_parentesco_grau || 'Próprio Paciente',
        forma_recebimento:
          eventoAnteriorParaCorrecao.forma_recebimento as FormaRecebimentoEntregaRIS,
        observacao: eventoAnteriorParaCorrecao.observacao || '',
        motivo_correcao: '',
        versao_solicitada: eventoAnteriorParaCorrecao.versao_entregue || versaoBase,
      })
    } else {
      setForm({
        destinatario_nome: exame.paciente_nome || '',
        destinatario_documento: exame.paciente_cpf_mascarado ? '' : '',
        destinatario_parentesco_grau: 'Próprio Paciente',
        forma_recebimento: 'presencial_proprio_paciente',
        observacao: '',
        motivo_correcao: '',
        versao_solicitada: versaoBase,
      })
    }
    setConflitoRetificacao(null)
    setConfirmacaoExplicitaVersao(false)
    setErroForm(null)
    setEtapa('formulario')
    setReciboSnapshot(null)
  }, [aberto, exame?.id, eventoAnteriorParaCorrecao?.id])

  // Ações de preenchimento rápido de destinatário
  const handleSelecionarProprioPaciente = () => {
    if (!exame) return
    setForm((prev) => ({
      ...prev,
      destinatario_nome: exame.paciente_nome || '',
      destinatario_parentesco_grau: 'Próprio Paciente',
      forma_recebimento: 'presencial_proprio_paciente',
    }))
  }

  const handleSelecionarResponsavelFamiliar = () => {
    setForm((prev) => ({
      ...prev,
      destinatario_parentesco_grau:
        prev.destinatario_parentesco_grau === 'Próprio Paciente'
          ? 'Responsável Legal'
          : prev.destinatario_parentesco_grau,
      forma_recebimento: 'presencial_responsavel_legal',
    }))
  }

  const handleSelecionarInternoSetor = () => {
    setForm((prev) => ({
      ...prev,
      destinatario_parentesco_grau: 'Profissional de Enfermagem / Setor',
      forma_recebimento: 'interno_setor_clinico',
    }))
  }

  // Validação básica do formulário antes da prévia/envio
  const validarFormulario = (): boolean => {
    setErroForm(null)
    if (!form.destinatario_nome.trim() || form.destinatario_nome.trim().length < 3) {
      setErroForm('O nome do destinatário é obrigatório (mínimo de 3 caracteres).')
      return false
    }
    if (!form.destinatario_documento.trim() || form.destinatario_documento.trim().length < 3) {
      setErroForm(
        'A identificação documental do destinatário (RG, CPF ou Matrícula) é obrigatória para conferência.',
      )
      return false
    }
    if (eventoAnteriorParaCorrecao) {
      if (!form.motivo_correcao.trim() || form.motivo_correcao.trim().length < 5) {
        setErroForm(
          'Para retificação de recibo é obrigatório justificar o motivo da correção (mínimo 5 caracteres).',
        )
        return false
      }
    }
    return true
  }

  const handleAvancarParaPrevia = () => {
    if (!validarFormulario()) return
    setEtapa('previa')
  }

  const handleVoltarParaFormulario = () => {
    setEtapa('formulario')
  }

  // Submissão formal com chave de idempotência preservada e tratamento do 409
  const handleConfirmarEntrega = async () => {
    if (!exame) return
    if (!validarFormulario()) {
      setEtapa('formulario')
      return
    }

    setSalvando(true)
    setErroForm(null)

    try {
      const res = await registrarEntregaLaudo({
        exame_id: exame.id,
        paciente_id: exame.paciente_id,
        versao_entregue: form.versao_solicitada,
        destinatario_nome: form.destinatario_nome.trim(),
        destinatario_documento: form.destinatario_documento.trim(),
        destinatario_parentesco_grau: form.destinatario_parentesco_grau.trim(),
        forma_recebimento: form.forma_recebimento,
        observacao: form.observacao.trim() || undefined,
        idempotency_key: idempotencyKey, // Mantém a MESMA chave em reenvio
        confirmar_versao_divergente: confirmacaoExplicitaVersao,
        evento_anterior_ref: eventoAnteriorParaCorrecao?.id || undefined,
        motivo_correcao: form.motivo_correcao.trim() || undefined,
      })

      toast({
        title: res.idempotente
          ? 'Comprovante Reenviado (Idempotente)'
          : eventoAnteriorParaCorrecao
            ? 'Recibo Retificado com Sucesso'
            : 'Entrega Formal Registrada',
        description: `Protocolo: ${res.entrega.protocolo_entrega} • Versão ${res.entrega.versao_entregue}`,
      })

      const snapshot = criarSnapshotReciboEntrega(res.entrega)
      setReciboSnapshot(snapshot)
      setEtapa('recibo_emitido')
      onSucesso(res.entrega)
    } catch (err: unknown) {
      // 1. Trata ConflitoVersaoRetificadaError (409 do servidor):
      // Preserva o formulário integralmente e apresenta o ALERTA VISÍVEL com a versão vigente
      if (err instanceof ConflitoVersaoRetificadaError) {
        setConflitoRetificacao({
          ativo: true,
          versaoSolicitada: err.versaoSolicitada,
          versaoVigente: err.versaoVigente,
          versaoVigenteId: err.versaoVigenteId,
          motivoRetificacao: err.motivoRetificacao,
          dataRetificacao: err.dataRetificacao,
        })
        setErroForm(
          `Atenção: Existe uma versão retificada mais recente (V${err.versaoVigente}) deste laudo. ` +
            `Revise os detalhes abaixo antes de confirmar a entrega da versão solicitada (V${err.versaoSolicitada}).`,
        )
        // Mantém na prévia com o alerta aberto para decisão humana explícita
        setEtapa('previa')
        return
      }

      // 2. Trata IdempotenciaConflitoPayloadError (409 do servidor)
      if (err instanceof IdempotenciaConflitoPayloadError) {
        setErroForm(
          'Conflito de Idempotência: Esta chave já foi enviada anteriormente com dados diferentes. ' +
            'Gere uma nova submissão ou revise os campos.',
        )
        setEtapa('formulario')
        return
      }

      // 3. Demais erros: preserva o texto digitado do operador
      const msg = err instanceof Error ? err.message : 'Falha ao registrar entrega formal do laudo.'
      setErroForm(msg)
      setEtapa('formulario')
    } finally {
      setSalvando(false)
    }
  }

  if (!exame) return null

  const versaoVigenteExame = exame.versao_atual || 1

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-sky-700" />
            {eventoAnteriorParaCorrecao
              ? `Retificar Recibo de Entrega (Protocolo ${eventoAnteriorParaCorrecao.protocolo_entrega})`
              : 'Registro Formal de Entrega de Laudo RIS (7.4.3.4.c.i)'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {eventoAnteriorParaCorrecao
              ? 'Gera novo evento administrativo de correção preservando o original imutável.'
              : 'Conferência presencial humana do destinatário e registro de versão exata entregue.'}
          </DialogDescription>
        </DialogHeader>

        {/* ALERTA DE ERRO GERAL / MENSAGEM */}
        {erroForm && (
          <div className="p-3 bg-red-50 border border-red-300 rounded text-red-900 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block">Aviso de Bloqueio / Inconsistência</strong>
              <p>{erroForm}</p>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* ETAPA 1: FORMULÁRIO DE CONFERÊNCIA HUMANA DO DESTINATÁRIO */}
        {/* ==================================================================== */}
        {etapa === 'formulario' && (
          <div className="space-y-4 text-xs">
            {/* Cartão de Resumo do Exame e Versão Vigente */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Paciente
                </span>
                <strong className="text-slate-900">{exame.paciente_nome}</strong>
                <div className="text-[10px] text-slate-500 font-mono">
                  {exame.paciente_cpf_mascarado || 'CPF Não informado'}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Exame / Procedimento
                </span>
                <strong className="text-slate-900">{exame.tipo_exame}</strong>
                <div className="text-[10px] text-slate-500 uppercase">
                  Modalidade: {exame.modalidade_ris}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Versão Atual no Sistema
                </span>
                <div className="inline-flex items-center gap-1 mt-0.5">
                  <span className="bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded font-bold font-mono border border-emerald-300">
                    VERSÃO {versaoVigenteExame}
                  </span>
                </div>
              </div>
            </div>

            {/* Se for correção de recibo anterior */}
            {eventoAnteriorParaCorrecao && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded space-y-2">
                <div className="flex items-center gap-1.5 text-amber-950 font-bold">
                  <RotateCcw className="w-4 h-4 text-amber-700" />
                  Correção Administrativa de Recibo
                </div>
                <p className="text-amber-900 text-[11px]">
                  O recibo original #{eventoAnteriorParaCorrecao.protocolo_entrega} será preservado
                  intacto para fins de auditoria. O novo evento registrará a retificação com vínculo
                  ao evento anterior.
                </p>
                <div>
                  <label className="text-[11px] font-bold text-amber-950 block mb-1">
                    Motivo / Justificativa da Correção (Obrigatório, min. 5 caracteres): *
                  </label>
                  <Textarea
                    placeholder="Ex: Correção de dígito do RG do recebedor informado erroneamente no balcão."
                    value={form.motivo_correcao}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, motivo_correcao: e.target.value }))
                    }
                    className="text-xs min-h-[60px] bg-white border-amber-300"
                  />
                </div>
              </div>
            )}

            {/* Bloco de Seleção Rápida de Destinatário */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-700 block">
                Atalhos de Destinatário / Conferência:
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelecionarProprioPaciente}
                  className="h-7 text-[11px] text-slate-700"
                >
                  <UserCheck className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Próprio Paciente
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelecionarResponsavelFamiliar}
                  className="h-7 text-[11px] text-slate-700"
                >
                  Responsável / Familiar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelecionarInternoSetor}
                  className="h-7 text-[11px] text-slate-700"
                >
                  Setor Clínico / Leito
                </Button>
              </div>
            </div>

            {/* Campos do Formulário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Nome Completo do Destinatário: *
                </label>
                <Input
                  placeholder="Nome de quem está recebendo o laudo"
                  value={form.destinatario_nome}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, destinatario_nome: e.target.value }))
                  }
                  className="text-xs h-8"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Documento de Identificação (RG, CPF ou Matrícula): *
                </label>
                <Input
                  placeholder="Doc. conferido presencialmente"
                  value={form.destinatario_documento}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, destinatario_documento: e.target.value }))
                  }
                  className="text-xs h-8 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Grau de Parentesco / Vínculo:
                </label>
                <Input
                  placeholder="Ex: Próprio Paciente, Cônjuge, Filho(a), Enfermagem"
                  value={form.destinatario_parentesco_grau}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, destinatario_parentesco_grau: e.target.value }))
                  }
                  className="text-xs h-8"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Forma de Recebimento: *
                </label>
                <Select
                  value={form.forma_recebimento}
                  onValueChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      forma_recebimento: val as FormaRecebimentoEntregaRIS,
                    }))
                  }
                >
                  <SelectTrigger className="text-xs h-8 bg-white">
                    <SelectValue placeholder="Selecione a forma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial_proprio_paciente">
                      Presencial - Próprio Paciente
                    </SelectItem>
                    <SelectItem value="presencial_responsavel_legal">
                      Presencial - Responsável Legal / Familiar
                    </SelectItem>
                    <SelectItem value="interno_setor_clinico">
                      Interno - Setor Clínico / Leito / Posto
                    </SelectItem>
                    <SelectItem value="interno_medico_assistente">
                      Interno - Médico Assistente / Consultório
                    </SelectItem>
                    <SelectItem value="outro_autorizado">
                      Outro Recebedor Formalmente Autorizado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Versão Sendo Entregue */}
            <div className="p-3 bg-sky-50 border border-sky-200 rounded flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-sky-950 block">
                  Versão do Laudo em Entrega:
                </span>
                <span className="text-[10px] text-sky-800">
                  O sistema registrará a entrega formal atrelada a esta versão exata.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-sky-900 font-semibold">Versão:</span>
                <Input
                  type="number"
                  min={1}
                  max={versaoVigenteExame}
                  value={form.versao_solicitada}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      versao_solicitada: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  className="text-xs h-8 w-20 font-mono text-center font-bold bg-white"
                />
              </div>
            </div>

            {/* Observações Opcionais */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Observações Administrativas da Entrega (Opcional):
              </label>
              <Textarea
                placeholder="Observações adicionais sobre o ato de entrega (sem conteúdo clínico confidencial)"
                value={form.observacao}
                onChange={(e) => setForm((prev) => ({ ...prev, observacao: e.target.value }))}
                className="text-xs min-h-[50px]"
              />
            </div>

            {/* Nota de Isolamento Clínico */}
            <div className="p-2.5 bg-slate-100 rounded text-[10px] text-slate-600 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                <strong>Privacidade e Menor Privilégio:</strong> Nenhum corpo clínico de laudo ou
                imagem radiológica é transitado ou persistido nesta rotina administrativa de
                entrega.
              </span>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* ETAPA 2: PRÉVIA DO COMPROVANTE COM ALERTA DE RETIFICAÇÃO POSTERIOR */}
        {/* ==================================================================== */}
        {etapa === 'previa' && (
          <div className="space-y-4 text-xs">
            {/* ALERTA VISÍVEL: Retificação Posterior Detectada (409 do servidor ou versão solicitada < vigente) */}
            {(conflitoRetificacao?.ativo || form.versao_solicitada < versaoVigenteExame) && (
              <div className="p-4 bg-amber-50 border-2 border-amber-500 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>ALERTA CRÍTICO: LAUDO POSSUI RETIFICAÇÃO POSTERIOR</span>
                </div>

                <div className="text-amber-950 space-y-1.5 leading-relaxed">
                  <p>
                    A versão solicitada para entrega é a{' '}
                    <strong>Versão {form.versao_solicitada}</strong>, porém existe a{' '}
                    <strong>
                      Versão {conflitoRetificacao?.versaoVigente || versaoVigenteExame} (Vigente)
                    </strong>{' '}
                    emitida posteriormente no prontuário deste paciente.
                  </p>

                  {(conflitoRetificacao?.motivoRetificacao ||
                    conflitoRetificacao?.dataRetificacao) && (
                    <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded text-[11px] space-y-0.5">
                      {conflitoRetificacao.motivoRetificacao && (
                        <div>
                          <strong>Motivo da Retificação no Laudo:</strong>{' '}
                          {conflitoRetificacao.motivoRetificacao}
                        </div>
                      )}
                      {conflitoRetificacao.dataRetificacao && (
                        <div className="font-mono text-[10px] text-amber-900">
                          Data da Retificação: {conflitoRetificacao.dataRetificacao}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-amber-900 text-[11px]">
                    Recomenda-se entregar sempre a <strong>versão vigente</strong> ao paciente. Se
                    for estritamente necessário entregar uma via de versão histórica arquivada, é
                    exigida a confirmação explícita abaixo pelo operador.
                  </p>
                </div>

                {/* Opções de Resolução Humana */}
                <div className="pt-2 border-t border-amber-300 flex flex-wrap items-center justify-between gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const vig = conflitoRetificacao?.versaoVigente || versaoVigenteExame
                      setForm((prev) => ({ ...prev, versao_solicitada: vig }))
                      setConflitoRetificacao(null)
                      setConfirmacaoExplicitaVersao(false)
                      setErroForm(null)
                    }}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs h-8"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Trocar para Versão Vigente (V
                    {conflitoRetificacao?.versaoVigente || versaoVigenteExame})
                  </Button>

                  <label className="flex items-center gap-2 text-xs font-bold text-amber-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmacaoExplicitaVersao}
                      onChange={(e) => setConfirmacaoExplicitaVersao(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-700 border-amber-400 focus:ring-amber-500"
                    />
                    <span>
                      Confirmo ciência e desejo entregar a Versão {form.versao_solicitada}
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Cartão de Conferência da Prévia Sanitizada */}
            <div className="border border-slate-300 rounded-lg p-4 bg-white space-y-3 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-sky-700" />
                  Prévia do Snapshot Administrativo da Entrega
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Chave: {idempotencyKey.slice(0, 18)}...
                </span>
              </div>

              {/* Tabela de conferência humana */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    Paciente Titular
                  </span>
                  <strong className="text-slate-900">{exame.paciente_nome}</strong>
                  <div className="text-[10px] text-slate-500 font-mono">
                    CPF: {exame.paciente_cpf_mascarado || '***.***.***-**'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    Procedimento / Exame
                  </span>
                  <strong className="text-slate-900">{exame.tipo_exame}</strong>
                  <div className="text-[10px] text-slate-500 uppercase">
                    Modalidade: {exame.modalidade_ris}
                  </div>
                </div>

                <div className="p-2 bg-sky-50 border border-sky-200 rounded">
                  <span className="text-sky-800 text-[10px] uppercase font-bold block">
                    Versão Exata a Ser Entregue
                  </span>
                  <strong className="text-sky-950 font-mono text-sm">
                    VERSÃO {form.versao_solicitada}
                  </strong>
                  {form.versao_solicitada === versaoVigenteExame ? (
                    <span className="text-[10px] text-emerald-700 font-semibold block">
                      (Versão Vigente Atual)
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 font-semibold block">
                      (Versão Histórica Arquivada)
                    </span>
                  )}
                </div>

                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-slate-600 text-[10px] uppercase font-bold block">
                    Destinatário Conferido
                  </span>
                  <strong className="text-slate-900">{form.destinatario_nome}</strong>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Doc: {form.destinatario_documento} • ({form.destinatario_parentesco_grau})
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                <span>
                  Modalidade de Recebimento: <strong>{form.forma_recebimento}</strong>
                </span>
                <span>
                  Operador: <strong>{user?.name || user?.email}</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* ETAPA 3: RECIBO EMITIDO (IMPRESSÃO A4 SANITIZADA) */}
        {/* ==================================================================== */}
        {etapa === 'recibo_emitido' && reciboSnapshot && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-emerald-950 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <strong>Entrega registrada com sucesso no banco de dados!</strong>
                  <div className="text-[11px] font-mono">
                    Protocolo oficial: {reciboSnapshot.protocolo_entrega}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => window.print()}
                className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs h-8"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Imprimir Recibo
              </Button>
            </div>

            {/* Folha Sanitizada Renderizada */}
            <ReciboSanitizadoEntregaA4 recibo={reciboSnapshot} />
          </div>
        )}

        {/* FOOTER DE AÇÕES */}
        <DialogFooter className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
          {etapa === 'formulario' && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAvancarParaPrevia}
                className="bg-sky-700 hover:bg-sky-600 text-white text-xs"
              >
                Revisar Prévia do Comprovante &gt;
              </Button>
            </>
          )}

          {etapa === 'previa' && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={salvando}
                onClick={handleVoltarParaFormulario}
                className="text-xs"
              >
                &lt; Corrigir Dados
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={
                  salvando ||
                  ((conflitoRetificacao?.ativo || form.versao_solicitada < versaoVigenteExame) &&
                    !confirmacaoExplicitaVersao)
                }
                onClick={handleConfirmarEntrega}
                className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs"
              >
                {salvando ? 'Gravando Evento...' : 'Confirmar e Emitir Comprovante'}
              </Button>
            </>
          )}

          {etapa === 'recibo_emitido' && (
            <div className="w-full flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Concluir e Fechar
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
