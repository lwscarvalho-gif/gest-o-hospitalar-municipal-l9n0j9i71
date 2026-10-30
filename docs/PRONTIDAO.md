# Documento de Prontidão e Homologação Técnica

**Sistema:** Gestão Hospitalar Municipal  
**Stack:** React 19 + TypeScript + Tailwind CSS (Frontend) / Skip Cloud PocketBase v0.36 (Backend)  
**Versão Atual:** 0.0.27 (Conferência de Consistência do Faturamento SUS Municipal, AIH/SIH, BPA/SIA, SIGTAP por Competência e Backlog Técnico)  
**Data de Consolidação:** Outubro de 2026  
**Status Operacional:** **PROTÓTIPO AVANÇADO / AMBIENTE DE HOMOLOGAÇÃO CONTROLADA**  
\*(ATENÇÃO: Este sistema NÃO está autorizado nem pronto para assistência médica real em ambiente de produção sem a resolução integral das lacunas normativas e regulatórias listadas abaixo).\_

---

## 1. Evidências por Versão Entregue (v0.0.1 a v0.0.24)

| Versão     | Escopo / Módulo Entregue                                         | Evidência Comprovada                                                                                                                                                                  |
| :--------- | :--------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **0.0.1**  | Scaffold base e autenticação PocketBase                          | Login municipal com perfis (admin, gestor, profissional, recepcao), contexto AuthContext e token JWT.                                                                                 |
| **0.0.2**  | Cadastros Fundamentais                                           | CRUD de Setores hospitalares, Leitos com status (vago/ocupado/manutenção/higienização), Pacientes e Profissionais de Saúde.                                                           |
| **0.0.3**  | Agendamentos Ambulatoriais e Painel Inicial                      | Fila de consultas, status de agendamento (agendado, confirmado, atendido, cancelado) e métricas básicas de ocupação.                                                                  |
| **0.0.4**  | Internação e Mapa de Leitos                                      | Fluxo de admissão hospitalar, transferência de leitos entre setores, histórico de leitos e altas médicas.                                                                             |
| **0.0.5**  | Evolução Clínica e Prontuário Básico                             | Registro assistencial multiprofissional (médica, enfermagem), CID-10 e sinais vitais vinculados à internação.                                                                         |
| **0.0.6**  | Trilha de Auditoria Geral                                        | Coleção `auditoria` gravando eventos de login, logout e transações assistenciais com usuário, IP e timestamp.                                                                         |
| **0.0.7**  | Pronto Atendimento (PA)                                          | Acolhimento, classificação de risco Protocolo de Manchester (Vermelho, Laranja, Amarelo, Verde, Azul) e encaminhamentos.                                                              |
| **0.0.8**  | Prescrição Médica e Aprazamento de Enfermagem                    | Prescrição de itens farmacêuticos, horários e checagem de administração de medicamentos à beira-leito.                                                                                |
| **0.0.9**  | Farmácia Hospitalar e Dispensação                                | Catálogo de medicamentos/materiais, saldo atual/mínimo e baixa de dispensação por paciente ou remessa de setor.                                                                       |
| **0.0.10** | Exames Laboratoriais e Laudos                                    | Ciclo completo: solicitação médica, coleta de amostra, início de análise técnica e emissão de laudo estruturado.                                                                      |
| **0.0.11** | Centro Cirúrgico                                                 | Gestão de salas cirúrgicas, agendamento de cirurgias, checklist pré-operatório OMS/Safe Surgery, ato operatório e SRPA (escala de Aldrete-Kroulik).                                   |
| **0.0.12** | Faturamento SUS / SIGTAP                                         | Importação e consulta da tabela SIGTAP, contas hospitalares AIH (SH/SA/SP) e apuração de produção ambulatorial BPA.                                                                   |
| **0.0.13** | Impressos Assistenciais em Folha A4                              | Emissão formatada de Receituário simples/controlado, Atestado Médico e Resumo de Alta com opção de consentimento para CID-10 (LGPD/CFM).                                              |
| **0.0.14** | Vigilância em Saúde (Sem Georreferenciamento)                    | Notificação compulsória (imediata 24h e semanal), histórico de investigação epidemiológica e fila administrativa restrita sem mapas/geolocalização.                                   |
| **0.0.15** | Centro Obstétrico e Sala de Parto                                | Admissão obstétrica com risco, partograma simplificado, registro do parto, cadastro do RN com escala de Apgar e desfecho puerperal.                                                   |
| **0.0.16** | Central de Regulação Interna                                     | Solicitações de transferência leito a leito, triagem por médico regulador com fila administrativa sem dados de contato expostos à recepção.                                           |
| **0.0.17** | Segurança e Regras de RLS no Backend                             | Migração 0014 travando coleções clínicas para o perfil `recepcao`, restrição de dispensação e auditoria imutável (update/delete nulos).                                               |
| **0.0.18** | Painel de Gestão e Indicadores em Tempo Real                     | Painel executivo com tempos médios de espera PA, taxa de ocupação de leitos, cirurgias por sala e monitoramento operacional com PocketBase Realtime.                                  |
| **0.0.19** | SAME e Prontuário Unificado do Paciente                          | Linha do tempo integrada consolidando PA, internações, cirurgias, obstetrícia, exames, dispensações e impressos por CPF/CNS.                                                          |
| **0.0.20** | Inventário Farmacêutico, Integridade e Idempotência              | Snapshot de abertura de inventário, detecção de concorrência na contagem física, perdas por validade/avaria e proteção de idempotency_key contra retry duplicado.                     |
| **0.0.21** | Fechamento de Testes Sintéticos & Imutabilidade                  | Expurgo total de endpoints mutantes sintéticos; travamento estrito de delete/update em movimentações e auditoria.                                                                     |
| **0.0.22** | Regulação Administrativa e Relógio Fuso Inicial                  | Catálogo de recursos/destinos, filtros administrativos e cálculo individual de tempo de espera com pausas documentadas.                                                               |
| **0.0.23** | Consolidação de Relatórios e Auditoria de Acessos                | Refinamento de permissões e relatórios por competência sem alterações destrutivas.                                                                                                    |
| **0.0.24** | Consistência de Datas/Horários, Fuso IANA e Qualidade de Dados   | Parametrização por unidade (`America/Porto_Velho` para Mirante da Serra/RO [UTC-4]), dados sem data exibidos como 'indisponível' e fora das médias (sem zeros).                       |
| **0.0.27** | Conferência de Consistência Faturamento SUS (AIH / BPA / SIGTAP) | Validação administrativa prévia de contas AIH (campos, datas invertidas, alta >6 meses, causa externa), BPA (duplicidade), regras SIGTAP por competência e painel de conferência.     |
| **0.0.28** | Importador do Pacote SIGTAP Oficial Posicional (.zip)            | Extração segura em memória, parser guiado dinamicamente pelos arquivos `*_layout.txt` (sem posições fixas, imune à alteração pós-202506), ISO-8859-1, preservação de zeros e valores. |

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

