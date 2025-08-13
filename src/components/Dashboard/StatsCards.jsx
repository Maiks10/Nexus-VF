import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Users, MessageSquare, TrendingUp, Clock } from 'lucide-react';

const stats = [
  {
    title: 'Total de Clientes',
    value: '2,847',
    change: '+12%',
    icon: Users,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    title: 'Atendimentos Hoje',
    value: '156',
    change: '+8%',
    icon: MessageSquare,
    color: 'from-purple-500 to-pink-500'
  },
  {
    title: 'Tempo Médio de Atendimento',
    value: '5m 32s',
    change: '-3%',
    icon: Clock,
    color: 'from-orange-500 to-red-500'
  },
  {
    title: 'Taxa de Conversão',
    value: '68%',
    change: '+15%',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-500'
  }
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="glass-effect border-white/10 hover:border-white/20 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className={`text-sm ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'} mt-1`}>{stat.change} vs mês anterior</p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}