import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Bot, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { AgentFormDialog } from './AgentFormDialog';

export function AgentsList() {
  const [agents, setAgents] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const { toast } = useToast();

  const fetchAgents = async () => {
    const { data, error } = await supabase.from('ai_agents').select('*');
    if (error) {
      toast({ title: 'Erro ao buscar agentes', description: error.message, variant: 'destructive' });
    } else {
      setAgents(data);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleToggleAgent = async (agent) => {
    const newStatus = !agent.is_active;
    const { error } = await supabase
      .from('ai_agents')
      .update({ is_active: newStatus })
      .eq('id', agent.id);

    if (error) {
      toast({ title: 'Erro ao atualizar agente', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Agente ${newStatus ? 'ativado' : 'desativado'}` });
      fetchAgents();
    }
  };

  const handleCreateAgent = () => {
    setSelectedAgent(null);
    setIsDialogOpen(true);
  };

  const handleConfigureAgent = (agent) => {
    setSelectedAgent(agent);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (shouldRefetch) => {
    setIsDialogOpen(false);
    setSelectedAgent(null);
    if (shouldRefetch) {
      fetchAgents();
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Agentes de IA</h2>
            <p className="text-gray-400">Gerencie seus assistentes virtuais personalizados</p>
          </div>
          <Button onClick={handleCreateAgent} className="bg-gradient-to-r from-purple-500 to-pink-500">
            <Plus className="w-4 h-4 mr-2" />
            Criar Agente
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-effect border-white/10 hover:border-white/20 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        agent.is_active 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                          : 'bg-gray-600'
                      }`}>
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg">{agent.name}</CardTitle>
                        <p className="text-sm text-gray-400">{agent.provider}</p>
                      </div>
                    </div>
                    <Switch 
                      checked={agent.is_active}
                      onCheckedChange={() => handleToggleAgent(agent)}
                    />
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-gray-300 text-sm h-10 truncate">{agent.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                      {agent.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-white/10">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 border-white/10"
                      onClick={() => handleConfigureAgent(agent)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configurar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
      <AgentFormDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        agent={selectedAgent}
      />
    </>
  );
}