| Invariante / Cenário                                | Função Real Testada                                | Resultado  | Detalhes da Execução Real                                                                                                                                |
| :-------------------------------------------------- | :------------------------------------------------- | :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) Mesma idempotency_key com payload diferente** | Processamento transacional com idempotência        | **PASSOU** | Operação inicial com 5 un gravada; segunda tentativa com 10 un rejeitada com erro de conflito (`IDEMPOTENCY_PAYLOAD_CONFLICT`) sem alterar o saldo.      |
| **(b) Chave gerada por outro usuário**              | Controle de isolamento de sessão                   | **PASSOU** | Usuário original consulta seu registro; usuário terceiro recebe erro 403 (`Acesso negado`) sem vazamento de dados.                                       |
| **(c) Duplicações simultâneas**                     | Idempotência atômica                               | **PASSOU** | Duas chamadas simultâneas geram uma única baixa de 20 un (saldo 100 -> 80); a segunda reutiliza a primeira.                                              |
| **(d) Falha parcial entre gravações**               | Transação com rollback                             | **PASSOU** | Falha simulada reverte o saldo para 30 un sem criar movimentações ou dispensações órfãs.                                                                 |
| **(e) Inventário com concorrência**                 | Fechamento condicional de inventário               | **PASSOU** | Saída concorrente durante a contagem detectada; fechamento rejeitado com `rejeitado_concorrencia` sem sobrescrever o saldo real.                         |
| **(f) Datas ausentes/corrompidas no relógio**       | `calcularTempoEsperaIndividual`                    | **PASSOU** | Com data `null` ou string corrompida, retorna `tempoFormatado = 'indisponível'`, `dataInvalidaOuAusente = true` e status `'indeterminado'`.              |
| **(g) Datas invertidas no relógio**                 | `calcularTempoEsperaIndividual`                    | **PASSOU** | Início às 15:00 e fim às 14:00 resulta em 0 minutos (`Math.max(0, ...)`), garantindo tempo sempre positivo sem corromper a tela.                         |
| **(h) Virada de dia contínua**                      | `calcularTempoEsperaIndividual`                    | **PASSOU** | Passagem de 15/10 23h50 para 16/10 00h10 computada em epoch absoluto: exatamente 20 minutos contínuos (`20 min`).                                        |
| **(i) Pausas e retomadas no relógio**               | `calcularTempoEsperaIndividual`                    | **PASSOU** | Período bruto de 90 min com pausa técnica de 30 min resulta exatamente em 60 min de espera líquida (`1h 0m`).                                            |
| **(j) Cancelamento congelado**                      | `calcularTempoEsperaIndividual`                    | **PASSOU** | Solicitação cancelada após 75 min congela o tempo em 1h 15m mesmo consultada 2 dias após.                                                                |
| **(k) Fuso IANA da unidade municipal**              | `formatarHoraFuso`, `obterFusoHorarioAtivo`        | **PASSOU** | Timestamp UTC `16:00Z` formatado como `12:00` no fuso de Mirante da Serra/RO (`America/Porto_Velho`, UTC-4) e `13:00` em São Paulo (UTC-3).              |
| **(l) Datas ausentes fora da média**                | `calcularMediaEstatisticaSegura`                   | **PASSOU** | Amostra `[10, null, 20, undefined, 30]` gera média estrita de 20 min (e NÃO 12 min falseados por zero). Amostra `[null, undefined]` retorna `null`.      |
| **(m) Limites de dia civil e competência**          | `extrairDataCivilFuso`, `dentroDoPeriodo`, filtros | **PASSOU** | `02:30Z` de 15/10 classificado no dia civil 14 em Porto Velho; `02:00Z` de 01/11 classificado na competência de outubro (`2026-10`) em Porto Velho (RO). |
| **(n) AIH com campos obrigatórios ausentes**        | `validarContaHospitalarAIH`                        | **PASSOU** | Conta sem paciente, datas, procedimento e CID rejeitada com 4+ erros e citações textuais ao Manual SIH/DATASUS 2017 e Manual Créditos Financeiros 2025.  |
| **(o) AIH com datas invertidas**                    | `validarContaHospitalarAIH`                        | **PASSOU** | Alta hospitalar cronologicamente anterior à internação bloqueada com citação à regra cronológica de período da AIH (Manual SIH).                         |
| **(p) AIH com alta > 6 meses da competência**       | `validarContaHospitalarAIH`                        | **PASSOU** | Alta com 8 meses de defasagem recebe advertência documental expressa do Manual SIH DATASUS 2017 (limite regulatório de 6 meses de apresentação).         |
| **(q) Procedimento inexistente no SIGTAP**          | `validarContaHospitalarAIH`                        | **PASSOU** | Código de procedimento não importado é rejeitado como inexistente na SIGTAP municipal sem inferência espúria de compatibilidade.                         |
| **(r) SIGTAP com competência não importada**        | `validarContaHospitalarAIH`                        | **PASSOU** | Competência sem importação SIGTAP sinaliza advertência de 'validar manualmente' em vez de gerar falso erro impeditivo.                                   |
| **(s) Duplicidade de produção BPA**                 | `validarItemProducaoBPA`                           | **PASSOU** | Mesmo atendimento + procedimento + competência gera sinalização de duplicidade para revisão administrativa sem interrupção de fluxo.                     |
| **(t) Não inferir causa externa de CID S/T**        | `validarContaHospitalarAIH`                        | **PASSOU** | CID S06.0 não infere causa externa espúria; declaração explícita de acidente gera aviso de "revisão humana" sem bloquear conta.                          |
| **(u) Painel agregador de conferência**             | `executarConferenciaConsistencia`                  | **PASSOU** | Consolida e totaliza inconsistências de AIH e BPA sem alterar status retrospectivo e sem marcar contas como enviadas.                                    |
| **(v) Catálogo parcial SIGTAP (recorte)**           | `validarContaHospitalarAIH`                        | **PASSOU** | Procedimento ausente em catálogo parcial emite aviso "tabela incompleta, validar manualmente", nunca erro impeditivo de inexistência.                    |
| **(w) Parser e pré-visualização SIGTAP CSV**        | `previsualizarSigtapCSV`                           | **PASSOU** | Restaura zeros à esquerda (03.01.06.008-8), valida decimais (SH/SA/SP) e rejeita duplicidades dentro do lote com relatório linha a linha.                |
| **(x) Regras Manual 2017 e competência explícita**  | `validarContaHospitalarAIH`, `previsualizarSigtap` | **PASSOU** | Regras normativas sem vigência confirmada 2026 viram aviso documental de revisão humana; competência explícita exigida e validada.                       |
| **(1) Linha truncada no posicional SIGTAP**         | `processarPacoteSigtapPosicional`                  | **PASSOU** | Linhas com tamanho inferior ao mínimo posicional do layout geram rejeição por linha com detalhe do tamanho.                                              |
| **(2) Encoding ISO-8859-1 acentuação correta**      | `processarPacoteSigtapPosicional`, `decodificar`   | **PASSOU** | Caracteres acentuados ("Cirúrgico", "Atenção") decodificados com exatidão pelo padrão oficial do Ministério da Saúde.                                    |
| **(3) Competência divergente entre pacote e UI**    | `processarPacoteSigtapPosicional`                  | **PASSOU** | Divergência entre a competência informada pelo usuário e a declarada em `DT_COMPETENCIA` bloqueia a gravação com relatório de divergência.               |
| **(4) Registros duplicados no mesmo pacote**        | `processarPacoteSigtapPosicional`                  | **PASSOU** | Duplicidades internas no mesmo pacote rejeitadas linha a linha apontando a ocorrência original anterior.                                                 |
| **(5) Zeros à esquerda preservados (códigos SUS)**  | `normalizarCodigoProcedimentoSigtap`, parser       | **PASSOU** | Zeros à esquerda preservados como String (ex: `0101010010` -> `01.01.01.001-0`) sem truncamento numérico.                                                |
| **(6) Valores conforme escala de layout dinâmico**  | `processarPacoteSigtapPosicional`, parser escala   | **PASSOU** | Valores monetários convertidos conforme a escala declarada no layout (centavos / 100), compatível com expansão de colunas pós-06/2025.                   |
| **(7) Prevenção Zip-Slip e limites de arquivo**     | `validarCaminhoSeguroZip`, `descompactarZipSeguro` | **PASSOU** | Bloqueio de caminhos maliciosos (`../`, barras absolutas) e rejeição de pacotes superiores ao limite de segurança (50 MB).                               |

