// src/components/FunnelBuilder/components/NodeConfigurationPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Upload, Loader2, Trash2, Save, Sparkles, Zap } from 'lucide-react';
import { elementConfig } from '@/components/FunnelBuilder/elements';
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
  const Icon = config.icon || Zap; // Fallback para Zap se não houver ícone

  useEffect(() => {
    setLocalConfig(node.config || {});
    configRef.current = node.config || {};
  }, [node.id, JSON.stringify(node.config)]);

  useEffect(() => {
    configRef.current = localConfig;
  }, [localConfig]);

  useEffect(() => {
    return () => {
      onUpdate(node.id, configRef.current);
    };
  }, [node.id, onUpdate]);

  // Auto-preencher valores default para trigger CRM temperatura
  useEffect(() => {
    if (node.type === 'trigger_crm' && localConfig.triggerEvent === 'temperature_changed') {
      // Se não tem valores, setar defaults
      if (!localConfig.fromTemperature || !localConfig.toTemperature) {
        setLocalConfig(prev => ({
          ...prev,
          fromTemperature: prev.fromTemperature || 'any',
          toTemperature: prev.toTemperature || 'warm'
        }));
      }
    }
  }, [node.type, localConfig.triggerEvent]);

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

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !user) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('nodeId', node.id);

    try {
      const response = await apiClient.post('/api/funnels/upload-attachment', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

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
      delete newConfig.attachmentUrl;
      return newConfig;
    });
    toast({ title: "Anexo removido." });
  }

  const renderConfigFields = () => {
    // TRIGGERS - Configuração de Evento
    if (node.type.startsWith('trigger_')) {
      const options = config.options;
      if (!options || options.length === 0) {
        return <p className="text-gray-400">Este gatilho não possui configurações adicionais.</p>;
      }
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="triggerEvent">Evento de Gatilho</Label>
            <Select name="triggerEvent" value={localConfig?.triggerEvent || ''} onValueChange={(value) => handleSelectChange('triggerEvent', value)}>
              <SelectTrigger className="w-full bg-white/5 mt-1"><SelectValue placeholder="Selecione um evento..." /></SelectTrigger>
              <SelectContent className="glass-effect border-white/10 text-white">
                {options.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {/* Configurações específicas por trigger */}
          {node.type === 'trigger_whatsapp' && localConfig.triggerEvent === 'received_message_keyword' && (
            <div>
              <Label htmlFor="keywords">Palavras-chave (separadas por vírgula)</Label>
              <Input
                id="keywords"
                name="keywords"
                value={localConfig?.keywords || ''}
                onChange={handleInputChange}
                className="bg-white/5 mt-1"
                placeholder="Ex: comprar, preço, informação"
              />
            </div>
          )}

          {node.type === 'trigger_whatsapp' && localConfig.triggerEvent === 'no_response' && (
            <div className="space-y-3">
              <Label>Sem resposta há:</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  name="noResponseTime"
                  value={localConfig?.noResponseTime || 60}
                  onChange={handleInputChange}
                  className="bg-white/5 w-24"
                  placeholder="60"
                />
                <Select
                  name="noResponseUnit"
                  value={localConfig?.noResponseUnit || 'minutes'}
                  onValueChange={(value) => handleSelectChange('noResponseUnit', value)}
                >
                  <SelectTrigger className="w-full bg-white/5">
                    <SelectValue placeholder="Unidade" />
                  </SelectTrigger>
                  <SelectContent className="glass-effect border-white/10 text-white">
                    <SelectItem value="minutes">Minutos</SelectItem>
                    <SelectItem value="hours">Horas</SelectItem>
                    <SelectItem value="days">Dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-white/60">
                Funnel será disparado para contatos que não responderam há {localConfig?.noResponseTime || 60} {localConfig?.noResponseUnit === 'minutes' ? 'minutos' : localConfig?.noResponseUnit === 'hours' ? 'horas' : 'dias'}
              </p>
            </div>
          )}

          {/* TRIGGER CRM: TEMPERATURA MUDOU */}
          {node.type === 'trigger_crm' && localConfig.triggerEvent === 'temperature_changed' && (
            <div className="space-y-3">
              <Label>De (temperatura anterior):</Label>
              <Select
                name="fromTemperature"
                value={localConfig?.fromTemperature || 'any'}
                onValueChange={(value) => handleSelectChange('fromTemperature', value)}
              >
                <SelectTrigger className="w-full bg-white/5 mt-1">
                  <SelectValue placeholder="Qualquer" />
                </SelectTrigger>
                <SelectContent className="glass-effect border-white/10 text-white">
                  <SelectItem value="any">Qualquer</SelectItem>
                  <SelectItem value="cold">❄️ Frio</SelectItem>
                  <SelectItem value="warm">🌤️ Morno</SelectItem>
                  <SelectItem value="hot">🔥 Quente</SelectItem>
                </SelectContent>
              </Select>

              <Label>Para (temperatura nova):</Label>
              <Select
                name="toTemperature"
                value={localConfig?.toTemperature || 'warm'}
                onValueChange={(value) => handleSelectChange('toTemperature', value)}
              >
                <SelectTrigger className="w-full bg-white/5 mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="glass-effect border-white/10 text-white">
                  <SelectItem value="cold">❄️ Frio</SelectItem>
                  <SelectItem value="warm">🌤️ Morno</SelectItem>
                  <SelectItem value="hot">🔥 Quente</SelectItem>
                </SelectContent>
              </Select>

              <p className="text-xs text-white/60">
                Dispara quando lead muda de {localConfig?.fromTemperature === 'any' ? 'qualquer temperatura' : localConfig?.fromTemperature || 'qualquer'} para {localConfig?.toTemperature || 'morno'}
              </p>
            </div>
          )}

          {/* TRIGGER CRM: TAG ADICIONADA */}
          {node.type === 'trigger_crm' && localConfig.triggerEvent === 'tag_added' && (
            <div className="space-y-3">
              <Label>Quando adicionar tag:</Label>
              <Input
                name="tagName"
                value={localConfig?.tagName || ''}
                onChange={handleInputChange}
                className="bg-white/5 mt-1"
                placeholder="VIP, Interessado, Cliente..."
              />
              <p className="text-xs text-white/60">
                Dispara quando a tag "{localConfig?.tagName || '...'}" for adicionada ao contato
              </p>
            </div>
          )}

          {/* TRIGGER CRM: LEAD CRIADO (sem configuração extra) */}
          {node.type === 'trigger_crm' && localConfig.triggerEvent === 'lead_created' && (
            <div className="text-sm text-white/60 mt-2">
              ℹ️ Dispara automaticamente quando um novo lead é criado no CRM
            </div>
          )}
        </div>
      );
    }

    // ACTIONS - Configurações específicas
    switch (node.type) {
      // ============ MESSAGING ACTIONS ============
      case 'send_email':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Assunto</Label>
              <Input id="subject" name="subject" value={localConfig?.subject || ''} onChange={handleInputChange} className="bg-white/5 mt-1" />
            </div>
            <div>
              <Label htmlFor="body">Corpo do Email</Label>
              <Textarea id="body" name="body" value={localConfig?.body || ''} onChange={handleInputChange} className="bg-white/5 mt-1" rows={8} />
              <p className="text-[10px] text-gray-500 mt-1">💡 Use variáveis: {'{'}contact.name{'}'}, {'{'}contact.email{'}'}</p>
            </div>
          </div>
        );

      case 'send_whatsapp':
      case 'send_telegram':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="message">Mensagem</Label>
              <Textarea id="message" name="message" value={localConfig?.message || ''} onChange={handleInputChange} className="bg-white/5 mt-1" rows={6} />
              <p className="text-[10px] text-gray-500 mt-1">💡 Use variáveis: {'{'}contact.name{'}'}, {'{'}contact.phone{'}'}</p>
            </div>

            {node.type === 'send_whatsapp' && (
              <div>
                <Label>Anexo (Opcional)</Label>
                {localConfig.attachmentUrl ? (
                  <div className="flex items-center justify-between p-2 mt-1 bg-white/10 rounded-md">
                    <p className="text-sm truncate text-gray-300">{localConfig.attachmentUrl.split('/').pop()}</p>
                    <Button size="icon" variant="ghost" onClick={removeAttachment} className="w-8 h-8">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full mt-1 border-dashed border-white/20" onClick={() => fileInputRef.current.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Adicionar Imagem, Vídeo ou Áudio
                  </Button>
                )}
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,video/*,audio/*" />
              </div>
            )}
          </div>
        );

      // ============ AI ACTIONS ============
      case 'assign_agent':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="agent_id">Agente de IA</Label>
              <Select name="agent_id" value={localConfig?.agent_id || ''} onValueChange={(value) => handleSelectChange('agent_id', value)}>
                <SelectTrigger className="w-full bg-white/5 mt-1"><SelectValue placeholder="Selecione um agente..." /></SelectTrigger>
                <SelectContent className="glass-effect border-white/10 text-white">
                  {(agents || []).map(agent => (<SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-gray-400">O agente será atribuído às conversas do WhatsApp deste lead.</p>
          </div>
        );


      // ============ CRM ACTIONS ============
      case 'add_tag':
      case 'remove_tag':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="tag_name">Nome da Tag</Label>
              <Input
                id="tag_name"
                name="tag_name"
                value={localConfig?.tag_name || ''}
                onChange={handleInputChange}
                className="bg-white/5 mt-1"
                placeholder="Ex: Cliente VIP, Interessado em Produto X"
              />
            </div>
          </div>
        );

      case 'update_temperature':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="temperature_value">Nova Temperatura</Label>
              <Select name="temperature_value" value={localConfig?.temperature_value || 'warm'} onValueChange={(value) => handleSelectChange('temperature_value', value)}>
                <SelectTrigger className="w-full bg-white/5 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold">❄️ Cold (Frio)</SelectItem>
                  <SelectItem value="warm">🌤️ Warm (Morno)</SelectItem>
                  <SelectItem value="hot">🔥 Hot (Quente)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'update_lead':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">Atualize campos do lead. Deixe em branco para não alterar.</p>

            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" value={localConfig?.name || ''} onChange={handleInputChange} className="bg-white/5 mt-1" placeholder="Ex: João Silva" />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={localConfig?.email || ''} onChange={handleInputChange} className="bg-white/5 mt-1" placeholder="Ex: joao@example.com" />
            </div>

            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" value={localConfig?.phone || ''} onChange={handleInputChange} className="bg-white/5 mt-1" placeholder="Ex: 11999999999" />
            </div>

            <div>
              <Label htmlFor="temperature">Termômetro</Label>
              <Select name="temperature" value={localConfig?.temperature} onValueChange={(value) => handleSelectChange('temperature', value)}>
                <SelectTrigger className="w-full bg-white/5 mt-1"><SelectValue placeholder="Não alterar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">🔥 Quente</SelectItem>
                  <SelectItem value="warm">🌡️ Morno</SelectItem>
                  <SelectItem value="cold">❄️ Frio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="source">Fonte</Label>
              <Input id="source" name="source" value={localConfig?.source || ''} onChange={handleInputChange} className="bg-white/5 mt-1" placeholder="Ex: whatsapp, facebook" />
            </div>

            <div>
              <Label htmlFor="tags_action">Ação de Tags</Label>
              <Select name="tags_action" value={localConfig?.tags_action || 'add'} onValueChange={(value) => handleSelectChange('tags_action', value)}>
                <SelectTrigger className="w-full bg-white/5 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">➕ Adicionar Tags</SelectItem>
                  <SelectItem value="replace">🔄 Substituir Todas</SelectItem>
                  <SelectItem value="remove">➖ Remover Tags</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input id="tags" name="tags" value={localConfig?.tags || ''} onChange={handleInputChange} className="bg-white/5 mt-1" placeholder="Ex: vip, premium" />
            </div>

            <div className="border-t border-white/10 pt-4">
              <Label className="text-gray-300 font-semibold">Campos Personalizados</Label>
            </div>

            <div>
              <Label htmlFor="custom_field_key">Campo Personalizado (chave)</Label>
              <Input id="custom_field_key" name="custom_field_key" value={localConfig?.custom_field_key || ''} onChange={handleInputChange} className="bg-white/5 mt-1" placeholder="Ex: interesse" />
            </div>
            <div>
              <Label htmlFor="custom_field_value">Campo Personalizado (valor)</Label>
              <Input id="custom_field_value" name="custom_field_value" value={localConfig?.custom_field_value || ''} onChange={handleInputChange} className="bg-white/5 mt-1" placeholder="Ex: curso_avançado" />
            </div>
          </div>
        );




      // ============ LOGIC ============
      case 'wait':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="wait_value">Tempo de Espera</Label>
              <Input id="wait_value" name="wait_value" type="number" min="1" value={localConfig?.wait_value || '1'} onChange={handleInputChange} className="bg-white/5 mt-1" />
            </div>
            <div>
              <Label htmlFor="wait_unit">Unidade</Label>
              <Select name="wait_unit" value={localConfig?.wait_unit || 'hours'} onValueChange={(value) => handleSelectChange('wait_unit', value)}>
                <SelectTrigger className="w-full bg-white/5 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutos</SelectItem>
                  <SelectItem value="hours">Horas</SelectItem>
                  <SelectItem value="days">Dias</SelectItem>
                  <SelectItem value="weeks">Semanas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );



      case 'condition':
        return (
          <div className="space-y-4">
            <div>
              <Label>Tipo de Condição</Label>
              <Select name="condition_type" value={localConfig?.condition_type || 'tag_check'} onValueChange={(value) => handleSelectChange('condition_type', value)}>
                <SelectTrigger className="w-full bg-white/5 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tag_check">Possui Tag</SelectItem>
                  <SelectItem value="temperature_check">Temperatura</SelectItem>
                  <SelectItem value="custom_field">Campo Personalizado</SelectItem>
                  <SelectItem value="lead_score">Pontuação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {localConfig.condition_type === 'tag_check' && (
              <div>
                <Label htmlFor="tag_check">Tag a verificar</Label>
                <Input id="tag_check" name="tag_check" value={localConfig?.tag_check || ''} onChange={handleInputChange} className="bg-white/5 mt-1" placeholder="Ex: interessado" />
              </div>
            )}

            {localConfig.condition_type === 'temperature_check' && (
              <div>
                <Label htmlFor="temperature_value">Temperatura</Label>
                <Select name="temperature_value" value={localConfig?.temperature_value || 'hot'} onValueChange={(value) => handleSelectChange('temperature_value', value)}>
                  <SelectTrigger className="w-full bg-white/5 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold">Cold</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="hot">Hot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {localConfig.condition_type === 'custom_field' && (
              <>
                <div>
                  <Label htmlFor="field_name">Campo</Label>
                  <Input id="field_name" name="field_name" value={localConfig?.field_name || ''} onChange={handleInputChange} className="bg-white/5 mt-1" />
                </div>
                <div>
                  <Label htmlFor="field_value">Valor esperado</Label>
                  <Input id="field_value" name="field_value" value={localConfig?.field_value || ''} onChange={handleInputChange} className="bg-white/5 mt-1" />
                </div>
              </>
            )}

            {localConfig.condition_type === 'lead_score' && (
              <>
                <div>
                  <Label htmlFor="operator">Operador</Label>
                  <Select name="operator" value={localConfig?.operator || 'greater_than'} onValueChange={(value) => handleSelectChange('operator', value)}>
                    <SelectTrigger className="w-full bg-white/5 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Igual a</SelectItem>
                      <SelectItem value="not_equals">Diferente de</SelectItem>
                      <SelectItem value="greater_than">Maior que</SelectItem>
                      <SelectItem value="less_than">Menor que</SelectItem>
                      <SelectItem value="greater_or_equal">Maior ou igual</SelectItem>
                      <SelectItem value="less_or_equal">Menor ou igual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="score_value">Pontuação</Label>
                  <Input id="score_value" name="score_value" type="number" value={localConfig?.score_value || '50'} onChange={handleInputChange} className="bg-white/5 mt-1" />
                </div>
              </>
            )}

            <p className="text-sm text-gray-300 border-t border-white/10 pt-3">
              💡 Use as saídas "Sim" e "Não" para ramificar o fluxo.
            </p>
          </div>
        );

      case 'filter_by_tags':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="filter_mode">Modo de Filtro</Label>
              <Select name="filter_mode" value={localConfig?.filter_mode || 'has_all'} onValueChange={(value) => handleSelectChange('filter_mode', value)}>
                <SelectTrigger className="w-full bg-white/5 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="glass-effect border-white/10 text-white">
                  <SelectItem value="has_all">Possui TODAS as tags</SelectItem>
                  <SelectItem value="has_any">Possui QUALQUER uma das tags</SelectItem>
                  <SelectItem value="has_none">NÃO possui nenhuma das tags</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter_tags">Tags (separadas por vírgula)</Label>
              <Input
                id="filter_tags"
                name="filter_tags"
                value={localConfig?.filter_tags || ''}
                onChange={handleInputChange}
                className="bg-white/5 mt-1"
                placeholder="Ex: vip, interessado, premium"
              />
            </div>
            <p className="text-sm text-gray-300 border-t border-white/10 pt-3">
              💡 Use as saídas "Sim" (passou no filtro) e "Não" (não passou) para ramificar o fluxo.
            </p>
          </div>
        );

      case 'remove_from_funnel':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="removal_mode">Remover se...</Label>
              <Select name="removal_mode" value={localConfig?.removal_mode || 'has_any'} onValueChange={(value) => handleSelectChange('removal_mode', value)}>
                <SelectTrigger className="w-full bg-white/5 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="glass-effect border-white/10 text-white">
                  <SelectItem value="has_any">Possui QUALQUER uma das tags</SelectItem>
                  <SelectItem value="has_all">Possui TODAS as tags</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="removal_tags">Tags (separadas por vírgula)</Label>
              <Input
                id="removal_tags"
                name="removal_tags"
                value={localConfig?.removal_tags || ''}
                onChange={handleInputChange}
                className="bg-white/5 mt-1"
                placeholder="Ex: cancelado, bloqueado, spam"
              />
            </div>
            <p className="text-sm text-gray-300 border-t border-white/10 pt-3">
              ⚠️ O lead será removido do funil e a execução será finalizada.
            </p>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Este nó não possui configurações adicionais.</p>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute top-0 right-0 h-full w-96 bg-slate-900/80 backdrop-blur-lg border-l border-white/10 z-40 flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-white font-bold text-lg">Configurar Nó</h3>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
      </div>
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 bg-gradient-to-r ${config.color || 'from-gray-500 to-gray-600'} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div><h4 className="text-white font-semibold">{node.title}</h4><p className="text-gray-400 text-xs">{node.type}</p></div>
        </div>
        {renderConfigFields()}
      </div>
      <div className="p-4 border-t border-white/10">
        <Button onClick={handleSave} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
          <Save className="w-4 h-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>
    </motion.div>
  );
}

export default NodeConfigurationPanel;