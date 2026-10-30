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

- **Correção Conceitual:** O SAMU é composto por fluxos de registro administrativo interno e acolhimento hospitalar (tipo de ocorrência, solicitante, vítima, classificação de risco, unidade de destino, unidade móvel, relatórios por período/unidade).
- **Não presumir dependência de telemetria:** O texto dos itens 407 a 417 do ANEXO I e da Seção 7.4.5.1.e.i do DOC-02 **NÃO exige** telemetria de ambulância via satélite, app móvel de rua ou equipamentos embarcados. Exige registro das ocorrências móveis e encaminhamento para a unidade de saúde receptora.
- **Classificação:** **NÃO ATENDE (Requisito da Cotação / Código Interno Implementável)**.

### 5.5. RIS / Radiologia e Diagnóstico por Imagem (Itens 313 a 322 e Seção 7.4.3.4)

- **Correção Conceitual:** A versão anterior classificou como dependente de PACS externo pago.
- **Requisitos Reais do Texto:** Lançamento de procedimentos diagnósticos por imagem (RX, Tomografia, ECG, Ultrassom), integração nativa com requisição no PEP, lista de exames aguardando laudo, resultados padrões/modelos pré-definidos, editor rico de laudos, visualização prévia, agendamento de exames, anexação do laudo ao PEP, controle de filmes radiológicos/perdas e relatórios gerenciais de exames.
- **Não presumir PACS obrigatório:** O texto do edital não exige infraestrutura de servidor PACS/DICOM pago. Exige o sistema de informação radiológica (RIS) com laudo digitado, modelos e controle operacional.
- **Classificação:** **PARCIAL (Código Interno Implementável - Bloco 5)**. O sistema possui solicitação e laudo de imagem genérico em `ExamesLaudosView.tsx`, mas carece de fila dedicada de laudos radiológicos, editor rico e controle de filmes.

### 5.6. Transporte Sanitário e TFD (Itens 333 a 345 e Seção 7.4.4.2)

- **Requisitos Reais do Texto:** Cadastro de frota (veículos, placas, chassi, extintor, motoristas CNH), rotas, viagens, passageiros e acompanhantes, custos, despesas de viagem, bilhete de passagem, processos de TFD (número, CID-10, justificativa, status, viagens em lote) e faturamento de transporte via BPA por km percorrido.
- **Classificação:** **NÃO ATENDE (Requisito da Cotação / Código Interno Implementável - Bloco 4)**. Código 100% interno e viável no repositório.

### 5.7. Gerenciamento de APACs (Seção 7.4.4.4 e Faturamento)

- **Requisitos Reais do Texto:** Controle de sequenciamento de numeração autorizada (ano/UF/tipo), validade (início e fim), solicitações com tipificação de laudo (Geral, Medicamentos, Nefrologia, Quimioterapia, Radioterapia, Bariátrica), modalidade (Inicial, Continuidade, Sem Continuidade), mapeamento do paciente e geração a partir do PEP.
- **Classificação:** **NÃO ATENDE (Código Interno Implementável - Bloco 3)**. A emissão de laudo e gestão de autorização de APAC é código clínico/administrativo interno viável; exportação em lote para faturamento federal é dependência separada.

### 5.8. Serviço de Nutrição e Dietética - SND (Seção 7.4.3.5)

- **Requisitos Reais do Texto:** Cadastro parametrizado de dietas (enterais, parenterais, orais, rotina), prescrição individualizada por paciente internado ou em observação com horários e restrições alimentares, mapa/relatório de refeições por período/leito e integração com estoque de nutrição.
- **Classificação:** **PARCIAL (Código Interno Implementável)**. A prescrição de cuidados/dietas existe na `PrescricaoEnfermagemTab.tsx`, mas o mapa de copa/leito e catálogo do SND ainda não formam tela independente.

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

