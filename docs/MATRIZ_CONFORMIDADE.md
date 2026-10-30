# Matriz de Conformidade Documental e Rastreabilidade do Sistema Hospitalar

**Projeto:** Sistema Integrado de Gestão Hospitalar Municipal (SGH Municipal - Mirante da Serra / RO)  
**Versão Documental:** 0.0.47 (Revisão Material com Fontes Reais Recebidas)  
**Data da Reconciliação:** 30/10/2026 (Horário Local: America/Porto_Velho / UTC-4)  
**Stack Técnica:** React 19 + TypeScript + Tailwind CSS / Skip Cloud PocketBase v0.36  
**Finalidade:** Reconciliação documental única entre os requisitos de referência extraídos diretamente dos três documentos oficiais recebidos em anexo, o escopo deliberado pelo município/Codex e os artefatos de código, backend, migrações e testes efetivamente existentes no repositório.

---

## 1. Fontes de Origem Recebidas e Persistidas

Ao contrário de versões preliminares em que os documentos físicos constavam como ausentes, **os três arquivos foram recebidos em anexo nesta conversa, lidos integralmente em modo texto e tiveram suas citações e páginas persistidas em `docs/FONTES_ESCOPO.md`**:

| ID Documento | Arquivo / Asset Local                             | Extensão / Páginas | Órgão / Título Oficial                                                                                                  | Status no Repositório |
| :----------- | :------------------------------------------------ | :----------------: | :---------------------------------------------------------------------------------------------------------------------- | :-------------------: |
| **DOC-01**   | `src/assets/modulos-modelo-base-f0a3f.pdf`        |     27 páginas     | **ANEXO I – SETORES / TESTE DE CONFORMIDADE E CRITÉRIOS OBRIGATÓRIOS PARA AVALIAÇÃO / PROVA DE CONCEITO** _(474 itens)_ |  **RECEBIDO E LIDO**  |
| **DOC-02**   | `src/assets/modulos-1-ea88d.pdf`                  |     45 páginas     | **ANEXO I - MÓDULOS DE ESPECIFICAÇÃO TÉCNICA FUNCIONAL** _(Seções 7.4.1 a 7.4.9)_                                       |  **RECEBIDO E LIDO**  |
| **DOC-03**   | `src/assets/cotacao-sistema-hospitalar-9345d.pdf` |     2 páginas      | **PREFEITURA MUNICIPAL DE MIRANTE DA SERRA / PRÉ–COTAÇÃO DE PREÇOS** _(Item 01, 12 meses)_                              |  **RECEBIDO E LIDO**  |

---

## 2. Pesquisa Externa Enxuta: Sistemas de Referência

Conforme diretriz do Codex, foi realizada consulta às fontes oficiais públicas acessíveis em modo texto:

### 2.1. G-HOSP (TWI Consultoria)

- **URL Oficial Acessada:** `https://www.twiconsultoria.com.br/sistemas/g-hosp`
- **Distinção Rígida:**
  - **Material Comercial Lido:** Módulos listados = Internação, Centro Cirúrgico, Faturamento, Farmácia, Prontuário, Controle de Leitos. Funcionalidades descritas: SAME, Internação/Alta, Centro Cirúrgico, PEP (Prontuário Eletrônico), Faturamento SUS (geração e envio de AIH e SIA/SUS, controle de glosas) e Farmácia Hospitalar. O site declara conformidade com ANVISA, CFM, TISS e Ministério da Saúde.
  - **Demonstração Efetivamente Vista:** **NENHUMA**. A demonstração interativa ou em vídeo é restrita a solicitação comercial prévia (`https://www.twiconsultoria.com.br/contato`). Nenhum fornecedor foi contatado e nenhum dado municipal foi enviado.
- **Impacto no Projeto:** O G-HOSP serve apenas como referência conceitual de módulos hospitalares já cobertos pelo protótipo. Nenhum módulo novo foi criado.

### 2.2. Salute / Sofis Tecnologia (Hipótese de Pesquisa)

- **URL Institucional:** `https://sofis.com.br/solucao/salute/`
- **Status do Projeto:** Permanece estritamente como **HIPÓTESE DE PESQUISA**, sem equivalência confirmada pelo usuário ou pelo Codex com o termo "Salutem".
- **Distinção:** Material institucional de texto consultado; **demonstração efetivamente vista: NENHUMA**. Nenhum contato realizado.

---

## 3. Regras de Classificação e Legenda de Conformidade

Para evitar falsas conformidades ("não classificar módulo inteiro como atendido por ter uma tela"), cada item ou seção é classificado em uma das seis categorias formais:

1. **ATENDE:** Requisito implementado de ponta a ponta com interface de usuário (`src/components/`), serviço/regras cliente (`src/services/`), persistência/regras backend (`pocketbase/migrations/` e/ou `pocketbase/hooks/`) e cenário automatizado no harness de testes (`src/tests/harnessTestes.ts`).
2. **PARCIAL:** Funcionalidade possui tela, serviço ou schema funcional no protótipo, mas apresenta lacunas operacionais, falta de integração automatizada ou cobertura de teste apenas documental/parcial.
3. **NÃO ATENDE:** Funcionalidade não implementada no sistema (ausência de tela, serviço ou coleção dedicada), mas de desenvolvimento interno viável.
4. **EXCLUÍDO:** Requisito deliberadamente retirado do escopo municipal por decisão expressa do usuário/Codex (os 69 itens amarelos do guia, vacinas/imunização integral, georreferenciamento, etc.).
5. **DEPENDE DE INTEGRAÇÃO OU HOMOLOGAÇÃO:** Funcionalidade cuja conclusão legal depende de certificação externa (ex: ICP-Brasil), homologação em softwares federais (ex: Validador SIHD/BPA Magnético DATASUS) ou transmissão para webservices governamentais fechados (SINAN, CADSUS, e-SUS).
6. **NÃO VERIFICADO:** Requisito cujo código ou schema ainda não passou por auditoria de detalhe item a item (nunca presumir conformidade sem evidência auditada).

---

## 4. Preservação Rígida dos 69 Itens Amarelos Excluídos

Os 69 itens marcados em amarelo no guia de referência ANEXO I (DOC-01, 27 páginas) permanecem **EXATAMENTE** como registrados e excluídos pelo usuário:

| Faixa / Itens Excluídos | Quantidade | Seção do Guia / Título Excluído                                                                                            | Justificativa / Deliberação do Projeto                                                                                            |
| :---------------------- | :--------: | :------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| **21, 24**              |     2      | Cadastros Gerais (Áreas da família e famílias nas microáreas)                                                              | Atenção Primária/ACS fora do escopo hospitalar.                                                                                   |
| **40, 57, 59, 60, 73**  |     5      | Atendimento Ambulatorial Básico / Odonto / Coletivo / ESF                                                                  | Foco hospitalar e pronto atendimento, não UBS/ESF.                                                                                |
| **110**                 |     1      | Pronto Atendimento - Último atendimento APS com microárea                                                                  | Urgência hospitalar não depende de microárea territorial.                                                                         |
| **190 a 198**           |     9      | Programa Saúde da Família (PSF / e-SUS APS)                                                                                | Módulo PSF integralmente fora do escopo hospitalar.                                                                               |
| **217 a 225**           |     9      | Imunização e Controle de Vacinas                                                                                           | **Imunização/Vacinas inteira FORA DE ESCOPO** (decisão permanente: nada de vacinas no app).                                       |
| **280**                 |     1      | Farmácia - Relatório nominal de pessoas que retiraram medicamentos/materiais                                               | Item amarelo do guia; farmácia opera por dispensação por atendimento/leito.                                                       |
| **331**                 |     1      | Vigilância Sanitária - Georreferenciamento de famílias cadastradas                                                         | Sistema opera sem georreferenciamento (mapas/coordenadas GPS excluídos).                                                          |
| **374 a 389**           |     16     | ACS Mobile / Tablets de Agentes Comunitários de Saúde                                                                      | Exclusão do aplicativo de ACS **NÃO exclui tablets hospitalares da seção 7.4.9**.                                                 |
| **404, 427**            |     2      | Gabinete Prefeito (404: Famílias Cadastradas x Visitadas) e Transparência Farmácia (427: busca livre de estoque no portal) | Itens amarelos específicos fora de escopo. **Atenção:** não exclui o Portal do Paciente web nem a visão web do gestor da cotação. |
| **430 a 452**           |     23     | Sala de Situação da Atenção Primária / Territorial                                                                         | Sala de Situação APS excluída; substituída pelo Painel de Gestão Hospitalar interno.                                              |
| **TOTAL**               |   **69**   | **Itens Amarelos Excluídos Confirmados**                                                                                   | **Todos classificados rigorosamente como EXCLUÍDO.**                                                                              |

_Nota de Limite Geográfico e de Imunização:_

- **Imunização/Vacinas:** Inteiramente fora do escopo do sistema hospitalar municipal.
- **Georreferenciamento:** Todos os itens de mapa espacial, coordenadas GPS ou triangulação (itens 70–73, 328–332, 442, 449) estão **FORA DO ESCOPO**.

---

## 5. Reclassificação Material dos Requisitos Críticos (Correção v0.0.47)

### 5.1. Portal do Cidadão / Área do Paciente Web

