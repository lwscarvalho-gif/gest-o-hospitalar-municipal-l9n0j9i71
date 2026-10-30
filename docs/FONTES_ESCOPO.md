# Fontes de Escopo e Referências Normativas do Sistema Hospitalar Municipal

**Projeto:** Sistema Integrado de Gestão Hospitalar Municipal (Mirante da Serra / RO)  
**Data de Fixação Documental:** 30 de Outubro de 2026  
**Finalidade:** Persistência integral das referências textuais, transcrições literais, números de itens, subseções e páginas dos três documentos oficiais recebidos em anexo, dispensando novas solicitações de arquivos no fluxo de desenvolvimento.

---

## 1. Identificação Geral dos Três Documentos Recebidos

| ID Documento | Nome do Arquivo Recebido / Asset Local                                                                 | Extensão / Páginas | Órgão / Título Oficial Declarado                                                                                                                                            | Finalidade Técnica no Projeto                                                                                                                                                                                                                                                      |
| :----------- | :----------------------------------------------------------------------------------------------------- | :----------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DOC-01**   | `modulos-modelo-base-f0a3f.pdf`<br>_(Asset: `src/assets/modulos-modelo-base-f0a3f.pdf`)_               |     27 páginas     | **ANEXO I – SETORES / TESTE DE CONFORMIDADE E CRITÉRIOS OBRIGATÓRIOS PARA AVALIAÇÃO / PROVA DE CONCEITO - DEMONSTRAÇÃO DE SOFTWARES** _(Sistema Integrado de Gestão Saúde)_ | Relação nominal de 474 itens de teste funcional de conformidade (itens 1 a 474). Base dos 69 itens excluídos confirmados pelo usuário.                                                                                                                                             |
| **DOC-02**   | `modulos-1-ea88d.pdf`<br>_(Asset: `src/assets/modulos-1-ea88d.pdf`)_                                   |     45 páginas     | **ANEXO I - MÓDULOS DE ESPECIFICAÇÃO TÉCNICA FUNCIONAL**                                                                                                                    | Caderno de encargos técnicos funcionais detalhados em seções 7.4.1 a 7.4.9 (Cadastros, Núcleo Assistencial, Logística/Apoio Diagnóstico, Regulação/Transporte/TFD/APAC, Hospital/SAME/Faturamento, BI/Mensageria/HelpDesk, Certificação Digital, Vigilância, Dispositivos Móveis). |
| **DOC-03**   | `cotacao-sistema-hospitalar-9345d.pdf`<br>_(Asset: `src/assets/cotacao-sistema-hospitalar-9345d.pdf`)_ |     2 páginas      | **PREFEITURA MUNICIPAL DE MIRANTE DA SERRA / SECRETARIA MUNICIPAL DE SAÚDE – SEMSAU / FUNDO MUNICIPAL DE SAÚDE – FMS / PRÉ–COTAÇÃO DE PREÇOS**                              | Especificação de contratação do software (Item 01, 12 meses), requisitos operacionais expressos de mensageria interna, portal do paciente web, painel web do gestor e conversão eSUS.                                                                                              |

---

## 2. DOC-03: Pré-Cotação de Preços (Mirante da Serra - RO, 2 páginas)

### 2.1. Metadados e Cabeçalho Oficial

- **Interessado:** Secretaria Municipal de Saúde de Mirante da Serra–RO
- **Responsável pela Pesquisa:** GLAUCIANO DE ASSIS SILVA (Mat. 2984, Diretor Dep. Adm. e Financeiro)
- **Contato Oficial:** Telefone: 69 - 993666225 | E-mail: `semsau@mirantedaserra.ro.gov.br`
- **Objeto da Contratação:** _"Contratação de empresa especializada para o fornecimento de software integrado para gestão de saúde pública, multiusuários, no modo de licenças de uso de programas, sem limite de usuários para atendimento de necessidades de diversas áreas da Secretaria Municipal de Saúde."_

### 2.2. Transcrição Literal dos Requisitos do ITEM 01 (Páginas 1 e 2)

> **[Citação Textual Estrita do Item 01 - Páginas 1 e 2]:**
>
> "ITEM 01: LICENÇA DE USO DE SOFTWARE APLICATIVO (CESSÃO DE USO) DO SISTEMA DE GESTÃO DE SAÚDE WEB, UTILIZANDO TÉCNICAS DE INFORMÁTICA ADEQUADAS AO SISTEMA SAI/SUS E AOS PRECEITOS E NORMAS TÉCNICAS VINCULADAS AO MINISTÉRIO DA SAÚDE.
>
> MÓDULOS/SISTEMA:
>
> - CONTROLE DE SEGURANÇA DE ACESSO;
> - INTEGRIDADE E CONSISTÊNCIA;
> - MODULO CADASTRO;
> - MODULO ATENDIMENTO;
> - MODULO PRONTO ATENDIMENTO;
> - MODULO SAMU;
> - MODULO CONSULTÓRIO MÉDICO;
> - MODULO FATURAMENTO;
> - MODULO ESTOQUE/ALMOXARIFADO;
> - MODULO FARMÁCIA;
> - MODULO LABORATÓRIO;
> - MODULO RADIOLOGIA;
> - MODULO VIGILÂNCIA SANITÁRIA E EPIDEMIOLÓGICA;
> - MODULO REGULAÇÃO;
> - MÓDULO CONTROLE DE VIAGENS;
> - MODULO INTERNAÇÃO HOSPITALAR;
>
> O SISTEMA DEVE PERMITIR O ENVIO DE MENSAGENS ENTRE USUÁRIOS E OU GRUPOS DO SISTEMA;
>
> O SISTEMA DEVE POSSUIR CONTROLE DE AVISOS AOS PACIENTES QUANDO BUSCAREM ATENDIMENTO;
>
> O SISTEMA DEVE DISPONIBILIZAR AO PACIENTE VISUALIZAR SEUS ATENDIMENTOS REALIZADOS (VIA WEB) / AGENDAMENTOS DE CONSULTAS E PROCEDIMENTOS / RESULTADOS DE EXAMES / MEDICAMENTOS DISPENSADOS, ATRAVÉS DE ACESSO WEB.
>
> O SISTEMA DEVE DISPONIBILIZAR AO GESTOR ATRAVÉS DO ACESSO WEB A VISUALIZAÇÃO DE GRÁFICOS GERENCIAIS E QUANTITATIVOS.
>
> O ATENDIMENTO A SOLICITAÇÃO DO SUPORTE DEVERÁ SER REALIZADO NA SEDE DA SECRETARIA MUNICIPAL DE SAÚDE, POR TÉCNICO APTO A PROVER O DEVIDO SUPORTE AO SISTEMA.
>
> COM CONVERSÃO eSUS, IMPLANTAÇÃO E TREINAMENTO DE USUÁRIOS.
> UNIDADE: MÊS | QUANTIDADE: 12"

