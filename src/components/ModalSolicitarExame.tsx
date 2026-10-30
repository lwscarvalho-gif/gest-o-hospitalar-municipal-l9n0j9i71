import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { FlaskConical, AlertCircle, Loader2 } from 'lucide-react'
import { solicitarExame } from '@/services/exames'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { CategoriaExame, PrioridadeExame, Paciente } from '@/types/hospital'

interface ModalSolicitarExameProps {
  aberto: boolean
  onClose: () => void
  paciente: Paciente | null | undefined
  internacaoId?: string
  atendimentoPaId?: string
  setorId?: string
  onSucesso?: () => void
}

const SUGESTOES_EXAMES = [
  { nome: 'Hemograma Completo com Plaquetas', cat: 'laboratorial' as CategoriaExame },
  { nome: 'Glicemia de Jejum', cat: 'laboratorial' as CategoriaExame },
  { nome: 'Ureia e Creatinina Séricas', cat: 'laboratorial' as CategoriaExame },
  { nome: 'EAS / Urina Tipo I', cat: 'laboratorial' as CategoriaExame },
  { nome: 'Proteína C-Reativa (PCR Quantitativa)', cat: 'laboratorial' as CategoriaExame },
  { nome: 'Coagulograma Completo (TP / TTPA)', cat: 'laboratorial' as CategoriaExame },
  { nome: 'Eletrólitos (Sódio e Potássio)', cat: 'laboratorial' as CategoriaExame },
  { nome: 'Radiografia de Tórax (PA e Perfil)', cat: 'imagem' as CategoriaExame },
  { nome: 'Radiografia de Abdome Simples', cat: 'imagem' as CategoriaExame },
  { nome: 'Ultrassonografia de Abdome Total', cat: 'imagem' as CategoriaExame },
  { nome: 'Eletrocardiograma (ECG 12 derivações)', cat: 'grafico' as CategoriaExame },
  { nome: 'Gasometria Arterial', cat: 'laboratorial' as CategoriaExame },
]

export const ModalSolicitarExame: React.FC<ModalSolicitarExameProps> = ({
  aberto,
  onClose,
  paciente,
  internacaoId,
  atendimentoPaId,
  setorId,
  onSucesso,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [tipoExame, setTipoExame] = useState('')
  const [categoria, setCategoria] = useState<CategoriaExame>('laboratorial')
  const [prioridade, setPrioridade] = useState<PrioridadeExame>('urgente')
  const [justificativa, setJustificativa] = useState('')
  const [salvando, setSalvando] = useState(false)

  const handleSelecionarSugestao = (sug: { nome: string; cat: CategoriaExame }) => {
    setTipoExame(sug.nome)
    setCategoria(sug.cat)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!paciente?.id) {
      toast({
        title: 'Paciente não identificado',
        description: 'Selecione um paciente válido para solicitar exame.',
        variant: 'destructive',
      })
      return
    }

    if (!tipoExame.trim()) {
      toast({
        title: 'Nome do exame obrigatório',
        description: 'Digite o tipo ou nome do exame a ser solicitado.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const solicitanteNome = user?.name || 'Profissional Solicitante'

      await solicitarExame({
        paciente: paciente.id,
        internacao: internacaoId,
        atendimento_pa: atendimentoPaId,
        setor: setorId,
        tipo_exame: tipoExame.trim(),
        categoria,
        prioridade,
        justificativa: justificativa.trim(),
        solicitante: user?.id,
        solicitante_nome: solicitanteNome,
      })

      toast({
        title: 'Exame Solicitado com Sucesso',
        description: `O pedido de "${tipoExame.trim()}" entrou na fila do laboratório/diagnóstico.`,
      })

      setTipoExame('')
      setJustificativa('')
      onClose()
      if (onSucesso) onSucesso()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao solicitar exame',
        description: err.message || 'Falha na comunicação com o servidor.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-slate-900">
            <FlaskConical className="w-5 h-5 text-blue-600" />
            Solicitação de Exame Diagnóstico / Laboratorial
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {atendimentoPaId
              ? 'Pronto Atendimento (PA)'
              : internacaoId
                ? 'Internação Hospitalar'
                : 'Ambulatório'}{' '}
            • O pedido entrará imediatamente na fila interna e na linha do tempo do paciente.
          </DialogDescription>
        </DialogHeader>

        {paciente && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800">{paciente.nome}</span>
              <span className="font-mono text-slate-500">SUS: {paciente.cartao_sus}</span>
            </div>
            {paciente.alergias && (
              <div className="text-[11px] font-semibold text-red-700">
                Alergias conhecidas: {paciente.alergias}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSalvar} className="space-y-4 pt-1">
          {/* Digitação livre do tipo do exame */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tipo / Nome do Exame *</Label>
            <Input
              placeholder="Ex: Hemograma, Raio-X de Tórax, Ultrassom de Abdome, EAS..."
              value={tipoExame}
              onChange={(e) => setTipoExame(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          {/* Sugestões rápidas frequentes */}
          <div className="space-y-1">
            <span className="text-[11px] text-slate-500 block">
              Exames frequentes (clique para preencher):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50/80 rounded border border-slate-200">
              {SUGESTOES_EXAMES.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelecionarSugestao(sug)}
                  className="text-[11px] px-2 py-0.5 rounded bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 text-slate-700 transition-colors"
                >
                  + {sug.nome}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Categoria do Exame</Label>
              <Select value={categoria} onValueChange={(val: any) => setCategoria(val)}>
                <SelectTrigger className="text-xs bg-white">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="laboratorial">Laboratorial (Sangue/Urina/Líquidos)</SelectItem>
                  <SelectItem value="imagem">Radiologia & Imagem (RX/USG/TC)</SelectItem>
                  <SelectItem value="grafico">Método Gráfico (ECG/EEG)</SelectItem>
                  <SelectItem value="outro">Outro / Especializado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Prioridade *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPrioridade('urgente')}
                  className={`p-2 rounded-md border text-center text-xs font-bold transition-all ${
                    prioridade === 'urgente'
                      ? 'border-red-600 bg-red-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  URGÊNCIA
                </button>
                <button
                  type="button"
                  onClick={() => setPrioridade('eletiva')}
                  className={`p-2 rounded-md border text-center text-xs font-bold transition-all ${
                    prioridade === 'eletiva'
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  ELETIVA
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Justificativa Clínica / Hipótese Diagnóstica
            </Label>
            <Textarea
              placeholder="Indicação clínica, suspeita diagnóstica, sinais e sintomas que motivaram o pedido..."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              className="text-xs"
              rows={3}
            />
          </div>

          <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              O exame ficará disponível na <strong>Fila de Exames</strong> do laboratório para
              coleta e análise, e automaticamente indexado no prontuário eletrônico do paciente.
            </span>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={salvando}
              className="bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Gravando Pedido...
                </>
              ) : (
                <>
                  <FlaskConical className="w-3.5 h-3.5" />
                  Emitir Solicitação de Exame
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
