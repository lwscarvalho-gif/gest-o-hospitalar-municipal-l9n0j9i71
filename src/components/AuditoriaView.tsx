import React, { useState, useEffect } from 'react'
import { AuditoriaRegistro } from '@/types/hospital'
import { listarAuditoria } from '@/services/auditoria'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShieldCheck, RefreshCw, User, Clock, Terminal, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const AuditoriaView: React.FC = () => {
  const { toast } = useToast()
  const [registros, setRegistros] = useState<AuditoriaRegistro[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    setLoading(true)
    try {
      const lista = await listarAuditoria(100)
      setRegistros(lista)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os logs de auditoria.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const acaoBadge = (acao: string) => {
    if (acao.includes('LOGIN'))
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">LOGIN</Badge>
    if (acao.includes('ADMISSAO'))
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">ADMISSÃO</Badge>
    if (acao.includes('TRANSFERENCIA'))
      return <Badge className="bg-amber-100 text-amber-800 border-amber-300">TRANSFERÊNCIA</Badge>
    if (acao.includes('ALTA'))
      return <Badge className="bg-red-100 text-red-800 border-red-300">ALTA</Badge>
    if (acao.includes('CRIAR'))
      return <Badge className="bg-purple-100 text-purple-800 border-purple-300">CRIAÇÃO</Badge>
    return <Badge variant="outline">{acao}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Trilha de Auditoria & Segurança do Sistema
          </h1>
          <p className="text-xs text-slate-500">
            Registro cronológico e imutável de todas as ações de usuários, admissões e prontuários
          </p>
        </div>

        <Button onClick={carregar} variant="outline" size="sm" className="text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Atualizar Logs
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">
            Últimos Eventos Registrados ({registros.length})
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Conformidade LGPD e rastreabilidade médica municipal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              Carregando trilha de auditoria...
            </div>
          ) : registros.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Nenhum evento registrado ainda.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {registros.map((reg) => (
                <div
                  key={reg.id}
                  className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {acaoBadge(reg.acao)}
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {reg.modulo}
                      </Badge>
                      <span className="font-semibold text-slate-900 text-xs flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {reg.usuario_nome}
                      </span>
                      {reg.usuario_role && (
                        <span className="text-[10px] text-slate-400">({reg.usuario_role})</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700">{reg.detalhes}</p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 self-end md:self-center">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(reg.created).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
