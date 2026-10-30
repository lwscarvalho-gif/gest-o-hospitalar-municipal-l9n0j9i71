import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Highlighter,
  Indent,
  Outdent,
  List,
  ListOrdered,
  Link,
  Table,
  CheckSquare,
  Box,
  Layers,
  FileText,
  Printer,
  Save,
  Send,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Info,
  X,
  History,
  Image as ImageIcon,
  Palette,
  Type,
  FileCheck,
  ShieldCheck,
  SplitSquareVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  salvarRascunhoLaudoRIS,
  obterPreviaLaudoRIS,
  publicarLaudoRIS,
  retificarLaudoRIS,
  sanitizarHtmlServidorRIS,
  ConflitoConcorrenciaEdicaoError,
  RespostaSessaoObsoletaError,
  listarModelosLaudoRIS,
  aplicarModeloLaudoComoRascunho,
} from '@/services/ris'
import { pb } from '@/lib/pocketbase/client'
import {
  ItemFilaRIS,
  RisModeloLaudo,
  RespostaPreviaLaudoRIS,
  RisConfigEditorLaudo,
  RisImagemAnexaItem,
} from '@/types/hospital'
import { useAuth } from '@/contexts/AuthContext'

interface EditorFormatadoRISProps {
  exame: ItemFilaRIS
  aberto: boolean
  onClose: () => void
  onSucessoPublicacao?: () => void
}

/**
 * Cores seguras permitidas para formatação clínica
 */
const CORES_TEXTO_SEGURAS = [
  { rotulo: 'Padrão (Grafite)', valor: '#0f172a' },
  { rotulo: 'Azul Clínico', valor: '#1e40af' },
  { rotulo: 'Verde Normal', valor: '#166534' },
  { rotulo: 'Vermelho Crítico', valor: '#991b1b' },
  { rotulo: 'Âmbar Atenção', valor: '#9a3412' },
]

const CORES_CAIXA_SEGURAS = [
  { rotulo: 'Cinza Suave', bg: '#f8fafc', border: '#cbd5e1' },
  { rotulo: 'Azul Observação', bg: '#eff6ff', border: '#bfdbfe' },
  { rotulo: 'Amarelo Alerta', bg: '#fefce8', border: '#fef08a' },
  { rotulo: 'Verde Conclusão', bg: '#f0fdf4', border: '#bbf7d0' },
  { rotulo: 'Rosa Achado Crítico', bg: '#fff1f2', border: '#fecdd3' },
]

