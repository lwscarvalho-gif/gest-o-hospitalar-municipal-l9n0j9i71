import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LoginView } from '@/components/LoginView'
import { NavigationBar, ActiveTab } from '@/components/NavigationBar'
import { DashboardView } from '@/components/DashboardView'
import { PacientesView } from '@/components/PacientesView'
import { ProfissionaisView } from '@/components/ProfissionaisView'
import { SetoresLeitosView } from '@/components/SetoresLeitosView'
import { AgendamentosView } from '@/components/AgendamentosView'
import { InternacaoView } from '@/components/InternacaoView'
import { AssistencialView } from '@/components/AssistencialView'
import { RelatoriosView } from '@/components/RelatoriosView'
import { IntegracoesView } from '@/components/IntegracoesView'
import { AuditoriaView } from '@/components/AuditoriaView'
import { Loader2 } from 'lucide-react'

const Index: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const [focoInternacaoId, setFocoInternacaoId] = useState<string | undefined>(undefined)
  const [focoPacienteId, setFocoPacienteId] = useState<string | undefined>(undefined)

  // 1. Loading inicial de checagem de sessão
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm">Iniciando Sistema de Gestão Hospitalar...</p>
      </div>
    )
  }

  // 2. Não autenticado: Exigir login obrigatório (Critério de Aceitação 1: nada é público)
  if (!isAuthenticated) {
    return <LoginView onSuccess={() => setActiveTab('dashboard')} />
  }

  // 3. Usuário autenticado: renderizar visão conforme aba selecionada e perfil
  const handleAbrirEvolucaoDireta = (internacaoId: string, pacienteId: string) => {
    setFocoInternacaoId(internacaoId)
    setFocoPacienteId(pacienteId)
    setActiveTab('assistencial')
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <NavigationBar activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
        {activeTab === 'pacientes' && <PacientesView />}
        {activeTab === 'profissionais' && <ProfissionaisView />}
        {activeTab === 'setores_leitos' && <SetoresLeitosView />}
        {activeTab === 'agendamentos' && <AgendamentosView />}
        {activeTab === 'internacao' && (
          <InternacaoView onAbrirEvolucao={handleAbrirEvolucaoDireta} />
        )}
        {activeTab === 'assistencial' && (
          <AssistencialView internacaoIdFoco={focoInternacaoId} pacienteIdFoco={focoPacienteId} />
        )}
        {activeTab === 'relatorios' && <RelatoriosView />}
        {activeTab === 'integracoes' && <IntegracoesView />}
        {activeTab === 'auditoria' && <AuditoriaView />}
      </main>

      {/* Rodapé institucional */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>
            Prefeitura Municipal de Saúde • Mirante da Serra - RO • Sistema Hospitalar Fase 1
          </span>
          <span className="text-slate-400">
            Acesso em nuvem seguro • Usuário: {user?.name} ({user?.role})
          </span>
        </div>
      </footer>
    </div>
  )
}

export default Index
