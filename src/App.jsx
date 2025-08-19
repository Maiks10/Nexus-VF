import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/Layout/Sidebar';
import { StatsCards } from '@/components/Dashboard/StatsCards';
import { RecentActivity } from '@/components/Dashboard/RecentActivity';
import { ClientsTable } from '@/components/Clients/ClientsTable';
import { SupportChat } from '@/components/Support/SupportChat';
import { AgentsList } from '@/components/AIAgents/AgentsList';
import { FunnelCanvas } from '@/components/FunnelBuilder/FunnelCanvas';
import { EmailCampaigns } from '@/components/EmailMarketing/EmailCampaigns';
import { WhatsAppIntegration } from '@/components/WhatsApp/WhatsAppIntegration';
import { IntegrationsPanel } from '@/components/Integrations/IntegrationsPanel';
import { KanbanBoard } from '@/components/Kanban/KanbanBoard';
import { Scheduling } from '@/components/Scheduling/Scheduling';
import { SocialManager } from '@/components/Social/SocialManager';
import { SettingsPanel } from '@/components/Settings/SettingsPanel';
import { TeamChat } from '@/components/TeamChat/TeamChat';
import { useAuth } from '@/contexts/AuthContext'; // CORREÇÃO: Usando o novo AuthContext
import { LoginPage } from '@/components/Auth/LoginPage';
import { Loader2 } from 'lucide-react';

// lista “oficial” de seções válidas para evitar estados inválidos
const VALID_SECTIONS = new Set([
  'dashboard',
  'kanban',
  'clients',
  'support',
  'team-chat',
  'scheduling',
  'social',
  'ai-agents',
  'funnel-builder',
  'email-marketing',
  'whatsapp',
  'integrations',
  'settings'
]);

// pega seção de 3 lugares (hash > localStorage > fallback)
function getInitialSection() {
  const hash = (window.location.hash || '').replace(/^#/, '').trim();
  if (hash && VALID_SECTIONS.has(hash)) return hash;

  const saved = localStorage.getItem('nf:activeSection');
  if (saved && VALID_SECTIONS.has(saved)) return saved;

  return 'dashboard';
}

function CrmApp() {
  const [activeSection, setActiveSection] = useState(getInitialSection());
  const { signOut } = useAuth();

  // sempre que a seção muda: salvar no localStorage e no hash
  useEffect(() => {
    localStorage.setItem('nf:activeSection', activeSection);
    if (window.location.hash.replace(/^#/, '') !== activeSection) {
      window.location.hash = activeSection; // permite link direto / compartilhável
    }
  }, [activeSection]);

  // escuta mudanças do hash (ex.: F5 ou link colado /#support)
  useEffect(() => {
    const onHashChange = () => {
      const hash = (window.location.hash || '').replace(/^#/, '').trim();
      if (hash && VALID_SECTIONS.has(hash) && hash !== activeSection) {
        setActiveSection(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [activeSection]);

  const renderContent = () => {
    // CORREÇÃO TEMPORÁRIA: Todas as seções renderizam o Dashboard para evitar erros.
    switch (activeSection) {
      case 'dashboard':
      case 'kanban':
      case 'clients':
      case 'support':
      case 'team-chat':
      case 'scheduling':
      case 'social':
      case 'ai-agents':
      case 'funnel-builder':
      case 'email-marketing':
      case 'whatsapp':
      case 'integrations':
      case 'settings':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-gray-400">Visão geral do seu CRM</p>
            </div>
            <StatsCards />
            <RecentActivity />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Helmet>
        <title>Nexus Flow - CRM Solutions</title>
        <meta
          name="description"
          content="Sistema CRM completo com atendimento automatizado via IA, funil builder, email marketing, integração WhatsApp e muito mais."
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onSignOut={signOut}
        />

        <main className="ml-64 p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </>
  );
}

function App() {
  const { isAuthenticated, loading } = useAuth(); // CORREÇÃO: Usando 'isAuthenticated' do nosso novo contexto

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-white animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) { // CORREÇÃO: Verificando se o usuário está autenticado
    return <LoginPage />;
  }

  return <CrmApp />;
}

export default App;