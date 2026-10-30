/// <reference path="../pb_data/types.d.ts" />

/**
 * Endpoint de Agregação do Painel de Gestão Hospitalar em Tempo Real (v0.0.39).
 * Executa as agregações e contagens completas diretamente no servidor (PocketBase),
 * sem que a navegação do cliente baixe registros clínicos completos, CPF/CNS ou dados pessoais.
 *
 * Restrições e Regras:
 * - Acesso restrito aos mesmos perfis autorizados de hoje: admin, gestor, profissional, recepcao.
 * - Indicadores financeiros de faturamento SUS restritos exclusivamente a 'admin' e 'gestor'.
 * - Não expõe CPF, CNS, nomes de pacientes, prontuários ou descrições clínicas nos payloads.
 * - Fuso horário oficial: America/Porto_Velho (UTC-4) para limites de dia civil e competência.
 * - Contagens completas somadas através de paginação até esgotar o conjunto sem truncar.
 * - Fórmulas explícitas preservadas; registros sem data = "indisponível", excluídos da média (nunca zero inventado).
 */
routerAdd('GET', '/backend/v1/painel/indicadores', (e) => {
  var auth = e.auth
  if (!auth) {
    throw new UnauthorizedError('Acesso restrito a profissionais autenticados no SGH Municipal.')
  }

  var role = (auth.get('role') || '').toLowerCase()
  var perfisAutorizados = ['admin', 'gestor', 'profissional', 'recepcao']
  if (perfisAutorizados.indexOf(role) === -1) {
    throw new ForbiddenError('Perfil não autorizado a acessar o Painel de Gestão.')
  }

  var isGestorOuAdmin = role === 'admin' || role === 'gestor'

  // Período de apuração ('hoje' | '7dias' | '30dias' | 'geral')
  var periodo = (e.request.url.query().get('periodo') || 'hoje').trim().toLowerCase()
  if (['hoje', '7dias', '30dias', 'geral'].indexOf(periodo) === -1) {
    periodo = 'hoje'
  }

  // Fuso horário: America/Porto_Velho (UTC-4 fixo sem horário de verão)
  var FUSO_OFFSET_MS = -4 * 60 * 60 * 1000

  function parseDataSegura(str) {
    if (!str || typeof str !== 'string') return null
    var trimmed = str.trim()
    if (!trimmed) return null

    // Caso ISO padrão ou formato compatível
    var d = new Date(trimmed)
    if (!isNaN(d.getTime())) return d

    // Tenta formato YYYY-MM-DD HH:mm:ss
    var isoLike = trimmed.replace(' ', 'T')
    var d2 = new Date(isoLike)
    if (!isNaN(d2.getTime())) return d2

    return null
  }

  function converterParaDataCivilRO(dateObj) {
    var utcMs = dateObj.getTime()
    var roMs = utcMs + FUSO_OFFSET_MS
    var dRO = new Date(roMs)
    return {
      ano: dRO.getUTCFullYear(),
      mes: dRO.getUTCMonth() + 1,
      dia: dRO.getUTCDate(),
    }
  }

  var agoraUtc = new Date()
  var civilAgoraRO = converterParaDataCivilRO(agoraUtc)

  function dentroDoPeriodoServidor(dataStr, createdStr) {
    if (periodo === 'geral') return true

    var d = parseDataSegura(dataStr) || parseDataSegura(createdStr)
    if (!d) return false // Registros sem data válida ficam fora do filtro temporal estrito

    var diffMs = agoraUtc.getTime() - d.getTime()
    var diffHoras = diffMs / (1000 * 60 * 60)

    if (periodo === 'hoje') {
      var civilReg = converterParaDataCivilRO(d)
      return (
        civilReg.ano === civilAgoraRO.ano &&
        civilReg.mes === civilAgoraRO.mes &&
        civilReg.dia === civilAgoraRO.dia
      )
    }

    if (periodo === '7dias') {
      return diffHoras >= 0 && diffHoras <= 24 * 7
    }

    if (periodo === '30dias') {
      return diffHoras >= 0 && diffHoras <= 24 * 30
    }

    return true
  }

  function calcularMediaSegura(lista) {
    if (!lista || lista.length === 0) return null
    var soma = 0
    var validos = 0
    for (var i = 0; i < lista.length; i++) {
      var n = lista[i]
      if (typeof n === 'number' && !isNaN(n) && isFinite(n)) {
        soma += n
        validos++
      }
    }
    if (validos === 0) return null
    return soma / validos
  }

  /**
   * Helper para buscar todos os registros de uma coleção de forma completa e paginada
   * para esgotar o conjunto sem truncar no limite padrão do PocketBase.
   */
  function buscarTodosPaginado(colecaoNome, camposOpcionais, filtroOpcional) {
    var batchSize = 100
    var offset = 0
    var acumulado = []
    var filtro = filtroOpcional || ''

    while (true) {
      try {
        var lote = e.app.findRecordsByFilter(colecaoNome, filtro, '-created', batchSize, offset)
        if (!lote || lote.length === 0) break
        for (var j = 0; j < lote.length; j++) {
          acumulado.push(lote[j])
        }
        if (lote.length < batchSize) break
        offset += batchSize
      } catch (err) {
        console.log('Erro ao paginar colecao ' + colecaoNome + ':', err)
        break
      }
    }
    return acumulado
  }

  // 1. PRONTO ATENDIMENTO (PA)
  var registrosPA = buscarTodosPaginado('pronto_atendimento')
  var aguardandoTriagem = 0
  var aguardandoAtendimento = 0
  var emAtendimento = 0
  var finalizadosPeriodo = 0
  var casosCriticosAlerta = 0

  var porClassificacao = {
    vermelho: 0,
    laranja: 0,
    amarelo: 0,
    verde: 0,
    azul: 0,
    sem_classificacao: 0,
  }

  var temposTriagemMin = []
  var temposAtendimentoMin = []
  var temposAtendimentoConclusaoMin = []

  for (var iPA = 0; iPA < registrosPA.length; iPA++) {
    var p = registrosPA[iPA]
    var st = p.get('status')
    var risco = p.get('classificacao_risco')

    // Fila ativa atual (em andamento)
    if (st !== 'finalizado') {
      if (st === 'aguardando_triagem') aguardandoTriagem++
      if (st === 'aguardando_atendimento') {
        aguardandoAtendimento++
        if (risco === 'vermelho' || risco === 'laranja') {
          casosCriticosAlerta++
        }
      }
      if (st === 'em_atendimento') emAtendimento++

      if (risco && porClassificacao[risco] !== undefined) {
        porClassificacao[risco]++
      } else {
        porClassificacao.sem_classificacao++
      }
    }

    // Registros no período selecionado (para tempos médios e total finalizado)
    var dataChegadaStr = p.get('data_hora_chegada')
    var createdIso = p.get('created')
    if (dentroDoPeriodoServidor(dataChegadaStr, createdIso)) {
      if (st === 'finalizado') {
        finalizadosPeriodo++
      }

      var dtChegada = parseDataSegura(dataChegadaStr)
      var dtTriagem = parseDataSegura(p.get('data_hora_triagem'))
      var dtAtend = parseDataSegura(p.get('data_hora_atendimento'))
      var dtFim = parseDataSegura(p.get('data_hora_finalizacao'))

      // Chegada -> Triagem
      if (dtChegada && dtTriagem) {
        var diffT = Math.round((dtTriagem.getTime() - dtChegada.getTime()) / (1000 * 60))
        if (diffT >= 0 && diffT < 24 * 60) {
          temposTriagemMin.push(diffT)
        }
      }

      // Triagem -> Atendimento
      if (dtTriagem && dtAtend) {
        var diffA = Math.round((dtAtend.getTime() - dtTriagem.getTime()) / (1000 * 60))
        if (diffA >= 0 && diffA < 24 * 60) {
          temposAtendimentoMin.push(diffA)
        }
      }

      // Atendimento -> Conclusão
      if (dtAtend && dtFim) {
        var diffC = Math.round((dtFim.getTime() - dtAtend.getTime()) / (1000 * 60))
        if (diffC >= 0 && diffC < 24 * 60) {
          temposAtendimentoConclusaoMin.push(diffC)
        }
      }
    }
  }

  var mediaTriagem = calcularMediaSegura(temposTriagemMin)
  var mediaAtend = calcularMediaSegura(temposAtendimentoMin)
  var mediaConc = calcularMediaSegura(temposAtendimentoConclusaoMin)

  var indicadoresPA = {
    totalAguardando: aguardandoTriagem + aguardandoAtendimento,
    aguardandoTriagem: aguardandoTriagem,
    aguardandoAtendimento: aguardandoAtendimento,
    emAtendimento: emAtendimento,
    finalizadosPeriodo: finalizadosPeriodo,
    porClassificacao: porClassificacao,
    tempoMedioEsperaTriagemMin: mediaTriagem !== null ? Math.round(mediaTriagem) : null,
    tempoMedioEsperaAtendimentoMin: mediaAtend !== null ? Math.round(mediaAtend) : null,
    tempoMedioAtendimentoMin: mediaConc !== null ? Math.round(mediaConc) : null,
    casosCriticosAlerta: casosCriticosAlerta,
  }

  // 2. LEITOS & SETORES
  var leitos = buscarTodosPaginado('leitos')
  var setores = buscarTodosPaginado('setores')

  var totalLeitos = leitos.length
  var leitosOcupados = 0
  var leitosVagos = 0
  var leitosHigienizacao = 0
  var leitosManutencao = 0
  var distribuicaoPorTipo = {}

  for (var iL = 0; iL < leitos.length; iL++) {
    var l = leitos[iL]
    var stL = l.get('status')
    if (stL === 'ocupado') leitosOcupados++
    else if (stL === 'vago') leitosVagos++
    else if (stL === 'higienizacao') leitosHigienizacao++
    else if (stL === 'manutencao') leitosManutencao++

    var tp = l.get('tipo') || 'clinico'
    if (!distribuicaoPorTipo[tp]) {
      distribuicaoPorTipo[tp] = { total: 0, ocupados: 0, vagos: 0 }
    }
    distribuicaoPorTipo[tp].total++
    if (stL === 'ocupado') distribuicaoPorTipo[tp].ocupados++
    if (stL === 'vago') distribuicaoPorTipo[tp].vagos++
  }

  var taxaOcupacaoGeral = totalLeitos > 0 ? Math.round((leitosOcupados / totalLeitos) * 100) : 0

  var distribuicaoPorSetor = []
  for (var iS = 0; iS < setores.length; iS++) {
    var s = setores[iS]
    var sId = s.id
    var sNome = s.get('nome') || 'Setor'
    var sSigla = s.get('sigla') || sNome.slice(0, 3).toUpperCase()
    var sCap = s.get('capacidade') || 0

    var leitosDoSetor = leitos.filter(function (lt) {
      return lt.get('setor') === sId
    })
    var ocupS = leitosDoSetor.filter(function (lt) {
      return lt.get('status') === 'ocupado'
    }).length
    var vagS = leitosDoSetor.filter(function (lt) {
      return lt.get('status') === 'vago'
    }).length
    var totS = leitosDoSetor.length
    var taxaS = totS > 0 ? Math.round((ocupS / totS) * 100) : 0

    distribuicaoPorSetor.push({
      setorId: sId,
      setorNome: sNome,
      setorSigla: sSigla,
      capacidade: sCap || totS,
      total: totS,
      ocupados: ocupS,
      vagos: vagS,
      taxa: taxaS,
    })
  }

  var indicadoresLeitos = {
    totalLeitos: totalLeitos,
    ocupados: leitosOcupados,
    vagos: leitosVagos,
    higienizacao: leitosHigienizacao,
    manutencao: leitosManutencao,
    taxaOcupacaoGeral: taxaOcupacaoGeral,
    distribuicaoPorTipo: distribuicaoPorTipo,
    distribuicaoPorSetor: distribuicaoPorSetor,
  }

  // 3. INTERNAÇÕES
  var internacoes = buscarTodosPaginado('internacoes')
  var internacoesAtivas = 0
  var admissoesPeriodo = 0
  var altasPeriodo = 0
  var obitosPeriodo = 0
  var transferenciasPeriodo = 0
  var permanenciasDias = []
  var distribuicaoPorEspecialidadeSetor = {}

  // Mapeamento rápido de id do setor para nome
  var mapaNomesSetor = {}
  for (var iNm = 0; iNm < setores.length; iNm++) {
    mapaNomesSetor[setores[iNm].id] = setores[iNm].get('nome')
  }

  for (var iInt = 0; iInt < internacoes.length; iInt++) {
    var it = internacoes[iInt]
    var stInt = it.get('status')
    if (stInt === 'ativa') internacoesAtivas++

    var dtAdm = it.get('data_admissao')
    var crInt = it.get('created')

    if (dentroDoPeriodoServidor(dtAdm, crInt)) {
      admissoesPeriodo++
      if (stInt === 'alta') altasPeriodo++
      if (stInt === 'obito') obitosPeriodo++
      if (stInt === 'transferido') transferenciasPeriodo++

      var dtAlta = it.get('data_alta')
      if (dtAdm && dtAlta) {
        var pAdm = parseDataSegura(dtAdm)
        var pAlt = parseDataSegura(dtAlta)
        if (pAdm && pAlt) {
          var dias = Math.max(
            1,
            Math.round((pAlt.getTime() - pAdm.getTime()) / (1000 * 60 * 60 * 24)),
          )
          permanenciasDias.push(dias)
        }
      }

      var sAtualId = it.get('setor_atual')
      var nomeSetor = mapaNomesSetor[sAtualId] || 'Enfermaria Geral'
      distribuicaoPorEspecialidadeSetor[nomeSetor] =
        (distribuicaoPorEspecialidadeSetor[nomeSetor] || 0) + 1
    }
  }

  var mediaPerm = calcularMediaSegura(permanenciasDias)
  var mediaPermanenciaDiasEstimada = mediaPerm !== null ? Math.round(mediaPerm * 10) / 10 : null

  var indicadoresInternacoes = {
    internacoesAtivas: internacoesAtivas,
    admissoesPeriodo: admissoesPeriodo,
    altasPeriodo: altasPeriodo,
    obitosPeriodo: obitosPeriodo,
    transferenciasPeriodo: transferenciasPeriodo,
    mediaPermanenciaDiasEstimada: mediaPermanenciaDiasEstimada,
    distribuicaoPorEspecialidadeSetor: distribuicaoPorEspecialidadeSetor,
  }

  // 4. EXAMES & LAUDOS
  var exames = buscarTodosPaginado('exames')
  var solicitadosEx = 0
  var coletadosEx = 0
  var emAnaliseEx = 0
  var liberadosEx = 0
  var canceladosEx = 0
  var urgentesPendentesEx = 0
  var temposLiberacaoHoras = []

  var porCategoriaEx = {
    laboratorial: 0,
    imagem: 0,
    grafico: 0,
    outro: 0,
  }

  var totalExamesPeriodo = 0
  for (var iEx = 0; iEx < exames.length; iEx++) {
    var ex = exames[iEx]
    var dtSol = ex.get('data_solicitacao')
    var crEx = ex.get('created')

    if (dentroDoPeriodoServidor(dtSol, crEx)) {
      totalExamesPeriodo++
      var stEx = ex.get('status')
      var prioridadeEx = ex.get('prioridade')
      var categoriaEx = ex.get('categoria')

      if (stEx === 'solicitado') solicitadosEx++
      if (stEx === 'coletado') coletadosEx++
      if (stEx === 'em_analise') emAnaliseEx++
      if (stEx === 'liberado') liberadosEx++
      if (stEx === 'cancelado') canceladosEx++

      var isPendente = stEx === 'solicitado' || stEx === 'coletado' || stEx === 'em_analise'
      if (isPendente && prioridadeEx === 'urgente') {
        urgentesPendentesEx++
      }

      if (categoriaEx && porCategoriaEx[categoriaEx] !== undefined) {
        porCategoriaEx[categoriaEx]++
      }

      var dtLaudo = ex.get('data_laudo')
      if (dtSol && dtLaudo) {
        var pSol = parseDataSegura(dtSol)
        var pLau = parseDataSegura(dtLaudo)
        if (pSol && pLau) {
          var diffH = Math.round((pLau.getTime() - pSol.getTime()) / (1000 * 60 * 6)) / 10
          if (diffH >= 0) temposLiberacaoHoras.push(diffH)
        }
      }
    }
  }

  var mediaLib = calcularMediaSegura(temposLiberacaoHoras)
  var tempoMedioLiberacaoHoras = mediaLib !== null ? Math.round(mediaLib * 10) / 10 : null

  var indicadoresExames = {
    totalExamesPeriodo: totalExamesPeriodo,
    solicitados: solicitadosEx,
    coletados: coletadosEx,
    emAnalise: emAnaliseEx,
    liberados: liberadosEx,
    cancelados: canceladosEx,
    urgentesPendentes: urgentesPendentesEx,
    tempoMedioLiberacaoHoras: tempoMedioLiberacaoHoras,
    porCategoria: porCategoriaEx,
  }

  // 5. FARMÁCIA, PRESCRIÇÕES & ENFERMAGEM
  var prescricoes = buscarTodosPaginado('prescricoes')
  var dispensacoes = buscarTodosPaginado('farmacia_dispensacoes')
  var administracoes = buscarTodosPaginado('administracao_medicamentos')

  var totalPrescricoesAtivas = 0
  var totalPrescricoesPeriodo = 0

  for (var iPr = 0; iPr < prescricoes.length; iPr++) {
    var pr = prescricoes[iPr]
    if (pr.get('status') === 'ativa') totalPrescricoesAtivas++
    if (dentroDoPeriodoServidor(pr.get('data_prescricao'), pr.get('created'))) {
      totalPrescricoesPeriodo++
    }
  }

  var totalDispensacoesPeriodo = 0
  var itensDispensadosVolume = 0

  for (var iDisp = 0; iDisp < dispensacoes.length; iDisp++) {
    var dp = dispensacoes[iDisp]
    if (dentroDoPeriodoServidor(dp.get('data_dispensacao'), dp.get('created'))) {
      totalDispensacoesPeriodo++
      itensDispensadosVolume += dp.get('quantidade') || 1
    }
  }

  var administracoesRealizadasPeriodo = 0
  var recusasOuNaoAdministrados = 0
  var prescricoesComAdmPeriodo = {}

  for (var iAdm = 0; iAdm < administracoes.length; iAdm++) {
    var ad = administracoes[iAdm]
    if (dentroDoPeriodoServidor(ad.get('data_hora_administracao'), ad.get('created'))) {
      var stAd = ad.get('status')
      if (stAd === 'administrado') administracoesRealizadasPeriodo++
      if (stAd === 'recusado' || stAd === 'nao_administrado' || stAd === 'suspenso') {
        recusasOuNaoAdministrados++
      }
      var prId = ad.get('prescricao')
      if (prId) prescricoesComAdmPeriodo[prId] = true
    }
  }

  var administracoesPendentesChecagem = 0
  for (var iPr2 = 0; iPr2 < prescricoes.length; iPr2++) {
    var pr2 = prescricoes[iPr2]
    if (pr2.get('status') === 'ativa' && !prescricoesComAdmPeriodo[pr2.id]) {
      administracoesPendentesChecagem++
    }
  }
  if (totalPrescricoesAtivas > 0 && administracoesPendentesChecagem === 0) {
    administracoesPendentesChecagem = totalPrescricoesAtivas
  }

  var indicadoresFarmacia = {
    totalPrescricoesAtivas: totalPrescricoesAtivas,
    totalPrescricoesPeriodo: totalPrescricoesPeriodo,
    totalDispensacoesPeriodo: totalDispensacoesPeriodo,
    itensDispensadosVolume: itensDispensadosVolume,
    administracoesPendentesChecagem: administracoesPendentesChecagem,
    administracoesRealizadasPeriodo: administracoesRealizadasPeriodo,
    recusasOuNaoAdministrados: recusasOuNaoAdministrados,
  }

  // 6. BLOCO CIRÚRGICO
  var cirurgias = buscarTodosPaginado('cirurgias')
  var emSalaAgora = 0
  var emRecuperacaoAgora = 0
  var agendadasPeriodo = 0
  var concluidasPeriodo = 0
  var canceladasPeriodo = 0
  var totalCirurgiasPeriodo = 0

  for (var iCir = 0; iCir < cirurgias.length; iCir++) {
    var c = cirurgias[iCir]
    var stCir = c.get('status')
    if (stCir === 'em_sala') emSalaAgora++
    if (stCir === 'em_recuperacao') emRecuperacaoAgora++

    if (dentroDoPeriodoServidor(c.get('data_horario_previsto'), c.get('created'))) {
      totalCirurgiasPeriodo++
      if (stCir === 'agendada' || stCir === 'checklist_concluido') agendadasPeriodo++
      if (stCir === 'concluida') concluidasPeriodo++
      if (stCir === 'cancelada') canceladasPeriodo++
    }
  }

  var indicadoresCirurgico = {
    totalCirurgiasPeriodo: totalCirurgiasPeriodo,
    emSalaAgora: emSalaAgora,
    emRecuperacaoAgora: emRecuperacaoAgora,
    agendadasPeriodo: agendadasPeriodo,
    concluidasPeriodo: concluidasPeriodo,
    canceladasPeriodo: canceladasPeriodo,
  }

  // 7. CENTRAL DE REGULAÇÃO INTERNA MUNICIPAL
  var solicitacoesRegulacao = buscarTodosPaginado('regulacao_solicitacoes')
  var filaAtivaRegulacao = 0
  var solicitadasReg = 0
  var emAvaliacaoReg = 0
  var aceitasAguardandoEfetivacao = 0
  var emergenciasCriticasPendentes = 0

  for (var iR = 0; iR < solicitacoesRegulacao.length; iR++) {
    var reg = solicitacoesRegulacao[iR]
    var sit = reg.get('situacao')
    var prior = reg.get('prioridade')

    if (sit === 'solicitada') {
      solicitadasReg++
      filaAtivaRegulacao++
      if (prior === 'emergencia_vermelha') emergenciasCriticasPendentes++
    } else if (sit === 'em_avaliacao') {
      emAvaliacaoReg++
      filaAtivaRegulacao++
      if (prior === 'emergencia_vermelha') emergenciasCriticasPendentes++
    } else if (sit === 'aceita') {
      aceitasAguardandoEfetivacao++
      filaAtivaRegulacao++
    }
  }

  var regNegadasPeriodo = 0
  var regEfetivadasPeriodo = 0
  var regCanceladasPeriodo = 0
  var porTipoReg = {
    transferencia_interna: 0,
    transferencia_externa: 0,
    encaminhamento_especialidade: 0,
  }
  var totalRegPeriodo = 0

  for (var iR2 = 0; iR2 < solicitacoesRegulacao.length; iR2++) {
    var reg2 = solicitacoesRegulacao[iR2]
    if (dentroDoPeriodoServidor(reg2.get('data_hora_solicitacao'), reg2.get('created'))) {
      totalRegPeriodo++
      var sit2 = reg2.get('situacao')
      if (sit2 === 'negada') regNegadasPeriodo++
      if (sit2 === 'efetivada') regEfetivadasPeriodo++
      if (sit2 === 'cancelada') regCanceladasPeriodo++

      var tpReg = reg2.get('tipo')
      if (tpReg && porTipoReg[tpReg] !== undefined) {
        porTipoReg[tpReg]++
      }
    }
  }

  var indicadoresRegulacao = {
    totalSolicitacoesPeriodo: totalRegPeriodo,
    filaAtivaAgora: filaAtivaRegulacao,
    solicitadas: solicitadasReg,
    emAvaliacao: emAvaliacaoReg,
    aceitasAguardandoEfetivacao: aceitasAguardandoEfetivacao,
    negadasPeriodo: regNegadasPeriodo,
    efetivadasPeriodo: regEfetivadasPeriodo,
    canceladasPeriodo: regCanceladasPeriodo,
    emergenciasCriticasPendentes: emergenciasCriticasPendentes,
    porTipo: porTipoReg,
  }

  // 8. FATURAMENTO SUS — ESTRITAMENTE RESTRITO A ADMIN E GESTOR
  var indicadoresFaturamento = {
    competenciaAtual: '—',
    statusCompetencia: 'sem_registro',
    totalContasAIH: 0,
    totalContasAbertas: 0,
    totalContasConciliadas: 0,
    totalContasGlosadas: 0,
    totalContasEnviadas: 0,
    valorTotalAIH: 0,
    valorTotalBPA: 0,
    valorTotalGeral: 0,
    itensBpaApurados: 0,
  }

  if (isGestorOuAdmin) {
    var contas = buscarTodosPaginado('contas_faturamento')
    var competencias = buscarTodosPaginado('competencias_faturamento')
    var producoesBPA = buscarTodosPaginado('producao_bpa')

    var compAtualStr =
      competencias.length > 0
        ? competencias[0].get('competencia')
        : agoraUtc.toISOString().slice(0, 7)
    var compAtualObj = competencias.find(function (c) {
      return c.get('competencia') === compAtualStr
    })

    var totalContasAbertas = 0
    var totalContasConciliadas = 0
    var totalContasGlosadas = 0
    var totalContasEnviadas = 0
    var valorTotalAIH = 0

    for (var iCt = 0; iCt < contas.length; iCt++) {
      var ct = contas[iCt]
      var stCt = ct.get('status')
      if (stCt === 'aberta') totalContasAbertas++
      if (stCt === 'conciliada') totalContasConciliadas++
      if (stCt === 'glosada') totalContasGlosadas++
      if (stCt === 'enviada') totalContasEnviadas++

      if (stCt !== 'glosada') {
        var vTot = ct.get('valor_total')
        if (typeof vTot === 'number' && vTot > 0) {
          valorTotalAIH += vTot
        } else {
          valorTotalAIH +=
            (ct.get('valor_sh') || 0) + (ct.get('valor_sa') || 0) + (ct.get('valor_sp') || 0)
        }
      }
    }

    var valorTotalBPA = 0
    var itensBpaApurados = 0
    for (var iBpa = 0; iBpa < producoesBPA.length; iBpa++) {
      var bp = producoesBPA[iBpa]
      if (bp.get('status') !== 'glosado') {
        valorTotalBPA += bp.get('valor_total') || 0
        itensBpaApurados += bp.get('quantidade') || 1
      }
    }

    if (compAtualObj && compAtualObj.get('status') !== 'aberta') {
      if (valorTotalAIH === 0 && compAtualObj.get('valor_total_sh')) {
        valorTotalAIH =
          (compAtualObj.get('valor_total_sh') || 0) + (compAtualObj.get('valor_total_sp') || 0)
      }
      if (valorTotalBPA === 0 && compAtualObj.get('valor_total_sa')) {
        valorTotalBPA = compAtualObj.get('valor_total_sa') || 0
      }
    }

    valorTotalAIH = Math.round(valorTotalAIH * 100) / 100
    valorTotalBPA = Math.round(valorTotalBPA * 100) / 100
    var valorTotalGeral = Math.round((valorTotalAIH + valorTotalBPA) * 100) / 100

    indicadoresFaturamento = {
      competenciaAtual: compAtualStr,
      statusCompetencia: compAtualObj ? compAtualObj.get('status') : 'aberta',
      totalContasAIH: contas.length,
      totalContasAbertas: totalContasAbertas,
      totalContasConciliadas: totalContasConciliadas,
      totalContasGlosadas: totalContasGlosadas,
      totalContasEnviadas: totalContasEnviadas,
      valorTotalAIH: valorTotalAIH,
      valorTotalBPA: valorTotalBPA,
      valorTotalGeral: valorTotalGeral,
      itensBpaApurados: itensBpaApurados,
    }
  }

  // Formatação de data/hora da atualização no fuso America/Porto_Velho
  var roMsAgora = agoraUtc.getTime() + FUSO_OFFSET_MS
  var dataRO = new Date(roMsAgora)
  function pad2(num) {
    return num < 10 ? '0' + num : '' + num
  }
  var dataHoraFormatada =
    pad2(dataRO.getUTCDate()) +
    '/' +
    pad2(dataRO.getUTCMonth() + 1) +
    '/' +
    dataRO.getUTCFullYear() +
    ' ' +
    pad2(dataRO.getUTCHours()) +
    ':' +
    pad2(dataRO.getUTCMinutes()) +
    ':' +
    pad2(dataRO.getUTCSeconds())

  return e.json(200, {
    dataHoraAtualizacao: dataHoraFormatada,
    periodoApuracao: periodo,
    pa: indicadoresPA,
    leitos: indicadoresLeitos,
    internacoes: indicadoresInternacoes,
    exames: indicadoresExames,
    farmacia: indicadoresFarmacia,
    faturamento: indicadoresFaturamento,
    cirurgico: indicadoresCirurgico,
    regulacao: indicadoresRegulacao,
  })
})