| Módulo / Tema                        | Referência DOC-01 (Itens) | Referência DOC-02 (Seção) | Requisito Cotação DOC-03 | Componente / Serviço / Hook Existente                                       |            Status Consolidado            | Justificativa / Próxima Ação                                                     |
| :----------------------------------- | :-----------------------: | :-----------------------: | :----------------------: | :-------------------------------------------------------------------------- | :--------------------------------------: | :------------------------------------------------------------------------------- |
| **Segurança, Acesso e Auditoria**    |      1 a 14, 428–429      |          7.4.1.1          |      Sim (Item 01)       | `LoginView.tsx`, `AuditoriaView.tsx`, `auditoria.ts`, RLS                   |                **ATENDE**                | Perfis admin, gestor, profissional, recepcao com trilha imutável.                |
| **Cadastros Gerais e Leitos**        |  1 a 35 (exceto 21, 24)   |     7.4.1.2, 7.4.1.3      |      Sim (Item 01)       | `SetoresLeitosView.tsx`, `ProfissionaisView.tsx`, `cadastros.ts`            |               **PARCIAL**                | Leitos e setores atendem; cadastros auxiliares têm itens não verificados.        |
| **Identificação e Busca Paciente**   |        1 a 12, 27         |          7.4.2.2          |      Sim (Item 01)       | `PacientesView.tsx`, `identificacaoPaciente.ts`, hooks de busca             |                **ATENDE**                | CPF/CNS validados algorítmicamente, índices parciais e mascaramento LGPD.        |
| **Integração eSUS PEC / CADSUS**     |            36             |          7.4.2.5          |      Sim (Item 01)       | `IntegracoesView.tsx`, `parametros.ts`                                      | **DEPENDE DE INTEGRAÇÃO OU HOMOLOGAÇÃO** | Telas de parâmetros prontas; integração com webservice federal não comprovada.   |
| **Agendamento Ambulatorial**         |          38 a 55          |          7.4.4.1          |      Sim (Item 01)       | `AgendamentosView.tsx`, `agendamentos.ts`, `dataFusoUnidade.ts`             |                **ATENDE**                | Fila ambulatorial, fuso de Mirante da Serra (`America/Porto_Velho`).             |
| **Pronto Atendimento (PA)**          |         106 a 128         |     7.4.2.3, 7.4.5.1      |      Sim (Item 01)       | `ProntoAtendimentoView.tsx`, `prontoAtendimento.ts`                         |                **ATENDE**                | Acolhimento, Manchester (5 cores), consultório médico, prescrição rápida.        |
| **Consultório Médico / Prescrição**  |    78 a 105, 149 a 189    |     7.4.2.4, 7.4.5.2      |      Sim (Item 01)       | `PrescricaoEnfermagemTab.tsx`, `prescricoes.ts`, migração 0023              |                **ATENDE**                | Prescrição estruturada, checagem ao leito idempotente e retificação formal.      |
| **Internação e Censo Hospitalar**    |         346 a 373         |          7.4.5.1          |      Sim (Item 01)       | `InternacaoView.tsx`, `internacoes.ts`, `internacoes.pb.js`                 |                **ATENDE**                | Mapa de leitos, admissão, transferência leito a leito e alta hospitalar.         |
| **Centro Cirúrgico e SRPA**          |         281 a 310         |         7.4.5.1.d         |      Não explícito       | `CentroCirurgicoView.tsx`, `centroCirurgico.ts`                             |                **ATENDE**                | Escala de salas, checklist OMS Safe Surgery, ato cirúrgico e Aldrete-Kroulik.    |
| **Centro Obstétrico e Parto**        |         332 a 350         |         7.4.2.2.h         |      Não explícito       | `CentroObstetricoView.tsx`, `centroObstetrico.ts`                           |                **ATENDE**                | Admissão com risco, partograma simplificado, escala de Apgar e desfecho.         |
| **Central de Regulação de Leitos**   |   226 a 235, 351 a 373    |         7.4.4.1.f         |      Sim (Item 01)       | `RegulacaoView.tsx`, `regulacao.ts`, `regulacaoRelogio.ts`                  |                **ATENDE**                | Solicitação leito a leito, médico regulador, relógio de espera imune a UTC.      |
| **Farmácia e Almoxarifado**          |  236 a 279 (exceto 280)   |          7.4.3.1          |      Sim (Item 01)       | `FarmaciaView.tsx`, `InventarioFarmaciaTab.tsx`, `farmacia.ts`              |                **ATENDE**                | Catálogo, dispensação rastreável por lote/validade, inventário concorrente.      |
| **Laboratório de Análises Clínicas** |         286 a 312         |          7.4.3.3          |      Sim (Item 01)       | `ExamesLaudosView.tsx`, `exames.ts`, migração 0024                          |               **PARCIAL**                | Ciclo solicitação/coleta/laudo com retificação v1/v2; sem bancada/interface LIS. |
| **Radiologia e Imagem (RIS)**        |         313 a 322         |          7.4.3.4          |      Sim (Item 01)       | `ModalSolicitarExame.tsx`, `ExamesLaudosView.tsx`                           |               **PARCIAL**                | Exames de imagem cadastrados; falta editor rico RIS e controle de filmes.        |
| **SAME e Impressos Oficiais A4**     |   390 a 403, 405 a 426    |       7.4.5.1.e.ii        |      Não explícito       | `ProntuarioSAMEView.tsx`, `FolhaImpressoA4.tsx`, `ModalEmissaoImpresso.tsx` |                **ATENDE**                | Prontuário unificado por CPF/CNS, snapshot congelado de impressos e retificação. |
| **Vigilância Epidemiológica**        | 323 a 330 (331 excluído)  |          7.4.8.1          |      Sim (Item 01)       | `VigilanciaSaudeView.tsx`, `vigilanciaSaude.ts`                             |               **PARCIAL**                | Notificação imediata/semanal e catálogo; sem envio telemático SINAN.             |
| **Painel de Gestão Hospitalar**      |  453 a 474 (indicadores)  |          5.4.6.1          |      Sim (Item 01)       | `PainelGestaoView.tsx`, `painelGestao.ts`, hook server-side                 |                **ATENDE**                | Visão agregada web do gestor, proteção de dados LGPD e fuso de Mirante.          |
| **Portal do Paciente Web**           |  390 a 397 (exceto 393)   |       7.4.4.3.b.iv        |      Sim (Item 01)       | N/A                                                                         |              **NÃO ATENDE**              | Requisito da cotação; consulta própria do paciente com login e LGPD.             |
| **Mensageria Interna / Chat**        |         419 a 421         |          7.4.6.2          |      Sim (Item 01)       | N/A                                                                         |              **NÃO ATENDE**              | Requisito da cotação; chat interno entre usuários e grupos hospitalares.         |
| **Transporte Sanitário e TFD**       |         333 a 345         |          7.4.4.2          |      Sim (Item 01)       | N/A                                                                         |              **NÃO ATENDE**              | Requisito da cotação; frotas, motoristas, viagens, diárias e TFD.                |
| **Módulo de APAC**                   |         133, 162          |          7.4.4.4          |      Não explícito       | N/A                                                                         |              **NÃO ATENDE**              | Emissão e controle de laudos de alta complexidade e sequenciamento.              |
| **Serviço de Nutrição e Dietética**  |            N/A            |          7.4.3.5          |      Não explícito       | `PrescricaoEnfermagemTab.tsx` (campo de dieta)                              |               **PARCIAL**                | Prescrição médica existe; gestão do SND e mapa de copas pendentes.               |
| **SAMU (Ocorrências Móveis)**        |         407 a 417         |        7.4.5.1.e.i        |      Sim (Item 01)       | N/A                                                                         |              **NÃO ATENDE**              | Registro de acolhimento de ocorrências móveis e encaminhamento ao PA.            |
| **Avaliador BPA-C / BPA-I**          |         453 a 474         |          7.4.5.3          |      Sim (Item 01)       | `FaturamentoView.tsx`, `consistenciaFaturamento.ts`                         |               **PARCIAL**                | Validação prévia implementada; conciliação visual estilo BPA-Mag em aberto.      |
| **Certificação Digital ICP-Brasil**  |            N/A            |           7.4.7           |      Não explícito       | N/A                                                                         | **DEPENDE DE INTEGRAÇÃO OU HOMOLOGAÇÃO** | Assinatura qualificada A1/A3, carimbo do tempo RFC 3161 (requer AC credenciada). |
| **Suporte a Tablets Hospitalares**   |            N/A            |           7.4.9           |      Não explícito       | Layout responsivo Tailwind (`PrescricaoEnfermagemTab.tsx`)                  |               **PARCIAL**                | Operável em navegadores de tablets Android; falta auditoria de dispositivo.      |

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

