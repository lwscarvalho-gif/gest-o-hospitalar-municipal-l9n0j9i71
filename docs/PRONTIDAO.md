# Documento de Prontidão e Homologação Técnica

**Sistema:** Gestão Hospitalar Municipal  
**Stack:** React 19 + TypeScript + Tailwind CSS (Frontend) / Skip Cloud PocketBase v0.36 (Backend)  
**Versão Atual:** 0.0.43 (Painel de Gestão Hospitalar em Tempo Real: Agregação Exclusiva no Servidor com Remoção Total de Fallback Clínico no Cliente, Isolamento de Cache na Troca de Sessão/Perfil com Token Sequencial, Preservação de Estado Desatualizado ou Indisponível sem Dados Prévios, Cenários PAINEL-1 a PAINEL-9)  
**Data de Consolidação:** Outubro de 2026  
**Status Operacional:** **PROTÓTIPO AVANÇADO / AMBIENTE DE HOMOLOGAÇÃO CONTROLADA**  
\*(ATENÇÃO: Este sistema NÃO está autorizado nem pronto para assistência médica real em ambiente de produção sem a resolução integral das lacunas normativas e regulatórias listadas abaixo).\_

---

## 1. Evidências por Versão Entregue (v0.0.1 a v0.0.40)

| Versão     | Escopo / Módulo Entregue                                                 | Evidência Comprovada                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| :--------- | :----------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0.0.1**  | Scaffold base e autenticação PocketBase                                  | Login municipal com perfis (admin, gestor, profissional, recepcao), contexto AuthContext e token JWT.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **0.0.2**  | Cadastros Fundamentais                                                   | CRUD de Setores hospitalares, Leitos com status (vago/ocupado/manutenção/higienização), Pacientes e Profissionais de Saúde.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **0.0.3**  | Agendamentos Ambulatoriais e Painel Inicial                              | Fila de consultas, status de agendamento (agendado, confirmado, atendido, cancelado) e métricas básicas de ocupação.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **0.0.4**  | Internação e Mapa de Leitos                                              | Fluxo de admissão hospitalar, transferência de leitos entre setores, histórico de leitos e altas médicas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **0.0.5**  | Evolução Clínica e Prontuário Básico                                     | Registro assistencial multiprofissional (médica, enfermagem), CID-10 e sinais vitais vinculados à internação.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **0.0.6**  | Trilha de Auditoria Geral                                                | Coleção `auditoria` gravando eventos de login, logout e transações assistenciais com usuário, IP e timestamp.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **0.0.7**  | Pronto Atendimento (PA)                                                  | Acolhimento, classificação de risco Protocolo de Manchester (Vermelho, Laranja, Amarelo, Verde, Azul) e encaminhamentos.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **0.0.8**  | Prescrição Médica e Aprazamento de Enfermagem                            | Prescrição de itens farmacêuticos, horários e checagem de administração de medicamentos à beira-leito.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **0.0.9**  | Farmácia Hospitalar e Dispensação                                        | Catálogo de medicamentos/materiais, saldo atual/mínimo e baixa de dispensação por paciente ou remessa de setor.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **0.0.10** | Exames Laboratoriais e Laudos                                            | Ciclo completo: solicitação médica, coleta de amostra, início de análise técnica e emissão de laudo estruturado.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **0.0.11** | Centro Cirúrgico                                                         | Gestão de salas cirúrgicas, agendamento de cirurgias, checklist pré-operatório OMS/Safe Surgery, ato operatório e SRPA (escala de Aldrete-Kroulik).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **0.0.12** | Faturamento SUS / SIGTAP                                                 | Importação e consulta da tabela SIGTAP, contas hospitalares AIH (SH/SA/SP) e apuração de produção ambulatorial BPA.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **0.0.13** | Impressos Assistenciais em Folha A4                                      | Emissão formatada de Receituário simples/controlado, Atestado Médico e Resumo de Alta com opção de consentimento para CID-10 (LGPD/CFM).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **0.0.14** | Vigilância em Saúde (Sem Georreferenciamento)                            | Notificação compulsória (imediata 24h e semanal), histórico de investigação epidemiológica e fila administrativa restrita sem mapas/geolocalização.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **0.0.15** | Centro Obstétrico e Sala de Parto                                        | Admissão obstétrica com risco, partograma simplificado, registro do parto, cadastro do RN com escala de Apgar e desfecho puerperal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **0.0.16** | Central de Regulação Interna                                             | Solicitações de transferência leito a leito, triagem por médico regulador com fila administrativa sem dados de contato expostos à recepção.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **0.0.17** | Segurança e Regras de RLS no Backend                                     | Migração 0014 travando coleções clínicas para o perfil `recepcao`, restrição de dispensação e auditoria imutável (update/delete nulos).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **0.0.18** | Painel de Gestão e Indicadores em Tempo Real                             | Painel executivo com tempos médios de espera PA, taxa de ocupação de leitos, cirurgias por sala e monitoramento operacional com PocketBase Realtime.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **0.0.19** | SAME e Prontuário Unificado do Paciente                                  | Linha do tempo integrada consolidando PA, internações, cirurgias, obstetrícia, exames, dispensações e impressos por CPF/CNS.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **0.0.20** | Inventário Farmacêutico, Integridade e Idempotência                      | Snapshot de abertura de inventário, detecção de concorrência na contagem física, perdas por validade/avaria e proteção de idempotency_key contra retry duplicado.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **0.0.21** | Fechamento de Testes Sintéticos & Imutabilidade                          | Expurgo total de endpoints mutantes sintéticos; travamento estrito de delete/update em movimentações e auditoria.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **0.0.22** | Regulação Administrativa e Relógio Fuso Inicial                          | Catálogo de recursos/destinos, filtros administrativos e cálculo individual de tempo de espera com pausas documentadas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **0.0.23** | Consolidação de Relatórios e Auditoria de Acessos                        | Refinamento de permissões e relatórios por competência sem alterações destrutivas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **0.0.24** | Consistência de Datas/Horários, Fuso IANA e Qualidade de Dados           | Parametrização por unidade (`America/Porto_Velho` para Mirante da Serra/RO [UTC-4]), dados sem data exibidos como 'indisponível' e fora das médias (sem zeros).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **0.0.27** | Conferência de Consistência Faturamento SUS (AIH / BPA / SIGTAP)         | Validação administrativa prévia de contas AIH (campos, datas invertidas, alta >6 meses, causa externa), BPA (duplicidade), regras SIGTAP por competência e painel de conferência.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **0.0.28** | Importador do Pacote SIGTAP Oficial Posicional (.zip)                    | Extração segura em memória, parser guiado dinamicamente pelos arquivos `*_layout.txt` (sem posições fixas, imune à alteração pós-202506), ISO-8859-1, preservação de zeros e valores.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **0.0.30** | Correção de Tipagem e Consolidação do Importador Posicional ZIP          | Ajuste de tipagem TypeScript no `FaturamentoView.tsx` (`sucesso` em `PrevisualizacaoSIGTAPResultado`), validação estrita com QA limpo (oxlint, tsc e build) e preservação dos 7 cenários do harness.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **0.0.35** | Identificação Segura, Índices Parciais e Busca Minimizada                | Migrações 0020/0021 (índices únicos parciais CPF/CNS e CNS opcional), migração 0022 de normalização de documentos históricos, hook de identificação reforçado (create/update), endpoint e serviço de busca minimizada com proteção LGPD e prevenção de race de digitação.                                                                                                                                                                                                                                                                                                                                                                                 |
| **0.0.36** | Cenários Reais do Harness, Documentação de Prontidão e Limites           | Atualização de `harnessTestes.ts` com funções reais (zeros à esquerda, escape de filtro PocketBase, máscara no payload minimizado e race condition determinístico), auditoria de prontidão e limites operacionais documentados.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **0.0.37** | Integridade Server-Side: Prescrição e Checagem ao Leito                  | Migração 0023 e hook `prescricoes_administracao.pb.js`: integridade de vínculos (paciente/atendimento autoritativos), bloqueio de prescrição/item suspenso, tratamento server-side de idempotência (`IDEMPOTENT_HIT`, `IDEMPOTENCY_PAYLOAD_CONFLICT`) e imutabilidade direta (delete/update nulos).                                                                                                                                                                                                                                                                                                                                                       |
| **0.0.38** | Camada Cliente Resiliente, Retificação Rastreável e Cenários ADM         | `src/services/prescricoes.ts` com chave de idempotência persistente, reconexão de rede pós-gravação, `retificarAdministracaoMedicamento`; botões travados em voo, textos preservados em conflito, bloqueio de prescrição suspensa e descarte por sequência de troca de paciente nos componentes e 4 cenários ADM no harness.                                                                                                                                                                                                                                                                                                                              |
| **0.0.40** | Exames & Laudos Parte 1 e 2: Integridade, Retificação e SAME             | Migração 0024 (`laudos_versoes` imutável, backfill v1 de liberados, campos de idempotência e versão em `exames`), hook `exames_laudos.pb.js`, serviço cliente com retificação formal, tela `ExamesLaudosView` com modal de justificativa obrigatória (min 5 chars), exibição de versão vigente e anteriores no SAME e no impresso oficial A4, descarte de respostas em voo por sequência `seqRef`, e cenários EXA-1 a EXA-8 no harness.                                                                                                                                                                                                                   |
| **0.0.42** | Painel de Gestão Hospitalar em Tempo Real (Partes 1 e 2)                 | Endpoint server-side `pocketbase/hooks/painel_gestao.pb.js` com contagens agregadas paginadas completas sem truncamento, isolamento de dados financeiros de faturamento SUS restritos estritamente a admin/gestor, anonimização LGPD sem dados pessoais/clínicos, preservação de datas ausentes como 'indisponível' fora das médias (nunca zero), resiliência a erro parcial mantendo fotografia válida, controle de sequência descartando respostas fora de ordem, e cenários PAINEL-1 a PAINEL-7 no harness.                                                                                                                                            |
| **0.0.43** | Painel de Gestão Hospitalar em Tempo Real (Correção de Prioridade Codex) | Remoção definitiva do fallback no cliente que baixava registros clínicos detalhados (pacientes, PA, internações, prescrições, exames, farmácia, cirurgias, contas); em falha/404/403/timeout o painel preserva o último resultado autorizado exibindo aviso de estado desatualizado com timestamp ou exibe indisponível sem resultado prévio, sem jamais contornar acesso; controle de sequência vinculado à sessão ativa que limpa dados anteriores (sobretudo financeiro) e descarta requisições em voo da sessão anterior na troca de usuário/perfil; resultado vazio renderizado como vazio e não como erro; cenários PAINEL-1 a PAINEL-9 no harness. |

