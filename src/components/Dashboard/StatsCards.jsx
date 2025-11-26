import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, Target } from 'lucide-react';
import apiClient from '@/lib/customSupabaseClient';

export function StatsCards() {
  const [stats, setStats] = useState([
    { title: 'Vendas Hoje', value: 'R$ 0,00', change: '0%', icon: DollarSign, color: 'from-green-500 to-emerald-500' },
    { title: 'Investimento Ads', value: 'R$ 0,00', change: '0%', icon: Target, color: 'from-red-500 to-orange-500' },
    { title: 'ROAS', value: '0x', change: '0%', icon: TrendingUp, color: 'from-blue-500 to-cyan-500' },
    { title: 'Leads Hoje', value: '0', change: '0%', icon: Users, color: 'from-purple-500 to-pink-500' }
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get('/api/dashboard/roi');
        const data = response.data;

        setStats([
          {
            title: 'Vendas Hoje',
            value: `R$ ${data.sales_today.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            change: '+0%', // Calcular variação real depois
            icon: DollarSign,
            color: 'from-green-500 to-emerald-500'
          },
          {
            title: 'Investimento Ads',
            value: `R$ ${data.spend_today.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            change: '+0%',
            icon: Target,
            color: 'from-red-500 to-orange-500'
          },
          {
            title: 'ROAS',
            value: `${data.roas}x`,
            change: '+0%',
            icon: TrendingUp,
            color: 'from-blue-500 to-cyan-500'
          },
          {
            title: 'Leads Hoje',
            value: data.leads_today,
            change: '+0%',
            icon: Users,
            color: 'from-purple-500 to-pink-500'
          }
        ]);
      } catch (error) {
        console.error('Erro ao buscar stats:', error);
      }
    };

    fetchStats();
  }, []);

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
                  {/* <p className={`text-sm ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'} mt-1`}>{stat.change} vs ontem</p> */}
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