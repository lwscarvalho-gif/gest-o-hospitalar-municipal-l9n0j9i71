# Documento de Prontidão e Homologação Técnica

**Sistema:** Gestão Hospitalar Municipal  
**Stack:** React 19 + TypeScript + Tailwind CSS (Frontend) / Skip Cloud PocketBase v0.36 (Backend)  
**Versão Atual:** 0.0.21 (pós-fechamento da superfície de testes sintéticos e imutabilidade de estoque)  
**Data de Consolidação:** Outubro de 2026  
**Status Operacional:** **PROTÓTIPO AVANÇADO / AMBIENTE DE HOMOLOGAÇÃO CONTROLADA**  
_(ATENÇÃO: Este sistema NÃO está autorizado nem pronto para assistência médica real em ambiente de produção sem a resolução integral das lacunas normativas e regulatórias listadas abaixo)._

---

## 1. Evidências por Versão Entregue (v0.0.1 a v0.0.20)

| Versão     | Escopo / Módulo Entregue                            | Evidência Comprovada                                                                                                                                              |
| :--------- | :-------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0.0.1**  | Scaffold base e autenticação PocketBase             | Login municipal com perfis (admin, gestor, profissional, recepcao), contexto AuthContext e token JWT.                                                             |
| **0.0.2**  | Cadastros Fundamentais                              | CRUD de Setores hospitalares, Leitos com status (vago/ocupado/manutenção/higienização), Pacientes e Profissionais de Saúde.                                       |
| **0.0.3**  | Agendamentos Ambulatoriais e Painel Inicial         | Fila de consultas, status de agendamento (agendado, confirmado, atendido, cancelado) e métricas básicas de ocupação.                                              |
| **0.0.4**  | Internação e Mapa de Leitos                         | Fluxo de admissão hospitalar, transferência de leitos entre setores, histórico de leitos e altas médicas.                                                         |
| **0.0.5**  | Evolução Clínica e Prontuário Básico                | Registro assistencial multiprofissional (médica, enfermagem), CID-10 e sinais vitais vinculados à internação.                                                     |
| **0.0.6**  | Trilha de Auditoria Geral                           | Coleção `auditoria` gravando eventos de login, logout e transações assistenciais com usuário, IP e timestamp.                                                     |
| **0.0.7**  | Pronto Atendimento (PA)                             | Acolhimento, classificação de risco Protocolo de Manchester (Vermelho, Laranja, Amarelo, Verde, Azul) e encaminhamentos.                                          |
| **0.0.8**  | Prescrição Médica e Aprazamento de Enfermagem       | Prescrição de itens farmacêuticos, horários e checagem de administração de medicamentos à beira-leito.                                                            |
| **0.0.9**  | Farmácia Hospitalar e Dispensação                   | Catálogo de medicamentos/materiais, saldo atual/mínimo e baixa de dispensação por paciente ou remessa de setor.                                                   |
| **0.0.10** | Exames Laboratoriais e Laudos                       | Ciclo completo: solicitação médica, coleta de amostra, início de análise técnica e emissão de laudo estruturado.                                                  |
| **0.0.11** | Centro Cirúrgico                                    | Gestão de salas cirúrgicas, agendamento de cirurgias, checklist pré-operatório OMS/Safe Surgery, ato operatório e SRPA (escala de Aldrete-Kroulik).               |
| **0.0.12** | Faturamento SUS / SIGTAP                            | Importação e consulta da tabela SIGTAP, contas hospitalares AIH (SH/SA/SP) e apuração de produção ambulatorial BPA.                                               |
| **0.0.13** | Impressos Assistenciais em Folha A4                 | Emissão formatada de Receituário simples/controlado, Atestado Médico e Resumo de Alta com opção de consentimento para CID-10 (LGPD/CFM).                          |
| **0.0.14** | Vigilância em Saúde (Sem Georreferenciamento)       | Notificação compulsória (imediata 24h e semanal), histórico de investigação epidemiológica e fila administrativa restrita sem mapas/geolocalização.               |
| **0.0.15** | Centro Obstétrico e Sala de Parto                   | Admissão obstétrica com risco, partograma simplificado, registro do parto, cadastro do RN com escala de Apgar e desfecho puerperal.                               |
| **0.0.16** | Central de Regulação Interna                        | Solicitações de transferência leito a leito, triagem por médico regulador com fila administrativa sem dados de contato expostos à recepção.                       |
| **0.0.17** | Segurança e Regras de RLS no Backend                | Migração 0014 travando coleções clínicas para o perfil `recepcao`, restrição de dispensação e auditoria imutável (update/delete nulos).                           |
| **0.0.18** | Painel de Gestão e Indicadores em Tempo Real        | Painel executivo com tempos médios de espera PA, taxa de ocupação de leitos, cirurgias por sala e monitoramento operacional com PocketBase Realtime.              |
| **0.0.19** | SAME e Prontuário Unificado do Paciente             | Linha do tempo integrada consolidando PA, internações, cirurgias, obstetrícia, exames, dispensações e impressos por CPF/CNS.                                      |
| **0.0.20** | Inventário Farmacêutico, Integridade e Idempotência | Snapshot de abertura de inventário, detecção de concorrência na contagem física, perdas por validade/avaria e proteção de idempotency_key contra retry duplicado. |

