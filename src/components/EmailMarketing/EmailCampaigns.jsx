
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Send, Eye, Edit, BarChart3, Users, Mail, Clock, Inbox } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const mockCampaigns = [
  { id: 1, name: 'Newsletter Mensal - Janeiro', subject: 'Novidades incríveis para você!', status: 'Enviada', sent: 1247, opened: 892, clicked: 234, date: '2024-01-15' },
  { id: 2, name: 'Promoção Black Friday', subject: 'Descontos imperdíveis até 70% OFF', status: 'Rascunho', sent: 0, opened: 0, clicked: 0, date: '2024-01-10' },
  { id: 3, name: 'Boas-vindas Novos Clientes', subject: 'Bem-vindo à nossa família!', status: 'Ativa', sent: 156, opened: 134, clicked: 67, date: '2024-01-12' }
];

const mockInbox = [
  { id: 1, from: 'cliente@example.com', subject: 'Re: Novidades incríveis para você!', snippet: 'Gostaria de saber mais sobre o produto X...', read: false },
  { id: 2, from: 'lead@example.com', subject: 'Dúvida sobre a promoção', snippet: 'Ainda está valendo o desconto de Black Friday?', read: true },
]

const EmailConfigForm = () => {
    const { toast } = useToast();
    const handleSubmit = (e) => {
        e.preventDefault();
        toast({ title: 'Configurações Salvas!', description: 'Sua conta de email foi configurada.' });
    }
    return (
        <Card className="glass-effect border-white/10">
            <CardHeader><CardTitle className="text-white">Configurar Conta de Envio</CardTitle></CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-sm text-gray-400">Configure seu provedor de email para enviar campanhas e receber respostas.</p>
                    <Input placeholder="Seu Nome (Ex: João da Silva)" className="bg-white/5 border-white/10" />
                    <Input placeholder="seuemail@provedor.com" type="email" className="bg-white/5 border-white/10" />
                    <Input placeholder="Usuário SMTP" className="bg-white/5 border-white/10" />
                    <Input placeholder="Senha SMTP" type="password" className="bg-white/5 border-white/10" />
                    <Button type="submit" className="bg-gradient-to-r from-green-500 to-emerald-500">Salvar Configuração</Button>
                </form>
            </CardContent>
        </Card>
    );
}

export function EmailCampaigns() {
  const [campaigns] = useState(mockCampaigns);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', subject: '', content: '', audience: '' });
  const { toast } = useToast();

  const handleCreateCampaign = () => {
    if (!newCampaign.name || !newCampaign.subject) {
      toast({ title: "Campos obrigatórios", description: "Preencha o nome e assunto da campanha", variant: "destructive" });
      return;
    }
    toast({ title: "🚧 Funcionalidade não implementada" });
    setShowCreateForm(false);
    setNewCampaign({ name: '', subject: '', content: '', audience: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Email Marketing</h2>
          <p className="text-gray-400">Crie, gerencie suas campanhas e interaja com as respostas</p>
        </div>
      </div>

       <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/5">
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="inbox">Caixa de Entrada</TabsTrigger>
          <TabsTrigger value="config">Configuração de Envio</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Suas Campanhas</h3>
                <Button onClick={() => setShowCreateForm(true)} className="bg-gradient-to-r from-purple-500 to-pink-500">
                    <Plus className="w-4 h-4 mr-2" /> Nova Campanha
                </Button>
            </div>
            {showCreateForm && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="my-6">
                <Card className="glass-effect border-white/10">
                    <CardHeader><CardTitle className="text-white">Criar Nova Campanha</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {/* Form content remains the same */}
                       <Input placeholder="Nome da Campanha" value={newCampaign.name} onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})} className="bg-white/5 border-white/10" />
                       <Input placeholder="Assunto do Email" value={newCampaign.subject} onChange={(e) => setNewCampaign({...newCampaign, subject: e.target.value})} className="bg-white/5 border-white/10" />
                       <Select onValueChange={(value) => setNewCampaign({...newCampaign, audience: value})}>
                          <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Selecione o público" /></SelectTrigger>
                          <SelectContent><SelectItem value="all">Todos</SelectItem></SelectContent>
                       </Select>
                       <Textarea placeholder="Conteúdo do email" value={newCampaign.content} onChange={(e) => setNewCampaign({...newCampaign, content: e.target.value})} className="bg-white/5 border-white/10 min-h-[120px]" />
                       <div className="flex gap-2">
                           <Button onClick={handleCreateCampaign} className="bg-gradient-to-r from-purple-500 to-pink-500">Salvar Rascunho</Button>
                           <Button variant="outline" onClick={() => setShowCreateForm(false)} className="border-white/10">Cancelar</Button>
                       </div>
                    </CardContent>
                </Card>
                </motion.div>
            )}
             <Card className="glass-effect border-white/10 mt-6">
                <CardContent className="pt-6 space-y-4">
                {campaigns.map((campaign) => (
                    <motion.div key={campaign.id} className="glass-effect border-white/5 p-4 rounded-lg">
                        {/* Campaign list item content remains the same */}
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-white font-medium">{campaign.name}</h3>
                                <p className="text-gray-400 text-sm">{campaign.subject}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost"><Eye className="w-4 h-4" /></Button>
                                <Button size="sm" variant="ghost"><Edit className="w-4 h-4" /></Button>
                                <Button size="sm" className="bg-green-500"><Send className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    </motion.div>
                ))}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="inbox" className="mt-6">
            <Card className="glass-effect border-white/10">
                <CardHeader><CardTitle className="text-white flex items-center gap-2"><Inbox/> Caixa de Entrada</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {mockInbox.map(email => (
                            <div key={email.id} className={`p-3 rounded-lg flex items-center gap-4 ${!email.read ? 'bg-white/10' : 'bg-white/5'}`}>
                                <div className={`w-2 h-2 rounded-full ${!email.read ? 'bg-purple-400' : 'bg-transparent'}`}></div>
                                <div className="w-32 truncate"><p className="text-white font-medium">{email.from}</p></div>
                                <div className="flex-1 truncate">
                                    <span className="text-gray-300">{email.subject} - </span>
                                    <span className="text-gray-400">{email.snippet}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="config" className="mt-6">
            <EmailConfigForm />
        </TabsContent>

      </Tabs>
    </div>
  );
}
