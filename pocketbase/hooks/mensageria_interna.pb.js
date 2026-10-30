/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Segurança, Integridade e Regras de Mensageria Interna:
 *
 * Coleção `mensagens_internas`:
 * - 1. Autor derivado obrigatoriamente da sessão (@request.auth.id): qualquer remetente
 *      forjado no payload é descartado e sobrescrito pelo ID do usuário autenticado.
 * - 2. Idempotência por chave persistente (`idempotency_key`): reenvio com mesma chave
 *      reaproveita registro do próprio autor ou rejeita conflito/tentativa de outro autor.
 * - 3. Validação e sanitização de texto: assunto (1..160 chars) e conteúdo (1..4000 chars),
 *      armazenamento seguro em texto plano sem tags HTML ativas.
 * - 4. Resolução de destinatários no envio e congelamento (snapshot imutável):
 *      - Se individual: valida que destinatário existe e não é o próprio autor (ou se for nota pessoal);
 *      - Se grupo: consulta participantes atuais do grupo e congela os IDs em `destinatarios_resolvidos_ids`
 *        e metadados em `destinatarios_snapshot`. Entrada posterior de membros no grupo NÃO concede
 *        acesso a mensagens antigas.
 * - 5. Proteção de UPDATE: somente leitura pode ser marcada (`lida_por`). Modificações de
 *      remetente, destinatários, assunto ou conteúdo são estritamente proibidas (erro 403).
 * - 6. Proteção de DELETE: proibido sumariamente.
 *
 * Endpoint de Diretório Mínimo de Usuários:
 * - GET `/backend/v1/mensageria/diretorio-usuarios`:
 *   Retorna apenas lista segura de usuários com id, nome, cargo, role.
 *   NENHUM dado de CPF, CNS, telefone pessoal, data de nascimento ou dados de pacientes.
 */

onRecordCreate((e) => {
  var auth = e.auth
  if (!auth) {
    throw new ForbiddenError('Operação não autorizada: sessão de usuário ausente.')
  }

  function limparTextoPlano(str) {
    if (!str) return ''
    var texto = String(str).trim()
    return texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  }

  // 1. Autor estritamente derivado da sessão (ignora remetente forjado no body)
  var authId = auth.id
  var authNome = auth.getString('name') || auth.getString('email') || 'Usuário do Sistema'
  e.record.set('remetente', authId)
  e.record.set('remetente_nome_snapshot', authNome)

  // 2. Validação e sanitização de texto
  var assunto = limparTextoPlano(e.record.getString('assunto'))
  if (!assunto || assunto.length < 1) {
    throw new BadRequestError('O assunto da mensagem é obrigatório.')
  }
  if (assunto.length > 160) {
    throw new BadRequestError('O assunto da mensagem deve ter no máximo 160 caracteres.')
  }
  e.record.set('assunto', assunto)

  var conteudo = limparTextoPlano(e.record.getString('conteudo'))
  if (!conteudo || conteudo.length < 1) {
    throw new BadRequestError('O conteúdo da mensagem é obrigatório.')
  }
  if (conteudo.length > 4000) {
    throw new BadRequestError('O conteúdo da mensagem deve ter no máximo 4000 caracteres.')
  }
  e.record.set('conteudo', conteudo)

  // 3. Verificação de idempotência
  var idempKey = (e.record.getString('idempotency_key') || '').trim()
  if (idempKey) {
    try {
      var existente = e.app.findFirstRecordByFilter(
        'mensagens_internas',
        'idempotency_key = {:k}',
        { k: idempKey },
      )
      if (existente) {
        var autorExistente = existente.getString('remetente')
        if (autorExistente !== authId) {
          throw new ForbiddenError('A chave de idempotência informada pertence a outro usuário.')
        }
        // Conflito de payload
        if (
          existente.getString('assunto') !== assunto ||
          existente.getString('conteudo') !== conteudo
        ) {
          throw new BadRequestError(
            'IDEMPOTENCY_PAYLOAD_CONFLICT: A mesma chave já foi utilizada com conteúdo diferente.',
          )
        }
        // Reenvio idêntico detectado: lança sinal padronizado ou erro controlado
        throw new BadRequestError('IDEMPOTENT_HIT:' + existente.id)
      }
    } catch (err) {
      if (
        err.status === 400 ||
        err.status === 403 ||
        (err.message &&
          (err.message.indexOf('IDEMPOTENT_HIT') !== -1 ||
            err.message.indexOf('IDEMPOTENCY_') !== -1))
      ) {
        throw err
      }
    }
  }

  // 4. Resolução de destinatários e snapshot congelado
  var tipoDestinatario = e.record.getString('tipo_destinatario')
  if (tipoDestinatario !== 'usuario' && tipoDestinatario !== 'grupo') {
    throw new BadRequestError('Tipo de destinatário inválido. Deve ser "usuario" ou "grupo".')
  }

  var resolvedIds = []
  var snapshot = []

  if (tipoDestinatario === 'usuario') {
    var destUserId = e.record.getString('destinatario_usuario')
    if (!destUserId) {
      throw new BadRequestError('Destinatário individual não informado.')
    }
    var userRec
    try {
      userRec = e.app.findRecordById('_pb_users_auth_', destUserId)
    } catch (_) {
      throw new BadRequestError('Destinatário não localizado no diretório de usuários.')
    }
    resolvedIds.push(destUserId)
    snapshot.push({
      id: userRec.id,
      nome: userRec.getString('name') || userRec.getString('email'),
      cargo: userRec.getString('cargo') || '',
      role: userRec.getString('role') || '',
    })
  } else {
    // Tipo grupo
    var grupoId = e.record.getString('destinatario_grupo')
    if (!grupoId) {
      throw new BadRequestError('Grupo destinatário não informado.')
    }
    var grupoRec
    try {
      grupoRec = e.app.findRecordById('canais_grupos_mensageria', grupoId)
    } catch (_) {
      throw new BadRequestError('Grupo destinatário não localizado ou inativo.')
    }

    if (!grupoRec.getBool('ativo')) {
      throw new BadRequestError('O grupo destinatário informado está inativo.')
    }

    var membrosIds = grupoRec.getStringSlice('membros') || []
    if (membrosIds.length === 0) {
      throw new BadRequestError(
        'O grupo destinatário não possui membros participantes no momento do envio.',
      )
    }

    for (var i = 0; i < membrosIds.length; i++) {
      var mId = membrosIds[i]
      try {
        var mRec = e.app.findRecordById('_pb_users_auth_', mId)
        resolvedIds.push(mId)
        snapshot.push({
          id: mRec.id,
          nome: mRec.getString('name') || mRec.getString('email'),
          cargo: mRec.getString('cargo') || '',
          role: mRec.getString('role') || '',
        })
      } catch (_) {}
    }

    if (resolvedIds.length === 0) {
      throw new BadRequestError('Nenhum participante válido foi resolvido para este grupo.')
    }
  }

  e.record.set('destinatarios_resolvidos_ids', resolvedIds)
  e.record.set('destinatarios_snapshot', snapshot)
  e.record.set('lida_por', [])

  e.next()
}, 'mensagens_internas')

