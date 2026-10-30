# Módulo SND (Serviço de Nutrição e Dietética) - Parte 2: UI e Relatórios

## Contrato v0.0.66 • Conformidade com os Requisitos 7.4.3.5.a.i–ii e 7.4.3.5.b.i

---

### 1. Matriz de Rastreabilidade de Subitens (Base DOC-02, p. 22–23)

| Subitem               | Descrição Normativa                                                              | Implementação no Sistema (v0.0.66 Parte 2)                                                                                                                                                                                                                                                                                                                                                                                     | Status       |
| :-------------------- | :------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| **7.4.3.5.a.i**       | **Catálogo de Refeições e Tipos de Dieta com Versionamento e Inativação Lógica** | Telas de gestão com listagem completa e abas em `src/components/snd/CatalogoSndTab.tsx`. Suporte às vias oral, rotina hospitalar, enteral, parenteral (NPT) e especial/metabólica. Inativação lógica com justificativa técnica obrigatória. Bloqueio server-side de exclusão física em `pocketbase/hooks/snd_nutricao.pb.js`.                                                                                                  | **CONFORME** |
| **7.4.3.5.a.ii**      | **Prescrição Dietética Individualizada Humana e Exclusiva**                      | Formulário médico/nutricional humano em `src/components/snd/PrescricaoSndTab.tsx` com vínculo estrito a paciente e episódio assistencial ativo (internação ou observação PA). Horários, via, consistência, fracionamento, restrições e alergias lançadas exclusivamente pelo profissional autorizado. Campo sigiloso de justificativa clínica restrito (LGPD). **Nenhuma decisão ou cálculo automático de dieta.**             | **CONFORME** |
| **7.4.3.5.b.i**       | **Mapa Operacional de Cozinha e Copa Sanitizado (Sigilo Clínico & LGPD)**        | Componente `src/components/snd/MapaCozinhaSndTab.tsx` integrado ao endpoint seguro `/backend/v1/snd/mapa-cozinha`. A copa visualiza estritamente paciente, leito, unidade, tipo de dieta, consistência, via e restrições alimentares. **CID, diagnóstico patológico e justificativa clínica são estritamente ocultados.** Confirmação de preparo/distribuição/não distribuição com motivo obrigatório e chave de idempotência. | **CONFORME** |
| **7.4.3.5.b.i (Rel)** | **Relatório Consolidado de Distribuição e Impressão Sanitizada**                 | Módulo `src/components/snd/RelatoriosSndTab.tsx` com filtros de período, unidade, refeição e status. Totalizadores de refeições entregues versus não distribuídas com causas auditadas. Impressão sanitizada no padrão Folha A4 para prestação de contas assistencial.                                                                                                                                                         | **CONFORME** |

---

### 2. Invariantes de Integridade, UX e Concorrência

1. **Snapshot Congelado de Catálogo**: No ato da prescrição humana, os dados do catálogo (`dieta_codigo_snapshot`, `dieta_nome_snapshot`, `dieta_versao_snapshot`) são congelados no registro da prescrição. Atualizações cadastrais futuras não modificam retroativamente prescrições passadas (testado em `SND-03` e `SND-10`).
2. **Preservação de Histórico e Imutabilidade**: Toda alteração de conduta dietética gera um novo evento/versão da prescrição, marcando a anterior como `alterada` ou `suspensa` com data de término e motivo, sem jamais apagar ou reescrever dados pregressos.
3. **Proteção Contra Race Conditions (`seqRef`)**: Requisições assíncronas do paciente e do mapa de cozinha usam o padrão `seqRef` das demais telas do sistema, descartando respostas lentas de pacientes ou filtros anteriores.
4. **Resiliência de Formulário e Idempotência**: Em caso de conflito concorrente ou rejeição de rede, o formulário não perde o texto digitado pelo profissional, e a mesma chave de idempotência é reutilizada para reenvio sem duplicações.
5. **Justificativa Obrigatória em Não Distribuição**: Se a refeição não for entregue (ex: jejum cirúrgico, ausência temporária do paciente), o operador é obrigado a fornecer justificativa formal com no mínimo 3 caracteres (validado no frontend e no servidor).

---

### 3. PRONTIDÃO Operacional e Pendências Explícitas

As seguintes pendências foram identificadas para evolução nos blocos subsequentes da arquitetura hospitalar:

- [ ] **Integração com Estoque de Insumos e Fórmulas Nutricionais (7.4.3.5.c.i)**: Baixa automática de dietas enterais industrializadas e insumos parenterais vinculada ao módulo de Farmácia/Almoxarifado Hospitalar.
- [ ] **Assinatura Digital ICP-Brasil nos Impressos Dietéticos (7.4.3.5.b.ii)**: Emissão de folhas e recibos de prescrição com carimbo de tempo ICP-Brasil e certificado digital emitido por autoridade certificadora (médico/nutricionista).
- [ ] **Homologação Assistencial e Teste Visual Humano em Leito**: Testes de usabilidade e leitura de etiquetas em tablets de copa e terminais beira-leito com a equipe de enfermagem e nutrição do município.
- [ ] **Testes de Concorrência Real Multi-Nó (Cluster PocketBase)**: Avaliação de throughput de submissão de idempotency keys sob concorrência multi-instância em alta volumetria.