- **Erro na v0.0.46:** A versão anterior resumiu o portal aos itens 404 e 427 e declarou o módulo inteiro como "EXCLUÍDO / NÃO ATENDE", justificando isolamento de rede interna.
- **Correção Material:**
  - O item 404 (p. 21) é apenas um gráfico municipal de famílias visitadas por ACS (amarelo, excluído).
  - O item 427 (p. 22) é apenas a consulta pública aberta com autocomplete do estoque geral da farmácia municipal no portal de transparência (amarelo, excluído).
  - **A Cotação Oficial (DOC-03, p. 2) EXIGE expressamente:** _"O SISTEMA DEVE DISPONIBILIZAR AO PACIENTE VISUALIZAR SEUS ATENDIMENTOS REALIZADOS (VIA WEB) / AGENDAMENTOS DE CONSULTAS E PROCEDIMENTOS / RESULTADOS DE EXAMES / MEDICAMENTOS DISPENSADOS, ATRAVÉS DE ACESSO WEB."_
  - **A Especificação Técnica (DOC-02, Seção 7.4.4.3.b.iv, p. 31) detalha:** _"Portal/Área do Cidadão (Acesso Restrito): Módulo de consulta individual onde o cidadão, mediante autenticação segura (via Gov.br, CPF/Senha ou CNS), poderá visualizar seu histórico de solicitações e sua posição exata na fila de espera."_
  - **Nota de Proteção de Dados (LGPD - 7.4.4.3.b.iii, p. 31):** O acesso é individualizado para o próprio paciente com autenticação restrita, exigindo mascaramento de dados sensíveis e proibindo consulta aberta sem login.
  - **Classificação Atual:** **NÃO ATENDE (Requisito Exigido da Cotação / Código Interno Planejado)**. O protótipo atual possui a visão interna do prontuário SAME (`ProntuarioSAMEView.tsx`), mas não possui a rota/portal web restrita para auto-consulta do munícipe.

### 5.2. Mensageria Interna entre Usuários e Grupos

- **Erro na v0.0.46:** A versão anterior classificou como "NÃO ATENDE" e sugeriu manter comunicação apenas via prontuário/SAME para valor jurídico, contornando a exigência do edital.
- **Correção Material:**
  - **A Cotação Oficial (DOC-03, p. 1) EXIGE expressamente:** _"O SISTEMA DEVE PERMITIR O ENVIO DE MENSAGENS ENTRE USUÁRIOS E OU GRUPOS DO SISTEMA; O SISTEMA DEVE POSSUIR CONTROLE DE AVISOS AOS PACIENTES QUANDO BUSCAREM ATENDIMENTO; O SISTEMA DEVE POSSUIR CONTROLE DE AVISOS AOS USUÁRIOS DO SISTEMA."_
  - **O ANEXO I (DOC-01, pp. 21-22) contempla:** Item 419 (_"chat para os usuários do sistema"_), Item 420 (_"controle de avisos aos pacientes quando buscarem atendimento"_), Item 421 (_"controle de avisos aos usuários do sistema"_).
  - **Diretriz Técnica:** Mensageria interna entre profissionais e equipes de plantão (avisos, recados e chat interno) é **código interno plenamente implementável**, sem custos de disparos externos (SMS/WhatsApp). Não contornar com outros fluxos.
  - **Classificação Atual:** **NÃO ATENDE (Código Interno Planejado - Bloco 1)**.

### 5.3. Cadastros Gerais e Auxiliares (Itens 1 a 36 do ANEXO I)

- **Erro na v0.0.46:** A versão anterior agrupou os itens 1 a 20 e 22 a 23 sob uma única classificação genérica de "ATENDE", gerando risco de falsa conformidade.
- **Correção Material:** Classificação granular item a item com evidência de código ou demarcação formal de **NÃO VERIFICADO** / **PARCIAL** / **NÃO ATENDE**:

|   Item    | Texto do Requisito (DOC-01, pp. 1-3)                              | Evidência de Código / Backend                                 |                  Status                  | Análise Racional de Conformidade                                            |
| :-------: | :---------------------------------------------------------------- | :------------------------------------------------------------ | :--------------------------------------: | :-------------------------------------------------------------------------- |
|   **1**   | Cadastrar paciente gerando número único no SOFTWARE               | Migração 0001, id PocketBase e prontuário numérico            |                **ATENDE**                | ID único nativo gerado no cadastro de pacientes.                            |
|   **2**   | Vincular número de cadastro ao cartão SUS                         | `cartao_sus` em `pacientes`, migrações 0020, 0021             |                **ATENDE**                | Vínculo estrutural no schema e UI.                                          |
|   **3**   | Validação do número do cartão nacional                            | `validarCNSOficial` em `identificacaoPaciente.ts`             |                **ATENDE**                | Algoritmos oficiais DATASUS (definitivo e provisório).                      |
|   **4**   | Vincular foto do paciente ao cadastro                             | Campo `foto` em `pacientes`                                   |                **ATENDE**                | Suporte a upload/visualização de avatar do paciente.                        |
|   **5**   | Cadastrar a(s) deficiência(s) do paciente                         | Campo `tipo_necessidade_especial` em `pacientes`              |               **PARCIAL**                | Campo textual/select; falta catálogo estruturado multisseleção.             |
|   **6**   | Não permitir duplicidade por dados informados                     | Migração 0020 (índices parciais únicos CPF/CNS)               |                **ATENDE**                | Bloqueio físico no SQLite e hook `pacientes_identificacao.pb.js`.           |
|   **7**   | Impressão da ficha cadastral do paciente                          | `ModalEmissaoImpresso.tsx`, `FolhaImpressoA4.tsx`             |               **PARCIAL**                | Emite impressos assistenciais e resumo; ficha cadastral direta pendente.    |
|   **8**   | Impressão da carteira do paciente                                 | N/A                                                           |              **NÃO ATENDE**              | Layout de carteirinha física de identificação não implementado.             |
|   **9**   | Busca por número, nascimento, CNS ou mãe                          | `buscarPacientes` em `cadastros.ts` / `pacientes_busca.pb.js` |                **ATENDE**                | Busca combinada no servidor com proteção LGPD.                              |
|  **10**   | Emissão de cartões com nome, nasc, mãe, cartão e SUS              | N/A                                                           |              **NÃO ATENDE**              | Emissão de cartão físico SUS/municipal não implementada.                    |
|  **11**   | Informar se paciente é doador de sangue                           | Campo `doador_sangue` em `pacientes`                          |            **NÃO VERIFICADO**            | Campo não mapeado explicitamente no formulário de UI atual.                 |
|  **12**   | Informar tipagem sanguínea do paciente                            | Campo `grupo_sanguineo` em `pacientes`                        |                **ATENDE**                | Seleção de grupo (A, B, AB, O) e fator Rh (+/-) presente.                   |
|  **13**   | Controle de auditoria no cadastro Pessoa Física                   | Migrações 0001, 0014, 0017 (coleção `auditoria`)              |                **ATENDE**                | Log imutável de criação e edição com usuário e timestamp.                   |
|  **14**   | Cadastrar profissionais com ocupações e perfis                    | `ProfissionaisView.tsx`, `cadastros.ts`, perfis RBAC          |                **ATENDE**                | Cadastro com CBO, conselho de classe e perfil de acesso.                    |
| **[14b]** | Cadastrar Pessoas Jurídicas                                       | Coleção `fornecedores` / prestadores                          |            **NÃO VERIFICADO**            | Cadastro genérico de PJ/hospitais parceiros não auditado.                   |
|  **15**   | Cadastrar novas CIDs ou alterações                                | `faturamento.ts`, `listarCID10`, `criarCID10`                 |                **ATENDE**                | Tabela dinâmica de CID-10 com inclusão operacional.                         |
|  **16**   | Cadastrar novos Bairros, Endereços, regiões e domicílios          | `cadastros.ts`                                                |               **PARCIAL**                | Campos no paciente; cadastro independente de logradouros/bairros é parcial. |
|  **17**   | Cadastrar estoque, entidade, guichês, produtos no gestor Hórus    | `FarmaciaView.tsx`, `farmacia.ts`                             |               **PARCIAL**                | Atende farmácia hospitalar interna; Hórus federal não integrado.            |
|  **18**   | Cadastrar laboratórios e hospitais                                | `RegulacaoView.tsx` (catálogo destinos)                       |               **PARCIAL**                | Cadastro de destinos na regulação; PJ hospitalar completo pendente.         |
|  **19**   | Profissionais, ocupação, INE, operações e consultório             | `ProfissionaisView.tsx`                                       |               **PARCIAL**                | Atende CBO e dados básicos; INE (Atenção Básica) não utilizado.             |
|  **20**   | Formas de abastecimento de água                                   | N/A                                                           |            **NÃO VERIFICADO**            | Cadastro de saneamento básico (Atenção Básica).                             |
|  **21**   | Áreas da família                                                  | N/A                                                           |               **EXCLUÍDO**               | Item amarelo excluído (Atenção Básica/ACS).                                 |
|  **22**   | Destino de fezes e urinas                                         | N/A                                                           |            **NÃO VERIFICADO**            | Cadastro sanitário domiciliar (Atenção Básica).                             |
|  **23**   | Destino do lixo                                                   | N/A                                                           |            **NÃO VERIFICADO**            | Cadastro sanitário domiciliar (Atenção Básica).                             |
|  **24**   | Famílias e famílias nas microáreas                                | N/A                                                           |               **EXCLUÍDO**               | Item amarelo excluído (Atenção Básica/ACS).                                 |
|  **25**   | Formas de tratamento de água                                      | N/A                                                           |            **NÃO VERIFICADO**            | Cadastro sanitário domiciliar (Atenção Básica).                             |
|  **26**   | Centro de custo, fabricantes, insumos, medicamentos, unidades     | `FarmaciaView.tsx`, `farmacia.ts`                             |                **ATENDE**                | Cadastro estruturado de materiais, lotes, fabricantes e unidades.           |
|  **27**   | Tipos de documentos no cadastro do paciente                       | `PacientesView.tsx`                                           |                **ATENDE**                | RG, CPF, Certidão de Nascimento, CNS suportados.                            |
|  **28**   | Contas correntes, planos de contas e recursos                     | N/A                                                           |              **NÃO ATENDE**              | Módulo de contabilidade bancária municipal não implementado.                |
|  **29**   | Acomodações, estruturas do hospital e leitos                      | `SetoresLeitosView.tsx`, `cadastros.ts`                       |                **ATENDE**                | Setores, leitos com tipos de acomodação (enfermaria, isolamento, UTI).      |
|  **30**   | Bancadas, etiquetas, exame, grupos de resultados, métodos         | `ExamesLaudosView.tsx`, `exames.ts`                           |               **PARCIAL**                | Cadastro de exames e laudos existe; bancadas/etiquetas térmicas pendente.   |
|  **31**   | Exames radiológicos, resultados e laudo de radiologia             | `ModalSolicitarExame.tsx`, `ExamesLaudosView.tsx`             |               **PARCIAL**                | Exame tipo 'imagem' com laudo textual e histórico; sem editor rico RIS.     |
|  **32**   | Convênios, tipos de ocorrências e tipos de consulta               | `RegulacaoView.tsx`, `prontoAtendimento.ts`                   |               **PARCIAL**                | SUS exclusivo; tipos de ocorrência e consulta parametrizados.               |
|  **33**   | Viaturas e tipos de origem                                        | N/A                                                           |              **NÃO ATENDE**              | Cadastro de frota/viaturas (ligado a Transporte e SAMU).                    |
|  **34**   | Doses, especialidades, modelos de prescrição, grupos              | `prescricoes.ts`, `farmacia.ts`                               |               **PARCIAL**                | Prescrição médica estruturada; modelos pré-configurados parciais.           |
|  **35**   | Tipos de desfechos                                                | `prontoAtendimento.ts`, `internacoes.ts`                      |                **ATENDE**                | Desfechos de PA e alta hospitalar (cura, transferência, óbito, etc.).       |
|  **36**   | 100% integração com eSUS PEC (importação automática de cadastros) | `IntegracoesView.tsx`                                         | **DEPENDE DE INTEGRAÇÃO OU HOMOLOGAÇÃO** | Telas de parâmetros prontas; webservice online com eSUS PEC não homologado. |