- **Fundamento Documental:** Cotação Item 01 (_"O sistema deve permitir o envio de mensagens entre usuários e ou grupos do sistema; controle de avisos aos usuários"_), ANEXO I itens 419 e 421.
- **Natureza:** Código interno implementável (PocketBase realtime / coleções internas).
- **Escopo Exato:**
  1. Criação da coleção `mensagens_internas` com remetente, destinatário (usuário ou grupo/setor), assunto, corpo da mensagem, indicador de leitura e timestamp UTC.
  2. Criação da coleção `canais_grupos_mensageria` para grupos funcionais (ex: Plantão Médico, Enfermagem PA, Recepção, Regulação, Farmácia).
  3. Componente de UI tipo gaveta/modal (`src/components/MensageriaInternaModal.tsx` ou view dedicada) permitindo ler mensagens recebidas, compor nova mensagem individual ou para grupo e marcar como lida.
  4. Indicador visual na barra de navegação superior (`NavigationBar.tsx`) com badge de mensagens não lidas atualizado via subscrição em tempo real.
- **Critérios de Aceite Testáveis:**
  - Usuário A envia mensagem para Usuário B; Usuário B visualiza a mensagem em sua caixa de entrada;
  - Usuário C envia mensagem para o grupo "Enfermagem PA"; todos os usuários vinculados a esse setor recebem o aviso;
  - Marcação de mensagem como lida altera o contador do badge;
  - Isolamento de acesso: Usuário sem permissão não consegue ler mensagens privadas de terceiros.

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
