import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  MoreHorizontal,
  DollarSign,
  MessageCircle,
  CalendarClock,
  Filter,
  ArrowUpRight,
  Settings
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import apiClient from '@/lib/customSupabaseClient';
import { ClientFormDialog } from '@/components/Clients/ClientFormDialog';
import { ColumnManagerDialog } from './ColumnManagerDialog';

// --- CONFIGURAÇÃO DE TEMPERATURA ---
const temperatureColors = {
  hot: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
  warm: 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]',
  cold: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]',
};

// --- HELPERS ---
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

const getInitials = (name) => {
  if (!name) return '??';
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const formatDateRelative = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Agora mesmo';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m atrás`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`;
  return `${Math.floor(diffInSeconds / 86400)}d atrás`;
};

export function KanbanBoard() {
  const [columns, setColumns] = useState([]);
  const [boardData, setBoardData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [isReady, setIsReady] = useState(false);
  const { toast } = useToast();
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Carregar colunas do banco
  const fetchColumns = async () => {
    try {
      const response = await apiClient.get('/api/kanban/columns');
      setColumns(response.data);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao carregar colunas', variant: 'destructive' });
    }
  };

  const fetchClients = async () => {
    try {
      const response = await apiClient.get('/api/clients');
      const clients = response.data;

      // Organizar clients por coluna
      const newBoardData = {};

      columns.forEach(col => {
        newBoardData[col.id] = {
          id: col.id,
          title: col.title,
          color: col.color,
          position: col.position,
          items: []
        };
      });

      clients.forEach(client => {
        // Encontrar coluna pelo ID ou title (fallback para migração)
        const targetColumn = columns.find(col =>
          col.id === client.kanban_column_id ||
          col.title === client.kanban_stage
        );

        if (targetColumn && newBoardData[targetColumn.id]) {
          newBoardData[targetColumn.id].items.push(client);
        } else if (columns.length > 0) {
          // Fallback: primeira coluna
          newBoardData[columns[0].id].items.push(client);
        }
      });

      setBoardData(newBoardData);
      setOriginalData(newBoardData);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    fetchColumns();
  }, []);

  useEffect(() => {
    if (columns.length > 0) {
      fetchClients();
    }
  }, [columns]);

  // FILTRO EM TEMPO REAL
  useEffect(() => {
    if (!searchQuery.trim()) {
      setBoardData(originalData);
      return;
    }

    const filtered = Object.keys(originalData).reduce((acc, key) => {
      acc[key] = {
        ...originalData[key],
        items: originalData[key].items?.filter(item =>
          item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.phone?.includes(searchQuery)
        ) || []
      };
      return acc;
    }, {});

    setBoardData(filtered);
  }, [searchQuery, originalData]);

  const onDragEnd = async (result) => {
    setIsDragging(false);
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Atualização Otimista
    const startCol = boardData[source.droppableId];
    const endCol = boardData[destination.droppableId];
    const startItems = Array.from(startCol.items);
    const [movedItem] = startItems.splice(source.index, 1);

    // Atualiza o item movido com o novo status
    const updatedItem = { ...movedItem, kanban_column_id: destination.droppableId };

    const newBoard = { ...boardData };

    if (source.droppableId === destination.droppableId) {
      startItems.splice(destination.index, 0, updatedItem);
      newBoard[source.droppableId] = { ...startCol, items: startItems };
    } else {
      const endItems = Array.from(endCol.items);
      endItems.splice(destination.index, 0, updatedItem);
      newBoard[source.droppableId] = { ...startCol, items: startItems };
      newBoard[destination.droppableId] = { ...endCol, items: endItems };
    }

    setBoardData(newBoard);

    try {
      await apiClient.patch(`/api/clients/${draggableId}/stage`, {
        kanban_stage: endCol.title, // Salvar título como fallback
      });

      const destColumn = columns.find(c => c.id === destination.droppableId);
      toast({
        title: 'Movido com sucesso!',
        description: `${updatedItem.name || 'Cliente'} agora está em ${destColumn?.title || 'nova coluna'}`,
        className: "bg-green-600 border-none text-white"
      });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao mover card', variant: 'destructive' });
      fetchClients(); // Reverte
    }
  };

  // NAVEGAÇÃO INTERNA PARA O CHAT
  const handleChatClick = (phone) => {
    if (!phone) return;
    // Salva o telefone no localStorage para a aba de chat ler e abrir automaticamente
    // Formato limpo: apenas números
    const cleanPhone = phone.replace(/\D/g, '');
    localStorage.setItem('nf:chat_target', cleanPhone);

    // Navega para a aba de atendimentos
    window.location.hash = '#support';
  };

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        <p className="text-gray-400 animate-pulse">Carregando seu fluxo de vendas...</p>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          /* Estilo Global da Scrollbar para este componente */
          .custom-scrollbar::-webkit-scrollbar,
          .kanban-board-container::-webkit-scrollbar {
            width: 8px;   /* Vertical */
            height: 8px;  /* Horizontal */
          }
          
          .custom-scrollbar::-webkit-scrollbar-track,
          .kanban-board-container::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb,
          .kanban-board-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 4px;
            border: 1px solid rgba(0,0,0,0.1);
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb:hover,
          .kanban-board-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
          }

          /* Esconder scrollbar padrão se necessário em mobile, mas manter em desktop com estilo */
          @media (max-width: 768px) {
            .kanban-board-container::-webkit-scrollbar {
              display: none;
            }
          }
        `}
      </style>
      <div className="flex flex-col h-full space-y-6 overflow-hidden">

        {/* --- HEADER DO KANBAN --- */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-black/20 p-6 rounded-2xl backdrop-blur-sm border border-white/5">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Pipeline de Vendas
            </h1>
            <p className="text-gray-400 mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Gerencie seus leads e negociações em tempo real
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative group w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
              <Input
                placeholder="Buscar cliente..."
                className="pl-10 bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500/50 focus:ring-purple-500/20 transition-all rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button
              onClick={() => setIsColumnManagerOpen(true)}
              variant="outline"
              className="border-white/10 hover:bg-white/10 rounded-xl h-10 px-4"
              title="Gerenciar Colunas"
            >
              <Settings className="w-4 h-4 mr-2" />
              Colunas
            </Button>

            <Button
              onClick={() => setIsClientDialogOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/20 rounded-xl px-6 h-10 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Lead
            </Button>
          </div>
        </div>

        {/* --- BOARD --- */}
        <DragDropContext onDragStart={() => setIsDragging(true)} onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-x-auto pb-4 kanban-board-container">
            <div className="flex gap-6 min-w-max px-2 h-full">

              {Object.entries(boardData).map(([columnId, column]) => {
                // Calcular totais da coluna
                const totalValue = column.items?.reduce((sum, item) => sum + Number(item.value || 0), 0) || 0;
                const itemCount = column.items?.length || 0;

                return (
                  <Droppable key={columnId} droppableId={columnId}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`
                            flex flex-col w-80 rounded-2xl transition-all duration-300
                            ${snapshot.isDraggingOver ? 'bg-white/5 ring-1 ring-white/10' : 'bg-transparent'}
                        `}
                      >
                        {/* HEADER DA COLUNA */}
                        <div
                          className="p-4 rounded-t-2xl border-b border-white/5 backdrop-blur-md relative overflow-hidden group"
                          style={{
                            background: `linear-gradient(to bottom, ${column.color}33, ${column.color}11)`,
                            borderColor: `${column.color}80`
                          }}
                        >
                          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="flex justify-between items-start mb-2 relative z-10">
                            <h3 className="font-bold text-white text-lg tracking-wide">{column.title}</h3>
                            <Badge className="bg-black/40 text-white border-none backdrop-blur-sm">{itemCount}</Badge>
                          </div>
                          <div className="flex justify-between items-end relative z-10">
                            <span className="text-xs text-white/60 font-medium">Leads: {itemCount}</span>
                            <span className="text-sm font-bold text-white/90 font-mono tracking-tight">
                              {totalValue > 0 ? formatCurrency(totalValue) : '-'}
                            </span>
                          </div>
                        </div>

                        {/* LISTA DE CARDS */}
                        <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
                          {column.items.map((item, index) => (
                            <Draggable key={item.id} draggableId={String(item.id)} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{ ...provided.draggableProps.style }}
                                >
                                  <motion.div
                                    layoutId={String(item.id)}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`
                                        group relative p-4 rounded-xl border backdrop-blur-md transition-all duration-200
                                        ${snapshot.isDragging
                                        ? 'bg-purple-900/40 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.4)] scale-105 rotate-2 z-50'
                                        : 'bg-black/40 border-white/5 hover:border-white/20 hover:bg-black/60 shadow-lg'
                                      }
                                    `}
                                  >

                                    {/* STATUS STRIP (Temperatura) */}
                                    <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${temperatureColors[item.temperature || 'cold']} opacity-60 group-hover:opacity-100 transition-opacity`}></div>

                                    <div className="pl-3">
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                          <Avatar className="h-9 w-9 border border-white/10 ring-2 ring-transparent group-hover:ring-white/10 transition-all">
                                            <AvatarImage src={item.avatar_url} />
                                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-xs font-bold">
                                              {getInitials(item.name)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <h4 className="font-semibold text-white text-sm leading-tight line-clamp-1">{item.name || 'Sem nome'}</h4>
                                            <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                              <CalendarClock className="w-3 h-3" />
                                              {formatDateRelative(item.created_at)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* INFO E TAGS */}
                                      <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                          <div className="flex items-center gap-1 text-green-400 font-bold text-sm bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20">
                                            <DollarSign className="w-3 h-3" />
                                            {item.value ? Number(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                                          </div>
                                        </div>

                                        {item.utms && (item.utms.source || item.utms.campaign) && (
                                          <div className="flex flex-wrap gap-1.5">
                                            {item.utms.source && (
                                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 uppercase tracking-wider font-semibold">
                                                {item.utms.source}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {/* HOVER ACTIONS */}
                                      <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                        {item.phone && (
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-colors"
                                            onClick={(e) => { e.stopPropagation(); handleChatClick(item.phone); }}
                                            title="Abrir Chat Integrado"
                                          >
                                            <MessageCircle className="w-4 h-4" />
                                          </Button>
                                        )}
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7 rounded-lg bg-white/5 text-gray-400 hover:bg-white/20 hover:text-white transition-colors"
                                          title="Ver Detalhes"
                                        >
                                          <ArrowUpRight className="w-4 h-4" />
                                        </Button>
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
                );
              })}
            </div>
          </div>
        </DragDropContext>
      </div>

      <ClientFormDialog
        isOpen={isClientDialogOpen}
        onClose={(shouldRefetch) => {
          setIsClientDialogOpen(false);
          if (shouldRefetch) fetchClients();
        }}
        client={null}
      />

      <ColumnManagerDialog
        isOpen={isColumnManagerOpen}
        onClose={() => setIsColumnManagerOpen(false)}
        columns={columns}
        onSuccess={() => {
          fetchColumns();
          fetchClients();
        }}
      />
    </>
  );
}