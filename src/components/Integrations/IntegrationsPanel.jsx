import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Settings, CheckCircle, AlertCircle, Facebook, ShoppingCart, Instagram, Send as TelegramIcon, Calendar, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { IntegrationConfigDialog } from './IntegrationConfigDialog';

const initialIntegrations = [
  { id: 'evolution_api', name: 'Evolution API (WhatsApp)', description: 'Conecte o WhatsApp via API não-oficial Evolution.', icon: Zap, color: 'from-green-500 to-teal-500', fields: [{name: 'Evolution API URL', type:'text'}, {name: 'API Key', type: 'password'}] },
  { 
    id: 'meta_business', 
    name: 'Facebook & Instagram', 
    description: 'Conecte suas contas para gerenciar mensagens e comentários.', 
    icon: Facebook,
    color: 'from-blue-600 to-purple-500',
    fields: [{name: 'Conectar com Facebook & Instagram', type: 'oauth_button'}] 
  },
  { id: 'telegram', name: 'Telegram', description: 'Conecte seu bot do Telegram para atendimento automatizado.', icon: TelegramIcon, color: 'from-sky-400 to-blue-500', fields: [{name: 'Bot Token', type:'password'}] },
  { id: 'google_calendar', name: 'Google Calendar', description: 'Agende reuniões e eventos diretamente na agenda.', icon: Calendar, color: 'from-blue-500 to-green-500', fields: [{name: 'OAuth Connection', type: 'button'}] },
  { id: 'kiwify', name: 'Kiwify', description: 'Receba notificações de vendas da Kiwify.', icon: ShoppingCart, color: 'from-green-600 to-green-700', fields: [{name: 'Webhook URL', type: 'copy'}, {name: 'API Key', type: 'password'}]},
  { id: 'hotmart', name: 'Hotmart', description: 'Receba notificações de vendas da Hotmart.', icon: ShoppingCart, color: 'from-orange-600 to-orange-700', fields: [{name: 'Webhook URL', type: 'copy'}, {name: 'Hottok', type: 'password'}] },
  { id: 'green', name: 'Green', description: 'Plataforma de produtos digitais.', icon: ShoppingCart, color: 'from-emerald-600 to-teal-700', fields: [{name: 'Webhook URL', type: 'copy'}, {name: 'API Token', type: 'password'}] },
  { id: 'ticto', name: 'Ticto', description: 'Plataforma para infoprodutores.', icon: ShoppingCart, color: 'from-indigo-500 to-violet-600', fields: [{name: 'Webhook URL', type: 'copy'}, {name: 'API Key', type: 'password'}] },
  { id: 'kirvano', name: 'Kirvano', description: 'Plataforma de vendas online.', icon: ShoppingCart, color: 'from-rose-500 to-pink-600', fields: [{name: 'Webhook URL', type: 'copy'}, {name: 'API Token', type: 'password'}] },
  { id: 'cakto', name: 'Cakto', description: 'Plataforma de afiliados e infoprodutos.', icon: ShoppingCart, color: 'from-cyan-500 to-sky-600', fields: [{name: 'Webhook URL', type: 'copy'}, {name: 'Token', type: 'password'}] },
];

export function IntegrationsPanel() {
  const [integrationsList, setIntegrationsList] = useState(initialIntegrations.map(i => ({...i, isConnected: false, isConfigured: false})));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const { toast } = useToast();

  // ALTERADO: Lógica para lidar com o retorno do Facebook
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const metaAction = urlParams.get('meta_action');
    const error = urlParams.get('error');

    if (metaAction === 'select_page') {
      const connectionId = urlParams.get('connection_id');
      const metaIntegration = integrationsList.find(i => i.id === 'meta_business');
      if (metaIntegration) {
        // Abre o dialog passando o ID da conexão para ele buscar as páginas
        setSelectedIntegration({ ...metaIntegration, connection_id_for_selection: connectionId });
        setIsDialogOpen(true);
      }
    } else if (error) {
      toast({
        title: "Erro na Integração",
        description: error,
        variant: "destructive"
      });
    }
    
    // Limpa a URL para não executar a ação novamente
    if (metaAction || error) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [toast]); // Dependência de 'toast' apenas

  const handleToggleIntegration = (integrationId) => {
    const integration = integrationsList.find(i => i.id === integrationId);
    if (!integration.isConfigured && !integration.isConnected) {
      toast({ title: "Configuração necessária", description: `Por favor, configure a integração ${integration.name} antes de ativá-la.`, variant: "destructive" });
      return;
    }
    setIntegrationsList(integrationsList.map(int => 
      int.id === integrationId ? { ...int, isConnected: !int.isConnected } : int
    ));
    toast({
      title: `${integration.name} ${!integration.isConnected ? 'conectado' : 'desconectado'}`,
      description: `Integração ${!integration.isConnected ? 'ativada' : 'desativada'} com sucesso`
    });
  };

  const handleConfigureIntegration = (integration) => {
    setSelectedIntegration(integration);
    setIsDialogOpen(true);
  };

  // ALTERADO: Lógica para fechar o dialog e atualizar o status
  const handleDialogClose = (isSuccess) => {
    if (isSuccess) {
      toast({
        title: "Integração Concluída!",
        description: "Sua conta foi conectada com sucesso.",
      });
      setIntegrationsList(prev => prev.map(int => 
        int.id === 'meta_business' ? { ...int, isConfigured: true, isConnected: true } : int
      ));
    }
    setIsDialogOpen(false);
    setSelectedIntegration(null);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Integrações</h2>
            <p className="text-gray-400">Conecte suas plataformas favoritas para automatizar tudo</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {integrationsList.filter(i => i.isConnected).length} de {integrationsList.length} ativas
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrationsList.map((integration, index) => (
            <motion.div key={integration.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="glass-effect border-white/10 hover:border-white/20 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 bg-gradient-to-r ${integration.color} rounded-xl flex items-center justify-center`}>
                        <integration.icon className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-white text-lg">{integration.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {integration.isConnected ? <CheckCircle className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5 text-gray-400" />}
                      <Switch checked={integration.isConnected} onCheckedChange={() => handleToggleIntegration(integration.id)} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-400 h-10">{integration.description}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <Badge variant={integration.isConfigured ? 'default' : 'secondary'}>{integration.isConfigured ? 'Configurado' : 'Não Configurado'}</Badge>
                    <Button variant="outline" size="sm" onClick={() => handleConfigureIntegration(integration)} className="border-white/10"><Settings className="w-4 h-4 mr-2" />Configurar</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
      {selectedIntegration && (
        <IntegrationConfigDialog isOpen={isDialogOpen} onClose={handleDialogClose} integration={selectedIntegration} />
      )}
    </>
  );
}