### 2.3. Análise Racional dos Requisitos da Cotação (Paráfrase e Diretrizes Técnicas)

1. **Portal do Paciente Web (Consulta Própria):**
   - _Obrigação:_ O munícipe deve poder acessar via web seu próprio histórico: atendimentos realizados, agendamentos futuros de consultas e procedimentos, resultados de seus exames e medicamentos dispensados pela farmácia.
   - _Relação com exclusões:_ Os itens amarelos 404 e 427 do ANEXO I referem-se a "Agendamento web pelo munícipe" e "Consulta de estoque geral de medicamentos na farmácia municipal por autocomplete aberto". A consulta individualizada de prontuário e exames do próprio paciente autenticado é **exigência explícita da cotação** e deve ser implementada com conformidade LGPD (mascaramento de dados e autenticação individual).
2. **Mensageria Interna:**
   - _Obrigação:_ "Envio de mensagens entre usuários e ou grupos do sistema".
   - _Diretriz:_ Trata-se de funcionalidade interna entre operadores/profissionais da rede de saúde (ex: recados entre enfermagem e médico, aviso de regulação, avisos entre setores). Não envolve envio externo SMS/WhatsApp real pago nesta fase, mas exige estrutura de chat/mensageria interna de sistema.
3. **Visão Web do Gestor com Gráficos Gerenciais e Quantitativos:**
   - Atendida conceitualmente pela evolução do Painel de Gestão Hospitalar em Tempo Real (v0.0.42 a v0.0.44), necessitando consolidação de gráficos visuais de produção.
4. **Serviços Operacionais e Contratuais (Fora de Desenvolvimento de Código):**
   - Suporte técnico presencial na sede da SEMSAU, implantação, treinamento de usuários e conversão legada de base do eSUS representam obrigações de serviço da empresa contratada, e não código executável a ser emulado localmente.

---

## 3. DOC-01: ANEXO I – Teste de Conformidade (27 páginas, Itens 1 a 474)

### 3.1. Estrutura de Seções do Documento de 27 Páginas

- **Páginas 1 a 3:** `CADASTROS` (Itens 1 a 36)
- **Páginas 3 a 5:** `ATENDIMENTOS` (Itens 37 a 77)
- **Páginas 5 a 6:** `CONSULTORIO MÉDICO` (Itens 78 a 105)
- **Páginas 6 a 9:** `PRONTO ATENDIMENTO` (Itens 106 a 148.1)
- **Páginas 9 a 10:** `CONSULTORIO MÉDICO DE PRONTO ATENDIMENTO` (Itens 149 a 182)
- **Página 11:** `EVOLUÇÃO MÉDICA` (Itens 183 a 189)
- **Página 11:** `PROGRAMA SAUDE NA FAMILIA` (Itens 190 a 198) — **INTEGRALMENTE EXCLUÍDO (Amarelo)**
- **Páginas 11 a 12:** `FATURAMENTO` (Itens 199 a 216)
- **Página 12:** `IMUNIZAÇÃO` (Itens 217 a 225) — **INTEGRALMENTE EXCLUÍDO (Decisão Usuário/Amarelo)**
- **Páginas 12 a 13:** `REGULAÇÃO` (Itens 226 a 235)
- **Páginas 13 a 14:** `ESTOQUE E ALMOXARIFADO` (Itens 236 a 267)
- **Páginas 14 a 15:** `INTEGRAÇÃO MUNICIPAL VIA WEBSERVICE` (Itens 268 a 273)
- **Página 15:** `DISPENSÁRIO DE MEDICAMENTOS FARMACIA` (Itens 274 a 285)
- **Páginas 15 a 16:** `LABORATORIO` (Itens 286 a 312)
- **Páginas 16 a 17:** `RADIOLOGIA / ULTRASSONS` (Itens 313 a 322)
- **Página 17:** `VIGILANCIA SANITÁRIA` (Itens 323 a 332)
- **Páginas 17 a 18:** `CONTROLE DE TRANSPORTE E VIAGENS` (Itens 333 a 345)
- **Páginas 18 a 19:** `INTERNAÇÃO HOSPITALAR` (Itens 346 a 373)
- **Páginas 19 a 20:** `ACS MOBILE / TABLETs` (Itens 374 a 389) — **EXCLUÍDO (Amarelo)** _(Não exclui tablets hospitalares 7.4.9)_
- **Página 20:** `PORTAL DO CIDADÃO` (Itens 390 a 397)
- **Página 21:** `GABINETE DO PREFEITO` (Itens 398 a 406)
- **Página 21:** `SAMU` (Itens 407 a 417)
- **Páginas 21 a 22:** `GERAL` (Itens 419 a 424)
- **Página 22:** `PORTAL DE TRANSPARENCIA MEDICAMENTOS` (Itens 425 a 429)
- **Páginas 22 a 24:** `MÓDULO INTEGRADO DE GESTÃO E SALA DE SITUAÇÃO DA ATENÇÃO PRIMARIA` (Itens 430 a 452) — **INTEGRALMENTE EXCLUÍDO (Amarelo)**
- **Páginas 24 a 27:** `MÓDULO DE AVALIAÇÃO DO BPA-C E BPA-I` (Itens 453 a 474 e tabelas de críticas E001–A610)

---

### 3.2. Transcrição Literal dos Trechos Relevantes por Seção (Com Página do PDF)

#### Seção Cadastros Gerais e Auxiliares (Páginas 1 a 3)

