/// <reference path="../pb_data/types.d.ts" />

/**
 * Runner de testes sintéticos desativado por determinação de segurança e governança de dados.
 * Nenhuma execução mutante ou criação/limpeza de fixtures em banco compartilhado é permitida em runtime compartilhado.
 * Os testes funcionais de idempotência, concorrência e rollback foram transferidos para o harness local isolado.
 */