---

## 2. Fechamento da Superfície de Testes Sintéticos e Imutabilidade (v0.0.21)

Em conformidade com a determinação de segurança e governança de dados do Codex:

1. **Desativação de Endpoint de Rede:** O endpoint temporário de testes sintéticos (`POST /backend/v1/farmacia/testes-sinteticos`) foi completamente desativado e removido do backend implantado (`pocketbase/hooks/testes_sinteticos.pb.js`).
2. **Remoção de Controles na Interface:** O botão e o modal "Auditar Cenários Sintéticos" foram expurgados da tela de Farmácia/Inventário (`src/components/InventarioFarmaciaTab.tsx`), impedindo que qualquer usuário do aplicativo compartilhado dispare rotinas mutantes ou testes em runtime compartilhado.
3. **Preservação de Registros Existentes:** Nenhuma fixture, registro real ou dado clínico do banco compartilhado foi apagado ou alterado.
4. **Imutabilidade Estrita de Movimentos de Estoque:** Através da migração `0017_imutabilidade_movimentos_estoque_auditoria.js`, as regras de coleção `farmacia_movimentos_estoque` e `auditoria` tiveram `updateRule` e `deleteRule` travados estritamente como `null`. Nem mesmo administradores podem reescrever ou expurgar o histórico de movimentações e auditoria via REST API.

---

## 3. Harness Local Isolado e Invariantes Validadas

Os testes das regras transacionais foram transferidos para o módulo local isolado `src/tests/harnessTestes.ts`. Este harness roda inteiramente na memória sem credenciais reais e sem tocar no banco de dados compartilhado.

### Como Executar o Harness Local

O harness é um módulo TypeScript autocontido exportado em `src/tests/harnessTestes.ts` e pode ser verificado em tempo de build/desenvolvimento via:

```bash
# Execução da verificação sintática e de tipos
pnpm run build
```

Para obter os resultados detalhados em ambiente Node / terminal com TypeScript:

```ts
import { executarHarnessLocal } from './src/tests/harnessTestes'
const resultado = executarHarnessLocal()
console.log(resultado)
```

### Resultados Obtidos no Harness Local

| Invariante / Cenário                                | Regra Validada                                                  | Resultado  | Detalhes                                                                                                                                                                                   |
| :-------------------------------------------------- | :-------------------------------------------------------------- | :--------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) Mesma idempotency_key com payload diferente** | Rejeição imediata por conflito (`IDEMPOTENCY_PAYLOAD_CONFLICT`) | **PASSOU** | A dispensação original de 5 un foi gravada com sucesso. A segunda tentativa com a mesma chave solicitando 10 un foi bloqueada sem alterar o estoque.                                       |
| **(b) Chave gerada por outro usuário**              | Isolamento de dados de sessão e confidencialidade               | **PASSOU** | O usuário original consulta seu registro com sucesso. Usuário terceiro tentando a mesma chave recebe erro 403 (`Acesso negado`) e não obtém dados da dispensação original.                 |
| **(c) Duplicações simultâneas**                     | Idempotência atômica com baixa única de estoque                 | **PASSOU** | Duas requisições simultâneas com a mesma chave resultaram em uma única baixa de 20 un (saldo 100 -> 80); a segunda requisição reutilizou a primeira sem deduplicar o saldo.                |
| **(d) Falha parcial entre gravações**               | Transação atômica ACID (Rollback / Sem órfãos)                  | **PASSOU** | Falha simulada durante o processo de gravação intermediária reverteu o saldo ao estado inicial, sem gerar registros órfãos de dispensação ou movimentação.                                 |
| **(e) Inventário com concorrência**                 | Rejeição de fechamento de inventário sob concorrência           | **PASSOU** | O saldo do catálogo sofreu saída concorrente durante a contagem (de 50 para 40). O fechamento automático foi rejeitado (`rejeitado_concorrencia`) e o saldo não foi sobrescrito cegamente. |

