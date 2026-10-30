import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { SamuOcorrencia, SamuHistoricoEstado } from '@/types/hospital'
import { obterOcorrenciaSAMUPorId } from '@/services/samu'
import { formatarDataHoraFuso, obterFusoHorarioAtivo } from '@/services/dataFusoUnidade'
import { Loader2, History, AlertCircle } from 'lucide-react'

export interface ModalDetalhesOcorrenciaSAMUProps {
  open: boolean
  onClose: () => void
  ocorrenciaId: string | null
  seqRef?: React.MutableRefObject<number>
}

export const ModalDetalhesOcorrenciaSAMU: React.FC<ModalDetalhesOcorrenciaSAMUProps> = ({
  open,
  onClose,
  ocorrenciaId,
  seqRef,
}) => {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ocorrencia, setOcorrencia] = useState<SamuOcorrencia | null>(null)
  const [historico, setHistorico] = useState<SamuHistoricoEstado[]>([])
  const fusoAtivo = obterFusoHorarioAtivo()

  useEffect(() => {
    if (!open || !ocorrenciaId) {
      setOcorrencia(null)
      setHistorico([])
      setErro(null)
      return
    }

    let ativo = true
    const currentSeq = seqRef ? ++seqRef.current : 0

    const carregarDetalhes = async () => {
      setCarregando(true)
      setErro(null)
      try {
        const dados = await obterOcorrenciaSAMUPorId(ocorrenciaId, {
          seqMomento: currentSeq,
          seqReferencia: seqRef,
        })
        if (ativo) {
          setOcorrencia(dados)
          setHistorico(dados.historico || [])
        }
      } catch (err: unknown) {
        if (!ativo) return
        const erroAny = err as { name?: string; message?: string }
        if (erroAny?.name === 'RespostaSessaoObsoletaError') return
        setErro(
          erroAny?.message || 'Erro ao carregar detalhes e histórico auditável da ocorrência.',
        )
      } finally {
        if (ativo) {
          setCarregando(false)
        }
      }
    }

    carregarDetalhes()

    return () => {
      ativo = false
    }
  }, [open, ocorrenciaId, seqRef])

  if (!open) return null

  const obterBadgeRisco = (risco?: string) => {
    switch (risco) {
      case 'vermelho':
        return (
          <Badge className="bg-red-600 text-white hover:bg-red-700">🔴 Vermelho (Emergência)</Badge>
        )
      case 'laranja':
        return (
          <Badge className="bg-orange-500 text-white hover:bg-orange-600">
            🟠 Laranja (Muito Urgente)
          </Badge>
        )
      case 'amarelo':
        return (
          <Badge className="bg-yellow-500 text-black hover:bg-yellow-600">
            🟡 Amarelo (Urgente)
          </Badge>
        )
      case 'verde':
        return (
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
            🟢 Verde (Pouco Urgente)
          </Badge>
        )
      case 'azul':
        return (
          <Badge className="bg-blue-600 text-white hover:bg-blue-700">🔵 Azul (Não Urgente)</Badge>
        )
      default:
        return <Badge variant="outline">Não classificado</Badge>
    }
  }

  const obterBadgeStatus = (status?: string) => {
    switch (status) {
      case 'aberta':
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
            Aberta
          </Badge>
        )
      case 'em_deslocamento':
        return <Badge className="bg-blue-600 text-white">Em Deslocamento</Badge>
      case 'no_local':
        return <Badge className="bg-indigo-600 text-white">No Local</Badge>
      case 'em_transporte':
        return <Badge className="bg-purple-600 text-white">Em Transporte</Badge>
      case 'concluida':
        return <Badge className="bg-emerald-600 text-white">Concluída</Badge>
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>
      default:
        return <Badge variant="outline">{status || 'Indefinido'}</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <History className="h-5 w-5 text-red-700" />
              Prontuário Operacional e Histórico Imutável SAMU
            </span>
            {ocorrencia && (
              <span className="font-mono text-sm bg-slate-100 text-slate-800 px-2.5 py-1 rounded border">
                {ocorrencia.numero_ocorrencia}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Registro cronológico auditável das transições de estado, viaturas e regulação humana
            (Itens 407 a 417).
          </DialogDescription>
        </DialogHeader>

        {carregando && (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
            <Loader2 className="h-6 w-6 animate-spin text-red-600" />
            Carregando detalhes e trilha de auditoria...
          </div>
        )}

        {erro && !carregando && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded flex items-center gap-2 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{erro}</span>
          </div>
        )}

        {ocorrencia && !carregando && (
          <div className="space-y-4 text-xs">
            {/* Status e Risco Resumo */}
            <div className="flex flex-wrap items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold">Status Atual:</span>
                {obterBadgeStatus(ocorrencia.status_fluxo)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold">Classificação de Risco:</span>
                {obterBadgeRisco(ocorrencia.classificacao_risco)}
              </div>
            </div>

            {/* Dados do Chamado e Vítima */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-slate-200 p-3 rounded bg-white space-y-2">
                <h4 className="font-bold text-slate-800 text-xs border-b pb-1">
                  Identificação da Vítima
                </h4>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">
                    Nome Informado:
                  </span>
                  <span className="font-semibold text-slate-900">
                    {ocorrencia.vitima_desconhecida ? (
                      <span className="text-amber-800 font-bold bg-amber-50 px-1 rounded">
                        Desconhecido (Não identificado)
                      </span>
                    ) : (
                      ocorrencia.vitima_nome_informado || 'Não informado'
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Sexo:</span>
                    <span>{ocorrencia.vitima_sexo_informado || 'Desconhecido'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">
                      Idade Estimada:
                    </span>
                    <span>{ocorrencia.vitima_idade_informada || 'Não informada'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">
                    Vínculo com Paciente Cadastrado:
                  </span>
                  {ocorrencia.vitima_confirmada_humano && ocorrencia.vitima_paciente_id ? (
                    <span className="text-emerald-800 font-semibold bg-emerald-50 px-1 rounded block">
                      Confirmado por Humano (ID: {ocorrencia.vitima_paciente_id})
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">Sem vínculo com cadastro</span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 p-3 rounded bg-white space-y-2">
                <h4 className="font-bold text-slate-800 text-xs border-b pb-1">
                  Localização e Chamado
                </h4>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">
                    Endereço Textual:
                  </span>
                  <span className="font-medium text-slate-900">
                    {ocorrencia.endereco_textual}
                    {ocorrencia.numero_complemento ? `, ${ocorrencia.numero_complemento}` : ''}
                    {ocorrencia.bairro ? ` - Bairro ${ocorrencia.bairro}` : ''}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Município:</span>
                    <span className="font-medium">{ocorrencia.municipio}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">
                      Ponto de Referência:
                    </span>
                    <span>{ocorrencia.ponto_referencia || 'Nenhum'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Solicitante:</span>
                  <span>
                    {ocorrencia.nome_solicitante || 'Anônimo'} (
                    {ocorrencia.relacao_solicitante_vitima}) •{' '}
                    {ocorrencia.telefone_solicitante || 'Sem telefone'}
                  </span>
                </div>
              </div>
            </div>

            {/* Observações Iniciais e Justificativa de Risco */}
            <div className="border border-slate-200 p-3 rounded bg-white space-y-2">
              <h4 className="font-bold text-slate-800 text-xs border-b pb-1">
                Motivo do Chamado e Observações
              </h4>
              {ocorrencia.observacoes_iniciais && (
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">
                    Observações Iniciais:
                  </span>
                  <p className="text-slate-700">{ocorrencia.observacoes_iniciais}</p>
                </div>
              )}
              {ocorrencia.risco_justificativa && (
                <div className="bg-amber-50/70 border border-amber-200 p-2 rounded">
                  <span className="text-amber-900 font-semibold block text-[10px] uppercase">
                    Justificativa do Regulador (Risco):
                  </span>
                  <p className="text-amber-950 font-medium">{ocorrencia.risco_justificativa}</p>
                  {ocorrencia.risco_classificado_por_nome && (
                    <span className="text-[10px] text-amber-800 block mt-1">
                      Classificado por: {ocorrencia.risco_classificado_por_nome}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Unidade Móvel e Destino */}
            <div className="border border-slate-200 p-3 rounded bg-white space-y-2">
              <h4 className="font-bold text-slate-800 text-xs border-b pb-1">
                Viatura e Destino do Paciente
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">
                    Unidade Móvel Designada:
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {ocorrencia.unidade_movel_placa
                      ? `Placa ${ocorrencia.unidade_movel_placa}`
                      : 'Nenhuma unidade atribuída'}
                  </span>
                  {ocorrencia.unidade_movel_descricao && (
                    <span className="text-slate-600 block text-[11px]">
                      {ocorrencia.unidade_movel_descricao}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">
                    Unidade de Saúde Destino:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {ocorrencia.unidade_saude_destino_nome ||
                      ocorrencia.unidade_saude_destino_externa ||
                      'Não informada'}
                  </span>
                </div>
              </div>
            </div>

            {/* Trilha Imutável de Auditoria / Histórico de Estados */}
            <div className="border border-slate-200 p-3 rounded bg-white space-y-3">
              <h4 className="font-bold text-slate-800 text-xs border-b pb-1 flex items-center justify-between">
                <span>Histórico Auditável e Imutável de Transições</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Total de Registros: {historico.length}
                </span>
              </h4>

              {historico.length === 0 ? (
                <p className="text-slate-500 italic text-center py-4">
                  Nenhum registro histórico adicional registrado.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto divide-y divide-slate-100 pr-1">
                  {historico.map((item, idx) => (
                    <div key={item.id || idx} className="pt-2 text-[11px] space-y-1">
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="font-bold text-slate-900">
                          {item.status_anterior || 'INICIAL'} ➔{' '}
                          <span className="text-red-700">{item.status_novo}</span>
                        </span>
                        <span className="font-mono text-slate-500 text-[10px]">
                          {formatarDataHoraFuso(item.data_hora_utc, fusoAtivo)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600 text-[10px]">
                        <span>
                          Responsável: <strong>{item.autor_nome || 'Operador'}</strong> (
                          {item.autor_perfil || 'Sistema'})
                        </span>
                        {item.unidade_movel_id && (
                          <span className="font-mono">Viatura ID: {item.unidade_movel_id}</span>
                        )}
                      </div>
                      {item.motivo_transicao && (
                        <p className="bg-slate-50 p-1.5 rounded border border-slate-200 text-slate-800">
                          {item.motivo_transicao}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