- **Item 1 (p. 1):** _"O sistema deve permitir cadastrar o paciente gerando número único no SOFTWARE."_
- **Item 2 (p. 1):** _"O sistema deve permitir vincular o número do cadastro do paciente ao número do cartão nacional de saúde."_
- **Item 3 (p. 1):** _"O sistema deve fazer a validação do número do cartão nacional."_
- **Item 4 (p. 1):** _"O sistema deve permitir vincular a foto paciente ao cadastro."_
- **Item 5 (p. 1):** _"O sistema deve permitir cadastrar a(s) deficiência(s) do paciente."_
- **Item 6 (p. 1):** _"O sistema não deve permitir cadastro com duplicidade, fazendo validações de acordo com os dados informados no cadastro."_
- **Item 7 (p. 1):** _"O sistema deve permitir a impressão da ficha cadastral do paciente."_
- **Item 8 (p. 1):** _"O sistema deve permitir a impressão da carteira paciente."_
- **Item 9 (p. 1):** _"O sistema deve possibilitar a realização da busca do paciente através do número do paciente, data de nascimento, número do cartão nacional de saúde ou nome da mãe."_
- **Item 10 (p. 1):** _"O sistema deve permitir a emissão de cartões dos pacientes cadastrados, contendo: nome do paciente, data de nascimento, nome da mãe, número do cartão paciente e número do cartão SUS."_
- **Item 11 (p. 1):** _"O sistema deve informar se paciente é doador de sangue."_
- **Item 12 (p. 1):** _"O sistema deve informar tipagem Sanguínea do paciente."_
- **Item 13 (p. 1):** _"O sistema deve permitir controle de auditoria no cadastro Pessoa Física."_
- **Item 14 (p. 1):** _"O sistema deve permitir cadastrar profissionais com suas devidas ocupações e perfis de Atendimento."_
- **Item [14b] (p. 1):** _"O sistema deve permitir cadastrar Pessoas Jurídicas."_
- **Item 15 (p. 2):** _"O sistema permitir o cadastro de novas CID’s ou que seja feita alterações na mesma."_
- **Item 16 (p. 2):** _"O sistema deve permitir que seja cadastrado novos Bairros, Endereços, regiões e domicílios."_
- **Item 17 (p. 2):** _"O sistema deve permitir que seja cadastrado estoque, entidade, funções, tipos de exames, guichês do estoque, produtos no estoque e gestores do hórus."_
- **Item 18 (p. 2):** _"O sistema deve permitir cadastrar laboratórios e hospitais."_
- **Item 19 (p. 2):** _"O Permitir o cadastramento de profissionais, ocupação, ocupação por profissional, ine, operações e perfil de consultório."_
- **Item 20 (p. 2):** _"O sistema deve permitir cadastrar formas de abastecimento de água."_
- **Item 21 (p. 2 - EXCLUÍDO):** _"O sistema deve permitir cadastrar as áreas da família."_
- **Item 22 (p. 2):** _"O sistema deve permitir cadastrar formas de destino de fezes e urinas."_
- **Item 23 (p. 2):** _"O sistema deve permitir cadastrar formas de destino do lixo."_
- **Item 24 (p. 2 - EXCLUÍDO):** _"O sistema deve permitir cadastrar famílias e famílias nas micro áreas."_
- **Item 25 (p. 2):** _"O sistema deve permitir cadastrar formas de tratamento de água."_
- **Item 26 (p. 2):** _"O sistema deve permitir cadastrar centro de custo, fabricantes, formas, insumos, materiais, medicamentos, motivos de perdas, produtos no gestor e unidades de medida."_
- **Item 27 (p. 2):** _"O sistema deve permitir cadastrar tipos de documentos no cadastro do paciente."_
- **Item 28 (p. 2):** _"O sistema deve permitir cadastrar contas correntes, planos de contas e recursos."_
- **Item 29 (p. 2):** _"O sistema deve permitir cadastrar acomodações, estruturas do hospital e leitos."_
- **Item 30 (p. 2):** _"O sistema deve permitir cadastrar bancadas, etiquetas, exame, grupo de resultados, material, métodos, motivos de impedimento e tipos de exames."_
- **Item 31 (p. 2):** _"O sistema deve permitir cadastrar exames radiológicos, médicos, resultados de exames radiológicos e laudo de resultados de exames radiológicos."_
- **Item 32 (p. 2):** _"O sistema deve permitir cadastrar convênios, tipos de ocorrências e tipos de consulta."_
- **Item 33 (p. 2):** _"O sistema deve permitir cadastrar viaturas e tipos de origem."_
- **Item 34 (p. 2-3):** _"O sistema deve permitir cadastrar doses, especialidades, exames e medicamentos por cid, faixa etária, gestante, grupo de prescrições, grupos de atendimento, hipertensos e diabéticos, modelo de prescrição, motivos de impedimento, perfil de especialidades, perfil de soap, tipos de cancelamento, vacinas e de anamneses."_
- **Item 35 (p. 3):** _"O sistema deve permitir cadastrar os tipos de desfechos."_
- **Item 36 (p. 3):** _"Obrigatoriamente o Cadastro do Paciente deve ter 100% de integração com o sistema eSUS PEC, importando os cadastros dos pacientes de forma automatica, assim que inseridos no eSUS PEC ou Sincronizado com os tablets dos ACS do eSUS Territorio do Ministério da Saude, o Sistema deve apresentar o cadastro do paciente para uso no sistema"_

#### Seção Radiologia / Ultrassons (Páginas 16 e 17)

- **Item 313 (p. 16):** _"O sistema deve permitir a realização e agendamento dos exames."_
- **Item 314 (p. 16):** _"O sistema deve permitir a realização do agendamento dos exames nas unidades de saúde."_
- **Item 315 (p. 17):** _"O sistema deve permitir a impressão dos resultados de exames nas unidades de saúde e consultório médico."_
- **Item 316 (p. 17):** _"O sistema deve emitir comprovante de agendamento para o paciente."_
- **Item 317 (p. 17):** _"O Sistema deve realizar o auto faturamento dos exames do convênio do SUS."_
- **Item 318 (p. 17):** _"O sistema deve emitir relatório de exames realizados por período."_
- **Item 319 (p. 17):** _"O sistema deve emitir relatório de exames realizados por paciente."_
- **Item 320 (p. 17):** _"O sistema deve emitir relatório de exames realizados por profissional."_
- **Item 321 (p. 17):** _"O sistema deve emitir relatório de exames solicitados por profissional."_
- **Item 322 (p. 17):** _"O sistema deve emitir relatório dos exames faturamento por período."_