---

## 3.1. Gestão Administrativa da Central de Regulação (v0.0.22) & Testes Locais do Relógio

Na versão 0.0.22 foi concluída a **Gestão Administrativa da Central de Regulação** sem interferir na decisão humana ou alterar fluxos clínicos/leitos:

1. **Catálogo Parametrizável de Recursos/Especialidades e Destinos Internos:**
   - Permite ativação/inativação (_soft disable_) de itens sem exclusão física (`deleteRule: null`), preservando 100% do histórico e integridade referencial.
   - Recursos inativos deixam de aparecer em novas solicitações, mas permanecem visíveis nos registros anteriores.
2. **Filtros Administrativos da Fila:**
   - Filtros combinados por Recurso Solicitado, Unidade/Setor, Situação da Solicitação e Período de apuração.
3. **Cálculo de Tempo Individual de Espera:**
   - Exibido em cada card e linha da fila, com detalhamento via tooltip/modal explicativo da metodologia de apuração.
4. **Indicadores Agregados de Espera por Etapa:**
   - Apuração do tempo médio e máximo de espera nas etapas: _Aguardando Avaliação_, _Em Análise Regulatória_, _Aguardando Vaga/Efetivação de Leito_ e _Ciclo Total Concluído_.
   - Mantido estritamente dentro da aba de indicadores do módulo de regulação existente (sem criar novo menu ou Sala de Situação, que permanece excluída).
5. **Definição Explícita do Relógio e Fuso:**
   - **Fuso horário fixo:** `America/Sao_Paulo` (UTC-3).
   - **Origem do relógio:** Data/hora exata do registro da solicitação.
   - **Pausas/Interrupções:** Pausas técnicas amortizam a contagem de espera líquida; cancelamentos congelam o relógio na data do evento.
6. **Ordem Administrativa Transparente:**
   - 1º critério: Prioridade humana informada pelo profissional (Vermelho > Amarelo > Verde > Azul).
   - 2º critério: Ordem cronológica por data de solicitação (FIFO).
   - Ausência estrita de qualquer escore, ranking ou priorização clínica automática.

### Resultados da Execução dos Testes Locais do Relógio (src/tests/harnessTestes.ts):

- **Cenário (f) - Datas ausentes/nulas:** Tratamento com fallback seguro para 0 min e status 'indeterminado', sem quebrar a interface ou gerar NaN.
- **Cenário (g) - Datas invertidas:** Protegido com corte inferior `Math.max(0, ...)`; tempo de espera nunca exibe valores negativos.
- **Cenário (h) - Virada de dia (23h50 → 00h10):** Computado em epoch timestamp absoluto em milissegundos, totalizando exatamente 20 minutos de espera contínua.
- **Cenário (i) - Pausas e retomadas:** Amortização precisa do tempo pausado, com cálculo exato do saldo de espera líquida.
- **Cenário (j) - Cancelamento:** Congelamento imediato do relógio no timestamp da interrupção, não computando tempo decorrido posterior.

---

## 4. Lacunas de Homologação e Conformidade Regulatória (Não Implementadas e Não Alegadas)

O sistema atual atende como prova de conceito operacional robusta, mas possui lacunas formais mandatórias que impedem sua implantação em ambiente hospitalar de produção real:

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

## 5. Backlog Priorizado para Próximas Fases

| Prioridade | Item / Demanda                                          | Descrição Técnica                                                                                                             | Pré-requisito           |
| :--------: | :------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------- | :---------------------- |
|   **P1**   | Motor de Exportação em Lote DATASUS                     | Implementar gerador de arquivos no formato oficial do SUS para exportação de AIH e BPA apurados na competência.               | Faturamento SUS v0.0.12 |
|   **P2**   | Integração com Certificação ICP-Brasil                  | Integração com biblioteca de assinatura em nuvem / PKI para laudos de exames e impressos médicos.                             | Resolução CFM 1.821     |
|   **P3**   | Rastreabilidade Bidirecional Farmácia-SAME              | Vincular automaticamente o código de barras/lote lido na dispensação diretamente à ficha anestésica e evolução de enfermagem. | Farmácia v0.0.20        |
|   **P4**   | Alertas Clínicos Automáticos de Interação Medicamentosa | Cruzar prescrições ativas com alergias registradas no cadastro do paciente para bloqueio preventivo.                          | Prescrições v0.0.8      |
|   **P5**   | Protocolo de Comunicação HL7 / FHIR                     | Criar endpoints ou adaptadores padronizados para interoperabilidade com sistemas laboratoriais externos.                      | Exames v0.0.10          |