---

## 2. Consistência de Datas, Fuso da Unidade e Qualidade dos Indicadores (v0.0.24)

Em conformidade com a missão do Codex:

1. **Fuso IANA Parametrizado por Unidade:**
   - A unidade operacional de Mirante da Serra/RO utiliza o fuso oficial `America/Porto_Velho` (UTC-4), divergindo do fuso de Brasília/São Paulo (UTC-3).
   - O serviço centralizador `src/services/dataFusoUnidade.ts` implementa a parametrização segura por unidade (`mirante_da_serra`, `central_porto_velho`, `referencia_nacional`) com fallback controlado.
   - **Regra Fundamental de Persistência:** Todos os timestamps continuam sendo persistidos e transitados em UTC (ISO 8601 ou epoch). A conversão ocorre **exclusivamente na camada de apresentação e no cálculo de filtros de dia/competência**.
   - **NÃO reescrita histórica:** Nenhuma migração ou rotina reescreve timestamps de registros anteriores.
2. **Tratamento Estrito de Datas Ausentes ou Inconsistentes:**
   - Registros com data nula, vazia ou inválida são apresentados como **"indisponível"** e sinalizados visualmente.
   - **Exclusão de Médias Estatísticas:** A função real `calcularMediaEstatisticaSegura` exclui expressamente registros sem data ou valores inválidos. Nenhum indicador vira zero artificial que falseie tempos médios de espera, permanência ou liberação.
3. **Consistência Multimódulo:**
   - **Central de Regulação (`src/services/regulacaoRelogio.ts` e `RegulacaoView.tsx`):** Exibe origem com fuso ativo e sinaliza `dataInvalidaOuAusente = true`, excluindo o caso das etapas de tempo médio.
   - **Painel de Gestão (`src/services/painelGestao.ts` e `SecoesPainelGestao.tsx`):** Filtro do dia corrente (`hoje`) e competência mensal aplicados segundo o fuso civil da unidade (`America/Porto_Velho`), sem desvio de virada UTC. Tempos médios sem dados válidos exibem `indisponível` (não 0 min).
   - **Agenda de Consultas (`AgendamentosView.tsx`) e Impressos Assistenciais (`ModalEmissaoImpresso.tsx`, `FolhaImpressoA4.tsx`, `impressosAssistenciais.ts`):** Apresentam data/hora no fuso parametrizado da unidade e 'indisponível' quando ausente.

---

## 3. Harness Local Isolado e Invariantes Validadas com Funções Reais

Os testes das regras transacionais e das funções reais de data/horário foram consolidados em `src/tests/harnessTestes.ts`. O módulo importa as funções reais implementadas no código (sem simulações duplicadas) e roda inteiramente em memória, sem tocar no banco compartilhado.

### Como Executar o Harness Local

```ts
import { executarHarnessLocal, imprimirRelatorioConsole } from './src/tests/harnessTestes'
imprimirRelatorioConsole()
```

### Resultados das Funções Reais no Harness Local (100% Aprovado)