#### Seção Controle de Transporte e Viagens (Páginas 17 e 18)

- **Item 333 (p. 17):** _"O sistema deve permitir o registro de agendamento de viagens."_
- **Item 334 (p. 18):** _"O sistema deve permitir o registro de viagens."_
- **Item 335 (p. 18):** _"O sistema deve permitir o registro dos profissionais que fizeram parte da viagem."_
- **Item 336 (p. 18):** _"O sistema deve permitir o registro dos pacientes que fizeram parte da viagem."_
- **Item 337 (p. 18):** _"O sistema deve permitir o registro de acompanhantes dos pacientes nas viagens."_
- **Item 338 (p. 18):** _"O sistema deve permitir o registro dos custos da viagem."_
- **Item 339 (p. 18):** _"O sistema deve permitir o registro dos custos com diárias."_
- **Item 340 (p. 18):** _"O sistema deve permitir o registro de notificações."_
- **Item 341 (p. 18):** _"O sistema deve emitir um bilhete de passagem do paciente e acompanhante."_
- **Item 342 (p. 18):** _"O sistema deve emitir relatório dos custos de viagens por período."_
- **Item 343 (p. 18):** _"O sistema deve emitir relatório dos custos de diárias por período."_
- **Item 344 (p. 18):** _"O sistema deve emitir relatório das viagens realizadas por profissional."_
- **Item 345 (p. 18):** _"O sistema deve emitir relatório das viagens realizadas por paciente."_

#### Seção Portal do Cidadão (Página 20)

- **Item 390 (p. 20):** _"O sistema deve permitir a consulta do cadastro do usuário logado;"_
- **Item 391 (p. 20):** _"O sistema deve permitir visualizar as consultas médicas agendadas de forma online;"_
- **Item 392 (p. 20):** _"O sistema deve permitir a impressão de resultados de exames;"_
- **Item 393 (p. 20 - Parcial/Vacinas fora):** _"O sistema deve permitir a consulta e impressão das vacinas aplicadas;"_ _(Nota: vacinas excluídas do projeto)_
- **Item 394 (p. 20):** _"O sistema deve permitir a consulta de informações estatísticas da préconsulta;"_
- **Item 395 (p. 20):** _"O sistema deve permitir a consulta da localidade das unidades de saúde;"_
- **Item 396 (p. 20):** _"O sistema deve permitir o registro de reclamações, sugestões e elogios na ouvidoria;"_
- **Item 397 (p. 20):** _"O sistema deve permitir a consulta e acompanhamento das reclamações na ouvidoria;"_
- _(Nota sobre itens 404 e 427: Item 404 (p. 21, Gabinete Prefeito) = "gráfico de Famílias Cadastradas x Visitadas" - amarelo; Item 427 (p. 22, Portal Transparência Medicamentos) = "cidadão consultar se há medicamento na Farmácia Municipal por autocomplete" - amarelo. O portal do paciente da cotação e da seção 7.4.4.3.b.iv NÃO é excluído)._

#### Seção SAMU (Página 21)

- **Item 407 (p. 21):** _"O sistema deve permitir informar no atendimento o tipo de ocorrência;"_
- **Item 408 (p. 21):** _"O sistema deve permitir informar no atendimento a relação do solicitante com a vítima;"_
- **Item 409 (p. 21):** _"O sistema deve permitir informar no atendimento o nome, sexo e idade da vítima;"_
- **Item 410 (p. 21):** _"O sistema deve permitir informar no atendimento o endereço em que se encontra a vítima;"_
- **Item 411 (p. 21):** _"O sistema deve permitir informar no atendimento a classificação de risco da vítima;"_
- **Item 412 (p. 21):** _"O sistema deve permitir informar no atendimento a Unidade de Saúde para onde a vítima será levada;"_
- **Item 413 (p. 21):** _"O sistema deve permitir informar no atendimento a unidade móvel responsável pelo atendimento;"_
- **Item 414 (p. 21):** _"O sistema deve emitir relatório de atendimentos por tipo de atendimento;"_
- **Item 415 (p. 21):** _"O sistema deve emitir relatório de atendimentos por período;"_
- **Item 416 (p. 21):** _"O sistema deve emitir relatório de atendimentos por cidade;"_
- **Item 417 (p. 21):** _"O sistema deve emitir relatório de atendimentos por unidade móvel."_

#### Seção Geral / Mensageria (Páginas 21 e 22)

- **Item 419 (p. 21):** _"O sistema deve disponibilizar chat para os usuários do sistema."_
- **Item 420 (p. 22):** _"O sistema deve possuir controle de avisos aos pacientes quando buscarem atendimento."_
- **Item 421 (p. 22):** _"O sistema deve possuir controle de avisos aos usuários do sistema."_
- **Item 422 (p. 22):** _"O sistema deve possuir agenda de contatos."_
- **Item 423 (p. 22):** _"O sistema deve possuir biblioteca virtual, possibilitando anexar mais de um arquivo."_
- **Item 424 (p. 22):** _"O sistema deve permitir o envio de SRO."_

#### Seção Avaliador BPA-C e BPA-I (Páginas 24 a 27, Itens 453 a 474)