### 5.4. SAMU e Ocorrências Móveis (Itens 407 a 417 e Seção 7.4.5.1.e.i)

- **Correção Conceitual:** O SAMU é composto por fluxos de registro administrativo interno e acolhimento hospitalar (tipo de ocorrência, solicitante, vítima, classificação de risco, unidade de destino, unidade móvel, relatórios por tipo, período, cidade e unidade móvel).
- **Não presumir dependência de telemetria / mapas:** O texto dos itens 407 a 417 do ANEXO I e da Seção 7.4.5.1.e.i do DOC-02 **NÃO exige** telemetria de ambulância via satélite, GPS, mapas espaciais ou telefonia/acionamento externo 192. Exige registro das ocorrências móveis e encaminhamento para a unidade de saúde receptora. Classificação de risco é ato estritamente assistencial humano (sem algoritmos automáticos de decisão clínica). Encerramento de chamado não gera internação ou consulta médica automática.
- **Detalhamento Item a Item (407 a 417):**
  - **Item 407 (Ocorrências do SAMU):** **IMPLEMENTADO COM UI (v0.0.72)** — Coleção `samu_ocorrencias`, abertura no modal `ModalAberturaOcorrencia.tsx`, aceitação explícita de vítima desconhecida sem exigir CPF/CNS.
  - **Item 408 (Dados do Solicitante):** **IMPLEMENTADO COM UI (v0.0.72)** — Relação com a vítima, nome e telefone informados no chamado.
  - **Item 409 (Dados da Vítima):** **IMPLEMENTADO COM UI (v0.0.72)** — Nome, sexo e idade informados ou desconhecido, sem dados clínicos desnecessários.
  - **Item 410 (Classificação de Risco):** **IMPLEMENTADO COM UI (v0.0.72)** — Lançamento manual exclusivo por profissional de saúde autorizado (`ModalAcoesOperacionaisSAMU.tsx`), com parecer/justificativa e recusa 403 do servidor para perfis indevidos.
  - **Item 411 (Unidade de Saúde de Destino):** **IMPLEMENTADO COM UI (v0.0.72)** — Seleção de setor hospitalar municipal ou unidade externa de referência.
  - **Item 412 (Unidade Móvel Designada):** **IMPLEMENTADO COM UI (v0.0.72)** — Atribuição de viatura da frota ativa, com erro acionável 409 `UNIDADE_MOVEL_OCUPADA` se a viatura estiver em outro atendimento.
  - **Item 413 (Andamento e Transições):** **IMPLEMENTADO COM UI (v0.0.72)** — Transições de status (em deslocamento, no local, em transporte, concluída, cancelada) com motivo auditado e histórico imutável em `ModalDetalhesOcorrenciaSAMU.tsx`.
  - **Item 414 (Relatório por Tipo de Ocorrência):** **IMPLEMENTADO COM UI (v0.0.72)** — Filtro e relatório consolidado por tipo (clínico, trauma, obstétrico, psiquiátrico, pediátrico, outro) em `SamuView.tsx` e `RelatorioSanitizadoSamuA4.tsx`.
  - **Item 415 (Relatório por Período):** **IMPLEMENTADO COM UI (v0.0.72)** — Filtro e relatório por intervalo de datas no fuso da unidade (`America/Porto_Velho`).
  - **Item 416 (Relatório por Cidade/Município):** **IMPLEMENTADO COM UI (v0.0.72)** — Filtro e relatório textual por município do chamado.
  - **Item 417 (Relatório por Unidade Móvel):** **IMPLEMENTADO COM UI (v0.0.72)** — Filtro e relatório detalhado por viatura/placa da frota municipal.
- **Status de Entrega Consolidado (v0.0.72):** **IMPLEMENTADO COM UI (Módulo SAMU Básico Completo)**
  - Backend/Serviço (v0.0.71): migração `0037_modulo_samu_basico.js`, hook `samu_modulo.pb.js`, serviço `src/services/samu.ts`;
  - Interface Visual e Navegação (v0.0.72): Aba "SAMU 192 (Básico)" em `NavigationBar.tsx` e `Index.tsx`, componente `SamuView.tsx` com lista paginada e filtros (tipo, período, município, unidade móvel, status), formulário de abertura sem CPF/CNS obrigatório, tratamento de conflito 409 sem perda de texto, ações operacionais (risco humano, viatura, transições, vínculo posterior), visualizador de histórico imutável e folha sanitizada de impressão A4 (`RelatorioSanitizadoSamuA4.tsx`);
  - Suíte de Testes Locais: Casos SAMU-01 a SAMU-14 no harness local (`src/tests/harnessTestes.ts`).
- **Limites e Pendências Operacionais:** Homologação visual/assistencial humana em ambiente real de triagem de urgência permanece pendente; concorrência real multi-nó não inferida de testes locais; telefonia/acionamento externo 192 e GPS estão fora de escopo.
- **Classificação Consolidada:** **IMPLEMENTADO COM UI (Módulo Básico Municipal Entregue)**.

### 5.5. RIS / Radiologia e Diagnóstico por Imagem (Itens 313 a 322 e Seção 7.4.3.4)

