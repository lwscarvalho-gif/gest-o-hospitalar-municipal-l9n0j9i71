import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  CanalGrupoMensageria,
  EnviarMensagemParams,
  MensagemInterna,
  TipoDestinatarioMensagem,
  UsuarioDiretorioFuncional,
} from '@/types/hospital'
import {
  atualizarGrupoMensageria,
  criarGrupoMensageria,
  enviarMensagemInterna,
  gerarChaveIdempotenciaMensagem,
  inativarGrupoMensageria,
  listarDiretorioUsuariosPaginado,
  listarGruposMensageria,
  listarMensagensInternas,
  marcarMensagemComoLida,
  reativarGrupoMensageria,
  sanitizarTextoMensagem,
} from '@/services/mensageria'
import { formatarDataHoraFuso } from '@/services/dataFusoUnidade'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Inbox,
  Send,
  PlusCircle,
  RefreshCw,
  Search,
  CheckCheck,
  Clock,
  Users,
  User,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  FileWarning,
  Eye,
  Mail,
  MailCheck,
  FolderCog,
  Check,
  X,
  UserPlus,
  UserMinus,
  Edit2,
  PowerOff,
  Power,
} from 'lucide-react'

/**
 * Função utilitária para renderização de texto puro com tags inertes.
 * Garante que nenhuma string seja interpretada via innerHTML, mantendo
 * tags literais visíveis sem qualquer execução de script ou renderização rica.
 */
export function formatarTextoSeguroMensagem(texto: unknown): string {
  if (texto === null || texto === undefined) return ''
  return String(texto)
}

interface MensageriaInternaViewProps {
  onNaoLidasChange?: (total: number) => void
}

