import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, Folder, MoreHorizontal, Trash2, Loader2, Zap, ZapOff } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

function FunnelList({ funnels, onSelectFunnel, onCreateFunnel, onDeleteFunnel, isLoading }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');

  const handleCreate = async () => {
    if (!newFunnelName) return;
    const success = await onCreateFunnel(newFunnelName);
    if (success) {
      setIsDialogOpen(false);
      setNewFunnelName('');
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Estratégias de Funil</h2>
            <p className="text-gray-400">Crie e gerencie suas estratégias de conversão</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-purple-500 to-pink-500">
            <Plus className="w-4 h-4 mr-2" /> Nova Estratégia
          </Button>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {funnels.map(funnel => (
              <motion.div key={funnel.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="glass-effect border-white/10 hover:border-purple-500 transition-all group flex flex-col justify-between h-full">
                    <div onClick={() => onSelectFunnel(funnel)} className="cursor-pointer">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                            <div className="p-3 bg-purple-500/10 rounded-lg">
                                <Folder className="w-8 h-8 text-purple-400" />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-8 h-8 opacity-50 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="glass-effect border-white/10 text-white">
                                <DropdownMenuItem onClick={(e) => {e.stopPropagation(); onDeleteFunnel(funnel.id)}} className="text-red-400 focus:bg-red-500/20 focus:text-red-400">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Deletar
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <h3 className="text-white font-semibold truncate">{funnel.name}</h3>
                            {/* ----- CORREÇÃO AQUI: Lendo a contagem do lugar certo ----- */}
                            <p className="text-gray-400 text-sm">{funnel.config?.nodes?.length || 0} Nós</p>
                        </CardContent>
                    </div>
                    <div className="p-4 pt-0">
                         {funnel.is_active ?
                            <span className='flex items-center text-xs text-green-400'><Zap className="w-3 h-3 mr-1" /> Ativo</span> :
                            <span className='flex items-center text-xs text-yellow-400'><ZapOff className="w-3 h-3 mr-1" /> Inativo</span>
                        }
                    </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-effect border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Criar Nova Estratégia de Funil</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome da Estratégia (ex: Remarketing Clientes)"
            value={newFunnelName}
            onChange={(e) => setNewFunnelName(e.target.value)}
            className="bg-white/5"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} className="bg-gradient-to-r from-purple-500 to-pink-500">Criar e Editar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FunnelList;