# Documento de Prontidão e Homologação Técnica

**Sistema:** Gestão Hospitalar Municipal  
**Stack:** React 19 + TypeScript + Tailwind CSS (Frontend) / Skip Cloud PocketBase v0.36 (Backend)  
**Versão Atual:** 0.0.61 (Módulo RIS Parte 1 Concluída: Contratos Backend e Sanitizador Server-Side 0.0.60, Serviço Cliente TypeScript com Otimista/SeqRef/Idempotência, Testes Locais de Funções Reais RIS-8 a RIS-14 e Prontidão com Migração 0032 Confirmada)  
**Data de Consolidação:** Outubro de 2026  
**Status Operacional:** **PROTÓTIPO AVANÇADO / AMBIENTE DE HOMOLOGAÇÃO CONTROLADA**  
\*(ATENÇÃO: Este sistema NÃO está autorizado nem pronto para assistência médica real em ambiente de produção sem a resolução integral das lacunas normativas e regulatórias listadas abaixo).\_

---

## 1. Evidências por Versão Entregue (v0.0.1 a v0.0.40)

| Versão     | Escopo / Módulo Entregue                                                                    | Evidência Comprovada                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| :--------- | :------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0.0.1**  | Scaffold base e autenticação PocketBase                                                     | Login municipal com perfis (admin, gestor, profissional, recepcao), contexto AuthContext e token JWT.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **0.0.2**  | Cadastros Fundamentais                                                                      | CRUD de Setores hospitalares, Leitos com status (vago/ocupado/manutenção/higienização), Pacientes e Profissionais de Saúde.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **0.0.3**  | Agendamentos Ambulatoriais e Painel Inicial                                                 | Fila de consultas, status de agendamento (agendado, confirmado, atendido, cancelado) e métricas básicas de ocupação.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **0.0.4**  | Internação e Mapa de Leitos                                                                 | Fluxo de admissão hospitalar, transferência de leitos entre setores, histórico de leitos e altas médicas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **0.0.5**  | Evolução Clínica e Prontuário Básico                                                        | Registro assistencial multiprofissional (médica, enfermagem), CID-10 e sinais vitais vinculados à internação.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **0.0.6**  | Trilha de Auditoria Geral                                                                   | Coleção `auditoria` gravando eventos de login, logout e transações assistenciais com usuário, IP e timestamp.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **0.0.7**  | Pronto Atendimento (PA)                                                                     | Acolhimento, classificação de risco Protocolo de Manchester (Vermelho, Laranja, Amarelo, Verde, Azul) e encaminhamentos.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **0.0.8**  | Prescrição Médica e Aprazamento de Enfermagem                                               | Prescrição de itens farmacêuticos, horários e checagem de administração de medicamentos à beira-leito.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **0.0.9**  | Farmácia Hospitalar e Dispensação                                                           | Catálogo de medicamentos/materiais, saldo atual/mínimo e baixa de dispensação por paciente ou remessa de setor.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **0.0.10** | Exames Laboratoriais e Laudos                                                               | Ciclo completo: solicitação médica, coleta de amostra, início de análise técnica e emissão de laudo estruturado.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **0.0.11** | Centro Cirúrgico                                                                            | Gestão de salas cirúrgicas, agendamento de cirurgias, checklist pré-operatório OMS/Safe Surgery, ato operatório e SRPA (escala de Aldrete-Kroulik).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **0.0.12** | Faturamento SUS / SIGTAP                                                                    | Importação e consulta da tabela SIGTAP, contas hospitalares AIH (SH/SA/SP) e apuração de produção ambulatorial BPA.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **0.0.13** | Impressos Assistenciais em Folha A4                                                         | Emissão formatada de Receituário simples/controlado, Atestado Médico e Resumo de Alta com opção de consentimento para CID-10 (LGPD/CFM).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **0.0.14** | Vigilância em Saúde (Sem Georreferenciamento)                                               | Notificação compulsória (imediata 24h e semanal), histórico de investigação epidemiológica e fila administrativa restrita sem mapas/geolocalização.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **0.0.15** | Centro Obstétrico e Sala de Parto                                                           | Admissão obstétrica com risco, partograma simplificado, registro do parto, cadastro do RN com escala de Apgar e desfecho puerperal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **0.0.16** | Central de Regulação Interna                                                                | Solicitações de transferência leito a leito, triagem por médico regulador com fila administrativa sem dados de contato expostos à recepção.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **0.0.17** | Segurança e Regras de RLS no Backend                                                        | Migração 0014 travando coleções clínicas para o perfil `recepcao`, restrição de dispensação e auditoria imutável (update/delete nulos).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **0.0.18** | Painel de Gestão e Indicadores em Tempo Real                                                | Painel executivo com tempos médios de espera PA, taxa de ocupação de leitos, cirurgias por sala e monitoramento operacional com PocketBase Realtime.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **0.0.19** | SAME e Prontuário Unificado do Paciente                                                     | Linha do tempo integrada consolidando PA, internações, cirurgias, obstetrícia, exames, dispensações e impressos por CPF/CNS.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **0.0.20** | Inventário Farmacêutico, Integridade e Idempotência                                         | Snapshot de abertura de inventário, detecção de concorrência na contagem física, perdas por validade/avaria e proteção de idempotency_key contra retry duplicado.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **0.0.21** | Fechamento de Testes Sintéticos & Imutabilidade                                             | Expurgo total de endpoints mutantes sintéticos; travamento estrito de delete/update em movimentações e auditoria.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **0.0.22** | Regulação Administrativa e Relógio Fuso Inicial                                             | Catálogo de recursos/destinos, filtros administrativos e cálculo individual de tempo de espera com pausas documentadas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **0.0.23** | Consolidação de Relatórios e Auditoria de Acessos                                           | Refinamento de permissões e relatórios por competência sem alterações destrutivas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **0.0.24** | Consistência de Datas/Horários, Fuso IANA e Qualidade de Dados                              | Parametrização por unidade (`America/Porto_Velho` para Mirante da Serra/RO [UTC-4]), dados sem data exibidos como 'indisponível' e fora das médias (sem zeros).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **0.0.27** | Conferência de Consistência Faturamento SUS (AIH / BPA / SIGTAP)                            | Validação administrativa prévia de contas AIH (campos, datas invertidas, alta >6 meses, causa externa), BPA (duplicidade), regras SIGTAP por competência e painel de conferência.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **0.0.28** | Importador do Pacote SIGTAP Oficial Posicional (.zip)                                       | Extração segura em memória, parser guiado dinamicamente pelos arquivos `*_layout.txt` (sem posições fixas, imune à alteração pós-202506), ISO-8859-1, preservação de zeros e valores.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **0.0.30** | Correção de Tipagem e Consolidação do Importador Posicional ZIP                             | Ajuste de tipagem TypeScript no `FaturamentoView.tsx` (`sucesso` em `PrevisualizacaoSIGTAPResultado`), validação estrita com QA limpo (oxlint, tsc e build) e preservação dos 7 cenários do harness.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **0.0.35** | Identificação Segura, Índices Parciais e Busca Minimizada                                   | Migrações 0020/0021 (índices únicos parciais CPF/CNS e CNS opcional), migração 0022 de normalização de documentos históricos, hook de identificação reforçado (create/update), endpoint e serviço de busca minimizada com proteção LGPD e prevenção de race de digitação.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **0.0.36** | Cenários Reais do Harness, Documentação de Prontidão e Limites                              | Atualização de `harnessTestes.ts` com funções reais (zeros à esquerda, escape de filtro PocketBase, máscara no payload minimizado e race condition determinístico), auditoria de prontidão e limites operacionais documentados.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **0.0.37** | Integridade Server-Side: Prescrição e Checagem ao Leito                                     | Migração 0023 e hook `prescricoes_administracao.pb.js`: integridade de vínculos (paciente/atendimento autoritativos), bloqueio de prescrição/item suspenso, tratamento server-side de idempotência (`IDEMPOTENT_HIT`, `IDEMPOTENCY_PAYLOAD_CONFLICT`) e imutabilidade direta (delete/update nulos).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **0.0.38** | Camada Cliente Resiliente, Retificação Rastreável e Cenários ADM                            | `src/services/prescricoes.ts` com chave de idempotência persistente, reconexão de rede pós-gravação, `retificarAdministracaoMedicamento`; botões travados em voo, textos preservados em conflito, bloqueio de prescrição suspensa e descarte por sequência de troca de paciente nos componentes e 4 cenários ADM no harness.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **0.0.40** | Exames & Laudos Parte 1 e 2: Integridade, Retificação e SAME                                | Migração 0024 (`laudos_versoes` imutável, backfill v1 de liberados, campos de idempotência e versão em `exames`), hook `exames_laudos.pb.js`, serviço cliente com retificação formal, tela `ExamesLaudosView` com modal de justificativa obrigatória (min 5 chars), exibição de versão vigente e anteriores no SAME e no impresso oficial A4, descarte de respostas em voo por sequência `seqRef`, e cenários EXA-1 a EXA-8 no harness.                                                                                                                                                                                                                                                                                                                                                                                                               |
| **0.0.42** | Painel de Gestão Hospitalar em Tempo Real (Partes 1 e 2)                                    | Endpoint server-side `pocketbase/hooks/painel_gestao.pb.js` com contagens agregadas paginadas completas sem truncamento, isolamento de dados financeiros de faturamento SUS restritos estritamente a admin/gestor, anonimização LGPD sem dados pessoais/clínicos, preservação de datas ausentes como 'indisponível' fora das médias (nunca zero), resiliência a erro parcial mantendo fotografia válida, controle de sequência descartando respostas fora de ordem, e cenários PAINEL-1 a PAINEL-7 no harness.                                                                                                                                                                                                                                                                                                                                        |
| **0.0.43** | Painel de Gestão Hospitalar em Tempo Real (Correção de Prioridade Codex)                    | Remoção definitiva do fallback no cliente que baixava registros clínicos detalhados (pacientes, PA, internações, prescrições, exames, farmácia, cirurgias, contas); em falha/404/403/timeout o painel preserva o último resultado autorizado exibindo aviso de estado desatualizado com timestamp ou exibe indisponível sem resultado prévio, sem jamais contornar acesso; controle de sequência vinculado à sessão ativa que limpa dados anteriores (sobretudo financeiro) e descarta requisições em voo da sessão anterior na troca de usuário/perfil; resultado vazio renderizado como vazio e não como erro; cenários PAINEL-1 a PAINEL-9 no harness.                                                                                                                                                                                             |
| **0.0.45** | Integridade dos Impressos Assistenciais (Parte 1: Backend e Infraestrutura)                 | Migração 0025 (`impressos_assistenciais` com colunas de snapshot cadastral congelado `paciente_nome_snapshot`, CPF, CNS, nascimento, sexo, alergias; integridade de vínculos com PA e internação; retificação com documento_original, motivo, autor e timestamp), hook server-side `impressos_assistenciais.pb.js` com validações no beforeCreate, sanitização de storage no logout e serviço cliente.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **0.0.46** | Integridade dos Impressos Assistenciais (Parte 2: Cenários Reais e Prontidão)               | Cenários IMPRESSOS-1 a IMPRESSOS-5 no harness executados com funções reais (`emitirImpressoAssistencial`, `retificarImpressoAssistencial`, `renderizarTextoPuroImpresso`) e fixtures sintéticas locais; comprovação de snapshot inalterado na reimpressão SAME após mudança cadastral, rejeição de vínculo cruzado paciente/atendimento, retificação rastreável mantendo original intacto, limpeza de storage no logout e neutralização de tags HTML/scripts em texto puro sem execução.                                                                                                                                                                                                                                                                                                                                                              |
| **0.0.47** | Mensageria Interna Hospitalar (Parte 1: Backend + Serviço Cliente)                          | Migração 0026 (`canais_grupos_mensageria` e `mensagens_internas`), regras RLS restritas apenas ao remetente e destinatários autorizados, hook server-side `mensageria_interna.pb.js` derivando autor exclusivamente da sessão (@request.auth.id), congelamento de snapshot de participantes de grupo no momento do envio, idempotência persistente (`idempotency_key`), sanitização em texto plano sem HTML, serviço cliente `src/services/mensageria.ts`, endpoint de diretório mínimo funcional (sem CPF/CNS/dados clínicos) e cenários MSG-1 a MSG-6 no harness local.                                                                                                                                                                                                                                                                             |
| **0.0.48** | Mensageria Interna Hospitalar (Parte 2: Interface de Usuário & Integração)                  | Interface completa `MensageriaInternaView.tsx` integrada à barra de navegação principal (`NavigationBar.tsx`) com aba dedicada e badge; caixas de entrada e enviadas com paginação e busca debounced; conversa com visualização segura em texto plano (tags HTML inertes, sem dangerouslySetInnerHTML nem execução de scripts); composição restrita a destinatários do diretório mínimo funcional e grupos hospitalares; bloqueio anti-duplo clique no envio; retry seguro com reuso da mesma chave de idempotência sem duplicar mensagens no servidor; controle sequencial em voo descartando respostas da sessão anterior na troca de usuário/perfil; preservação estrita do texto digitado em conflito de payload; aviso explícito de que mensagens não constituem evolução clínica nem prescrição; e cenários MSG-7 a MSG-10 no harness local.    |
| **0.0.51** | Módulo de APAC Interno (Parte 1: Backend, Migração e Serviço Cliente)                       | Migração 0027 (`apac_solicitacoes` e `apac_faixas_sequencias` com tipos de laudo, modalidades inicial/continuidade/sem_continuidade, datas de validade, CIDs principal/secundário/causas associadas e faixas por ano/UF/tipo), hook server-side `apac_gestao.pb.js` com reserva transacional idempotente em `POST /backend/v1/apac/reservar-numero`, cancelamento auditado sem reutilização de número, validação de APAC anterior pertencente ao mesmo paciente, bloqueio de exclusão física, e serviço cliente `src/services/apac.ts` com máscara LGPD e rascunho a partir do PEP.                                                                                                                                                                                                                                                                   |
| **0.0.52** | Módulo de APAC Interno (Parte 2: Interface de Usuário, Gestão de Faixas e Testes)           | Interface completa `ApacView.tsx` integrada à navegação principal (`NavigationBar.tsx`) com perfil mínimo de recepção (apenas consulta) e abas de Solicitações paginadas com máscara de CPF/CNS (LGPD), Detalhes com retificação versionada e cancelamento auditado, Rascunho a partir do PEP como pré-preenchimento para revisão profissional humana (estritamente sem autoautorização clínica), Gestão de Faixas por ano/UF/tipo restrita ao operador municipal autorizado sem gravação de registros reais na base compartilhada, controle de sequência `seqRef` descartando respostas em voo na troca de paciente, retry com chave de idempotência estável preservando textos em erro, e cenários APAC-1 a APAC-6 no harness de testes locais.                                                                                                     |
| **0.0.54** | Transporte Sanitário Interno (Parte 1: Backend, Migração e Serviços)                        | Migração 0029 (7 coleções de veículos, tipos, motoristas com CNH, rotas, destinos, viagens e vínculos de passageiros com vagas separadas ida/volta), hook `transporte_sanitario.pb.js` com endpoint transacional `POST /backend/v1/transporte/reservar-vagas` (lotação por trecho, conflito de agenda, autor da sessão, inativação lógica sem delete e auditoria), serviço cliente `src/services/transporte.ts` (cálculo de km com rejeição de negativo, fuso da unidade `America/Porto_Velho`, persistência UTC) e cenários TRANSP-1 a TRANSP-6 no harness.                                                                                                                                                                                                                                                                                          |
| **0.0.55** | Transporte Sanitário Interno (Parte 2: Interface de Usuário, Isolamento e Testes)           | Interface completa `TransporteView.tsx` integrada à navegação global (`NavigationBar.tsx` e `Index.tsx`) com abas de viagens programadas (paginada, filtros, finalização com odômetro final), frota e sinalização de manutenção/indisponibilidade, motoristas com controle de validade de CNH, rotas e destinos; reserva atômica de vagas por trecho (ida e/ou volta) alocando vagas SEPARADAS para pacientes e acompanhantes, com controle de sequência (`seqRef`) para descarte de respostas defasadas em voo ao trocar paciente, botão travado contra duplo clique e reenvio idempotente; isolamento estrito de perfil (recepção acessa exclusivamente dados operacionais/administrativos da viagem; justificativas clínicas restritas ao acesso clínico autorizado); cenários TRANSP-7 a TRANSP-12 no harness local com funções reais importadas. |
| **0.0.56** | Módulo TFD - Tratamento Fora do Domicílio (Parte 1: Backend, Migração e Serviços)           | Migração 0030 (coleções `tfd_processos`, `tfd_historico_estados`, `tfd_viagens_lote` e relação `tfd_processo` em `transporte_viagens`), hook `tfd_processos.pb.js` com transições de estado com justificativa obrigatória (>5 chars), rotas `/previa` e `/confirmar` de lote de viagens, rota de renovação atômica (`POST /backend/v1/tfd/processos/{id}/renovar`), serviço `src/services/tfd.ts` e cenários TFD-1 a TFD-6 no harness local.                                                                                                                                                                                                                                                                                                                                                                                                          |
| **0.0.57** | Módulo TFD - Tratamento Fora do Domicílio (Parte 2: Interface, Lote, Renovação e Agregados) | Interface `TfdView.tsx` integrada à navegação (`NavigationBar.tsx` e `Index.tsx`) com listagem filtrada/paginada, abertura com CID-10 e justificativa clínica, detalhe com trilha auditável permanente de estados, isolamento clínico rígido (recepção sem CID-10/justificativa), lote de viagens com prévia para revisão humana e confirmação explícita com segregação de conflitos, renovação com preservação de histórico sem herança de aprovação, painel agregado interno por localidade (sem mapas e sem dados pessoais), controle sequencial em voo, retry estável e cenários TFD-7 e TFD-8 no harness.                                                                                                                                                                                                                                        |
| **0.0.58** | Módulo RIS - Radiologia e Diagnóstico por Imagem (Parte 1: Backend e Migração)              | Migração 0031 (`ris_agendas`, `ris_modelos_laudo`, `ris_historico_transicoes` e expansão de campos RIS em `exames`), hook server-side `ris_modulo.pb.js` com endpoints transacionais e serviço cliente base `src/services/ris.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **0.0.59** | Módulo RIS - Radiologia e Diagnóstico por Imagem (Parte 2: Interface, Gestão e Testes)      | Interface `RisView.tsx` com fila paginada por modalidade/status, agendamento com validação de choque de horários, reagendamento com justificativa, comprovante A4 seguro sem innerHTML, prestador credenciado externo, aplicação de modelos versionados em rascunho sem auto-liberação, e cenários RIS-1 a RIS-7 no harness.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **0.0.60** | Editor Formatado de Laudos RIS (Parte 1: Backend e Correção de Escopo JSVM)                 | Migração 0032 (`editor_formatado_laudos_ris`: `ris_imagens_anexas`, campos de rascunho em `exames` e enriquecimento de `laudos_versoes` e `ris_modelos_laudo`), hook `ris_modulo.pb.js` expandido com endpoints transacionais de rascunho, publicação, retificação e prévia oficial, e correção de escopo do JSVM (sanitizador movido para dentro dos callbacks de rota).                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **0.0.61** | Módulo RIS (Parte 1 Finalizada: Serviço Cliente TS, Testes Reais e Prontidão)               | Serviço cliente TypeScript em `src/services/ris.ts` (`salvarRascunhoLaudoRIS`, `publicarLaudoRIS`, `retificarLaudoRIS`, `obterPreviaLaudoRIS`) cobrindo concorrência otimista (409), token da sessão, descarte por `seqRef` e idempotência; testes de funções reais do sanitizador servidor e regras do contrato (cenários RIS-8 a RIS-14 no harness com 100% de aprovação); estado confirmado da migração 0032 (`APLICADA`) e registro formal de prontidão e pendências da Parte 2 (UI).                                                                                                                                                                                                                                                                                                                                                             |

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

| Invariante / Cenário                                                     | Função Real Testada                                | Resultado  | Detalhes da Execução Real                                                                                                                                           |
| :----------------------------------------------------------------------- | :------------------------------------------------- | :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **(a) Mesma idempotency_key com payload diferente**                      | Processamento transacional com idempotência        | **PASSOU** | Operação inicial com 5 un gravada; segunda tentativa com 10 un rejeitada com erro de conflito (`IDEMPOTENCY_PAYLOAD_CONFLICT`) sem alterar o saldo.                 |
| **(b) Chave gerada por outro usuário**                                   | Controle de isolamento de sessão                   | **PASSOU** | Usuário original consulta seu registro; usuário terceiro recebe erro 403 (`Acesso negado`) sem vazamento de dados.                                                  |
| **(c) Duplicações simultâneas**                                          | Idempotência atômica                               | **PASSOU** | Duas chamadas simultâneas geram uma única baixa de 20 un (saldo 100 -> 80); a segunda reutiliza a primeira.                                                         |
| **(d) Falha parcial entre gravações**                                    | Transação com rollback                             | **PASSOU** | Falha simulada reverte o saldo para 30 un sem criar movimentações ou dispensações órfãs.                                                                            |
| **(e) Inventário com concorrência**                                      | Fechamento condicional de inventário               | **PASSOU** | Saída concorrente durante a contagem detectada; fechamento rejeitado com `rejeitado_concorrencia` sem sobrescrever o saldo real.                                    |
| **(f) Datas ausentes/corrompidas no relógio**                            | `calcularTempoEsperaIndividual`                    | **PASSOU** | Com data `null` ou string corrompida, retorna `tempoFormatado = 'indisponível'`, `dataInvalidaOuAusente = true` e status `'indeterminado'`.                         |
| **(g) Datas invertidas no relógio**                                      | `calcularTempoEsperaIndividual`                    | **PASSOU** | Início às 15:00 e fim às 14:00 resulta em 0 minutos (`Math.max(0, ...)`), garantindo tempo sempre positivo sem corromper a tela.                                    |
| **(h) Virada de dia contínua**                                           | `calcularTempoEsperaIndividual`                    | **PASSOU** | Passagem de 15/10 23h50 para 16/10 00h10 computada em epoch absoluto: exatamente 20 minutos contínuos (`20 min`).                                                   |
| **(i) Pausas e retomadas no relógio**                                    | `calcularTempoEsperaIndividual`                    | **PASSOU** | Período bruto de 90 min com pausa técnica de 30 min resulta exatamente em 60 min de espera líquida (`1h 0m`).                                                       |
| **(j) Cancelamento congelado**                                           | `calcularTempoEsperaIndividual`                    | **PASSOU** | Solicitação cancelada após 75 min congela o tempo em 1h 15m mesmo consultada 2 dias após.                                                                           |
| **(k) Fuso IANA da unidade municipal**                                   | `formatarHoraFuso`, `obterFusoHorarioAtivo`        | **PASSOU** | Timestamp UTC `16:00Z` formatado como `12:00` no fuso de Mirante da Serra/RO (`America/Porto_Velho`, UTC-4) e `13:00` em São Paulo (UTC-3).                         |
| **(l) Datas ausentes fora da média**                                     | `calcularMediaEstatisticaSegura`                   | **PASSOU** | Amostra `[10, null, 20, undefined, 30]` gera média estrita de 20 min (e NÃO 12 min falseados por zero). Amostra `[null, undefined]` retorna `null`.                 |
| **(m) Limites de dia civil e competência**                               | `extrairDataCivilFuso`, `dentroDoPeriodo`, filtros | **PASSOU** | `02:30Z` de 15/10 classificado no dia civil 14 em Porto Velho; `02:00Z` de 01/11 classificado na competência de outubro (`2026-10`) em Porto Velho (RO).            |
| **(n) AIH com campos obrigatórios ausentes**                             | `validarContaHospitalarAIH`                        | **PASSOU** | Conta sem paciente, datas, procedimento e CID rejeitada com 4+ erros e citações textuais ao Manual SIH/DATASUS 2017 e Manual Créditos Financeiros 2025.             |
| **(o) AIH com datas invertidas**                                         | `validarContaHospitalarAIH`                        | **PASSOU** | Alta hospitalar cronologicamente anterior à internação bloqueada com citação à regra cronológica de período da AIH (Manual SIH).                                    |
| **(p) AIH com alta > 6 meses da competência**                            | `validarContaHospitalarAIH`                        | **PASSOU** | Alta com 8 meses de defasagem recebe advertência documental expressa do Manual SIH DATASUS 2017 (limite regulatório de 6 meses de apresentação).                    |
| **(q) Procedimento inexistente no SIGTAP**                               | `validarContaHospitalarAIH`                        | **PASSOU** | Código de procedimento não importado é rejeitado como inexistente na SIGTAP municipal sem inferência espúria de compatibilidade.                                    |
| **(r) SIGTAP com competência não importada**                             | `validarContaHospitalarAIH`                        | **PASSOU** | Competência sem importação SIGTAP sinaliza advertência de 'validar manualmente' em vez de gerar falso erro impeditivo.                                              |
| **(s) Duplicidade de produção BPA**                                      | `validarItemProducaoBPA`                           | **PASSOU** | Mesmo atendimento + procedimento + competência gera sinalização de duplicidade para revisão administrativa sem interrupção de fluxo.                                |
| **(t) Não inferir causa externa de CID S/T**                             | `validarContaHospitalarAIH`                        | **PASSOU** | CID S06.0 não infere causa externa espúria; declaração explícita de acidente gera aviso de "revisão humana" sem bloquear conta.                                     |
| **(u) Painel agregador de conferência**                                  | `executarConferenciaConsistencia`                  | **PASSOU** | Consolida e totaliza inconsistências de AIH e BPA sem alterar status retrospectivo e sem marcar contas como enviadas.                                               |
| **(v) Catálogo parcial SIGTAP (recorte)**                                | `validarContaHospitalarAIH`                        | **PASSOU** | Procedimento ausente em catálogo parcial emite aviso "tabela incompleta, validar manualmente", nunca erro impeditivo de inexistência.                               |
| **(w) Parser e pré-visualização SIGTAP CSV**                             | `previsualizarSigtapCSV`                           | **PASSOU** | Restaura zeros à esquerda (03.01.06.008-8), valida decimais (SH/SA/SP) e rejeita duplicidades dentro do lote com relatório linha a linha.                           |
| **(x) Regras Manual 2017 e competência explícita**                       | `validarContaHospitalarAIH`, `previsualizarSigtap` | **PASSOU** | Regras normativas sem vigência confirmada 2026 viram aviso documental de revisão humana; competência explícita exigida e validada.                                  |
| **(1) Linha truncada no posicional SIGTAP**                              | `processarPacoteSigtapPosicional`                  | **PASSOU** | Linhas com tamanho inferior ao mínimo posicional do layout geram rejeição por linha com detalhe do tamanho.                                                         |
| **(2) Encoding ISO-8859-1 acentuação correta**                           | `processarPacoteSigtapPosicional`, `decodificar`   | **PASSOU** | Caracteres acentuados ("Cirúrgico", "Atenção") decodificados com exatidão pelo padrão oficial do Ministério da Saúde.                                               |
| **(3) Competência divergente entre pacote e UI**                         | `processarPacoteSigtapPosicional`                  | **PASSOU** | Divergência entre a competência informada pelo usuário e a declarada em `DT_COMPETENCIA` bloqueia a gravação com relatório de divergência.                          |
| **(4) Registros duplicados no mesmo pacote**                             | `processarPacoteSigtapPosicional`                  | **PASSOU** | Duplicidades internas no mesmo pacote rejeitadas linha a linha apontando a ocorrência original anterior.                                                            |
| **(5) Zeros à esquerda preservados (códigos SUS)**                       | `normalizarCodigoProcedimentoSigtap`, parser       | **PASSOU** | Zeros à esquerda preservados como String (ex: `0101010010` -> `01.01.01.001-0`) sem truncamento numérico.                                                           |
| **(6) Valores conforme escala de layout dinâmico**                       | `processarPacoteSigtapPosicional`, parser escala   | **PASSOU** | Valores monetários convertidos conforme a escala declarada no layout (centavos / 100), compatível com expansão de colunas pós-06/2025.                              |
| **(7) Prevenção Zip-Slip e limites de arquivo**                          | `validarCaminhoSeguroZip`, `descompactarZipSeguro` | **PASSOU** | Bloqueio de caminhos maliciosos (`../`, barras absolutas) e rejeição de pacotes superiores ao limite de segurança (50 MB).                                          |
| **(PAC-1) Validação Algorítmica Oficial CPF**                            | `validarCPFOficial`                                | **PASSOU** | Módulo 11 oficial (Receita Federal): aceita CPFs válidos com zeros à esquerda, rejeita DVs incorretos e 11 dígitos repetidos.                                       |
| **(PAC-2) Validação Algorítmica Oficial CNS Definitivo**                 | `validarCNSOficial`                                | **PASSOU** | Regra oficial Ministério da Saúde/DATASUS (início 1 ou 2, base PIS/PASEP ponderada): validação estrita de 15 dígitos.                                               |
| **(PAC-3) Validação Algorítmica Oficial CNS Provisório**                 | `validarCNSOficial`                                | **PASSOU** | Regra oficial Ministério da Saúde/DATASUS (início 7, 8 ou 9, soma ponderada mod 11): validação estrita de 15 dígitos.                                               |
| **(PAC-4) Tolerância Regulada a Casos Especiais**                        | `validarCPFOficial`, `validarCNSOficial`           | **PASSOU** | Recém-nascidos e acolhimentos de urgência sem documentos aceitos com status 'pendente' sem geração de números fictícios ilegais.                                    |
| **(PAC-5) Detecção de Homônimos com Alerta Visual**                      | `analisarSuspeitaHomonimo`                         | **PASSOU** | Mesmo nome fonético com data de nascimento ou mãe divergentes gera alerta visual humano de desambiguação sem fusão de cadastros.                                    |
| **(PAC-6) Normalização e Preservação de Zeros**                          | `normalizarTextoBusca`, `limparApenasDigitos`      | **PASSOU** | Remoção de acentuação (NFD) e preservação estrita de zeros à esquerda em CPF (11 posições) e CNS (15 posições).                                                     |
| **(PAC-7) Prevenção de Duplicidade (Simulação Local)**                   | `cadastrarPacienteConcorrente` (Memória)           | **PASSOU** | [SIMULAÇÃO EM MEMÓRIA]: 1ª gravação gravada com sucesso; 2ª com mesmo CPF ou CNS bloqueada com erro claro (prova estrutural real reside na migração 0020).          |
| **(PAC-8) Privacidade LGPD em Listas Públicas**                          | `mascararCPF`, `mascararCNS`                       | **PASSOU** | Exibição segura com documento parcialmente oculto (ex: `012.***.***-90` e `704.****.****.080`), sem exposição desnecessária em telas públicas.                      |
| **(PAC-9) Zeros à Esquerda em Filtro e Identificador**                   | `limparApenasDigitosPreservandoZeros`, filtro      | **PASSOU** | Função real preserva zeros à esquerda como String (`00123456700`, `002105154942080`, `00042`); filtro PocketBase mantém integridade sem truncamento.                |
| **(PAC-10) Escape de Filtro com Caracteres Especiais**                   | `escaparFiltroPocketBase`                          | **PASSOU** | Função real neutraliza aspas duplas/simples (`\"`, `\'`), sanitiza quebras de linha em espaço e protege cláusula de busca PocketBase contra quebra sintática.       |
| **(PAC-11) Máscara no Payload da Busca Minimizada**                      | `mascararCPF`, `mascararCNS`, payload              | **PASSOU** | Projeção minimizada no servidor trafega apenas documentos mascarados (`012.***.***-90`), impedindo vazamento de CPF/CNS íntegros na rede.                           |
| **(PAC-12) Race de Digitação: Resposta Antiga Descartada**               | Sequenciamento com token de requisição             | **PASSOU** | Resposta defasada de digitação anterior (100ms) descartada por token de sequência; resposta da digitação mais recente (10ms) vence e prevalece na tela.             |
| **(ADM-1) Idempotência de Checagem: Chave Estável e Nova Dose**          | `registrarAdministracaoMedicamento` (função real)  | **PASSOU** | 1ª chamada grava administração; reenvio com mesma chave reutiliza registro via `IDEMPOTENT_HIT`; chave distinta para novo horário gera nova dose legítima.          |
| **(ADM-2) Conflito de Payload em Mesma Chave de Checagem**               | `registrarAdministracaoMedicamento` (função real)  | **PASSOU** | Mesma chave com paciente/medicamento divergente é rejeitada com erro de conflito (`CONFLITO_IDEMPOTENCIA`) mantendo o registro original íntegro.                    |
| **(ADM-3) Retificação Rastreável com Original Intacto**                  | `retificarAdministracaoMedicamento` (função real)  | **PASSOU** | Cria novo registro (`tipo_registro='retificacao'`, `registro_original`, motivo, autor, data); ato original permanece 100% inalterado (snapshot idêntico).           |
| **(ADM-4) Descarte de Resposta Antiga na Troca de Paciente**             | Sequenciamento `seqMomento` vs `seqAtual`          | **PASSOU** | Checagem lenta em voo descartada após troca de paciente; checagem rápida do novo paciente aplicada com integridade sem poluição cruzada de prontuário.              |
| **(EXA-1) Laudo Finalizado Rejeita Sobrescrita Direta**                  | `emitirLaudoExame` (função real)                   | **PASSOU** | Laudo liberado bloqueia nova emissão direta via regra de imutabilidade no servidor (`LAUDO_JA_LIBERADO_IMUTAVEL`).                                                  |
| **(EXA-2) Idempotência de Laudo com Chave Idêntica e Conflito**          | `emitirLaudoExame` (função real)                   | **PASSOU** | Reenvio com mesma chave reaproveita registro sem duplicar; divergência de texto ou sumário é barrada com `CONFLITO_IDEMPOTENCIA`.                                   |
| **(EXA-3) Mascaramento de Identificadores na Listagem**                  | `mascararDadosPacienteExame`, serviço cliente      | **PASSOU** | CPF e Cartão SUS mascarados no retorno (`123.***.***-09` e `898 0011 **** 4455`), impedindo vazamento de dados pessoais nas tabelas operacionais.                   |
| **(EXA-4) Vínculo Divergente Rejeitado na Solicitação**                  | `solicitarExame` (função real)                     | **PASSOU** | Tentativa de solicitar exame vinculando paciente diferente da internação é bloqueada com `CADEIA_PACIENTE_DIVERGENTE`. Vínculo consistente é aceito.                |
| **(EXA-5) Solicitação Cancelada Bloqueia Coleta e Laudo**                | `registrarColetaExame`, `emitirLaudoExame` (reais) | **PASSOU** | Solicitação com status `cancelado` bloqueia sumariamente transições para coleta ou laudo com erro impeditivo (`EXAME_CANCELADO_IMUTAVEL`).                          |
| **(EXA-6) Reenvio Idêntico de Retificação Não Duplica**                  | `retificarLaudoExame` (função real)                | **PASSOU** | Duplo clique ou retry com mesma chave reutiliza versão existente; nova retificação com nova chave legítima incrementa para versão subsequente (v3).                 |
| **(EXA-7) Retificação Preserva Original e Grava Histórico**              | `retificarLaudoExame`, `listarVersoesLaudo`        | **PASSOU** | Versão 1 permanece inalterada; versão 2 registra justificativa clínica obrigatória (mínimo 5 caracteres), autor logado e data/hora formal da emissão.               |
| **(EXA-8) Troca de Paciente Descarta Resposta Antiga em Voo**            | Sequenciamento `seqRef` / `seqMomento`             | **PASSOU** | Consulta assíncrona lenta de paciente anterior descartada em voo quando usuário seleciona novo paciente; tela reflete apenas os dados do paciente ativo.            |
| **(PAINEL-1) Contagens Somam Todas as Páginas sem Truncamento**          | Paginação completa até esgotar o conjunto          | **PASSOU** | Lote de 135 itens paginado de 50 em 50 foi percorrido integralmente em 3 páginas somando exatamente 135 (sem truncar na primeira página de 50).                     |
| **(PAINEL-2) Registros sem Data Fora da Média e Nunca Zero**             | `calcularMediaEstatisticaSegura`                   | **PASSOU** | Amostra com nulos e indefinidos exclui ausências calculando média real (15.0); amostra sem datas válidas resulta em `null` ('indisponível', nunca zero).            |
| **(PAINEL-3) Payload Anonimizado sem Dados Pessoais ou Clínicos**        | Serialização e inspeção de chaves do payload       | **PASSOU** | Ausência confirmada de CPF, Cartão SUS, nomes de pacientes, diagnósticos e itens de prescrição médica; payload estritamente numérico e gerencial.                   |
| **(PAINEL-4) Resiliência a Erro Parcial Preserva Dados Válidos**         | Estado resiliente de carregamento                  | **PASSOU** | Falha de rede preserva última fotografia íntegra de dados sem anulação e sinaliza estado desatualizado sem falso sucesso.                                           |
| **(PAINEL-5) Fronteira de Dia Local no Fuso da Unidade**                 | `extrairDataCivilFuso`, `dentroDoPeriodo` (reais)  | **PASSOU** | Timestamp UTC `02:30Z` em `America/Porto_Velho` (UTC-4) pertence ao dia anterior local (22h30 do dia 14/10); filtro 'hoje' do dia 15/10 exclui corretamente.        |
| **(PAINEL-6) Vazio Real vs Erro Real Não se Confundem**                  | Resposta HTTP 200 (0 itens) vs HTTP 500/503        | **PASSOU** | Vazio legítimo (zero atendimentos) resulta em sucesso com total=0 e taxa=null; erro real 500/503 resulta em falha com dados=null (nunca zero inventado).            |
| **(PAINEL-7) Resposta Fora de Ordem Descartada por Sequência**           | Sequenciamento `sequenciaCarregamentoRef`          | **PASSOU** | Requisição 1 antiga e lenta (100ms) que chega após requisição 2 nova (15ms) é descartada por seq 1 !== seqAtual 2; filtro mais novo permanece íntegro na UI.        |
| **(IMPRESSOS-1) Reimpressão após Alteração da Origem**                   | `emitirImpressoAssistencial` + snapshot SAME       | **PASSOU** | Reimpressão pelo SAME exibe estritamente o snapshot congelado da emissão (nome, CPF, alergias, versão, data), sem contaminação por alteração posterior no cadastro. |
| **(IMPRESSOS-2) Vínculo Errado Rejeitado pela Validação**                | `emitirImpressoAssistencial` + validação servidor  | **PASSOU** | Tentativa de vincular paciente a atendimento de PA ou internação pertencente a outro paciente é bloqueada com erro formal de inconsistência de vínculo.             |
| **(IMPRESSOS-3) Retificação Preserva Original e Referencia**             | `retificarImpressoAssistencial` (função real)      | **PASSOU** | Documento original permanece 100% inalterado; novo documento de retificação referencia o original com motivo formal, nova autora, data e vigência clara.            |
| **(IMPRESSOS-4) Limpeza de Storage no Logout**                           | Rotina de sanitização do `AuthContext`             | **PASSOU** | Descarte integral de chaves com termos sensíveis (`paciente`, `atendimento`, `impresso`, `clinico`, `prontuario`) mantendo apenas preferências de layout.           |
| **(IMPRESSOS-5) Texto Clínico com Tags Renderizado como Puro**           | `renderizarTextoPuroImpresso` (Folha A4)           | **PASSOU** | Textos arbitrários contendo `<script>alert(1)</script>`, `<img>` e `<iframe>` são renderizados como texto puro na Folha A4, sem injeção DOM nem execução.           |
| **(MSG-1) Remetente Forjado Rejeitado pelo Servidor**                    | Validação autoritativa da sessão                   | **PASSOU** | Requisição de envio com autor forjado é descartada e substituída obrigatoriamente pelo ID do usuário autenticado na sessão.                                         |
| **(MSG-2) Leitura por Terceiro Bloqueada por RLS**                       | Regras de RLS da coleção `mensagens_internas`      | **PASSOU** | Usuário estranho à conversa tem acesso negado (403); apenas remetente e destinatários do snapshot conseguem visualizar a mensagem.                                  |
| **(MSG-3) Troca de Sessão Descarta Respostas Antigas em Voo**            | Sequenciamento `seqCargaRef` e `usuarioSessaoRef`  | **PASSOU** | Ao trocar de usuário/perfil, mensagens pendentes da sessão anterior são canceladas em voo e o estado da tela é limpo imediatamente.                                 |
| **(MSG-4) Membros Ingressantes Pós-Envio sem Histórico Pregresso**       | Snapshot congelado de participantes                | **PASSOU** | Novo usuário adicionado ao grupo após o envio não recebe visibilidade da mensagem histórica prévia (snapshot preservado).                                           |
| **(MSG-5) Retry com Mesma Chave Reaproveita sem Duplicar**               | Idempotência persistente `idempotency_key`         | **PASSOU** | Retentativa de envio em falha transitória reutiliza o mesmo protocolo sem gerar mensagens duplicadas no banco.                                                      |
| **(MSG-6) Tags HTML Sanitizadas como Texto Puro Inerte**                 | `sanitizarTextoMensagem` (função real)             | **PASSOU** | Strings com `<script>`, `<iframe>` e tags de estilo são mantidas como texto literal legível sem qualquer renderização de HTML ativo.                                |
| **(MSG-7) Botão Travado Anti-Duplo Clique e Retry com Mesma Chave**      | UI Mensageria + Chave de Idempotência              | **PASSOU** | 2º clique concorrente no botão de envio é bloqueado; retry após falha de rede mantém rigorosamente a mesma chave gerada para proteger a unicidade.                  |
| **(MSG-11) Gestão de Grupos: Validação no Servidor contra Não Gestores** | Regras Server-Side + Permissões RLS                | **PASSOU** | Apenas gestor/admin ou criador podem criar ou editar grupos; operador comum sem privilégio é expressamente bloqueado no servidor.                                   |
| **(MSG-12) Gestão de Membros: Imutabilidade de Histórico Pregresso**     | RLS de Destinatários + Snapshot de Mensagens       | **PASSOU** | Inclusão de membro novo não concede acesso a mensagens antigas; retirada de membro não altera destinatários congelados no envio original.                           |
| **(MSG-13) Grupo Inativo Bloqueia Novos Envios sem Exclusão Física**     | Hook de Integridade + Deleção Lógica               | **PASSOU** | Mensagem para grupo inativo é rejeitada pelo servidor; tentativa de DELETE físico é bloqueada com mensagem orientativa.                                             |
| **(MSG-14) Validação de Participantes Existentes sem Criar Contas**      | Validação no Servidor + Diretório Funcional        | **PASSOU** | Servidor confere cada membro contra IDs existentes; rejeita IDs arbitrários ou inválidos sem registrar usuários novos.                                              |
| **(MSG-15) Envio para Grupo com Retry Idempotente sem Duplicação**       | Idempotência Persistente + Envios a Grupos         | **PASSOU** | Retentativa de envio com mesma chave reutiliza registro único e não duplica destinatários ou mensagens no servidor.                                                 |
| **(MSG-16) Troca de Sessão Descarte de Voo e Preservação de Formulário** | Controle Sequencial + Estado UI                    | **PASSOU** | Troca de usuário invalida respostas atrasadas da sessão anterior e erro no envio preserva o texto digitado sem perda.                                               |
| **(MSG-8) Texto da Mensagem Escapado com Tags Inertes na UI**            | Renderização em texto puro (sem innerHTML)         | **PASSOU** | Interface renderiza texto via nós React puros; tags HTML literais são exibidas de forma inerte sem execução de script ou estilo externo.                            |
| **(MSG-9) Troca de Usuário Limpa Caixa e Preserva Texto em Erro**        | Ciclo de vida da UI + Gestão de Estados            | **PASSOU** | Troca de login limpa caixas e conversa ativa descartando voos assíncronos; conflito de payload no envio mantém o texto digitado no formulário para não haver perda. |
| **(MSG-10) Composição com Diretório Mínimo sem Dados Sensíveis**         | Diretório Funcional (`listarDiretorioUsuarios`)    | **PASSOU** | Diretório expõe somente id, nome, cargo e role funcional; ausência estrita de CPF, CNS, telefone ou dados de prontuário de pacientes.                               |
| **(APAC-1) Mascaramento LGPD em Listas e Snapshots de APAC**             | `mascararDadosPacienteApac` (função real)          | **PASSOU** | CPF (`123.***.***-09`) e CNS (`898 0012 **** 7890`) estritamente mascarados no payload cliente sem exposição de documentos crus.                                    |
| **(APAC-2) Rascunho PEP sem Autoautorização**                            | `gerarRascunhoApacDoPep` (função real)             | **PASSOU** | Pré-preenchimento herda paciente, PA/internação e CID ativo com `revisao_profissional_obrigatoria: true`, sem conceder autorização automática de alta complexidade. |
| **(APAC-3) Vínculo de APAC Anterior e Validação de Paciente**            | Regra transacional de continuidade                 | **PASSOU** | Modalidade continuidade exige número e rejeita APAC antecessora pertencente a paciente divergente.                                                                  |
| **(APAC-4) Consistência de Prazos de Validade SUS**                      | Validação de datas inicial e final                 | **PASSOU** | Período válido aprovado; prazo final anterior à data inicial rejeitado pelo validador.                                                                              |
| **(APAC-5) Idempotência de Envio, Retry e Conflito de Payload**          | Idempotência e detecção de conflito                | **PASSOU** | Retry com mesma chave reutiliza protocolo existente sem duplicidade; divergência de paciente com mesma chave dispara `IDEMPOTENCY_PAYLOAD_CONFLICT`.                |
| **(APAC-6) Troca de Paciente Descarta Respostas em Voo**                 | Sequenciamento `seqPacienteRef`                    | **PASSOU** | Troca assíncrona descarta dados pendentes de paciente anterior evitando contaminação cruzada de rascunhos.                                                          |
| **(TRANSP-1) Lotação Estrita por Trecho Ida/Volta**                      | `apurarOcupacaoViagem` (função real)               | **PASSOU** | Veículo com 4 lugares lota ida com 4 e mantém volta liberada com 2 reservas; novas reservas rejeitadas quando o trecho atinge a capacidade máxima.                  |
| **(TRANSP-2) Conflito de Escala de Veículo**                             | Hook de negócio / Regra de sobreposição            | **PASSOU** | Programação de viagem com veículo já alocado no mesmo intervalo ou com intersecção é rejeitada com conflito temporal.                                               |
| **(TRANSP-3) Conflito de Escala de Motorista**                           | Hook de negócio / Regra de sobreposição            | **PASSOU** | Programação de viagem com motorista escalado em outra rota no mesmo horário é bloqueada com conflito temporal.                                                      |
| **(TRANSP-4) Cálculo Rigoroso de Quilometragem**                         | `calcularKmViagem` (função real)                   | **PASSOU** | Rejeita valores negativos (`km_final < km_inicial` ou valores menores que 0) retornando `null` em vez de gerar distorções.                                          |
| **(TRANSP-5) Idempotência na Reserva de Vagas**                          | Idempotência e detecção de conflito                | **PASSOU** | Reenvio com mesma chave devolve reserva prévia sem duplicar passageiros; payload com passageiro divergente gera erro `IDEMPOTENCY_PAYLOAD_CONFLICT`.                |
| **(TRANSP-6) Fuso da Unidade vs UTC Persistido**                         | `formatarDataHoraViagemFuso` (função real)         | **PASSOU** | Timestamps UTC apresentados no fuso local da unidade (`America/Porto_Velho` = UTC-4); datas nulas renderizadas como 'Indisponível' sem gerar zeros espúrios.        |
| **(TRANSP-7) Lotação Composta e Acompanhantes em Vagas Separadas**       | `apurarOcupacaoViagem` (função real)               | **PASSOU** | Pacientes e acompanhantes ocupam vagas independentes por trecho (ida e volta); vagas canceladas são liberadas imediatamente do cômputo da capacidade.               |
| **(TRANSP-8) Agenda Sobreposta: Veículo vs Motorista**                   | Regra temporal de intervalo de viagens             | **PASSOU** | Detecta sobreposição concorrente de veículo e motorista separadamente e libera viagens em intervalos cronologicamente disjuntos sem colisão.                        |
| **(TRANSP-9) Transação, Retry e Cancelamento sem Exclusão Física**       | Idempotência e inativação lógica auditada          | **PASSOU** | Retry utiliza o mesmo registro idempotente sem duplicação; cancelamento inativa logicamente mantendo trilha de auditoria intacta sem deleção física.                |
| **(TRANSP-10) Fronteiras de Km: Deslocamento Zero e Grandes Distâncias** | `calcularKmViagem` (função real)                   | **PASSOU** | Odômetro idêntico (50000 -> 50000) apura exatamente 0 km; viagem de 2.350 km validada; odômetros negativos rejeitados sumariamente.                                 |
| **(TRANSP-11) Fronteira de Dia Civil e Virada de Meia-Noite no Fuso**    | `extrairDataCivilFuso`, `formatarDataHoraViagem`   | **PASSOU** | UTC 03:30Z classificado às 23:30 do dia 19/06 em Rondônia (UTC-4); UTC 04:30Z classificado às 00:30 do dia 20/06, sem contaminação pelo relógio UTC.                |
| **(TRANSP-12) Gestão de Frota e Sinalização de Manutenção**              | Regra de disponibilidade da frota                  | **PASSOU** | Veículo disponível liberado para escala; veículos marcados em manutenção ou inativos bloqueados com indicação do motivo auditado.                                   |

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

