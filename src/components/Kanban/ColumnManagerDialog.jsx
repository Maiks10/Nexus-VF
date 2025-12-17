import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, GripVertical, Edit2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import apiClient from '@/lib/customSupabaseClient';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

// Cores disponíveis para seleção
const AVAILABLE_COLORS = [
    { name: 'Roxo', value: '#a78bfa' },
    { name: 'Azul', value: '#60a5fa' },
    { name: 'Verde', value: '#34d399' },
    { name: 'Amarelo', value: '#fbbf24' },
    { name: 'Laranja', value: '#f59e0b' },
    { name: 'Vermelho', value: '#ef4444' },
    { name: 'Rosa', value: '#f472b6' },
    { name: 'Indigo', value: '#818cf8' },
];

export function ColumnManagerDialog({ isOpen, onClose, columns, onSuccess }) {
    const [localColumns, setLocalColumns] = useState([]);
    const [editingColumn, setEditingColumn] = useState(null);
    const [newColumnTitle, setNewColumnTitle] = useState('');
    const [newColumnColor, setNewColumnColor] = useState('#a78bfa');
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setLocalColumns(columns || []);
        }
    }, [isOpen, columns]);

    const handleCreateColumn = async () => {
        if (!newColumnTitle.trim()) {
            toast({ title: 'Título obrigatório', variant: 'destructive' });
            return;
        }

        if (localColumns.length >= 10) {
            toast({ title: 'Limite de 10 colunas atingido', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        try {
            const response = await apiClient.post('/api/kanban/columns', {
                title: newColumnTitle,
                color: newColumnColor,
            });

            setLocalColumns([...localColumns, response.data]);
            setNewColumnTitle('');
            setNewColumnColor('#a78bfa');
            toast({ title: 'Coluna criada!', className: 'bg-green-600 border-none text-white' });
            onSuccess?.();
        } catch (error) {
            toast({
                title: 'Erro ao criar coluna',
                description: error.response?.data?.message || 'Erro desconhecido',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateColumn = async (columnId) => {
        if (!editingColumn) return;

        setIsLoading(true);
        try {
            const response = await apiClient.put(`/api/kanban/columns/${columnId}`, {
                title: editingColumn.title,
                color: editingColumn.color,
            });

            setLocalColumns(localColumns.map(col => col.id === columnId ? response.data : col));
            setEditingColumn(null);
            toast({ title: 'Coluna atualizada!', className: 'bg-green-600 border-none text-white' });
            onSuccess?.();
        } catch (error) {
            toast({ title: 'Erro ao atualizar coluna', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteColumn = async (columnId) => {
        if (localColumns.length <= 1) {
            toast({ title: 'Não é possível deletar a última coluna', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        try {
            await apiClient.delete(`/api/kanban/columns/${columnId}`);
            setLocalColumns(localColumns.filter(col => col.id !== columnId));
            toast({ title: 'Coluna deletada!', className: 'bg-green-600 border-none text-white' });
            onSuccess?.();
        } catch (error) {
            toast({ title: 'Erro ao deletar coluna', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragEnd = async (result) => {
        if (!result.destination) return;

        const items = Array.from(localColumns);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setLocalColumns(items);

        // Salvar nova ordem no backend
        try {
            await apiClient.put('/api/kanban/columns/reorder', {
                columnIds: items.map(col => col.id),
            });
            toast({ title: 'Ordem atualizada!', className: 'bg-green-600 border-none text-white' });
            onSuccess?.();
        } catch (error) {
            toast({ title: 'Erro ao reordenar colunas', variant: 'destructive' });
            // Reverter mudança
            setLocalColumns(columns);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="glass-effect border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                        Gerenciar Colunas do Kanban
                    </DialogTitle>
                    <p className="text-sm text-gray-400 mt-2">
                        Arraste para reordenar • Máximo de 10 colunas
                    </p>
                </DialogHeader>

                {/* Lista de colunas existentes */}
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="columns">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 my-4">
                                {localColumns.map((column, index) => (
                                    <Draggable key={column.id} draggableId={column.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`p-4 rounded-lg border ${snapshot.isDragging ? 'border-purple-500 bg-purple-900/20' : 'border-white/10 bg-black/20'
                                                    } flex items-center gap-3`}
                                            >
                                                <div {...provided.dragHandleProps}>
                                                    <GripVertical className="w-5 h-5 text-gray-400 cursor-grab active:cursor-grabbing" />
                                                </div>

                                                {editingColumn?.id === column.id ? (
                                                    <>
                                                        <Input
                                                            value={editingColumn.title}
                                                            onChange={(e) => setEditingColumn({ ...editingColumn, title: e.target.value })}
                                                            className="flex-1 bg-white/5 border-white/10"
                                                        />
                                                        <select
                                                            value={editingColumn.color}
                                                            onChange={(e) => setEditingColumn({ ...editingColumn, color: e.target.value })}
                                                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white"
                                                        >
                                                            {AVAILABLE_COLORS.map(c => (
                                                                <option key={c.value} value={c.value}>{c.name}</option>
                                                            ))}
                                                        </select>
                                                        <Button size="sm" onClick={() => handleUpdateColumn(column.id)} disabled={isLoading}>
                                                            Salvar
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingColumn(null)}>
                                                            Cancelar
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div
                                                            className="w-4 h-4 rounded-full"
                                                            style={{ backgroundColor: column.color }}
                                                        />
                                                        <span className="flex-1 font-medium">{column.title}</span>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => setEditingColumn(column)}
                                                            className="h-8 w-8"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteColumn(column.id)}
                                                            disabled={localColumns.length <= 1 || isLoading}
                                                            className="h-8 w-8 text-red-400 hover:text-red-300"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                {/* Adicionar nova coluna */}
                {localColumns.length < 10 && (
                    <div className="p-4 rounded-lg border border-dashed border-purple-500/50 bg-purple-500/5">
                        <Label className="text-sm text-gray-300 mb-2 block">Nova Coluna</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nome da coluna..."
                                value={newColumnTitle}
                                onChange={(e) => setNewColumnTitle(e.target.value)}
                                className="flex-1 bg-white/5 border-white/10"
                            />
                            <select
                                value={newColumnColor}
                                onChange={(e) => setNewColumnColor(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
                            >
                                {AVAILABLE_COLORS.map(c => (
                                    <option key={c.value} value={c.value}>{c.name}</option>
                                ))}
                            </select>
                            <Button onClick={handleCreateColumn} disabled={isLoading} className="bg-gradient-to-r from-purple-500 to-pink-500">
                                <Plus className="w-4 h-4 mr-1" />
                                Adicionar
                            </Button>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
