import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, MessageSquare, Bot, Workflow, Smartphone, Settings, Zap, TrendingUp, CheckSquare, Calendar, Share2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Menu principal
const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: TrendingUp, label: 'Kanban', id: 'kanban' },
  { icon: CheckSquare, label: 'Tarefas', id: 'tasks' },
  { icon: Users, label: 'Clientes', id: 'clients' },
  { icon: MessageSquare, label: 'Atendimentos', id: 'support' },
  { icon: Share2, label: 'Social', id: 'social' },
  { icon: Calendar, label: 'Agendamentos', id: 'scheduling' },
  { icon: Workflow, label: 'Funil Builder', id: 'funnel-builder' },
  { icon: Bot, label: 'Agentes IA', id: 'ai-agents' },
  { icon: TrendingUp, label: 'Gestão ADS', id: 'traffic' },
  { icon: Smartphone, label: 'WhatsApp', id: 'whatsapp' },
  { icon: Zap, label: 'Integrações', id: 'integrations' },
];

export function Sidebar({ activeSection, onSectionChange, onSignOut }) {
  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className="w-64 h-screen glass-effect border-r border-white/10 p-6 fixed left-0 top-0 z-40 flex flex-col"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold gradient-text">Nexus Flow</h1>
          <p className="text-xs text-gray-400">CRM Solutions</p>
        </div>
      </div>

      {/* Menu Principal */}
      <nav className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={activeSection === item.id ? 'default' : 'ghost'}
            className={`w-full justify-start gap-3 h-12 ${activeSection === item.id
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            onClick={() => onSectionChange(item.id)}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Button>
        ))}
      </nav>

      {/* Separador */}
      <div className="border-t border-white/10 my-4" />

      {/* Menu Inferior */}
      <div className="space-y-2">
        <Button
          variant={activeSection === 'settings' ? 'default' : 'ghost'}
          className={`w-full justify-start gap-3 h-12 ${activeSection === 'settings'
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
            : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          onClick={() => onSectionChange('settings')}
        >
          <Settings className="w-5 h-5" />
          Configurações
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-12 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={onSignOut}
        >
          <LogOut className="w-5 h-5" />
          Sair
        </Button>
      </div>
    </motion.div>
  );
}