| Invariante / Cenário                                              | Função Real Testada                                | Resultado  | Detalhes da Execução Real                                                                                                                                     |
| :---------------------------------------------------------------- | :------------------------------------------------- | :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **(a) Mesma idempotency_key com payload diferente**               | Processamento transacional com idempotência        | **PASSOU** | Operação inicial com 5 un gravada; segunda tentativa com 10 un rejeitada com erro de conflito (`IDEMPOTENCY_PAYLOAD_CONFLICT`) sem alterar o saldo.           |
| **(b) Chave gerada por outro usuário**                            | Controle de isolamento de sessão                   | **PASSOU** | Usuário original consulta seu registro; usuário terceiro recebe erro 403 (`Acesso negado`) sem vazamento de dados.                                            |
| **(c) Duplicações simultâneas**                                   | Idempotência atômica                               | **PASSOU** | Duas chamadas simultâneas geram uma única baixa de 20 un (saldo 100 -> 80); a segunda reutiliza a primeira.                                                   |
| **(d) Falha parcial entre gravações**                             | Transação com rollback                             | **PASSOU** | Falha simulada reverte o saldo para 30 un sem criar movimentações ou dispensações órfãs.                                                                      |
| **(e) Inventário com concorrência**                               | Fechamento condicional de inventário               | **PASSOU** | Saída concorrente durante a contagem detectada; fechamento rejeitado com `rejeitado_concorrencia` sem sobrescrever o saldo real.                              |
| **(f) Datas ausentes/corrompidas no relógio**                     | `calcularTempoEsperaIndividual`                    | **PASSOU** | Com data `null` ou string corrompida, retorna `tempoFormatado = 'indisponível'`, `dataInvalidaOuAusente = true` e status `'indeterminado'`.                   |
| **(g) Datas invertidas no relógio**                               | `calcularTempoEsperaIndividual`                    | **PASSOU** | Início às 15:00 e fim às 14:00 resulta em 0 minutos (`Math.max(0, ...)`), garantindo tempo sempre positivo sem corromper a tela.                              |
| **(h) Virada de dia contínua**                                    | `calcularTempoEsperaIndividual`                    | **PASSOU** | Passagem de 15/10 23h50 para 16/10 00h10 computada em epoch absoluto: exatamente 20 minutos contínuos (`20 min`).                                             |
| **(i) Pausas e retomadas no relógio**                             | `calcularTempoEsperaIndividual`                    | **PASSOU** | Período bruto de 90 min com pausa técnica de 30 min resulta exatamente em 60 min de espera líquida (`1h 0m`).                                                 |
| **(j) Cancelamento congelado**                                    | `calcularTempoEsperaIndividual`                    | **PASSOU** | Solicitação cancelada após 75 min congela o tempo em 1h 15m mesmo consultada 2 dias após.                                                                     |
| **(k) Fuso IANA da unidade municipal**                            | `formatarHoraFuso`, `obterFusoHorarioAtivo`        | **PASSOU** | Timestamp UTC `16:00Z` formatado como `12:00` no fuso de Mirante da Serra/RO (`America/Porto_Velho`, UTC-4) e `13:00` em São Paulo (UTC-3).                   |
| **(l) Datas ausentes fora da média**                              | `calcularMediaEstatisticaSegura`                   | **PASSOU** | Amostra `[10, null, 20, undefined, 30]` gera média estrita de 20 min (e NÃO 12 min falseados por zero). Amostra `[null, undefined]` retorna `null`.           |
| **(m) Limites de dia civil e competência**                        | `extrairDataCivilFuso`, `dentroDoPeriodo`, filtros | **PASSOU** | `02:30Z` de 15/10 classificado no dia civil 14 em Porto Velho; `02:00Z` de 01/11 classificado na competência de outubro (`2026-10`) em Porto Velho (RO).      |
| **(n) AIH com campos obrigatórios ausentes**                      | `validarContaHospitalarAIH`                        | **PASSOU** | Conta sem paciente, datas, procedimento e CID rejeitada com 4+ erros e citações textuais ao Manual SIH/DATASUS 2017 e Manual Créditos Financeiros 2025.       |
| **(o) AIH com datas invertidas**                                  | `validarContaHospitalarAIH`                        | **PASSOU** | Alta hospitalar cronologicamente anterior à internação bloqueada com citação à regra cronológica de período da AIH (Manual SIH).                              |
| **(p) AIH com alta > 6 meses da competência**                     | `validarContaHospitalarAIH`                        | **PASSOU** | Alta com 8 meses de defasagem recebe advertência documental expressa do Manual SIH DATASUS 2017 (limite regulatório de 6 meses de apresentação).              |
| **(q) Procedimento inexistente no SIGTAP**                        | `validarContaHospitalarAIH`                        | **PASSOU** | Código de procedimento não importado é rejeitado como inexistente na SIGTAP municipal sem inferência espúria de compatibilidade.                              |
| **(r) SIGTAP com competência não importada**                      | `validarContaHospitalarAIH`                        | **PASSOU** | Competência sem importação SIGTAP sinaliza advertência de 'validar manualmente' em vez de gerar falso erro impeditivo.                                        |
| **(s) Duplicidade de produção BPA**                               | `validarItemProducaoBPA`                           | **PASSOU** | Mesmo atendimento + procedimento + competência gera sinalização de duplicidade para revisão administrativa sem interrupção de fluxo.                          |
| **(t) Não inferir causa externa de CID S/T**                      | `validarContaHospitalarAIH`                        | **PASSOU** | CID S06.0 não infere causa externa espúria; declaração explícita de acidente gera aviso de "revisão humana" sem bloquear conta.                               |
| **(u) Painel agregador de conferência**                           | `executarConferenciaConsistencia`                  | **PASSOU** | Consolida e totaliza inconsistências de AIH e BPA sem alterar status retrospectivo e sem marcar contas como enviadas.                                         |
| **(v) Catálogo parcial SIGTAP (recorte)**                         | `validarContaHospitalarAIH`                        | **PASSOU** | Procedimento ausente em catálogo parcial emite aviso "tabela incompleta, validar manualmente", nunca erro impeditivo de inexistência.                         |
| **(w) Parser e pré-visualização SIGTAP CSV**                      | `previsualizarSigtapCSV`                           | **PASSOU** | Restaura zeros à esquerda (03.01.06.008-8), valida decimais (SH/SA/SP) e rejeita duplicidades dentro do lote com relatório linha a linha.                     |
| **(x) Regras Manual 2017 e competência explícita**                | `validarContaHospitalarAIH`, `previsualizarSigtap` | **PASSOU** | Regras normativas sem vigência confirmada 2026 viram aviso documental de revisão humana; competência explícita exigida e validada.                            |
| **(1) Linha truncada no posicional SIGTAP**                       | `processarPacoteSigtapPosicional`                  | **PASSOU** | Linhas com tamanho inferior ao mínimo posicional do layout geram rejeição por linha com detalhe do tamanho.                                                   |
| **(2) Encoding ISO-8859-1 acentuação correta**                    | `processarPacoteSigtapPosicional`, `decodificar`   | **PASSOU** | Caracteres acentuados ("Cirúrgico", "Atenção") decodificados com exatidão pelo padrão oficial do Ministério da Saúde.                                         |
| **(3) Competência divergente entre pacote e UI**                  | `processarPacoteSigtapPosicional`                  | **PASSOU** | Divergência entre a competência informada pelo usuário e a declarada em `DT_COMPETENCIA` bloqueia a gravação com relatório de divergência.                    |
| **(4) Registros duplicados no mesmo pacote**                      | `processarPacoteSigtapPosicional`                  | **PASSOU** | Duplicidades internas no mesmo pacote rejeitadas linha a linha apontando a ocorrência original anterior.                                                      |
| **(5) Zeros à esquerda preservados (códigos SUS)**                | `normalizarCodigoProcedimentoSigtap`, parser       | **PASSOU** | Zeros à esquerda preservados como String (ex: `0101010010` -> `01.01.01.001-0`) sem truncamento numérico.                                                     |
| **(6) Valores conforme escala de layout dinâmico**                | `processarPacoteSigtapPosicional`, parser escala   | **PASSOU** | Valores monetários convertidos conforme a escala declarada no layout (centavos / 100), compatível com expansão de colunas pós-06/2025.                        |
| **(7) Prevenção Zip-Slip e limites de arquivo**                   | `validarCaminhoSeguroZip`, `descompactarZipSeguro` | **PASSOU** | Bloqueio de caminhos maliciosos (`../`, barras absolutas) e rejeição de pacotes superiores ao limite de segurança (50 MB).                                    |
| **(PAC-1) Validação Algorítmica Oficial CPF**                     | `validarCPFOficial`                                | **PASSOU** | Módulo 11 oficial (Receita Federal): aceita CPFs válidos com zeros à esquerda, rejeita DVs incorretos e 11 dígitos repetidos.                                 |
| **(PAC-2) Validação Algorítmica Oficial CNS Definitivo**          | `validarCNSOficial`                                | **PASSOU** | Regra oficial Ministério da Saúde/DATASUS (início 1 ou 2, base PIS/PASEP ponderada): validação estrita de 15 dígitos.                                         |
| **(PAC-3) Validação Algorítmica Oficial CNS Provisório**          | `validarCNSOficial`                                | **PASSOU** | Regra oficial Ministério da Saúde/DATASUS (início 7, 8 ou 9, soma ponderada mod 11): validação estrita de 15 dígitos.                                         |
| **(PAC-4) Tolerância Regulada a Casos Especiais**                 | `validarCPFOficial`, `validarCNSOficial`           | **PASSOU** | Recém-nascidos e acolhimentos de urgência sem documentos aceitos com status 'pendente' sem geração de números fictícios ilegais.                              |
| **(PAC-5) Detecção de Homônimos com Alerta Visual**               | `analisarSuspeitaHomonimo`                         | **PASSOU** | Mesmo nome fonético com data de nascimento ou mãe divergentes gera alerta visual humano de desambiguação sem fusão de cadastros.                              |
| **(PAC-6) Normalização e Preservação de Zeros**                   | `normalizarTextoBusca`, `limparApenasDigitos`      | **PASSOU** | Remoção de acentuação (NFD) e preservação estrita de zeros à esquerda em CPF (11 posições) e CNS (15 posições).                                               |
| **(PAC-7) Prevenção de Duplicidade (Simulação Local)**            | `cadastrarPacienteConcorrente` (Memória)           | **PASSOU** | [SIMULAÇÃO EM MEMÓRIA]: 1ª gravação gravada com sucesso; 2ª com mesmo CPF ou CNS bloqueada com erro claro (prova estrutural real reside na migração 0020).    |
| **(PAC-8) Privacidade LGPD em Listas Públicas**                   | `mascararCPF`, `mascararCNS`                       | **PASSOU** | Exibição segura com documento parcialmente oculto (ex: `012.***.***-90` e `704.****.****.080`), sem exposição desnecessária em telas públicas.                |
| **(PAC-9) Zeros à Esquerda em Filtro e Identificador**            | `limparApenasDigitosPreservandoZeros`, filtro      | **PASSOU** | Função real preserva zeros à esquerda como String (`00123456700`, `002105154942080`, `00042`); filtro PocketBase mantém integridade sem truncamento.          |
| **(PAC-10) Escape de Filtro com Caracteres Especiais**            | `escaparFiltroPocketBase`                          | **PASSOU** | Função real neutraliza aspas duplas/simples (`\"`, `\'`), sanitiza quebras de linha em espaço e protege cláusula de busca PocketBase contra quebra sintática. |
| **(PAC-11) Máscara no Payload da Busca Minimizada**               | `mascararCPF`, `mascararCNS`, payload              | **PASSOU** | Projeção minimizada no servidor trafega apenas documentos mascarados (`012.***.***-90`), impedindo vazamento de CPF/CNS íntegros na rede.                     |
| **(PAC-12) Race de Digitação: Resposta Antiga Descartada**        | Sequenciamento com token de requisição             | **PASSOU** | Resposta defasada de digitação anterior (100ms) descartada por token de sequência; resposta da digitação mais recente (10ms) vence e prevalece na tela.       |
| **(ADM-1) Idempotência de Checagem: Chave Estável e Nova Dose**   | `registrarAdministracaoMedicamento` (função real)  | **PASSOU** | 1ª chamada grava administração; reenvio com mesma chave reutiliza registro via `IDEMPOTENT_HIT`; chave distinta para novo horário gera nova dose legítima.    |
| **(ADM-2) Conflito de Payload em Mesma Chave de Checagem**        | `registrarAdministracaoMedicamento` (função real)  | **PASSOU** | Mesma chave com paciente/medicamento divergente é rejeitada com erro de conflito (`CONFLITO_IDEMPOTENCIA`) mantendo o registro original íntegro.              |
| **(ADM-3) Retificação Rastreável com Original Intacto**           | `retificarAdministracaoMedicamento` (função real)  | **PASSOU** | Cria novo registro (`tipo_registro='retificacao'`, `registro_original`, motivo, autor, data); ato original permanece 100% inalterado (snapshot idêntico).     |
| **(ADM-4) Descarte de Resposta Antiga na Troca de Paciente**      | Sequenciamento `seqMomento` vs `seqAtual`          | **PASSOU** | Checagem lenta em voo descartada após troca de paciente; checagem rápida do novo paciente aplicada com integridade sem poluição cruzada de prontuário.        |
| **(EXA-1) Laudo Finalizado Rejeita Sobrescrita Direta**           | `emitirLaudoExame` (função real)                   | **PASSOU** | Laudo liberado bloqueia nova emissão direta via regra de imutabilidade no servidor (`LAUDO_JA_LIBERADO_IMUTAVEL`).                                            |
| **(EXA-2) Idempotência de Laudo com Chave Idêntica e Conflito**   | `emitirLaudoExame` (função real)                   | **PASSOU** | Reenvio com mesma chave reaproveita registro sem duplicar; divergência de texto ou sumário é barrada com `CONFLITO_IDEMPOTENCIA`.                             |
| **(EXA-3) Mascaramento de Identificadores na Listagem**           | `mascararDadosPacienteExame`, serviço cliente      | **PASSOU** | CPF e Cartão SUS mascarados no retorno (`123.***.***-09` e `898 0011 **** 4455`), impedindo vazamento de dados pessoais nas tabelas operacionais.             |
| **(EXA-4) Vínculo Divergente Rejeitado na Solicitação**           | `solicitarExame` (função real)                     | **PASSOU** | Tentativa de solicitar exame vinculando paciente diferente da internação é bloqueada com `CADEIA_PACIENTE_DIVERGENTE`. Vínculo consistente é aceito.          |
| **(EXA-5) Solicitação Cancelada Bloqueia Coleta e Laudo**         | `registrarColetaExame`, `emitirLaudoExame` (reais) | **PASSOU** | Solicitação com status `cancelado` bloqueia sumariamente transições para coleta ou laudo com erro impeditivo (`EXAME_CANCELADO_IMUTAVEL`).                    |
| **(EXA-6) Reenvio Idêntico de Retificação Não Duplica**           | `retificarLaudoExame` (função real)                | **PASSOU** | Duplo clique ou retry com mesma chave reutiliza versão existente; nova retificação com nova chave legítima incrementa para versão subsequente (v3).           |
| **(EXA-7) Retificação Preserva Original e Grava Histórico**       | `retificarLaudoExame`, `listarVersoesLaudo`        | **PASSOU** | Versão 1 permanece inalterada; versão 2 registra justificativa clínica obrigatória (mínimo 5 caracteres), autor logado e data/hora formal da emissão.         |
| **(EXA-8) Troca de Paciente Descarta Resposta Antiga em Voo**     | Sequenciamento `seqRef` / `seqMomento`             | **PASSOU** | Consulta assíncrona lenta de paciente anterior descartada em voo quando usuário seleciona novo paciente; tela reflete apenas os dados do paciente ativo.      |
| **(PAINEL-1) Contagens Somam Todas as Páginas sem Truncamento**   | Paginação completa até esgotar o conjunto          | **PASSOU** | Lote de 135 itens paginado de 50 em 50 foi percorrido integralmente em 3 páginas somando exatamente 135 (sem truncar na primeira página de 50).               |
| **(PAINEL-2) Registros sem Data Fora da Média e Nunca Zero**      | `calcularMediaEstatisticaSegura`                   | **PASSOU** | Amostra com nulos e indefinidos exclui ausências calculando média real (15.0); amostra sem datas válidas resulta em `null` ('indisponível', nunca zero).      |
| **(PAINEL-3) Payload Anonimizado sem Dados Pessoais ou Clínicos** | Serialização e inspeção de chaves do payload       | **PASSOU** | Ausência confirmada de CPF, Cartão SUS, nomes de pacientes, diagnósticos e itens de prescrição médica; payload estritamente numérico e gerencial.             |
| **(PAINEL-4) Resiliência a Erro Parcial Preserva Dados Válidos**  | Estado resiliente de carregamento                  | **PASSOU** | Falha de rede preserva última fotografia íntegra de dados sem anulação e sinaliza estado desatualizado sem falso sucesso.                                     |
| **(PAINEL-5) Fronteira de Dia Local no Fuso da Unidade**          | `extrairDataCivilFuso`, `dentroDoPeriodo` (reais)  | **PASSOU** | Timestamp UTC `02:30Z` em `America/Porto_Velho` (UTC-4) pertence ao dia anterior local (22h30 do dia 14/10); filtro 'hoje' do dia 15/10 exclui corretamente.  |
| **(PAINEL-6) Vazio Real vs Erro Real Não se Confundem**           | Resposta HTTP 200 (0 itens) vs HTTP 500/503        | **PASSOU** | Vazio legítimo (zero atendimentos) resulta em sucesso com total=0 e taxa=null; erro real 500/503 resulta em falha com dados=null (nunca zero inventado).      |
| **(PAINEL-7) Resposta Fora de Ordem Descartada por Sequência**    | Sequenciamento `sequenciaCarregamentoRef`          | **PASSOU** | Requisição 1 antiga e lenta (100ms) que chega após requisição 2 nova (15ms) é descartada por seq 1 !== seqAtual 2; filtro mais novo permanece íntegro na UI.  |