## 12. Painel de Gestão Hospitalar em Tempo Real (v0.0.43 / v0.0.44): Evidências e Limites Precisos

Na consolidação da versão 0.0.44 (e resolução da contradição apontada pelo Codex sobre agregação no servidor versus fallback paginado na v0.0.43), foram implementadas e conferidas as correções estritas de segurança, privacidade e integridade:

### 12.1. Evidências de Arquitetura e Regras Implementadas (v0.0.44)

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
   - `PAINEL-8 (v0.0.44)`: Falha/404/403/Timeout do endpoint agregado gera erro na função real `carregarDadosPainelGestao` e executa **zero chamadas** às coleções clínicas no cliente.
   - `PAINEL-9 (v0.0.44)`: Troca de sessão/perfil limpa dados anteriores do painel (sobretudo financeiro) e descarta requisição em voo da sessão anterior.

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

## 13. Bloco de Integridade dos Impressos Assistenciais (v0.0.45 e v0.0.46)

Em atendimento às diretrizes do Codex e à Parte 2 do Bloco de Impressos Assistenciais (v0.0.46), foram consolidadas as evidências por cenário com funções reais do sistema, bem como a declaração precisa e explícita dos limites operacionais e regulatórios.

### 13.1. Achados e Evidências Comprovadas por Cenário no Harness Local

