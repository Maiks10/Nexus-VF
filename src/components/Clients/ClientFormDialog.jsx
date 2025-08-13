import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export function ClientFormDialog({ isOpen, onClose, client }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'Lead',
    segment: '',
    value: 0,
    kanban_stage: 'new_lead',
    temperature: 'cold'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        status: client.status || 'Lead',
        segment: client.segment || '',
        value: client.value || 0,
        kanban_stage: client.kanban_stage || 'new_lead',
        temperature: client.temperature || 'cold'
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        status: 'Lead',
        segment: '',
        value: 0,
        kanban_stage: 'new_lead',
        temperature: 'cold'
      });
    }
  }, [client]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    let error;
    if (client) {
      const { error: updateError } = await supabase
        .from('clients')
        .update(formData)
        .eq('id', client.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('clients')
        .insert([formData]);
      error = insertError;
    }

    if (error) {
      toast({
        title: `Erro ao salvar cliente`,
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: `Cliente ${client ? 'atualizado' : 'criado'} com sucesso!`,
      });
      onClose(true);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
      <DialogContent className="sm:max-w-[425px] glass-effect border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>{client ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Preencha os dados do cliente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nome</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} className="col-span-3 bg-white/5" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="col-span-3 bg-white/5" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Telefone</Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} className="col-span-3 bg-white/5" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right">Valor</Label>
              <Input id="value" name="value" type="number" value={formData.value} onChange={handleChange} className="col-span-3 bg-white/5" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onClose(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" className="bg-gradient-to-r from-purple-500 to-pink-500" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}