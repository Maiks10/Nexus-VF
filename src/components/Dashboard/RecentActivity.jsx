
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User, Bot, Mail } from 'lucide-react';

const activities = [
  {
    id: 1,
    type: 'message',
    title: 'Nova mensagem de João Silva',
    description: 'Cliente interessado no produto Premium',
    time: '2 min atrás',
    icon: MessageSquare,
    status: 'pending'
  },
  {
    id: 2,
    type: 'client',
    title: 'Novo cliente cadastrado',
    description: 'Maria Santos se registrou na plataforma',
    time: '15 min atrás',
    icon: User,
    status: 'success'
  },
  {
    id: 3,
    type: 'bot',
    title: 'Agente IA respondeu automaticamente',
    description: 'Bot de vendas atendeu 5 clientes',
    time: '1 hora atrás',
    icon: Bot,
    status: 'info'
  },
  {
    id: 4,
    type: 'email',
    title: 'Campanha de email enviada',
    description: 'Newsletter mensal para 1.2K contatos',
    time: '2 horas atrás',
    icon: Mail,
    status: 'success'
  }
];

export function RecentActivity() {
  return (
    <Card className="glass-effect border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          Atividade Recente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              activity.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
              activity.status === 'success' ? 'bg-green-500/20 text-green-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              <activity.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium">{activity.title}</p>
              <p className="text-gray-400 text-sm">{activity.description}</p>
              <p className="text-gray-500 text-xs mt-1">{activity.time}</p>
            </div>
            <Badge variant={activity.status === 'pending' ? 'secondary' : 'default'}>
              {activity.status === 'pending' ? 'Pendente' : 
               activity.status === 'success' ? 'Concluído' : 'Ativo'}
            </Badge>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
