import React from 'react'
import {
  ImpressoAssistencial,
  ConteudoReceitaAssistencial,
  ConteudoAtestadoAssistencial,
  ConteudoResumoAltaAssistencial,
  Paciente,
} from '@/types/hospital'

interface FolhaImpressoA4Props {
  impresso: Partial<ImpressoAssistencial>
  paciente: Paciente | null
}

export const FolhaImpressoA4: React.FC<FolhaImpressoA4Props> = ({ impresso, paciente }) => {
  const tipo = impresso.tipo || 'receita'
  const conteudoRec = tipo === 'receita' ? (impresso.conteudo as ConteudoReceitaAssistencial) : null
  const conteudoAt =
    tipo === 'atestado' ? (impresso.conteudo as ConteudoAtestadoAssistencial) : null
  const conteudoAlt =
    tipo === 'resumo_alta' ? (impresso.conteudo as ConteudoResumoAltaAssistencial) : null

  const tituloDocumento = {
    receita: 'RECEITUÁRIO MÉDICO ASSISTENCIAL',
    atestado: 'ATESTADO MÉDICO ASSISTENCIAL',
    resumo_alta: 'RESUMO / SUMÁRIO DE ALTA HOSPITALAR',
  }[tipo]

  return (
    <div className="impresso-a4-documento bg-white text-slate-900 font-sans p-8 sm:p-12 max-w-[210mm] min-h-[297mm] mx-auto border border-slate-300 shadow-sm flex flex-col justify-between print:border-0 print:p-0 print:shadow-none print:max-w-none print:min-h-0">
      {/* 1. CABEÇALHO OFICIAL DO MUNICÍPIO / UNIDADE */}
      <div>
        <div className="border-b-2 border-slate-800 pb-4 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold tracking-widest text-slate-600 uppercase block">
                REPÚBLICA FEDERATIVA DO BRASIL • SISTEMA ÚNICO DE SAÚDE (SUS)
              </span>
              <h1 className="text-lg sm:text-xl font-black uppercase text-slate-900 tracking-tight">
                {impresso.unidade_nome || 'Hospital Municipal de Mirante da Serra'}
              </h1>
              <p className="text-xs text-slate-600">
                Prefeitura Municipal de Saúde • {impresso.municipio_uf || 'Mirante da Serra - RO'}
              </p>
            </div>
            <div className="text-right shrink-0 border-l border-slate-300 pl-4">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Documento Clínico
              </span>
              <span className="text-xs font-mono font-bold text-slate-800">
                {impresso.id ? `#${impresso.id.slice(0, 10)}` : 'PRÉ-VISUALIZAÇÃO'}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Origem: {(impresso.origem || 'Pronto Atendimento').toUpperCase()}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 text-center">
            <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-slate-900 underline decoration-2 underline-offset-4">
              {tituloDocumento}
            </h2>
          </div>
        </div>

        {/* 2. IDENTIFICAÇÃO DO PACIENTE */}
        <div className="bg-slate-50 border border-slate-300 rounded-lg p-3.5 mb-6 text-xs space-y-1.5 print:bg-white print:border-slate-400">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
            <div>
              <span className="font-semibold text-slate-600">Paciente: </span>
              <strong className="text-slate-900 text-sm uppercase">
                {paciente?.nome || 'Paciente não selecionado'}
              </strong>
            </div>
            <div>
              <span className="font-semibold text-slate-600">Cartão Nacional SUS (CNS): </span>
              <span className="font-mono font-bold text-slate-900">
                {paciente?.cartao_sus || '000 0000 0000 0000'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-slate-700 pt-0.5">
            {paciente?.cpf && (
              <div>
                <span className="font-semibold text-slate-600">CPF: </span>
                <span className="font-mono">{paciente.cpf}</span>
              </div>
            )}
            {paciente?.data_nascimento && (
              <div>
                <span className="font-semibold text-slate-600">Nascimento: </span>
                <span>{paciente.data_nascimento}</span>
              </div>
            )}
            {paciente?.sexo && (
              <div>
                <span className="font-semibold text-slate-600">Sexo: </span>
                <span>
                  {paciente.sexo === 'M'
                    ? 'Masculino'
                    : paciente.sexo === 'F'
                      ? 'Feminino'
                      : 'Outro'}
                </span>
              </div>
            )}
            {paciente?.tipo_sanguineo && (
              <div>
                <span className="font-semibold text-slate-600">Tipo Sangüíneo: </span>
                <span className="font-bold">{paciente.tipo_sanguineo}</span>
              </div>
            )}
            <div>
              <span className="font-semibold text-slate-600">Data de Emissão: </span>
              <strong className="font-mono">
                {impresso.data_hora_emissao || new Date().toLocaleString('pt-BR')}
              </strong>
            </div>
          </div>

          {paciente?.alergias && (
            <div className="pt-1.5 border-t border-slate-200 text-red-700 font-semibold text-[11px]">
              ⚠️ Alergias Informadas: {paciente.alergias}
            </div>
          )}
        </div>

        {/* 3. CONTEÚDO ESPECÍFICO DO IMPRESSO */}

        {/* 3A. RECEITA MÉDICA */}
        {tipo === 'receita' && conteudoRec && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-300">
              <span className="font-bold uppercase tracking-wider text-slate-700">
                Prescrição de Medicamentos & Posologia
              </span>
              {conteudoRec.uso_continuo && (
                <span className="font-bold text-[11px] text-blue-900 border border-blue-400 px-2 py-0.5 rounded">
                  USO CONTÍNUO
                </span>
              )}
            </div>

            {conteudoRec.itens && conteudoRec.itens.length > 0 ? (
              <ol className="space-y-4 pl-1">
                {conteudoRec.itens.map((item, idx) => (
                  <li key={idx} className="border-b border-slate-200 pb-3 pl-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {idx + 1}. {item.medicamento_nome}{' '}
                        {item.apresentacao ? `(${item.apresentacao})` : ''}
                      </span>
                      {item.duracao_quantidade && (
                        <span className="text-xs font-semibold text-slate-700 font-mono">
                          Qtd/Duração: {item.duracao_quantidade}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-slate-800 space-y-0.5 pl-4">
                      <div>
                        <strong>Posologia: </strong> {item.dose} • Via:{' '}
                        <strong>{item.via_administracao}</strong> • {item.frequencia_posologia}
                      </div>
                      {item.orientacoes && (
                        <div className="text-slate-600 italic">Orientações: {item.orientacoes}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-slate-500 italic py-4">Nenhum item adicionado à receita.</div>
            )}

            {conteudoRec.observacoes_gerais && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded text-slate-700 text-xs">
                <strong>Orientações Gerais ao Paciente:</strong>
                <p className="mt-1 whitespace-pre-line">{conteudoRec.observacoes_gerais}</p>
              </div>
            )}
          </div>
        )}

        {/* 3B. ATESTADO MÉDICO */}
        {tipo === 'atestado' && conteudoAt && (
          <div className="space-y-6 text-sm text-slate-800 my-8">
            <div className="border border-slate-300 p-6 rounded-lg bg-slate-50/50 space-y-4 print:bg-white leading-relaxed">
              <p className="text-justify indent-8 text-sm sm:text-base leading-relaxed">
                {conteudoAt.texto_atestado ||
                  `Atesto para os devidos fins legais que o(a) paciente ${paciente?.nome || 'identificado(a) acima'} esteve sob meus cuidados profissionais nesta unidade de saúde.`}
              </p>

              {/* Informações de Período e Finalidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block">Tipo de Atestado:</span>
                  <span className="font-bold text-slate-800 uppercase">
                    {conteudoAt.tipo_atestado.replace('_', ' ')}
                  </span>
                </div>
                {conteudoAt.periodo_dias ? (
                  <div>
                    <span className="text-slate-500 font-semibold block">
                      Período de Afastamento:
                    </span>
                    <strong className="text-slate-900 text-sm">
                      {conteudoAt.periodo_dias} dia(s)
                    </strong>{' '}
                    a partir de {conteudoAt.data_inicio}
                    {conteudoAt.data_fim ? ` até ${conteudoAt.data_fim}` : ''}
                  </div>
                ) : conteudoAt.periodo_horas ? (
                  <div>
                    <span className="text-slate-500 font-semibold block">
                      Horário de Comparecimento:
                    </span>
                    <strong className="text-slate-900">{conteudoAt.periodo_horas}</strong> em{' '}
                    {conteudoAt.data_inicio}
                  </div>
                ) : null}
              </div>

              {/* Bloco de CID — EXIBIDO EXCLUSIVAMENTE COM CONSENTIMENTO EXPLÍCITO REGISTRADO */}
              {impresso.cid_consentimento_registrado && impresso.cid10_codigo ? (
                <div className="mt-4 p-3 bg-emerald-50 border-2 border-emerald-500 rounded text-xs text-emerald-950 space-y-1 print:bg-white print:border-slate-600">
                  <div className="flex items-center justify-between">
                    <strong className="uppercase">
                      Diagnóstico Clínico (CID-10): {impresso.cid10_codigo}
                      {impresso.cid10_descricao ? ` — ${impresso.cid10_descricao}` : ''}
                    </strong>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase bg-emerald-100 px-2 py-0.5 rounded print:border print:border-slate-500">
                      Consentimento Autorizado
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-900 italic">
                    Registro de consentimento: O(A) paciente autorizou expressamente a inclusão da
                    codificação diagnóstica neste atestado médico em{' '}
                    {impresso.cid_consentimento_data_hora || impresso.data_hora_emissao}, em
                    conformidade com as Resoluções CFM vigentes.
                  </p>
                </div>
              ) : (
                <div className="mt-3 p-2 bg-slate-100 border border-slate-300 rounded text-[11px] text-slate-600 italic text-center print:bg-white print:border-slate-400">
                  Diagnóstico (CID) não informado no documento conforme sigilo médico e ausência de
                  consentimento para divulgação pública.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3C. RESUMO DE ALTA HOSPITALAR */}
        {tipo === 'resumo_alta' && conteudoAlt && (
          <div className="space-y-4 text-xs">
            {/* Dados da Internação */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 border border-slate-200 rounded text-slate-800 print:bg-white">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">
                  Admissão
                </span>
                <strong>{conteudoAlt.data_admissao}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">
                  Alta Hospitalar
                </span>
                <strong>{conteudoAlt.data_alta}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">
                  Setor / Leito
                </span>
                <strong>{conteudoAlt.leito_setor}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">
                  Condição na Alta
                </span>
                <strong className="uppercase text-emerald-800">{conteudoAlt.condicao_alta}</strong>
              </div>
            </div>

            {/* Diagnósticos Admissão e Alta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 border border-slate-200 rounded">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Diagnóstico de Admissão:
                </span>
                <p className="text-slate-800 mt-0.5">
                  {conteudoAlt.diagnostico_admissao || 'Não informado'}
                  {conteudoAlt.cid10_admissao ? ` (CID: ${conteudoAlt.cid10_admissao})` : ''}
                </p>
              </div>
              <div className="p-3 border border-slate-300 rounded bg-slate-50/50 print:bg-white">
                <span className="text-[10px] text-slate-700 uppercase font-bold block">
                  Diagnóstico Final / Alta:
                </span>
                <strong className="text-slate-900 mt-0.5 block">
                  {conteudoAlt.diagnostico_alta}
                  {conteudoAlt.cid10_alta ? ` (CID: ${conteudoAlt.cid10_alta})` : ''}
                </strong>
              </div>
            </div>

            {/* Procedimentos Realizados */}
            {conteudoAlt.procedimentos_cirurgias_realizados && (
              <div className="p-3 border border-slate-200 rounded">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Procedimentos / Cirurgias Realizadas:
                </span>
                <p className="text-slate-800 mt-0.5 whitespace-pre-line">
                  {conteudoAlt.procedimentos_cirurgias_realizados}
                </p>
              </div>
            )}

            {/* Evolução e Resumo Clínico */}
            <div className="p-3 border border-slate-200 rounded">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                Resumo da Evolução Clínica:
              </span>
              <p className="text-slate-800 mt-0.5 whitespace-pre-line leading-relaxed">
                {conteudoAlt.resumo_evolucao_clinica}
              </p>
            </div>

            {/* Conduta e Medicação Pós-Alta */}
            <div className="p-3 border-2 border-slate-400 rounded bg-slate-50/40 print:bg-white">
              <span className="text-[10px] text-slate-800 uppercase font-bold block">
                Prescrição Médica Pós-Alta / Conduta Medicamentosa:
              </span>
              <p className="text-slate-900 mt-1 whitespace-pre-line font-medium leading-relaxed">
                {conteudoAlt.conduta_medicacao_alta}
              </p>
            </div>

            {/* Recomendações e Retorno */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 border border-slate-200 rounded">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Orientações e Cuidados Gerais:
                </span>
                <p className="text-slate-800 mt-0.5 whitespace-pre-line">
                  {conteudoAlt.recomendacoes_cuidados}
                </p>
              </div>
              <div className="p-3 border border-slate-200 rounded">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Retorno Ambulatorial / Encaminhamento:
                </span>
                <p className="text-slate-800 mt-0.5 whitespace-pre-line">
                  {conteudoAlt.retorno_ambulatorial ||
                    'Retorno conforme agendamento ou se intercorrências.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. IDENTIFICAÇÃO DO PROFISSIONAL EMISSOR (TEXTO FORMAL, SEM ASSINATURA DIGITAL SIMULADA) */}
      <div className="pt-12 mt-8 border-t border-slate-300 text-center space-y-2">
        <div className="max-w-md mx-auto">
          {/* Linha para assinatura manual em caneta se impresso */}
          <div className="border-b border-slate-400 w-64 mx-auto mb-2 print:border-slate-800" />
          <div className="text-sm font-bold text-slate-900 uppercase">
            {impresso.profissional_nome || 'Profissional de Saúde'}
          </div>
          <div className="text-xs text-slate-700">
            {impresso.profissional_profissao || 'Médico(a)'} • Registro no Conselho:{' '}
            <strong className="font-mono">
              {impresso.profissional_registro || 'Registro não informado'}
            </strong>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Emitido via Sistema Integrado de Gestão Hospitalar Municipal • Mirante da Serra - RO
          </div>
        </div>

        {/* Rodapé legal de segurança */}
        <div className="pt-4 text-[9px] text-slate-400 flex items-center justify-between">
          <span>
            Documento de uso assistencial interno — Válido com carimbo e assinatura física
          </span>
          <span>Página 1 de 1</span>
        </div>
      </div>
    </div>
  )
}
