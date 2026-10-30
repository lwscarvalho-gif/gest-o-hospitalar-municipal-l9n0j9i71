import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { AppUser, UserRole } from '@/types/hospital'
import { registrarAuditoria } from '@/services/auditoria'

interface AuthContextType {
  user: AppUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  temPermissao: (perfisPermitidos: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    // Sincronizar estado inicial a partir do authStore
    const syncUser = () => {
      if (pb.authStore.isValid && pb.authStore.model) {
        const m = pb.authStore.model as any
        setUser({
          id: m.id,
          email: m.email,
          name: m.name || m.email,
          role: (m.role as UserRole) || 'recepcao',
          cargo: m.cargo || '',
          registro_profissional: m.registro_profissional || '',
          avatar: m.avatar || '',
          created: m.created,
          updated: m.updated,
        })
      } else {
        setUser(null)
      }
      setIsLoading(false)
    }

    syncUser()

    // Ouvir alterações do authStore
    const unsubscribe = pb.authStore.onChange(() => {
      syncUser()
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, pass)
      const m = authData.record as any
      const appUser: AppUser = {
        id: m.id,
        email: m.email,
        name: m.name || m.email,
        role: (m.role as UserRole) || 'recepcao',
        cargo: m.cargo || '',
        registro_profissional: m.registro_profissional || '',
        avatar: m.avatar || '',
        created: m.created,
        updated: m.updated,
      }
      setUser(appUser)

      await registrarAuditoria({
        acao: 'LOGIN',
        modulo: 'Autenticação',
        detalhes: `Usuário ${appUser.name} (${appUser.email}) realizou login no perfil ${appUser.role}`,
        registro_id: appUser.id,
      })

      return { success: true }
    } catch (err: any) {
      console.error('Falha de login:', err)
      return {
        success: false,
        error:
          err.data?.message || err.message || 'Credenciais inválidas. Verifique usuário e senha.',
      }
    }
  }

  const logout = () => {
    if (user) {
      registrarAuditoria({
        acao: 'LOGOUT',
        modulo: 'Autenticação',
        detalhes: `Usuário ${user.name} efetuou logout da sessão`,
        registro_id: user.id,
      })
    }
    pb.authStore.clear()
    setUser(null)

    // Limpeza de segurança: descarta chaves com conteúdo clínico sensível eventualmente presentes em storage
    try {
      if (typeof window !== 'undefined') {
        const limparChavesClinicas = (storage: Storage) => {
          const chavesParaRemover: string[] = []
          for (let i = 0; i < storage.length; i++) {
            const k = storage.key(i)
            if (k) {
              const kLower = k.toLowerCase()
              if (
                kLower.includes('paciente') ||
                kLower.includes('atendimento') ||
                kLower.includes('impresso') ||
                kLower.includes('clinico') ||
                kLower.includes('receita') ||
                kLower.includes('atestado') ||
                kLower.includes('laudo') ||
                kLower.includes('painel') ||
                kLower.includes('prontuario')
              ) {
                chavesParaRemover.push(k)
              }
            }
          }
          chavesParaRemover.forEach((k) => storage.removeItem(k))
        }

        if (window.sessionStorage) limparChavesClinicas(window.sessionStorage)
        if (window.localStorage) limparChavesClinicas(window.localStorage)
      }
    } catch {
      /* intentionally ignored */
    }
  }

  const temPermissao = (perfisPermitidos: UserRole[]): boolean => {
    if (!user) return false
    // Administrador tem acesso irrestrito
    if (user.role === 'admin') return true
    return perfisPermitidos.includes(user.role)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && pb.authStore.isValid,
        isLoading,
        login,
        logout,
        temPermissao,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider')
  }
  return context
}