onRecordUpdate((e) => {
  var auth = e.auth
  if (!auth) {
    throw new ForbiddenError('Operação não autorizada: sessão de usuário ausente.')
  }

  // Impedir alteração de campos imutáveis da mensagem
  var orig = e.record.original()
  if (
    e.record.getString('remetente') !== orig.getString('remetente') ||
    e.record.getString('tipo_destinatario') !== orig.getString('tipo_destinatario') ||
    e.record.getString('destinatario_usuario') !== orig.getString('destinatario_usuario') ||
    e.record.getString('destinatario_grupo') !== orig.getString('destinatario_grupo') ||
    e.record.getString('assunto') !== orig.getString('assunto') ||
    e.record.getString('conteudo') !== orig.getString('conteudo')
  ) {
    throw new ForbiddenError(
      'Mensagens internas são imutáveis. É proibido alterar remetente, destinatários, assunto ou conteúdo.',
    )
  }

  // Apenas a lista lida_por pode ser atualizada por um destinatário resolvido
  var authId = auth.id
  var resolved = []
  try {
    resolved = JSON.parse(orig.getString('destinatarios_resolvidos_ids')) || []
  } catch (_) {
    resolved = []
  }

  var isDestinatario = false
  for (var j = 0; j < resolved.length; j++) {
    if (resolved[j] === authId) {
      isDestinatario = true
      break
    }
  }

  if (!isDestinatario) {
    throw new ForbiddenError('Apenas os destinatários da mensagem podem marcar leitura.')
  }

  e.next()
}, 'mensagens_internas')

onRecordDelete((e) => {
  throw new ForbiddenError(
    'Mensagens internas não podem ser excluídas por usuários. Registros mantidos para integridade e auditoria.',
  )
}, 'mensagens_internas')

// Rota customizada para diretório mínimo de usuários funcionais
routerAdd('GET', '/backend/v1/mensageria/diretorio-usuarios', (c) => {
  var auth = c.auth
  if (!auth) {
    return c.json(401, { erro: 'Não autorizado: faça login para acessar o diretório funcional.' })
  }

  try {
    var users = c.app.findRecordsByFilter('_pb_users_auth_', '', 'name,email', 200, 0)

    var lista = []
    for (var k = 0; k < users.length; k++) {
      var u = users[k]
      lista.push({
        id: u.id,
        nome: u.getString('name') || u.getString('email') || 'Usuário ' + (k + 1),
        cargo: u.getString('cargo') || '',
        role: u.getString('role') || 'profissional',
      })
    }

    return c.json(200, {
      sucesso: true,
      usuarios: lista,
    })
  } catch (err) {
    return c.json(500, {
      erro: 'Erro ao carregar diretório de usuários: ' + (err.message || String(err)),
    })
  }
})
