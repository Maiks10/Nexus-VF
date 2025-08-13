
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Thermometer, DollarSign } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { ClientFormDialog } from '@/components/Clients/ClientFormDialog';

const columnsConfig = {
  new_lead: { name: 'Novo Lead', color: 'bg-blue-500' },
  contacted: { name: 'Contactado', color: 'bg-purple-500' },
  proposal: { name: 'Proposta', color: 'bg-yellow-500' },
  negotiation: { name: 'Negociação', color: 'bg-orange-500' },
  won: { name: 'Ganho', color: 'bg-green-500' },
  lost: { name: 'Perdido', color: 'bg-red-500' },
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

  const fetchClients = async () => {
    const { data, error } = await supabase.from('clients').select('*');
    if (error) {
      toast({ title: 'Erro ao buscar clientes', description: error.message, variant: 'destructive' });
      return;
    }

    const newBoardData = Object.keys(columnsConfig).reduce((acc, key) => {
      acc[key] = { name: columnsConfig[key].name, items: [] };
      return acc;
    }, {});

    data.forEach(client => {
      const stage = client.kanban_stage || 'new_lead';
      if (newBoardData[stage]) {
        newBoardData[stage].items.push(client);
      }
    });

    setBoardData(newBoardData);
    setIsReady(true);
  };

  useEffect(() => {
    fetchClients();
  }, []);
  
  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    const startCol = boardData[source.droppableId];
    const endCol = boardData[destination.droppableId];
    
    const startItems = Array.from(startCol.items);
    const [movedItem] = startItems.splice(source.index, 1);
    
    const newBoardData = { ...boardData };

    if (source.droppableId === destination.droppableId) {
      startItems.splice(destination.index, 0, movedItem);
      newBoardData[source.droppableId] = {
        ...startCol,
        items: startItems,
      };
    } else {
      const endItems = Array.from(endCol.items);
      endItems.splice(destination.index, 0, movedItem);
      newBoardData[source.droppableId] = {
        ...startCol,
        items: startItems,
      };
      newBoardData[destination.droppableId] = {
        ...endCol,
        items: endItems,
      };
    }
    
    setBoardData(newBoardData);

    const { error } = await supabase
        .from('clients')
        .update({ kanban_stage: destination.droppableId })
        .eq('id', draggableId);

    if (error) {
        toast({ title: 'Erro ao mover cliente', description: error.message, variant: 'destructive' });
        fetchClients(); // Revert on error
    } else {
        toast({ title: `Cliente movido para ${columnsConfig[destination.droppableId].name}` });
    }
  };

  if (!isReady) {
    return <div className="text-white">Carregando Kanban...</div>;
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                        <h3 className="font-semibold text-white">{column.name}</h3>
                      </div>
                      <Badge variant="secondary">{column.items.length}</Badge>
                    </div>
                    <div className="space-y-4 min-h-[400px]">
                      {column.items.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                // This ensures the dragged item appears on top
                                zIndex: snapshot.isDragging ? 1000 : 'auto',
                              }}
                            >
                              <motion.div
                                className={`glass-effect border-white/10 p-4 rounded-lg shadow-lg ${snapshot.isDragging ? 'border-purple-500 ring-2 ring-purple-500' : ''}`}
                                whileHover={{ scale: 1.03 }}
                              >
                                <div className="flex justify-between items-start">
                                  <p className="font-bold text-white">{item.name}</p>
                                </div>
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
      <ClientFormDialog isOpen={isClientDialogOpen} onClose={(shouldRefetch) => {setIsClientDialogOpen(false); if(shouldRefetch) fetchClients();}} client={null} />
    </>
  );
}
