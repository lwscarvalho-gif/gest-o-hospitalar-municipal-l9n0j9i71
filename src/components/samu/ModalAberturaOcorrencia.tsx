import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react'
import {
  AbrirOcorrenciaSAMUParams,
  RelacaoSolicitanteVitimaSAMU,
  TipoOcorrenciaSAMU,
  Setor,
} from '@/types/hospital'
import { abrirOcorrenciaSAMU } from '@/services/samu'
import { useToast } from '@/hooks/use-toast'

export interface ModalAberturaOcorrenciaProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  setoresHospitalares: Setor[]
  seqRef?: React.MutableRefObject<number>
}

// Chave idempotente fixa por formulário aberto até sucesso
function gerarChaveIdempotente(): string {
  return `samu-open-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const ModalAberturaOcorrencia: React.FC<ModalAberturaOcorrenciaProps> = ({
  open,
  onClose,
  onSuccess,
  setoresHospitalares: _setoresHospitalares,
  seqRef,
}) => {
  const { toast } = useToast()

  // Chave idempotente estável para o ciclo de vida deste formulário
  const [chaveIdempotencia, setChaveIdempotencia] = useState<string>(gerarChaveIdempotente)

  // Estado dos campos do formulário
  const [tipoOcorrencia, setTipoOcorrencia] = useState<TipoOcorrenciaSAMU>('clinica')
  const [relacaoSolicitante, setRelacaoSolicitante] =
    useState<RelacaoSolicitanteVitimaSAMU>('propria_vitima')
  const [solicitanteNome, setSolicitanteNome] = useState('')
  const [solicitanteTelefone, setSolicitanteTelefone] = useState('')

  // Vítima informada
  const [vitimaDesconhecida, setVitimaDesconhecida] = useState(false)
  const [vitimaNome, setVitimaNome] = useState('')
  const [vitimaSexo, setVitimaSexo] = useState<'M' | 'F' | 'Outro' | 'desconhecido'>('desconhecido')
  const [vitimaIdade, setVitimaIdade] = useState('')

  // Localização textual e município
  const [enderecoTextual, setEnderecoTextual] = useState('')
  const [numeroComplemento, setNumeroComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [municipio, setMunicipio] = useState('Mirante da Serra')
  const [pontoReferencia, setPontoReferencia] = useState('')

  // Queixa e observações textuais
  const [observacoesIniciais, setObservacoesIniciais] = useState('')

  // Estados de controle e erro
  const [salvando, setSalvando] = useState(false)
  const [erroOperacao, setErroOperacao] = useState<string | null>(null)
  const [conflitoDetectado, setConflitoDetectado] = useState(false)

  // Quando abre ou reseta o modal, se não houver chave prévia
  const resetarFormulario = () => {
    setChaveIdempotencia(gerarChaveIdempotente())
    setTipoOcorrencia('clinica')
    setRelacaoSolicitante('propria_vitima')
    setSolicitanteNome('')
    setSolicitanteTelefone('')
    setVitimaDesconhecida(false)
    setVitimaNome('')
    setVitimaSexo('desconhecido')
    setVitimaIdade('')
    setEnderecoTextual('')
    setNumeroComplemento('')
    setBairro('')
    setMunicipio('Mirante da Serra')
    setPontoReferencia('')
    setObservacoesIniciais('')
    setErroOperacao(null)
    setConflitoDetectado(false)
  }

  const handleSubmeter = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroOperacao(null)
    setConflitoDetectado(false)

    // Validações básicas no cliente
    if (!enderecoTextual.trim()) {
      setErroOperacao('Endereço textual da ocorrência é obrigatório.')
      return
    }
    if (!municipio.trim()) {
      setErroOperacao('Município do chamado é obrigatório.')
      return
    }
    if (!observacoesIniciais.trim()) {
      setErroOperacao('Informe o motivo ou relato inicial do chamado.')
      return
    }
    if (!vitimaDesconhecida && !vitimaNome.trim()) {
      setErroOperacao(
        'Informe o nome da vítima ou marque explicitamente "Vítima não identificada / desconhecida".',
      )
      return
    }

    const payload: AbrirOcorrenciaSAMUParams = {
      tipo_ocorrencia: tipoOcorrencia,
      relacao_solicitante_vitima: relacaoSolicitante,
      nome_solicitante: solicitanteNome.trim() || undefined,
      telefone_solicitante: solicitanteTelefone.trim() || undefined,
      vitima_desconhecida: vitimaDesconhecida,
      vitima_nome_informado: vitimaDesconhecida ? 'Desconhecido' : vitimaNome.trim(),
      vitima_sexo_informado: vitimaSexo,
      vitima_idade_informada: vitimaIdade.trim() || undefined,
      endereco_textual: enderecoTextual.trim(),
      numero_complemento: numeroComplemento.trim() || undefined,
      bairro: bairro.trim() || undefined,
      municipio: municipio.trim(),
      ponto_referencia: pontoReferencia.trim() || undefined,
      observacoes_iniciais: observacoesIniciais.trim() || undefined,
      idempotency_key: chaveIdempotencia,
    }

    setSalvando(true)

    // Descarte de resposta antiga com seqRef
    const currentSeq = seqRef ? ++seqRef.current : 0

    try {
      const resp = await abrirOcorrenciaSAMU(payload, {
        seqMomento: currentSeq,
        seqReferencia: seqRef,
      })

      // Se a resposta chegou e a sessão ainda é válida:
      toast({
        title: 'Ocorrência SAMU Aberta com Sucesso',
        description: `Número: ${resp.numero_ocorrencia} | Status: ${resp.status_fluxo}`,
      })

      resetarFormulario()
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const erroAny = err as {
        status?: number
        data?: { code?: string; message?: string }
        message?: string
        name?: string
      }

      // Se foi descartado por seqRef de sessão antiga, apenas silencia ou não altera estado
      if (erroAny?.name === 'RespostaSessaoObsoletaError') {
        return
      }

      // 409 Conflito: NÃO fechar formulário e preservar o texto!
      if (
        erroAny?.status === 409 ||
        erroAny?.name === 'IdempotenciaConflitoPayloadError' ||
        erroAny?.data?.code === 'CONFLITO_IDEMPOTENCIA'
      ) {
        setConflitoDetectado(true)
        setErroOperacao(
          'Conflito detectado: já existe uma requisição enviada com essa chave mas com conteúdo diferente. Seus dados foram preservados. Você pode tentar reenviar com uma nova chave ou verificar a lista de ocorrências.',
        )
      } else {
        setErroOperacao(
          erroAny?.data?.message ||
            erroAny?.message ||
            'Não foi possível registrar a ocorrência no momento. Tente novamente.',
        )
      }
    } finally {
      setSalvando(false)
    }
  }

  const renovarChaveManual = () => {
    setChaveIdempotencia(gerarChaveIdempotente())
    setConflitoDetectado(false)
    setErroOperacao(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(aberto) => {
        if (!aberto && !salvando) {
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-600 inline-block" />
            Abertura de Ocorrência SAMU (192 Básico)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Registro inicial do chamado telefônico/regulador. NÃO exige CPF, CNS nem cadastro prévio
            de paciente. Aceita explicitamente vítima desconhecida sem criar identificação fictícia.
          </DialogDescription>
        </DialogHeader>

        {conflitoDetectado && (
          <Alert variant="destructive" className="my-2 border-amber-500 bg-amber-50 text-amber-900">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs">
              <strong>Atenção (Conflito 409):</strong> Todos os textos digitados continuam intactos
              no formulário. Para reenviar os dados com uma nova chave de envio mantendo suas
              anotações,{' '}
              <button
                type="button"
                onClick={renovarChaveManual}
                className="underline font-bold text-amber-950 hover:text-black cursor-pointer"
              >
                clique aqui para renovar a chave idempotente
              </button>
              .
            </AlertDescription>
          </Alert>
        )}

        {erroOperacao && !conflitoDetectado && (
          <Alert variant="destructive" className="my-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{erroOperacao}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmeter} className="space-y-4 text-xs">
          {/* 1. Classificação do Chamado e Solicitante */}
          <div className="border border-slate-200 p-3 rounded-md bg-slate-50/50 space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center justify-between">
              <span>1. Informações do Chamado e Solicitante</span>
              <span className="text-[10px] text-slate-500 font-mono">
                Chave: {chaveIdempotencia.slice(-8)}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="tipo-ocorrencia">Tipo de Ocorrência *</Label>
                <Select
                  value={tipoOcorrencia}
                  onValueChange={(val) => setTipoOcorrencia(val as TipoOcorrenciaSAMU)}
                >
                  <SelectTrigger id="tipo-ocorrencia">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinica">
                      Clínico (Mal súbito, dor torácica, etc.)
                    </SelectItem>
                    <SelectItem value="trauma">Trauma (Queda, agressão, etc.)</SelectItem>
                    <SelectItem value="obstetrica">Obstétrico (Trabalho de parto, etc.)</SelectItem>
                    <SelectItem value="psiquiatrica">Psiquiátrico / Comportamental</SelectItem>
                    <SelectItem value="pediatrica">Pediátrico</SelectItem>
                    <SelectItem value="outro">Outro tipo de agravo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="relacao-solicitante">Relação do Solicitante com a Vítima *</Label>
                <Select
                  value={relacaoSolicitante}
                  onValueChange={(val) =>
                    setRelacaoSolicitante(val as RelacaoSolicitanteVitimaSAMU)
                  }
                >
                  <SelectTrigger id="relacao-solicitante">
                    <SelectValue placeholder="Relação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="propria_vitima">A própria vítima</SelectItem>
                    <SelectItem value="familiar">Familiar / Parente</SelectItem>
                    <SelectItem value="transeunte">Transeunte / Terceiro no local</SelectItem>
                    <SelectItem value="policial_bombeiro">Polícia Militar / Bombeiro</SelectItem>
                    <SelectItem value="profissional_saude">Profissional de Saúde</SelectItem>
                    <SelectItem value="outro">Outro Solicitante</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="solicitante-nome">Nome do Solicitante</Label>
                <Input
                  id="solicitante-nome"
                  value={solicitanteNome}
                  onChange={(e) => setSolicitanteNome(e.target.value)}
                  placeholder="Nome de quem ligou para o 192"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="solicitante-tel">Telefone de Contato</Label>
                <Input
                  id="solicitante-tel"
                  value={solicitanteTelefone}
                  onChange={(e) => setSolicitanteTelefone(e.target.value)}
                  placeholder="(69) 99999-9999"
                />
              </div>
            </div>
          </div>

          {/* 2. Dados da Vítima Informada */}
          <div className="border border-slate-200 p-3 rounded-md bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">
                2. Dados Informados da Vítima
              </h3>
              <div className="flex items-center space-x-2 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                <Checkbox
                  id="vitima-desconhecida"
                  checked={vitimaDesconhecida}
                  onCheckedChange={(checked) => {
                    const ativo = !!checked
                    setVitimaDesconhecida(ativo)
                    if (ativo) {
                      setVitimaNome('')
                    }
                  }}
                />
                <Label
                  htmlFor="vitima-desconhecida"
                  className="text-xs font-semibold text-amber-900 cursor-pointer"
                >
                  Vítima não identificada / Desconhecida
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1 space-y-1">
                <Label htmlFor="vitima-nome">
                  Nome Informado da Vítima {vitimaDesconhecida ? '(Desabilitado)' : '*'}
                </Label>
                <Input
                  id="vitima-nome"
                  value={vitimaNome}
                  onChange={(e) => setVitimaNome(e.target.value)}
                  disabled={vitimaDesconhecida}
                  placeholder={
                    vitimaDesconhecida
                      ? 'Identificação desconhecida'
                      : 'Nome completo ou primeiro nome'
                  }
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="vitima-sexo">Sexo Informado</Label>
                <Select
                  value={vitimaSexo}
                  onValueChange={(val) =>
                    setVitimaSexo(val as 'M' | 'F' | 'Outro' | 'desconhecido')
                  }
                >
                  <SelectTrigger id="vitima-sexo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                    <SelectItem value="desconhecido">Não informado / Desconhecido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="vitima-idade">Idade Informada / Estimada</Label>
                <Input
                  id="vitima-idade"
                  value={vitimaIdade}
                  onChange={(e) => setVitimaIdade(e.target.value)}
                  placeholder="Ex: 35 anos, aprox 60 anos"
                />
              </div>
            </div>
          </div>

          {/* 3. Localização Textual da Ocorrência */}
          <div className="border border-slate-200 p-3 rounded-md bg-slate-50/50 space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm">
              3. Localização Textual (Sem Mapas / GPS)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="endereco-textual">Endereço / Logradouro *</Label>
                <Input
                  id="endereco-textual"
                  value={enderecoTextual}
                  onChange={(e) => setEnderecoTextual(e.target.value)}
                  placeholder="Rua, Avenida, Linha Rural ou Rodovia"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="numero-complemento">Número / Km / Lote</Label>
                <Input
                  id="numero-complemento"
                  value={numeroComplemento}
                  onChange={(e) => setNumeroComplemento(e.target.value)}
                  placeholder="Nº 123, Km 15, etc."
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="bairro">Bairro / Setor / Linha</Label>
                <Input
                  id="bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Bairro ou Linha Rural"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="municipio">Município *</Label>
                <Input
                  id="municipio"
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  placeholder="Ex: Mirante da Serra"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="ponto-ref">Ponto de Referência</Label>
                <Input
                  id="ponto-ref"
                  value={pontoReferencia}
                  onChange={(e) => setPontoReferencia(e.target.value)}
                  placeholder="Próximo à igreja, em frente ao mercado..."
                />
              </div>
            </div>
          </div>

          {/* 4. Descrição do Chamado e Observações Iniciais */}
          <div className="border border-slate-200 p-3 rounded-md bg-slate-50/50 space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm">
              4. Descrição do Chamado e Motivo Principal
            </h3>

            <div className="space-y-1">
              <Label htmlFor="obs-iniciais">Motivo do Chamado / Observações Iniciais *</Label>
              <Textarea
                id="obs-iniciais"
                rows={3}
                value={observacoesIniciais}
                onChange={(e) => setObservacoesIniciais(e.target.value)}
                placeholder="Relato detalhado pelo solicitante, condições de segurança no local, queixa principal..."
              />
            </div>
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={salvando}
              className="bg-red-700 hover:bg-red-800 text-white font-semibold"
            >
              {salvando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando Chamado...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirmar Abertura SAMU
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