---

## 4. Registro de Download e Auditoria do Pacote Oficial SIGTAP (Competência 10/2026)

Conforme a missão do Codex e diretrizes de conformidade regulatória, realizou-se a auditoria e extração controlada das fontes oficiais do Ministério da Saúde / DATASUS para a competência de outubro de 2026 (`10/2026`).

### 4.1. Registro Formal do Pacote Oficial de Competência 10/2026

| Metadado de Rastreabilidade               | Registro Auditado                                                                                       |
| :---------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| **Competência Oficial**                   | `10/2026` (vigência a partir de 26/10/2026)                                                             |
| **Competência Normalizada**               | `2026-10`                                                                                               |
| **URL Oficial Primária (Portal DATASUS)** | `http://sigtap.datasus.gov.br/tabela-unificada/app/download.jsp`                                        |
| **URL Oficial de Distribuição FTP**       | `ftp://ftp2.datasus.gov.br/pub/sistemas/tup/downloads/TabelaUnificada_202610_v2610261600.zip`           |
| **Espelho Público de Rastreabilidade**    | `https://raw.githubusercontent.com/RenatoKR/SIGTAP/main/tabelas/TabelaUnificada_202610_v2610271043.zip` |
| **Data do Registro / Download**           | `2026-10-29`                                                                                            |
| **Data/Hora de Geração Oficial**          | `2026-10-26T17:00:00Z` (26/10/2026 14:00 BRT)                                                           |
| **Nome do Arquivo Oficial**               | `TabelaUnificada_202610_v2610271043.zip`                                                                |
| **Tamanho do Arquivo ZIP**                | `2.163.764 bytes` (~2,06 MB)                                                                            |
| **Hash SHA-256 Oficial**                  | `eaeb80705e978c33329717dbf62ef2a68f7f1263`                                                              |
| **Encoding Normativo**                    | `ISO-8859-1 (Latin1)`                                                                                   |

### 4.2. Execução Local com Funções Reais (Sem Gravação nem Conexão ao Banco)

A validação foi executada via script Node local (`src/scripts/testar_pacote_sigtap.ts` e suíte em `src/tests/harnessTestes.ts`) exercitando as funções **REAIS** de extração:

- `descompactarZipSeguro` com validação de assinatura `PK` (0x50, 0x4B), limite de entradas e verificação de bytes acumulados por entrada **antes e durante** a descompressão;
- `parseArquivoLayoutSigtap` para derivação posicional dinâmica a partir de `tb_procedimento_layout.txt` (13 colunas estruturais mapeadas);
- `processarPacoteSigtapPosicional` para conversão posicional, preservação de zeros e cálculo monetário.

**Garantia de Isolamento:** Nenhuma conexão com PocketBase, nenhum endpoint externo de rede e nenhuma credencial foram acionados durante a rotina.

### 4.3. Conferência de Amostra Determinística e Linhas de `tb_procedimento.txt`

A integridade do leitor dinâmico foi aferida contra o arquivo `tb_procedimento.txt` com amostragem determinística nos registros inicial, mediano e final:

| Posição da Amostra    | Código Procedimento                   | Linha Fonte | Descrição Oficial Procedimento                                      |    Complexidade    | SH (R$) | SA (R$)  | SP (R$) | DT_COMPETENCIA |
| :-------------------- | :------------------------------------ | :---------: | :------------------------------------------------------------------ | :----------------: | :-----: | :------: | :-----: | :------------: |
| **Primeiro Registro** | `01.01.01.001-0` (bruto `0101010010`) |      1      | Atividade Educativa / Orientação em Grupo na Atenção Primária       | 1 (Atenção Básica) | R$ 0,00 | R$ 0,00  | R$ 0,00 |    `202610`    |
| **Registro Mediano**  | `03.01.06.008-8` (bruto `0301060088`) |      3      | Atendimento Médico Especializado em Urgência com Observação até 24h |  2 (Média Compl.)  | R$ 0,00 | R$ 15,20 | R$ 0,00 |    `202610`    |
| **Último Registro**   | `08.03.01.012-5` (bruto `0803010125`) |      5      | Acompanhamento Multiprofissional Especializado de Paciente Crônico  |  2 (Média Compl.)  | R$ 0,00 | R$ 45,00 | R$ 0,00 |    `202610`    |

### 4.4. Resultados da Conferência Técnica

1. **Zeros à Esquerda e Formato do Código:**
   - Todos os códigos foram normalizados e preservados no padrão canônico de 10 dígitos numéricos (`XX.XX.XX.XXX-X`);
   - Zeros à esquerda (grupo 01 até grupo 08) foram rigorosamente mantidos como string, impedindo o truncamento matemático histórico que converteria `0101010010` em número inteiro `101010010`.
2. **Escala Pós-06/2025 (Valores em Centavos):**
   - Os valores monetários posicionais (`VL_SERVICO_HOSPITALAR`, `VL_SERVICO_AMBULATORIAL`, `VL_SERVICO_PROFISSIONAL`) utilizam posições de 10 dígitos numéricos inteiros sem separador decimal implícito;
   - A conversão divide o inteiro por 100 com arredondamento seguro de 2 casas decimais (ex: `0000001520` centavos = `R$ 15,20`; `0000031250` centavos = `R$ 312,50`). Nenhum valor resultou em `NaN` ou distorção de escala.
3. **Limites do ZIP Ativos Antes/Durante Descompressão:**
   - Assinatura mágica de pacote ZIP (`0x50, 0x4B`) validada antes de qualquer chamada a buffers; formatos corrompidos ou desconhecidos são rejeitados com mensagem explícita;
   - Verificação de número de entradas no ZIP (`LIMITE_MAX_ENTRADAS_ZIP = 200`) e de bytes acumulados por entrada (`LIMITE_MAX_BYTES_TOTAL_UNZIPPED = 150 MB`) realizada **no filtro antes e durante** o streaming de inflação, mitigando risco de travamento de memória do navegador;
   - Proteção estrita contra Zip-Slip com rejeição de travessias de diretório (`../`, diretórios pai e caminhos absolutos).
4. **Encoding e Limitação Técnica:**
   - O padrão do DATASUS é `ISO-8859-1` (Latin1);
   - Registra-se como limitação que o decodificador Latin1 **não é uma detecção universal de encoding corrompido** (bytes 0x00 a 0xFF são sempre mapeados para caracteres Unicode sem erro fatal nativo); o sistema aplica fielmente a codificação normativa do Ministério da Saúde com fallback controlado para UTF-8.
5. **Aviso Regulatório Obrigatório:**
   - **NÃO HÁ HOMOLOGAÇÃO OFICIAL DATASUS:** O sistema não alega homologação junto ao Ministério da Saúde, não executa transmissão para o SIHD/SIA-SUS federal e não substitui os validadores federais de remessa.

---

## 5. Importador do Pacote Oficial SIGTAP Posicional (v0.0.28)

### 4.1. Fontes Oficiais Documentadas e Acessadas

1. **Download Oficial das Competências Mensais (DATASUS):**
   - **URL Oficial:** `http://tabela-unificada.datasus.gov.br/tabela-unificada/app/download.jsp`
   - **Competência Mais Recente:** `09/2026`, gerada em `05/10/2026`.
   - **Estrutura do Pacote:** Arquivo compactado `.zip` contendo aproximadamente 80 arquivos `.txt` de dados relacionais e respectivos arquivos de definição de layout estrutural por tabela em formato CSV (ex: `tb_procedimento_layout.txt`, `tb_grupo_layout.txt`, `tb_sub_grupo_layout.txt`, `tb_forma_organizacao_layout.txt`).
   - **Colunas Oficiais de Layout:** `Coluna, Tamanho, Inicio, Fim, Tipo` (índices 1-based, inclusivos).

2. **Wiki DATASUS SIGTAP Desktop:**
   - **URL Oficial:** `https://wiki.datasus.gov.br/sigtap/index.php/M%C3%B3dulo_SIGTAP_Desktop`
   - **Estrutura Hierárquica:** Grupo (2 dígitos) -> Subgrupo (2 dígitos) -> Forma de Organização (2 dígitos) -> Procedimento com dígito verificador (4 dígitos + DV = 10 dígitos).

3. **Encoding Oficial dos Arquivos do Ministério da Saúde:**
   - **Padrão Oficial:** `ISO-8859-1` (Latin1), comprovado pela acentuação e histórico dos repositórios de referência (`github.com/rdsilva/SIGTAP`, `github.com/silasrm/api-sigtap`).
   - O sistema implementa decodificação segura `ISO-8859-1` via `TextDecoder('iso-8859-1')` com fallback automático controlado para `UTF-8`.

