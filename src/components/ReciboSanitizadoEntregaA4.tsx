import React from 'react'
import { RisEntregaLaudo, FormaRecebimentoEntregaRIS } from '@/types/hospital'
import { formatarDataHoraFuso, obterFusoHorarioAtivo } from '@/services/dataFusoUnidade'

export interface ReciboEntregaRISSnapshot {
  id: string
  protocolo_entrega: string
  exame_ref: string
  exame_tipo?: string
  exame_modalidade?: string
  paciente_ref: string
  paciente_nome?: string
  paciente_cpf_mascarado?: string
  paciente_cns_mascarado?: string
  versao_entregue: number
  destinatario_nome: string
  destinatario_documento: string
  destinatario_parentesco_grau?: string
  forma_recebimento: FormaRecebimentoEntregaRIS | string
  observacao?: string
  data_hora_entrega_utc: string
  data_hora_entrega_local: string
  fuso_unidade: string
  autor_nome: string
  autor_perfil: string
  evento_anterior_ref?: string
  motivo_correcao?: string
}

/**
 * Cria snapshot administrativo sanitizado da entrega de laudo.
 * Garante que:
 * 1. Não contenha campos clínicos sensíveis (laudo_texto, achados, imagens, conteúdo formatado).
 * 2. As datas sejam calculadas tanto no fuso operacional da unidade (Mirante da Serra / America/Porto_Velho)
 *    quanto mantidas em UTC no padrão ISO.
 */
export function criarSnapshotReciboEntrega(
  entrega: RisEntregaLaudo,
  fusoIana?: string,
): ReciboEntregaRISSnapshot {
  const fuso = fusoIana || obterFusoHorarioAtivo()
  const dataLocal = formatarDataHoraFuso(entrega.data_hora_entrega, fuso)

  return {
    id: entrega.id,
    protocolo_entrega: entrega.protocolo_entrega,
    exame_ref: entrega.exame_ref,
    exame_tipo: entrega.exame_tipo || 'Exame de Radiologia/Imagem',
    exame_modalidade: entrega.exame_modalidade || 'Outro',
    paciente_ref: entrega.paciente_ref,
    paciente_nome: entrega.paciente_nome || 'Paciente Identificado',
    paciente_cpf_mascarado: entrega.paciente_cpf_mascarado || '***.***.***-**',
    paciente_cns_mascarado: entrega.paciente_cns_mascarado || '***.****.****.****',
    versao_entregue: entrega.versao_entregue,
    destinatario_nome: entrega.destinatario_nome,
    destinatario_documento: entrega.destinatario_documento,
    destinatario_parentesco_grau: entrega.destinatario_parentesco_grau,
    forma_recebimento: entrega.forma_recebimento,
    observacao: entrega.observacao,
    data_hora_entrega_utc: entrega.data_hora_entrega,
    data_hora_entrega_local: dataLocal,
    fuso_unidade: fuso,
    autor_nome: entrega.autor_nome,
    autor_perfil: entrega.autor_perfil,
    evento_anterior_ref: entrega.evento_anterior_ref,
    motivo_correcao: entrega.motivo_correcao,
  }
}

const FORMAS_RECEBIMENTO_LABEL: Record<string, string> = {
  presencial_proprio_paciente: 'Presencial - Próprio Paciente',
  presencial_responsavel_legal: 'Presencial - Responsável Legal / Familiar',
  interno_setor_clinico: 'Interno - Setor Clínico / Leito / Enfermagem',
  interno_medico_assistente: 'Interno - Médico Assistente / Consultório',
  outro_autorizado: 'Outro Recebedor Formalmente Autorizado',
}

interface ReciboSanitizadoEntregaA4Props {
  recibo: ReciboEntregaRISSnapshot
}