export const MensageriaInternaView: React.FC<MensageriaInternaViewProps> = ({
  onNaoLidasChange,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  // Caixa ativa: 'entrada' ou 'enviadas'
  const [caixaAtiva, setCaixaAtiva] = useState<'entrada' | 'enviadas'>('entrada')
  const [somenteNaoLidas, setSomenteNaoLidas] = useState<boolean>(false)
  const [buscaTexto, setBuscaTexto] = useState<string>('')
  const [buscaDebounced, setBuscaDebounced] = useState<string>('')

  // Paginação
  const [pagina, setPagina] = useState<number>(1)
  const [porPagina] = useState<number>(15)
  const [totalPaginas, setTotalPaginas] = useState<number>(1)
  const [totalItens, setTotalItens] = useState<number>(0)
  const [totalNaoLidasCaixa, setTotalNaoLidasCaixa] = useState<number>(0)

  // Lista de mensagens
  const [mensagens, setMensagens] = useState<MensagemInterna[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null)

  // Mensagem selecionada para visualização/leitura
  const [mensagemAtiva, setMensagemAtiva] = useState<MensagemInterna | null>(null)
  const [processandoLeitura, setProcessandoLeitura] = useState<boolean>(false)

  // Modal de Composição / Nova Mensagem
  const [modalComporAberto, setModalComporAberto] = useState<boolean>(false)
  const [tipoDestinatario, setTipoDestinatario] = useState<TipoDestinatarioMensagem>('usuario')
  const [destinatarioUsuarioId, setDestinatarioUsuarioId] = useState<string>('')
  const [destinatarioGrupoId, setDestinatarioGrupoId] = useState<string>('')
  const [assuntoForm, setAssuntoForm] = useState<string>('')
  const [conteudoForm, setConteudoForm] = useState<string>('')
  const [enviando, setEnviando] = useState<boolean>(false)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [avisoReenvio, setAvisoReenvio] = useState<string | null>(null)

  // Chave de idempotência persistente no formulário (mantém-se durante retries)
  const [idempotencyKeyAtual, setIdempotencyKeyAtual] = useState<string>('')

  // Diretório de usuários funcionais e grupos
  const [diretorioUsuarios, setDiretorioUsuarios] = useState<UsuarioDiretorioFuncional[]>([])
  const [gruposMensageria, setGruposMensageria] = useState<CanalGrupoMensageria[]>([])
  const [carregandoDiretorio, setCarregandoDiretorio] = useState<boolean>(false)

  // Estado da Gestão de Grupos & Membros (apenas gestor / admin)
  const [modalGruposAberto, setModalGruposAberto] = useState<boolean>(false)
  const [gruposAdmin, setGruposAdmin] = useState<CanalGrupoMensageria[]>([])
  const [carregandoGruposAdmin, setCarregandoGruposAdmin] = useState<boolean>(false)
  const [grupoEmEdicao, setGrupoEmEdicao] = useState<CanalGrupoMensageria | null>(null)
  const [modoCriarGrupo, setModoCriarGrupo] = useState<boolean>(false)

  // Formulário de Grupo
  const [formGrupoNome, setFormGrupoNome] = useState<string>('')
  const [formGrupoSigla, setFormGrupoSigla] = useState<string>('')
  const [formGrupoDescricao, setFormGrupoDescricao] = useState<string>('')
  const [formGrupoMembros, setFormGrupoMembros] = useState<string[]>([])
  const [salvandoGrupo, setSalvandoGrupo] = useState<boolean>(false)
  const [erroGrupo, setErroGrupo] = useState<string | null>(null)

  // Diretório Paginado para Adição/Seleção de Membros
  const [diretorioPaginado, setDiretorioPaginado] = useState<UsuarioDiretorioFuncional[]>([])
  const [pagDiretorio, setPagDiretorio] = useState<number>(1)
  const [totalPagDiretorio, setTotalPagDiretorio] = useState<number>(1)
  const [totalItensDiretorio, setTotalItensDiretorio] = useState<number>(0)
  const [buscaDiretorioTexto, setBuscaDiretorioTexto] = useState<string>('')
  const [carregandoMembrosDiretorio, setCarregandoMembrosDiretorio] = useState<boolean>(false)

  // Permissão de gestão: admin, gestor ou criador do grupo
  const ehGestorOuAdmin = user?.role === 'admin' || user?.role === 'gestor'

  // Ref sequencial para descarte de respostas assíncronas obsoletas em voo
  const seqCargaRef = useRef<number>(0)
  // Ref para rastrear o ID do usuário da sessão atual e descartar se houver troca de perfil
  const usuarioSessaoRef = useRef<string | undefined>(user?.id)

  // Debounce da busca
  useEffect(() => {
    const handler = setTimeout(() => {
      setBuscaDebounced(buscaTexto.trim())
      setPagina(1)
    }, 350)
    return () => clearTimeout(handler)
  }, [buscaTexto])

  // Monitorar troca de usuário/perfil: limpar imediatamente caixas e conversa
  useEffect(() => {
    if (usuarioSessaoRef.current !== user?.id) {
      usuarioSessaoRef.current = user?.id
      seqCargaRef.current += 1 // Invalida qualquer resposta em voo
      setMensagens([])
      setMensagemAtiva(null)
      setTotalItens(0)
      setTotalPaginas(1)
      setTotalNaoLidasCaixa(0)
      setErroCarregamento(null)
      setPagina(1)
      if (onNaoLidasChange) onNaoLidasChange(0)
    }
  }, [user?.id, onNaoLidasChange])

  // Carga das mensagens com cancelamento de voo
  const carregarMensagens = useCallback(async () => {
    if (!user?.id) {
      setMensagens([])
      setTotalItens(0)
      setTotalPaginas(1)
      setTotalNaoLidasCaixa(0)
      return
    }

    seqCargaRef.current += 1
    const seqMomento = seqCargaRef.current
    const userSessaoMomento = user.id

    setLoading(true)
    setErroCarregamento(null)

    try {
      const res = await listarMensagensInternas({
        tipo_caixa: caixaAtiva,
        somente_nao_lidas: caixaAtiva === 'entrada' ? somenteNaoLidas : false,
        pagina,
        por_pagina: porPagina,
        busca: buscaDebounced || undefined,
      })

      // Se outra requisição foi iniciada ou o usuário mudou, descarta resposta em voo
      if (seqMomento !== seqCargaRef.current || userSessaoMomento !== usuarioSessaoRef.current) {
        return
      }

      setMensagens(res.items)
      setTotalItens(res.totalItems)
      setTotalPaginas(res.totalPages || 1)
      const naoLidas = res.totalNaoLidas ?? 0
      setTotalNaoLidasCaixa(naoLidas)
      if (onNaoLidasChange) {
        onNaoLidasChange(naoLidas)
      }

      // Se a mensagem ativa estiver aberta mas já não fizer parte da lista ou foi atualizada
      if (mensagemAtiva) {
        const atualizada = res.items.find((m) => m.id === mensagemAtiva.id)
        if (atualizada) {
          setMensagemAtiva(atualizada)
        }
      }
    } catch (err: any) {
      if (seqMomento !== seqCargaRef.current || userSessaoMomento !== usuarioSessaoRef.current) {
        return
      }
      const msg = err?.message || 'Falha ao carregar mensagens internas.'
      setErroCarregamento(msg)
      toast({
        title: 'Erro na Mensageria',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      if (seqMomento === seqCargaRef.current && userSessaoMomento === usuarioSessaoRef.current) {
        setLoading(false)
      }
    }
  }, [
    user?.id,
    caixaAtiva,
    somenteNaoLidas,
    pagina,
    porPagina,
    buscaDebounced,
    mensagemAtiva,
    onNaoLidasChange,
    toast,
  ])

  useEffect(() => {
    carregarMensagens()
  }, [carregarMensagens])

  // Carga do diretório e grupos ao abrir modal de composição
  const carregarDiretorioEGrupos = async () => {
    setCarregandoDiretorio(true)
    try {
      const [resUsers, grupos] = await Promise.all([
        listarDiretorioUsuariosPaginado({ pagina: 1, por_pagina: 100 }),
        listarGruposMensageria(true),
      ])
      // Filtrar o próprio usuário da lista individual para evitar confusão (ou deixar claro)
      setDiretorioUsuarios(resUsers.items.filter((u) => u.id !== user?.id))
      setGruposMensageria(grupos)
    } catch (err: any) {
      toast({
        title: 'Aviso de Diretório',
        description: 'Não foi possível carregar a lista completa de destinatários.',
        variant: 'destructive',
      })
    } finally {
      setCarregandoDiretorio(false)
    }
  }

  // Carga de grupos para painel de administração (inclui inativos para reativação)
  const carregarGruposAdmin = useCallback(async () => {
    setCarregandoGruposAdmin(true)
    try {
      const lista = await listarGruposMensageria(false)
      setGruposAdmin(lista)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar grupos',
        description: err?.message || 'Falha ao buscar grupos de mensageria.',
        variant: 'destructive',
      })
    } finally {
      setCarregandoGruposAdmin(false)
    }
  }, [toast])

  // Carga do diretório paginado para seleção de membros
  const carregarDiretorioPaginado = useCallback(
    async (paginaAlvo = 1, termoBusca = '') => {
      setCarregandoMembrosDiretorio(true)
      try {
        const res = await listarDiretorioUsuariosPaginado({
          pagina: paginaAlvo,
          por_pagina: 8,
          busca: termoBusca || undefined,
        })
        setDiretorioPaginado(res.items)
        setPagDiretorio(res.page)
        setTotalPagDiretorio(res.totalPages || 1)
        setTotalItensDiretorio(res.totalItems)
      } catch (err: any) {
        toast({
          title: 'Erro no diretório',
          description: 'Não foi possível carregar profissionais do diretório.',
          variant: 'destructive',
        })
      } finally {
        setCarregandoMembrosDiretorio(false)
      }
    },
    [toast],
  )

  const abrirModalGrupos = () => {
    setModalGruposAberto(true)
    setGrupoEmEdicao(null)
    setModoCriarGrupo(false)
    setErroGrupo(null)
    carregarGruposAdmin()
    carregarDiretorioPaginado(1, '')
  }

  const iniciarCriarGrupo = () => {
    setModoCriarGrupo(true)
    setGrupoEmEdicao(null)
    setFormGrupoNome('')
    setFormGrupoSigla('')
    setFormGrupoDescricao('')
    setFormGrupoMembros(user?.id ? [user.id] : [])
    setErroGrupo(null)
    setBuscaDiretorioTexto('')
    carregarDiretorioPaginado(1, '')
  }

  const iniciarEditarGrupo = (grupo: CanalGrupoMensageria) => {
    setModoCriarGrupo(false)
    setGrupoEmEdicao(grupo)
    setFormGrupoNome(grupo.nome)
    setFormGrupoSigla(grupo.sigla || '')
    setFormGrupoDescricao(grupo.descricao || '')
    setFormGrupoMembros(Array.isArray(grupo.membros) ? [...grupo.membros] : [])
    setErroGrupo(null)
    setBuscaDiretorioTexto('')
    carregarDiretorioPaginado(1, '')
  }

  const alternarMembroGrupo = (userId: string) => {
    setFormGrupoMembros((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId)
      }
      return [...prev, userId]
    })
  }

  const handleSalvarGrupo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (salvandoGrupo) return

    const nomeLimpo = formGrupoNome.trim()
    if (!nomeLimpo || nomeLimpo.length < 2) {
      setErroGrupo('O nome do grupo é obrigatório e deve ter no mínimo 2 caracteres.')
      return
    }

    setSalvandoGrupo(true)
    setErroGrupo(null)

    try {
      if (modoCriarGrupo) {
        await criarGrupoMensageria({
          nome: nomeLimpo,
          sigla: formGrupoSigla.trim() || undefined,
          descricao: formGrupoDescricao.trim() || undefined,
          membros: formGrupoMembros,
        })
        toast({
          title: 'Grupo Criado',
          description: `O grupo "${nomeLimpo}" foi registrado com sucesso no servidor.`,
        })
      } else if (grupoEmEdicao) {
        await atualizarGrupoMensageria({
          id: grupoEmEdicao.id,
          nome: nomeLimpo,
          sigla: formGrupoSigla.trim() || undefined,
          descricao: formGrupoDescricao.trim() || undefined,
          membros: formGrupoMembros,
        })
        toast({
          title: 'Grupo Atualizado',
          description: `As alterações do grupo "${nomeLimpo}" foram salvas.`,
        })
      }

      setModoCriarGrupo(false)
      setGrupoEmEdicao(null)
      carregarGruposAdmin()
      // Atualiza também grupos disponíveis na composição de envio
      listarGruposMensageria(true)
        .then(setGruposMensageria)
        .catch(() => {})
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Falha ao salvar grupo.'
      setErroGrupo(msg)
      toast({
        title: 'Erro ao Salvar Grupo',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSalvandoGrupo(false)
    }
  }

  const handleAlternarStatusAtivo = async (grupo: CanalGrupoMensageria) => {
    try {
      if (grupo.ativo) {
        await inativarGrupoMensageria(grupo.id)
        toast({
          title: 'Grupo Inativado',
          description: `O grupo "${grupo.nome}" foi inativado. Novos envios estão bloqueados. Histórico preservado.`,
        })
      } else {
        await reativarGrupoMensageria(grupo.id)
        toast({
          title: 'Grupo Reativado',
          description: `O grupo "${grupo.nome}" voltou a aceitar envios de mensagens.`,
        })
      }
      carregarGruposAdmin()
      listarGruposMensageria(true)
        .then(setGruposMensageria)
        .catch(() => {})
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar status',
        description: err?.message || 'Falha ao inativar/reativar grupo.',
        variant: 'destructive',
      })
    }
  }

  const abrirModalCompor = (respostaPara?: MensagemInterna) => {
    setErroEnvio(null)
    setAvisoReenvio(null)
    // Inicializa uma nova chave de idempotência para este envio
    setIdempotencyKeyAtual(gerarChaveIdempotenciaMensagem())

    if (respostaPara) {
      setTipoDestinatario('usuario')
      setDestinatarioUsuarioId(respostaPara.remetente)
      setDestinatarioGrupoId('')
      setAssuntoForm(
        respostaPara.assunto.startsWith('Re: ')
          ? respostaPara.assunto
          : `Re: ${respostaPara.assunto}`,
      )
      setConteudoForm('')
    } else {
      setTipoDestinatario('usuario')
      setDestinatarioUsuarioId('')
      setDestinatarioGrupoId('')
      setAssuntoForm('')
      setConteudoForm('')
    }

    setModalComporAberto(true)
    carregarDiretorioEGrupos()
  }

  // Envio de Mensagem com Botão Travado (Anti-duplo clique) e Retentativa com Mesma Chave
  const handleEnviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (enviando) return // Trava dupla estrita

    const assuntoSanitizado = sanitizarTextoMensagem(assuntoForm)
    const conteudoSanitizado = sanitizarTextoMensagem(conteudoForm)

    if (!assuntoSanitizado) {
      setErroEnvio('Informe o assunto da mensagem (máx. 160 caracteres).')
      return
    }
    if (!conteudoSanitizado) {
      setErroEnvio('Informe o texto da mensagem (máx. 4000 caracteres).')
      return
    }

    if (tipoDestinatario === 'usuario' && !destinatarioUsuarioId) {
      setErroEnvio('Selecione um profissional destinatário no diretório.')
      return
    }
    if (tipoDestinatario === 'grupo' && !destinatarioGrupoId) {
      setErroEnvio('Selecione um grupo funcional destinatário.')
      return
    }

    setEnviando(true)
    setErroEnvio(null)
    setAvisoReenvio(null)

    // Reutiliza a chave de idempotência atual para proteger contra retentativas de falha de rede
    const chaveEnvio = idempotencyKeyAtual || gerarChaveIdempotenciaMensagem()
    if (!idempotencyKeyAtual) {
      setIdempotencyKeyAtual(chaveEnvio)
    }

    const params: EnviarMensagemParams = {
      tipo_destinatario: tipoDestinatario,
      destinatario_usuario: tipoDestinatario === 'usuario' ? destinatarioUsuarioId : undefined,
      destinatario_grupo: tipoDestinatario === 'grupo' ? destinatarioGrupoId : undefined,
      assunto: assuntoSanitizado,
      conteudo: conteudoSanitizado,
      idempotency_key: chaveEnvio,
    }

    try {
      const res = await enviarMensagemInterna(params)

      if (res.reutilizadoIdempotente) {
        toast({
          title: 'Mensagem já Processada',
          description:
            'A mensagem já havia sido gravada anteriormente pelo servidor. Registro reaproveitado com sucesso.',
        })
      } else {
        toast({
          title: 'Mensagem Enviada',
          description: 'A comunicação interna foi protocolada com sucesso.',
        })
      }

      setModalComporAberto(false)
      // Limpa dados de composição
      setAssuntoForm('')
      setConteudoForm('')
      setIdempotencyKeyAtual('')

      // Se enviou com sucesso, recarrega
      if (caixaAtiva === 'enviadas') {
        carregarMensagens()
      } else {
        // Se estava na entrada, atualiza contadores e opcionalmente troca para enviadas
        carregarMensagens()
      }
    } catch (err: any) {
      const msgErro = err?.data?.message || err?.message || 'Falha ao transmitir mensagem.'

      if (msgErro.includes('IDEMPOTENCY_PAYLOAD_CONFLICT')) {
        // Conflito de payload: A mesma chave já foi usada com texto diferente.
        // O formulário NÃO perde o texto digitado e o usuário pode gerar nova chave ou reenviar.
        setErroEnvio(
          'Conflito de envio: foi detectado um envio anterior com a mesma chave e conteúdo divergente. Seu texto digitado foi preservado.',
        )
        setAvisoReenvio('Clique em "Tentar Novamente com Nova Chave" para forçar novo protocolo.')
      } else {
        // Falha de rede ou validação: mantém a MESMA chave de idempotência para o botão de retry
        setErroEnvio(`${msgErro} — Seu texto foi preservado para retentativa segura.`)
        setAvisoReenvio(
          'A mesma chave de envio será reutilizada na nova tentativa para evitar mensagens duplicadas.',
        )
      }
    } finally {
      setEnviando(false)
    }
  }

  // Ação de leitura ao clicar em uma mensagem da Caixa de Entrada
  const handleAbrirMensagem = async (msg: MensagemInterna) => {
    setMensagemAtiva(msg)

    // Se estiver na caixa de entrada e ainda não constar na lista de lida_por do usuário
    const usuarioId = user?.id
    const naoLidaPorMim = usuarioId && !msg.lida_por.includes(usuarioId)

    if (caixaAtiva === 'entrada' && naoLidaPorMim) {
      setProcessandoLeitura(true)
      try {
        const atualizada = await marcarMensagemComoLida(msg.id)
        setMensagemAtiva(atualizada)
        // Atualiza a mensagem na lista local
        setMensagens((prev) => prev.map((item) => (item.id === msg.id ? atualizada : item)))
        // Decrementa contador local de não lidas
        setTotalNaoLidasCaixa((qtd) => {
          const novo = Math.max(0, qtd - 1)
          if (onNaoLidasChange) onNaoLidasChange(novo)
          return novo
        })
      } catch (err) {
        // Falha silenciosa de marcação de leitura não impede visualização
      } finally {
        setProcessandoLeitura(false)
      }
    }
  }

  // Nome formatado de destinatários
  const formatarDestinatarios = (msg: MensagemInterna): string => {
    if (msg.tipo_destinatario === 'usuario') {
      const snap = msg.destinatarios_snapshot?.[0]
      if (snap) {
        return `${snap.nome}${snap.cargo ? ` (${snap.cargo})` : ''}`
      }
      return msg.expand?.destinatario_usuario?.name || 'Profissional'
    }
    // Tipo grupo
    const nomeGrupo =
      msg.expand?.destinatario_grupo?.nome ||
      (msg.destinatario_grupo ? `Grupo #${msg.destinatario_grupo.slice(-4)}` : 'Grupo Hospitalar')
    const totalMembros = msg.destinatarios_resolvidos_ids?.length || 0
    return `${nomeGrupo} (${totalMembros} destinatários)`
  }

  // Nome formatado do remetente
  const formatarRemetente = (msg: MensagemInterna): string => {
    if (msg.remetente_nome_snapshot) return msg.remetente_nome_snapshot
    if (msg.expand?.remetente?.name) return msg.expand.remetente.name
    return 'Usuário do Sistema'
  }

  const ehNaoLida = (msg: MensagemInterna): boolean => {
    if (!user?.id) return false
    return !msg.lida_por.includes(user.id)
  }

  return (
    <div className="space-y-6">
      {/* 1. CABEÇALHO DA MENSAGERIA E AVISO REGULATÓRIO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Mail className="w-6 h-6 text-blue-600" />
              Mensageria Interna Hospitalar
            </h1>
            <Badge variant="outline" className="border-blue-400 bg-blue-50 text-blue-800 text-xs">
              Comunicação Administrativa & Equipes
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Canal de recados e avisos restrito a operadores do sistema hospitalar (Mirante da Serra
            - RO).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => carregarMensagens()}
            variant="outline"
            size="sm"
            disabled={loading}
            className="flex items-center gap-1.5 text-slate-700"
            title="Atualizar mensagens"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          {/* Botão de Gestão de Grupos: visível para admin/gestor */}
          {ehGestorOuAdmin && (
            <Button
              onClick={abrirModalGrupos}
              variant="outline"
              size="sm"
              className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50 flex items-center gap-1.5"
              title="Gerenciar grupos, equipes e participantes"
            >
              <FolderCog className="w-4 h-4 text-slate-600" />
              <span>Gerenciar Grupos</span>
            </Button>
          )}

          <Button
            onClick={() => abrirModalCompor()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-sm shadow-blue-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            Nova Mensagem
          </Button>
        </div>
      </div>

      {/* 2. ALERTA OBRIGATÓRIO DE ESCOPO CLÍNICO */}
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2.5">
        <FileWarning className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="font-semibold">Aviso de Governança Clínica & Prontuário:</strong>
          <p>
            Mensagens internas <strong>NÃO</strong> substituem evolução médica, prescrição,
            solicitação formal de exames ou encaminhamentos oficiais. É expressamente vedado colar
            dados clínicos integrais de prontuário neste canal. Comunicações operam exclusivamente
            em texto puro sem renderização HTML.
          </p>
        </div>
      </div>

      {/* 3. BARRA DE NAVEGAÇÃO DE CAIXAS (ENTRADA / ENVIADAS) E FILTROS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setCaixaAtiva('entrada')
              setPagina(1)
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              caixaAtiva === 'entrada'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Caixa de Entrada</span>
            {totalNaoLidasCaixa > 0 && (
              <Badge className="bg-red-600 hover:bg-red-600 text-white text-[10px] px-1.5 py-0 h-4 min-w-[16px] flex items-center justify-center rounded-full">
                {totalNaoLidasCaixa}
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setCaixaAtiva('enviadas')
              setPagina(1)
              setSomenteNaoLidas(false)
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              caixaAtiva === 'enviadas'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Itens Enviados</span>
          </button>
        </div>

        {/* Busca e Filtro de Não Lidas */}
        <div className="flex flex-wrap items-center gap-2">
          {caixaAtiva === 'entrada' && (
            <Button
              type="button"
              variant={somenteNaoLidas ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSomenteNaoLidas(!somenteNaoLidas)
                setPagina(1)
              }}
              className={`text-xs h-9 ${
                somenteNaoLidas
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              <MailCheck className="w-3.5 h-3.5 mr-1.5" />
              Somente não lidas
            </Button>
          )}

          <div className="relative min-w-[220px] sm:min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              type="text"
              placeholder="Buscar por assunto ou conteúdo..."
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              className="pl-8 text-xs h-9 bg-white border-slate-300"
            />
          </div>
        </div>
      </div>

      {/* 4. ÁREA PRINCIPAL: LISTA DE MENSAGENS E LEITURA DETALHADA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Painel Esquerdo: Lista de Mensagens */}
        <div className={`space-y-3 ${mensagemAtiva ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  {caixaAtiva === 'entrada' ? (
                    <>
                      <Inbox className="w-4 h-4 text-blue-600" />
                      Recebidas
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-emerald-600" />
                      Enviadas
                    </>
                  )}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Total de {totalItens} {totalItens === 1 ? 'mensagem' : 'mensagens'}
                  {caixaAtiva === 'entrada' && totalNaoLidasCaixa > 0
                    ? ` • ${totalNaoLidasCaixa} não lida(s)`
                    : ''}
                </CardDescription>
              </div>

              {/* Controles de Paginação Superior */}
              {totalPaginas > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pagina <= 1 || loading}
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    className="h-7 w-7 text-slate-600"
                    title="Página anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-[11px] text-slate-600 px-1 font-mono">
                    {pagina}/{totalPaginas}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pagina >= totalPaginas || loading}
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    className="h-7 w-7 text-slate-600"
                    title="Próxima página"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {/* Estado de Carregamento */}
              {loading && mensagens.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="text-xs">Carregando mensagens da caixa...</span>
                </div>
              )}

              {/* Estado de Erro */}
              {!loading && erroCarregamento && (
                <div className="p-6 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-red-700 font-medium">{erroCarregamento}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => carregarMensagens()}
                    className="text-xs"
                  >
                    Tentar Novamente
                  </Button>
                </div>
              )}

              {/* Estado Vazio */}
              {!loading && !erroCarregamento && mensagens.length === 0 && (
                <div className="py-12 px-4 text-center space-y-2">
                  <Mail className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">
                    Nenhuma mensagem localizada
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {buscaDebounced
                      ? 'Nenhum resultado para a busca informada.'
                      : caixaAtiva === 'entrada'
                        ? 'Sua caixa de entrada hospitalar está vazia no momento.'
                        : 'Você ainda não enviou mensagens pelo sistema.'}
                  </p>
                </div>
              )}

              {/* Lista de Mensagens */}
              {!erroCarregamento && mensagens.length > 0 && (
                <ul className="divide-y divide-slate-100">
                  {mensagens.map((msg) => {
                    const naoLida = caixaAtiva === 'entrada' && ehNaoLida(msg)
                    const selecionada = mensagemAtiva?.id === msg.id

                    return (
                      <li key={msg.id}>
                        <button
                          type="button"
                          onClick={() => handleAbrirMensagem(msg)}
                          className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 hover:bg-slate-50 ${
                            selecionada
                              ? 'bg-blue-50/70 border-l-4 border-blue-600'
                              : naoLida
                                ? 'bg-slate-50 font-semibold'
                                : 'bg-white'
                          }`}
                        >
                          {/* Ícone de status não lida / lida */}
                          <div className="shrink-0 mt-0.5">
                            {caixaAtiva === 'entrada' ? (
                              naoLida ? (
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block shadow-sm shadow-blue-500/50" />
                              ) : (
                                <CheckCheck className="w-4 h-4 text-slate-400" />
                              )
                            ) : msg.tipo_destinatario === 'grupo' ? (
                              <Users className="w-4 h-4 text-slate-500" />
                            ) : (
                              <Send className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-xs truncate ${
                                  naoLida ? 'font-bold text-slate-900' : 'text-slate-700'
                                }`}
                              >
                                {caixaAtiva === 'entrada'
                                  ? formatarRemetente(msg)
                                  : formatarDestinatarios(msg)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                                {formatarDataHoraFuso(msg.created)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {msg.tipo_destinatario === 'grupo' && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1 py-0 h-4 bg-slate-200 text-slate-700 shrink-0 font-normal"
                                >
                                  Grupo
                                </Badge>
                              )}
                              <h3
                                className={`text-xs truncate ${
                                  naoLida ? 'font-bold text-blue-900' : 'font-medium text-slate-800'
                                }`}
                              >
                                {formatarTextoSeguroMensagem(msg.assunto)}
                              </h3>
                            </div>

                            {/* Trecho seguro de prévia (texto puro escapado pelo React) */}
                            <p className="text-[11px] text-slate-500 line-clamp-1 truncate font-normal">
                              {formatarTextoSeguroMensagem(msg.conteudo)}
                            </p>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>

            {/* Paginação Inferior */}
            {totalPaginas > 1 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Página {pagina} de {totalPaginas}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagina <= 1 || loading}
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    className="h-8 text-xs"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagina >= totalPaginas || loading}
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    className="h-8 text-xs"
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Painel Direito: Conversa / Visualização da Mensagem Ativa */}
        {mensagemAtiva && (
          <div className="lg:col-span-7 space-y-4">
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="py-4 px-5 bg-slate-50/80 border-b border-slate-200 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Assunto da Mensagem
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {formatarTextoSeguroMensagem(mensagemAtiva.assunto)}
                    </h2>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMensagemAtiva(null)}
                    className="text-slate-500 hover:text-slate-800 text-xs h-7"
                  >
                    Fechar
                  </Button>
                </div>

                {/* Metadados da Conversa */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Remetente:</span>
                    <strong className="text-slate-800">{formatarRemetente(mensagemAtiva)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Data de Protocolo:</span>
                    <span className="font-mono text-slate-700">
                      {formatarDataHoraFuso(mensagemAtiva.created)}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block text-[11px]">Destinatário(s):</span>
                    <span className="text-slate-800 font-medium">
                      {formatarDestinatarios(mensagemAtiva)}
                    </span>
                    {/* Lista detalhada do snapshot se for grupo */}
                    {mensagemAtiva.tipo_destinatario === 'grupo' &&
                      mensagemAtiva.destinatarios_snapshot?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {mensagemAtiva.destinatarios_snapshot.map((dest) => (
                            <Badge
                              key={dest.id}
                              variant="outline"
                              className="text-[10px] bg-slate-100 text-slate-700 border-slate-300"
                            >
                              {dest.nome} {dest.cargo ? `(${dest.cargo})` : ''}
                            </Badge>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-6">
                {/*
                  CONTEÚDO DA MENSAGEM: TEXTO PURO ESCAPADO (INERT TAGS)
                  Não se utiliza NUNCA dangerouslySetInnerHTML ou innerHTML.
                  Tags como <script>, <b>, <img... aparecem estritamente como texto literal legível.
                */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Conteúdo Literal da Mensagem
                  </span>
                  <div className="text-slate-900 text-sm whitespace-pre-wrap font-sans leading-relaxed break-words">
                    {formatarTextoSeguroMensagem(mensagemAtiva.conteudo)}
                  </div>
                </div>

                {/* Status de Leitura */}
                <div className="p-3 bg-slate-100/70 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-emerald-600" />
                    <span>
                      {mensagemAtiva.lida_por?.length > 0 ? (
                        <>
                          Lida por {mensagemAtiva.lida_por.length}{' '}
                          {mensagemAtiva.lida_por.length === 1 ? 'destinatário' : 'destinatários'}.
                        </>
                      ) : (
                        'Ainda não marcada como lida pelos destinatários.'
                      )}
                    </span>
                  </div>
                  {mensagemAtiva.idempotency_key && (
                    <span className="font-mono text-[10px] text-slate-400">
                      ref: {mensagemAtiva.idempotency_key.slice(0, 14)}...
                    </span>
                  )}
                </div>

                {/* Ações: Responder Mensagem */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  {caixaAtiva === 'entrada' && (
                    <Button
                      onClick={() => abrirModalCompor(mensagemAtiva)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Responder Remetente
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* 5. MODAL DE COMPOSIÇÃO DE NOVA MENSAGEM COM IDEMPOTÊNCIA E PRESERVAÇÃO DE TEXTO */}
      <Dialog open={modalComporAberto} onOpenChange={setModalComporAberto}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Mail className="w-5 h-5 text-blue-600" />
              Compor Mensagem Interna
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Envio administrativo restrito a profissionais e grupos cadastrados. Comunicação
              estritamente em texto plano.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEnviarMensagem} className="space-y-4 py-2">
            {/* Aviso de erro ou conflito com preservação de texto */}
            {erroEnvio && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                  <span>Falha no Processamento do Envio</span>
                </div>
                <p>{erroEnvio}</p>
                {avisoReenvio && (
                  <p className="text-[11px] text-red-800 font-medium pt-1 border-t border-red-200">
                    ℹ️ {avisoReenvio}
                  </p>
                )}
                {avisoReenvio?.includes('Nova Chave') && (
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIdempotencyKeyAtual(gerarChaveIdempotenciaMensagem())
                        setErroEnvio(null)
                        setAvisoReenvio(null)
                        toast({
                          title: 'Nova Chave Gerada',
                          description:
                            'Uma nova chave foi atribuída. Seu texto digitado foi mantido para reenvio.',
                        })
                      }}
                      className="text-xs border-red-300 bg-white hover:bg-red-100 text-red-900"
                    >
                      Gerar Nova Chave & Liberar Envio
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Tipo de Destinatário */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoDestinatario('usuario')}
                disabled={enviando}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                  tipoDestinatario === 'usuario'
                    ? 'bg-blue-50 border-blue-600 text-blue-900'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <User className="w-4 h-4" />
                Destinatário Individual
              </button>

              <button
                type="button"
                onClick={() => setTipoDestinatario('grupo')}
                disabled={enviando}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                  tipoDestinatario === 'grupo'
                    ? 'bg-blue-50 border-blue-600 text-blue-900'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4" />
                Grupo / Equipe
              </button>
            </div>

            {/* Seletor de Destinatário do Diretório Seguro */}
            {tipoDestinatario === 'usuario' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Selecionar Profissional (Diretório Funcional):
                </label>
                {carregandoDiretorio ? (
                  <div className="text-xs text-slate-500 py-2 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Carregando diretório...
                  </div>
                ) : (
                  <Select
                    value={destinatarioUsuarioId}
                    onValueChange={setDestinatarioUsuarioId}
                    disabled={enviando}
                  >
                    <SelectTrigger className="text-xs bg-white border-slate-300">
                      <SelectValue placeholder="Selecione o usuário destinatário..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {diretorioUsuarios.map((u) => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          {u.nome} {u.cargo ? `• ${u.cargo}` : ''} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Selecionar Grupo Hospitalar:
                </label>
                {carregandoDiretorio ? (
                  <div className="text-xs text-slate-500 py-2 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Carregando grupos...
                  </div>
                ) : (
                  <Select
                    value={destinatarioGrupoId}
                    onValueChange={setDestinatarioGrupoId}
                    disabled={enviando}
                  >
                    <SelectTrigger className="text-xs bg-white border-slate-300">
                      <SelectValue placeholder="Selecione o grupo funcional..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {gruposMensageria.map((g) => (
                        <SelectItem key={g.id} value={g.id} className="text-xs">
                          {g.nome} {g.sigla ? `(${g.sigla})` : ''} • {g.membros.length} membros
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <span className="text-[11px] text-slate-500 block">
                  ℹ️ Ao enviar para o grupo, os participantes são congelados em snapshot no momento
                  do envio. Membros futuros não acessam o histórico pregresso.
                </span>
              </div>
            )}

            {/* Assunto */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Assunto:</label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {assuntoForm.length}/160 caracteres
                </span>
              </div>
              <Input
                type="text"
                placeholder="Ex.: Aviso sobre escala de plantão ou troca de turno..."
                maxLength={160}
                value={assuntoForm}
                onChange={(e) => setAssuntoForm(e.target.value)}
                disabled={enviando}
                className="text-xs bg-white border-slate-300"
              />
            </div>

            {/* Conteúdo */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Conteúdo da Mensagem (Texto Plano):
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {conteudoForm.length}/4000 caracteres
                </span>
              </div>
              <Textarea
                placeholder="Digite a mensagem em texto puro. Tags HTML não serão interpretadas nem formatadas..."
                rows={5}
                maxLength={4000}
                value={conteudoForm}
                onChange={(e) => setConteudoForm(e.target.value)}
                disabled={enviando}
                className="text-xs bg-white border-slate-300 font-sans"
              />
            </div>

            {/* Indicador de Idempotência */}
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Chave de Idempotência Ativa:
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                {idempotencyKeyAtual || 'msg_auto'}
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalComporAberto(false)}
                disabled={enviando}
                className="text-xs"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={enviando}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-2"
              >
                {enviando ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Enviando Mensagem...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Protocolar & Enviar
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. MODAL DE GESTÃO DE GRUPOS & MEMBROS (RESTRITO A GESTOR/ADMIN NO CLIENTE E NO SERVIDOR) */}
      <Dialog open={modalGruposAberto} onOpenChange={setModalGruposAberto}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg">
                <FolderCog className="w-5 h-5 text-blue-600" />
                Gestão de Grupos e Equipes de Mensageria
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Administração restrita a gestores autorizados com validação estrita no servidor.
              Inativação lógica preserva todo o histórico; sem exclusão física.
            </DialogDescription>
          </DialogHeader>

          {/* Se estiver no formulário de criação ou edição */}
          {modoCriarGrupo || grupoEmEdicao ? (
            <form onSubmit={handleSalvarGrupo} className="space-y-4 py-2">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold uppercase text-slate-700">
                  {modoCriarGrupo
                    ? 'Novo Grupo Hospitalar'
                    : `Editar Grupo: ${grupoEmEdicao?.nome}`}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setModoCriarGrupo(false)
                    setGrupoEmEdicao(null)
                    setErroGrupo(null)
                  }}
                  className="text-xs h-7 text-slate-600"
                >
                  Voltar à Lista de Grupos
                </Button>
              </div>

              {erroGrupo && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{erroGrupo}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Nome do Grupo *</label>
                  <Input
                    type="text"
                    placeholder="Ex.: Plantão UTI Geral, Enfermagem PA..."
                    value={formGrupoNome}
                    onChange={(e) => setFormGrupoNome(e.target.value)}
                    maxLength={120}
                    disabled={salvandoGrupo}
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Sigla (opcional)</label>
                  <Input
                    type="text"
                    placeholder="Ex.: UTI-GERAL"
                    value={formGrupoSigla}
                    onChange={(e) => setFormGrupoSigla(e.target.value)}
                    maxLength={20}
                    disabled={salvandoGrupo}
                    className="text-xs uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Descrição Funcional</label>
                <Input
                  type="text"
                  placeholder="Finalidade do grupo e setor hospitalar correspondente..."
                  value={formGrupoDescricao}
                  onChange={(e) => setFormGrupoDescricao(e.target.value)}
                  maxLength={500}
                  disabled={salvandoGrupo}
                  className="text-xs"
                />
              </div>

              {/* Seção de Participantes / Membros com Diretório Paginado */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      Participantes do Grupo ({formGrupoMembros.length} selecionado(s))
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Selecione apenas profissionais cadastrados. Membros adicionados não recebem
                      histórico pregresso.
                    </p>
                  </div>

                  {/* Busca no Diretório */}
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="text"
                      placeholder="Filtrar por nome/cargo..."
                      value={buscaDiretorioTexto}
                      onChange={(e) => {
                        const val = e.target.value
                        setBuscaDiretorioTexto(val)
                        carregarDiretorioPaginado(1, val)
                      }}
                      className="text-xs h-8 w-48 bg-white"
                    />
                  </div>
                </div>

                {/* Lista Paginada de Usuários do Diretório Mínimo */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                  {carregandoMembrosDiretorio ? (
                    <div className="py-6 flex items-center justify-center text-xs text-slate-500 gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      Carregando profissionais do diretório...
                    </div>
                  ) : diretorioPaginado.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      Nenhum profissional localizado no diretório.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                      {diretorioPaginado.map((u) => {
                        const isMembro = formGrupoMembros.includes(u.id)
                        return (
                          <div
                            key={u.id}
                            className={`p-2.5 flex items-center justify-between text-xs transition-colors ${
                              isMembro ? 'bg-blue-50/70' : 'bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-medium text-slate-800 block truncate">
                                {u.nome}
                              </span>
                              <span className="text-[11px] text-slate-500 block truncate">
                                {u.cargo ? `${u.cargo} • ` : ''}Perfil: {u.role}
                              </span>
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              variant={isMembro ? 'default' : 'outline'}
                              onClick={() => alternarMembroGrupo(u.id)}
                              disabled={salvandoGrupo}
                              className={`h-7 text-xs px-2.5 flex items-center gap-1 ${
                                isMembro
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {isMembro ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  Participante
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-3.5 h-3.5" />
                                  Adicionar
                                </>
                              )}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Controles de Paginação do Diretório */}
                  {totalPagDiretorio > 1 && (
                    <div className="p-2 bg-slate-100/80 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                      <span>
                        Pág. {pagDiretorio} de {totalPagDiretorio} ({totalItensDiretorio}{' '}
                        profissionais)
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={pagDiretorio <= 1 || carregandoMembrosDiretorio}
                          onClick={() =>
                            carregarDiretorioPaginado(pagDiretorio - 1, buscaDiretorioTexto)
                          }
                          className="h-6 px-2 text-[11px]"
                        >
                          Anterior
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={pagDiretorio >= totalPagDiretorio || carregandoMembrosDiretorio}
                          onClick={() =>
                            carregarDiretorioPaginado(pagDiretorio + 1, buscaDiretorioTexto)
                          }
                          className="h-6 px-2 text-[11px]"
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setModoCriarGrupo(false)
                    setGrupoEmEdicao(null)
                  }}
                  disabled={salvandoGrupo}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={salvandoGrupo}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5"
                >
                  {salvandoGrupo ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Salvando no Servidor...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {modoCriarGrupo ? 'Criar Grupo Hospitalar' : 'Salvar Alterações'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* Lista de Grupos Existentes com Ações de Edição e Inativação */
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Grupos Hospitalares Cadastrados
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Total de {gruposAdmin.length} grupo(s) no sistema
                  </span>
                </div>
                <Button
                  onClick={iniciarCriarGrupo}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Criar Novo Grupo
                </Button>
              </div>

              {carregandoGruposAdmin ? (
                <div className="py-10 flex items-center justify-center text-xs text-slate-500 gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                  Carregando lista de grupos...
                </div>
              ) : gruposAdmin.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border rounded-lg space-y-2">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">Nenhum grupo cadastrado</p>
                  <p className="text-xs text-slate-500">
                    Crie o primeiro grupo funcional para organizar as comunicações entre equipes do
                    hospital.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {gruposAdmin.map((g) => (
                    <div
                      key={g.id}
                      className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        g.ativo ? 'bg-white' : 'bg-slate-100/70 opacity-80'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-xs text-slate-900 font-semibold">{g.nome}</strong>
                          {g.sigla && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {g.sigla}
                            </Badge>
                          )}
                          <Badge
                            variant={g.ativo ? 'secondary' : 'destructive'}
                            className={`text-[9px] px-1.5 py-0 h-4 ${
                              g.ativo
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {g.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        {g.descricao && <p className="text-[11px] text-slate-600">{g.descricao}</p>}
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>{g.membros.length} participante(s)</span>
                          {g.expand?.criado_por?.name && (
                            <span>• Criado por: {g.expand.criado_por.name}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => iniciarEditarGrupo(g)}
                          className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                          Editar / Membros
                        </Button>

                        <Button
                          type="button"
                          variant={g.ativo ? 'ghost' : 'outline'}
                          size="sm"
                          onClick={() => handleAlternarStatusAtivo(g)}
                          className={`h-8 text-xs flex items-center gap-1 ${
                            g.ativo
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-700 hover:bg-emerald-50 border-emerald-300'
                          }`}
                          title={
                            g.ativo
                              ? 'Inativar grupo (bloqueia novos envios; histórico preservado)'
                              : 'Reativar grupo para novos envios'
                          }
                        >
                          {g.ativo ? (
                            <>
                              <PowerOff className="w-3.5 h-3.5" />
                              Inativar
                            </>
                          ) : (
                            <>
                              <Power className="w-3.5 h-3.5" />
                              Reativar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  <strong>Regra de Imutabilidade Histórica:</strong> Alterações de nome ou
                  composição de participantes são validadas pelo servidor e <u>nunca reescrevem</u>{' '}
                  o snapshot de mensagens passadas. Novos participantes só recebem mensagens
                  transmitidas após sua inclusão.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default MensageriaInternaView
