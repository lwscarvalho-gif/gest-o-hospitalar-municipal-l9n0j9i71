import React from 'react'
import { SamuOcorrencia } from '@/types/hospital'
import { formatarDataHoraFuso, obterFusoHorarioAtivo } from '@/services/dataFusoUnidade'

export interface RelatorioAtendimentosSamuSnapshot {
  periodo_inicio: string
  periodo_fim: string
  municipio_filtro?: string
  tipo_filtro?: string
  unidade_movel_filtro?: string
  status_filtro?: string
  total_ocorrencias: number
  fuso_unidade: string
  data_hora_emissao_local: string
  data_hora_emissao_utc: string
  emitido_por_nome: string
  emitido_por_perfil: string
  ocorrencias: Array<{
    id: string
    numero_ocorrencia: string
    tipo_ocorrencia: string
    relacao_solicitante: string
    vitima_identificacao: string
    vitima_sexo: string
    vitima_idade: string
    endereco_resumido: string
    municipio: string
    classificacao_risco: string
    status_fluxo: string
    unidade_movel_placa?: string
    unidade_destino?: string
    data_hora_abertura_local: string
    data_hora_conclusao_local?: string
  }>
}

export function gerarSnapshotRelatorioSAMU(
  ocorrencias: SamuOcorrencia[],
  filtros: {
    data_inicio?: string
    data_fim?: string
    municipio?: string
    tipo?: string
    unidade_movel_id?: string
    unidade_movel_placa?: string
    status?: string
  },
  usuario: { name?: string; role?: string },
  fusoIana?: string,
): RelatorioAtendimentosSamuSnapshot {
  const fuso = fusoIana || obterFusoHorarioAtivo()
  const agora = new Date()

  const itens = ocorrencias.map((oco) => {
    let vitima = oco.vitima_nome_informado || 'Não informada'
    if (oco.vitima_desconhecida) {
      vitima = `${vitima} (Vítima Desconhecida)`
    }
    if (oco.vitima_confirmada_humano && oco.vitima_paciente_id) {
      vitima = `${vitima} [Vínculo Confirmado]`
    }

    const endPartes: string[] = []
    if (oco.endereco_textual) endPartes.push(oco.endereco_textual)
    if (oco.numero_complemento) endPartes.push(oco.numero_complemento)
    if (oco.bairro) endPartes.push(oco.bairro)

    const destino =
      oco.unidade_saude_destino_nome || oco.unidade_saude_destino_externa || 'Não atribuído'

    return {
      id: oco.id,
      numero_ocorrencia: oco.numero_ocorrencia,
      tipo_ocorrencia: (oco.tipo_ocorrencia || '').toUpperCase(),
      relacao_solicitante: (oco.relacao_solicitante_vitima || '').replace('_', ' '),
      vitima_identificacao: vitima,
      vitima_sexo: oco.vitima_sexo_informado || 'desconhecido',
      vitima_idade: oco.vitima_idade_informada || 'indisponível',
      endereco_resumido: endPartes.join(', ') || 'Endereço registrado',
      municipio: oco.municipio,
      classificacao_risco: oco.classificacao_risco || 'nao_classificado',
      status_fluxo: oco.status_fluxo,
      unidade_movel_placa: oco.unidade_movel_placa || undefined,
      unidade_destino: destino,
      data_hora_abertura_local: formatarDataHoraFuso(oco.data_hora_abertura, fuso),
      data_hora_conclusao_local: oco.data_hora_conclusao
        ? formatarDataHoraFuso(oco.data_hora_conclusao, fuso)
        : undefined,
    }
  })

  return {
    periodo_inicio: filtros.data_inicio || 'Início da Operação',
    periodo_fim: filtros.data_fim || 'Data Atual',
    municipio_filtro: filtros.municipio || 'Todos os municípios',
    tipo_filtro:
      filtros.tipo && filtros.tipo !== 'todos' ? filtros.tipo.toUpperCase() : 'Todos os tipos',
    unidade_movel_filtro:
      filtros.unidade_movel_placa ||
      (filtros.unidade_movel_id ? 'Viatura Selecionada' : 'Todas as viaturas'),
    status_filtro:
      filtros.status && filtros.status !== 'todos'
        ? filtros.status.toUpperCase()
        : 'Todos os status',
    total_ocorrencias: itens.length,
    fuso_unidade: fuso,
    data_hora_emissao_local: formatarDataHoraFuso(agora, fuso),
    data_hora_emissao_utc: agora.toISOString(),
    emitido_por_nome: usuario.name || 'Operador SAMU',
    emitido_por_perfil: usuario.role || 'Operador',
    ocorrencias: itens,
  }
}