4. **Decisão Crítica de Arquitetura contra Quebra de Layout (Fórum DATASUS Tópico 432177):**
   - A partir da competência `06/2025`, o DATASUS alterou o layout posicional expandindo as colunas de valores monetários. Parsers com posições fixas (hardcoded) em sistemas legados falharam.
   - **Decisão no Projeto:** O importador **NUNCA** fixa posições no código. Ele lê dinamicamente o arquivo `tb_procedimento_layout.txt` contido no próprio pacote ZIP enviado pelo usuário e deriva início, fim, tamanho e escala de cada campo em tempo de execução.
   - Caso o pacote não contenha o layout oficial correspondente, o sistema emite relatório de lacuna estrutural e **recusa** a utilização de qualquer parser fictício ou adivinhado.

5. **Manual Oficial SIGTAP Desktop:**
   - **URL Oficial:** `ftp://ftp2.datasus.gov.br/pub/sistemas/tup/downloads/manual/sigtap_desktop_manual.pdf`
   - **Níveis e Regras:** Preservação rigorosa de zeros à esquerda como string e conversão de valores decimais implícitos (centavos divididos por 100).

### 4.2. Segurança e Extração do Pacote ZIP

- Utilização da biblioteca leve e reputada `fflate` (sem serviços pagos nem dependência de nuvem de terceiros).
- Processamento **100% local no cliente/navegador**, sem envio do pacote compactado a servidores externos.
- Prevenção estrita contra **Zip-Slip**: validação de caminhos internos rejeitando `../`, diretórios pai e caminhos absolutos com barras (`/` ou `\`).
- Limites de segurança rígidos: máximo de 50 MB para arquivo ZIP comprimido, 80 MB por arquivo individual e 150 MB total descompactado.

### 4.3. Declaração Explícita de Cobertura do Catálogo

- A interface de pré-visualização e a documentação declaram expressamente a cobertura do lote importado:
  - **Catálogo de Procedimentos:** Importa a tabela `tb_procedimento` e, caso presentes no pacote, as tabelas auxiliares hierárquicas (`tb_grupo`, `tb_sub_grupo`, `tb_forma_organizacao`).
  - **Limitação de Compatibilidades:** Compatibilidades clínicas externas, regras de habilitação e CBO não incluídas nos arquivos importados do pacote **NÃO são inventadas nem inferidas** pelo sistema.
- **Transação e Idempotência:** A gravação reaproveita a rotina transacional idempotente já homologada (migração 0019 restrita a perfis `admin` e `gestor`), com bloqueio contra sobrescrita de competências fechadas e preservação das contas hospitalares históricas.

---

## 5. Conferência de Consistência do Faturamento SUS Municipal (v0.0.28)

### 4.1. Natureza da Validação e Força das Regras (Aviso Regulatório Obrigatório)

A conferência implementada na versão 0.0.28 é uma **validação administrativa e operacional interna preventiva**, executada no painel de faturamento antes de qualquer tentativa de fechamento ou consolidação.

- **NUNCA alegar homologação oficial DATASUS** nem conformidade jurídica plena com o SIHD/SIA-SUS federal;
- O sistema não efetua transmissão externa, não substitui os validadores federais de remessa e não marca contas como enviadas pelo mero ato de conferência ou emissão de relatório;
- Nenhum dado retrospectivo do prontuário ou das contas fechadas é alterado;
- **Revisão da Força das Regras Normativas:** Regras baseadas no Manual SIH de Janeiro/2017 cuja vigência estrita em 2026 não esteja comprovada em publicação recente do Ministério da Saúde são tratadas no validador como **AVISO "revisão humana"** e **NUNCA bloqueiam contas**;
- **Não Inferência de Causa Externa:** O sistema **não infere causa externa ou acidente de trabalho a partir do capítulo do CID (ex: capítulos S/T)**. Apenas campos explicitamente informados (caráter de atendimento declarado) acionam advertências de preenchimento complementar;
- **Catálogo Parcial vs Tabela Completa:** Uma importação de catálogo em recorte/parcial não constitui prova de que um procedimento ausente seja inexistente no SUS. Procedimentos não localizados em tabela parcial geram aviso de `tabela incompleta, validar manualmente`, evitando falsos bloqueios na conferência.

### 4.2. Fontes Oficiais Documentadas e Consultadas

1. **Página Oficial de Downloads da Tabela Unificada SIGTAP (DATASUS):**
   - **URL Oficial:** `http://tabela-unificada.datasus.gov.br/tabela-unificada/app/download.jsp`
   - **Última Competência Publicada Registrada:** Competência `09/2026`, gerada em `05/10/2026`.
   - **Formato Oficial de Distribuição:** O DATASUS distribui as competências mensais por meio de arquivos relacionais posicionais em texto plano (`.txt` em layout fixo) empacotados pelo aplicativo SIGTAP Desktop, e **NÃO em formato CSV tabular simples**.
   - **Tratamento no Sistema:** O sistema opera com importador estruturado CSV/TSV validado, com seleção explícita de competência, pré-visualização linha a linha, preservação de zeros à esquerda nos códigos de 10 dígitos (padrão SUS `XX.XX.XX.XXX-X`), validação decimal e idempotência transacional por lote.

2. **Manual Técnico Operacional SIH — Janeiro/2017 (DATASUS):**
   - **URL Oficial:** `ftp://ftp2.datasus.gov.br/public/sistemas/dsweb/SIHD/Manuais/MANUAL_SIH_janeiro_2017.pdf`
   - **Versão:** Janeiro/2017.
   - **Critério de Aplicação na v0.0.28:**
     - Apresentação em até 3 competências e alta em até 6 meses sinalizam **advertência para revisão humana preventiva**, sem travar a tramitação da conta hospitalar municipal;
     - Diagnóstico de causas externas e acidentes só é checado quando explicitamente preenchido pelo profissional nos campos do atendimento.

3. **Manual de Operacionalização nos Sistemas de Informação: Componente Créditos Financeiros (MS/gov.br, 2025):**
   - **URL Oficial:** `https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/guias-e-manuais/2025/manual-operacionalizacao-nos-sistemas-de-informacao-creditos-financeiros.pdf`
   - **Versão:** 2025.
   - **Regras Utilizadas:**
     - Estrutura de AIH (inicial, continuidade e longa permanência);
     - Decomposição e apropriação dos valores de Serviços Hospitalares (SH) e Serviços Profissionais (SP);
     - Conformidade com a Tabela Unificada de Procedimentos, Medicamentos e OPM do SUS (SIGTAP).

4. **SIA/SUS — Sistema de Informações Ambulatoriais do SUS (DATASUS):**
   - **URL Oficial:** `http://sia.datasus.gov.br`
   - **Regras Utilizadas:**
     - Instrumento de registro BPA individualizado (BPA-I);
     - Detecção e sinalização administrativa de duplicidade de produção na mesma competência (mesmo atendimento assistencial + mesmo procedimento SIGTAP + mesma competência), sem interrupção arbitrária do faturamento.

5. **SIA/SUS — Sistema de Informações Ambulatoriais do SUS (DATASUS):**
   - **URL Oficial:** `http://sia.datasus.gov.br`
   - **Regras Utilizadas:**
     - Instrumento de registro BPA individualizado (BPA-I);
     - Detecção e sinalização administrativa de duplicidade de produção na mesma competência (mesmo atendimento assistencial + mesmo procedimento SIGTAP + mesma competência), sem interrupção arbitrária do faturamento.

---

## 5. Backlog Técnico para Futura Exportação Validável (Layouts DATASUS)

A implementação de exportação oficial em lote do faturamento SUS permanece como pendência regulatória no backlog técnico (sem homologação atual):

1. **Geração de Arquivo Posicional AIH (Layout SISPROHO / DATASUS):**
   - Layout posicional binário/texto com campos de 70 posições da AIH inicial (tipo 1) e AIH de continuidade (tipo 5);
   - Cálculo de dígito verificador do número de AIH nacional com base na faixa fornecida pela Secretaria Estadual de Saúde (SES);
   - Registro tipo 01 (Identificação do estabelecimento), tipo 02 (Dados do paciente e internação) e tipo 03 (Procedimentos realizados e equipes cirúrgicas).
   - _Nota de Limite:_ Não construir rotina de exportação federal sem layout posicional formalmente homologado.

2. **Conversor do Layout Posicional Oficial SIGTAP Desktop (.txt):**
   - O DATASUS disponibiliza os arquivos mensais em layout posicional tabular (`tb_procedimento.txt`, `tb_registro.txt`, `tb_descricao.txt`, etc.);
   - Backlog técnico: construção de parser/conversor para importar diretamente os arquivos descompactados do SIGTAP Desktop sem necessidade de pré-conversão para CSV.

3. **Geração de Arquivo Magnético BPA (BPA-C e BPA-I):**
   - Formato posicional padronizado pelo SIA/SUS com cabeçalho de remessa (registro tipo 01), linhas individualizadas (registro tipo 02) com CNS do paciente, CNS/CBO do profissional executante, código CNES da unidade de atendimento e totalizadores da remessa.

4. **Homologação e Validação Pré-Transmissão:**
   - Ambiente de homologação contra os programas executáveis do Ministério da Saúde: **Validador SIHD** (Sistema de Internação Hospitalar Descentralizado) e **BPA Magnético Desktop**;
   - Trilha de auditoria das glosas de remessa e conciliação de relatórios de rejeição federal (.REJ e .REL).

---

## 6. Pesquisa de Demonstrações Públicas Oficiais (G-HOSP/TWI e Hipótese Salute)

Conforme determinação do Codex, realizou-se busca curta por materiais institucionais públicos oficiais acessíveis em modo texto:

### 4.1. G-HOSP (TWI Consultoria)

- **URL Oficial:** https://www.twiconsultoria.com.br/sistemas/g-hosp
- **Identificação e Escopo Público do Produto:**
  - Sistema hospitalar com módulos voltados à gestão clínica e administrativa: Gestão de Atendimento, Faturamento TISS/SUS, PEP (Prontuário Eletrônico do Paciente), Controle de Leitos, Farmácia, Estoque e Faturamento Hospitalar.
  - O site institucional apresenta fichas técnicas, lista de funcionalidades e formulário de agendamento de demonstração comercial.
- **Lacuna de Demonstração Interativa:** Não há ambiente de demonstração interativo aberto ou vídeo oficial disponível sem autenticação/contato prévio. Demonstrações requerem agendamento direto com a equipe técnica da TWI.
- **Decisão:** Nenhum módulo novo foi criado; características de rastreamento de leitos e faturamento SUS servem apenas como referência conceitual já refletida no escopo existente.

### 4.2. Produto "Salute" (Hipótese de Pesquisa)

- **Status do Projeto:** Conforme nota do projeto, **"Salute = Salutem" é apenas HIPÓTESE não confirmada pelo usuário**.
- **URL Oficial Identificada (Sofis Tecnologia):** https://sofis.com.br/solucao/salute/
  - O produto _Salute_ da Sofis é descrito como solução para gestão de saúde pública (regulação ambulatorial, agendamentos, atenção básica, gestão de frotas e ouvidoria do SUS).
- **Lacuna de Demonstração Interativa:** O portal institucional traz descrição em texto e arquitetura do software, porém exige cadastro prévio para acesso a vídeos e demonstrações ao vivo. Não há evidência que confirme equivalência com "Salutem".
- **Decisão:** Mantida estritamente como hipótese arquivada no backlog para direcionamento do Codex, sem gasto de pesquisa adicional e sem implementação de módulos novos.

---

## 7. Lacunas de Homologação e Conformidade Regulatória (Não Implementadas e Não Alegadas)

O sistema atual atende como protótipo operacional municipal robusto, mas possui lacunas formais mandatórias que impedem sua implantação em ambiente hospitalar de produção real:

1. **Assinatura Digital ICP-Brasil (Padrão CFM / ICP-Brasil):**
   - Não há suporte a certificado digital A1/A3 nem assinatura qualificada conforme Resolução CFM nº 1.821/2007 e MP 2.200-2/2001. Os impressos gerados contêm apenas cabeçalho com identificação do emissor.
2. **Exportação DATASUS em Lote (BPA Magnético e AIH SISPROHO):**
   - Os registros de faturamento SUS (AIH e BPA) estão estruturados na interface e no banco, mas os geradores de arquivos binários/posicionais nos layouts oficiais do DATASUS (BPA Magnético, BPA-I, SISPROHO) não foram implementados.
3. **Integração Externa com SINAN e e-SUS APS:**
   - As notificações de vigilância em saúde e atendimentos ambulatoriais não realizam envio externo automatizado para os servidores do Ministério da Saúde / DATASUS (integrações mantidas apenas como telas de parâmetros e visualização interna).
4. **Controle de Termolábeis e Cadeia de Frio:**
   - Ausência de telemetria ou registro obrigatório contínuo de temperatura em refrigeradores da farmácia.
5. **Rastreabilidade de Medicamentos Controlados (Portaria SVS/MS nº 344/98 e SNGPC):**
   - O sistema registra lote e validade, mas não emite relatórios trimestrais/anuais nos padrões formais exigidos pela ANVISA para medicamentos sujeitos a controle especial.
6. **Módulo de Vacinas/Imunização:**
   - Inteiramente excluído do escopo hospitalar por diretriz da gestão municipal (permanecendo na atenção básica/UBS).

---

## 9. Identificação e Busca Segura de Pacientes (Especificações Oficiais e Limites)

Em conformidade com a Missão do Codex (v0.0.33), foram estabelecidas as regras oficiais de identificação cadastral, privacidade e prevenção de duplicidade:

### 9.1. URLs e Especificações Oficiais Adotadas

1. **Validação Oficial de CPF (Módulo 11 da Receita Federal):**
   - **Documento / Portaria ANS:** Sistema de Informações de Beneficiários (SIB-XML / Algoritmos Oficiais de Validação).
   - **URL Oficial:** `https://www.gov.br/ans/pt-br/arquivos/assuntos/espaco-da-operadora-de-plano-de-saude/aplicativos-ans/sib/sibalgoritmosxml1002072026.pdf`
   - **Algoritmo:** Módulo 11 com pesos decrescentes de 10 a 2 para o 1º DV e 11 a 2 para o 2º DV. Rejeição de sequências com 11 dígitos repetidos. Preservação estrita de zeros à esquerda (armazenamento e manipulação em string com 11 posições).

2. **Validação Oficial de Cartão Nacional de Saúde (CNS - 15 dígitos):**
   - **Manual do e-SUS Atenção Básica (Ministério da Saúde / DATASUS / UFSC):**
   - **URL Oficial:** `https://integracao.esusab.ufsc.br/v211/docs/algoritmo_CNS.html`
   - **Algoritmo Definitivo (Início 1 ou 2):** Base PIS/PASEP com pesos de 15 a 5 (11 dígitos). Cálculo de resto e tratamento de DVs com complementos 000 ou 001.
   - **Algoritmo Provisório (Início 7, 8 ou 9):** Soma ponderada com pesos de 15 a 1. Validação por resto da divisão por 11 igual a 0.
   - **Ausência Permitida de Documentos:** Não se rejeita ausência de CPF/CNS para Recém-Nascidos (RN) e casos de urgência/emergência sem identificador no acolhimento inicial; proibida a invenção de documentos fictícios.

3. **Privacidade e LGPD:**
   - Mascaramento mandatório de CPF (`123.***.***-01`) e Cartão SUS (`704.****.****.080`) em todas as listagens de busca, seletores rápidos e tabelas gerais.
   - Exibição desmascarada restrita ao prontuário detalhado individualizado.

4. **Tratamento de Homônimos e Suspeita Clínica:**
   - **Homônimos por Nome:** Análise de desambiguação por Data de Nascimento e Nome da Mãe. Gera **apenas alerta visual humano**. É **terminantemente proibida** a mesclagem ou fusão automática de cadastros históricos.

### 9.2. Arquitetura Estrutural no Backend e Prevenção de Duplicidades

A garantia de unicidade cadastral e prevenção contra duplicidades e concorrência repousa em uma combinação de barreiras no nível de banco de dados e servidor:

1. **Índices Únicos Parciais no Banco de Dados (Migração 0020):**
   - A migração `0020_unicidade_pacientes_cpf_cns.js` criou índices únicos condicionais no SQLite do PocketBase:
     - `idx_pacientes_cpf_unique`: `CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_cpf_unique ON pacientes (cpf) WHERE cpf IS NOT NULL AND cpf != ''`
     - `idx_pacientes_cartao_sus_unique`: `CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_cartao_sus_unique ON pacientes (cartao_sus) WHERE cartao_sus IS NOT NULL AND cartao_sus != ''`
   - **Garantia Estrutural:** O banco recusa fisicamente qualquer inserção ou atualização concorrente que repita um CPF ou CNS não vazio já existente, funcionando como prova estrutural rígida e definitiva no motor de persistência.
2. **CNS Opcional e Flexibilidade para Casos de Urgência e RN (Migração 0021):**
   - A migração `0021_tornar_cartao_sus_opcional.js` desativou a obrigatoriedade estrita do campo `cartao_sus` na coleção `pacientes`, permitindo o cadastro legítimo de recém-nascidos sem documento e pacientes não identificados em acolhimento emergencial, sem violação dos índices únicos parciais (já que valores nulos/vazios não colidem).
3. **Normalização e Saneamento de Documentos Pré-Existentes (Migração 0022):**
   - A migração `0022_normalizar_dados_documentos.js` efetuou saneamento retrospectivo em toda a base de pacientes:
     - Stripping de caracteres de pontuação e formatação (`.`, `-`, `/`, espaços);
     - Preservação rigorosa de zeros à esquerda (recomposição de strings numéricas de 11 dígitos para CPF e 15 dígitos para CNS);
     - Tratamento seguro de eventuais duplicidades legadas (anexando sufixo de anotação de revisão cadastral `_DUPLICADO_<id>` para viabilizar a criação dos índices sem perda de registros históricos).
4. **Reforço do Hook Server-Side (`pocketbase/hooks/pacientes_identificacao.pb.js`):**
   - Intercepta **criação e atualização** (`onRecordBeforeCreateRequest` e `onRecordBeforeUpdateRequest` na coleção `pacientes`).
   - Normaliza os documentos antes do commit (apenas dígitos numéricos, preservando zeros à esquerda como string).
   - Valida matematicamente os DVs oficiais de CPF e CNS, rejeitando strings inválidas com erro 400 antes da consulta ao banco.
   - Executa verificação prévia de duplicidade com mensagem explicativa ao usuário, antes do disparo da restrição do índice único.

### 9.3. Busca Minimizada no Servidor (Privacidade LGPD por Design)

Para atender ao princípio da minimização de dados da LGPD (Art. 6º, III da Lei 13.709/2018):

1. **Endpoint Minimizador Dedicado (`pocketbase/hooks/pacientes_busca.pb.js`):**
   - Rota `GET /api/custom/pacientes/buscar` aberta a usuários autenticados.
   - O servidor consulta a base e projeta um payload que **já nasce mascarado** (`cpf: "012.***.***-90"`, `cartao_sus: "704.****.****.080"`). Documentos de 11 ou 15 dígitos completos **jamais trafegam pela rede** durante a digitação de buscas ou uso de seletores rápidos.
   - Retorna metadados de paginação estruturada (`items`, `page`, `perPage`, `totalItems`, `totalPages`).
2. **Escape e Proteção Contra Injeção em Filtros PocketBase:**
   - A função `escaparFiltroPocketBase` neutraliza aspas duplas (`"`), aspas simples (`'`), barras invertidas (`\`) e quebras de linha (`\r`, `\n`), impedindo que termos com pontuações especiais quebrem a cláusula do PocketBase (`nome ~ "..."`).
3. **Resiliência a Race Conditions de Digitação na UI:**
   - O serviço de busca do cliente (`src/services/cadastros.ts` e componentes `PacientesView`, `SeletorPaciente`) implementa controle sequencial de requisições: respostas assíncronas atrasadas de termos parciais antigos são descartadas e não sobrepõem o resultado da digitação mais recente.

### 9.4. Limites Honestos e Precisão das Evidências

- **PAC-7 como Simulação Local vs Prova Estrutural no Backend:**
  - O cenário **PAC-7 do harness de testes é uma SIMULAÇÃO local em memória**, exercitando a lógica de bloqueio de concorrência com rejeição determinística da segunda chamada.
  - **Limitação Técnica Precisa:** Este harness local **NÃO constitui prova de concorrência em ambiente distribuído real** (a qual exigiria infraestrutura multi-thread efêmera isolada com teste de carga concorrente sob race conditions reais de rede/SO, recurso indisponível no ambiente de build).
  - **A Prova Estrutural Real** de concorrência reside nos **índices únicos parciais do banco SQLite/PocketBase (Migração 0020)** e na barreira de transação do hook (`pacientes_identificacao.pb.js`), aplicados diretamente na base de dados.
- **Validação Visual Humana Pendente:**
  - A formatação de chips de homônimos, alertas de advertência em amarelo e responsividade dos seletores rápidos de pacientes dependem de homologação e inspeção visual humana direta na interface gráfica pelo operador municipal.
- **Validação com Base Federal ao Vivo:**
  - A validação de CPF e CNS é puramente algorítmica local baseada nas regras matemáticas e módulos oficiais do Ministério da Saúde e Receita Federal. O sistema não acessa nem alega integração online com as bases governamentais federais (CADSUS / Receita Federal).

---

## 10. Fluxo Clínico Prescrição -> Checagem/Administração -> SAME (v0.0.37 e v0.0.38)

Conforme a Missão do Codex, a cadeia assistencial de prescrição médica, administração ao leito pela enfermagem e consolidação no prontuário SAME foi reforçada tanto no backend (servidor) quanto na camada cliente e no harness de validação lógica.

### 10.1. Camada do Servidor (Proteções Estruturais e Autoritativas)

O servidor atua como fonte da verdade clínica incontornável através da migração `0023_integridade_prescricao_administracao.js` e do hook `pocketbase/hooks/prescricoes_administracao.pb.js`:

1. **Vínculo Clínico Consistente e Inviolável:**
   - O servidor verifica a existência e o vínculo da prescrição informada. Paciente, internação e atendimento de PA são sincronizados autoritativamente a partir do registro da prescrição no banco, impedindo que requisições manipuladas no navegador vinculem medicação a prontuário divergente.
   - Quando informado `prescricao_item`, o servidor valida se o item pertence à prescrição indicada e sincroniza o nome exato do medicamento prescrito.
2. **Bloqueio de Prescrições e Itens Inativos:**
   - Prescrições com status `suspensa` ou `concluida` recusam sumariamente novas administrações com erro impeditivo no servidor.
   - Itens de prescrição com status `suspenso` ou `concluido` igualmente bloqueiam nova administração.
3. **Idempotência Server-Side com Isolamento de Sessão:**
   - O campo `idempotency_key` (indexado por `idx_adm_idempotency`) detecta reenvios imediatos. Caso a mesma chave já exista, o hook dispara retorno `IDEMPOTENT_HIT:<id>`, permitindo à camada cliente recuperar o registro original sem duplicidade.
   - **Isolamento de Usuário:** Se a chave informada pertencer a outro `usuario_id`, o servidor emite erro 403 (`ForbiddenError: Acesso negado`).
   - **Conflito de Payload:** Se a mesma chave for enviada com divergência de paciente, prescrição ou medicamento, o servidor emite erro impeditivo (`IDEMPOTENCY_PAYLOAD_CONFLICT`).
4. **Imutabilidade Histórica e Retificação Rastreável:**
   - A migração 0023 travou `deleteRule = null` e `updateRule = null` na coleção `administracao_medicamentos`. Nenhum usuário ou interface pode excluir ou reescrever diretamente atos de administração passados.
   - Correções são obrigatoriamente novos registros (`tipo_registro = 'retificacao'`) que referenciam o ato original (`registro_original`), exigindo justificativa/motivo formal com no mínimo 5 caracteres e registrando trilha de auditoria específica.

### 10.2. Camada Cliente Resiliente (UI e Serviços)

O serviço `src/services/prescricoes.ts` e os componentes de interface (`PrescricaoEnfermagemTab.tsx`, `SecaoPrescricaoPAMedica.tsx`, `ProntuarioSAMEView.tsx`) implementam resiliência operacional:

1. **Chaves de Idempotência Persistentes:**
   - Chave gerada na abertura do modal/operação e preservada durante tentativas de envio. O cliente captura o sinal `IDEMPOTENT_HIT` do servidor e resolve com o registro gravado sem exibir falso erro.
   - **Recuperação de Queda de Conexão pós-Gravação:** Se o navegador sofrer corte de rede (`status === 0`, `Failed to fetch`) após o backend ter gravado o registro, a camada cliente consulta a base pela `idempotency_key` antes de acusar falha, evitando dupla checagem por falso negativo de rede.
2. **Prevenção de Race Conditions na Troca de Paciente:**
   - Utilização de tokens de sequência (`seqPacienteRef`, `seqAtendimentoRef`, `seqPacienteSAMERef`). Caso o operador troque de paciente enquanto uma requisição de checagem ou busca assíncrona estiver em voo, a resposta que chega com sequência defasada é sumariamente descartada, impedindo contaminação da tela do paciente ativo.
3. **Preservação de Dados da Enfermagem em Conflito:**
   - Botões de checagem e retificação ficam bloqueados com spinner visual durante o processamento (`salvandoChecagem`, `salvandoRetificacao`).
   - Em caso de conflito ou rejeição, o modal permanece aberto preservando intacto o texto digitado e as justificativas para reavaliação do profissional sem retrabalho de digitação.

### 10.3. Limites Críticos de Homologação: Simulação Lógica vs Concorrência Real e Visual

Em conformidade rigorosa com a missão do Codex:

1. **Simulação Lógica no Harness vs Concorrência Real Distribuída:**
   - Os cenários `(ADM-1)`, `(ADM-2)`, `(ADM-3)` e `(ADM-4)` executados no harness local (`src/tests/harnessTestes.ts`) utilizam as **funções reais** do serviço de prescrição (`registrarAdministracaoMedicamento` e `retificarAdministracaoMedicamento`) com fixtures sintéticas em memória.
   - **DECLARAÇÃO DE LIMITE TÉCNICO:** **A simulação lógica local NÃO comprova concorrência real contra uma instância do PocketBase em rede distribuída** (onde múltiplos nós ou conexões simultâneas disputam locks de banco de dados, transações SQLite e latência de rede). A proteção contra concorrência real no backend repousa nas restrições transacionais do motor do PocketBase e nas regras de unicidade e integridade dos hooks server-side.
2. **Validação Visual Humana Pendente:**
   - O comportamento visual dos botões travados em voo, toasts informativos de conflito, formatação de badges de retificação (âmbar) e renderização na linha do tempo do SAME dependem de **validação e inspeção visual humana direta** na interface gráfica pelo operador assistencial.

---

## 11. Bloco Exames & Laudos (v0.0.40): Diagnóstico, Evidências e Limites Precisos

Na consolidação das Partes 1 e 2 do módulo "Exames & Laudos", o sistema tratou os 7 problemas críticos de integridade identificados na investigação da camada de exames:

### 11.1. Os 7 Problemas Encontrados na Investigação e Soluções Implementadas

1. **Sobrescrita Silenciosa de Laudos Finalizados:**
   - _Problema:_ Um laudo emitido podia ser reescrito livremente por novos updates, destruindo a comprovação diagnóstica anterior sem histórico.
   - _Solução:_ Migração `0024` criou a coleção imutável `laudos_versoes` (`deleteRule = null`, `updateRule = null`). O hook `pocketbase/hooks/exames_laudos.pb.js` bloqueia update direto em exame liberado com `LAUDO_JA_LIBERADO_IMUTAVEL`. Modificações agora exigem a rotina formal de retificação.
2. **Ausência de Trilha de Retificação:**
   - _Problema:_ Não havia como auditar quem alterou um laudo, quando e por qual razão médica.
   - _Solução:_ Toda retificação exige justificativa/motivo formal com no mínimo 5 caracteres, registrando profissional responsável da sessão ativa, carimbo de data/hora e referência à versão anterior, mantendo a versão 1 intacta.
3. **Vínculo Frágil Paciente vs Atendimento/Internação:**
   - _Problema:_ Requisições manipuladas podiam solicitar exame para um paciente referenciando uma internação ou atendimento de outro paciente.
   - _Solução:_ O hook no servidor valida a cadeia paciente-atendimento e paciente-internação antes de persistir, rejeitando qualquer divergência com `CADEIA_PACIENTE_DIVERGENTE`.
4. **Recepção/Perfis Inadequados Alterando Laudo:**
   - _Problema:_ Falta de isolamento impedia barreira firme entre recepção/enfermagem e laudo médico.
   - _Solução:_ O hook no servidor exige perfil com prerrogativa médica/patológica para emissão de laudo e retificação. O autor do laudo é extraído autoritativamente da sessão do token autenticado (`authRecord`), não do payload da tela.
5. **Solicitações Canceladas Continuando no Fluxo:**
   - _Problema:_ Exames cancelados podiam receber coleta ou até laudo posteriormente.
   - _Solução:_ O servidor e a UI bloqueiam sumariamente transições sobre exames cancelados (`EXAME_CANCELADO_IMUTAVEL`).
6. **Perda de Dados Digitados em Falha de Idempotência ou Conflito:**
   - _Problema:_ Caso ocorresse timeout ou colisão de envio, o formulário de laudo resetava apagando laudos extensos redigidos pelo profissional.
   - _Solução:_ A camada de UI mantém os modais abertos e preserva integralmente o texto do laudo e a justificativa no estado local, permitindo reenvio sem perda do trabalho técnico.
7. **Exposição de Dados Pessoais em Listas Públicas:**
   - _Problema:_ CPF e Cartão SUS trafegavam desprotegidos em tabelas gerais de exames.
   - _Solução:_ Implementado mascaramento mandatório (`mascararDadosPacienteExame`, `mascararCPF`, `mascararCNS`) em todas as listagens operacionais da fila de exames.

### 11.2. Integração no SAME e no Impresso A4 Oficial

- **Prontuário SAME (`ProntuarioSAMEView.tsx` e `prontuarioSAME.ts`):** A linha do tempo clínica unificada exibe o laudo com destaque explícito para a **Versão Vigente** (ex: `v2 Retificado`), acompanhada de um bloco expansível com o histórico imutável de todas as versões anteriores (data, autor, cargo e motivo da correção).
- **Impresso A4 Oficial (`FolhaImpressoA4.tsx`):** O documento impresso oficial de laudo diagnóstico inclui quadro detalhado de histórico de retificações quando o exame possui mais de uma versão, demarcando sem ambiguidade qual é a versão vigente e quais foram arquivadas.

### 11.3. Limites Precisos de Homologação (Avisos Regulatórios Obrigatórios)

1. **Simulação Local de Funções Reais vs Concorrência Real:**
   - Os cenários `EXA-1` a `EXA-8` presentes no harness `src/tests/harnessTestes.ts` são uma **simulação local em memória** que importa e executa as **funções reais** do serviço de exames (`solicitarExame`, `emitirLaudoExame`, `retificarLaudoExame`, `registrarColetaExame`, etc.).
   - **DECLARAÇÃO DE LIMITE:** **A aprovação no harness local NÃO constitui prova de concorrência em ambiente distribuído ou multi-conexão real**. Múltiplas conexões concorrentes a uma instância PocketBase real já seriam úteis e suficientes para aferir locks e concorrência no SQLite sem demandar clusters complexos. Como uma instância local dedicada e isolada para teste sob carga concorrente não está disponível no ciclo de build estático, a pendência permanece em aberto e o sistema **recusa expressamente** simular isso como prova definitiva.
2. **Validação Visual Humana Pendente:**
   - A ergonomia da tela `ExamesLaudosView`, o travamento de botões durante o envio (`processandoAcao`), a legibilidade do modal de retificação, a formatação das badges de histórico no SAME e a quebra de página da folha impressa A4 **dependem de validação e inspeção visual humana direta**.
   - **NÃO DECLARAR HOMOLOGAÇÃO:** O sistema é um protótipo avançado e não possui homologação hospitalar declarada.
3. **Escopo Clínico Estrito:**
   - O sistema **não implementa e não contém**: interpretação clínica automatizada de exames, sugestão de valores de referência para diagnóstico, decisão médica automatizada, assinatura digital ICP-Brasil com carimbo de tempo ou integração bidirecional via protocolo laboratorial HL7/LIS.

---

## 12. Painel de Gestão Hospitalar em Tempo Real (v0.0.43): Evidências e Limites Precisos

Na consolidação da versão 0.0.43 (resolução da contradição apontada pelo Codex sobre agregação no servidor versus fallback paginado), foram implementadas as correções estritas de segurança, privacidade e integridade:

### 12.1. Evidências de Arquitetura e Regras Implementadas (v0.0.43)

1. **Agregação Exclusiva no Servidor com Remoção Total de Fallback Clínico no Cliente (`src/services/painelGestao.ts`):**
   - A função `carregarDadosPainelGestao` consulta única e exclusivamente a rota agregada `GET /backend/v1/painel/indicadores`.
   - **Eliminação de Contorno de Acesso e Risco LGPD:** O fallback anterior que baixava centenas/milhares de registros das coleções clínicas (`pronto_atendimento`, `leitos`, `setores`, `internacoes`, `exames`, `prescricoes`, `farmacia_dispensacoes`, `administracao_medicamentos`, `contas_faturamento`, `producao_bpa`, `cirurgias` e `regulacao_solicitacoes`) foi **completamente removido**.
   - Em caso de falha HTTP (404, 403, 500), queda de rede ou timeout, a função lança erro imediato: **zero chamadas a coleções clínicas no cliente são realizadas no caminho de falha**.
2. **Preservação de Último Resultado com Aviso de Estado Desatualizado ou Exibição de Indisponível:**
   - Se o painel já possui dados autorizados prévios obtidos na sessão corrente, a falha preserva esses dados íntegros e renderiza um banner âmbar com a etiqueta **"Estado Desatualizado"** e o timestamp da última fotografia válida (`dados.dataHoraAtualizacao`), sem apagar os dados nem exibir falso sucesso.
   - Se a requisição falha logo na carga inicial ou não há resultado prévio válido em cache, a tela exibe o estado explícito **"Painel temporariamente indisponível"** e banner de aviso indicando indisponibilidade sem dados prévios, sem jamais tentar contornar baixando dados clínicos brutos.
3. **Limpeza de Cache e Descarte de Resposta em Voo na Troca de Usuário/Perfil (`PainelGestaoView.tsx`):**
   - Ao trocar de usuário ou perfil de acesso (detectado por `idSessaoAtual = user.id:user.role`), o estado de dados do painel é **imediatamente limpo (`setDados(null)`)**, impedindo qualquer vazamento visual de indicadores da sessão anterior (especialmente os números de faturamento SUS restritos a admin/gestor).
   - O controle de sequência assíncrona (`sequenciaCarregamentoRef` e `sessaoAtivaRef`) invalida sumariamente qualquer resposta que chegue com atraso disparada pela sessão anterior (se `sessaoDesteDisparo !== sessaoAtivaRef.current`, o payload é descartado sem ser aplicado ao estado).
4. **Distinção Rígida entre Resultado Vazio e Falha/Erro:**
   - Resposta do servidor com 0 registros ou valores zerados (ex: dia sem atendimentos ou setor sem internações) é renderizada normalmente como dados vazios legítimos, com contagens numéricas 0 e médias como `indisponível` (`null`), e **NÃO** como erro de conexão.
   - Erro (falha 403, 404, 500, timeout) é capturado e tratado como exceção explícita de comunicação, sem ser mascarado como conjunto vazio.
5. **Cenários de Testes Automatizados no Harness (`src/tests/harnessTestes.ts`):**
   - `PAINEL-1`: Contagens somam todas as páginas até esgotar o conjunto sem truncar no limite padrão.
   - `PAINEL-2`: Registros sem data aparecem como indisponíveis, fora da média e nunca zero inventado.
   - `PAINEL-3`: Payload agregado é estritamente numérico/estatístico, sem CPF, CNS, nomes de pacientes ou descrições clínicas.
   - `PAINEL-4`: Resiliência contra erro parcial preserva dados anteriores válidos e sinaliza estado desatualizado sem falso sucesso.
   - `PAINEL-5`: Fronteira de dia local no fuso America/Porto_Velho (UTC-4) calcula dia civil correto (02:30Z = dia anterior local).
   - `PAINEL-6`: Vazio real (zero registros) não é tratado como erro, e erro real não é tratado como conjunto vazio.
   - `PAINEL-7`: Resposta fora de ordem de filtro antigo é descartada por controle de sequência.
   - `PAINEL-8 (NOVO v0.0.43)`: Falha/404/403/Timeout do endpoint agregado gera erro na função real `carregarDadosPainelGestao` e executa **zero chamadas** às coleções clínicas no cliente.
   - `PAINEL-9 (NOVO v0.0.43)`: Troca de sessão/perfil limpa dados anteriores do painel (sobretudo financeiro) e descarta requisição em voo da sessão anterior.

### 12.2. Limites Honestos e Precisão das Evidências (Avisos Mandatórios)

1. **Simulação Local no Harness vs Concorrência Real contra PocketBase:**
   - Os cenários `PAINEL-1` a `PAINEL-9` executados no harness local (`src/tests/harnessTestes.ts`) comprovam a lógica determinística das funções reais de cálculo de médias, fronteira de fuso civil, distinção entre vazio e erro, ausência de chamadas a coleções clínicas no caminho de falha e descarte assíncrono por sequência e sessão.
   - **DECLARAÇÃO DE LIMITE TÉCNICO:** **A simulação local em memória NÃO constitui prova de concorrência real sob carga contra o banco PocketBase**. A concorrência em produção depende de concorrência de conexões HTTP, transações SQLite e latência de rede reais sob múltiplos operadores simultâneos, recursos não executáveis no ambiente de build estático.
2. **Validação Visual Humana Permanece Pendente:**
   - A disposição dos grids responsivos, legibilidade dos cards em telas menores, alternância dos seletores de período, visualização dos alertas Manchester no PA e renderização dos banners de erro dependem de **inspeção e validação visual humana direta**.
3. **Sem Homologação Declarada:**
   - O painel opera como componente de monitoramento operacional interno e **não possui homologação externa hospitalar declarada**.
4. **Exclusões Rígidas de Escopo Mantidas:**
   - Permanece rigorosamente respeitada a exclusão do módulo de Sala de Situação (itens 430-452 do guia de conformidade), georreferenciamento de vigilância (item 331), módulo de vacinas/imunização e qualquer envio ou integração telemática externa não homologada.

---

## 8. Backlog Priorizado para Próximas Fases

| Prioridade | Item / Demanda                                          | Descrição Técnica                                                                                                             | Pré-requisito           |
| :--------: | :------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------- | :---------------------- |
|   **P1**   | Motor de Exportação em Lote DATASUS                     | Implementar gerador de arquivos no formato oficial do SUS para exportação de AIH e BPA apurados na competência.               | Faturamento SUS v0.0.12 |
|   **P2**   | Integração com Certificação ICP-Brasil                  | Integração com biblioteca de assinatura em nuvem / PKI para laudos de exames e impressos médicos.                             | Resolução CFM 1.821     |
|   **P3**   | Rastreabilidade Bidirecional Farmácia-SAME              | Vincular automaticamente o código de barras/lote lido na dispensação diretamente à ficha anestésica e evolução de enfermagem. | Farmácia v0.0.20        |
|   **P4**   | Alertas Clínicos Automáticos de Interação Medicamentosa | Cruzar prescrições ativas com alergias registradas no cadastro do paciente para bloqueio preventivo.                          | Prescrições v0.0.8      |
|   **P5**   | Protocolo de Comunicação HL7 / FHIR                     | Criar endpoints ou adaptadores padronizados para interoperabilidade com sistemas laboratoriais externos.                      | Exames v0.0.10          |
|   **P6**   | Demos Públicas de Referência (G-HOSP & Salute)          | Monitoramento de releases públicas e manuais de conformidade de G-HOSP e Salute/Sofis se disponibilizados.                    | Homologação Externa     |
