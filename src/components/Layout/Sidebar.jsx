import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, MessageSquare, Bot, Workflow, Mail, Smartphone, Settings, Zap, Target, Trello, Calendar, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
const menuItems = [{
  icon: LayoutDashboard,
  label: 'Dashboard',
  id: 'dashboard'
}, {
  icon: Trello,
  label: 'Kanban',
  id: 'kanban'
}, {
  icon: Users,
  label: 'Clientes',
  id: 'clients'
}, {
  icon: MessageSquare,
  label: 'Atendimentos',
  id: 'support'
}, {
  icon: Calendar,
  label: 'Agendamentos',
  id: 'scheduling'
}, {
  icon: Share2,
  label: 'Social',
  id: 'social'
}, {
  icon: Bot,
  label: 'Agentes IA',
  id: 'ai-agents'
}, {
  icon: Workflow,
  label: 'Funil Builder',
  id: 'funnel-builder'
}, {
  icon: Mail,
  label: 'Email Marketing',
  id: 'email-marketing'
}, {
  icon: Smartphone,
  label: 'WhatsApp',
  id: 'whatsapp'
}, {
  icon: Zap,
  label: 'Integrações',
  id: 'integrations'
}, {
  icon: Settings,
  label: 'Configurações',
  id: 'settings'
}];
export function Sidebar({
  activeSection,
  onSectionChange
}) {
  return <motion.div initial={{
    x: -300
  }} animate={{
    x: 0
  }} className="w-64 h-screen glass-effect border-r border-white/10 p-6 fixed left-0 top-0 z-40">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
          <Target className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold gradient-text">Nexus Flow</h1>
          <p className="text-xs text-gray-400">CRM Solutions</p>
        </div>
      </div>

      <nav className="space-y-2">
        {menuItems.map(item => <Button key={item.id} variant={activeSection === item.id ? "default" : "ghost"} className={`w-full justify-start gap-3 h-12 ${activeSection === item.id ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`} onClick={() => onSectionChange(item.id)}>
            <item.icon className="w-5 h-5" />
            {item.label}
          </Button>)}
      </nav>

      <div className="absolute bottom-6 left-6 right-6">
        <div className="glass-effect p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium">Admin</p>
              <p className="text-xs text-gray-400">Online</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>;
}