import pb from '@/lib/pocketbase/client'

export async function executarTestesSinteticosFarmacia(): Promise<{
  todos_passaram: boolean
  resultados: Array<{
    cenario: string
    sucesso: boolean
    detalhes?: string
    erro?: string
  }>
}> {
  try {
    const res = await pb.send<{
      todos_passaram: boolean
      resultados: Array<{
        cenario: string
        sucesso: boolean
        detalhes?: string
        erro?: string
      }>
    }>('/backend/v1/farmacia/testes-sinteticos', {
      method: 'POST',
    })
    return res
  } catch (err: any) {
    console.error('Erro ao executar testes sintéticos:', err)
    return {
      todos_passaram: false,
      resultados: [
        {
          cenario: 'execucao_geral',
          sucesso: false,
          erro: err.message || 'Falha na requisição dos testes',
        },
      ],
    }
  }
}
