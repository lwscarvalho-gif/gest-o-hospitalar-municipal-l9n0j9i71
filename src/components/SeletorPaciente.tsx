import React, { useState, useEffect, useRef } from 'react'
import { Paciente } from '@/types/hospital'
import {
  buscarPacientesPaginadoNoServidor,
  mascararCPF,
  mascararCNS,
  limparApenasDigitosPreservandoZeros,
} from '@/services/identificacaoPaciente'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, User, Calendar, ShieldCheck, Loader2, X, AlertCircle } from 'lucide-react'

interface SeletorPacienteProps {
  label?: string
  pacienteSelecionadoId?: string
  pacienteInicial?: Paciente | null
  onSelecionar: (paciente: Paciente | null) => void
  obrigatorio?: boolean
  disabled?: boolean
  placeholder?: string
  idPrefix?: string
}

export const SeletorPaciente: React.FC<SeletorPacienteProps> = ({
  label = 'Selecionar Paciente (Busca Paginada no Servidor)',
  pacienteSelecionadoId,
  pacienteInicial,
  onSelecionar,
  obrigatorio = false,
  disabled = false,
  placeholder = 'Buscar por nome, Cartão SUS ou CPF (zeros preservados)...',
  idPrefix = 'sel_pac',
}) => {
  const [termo, setTermo] = useState('')
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [resultados, setResultados] = useState<Paciente[]>([])
  const [totalEncontrados, setTotalEncontrados] = useState(0)
  const [pacienteAtivo, setPacienteAtivo] = useState<Paciente | null>(pacienteInicial || null)

  const wrapperRef = useRef<HTMLDivElement>(null)

  // Sincroniza paciente ativo se mudar externamente
  useEffect(() => {
    if (pacienteInicial) {
      setPacienteAtivo(pacienteInicial)
    }
  }, [pacienteInicial])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickFora = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setDropdownAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  // Dispara busca no servidor com debounce de 300ms
  useEffect(() => {
    if (!dropdownAberto) return

    const timer = setTimeout(async () => {
      setCarregando(true)
      try {
        const res = await buscarPacientesPaginadoNoServidor({
          termo: termo.trim(),
          pagina: 1,
          porPagina: 10,
        })
        setResultados(res.itens)
        setTotalEncontrados(res.totalItens)
      } catch (err) {
        console.error('Erro na busca de pacientes:', err)
      } finally {
        setCarregando(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [termo, dropdownAberto])

  const handleEscolherPaciente = (pac: Paciente) => {
    setPacienteAtivo(pac)
    onSelecionar(pac)
    setDropdownAberto(false)
    setTermo('')
  }

  const handleLimparSelecao = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPacienteAtivo(null)
    onSelecionar(null)
    setTermo('')
  }

  const formatarDataBR = (dataISO?: string) => {
    if (!dataISO) return 'Nascimento não informado'
    const partes = dataISO.split('T')[0].split('-')
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`
    return dataISO
  }

  return (
    <div ref={wrapperRef} className="space-y-1.5 w-full relative">
      {label && (
        <Label htmlFor={`${idPrefix}_input`} className="text-xs font-semibold text-slate-700 block">
          {label} {obrigatorio && <span className="text-rose-600">*</span>}
        </Label>
      )}

      {/* Caixa de Entrada ou Paciente Selecionado */}
      {!pacienteAtivo ? (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <Input
            id={`${idPrefix}_input`}
            type="text"
            disabled={disabled}
            placeholder={placeholder}
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value)
              if (!dropdownAberto) setDropdownAberto(true)
            }}
            onFocus={() => setDropdownAberto(true)}
            className="pl-9 pr-9 text-xs h-9 bg-white"
          />
          {carregando && (
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute right-3 top-2.5" />
          )}
        </div>
      ) : (
        /* CABEÇALHO / BADGE DO PACIENTE ATIVO CLARAMENTE IDENTIFICADO */
        <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 truncate uppercase">
                  {pacienteAtivo.nome}
                </span>
                <Badge
                  variant="outline"
                  className="bg-white text-emerald-800 border-emerald-300 text-[10px] py-0"
                >
                  CNS: {mascararCNS(pacienteAtivo.cartao_sus)}
                </Badge>
                {pacienteAtivo.cpf ? (
                  <Badge
                    variant="outline"
                    className="bg-white text-slate-700 border-slate-300 text-[10px] py-0"
                  >
                    CPF: {mascararCPF(pacienteAtivo.cpf)}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] py-0"
                  >
                    RN / Urgência Sem Doc
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-slate-600 flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Nasc: {formatarDataBR(pacienteAtivo.data_nascimento)}
                </span>
                <span>• Mãe: {pacienteAtivo.nome_mae || 'Não informada'}</span>
              </div>
            </div>
          </div>

          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLimparSelecao}
              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 shrink-0"
              title="Trocar paciente selecionado"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* DROPDOWN DE RESULTADOS PAGINADOS DO SERVIDOR */}
      {dropdownAberto && !pacienteAtivo && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {carregando ? (
            <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              Buscando no banco de dados (respeitando limites e privacidade)...
            </div>
          ) : resultados.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              {termo.trim() ? (
                <>Nenhum paciente localizado com o termo "{termo}".</>
              ) : (
                <>Digite o nome, Cartão SUS ou CPF para pesquisar.</>
              )}
            </div>
          ) : (
            <div>
              <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 flex justify-between items-center">
                <span>Resultados ({totalEncontrados} total no servidor)</span>
                <span>Privacidade LGPD: identificadores mascarados</span>
              </div>
              {resultados.map((pac) => (
                <button
                  key={pac.id}
                  type="button"
                  onClick={() => handleEscolherPaciente(pac)}
                  className="w-full text-left px-3 py-2 border-b border-slate-50 hover:bg-emerald-50/60 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate uppercase">
                      {pac.nome}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                      <span>Mãe: {pac.nome_mae || 'Não declarada'}</span>
                      <span>• Nasc: {formatarDataBR(pac.data_nascimento)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <div className="text-[10px] font-mono font-medium text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                      CNS: {mascararCNS(pac.cartao_sus)}
                    </div>
                    {pac.cpf && (
                      <div className="text-[10px] font-mono text-slate-500">
                        CPF: {mascararCPF(pac.cpf)}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