Todos os cenários do bloco de impressos utilizam funções **reais** importadas do código da aplicação (`emitirImpressoAssistencial`, `retificarImpressoAssistencial` de `src/services/impressosAssistenciais.ts` e `renderizarTextoPuroImpresso` de `src/components/FolhaImpressoA4.tsx`), operando com **fixtures sintéticas estritamente locais em memória**, sem persistência nem gravação na base compartilhada e sem endpoints artificiais de teste.

1. **Cenário IMPRESSOS-1 — Reimpressão após Alteração da Origem:**
   - **Objetivo:** Garantir que alterações posteriores no cadastro do paciente ou no laudo de origem não modifiquem retrospectivamente os documentos assistenciais já emitidos.
   - **Achado / Evidência:** A emissão de um receituário via `emitirImpressoAssistencial` gravou o snapshot congelado com nome da paciente (_"Maria da Silva Santos Original"_), CPF (_12345678901_), CNS (_700123456789012_), data de nascimento, sexo e alergias (_"Dipirona Sódica"_). Posteriormente, o cadastro da paciente foi modificado para outro nome completo (_"Maria Silva Santos Oliveira Sobrenome Novo"_) e novas alergias severas adicionadas (_Penicilina e Sulfa_). Ao acionar a rotina de reimpressão pelo SAME, a folha do impresso projetou **exclusivamente os dados congelados do snapshot original** com a data e hora formal de emissão (`15/10/2026 14:30`) e tipo de registro `ato_original`. Nenhuma alteração cadastral posterior contaminou o impresso histórico.