export const EditorFormatadoRIS: React.FC<EditorFormatadoRISProps> = ({
  exame,
  aberto,
  onClose,
  onSucessoPublicacao,
}) => {
  const { user } = useAuth()

  // Sessão e proteção seqRef para descartar respostas obsoletas
  const seqRef = useRef(0)
  const exameIdRef = useRef(exame.id)

  // Conteúdo clínico em memória (SEM PERSISTÊNCIA EM LOCALSTORAGE!)
  const [conteudoHtml, setConteudoHtml] = useState('')
  const [sumarioResultado, setSumarioResultado] = useState('')
  const [versaoEsperada, setVersaoEsperada] = useState<number>(exame.versao_atual || 1)
  const [versaoRascunhoAtual, setVersaoRascunhoAtual] = useState<number>(1)
  const [motivoRetificacao, setMotivoRetificacao] = useState('')

  // Configurações do layout/estilo
  const [estiloFonte, setEstiloFonte] = useState<'sans' | 'serif' | 'mono'>('sans')
  const [tamanhoFonte, setTamanhoFonte] = useState<'pequena' | 'normal' | 'grande'>('normal')
  const [corTextoAtiva, setCorTextoAtiva] = useState('#0f172a')

  // Chaves de idempotência mantidas em memória para retentativas de envio
  const idempotencyKeyPublicacaoRef = useRef<string>(
    `ris-pub-${exame.id}-${Date.now().toString(36)}`,
  )
  const idempotencyKeyRetificacaoRef = useRef<string>(
    `ris-ret-${exame.id}-${Date.now().toString(36)}`,
  )

  // Estados de operação assíncrona
  const [carregandoInicial, setCarregandoInicial] = useState(false)
  const [salvandoRascunho, setSalvandoRascunho] = useState(false)
  const [publicandoLaudo, setPublicandoLaudo] = useState(false)
  const [retificandoLaudo, setRetificandoLaudo] = useState(false)
  const [gerandoPrevia, setGerandoPrevia] = useState(false)

  // Mensagens e erros da interface
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)
  const [erroOperacao, setErroOperacao] = useState<string | null>(null)

  // Conflito de concorrência (409)
  const [conflito409Aberto, setConflito409Aberto] = useState(false)
  const [dadosConflito, setDadosConflito] = useState<{
    mensagem: string
    versaoServidor?: number
    versaoCliente?: number
  } | null>(null)

  // Modelos de laudo disponíveis
  const [modelosDisponiveis, setModelosDisponiveis] = useState<RisModeloLaudo[]>([])
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState<string>('')
  const [aplicandoModelo, setAplicandoModelo] = useState(false)

  // Imagens anexas internas disponíveis na coleção ris_imagens_anexas
  const [imagensAnexasInternas, setImagensAnexasInternas] = useState<RisImagemAnexaItem[]>([])
  const [modalImagensAberto, setModalImagensAberto] = useState(false)
  const [modalAjudaCamposAberto, setModalAjudaCamposAberto] = useState(false)

  // Prévia e Impressão segura
  const [modalPreviaAberto, setModalPreviaAberto] = useState(false)
  const [dadosPrevia, setDadosPrevia] = useState<RespostaPreviaLaudoRIS | null>(null)

  // Modal de retificação
  const [modalConfirmarRetificacaoAberto, setModalConfirmarRetificacaoAberto] = useState(false)

  // Referência do elemento editável (contentEditable)
  const editorRef = useRef<HTMLDivElement | null>(null)

  // Verifica se o exame já está formalmente laudado / liberado
  const laudoJaLiberado =
    exame.status_ris === 'laudado' ||
    exame.status === 'liberado' ||
    Boolean(exame.data_laudo && exame.laudo_texto)

  // Limpeza estrita e inicialização na troca de paciente/exame
  useEffect(() => {
    seqRef.current += 1
    exameIdRef.current = exame.id

    // Esvazia buffer clínico em memória imediatamente
    setConteudoHtml('')
    setSumarioResultado('')
    setMotivoRetificacao('')
    setMensagemSucesso(null)
    setErroOperacao(null)
    setDadosPrevia(null)
    setConflito409Aberto(false)
    setDadosConflito(null)

    // Recria chaves de idempotência para o exame novo
    idempotencyKeyPublicacaoRef.current = `ris-pub-${exame.id}-${Date.now().toString(36)}`
    idempotencyKeyRetificacaoRef.current = `ris-ret-${exame.id}-${Date.now().toString(36)}`

    if (!aberto) return

    const seqAtual = seqRef.current

    async function carregarDadosIniciais() {
      setCarregandoInicial(true)
      try {
        // 1. Carrega prévia/rascunho existente via serviço oficial
        const previa = await obterPreviaLaudoRIS(exame.id, {
          seqMomento: seqAtual,
          seqReferencia: seqRef,
        })

        if (seqRef.current !== seqAtual) return

        setDadosPrevia(previa)

        // Inicializa conteúdo com rascunho ou laudo publicado
        const conteudoBruto =
          previa.previa.conteudo_formatado_sanitizado ||
          exame.conteudo_formatado_rascunho ||
          exame.rascunho_laudo ||
          exame.laudo_texto ||
          ''

        // Sanitização preventiva de renderização
        const conteudoSeguro = sanitizarHtmlServidorRIS(conteudoBruto)
        setConteudoHtml(conteudoSeguro)
        setSumarioResultado(exame.resultado_sumario || '')
        setVersaoEsperada(exame.versao_atual || 1)
        setVersaoRascunhoAtual(exame.versao_conteudo_rascunho || 1)

        // Configuração do editor
        const cfg = previa.previa.config_editor as RisConfigEditorLaudo
        if (cfg) {
          if (cfg.estilo_fonte) setEstiloFonte(cfg.estilo_fonte)
          if (cfg.tamanho_fonte) setTamanhoFonte(cfg.tamanho_fonte)
          if (cfg.cor_destaque) setCorTextoAtiva(cfg.cor_destaque)
        }

        // 2. Carrega modelos cadastrados da modalidade
        const modelos = await listarModelosLaudoRIS(exame.modalidade_ris, false)
        if (seqRef.current !== seqAtual) return
        setModelosDisponiveis(modelos)

        // 3. Carrega imagens anexas internas vinculadas ao exame na coleção ris_imagens_anexas
        try {
          const imgRecords = await pb.collection('ris_imagens_anexas').getFullList({
            filter: `exame = "${exame.id}"`,
            sort: 'ordem',
          })
          if (seqRef.current === seqAtual) {
            setImagensAnexasInternas(
              imgRecords.map((r) => ({
                id: r.id,
                arquivo: r.arquivo,
                legenda: r.legenda,
                ordem: r.ordem,
                mime_type: r.mime_type,
                tamanho_bytes: r.tamanho_bytes,
              })),
            )
          }
        } catch {
          // Lista vazia se coleção ainda não possuir itens para este exame
          if (seqRef.current === seqAtual) {
            setImagensAnexasInternas([])
          }
        }
      } catch (err: unknown) {
        if (err instanceof RespostaSessaoObsoletaError) return
        const msg = err instanceof Error ? err.message : String(err)
        setErroOperacao(`Falha ao carregar exame no editor: ${msg}`)
      } finally {
        if (seqRef.current === seqAtual) {
          setCarregandoInicial(false)
        }
      }
    }

    void carregarDadosIniciais()

    return () => {
      // Cleanup: avança sequência para invalidar requisições em voo
      seqRef.current += 1
    }
  }, [exame.id, aberto])

  // Sincroniza HTML do editor div com o estado
  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      setConteudoHtml(editorRef.current.innerHTML)
    }
  }, [])

  // Comandos de formatação da barra funcional
  const executarComandoFormato = (comando: string, valor?: string) => {
    if (!editorRef.current) return
    editorRef.current.focus()
    document.execCommand(comando, false, valor)
    handleEditorInput()
  }

  // Inserção de Grifo / Marcador de texto
  const inserirGrifo = () => {
    executarComandoFormato('backColor', '#fef08a')
  }

  // Inserção de Hyperlink Seguro
  const inserirLinkSeguro = () => {
    const url = prompt(
      'Digite a URL institucional segura (ex: https://portal.saude.gov.br):',
      'https://',
    )
    if (!url) return
    if (
      url.toLowerCase().startsWith('javascript:') ||
      url.toLowerCase().startsWith('data:') ||
      url.toLowerCase().startsWith('vbscript:')
    ) {
      alert(
        'Links perigosos (javascript: ou data:) são estritamente bloqueados pela segurança do RIS.',
      )
      return
    }
    executarComandoFormato('createLink', url)
  }

  // Inserção de Tabela estruturada
  const inserirTabela = () => {
    const htmlTabela = `
      <table class="w-full my-3 border-collapse border border-slate-300 text-xs">
        <thead>
          <tr class="bg-slate-100">
            <th class="border border-slate-300 p-1.5 text-left font-bold">Segmento / Região</th>
            <th class="border border-slate-300 p-1.5 text-left font-bold">Achados Radiológicos</th>
            <th class="border border-slate-300 p-1.5 text-left font-bold">Classificação / Bi-Rads / Grau</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border border-slate-300 p-1.5">Ápice pulmonar direito</td>
            <td class="border border-slate-300 p-1.5">Transparência normal, sem nódulos</td>
            <td class="border border-slate-300 p-1.5">Padrão habitual</td>
          </tr>
          <tr>
            <td class="border border-slate-300 p-1.5">Ápice pulmonar esquerdo</td>
            <td class="border border-slate-300 p-1.5">Seios costofrênicos livres</td>
            <td class="border border-slate-300 p-1.5">Padrão habitual</td>
          </tr>
        </tbody>
      </table><p><br/></p>
    `
    executarComandoFormato('insertHTML', htmlTabela)
  }

  // Inserção de Checklist clínico
  const inserirChecklist = () => {
    const htmlChecklist = `
      <div class="my-2 p-2 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" class="ris-checklist-item" />
          <span>Qualidade técnica adequada e posicionamento correto</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" class="ris-checklist-item" checked />
          <span>Contraste administrado sem intercorrências</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" class="ris-checklist-item" />
          <span>Sem artefatos de movimento significativos</span>
        </label>
      </div><p><br/></p>
    `
    executarComandoFormato('insertHTML', htmlChecklist)
  }

  /**
   * INTERPRETAÇÃO ADOTADA PARA OS CAMPOS EXIGIDOS EM 7.4.3.4.b.i:
   * 1. Campo Box: Bloco delimitado e destacado (caixa de texto) para realce de achado importante ou alerta clínico.
   * 2. Campo Lista: Estrutura semântica de opções clínicas rápidas em tópicos padronizados.
   * 3. Campo Flutuante: Nota de rodapé/lateral destacada para observação técnica ou metadado do aparelho.
   */
  const inserirCampoBox = (cor = CORES_CAIXA_SEGURAS[0]) => {
    const htmlBox = `
      <div class="ris-campo-box my-3 p-3 rounded border text-xs" style="background-color: ${cor.bg}; border-color: ${cor.border};">
        <strong class="text-slate-800 block mb-1 uppercase tracking-wide text-[10px]">Achado Relevante em Caixa (Box):</strong>
        <span>Descreva aqui a mensuração da lesão, cálculo de volume ou conclusão focada...</span>
      </div><p><br/></p>
    `
    executarComandoFormato('insertHTML', htmlBox)
  }

  const inserirCampoLista = () => {
    const htmlLista = `
      <div class="ris-campo-lista my-2 p-2 bg-slate-50 border-l-4 border-sky-600 pl-3 text-xs">
        <strong class="text-sky-950 block text-[11px] mb-1">Relação de Parâmetros Avaliados:</strong>
        <ul class="list-disc ml-4 space-y-0.5">
          <li>Item avaliado 1: Normal</li>
          <li>Item avaliado 2: Sem alterações agudas</li>
          <li>Item avaliado 3: Estável em relação a exame prévio</li>
        </ul>
      </div><p><br/></p>
    `
    executarComandoFormato('insertHTML', htmlLista)
  }

  const inserirCampoFlutuante = () => {
    const htmlFlutuante = `
      <div class="ris-campo-flutuante my-2 p-2 bg-amber-50/80 border border-dashed border-amber-300 rounded text-[11px] text-amber-950">
        <span class="font-bold block">[Nota Flutuante / Detalhe Técnico]:</span>
        <span>Aparelho multislice 64 canais. Espessura de corte de 1,0mm com reconstruções multiplanares MPR.</span>
      </div><p><br/></p>
    `
    executarComandoFormato('insertHTML', htmlFlutuante)
  }

  // Inserção de Linha para Quebra de Página (7.4.3.4.b.i)
  const inserirQuebraPagina = () => {
    const htmlQuebra = `
      <hr class="ris-quebra-pagina my-4 border-dashed border-2 border-slate-400 print:page-break-after print:border-none" />
      <div class="text-[10px] text-slate-400 font-mono text-center uppercase tracking-widest select-none print:hidden">--- QUEBRA DE PÁGINA A4 ---</div>
      <p><br/></p>
    `
    executarComandoFormato('insertHTML', htmlQuebra)
  }

  // Inserção de Imagem Interna Autorizada vinculada ao exame
  const inserirImagemInterna = (imgItem: RisImagemAnexaItem) => {
    const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
    const urlSegura = `${baseUrl.replace(/\/$/, '')}/api/files/ris_imagens_anexas/${encodeURIComponent(imgItem.id)}/${encodeURIComponent(imgItem.arquivo)}`
    const htmlImg = `
      <div class="my-3 text-center">
        <img src="${urlSegura}" alt="${imgItem.legenda || 'Imagem do Exame'}" data-imagem-id="${imgItem.id}" class="ris-imagem-laudo-interna max-w-full rounded border border-slate-300 my-2 mx-auto" style="max-height: 380px;" />
        <span class="block text-[10px] text-slate-500 italic mt-1 font-mono">${imgItem.legenda || 'Registro iconográfico do exame'} (ID: ${imgItem.id})</span>
      </div><p><br/></p>
    `
    executarComandoFormato('insertHTML', htmlImg)
    setModalImagensAberto(false)
  }

  // Aplicação de Modelo como Rascunho para Revisão Humana
  const handleAplicarModelo = async () => {
    if (!modeloSelecionadoId) return
    if (laudoJaLiberado) {
      alert('Não é permitido aplicar modelo para sobrescrever um laudo que já foi liberado.')
      return
    }

    setAplicandoModelo(true)
    setErroOperacao(null)
    try {
      const res = await aplicarModeloLaudoComoRascunho(exame.id, modeloSelecionadoId)
      const modeloObj = modelosDisponiveis.find((m) => m.id === modeloSelecionadoId)
      const conteudoNovo = modeloObj?.conteudo_formatado || res.rascunho_gerado || ''
      const seguro = sanitizarHtmlServidorRIS(conteudoNovo)

      setConteudoHtml(seguro)
      if (editorRef.current) {
        editorRef.current.innerHTML = seguro
      }
      setMensagemSucesso(`Modelo "${res.modelo_titulo}" aplicado como rascunho com sucesso!`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setErroOperacao(`Falha ao aplicar modelo: ${msg}`)
    } finally {
      setAplicandoModelo(false)
    }
  }

  // 1. Salvar Rascunho com Concorrência Otimista (409)
  const handleSalvarRascunho = async () => {
    setSalvandoRascunho(true)
    setErroOperacao(null)
    setMensagemSucesso(null)

    const seqAtual = seqRef.current
    try {
      const cfg: RisConfigEditorLaudo = {
        estilo_fonte: estiloFonte,
        tamanho_fonte: tamanhoFonte,
        cor_destaque: corTextoAtiva,
        tamanho_pagina: 'A4',
      }

      const res = await salvarRascunhoLaudoRIS(
        exame.id,
        {
          conteudo_formatado: conteudoHtml,
          versao_esperada: versaoRascunhoAtual,
          config_editor: cfg,
          resultado_sumario: sumarioResultado.trim(),
        },
        {
          seqMomento: seqAtual,
          seqReferencia: seqRef,
        },
      )

      if (seqRef.current !== seqAtual) return

      setVersaoRascunhoAtual(res.versao_conteudo_rascunho)
      setMensagemSucesso(
        `Rascunho versão ${res.versao_conteudo_rascunho} salvo com sanitização do servidor com sucesso!`,
      )
    } catch (err: unknown) {
      if (err instanceof RespostaSessaoObsoletaError) return

      if (err instanceof ConflitoConcorrenciaEdicaoError) {
        // Conflito 409 detectado: MANTÉM o texto digitado intacto e abre modal de revisão
        setDadosConflito({
          mensagem: err.message,
          versaoServidor: err.versaoAtualServidor,
          versaoCliente: err.versaoEsperadaCliente,
        })
        setConflito409Aberto(true)
        return
      }

      const msg = err instanceof Error ? err.message : String(err)
      setErroOperacao(`Erro ao salvar rascunho: ${msg}`)
    } finally {
      if (seqRef.current === seqAtual) {
        setSalvandoRascunho(false)
      }
    }
  }

  // Resolução de conflito 409: usuário opta por forçar com a versão mais recente do servidor mantendo o que digitou
  const handleResolverConflitoManterTexto = () => {
    if (dadosConflito?.versaoServidor) {
      setVersaoRascunhoAtual(dadosConflito.versaoServidor)
    }
    setConflito409Aberto(false)
    setMensagemSucesso(
      'Versão sincronizada. Seu texto foi preservado intacto. Clique em Salvar Rascunho para submeter.',
    )
  }

  // 2. Gerar Prévia Segura (Layout Municipal A4)
  const handleGerarPrevia = async () => {
    setGerandoPrevia(true)
    setErroOperacao(null)
    const seqAtual = seqRef.current
    try {
      // Primeiro salva o rascunho em voo para que a prévia reflita o estado atual
      if (!laudoJaLiberado) {
        await salvarRascunhoLaudoRIS(
          exame.id,
          {
            conteudo_formatado: conteudoHtml,
            versao_esperada: versaoRascunhoAtual,
            resultado_sumario: sumarioResultado.trim(),
          },
          { seqMomento: seqAtual, seqReferencia: seqRef },
        )
      }

      const previa = await obterPreviaLaudoRIS(exame.id, {
        seqMomento: seqAtual,
        seqReferencia: seqRef,
      })

      if (seqRef.current !== seqAtual) return

      setDadosPrevia(previa)
      setModalPreviaAberto(true)
    } catch (err: unknown) {
      if (err instanceof RespostaSessaoObsoletaError) return
      const msg = err instanceof Error ? err.message : String(err)
      setErroOperacao(`Falha ao obter prévia oficial: ${msg}`)
    } finally {
      if (seqRef.current === seqAtual) {
        setGerandoPrevia(false)
      }
    }
  }

  // 3. Publicar Laudo Formalmente (Cria Versão 1 Imutável)
  const handlePublicarLaudo = async () => {
    if (!sumarioResultado.trim()) {
      setErroOperacao(
        'O Parecer Conclusivo / Sumário do Resultado é obrigatório para liberação formal.',
      )
      return
    }

    if (!conteudoHtml.trim()) {
      setErroOperacao('O conteúdo do laudo formatado não pode ser vazio para homologação.')
      return
    }

    setPublicandoLaudo(true)
    setErroOperacao(null)
    setMensagemSucesso(null)

    const seqAtual = seqRef.current
    try {
      const cfg: RisConfigEditorLaudo = {
        estilo_fonte: estiloFonte,
        tamanho_fonte: tamanhoFonte,
        cor_destaque: corTextoAtiva,
        tamanho_pagina: 'A4',
      }

      // Reenvio usa a MESMA chave de idempotência mantida em memória!
      const res = await publicarLaudoRIS(
        exame.id,
        {
          conteudo_formatado: conteudoHtml,
          resultado_sumario: sumarioResultado.trim(),
          idempotency_key: idempotencyKeyPublicacaoRef.current,
          config_editor: cfg,
        },
        {
          seqMomento: seqAtual,
          seqReferencia: seqRef,
        },
      )

      if (seqRef.current !== seqAtual) return

      setMensagemSucesso(
        `Laudo publicado e homologado com sucesso! Versão ${res.versao_numero} congelada no PEP.`,
      )
      if (onSucessoPublicacao) onSucessoPublicacao()
    } catch (err: unknown) {
      if (err instanceof RespostaSessaoObsoletaError) return
      const msg = err instanceof Error ? err.message : String(err)
      setErroOperacao(`Falha ao publicar laudo: ${msg}`)
    } finally {
      if (seqRef.current === seqAtual) {
        setPublicandoLaudo(false)
      }
    }
  }

  // 4. Retificar Laudo Formalmente (Cria Versão 2+ Relacionada)
  const handleConfirmarRetificacao = async () => {
    if (!motivoRetificacao.trim() || motivoRetificacao.trim().length < 5) {
      setErroOperacao('A retificação exige justificativa clínica detalhada (mínimo 5 caracteres).')
      return
    }

    if (!sumarioResultado.trim()) {
      setErroOperacao('O parecer conclusivo / sumário do resultado é obrigatório na retificação.')
      return
    }

    setRetificandoLaudo(true)
    setErroOperacao(null)
    setMensagemSucesso(null)

    const seqAtual = seqRef.current
    try {
      const cfg: RisConfigEditorLaudo = {
        estilo_fonte: estiloFonte,
        tamanho_fonte: tamanhoFonte,
        cor_destaque: corTextoAtiva,
        tamanho_pagina: 'A4',
      }

      // Reenvio de retificação usa a mesma chave de idempotência da tentativa
      const res = await retificarLaudoRIS(
        exame.id,
        {
          conteudo_formatado: conteudoHtml,
          resultado_sumario: sumarioResultado.trim(),
          motivo_retificacao: motivoRetificacao.trim(),
          idempotency_key: idempotencyKeyRetificacaoRef.current,
          config_editor: cfg,
        },
        {
          seqMomento: seqAtual,
          seqReferencia: seqRef,
        },
      )

      if (seqRef.current !== seqAtual) return

      setModalConfirmarRetificacaoAberto(false)
      setMensagemSucesso(
        `Laudo retificado com sucesso! Versão ${res.versao_numero} emitida mantendo a versão anterior imutável no histórico.`,
      )
      if (onSucessoPublicacao) onSucessoPublicacao()
    } catch (err: unknown) {
      if (err instanceof RespostaSessaoObsoletaError) return
      const msg = err instanceof Error ? err.message : String(err)
      setErroOperacao(`Falha ao retificar laudo: ${msg}`)
    } finally {
      if (seqRef.current === seqAtual) {
        setRetificandoLaudo(false)
      }
    }
  }

  // Disparo de impressão física do laudo oficial
  const handleImprimirLaudo = () => {
    window.print()
  }

  return (
    <Dialog open={aberto} onOpenChange={(ab) => !ab && onClose()}>
      <DialogContent className="max-w-5xl max-h-[94vh] flex flex-col p-0 overflow-hidden font-sans">
        {/* ==================================================================== */}
        {/* CABEÇALHO COM IDENTIFICAÇÃO OBRIGATÓRIA (PACIENTE / EXAME / VERSÃO) */}
        {/* ==================================================================== */}
        <DialogHeader className="p-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  Editor Formatado de Laudos RIS (DOC-02 7.4.3.4.b.i–iii)
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={
                    laudoJaLiberado
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700 text-[11px]'
                      : 'bg-amber-950/80 text-amber-300 border-amber-700 text-[11px]'
                  }
                >
                  {laudoJaLiberado ? 'Laudo Homologado / Vigente' : 'Rascunho em Elaboração'}
                </Badge>
              </div>

              {/* Paciente / Exame / Versão identificados expressamente na tela */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                <span>
                  Paciente:{' '}
                  <strong className="text-white uppercase">
                    {exame.paciente_nome || 'Paciente não identificado'}
                  </strong>
                </span>
                <span>
                  Exame: <strong className="text-sky-300">{exame.tipo_exame}</strong> (
                  {exame.modalidade_ris.toUpperCase()})
                </span>
                <span>
                  Versão do Laudo:{' '}
                  <Badge className="bg-sky-600 text-white text-[10px] px-1.5 py-0 font-mono">
                    {laudoJaLiberado
                      ? `V${exame.versao_atual || 1}`
                      : `Rascunho rev.${versaoRascunhoAtual}`}
                  </Badge>
                </span>
                <span>
                  Protocolo:{' '}
                  <span className="font-mono text-slate-400">
                    {exame.codigo_acesso || exame.id.slice(0, 8)}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setModalAjudaCamposAberto(true)}
                className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs h-8"
              >
                <Info className="w-3.5 h-3.5 mr-1 text-sky-400" />
                Interpretação dos Campos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ==================================================================== */}
        {/* CORPO DO EDITOR COM BARRA FUNCIONAL DE FORMATAÇÃO E ÁREA DE TEXTO */}
        {/* ==================================================================== */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-100 overflow-y-auto p-3 space-y-3">
          {/* Mensagens de Sucesso ou Erro */}
          {mensagemSucesso && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{mensagemSucesso}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMensagemSucesso(null)}
                className="h-6 w-6 p-0 text-emerald-700"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {erroOperacao && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{erroOperacao}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setErroOperacao(null)}
                className="h-6 w-6 p-0 text-red-700"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Sumário do Resultado / Parecer Conclusivo (Obrigatório) */}
          <div className="bg-white p-2.5 rounded border border-slate-200 shadow-sm space-y-1">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Parecer Conclusivo / Sumário do Resultado *</span>
              <span className="text-[10px] text-slate-500 font-normal">
                (Exibido em sumários rápidos de prontuário e lista de exames)
              </span>
            </label>
            <Input
              value={sumarioResultado}
              onChange={(e) => setSumarioResultado(e.target.value)}
              placeholder="Ex: Exame de tórax dentro dos padrões de normalidade. Ausência de consolidações agudas."
              className="text-xs font-semibold text-slate-900 h-8"
              disabled={laudoJaLiberado && !modalConfirmarRetificacaoAberto}
            />
          </div>

          {/* Seleção de Modelos Padronizados Versionados */}
          {!laudoJaLiberado && (
            <div className="bg-white p-2.5 rounded border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                <FileText className="w-4 h-4 text-sky-700 shrink-0" />
                <span className="font-semibold text-slate-700">Modelo Pré-definido:</span>
                <Select value={modeloSelecionadoId} onValueChange={setModeloSelecionadoId}>
                  <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-300 flex-1">
                    <SelectValue placeholder="Selecione um modelo da modalidade..." />
                  </SelectTrigger>
                  <SelectContent>
                    {modelosDisponiveis.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.titulo} (v{m.versao}) • {m.procedimento_nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAplicarModelo}
                disabled={!modeloSelecionadoId || aplicandoModelo}
                className="h-8 text-xs border-sky-300 text-sky-800 hover:bg-sky-50"
              >
                {aplicandoModelo ? 'Aplicando...' : 'Aplicar como Rascunho Editável'}
              </Button>
            </div>
          )}

          {/* ==================================================================== */}
          {/* BARRA DE FERRAMENTAS DO EDITOR (7.4.3.4.b.i p. 21-22) */}
          {/* ==================================================================== */}
          <div className="bg-white border border-slate-300 rounded shadow-sm p-1.5 flex flex-wrap items-center gap-1 text-xs shrink-0 select-none">
            {/* Negrito, Itálico, Sublinhado, Grifo */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Negrito (Ctrl+B)"
              className="h-7 w-7 p-0"
              onClick={() => executarComandoFormato('bold')}
            >
              <Bold className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Itálico (Ctrl+I)"
              className="h-7 w-7 p-0"
              onClick={() => executarComandoFormato('italic')}
            >
              <Italic className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Sublinhado (Ctrl+U)"
              className="h-7 w-7 p-0"
              onClick={() => executarComandoFormato('underline')}
            >
              <Underline className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Grifo / Destaque Amarelo"
              className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-50"
              onClick={inserirGrifo}
            >
              <Highlighter className="w-3.5 h-3.5" />
            </Button>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            {/* Tabulação / Recuo */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Recuo para Esquerda"
              className="h-7 w-7 p-0"
              onClick={() => executarComandoFormato('outdent')}
            >
              <Outdent className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Aumentar Recuo / Tabulação"
              className="h-7 w-7 p-0"
              onClick={() => executarComandoFormato('indent')}
            >
              <Indent className="w-3.5 h-3.5" />
            </Button>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            {/* Listas: Numerada e com Pontos */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Lista Numerada"
              className="h-7 w-7 p-0"
              onClick={() => executarComandoFormato('insertOrderedList')}
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Lista com Marcadores / Pontos"
              className="h-7 w-7 p-0"
              onClick={() => executarComandoFormato('insertUnorderedList')}
            >
              <List className="w-3.5 h-3.5" />
            </Button>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            {/* Hyperlink */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Inserir Hyperlink Seguro"
              className="h-7 w-7 p-0 text-blue-700"
              onClick={inserirLinkSeguro}
            >
              <Link className="w-3.5 h-3.5" />
            </Button>

            {/* Tabelas e Checklists */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Inserir Tabela Estruturada"
              className="h-7 w-7 p-0 text-slate-700"
              onClick={inserirTabela}
            >
              <Table className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Inserir Checklist Clínico"
              className="h-7 w-7 p-0 text-emerald-700"
              onClick={inserirChecklist}
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </Button>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            {/* Campos Estruturados (Box / Lista / Flutuante) */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Campo Box (Caixa Destacada)"
              className="h-7 px-2 text-[11px] gap-1 text-slate-700 bg-slate-50 border border-slate-200"
              onClick={() => inserirCampoBox()}
            >
              <Box className="w-3 h-3 text-sky-700" />
              <span>Box</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Campo Lista Estruturada"
              className="h-7 px-2 text-[11px] gap-1 text-slate-700 bg-slate-50 border border-slate-200"
              onClick={inserirCampoLista}
            >
              <Layers className="w-3 h-3 text-indigo-700" />
              <span>Lista</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Campo Flutuante (Nota de Rodapé/Técnica)"
              className="h-7 px-2 text-[11px] gap-1 text-slate-700 bg-slate-50 border border-slate-200"
              onClick={inserirCampoFlutuante}
            >
              <SplitSquareVertical className="w-3 h-3 text-amber-700" />
              <span>Flutuante</span>
            </Button>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            {/* Quebra de Página */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Inserir Linha de Quebra de Página A4"
              className="h-7 px-2 text-[11px] gap-1 text-slate-700 bg-slate-50 border border-slate-200"
              onClick={inserirQuebraPagina}
            >
              <FileText className="w-3 h-3 text-slate-600" />
              <span>Quebra Página</span>
            </Button>

            {/* Imagem Interna Anexada (Coleção ris_imagens_anexas) */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Anexo de Imagem Interna Protegida"
              className="h-7 px-2 text-[11px] gap-1 text-slate-700 bg-slate-50 border border-slate-200"
              onClick={() => setModalImagensAberto(true)}
            >
              <ImageIcon className="w-3 h-3 text-purple-700" />
              <span>Imagem Anexa ({imagensAnexasInternas.length})</span>
            </Button>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            {/* Estilo e Tamanho de Fonte */}
            <div className="flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={estiloFonte}
                onChange={(e) => setEstiloFonte(e.target.value as 'sans' | 'serif' | 'mono')}
                className="h-7 text-[11px] border border-slate-200 rounded px-1.5 bg-white text-slate-800"
                title="Estilo da Fonte"
              >
                <option value="sans">Sans (Arial / Inter)</option>
                <option value="serif">Serif (Times / Garamond)</option>
                <option value="mono">Mono (Courier Clínico)</option>
              </select>

              <select
                value={tamanhoFonte}
                onChange={(e) => setTamanhoFonte(e.target.value as 'pequena' | 'normal' | 'grande')}
                className="h-7 text-[11px] border border-slate-200 rounded px-1.5 bg-white text-slate-800"
                title="Tamanho da Fonte"
              >
                <option value="pequena">Pequena (11px)</option>
                <option value="normal">Normal (13px)</option>
                <option value="grande">Grande (15px)</option>
              </select>
            </div>

            {/* Cores de Texto e Caixa */}
            <div className="flex items-center gap-1 ml-auto">
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={corTextoAtiva}
                onChange={(e) => {
                  setCorTextoAtiva(e.target.value)
                  executarComandoFormato('foreColor', e.target.value)
                }}
                className="h-7 text-[11px] border border-slate-200 rounded px-1.5 bg-white text-slate-800"
                title="Cor do Texto"
              >
                {CORES_TEXTO_SEGURAS.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.rotulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* FOLHA DE EDIÇÃO EM FORMATO A4 COM SIMULAÇÃO VISUAL DE IMPRESSÃO */}
          {/* ==================================================================== */}
          <div className="flex-1 min-h-[360px] bg-white border border-slate-300 rounded shadow-md p-8 overflow-y-auto max-w-4xl mx-auto w-full">
            {/* Cabeçalho Visual da Folha A4 */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Sistema Único de Saúde • Prefeitura Municipal de Mirante da Serra
              </div>
              <h2 className="text-sm font-black uppercase text-slate-900 tracking-tight">
                Serviço de Radiodiagnóstico e Imagem (RIS) • Hospital Municipal
              </h2>
              <div className="text-[11px] text-slate-600 font-mono">
                Laudo Diagnóstico • Modalidade: {exame.modalidade_ris.toUpperCase()} • Exame:{' '}
                {exame.tipo_exame}
              </div>
            </div>

            {/* Dados do Paciente em Cabeçalho A4 */}
            <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded text-xs mb-4">
              <div>
                <span className="text-slate-500">Paciente:</span>{' '}
                <strong className="text-slate-900 uppercase">
                  {exame.paciente_nome || 'Não informado'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Solicitante:</span>{' '}
                <strong className="text-slate-800">
                  {exame.solicitante_nome || 'Dr(a). Clínico Geral'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Data Solicitação:</span>{' '}
                <span className="font-mono">{exame.data_solicitacao || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500">Data Realização:</span>{' '}
                <span className="font-mono">
                  {exame.data_realizacao || exame.data_solicitacao || '—'}
                </span>
              </div>
            </div>

            {/* ÁREA EDITÁVEL FORMATADA COM CONTENT-EDITABLE */}
            <div
              ref={editorRef}
              contentEditable={!laudoJaLiberado || modalConfirmarRetificacaoAberto}
              onInput={handleEditorInput}
              dangerouslySetInnerHTML={{ __html: conteudoHtml }}
              className={`min-h-[280px] p-3 border border-slate-200 rounded focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed ${
                estiloFonte === 'serif'
                  ? 'font-serif'
                  : estiloFonte === 'mono'
                    ? 'font-mono'
                    : 'font-sans'
              } ${
                tamanhoFonte === 'pequena'
                  ? 'text-xs'
                  : tamanhoFonte === 'grande'
                    ? 'text-sm'
                    : 'text-[13px]'
              }`}
              style={{ color: corTextoAtiva }}
              placeholder="Digite o laudo descritivo completo ou aplique um modelo pré-definido acima..."
            />

            {/* Rodapé da Folha com Identificação Profissional */}
            <div className="mt-8 pt-4 border-t border-slate-300 text-xs flex flex-wrap items-center justify-between text-slate-600">
              <div>
                <span>Médico Responsável: </span>
                <strong className="text-slate-900">
                  {exame.responsavel_laudo_nome || user?.name || 'Médico Radiologista'}
                </strong>
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Homologação e Liberação Assistencial • Não constitui certificado ICP-Brasil
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* RODAPÉ DE AÇÕES (RASCUNHO / PRÉVIA / PUBLICAÇÃO / RETIFICAÇÃO) */}
        {/* ==================================================================== */}
        <DialogFooter className="p-3 bg-white border-t border-slate-200 shrink-0 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGerarPrevia}
              disabled={gerandoPrevia || carregandoInicial}
              className="text-xs h-8 border-sky-300 text-sky-800 hover:bg-sky-50"
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              {gerandoPrevia ? 'Carregando Prévia...' : 'Visualização Prévia (A4)'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleImprimirLaudo}
              className="text-xs h-8 text-slate-700"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Imprimir
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {!laudoJaLiberado ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSalvarRascunho}
                  disabled={salvandoRascunho || carregandoInicial}
                  className="text-xs h-8 border-slate-300 text-slate-800"
                >
                  <Save className="w-3.5 h-3.5 mr-1 text-slate-600" />
                  {salvandoRascunho ? 'Salvando...' : 'Salvar Rascunho'}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handlePublicarLaudo}
                  disabled={publicandoLaudo || salvandoRascunho || carregandoInicial}
                  className="text-xs h-8 bg-emerald-700 hover:bg-emerald-600 text-white font-bold"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  {publicandoLaudo ? 'Publicando...' : 'Publicar Laudo (Versão 1)'}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setModalConfirmarRetificacaoAberto(true)}
                disabled={retificandoLaudo}
                className="text-xs h-8 bg-amber-700 hover:bg-amber-600 text-white font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Retificar Laudo (Nova Versão Relacionada)
              </Button>
            )}
          </div>
        </DialogFooter>

        {/* ==================================================================== */}
        {/* MODAL SECUNDÁRIO 1: CONFLITO DE CONCORRÊNCIA (HTTP 409) */}
        {/* ==================================================================== */}
        <Dialog open={conflito409Aberto} onOpenChange={setConflito409Aberto}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Conflito de Concorrência de Edição (HTTP 409)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600">
                O rascunho deste laudo foi modificado no servidor por outro profissional durante a
                sua edição.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 text-xs py-2 bg-red-50 p-3 rounded border border-red-200 text-red-900">
              <p>
                <strong>Seu texto digitado foi preservado integralmente na tela</strong> e nenhuma
                perda de dados ocorreu.
              </p>
              <div className="text-[11px] font-mono">
                <div>Versão no servidor: {dadosConflito?.versaoServidor || 'N/A'}</div>
                <div>Versão esperada do seu rascunho: {dadosConflito?.versaoCliente || 'N/A'}</div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConflito409Aberto(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleResolverConflitoManterTexto}
                className="text-xs bg-red-700 hover:bg-red-600 text-white"
              >
                Sincronizar Versão e Manter Meu Texto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================================================================== */}
        {/* MODAL SECUNDÁRIO 2: ANEXO DE IMAGEM INTERNA DA COLEÇÃO ris_imagens_anexas */}
        {/* ==================================================================== */}
        <Dialog open={modalImagensAberto} onOpenChange={setModalImagensAberto}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-700" />
                Imagens Anexas Internas (Coleção ris_imagens_anexas)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Somente arquivos internos do exame são permitidos. URLs externas ou scripts são
                bloqueados pelo sanitizador de segurança.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {imagensAnexasInternas.length === 0 ? (
                <div className="p-4 text-center bg-slate-50 border border-slate-200 rounded text-slate-500">
                  Nenhuma imagem interna vinculada na coleção deste exame. Você pode realizar o
                  upload técnico ou anexar arquivos no prontuário.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {imagensAnexasInternas.map((img) => (
                    <div
                      key={img.id}
                      className="p-2 border border-slate-200 rounded bg-white flex items-center justify-between gap-2 hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-slate-800">
                          {img.legenda || img.arquivo}
                        </strong>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ID: {img.id} • Ordem: {img.ordem || 1} • {img.mime_type || 'image/png'}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => inserirImagemInterna(img)}
                        className="text-xs h-7 bg-purple-700 hover:bg-purple-600 text-white"
                      >
                        Inserir no Laudo
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalImagensAberto(false)}
                className="text-xs"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================================================================== */}
        {/* MODAL SECUNDÁRIO 3: EXPLICAÇÃO DA INTERPRETAÇÃO DOS CAMPOS */}
        {/* ==================================================================== */}
        <Dialog open={modalAjudaCamposAberto} onOpenChange={setModalAjudaCamposAberto}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-700" />
                Interpretação dos Recursos do Item 7.4.3.4.b.i
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Padrão técnico adotado para os tipos de campos exigidos na especificação:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2.5 text-xs py-2 text-slate-700">
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <strong className="text-slate-900 block text-[11px]">1. Campo Tipo 'Box':</strong>
                <span>
                  Caixa de texto delimitada com cores de fundo e borda parametrizáveis. Utilizada
                  para destacar achados críticos, nódulos com dimensões ou conclusões essenciais que
                  exigem atenção imediata.
                </span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <strong className="text-slate-900 block text-[11px]">2. Campo Tipo 'Lista':</strong>
                <span>
                  Estrutura com borda de destaque lateral contendo rol pré-definido de tópicos
                  clínicos e parâmetros avaliados (ex.: biometria, mensuração de cavidades, órgãos
                  examinados).
                </span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <strong className="text-slate-900 block text-[11px]">
                  3. Campo Tipo 'Flutuante':
                </strong>
                <span>
                  Nota ou chamada em destaque para especificação de técnica do aparelho, protocolo
                  de corte, contraste ou observação clínica suplementar.
                </span>
              </div>
              <div className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-900 text-[11px]">
                <strong>Nota de Escopo:</strong> Conforme determinação explícita do caderno, a
                ferramenta de anotação/desenho gráfico vetorial sobre imagens radiológicas está
                excluída e assinalada como parcial na matriz de conformidade.
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                size="sm"
                onClick={() => setModalAjudaCamposAberto(false)}
                className="text-xs"
              >
                Entendido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================================================================== */}
        {/* MODAL SECUNDÁRIO 4: CONFIRMAÇÃO DE RETIFICAÇÃO COM JUSTIFICATIVA */}
        {/* ==================================================================== */}
        <Dialog
          open={modalConfirmarRetificacaoAberto}
          onOpenChange={setModalConfirmarRetificacaoAberto}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-700" />
                Retificação Formal de Laudo Emitido
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                A retificação criará uma nova versão imutável (V{(exame.versao_atual || 1) + 1}),
                preservando todas as versões anteriores sem alteração.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Justificativa Clínica da Retificação * (Mínimo 5 caracteres)
                </label>
                <Input
                  value={motivoRetificacao}
                  onChange={(e) => setMotivoRetificacao(e.target.value)}
                  placeholder="Ex: Correção de lateralidade no segmento apical direito conforme revisão..."
                  className="text-xs"
                  required
                />
              </div>

              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-950">
                O autor autêntico da sessão e o timestamp oficial serão gravados na trilha de
                auditoria.
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalConfirmarRetificacaoAberto(false)}
                className="text-xs"
              >
                Voltar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmarRetificacao}
                disabled={retificandoLaudo || motivoRetificacao.trim().length < 5}
                className="text-xs bg-amber-700 hover:bg-amber-600 text-white font-bold"
              >
                {retificandoLaudo ? 'Emitindo Retificação...' : 'Confirmar Retificação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================================================================== */}
        {/* MODAL SECUNDÁRIO 5: VISUALIZAÇÃO PRÉVIA SEGURA (SNAPSHOT A4 MUNICIPAL) */}
        {/* ==================================================================== */}
        <Dialog open={modalPreviaAberto} onOpenChange={setModalPreviaAberto}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-sky-700" />
                Prévia Oficial do Laudo com Layout Municipal (7.4.3.4.b.ii–iii)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Visualização formatada e snapshot municipal sanitizado com dados protegidos.
              </DialogDescription>
            </DialogHeader>

            {dadosPrevia && (
              <div className="p-6 bg-white border border-slate-300 rounded shadow-sm text-xs space-y-4 print:p-0 print:border-none">
                {/* Cabeçalho Oficial */}
                <div className="border-b-2 border-slate-900 pb-3 text-center space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    {dadosPrevia.previa.unidade_nome} • {dadosPrevia.previa.municipio_uf}
                  </div>
                  <h3 className="text-base font-black uppercase text-slate-900">
                    LAUDO DE DIAGNÓSTICO POR IMAGEM
                  </h3>
                  <div className="font-mono text-[11px] text-slate-600">
                    Tipo de Conteúdo:{' '}
                    <strong className="uppercase">{dadosPrevia.previa.tipo_conteudo}</strong> •
                    Versão Vigente: V{dadosPrevia.exame.versao_vigente}
                  </div>
                </div>

                {/* Dados do Paciente e Exame */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded">
                  <div>
                    <span className="text-slate-500">Paciente:</span>{' '}
                    <strong className="text-slate-900 uppercase">
                      {dadosPrevia.paciente.nome}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">CPF / CNS:</span>{' '}
                    <span className="font-mono text-slate-800">
                      {dadosPrevia.paciente.cpf_mascarado ||
                        dadosPrevia.paciente.cns_mascarado ||
                        '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Procedimento:</span>{' '}
                    <strong className="text-slate-900">{dadosPrevia.exame.tipo_exame}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Modalidade:</span>{' '}
                    <span className="uppercase font-semibold">
                      {dadosPrevia.exame.modalidade_ris}
                    </span>
                  </div>
                </div>

                {/* Sumário do Resultado */}
                {dadosPrevia.exame.resultado_sumario && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-950 font-semibold">
                    <span className="block text-[10px] uppercase tracking-wide text-emerald-700">
                      Sumário Conclusivo:
                    </span>
                    {dadosPrevia.exame.resultado_sumario}
                  </div>
                )}

                {/* Conteúdo Formatado Sanitizado */}
                <div
                  className="p-4 border border-slate-200 rounded leading-relaxed min-h-[160px]"
                  dangerouslySetInnerHTML={{
                    __html: dadosPrevia.previa.conteudo_formatado_sanitizado,
                  }}
                />

                {/* Histórico de Versões */}
                {dadosPrevia.previa.historico_versoes.length > 0 && (
                  <div className="p-2 bg-slate-50 rounded border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                      <History className="w-3 h-3" />
                      Histórico Auditável de Versões e Retificações:
                    </span>
                    <ul className="text-[11px] space-y-1 font-mono text-slate-700">
                      {dadosPrevia.previa.historico_versoes.map((v) => (
                        <li key={v.id}>
                          • Versão {v.numero_versao} emitido em {v.data_laudo} por{' '}
                          {v.responsavel_laudo_nome}
                          {v.motivo_retificacao && ` — Motivo: ${v.motivo_retificacao}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Rodapé e Aviso Legal */}
                <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-500 font-mono text-center">
                  {dadosPrevia.previa.aviso_legal}
                </div>
              </div>
            )}

            <DialogFooter className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleImprimirLaudo}
                className="text-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Imprimir Prévia
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setModalPreviaAberto(false)}
                className="text-xs"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
export default EditorFormatadoRIS
