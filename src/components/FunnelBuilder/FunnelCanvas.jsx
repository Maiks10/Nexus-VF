import React, { useState, useCallback, useEffect } from 'react';
// ALTERADO: Importando apiClient
import apiClient from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import FunnelList from '@/components/FunnelBuilder/components/FunnelList';
import FunnelEditor from '@/components/FunnelBuilder/components/FunnelEditor';

export function FunnelCanvas() {
  const [funnels, setFunnels] = useState([]);
  const [selectedFunnel, setSelectedFunnel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // ALTERADO: fetchFunnels agora usa apiClient
  const fetchFunnels = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get('/api/funnels');
      setFunnels(response.data || []);
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Ocorreu um erro ao buscar os funis.";
      toast({ title: "Erro ao buscar funis", description: errorMessage, variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast, user]);

  useEffect(() => {
    if (user) {
      fetchFunnels();
    }
  }, [fetchFunnels, user]);

  // ALTERADO: handleCreateFunnel agora usa apiClient
  const handleCreateFunnel = async (funnelName) => {
    if (!user) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return false;
    }
    try {
      const response = await apiClient.post('/api/funnels', { name: funnelName });
      const newFunnel = response.data; // A API deve retornar o funil criado
      setFunnels(prev => [newFunnel, ...prev]);
      toast({ title: "Estratégia criada com sucesso!" });
      setSelectedFunnel(newFunnel);
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Ocorreu um erro ao criar o funil.";
      toast({ title: "Erro ao criar funil", description: errorMessage, variant: "destructive" });
      return false;
    }
  };

  // ALTERADO: handleSaveFunnel agora usa apiClient
  const handleSaveFunnel = async (updatedFunnel, options = { closeOnSave: false }) => {
    try {
      await apiClient.put(`/api/funnels/${updatedFunnel.id}`, {
        name: updatedFunnel.name,
        is_active: updatedFunnel.is_active,
        config: updatedFunnel.config,
      });
      
      await fetchFunnels();
      
      if (options.closeOnSave) {
        toast({ title: `Funil "${updatedFunnel.name}" salvo com sucesso!` });
        setSelectedFunnel(null);
      } else {
        setSelectedFunnel(updatedFunnel);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Ocorreu um erro ao salvar o funil.";
      toast({ title: "Erro ao salvar o funil", description: errorMessage, variant: "destructive" });
    }
  };
  
  // ALTERADO: handleDeleteFunnel agora usa apiClient
  const handleDeleteFunnel = async (funnelId) => {
    try {
      await apiClient.delete(`/api/funnels/${funnelId}`);
      toast({ title: "Funil deletado com sucesso!" });
      setFunnels(funnels.filter(f => f.id !== funnelId));
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Ocorreu um erro ao deletar o funil.";
      toast({ title: "Erro ao deletar funil", description: errorMessage, variant: "destructive" });
    }
  };

  // O JSX (parte visual) não sofreu alterações
  if (selectedFunnel) {
    return (
      <FunnelEditor 
        key={selectedFunnel.id}
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