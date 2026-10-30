import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types/hospital'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Hospital,
  Flame,
  Bed,
  Stethoscope,
  Users,
  ClipboardList,
  Calendar,
  Sliders,
  BarChart3,
  FileText,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Pill,
  FolderOpen,
  FlaskConical,
  Scissors,
} from 'lucide-react'

export type ActiveTab =
  | 'dashboard'
  | 'pronto_atendimento'
  | 'centro_cirurgico'
  | 'prontuario_same'
  | 'exames_laudos'
  | 'farmacia'
  | 'pacientes'
  | 'profissionais'
  | 'setores_leitos'
  | 'agendamentos'
  | 'internacao'
  | 'assistencial'
  | 'relatorios'
  | 'integracoes'
  | 'auditoria'
interface NavItem {
  id: ActiveTab
  label: string
  icon: React.ComponentType<{ className?: string }>
  allowedRoles: UserRole[]
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Visão Geral',
    icon: Hospital,
    allowedRoles: ['admin', 'gestor'],
  },
  {
    id: 'pronto_atendimento',
    label: 'Pronto Atendimento (PA)',
    icon: Flame,
    allowedRoles: ['admin', 'gestor', 'profissional', 'recepcao'],
  },
  {
    id: 'centro_cirurgico',
    label: 'Centro Cirúrgico',
    icon: Scissors,
    allowedRoles: ['admin', 'gestor', 'profissional', 'recepcao'],
  },
  {
    id: 'prontuario_same',
    label: 'Prontuário (SAME)',
    icon: FolderOpen,
    allowedRoles: ['admin', 'gestor', 'profissional'],
  },
  {
    id: 'exames_laudos',
    label: 'Exames & Laudos',
    icon: FlaskConical,
    allowedRoles: ['admin', 'gestor', 'profissional', 'recepcao'],
  },
  {
    id: 'farmacia',
    label: 'Farmácia & Dispensação',
    icon: Pill,
    allowedRoles: ['admin', 'gestor', 'recepcao'],
  },
  {
    id: 'agendamentos',
    label: 'Agendamento Ambulatorial',
    icon: Calendar,
    allowedRoles: ['admin', 'gestor', 'recepcao'],
  },
  {
    id: 'internacao',
    label: 'Mapa de Leitos & Internação',
    icon: Bed,
    allowedRoles: ['admin', 'gestor', 'profissional'],
  },
  {
    id: 'assistencial',
    label: 'Registro Assistencial / Prontuário',
    icon: Stethoscope,
    allowedRoles: ['admin', 'gestor', 'profissional'],
  },
  {
    id: 'pacientes',
    label: 'Cadastro de Pacientes',
    icon: Users,
    allowedRoles: ['admin', 'gestor', 'recepcao'],
  },
  {
    id: 'profissionais',
    label: 'Profissionais de Saúde',
    icon: ClipboardList,
    allowedRoles: ['admin', 'gestor'],
  },
  {
    id: 'setores_leitos',
    label: 'Setores & Parametrização',
    icon: Sliders,
    allowedRoles: ['admin', 'gestor'],
  },
  {
    id: 'relatorios',
    label: 'Relatórios & Ocupação',
    icon: BarChart3,
    allowedRoles: ['admin', 'gestor'],
  },
  {
    id: 'integracoes',
    label: 'Integrações (CNES / e-SUS)',
    icon: FileText,
    allowedRoles: ['admin', 'gestor'],
  },
  {
    id: 'auditoria',
    label: 'Trilha de Auditoria',
    icon: ShieldCheck,
    allowedRoles: ['admin'],
  },
]

interface NavigationBarProps {
  activeTab: ActiveTab
  onSelectTab: (tab: ActiveTab) => void
}

export const NavigationBar: React.FC<NavigationBarProps> = ({ activeTab, onSelectTab }) => {
  const { user, logout, temPermissao } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const roleLabels: Record<UserRole, { name: string; color: string }> = {
    admin: { name: 'Administrador', color: 'bg-purple-900/60 text-purple-200 border-purple-700' },
    gestor: { name: 'Gestor da Saúde', color: 'bg-blue-900/60 text-blue-200 border-blue-700' },
    profissional: {
      name: 'Profissional de Saúde',
      color: 'bg-emerald-900/60 text-emerald-200 border-emerald-700',
    },
    recepcao: {
      name: 'Recepção / Triagem',
      color: 'bg-amber-900/60 text-amber-200 border-amber-700',
    },
  }

  const userRole = user?.role || 'recepcao'
  const roleInfo = roleLabels[userRole]

  const visibleItems = NAV_ITEMS.filter((item) => temPermissao(item.allowedRoles))

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Hospital className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">SGH Municipal</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  v0.0.10
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Secretaria Municipal de Saúde • Mirante da Serra - RO
              </p>
            </div>
          </div>

          {/* Desktop User Info & Actions */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm font-semibold text-white">{user?.name}</span>
                <Badge variant="outline" className={`text-[11px] px-2 py-0.5 ${roleInfo.color}`}>
                  {roleInfo.name}
                </Badge>
              </div>
              <div className="text-xs text-slate-400">
                {user?.cargo || user?.email}
                {user?.registro_profissional ? ` • ${user.registro_profissional}` : ''}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              Sair
            </Button>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex lg:hidden items-center gap-2">
            <Badge variant="outline" className={`text-[10px] ${roleInfo.color}`}>
              {roleInfo.name}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-300"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Desktop Nav Items */}
        <div className="hidden lg:flex items-center gap-1 border-t border-slate-800/80 py-1.5 overflow-x-auto scrollbar-none">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-2">
          <div className="pb-2 border-b border-slate-800 text-xs text-slate-300">
            Conectado como <strong className="text-white">{user?.name}</strong> ({roleInfo.name})
          </div>
          <div className="grid grid-cols-1 gap-1">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const active = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id)
                    setMobileMenuOpen(false)
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                    active
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              )
            })}
          </div>
          <div className="pt-2 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="w-full border-red-900/50 bg-red-950/20 text-red-300 hover:bg-red-900/40"
            >
              <LogOut className="w-4 h-4 mr-2" /> Encerrar Sessão
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