---

## 4. Importador do Pacote Oficial SIGTAP Posicional (v0.0.28)

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

## 8. Backlog Priorizado para Próximas Fases

| Prioridade | Item / Demanda                                          | Descrição Técnica                                                                                                             | Pré-requisito           |
| :--------: | :------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------- | :---------------------- |
|   **P1**   | Motor de Exportação em Lote DATASUS                     | Implementar gerador de arquivos no formato oficial do SUS para exportação de AIH e BPA apurados na competência.               | Faturamento SUS v0.0.12 |
|   **P2**   | Integração com Certificação ICP-Brasil                  | Integração com biblioteca de assinatura em nuvem / PKI para laudos de exames e impressos médicos.                             | Resolução CFM 1.821     |
|   **P3**   | Rastreabilidade Bidirecional Farmácia-SAME              | Vincular automaticamente o código de barras/lote lido na dispensação diretamente à ficha anestésica e evolução de enfermagem. | Farmácia v0.0.20        |
|   **P4**   | Alertas Clínicos Automáticos de Interação Medicamentosa | Cruzar prescrições ativas com alergias registradas no cadastro do paciente para bloqueio preventivo.                          | Prescrições v0.0.8      |
|   **P5**   | Protocolo de Comunicação HL7 / FHIR                     | Criar endpoints ou adaptadores padronizados para interoperabilidade com sistemas laboratoriais externos.                      | Exames v0.0.10          |
|   **P6**   | Demos Públicas de Referência (G-HOSP & Salute)          | Monitoramento de releases públicas e manuais de conformidade de G-HOSP e Salute/Sofis se disponibilizados.                    | Homologação Externa     |
