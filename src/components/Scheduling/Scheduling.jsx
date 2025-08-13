
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function Scheduling() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date(2025, 7, 1));
  const [appointments, setAppointments] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', start_time: '', end_time: '' });

  const fetchAppointments = async () => {
    const { data, error } = await supabase.from('appointments').select('*');
    if (error) {
      toast({ title: "Erro ao buscar agendamentos", variant: "destructive" });
    } else {
      setAppointments(data.map(a => ({...a, date: new Date(a.start_time) })));
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.start_time || !newEvent.end_time) {
      toast({ title: "Campos obrigatórios", description: "Preencha título, início e fim.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from('appointments').insert([
        { ...newEvent, status: 'confirmed' }
    ]);
    if (error) {
        toast({ title: "Erro ao criar evento", description: error.message, variant: "destructive" });
    } else {
        toast({ title: "Evento criado com sucesso!" });
        fetchAppointments();
        setIsDialogOpen(false);
        setNewEvent({ title: '', description: '', start_time: '', end_time: '' });
    }
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const totalDays = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  
  const calendarDays = Array.from({ length: totalDays }, (_, i) => new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1));
  const emptySlots = Array(firstDayOfMonth).fill(null);
  const allSlots = [...emptySlots, ...calendarDays];

  const changeMonth = (offset) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Calendário</h1>
            <p className="text-gray-400">Gerencie seus agendamentos e publicações sociais</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-purple-500 to-pink-500">
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>

        <Card className="glass-effect border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toLocaleUpperCase()}</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-center">
              {daysOfWeek.map(day => (
                <div key={day} className="text-gray-400 font-semibold">{day}</div>
              ))}
              {allSlots.map((day, index) => (
                <div key={index} className={`p-2 h-32 rounded-lg flex flex-col items-start ${day ? 'glass-effect border-white/5' : ''}`}>
                  <span className="font-medium">{day ? day.getDate() : ''}</span>
                  <div className="w-full mt-1 space-y-1 overflow-y-auto scrollbar-hide">
                    {appointments
                      .filter(app => day && app.date.toDateString() === day.toDateString())
                      .map(app => (
                        <div key={app.id} className="text-white text-xs p-1 rounded truncate bg-purple-500">
                          {app.title}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="glass-effect border-white/10 text-white">
              <DialogHeader>
                  <DialogTitle>Criar Novo Evento</DialogTitle>
                  <DialogDescription className="text-gray-400">
                      Adicione um novo agendamento ao calendário.
                  </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div>
                      <Label htmlFor="title">Título</Label>
                      <Input id="title" value={newEvent.title} onChange={(e) => setNewEvent({...newEvent, title: e.target.value})} className="bg-white/5" />
                  </div>
                  <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea id="description" value={newEvent.description} onChange={(e) => setNewEvent({...newEvent, description: e.target.value})} className="bg-white/5" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <Label htmlFor="start_time">Início</Label>
                          <Input id="start_time" type="datetime-local" value={newEvent.start_time} onChange={(e) => setNewEvent({...newEvent, start_time: e.target.value})} className="bg-white/5" />
                      </div>
                      <div>
                          <Label htmlFor="end_time">Fim</Label>
                          <Input id="end_time" type="datetime-local" value={newEvent.end_time} onChange={(e) => setNewEvent({...newEvent, end_time: e.target.value})} className="bg-white/5" />
                      </div>
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateEvent} className="bg-gradient-to-r from-purple-500 to-pink-500">Salvar Evento</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
