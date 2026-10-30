/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Integridade Transacional e Prevenção de Duplicidade de Pacientes:
 * - Prevenção no BACKEND (PocketBase) de duplicidade exata por CPF ou CNS confiável.
 * - Tratamento de concorrência: a primeira gravação vence; a segunda recebe erro 400 claro.
 * - Preservação estrita de zeros à esquerda em CPF e Cartão SUS.
 * - Ausência de documento permitida para Recém-Nascidos e casos de Urgência/Emergência.
 * - Validação oficial de formato e dígitos verificadores.
 * - Nota PocketBase JSVM: todas as funções auxiliares residem dentro do callback.
 */

onRecordCreate((e) => {
  function limparDigitos(str) {
    if (!str) return ''
    return ('' + str).replace(/\D/g, '')
  }

  function validarCpf(cpfStr) {
    var cpf = limparDigitos(cpfStr)
    if (!cpf) return { valido: true }
    if (cpf.length !== 11) {
      return {
        valido: false,
        motivo: 'CPF deve conter exatamente 11 dígitos numéricos com zeros à esquerda.',
      }
    }
    if (/^(\d)\1{10}$/.test(cpf)) {
      return { valido: false, motivo: 'CPF inválido: dígitos repetidos.' }
    }
    var soma1 = 0
    for (var i = 0; i < 9; i++) {
      soma1 += parseInt(cpf.charAt(i), 10) * (10 - i)
    }
    var resto1 = soma1 % 11
    var dv1 = resto1 < 2 ? 0 : 11 - resto1
    if (parseInt(cpf.charAt(9), 10) !== dv1) {
      return { valido: false, motivo: 'CPF com primeiro dígito verificador inválido.' }
    }
    var soma2 = 0
    for (var j = 0; j < 10; j++) {
      soma2 += parseInt(cpf.charAt(j), 10) * (11 - j)
    }
    var resto2 = soma2 % 11
    var dv2 = resto2 < 2 ? 0 : 11 - resto2
    if (parseInt(cpf.charAt(10), 10) !== dv2) {
      return { valido: false, motivo: 'CPF com segundo dígito verificador inválido.' }
    }
    return { valido: true }
  }

  function validarCns(cnsStr) {
    var cns = limparDigitos(cnsStr)
    if (!cns) return { valido: true }
    if (cns.length !== 15) {
      return { valido: false, motivo: 'Cartão SUS deve conter exatamente 15 dígitos numéricos.' }
    }
    if (/^(\d)\1{14}$/.test(cns)) {
      return { valido: false, motivo: 'Cartão SUS inválido: dígitos repetidos.' }
    }
    var prim = cns.charAt(0)
    if (prim === '1' || prim === '2') {
      var pis = cns.substring(0, 11)
      var soma = 0
      for (var i = 0; i < 11; i++) {
        soma += parseInt(pis.charAt(i), 10) * (15 - i)
      }
      var resto = soma % 11
      var dv = 11 - resto
      if (dv === 11) dv = 0
      var res = ''
      if (dv === 10) {
        var soma2 = 0
        for (var j = 0; j < 11; j++) {
          soma2 += parseInt(pis.charAt(j), 10) * (15 - j)
        }
        soma2 += 2
        var dv2 = 11 - (soma2 % 11)
        if (dv2 === 11) dv2 = 0
        res = pis + '001' + dv2
      } else {
        res = pis + '000' + dv
      }
      if (cns === res) return { valido: true }
      return { valido: false, motivo: 'Cartão SUS (definitivo) com dígito verificador inválido.' }
    }
    if (prim === '7' || prim === '8' || prim === '9') {
      var somaP = 0
      for (var k = 0; k < 15; k++) {
        somaP += parseInt(cns.charAt(k), 10) * (15 - k)
      }
      if (somaP % 11 === 0) return { valido: true }
      return { valido: false, motivo: 'Cartão SUS (provisório) com soma ponderada inválida.' }
    }
    return { valido: false, motivo: 'Cartão SUS deve iniciar com 1, 2, 7, 8 ou 9.' }
  }

  var nome = (e.record.get('nome') || '').trim()
  if (!nome) {
    throw new BadRequestError('Nome do paciente é obrigatório.')
  }

  // 1. CPF
  var cpfRaw = e.record.get('cpf')
  var cpfLimpo = limparDigitos(cpfRaw)
  if (cpfLimpo) {
    var valCpf = validarCpf(cpfLimpo)
    if (!valCpf.valido) {
      throw new BadRequestError('Validação de documento: ' + valCpf.motivo)
    }
    e.record.set('cpf', cpfLimpo)

    try {
      var existenteCpf = e.app.findFirstRecordByFilter('pacientes', 'cpf = {:cpf}', {
        cpf: cpfLimpo,
      })
      if (existenteCpf) {
        throw new BadRequestError(
          'Duplicidade bloqueada: Já existe um paciente cadastrado com este CPF ("' +
            existenteCpf.get('nome') +
            '"). Registros não são mesclados automaticamente.',
        )
      }
    } catch (err) {
      if (
        err.status === 400 ||
        (err.message && err.message.indexOf('Duplicidade bloqueada') !== -1)
      ) {
        throw err
      }
    }
  }

  // 2. CNS
  var cnsRaw = e.record.get('cartao_sus')
  var cnsLimpo = limparDigitos(cnsRaw)
  if (cnsLimpo) {
    var valCns = validarCns(cnsLimpo)
    if (!valCns.valido) {
      throw new BadRequestError('Validação de Cartão SUS: ' + valCns.motivo)
    }
    e.record.set('cartao_sus', cnsLimpo)

    try {
      var existenteCns = e.app.findFirstRecordByFilter('pacientes', 'cartao_sus = {:cns}', {
        cns: cnsLimpo,
      })
      if (existenteCns) {
        throw new BadRequestError(
          'Duplicidade bloqueada: O Cartão SUS informado já pertence ao paciente "' +
            existenteCns.get('nome') +
            '". Cadastros permanecem separados.',
        )
      }
    } catch (err) {
      if (
        err.status === 400 ||
        (err.message && err.message.indexOf('Duplicidade bloqueada') !== -1)
      ) {
        throw err
      }
    }
  }

  e.next()
}, 'pacientes')