- **Correção Conceitual:** A versão anterior classificou erroneamente como dependente de PACS externo pago. O edital exige sistema de informação radiológica (RIS), laudos digitados, fila operacional e modelos.
- **Status de Entrega e Detalhamento por Subitem (v0.0.58 e v0.0.59):**
  - **7.4.3.4.a.i–iv (Fila de Exames de Imagem e Ciclo de Atendimento):** **IMPLEMENTADO (v0.0.58 / v0.0.59)**
    - Migração `0031_modulo_ris_radiologia.js`: coleções dedicadas `ris_agendas`, `ris_modelos_laudo`, `ris_historico_transicoes` e expansão de `exames_solicitacoes` com campos de modalidade (`rx`, `tc`, `ecg`, `us`, `outro`), status RIS (`solicitado`, `agendado`, `realizado_aguardando_laudo`, `laudado`, `cancelado`), tipo de execução (`interno` vs `externo`) e rascunho de laudo;
    - Hook server-side `pocketbase/hooks/ris_modulo.pb.js`: rotas transacionais `/backend/v1/ris/requisicao-pep`, `/fila`, `/agendar`, `/reagendar`, `/cancelar`, `/exames/{id}/transicao`;
    - Fila paginada server-side com filtros por modalidade, status, unidade/setor e tipo de execução;
    - Isolamento rigoroso de perfil: recepção visualiza metadados administrativos mas tem justificativas clínicas restritas; proibida alteração clínica de status por operadores de recepção.
  - **7.4.3.4.c.i (Entrega Formal de Resultados RIS - Partes 1 e 2):** **IMPLEMENTADO COM UI (v0.0.64 / v0.0.65)**
    - Migração `0033_entrega_formal_laudos_ris.js`: coleção imutável `ris_entregas_laudos` com update e delete rules nulos (bloqueio físico estrito de alteração e exclusão);
    - Hook server-side `ris_modulo.pb.js`: endpoints `/backend/v1/ris/entregas` (POST de entrega formal e GET com projeção restrita a metadados administrativos mínimos, sem expor `laudo_texto`, conteúdo formatado ou imagens diagnósticas);
    - Validações de integridade no servidor: laudo obrigatoriamente liberado, vínculo exame→paciente→versão, idempotência transacional (mesmo payload retorna 200 idempotente; payload divergente retorna 409 `IDEMPOTENCY_PAYLOAD_CONFLICT`);
    - Detecção de retificação posterior (versão solicitada < versão vigente) emitindo erro 409 `CONFLITO_VERSAO_RETIFICADA` com versão vigente e motivo;
    - Retificação de comprovante: autorizada apenas via criação de novo evento auditável com `evento_anterior_ref` e justificativa formal (mínimo de 5 caracteres), preservando o registro anterior imutável;
    - UI integrada em `RisView.tsx` (`TabEntregasRIS.tsx` e `ModalEntregaLaudoRIS.tsx`):
      - Aba "Entrega Formal de Laudos (DOC-02)" com sub-visões de laudos liberados pendentes de entrega e histórico paginado de comprovantes emitidos;
      - Filtros de período civil, busca por paciente/protocolo e modalidade;
      - Conferência presencial humana do destinatário (nome min 3 caracteres, documento e forma de recebimento);
      - Prévia do comprovante identificando exame, paciente (protegido por máscara LGPD) e VERSÃO EXATA a ser entregue;
      - Alerta visível crítico caso haja versão retificada posterior, com opção de trocar para a versão vigente com 1 clique ou confirmação explícita de ciência;
      - Comprovante sanitizado em folha A4 (`ReciboSanitizadoEntregaA4.tsx`) sem corpo clínico de laudo, com fuso operacional da unidade (`America/Porto_Velho`), UTC persistido e aviso de limites legais sem ICP-Brasil;
      - Resiliência contra concorrência: resposta 409 preserva o formulário preenchido para revisão humana; reenvio mantém a mesma chave de idempotência; descarte de respostas em voo via `seqRef` ao trocar de seleção;
    - **Pendências Operacionais e Limites Reais:** Validação visual humana presencial por operador real no balcão e teste de carga em concorrência multi-nó não inferida no ambiente isolado.
  - **7.4.3.4.c.ii (Agendamento, Reagendamento e Comprovante Seguro):** **IMPLEMENTADO (v0.0.58 / v0.0.59)**
    - Agendamento com validação de sobreposição horária de sala/equipamento e profissional executor;
    - Reagendamento com inativação lógica da agenda anterior, preservação auditável de motivo e vinculação à nova agenda;
    - Cancelamento formal auditado com retorno do exame à fila como solicitado;
    - Emissão de **Comprovante de Agendamento RIS** congelado em snapshot (`comprovante_snapshot`), renderizado estritamente como texto puro sem innerHTML (padrão seguro A4) para entrega ao paciente;
    - Registro de exame realizado por prestador credenciado externo (nome, CNES, UF e protocolo) sem falsear execução interna do hospital municipal.
  - **7.4.3.4.c.ii / Item 316 (Modelos de Laudo Versionados para Revisão Humana):** **IMPLEMENTADO (v0.0.58 / v0.0.59)**
    - Coleção `ris_modelos_laudo` com versionamento sequencial (`versao`), vínculo a modelo anterior e inativação lógica de versões antigas;
    - Aplicação de modelo gera exclusivamente **rascunho para revisão humana** (`rascunho_laudo`) na fila RIS;
    - **Sem liberação clínica automática**: a liberação e assinatura do laudo segue obrigatoriamente a cadeia formal do médico radiologista/assistente no PEP via `emitirLaudoExame`;
    - Proteção de imutabilidade: exames com laudo já liberado bloqueiam estritamente aplicação de novos modelos.
  - **EXPLICITAMENTE PARCIAL / PENDENTE / FORA DO ESCOPO DESTA VERSÃO:**
    - **7.4.3.4.b (Editor Avançado com Anotação Gráfica e Manipulação de Imagens):** **PARCIAL / PENDENTE** (O sistema entrega editor estruturado de texto padrão, modelos e sumário; editor gráfico avançado para desenho sobre imagem radiológica permanece pendente);
    - **Controle Físico de Filmes Radiológicos e Descarte de Químicos:** **PENDENTE** (Estoque hospitalar geral em `farmacia.ts` opera itens, mas controle dedicado de m² de película de RX e índice de descarte físico não foi implementado);
    - **Entrega Física de Filmes/Películas:** **PENDENTE** (Fluxo assistencial municipal opera com laudo formal impresso A4 e consulta digital no PEP);
    - **Tabelas de Repasse Financeiro a Prestadores Externos:** **PARCIAL / PENDENTE** (Registro do prestador externo entregue; apuração contábil/financeira de honorários de terceiros depende de módulo de faturamento privado/complementar);
    - **Integração DICOM / PACS e Certificação ICP-Brasil:** **EXPLICITAMENTE NÃO ALEGADO / FORA DE ESCOPO** (O sistema RIS não requer nem alega servidor PACS/DICOM ou certificado ICP-Brasil pago).
- **Classificação Consolidada:** **PARCIAL (Fila RIS, Agendamentos, Comprovante Seguro, Exames Externos, Modelos Versionados e UI Navegável Entregues; Editor Gráfico Avançado, Filmes e DICOM/PACS Permanecem Parciais/Pendentes)**.

### 5.6. Transporte Sanitário e TFD (Itens 333 a 345 e Seção 7.4.4.2)

- **Requisitos Reais do Texto:** Cadastro de frota (veículos, placas, chassi, extintor, motoristas CNH), rotas, viagens programadas, passageiros e acompanhantes em vagas separadas, cálculo de km, indisponibilidade/manutenção, custos, despesas de viagem, bilhete de passagem, processos de TFD (número, CID-10, justificativa, status, viagens em lote) e faturamento de transporte via BPA por km percorrido.
- **Status Detalhado por Etapa da Seção 7.4.4.2:**
  - **7.4.4.2.a–b (Primeira Etapa — Transporte Sanitário Interno):** **IMPLEMENTADO (v0.0.54 e v0.0.55)**
    - Estrutura de dados completa na migração `0029_modulo_transporte_sanitario.js` (7 coleções: veículos, tipos, motoristas com CNH e validade, rotas, destinos, viagens programadas e vínculos de passageiros com vagas separadas ida/volta);
    - Hook de negócio e integridade server-side `transporte_sanitario.pb.js` com endpoint transacional `POST /backend/v1/transporte/reservar-vagas` (lotação estrita por trecho, conflito de sobreposição horária de veículos e motoristas, idempotência com bloqueio de payload conflitante, auditoria de autor e inativação lógica sem deleção física);
    - Serviço cliente `src/services/transporte.ts` e UI navegável `TransporteView.tsx` integrada à navegação global (`NavigationBar.tsx` e `Index.tsx`) com abas de viagens programadas (paginada, filtros, finalização com odômetro final), frota e sinalização de manutenção/indisponibilidade, motoristas com controle de validade de CNH, rotas e destinos;
    - Reserva de vagas por trecho (ida e/ou volta) alocando vagas SEPARADAS para pacientes e acompanhantes, com controle de sequência (`seqRef`) para descarte de respostas defasadas em voo ao trocar paciente, botão travado contra duplo clique e reenvio idempotente;
    - Isolamento rigoroso de perfil: recepção acessa exclusivamente dados operacionais/administrativos da viagem; justificativas clínicas são reservadas ao acesso clínico autorizado;
    - Cenários TRANSP-1 a TRANSP-12 validados no harness local com funções reais importadas sem fixtures compartilhadas e sem dados reais gravados.
  - **7.4.4.2.e (Segunda Etapa — Tratamento Fora de Domicílio - TFD) — Detalhamento por Subitem:**
    - **7.4.4.2.e.i (Cadastro e Abertura de Processo TFD com CID-10 e Justificativa):** **IMPLEMENTADO (v0.0.56 e v0.0.57)**
      - Migração `0030_processos_tfd_modulo.js` (coleções `tfd_processos`, `tfd_historico_estados`, `tfd_viagens_lote` e campo relacional `tfd_processo` em `transporte_viagens`);
      - Serviço `src/services/tfd.ts` e UI integrada `TfdView.tsx` com formulário completo: numeração interna sequencial padronizada (`TFD-AAAA-NNNNN`), data de abertura, paciente titular, profissional assistencial, diagnóstico CID-10, tratamento solicitado, modalidade de atendimento, justificativa clínica fundamentada e tipo de transporte recomendado;
      - Isolamento clínico rigoroso: perfis de recepção/administrativo recebem CID-10, justificativa clínica e justificativa de acompanhante mascarados (`[DADO CLÍNICO RESTRITO]`), protegidos no backend e na UI.
    - **7.4.4.2.e.ii (Ciclo de Estados e Trilha Auditável Permanente):** **IMPLEMENTADO (v0.0.56 e v0.0.57)**
      - Estados formais implementados: `inconcluso`, `autorizado`, `enviado_para_estado`, `negado` e `cancelado`;
      - Hook server-side `tfd_processos.pb.js` com rota `POST /backend/v1/tfd/processos/{id}/transitar-estado`: exige motivo obrigatório fundamentado (>5 caracteres) e autor derivado da sessão; cancelamento é terminal/imutável (bloqueia reativação e novas viagens);
      - UI exibe histórico auditável completo por processo com autor, data/hora e justificativa obrigatória.
    - **7.4.4.2.e.iii (Vínculo de Viagens Sanitárias e Lote com Prévia Humana):** **IMPLEMENTADO (v0.0.56 e v0.0.57)**
      - Vínculo coerente: viagens diretas e viagens em lote validam que o paciente reservado é o titular do processo;
      - Rota `POST /backend/v1/tfd/processos/{id}/viagens-lote/previa`: gera prévia para revisão humana sem gravação no banco de dados;
      - Rota `POST /backend/v1/tfd/processos/{id}/viagens-lote/confirmar`: exige confirmação explícita do usuário, cria viagens e reservas de passageiro atomicamente e segrega expressamente itens criados vs. itens conflitantes (sem sucesso parcial oculto); idempotência garantida por chave de lote e por chave de item.
    - **7.4.4.2.e.iv (Renovação Formal com Preservação de Histórico):** **IMPLEMENTADO (v0.0.56 e v0.0.57)**
      - Rota `POST /backend/v1/tfd/processos/{id}/renovar`: cria novo processo formal (`is_renovacao=true`), gera novo número sequencial interno, preserva o histórico do processo anterior (`processo_anterior_ref`), bloqueia processos cancelados e inicia obrigatoriamente no estado `inconcluso` (sem herança automática de autorização/aprovação).
    - **7.4.4.2.e.v (Painel Agregado por Localidade):** **IMPLEMENTADO INTERNAMENTE (v0.0.57)**
      - Função `obterTotaisAgregadosPorLocalidade` e aba "Totais por Localidade" em `TfdView.tsx`: consolidação quantitativa de processos, status e viagens vinculadas por município de destino;
      - Estritamente sem mapas, sem georreferenciamento e sem exposição de dados pessoais desnecessários.
  - **EXPLICITAMENTE PARCIAL / PENDENTE / DEPENDÊNCIA EXTERNA:**
    - **Gestão Financeira de Diárias de TFD e Ajuda de Custo Alimentação:** **PARCIAL / PENDENTE** (Estrutura de empenho/diárias financeiras e ordens de pagamento bancário permanecem pendentes de módulo de tesouraria municipal);
    - **Transmissão Telemática Direta para Regulação Estadual (SISREG/Central Estadual):** **DEPENDÊNCIA EXTERNA** (Comunicação telemática direta com centrais estaduais depende de credenciamento e webservice da SES/RO; processo no sistema hospitalar opera no fluxo formal municipal `enviado_para_estado`);
    - **Faturamento SUS Magnético BPA de Transporte:** **DEPENDÊNCIA EXTERNA** (Geração magnética oficial de arquivos de remessa BPA do Ministério da Saúde).
