import React from 'react'
import { Paciente } from '@/types/hospital'
import { mascararCPF, mascararCNS } from '@/services/identificacaoPaciente'
import { Badge } from '@/components/ui/badge'
import { User, Calendar, AlertCircle } from 'lucide-react'

interface CabecalhoPacienteAtivoProps {
  paciente?: Paciente | null
  subtituloContexto?: string
  className?: string
  modoCompacto?: boolean
}

export const CabecalhoPacienteAtivo: React.FC<CabecalhoPacienteAtivoProps> = ({
  paciente,
  subtituloContexto,
  className = '',
  modoCompacto = false,
}) => {
  if (!paciente) {
    return (
      <div
        className={`p-2.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-500 text-xs flex items-center gap-2 ${className}`}
      >
        <AlertCircle className="w-4 h-4 text-slate-400" />
        <span>Nenhum paciente selecionado no contexto assistencial.</span>
      </div>
    )
  }

  const formatarDataBR = (dataISO?: string) => {
    if (!dataISO) return 'Não informada'
    const partes = dataISO.split('T')[0].split('-')
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`
    return dataISO
  }

  if (modoCompacto) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-300 text-xs ${className}`}
      >
        <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        <strong className="text-slate-900 font-bold uppercase truncate max-w-[200px]">
          {paciente.nome}
        </strong>
        <span className="text-emerald-800 font-mono text-[10px]">
          CNS: {mascararCNS(paciente.cartao_sus)}
        </span>
        <span className="text-slate-500 text-[10px]">
          Nasc: {formatarDataBR(paciente.data_nascimento)}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`p-3 rounded-lg border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${className}`}
    >
      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
          <User className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-slate-900 uppercase">
              {paciente.nome}
            </span>
            <Badge className="bg-emerald-700 text-white border-0 text-[10px] py-0">
              CNS: {mascararCNS(paciente.cartao_sus)}
            </Badge>
            {paciente.cpf ? (
              <Badge
                variant="outline"
                className="bg-white text-slate-700 border-slate-300 text-[10px] py-0"
              >
                CPF: {mascararCPF(paciente.cpf)}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] py-0"
              >
                RN / Sem Doc
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-slate-600 flex items-center gap-3 flex-wrap mt-0.5">
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3 h-3 text-slate-500" />
              Nasc: {formatarDataBR(paciente.data_nascimento)}
            </span>
            <span>
              • Mãe: <strong>{paciente.nome_mae || 'Não declarada'}</strong>
            </span>
            {subtituloContexto && (
              <span className="text-emerald-800 font-medium bg-emerald-100/60 px-1.5 py-0.2 rounded">
                {subtituloContexto}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
