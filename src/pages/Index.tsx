import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LoginView } from '@/components/LoginView'
import { NavigationBar, ActiveTab } from '@/components/NavigationBar'
import { PainelGestaoView } from '@/components/PainelGestaoView'
import { DashboardView } from '@/components/DashboardView'
import { ProntoAtendimentoView } from '@/components/ProntoAtendimentoView'
import { PacientesView } from '@/components/PacientesView'
import { ProfissionaisView } from '@/components/ProfissionaisView'
import { SetoresLeitosView } from '@/components/SetoresLeitosView'
import { AgendamentosView } from '@/components/AgendamentosView'
import { InternacaoView } from '@/components/InternacaoView'
import { AssistencialView } from '@/components/AssistencialView'
import { RelatoriosView } from '@/components/RelatoriosView'
import { IntegracoesView } from '@/components/IntegracoesView'
import { AuditoriaView } from '@/components/AuditoriaView'
import { FarmaciaView } from '@/components/FarmaciaView'
import { ProntuarioSAMEView } from '@/components/ProntuarioSAMEView'
import { ExamesLaudosView } from '@/components/ExamesLaudosView'
import { CentroCirurgicoView } from '@/components/CentroCirurgicoView'
import { CentroObstetricoView } from '@/components/CentroObstetricoView'
import { FaturamentoView } from '@/components/FaturamentoView'
import { VigilanciaSaudeView } from '@/components/VigilanciaSaudeView'
import { RegulacaoView } from '@/components/RegulacaoView'
import { verificarInvariantesFuncionais } from '@/tests'
import { Loader2 } from 'lucide-react'

// Mapeamento de tela inicial padrão conforme o perfil do operador
const getDefaultTabForRole = (role?: string): ActiveTab => {
  switch (role) {
    case 'admin':
      return 'painel_gestao' // administrador -> painel de gestão em tempo real
    case 'gestor':
      return 'painel_gestao' // gestor -> painel de gestão em tempo real
    case 'profissional':
      return 'assistencial' // profissional -> registro assistencial/mapa de leitos
    case 'recepcao':
      return 'pronto_atendimento' // recepção -> pronto atendimento / triagem / agendamento
    default:
      return 'pronto_atendimento'
  }
}

const Index: React.FC = () => {
  const { isAuthenticated, isLoading, user, temPermissao } = useAuth()
  const [activeTab, setActiveTab] = useState<ActiveTab>('pronto_atendimento')
  const [focoInternacaoId, setFocoInternacaoId] = useState<string | undefined>(undefined)
  const [focoPacienteId, setFocoPacienteId] = useState<string | undefined>(undefined)

  // Ao carregar o usuário, redirecionar automaticamente para a sua área de trabalho
  React.useEffect(() => {
    if (user?.role) {
      setActiveTab(getDefaultTabForRole(user.role))
    }
  }, [user?.role])

  // 1. Loading inicial de checagem de sessão
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm">Iniciando Sistema de Gestão Hospitalar...</p>
      </div>
    )
  }

  // 2. Não autenticado: Exigir login obrigatório (nada é público)
  if (!isAuthenticated) {
    return (
      <LoginView
        onSuccess={() => {
          if (user?.role) {
            setActiveTab(getDefaultTabForRole(user.role))
          }
        }}
      />
    )
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
        {activeTab === 'painel_gestao' &&
          temPermissao(['admin', 'gestor', 'profissional', 'recepcao']) && (
            <PainelGestaoView onNavegar={setActiveTab} />
          )}
        {activeTab === 'pronto_atendimento' && (
          <ProntoAtendimentoView
            onNavegarInternacao={() => setActiveTab('internacao')}
            onNavegarAgendamento={() => setActiveTab('agendamentos')}
          />
        )}
        {activeTab === 'regulacao' &&
          temPermissao(['admin', 'gestor', 'profissional', 'recepcao']) && (
            <RegulacaoView
              onNavegarSAME={(pacienteId) => {
                if (pacienteId) setFocoPacienteId(pacienteId)
                setActiveTab('prontuario_same')
              }}
            />
          )}
        {activeTab === 'centro_cirurgico' &&
          temPermissao(['admin', 'gestor', 'profissional', 'recepcao']) && <CentroCirurgicoView />}
        {activeTab === 'centro_obstetrico' &&
          temPermissao(['admin', 'gestor', 'profissional', 'recepcao']) && (
            <CentroObstetricoView
              onNavegarSAME={(pacienteId) => {
                if (pacienteId) setFocoPacienteId(pacienteId)
                setActiveTab('prontuario_same')
              }}
            />
          )}
        {activeTab === 'vigilancia_saude' &&
          temPermissao(['admin', 'gestor', 'profissional', 'recepcao']) && (
            <VigilanciaSaudeView
              onNavegarSAME={(pacienteId) => {
                if (pacienteId) setFocoPacienteId(pacienteId)
                setActiveTab('prontuario_same')
              }}
            />
          )}
        {activeTab === 'prontuario_same' && temPermissao(['admin', 'gestor', 'profissional']) && (
          <ProntuarioSAMEView pacienteIdInicial={focoPacienteId} />
        )}
        {activeTab === 'faturamento_sus' &&
          temPermissao(['admin', 'gestor', 'profissional', 'recepcao']) && <FaturamentoView />}
        {activeTab === 'exames_laudos' &&
          temPermissao(['admin', 'gestor', 'profissional', 'recepcao']) && <ExamesLaudosView />}
        {activeTab === 'farmacia' && temPermissao(['admin', 'gestor', 'recepcao']) && (
          <FarmaciaView />
        )}
        {activeTab === 'dashboard' && temPermissao(['admin', 'gestor']) && (
          <DashboardView onNavigate={setActiveTab} />
        )}
        {activeTab === 'pacientes' && temPermissao(['admin', 'gestor', 'recepcao']) && (
          <PacientesView />
        )}
        {activeTab === 'profissionais' && temPermissao(['admin', 'gestor']) && (
          <ProfissionaisView />
        )}
        {activeTab === 'setores_leitos' && temPermissao(['admin', 'gestor']) && (
          <SetoresLeitosView />
        )}
        {activeTab === 'agendamentos' && temPermissao(['admin', 'gestor', 'recepcao']) && (
          <AgendamentosView />
        )}
        {activeTab === 'internacao' && temPermissao(['admin', 'gestor', 'profissional']) && (
          <InternacaoView onAbrirEvolucao={handleAbrirEvolucaoDireta} />
        )}
        {activeTab === 'assistencial' && temPermissao(['admin', 'gestor', 'profissional']) && (
          <AssistencialView internacaoIdFoco={focoInternacaoId} pacienteIdFoco={focoPacienteId} />
        )}
        {activeTab === 'relatorios' && temPermissao(['admin', 'gestor']) && <RelatoriosView />}
        {activeTab === 'integracoes' && temPermissao(['admin', 'gestor']) && <IntegracoesView />}
        {activeTab === 'auditoria' && temPermissao(['admin']) && <AuditoriaView />}
      </main>

      {/* Rodapé institucional */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>
            Prefeitura Municipal de Saúde • Mirante da Serra - RO • Sistema Hospitalar v0.0.28
            (Gestão Hospitalar, Conferência de Consistência Faturamento SUS SIH/AIH & SIA/BPA, Fuso
            IANA Operacional)
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