- **Classificação Consolidada:** **PARCIAL (Transporte Sanitário 7.4.4.2.a–b e Processos TFD 7.4.4.2.e com Lote e Renovação Concluídos no Sistema Hospitalar; Diárias Financeiras e Transmissão Externa ao Estado Pendentes)**.

### 5.7. Gerenciamento de APACs (Seção 7.4.4.4 e Faturamento)

- **Requisitos Reais do Texto (Módulos DOC-02, Seção 7.4.4.4, pp. 31–32; ANEXO I itens 133 e 162):**
  - **7.4.4.4.a (Sequenciamento e Faixas):** Cadastro e controle de faixas de sequências de numeração autorizada pelo gestor municipal/estadual por ano, UF e tipo de laudo com número inicial, final e controle de número atual/anterior.
  - **7.4.4.4.b (Laudo e Tipificação):** Formulário de laudo médico/multiprofissional com seleção obrigatória do tipo de laudo (Laudo Geral, Medicamentos, Nefrologia, Quimioterapia, Radioterapia, Cirurgia Bariátrica), modalidade da APAC (Inicial, Continuidade, Sem Continuidade), CIDs principal/secundário/causas associadas e prazos de validade (inicial e final).
  - **7.4.4.4.c (Vínculos e Prontuário):** Geração de rascunho de laudo diretamente no Prontuário Eletrônico do Paciente (PEP/PA) como pré-preenchimento para revisão profissional humana (NUNCA autoautorizar procedimento de alta complexidade).
  - **7.4.4.4.d (Gestão e Auditoria):** Modalidade "Continuidade" exige que a APAC anterior pertença ao mesmo paciente; cancelamento auditado sem reutilização de número; retificação com versionamento e bloqueio de exclusão física.
- **Status Detalhado por Subitem da Seção 7.4.4.4:**
  - **7.4.4.4.a.i (Estrutura de Faixas):** **IMPLEMENTADO** (Migração 0027, coleção `apac_faixas_sequencias` com ano/UF/tipo e intervalos).
  - **7.4.4.4.a.ii (Interface de Gestão de Faixas):** **IMPLEMENTADO** (Aba "Gestão de Faixas" em `ApacView.tsx`, restrita ao operador municipal autorizado; nenhum registro real/teste gravado na base compartilhada nesta rodada).
  - **7.4.4.4.a.iii (Reserva Transacional de Número):** **IMPLEMENTADO NO BACKEND / UI INTEGRADA** (Hook `apac_gestao.pb.js` com rota `POST /backend/v1/apac/reservar-numero` idempotente; botão integrado na UI para o operador). **PARCIAL / NÃO HOMOLOGADO EM CARGA REAL CONCORRENTE** (Concorrência massiva real contra PocketBase isolado segue indisponível no ambiente de QA).
  - **7.4.4.4.b.i (Formulário e Tipos/Modalidades):** **IMPLEMENTADO** (Tela de emissão com 6 tipos de laudo, 3 modalidades, datas de validade SUS e diagnósticos CID-10 principal/secundário/causas associadas).
  - **7.4.4.4.b.ii (Validação de APAC Antecessora):** **IMPLEMENTADO** (Hook server-side e validação cliente exigem número e garantem que pertença ao mesmo paciente na modalidade continuidade).
  - **7.4.4.4.c.i (Rascunho a partir do PEP):** **IMPLEMENTADO** (`gerarRascunhoApacDoPep` em `apac.ts` e aba "Rascunho do PEP" em `ApacView.tsx`, pré-preenchendo dados clínicos para revisão sem autoautorização).
  - **7.4.4.4.d.i (Segurança, LGPD e Estados de Envio):** **IMPLEMENTADO** (Máscara estrita de CPF/CNS em listas/snapshots, controle de sequência `seqRef` contra respostas em voo, retry com idempotência estável e preservação de texto em erro).
  - **7.4.4.4.d.ii (Exportação Magnética SIA/APAC para DATASUS):** **NÃO HOMOLOGADO / DEPENDE DE INTEGRAÇÃO** (Geração de arquivos magnéticos federais em lote para envio ao DATASUS/BPA permanece no backlog de layouts externos federais).
- **Classificação Consolidada:** **PARCIAL (Código Interno e UI Hospitalar Concluídos; Homologação Concorrente e Transmissão Externa Pendentes)**.

### 5.8. Serviço de Nutrição e Dietética - SND (Seção 7.4.3.5)

- **Requisitos Reais do Texto:** Cadastro parametrizado de cardápio e dietas (enterais, parenterais, orais, rotina, especiais), prescrição individualizada por paciente internado ou em observação com horários e restrições alimentares, mapa/relatório de refeições por período/leito, controle operacional sanitizado para a cozinha (LGPD/sigilo clínico) e integração com estoque/almoxarifado de nutrição (7.4.3.5.c.i, p. 23 do PDF detalhado).
- **Classificação Atual:** **PARCIAL (v0.0.70 - Auditoria de Integridade e Bloqueio de Bypass SND/RIS Concluídos)**:
  - **7.4.3.5.a (Catálogo e Prescrição Individualizada):** IMPLEMENTADO (v0.0.66 Parte 1 Backend + v0.0.67 Parte 2 UI). Telas de catálogo versionado de refeições e dietas, prescrição com restrições e alergias, mapa operacional sanitizado de cozinha e relatórios de distribuição;
  - **7.4.3.5.b.ii (Assinatura Digital ICP-Brasil):** DEPENDE DE INTEGRAÇÃO (Requer autoridade certificadora e infraestrutura homologada);
  - **7.4.3.5.c.i (Integração com Estoque e Ficha de Composição - p. 23):**
    - **Parte 1 Backend (v0.0.68 - Entregue):** Migração 0035 com coleções `snd_composicoes_refeicoes` e `snd_baixas_estoque_distribuicoes`; rotas transacionais `/backend/v1/snd/distribuicao/confirmar-com-baixa` e `/backend/v1/snd/baixa/estornar`;
    - **Parte 2 UI & Testes de Integração (v0.0.69 - IMPLEMENTADO COM UI):** Componente `ModalFichaComposicao.tsx`, prévia no `MapaCozinhaSndTab.tsx`, estorno compensatório em `ModalConsumoEstornoSnd.tsx` e testes SND-17 a SND-21;
    - **Auditoria e Bloqueio de Bypass de Integridade (v0.0.70 - Entregue):**
      - Migração 0036 (`0036_regras_integridade_snd_ris_bypass.js`): Bloqueio absoluto de create/update/delete direto via API cliente em `snd_baixas_estoque_distribuicoes` e `ris_entregas_laudos` (`createRule = null`, `updateRule = null`, `deleteRule = null`), forçando passagem exclusiva pelos endpoints transacionais; bloqueio de exclusão em `snd_distribuicoes_refeicoes`;
      - Hooks Server-Side (`pocketbase/hooks/snd_nutricao.pb.js`): `onRecordCreate` e `onRecordUpdate` bloqueiam estritamente a criação ou transição de refeição para status 'distribuido' via API direta de coleção (`OPERAÇÃO_NEGADA_BYPASS`), impedindo distribuição concluída sem baixa; distribuição legada preservada como imutável sem baixa retroativa (`OPERAÇÃO_NEGADA_IMUTABILIDADE`);
      - Integridade RIS (`pocketbase/hooks/exames_laudos.pb.js` e `ris_modulo.pb.js`): derivação autoritativa compulsória de versão, paciente e autor/responsável a partir da sessão e do registro do exame, impedindo falsificação via payload; imutabilidade absoluta de laudos emitidos e recibos de entrega;
      - Sigilo Clínico / LGPD (`/backend/v1/snd/mapa-cozinha`): Cozinha e recepção não recebem diagnóstico, CID, prontuário detalhado ou corpo clínico em list/detail/expand ou rota alternativa;
      - Testes no Harness (`src/tests/harnessTestes.ts`): Casos AUDIT-01 a AUDIT-04 exercitando funções reais com adaptadores/mocks explicitados;
    - **Limites Honestos e Parciais Explícitos:** Testes locais atômicos não provam concorrência real multi-nó sob carga massiva distribuída (nenhuma topologia de cluster multi-nó é afirmada sem infraestrutura provada); assinatura digital ICP-Brasil (7.4.3.5.b.ii) depende de autoridade certificadora externa; validação visual e operacional humana permanece pendente de homologação assistencial em campo hospitalar.

### 5.9. Faturamento Ambulatorial e Hospitalar SUS (Seção 7.4.5.3 e Itens 453 a 474)