/**
 * Recibo Sanitizado de Entrega de Laudo (DOC-02 7.4.3.4.c.i)
 * Snapshot puramente administrativo em folha A4 para impressão/conferência.
 * - Estritamente sem corpo clínico do laudo, achados, texto formatado ou imagens diagnósticas.
 * - Fuso horário local parametrizável da unidade de saúde (America/Porto_Velho).
 * - Identificação exata da versão liberada entregue.
 * - Registro do recebedor conferido presencialmente e do operador autenticado.
 * - Aviso explícito de ausência de certificado ICP-Brasil / valor estritamente municipal interno.
 */
export const ReciboSanitizadoEntregaA4: React.FC<ReciboSanitizadoEntregaA4Props> = ({ recibo }) => {
  const formaLabel =
    FORMAS_RECEBIMENTO_LABEL[recibo.forma_recebimento] || String(recibo.forma_recebimento)

  return (
    <div className="recibo-entrega-a4 bg-white text-slate-900 font-sans p-6 sm:p-8 max-w-xl mx-auto border border-slate-300 rounded shadow-sm text-xs space-y-4 print:p-0 print:border-none print:shadow-none print:max-w-none">
      {/* 1. Cabeçalho Oficial Municipal */}
      <div className="border-b-2 border-slate-800 pb-3 text-center space-y-1">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">
          PREFEITURA MUNICIPAL DE MIRANTE DA SERRA • SEMSAU
        </span>
        <span className="text-[10px] uppercase font-semibold text-slate-600 block">
          HOSPITAL MUNICIPAL DE MIRANTE DA SERRA • SERVIÇO DE RADIOLOGIA (RIS)
        </span>
        <h2 className="text-base font-black uppercase text-slate-900 tracking-tight mt-1">
          COMPROVANTE FORMAL DE ENTREGA DE RESULTADO / LAUDO
        </h2>
        <div className="flex items-center justify-center gap-3 text-[10px] font-mono text-slate-600 pt-1">
          <span>
            Protocolo: <strong>{recibo.protocolo_entrega}</strong>
          </span>
          <span>•</span>
          <span>
            ID Evento: <strong>#{recibo.id.slice(-8)}</strong>
          </span>
        </div>
      </div>

      {/* Alerta de Retificação de Recibo (se for correção de evento anterior) */}
      {recibo.evento_anterior_ref && (
        <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-amber-950 text-[11px] space-y-0.5">
          <div className="font-bold flex items-center gap-1.5">
            <span>⚠️</span> Recibo Retificador de Evento Anterior
          </div>
          <div>
            Ref. Evento Anterior:{' '}
            <span className="font-mono font-semibold">#{recibo.evento_anterior_ref}</span>
          </div>
          {recibo.motivo_correcao && (
            <div>
              <strong>Motivo da Correção Administrativa:</strong> {recibo.motivo_correcao}
            </div>
          )}
        </div>
      )}

      {/* 2. Dados da Identificação do Paciente (LGPD) */}
      <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-1.5">
        <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
          Identificação do Paciente (Proteção LGPD)
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-slate-600">Paciente Titular:</span>
          <strong className="text-slate-900 text-sm uppercase">{recibo.paciente_nome}</strong>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-700 pt-1 border-t border-slate-200">
          <div>
            <span className="text-slate-500">CPF: </span>
            <strong>{recibo.paciente_cpf_mascarado}</strong>
          </div>
          <div>
            <span className="text-slate-500">CNS: </span>
            <strong>{recibo.paciente_cns_mascarado}</strong>
          </div>
        </div>
      </div>

      {/* 3. Dados do Exame e Versão Exata Entregue */}
      <div className="border border-slate-200 p-3 rounded space-y-2">
        <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
          Exame Radiológico & Versão Formal Entregue
        </div>
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <div>
            <span className="text-slate-500 block">Procedimento / Exame:</span>
            <strong className="text-slate-900">{recibo.exame_tipo}</strong>
            <span className="text-[10px] text-slate-600 uppercase block mt-0.5">
              Modalidade: {recibo.exame_modalidade}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Versão do Laudo Entregue:</span>
            <div className="inline-flex items-center gap-1.5 mt-0.5">
              <span className="bg-sky-100 text-sky-950 font-black px-2 py-0.5 rounded border border-sky-300 font-mono text-xs">
                VERSÃO {recibo.versao_entregue}
              </span>
            </div>
            <span className="text-[9px] text-slate-500 block mt-0.5">
              Ref. Laudo: #{recibo.exame_ref.slice(-6)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Conferência Humana do Destinatário & Recebimento */}
      <div className="border border-slate-200 p-3 rounded space-y-2">
        <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
          Conferência do Destinatário & Forma de Recebimento
        </div>
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <div>
            <span className="text-slate-500 block">Nome do Recebedor:</span>
            <strong className="text-slate-900 uppercase">{recibo.destinatario_nome}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Documento de Identidade:</span>
            <strong className="text-slate-900 font-mono">{recibo.destinatario_documento}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Vínculo / Parentesco:</span>
            <span className="text-slate-800">
              {recibo.destinatario_parentesco_grau || 'Próprio Paciente'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Modalidade de Entrega:</span>
            <span className="text-slate-800 font-medium">{formaLabel}</span>
          </div>
        </div>

        {recibo.observacao && (
          <div className="pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500 font-semibold">Observações da Entrega:</span>
            <p className="text-slate-700 italic mt-0.5">{recibo.observacao}</p>
          </div>
        )}
      </div>

      {/* 5. Timestamp e Auditoria com Fuso Local e UTC */}
      <div className="bg-slate-50 border border-slate-200 p-3 rounded text-[11px] space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-slate-600">Data/Hora no Fuso da Unidade:</span>
          <strong className="font-mono text-slate-900">{recibo.data_hora_entrega_local}</strong>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
          <span>UTC Persistido:</span>
          <span>{recibo.data_hora_entrega_utc}</span>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
          <span>Fuso Operacional:</span>
          <span>{recibo.fuso_unidade}</span>
        </div>
        <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[11px]">
          <span className="text-slate-600">Operador Autorizado Responsável:</span>
          <strong className="text-slate-900">
            {recibo.autor_nome} ({recibo.autor_perfil})
          </strong>
        </div>
      </div>

      {/* 6. Campos de Assinatura Presencial e Avisos Legais */}
      <div className="pt-4 border-t border-slate-300 space-y-6">
        <div className="grid grid-cols-2 gap-6 pt-4 text-center">
          <div className="space-y-1">
            <div className="border-t border-slate-400 mx-2 pt-1">
              <span className="text-[10px] text-slate-600 block uppercase font-bold">
                {recibo.destinatario_nome}
              </span>
              <span className="text-[9px] text-slate-500 block font-mono">
                Doc: {recibo.destinatario_documento}
              </span>
              <span className="text-[9px] text-slate-400 block">Assinatura do Recebedor</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="border-t border-slate-400 mx-2 pt-1">
              <span className="text-[10px] text-slate-600 block uppercase font-bold">
                {recibo.autor_nome}
              </span>
              <span className="text-[9px] text-slate-500 block">
                Operador Hospitalar ({recibo.autor_perfil})
              </span>
              <span className="text-[9px] text-slate-400 block">Carimbo / Matrícula</span>
            </div>
          </div>
        </div>

        {/* Declaração de Limites Operacionais */}
        <div className="text-[9px] text-slate-500 text-justify leading-tight border-t border-slate-200 pt-2 space-y-0.5">
          <p>
            * Este comprovante documenta administrativamente a entrega presencial do laudo
            radiológico formal impresso, mantendo o histórico de versão auditável conforme subitem
            7.4.3.4.c.i do Guia DOC-02.
          </p>
          <p>
            * <strong>Segurança e Sigilo Clínico:</strong> O presente comprovante NÃO contém texto,
            achados ou conclusões diagnósticas clínicas para proteção da intimidade e menor
            privilégio de circulação de dados.
          </p>
          <p>
            * <strong>Aviso Legal ICP-Brasil:</strong> O sistema NÃO alega assinatura digital
            qualificada ICP-Brasil nem certificação paga. Documento emitido para controle interno do
            Hospital Municipal de Mirante da Serra - RO.
          </p>
        </div>
      </div>
    </div>
  )
}
