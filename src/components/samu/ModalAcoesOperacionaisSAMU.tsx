import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react'
import {
  SamuOcorrencia,
  ClassificacaoRiscoSAMU,
  StatusFluxoSAMU,
  TransporteVeiculo,
  Setor,
  Paciente,
} from '@/types/hospital'
import {
  classificarRiscoSAMU,
  atribuirUnidadeMovelSAMU,
  transitarStatusSAMU,
  vincularPacienteSAMU,
} from '@/services/samu'
import { listarPacientes } from '@/services/cadastros'
import { useToast } from '@/hooks/use-toast'

export type AcaoOperacionalTipo =
  | 'classificar_risco'
  | 'atribuir_unidade'
  | 'transicao_status'
  | 'vincular_paciente'

export interface ModalAcoesOperacionaisSAMUProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  ocorrencia: SamuOcorrencia | null
  tipoAcao: AcaoOperacionalTipo
  veiculosFrota: TransporteVeiculo[]
  setoresHospitalares: Setor[]
  usuarioPerfil?: string
  seqRef?: React.MutableRefObject<number>
}

export const ModalAcoesOperacionaisSAMU: React.FC<ModalAcoesOperacionaisSAMUProps> = ({
  open,
  onClose,
  onSuccess,
  ocorrencia,
  tipoAcao,
  veiculosFrota,
  setoresHospitalares,
  usuarioPerfil,
  seqRef,
}) => {
  const { toast } = useToast()

  // 1. Estado para Classificação de Risco
  const [riscoSelecionado, setRiscoSelecionado] = useState<
    'vermelho' | 'laranja' | 'amarelo' | 'verde' | 'azul'
  >('amarelo')
  const [justificativaRisco, setJustificativaRisco] = useState('')

  // 2. Estado para Atribuição de Unidade Móvel
  const [unidadeMovelId, setUnidadeMovelId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [destinoExterno, setDestinoExterno] = useState('')

  // 3. Estado para Transição de Status
  const [novoStatus, setNovoStatus] = useState<StatusFluxoSAMU>('em_deslocamento')
  const [motivoTransicao, setMotivoTransicao] = useState('')

  // 4. Estado para Vínculo Posterior de Paciente
  const [termoBuscaPaciente, setTermoBuscaPaciente] = useState('')
  const [buscandoPacientes, setBuscandoPacientes] = useState(false)
  const [listaPacientesEncontrados, setListaPacientesEncontrados] = useState<Paciente[]>([])
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null)
  const [observacoesVinculo, setObservacoesVinculo] = useState('')
  const [confirmacaoHumanaVinculo, setConfirmacaoHumanaVinculo] = useState(false)

  // Estados comuns de envio e erro
  const [enviando, setEnviando] = useState(false)
  const [erroOperacao, setErroOperacao] = useState<string | null>(null)
  const [conflitoOcupada, setConflitoOcupada] = useState(false)

  if (!ocorrencia) return null

  // Busca de pacientes para vínculo posterior
  const handleBuscarPacientes = async () => {
    if (!termoBuscaPaciente.trim() || termoBuscaPaciente.trim().length < 2) {
      setErroOperacao('Digite ao menos 2 caracteres para buscar o paciente.')
      return
    }
    setErroOperacao(null)
    setBuscandoPacientes(true)
    try {
      const res = await listarPacientes(termoBuscaPaciente.trim(), 15)
      setListaPacientesEncontrados(res)
      if (res.length === 0) {
        setErroOperacao('Nenhum paciente cadastrado encontrado para o termo informado.')
      }
    } catch (_err) {
      setErroOperacao('Erro ao buscar pacientes no cadastro.')
    } finally {
      setBuscandoPacientes(false)
    }
  }

  const handleSubmeter = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroOperacao(null)
    setConflitoOcupada(false)
    setEnviando(true)

    const currentSeq = seqRef ? ++seqRef.current : 0

    try {
      if (tipoAcao === 'classificar_risco') {
        if (!justificativaRisco.trim()) {
          setErroOperacao('A justificativa da regulação médica/enfermagem é obrigatória.')
          setEnviando(false)
          return
        }

        const resp = await classificarRiscoSAMU(
          ocorrencia.id,
          {
            classificacao_risco: riscoSelecionado,
            justificativa: justificativaRisco.trim(),
          },
          {
            seqMomento: currentSeq,
            seqReferencia: seqRef,
          },
        )

        toast({
          title: 'Classificação de Risco Registrada',
          description: `Ocorrência classificada como ${resp.classificacao_risco.toUpperCase()}.`,
        })
      } else if (tipoAcao === 'atribuir_unidade') {
        if (!unidadeMovelId) {
          setErroOperacao('Selecione uma viatura/ambulância da frota.')
          setEnviando(false)
          return
        }

        const setor = setoresHospitalares.find((s) => s.id === destinoId)

        const resp = await atribuirUnidadeMovelSAMU(
          ocorrencia.id,
          {
            unidade_movel_id: unidadeMovelId,
            unidade_saude_destino_id: destinoId || undefined,
            unidade_saude_destino_nome: setor?.nome || undefined,
            unidade_saude_destino_externa: destinoExterno.trim() || undefined,
          },
          {
            seqMomento: currentSeq,
            seqReferencia: seqRef,
          },
        )

        toast({
          title: 'Unidade Móvel Atribuída',
          description: `Viatura ${resp.unidade_movel_placa || 'atribuída'} vinculada ao chamado.`,
        })
      } else if (tipoAcao === 'transicao_status') {
        if (novoStatus === 'cancelada' && !motivoTransicao.trim()) {
          setErroOperacao('Para cancelamento do chamado, é obrigatório registrar o motivo.')
          setEnviando(false)
          return
        }

        const resp = await transitarStatusSAMU(
          ocorrencia.id,
          {
            status_novo: novoStatus,
            motivo: motivoTransicao.trim() || undefined,
          },
          {
            seqMomento: currentSeq,
            seqReferencia: seqRef,
          },
        )

        toast({
          title: 'Status Atualizado',
          description: `Ocorrência avançou para ${resp.status_novo.toUpperCase()}.`,
        })
      } else if (tipoAcao === 'vincular_paciente') {
        if (!pacienteSelecionado) {
          setErroOperacao('Selecione um paciente cadastrado da lista para confirmar o vínculo.')
          setEnviando(false)
          return
        }
        if (!confirmacaoHumanaVinculo) {
          setErroOperacao(
            'É obrigatório marcar a confirmação humana de identidade para efetivar o vínculo.',
          )
          setEnviando(false)
          return
        }

        const resp = await vincularPacienteSAMU(
          ocorrencia.id,
          {
            paciente_id: pacienteSelecionado.id,
            confirmacao_humana: true,
            justificativa: observacoesVinculo.trim() || undefined,
          },
          {
            seqMomento: currentSeq,
            seqReferencia: seqRef,
          },
        )

        toast({
          title: 'Vínculo de Paciente Confirmado',
          description: `Ocorrência vinculada a ${resp.paciente_nome}.`,
        })
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const erroAny = err as {
        status?: number
        name?: string
        data?: {
          code?: string
          message?: string
          details?: { unidade_movel_placa?: string; ocorrencia_ativa_numero?: string }
        }
        message?: string
      }

      if (erroAny?.name === 'RespostaSessaoObsoletaError') {
        return
      }

      // 409 UNIDADE_MOVEL_OCUPADA: Erro acionável claro
      if (
        erroAny?.status === 409 ||
        erroAny?.name === 'ConflitoUnidadeMovelOcupadaError' ||
        erroAny?.data?.code === 'UNIDADE_MOVEL_OCUPADA'
      ) {
        setConflitoOcupada(true)
        setErroOperacao(
          'Conflito: A unidade móvel selecionada já está empenhada em outro atendimento do SAMU em andamento. Selecione outra viatura disponível ou aguarde o encerramento do atendimento anterior.',
        )
      } else {
        setErroOperacao(
          erroAny?.data?.message ||
            erroAny?.message ||
            'Não foi possível concluir a operação. Verifique as permissões ou tente novamente.',
        )
      }
    } finally {
      setEnviando(false)
    }
  }

  // Filtrar viaturas de frota compatíveis com ambulância / resgate se houver
  const viaturasDisponiveis = veiculosFrota.filter(
    (v) => v.status !== 'manutencao' && v.status !== 'inativo',
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(aberto) => {
        if (!aberto && !enviando) {
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center justify-between">
            <span>
              {tipoAcao === 'classificar_risco' && 'Classificação de Risco Regulatória (Humana)'}
              {tipoAcao === 'atribuir_unidade' && 'Atribuição de Unidade Móvel (Frota)'}
              {tipoAcao === 'transicao_status' && 'Atualização Operacional do Status do Chamado'}
              {tipoAcao === 'vincular_paciente' && 'Vínculo Posterior de Paciente Cadastrado'}
            </span>
            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border">
              {ocorrencia.numero_ocorrencia}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Vítima: <strong>{ocorrencia.vitima_nome_informado || 'Não informada'}</strong> | Local:{' '}
            {ocorrencia.municipio} ({ocorrencia.endereco_textual})
          </DialogDescription>
        </DialogHeader>

        {erroOperacao && (
          <Alert
            variant="destructive"
            className={conflitoOcupada ? 'border-amber-500 bg-amber-50 text-amber-950' : ''}
          >
            {conflitoOcupada ? (
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription className="text-xs">{erroOperacao}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmeter} className="space-y-4 text-xs">
          {/* CASO 1: CLASSIFICAÇÃO DE RISCO */}
          {tipoAcao === 'classificar_risco' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded text-amber-900 text-[11px] leading-relaxed">
                <strong>Regra Regulamentar:</strong> A classificação de risco deve ser lançada
                exclusivamente por profissional humano autorizado (médico regulador / enfermeiro).{' '}
                <em>Não há algoritmo automático</em>.
                {usuarioPerfil && !['admin', 'medico', 'enfermeiro'].includes(usuarioPerfil) && (
                  <span className="block mt-1 text-red-700 font-bold">
                    Seu perfil ({usuarioPerfil}) não possui autorização assistencial para
                    classificar risco. A solicitação será recusada pelo servidor.
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="risco-select">Nível de Risco Atribuído *</Label>
                <Select
                  value={riscoSelecionado}
                  onValueChange={(val) =>
                    setRiscoSelecionado(
                      val as 'vermelho' | 'laranja' | 'amarelo' | 'verde' | 'azul',
                    )
                  }
                >
                  <SelectTrigger id="risco-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vermelho">
                      🔴 Vermelho - Emergência (Risco iminente de morte / prioridade 1)
                    </SelectItem>
                    <SelectItem value="laranja">
                      🟠 Laranja - Muito Urgente (Grave risco potencial)
                    </SelectItem>
                    <SelectItem value="amarelo">
                      🟡 Amarelo - Urgente (Atendimento rápido sem risco iminente)
                    </SelectItem>
                    <SelectItem value="verde">
                      🟢 Verde - Pouco Urgente (Pode aguardar orientação ou transporte)
                    </SelectItem>
                    <SelectItem value="azul">
                      🔵 Azul - Não Urgente (Orientação telefônica / UBS)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="justificativa-risco">
                  Justificativa Regulatória / Parecer Clínico *
                </Label>
                <Textarea
                  id="justificativa-risco"
                  rows={3}
                  value={justificativaRisco}
                  onChange={(e) => setJustificativaRisco(e.target.value)}
                  placeholder="Justifique os critérios clínicos identificados no chamado que embasam o risco..."
                />
              </div>
            </div>
          )}

          {/* CASO 2: ATRIBUIÇÃO DE UNIDADE MÓVEL */}
          {tipoAcao === 'atribuir_unidade' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="veiculo-samu">Selecione a Unidade Móvel / Viatura *</Label>
                <Select
                  value={unidadeMovelId}
                  onValueChange={(val) => {
                    setUnidadeMovelId(val)
                    setConflitoOcupada(false)
                    setErroOperacao(null)
                  }}
                >
                  <SelectTrigger id="veiculo-samu">
                    <SelectValue placeholder="Selecione uma viatura da frota" />
                  </SelectTrigger>
                  <SelectContent>
                    {viaturasDisponiveis.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.placa} - {v.descricao} ({v.marca || 'Veículo'}) - {v.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="destino-interno">Unidade Municipal de Destino (Setor)</Label>
                  <Select value={destinoId} onValueChange={(val) => setDestinoId(val)}>
                    <SelectTrigger id="destino-interno">
                      <SelectValue placeholder="Selecione o setor municipal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum / Não definido</SelectItem>
                      {setoresHospitalares.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nome} ({s.tipo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="destino-externo-atrib">Destino Externo (Se aplicável)</Label>
                  <Input
                    id="destino-externo-atrib"
                    value={destinoExterno}
                    onChange={(e) => setDestinoExterno(e.target.value)}
                    placeholder="Ex: Hospital Regional ou Pronto Socorro"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CASO 3: TRANSIÇÃO DE STATUS */}
          {tipoAcao === 'transicao_status' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="novo-status">Próximo Status Operacional *</Label>
                <Select
                  value={novoStatus}
                  onValueChange={(val) => setNovoStatus(val as StatusFluxoSAMU)}
                >
                  <SelectTrigger id="novo-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_deslocamento">
                      Em Deslocamento (Viatura a caminho)
                    </SelectItem>
                    <SelectItem value="no_local">
                      No Local (Início do atendimento no ponto)
                    </SelectItem>
                    <SelectItem value="em_transporte">
                      Em Transporte (Deslocamento para hospital/destino)
                    </SelectItem>
                    <SelectItem value="concluida">Concluída (Operação concluída)</SelectItem>
                    <SelectItem value="cancelada">
                      Cancelada (Chamado cancelado / recusa / trote)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="motivo-transicao">
                  Motivo / Observações da Transição{' '}
                  {novoStatus === 'cancelada' ? '*' : '(Opcional)'}
                </Label>
                <Textarea
                  id="motivo-transicao"
                  rows={3}
                  value={motivoTransicao}
                  onChange={(e) => setMotivoTransicao(e.target.value)}
                  placeholder={
                    novoStatus === 'cancelada'
                      ? 'Justifique obrigatoriamente o motivo do cancelamento do chamado...'
                      : 'Relate informações relevantes sobre o andamento operacional...'
                  }
                />
              </div>

              {novoStatus === 'concluida' && (
                <div className="bg-slate-50 border border-slate-200 p-2 rounded text-[11px] text-slate-600">
                  ℹ️ A conclusão da ocorrência do SAMU <strong>não</strong> cria automaticamente
                  internação, consulta médica ou alta no sistema hospitalar, preservando o fluxo
                  clínico local independente.
                </div>
              )}
            </div>
          )}

          {/* CASO 4: VÍNCULO POSTERIOR DE PACIENTE */}
          {tipoAcao === 'vincular_paciente' && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 p-2.5 rounded text-blue-900 text-[11px] leading-relaxed">
                <strong>Vínculo Assistencial Posterior:</strong> Permite associar a ocorrência
                aberta com vítima desconhecida a um paciente cadastrado no sistema municipal após
                confirmação formal da equipe.
              </div>

              <div className="space-y-2">
                <Label htmlFor="busca-paciente">
                  Buscar Paciente Cadastrado (Nome, CPF ou Cartão SUS)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="busca-paciente"
                    value={termoBuscaPaciente}
                    onChange={(e) => setTermoBuscaPaciente(e.target.value)}
                    placeholder="Digite nome, CPF ou CNS do paciente..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBuscarPacientes}
                    disabled={buscandoPacientes}
                  >
                    {buscandoPacientes ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                  </Button>
                </div>
              </div>

              {listaPacientesEncontrados.length > 0 && (
                <div className="border border-slate-200 rounded max-h-40 overflow-y-auto divide-y divide-slate-100 bg-white">
                  {listaPacientesEncontrados.map((pac) => {
                    const selecionado = pacienteSelecionado?.id === pac.id
                    return (
                      <div
                        key={pac.id}
                        onClick={() => setPacienteSelecionado(pac)}
                        className={`p-2 cursor-pointer flex justify-between items-center transition-colors ${
                          selecionado
                            ? 'bg-blue-100/70 border-l-4 border-blue-600'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-slate-800">{pac.nome}</p>
                          <p className="text-[10px] text-slate-500">
                            CNS: {pac.cartao_sus || 'Sem CNS'} • CPF: {pac.cpf || 'Sem CPF'} • DN:{' '}
                            {pac.data_nascimento || 'Não informada'}
                          </p>
                        </div>
                        {selecionado && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                      </div>
                    )
                  })}
                </div>
              )}

              {pacienteSelecionado && (
                <div className="bg-slate-50 border border-slate-300 p-2.5 rounded text-xs space-y-1">
                  <div className="font-semibold text-slate-900">
                    Paciente Selecionado para Vínculo:
                  </div>
                  <div>
                    Nome: <strong>{pacienteSelecionado.nome}</strong>
                  </div>
                  <div>
                    CNS: {pacienteSelecionado.cartao_sus || 'Não informado'} | CPF:{' '}
                    {pacienteSelecionado.cpf || 'Não informado'}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="obs-vinculo">Observações da Confirmação do Vínculo</Label>
                <Input
                  id="obs-vinculo"
                  value={observacoesVinculo}
                  onChange={(e) => setObservacoesVinculo(e.target.value)}
                  placeholder="Ex: Identificado pela assistente social após chegada de familiares com RG"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="confirmacao-humana"
                  checked={confirmacaoHumanaVinculo}
                  onChange={(e) => setConfirmacaoHumanaVinculo(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label
                  htmlFor="confirmacao-humana"
                  className="text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  Confirmo que a conferência de identidade foi validada humanamente pela equipe.
                </Label>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={enviando}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={enviando}
              className="bg-red-700 hover:bg-red-800 text-white font-semibold"
            >
              {enviando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirmar Ação
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
