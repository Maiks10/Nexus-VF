import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommentFeed } from '@/components/Social/CommentFeed'; // Importando nosso feed
import { List, Settings, Repeat } from 'lucide-react';

export function SocialManager() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800/50 text-gray-400">
          <TabsTrigger value="feed"><List className="w-4 h-4 mr-2" /> Feed e Comentários</TabsTrigger>
          <TabsTrigger value="automations"><Repeat className="w-4 h-4 mr-2" /> Automações</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" /> Configurações</gITabsTrigger>
        </TabsList>
        
        {/* Aba de Feed e Comentários */}
        <TabsContent value="feed" className="mt-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Caixa de Entrada Social</h1>
              <p className="text-gray-400 mt-2">Gerencie todos os seus comentários, menções e mensagens em um único lugar.</p>
            </div>

            {/* AQUI ESTÁ A MÁGICA: Exibindo nosso componente de feed de comentários */}
            <CommentFeed />

          </div>
        </TabsContent>
        
        {/* Aba de Automações (ainda sem conteúdo) */}
        <TabsContent value="automations" className="mt-6">
          <div className="text-center p-8 glass-effect rounded-lg">
            <h3 className="text-xl font-semibold text-white">Automações em Breve</h3>
            <p className="text-gray-400 mt-2">Aqui você poderá criar gatilhos e fluxos para responder automaticamente aos seus clientes.</p>
          </div>
        </TabsContent>

        {/* Aba de Configurações (ainda sem conteúdo) */}
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