- **Status Atual Mantido com Coerência:**
  - Importação dinâmica do pacote oficial SIGTAP posicional (.zip) com decodificação ISO-8859-1 e layout dinâmico: **ATENDE (v0.0.28–v0.0.30)**.
  - Painel de validação prévia de consistência de contas AIH e itens BPA com regras E001 a A603: **ATENDE (v0.0.27–v0.0.30)**.
  - Geração física de arquivos de remessa nos layouts magnéticos federais (SISAIH01 / BPA Magnético) para transmissão: **DEPENDE DE INTEGRAÇÃO OU HOMOLOGAÇÃO** (Backlog técnico de layouts DATASUS).
  - Avaliador de BPA (itens 453 a 474): módulo viável internamente para conciliação em tela, dependendo apenas dos layouts federais para importação direta de arquivos `.mag`.

### 5.10. Dispositivos Móveis Hospitalares / Tablets (Seção 7.4.9)

- **Clarificação de Escopo:** A exclusão dos itens 374 a 389 (ACS Mobile) refere-se estritamente ao aplicativo territorial dos Agentes Comunitários de Saúde (visitas domiciliares de Atenção Básica).
- **A Seção 7.4.9 (p. 45 do DOC-02) está NO ESCOPO HOSPITALAR:** Exige usabilidade em tablets Android 9.0+, checagem à beira do leito, triagem/acolhimento, operação via Wi-Fi interno, controle de acesso e auditoria vinculando usuário e dispositivo.
- **Classificação Atual:** **PARCIAL**. O sistema é totalmente web responsivo (Tailwind CSS) e operável em navegador de tablet à beira do leito (checagem de medicamentos entregue na v0.0.37/v0.0.38), mas ainda não possui módulo de auditoria com captura de `dispositivo_id` nem credenciamento formal de aparelhos.

---

## 6. Matriz Geral Consolidada por Módulo

| Módulo / Tema                        | Referência DOC-01 (Itens) | Referência DOC-02 (Seção) | Requisito Cotação DOC-03 | Componente / Serviço / Hook Existente                                                                                                                                                                                                                                                                                                            |            Status Consolidado            | Justificativa / Próxima Ação                                                                                                                                                                                                                                                                                                                                                  |
| :----------------------------------- | :-----------------------: | :-----------------------: | :----------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Segurança, Acesso e Auditoria**    |      1 a 14, 428–429      |          7.4.1.1          |      Sim (Item 01)       | `LoginView.tsx`, `AuditoriaView.tsx`, `auditoria.ts`, RLS                                                                                                                                                                                                                                                                                        |                **ATENDE**                | Perfis admin, gestor, profissional, recepcao com trilha imutável.                                                                                                                                                                                                                                                                                                             |
| **Cadastros Gerais e Leitos**        |  1 a 35 (exceto 21, 24)   |     7.4.1.2, 7.4.1.3      |      Sim (Item 01)       | `SetoresLeitosView.tsx`, `ProfissionaisView.tsx`, `cadastros.ts`                                                                                                                                                                                                                                                                                 |               **PARCIAL**                | Leitos e setores atendem; cadastros auxiliares têm itens não verificados.                                                                                                                                                                                                                                                                                                     |
| **Identificação e Busca Paciente**   |        1 a 12, 27         |          7.4.2.2          |      Sim (Item 01)       | `PacientesView.tsx`, `identificacaoPaciente.ts`, hooks de busca                                                                                                                                                                                                                                                                                  |                **ATENDE**                | CPF/CNS validados algorítmicamente, índices parciais e mascaramento LGPD.                                                                                                                                                                                                                                                                                                     |
| **Integração eSUS PEC / CADSUS**     |            36             |          7.4.2.5          |      Sim (Item 01)       | `IntegracoesView.tsx`, `parametros.ts`                                                                                                                                                                                                                                                                                                           | **DEPENDE DE INTEGRAÇÃO OU HOMOLOGAÇÃO** | Telas de parâmetros prontas; integração com webservice federal não comprovada.                                                                                                                                                                                                                                                                                                |
| **Agendamento Ambulatorial**         |          38 a 55          |          7.4.4.1          |      Sim (Item 01)       | `AgendamentosView.tsx`, `agendamentos.ts`, `dataFusoUnidade.ts`                                                                                                                                                                                                                                                                                  |                **ATENDE**                | Fila ambulatorial, fuso de Mirante da Serra (`America/Porto_Velho`).                                                                                                                                                                                                                                                                                                          |
| **Pronto Atendimento (PA)**          |         106 a 128         |     7.4.2.3, 7.4.5.1      |      Sim (Item 01)       | `ProntoAtendimentoView.tsx`, `prontoAtendimento.ts`                                                                                                                                                                                                                                                                                              |                **ATENDE**                | Acolhimento, Manchester (5 cores), consultório médico, prescrição rápida.                                                                                                                                                                                                                                                                                                     |
| **Consultório Médico / Prescrição**  |    78 a 105, 149 a 189    |     7.4.2.4, 7.4.5.2      |      Sim (Item 01)       | `PrescricaoEnfermagemTab.tsx`, `prescricoes.ts`, migração 0023                                                                                                                                                                                                                                                                                   |                **ATENDE**                | Prescrição estruturada, checagem ao leito idempotente e retificação formal.                                                                                                                                                                                                                                                                                                   |
| **Internação e Censo Hospitalar**    |         346 a 373         |          7.4.5.1          |      Sim (Item 01)       | `InternacaoView.tsx`, `internacoes.ts`, `internacoes.pb.js`                                                                                                                                                                                                                                                                                      |                **ATENDE**                | Mapa de leitos, admissão, transferência leito a leito e alta hospitalar.                                                                                                                                                                                                                                                                                                      |
| **Centro Cirúrgico e SRPA**          |         281 a 310         |         7.4.5.1.d         |      Não explícito       | `CentroCirurgicoView.tsx`, `centroCirurgico.ts`                                                                                                                                                                                                                                                                                                  |                **ATENDE**                | Escala de salas, checklist OMS Safe Surgery, ato cirúrgico e Aldrete-Kroulik.                                                                                                                                                                                                                                                                                                 |
| **Centro Obstétrico e Parto**        |         332 a 350         |         7.4.2.2.h         |      Não explícito       | `CentroObstetricoView.tsx`, `centroObstetrico.ts`                                                                                                                                                                                                                                                                                                |                **ATENDE**                | Admissão com risco, partograma simplificado, escala de Apgar e desfecho.                                                                                                                                                                                                                                                                                                      |
| **Central de Regulação de Leitos**   |   226 a 235, 351 a 373    |         7.4.4.1.f         |      Sim (Item 01)       | `RegulacaoView.tsx`, `regulacao.ts`, `regulacaoRelogio.ts`                                                                                                                                                                                                                                                                                       |                **ATENDE**                | Solicitação leito a leito, médico regulador, relógio de espera imune a UTC.                                                                                                                                                                                                                                                                                                   |
| **Farmácia e Almoxarifado**          |  236 a 279 (exceto 280)   |          7.4.3.1          |      Sim (Item 01)       | `FarmaciaView.tsx`, `InventarioFarmaciaTab.tsx`, `farmacia.ts`                                                                                                                                                                                                                                                                                   |                **ATENDE**                | Catálogo, dispensação rastreável por lote/validade, inventário concorrente.                                                                                                                                                                                                                                                                                                   |
| **Laboratório de Análises Clínicas** |         286 a 312         |          7.4.3.3          |      Sim (Item 01)       | `ExamesLaudosView.tsx`, `exames.ts`, migração 0024                                                                                                                                                                                                                                                                                               |               **PARCIAL**                | Ciclo solicitação/coleta/laudo com retificação v1/v2; sem bancada/interface LIS.                                                                                                                                                                                                                                                                                              |
| **Radiologia e Imagem (RIS)**        |         313 a 322         |          7.4.3.4          |      Sim (Item 01)       | `0031_modulo_ris_radiologia.js`, `0033_entrega_formal_laudos_ris.js`, `ris_modulo.pb.js`, `src/services/ris.ts`, `src/components/RisView.tsx`, `TabEntregasRIS.tsx`, `ModalEntregaLaudoRIS.tsx`                                                                                                                                                  |               **PARCIAL**                | Fila RIS paginada, agendamento seguro, exames externos, modelos versionados e Entrega Formal de Laudos (7.4.3.4.c.i) com conferência e recibo A4 sanitizado implementados com UI; editor gráfico com anotação sobre imagem, filmes físicos e PACS externo permanecem parciais/pendentes.                                                                                      |
| **SAME e Impressos Oficiais A4**     |   390 a 403, 405 a 426    |       7.4.5.1.e.ii        |      Não explícito       | `ProntuarioSAMEView.tsx`, `FolhaImpressoA4.tsx`, `ModalEmissaoImpresso.tsx`                                                                                                                                                                                                                                                                      |                **ATENDE**                | Prontuário unificado por CPF/CNS, snapshot congelado de impressos e retificação.                                                                                                                                                                                                                                                                                              |
| **Vigilância Epidemiológica**        | 323 a 330 (331 excluído)  |          7.4.8.1          |      Sim (Item 01)       | `VigilanciaSaudeView.tsx`, `vigilanciaSaude.ts`                                                                                                                                                                                                                                                                                                  |               **PARCIAL**                | Notificação imediata/semanal e catálogo; sem envio telemático SINAN.                                                                                                                                                                                                                                                                                                          |
| **Painel de Gestão Hospitalar**      |  453 a 474 (indicadores)  |          5.4.6.1          |      Sim (Item 01)       | `PainelGestaoView.tsx`, `painelGestao.ts`, hook server-side                                                                                                                                                                                                                                                                                      |                **ATENDE**                | Visão agregada web do gestor, proteção de dados LGPD e fuso de Mirante.                                                                                                                                                                                                                                                                                                       |
| **Portal do Paciente Web**           |  390 a 397 (exceto 393)   |       7.4.4.3.b.iv        |      Sim (Item 01)       | N/A                                                                                                                                                                                                                                                                                                                                              |              **NÃO ATENDE**              | Requisito da cotação; consulta própria do paciente com login e LGPD.                                                                                                                                                                                                                                                                                                          |
| **Mensageria Interna / Chat**        |         419 a 421         |          7.4.6.2          |      Sim (Item 01)       | `0026_mensageria_interna.js`, `0028_gestao_grupos_mensageria.js`, `mensageria_interna.pb.js`, `mensageria.ts`, `MensageriaInternaView.tsx`                                                                                                                                                                                                       |               **PARCIAL**                | Backend, serviço e UI completos para envio/leitura e gestão de grupos/membros (criar, renomear, inativar, alternar membros, diretório paginado, snapshot congelado, bloqueio a inativos e validação no servidor). Mantido PARCIAL pois não inclui canais externos pagos (SMS/WhatsApp/e-mail) nem chat síncrono WebSocket bidirecional contínuo.                              |
| **Transporte Sanitário e TFD**       |         333 a 345         |          7.4.4.2          |      Sim (Item 01)       | `0029_modulo_transporte_sanitario.js`, `0030_processos_tfd_modulo.js`, `tfd_processos.pb.js`, `transporte.ts`, `tfd.ts`, `TransporteView.tsx`, `TfdView.tsx`                                                                                                                                                                                     |               **PARCIAL**                | Transporte sanitário (7.4.4.2.a–b) e TFD completo (7.4.4.2.e: abertura, estados auditados, lote com prévia/confirmação, renovação e isolamento recepção) entregues. Diárias financeiras e transmissão externa ao estado permanecem parciais/externas.                                                                                                                         |
| **Módulo de APAC**                   |         133, 162          |          7.4.4.4          |      Não explícito       | `0027_apac_modulo_interno.js`, `apac_gestao.pb.js`, `apac.ts`, `ApacView.tsx`                                                                                                                                                                                                                                                                    |               **PARCIAL**                | Backend e UI completos (solicitações, detalhes, rascunho PEP sem autoautorização, faixas por operador, máscara LGPD, retry estável e seqRef). Transmissão magnética DATASUS e teste de concorrência massiva real pendentes.                                                                                                                                                   |
| **Serviço de Nutrição e Dietética**  |            N/A            |          7.4.3.5          |      Não explícito       | `0034_modulo_snd_nutricao_base.js`, `0035_composicoes_e_baixas_estoque_snd.js`, `0036_regras_integridade_snd_ris_bypass.js`, `snd_nutricao.pb.js`, `src/services/snd.ts`, `SndView.tsx`, `CatalogoSndTab.tsx`, `PrescricaoSndTab.tsx`, `MapaCozinhaSndTab.tsx`, `RelatoriosSndTab.tsx`, `ModalFichaComposicao.tsx`, `ModalConsumoEstornoSnd.tsx` |               **PARCIAL**                | Catálogo versionado, prescrição individualizada, mapa sanitizado de cozinha e relatórios (v0.0.66–v0.0.67); integração transacional SND-estoque completa (v0.0.68/v0.0.69) e blindagem contra bypass/duplo estorno com migração 0036 e AUDIT-01 a 04 (v0.0.70); ICP-Brasil e concorrência distribuída multi-nó permanecem parciais/pendentes.                                 |
| **SAMU (Ocorrências Móveis)**        |         407 a 417         |        7.4.5.1.e.i        |      Sim (Item 01)       | `0037_modulo_samu_basico.js`, `samu_modulo.pb.js`, `src/services/samu.ts`, `SamuView.tsx`, subcomponentes em `src/components/samu/`, cenários SAMU-01 a SAMU-14 no harness                                                                                                                                                                     |                **ATENDE**                | Módulo SAMU Básico completo (Partes 1 e 2 entregues na v0.0.72): abertura sem CPF/CNS, vítima desconhecida, classificação de risco humana sem IA, viaturas com bloqueio de ocupação 409, histórico imutável, relatórios 414–417 sanitizados A4 no fuso de Mirante da Serra e proteção seqRef. Homologação assistencial em campo pendente. |
| **Avaliador BPA-C / BPA-I**          |         453 a 474         |          7.4.5.3          |      Sim (Item 01)       | `FaturamentoView.tsx`, `consistenciaFaturamento.ts`                                                                                                                                                                                                                                                                                              |               **PARCIAL**                | Validação prévia implementada; conciliação visual estilo BPA-Mag em aberto.                                                                                                                                                                                                                                                                                                   |
| **Certificação Digital ICP-Brasil**  |            N/A            |           7.4.7           |      Não explícito       | N/A                                                                                                                                                                                                                                                                                                                                              | **DEPENDE DE INTEGRAÇÃO OU HOMOLOGAÇÃO** | Assinatura qualificada A1/A3, carimbo do tempo RFC 3161 (requer AC credenciada).                                                                                                                                                                                                                                                                                              |
| **Suporte a Tablets Hospitalares**   |            N/A            |           7.4.9           |      Não explícito       | Layout responsivo Tailwind (`PrescricaoEnfermagemTab.tsx`)                                                                                                                                                                                                                                                                                       |               **PARCIAL**                | Operável em navegadores de tablets Android; falta auditoria de dispositivo.                                                                                                                                                                                                                                                                                                   |

