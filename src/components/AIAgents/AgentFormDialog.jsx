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
import { Textarea } from '@/components/ui/textarea';
// ALTERADO: Importando apiClient
import apiClient from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload } from 'lucide-react';

export function AgentFormDialog({ isOpen, onClose, agent }) {
  const [formData, setFormData] = useState({
    name: '',
    provider: 'OpenAI',
    description: '',
    api_key: '',
    custom_agent_id: '',
    prompt: '',
    knowledge_base_url: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || '',
        provider: agent.provider || 'OpenAI',
        description: agent.description || '',
        api_key: agent.api_key || '',
        custom_agent_id: agent.custom_agent_id || '',
        prompt: agent.prompt || '',
        knowledge_base_url: agent.knowledge_base_url || ''
      });
    } else {
      setFormData({
        name: '',
        provider: 'OpenAI',
        description: '',
        api_key: '',
        custom_agent_id: '',
        prompt: '',
        knowledge_base_url: ''
      });
    }
  }, [agent, isOpen]); // Adicionado isOpen para resetar o form

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleProviderChange = (value) => {
    setFormData((prev) => ({ ...prev, provider: value }));
  };

  const handleFileChange = (e) => {
    toast({ title: "Upload de arquivo ainda não implementado." });
  };

  // ALTERADO: handleSubmit agora usa apiClient
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const dataToSubmit = { ...formData };

    try {
      if (agent) {
        // Atualiza um agente existente
        await apiClient.put(`/api/ai-agents/${agent.id}`, dataToSubmit);
      } else {
        // Cria um novo agente
        await apiClient.post('/api/ai-agents', { ...dataToSubmit, is_active: true });
      }

      toast({
        title: `Agente ${agent ? 'atualizado' : 'criado'} com sucesso!`,
      });
      onClose(true); // Fecha e avisa para recarregar a lista
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Ocorreu um erro ao salvar o agente.";
      toast({
        title: `Erro ao salvar agente`,
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
      <DialogContent className="sm:max-w-md glass-effect border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>{agent ? 'Editar Agente' : 'Criar Novo Agente'}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure os detalhes do seu agente de IA.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* O JSX do formulário continua o mesmo */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Agente</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} className="bg-white/5" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" value={formData.description} onChange={handleChange} className="bg-white/5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider">Provedor de IA</Label>
            <Select onValueChange={handleProviderChange} value={formData.provider}>
              <SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OpenAI">OpenAI</SelectItem>
                <SelectItem value="Gemini">Google Gemini</SelectItem>
                <SelectItem value="Claude">Claude</SelectItem>
                <SelectItem value="Grok">Grok</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="api_key">API Key</Label>
            <Input id="api_key" name="api_key" type="password" value={formData.api_key} onChange={handleChange} className="bg-white/5" placeholder="••••••••••••••••" />
          </div>
          {formData.provider === 'OpenAI' && (
            <div className="space-y-2">
              <Label htmlFor="custom_agent_id">ID do Agente Personalizado (Assistente)</Label>
              <Input id="custom_agent_id" name="custom_agent_id" value={formData.custom_agent_id} onChange={handleChange} className="bg-white/5" placeholder="asst_..." />
            </div>
          )}
          {formData.provider !== 'OpenAI' && (
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt do Sistema</Label>
              <Textarea id="prompt" name="prompt" value={formData.prompt} onChange={handleChange} className="bg-white/5" placeholder="Você é um assistente amigável que..." />
            </div>
          )}
          <div className="space-y-2">
            <Label>Base de Conhecimento</Label>
            <div className="flex items-center justify-center w-full">
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-white/5 border-gray-600 hover:border-gray-500 hover:bg-white/10">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-4 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Clique para enviar</span> ou arraste e solte</p>
                        <p className="text-xs text-gray-400">PDF, DOCX, TXT (MAX. 5MB)</p>
                    </div>
                    <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} />
                </label>
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