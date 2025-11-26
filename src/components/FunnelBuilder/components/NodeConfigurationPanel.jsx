// src/components/FunnelBuilder/components/NodeConfigurationPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Upload, Loader2, Trash2, Save } from 'lucide-react';
import { elementConfig } from '@/components/FunnelBuilder/elements';
// ALTERADO: Importando apiClient
import apiClient from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

function NodeConfigurationPanel({ node, onUpdate, onClose, agents }) {
  if (!node) return null;

  const [localConfig, setLocalConfig] = useState(node.config || {});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const configRef = useRef(localConfig);

  const config = elementConfig[node.type] || {};
  const Icon = config.icon;

  useEffect(() => {
    setLocalConfig(node.config || {});
    configRef.current = node.config || {};
  }, [node]);

  useEffect(() => {
    configRef.current = localConfig;
  }, [localConfig]);
  
  useEffect(() => {
    return () => {
      onUpdate(node.id, configRef.current);
    };
  }, [node.id, onUpdate]);

  const handleInputChange = (e) => {
    setLocalConfig(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectChange = (name, value) => {
    setLocalConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onUpdate(node.id, localConfig);
    toast({ title: "Configuração Salva!" });
  };
  
  // ALTERADO: handleFileChange agora usa apiClient para upload
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !user) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('nodeId', node.id); // Enviando o ID do nó para o backend

    try {
      // Faz um POST para a nova rota de upload na nossa API
      const response = await apiClient.post('/api/funnels/upload-attachment', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // A API deve retornar a URL pública do arquivo
      const attachmentUrl = response.data.url;
      setLocalConfig(prev => ({ ...prev, attachmentUrl }));
      toast({ title: "Anexo enviado com sucesso!" });
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Ocorreu um erro no upload.";
      toast({ title: "Erro no Upload", description: errorMessage, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };
  
  const removeAttachment = () => {
    setLocalConfig(prev => {
        const newConfig = { ...prev };
        delete newConfig.attachmentUrl; // Remove a propriedade da URL
        return newConfig;
    });
    toast({ title: "Anexo removido." });
  }

  const renderConfigFields = () => {
    if (node.type.startsWith('trigger_')) {
      const options = config.options;
      if (!options) return <p className="text-gray-400">Este gatilho não possui configurações adicionais.</p>;
      return (
        <div>
          <Label htmlFor="triggerEvent">Evento de Gatilho</Label>
          <Select name="triggerEvent" value={localConfig?.triggerEvent || ''} onValueChange={(value) => handleSelectChange('triggerEvent', value)}>
            <SelectTrigger className="w-full bg-white/5 mt-1"><SelectValue placeholder="Selecione um evento..." /></SelectTrigger>
            <SelectContent className="glass-effect border-white/10 text-white">
              {options.map(opt => ( <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem> ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    switch (node.type) {
      case 'send_email':
        return ( <div className="space-y-4"> <div> <Label htmlFor="subject">Assunto</Label> <Input id="subject" name="subject" value={localConfig?.subject || ''} onChange={handleInputChange} className="bg-white/5 mt-1" /> </div> <div> <Label htmlFor="body">Corpo do Email</Label> <Textarea id="body" name="body" value={localConfig?.body || ''} onChange={handleInputChange} className="bg-white/5 mt-1" rows={8} /> </div> </div> );
      case 'send_whatsapp':
        return ( <div className="space-y-4"> <div> <Label htmlFor="message">Mensagem</Label> <Textarea id="message" name="message" value={localConfig?.message || ''} onChange={handleInputChange} className="bg-white/5 mt-1" rows={6} /> </div> <div> <Label>Anexo (Opcional)</Label> {localConfig.attachmentUrl ? ( <div className="flex items-center justify-between p-2 mt-1 bg-white/10 rounded-md"> <p className="text-sm truncate text-gray-300">{localConfig.attachmentUrl.split('/').pop()}</p> <Button size="icon" variant="ghost" onClick={removeAttachment} className="w-8 h-8"> <Trash2 className="w-4 h-4 text-red-400" /> </Button> </div> ) : ( <Button variant="outline" className="w-full mt-1 border-dashed border-white/20" onClick={() => fileInputRef.current.click()} disabled={isUploading}> {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} Adicionar Imagem, Vídeo ou Áudio </Button> )} <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,video/*,audio/*" /> </div> </div> );
      case 'assign_agent':
        return ( <div> <Label htmlFor="agent_id">Agente de IA</Label> <Select name="agent_id" value={localConfig?.agent_id || ''} onValueChange={(value) => handleSelectChange('agent_id', value)}> <SelectTrigger className="w-full bg-white/5 mt-1"><SelectValue placeholder="Selecione um agente..." /></SelectTrigger> <SelectContent className="glass-effect border-white/10 text-white"> {(agents || []).map(agent => ( <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem> ))} </SelectContent> </Select> </div> );
      case 'add_tag':
        return ( <div> <Label htmlFor="tag_name">Nome da Tag</Label> <Input id="tag_name" name="tag_name" value={localConfig?.tag_name || ''} onChange={handleInputChange} className="bg-white/5 mt-1" placeholder="Ex: Cliente VIP" /> </div> );
      case 'wait':
        return ( <div className="space-y-4"> <div> <Label htmlFor="wait_value">Tempo de Espera</Label> <Input id="wait_value" name="wait_value" type="number" value={localConfig?.wait_value || '1'} onChange={handleInputChange} className="bg-white/5 mt-1" /> </div> <div> <Label htmlFor="wait_unit">Unidade</Label> <Select name="wait_unit" value={localConfig?.wait_unit || 'hours'} onValueChange={(value) => handleSelectChange('wait_unit', value)}> <SelectTrigger className="w-full bg-white/5 mt-1"><SelectValue placeholder="Selecione a unidade..." /></SelectTrigger> <SelectContent className="glass-effect border-white/10 text-white"> <SelectItem value="minutes">Minutos</SelectItem> <SelectItem value="hours">Horas</SelectItem> <SelectItem value="days">Dias</SelectItem> </SelectContent> </Select> </div> </div> );
      case 'condition':
        return ( <div className="space-y-4"> <div> <Label>Condição</Label> <p className="text-xs text-gray-400">Verifica se o lead possui uma tag específica.</p> </div> <div> <Label htmlFor="tag_check">Tag a ser verificada</Label> <Input id="tag_check" name="tag_check" value={localConfig?.tag_check || ''} onChange={handleInputChange} className="bg-white/5 mt-1" placeholder="Ex: Comprou Produto X" /> </div> <p className="text-sm text-gray-300">Use as saídas "Sim" e "Não" para ramificar o fluxo.</p> </div> );
      default:
        return <p className="text-gray-400">Este nó não possui configurações adicionais.</p>;
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute top-0 right-0 h-full w-96 bg-slate-900/80 backdrop-blur-lg border-l border-white/10 z-30 flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-white font-bold text-lg">Configurar Nó</h3>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
      </div>
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 bg-gradient-to-r ${config.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
            {config.logo ? (<img src={config.logo} alt={`${node.title} logo`} className="w-6 h-6 object-contain" />) : (<Icon className="w-5 h-5 text-white" />)}
          </div>
          <div><h4 className="text-white font-semibold">{node.title}</h4><p className="text-gray-400 text-xs">{node.type}</p></div>
        </div>
        {renderConfigFields()}
      </div>
      <div className="p-4 border-t border-white/10">
          <Button onClick={handleSave} className="w-full bg-gradient-to-r from-green-500 to-pink-500">
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
          </Button>
      </div>
    </motion.div>
  );
}

export default NodeConfigurationPanel;