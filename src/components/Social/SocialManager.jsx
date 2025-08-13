import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Instagram, Facebook, Edit, Send, Bot, Image as ImageIcon, MessageSquare, Plus, Trash2, Clapperboard, Film, BookOpen, Send as SendIcon, ArrowDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { v4 as uuidv4 } from 'uuid';

const mockComments = [
  { id: 1, platform: 'instagram', username: 'user_insta', text: 'Que produto incrível! Qual o preço?', handled: false },
  { id: 2, platform: 'facebook', username: 'face_user', text: 'Tenho interesse!', handled: true, ai_reply: 'Olá! Que bom que tem interesse. Um de nossos consultores entrará em contato em breve.' },
  { id: 3, platform: 'instagram', username: 'cliente_feliz', text: 'Amei o serviço de vocês!', handled: false },
];

const postTypes = [
    { id: 'post', name: 'Post', icon: ImageIcon },
    { id: 'reels', name: 'Reels', icon: Clapperboard },
    { id: 'story', name: 'Story', icon: Film },
    { id: 'carousel', name: 'Carrossel', icon: BookOpen },
];

const availableActions = [
    { type: 'reply_comment', label: 'Responder Comentário', icon: MessageSquare },
    { type: 'send_dm', label: 'Enviar DM', icon: SendIcon },
];

function TriggerFunnelDialog({ isOpen, onClose, trigger, onSave }) {
    const [actions, setActions] = useState(trigger?.actions || []);

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const items = Array.from(actions);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setActions(items);
    };

    const addAction = (type) => {
        const actionInfo = availableActions.find(a => a.type === type);
        setActions([...actions, { id: uuidv4(), type: actionInfo.type, label: actionInfo.label, content: '' }]);
    };

    const removeAction = (id) => setActions(actions.filter(a => a.id !== id));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="glass-effect border-white/10 text-white max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Configurar Funil do Gatilho: "{trigger?.keyword}"</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="actions-droppable">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                        {actions.map((action, index) => (
                                            <Draggable key={action.id} draggableId={action.id} index={index}>
                                                {(provided) => (
                                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                                        <Card className="bg-white/10 p-3">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <p className="font-semibold">{action.label}</p>
                                                                <Button size="icon" variant="ghost" onClick={() => removeAction(action.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                                                            </div>
                                                            <Textarea placeholder={`Conteúdo para "${action.label}"`} className="bg-white/5" />
                                                        </Card>
                                                        {index < actions.length - 1 && <div className="flex justify-center my-1"><ArrowDown className="w-4 h-4 text-gray-400" /></div>}
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>
                    <div className="col-span-1 space-y-2">
                        <h4 className="font-semibold">Ações</h4>
                        {availableActions.map(action => (
                            <Button key={action.type} variant="outline" className="w-full justify-start gap-2" onClick={() => addAction(action.type)}>
                                <action.icon className="w-4 h-4" /> {action.label}
                            </Button>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={() => onSave(trigger.id, actions)} className="bg-gradient-to-r from-purple-500 to-pink-500">Salvar Funil</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function SocialManager() {
  const { toast } = useToast();
  const [triggers, setTriggers] = useState([]);
  const [newTriggerKeyword, setNewTriggerKeyword] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [selectedPostType, setSelectedPostType] = useState('post');
  const [isFunnelDialogOpen, setIsFunnelDialogOpen] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState(null);

  const handleAddTrigger = () => {
    if (!newTriggerKeyword) {
      toast({ title: "Preencha a palavra-chave", variant: "destructive" });
      return;
    }
    const newTrigger = { id: uuidv4(), keyword: newTriggerKeyword, actions: [] };
    setTriggers([...triggers, newTrigger]);
    setNewTriggerKeyword('');
    toast({ title: "Gatilho adicionado! Configure o funil." });
  };

  const handleRemoveTrigger = (id) => {
    setTriggers(triggers.filter(t => t.id !== id));
    toast({ title: "Gatilho removido", variant: "destructive" });
  };

  const openFunnelDialog = (trigger) => {
    setSelectedTrigger(trigger);
    setIsFunnelDialogOpen(true);
  };

  const handleSaveFunnel = (triggerId, actions) => {
    setTriggers(triggers.map(t => t.id === triggerId ? { ...t, actions } : t));
    setIsFunnelDialogOpen(false);
    toast({ title: "Funil do gatilho salvo!" });
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gerenciador Social</h1>
          <p className="text-gray-400">Crie, agende e publique seu conteúdo para redes sociais com IA</p>
        </div>

        <Tabs defaultValue="comments" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger value="create">Criar Post</TabsTrigger>
            <TabsTrigger value="comments">Comentários e Automação</TabsTrigger>
          </TabsList>
          <TabsContent value="create">
            {/* Create Post Content Here */}
          </TabsContent>
          <TabsContent value="comments">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
              <Card className="glass-effect border-white/10">
                <CardHeader><CardTitle className="text-white">Caixa de Entrada de Comentários</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {mockComments.map(comment => (
                    <div key={comment.id} className="p-3 bg-white/5 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {comment.platform === 'instagram' ? <Instagram className="w-4 h-4 text-pink-400" /> : <Facebook className="w-4 h-4 text-blue-400" />}
                          <span className="text-white font-semibold">{comment.username}</span>
                        </div>
                        <div className="flex items-center">
                          <Button size="sm" variant="ghost"><MessageSquare className="w-4 h-4 mr-2" /> Responder</Button>
                        </div>
                      </div>
                      <p className="text-gray-300 mt-2">{comment.text}</p>
                      {comment.handled && <p className="text-xs text-purple-300 mt-1 italic">IA respondeu: "{comment.ai_reply}"</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="glass-effect border-white/10">
                <CardHeader><CardTitle className="text-white">Automação de Respostas</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">Gatilhos por Palavra-chave</h4>
                    <div className="space-y-2">
                      {triggers.map(trigger => (
                        <div key={trigger.id} className="flex items-center justify-between p-2 bg-white/5 rounded">
                          <div className="truncate">
                            <p className="text-white font-mono text-sm">"{trigger.keyword}"</p>
                            <p className="text-gray-400 text-xs truncate">{trigger.actions.length} ações</p>
                          </div>
                          <div className="flex items-center">
                            <Button size="sm" variant="ghost" onClick={() => openFunnelDialog(trigger)}>Configurar</Button>
                            <Button size="icon" variant="ghost" onClick={() => handleRemoveTrigger(trigger.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 space-y-2 p-3 border-t border-white/10">
                        <Input placeholder="Palavra-chave. Ex: 'preço'" value={newTriggerKeyword} onChange={e => setNewTriggerKeyword(e.target.value)} className="bg-white/10" />
                        <Button onClick={handleAddTrigger} className="w-full"><Plus className="w-4 h-4 mr-2" /> Adicionar Gatilho</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {selectedTrigger && (
        <TriggerFunnelDialog 
            isOpen={isFunnelDialogOpen}
            onClose={() => setIsFunnelDialogOpen(false)}
            trigger={selectedTrigger}
            onSave={handleSaveFunnel}
        />
      )}
    </>
  );
}