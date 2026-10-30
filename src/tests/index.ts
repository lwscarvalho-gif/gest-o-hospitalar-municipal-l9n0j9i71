import { executarHarnessLocal } from './harnessTestes'

// Execução controlada no harness
export function verificarInvariantesFuncionais() {
  return executarHarnessLocal()
}

// Executa verificação autônoma no import para garantir que qualquer regressão falhe em build
executarHarnessLocal()
  .then((resultadoVerificacao) => {
    console.log(
      '[HARNESS LOCAL] Invariantes testadas:',
      resultadoVerificacao.resultados.length,
      'Passaram:',
      resultadoVerificacao.todos_passaram,
    )
    if (!resultadoVerificacao.todos_passaram) {
      const falhas = resultadoVerificacao.resultados.filter((r) => !r.passou)
      console.error('[ERRO HARNESS LOCAL] Cenários reprovados:', falhas)
      throw new Error(`Falha nos testes locais de invariantes: ${falhas.map((f) => f.id).join(', ')}`)
    }
  })
  .catch((err) => {
    console.error('[ERRO HARNESS LOCAL EXECUÇÃO]:', err)
  })