2. **Cenário IMPRESSOS-2 — Vínculo Errado Rejeitado:**
   - **Objetivo:** Impedir a emissão de documentos clínicos quando o paciente informado discordar do paciente registrado no atendimento de Pronto Atendimento (PA) ou na internação hospitalar de referência.
   - **Achado / Evidência:** A validação do servidor (emulando as regras estritas do hook `impressos_assistenciais.pb.js`) barrou sumariamente a tentativa de emitir um impresso para o _Paciente Beta_ associando o identificador de atendimento de PA do _Paciente Alpha_, lançando a exceção formal: `"Inconsistência de vínculo: o atendimento de PA informado pertence a outro paciente."`. Do mesmo modo, a tentativa de emitir um Resumo de Alta com internação pertencente a outro paciente foi rejeitada com `"Inconsistência de vínculo: a internação informada pertence a outro paciente."`. A emissão legítima em que paciente e atendimento eram coerentes foi aprovada com sucesso.

3. **Cenário IMPRESSOS-3 — Retificação Preserva Original e Referencia o Vigente:**
   - **Objetivo:** Comprovar a imutabilidade do ato médico original e a rastreabilidade total de uma retificação documental.
   - **Achado / Evidência:** Um atestado original de afastamento de 2 dias emitido pelo Dr. Leonardo foi submetido à retificação clínica formal com `retificarImpressoAssistencial`, especificando a justificativa obrigatória (_"Ampliação do repouso para 5 dias devido a persistência de febre alta e piora respiratória na reavaliação"_). O registro original (#docOriginal) **permaneceu 100% íntegro e inalterado** (`tipo_registro='ato_original'`, `numero_retificacao=0`, 2 dias, autor Dr. Leonardo). O novo documento gerado (#docRetificado) recebeu ID único próprio, foi classificado como `tipo_registro='retificacao'`, registrou a referência explícita `documento_original`, foi indexado como `numero_retificacao=1`, preservou o motivo formal, identificou a nova autora médica e estabeleceu com clareza o ato retificado como o vigente (5 dias).

4. **Cenário IMPRESSOS-4 — Limpeza de Storage no Logout:**
   - **Objetivo:** Prevenir a permanência de dados clínicos confidenciais ou identificadores de pacientes em navegadores compartilhados após o encerramento da sessão assistencial.
   - **Achado / Evidência:** A rotina de sanitização do `AuthContext` percorre o armazenamento local eliminando sumariamente todas as chaves contendo termos clínicos sensíveis (`paciente`, `atendimento`, `impresso`, `clinico`, `receita`, `atestado`, `laudo`, `painel`, `prontuario`). Ao executar o logout, os dados de identificação e prontuário foram completamente eliminados do storage, permanecendo apenas parâmetros de configuração neutros (como tema de interface `config_tema_ui`).

5. **Cenário IMPRESSOS-5 — Texto Clínico com Tags HTML / Scripts Neutralizado:**
   - **Objetivo:** Assegurar que conteúdos clínicos contendo caracteres especiais, marcações arbitrárias ou tentativas de injeção de script sejam tratados como texto puro literal, sem qualquer execução na folha de impressão A4.
   - **Achado / Evidência:** Payloads contendo `<script>alert(1)</script>`, `<img src=x onerror=alert("XSS")><b onmouseover=evil()>Texto Clínico Negrito</b>` e `<iframe src="javascript:alert(2)"></iframe>` foram processados pela função real `renderizarTextoPuroImpresso` do componente `FolhaImpressoA4.tsx`. O componente utiliza renderização estrita de nós de texto em elementos `<div>` e `<p>` com estilo `whitespace-pre-wrap`, **sem qualquer uso de `dangerouslySetInnerHTML` ou avaliação de DOM dinâmico**. O texto foi impresso na íntegra como caracteres literais puros, neutralizando 100% de risco de execução de código malicioso.

---

### 13.2. Limitações Precisas e Declaração de Limites Técnicos (Avisos Mandatórios)

1. **Validação Visual Humana dos Impressos NÃO Realizada:**
   - O harness automatizado e os testes em memória comprovam a integridade dos dados e das regras lógicas. Contudo, **a diagramação estética final da folha A4, quebra de página física entre páginas 1 e 2, legibilidade das margens de 20mm/15mm para grampeamento, posicionamento do rodapé e fidelidade do cabeçalho institucional em diferentes navegadores e drivers de impressora dependem obrigatoriamente de validação visual humana direta**.
2. **Concorrência Real Sob Carga NÃO Comprovada por Simulação Local:**
   - Os testes executados no harness utilizam simulação isolada em memória. **A simulação local em memória NÃO constitui prova de concorrência real sob carga contra o banco PocketBase**. A concorrência em ambiente de produção envolve disputa de conexões HTTP, transações concorrentes do motor SQLite e latência de rede entre múltiplos profissionais emitindo documentos em paralelo, aspectos que exigem testes de estresse em infraestrutura dedicada.
3. **Ausência de Assinatura Digital Qualificada ou Homologação Externa:**
   - **NÃO HÁ ALEGAÇÃO DE ASSINATURA DIGITAL QUALIFICADA:** O sistema não possui integração com infraestrutura de chaves públicas ICP-Brasil (certificados A1/A3) nem carimbo do tempo qualificado, não atendendo aos requisitos plenos da Resolução CFM nº 1.821/2007 para dispensa total do papel. Os documentos gerados representam impressos com cabeçalho institucional e assinatura manuscrita requerida.
   - **SEM HOMOLOGAÇÃO EXTERNA:** O módulo de impressos opera como funcionalidade interna da aplicação de gestão municipal e **não possui homologação formal declarada perante órgãos reguladores de saúde ou conselhos de classe**.

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

---

## 14. Bloco Mensageria Interna Hospitalar (v0.0.47 e v0.0.48): Evidências e Limites Precisos

Na consolidação das Partes 1 (Backend/Serviço) e 2 (Interface de Usuário), o sistema entregou a governança completa da mensageria administrativa entre usuários e equipes do hospital (exigência da Cotação Item 01 e Guia de Módulos 7.4.6.2):

### 14.1. Evidências de Arquitetura e Regras de Segurança Implementadas

1. **Remetente Autoritativo e Regras de RLS Rígidas:**
   - O remetente é extraído imperativamente de `@request.auth.id` pelo hook server-side `mensageria_interna.pb.js`. Tentativas de forjar remetente são desfeitas no servidor.
   - Acesso restrito via RLS exclusivamente ao autor e aos destinatários do snapshot congelado (`@request.auth.id = remetente || destinatarios_resolvidos_ids ?~ @request.auth.id`). Terceiros recebem 403.
2. **Snapshot Congelado de Destinatários de Grupos:**
   - No envio para um grupo, a lista de membros e seus metadados (nome, cargo, role) é resolvida no ato e gravada de forma imutável em `destinatarios_resolvidos_ids` e `destinatarios_snapshot`. Novos membros que venham a ingressar no grupo posteriormente **NÃO** ganham acesso ao histórico de mensagens anterior.
3. **Idempotência Anti-Duplo Clique e Retentativa Segura em Falha:**
   - Botão de envio desabilitado com indicador de processamento ativo durante a transmissão, impedindo disparos duplicados por duplo clique.
   - Em falha de rede/timeout, a **mesma chave de idempotência (`idempotency_key`) é reutilizada** na retentativa, garantindo que o servidor identifique a operação e não grave mensagem duplicada.
   - Conflito de payload (`IDEMPOTENCY_PAYLOAD_CONFLICT`) preserva 100% do texto digitado no formulário da UI, emitindo aviso claro e opção de renovar chave.
4. **Exibição Estrita em Texto Puro com Tags HTML Inertes:**
   - Nenhuma mensagem utiliza `dangerouslySetInnerHTML` ou `innerHTML`. Tags arbitrárias (`<script>`, `<iframe>`, `<b>`, `<style>`) são tratadas como texto literal legível e inerte sem renderização ou execução de scripts.
5. **Troca de Usuário/Perfil com Limpeza Imediata e Descarte em Voo:**
   - Mudança de sessão/usuário limpa imediatamente o estado da caixa de entrada, enviadas e conversa aberta. Requisições assíncronas pendentes da sessão anterior são descartadas por controle sequencial (`seqCargaRef` e `usuarioSessaoRef`).
6. **Diretório Mínimo Funcional Paginado com Proteção LGPD:**
   - Rota `/backend/v1/mensageria/diretorio-usuarios` com suporte a paginação e busca segura (`page`, `perPage`, `busca`) expõe apenas `id`, `nome`, `cargo` e `role` de profissionais cadastrados, sem CPF, CNS, telefone ou dados clínicos de pacientes.
7. **Gestão de Grupos e Participantes com Validação Server-Side (v0.0.53):**
   - Criação, edição e inativação de grupos hospitalares disponíveis a administradores e gestores autorizados, com bloqueio no cliente e validação estrita no servidor (`pocketbase/hooks/mensageria_interna.pb.js`);
   - Participantes selecionados exclusivamente a partir de contas existentes no diretório; servidor valida cada ID e impede criação arbitrária de contas ou credenciais;
   - Regra de imutabilidade histórica do snapshot: membros adicionados posteriormente NÃO recebem acesso a mensagens anteriores do grupo; participantes retirados mantêm leitura das mensagens que receberam;
   - Inativação lógica com bloqueio no servidor e na UI para novos envios; exclusão física expressamente vedada por regra de banco e hook.
8. **Aviso de Governança Clínica:**
   - Mensagens internas **NÃO** substituem evolução médica, prescrição ou solicitação de exames, sendo vedado colar prontuário no canal.

### 14.2. Limites Honestos e Precisão das Evidências (Avisos Mandatórios)

1. **Simulação no Harness vs Concorrência Real:**
   - Os cenários `MSG-1` a `MSG-16` executados no harness local comprovam a integridade lógica com funções reais e fixtures sintéticas isoladas em memória.
   - **DECLARAÇÃO DE LIMITE TÉCNICO:** **A aprovação no harness local NÃO constitui prova de concorrência em ambiente distribuído multi-instância sob carga concorrente de rede ou sob stress de concorrência física no PocketBase**, por indisponibilidade de infraestrutura efêmera multi-nó no ambiente de build. O teste comprova a lógica de bloqueio de duplo clique, chaves de idempotência, RLS de autorização e descarte por controle sequencial em voo, mas concorrência de alta vazão real com transações concorrentes simultâneas em milissegundos requer homologação em ambiente isolado de carga.
2. **Validação Visual Humana Pendente:**
   - A percepção visual de contraste, fluidez da paginação, responsividade mobile dos cards e modais de composição dependem de homologação visual direta pelo operador humano.
3. **Sem Envio Externo:**
   - O sistema opera puramente como correio interno hospitalar, sem envio de e-mails, SMS, WhatsApp ou notificações push reais.

---

## 15. Transporte Sanitário Interno (v0.0.54 e v0.0.55): Evidências e Limites Precisos

Na consolidação do módulo Transporte Sanitário Interno (seção 7.4.4.2.a–b), foram implementadas as regras operacionais de viagens, vagas separadas por trecho, fuso local e isolamento entre perfis administrativos e clínicos:

### 15.1. Evidências de Arquitetura e Regras de Segurança Implementadas

1. **Estrutura de Coleções (Migração 0029):**
   - 7 coleções implantadas: `transporte_tipos_veiculo`, `transporte_veiculos`, `transporte_motoristas`, `transporte_rotas`, `transporte_destinos`, `transporte_viagens` e `transporte_passageiros`.
2. **Reserva Atômica de Vagas por Trecho (Ida / Volta) e Acompanhantes em Vagas Separadas:**
   - Endpoint server-side `POST /backend/v1/transporte/reservar-vagas` executado com transação no banco e proteção de concorrência;
   - Cada passageiro (paciente ou acompanhante) consome vagas de forma individualizada para ida e volta;
   - Excesso de capacidade no trecho bloqueia a transação sem criar registros órfãos.
3. **Isolamento entre Recepção e Justificativa Clínica (Sigilo Médico):**
   - O perfil `recepcao` visualiza estritamente os dados operacionais do transporte (origem, destino, horários, motorista, veículo, trechos solicitados e acompanhante);
   - A `justificativa_clinica` é ocultada da recepção e reservada aos profissionais autorizados (médico, enfermeiro, diretoria).
4. **Resiliência e Prevenção de Erros na UI (`TransporteView.tsx`):**
   - Controle de sequência `seqRef` ao trocar de paciente: requisições assíncronas em voo do paciente anterior são descartadas sumariamente, impedindo vinculação indevida de acompanhante ou vaga;
   - Idempotência com chave estável por reserva: em caso de conflito ou falha de rede, os dados digitados permanecem no formulário e o botão de reenvio reaproveita a mesma chave sem duplicar assentos no servidor.
5. **Cálculo Rigoroso de Quilometragem e Fuso Local:**
   - `calcularKmViagem` rejeita km negativo ou inconsistente como `null`;
   - Timestamps são persistidos em UTC e apresentados no fuso oficial da unidade em Rondônia (`America/Porto_Velho`).

### 15.2. Limites Honestos e Precisão das Evidências (Avisos Mandatórios)

1. **Simulação Lógica no Harness vs Concorrência Real:**
   - Os cenários `TRANSP-1` a `TRANSP-12` comprovam a lógica das funções reais em memória sem fixtures compartilhadas e sem dados reais persistidos;
   - **DECLARAÇÃO DE LIMITE TÉCNICO:** A aprovação no harness **NÃO constitui prova de concorrência distribuída real sob stress massivo** de múltiplos operadores simultâneos contra o SQLite do PocketBase. A proteção estrutural reside nas restrições de transação do endpoint server-side.
2. **Validação Visual Humana Pendente:**
   - A distribuição dos componentes na tela, a resposta tátil dos modais e a visualização dos cards de ocupação dependem de homologação visual direta pelo operador municipal.
3. **NÃO DECLARAR HOMOLOGAÇÃO:**
   - O módulo atende como primeira etapa da seção 7.4.4.2.a–b e não possui homologação hospitalar declarada.
4. **Escopo Parcial da Seção 7.4.4.2:**
   - Permanecem pendentes e fora desta entrega: processo formal de TFD, custos/diárias de viagem, manutenção detalhada de oficina, telemetria/rastreamento GPS e emissão automática de BPA do transporte.

---

## 16. Módulo TFD - Tratamento Fora do Domicílio (v0.0.56 e v0.0.57): Evidências e Limites Precisos

Na consolidação do módulo TFD (seção 7.4.4.2.e do PDF `Módulos`, p. 30), foram integradas a interface de gestão de processos, auditoria permanente de estados, viagens sanitárias vinculadas em lote, renovação rastreável e consolidação por localidade:

### 16.1. Evidências de Arquitetura e Contratos Entregues

1. **Gestão de Processos TFD (`TfdView.tsx` e `tfd.ts`):**
   - Numeração sequencial padronizada (`TFD-AAAA-NNNNN`) gerada transacionalmente;
   - Formulário com dados de abertura, paciente titular, profissional responsável, CID-10, tratamento solicitado, modalidade de atendimento e justificativa clínica fundamentada;
   - Trilha auditável completa (`tfd_historico_estados`) exibindo estado anterior, novo estado, data/hora, autor da sessão e justificativa obrigatória;
   - Estados suportados: `inconcluso`, `autorizado`, `enviado_para_estado`, `negado` e `cancelado` (terminal e imutável).
2. **Isolamento Clínico Rigoroso de Perfis (Sigilo Médico e LGPD):**
   - O perfil `recepcao` visualiza e opera dados logísticos e administrativos (número de processo, paciente, data de abertura, município de destino, modalidade de transporte e status);
   - O diagnóstico CID-10, a justificativa clínica detalhada e a justificativa de acompanhante são bloqueados e retornados como `[DADO CLÍNICO RESTRITO]` pelo hook server-side e mascarados na interface, preservando o sigilo médico exigido pelo SUS e CFM.
3. **Viagens Vinculadas e Planejamento de Lote com Revisão Humana:**
   - Criação de viagens vinculadas valida coerência estrita de paciente titular;
   - Planejamento de lote em duas etapas formais:
     1. _Prévia para Revisão Humana (`/previa`):_ confere disponibilidade de veículos e motoristas sem gravar nenhum registro no banco de dados;
     2. _Confirmação Explícita (`/confirmar`):_ acionada voluntariamente pelo usuário, criando as viagens no banco com separação rigorosa entre itens criados com sucesso e itens conflitantes (sem sucesso parcial oculto);
   - Idempotência suportada no nível do lote e no nível de cada item.
4. **Renovação Formal de Processo Concluído:**
   - Ação de renovação cria um novo processo com nova numeração sequencial interna;
   - O processo anterior é referenciado (`processo_anterior_ref`) e preservado integralmente no histórico;
   - Processos cancelados não podem ser renovados;
   - O novo processo inicia obrigatoriamente no estado `inconcluso` (sem reutilização de aprovação ou autoautorização clínica).
5. **Painel Agregado Interno por Localidade:**
   - Apuração de totais de processos, status e viagens vinculadas por município de destino (`obterTotaisAgregadosPorLocalidade`);
   - Atende estritamente sem mapas interativos, sem georreferenciamento e sem expor dados pessoais ou clínicos dos pacientes.
6. **Resiliência de UI e Padrão de Sequência:**
   - Troca de paciente descarta respostas assíncronas defasadas em voo via refs de sequência;
   - Falhas transitórias de conexão preservam o texto digitado nos formulários;
   - Reenvios utilizam a mesma chave de idempotência evitando duplicações.

### 16.2. Limites Honestos e Avisos Regulatórios Mandatórios

1. **Simulação em Memória vs Concorrência Massiva Real:**
   - Os cenários `TFD-1` a `TFD-8` no harness comprovam a lógica interna, isolamento de perfil, idempotência e descarte de voo em memória com funções reais;
   - **DECLARAÇÃO DE LIMITE TÉCNICO:** A aprovação em simulação local **NÃO constitui prova de concorrência massiva real sob carga estressada** de múltiplos operadores simultâneos contra a base de dados compartilhada do PocketBase.
2. **Validação Visual Humana Pendente:**
   - A ergonomia de uso, disposição dos modais e fluidez dos seletores na tela do operador municipal dependem de validação e homologação visual direta por profissionais humanos.
3. **NÃO DECLARAR HOMOLOGAÇÃO:**
   - O módulo atende como implementação de software no sistema hospitalar e **NÃO possui homologação formal** pelo Ministério da Saúde, DATASUS ou Secretaria Estadual de Saúde (SES/RO).
4. **Dependências Externas Explicitamente Parciais:**
   - _Financeiro / Diárias:_ A liquidação contábil de diárias a pacientes e acompanhantes e adiantamentos de despesas de viagem permanecem dependentes de integração com o sistema contábil/financeiro municipal;
   - _Transmissão ao Estado:_ O envio telemático automático de processos para o sistema estadual de regulação/TFD permanece no status formal `enviado_para_estado`, dependendo de disponibilização de webservices oficiais pela SES/RO.

---

## 17. Prontidão e Homologação do Módulo RIS — Radiologia e Imagem (v0.0.58 e v0.0.59)

### 17.1. Escopo Entregue e Evidências Técnicas

O módulo de **Radiologia e Diagnóstico por Imagem (RIS)** (ANEXO I Itens 313–316 e DOC-02 Seção 7.4.3.4) teve sua implementação concluída em duas fases estritamente auditadas:

1. **Fase 1 (Backend e Serviços - v0.0.58):**
   - Migração `pocketbase/migrations/0031_modulo_ris_radiologia.js`: coleções `ris_agendas`, `ris_modelos_laudo`, `ris_historico_transicoes` e expansão de campos RIS em `exames_solicitacoes`;
   - Hook server-side `pocketbase/hooks/ris_modulo.pb.js`: endpoints `/backend/v1/ris/requisicao-pep`, `/fila`, `/agendar`, `/reagendar`, `/cancelar`, `/exames/{id}/transicao`, `/exames/{id}/registrar-externo`, `/exames/{id}/aplicar-modelo`;
   - Camada de serviço cliente `src/services/ris.ts` com tipos estritos em `src/types/hospital.ts`.
2. **Fase 2 (Interface, Contratos Reais e Testes - v0.0.59):**
   - Interface de usuário rica `src/components/RisView.tsx` integrada à navegação principal (`NavigationBar.tsx` e `Index.tsx`) com controle de permissão por perfil;
   - Fila de exames paginada server-side e filtrável por status (`solicitado`, `agendado`, `realizado_aguardando_laudo`, `laudado`, `cancelado`), modalidade (`rx`, `tc`, `ecg`, `us`, `outro`), setor e tipo de execução (`interno` vs `externo`);
   - Agendamento com validação de conflito de horário/sala/profissional e emissão de comprovante seguro em snapshot (`comprovante_snapshot`), renderizado exclusivamente como texto puro sem innerHTML;
   - Reagendamento com inativação lógica da agenda anterior, justificativa obrigatória e vinculação com o novo agendamento; cancelamento formal com reabertura na fila;
   - Registro de exame realizado por prestador credenciado externo (nome, CNES, UF e observações) sem falsear execução interna do hospital municipal;
   - Aplicação de modelos de laudo versionados gerando exclusivamente rascunho de texto para revisão médica humana; sem liberação clínica automática (assinatura e emissão formal continuam através de `emitirLaudoExame` no PEP);
   - Descarte de respostas antigas em voo (`seqBuscaRef`, `seqAcaoRef`), retenção de texto digitado no formulário em caso de falha/conflito e mascaramento LGPD de CPF/CNS nas listagens;
   - Bateria de testes locais no harness (`src/tests/harnessTestes.ts`, cenários RIS-1 a RIS-7) com zero gravação na base compartilhada e 100% de aprovação.

### 17.2. Limites do Teste em Memória e Homologação Visual

1. **Concorrência Real vs. Simulação Local:**
   - Os testes de dupla reserva de sala/equipamento e idempotência de requisição foram validados em cenários síncronos em memória (`src/tests/harnessTestes.ts`).
   - A prova de concorrência transacional massiva em milissegundos contra o lock do PocketBase isolado permanece como limite do ambiente de QA sem banco concorrente ativo.
2. **Validação Visual Humana Pendente:**
   - A ergonomia das abas, visualização dos comprovantes impressos em A4 e fluidez das modais de agendamento/laudo dependem de validação e homologação visual direta por profissionais humanos e operadores da radiologia.

### 17.3. Pendências Explícitas e Itens Parciais (Sem Alegações Indevidas)

- **Editor Avançado com Desenho Gráfico (7.4.3.4.b):** **PARCIAL / PENDENTE** (O sistema entrega editor de texto descritivo e sumário de resultado com modelos; manipulação e anotação gráfica vetorial sobre o arquivo da imagem não foi implementada);
- **Controle de Filmes Radiológicos e Descarte de Químicos:** **PENDENTE** (Estoque hospitalar geral em `farmacia.ts` opera itens, mas controle dedicado de m² de película de RX e descarte não existe);
- **Entrega Formal de Filmes ao Paciente:** **PENDENTE** (Fluxo assistencial municipal opera com laudo impresso A4 e consulta digital no PEP);
- **Tabelas de Repasse Financeiro a Prestadores Externos:** **PARCIAL / PENDENTE** (Registro do prestador externo entregue; apuração contábil/financeira de honorários de terceiros depende de módulo de faturamento privado/complementar);
- **Integração DICOM / PACS e Certificação ICP-Brasil:** **EXPLICITAMENTE NÃO ALEGADO / FORA DE ESCOPO** (O sistema RIS não requer nem alega servidor PACS/DICOM ou certificado ICP-Brasil pago).

---

## 19. Editor Formatado de Laudos RIS (v0.0.60 e v0.0.61) — Estado Parcial e Prontidão da Parte 1

Em atendimento à Missão do Codex para a conclusão dos três itens restantes da Parte 1 do RIS, consolida-se o estado verificado e os limites estritos da entrega:

### 19.1. Estado Confirmado da Migração 0032 no Backend

- **Identificação da Migração:** `0032_editor_formatado_laudos_ris.js`
- **Estado no Backend (Confirmado via `list_migrations` e `db_describe_object`):** **APLICADA**
- **Estruturas Verificadas no Banco:**
  1. Criação da coleção `ris_imagens_anexas` (campos: `exame`, `laudo_versao`, `arquivo`, `legenda`, `ordem`, `mime_type`, `tamanho_bytes`, `largura_px`, `altura_px`, `usuario_upload`, `ativo`, `metadata_json`);
  2. Adição de colunas na coleção `exames`: `conteudo_formatado_rascunho` (text), `config_editor_rascunho` (json), `versao_conteudo_rascunho` (number), `autor_rascunho_id` (relation users), `data_ultimo_rascunho` (date);
  3. Adição de colunas na coleção `laudos_versoes`: `conteudo_formatado` (text), `config_editor` (json);
  4. Adição de colunas na coleção `ris_modelos_laudo`: `conteudo_formatado` (text), `config_editor` (json).

### 19.2. O que Está Implantado e Verificado na Parte 1

1. **Contrato de Rotas no Hook Server-Side (`pocketbase/hooks/ris_modulo.pb.js` - implantado em v0.0.60):**
   - `POST /backend/v1/ris/exames/{id}/salvar-rascunho`: Sanitização no servidor, verificação de concorrência com `versao_esperada` disparando status HTTP 409 (`ConflitoConcorrenciaEdicaoError`), persistência do rascunho e metadados de autoria;
   - `POST /backend/v1/ris/exames/{id}/publicar-laudo`: Idempotência via `idempotency_key`, congelamento de snapshot da Versão 1 em `laudos_versoes`, transição do status do exame para laudado/liberado com autoria médica autoritativa extraída da sessão;
   - `POST /backend/v1/ris/exames/{id}/retificar-laudo`: Criação de nova versão (V2, V3...) vinculada à anterior (`versao_anterior_id`), mantendo versões emitidas 100% imutáveis; exigência de justificativa clínica (mínimo 5 caracteres);
   - `GET /backend/v1/ris/exames/{id}/previa-laudo`: Retorno sanitizado em layout oficial com dados do paciente, exame, histórico de versões e imagens anexas.
2. **Serviço Cliente TypeScript (`src/services/ris.ts`):**
   - Funções tipadas: `salvarRascunhoLaudoRIS`, `publicarLaudoRIS`, `retificarLaudoRIS`, `obterPreviaLaudoRIS`;
   - Tratamento de status 409 com classe `ConflitoConcorrenciaEdicaoError` contendo `versaoAtualServidor` e `versaoEsperadaCliente`;
   - Implementação de descarte por sequência `seqRef` (`RespostaSessaoObsoletaError`) impedindo contaminação assíncrona entre sessões ou exames;
   - Transmissão do token Bearer da sessão ativa e suporte a idempotência persistente.
3. **Bateria de Testes Locais com Funções Reais (`src/tests/harnessTestes.ts` - Cenários RIS-8 a RIS-14):**
   - `RIS-8`: Sanitizador real servidor remove `<script>`, `<iframe>`, `<object>`, `<embed>`, comentários e handlers `on*`;
   - `RIS-9`: Sanitizador neutraliza URLs perigosas (`javascript:`, `data:`) e substitui imagens externas não autorizadas por mensagem de segurança, preservando imagens anexas internas;
   - `RIS-10`: Sanitizador preserva tags clínicas ricas (`h1-h6`, `strong`, `em`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `ul`, `ol`, `li`, checklists `input[type=checkbox]`);
   - `RIS-11`: Regra de perfil e vínculo bloqueia anônimos, recepcionistas, enfermeiros e médicos inativos, exigindo perfil Médico/Radiologista ativo;
   - `RIS-12`: Concorrência otimista com versão esperada dispara erro 409 em descompasso de versões sem sobrescrever rascunho mais recente;
   - `RIS-13`: Retificação gera nova versão relacionada sem alterar a integridade da Versão 1 emitida e liberada (snapshot idêntico byte a byte);
   - `RIS-14`: Idempotência com reenvio idêntico retorna resposta cacheada e desvio de payload com mesma chave dispara erro de conflito 409.

### 19.3. O que NÃO Foi Provado (Declaração Honesta de Limites)

- **Segurança em Runtime:** O fato de o hook ter sido implantado com sucesso (deploy ok) comprova que o código é sintaticamente válido no JSVM do Goja/PocketBase, mas **não substitui** auditoria dinâmica de penetração contra vetores complexos de bypass de sanitização sob requisições HTTP reais malformadas;
- **Concorrência Real Distribuída:** Os testes no harness são locais e determinísticos em memória. **A simulação não comprova concorrência massiva real** sob múltiplos nós ou processos simultâneos disputando locks no SQLite do PocketBase;
- **Validação Visual Humana:** A formatação gráfica e visual dos laudos depende de inspeção visual humana direta.

### 19.4. Estado do Editor Formatado RIS (v0.0.63 - Restauração e Verificação Incremental)

Na versão v0.0.63, a compilação do editor formatado foi plenamente restaurada após correção do import do PocketBase (`import pb from '@/lib/pocketbase/client'`) e alinhamento estrito dos tipos da interface (`ItemFilaRIS`, sem propriedades inexistentes como `status`, `data_laudo`, `codigo_acesso`, `data_realizacao` ou `responsavel_laudo_nome`). Todos os passos de lint, tsc e build passaram limpos com sucesso.

#### Matriz Recurso por Recurso — DOC-02 Seção 7.4.3.4.b.i–iii:

| Item / Subseção           | Requisito da Especificação                                                                                     | Situação                               | Evidência / O que foi Comprovado                                                                                                                                                                                       | O que Permanece Parcial ou Não Provado                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **7.4.3.4.b.i**           | **Editor de Texto:** Negrito, itálico, sublinhado, grifo, alinhamento, recuo, fontes, cores e quebra de página | **VERIFICADO (UI + Sanitizador Real)** | Comandos `execCommand` operacionais na UI; sanitizador real do servidor (`sanitizarHtmlServidorRIS`) testado e aprovado em testes unitários locais (RIS-8 a RIS-10, RIS-15, RIS-16), preservando formatação sem perda. | Validação estética e visual humana de layout sob impressão física em papel.                   |
| **7.4.3.4.b.i**           | **Estruturas Clínicas:** Tabelas, checklists, campos Box, Lista e Flutuante                                    | **VERIFICADO (UI + Sanitizador Real)** | Inserção funcional via barra de ferramentas e sanitização preservando classes semânticas (`ris-campo-box`, `ris-campo-lista`, `ris-checklist-item`) e tabelas no round-trip (RIS-10, RIS-15).                          | Definição de layout visual customizado pelo usuário por arrastar-e-soltar (drag-and-drop).    |
| **7.4.3.4.b.i**           | **Manipulação / Anotação Gráfica Vetorial sobre Imagens:** Desenho sobre imagens radiológicas                  | **NÃO IMPLEMENTADO / FORA DE ESCOPO**  | Excluído explicitamente conforme diretriz de escopo do sistema hospitalar; não alegada conformidade.                                                                                                                   | Ferramenta de desenho vetorial radiológico não implementada.                                  |
| **7.4.3.4.b.ii**          | **Modelos de Laudo e Pré-definições:** Inserção de modelos padronizados versionados                            | **VERIFICADO (UI + Backend)**          | Aplicação de modelo como rascunho para revisão humana obrigatória sem sobrescrever laudo já liberado (RIS-6); catálogo versionado em `ris_modelos_laudo`.                                                              | Criação de novos modelos durante a digitação rápida sem sair da tela.                         |
| **7.4.3.4.b.iii**         | **Prévia e Impressão A4:** Visualização de folha A4 com cabeçalho municipal e aviso legal                      | **VERIFICADO (UI + Serviço)**          | Modal de prévia com snapshot estruturado em folha A4 (`obterPreviaLaudoRIS`), dados da Prefeitura de Mirante da Serra e aviso explícito de ausência de ICP-Brasil (RIS-21).                                            | Teste em impressora física de rede.                                                           |
| **7.4.3.4.b.iii**         | **Retificação Imutável e Histórico de Versões:** Preservação da versão 1 e nova versão vinculada               | **VERIFICADO (Lógica + UI)**           | Retificação cria versão incremental (V2) referenciando a anterior (`versao_anterior_id`) exigindo justificativa clínica (>= 5 caracteres), com snapshot da V1 100% inalterado (RIS-13, RIS-19).                        | Comparação lado a lado (diff visual gráfico de texto) de duas versões na tela.                |
| **Contrato Concorrência** | **Tratamento de 409 (Versão Esperada) e SeqRef:** Sem perda de texto digitado                                  | **VERIFICADO (Lógica + UI)**           | Erro `ConflitoConcorrenciaEdicaoError` (409) mantém o buffer em memória intacto; `seqRef` descarta respostas de requisições obsoletas na troca rápida de paciente (RIS-12, RIS-17, RIS-18).                            | Teste com banco PocketBase com dezenas de conexões concorrentes simultâneas de alta latência. |

#### Declaração de Distinção Técnica entre Funções Reais e Mocks:

- **Funções e Classes Reais Exercitadas:** `sanitizarHtmlServidorRIS`, `ConflitoConcorrenciaEdicaoError`, `RespostaSessaoObsoletaError` e contratos de dados em `src/services/ris.ts` são código real executado diretamente nos testes RIS-8 a RIS-22.
- **Mocks Utilizados:** As chamadas de rede para o PocketBase (`pb.collection`, rotas HTTP do backend) foram mockadas deterministamente no harness para permitir execução offline segura sem poluir a base compartilhada de testes com fixtures ou registros fictícios.
- **Sem LocalStorage Clínico:** O laudo em edição fica estritamente na memória React da sessão; nenhuma informação clínica confidencial é armazenada em `localStorage`.

---

## 18. Referência Cruzada com as Fontes de Escopo e Matriz de Conformidade (v0.0.59)

Em complemento a este relatório de prontidão e homologação técnica, consulte os documentos formais consolidados:

- **`docs/FONTES_ESCOPO.md` (NOVO):** Registro documental completo dos **três PDFs recebidos em anexo nesta conversa e lidos em modo texto**:
  1. `modulos-modelo-base-f0a3f.pdf` (27 páginas, ANEXO I – Teste de Conformidade, itens 1 a 474);
  2. `modulos-1-ea88d.pdf` (45 páginas, ANEXO I – Módulos de Especificação Técnica Funcional, seções 7.4.1 a 7.4.9);
  3. `cotacao-sistema-hospitalar-9345d.pdf` (2 páginas, pré-cotação oficial da Secretaria Municipal de Saúde de Mirante da Serra–RO).
     O documento persiste trechos textuais, numeração de itens, subseções e páginas para eliminar a necessidade de novos uploads de anexos no fluxo de trabalho.

- **Entrega Formal de Laudos e Resultados RIS (7.4.3.4.c.i / v0.0.65 Parte 2 Concluída):**
  - **Parte 1 (v0.0.64):** Migração imutável `0033_entrega_formal_laudos_ris.js` (update/delete rules nulos), rotas POST/GET `/backend/v1/ris/entregas` em `pocketbase/hooks/ris_modulo.pb.js` com validação de laudo liberado, vínculo exame→paciente→versão, idempotência 200/409, erro 409 `CONFLITO_VERSAO_RETIFICADA` com versão vigente e motivo, retificação de comprovante por novo evento vinculado e projeção de metadados administrativos no GET;
  - **Parte 2 (v0.0.65):** Interface de Usuário integrada ao RIS existente (`src/components/RisView.tsx`, `TabEntregasRIS.tsx`, `ModalEntregaLaudoRIS.tsx`, `ReciboSanitizadoEntregaA4.tsx`):
    1. Fluxo do operador autorizado para registrar entrega presencial/interna com conferência humana documental obrigatória (nome, RG/CPF/matrícula e modalidade);
    2. Prévia do comprovante identificando exame, paciente e versão exata, com alerta crítico visível caso haja retificação posterior à versão sendo entregue, permitindo troca imediata para a versão vigente ou confirmação explícita de ciência;
    3. Visualização e impressão de recibo A4 sanitizado (snapshot puro sem campos clínicos, fuso da unidade `America/Porto_Velho`, UTC persistido e aviso de limites legais sem ICP-Brasil);
    4. Aba de entregas com sub-visões de laudos liberados pendentes e comprovantes emitidos com filtros por período/unidade/paciente e paginação; isolamento de privacidade da recepção garantido (apenas metadados administrativos, sem corpo clínico);
    5. Resiliência: 409 preserva formulário e oferece revisão humana; reenvio mantém a mesma chave de idempotência; troca de sessão/seleção descarta respostas em voo (`seqRef`); sem armazenamento de dados clínicos em localStorage; sem autosalvar; sem canais externos (SMS/email).
  - **Limites Operacionais Reais:** Concorrência multi-nó distribuída não é inferida no ambiente isolado (testada localmente via idempotência e locks de dados); validação visual humana presencial em balcão físico permanece pendente de homologação em campo.

- **`docs/MATRIZ_CONFORMIDADE.md` (Revisão Material v0.0.47):** Reconciliação rigorosa item a item contra as fontes reais, corrigindo distorções prévias:
  - **Portal do Paciente Web:** Reclassificado como requisito exigido na Cotação (Item 01) e DOC-02 (7.4.4.3.b.iv), não se resumindo aos itens amarelos 404/427; requer login próprio do cidadão com mascaramento LGPD;
  - **Mensageria Interna:** Reclassificada como requisito exigido na Cotação ("envio de mensagens entre usuários e ou grupos") e itens 419/421, planejada como código interno sem envio externo;
  - **Cadastros Gerais e Auxiliares:** Mapeados item a item do 1 ao 36 com distinção entre Atende, Parcial, Não Atende, Excluído e Não Verificado, afastando alegações genéricas de conformidade sem evidência;
  - **SAMU / RIS / TFD / APAC / Nutrição:** Mapeados como códigos internos implementáveis no repositório, sem inferência de dependências externas obrigatórias (como PACS ou telemetria) não exigidas pelo texto;
  - **5 Próximos Blocos de Código Interno:** Priorização clara de Mensageria Interna, Portal do Paciente Web, Módulo APAC, Transporte/TFD e RIS (editor de laudos), com dependências externas (ICP-Brasil, webservices federais, homologações) devidamente isoladas.

- **Serviço de Nutrição e Dietética (SND - Requisito 7.4.3.5 / v0.0.70 Auditoria de Integridade e Bloqueio de Bypass Concluídos):**
  - **v0.0.66 (Parte 1 Base):** Migração `0034_modulo_snd_nutricao_base.js` (`snd_cardapio_refeicoes`, `snd_dietas_catalogo`, `snd_prescricoes_dieteticas`, `snd_distribuicoes_refeicoes`), hook `snd_nutricao.pb.js` com imutabilidade física e endpoint `/backend/v1/snd/mapa-cozinha`;
  - **v0.0.67 (Parte 2 UI Base):** `src/components/SndView.tsx`, `CatalogoSndTab.tsx`, `PrescricaoSndTab.tsx`, `MapaCozinhaSndTab.tsx`, `RelatoriosSndTab.tsx`;
  - **v0.0.68 (Parte 1 Integração Almoxarifado/Estoque - 7.4.3.5.c.i p23):**
    1. **Migração 0035 (`0035_composicoes_e_baixas_estoque_snd.js`):** Coleções `snd_composicoes_refeicoes` e `snd_baixas_estoque_distribuicoes`;
    2. **Hook Server-side (`pocketbase/hooks/snd_nutricao.pb.js`):** Rota transacional `/backend/v1/snd/distribuicao/confirmar-com-baixa` e estorno compensatório `/backend/v1/snd/baixa/estornar`;
    3. **Tipos e Serviço Cliente (`src/types/hospital.ts` e `src/services/snd.ts`)**;
    4. **Harness de Testes Locais (`src/tests/harnessTestes.ts`):** Casos SND-11 a SND-16;
  - **v0.0.69 (Parte 2 UI, Testes e Documentação - 7.4.3.5.c.i p23):**
    1. `ModalFichaComposicao.tsx`, prévia no `MapaCozinhaSndTab.tsx`, estorno em `ModalConsumoEstornoSnd.tsx` e testes SND-17 a SND-21;
  - **v0.0.70 (Auditoria de Integridade e Bloqueio de Bypass SND / RIS):**
    1. **Migração 0036 (`0036_regras_integridade_snd_ris_bypass.js`):**
       - Bloqueio total de escrita direta via API cliente em `snd_baixas_estoque_distribuicoes` (`createRule = null`, `updateRule = null`, `deleteRule = null`);
       - Bloqueio total de escrita/edição/deleção direta de recibos em `ris_entregas_laudos` (`createRule = null`, `updateRule = null`, `deleteRule = null`);
       - Bloqueio de exclusão em `snd_distribuicoes_refeicoes` (`deleteRule = null`);
    2. **Hooks Server-Side com Bloqueio de Bypass e Preservação de Histórico:**
       - `pocketbase/hooks/snd_nutricao.pb.js` (`onRecordCreate` e `onRecordUpdate`): Proíbe criar ou alterar diretamente distribuição para status 'distribuido' fora do endpoint transacional `/backend/v1/snd/distribuicao/confirmar-com-baixa` (`OPERAÇÃO_NEGADA_BYPASS`); impede baixa retroativa ou mutação em registros legados/já distribuídos (`OPERAÇÃO_NEGADA_IMUTABILIDADE`);
       - `pocketbase/hooks/exames_laudos.pb.js` (`onRecordCreate` em `laudos_versoes`): Garante obrigatoriedade de sessão autenticada e derivação compulsória do autor, paciente e versão, impedindo falsificação pelo payload do cliente;
       - `pocketbase/hooks/ris_modulo.pb.js` (`/backend/v1/ris/entregas`): Recibos de entrega criados exclusivamente no endpoint com derivação da sessão, snapshot de conferência e imutabilidade completa;
       - `pocketbase/hooks/snd_nutricao.pb.js` (`/backend/v1/snd/mapa-cozinha`): Projeção sanitizada estrita para a cozinha, garantindo ausência total de diagnóstico, CID, prontuário detalhado ou corpo clínico em list/detail/expand ou rota alternativa;
    3. **Testes no Harness (`src/tests/harnessTestes.ts`):** Casos AUDIT-01 a AUDIT-04 exercitando as funções e regras reais (bloqueio de bypass SND, rollback composto, estorno duplo rejeitado, autor/versão RIS não falsificáveis, isolamento LGPD da cozinha);
    4. **Limites Honestos e Parciais Explícitos:**
       - Testes unitários/locais provam os contratos e regras de serviço sob mocks/adaptadores, mas NÃO provam concorrência real multi-nó sob carga massiva distribuída (nenhuma topologia de cluster multi-nó é afirmada sem infraestrutura provada);
       - Assinatura digital ICP-Brasil (7.4.3.5.b.ii) permanece pendente de autoridade certificadora credenciada e infraestrutura governamental;
       - Validação visual e ergonômica em operação hospitalar real permanece pendente de homologação assistencial humana.
