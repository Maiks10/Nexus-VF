import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot,
    Brain,
    Sparkles,
    Save,
    Plus,
    Trash2,
    FileText,
    Settings,
    Code,
    Zap,
    Building2,
    BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/components/ui/use-toast';
import apiClient from '@/lib/customSupabaseClient';

// Components
import AgentNode from './AgentNode';
import KnowledgeNode from './KnowledgeNode';
import RuleNode from './RuleNode';

// Constants for Models
const MODELS = {
    'OpenAI': [
        { value: 'gpt-4o', label: 'GPT-4o (Omni) - Mais Inteligente' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-4', label: 'GPT-4 Clássico' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo - Rápido/Econômico' }
    ],
    'Gemini': [
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro - SOTA' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash - Baixa Latência' },
        { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' }
    ],
    'Claude': [
        { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
        { value: 'claude-3-opus', label: 'Claude 3 Opus' },
        { value: 'claude-3-haiku', label: 'Claude 3 Haiku' }
    ]
};

export function AgentBuilder({ agent: initialAgent, onClose, onSave }) {
    const [activeTab, setActiveTab] = useState('canvas');

    // Core State
    const [agentName, setAgentName] = useState(initialAgent?.name || 'Novo Agente');
    const [agentDescription, setAgentDescription] = useState(initialAgent?.description || '');
    const [agentProvider, setAgentProvider] = useState(initialAgent?.provider || 'OpenAI');
    const [apiKey, setApiKey] = useState(initialAgent?.api_key || '');
    const [model, setModel] = useState(initialAgent?.config?.model || MODELS['OpenAI'][0].value); // Exemplo de config extra

    // Custom Agent / Assistant ID State
    const [useCustomAgent, setUseCustomAgent] = useState(!!initialAgent?.custom_agent_id);
    const [customAgentId, setCustomAgentId] = useState(initialAgent?.custom_agent_id || '');

    // Modular State (Load from config if available, otherwise defaults)
    const [companyInfo, setCompanyInfo] = useState(initialAgent?.config?.companyInfo || '');
    // Se não tiver config (agente antigo), tenta usar o prompt, mas idealmente estaria separado.
    const [instructions, setInstructions] = useState(initialAgent?.config?.instructions || initialAgent?.prompt || '');
    const [rules, setRules] = useState(initialAgent?.config?.rules || []);
    const [knowledgeBases, setKnowledgeBases] = useState(initialAgent?.config?.knowledgeBases || []);

    // Se for um agente antigo sem config, o 'instructions' pegou o prompt inteiro.
    // Poderíamos tentar fazer um parse reverso, mas por segurança vamos deixar assim.

    const [nodes, setNodes] = useState([
        { id: 'core', type: 'core', data: { name: agentName, provider: agentProvider } }
    ]);

    const { toast } = useToast();

    const handleSave = async () => {
        // Construct the "Master Prompt" for the LLM
        // If using custom agent ID (Assistants API), the prompts might be managed there, 
        // but typically we still send instructions as "Additional Instructions" or specific overrides.
        // For this implementation, we preserve the prompt generation to keep it useful for both modes.
        const masterPrompt = `
[CONTEXTO DA EMPRESA]
${companyInfo}

[INSTRUÇÕES PRINCIPAIS]
${instructions}

[REGRAS E LIMITAÇÕES]
${rules.map(r => `- ${r}`).join('\n')}

[BASE DE CONHECIMENTO]
${knowledgeBases.map(kb => `- ${kb.name}: ${kb.summary}`).join('\n')}
    `.trim();

        const agentData = {
            name: agentName,
            description: agentDescription,
            provider: agentProvider,
            api_key: apiKey,
            prompt: masterPrompt,
            custom_agent_id: useCustomAgent ? customAgentId : null,
            // Save granular data in config to restore UI state later
            config: {
                companyInfo,
                instructions, // Save pure instructions without the master prompt wrapping
                rules,
                knowledgeBases,
                model,
                useCustomAgent,
                customAgentId
            }
        };

        onSave(agentData);
    };

    // Update default model when provider changes
    const handleProviderChange = (newProvider) => {
        setAgentProvider(newProvider);
        // Set default model for the new provider
        if (MODELS[newProvider]) {
            setModel(MODELS[newProvider][0].value);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0f111a] flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0f111a]/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white">
                        <span className="sr-only">Voltar</span>
                        ← Voltar
                    </Button>
                    <div className="h-6 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-purple-500" />
                        <span className="text-lg font-bold text-white max-w-[200px] truncate">{agentName}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={() => setActiveTab('settings')}>
                            <Settings className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={onClose} className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white">
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0">
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Agente
                    </Button>
                </div>
            </header>

            {/* Main Content - Split View */}
            <div className="flex-1 flex overflow-hidden">

                {/* Left Sidebar - Toolbox */}
                <div className="w-72 border-r border-white/10 bg-[#0f111a]/50 p-6 flex flex-col gap-6 overflow-y-auto">
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Configuração</h3>
                        <div className="space-y-2">
                            <ToolCard icon={Settings} label="Configurações Gerais" color="gray" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Habilidades</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <ToolCard icon={Building2} label="Empresa" color="blue" active={activeTab === 'company'} onClick={() => setActiveTab('company')} />
                            <ToolCard icon={FileText} label="Instruções" color="purple" active={activeTab === 'instructions'} onClick={() => setActiveTab('instructions')} />
                            <ToolCard icon={Zap} label="Regras" color="yellow" active={activeTab === 'rules'} onClick={() => setActiveTab('rules')} />
                            <ToolCard icon={BookOpen} label="Conhecimento" color="green" active={activeTab === 'knowledge'} onClick={() => setActiveTab('knowledge')} />
                        </div>
                    </div>

                    <div className="mt-auto">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-purple-400" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-white text-sm">Dica Pro</h4>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Clique no card central do agente para editar suas configurações principais, como API Key e Modelo.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Center - Canvas/Editor Area */}
                <div className="flex-1 bg-grid-white/[0.02] relative overflow-hidden flex flex-col">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0f111a] via-transparent to-[#0f111a]/80" />

                    <main className="relative z-10 flex-1 p-8 overflow-y-auto">
                        <div className="max-w-4xl mx-auto space-y-8">

                            {/* Core Identity - Clickable to open Settings */}
                            <div className="flex justify-center cursor-pointer" onClick={() => setActiveTab('settings')}>
                                <AgentNode name={agentName} provider={agentProvider} />
                            </div>

                            {/* Connected Modules Visualization */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">

                                {/* Knowledge Section */}
                                <SectionBlock title="Base de Conhecimento" icon={BookOpen} color="text-green-400">
                                    {knowledgeBases.length === 0 ? (
                                        <EmptyState label="Nenhum conhecimento vinculado" onClick={() => setActiveTab('knowledge')} />
                                    ) : (
                                        knowledgeBases.map((kb, i) => (
                                            <KnowledgeNode key={i} data={kb} onDelete={() => {
                                                setKnowledgeBases(prev => prev.filter((_, idx) => idx !== i));
                                            }} />
                                        ))
                                    )}
                                </SectionBlock>

                                {/* Rules Section */}
                                <SectionBlock title="Regras e Segurança" icon={Zap} color="text-yellow-400">
                                    {rules.length === 0 ? (
                                        <EmptyState label="Nenhuma regra definida" onClick={() => setActiveTab('rules')} />
                                    ) : (
                                        rules.map((rule, i) => (
                                            <RuleNode key={i} rule={rule} onDelete={() => {
                                                setRules(prev => prev.filter((_, idx) => idx !== i));
                                            }} />
                                        ))
                                    )}
                                </SectionBlock>

                                {/* Company & Instructions (Combined visually as "Context") */}
                                <SectionBlock title="Contexto e Instruções" icon={Brain} color="text-purple-400" className="md:col-span-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div
                                            className="bg-white/5 border border-white/10 rounded-lg p-4 cursor-pointer hover:border-blue-500/50 transition-colors h-full"
                                            onClick={() => setActiveTab('company')}
                                        >
                                            <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-blue-400" /> Sobre a Empresa
                                            </h4>
                                            <p className="text-gray-400 text-sm line-clamp-3">
                                                {companyInfo || "Clique para adicionar informações sobre a empresa..."}
                                            </p>
                                        </div>
                                        <div
                                            className="bg-white/5 border border-white/10 rounded-lg p-4 cursor-pointer hover:border-purple-500/50 transition-colors h-full"
                                            onClick={() => setActiveTab('instructions')}
                                        >
                                            <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-purple-400" /> Instruções do Sistema
                                            </h4>
                                            <p className="text-gray-400 text-sm line-clamp-3">
                                                {instructions || "Clique para definir o comportamento principal do agente..."}
                                            </p>
                                        </div>
                                    </div>
                                </SectionBlock>

                            </div>
                        </div>
                    </main>
                </div>

                {/* Right Sidebar - Dynamic Configuration */}
                <AnimatePresence mode="wait">
                    {activeTab !== 'canvas' && (
                        <motion.div
                            key={activeTab}
                            initial={{ x: 300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 300, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="w-96 border-l border-white/10 bg-[#0f111a] absolute right-0 top-16 bottom-0 z-20 shadow-2xl flex flex-col"
                        >
                            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                                <h3 className="font-semibold text-white flex items-center gap-2">
                                    {activeTab === 'settings' && <><Settings className="w-4 h-4" /> Configurações do Agente</>}
                                    {activeTab === 'company' && <><Building2 className="w-4 h-4" /> Informações da Empresa</>}
                                    {activeTab === 'instructions' && <><FileText className="w-4 h-4" /> Instruções do Sistema</>}
                                    {activeTab === 'rules' && <><Zap className="w-4 h-4" /> Regras e Limites</>}
                                    {activeTab === 'knowledge' && <><BookOpen className="w-4 h-4" /> Base de Conhecimento</>}
                                </h3>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setActiveTab('canvas')}>
                                    <span className="sr-only">Fechar</span>
                                    <Plus className="w-4 h-4 rotate-45" />
                                </Button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 text-white custom-scrollbar">

                                {activeTab === 'settings' && (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-300">Nome do Agente</label>
                                            <Input
                                                value={agentName}
                                                onChange={(e) => setAgentName(e.target.value)}
                                                className="bg-white/5 border-white/10"
                                                placeholder="Ex: Assistente de Vendas"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-300">Descrição</label>
                                            <Textarea
                                                value={agentDescription}
                                                onChange={(e) => setAgentDescription(e.target.value)}
                                                className="bg-white/5 border-white/10"
                                                placeholder="Uma breve descrição do que este agente faz..."
                                            />
                                        </div>

                                        <div className="pt-4 border-t border-white/10 space-y-4">
                                            <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Integração IA</h4>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2 col-span-2">
                                                    <label className="text-sm font-medium text-gray-300">Provedor</label>
                                                    <Select value={agentProvider} onValueChange={handleProviderChange}>
                                                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="OpenAI">OpenAI (GPT)</SelectItem>
                                                            <SelectItem value="Gemini">Google Gemini</SelectItem>
                                                            <SelectItem value="Claude">Anthropic Claude</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {/* Model Selection */}
                                            {!useCustomAgent && (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-300">Modelo de IA</label>
                                                    <Select value={model} onValueChange={setModel}>
                                                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {MODELS[agentProvider]?.map((m) => (
                                                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            {/* Custom Agent Toggle (Primarily for OpenAI) */}
                                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                                <div className="space-y-0.5">
                                                    <label className="text-sm font-medium text-white flex items-center gap-2">
                                                        {agentProvider === 'OpenAI' ? 'Usar Assistants API ID' : 'Usar Agente Existente'}
                                                    </label>
                                                    <p className="text-[10px] text-gray-400">
                                                        {agentProvider === 'OpenAI'
                                                            ? 'Conectar um Assistente criado no OpenAI Playground.'
                                                            : 'Usar ID de um agente personalizado.'}
                                                    </p>
                                                </div>
                                                <Switch checked={useCustomAgent} onCheckedChange={setUseCustomAgent} />
                                            </div>

                                            {/* Custom Agent ID Input */}
                                            {useCustomAgent && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="space-y-2"
                                                >
                                                    <label className="text-sm font-medium text-purple-300">
                                                        {agentProvider === 'OpenAI' ? 'Assistant ID (asst_...)' : 'Custom Agent ID'}
                                                    </label>
                                                    <Input
                                                        value={customAgentId}
                                                        onChange={(e) => setCustomAgentId(e.target.value)}
                                                        className="bg-purple-500/10 border-purple-500/30 text-white"
                                                        placeholder={agentProvider === 'OpenAI' ? "asst_abc123..." : "agent-id..."}
                                                    />
                                                </motion.div>
                                            )}

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-300">API Key</label>
                                                <Input
                                                    type="password"
                                                    value={apiKey}
                                                    onChange={(e) => setApiKey(e.target.value)}
                                                    className="bg-white/5 border-white/10"
                                                    placeholder="sk-..."
                                                />
                                                <p className="text-[10px] text-gray-500">Sua chave é criptografada e armazenada com segurança.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'company' && (
                                    <div className="space-y-4">
                                        <p className="text-sm text-gray-400">Descreva o que sua empresa faz, produtos, serviços e valores. Isso dá contexto ao agente sobre quem ele representa.</p>
                                        <Textarea
                                            value={companyInfo}
                                            onChange={(e) => setCompanyInfo(e.target.value)}
                                            className="bg-white/5 border-white/10 min-h-[400px] text-white resize-none p-4 leading-relaxed"
                                            placeholder="Ex: A Nexus Inc é uma empresa de tecnologia que..."
                                        />
                                    </div>
                                )}

                                {activeTab === 'instructions' && (
                                    <div className="space-y-4">
                                        <p className="text-sm text-gray-400">O que esse agente deve fazer? Qual o objetivo dele? Defina a persona e o tom de voz.</p>
                                        <Textarea
                                            value={instructions}
                                            onChange={(e) => setInstructions(e.target.value)}
                                            className="bg-white/5 border-white/10 min-h-[400px] text-white resize-none p-4 leading-relaxed"
                                            placeholder="Ex: Você é um especialista em vendas sênior. Seu tom é profissional, mas acolhedor..."
                                        />
                                    </div>
                                )}

                                {activeTab === 'rules' && (
                                    <div className="space-y-6">
                                        <div className="flex gap-2">
                                            <Input id="new-rule" className="bg-white/5 border-white/10" placeholder="Nova regra..." onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const val = e.target.value;
                                                    if (val) { setRules([...rules, val]); e.target.value = ''; }
                                                }
                                            }} />
                                            <Button onClick={() => {
                                                const input = document.getElementById('new-rule');
                                                if (input.value) {
                                                    setRules([...rules, input.value]);
                                                    input.value = '';
                                                }
                                            }} variant="secondary">Add</Button>
                                        </div>
                                        <div className="space-y-2">
                                            {rules.map((rule, i) => (
                                                <div key={i} className="bg-white/5 p-3 rounded-md flex items-center justify-between group border border-transparent hover:border-white/10 transition-all">
                                                    <span className="text-sm text-gray-300">{rule}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-400/10 h-6 w-6 p-0"
                                                        onClick={() => setRules(rules.filter((_, idx) => idx !== i))}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {rules.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Nenhuma regra definida ainda.</p>}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'knowledge' && (
                                    <div className="space-y-6">
                                        <div
                                            className="border-2 border-dashed border-white/10 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer group"
                                            onClick={() => document.getElementById('kb-upload').click()}
                                        >
                                            <div className="p-3 bg-white/5 rounded-full mb-3 group-hover:bg-white/10 transition-colors">
                                                <UploadIcon />
                                            </div>
                                            <p className="text-sm font-medium text-white">Upload de Arquivos</p>
                                            <p className="text-xs text-gray-500 mt-1">PDF, TXT, DOCX</p>
                                            <input
                                                id="kb-upload"
                                                type="file"
                                                multiple
                                                className="hidden"
                                                onChange={(e) => {
                                                    const files = Array.from(e.target.files);
                                                    const newKbs = files.map(file => ({
                                                        id: Math.random().toString(36).substr(2, 9),
                                                        name: file.name,
                                                        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                                                        summary: "Arquivo carregado do dispositivo local.",
                                                        file: file // In a real app, upload this
                                                    }));
                                                    setKnowledgeBases([...knowledgeBases, ...newKbs]);
                                                }}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase flex items-center justify-between">
                                                Arquivos ({knowledgeBases.length})
                                            </h4>
                                            {knowledgeBases.map((kb, i) => (
                                                <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10 group hover:border-white/20 transition-all">
                                                    <FileText className="w-8 h-8 text-blue-400/80 p-1.5 bg-blue-400/10 rounded-md" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">{kb.name}</p>
                                                        <p className="text-xs text-gray-500">{kb.size}</p>
                                                    </div>
                                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100" onClick={() => setKnowledgeBases(prev => prev.filter((_, idx) => idx !== i))}>
                                                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-white" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {knowledgeBases.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4">Nenhum arquivo vinculado.</p>}
                                        </div>
                                    </div>
                                )}

                            </div>
                            <div className="p-4 border-t border-white/10 bg-[#0f111a]">
                                <Button className="w-full bg-white/10 hover:bg-white/20 text-white" onClick={() => setActiveTab('canvas')}>
                                    <span className="mr-2">Confirmar Edição</span>
                                    <Code className="w-4 h-4" />
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}

// Subcomponents
function ToolCard({ icon: Icon, label, color, onClick, active }) {
    const colorMap = {
        blue: "text-blue-400",
        purple: "text-purple-400",
        yellow: "text-yellow-400",
        green: "text-green-400",
        gray: "text-gray-400"
    };

    return (
        <button
            onClick={onClick}
            className={`group flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 w-full relative overflow-hidden
        ${active
                    ? 'bg-white/10 border-white/30 shadow-lg'
                    : 'bg-transparent border-white/5 hover:bg-white/5 hover:border-white/10'
                }`}
        >
            <div className={`p-2 rounded-lg mb-2 transition-colors ${active ? 'bg-white/10' : 'bg-transparent'} ${colorMap[color]}`}>
                <Icon className="w-6 h-6" />
            </div>
            <span className={`text-xs font-medium ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                {label}
            </span>
            {active && <div className="absolute inset-0 border-2 border-white/20 rounded-xl pointer-events-none" />}
        </button>
    );
}

function SectionBlock({ title, icon: Icon, children, color, className }) {
    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <h3 className="text-lg font-semibold text-white">{title}</h3>
            </div>
            <div className="min-h-[100px] p-1 space-y-3">
                {children}
            </div>
        </div>
    );
}

function EmptyState({ label, onClick }) {
    return (
        <div
            onClick={onClick}
            className="h-24 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center cursor-pointer hover:border-white/20 hover:bg-white/5 transition-all group"
        >
            <div className="flex items-center gap-2 text-gray-500 group-hover:text-gray-300">
                <Plus className="w-5 h-5" />
                <span className="text-sm font-medium">{label}</span>
            </div>
        </div>
    );
}

function UploadIcon() {
    return (
        <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
    );
}
