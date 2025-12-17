import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Plus, MoreVertical, Trash2, Edit2, CheckCircle2, Circle,
    Clock, AlertCircle, User, Calendar
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import apiClient from '@/lib/customSupabaseClient';

const PRIORITY_COLORS = {
    low: 'bg-gray-500/20 text-gray-300 border-gray-500/50',
    medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
    high: 'bg-red-500/20 text-red-300 border-red-500/50',
};

const PRIORITY_LABELS = {
    low: '🟢 Baixa',
    medium: '🟡 Média',
    high: '🔴 Alta',
};

export function TasksBoard() {
    const [lists, setLists] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [boardData, setBoardData] = useState({});
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [selectedList, setSelectedList] = useState(null);
    const [newListTitle, setNewListTitle] = useState('');
    const { toast } = useToast();

    // Form state
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        priority: 'medium',
        deadline: '',
    });

    useEffect(() => {
        fetchLists();
        fetchTasks();
    }, []);

    useEffect(() => {
        if (lists.length > 0 && tasks.length >= 0) {
            organizeTasks();
        }
    }, [lists, tasks]);

    const fetchLists = async () => {
        try {
            const response = await apiClient.get('/api/tasks/lists');
            setLists(response.data);
        } catch (error) {
            console.error(error);
            toast({ title: 'Erro ao carregar listas', variant: 'destructive' });
        }
    };

    const fetchTasks = async () => {
        try {
            const response = await apiClient.get('/api/tasks');
            setTasks(response.data);
        } catch (error) {
            console.error(error);
            toast({ title: 'Erro ao carregar tarefas', variant: 'destructive' });
        }
    };

    const organizeTasks = () => {
        const organized = {};
        lists.forEach(list => {
            organized[list.id] = {
                ...list,
                tasks: tasks.filter(t => t.list_id === list.id).sort((a, b) => a.position - b.position)
            };
        });
        setBoardData(organized);
    };

    const handleCreateList = async () => {
        if (!newListTitle.trim()) return;

        try {
            const response = await apiClient.post('/api/tasks/lists', { title: newListTitle });
            setLists([...lists, response.data]);
            setNewListTitle('');
            toast({ title: 'Lista criada!', className: 'bg-green-600 text-white border-none' });
        } catch (error) {
            toast({ title: 'Erro ao criar lista', variant: 'destructive' });
        }
    };

    const handleDeleteList = async (listId) => {
        try {
            await apiClient.delete(`/api/tasks/lists/${listId}`);
            setLists(lists.filter(l => l.id !== listId));
            toast({ title: 'Lista deletada!', className: 'bg-green-600 text-white border-none' });
        } catch (error) {
            toast({ title: 'Erro ao deletar lista', variant: 'destructive' });
        }
    };

    const handleOpenTaskDialog = (list, task = null) => {
        setSelectedList(list);
        setSelectedTask(task);
        if (task) {
            setTaskForm({
                title: task.title,
                description: task.description || '',
                priority: task.priority,
                deadline: task.deadline?.split('T')[0] || '',
            });
        } else {
            setTaskForm({ title: '', description: '', priority: 'medium', deadline: '' });
        }
        setIsTaskDialogOpen(true);
    };

    const handleSaveTask = async () => {
        if (!taskForm.title.trim()) return;

        try {
            if (selectedTask) {
                // Atualizar
                await apiClient.put(`/api/tasks/${selectedTask.id}`, taskForm);
                toast({ title: 'Tarefa atualizada!', className: 'bg-green-600 text-white border-none' });
            } else {
                // Criar
                await apiClient.post('/api/tasks', {
                    ...taskForm,
                    list_id: selectedList.id,
                });
                toast({ title: 'Tarefa criada!', className: 'bg-green-600 text-white border-none' });
            }
            setIsTaskDialogOpen(false);
            fetchTasks();
        } catch (error) {
            toast({ title: 'Erro ao salvar tarefa', variant: 'destructive' });
        }
    };

    const handleToggleComplete = async (task) => {
        try {
            await apiClient.put(`/api/tasks/${task.id}`, {
                completed: !task.completed,
            });
            fetchTasks();
        } catch (error) {
            toast({ title: 'Erro ao atualizar tarefa', variant: 'destructive' });
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await apiClient.delete(`/api/tasks/${taskId}`);
            setTasks(tasks.filter(t => t.id !== taskId));
            toast({ title: 'Tarefa deletada!', className: 'bg-green-600 text-white border-none' });
        } catch (error) {
            toast({ title: 'Erro ao deletar tarefa', variant: 'destructive' });
        }
    };

    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // Atualização otimista
        const newBoardData = { ...boardData };
        const sourceList = newBoardData[source.droppableId];
        const destList = newBoardData[destination.droppableId];
        const sourceTasks = Array.from(sourceList.tasks);
        const [movedTask] = sourceTasks.splice(source.index, 1);

        if (source.droppableId === destination.droppableId) {
            sourceTasks.splice(destination.index, 0, movedTask);
            newBoardData[source.droppableId].tasks = sourceTasks;
        } else {
            const destTasks = Array.from(destList.tasks);
            destTasks.splice(destination.index, 0, movedTask);
            newBoardData[source.droppableId].tasks = sourceTasks;
            newBoardData[destination.droppableId].tasks = destTasks;
        }

        setBoardData(newBoardData);

        try {
            await apiClient.patch(`/api/tasks/${draggableId}/move`, {
                list_id: destination.droppableId,
                position: destination.index + 1,
            });
        } catch (error) {
            toast({ title: 'Erro ao mover tarefa', variant: 'destructive' });
            fetchTasks(); // Reverter
        }
    };

    const formatDeadline = (deadline) => {
        if (!deadline) return null;
        const date = new Date(deadline);
        const now = new Date();
        const isOverdue = date < now;
        const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

        return (
            <Badge variant="outline" className={isOverdue ? 'border-red-500 text-red-400' : 'border-gray-500 text-gray-400'}>
                <Calendar className="w-3 h-3 mr-1" />
                {formattedDate}
            </Badge>
        );
    };

    return (
        <div className="flex flex-col h-full space-y-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-black/20 p-6 rounded-2xl backdrop-blur-sm border border-white/5">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Quadro de Tarefas
                    </h1>
                    <p className="text-gray-400 mt-1">Gerencie suas tarefas estilo Trello</p>
                </div>
            </div>

            {/* Board */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-x-auto pb-4">
                    <div className="flex gap-6 min-w-max px-2 h-full">
                        {Object.entries(boardData).map(([listId, list]) => (
                            <Droppable key={listId} droppableId={listId}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`flex flex-col w-80 rounded-2xl transition-all ${snapshot.isDraggingOver ? 'bg-white/5' : 'bg-transparent'
                                            }`}
                                    >
                                        {/* List Header */}
                                        <div className="p-4 rounded-t-2xl border-b border-white/5 bg-gradient-to-b from-purple-500/20 to-purple-600/10 backdrop-blur-md">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-bold text-white text-lg">{list.title}</h3>
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-black/40 text-white border-none">{list.tasks?.length || 0}</Badge>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDeleteList(listId)}>
                                                        <Trash2 className="w-4 h-4 text-red-400" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tasks */}
                                        <div className="flex-1 p-4 space-y-3 bg-black/10 rounded-b-2xl overflow-y-auto max-h-[calc(100vh-300px)]">
                                            {list.tasks?.map((task, index) => (
                                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`group ${snapshot.isDragging ? 'opacity-50' : ''}`}
                                                        >
                                                            <Card className={`glass-effect border-white/10 hover:border-purple-500/50 transition-all cursor-pointer ${task.completed ? 'opacity-60' : ''
                                                                }`}>
                                                                <CardContent className="p-4">
                                                                    <div className="flex items-start gap-3">
                                                                        <button
                                                                            onClick={() => handleToggleComplete(task)}
                                                                            className="mt-1 flex-shrink-0"
                                                                        >
                                                                            {task.completed ? (
                                                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                                            ) : (
                                                                                <Circle className="w-5 h-5 text-gray-500" />
                                                                            )}
                                                                        </button>

                                                                        <div className="flex-1 min-w-0">
                                                                            <h4 className={`font-medium text-white mb-1 ${task.completed ? 'line-through' : ''}`}>
                                                                                {task.title}
                                                                            </h4>
                                                                            {task.description && (
                                                                                <p className="text-sm text-gray-400 mb-2 line-clamp-2">{task.description}</p>
                                                                            )}
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <Badge className={PRIORITY_COLORS[task.priority]}>
                                                                                    {PRIORITY_LABELS[task.priority]}
                                                                                </Badge>
                                                                                {task.deadline && formatDeadline(task.deadline)}
                                                                                {task.assigned_to_name && (
                                                                                    <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                                                                                        <User className="w-3 h-3 mr-1" />
                                                                                        {task.assigned_to_name}
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <Button
                                                                                size="icon"
                                                                                variant="ghost"
                                                                                className="h-8 w-8"
                                                                                onClick={() => handleOpenTaskDialog(list, task)}
                                                                            >
                                                                                <Edit2 className="w-4 h-4" />
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}

                                            {/* Add Task Button */}
                                            <Button
                                                variant="outline"
                                                className="w-full border-dashed border-white/20 hover:bg-white/5"
                                                onClick={() => handleOpenTaskDialog(list)}
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Nova Tarefa
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Droppable>
                        ))}

                        {/* New List */}
                        <div className="w-80 flex-shrink-0">
                            <Card className="glass-effect border-white/10 border-dashed">
                                <CardContent className="p-4">
                                    <Input
                                        placeholder="Nome da nova lista..."
                                        value={newListTitle}
                                        onChange={(e) => setNewListTitle(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleCreateList()}
                                        className="mb-2 bg-white/5 border-white/10"
                                    />
                                    <Button onClick={handleCreateList} className="w-full bg-gradient-to-r from-purple-500 to-pink-500">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Adicionar Lista
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </DragDropContext>

            {/* Task Dialog */}
            <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                <DialogContent className="glass-effect border-white/10 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                            {selectedTask ? 'Editar Tarefa' : 'Nova Tarefa'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label className="text-sm text-gray-300">Título</Label>
                            <Input
                                value={taskForm.title}
                                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                                className="bg-white/5 border-white/10 mt-1"
                                placeholder="Ex: Revisar proposta"
                            />
                        </div>

                        <div>
                            <Label className="text-sm text-gray-300">Descrição</Label>
                            <Textarea
                                value={taskForm.description}
                                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                                className="bg-white/5 border-white/10 mt-1 min-h-[100px]"
                                placeholder="Detalhes da tarefa..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm text-gray-300">Prioridade</Label>
                                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                                    <SelectTrigger className="bg-white/5 border-white/10 mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">🟢 Baixa</SelectItem>
                                        <SelectItem value="medium">🟡 Média</SelectItem>
                                        <SelectItem value="high">🔴 Alta</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-sm text-gray-300">Prazo</Label>
                                <Input
                                    type="date"
                                    value={taskForm.deadline}
                                    onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                                    className="bg-white/5 border-white/10 mt-1"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2">
                        {selectedTask && (
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    handleDeleteTask(selectedTask.id);
                                    setIsTaskDialogOpen(false);
                                }}
                            >
                                Deletar
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveTask} className="bg-gradient-to-r from-purple-500 to-pink-500">
                            {selectedTask ? 'Salvar' : 'Criar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
