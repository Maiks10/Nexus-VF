import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
      const formattedData = data.map(f => ({
        ...f,
        nodes: f.config?.nodes || [],
        connections: f.config?.connections || []
      }));
      setFunnels(formattedData);
    }
    setIsLoading(false);
  }, [toast, user]);

  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  const handleCreateFunnel = async (funnelName) => {
    const { data, error } = await supabase
      .from('funnels')
      .insert({ name: funnelName, user_id: user.id, config: { nodes: [], connections: [] }, is_active: false })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao criar funil", description: error.message, variant: "destructive" });
      return false;
    } else {
      const newFunnel = { ...data, nodes: [], connections: [] };
      setFunnels(prev => [newFunnel, ...prev]);
      toast({ title: "Estratégia criada com sucesso!" });
      setSelectedFunnel(newFunnel);
      return true;
    }
  };

  // ----- LÓGICA CORRIGIDA E CENTRALIZADA AQUI -----
  const handleSaveFunnel = async (updatedFunnel, options = { closeOnSave: false }) => {
    // Extrai os nós e conexões do objeto do funil
    const { nodes, connections, ...funnelData } = updatedFunnel;
    
    // Prepara o objeto de dados para o Supabase
    const dataToUpdate = {
      name: funnelData.name,
      is_active: funnelData.is_active,
      config: { 
        nodes: nodes || [], // Garante que nodes seja sempre um array
        connections: connections || [] // Garante que connections seja sempre um array
      }
    };
    
    const { error } = await supabase
      .from('funnels')
      .update(dataToUpdate)
      .eq('id', funnelData.id);

    if (error) {
      toast({ title: "Erro ao salvar o funil", description: error.message, variant: "destructive" });
      return; // Interrompe a execução em caso de erro
    } 
    
    // Atualiza o estado local para refletir a mudança imediatamente
    const updatedFunnels = funnels.map(f => f.id === funnelData.id ? { ...f, ...dataToUpdate } : f);
    setFunnels(updatedFunnels);
    
    if (options.closeOnSave) {
      toast({ title: `Funil "${funnelData.name}" salvo com sucesso!` });
      setSelectedFunnel(null); // Fecha o editor
    } else {
      // Se não for para fechar, apenas atualiza o funil selecionado
      setSelectedFunnel(prev => ({ ...prev, ...dataToUpdate }));
      toast({ title: "Progresso salvo!" });
    }
  };
  
  const handleDeleteFunnel = async (funnelId) => {
    // ... (código sem alterações)
    const { error } = await supabase.from('funnels').delete().eq('id', funnelId);
    if (error) {
      toast({ title: "Erro ao deletar funil", variant: "destructive" });
    } else {
      toast({ title: "Funil deletado com sucesso!" });
      setFunnels(funnels.filter(f => f.id !== funnelId));
    }
  };

  if (selectedFunnel) {
    return (
      <FunnelEditor 
        key={selectedFunnel.id} // Adiciona uma key para forçar a remontagem ao selecionar um novo funil
        funnel={selectedFunnel} 
        onBack={() => setSelectedFunnel(null)} 
        onSave={handleSaveFunnel}
      />
    );
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