- **Item 453 (p. 24):** _"Dashboard para Avaliar dados do BPA-Mag e Avaliador de Dados"_
- **Item 454 (p. 24):** _"Avaliador de Produção Consolidade com Filtros, Dashboard de Total de Registros, Qtd. Produzida e Erros"_
- **Item 455 (p. 24):** _"Funcionalidade de Correção individual e em lote"_
- **Item 456 (p. 24):** _"Produção BPA-I (Individualizado) com Filtros, Produção separada Por Folha e Sequencias no estilo do BPA-Mag"_
- **Item 457 (p. 24):** _"Possibilidade de Filtrar registros com erros e escolhendo os erros que deseja ver de acordo com a tabela de erros do BPA"_
- **Item 458 (p. 24):** _"Exibição de Registros em Modo detalhado e com funções de correção individual"_
- **Item 459 (p. 24):** _"Possibilitar Importar os Profissionais da Base do BPA-Mag e avaliar cadastro e poder corrigir via Sistema;"_
- **Item 460 (p. 24):** _"Possibilitar Importar os Pacientes da Base do BPA-Mag e avaliar cadastro e poder corrigir via Sistema;"_
- **Item 461 (p. 24):** _"Possibilitar Filtrar Profissionais e Pacientes por cadastro completo, Sem Nome, Sem CBO e Sem CNES;"_
- **Item 462 (p. 24):** _"Permitir importar o KIT de Tabelas do BDSIA conforme competência tanto para o banco do BPA quanto para o Banco do Avaliador;"_
- **Item 463 (p. 24):** _"Permitir importar o KIT de Tabelas do SIGTAP conforme competência tanto para o banco do BPA quanto para o Banco do Avaliador;"_
- **Item 464 (p. 24):** _"Permitir importar tabelas do CNES conectando-se diretamente ao Banco de Dados e também via XML"_
- **Item 465 (p. 24):** _"Permitir Importar arquivos de Cadastro de Pacientes para uso no Avaliador;"_
- **Item 466 (p. 24):** _"Permitir fazer Inferência de nome de pacientes para apontar automaticamente o Sexo conforme dados do Censo do IBGE"_
- **Item 467 (p. 24-25):** _"Ter tela de Conciliar dados de Produção por Competência, contendo obrigatoriamente as seguintes regras de avaliação: E001 a E032, W034 a W054, A601 a A610"_
- **Item 468 (p. 26):** _"Permitir Consultar Histórico das Avaliações e Historico de Correções, ambos devem ser separados"_
- **Item 469 (p. 26):** _"Permitir ver itens em quarentena que não passaram nas avaliações"_
- **Item 470 (p. 26):** _"Permitir configurar regras de Aliases/Apelidos para o conciliador e obrigatórios ter no mínimo: Cadastro de Endereços, Cadastro de Etnias, Cadastro de Raça e Cor, Cadastro de Tipo de Logradouros para avaliar os dados do BPA;"_
- **Item 471 (p. 27):** _"Sistema de Backup dentro do Avaliador de Dados e funcionalidades para listar os últimos backups do banco;"_
- **Item 472 (p. 27):** _"Permitir Configurar os órgãos responsáveis pela informação;"_
- **Item 473 (p. 27):** _"Permitir configurar o Municipio Padrao e os Dados padrões de faturamento do BPA;"_
- **Item 474 (p. 27):** _"Obrigatoriamente permitir que o Aplicativo do Avaliador seja Instalado no Desktop e também seja aberto em ambiente Web com todos os recursos apresentados sem qualquer necessidade de Instalação, deve ser plug-play;"_

---

## 4. DOC-02: ANEXO I – Módulos de Especificação Técnica Funcional (45 páginas)

### 4.1. Mapeamento Geral das Seções 7.4.1 a 7.4.9

- **Seção 7.4.1 (pp. 1-5):** DOS CADASTROS GERAIS, FUNCIONALIDADES E ESTABELECIMENTOS DE SAÚDE
  - _7.4.1.1 (pp. 1-2):_ Da Autenticação, Delegação de Poder e Auditoria de Acesso
  - _7.4.1.2 (pp. 2-4):_ Das Tabelas Oficiais e Cadastros Auxiliares
  - _7.4.1.3 (pp. 4-5):_ Dos Estabelecimentos de Saúde
- **Seção 7.4.2 (pp. 5-13):** DO NÚCLEO ASSISTENCIAL, CADASTRO DE PACIENTES, ACOLHIMENTO E PRONTUÁRIOS
  - _7.4.2.1 (p. 5):_ Do Cadastro de Profissionais de Saúde
  - _7.4.2.2 (pp. 5-7):_ Do Cadastro Único do Cidadão (Módulo II)
  - _7.4.2.3 (pp. 7-9):_ Do Acolhimento, Triagem e Classificação de Risco (Módulos I, IV e V)
  - _7.4.2.4 (pp. 9-12):_ Do Prontuário Eletrônico Multiprofissional e Odontológico (Módulos V e IX)
  - _7.4.2.5 (p. 12):_ Da Interoperabilidade com o e-SUS PEC Existente (Atenção Primária à Saúde)
  - _7.4.2.6 (pp. 12-13):_ Do Controle de Óbitos e Cemitérios (Módulo XVIII)
- **Seção 7.4.3 (pp. 13-23):** DA LOGÍSTICA, INSUMOS, FARMÁCIA, LABORATÓRIO E APOIO DIAGNÓSTICO
  - _7.4.3.1 (pp. 13-17):_ Do Almoxarifado e Controle de Estoques (Módulos XIII e XIV)
  - _7.4.3.2 (pp. 17-18):_ Do Módulo de Medicamento Judicial (Módulo XIII)
  - _7.4.3.3 (pp. 18-21):_ Do Módulo de Laboratório de Análises Clínicas - LIS (Módulo XI)
  - _7.4.3.4 (pp. 21-22):_ Do Serviço de Radiodiagnóstico e Imagem - RIS (Módulo XII)
  - _7.4.3.5 (pp. 22-23):_ Do Serviço de Nutrição e Dietética - SND
- **Seção 7.4.4 (pp. 23-32):** DA REGULAÇÃO, TRANSPORTE, AÇÕES PROGRAMÁTICAS E BENEFÍCIOS
  - _7.4.4.1 (pp. 23-27):_ Da Regulação e Agendamento de Consultas e Exames (Módulos IX, X e XIX)
  - _7.4.4.2 (pp. 27-30):_ Do Controle de Transportes e Tratamento Fora do Domicílio - TFD (Módulo XV)
  - _7.4.4.3 (pp. 30-31):_ Da Lista de Espera Pública (Módulo XIX e XX)
  - _7.4.4.4 (pp. 31-32):_ Do Gerenciamento de APACs (Módulo XVII)
