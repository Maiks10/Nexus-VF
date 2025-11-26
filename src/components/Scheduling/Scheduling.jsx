import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import apiClient from '@/lib/customSupabaseClient';

const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// --- Helper para formatar data para o input datetime-local ---
const toDateTimeLocal = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

export function Scheduling() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null); // Para criar ou editar
  const [view, setView] = useState('month'); // 'month', 'week', 'day'

  const fetchAppointments = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/appointments');
      setAppointments(response.data.map(a => ({...a, date: new Date(a.start_time) })));
    } catch (error) {
      toast({ title: "Erro ao buscar agendamentos", description: error.response?.data?.message, variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);
  
  // --- Handlers para o Dialog (Criar, Editar, Deletar) ---
  const handleOpenDialog = (event = null, date = null) => {
    if (event) {
      // Editando um evento existente
      setSelectedEvent({
        ...event,
        start_time: toDateTimeLocal(event.start_time),
        end_time: toDateTimeLocal(event.end_time),
      });
    } else {
      // Criando um novo evento
      const startTime = date ? toDateTimeLocal(date) : '';
      setSelectedEvent({ id: null, title: '', description: '', start_time: startTime, end_time: '' });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedEvent(null);
  };
  
  const handleSaveEvent = async () => {
    if (!selectedEvent.title || !selectedEvent.start_time || !selectedEvent.end_time) {
      toast({ title: "Campos obrigatórios", description: "Preencha título, início e fim.", variant: "destructive" });
      return;
    }
    try {
      if (selectedEvent.id) {
        // ATUALIZAR evento existente
        await apiClient.put(`/api/appointments/${selectedEvent.id}`, selectedEvent);
        toast({ title: "Evento atualizado com sucesso!" });
      } else {
        // CRIAR novo evento
        await apiClient.post('/api/appointments', { ...selectedEvent, status: 'confirmed' });
        toast({ title: "Evento criado com sucesso!" });
      }
      fetchAppointments();
      handleCloseDialog();
    } catch (error) {
        toast({ title: "Erro ao salvar evento", description: error.response?.data?.message, variant: "destructive" });
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent?.id) return;
    try {
      await apiClient.delete(`/api/appointments/${selectedEvent.id}`);
      toast({ title: "Evento excluído com sucesso!" });
      fetchAppointments();
      handleCloseDialog();
    } catch (error) {
      toast({ title: "Erro ao excluir evento", description: error.response?.data?.message, variant: "destructive" });
    }
  };

  // --- Lógica de Navegação e Geração de Views ---
  const changeDate = (offset) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (view === 'month') newDate.setMonth(prev.getMonth() + offset);
      if (view === 'week') newDate.setDate(prev.getDate() + (7 * offset));
      if (view === 'day') newDate.setDate(prev.getDate() + offset);
      return newDate;
    });
  };
  
  const headerTitle = useMemo(() => {
    if (view === 'month') return currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toLocaleUpperCase();
    if (view === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString('pt-BR')} - ${endOfWeek.toLocaleDateString('pt-BR')}`;
    }
    return currentDate.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, [currentDate, view]);

  const renderCalendarView = () => {
    // Lógica para a visualização de Mês
    if (view === 'month') {
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
        const totalDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const calendarDays = Array.from({ length: totalDays }, (_, i) => new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1));
        const emptySlots = Array(firstDayOfMonth).fill(null);
        const allSlots = [...emptySlots, ...calendarDays];
        
        return (
            <div className="grid grid-cols-7 gap-2 text-center">
              {daysOfWeek.map(day => <div key={day} className="text-gray-400 font-semibold">{day}</div>)}
              {allSlots.map((day, index) => (
                <div key={index} className={`p-2 h-32 rounded-lg flex flex-col items-start ${day ? 'glass-effect border-white/5' : ''}`}>
                  <span className="font-medium">{day ? day.getDate() : ''}</span>
                  <div className="w-full mt-1 space-y-1 overflow-y-auto scrollbar-hide">
                    {appointments
                      .filter(app => day && app.date.toDateString() === day.toDateString())
                      .map(app => (
                        <button key={app.id} onClick={() => handleOpenDialog(app)} className="w-full text-left text-white text-xs p-1 rounded truncate bg-purple-500 hover:bg-purple-600">
                          {app.title}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
        );
    }
    // Lógica para a visualização de Semana
    if (view === 'week') {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const weekDays = Array.from({ length: 7 }, (_, i) => new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i));
        
        return (
            <div className="grid grid-cols-7 gap-2 text-center">
              {weekDays.map(day => <div key={day} className="text-gray-400 font-semibold">{daysOfWeek[day.getDay()]} {day.getDate()}</div>)}
              {weekDays.map(day => (
                <div key={day} className="p-2 min-h-[400px] rounded-lg flex flex-col items-start glass-effect border-white/5">
                  <div className="w-full mt-1 space-y-1 overflow-y-auto scrollbar-hide">
                    {appointments
                      .filter(app => app.date.toDateString() === day.toDateString())
                      .map(app => (
                        <button key={app.id} onClick={() => handleOpenDialog(app)} className="w-full text-left text-white text-xs p-2 rounded truncate bg-purple-500 hover:bg-purple-600">
                          {new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {app.title}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
        );
    }
    // Lógica para a visualização de Dia
    if (view === 'day') {
        const dayAppointments = appointments.filter(app => app.date.toDateString() === currentDate.toDateString());
        return (
            <div className="min-h-[400px] p-4 glass-effect border-white/5 rounded-lg">
              {dayAppointments.length === 0 ? (
                  <p className="text-gray-400 text-center pt-16">Nenhum evento para este dia.</p>
              ) : (
                <ul className="space-y-2">
                  {dayAppointments.map(app => (
                    <li key={app.id}>
                       <button onClick={() => handleOpenDialog(app)} className="w-full text-left flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10">
                          <div className="font-semibold text-purple-400">
                            {new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(app.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-white">{app.title}</div>
                       </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
        );
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Calendário</h1>
            <p className="text-gray-400">Gerencie seus agendamentos e publicações sociais</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-purple-500 to-pink-500">
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>

        <Card className="glass-effect border-white/10">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <CardTitle className="text-white">{headerTitle}</CardTitle>
              <div className="flex items-center gap-2">
                 {/* BOTÕES DE VISUALIZAÇÃO */}
                <Button variant={view === 'day' ? 'default' : 'outline'} onClick={() => setView('day')}>Dia</Button>
                <Button variant={view === 'week' ? 'default' : 'outline'} onClick={() => setView('week')}>Semana</Button>
                <Button variant={view === 'month' ? 'default' : 'outline'} onClick={() => setView('month')}>Mês</Button>
                <div className="w-px h-8 bg-white/10 mx-2"></div>
                <Button variant="outline" size="icon" onClick={() => changeDate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => changeDate(1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderCalendarView()}
          </CardContent>
        </Card>
      </div>

      {/* DIALOG PARA CRIAR/EDITAR EVENTO */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="glass-effect border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.id ? 'Editar Evento' : 'Criar Novo Evento'}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedEvent?.id ? 'Altere os detalhes do seu agendamento.' : 'Adicione um novo agendamento ao calendário.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input id="title" value={selectedEvent?.title || ''} onChange={(e) => setSelectedEvent({...selectedEvent, title: e.target.value})} className="bg-white/5" />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" value={selectedEvent?.description || ''} onChange={(e) => setSelectedEvent({...selectedEvent, description: e.target.value})} className="bg-white/5" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Início</Label>
                <Input id="start_time" type="datetime-local" value={selectedEvent?.start_time || ''} onChange={(e) => setSelectedEvent({...selectedEvent, start_time: e.target.value})} className="bg-white/5" />
              </div>
              <div>
                <Label htmlFor="end_time">Fim</Label>
                <Input id="end_time" type="datetime-local" value={selectedEvent?.end_time || ''} onChange={(e) => setSelectedEvent({...selectedEvent, end_time: e.target.value})} className="bg-white/5" />
              </div>
            </div>
          </div>
          <DialogFooter className="justify-between">
              {selectedEvent?.id ? (
                <Button variant="destructive" onClick={handleDeleteEvent}><Trash2 className="w-4 h-4 mr-2" />Excluir</Button>
              ) : (
                <div></div> // Espaçador
              )}
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleCloseDialog}>Cancelar</Button>
                <Button onClick={handleSaveEvent} className="bg-gradient-to-r from-purple-500 to-pink-500">Salvar</Button>
              </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}