/// <reference path="../pb_data/types.d.ts" />

/**
 * Endpoint de Busca Paginada Segura com Payload Minimizado de Pacientes.
 * Minimiza CPF e CNS no servidor para evitar vazamento de documentos completos em listagens e seletores.
 * O acesso a documentos e prontuário completo permanece apenas nos fluxos/perfis autorizados (detalhes do cadastro / getOne).
 */
routerAdd('GET', '/backend/v1/pacientes/busca-minimizada', (e) => {
  // Exige usuário autenticado
  var auth = e.auth
  if (!auth) {
    throw new UnauthorizedError('Acesso restrito a profissionais autenticados.')
  }

  function mascararCpfServidor(cpf) {
    if (!cpf) return ''
    var d = ('' + cpf).replace(/\D/g, '')
    if (d.length !== 11) return '***.***.***-**'
    return d.slice(0, 3) + '.***.***-' + d.slice(9, 11)
  }

  function mascararCnsServidor(cns) {
    if (!cns) return ''
    var d = ('' + cns).replace(/\D/g, '')
    if (d.length !== 15) return '*** **** **** ****'
    return d.slice(0, 3) + ' **** **** ' + d.slice(11, 15)
  }

  var pagina = parseInt(e.request.url.query().get('pagina') || '1', 10)
  if (isNaN(pagina) || pagina < 1) pagina = 1

  var porPagina = parseInt(e.request.url.query().get('porPagina') || '15', 10)
  if (isNaN(porPagina) || porPagina < 1) porPagina = 15
  if (porPagina > 50) porPagina = 50 // Limite estrito de página

  var termo = (e.request.url.query().get('termo') || '').trim()

  var filterExpr = ''
  var filterParams = {}

  if (termo) {
    // Escapa caracteres especiais de filtro PocketBase
    // Trata aspas duplas, barras invertidas e caracteres de controle
    var digitosComZeros = termo.replace(/\D/g, '')

    // Constrói expressão segura usando parâmetros nomeados
    var partes = []
    partes.push('nome ~ {:termo}')
    partes.push('nome_mae ~ {:termo}')
    filterParams['termo'] = termo

    if (digitosComZeros.length > 0) {
      partes.push('cartao_sus ~ {:digitos}')
      partes.push('cpf ~ {:digitos}')
      filterParams['digitos'] = digitosComZeros
    }

    filterExpr = partes.join(' || ')
  }

  var offset = (pagina - 1) * porPagina

  var totalRecords = 0
  var records = []

  try {
    if (filterExpr) {
      records = e.app.findRecordsByFilter(
        'pacientes',
        filterExpr,
        'nome',
        porPagina,
        offset,
        filterParams,
      )
      var todosFiltro = e.app.findRecordsByFilter('pacientes', filterExpr, '', 0, 0, filterParams)
      totalRecords = todosFiltro.length
    } else {
      records = e.app.findRecordsByFilter('pacientes', '', 'nome', porPagina, offset)
      var todos = e.app.findRecordsByFilter('pacientes', '', '', 0, 0)
      totalRecords = todos.length
    }
  } catch (err) {
    console.log('Erro ao consultar pacientes no backend:', err)
    records = []
    totalRecords = 0
  }

  var totalPaginas = Math.ceil(totalRecords / porPagina)
  if (totalPaginas < 1) totalPaginas = 1

  var itensMinimizados = []
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    var rawCpf = r.get('cpf') || ''
    var rawCns = r.get('cartao_sus') || ''

    itensMinimizados.push({
      id: r.id,
      nome: r.get('nome') || '',
      // No servidor: campos mascarados/truncados na resposta da busca
      cpf: mascararCpfServidor(rawCpf),
      cartao_sus: mascararCnsServidor(rawCns),
      data_nascimento: r.get('data_nascimento') || '',
      sexo: r.get('sexo') || '',
      nome_mae: r.get('nome_mae') || '',
      telefone: r.get('telefone') || '',
      endereco: r.get('endereco') || '',
      bairro: r.get('bairro') || '',
      cidade: r.get('cidade') || '',
      tipo_sanguineo: r.get('tipo_sanguineo') || '',
      alergias: r.get('alergias') || '',
      condicoes_cronicas: r.get('condicoes_cronicas') || '',
      observacoes: r.get('observacoes') || '',
      created: r.get('created') || '',
      updated: r.get('updated') || '',
    })
  }

  return e.json(200, {
    itens: itensMinimizados,
    totalItens: totalRecords,
    totalPaginas: totalPaginas,
    paginaAtual: pagina,
  })
})