- **Seção 7.4.5 (pp. 32-37):** DO HOSPITAL MUNICIPAL, PRESCRIÇÃO, FATURAMENTO E APOIO OPERACIONAL
  - _7.4.5.1 (pp. 32-34):_ Da Gestão Hospitalar, Portaria e Recepção/Internação (Módulos VI e VII)
  - _7.4.5.2 (pp. 34-36):_ Da Prescrição Eletrônica Hospitalar, Aprazamento e Parâmetros (Módulos VI e XIII)
  - _7.4.5.3 (pp. 36-37):_ Do Faturamento Ambulatorial e Hospitalar - SUS (Módulo XVII)
  - _7.4.5.4 (p. 37):_ Do Painel Multimídia de Chamadas (Módulo III)
- **Seção 7.4.6 (pp. 37-40):** DO BUSINESS INTELLIGENCE (BI), SALA DE SITUAÇÃO, MENSAGERIA E GESTÃO DE CHAMADOS
  - _5.4.6.1 / 7.4.6.1 (p. 38):_ Do Business Intelligence - BI e Sala de Situação em Tempo Real (Módulo XXI)
  - _7.4.6.2 (pp. 38-39):_ Do Módulo de Envio de Mensagens (SMS, E-mail e Notificações - Módulo XXII)
  - _7.4.6.3 (pp. 39-40):_ Da Gestão de Projetos, Implantação, Agenda e Chamados Técnicos (Help Desk)
- **Seção 7.4.7 (pp. 40-43):** DA CERTIFICAÇÃO DIGITAL (ICP-BRASIL / SBIS-CFM)
  - _7.4.7.1 (pp. 40-42):_ Da Infraestrutura e Padrões de Assinatura
  - _7.4.7.2 (pp. 42-43):_ Dos Serviços de Validação e Gerenciamento de LCR
- **Seção 7.4.8 (pp. 43-44):** DA VIGILÂNCIA EM SAÚDE
  - _7.4.8.1 (pp. 43-44):_ Da Vigilância Epidemiológica
- **Seção 7.4.9 (p. 45):** DO SUPORTE À DISPOSITIVOS MÓVEIS HOSPITALARES (TABLETS)
  - _7.4.9.a (p. 45):_ Compatibilidade e Usabilidade Hospitalar (Android 9.0+, checagem beira de leito, triagem/acolhimento, visualização de prontuário)
  - _7.4.9.b (p. 45):_ Conectividade e Segurança Interna (Wi-Fi interno, vínculo perfil-dispositivo, logs de auditoria)

---

### 4.2. Transcrição Literal dos Trechos Relevantes das Seções Críticas

#### 7.4.3.4. Serviço de Radiodiagnóstico e Imagem - RIS (Páginas 21 e 22)

> **[Citação Textual Estrita]:**
>
> - **a.i (p. 21):** _"Permitir a digitação, lançamento e laudo de procedimentos diagnósticos por imagem e métodos gráficos (Raio-X, Tomografia, ECG, Ultrassom, entre outros);"_
> - **a.ii (p. 21):** _"Integração nativa com a requisição do atendimento do paciente na internação ou ambulatório, gerando automaticamente a requisição de exame no módulo RIS a partir da solicitação no Prontuário Eletrônico do Paciente (PEP);"_
> - **a.iii (p. 21):** _"Tela específica para listagem de exames já realizados que aguardam a confecção e emissão de laudo;"_
> - **a.iv (p. 21):** _"Permitir o cadastro e a configuração de resultados padrões/modelos pré-definidos para os procedimentos, otimizando e acelerando a digitação dos laudos pelos profissionais de saúde;"_
> - **b.i (pp. 21-22):** _"Editor de laudos completo com barra de ferramentas para customização avançada de texto, contemplando obrigatoriamente as funcionalidades de: texto em negrito, sublinhado, itálico, grifado, tabulação, numerador por números ou pontos, inserção de hyperlinks, anexo de imagem, inserção de tabelas, checklists, campos do tipo 'box', campos do tipo 'lista', campos do tipo 'flutuante', inserção de linha para quebra de página, coloração de texto, coloração de caixa de texto, tamanho e estilo de fonte;"_
> - **b.ii (p. 22):** _"Mecanismo de visualização prévia do laudo formatado antes de sua liberação final, certificação digital ou impressão;"_
> - **b.iii (p. 22):** _"Impressão parametrizável de requisições, laudos e resultados de exames de acordo com o layout e identidade visual definidos pelo cliente/Município;"_
> - **c.i (p. 22):** _"Tela e módulo específico para registro formal da entrega de laudos e resultados com emissão de relatórios de entregas de exames;"_
> - **c.ii (p. 22):** _"Agendamento de exames por unidade com impressão de comprovante para o paciente e suporte à digitação/laudo de exames executados por terceiros/prestadores credenciados;"_
> - **c.iii (p. 22):** _"Anexação direta e automática dos laudos emitidos e imagens ao Prontuário Eletrônico do Paciente (PEP), com suporte à assinatura e certificação digital dos documentos emitidos pelo profissional radiologista/médico;"_
> - **c.iv (p. 22):** _"Cadastro de procedimentos genéricos vinculados às tabelas dos convênios AMB, CBHPM e PAM, gerando o consumo automático dos procedimentos executados para os devidos faturamentos municipais;"_
> - **d.i (p. 22):** _"Controle completo de filmes radiológicos utilizados e cobrados, incluindo o cadastramento e controle de motivos de perdas de filmes e relatório de gastos com filmes;"_
> - **d.ii (p. 22):** _"Tela para cadastramento de unidades de atendimento;"_
> - **d.iii (p. 22):** _"Emissão de relatórios estatísticos e gerenciais abrangentes: relatórios de exames por período, relatórios de exames executados, relatórios de exames por profissional e relatórios com consolidação de valores e custos gastos."_

#### 7.4.3.5. Serviço de Nutrição e Dietética - SND (Páginas 22 e 23)

