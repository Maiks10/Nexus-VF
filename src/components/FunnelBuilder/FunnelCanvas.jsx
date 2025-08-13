import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import FunnelList from '@/components/FunnelBuilder/components/FunnelList';
import FunnelEditor from '@/components/FunnelBuilder/components/FunnelEditor';

export function FunnelCanvas() {
  const [funnels, setFunnels] = useState([]);
  const [selectedFunnel, setSelectedFunnel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchFunnels = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('funnels').select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ title: "Erro ao buscar funis", variant: "destructive" });
    } else {
      const formattedData = data.map(f => ({
        ...f,
        nodes: f.config?.nodes || [],
        connections: f.config?.connections || []
      }));
      setFunnels(formattedData);
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  const handleCreateFunnel = async (funnelName) => {
    const { data, error } = await supabase
      .from('funnels')
      .insert({ name: funnelName, config: { nodes: [], connections: [] }, is_active: false })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao criar funil", variant: "destructive" });
      return false;
    } else {
      const newFunnel = { ...data, nodes: [], connections: [] };
      setFunnels(prev => [newFunnel, ...prev]);
      toast({ title: "Estratégia criada com sucesso!" });
      setSelectedFunnel(newFunnel);
      return true;
    }
  };

  const handleSaveFunnel = async (updatedFunnel) => {
    const { nodes, connections, ...funnelData } = updatedFunnel;
    
    const { error } = await supabase
      .from('funnels')
      .update({ name: funnelData.name, is_active: funnelData.is_active, config: { nodes, connections } })
      .eq('id', funnelData.id);

    if (error) {
      toast({ title: "Erro ao salvar o funil", variant: "destructive", description: error.message });
      return;
    }
    
    toast({ title: `Funil "${funnelData.name}" salvo com sucesso!` });
    await fetchFunnels();
    setSelectedFunnel(null);
  };
  
  const handleToggleActive = async (funnelToToggle) => {
      const newStatus = !funnelToToggle.is_active;
      const { error } = await supabase
        .from('funnels')
        .update({ is_active: newStatus })
        .eq('id', funnelToToggle.id);
      
      if (error) {
        toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
      } else {
        toast({ title: `Funil ${newStatus ? 'ativado' : 'desativado'} com sucesso!` });
        const updatedFunnels = funnels.map(f => f.id === funnelToToggle.id ? {...f, is_active: newStatus} : f);
        setFunnels(updatedFunnels);
        setSelectedFunnel(prev => prev && prev.id === funnelToToggle.id ? {...prev, is_active: newStatus} : prev);
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

  if (selectedFunnel) {
    return <FunnelEditor 
              funnel={selectedFunnel} 
              onBack={() => setSelectedFunnel(null)} 
              onSave={handleSaveFunnel}
              onToggleActive={handleToggleActive}
           />;
  }

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