---

## 7. Cinco Próximos Blocos de Código Interno Viáveis (Planejamento)

Priorizando as lacunas reais confirmadas nos documentos oficiais, definem-se os cinco próximos blocos estritamente de **código interno**, sem depender de serviços externos, contratos pagos ou envio de mensagens a operadoras telefônicas.  
_(Nota: Nenhuma implementação de código foi realizada nesta rodada documental; o escopo abaixo é para deliberação do Codex/usuário)._

```
+----------------------------------------------------------------------------------------------------+
| 5 PRÓXIMOS BLOCOS DE CÓDIGO INTERNO VIÁVEIS (Ordem Sugerida para Deliberação do Codex)             |
|                                                                                                    |
| 1. Mensageria Interna entre Usuários e Grupos (Cotação Item 01 / ANEXO I itens 419, 421)           |
| 2. Portal do Paciente Web com Consulta Própria Mascarada (Cotação Item 01 / Seção 7.4.4.3.b.iv)     |
| 3. Módulo de Gestão e Emissão de APAC no PEP (Seção 7.4.4.4 / ANEXO I itens 133, 162)              |
| 4. Controle de Transporte Sanitário e TFD Completo (Cotação Item 01 / Seção 7.4.4.2 / Itens 333-345)|
| 5. RIS - Serviço de Radiodiagnóstico e Imagem (Cotação Item 01 / Seção 7.4.3.4 / Itens 313-322)    |
+----------------------------------------------------------------------------------------------------+
```

---

### Bloco 1: Mensageria Interna Hospitalar entre Usuários e Grupos

- **Fundamento Documental:** Cotação Item 01 (_"O sistema deve permitir o envio de mensagens entre usuários e ou grupos do sistema; controle de avisos aos usuários"_), ANEXO I itens 419 e 421, Guia Módulos 7.4.6.2.
- **Natureza:** Código interno implementável (PocketBase / coleções internas / RLS / hooks).
- **Status de Entrega:**
  - **Parte 1 (Concluída nesta rodada): Backend + Camada de Serviço Cliente**
    - Coleção `canais_grupos_mensageria`: grupos funcionais com membros e regras RLS ativas;
    - Coleção `mensagens_internas`: remetente derivado autoritativamente da sessão (@request.auth.id), regras RLS restritas exclusivamente ao remetente e destinatários autorizados;
    - Hook de integridade server-side (`pocketbase/hooks/mensageria_interna.pb.js`): validação de texto (assunto max 160, conteúdo max 4000 caracteres), sanitização em texto plano (sem HTML ativo), resolução de participantes de grupo no momento do envio e congelamento de snapshot imutável (`destinatarios_resolvidos_ids` e `destinatarios_snapshot` — novos membros posteriores NÃO recebem acesso a histórico pregresso);
    - Idempotência persistente por mensagem (`idempotency_key`) para evitar duplicações em falha de rede/duplo clique;
    - Serviço cliente (`src/services/mensageria.ts`): caixa de entrada e enviadas, grupos, leitura com paginação, e diretório funcional mínimo restrito a id/nome/cargo/role sem dados de CPF/CNS/dados clínicos de pacientes;
    - Suíte de testes funcionais no harness local cobrindo remetente forjado rejeitado, leitura por terceiro bloqueada, troca de sessão, grupo alterado pós-envio, retry idempotente e texto com tags HTML inertes.
  - **Parte 2 (Concluída nesta rodada): Interface de Usuário (UI) & Integração Funcional**
    - Componente `src/components/MensageriaInternaView.tsx`: Caixa de Entrada e Enviadas, visualização de mensagens, contadores e paginação;
    - Composição de mensagens com seletor de destinatários do diretório mínimo funcional (sem dados de pacientes) e canais/grupos;
    - Tratamento de idempotência no envio (botão desabilitado durante envio contra duplo clique; reaproveitamento de chave em falha de rede sem duplicação);
    - Exibição de mensagens estritamente em texto puro escapado (tags HTML visíveis como texto puro literal sem interpretação ou execução de scripts);
    - Troca de sessão/usuário: limpeza imediata da caixa e conversa, descarte de requisições obsoletas em voo via ref sequencial, preservação de texto do formulário em caso de conflito de envio;
    - Suíte estendida com cenários MSG-7 a MSG-10 no harness local (`src/tests/harnessTestes.ts`).
  - **Parte 3 (Concluída nesta rodada): Gestão de Grupos e Participantes com Validação Server-Side**
    - Migração `0028_gestao_grupos_mensageria.js`: RLS atualizada para canais_grupos_mensageria permitindo listagem/administração por gestores/admin/criador, bloqueio estrito de DELETE físico (exclusão física proibida);
    - Hook server-side `mensageria_interna.pb.js`: validação de permissão imperativa na criação/edição de grupos e membros (apenas admin, gestor ou criador do grupo); validação de cada membro contra o diretório de usuários reais existentes (rejeição de IDs inexistentes sem criação de contas); bloqueio de envio para grupos inativos;
    - Diretório funcional paginado na rota `/backend/v1/mensageria/diretorio-usuarios` com busca segura sem expor CPF/CNS;
    - UI de Gestão de Grupos integrada no componente `MensageriaInternaView.tsx`: modal para criar, editar nome/sigla/descrição, adicionar/remover participantes existentes com diretório paginado, inativação/reativação lógica com preservação de históricos e mensagens;
    - Imutabilidade histórica rigorosa: novos membros adicionados NÃO têm acesso retroativo a mensagens passadas, e participantes retirados mantêm o snapshot imutável do que receberam;
    - Testes locais no harness (MSG-11 a MSG-16): gestor não autorizado rejeitado, imutabilidade de snapshot histórico, grupo inativo bloqueia envio sem exclusão física, participantes existentes validados, retry de envio para grupo sem duplicação e descarte de sessão antiga.