> **[Citação Textual Estrita]:**
>
> - **a.i (p. 22):** _"Permitir o cadastramento parametrizado de todos os tipos de refeições e dietas nutricionais (enterais, parenterais, orais e de rotina);"_
> - **a.ii (p. 23):** _"Permitir o controle e a prescrição individualizada de dietas e refeições por paciente internado ou em observação ambulatorial, respeitando os horários, restrições e necessidades alimentares identificadas no atendimento;"_
> - **b.i (p. 23):** _"Permitir consultas dinâmicas e emissão de relatórios consolidados por período, mapeando as refeições e dietas distribuídas por paciente e por leito/unidade;"_
> - **b.ii (p. 23):** _"Suporte à certificação e assinatura digital (ICP-Brasil) nos documentos do setor que exijam a validação formal do profissional Nutricionista ou Responsável Técnico;"_
> - **c.i (p. 23):** _"Integração direta e automática com o ponto de estoque e almoxarifado do setor de Nutrição, promovendo a baixa dos insumos de alimentos e formulas nutricionais conforme o consumo e a distribuição das refeições prescritas aos pacientes."_

#### 7.4.4.2. Controle de Transportes e TFD (Páginas 27 a 30)

> **[Citação Textual Estrita]:**
>
> - **a.i (p. 28):** _"Cadastro de tipos de veículos e cadastro detalhado de veículos contendo: descrição, tipo, placa, marca, número do chassi, ano, capacidade/lotação, tipo de combustível e data de validade do extintor de incêndio;"_
> - **a.ii (p. 28):** _"Cadastro de rotas de transporte com descrição, indicação de status ativo/inativo e município de saída;"_
> - **a.iii (p. 28):** _"Cadastro de dotações orçamentárias (código, descrição e número) e cadastro de recursos financeiros (código, descrição e número);"_
> - **a.iv (p. 28):** _"Cadastro de motoristas contendo: nome, endereço, CPF, telefone, CEP, município, complemento, tipo de veículo habilitado a conduzir, número e categoria da CNH, data de vencimento da CNH e indicação se está ativo;"_
> - **a.v (p. 28):** _"Cadastro de itens de consumo (descrição, unidade de apresentação e fornecedor padrão), cadastro de eventos do veículo e cadastro de tipos de viagem (com indicação se aplica a processos de TFD);"_
> - **a.vi (p. 28):** _"Cadastro de tipos de despesa e adiantamentos (descrição e valor unitário) e cadastro de destinos (nome, município de localização e telefone);"_
> - **a.vii (p. 28):** _"Cadastro dos municípios integrantes da coordenadoria/consórcio regional de saúde;"_
> - **b.iii (p. 28):** _"Lançamento de viagens registrando: código, data de saída, data prevista de retorno, tipo da viagem, auxiliar, motorista, veículo, local e cidade de destino, rota, dotação orçamentária e recurso;"_
> - **b.iv (p. 28):** _"Vínculo detalhado de pacientes e acompanhantes a cada viagem, registrando: locais de saída e destino, telefones, documentos, tipo de viagem (ida, ida e volta), vagas consumidas na ida, vagas consumidas na volta, acompanhantes, horário de saída e chegada, data e horário do aviso ao paciente e observações;"_
> - **b.v (p. 28):** _"Registro na viagem de Km inicial, Km final, Km rodado, nome da empresa (quando for transporte terceirizado) e valores de adiantamentos concedidos;"_
> - **b.vi (p. 28):** _"Lançamento de um ou mais adiantamentos por viagem (tipo, valor, quantidade e valor total);"_
> - **b.vii (p. 29):** _"Mecanismo para lançamento das despesas de viagem contendo: horário de saída/chegada, Km inicial/final/rodado, número do documento da despesa, data, tipo de despesa, valor unitário, quantidade, total, local/fornecedor, breve histórico e indicador de finalização do lançamento da viagem;"_
> - **b.viii (p. 29):** _"Mecanismo para gerenciamento de solicitações de ambulância contendo: data da solicitação, data/horário de saída, cidade e local de destino, veículo, motorista, lista de pacientes na ida e lista no retorno;"_
> - **b.ix (p. 29):** _"Lançamento e controle de multas de trânsito registrando data, motorista infrator e tipo de infração;"_
> - **b.x (p. 29):** _"Parametrização para definir se o sistema operará com ou sem agendamento prévio de viagens;"_
> - **c.i-v (p. 29):** _"Manutenção da frota, gastos, créditos ao fornecedor e controle de fornecedores;"_
> - **d.i (p. 29):** _"Geração automática dos procedimentos de transporte de pacientes e acompanhantes calculados com base na quilometragem percorrida;"_
> - **d.ii (p. 29):** _"Faturamento automático para o Boletim de Produção Ambulatorial (BPA) referente aos deslocamentos de pacientes efetuados;"_
> - **e.i (p. 30):** _"Abertura e controle dos processos de TFD contendo: número do processo, data de abertura, paciente, profissional responsável, CID-10, tratamento solicitado, tipo de atendimento e justificativa clínica;"_
> - **e.ii (p. 30):** _"Status do processo de TFD (autorizado, cancelado, enviado para o estado, negado ou inconcluso), com campo obrigatório para justificativa da situação e observações gerais;"_
> - **e.iii (p. 30):** _"Mecanismo para criação e lançamento de todas as viagens necessárias para cada processo de TFD..."_
> - **e.iv (p. 30):** _"Funcionalidade para criação em lote de viagens de TFD com base no rol de processos cadastrados a serem atendidos;"_
> - **e.v (p. 30):** _"Funcionalidade para renovação de processos de TFD já concluídos e painel de avaliação em tempo real do total de viagens e suas respectivas localidades;"_

#### 7.4.4.3. Lista de Espera Pública e Proteção de Dados (LGPD) (Página 31)

> **[Citação Textual Estrita]:**
>
> - **b.iii (p. 31):** _"Conformidade com a LGPD (Lei Geral de Proteção de Dados): Para a consulta pública aberta (sem autenticação), o sistema deverá aplicar mascaramento obrigatório de dados sensíveis de saúde, exibindo exclusivamente: número do protocolo de atendimento, posição na fila, data de solicitação e as iniciais do nome do paciente (ex.: A.B.C.), sendo vedada a exibição pública de CPF, Cartão SUS ou Nome Completo sem login do usuário;"_
> - **b.iv (p. 31):** _"Portal/Área do Cidadão (Acesso Restrito): Módulo de consulta individual onde o cidadão, mediante autenticação segura (via Gov.br, CPF/Senha ou CNS), poderá visualizar seu histórico de solicitações e sua posição exata na fila de espera;"_

#### 7.4.4.4. Gerenciamento de APACs (Páginas 31 e 32)

