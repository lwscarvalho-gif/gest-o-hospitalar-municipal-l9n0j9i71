import pb from '@/lib/pocketbase/client'
import { ParametroIntegracao } from '@/types/hospital'
import { registrarAuditoria } from './auditoria'

export async function listarParametrosIntegracao(): Promise<ParametroIntegracao[]> {
  const records = await pb.collection('parametros_integracao').getFullList<ParametroIntegracao>({
    sort: 'codigo',
  })
  return records
}

export async function salvarParametroIntegracao(
  id: string,
  dados: Partial<ParametroIntegracao>,
): Promise<ParametroIntegracao> {
  const payload: any = { ...dados }
  if (typeof dados.configuracoes === 'object') {
    payload.configuracoes = JSON.stringify(dados.configuracoes)
  }

  const record = await pb
    .collection('parametros_integracao')
    .update<ParametroIntegracao>(id, payload)
  await registrarAuditoria({
    acao: 'CONFIGURAR_INTEGRACAO',
    modulo: 'Integrações Governamentais',
    detalhes: `Parâmetros de ${record.codigo} atualizados`,
    registro_id: record.id,
  })
  return record
}

export async function registrarExportacaoIntegracao(id: string, codigo: string): Promise<void> {
  const agora = new Date().toLocaleString('pt-BR')
  await pb.collection('parametros_integracao').update(id, {
    ultima_exportacao: agora,
  })
  await registrarAuditoria({
    acao: 'EXPORTAR_ARQUIVO_INTEGRACAO',
    modulo: 'Integrações Governamentais',
    detalhes: `Geração de arquivo simulado para envio ${codigo}`,
    registro_id: id,
  })
}