interface RelatorioSanitizadoSamuA4Props {
  relatorio: RelatorioAtendimentosSamuSnapshot
}

/**
 * Impresso Sanitizado A4 de Atendimentos do SAMU (Itens 414–417 do ANEXO I)
 * - Sanitização estrita: sem dados clínicos desnecessários, sem prontuário sigiloso, sem mapas nem georreferenciamento
 * - Fuso operacional da unidade (America/Porto_Velho)
 * - Filtros expressos no cabeçalho (tipo, período, município, unidade móvel)
 */
export const RelatorioSanitizadoSamuA4: React.FC<RelatorioSanitizadoSamuA4Props> = ({
  relatorio,
}) => {
  return (
    <div className="impresso-a4-documento bg-white text-slate-900 font-sans p-6 sm:p-10 w-full max-w-[210mm] mx-auto border border-slate-300 rounded shadow-sm text-xs space-y-4 print:p-0 print:border-none print:shadow-none print:max-w-none">
      {/* 1. Cabeçalho Oficial Municipal */}
      <div className="border-b-2 border-slate-800 pb-3 text-center space-y-1">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">
          PREFEITURA MUNICIPAL DE MIRANTE DA SERRA • SEMSAU
        </span>
        <span className="text-[10px] uppercase font-semibold text-slate-600 block">
          SERVIÇO DE ATENDIMENTO MÓVEL DE URGÊNCIA (SAMU 192 BÁSICO)
        </span>
        <h1 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-tight mt-1">
          RELATÓRIO OPERACIONAL DE ATENDIMENTOS E OCORRÊNCIAS
        </h1>
        <p className="text-[10px] text-slate-500">
          Conforme Itens 414 a 417 do ANEXO I • Emissão Administrativa Sanitizada (Sem
          Georreferenciamento)
        </p>
      </div>

      {/* 2. Filtros e Metadados do Relatório */}
      <div className="bg-slate-50 border border-slate-200 p-3 rounded grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div>
          <span className="text-slate-500 font-semibold block text-[10px] uppercase">
            Período de Apuração:
          </span>
          <span className="text-slate-800 font-medium">
            {relatorio.periodo_inicio} até {relatorio.periodo_fim}
          </span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[10px] uppercase">
            Tipo de Ocorrência:
          </span>
          <span className="text-slate-800 font-medium">{relatorio.tipo_filtro}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[10px] uppercase">
            Município do Chamado:
          </span>
          <span className="text-slate-800 font-medium">{relatorio.municipio_filtro}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[10px] uppercase">
            Unidade Móvel (Frota):
          </span>
          <span className="text-slate-800 font-medium">{relatorio.unidade_movel_filtro}</span>
        </div>
      </div>

      {/* 3. Indicadores de Amostragem */}
      <div className="flex justify-between items-center px-1 text-slate-700 text-xs border-b border-slate-200 pb-2">
        <div>
          Total de Ocorrências Listadas:{' '}
          <strong className="text-slate-950 font-bold">{relatorio.total_ocorrencias}</strong>
        </div>
        <div className="text-[11px] text-slate-500">
          Status Filtrado: <span className="font-semibold">{relatorio.status_filtro}</span>
        </div>
      </div>

      {/* 4. Tabela Operacional Sanitizada */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[10px]">
          <thead>
            <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-700 uppercase font-semibold">
              <th className="py-2 px-1.5">Nº Ocorrência</th>
              <th className="py-2 px-1.5">Data/Hora (Fuso Local)</th>
              <th className="py-2 px-1.5">Tipo</th>
              <th className="py-2 px-1.5">Vítima Informada</th>
              <th className="py-2 px-1.5">Local / Município</th>
              <th className="py-2 px-1.5">Risco</th>
              <th className="py-2 px-1.5">Viatura</th>
              <th className="py-2 px-1.5">Destino</th>
              <th className="py-2 px-1.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {relatorio.ocorrencias.length > 0 ? (
              relatorio.ocorrencias.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-2 px-1.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {item.numero_ocorrencia}
                  </td>
                  <td className="py-2 px-1.5 font-mono text-slate-700 whitespace-nowrap">
                    {item.data_hora_abertura_local}
                  </td>
                  <td className="py-2 px-1.5 text-slate-800 font-medium uppercase">
                    {item.tipo_ocorrencia}
                  </td>
                  <td
                    className="py-2 px-1.5 text-slate-800 max-w-[140px] truncate"
                    title={item.vitima_identificacao}
                  >
                    {item.vitima_identificacao}
                  </td>
                  <td
                    className="py-2 px-1.5 text-slate-700 max-w-[130px] truncate"
                    title={`${item.endereco_resumido} - ${item.municipio}`}
                  >
                    {item.municipio} ({item.endereco_resumido})
                  </td>
                  <td className="py-2 px-1.5 uppercase font-bold text-slate-700">
                    {item.classificacao_risco}
                  </td>
                  <td className="py-2 px-1.5 font-mono text-slate-800 whitespace-nowrap">
                    {item.unidade_movel_placa || 'Sem viatura'}
                  </td>
                  <td
                    className="py-2 px-1.5 text-slate-700 max-w-[120px] truncate"
                    title={item.unidade_destino}
                  >
                    {item.unidade_destino}
                  </td>
                  <td className="py-2 px-1.5 uppercase font-semibold text-slate-800 whitespace-nowrap">
                    {item.status_fluxo.replace('_', ' ')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-6 text-center text-slate-500 italic">
                  Nenhum atendimento do SAMU localizado para os filtros informados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Rodapé de Auditoria e Fuso Parametrizado */}
      <div className="pt-4 border-t border-slate-300 space-y-3">
        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-slate-600">
          <div>
            <span>Emissão no Fuso da Unidade: </span>
            <strong className="font-mono text-slate-800">
              {relatorio.data_hora_emissao_local}
            </strong>
          </div>
          <div>
            <span>Fuso Operacional IANA: </span>
            <strong className="font-mono text-slate-800">{relatorio.fuso_unidade}</strong>
          </div>
          <div>
            <span>Operador Responsável: </span>
            <strong className="text-slate-800">
              {relatorio.emitido_por_nome} ({relatorio.emitido_por_perfil})
            </strong>
          </div>
        </div>

        <div className="text-[9px] text-slate-500 text-justify leading-tight space-y-1">
          <p>
            * <strong>Proteção de Dados e Sigilo:</strong> Relatório gerado estritamente com dados
            administrativos e operacionais da frota e do chamado, sem histórico clínico
            confidencial, sem prontuário médico e sem rastreamento por GPS/mapas espaciais.
          </p>
          <p>
            * <strong>Independência de Desfecho:</strong> O encerramento ou transporte da ocorrência
            pelo SAMU não gera consulta médica, internação ou alta hospitalar automática,
            preservando a autonomia assistencial da equipe de acolhimento local.
          </p>
        </div>
      </div>
    </div>
  )
}