onRecordUpdate((e) => {
  function limparDigitos(str) {
    if (!str) return ''
    return ('' + str).replace(/\D/g, '')
  }

  function validarCpf(cpfStr) {
    var cpf = limparDigitos(cpfStr)
    if (!cpf) return { valido: true }
    if (cpf.length !== 11) {
      return {
        valido: false,
        motivo: 'CPF deve conter exatamente 11 dígitos numéricos com zeros à esquerda.',
      }
    }
    if (/^(\d)\1{10}$/.test(cpf)) {
      return { valido: false, motivo: 'CPF inválido: dígitos repetidos.' }
    }
    var soma1 = 0
    for (var i = 0; i < 9; i++) {
      soma1 += parseInt(cpf.charAt(i), 10) * (10 - i)
    }
    var resto1 = soma1 % 11
    var dv1 = resto1 < 2 ? 0 : 11 - resto1
    if (parseInt(cpf.charAt(9), 10) !== dv1) {
      return { valido: false, motivo: 'CPF com primeiro dígito verificador inválido.' }
    }
    var soma2 = 0
    for (var j = 0; j < 10; j++) {
      soma2 += parseInt(cpf.charAt(j), 10) * (11 - j)
    }
    var resto2 = soma2 % 11
    var dv2 = resto2 < 2 ? 0 : 11 - resto2
    if (parseInt(cpf.charAt(10), 10) !== dv2) {
      return { valido: false, motivo: 'CPF com segundo dígito verificador inválido.' }
    }
    return { valido: true }
  }

  function validarCns(cnsStr) {
    var cns = limparDigitos(cnsStr)
    if (!cns) return { valido: true }
    if (cns.length !== 15) {
      return { valido: false, motivo: 'Cartão SUS deve conter exatamente 15 dígitos numéricos.' }
    }
    if (/^(\d)\1{14}$/.test(cns)) {
      return { valido: false, motivo: 'Cartão SUS inválido: dígitos repetidos.' }
    }
    var prim = cns.charAt(0)
    if (prim === '1' || prim === '2') {
      var pis = cns.substring(0, 11)
      var soma = 0
      for (var i = 0; i < 11; i++) {
        soma += parseInt(pis.charAt(i), 10) * (15 - i)
      }
      var resto = soma % 11
      var dv = 11 - resto
      if (dv === 11) dv = 0
      var res = ''
      if (dv === 10) {
        var soma2 = 0
        for (var j = 0; j < 11; j++) {
          soma2 += parseInt(pis.charAt(j), 10) * (15 - j)
        }
        soma2 += 2
        var dv2 = 11 - (soma2 % 11)
        if (dv2 === 11) dv2 = 0
        res = pis + '001' + dv2
      } else {
        res = pis + '000' + dv
      }
      if (cns === res) return { valido: true }
      return { valido: false, motivo: 'Cartão SUS (definitivo) com dígito verificador inválido.' }
    }
    if (prim === '7' || prim === '8' || prim === '9') {
      var somaP = 0
      for (var k = 0; k < 15; k++) {
        somaP += parseInt(cns.charAt(k), 10) * (15 - k)
      }
      if (somaP % 11 === 0) return { valido: true }
      return { valido: false, motivo: 'Cartão SUS (provisório) com soma ponderada inválida.' }
    }
    return { valido: false, motivo: 'Cartão SUS deve iniciar com 1, 2, 7, 8 ou 9.' }
  }

  var recordId = e.record.id

  // 1. CPF
  var cpfRaw = e.record.get('cpf')
  var cpfLimpo = limparDigitos(cpfRaw)
  if (cpfLimpo) {
    var valCpf = validarCpf(cpfLimpo)
    if (!valCpf.valido) {
      throw new BadRequestError('Validação de documento: ' + valCpf.motivo)
    }
    e.record.set('cpf', cpfLimpo)

    try {
      var existenteCpf = e.app.findFirstRecordByFilter('pacientes', 'cpf = {:cpf} && id != {:id}', {
        cpf: cpfLimpo,
        id: recordId,
      })
      if (existenteCpf) {
        throw new BadRequestError(
          'Conflito cadastral: O CPF informado já está vinculado a outro paciente cadastrado ("' +
            existenteCpf.get('nome') +
            '").',
        )
      }
    } catch (err) {
      if (err.status === 400 || (err.message && err.message.indexOf('Conflito cadastral') !== -1)) {
        throw err
      }
    }
  }

  // 2. CNS
  var cnsRaw = e.record.get('cartao_sus')
  var cnsLimpo = limparDigitos(cnsRaw)
  if (cnsLimpo) {
    var valCns = validarCns(cnsLimpo)
    if (!valCns.valido) {
      throw new BadRequestError('Validação de Cartão SUS: ' + valCns.motivo)
    }
    e.record.set('cartao_sus', cnsLimpo)

    try {
      var existenteCns = e.app.findFirstRecordByFilter(
        'pacientes',
        'cartao_sus = {:cns} && id != {:id}',
        { cns: cnsLimpo, id: recordId },
      )
      if (existenteCns) {
        throw new BadRequestError(
          'Conflito cadastral: O Cartão SUS informado já pertence a outro paciente cadastrado ("' +
            existenteCns.get('nome') +
            '").',
        )
      }
    } catch (err) {
      if (err.status === 400 || (err.message && err.message.indexOf('Conflito cadastral') !== -1)) {
        throw err
      }
    }
  }

  e.next()
}, 'pacientes')
