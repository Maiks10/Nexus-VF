import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, User, Palette, Shield, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export function SettingsPanel() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    notifications: { email: true, push: false },
    theme: 'dark',
    profile: { name: 'Admin', email: 'admin@crmpro.com' }
  });

  const handleSave = () => {
    toast({
      title: "Configurações Salvas!",
      description: "Suas preferências foram atualizadas com sucesso.",
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Configurações</h1>
        <p className="text-gray-400">Personalize e gerencie as configurações do seu CRM</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-effect border-white/10">
            <CardHeader className="flex flex-row items-center gap-4">
              <User className="w-6 h-6 text-purple-400" />
              <CardTitle className="text-white">Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-gray-300">Nome</Label>
                <Input id="name" defaultValue={settings.profile.name} className="bg-white/5 border-white/10" />
              </div>
              <div>
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input id="email" type="email" defaultValue={settings.profile.email} className="bg-white/5 border-white/10" />
              </div>
              <Button variant="outline" className="w-full border-white/10">Alterar Senha</Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-effect border-white/10">
            <CardHeader className="flex flex-row items-center gap-4">
              <Bell className="w-6 h-6 text-purple-400" />
              <CardTitle className="text-white">Notificações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notifications" className="text-gray-300">Notificações por Email</Label>
                <Switch id="email-notifications" defaultChecked={settings.notifications.email} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="push-notifications" className="text-gray-300">Notificações Push</Label>
                <Switch id="push-notifications" defaultChecked={settings.notifications.push} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="new-lead-notifications" className="text-gray-300">Alertas de Novo Lead</Label>
                <Switch id="new-lead-notifications" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-effect border-white/10">
            <CardHeader className="flex flex-row items-center gap-4">
              <Palette className="w-6 h-6 text-purple-400" />
              <CardTitle className="text-white">Aparência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-400">Atualmente, apenas o tema escuro está disponível. Mais temas em breve!</p>
              <div className="p-4 bg-slate-800 rounded-lg text-center">
                  <span className="text-white font-medium">Tema Escuro (Ativo)</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-gradient-to-r from-purple-500 to-pink-500">
          <Save className="w-4 h-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}