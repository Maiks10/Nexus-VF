import React, { useState, useEffect, useMemo } from 'react';
// ALTERADO: Importando apiClient
import apiClient from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/components/ui/use-toast";
import { MessageSquare, ThumbsUp, CornerDownRight, Loader2, Send, ChevronDown, ChevronUp, Newspaper } from 'lucide-react';
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
export function CommentFeed() {
    const [comments, setComments] = useState([]);
    const [postsDetails, setPostsDetails] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [openPosts, setOpenPosts] = useState(new Set());
    const { toast } = useToast();

    // ALTERADO: Busca os dados de uma única rota na nossa API
    async function fetchCommentsAndPosts() {
        try {
            setLoading(true);
            const response = await apiClient.get('/api/social/feed');
            const { comments, posts } = response.data;
            
            setComments(comments || []);
            setPostsDetails(posts || {});

        } catch (err) {
            console.error("Erro ao buscar dados:", err);
            setError("Não foi possível carregar os dados.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchCommentsAndPosts(); }, []);

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
        const groupedByPost = comments.reduce((acc, comment) => {
            const postId = comment.post_id;
            if (!acc[postId]) acc[postId] = [];
            acc[postId].push(comment);
            return acc;
        }, {});

        return Object.entries(groupedByPost).map(([postId, postComments]) => {
            const commentMap = {};
            const roots = [];
            for (const comment of postComments) {
                commentMap[comment.comment_id] = { ...comment, replies: [] };
            }
            for (const comment of Object.values(commentMap)) {
                if (comment.parent_comment_id && commentMap[comment.parent_comment_id]) {
                    commentMap[comment.parent_comment_id].replies.push(comment);
                } else {
                    roots.push(comment);
                }
            }
            return { postId, threads: roots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) };
        });
    }, [comments]);

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
                <p className="ml-4 text-white">Carregando comentários...</p>
            </div>
        );
    }

    if (error) {
        return <p className="text-red-500 text-center p-8">{error}</p>;
    }

    if (comments.length === 0) {
        return (
            <div className="text-center p-8 glass-effect rounded-lg">
                <MessageSquare className="mx-auto w-12 h-12 text-gray-500" />
                <h3 className="mt-4 text-xl font-semibold text-white">Nenhum comentário ainda</h3>
                <p className="text-gray-400 mt-2">Quando um novo comentário for feito na sua página conectada, ele aparecerá aqui.</p>
            </div>
        );
    }

    // O componente CommentCard e o resto do JSX não precisam de alterações
    const CommentCard = ({ comment, isReply = false }) => {
      const isLiked = comment.is_liked;
      const hasReplies = comment.replies && comment.replies.length > 0;
      const [repliesVisible, setRepliesVisible] = useState(false);

      return (
        <div className={` ${isReply ? 'ml-8 pl-4 border-l-2 border-white/10' : ''}`}>
          <Card className="glass-effect border-white/10 text-white mt-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <Avatar><AvatarFallback className="bg-white/10">{comment.commenter_name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <div>
                  <CardTitle className="text-base font-semibold">{comment.commenter_name}</CardTitle>
                  <p className="text-xs text-gray-400">comentou em {new Date(comment.timestamp).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <Badge variant={comment.platform === 'facebook' ? 'default' : 'secondary'}>{comment.platform.charAt(0).toUpperCase() + comment.platform.slice(1)}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-gray-200 whitespace-pre-wrap">{comment.message}</p>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button size="sm" variant="outline" className={`border-white/10 hover:bg-white/10 ${isLiked ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}`} onClick={() => handleLikeComment(comment)}>
                    <ThumbsUp className="w-4 h-4 mr-2" /> {isLiked ? 'Curtido' : 'Curtir'}
                  </Button>
                  <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/10" onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}>
                    <CornerDownRight className="w-4 h-4 mr-2" /> Responder
                  </Button>
                </div>
                {hasReplies && (
                  <Button size="sm" variant="ghost" onClick={() => setRepliesVisible(!repliesVisible)} className="text-xs text-gray-400">
                    {repliesVisible ? 'Ocultar' : `Ver ${comment.replies.length} Respostas`}
                    {repliesVisible ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                  </Button>
                )}
              </div>
              {replyingTo === comment.id && ( <ReplyForm comment={comment} onReplySent={handleReplyOptimistic} onCancel={() => setReplyingTo(null)} /> )}
            </CardContent>
          </Card>
          {hasReplies && repliesVisible && (
            comment.replies.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map(reply => (
              <CommentCard key={reply.id} comment={reply} isReply={true} />
            ))
          )}
        </div>
      );
    };

    return (
        <div className="space-y-8">
            {posts.map(({ postId, threads }) => {
                const postDetail = postsDetails[postId];
                const areCommentsOpen = openPosts.has(postId);

                return (
                    <Card key={postId} className="glass-effect border-white/10 text-white overflow-hidden">
                        <CardHeader className="bg-white/5 p-4">
                            <div className="flex items-start gap-4">
                                {postDetail?.full_picture ? (
                                    <img src={postDetail.full_picture} alt="Imagem do post" className="w-20 h-20 object-cover rounded-md" />
                                ) : (
                                    <div className="w-20 h-20 rounded-md bg-gray-700/50 flex items-center justify-center">
                                        <Newspaper className="w-8 h-8 text-gray-500" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <p className="text-gray-300 text-sm leading-relaxed max-h-20 overflow-y-auto">
                                        {postDetail?.message || "Este post não contém texto."}
                                    </p>
                                    <a href={postDetail?.permalink_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mt-1 inline-block">Ver post original</a>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="bg-gray-800/30 p-2 text-center">
                                <Button variant="ghost" className="w-full h-8 text-xs" onClick={() => togglePostComments(postId)}>
                                    {areCommentsOpen ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                                    {areCommentsOpen ? 'Ocultar Comentários' : `Ver ${threads.length} Comentários`}
                                </Button>
                            </div>
                            {areCommentsOpen && (
                                <div className="p-4">
                                    {threads.map((comment) => (
                                        <CommentCard key={comment.id} comment={comment} />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}