---

### Bloco 2: Portal do Paciente Web (Consulta Própria com Mascaramento LGPD)

- **Fundamento Documental:** Cotação Item 01 (_"O sistema deve disponibilizar ao paciente visualizar seus atendimentos realizados (via web) / agendamentos de consultas e procedimentos / resultados de exames / medicamentos dispensados, através de acesso web"_), DOC-02 Seção 7.4.4.3.b.iv e conformidade LGPD da Seção 7.4.4.3.b.iii.
- **Natureza:** Código interno implementável (nova rota e visão web restrita).
- **Escopo Exato:**
  1. Criação de rota pública dedicada de autenticação do cidadão (`/paciente/login`) com validação de CPF + Data de Nascimento + validação de segurança (ou CNS).
  2. Tela de visão exclusiva do paciente logado (`src/components/PortalPacienteView.tsx`) apresentando abas:
     - _Meus Atendimentos:_ histórico de passagens no PA e internações (data, unidade, especialidade);
     - _Meus Agendamentos:_ consultas e procedimentos ambulatoriais futuros confirmados;
     - _Meus Laudos de Exames:_ visualização e download dos laudos liberados e finalizados;
     - _Meus Medicamentos:_ relação de itens dispensados pela farmácia hospitalar ao paciente.
  3. Proteção estrita de dados (LGPD): token de sessão restrito à visualização exclusiva dos registros daquele CPF, sem acesso a nenhuma outra área administrativa do hospital.
- **Critérios de Aceite Testáveis:**
  - Paciente autenticado com CPF e data de nascimento correta acessa apenas seus próprios registros;
  - Tentativa de consulta com dados divergentes é rejeitada com mensagem clara;
  - Exibição de laudos de exames reflete fielmente os laudos liberados no módulo laboratorial;
  - Interface não expõe dados de outros pacientes nem permite navegação para o painel de funcionários.

---

### Bloco 3: Módulo de Gerenciamento e Emissão de APAC

- **Fundamento Documental:** DOC-02 Seção 7.4.4.4 (pp. 31-32), ANEXO I itens 133 e 162.
- **Natureza:** Código interno implementável.
- **Escopo Exato:**
  1. Criação das coleções `apac_faixas_numeracao` (ano, UF, tipo de APAC, faixa inicial, faixa final, número atual) e `apac_solicitacoes` (paciente, solicitante, data, número do laudo, clínica/prestador, CIDs principal/secundário/causas associadas, tipo de laudo [Geral, Medicamentos, Nefrologia, Quimioterapia, Radioterapia, Bariátrica], modalidade [Inicial, Continuidade, Sem Continuidade] e validade).
  2. Serviço cliente `src/services/apac.ts` com validação de prazos de validade e geração sequencial de numeração autorizada.
  3. Integração com o atendimento médico (PEP/PA) permitindo emitir laudo de solicitação de APAC diretamente a partir dos dados do paciente.
  4. Tela de gestão de APACs para o setor de faturamento/regulação acompanhar laudos pendentes e autorizados.
- **Critérios de Aceite Testáveis:**
  - Emissão de APAC preenche automaticamente os dados cadastrais do paciente (nome, mãe, CNS, data de nascimento, sexo);
  - Sequenciamento respeita o ano, UF e tipo de laudo sem gerar números repetidos;
  - Prazos de validade inicial e final calculados conforme o tipo de procedimento.

---

### Bloco 4: Controle de Frota, Transporte Sanitário e TFD

- **Fundamento Documental:** Cotação Item 01 (_"Módulo Controle de Viagens"_), ANEXO I itens 333 a 345, DOC-02 Seção 7.4.4.2 (pp. 27-30).
- **Natureza:** Código interno implementável.
- **Escopo Exato:**
  1. Criação das coleções:
     - `transporte_veiculos`: placa, marca, modelo, tipo, capacidade de passageiros, combustível, vencimento do extintor, status operacional;
     - `transporte_motoristas`: nome, CPF, CNH, categoria, vencimento da CNH, telefone, status ativo;
     - `transporte_viagens`: rota/destino, data/hora de saída, previsão de retorno, veículo, motorista, km inicial, km final, km rodado, despesas/diárias;
     - `transporte_passageiros`: vínculo da viagem com paciente e acompanhante, indicação de ida/volta, horário de aviso e documento de referência;
     - `tfd_processos`: número do processo de TFD, paciente, diagnóstico CID-10, justificativa clínica, município de destino, tratamento solicitado e status (autorizado, cancelado, enviado ao estado, negado, concluído).
  2. Serviço cliente `src/services/transporteTFD.ts` com cálculo de vagas remanescentes no veículo e controle de km.
  3. Tela de gestão `src/components/TransporteTFDView.tsx` com agendamento de viagens, lista de passageiros e emissão de comprovante/bilhete de viagem.
- **Critérios de Aceite Testáveis:**
  - Alocação de passageiros respeita a capacidade de lotação cadastrada do veículo;
  - Viagem não permite alocação de motorista com CNH vencida;
  - Processo de TFD permite vincular múltiplas viagens ao mesmo tratamento;
  - Emissão de bilhete de passagem do paciente e acompanhante com horário e local de embarque.

---

### Bloco 5: RIS - Serviço de Radiodiagnóstico e Imagem (Editor de Laudos e Fluxo)

- **Fundamento Documental:** Cotação Item 01 (_"Módulo Radiologia"_), ANEXO I itens 313 a 322, DOC-02 Seção 7.4.3.4 (pp. 21-22).
- **Natureza:** Código interno implementável.
- **Escopo Exato:**
  1. Criação das coleções `ris_modelos_laudo` (título, modalidade [RX, USG, TC, ECG], texto padrão pré-formatado) e expansão do fluxo de exames de imagem.
  2. Tela dedicada `src/components/RadiologiaRISView.tsx` com:
     - Fila de exames de imagem realizados aguardando confecção de laudo;
     - Editor de laudo formatado com barra de ferramentas (negrito, itálico, listas, tabelas, quebra de linha);
     - Seletor de modelos pré-definidos para agilizar a digitação médica;
     - Visualização prévia da folha timbrada do laudo antes da liberação formal;
     - Controle de filmes radiológicos utilizados/avariados.
  3. Integração automática: laudo emitido pelo radiologista é vinculado imediatamente à linha do tempo do Prontuário SAME e disponibilizado para impressão.
- **Critérios de Aceite Testáveis:**
  - Médico radiologista seleciona exame na fila de espera e insere modelo de laudo padrão com 1 clique;
  - Editor permite formatação e salva laudo com status liberado de forma imutável;
  - Laudo finalizado é exibido imediatamente no Prontuário SAME do paciente e na folha impressa A4.

---

## 8. Dependências Externas Separadas (Não Tratadas como Próximas Tarefas)

Para evitar falsas expectativas operacionais, as demandas que dependem de autorizações federais, certificados pagos ou contratações de serviços físicos ficam explicitamente isoladas como **DEPENDÊNCIAS EXTERNAS**:

1. **Certificação Digital ICP-Brasil (DOC-02, Seção 7.4.7):**
   - Assinatura qualificada com padrões CAdES/XAdES/PAdES, suporte a token PKCS#11/A3 e Carimbo do Tempo RFC 3161. Exige contratação de Autoridade Certificadora credenciada no ITI.
2. **Integração Online com Bases Federais (e-SUS PEC, CADWEB, SISAB, SINAN):**
   - Comunicação via webservices restritos governamentais requer chaves de acesso, credenciamento no Ministério da Saúde e homologação junto à Secretaria Estadual de Saúde de Rondônia (SES/RO).
3. **Homologação DATASUS dos Arquivos de Remessa do Faturamento:**
   - Transmissão dos arquivos gerados de AIH e BPA exige validação nos programas oficiais executáveis federais (Validador SIHD Desktop e BPA Magnético Desktop).
4. **Servidor DICOM / PACS:**
   - Armazenamento de arquivos pesados de imagem em formato DICOM (.dcm) e integração HL7 com aparelhos de tomografia/RX exigem servidor local dedicado (ex: Orthanc PACS) e infraestrutura física no hospital.
5. **Serviços Contratuais e Presenciais da Cotação:**
   - Suporte presencial na sede da SEMSAU, treinamento presencial de servidores e conversão da base legada do eSUS são obrigações de serviço da empresa contratada, e não tarefas de código de software.

---

## 9. Conclusão e Prontidão

A presente matriz consolida a governança documental do projeto:

- Persiste a leitura integral dos três arquivos PDF anexados;
- Reclassifica com rigor portal do paciente e mensageria interna como requisitos exigidos pelo município;
- Detalha item a item os cadastros gerais e afasta falsas conformidades;
- Preserva todas as 69 exclusões deliberadas e os limites de vacinas e georreferenciamento;
- Estabelece os cinco próximos blocos estritamente viáveis no repositório.
