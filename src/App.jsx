// src/App.jsx
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
import { useAuth } from '@/contexts/SupabaseAuthContext';
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
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-gray-400">Visão geral do seu CRM</p>
            </div>
            <StatsCards />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <RecentActivity />
              <div className="space-y-6">
                <div className="glass-effect border-white/10 p-6 rounded-xl">
                  <h3 className="text-white font-semibold mb-4">Conversas Por Canal</h3>
                  <div className="space-y-3">
                    {[
                      { channel: 'WhatsApp', value: '45%', color: 'bg-green-500' },
                      { channel: 'Facebook', value: '25%', color: 'bg-blue-500' },
                      { channel: 'Instagram', value: '18%', color: 'bg-pink-500' },
                      { channel: 'Telegram', value: '12%', color: 'bg-sky-500' },
                    ].map((item) => (
                      <div key={item.channel} className="flex items-center justify-between">
                        <span className="text-gray-300">{item.channel}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${item.color} rounded-full`}
                              style={{ width: item.value }}
                            />
                          </div>
                          <span className="text-white text-sm">{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'kanban':
        return <KanbanBoard />;
      case 'clients':
        return <ClientsTable />;
      case 'support':
        return <SupportChat />;
      case 'team-chat':
        return <TeamChat />;
      case 'scheduling':
        return <Scheduling />;
      case 'social':
        return <SocialManager />;
      case 'ai-agents':
        return <AgentsList />;
      case 'funnel-builder':
        return <FunnelCanvas />;
      case 'email-marketing':
        return <EmailCampaigns />;
      case 'whatsapp':
        return <WhatsAppIntegration />;
      case 'integrations':
        return <IntegrationsPanel />;
      case 'settings':
        return <SettingsPanel />;
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
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-white animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return <CrmApp />;
}

export default App;
