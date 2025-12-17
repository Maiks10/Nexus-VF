import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommentFeed } from '@/components/Social/CommentFeed';
import { List, Settings, Repeat, PlusCircle, Trash2, Edit, MessageSquare, Facebook } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Switch } from "@/components/ui/switch";
// ALTERADO: Importando apiClient
import apiClient from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/AuthContext';

// --- COMPONENTE DO EDITOR DE AUTOMAÇÃO ---
function AutomationEditor({ onSaveSuccess, onCancel, initialData, connectedPageId }) {
    const [triggerName, setTriggerName] = useState(initialData?.name || '');
    const [postScope, setPostScope] = useState(initialData?.config?.post_scope || 'all_posts');
    const [selectedPost, setSelectedPost] = useState(initialData?.config?.post_id || '');
    const [condition, setCondition] = useState(initialData?.config?.condition || 'contains_keyword');
    const [keywords, setKeywords] = useState(initialData?.config?.keywords?.join(', ') || '');
    const [action, setAction] = useState(initialData?.actions?.[0]?.type || 'reply_only');
    const [replyMessage, setReplyMessage] = useState(initialData?.actions?.[0]?.config?.reply_message || '');
    const [selectedAiAgent, setSelectedAiAgent] = useState(initialData?.actions?.[0]?.config?.ai_agent_id || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [aiAgents, setAiAgents] = useState([]);
    const [isLoadingAgents, setIsLoadingAgents] = useState(false);
    const [pagePosts, setPagePosts] = useState([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);
    const [postsCursor, setPostsCursor] = useState(null);
    const [hasMorePosts, setHasMorePosts] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    // ... (fetchAiAgents effect maintained) ...

    async function fetchPagePosts(cursor = null) {
        if (postScope === 'single_post' && user) {
            setIsLoadingPosts(true);
            try {
                // ALTERADO: Busca posts da nossa API com paginação
                const response = await apiClient.get('/api/social/posts', {
                    params: { after: cursor, limit: 5, connection_id: connectedPageId }
                });

                const newPosts = response.data.posts || [];
                const nextCursor = response.data.paging?.cursors?.after;

                if (cursor) {
                    setPagePosts(prev => [...prev, ...newPosts]);
                } else {
                    setPagePosts(newPosts);
                }

                setPostsCursor(nextCursor);
                setHasMorePosts(!!nextCursor);

            } catch (error) {
                toast({ title: "Erro ao buscar posts", description: error.response?.data?.message, variant: "destructive" });
            } finally {
                setIsLoadingPosts(false);
            }
        }
    }

    useEffect(() => {
        // Reseta tudo ao mudar para single_post
        if (postScope === 'single_post') {
            setPagePosts([]);
            setPostsCursor(null);
            fetchPagePosts();
        }
    }, [postScope, user, toast]);

    // ... (handleSaveAutomation maintained) ...
    const handleSaveAutomation = async (e) => {
        e.preventDefault();
        if (!triggerName) {
            toast({ title: "Campo obrigatório", description: "Por favor, dê um nome para a automação.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);

        const automationData = {
            name: triggerName,
            config: {
                post_scope: postScope,
                post_id: postScope === 'single_post' ? selectedPost : 'all',
                condition: condition,
                keywords: condition !== 'any_comment' ? keywords.split(',').map(k => k.trim()) : [],
            },
            action: {
                type: action,
                config: {
                    reply_message: (action === 'reply_only' || action === 'reply_and_dm') ? replyMessage : null,
                    ai_agent_id: (action === 'reply_with_ai' || action === 'reply_with_ai_and_dm') ? selectedAiAgent : null,
                }
            }
        };

        try {
            if (initialData) {
                // ALTERADO: Atualiza automação via API
                await apiClient.put(`/api/automations/${initialData.id}`, automationData);
            } else {
                // ALTERADO: Cria automação via API
                await apiClient.post('/api/automations', automationData);
            }
            toast({ title: "Sucesso!", description: "Sua automação foi salva." });
            onSaveSuccess();
        } catch (error) {
            toast({ title: "Erro ao salvar automação", description: error.response?.data?.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="glass-effect border-white/10 text-white">
            {/* Headers ... */}
            <CardContent>
                <form onSubmit={handleSaveAutomation} className="space-y-6">
                    <div className="space-y-2"><Label htmlFor="trigger-name">Nome da Automação</Label><Input id="trigger-name" placeholder="Ex: Resposta para 'eu quero'" value={triggerName} onChange={(e) => setTriggerName(e.target.value)} className="bg-white/5" /></div>
                    <div className="space-y-2"><Label>Aplicar em:</Label><Select value={postScope} onValueChange={setPostScope}><SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all_posts">Todos os Posts</SelectItem><SelectItem value="single_post">Um Post Específico</SelectItem></SelectContent></Select></div>
                    {postScope === 'single_post' && (
                        <div className="space-y-2">
                            <Label>Selecione o Post</Label>
                            <Select value={selectedPost} onValueChange={setSelectedPost} disabled={isLoadingPosts && pagePosts.length === 0}>
                                <SelectTrigger className="bg-white/5">
                                    <SelectValue placeholder={isLoadingPosts && pagePosts.length === 0 ? 'Buscando posts...' : 'Selecione um post'} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {pagePosts.map(post => (
                                        <SelectItem key={post.id} value={post.id}>
                                            {post.message ? (post.message.length > 50 ? post.message.substring(0, 50) + '...' : post.message) : `Post de ${new Date(post.created_time).toLocaleDateString()}`}
                                        </SelectItem>
                                    ))}
                                    {hasMorePosts && (
                                        <Button
                                            variant="ghost"
                                            className="w-full text-xs text-blue-400 h-8 mt-1"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation(); // Tenta evitar fechar, mas SelectItem pode fechar
                                                fetchPagePosts(postsCursor);
                                            }}
                                            disabled={isLoadingPosts}
                                        >
                                            {isLoadingPosts ? 'Carregando...' : 'Carregar Mais Posts'}
                                        </Button>
                                    )}
                                </SelectContent>
                            </Select>
                            {hasMorePosts && (
                                <p className="text-xs text-gray-400 text-right cursor-pointer hover:text-white" onClick={() => fetchPagePosts(postsCursor)}>
                                    {isLoadingPosts ? 'Carregando...' : 'Carregar mais posts antigos...'}
                                </p>
                            )}
                        </div>
                    )}
                    <div className="space-y-2"><Label>Gatilho: Se um comentário...</Label><Select value={condition} onValueChange={setCondition}><SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="contains_keyword">Contiver uma das palavras-chave</SelectItem><SelectItem value="exact_keyword">For exatamente a palavra-chave</SelectItem><SelectItem value="any_comment">For qualquer comentário</SelectItem></SelectContent></Select></div>
                    {condition !== 'any_comment' && (<div className="space-y-2"><Label htmlFor="keywords">Palavras-chave</Label><Input id="keywords" placeholder="quero, interesse, valor" value={keywords} onChange={(e) => setKeywords(e.target.value)} className="bg-white/5" /><p className="text-xs text-gray-400">Separar por vírgulas.</p></div>)}
                    <hr className="border-white/10" />
                    <div className="space-y-2"><Label>Ação: O que o sistema deve fazer?</Label><Select value={action} onValueChange={setAction}><SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="reply_only">Apenas responder o comentário</SelectItem><SelectItem value="reply_with_ai">Responder o comentário com IA</SelectItem><SelectItem value="reply_and_dm">Responder e enviar uma DM</SelectItem><SelectItem value="reply_with_ai_and_dm">Responder com IA e enviar uma DM</SelectItem></SelectContent></Select></div>
                    {(action === 'reply_only' || action === 'reply_and_dm') && (<div className="space-y-2"><Label htmlFor="replyMessage">Texto da Resposta</Label><Textarea id="replyMessage" placeholder="Olá! Agradecemos seu comentário. Te enviamos uma DM com mais informações." value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} className="bg-white/5" /></div>)}
                    {(action === 'reply_with_ai' || action === 'reply_with_ai_and_dm') && (<div className="space-y-2"><Label>Selecione o Agente de IA</Label><Select value={selectedAiAgent} onValueChange={setSelectedAiAgent} disabled={isLoadingAgents}><SelectTrigger className="bg-white/5"><SelectValue placeholder={isLoadingAgents ? 'Carregando agentes...' : 'Selecione um agente'} /></SelectTrigger><SelectContent>{!isLoadingAgents && aiAgents.map(agent => (<SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>))}</SelectContent></Select></div>)}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-purple-500 to-pink-500">
                            <PlusCircle className="w-4 h-4 mr-2" />
                            {isSubmitting ? 'Salvando...' : 'Salvar Automação'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

function AutomationsList({ onEdit, onCreateNew }) {
    const [automations, setAutomations] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    async function fetchAutomations() {
        setLoading(true);
        try {
            // ALTERADO: Busca automações da nossa API
            const response = await apiClient.get('/api/automations');
            setAutomations(response.data || []);
        } catch (error) {
            toast({ title: "Erro", description: "Não foi possível carregar as automações.", variant: "destructive" });
        }
        setLoading(false);
    }

    useEffect(() => { fetchAutomations(); }, []);

    const handleDelete = async (automationId) => {
        if (!confirm('Tem certeza que deseja excluir esta automação? Esta ação não pode ser desfeita.')) return;
        try {
            // ALTERADO: Deleta automação via API
            await apiClient.delete(`/api/automations/${automationId}`);
            toast({ title: "Sucesso!", description: "Automação excluída." });
            fetchAutomations();
        } catch (error) {
            toast({ title: "Erro ao excluir", description: error.response?.data?.message, variant: "destructive" });
        }
    };

    const handleToggleActive = async (automation) => {
        const newStatus = !automation.is_active;
        const originalAutomations = [...automations];
        setAutomations(prev => prev.map(a => a.id === automation.id ? { ...a, is_active: newStatus } : a));
        try {
            // ALTERADO: Ativa/Desativa automação via API
            await apiClient.patch(`/api/automations/${automation.id}/toggle`, { is_active: newStatus });
        } catch (error) {
            toast({ title: "Erro", description: "Não foi possível alterar o status.", variant: "destructive" });
            setAutomations(originalAutomations);
        }
    };

    return (
        <Card className="glass-effect border-white/10 text-white">
            <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Automações Ativas</CardTitle><CardDescription className="text-gray-400">Gerencie seus gatilhos e ações.</CardDescription></div>
                <Button onClick={onCreateNew} className="bg-gradient-to-r from-purple-500 to-pink-500"><PlusCircle className="w-4 h-4 mr-2" />Criar Nova</Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {loading && <p className="text-center text-gray-400 py-4">Carregando automações...</p>}
                    {!loading && automations.length === 0 && <p className="text-center text-gray-400 py-4">Nenhuma automação criada ainda.</p>}
                    {!loading && automations.map(auto => (
                        <div key={auto.id} className="flex items-center justify-between p-3 rounded-md bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-4">
                                <Switch checked={auto.is_active} onCheckedChange={() => handleToggleActive(auto)} />
                                <p className="font-semibold">{auto.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => onEdit(auto)}><Edit className="w-4 h-4 mr-2" /> Editar</Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(auto.id)}><Trash2 className="w-4 h-4 mr-2" /> Excluir</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// O resto do arquivo (AutomationsManager e SocialManager) não precisa de alterações
function AutomationsManager({ connectedPageId }) {
    const [mode, setMode] = useState('view');
    const [selectedAutomation, setSelectedAutomation] = useState(null);
    const handleCreateNew = () => { setSelectedAutomation(null); setMode('create'); };
    const handleEdit = (automation) => { setSelectedAutomation(automation); setMode('edit'); };
    const handleBackToList = () => { setMode('view'); setSelectedAutomation(null); };
    return (
        <div className="space-y-6">
            <div><h1 className="text-3xl font-bold text-white tracking-tight">Automações</h1><p className="text-gray-400 mt-2">Crie fluxos de trabalho que rodam no piloto automático.</p></div>
            {mode === 'view' && <AutomationsList onCreateNew={handleCreateNew} onEdit={handleEdit} />}
            {(mode === 'create' || mode === 'edit') && <AutomationEditor onSaveSuccess={handleBackToList} onCancel={handleBackToList} initialData={selectedAutomation} connectedPageId={connectedPageId} />}
        </div>
    );
}

export function SocialManager() {
    const [connectedPage, setConnectedPage] = useState(null);

    useEffect(() => {
        async function fetchConnection() {
            try {
                const response = await apiClient.get('/api/integrations/meta/connections');
                if (response.data && response.data.length > 0) {
                    setConnectedPage(response.data[0]);
                }
            } catch (error) {
                console.error("Erro ao buscar conexão Meta:", error);
            }
        }
        fetchConnection();
    }, []);

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-pink-500" />
                    Gestão Social
                </h2>
                {connectedPage ? (
                    <div className="flex items-center gap-3 bg-gray-800/50 px-4 py-2 rounded-lg border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <div>
                            <p className="text-xs text-gray-400">Conta Conectada</p>
                            <p className="text-sm font-medium text-white flex items-center gap-2">
                                <Facebook className="w-4 h-4 text-blue-500" />
                                {connectedPage.page_name}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-yellow-500/10 text-yellow-500 px-4 py-2 rounded-lg text-sm border border-yellow-500/20">
                        Nenhuma conta Facebook conectada
                    </div>
                )}
            </div>

            <Tabs defaultValue="feed" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-800/50 text-gray-400">
                    <TabsTrigger value="feed"><List className="w-4 h-4 mr-2" /> Feed e Comentários</TabsTrigger>
                    <TabsTrigger value="automations"><Repeat className="w-4 h-4 mr-2" /> Automações</TabsTrigger>
                    <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" /> Configurações</TabsTrigger>
                </TabsList>
                <TabsContent value="feed" className="mt-6">
                    <CommentFeed connectionId={connectedPage?.id} />
                </TabsContent>
                <TabsContent value="automations" className="mt-6"><AutomationsManager connectedPageId={connectedPage?.id} /></TabsContent>
                <TabsContent value="settings" className="mt-6"><div className="text-center p-8 glass-effect rounded-lg"><h3 className="text-xl font-semibold text-white">Configurações em Breve</h3><p className="text-gray-400 mt-2">Gerencie as configurações gerais da sua integração social aqui.</p></div></TabsContent>
            </Tabs>
        </div>
    );
}