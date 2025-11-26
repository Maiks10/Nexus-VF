import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Thermometer, DollarSign } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
// ALTERADO: Importando apiClient
import apiClient from '@/lib/customSupabaseClient';
import { ClientFormDialog } from '@/components/Clients/ClientFormDialog';

const columnsConfig = {
  new_lead: { name: 'Novo Lead (Frio)', color: 'bg-blue-500' },
  boleto: { name: 'Boleto Gerado', color: 'bg-yellow-500' },
  pix: { name: 'Pix Pendente', color: 'bg-orange-500' },
  checkout_abandoned: { name: 'Checkout Abandonado', color: 'bg-red-500' },
  student: { name: 'Aluno/Comprador', color: 'bg-green-500' },
};

const temperatureColors = {
  hot: 'bg-red-500',
  warm: 'bg-yellow-500',
  cold: 'bg-blue-500',
};

const initialBoardData = Object.keys(columnsConfig).reduce((acc, key) => {
  acc[key] = { name: columnsConfig[key].name, items: [] };
  return acc;
}, {});

export function KanbanBoard() {
  const [boardData, setBoardData] = useState(initialBoardData);
  const [isReady, setIsReady] = useState(false);
  const { toast } = useToast();
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);

  // ALTERADO: fetchClients agora usa apiClient
  const fetchClients = async () => {
    try {
      const response = await apiClient.get('/api/clients');
      const clients = response.data;

      const newBoardData = { ...initialBoardData };
      // Limpa os items antes de preencher
      Object.keys(newBoardData).forEach(key => {
        newBoardData[key].items = [];
      });

      clients.forEach(client => {
        const stage = client.kanban_stage || 'new_lead';
        if (newBoardData[stage]) {
          newBoardData[stage].items.push(client);
        }
      });

      setBoardData(newBoardData);
    } catch (error) {
      toast({ title: 'Erro ao buscar clientes', description: error.response?.data?.message, variant: 'destructive' });
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // ALTERADO: onDragEnd agora usa apiClient
  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Atualização otimista da UI
    const startCol = boardData[source.droppableId];
    const endCol = boardData[destination.droppableId];
    const startItems = Array.from(startCol.items);
    const [movedItem] = startItems.splice(source.index, 1);

    const newBoardData = { ...boardData };
    if (source.droppableId === destination.droppableId) {
      startItems.splice(destination.index, 0, movedItem);
      newBoardData[source.droppableId] = { ...startCol, items: startItems };
    } else {
      const endItems = Array.from(endCol.items);
      endItems.splice(destination.index, 0, movedItem);
      newBoardData[source.droppableId] = { ...startCol, items: startItems };
      newBoardData[destination.droppableId] = { ...endCol, items: endItems };
    }
    setBoardData(newBoardData);

    // Chamada à API para persistir a mudança
    try {
      await apiClient.patch(`/api/clients/${draggableId}/stage`, {
        kanban_stage: destination.droppableId,
      });
      toast({ title: `Cliente movido para ${columnsConfig[destination.droppableId].name}` });
    } catch (error) {
      toast({ title: 'Erro ao mover cliente', description: error.response?.data?.message, variant: 'destructive' });
      // Reverte a UI em caso de erro na API
      fetchClients();
    }
  };

  if (!isReady) {
    return <div className="flex justify-center items-center h-64 text-white">Carregando Kanban...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Kanban de Clientes</h1>
            <p className="text-gray-400">Gerencie o fluxo dos seus leads e clientes</p>
          </div>
          <Button className="bg-gradient-to-r from-purple-500 to-pink-500" onClick={() => setIsClientDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Lead
          </Button>
        </div>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(boardData).map(([columnId, column]) => (
              <Droppable key={columnId} droppableId={columnId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`glass-effect rounded-xl p-4 transition-colors ${snapshot.isDraggingOver ? 'bg-white/20' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${columnsConfig[columnId].color}`}></div>
                        <h3 className="font-semibold text-white text-sm">{column.name}</h3>
                      </div>
                      <Badge variant="secondary">{column.items.length}</Badge>
                    </div>
                    <div className="space-y-4 min-h-[400px]">
                      {column.items.map((item, index) => (
                        <Draggable key={item.id} draggableId={String(item.id)} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <motion.div
                                className={`glass-effect border-white/10 p-4 rounded-lg shadow-lg ${snapshot.isDragging ? 'border-purple-500 ring-2 ring-purple-500' : ''}`}
                                whileHover={{ scale: 1.03 }}
                              >
                                <div className="flex justify-between items-start">
                                  <p className="font-bold text-white">{item.name}</p>
                                </div>

                                {/* UTM Tags Display */}
                                {item.utms && (item.utms.source || item.utms.campaign) && (
                                  <div className="mt-2 mb-2 flex flex-wrap gap-1">
                                    {item.utms.source && <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-400">{item.utms.source}</Badge>}
                                    {item.utms.campaign && <Badge variant="outline" className="text-[10px] border-purple-500 text-purple-400">{item.utms.campaign}</Badge>}
                                  </div>
                                )}

                                <div className="flex items-center gap-4 text-sm text-gray-300 mt-2">
                                  <div className="flex items-center gap-1">
                                    <Thermometer className="w-4 h-4" />
                                    <div className={`w-3 h-3 rounded-full ${temperatureColors[item.temperature]}`}></div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="w-4 h-4" />
                                    <span>R$ {item.value || 0}</span>
                                  </div>
                                </div>
                              </motion.div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>
      <ClientFormDialog isOpen={isClientDialogOpen} onClose={(shouldRefetch) => { setIsClientDialogOpen(false); if (shouldRefetch) fetchClients(); }} client={null} />
    </>
  );
}