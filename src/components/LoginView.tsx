import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Activity, ShieldCheck, Lock, User, Hospital } from 'lucide-react'

interface LoginModalProps {
  onSuccess?: () => void
}

export const LoginView: React.FC<LoginModalProps> = ({ onSuccess }) => {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setErrorMsg('Por favor, informe o e-mail e a senha de acesso.')
      return
    }
    setLoading(true)
    setErrorMsg(null)

    const res = await login(email, password)
    setLoading(false)
    if (!res.success) {
      setErrorMsg(res.error || 'Credenciais inválidas.')
    } else {
      if (onSuccess) onSuccess()
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/20 mb-2">
            <Hospital className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Gestão Hospitalar Municipal
          </h1>
          <p className="text-sm text-slate-400">
            Prefeitura Municipal de Saúde • Acesso Restrito Online
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-950/80 backdrop-blur shadow-2xl text-slate-100">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              Autenticação de Usuário
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Informe seu e-mail institucional cadastrado para acessar os módulos
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMsg && (
                <Alert
                  variant="destructive"
                  className="border-red-900 bg-red-950/60 text-red-200 text-xs"
                >
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-slate-300">
                  E-mail institucional
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@saude.gov.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-slate-900/80 border-slate-700 text-slate-100 focus:border-blue-500 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-slate-300">
                  Senha de acesso
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-slate-900/80 border-slate-700 text-slate-100 focus:border-blue-500 text-sm"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 text-sm transition-all shadow-md shadow-blue-600/30"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Activity className="w-4 h-4 animate-spin" /> Verificando credenciais...
                  </span>
                ) : (
                  'Entrar no Sistema Hospitalar'
                )}
              </Button>
            </CardContent>
          </form>

          <CardFooter className="flex flex-col border-t border-slate-800/80 pt-3 pb-4 px-6 text-center">
            <p className="text-[11px] text-slate-500">
              Acesso restrito e monitorado • Auditoria ativa de acessos
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
