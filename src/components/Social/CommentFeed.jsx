import React, { useState, useEffect, useMemo } from 'react';
// ALTERADO: Importando apiClient
// ALTERADO: Importando apiClient
import apiClient from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch'; // FIXED: Missing import
import { useToast } from "@/components/ui/use-toast";
import { MessageSquare, ThumbsUp, CornerDownRight, Loader2, Send, ChevronDown, ChevronUp, Newspaper, Facebook } from 'lucide-react';
// ALTERADO: Importando nosso AuthContext
import { useAuth } from '@/contexts/AuthContext';

// Sub-componente ReplyForm
function ReplyForm({ comment, onReplySent, onCancel }) {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        setIsSubmitting(true);

        const optimisticReply = {
            id: Math.random(),
            comment_id: `temp_${Math.random()}`,
            parent_comment_id: comment.comment_id,
            message,
            commenter_name: user?.name || "Você",
            timestamp: new Date().toISOString(),
            platform: comment.platform,
            is_liked: false,
            meta_connection_id: comment.meta_connection_id,
            post_id: comment.post_id,
        };

        onReplySent(optimisticReply);
        setMessage('');

        try {
            // ALTERADO: Chama a nossa API para responder
            await apiClient.post('/api/social/comments/reply', {
                comment_id: comment.comment_id,
                message: message,
                connection_id: comment.meta_connection_id,
            });
            toast({ title: "Resposta enviada!", description: "Sua resposta foi postada com sucesso." });
        } catch (error) {
            toast({ title: "Erro ao enviar resposta", description: error.response?.data?.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
            onCancel();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`Respondendo a ${comment.commenter_name}...`} className="bg-white/5 border-white/10 text-white" />
            <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Enviar
                </Button>
            </div>
        </form>
    );
}

// Componente principal do Feed
export function CommentFeed({ connectionId }) {
    const [comments, setComments] = useState([]);
    const [postsDetails, setPostsDetails] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [openPosts, setOpenPosts] = useState(new Set());
    const [showUnansweredOnly, setShowUnansweredOnly] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [pageId, setPageId] = useState(null);

    const { toast } = useToast();

    // Função centralizada para buscar dados (inicial ou paginação)
    async function fetchCommentsAndPosts(cursor = null) {
        if (!connectionId) return;

        try {
            if (cursor) setLoadingMore(true);
            else setLoading(true);

            const response = await apiClient.get('/api/social/feed', {
                params: {
                    connection_id: connectionId,
                    after: cursor
                }
            });

            const { comments: newComments, posts: newPosts, paging, page_id: fetchedPageId } = response.data;

            if (cursor) {
                // Paginação: Append
                setComments(prev => [...prev, ...newComments]);
                setPostsDetails(prev => ({ ...prev, ...newPosts }));
            } else {
                // Inicial: Replace
                setComments(newComments || []);
                setPostsDetails(newPosts || {});
                setPageId(fetchedPageId);
            }

            setNextCursor(paging?.cursors?.after || null);

        } catch (err) {
            console.error("Erro ao buscar dados:", err);
            const errorMsg = err.response?.data?.error || "Erro de conexão ao buscar posts.";
            setError(errorMsg);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }

    useEffect(() => {
        setNextCursor(null); // Reseta paginação ao mudar conexão
        fetchCommentsAndPosts();
    }, [connectionId]);

    const handleLoadMore = () => {
        if (nextCursor) fetchCommentsAndPosts(nextCursor);
    };

    // ALTERADO: handleLikeComment agora usa apiClient
    const handleLikeComment = async (comment) => {
        const originalComments = [...comments];
        const updatedComments = comments.map(c => c.id === comment.id ? { ...c, is_liked: true } : c);
        setComments(updatedComments);

        try {
            await apiClient.post('/api/social/comments/like', {
                comment_id: comment.comment_id,
                connection_id: comment.meta_connection_id,
            });
            toast({ title: "Comentário curtido!", variant: "default" });
        } catch (error) {
            toast({ title: "Erro ao curtir", description: error.response?.data?.message, variant: "destructive" });
            setComments(originalComments);
        }
    };

    const handleReplyOptimistic = (optimisticReply) => { setComments(prev => [...prev, optimisticReply]); };

    const togglePostComments = (postId) => {
        setOpenPosts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) {
                newSet.delete(postId);
            } else {
                newSet.add(postId);
            }
            return newSet;
        });
    };

    const posts = useMemo(() => {
        // Filtrar e organizar posts
        const allPosts = Object.values(postsDetails).map(post => {
            const postComments = comments.filter(c => c.post_id === post.id);

            const commentMap = {};
            const roots = [];

            postComments.forEach(c => {
                commentMap[c.comment_id] = { ...c, replies: [] };
            });

            Object.values(commentMap).forEach(c => {
                if (c.parent_comment_id && commentMap[c.parent_comment_id]) {
                    commentMap[c.parent_comment_id].replies.push(c);
                } else {
                    roots.push(c);
                }
            });

            // Ordenar threads por data decrescente
            const sortedThreads = roots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Verificar se há threads não respondidas (última mensagem da thread NÃO é da página)
            const hasUnanswered = sortedThreads.some(thread => {
                const lastReply = thread.replies.length > 0
                    ? thread.replies.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
                    : thread;

                // Se o ID de quem comentou por último DIFERENTE do ID da minha página, então não respondido
                return lastReply.commenter_id !== pageId;
            });

            return {
                postId: post.id,
                postData: post,
                threads: sortedThreads,
                hasUnanswered
            };
        });

        // Aplicar filtro se ativado
        const filtered = showUnansweredOnly
            ? allPosts.filter(p => p.hasUnanswered)
            : allPosts;

        return filtered.sort((a, b) => new Date(b.postData.created_time) - new Date(a.postData.created_time));
    }, [comments, postsDetails, showUnansweredOnly, pageId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
                <p className="ml-4 text-white">Carregando feed...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8 text-red-400 bg-red-500/10 rounded-lg border border-red-500/20">
                <p className="font-semibold mb-2">Erro ao carregar feed</p>
                <p className="text-sm mb-4">{error}</p>
                <Button variant="outline" size="sm" onClick={() => fetchCommentsAndPosts()} className="border-red-500/30 hover:bg-red-500/10 text-red-400">
                    Tentar Novamente
                </Button>
            </div>
        );
    }

    // O componente CommentCard e o resto do JSX não precisam de alterações
    const CommentCard = ({ comment, isReply = false }) => {
        const isLiked = comment.is_liked;
        const hasReplies = comment.replies && comment.replies.length > 0;
        const [repliesVisible, setRepliesVisible] = useState(true); // Padrão: expandido

        return (
            <div className={`relative ${isReply ? 'ml-6 mt-3' : 'mt-4'}`}>
                {/* Linha conectora para respostas */}
                {isReply && (
                    <div className="absolute -left-4 top-0 bottom-0 w-px bg-white/10 rounded-b-lg h-full">
                        <div className="absolute top-6 -left-[1px] w-4 h-px bg-white/10"></div>
                    </div>
                )}

                <div className={`flex gap-3 group`}>
                    <Avatar className="w-8 h-8 md:w-10 md:h-10 border border-white/10 mt-1">
                        <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-xs font-bold text-white">
                            {comment.commenter_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 max-w-full">
                        {/* Balão do Comentário */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-3 relative hover:bg-white/10 transition-colors">
                            <div className="flex justify-between items-start">
                                <span className="font-semibold text-sm text-white hover:underline cursor-pointer">
                                    {comment.commenter_name}
                                </span>
                                {comment.platform && (
                                    <Badge variant="outline" className="text-[10px] h-5 border-white/10 text-gray-500 py-0 px-1.5 ml-2">
                                        {comment.platform === 'facebook' ? <Facebook className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                                    </Badge>
                                )}
                            </div>

                            <p className="text-gray-200 text-sm mt-1 whitespace-pre-wrap break-words leading-relaxed">
                                {comment.message}
                            </p>

                            {/* Botão de Like Flutuante (estilo FB) */}
                            {isLiked && (
                                <div className="absolute -right-2 -bottom-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-1 shadow-lg border border-gray-900">
                                    <ThumbsUp className="w-3 h-3 text-white fill-current" />
                                </div>
                            )}
                        </div>

                        {/* Ações do Comentário (Curtir, Responder, Data) */}
                        <div className="flex items-center gap-4 mt-1 pl-2 text-xs text-gray-400 font-medium">
                            <button
                                onClick={() => handleLikeComment(comment)}
                                className={`hover:underline flex items-center gap-1 transition-colors ${isLiked ? 'text-green-500 font-bold' : 'hover:text-gray-300'}`}
                            >
                                {isLiked ? 'Curtido' : 'Curtir'}
                            </button>

                            <button
                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                className="hover:underline hover:text-gray-300"
                            >
                                Responder
                            </button>

                            <span>{new Date(comment.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* Formulário de Resposta */}
                        {replyingTo === comment.id && (
                            <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                <ReplyForm
                                    comment={comment}
                                    onReplySent={handleReplyOptimistic}
                                    onCancel={() => setReplyingTo(null)}
                                />
                            </div>
                        )}

                        {/* Botão para Expandir/Recolher Respostas */}
                        {hasReplies && (
                            <div className="mt-2">
                                <button
                                    onClick={() => setRepliesVisible(!repliesVisible)}
                                    className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
                                >
                                    {repliesVisible ? <ChevronUp className="w-3 h-3" /> : <CornerDownRight className="w-3 h-3" />}
                                    {repliesVisible ? 'Ocultar respostas' : `Ver ${comment.replies.length} resposta(s)`}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Renderização Recursiva das Respostas */}
                {hasReplies && repliesVisible && (
                    <div className="border-l-2 border-white/5 ml-4 md:ml-5 pl-2 md:pl-0">
                        {comment.replies.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map(reply => (
                            <CommentCard key={reply.id} comment={reply} isReply={true} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header com Filtros */}
            <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-lg border border-white/10">
                <h3 className="text-white font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Feed de Comentários
                </h3>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">Apenas não respondidos</span>
                    <Switch
                        checked={showUnansweredOnly}
                        onCheckedChange={setShowUnansweredOnly}
                    />
                </div>
            </div>

            {/* Lista de Posts */}
            {posts.length === 0 ? (
                <div className="text-center p-8 glass-effect rounded-lg">
                    <MessageSquare className="mx-auto w-12 h-12 text-gray-500" />
                    <h3 className="mt-4 text-xl font-semibold text-white">Nenhum post encontrado</h3>
                    <p className="text-gray-400 mt-2">
                        {showUnansweredOnly ? "Você respondeu a todos os comentários recentes! Bom trabalho." : "Sua página ainda não tem publicações recentes ou comentários."}
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    {posts.map(({ postId, postData, threads }) => {
                        const areCommentsOpen = openPosts.has(postId);
                        const commentsCount = threads.length;

                        return (
                            <Card key={postId} className="glass-effect border-white/10 text-white overflow-hidden">
                                <CardHeader className="bg-white/5 p-4">
                                    <div className="flex items-start gap-4">
                                        {postData?.full_picture ? (
                                            <img src={postData.full_picture} alt="Imagem do post" className="w-20 h-20 object-cover rounded-md" />
                                        ) : (
                                            <div className="w-20 h-20 rounded-md bg-gray-700/50 flex items-center justify-center">
                                                <Newspaper className="w-8 h-8 text-gray-500" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <p className="text-gray-300 text-sm leading-relaxed max-h-20 overflow-y-auto">
                                                {postData?.message || "Este post não contém texto."}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-gray-400">{new Date(postData.created_time).toLocaleDateString('pt-BR')}</span>
                                                <a href={postData?.permalink_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">Ver no Facebook</a>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="bg-gray-800/30 p-2 text-center">
                                        <Button variant="ghost" className="w-full h-8 text-xs" onClick={() => togglePostComments(postId)}>
                                            {areCommentsOpen ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                                            {areCommentsOpen ? 'Ocultar Comentários' : (commentsCount > 0 ? `Ver ${commentsCount} Comentários` : 'Nenhum comentário (Seja o primeiro!)')}
                                        </Button>
                                    </div>
                                    {areCommentsOpen && (
                                        <div className="p-4">
                                            {commentsCount > 0 ? (
                                                threads.map((comment) => (
                                                    <CommentCard key={comment.id} comment={comment} />
                                                ))
                                            ) : (
                                                <p className="text-center text-sm text-gray-500 italic py-4">Nenhum comentário neste post.</p>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}

                    {/* Botão Carregar Mais */}
                    {nextCursor && (
                        <div className="flex justify-center pt-4">
                            <Button onClick={handleLoadMore} disabled={loadingMore} variant="secondary" className="w-full md:w-auto">
                                {loadingMore ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                                Carregar Mais Posts
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}