> **[Citação Textual Estrita]:**
>
> - **a.i (p. 31):** _"Mecanismos abrangentes para o gerenciamento de autorizações de procedimentos de alta complexidade (APAC);"_
> - **a.ii (p. 32):** _"Local específico para inclusão e controle das sequências de números de APACs disponíveis para utilização pelo município, contendo o ano, a Unidade da Federação (UF) e o tipo da APAC;"_
> - **a.iii (p. 32):** _"Registro de identificação do número da APAC atual e, quando aplicável, do número da APAC anterior;"_
> - **a.iv (p. 32):** _"Controle rigoroso dos prazos de validade de cada APAC, com campos para registro do início da validade, final da validade, unidade de saúde solicitante e unidade de saúde executante;"_
> - **b.i (p. 32):** _"Mecanismo para gerenciamento detalhado de solicitações de APAC registrando: Unidade de Saúde solicitante, profissional solicitante, data da solicitação, número do laudo, clínica/prestador para realização do procedimento, identificação completa do paciente, CID Provisório/Principal, CID Secundário e CID para Causas Associadas;"_
> - **b.ii (p. 32):** _"Classificação e identificação da autorização de cada APAC segundo o tipo específico do seu laudo: Laudo Geral, Medicamentos, Nefrologia, Quimioterapia, Radioterapia e Cirurgia Bariátrica;"_
> - **b.iii (p. 32):** _"Identificação da modalidade da APAC através do seu tipo: Inicial, Continuidade e Sem Continuidade;"_
> - **b.iv (p. 32):** _"Mapeamento completo dos dados do paciente no módulo de APAC contendo: nome do paciente, nome da mãe, número do Cartão Nacional de Saúde (CNS), data de nascimento, idade, sexo, raça/cor, responsável legal e número do prontuário;"_
> - **c.i (p. 32):** _"Mecanismo de emissão direta no Prontuário Eletrônico do Paciente (PEP) no ato da consulta médica/multiprofissional, permitindo a geração automática da APAC com todos os dados clínicos e cadastrais previamente preenchidos, sem a necessidade de redigitação pelo profissional."_

#### 7.4.5.1.e e 7.4.5.1.e.i: SAMU e SAME (Página 34)

> **[Citação Textual Estrita]:**
>
> - **e.i (p. 34):** _"Registro e acompanhamento de ocorrências móveis de urgência/emergência do SAMU e fluxo de encaminhamento hospitalar;"_
> - **e.ii (p. 34):** _"Módulo SAME para controle do fluxo e circulação física e digital de prontuários pelos setores hospitalares;"_
> - **e.iii (p. 34):** _"Localização de prontuários arquivados, controle do tempo de permanência nos setores e emissão de recibos de retirada com relatórios por local/paciente e suporte à certificação digital;"_

#### 7.4.5.3. Faturamento Ambulatorial e Hospitalar - SUS (Páginas 36 e 37)

> **[Citação Textual Estrita]:**
>
> - **a.i (p. 36):** _"Importação nativa e periódica das tabelas do SIGTAP/DATASUS, com consulta detalhada dos procedimentos integrada à tela do faturamento;"_
> - **a.iii (p. 36):** _"Permissão para digitação de AIHs integrando dados da recepção e internação, com suporte à geração de AIHs sem número (conforme parâmetro);"_
> - **b.i (p. 36):** _"Exportação de faturamento de internação nos padrões do SISAIH01 (AIH) e estatísticas para o SISRCA;"_
> - **b.ii (p. 36):** _"Faturamento ambulatorial abrangendo SIA/SUS, RAAS (Registro das Ações Ambulatoriais da Saúde) e BPA (Boletim de Produção Ambulatorial Magnético - Consolidado e Individualizado);"_
> - **c.i (p. 36):** _"Mecanismo de validação prévia e consolidação de contas confrontando as regras oficiais do SISAIH01 e SIGTAP antes da exportação;"_
> - **c.ii (p. 36):** _"Mecanismo automatizado para detecção, crítica e tratamento de erros do faturamento cobrindo o intervalo dos padrões E001 a A603;"_

#### 7.4.7. Certificação Digital (ICP-Brasil / SBIS-CFM) (Páginas 40 a 43)

> **[Citação Textual Estrita]:**
>
> - **7.4.7.1.a.i (p. 41):** _"Mecanismo de assinatura digital em conformidade com os padrões determinados pela SBIS e CFM (ICP-Brasil), totalmente aderente ao DOC-ICP-15 e seus documentos complementares (DOC-ICP-15.01, DOC-ICP-15.02 e DOC-ICP-15.03);"_
> - **7.4.7.1.b.i-iii (p. 41):** _"Padrões CAdES, XAdES, PDF Signature (ISO 32000-1) e políticas AD-RB, AD-RT, AD-RV, AD-RC, AD-RA;"_
> - **7.4.7.1.c.i-iv (pp. 41-42):** _"Suporte a PKCS#11, Smartcards, Carimbo do Tempo (TSP / RFC 3161);"_
> - **7.4.7.2.a-b (pp. 42-43):** _"Validador de certificados, cadeia X.509 v2 e gerenciador de LCR/LPAs."_

#### 7.4.9. Suporte a Dispositivos Móveis Hospitalares - Tablets (Página 45)

> **[Citação Textual Estrita]:**
>
> - **a.i (p. 45):** _"Suporte à execução e navegação otimizada para tablets operando em sistema operacional Android 9.0 ou superior;"_
> - **a.ii (p. 45):** _"Interface responsiva adaptada para checagem de beira de leito, triagem/acolhimento e visualização de prontuário, garantindo agilidade no atendimento à beira do leito;"_
> - **b.i (p. 45):** _"Operação em ambiente conectado via rede sem fio (Wi-Fi) interna do estabelecimento de saúde, garantindo a atualização em tempo real do aprazamento e checagem de medicamentos;"_
> - **b.ii (p. 45):** _"Módulo de segurança e controle de acessos vinculando o perfil do profissional e dispositivo credenciado, garantindo a rastreabilidade total das ações registradas no prontuário do paciente;"_
> - **b.iii (p. 45):** _"Registro de logs de auditoria contendo usuário, data, hora e dispositivo utilizado para cada operação realizada à beira do leito."_
