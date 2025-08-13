import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommentFeed } from '@/components/Social/CommentFeed';
import { List, Settings, Repeat, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// NOVO: Componente para criar uma nova automação
function AutomationCreator() {
  const [triggerName, setTriggerName] = useState('');
  const [keyword, setKeyword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveTrigger = (e) => {
    e.preventDefault();
    // A lógica para salvar no Supabase virá aqui no próximo passo
    console.log("Salvando gatilho:", { name: triggerName, keyword });
  };

  return (
    <Card className="glass-effect border-white/10 text-white">
      <CardHeader>
        <CardTitle>Criar Nova Automação</CardTitle>
        <CardDescription className="text-gray-400">
          Configure um gatilho para iniciar um fluxo de automação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSaveTrigger} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="trigger-name">Nome do Gatilho</Label>
            <Input 
              id="trigger-name"
              placeholder="Ex: Gatilho para a palavra 'quero'"
              value={triggerName}
              onChange={(e) => setTriggerName(e.target.value)}
              className="bg-white/5"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="keyword">Quando um comentário contiver a palavra-chave...</Label>
            <Input 
              id="keyword"
              placeholder="Ex: quero, eu quero, tenho interesse"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="bg-white/5"
            />
            <p className="text-xs text-gray-400">
              Você pode usar vírgulas para separar múltiplas palavras.
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-purple-500 to-pink-500">
              <PlusCircle className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Salvando...' : 'Salvar Gatilho'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


// Componente principal do Social Manager
export function SocialManager() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800/50 text-gray-400">
          <TabsTrigger value="feed"><List className="w-4 h-4 mr-2" /> Feed e Comentários</TabsTrigger>
          <TabsTrigger value="automations"><Repeat className="w-4 h-4 mr-2" /> Automações</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" /> Configurações</TabsTrigger>
        </TabsList>
        
        {/* Aba de Feed e Comentários (sem alterações) */}
        <TabsContent value="feed" className="mt-6">
          <CommentFeed />
        </TabsContent>
        
        {/* ATUALIZADO: Aba de Automações com a nova interface */}
        <TabsContent value="automations" className="mt-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Automações</h1>
              <p className="text-gray-400 mt-2">Crie fluxos de trabalho que rodam no piloto automático para economizar seu tempo.</p>
            </div>
            <AutomationCreator />
            {/* Aqui, no futuro, listaremos as automações já criadas */}
          </div>
        </TabsContent>

        {/* Aba de Configurações (sem alterações) */}
        <TabsContent value="settings" className="mt-6">
          <div className="text-center p-8 glass-effect rounded-lg">
            <h3 className="text-xl font-semibold text-white">Configurações em Breve</h3>
            <p className="text-gray-400 mt-2">Gerencie as configurações gerais da sua integração social aqui.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}