import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import FunnelList from '@/components/FunnelBuilder/components/FunnelList';
import FunnelEditor from '@/components/FunnelBuilder/components/FunnelEditor';

export function FunnelCanvas() {
  const [funnels, setFunnels] = useState([]);
  const [selectedFunnel, setSelectedFunnel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFunnels = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('funnels')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Erro ao buscar funis", description: error.message, variant: "destructive" });
    } else {
      setFunnels(data || []);
    }
    setIsLoading(false);
  }, [toast, user]);

  useEffect(() => {
    if (user) {
      fetchFunnels();
    }
  }, [fetchFunnels, user]);

  const handleCreateFunnel = async (funnelName) => {
    if (!user) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return false;
    }
    const { data, error } = await supabase
      .from('funnels')
      .insert({ name: funnelName, user_id: user.id, config: { nodes: [], connections: [] }, is_active: false })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao criar funil", description: error.message, variant: "destructive" });
      return false;
    } 
    
    // O objeto `data` já tem a estrutura correta, incluindo `config`
    const newFunnel = data;
    setFunnels(prev => [newFunnel, ...prev]);
    toast({ title: "Estratégia criada com sucesso!" });
    setSelectedFunnel(newFunnel);
    return true;
  };

  const handleSaveFunnel = async (updatedFunnel, options = { closeOnSave: false }) => {
    const { error } = await supabase
      .from('funnels')
      .update({
        name: updatedFunnel.name,
        is_active: updatedFunnel.is_active,
        config: updatedFunnel.config,
      })
      .eq('id', updatedFunnel.id);

    if (error) {
      toast({ title: "Erro ao salvar o funil", description: error.message, variant: "destructive" });
      return;
    } 
    
    // Atualiza a lista de funis local com os dados salvos
    await fetchFunnels();
    
    if (options.closeOnSave) {
      toast({ title: `Funil "${updatedFunnel.name}" salvo com sucesso!` });
      setSelectedFunnel(null);
    } else {
      // Atualiza o funil selecionado para refletir o estado salvo, sem fechar
      setSelectedFunnel(updatedFunnel);
    }
  };
  
  const handleDeleteFunnel = async (funnelId) => {
    const { error } = await supabase.from('funnels').delete().eq('id', funnelId);
    if (error) {
      toast({ title: "Erro ao deletar funil", variant: "destructive" });
    } else {
      toast({ title: "Funil deletado com sucesso!" });
      setFunnels(funnels.filter(f => f.id !== funnelId));
    }
  };

  // Se um funil está selecionado, renderiza o Editor
  if (selectedFunnel) {
    return (
      <FunnelEditor 
        key={selectedFunnel.id} // A `key` garante que o editor reinicie ao trocar de funil
        funnel={selectedFunnel} 
        onBack={() => setSelectedFunnel(null)} 
        onSave={handleSaveFunnel}
      />
    );
  }

  // Caso contrário, renderiza a Lista
  return (
    <FunnelList
      funnels={funnels}
      onSelectFunnel={setSelectedFunnel}
      onCreateFunnel={handleCreateFunnel}
      onDeleteFunnel={handleDeleteFunnel}
      isLoading={isLoading}
    />
  );
}