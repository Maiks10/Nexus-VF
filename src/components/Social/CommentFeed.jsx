import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/components/ui/use-toast";
import { MessageSquare, ThumbsUp, CornerDownRight, Loader2, Send } from 'lucide-react';

// Sub-componente para o formulário de resposta (sem alterações)
function ReplyForm({ comment, onReplySent, onCancel }) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('meta-reply-to-comment', {
        body: {
          comment_id: comment.comment_id,
          message: message,
          connection_id: comment.meta_connection_id,
        },
      });

      if (error) throw error;
      
      toast({
        title: "Resposta enviada!",
        description: "Sua resposta foi postada com sucesso.",
      });
      onReplySent();
      setMessage('');

    } catch (error) {
      toast({
        title: "Erro ao enviar resposta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={`Respondendo a ${comment.commenter_name}...`}
        className="bg-white/5 border-white/10 text-white"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Enviar
        </Button>
      </div>
    </form>
  );
}


// Componente principal do Feed
export function CommentFeed() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchComments() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('social_comments')
          .select('*')
          .order('timestamp', { ascending: false });

        if (error) {
          throw error;
        }

        setComments(data || []);
      } catch (err) {
        console.error("Erro ao buscar comentários:", err);
        setError("Não foi possível carregar os comentários.");
      } finally {
        setLoading(false);
      }
    }

    fetchComments();
  }, []);

  // Função para curtir um comentário
  const handleLikeComment = async (comment) => {
    // ATUALIZAÇÃO OTIMISTA: Muda a cor na tela imediatamente para dar feedback rápido
    const originalComments = [...comments];
    const updatedComments = comments.map(c =>
      c.id === comment.id ? { ...c, is_liked: true } : c
    );
    setComments(updatedComments);

    try {
      // Tenta enviar a curtida para o backend
      const { error } = await supabase.functions.invoke('meta-like-comment', {
        body: {
          comment_id: comment.comment_id,
          connection_id: comment.meta_connection_id,
        }
      });
      if (error) throw error; // Se der erro aqui, o 'catch' abaixo será executado
      toast({ title: "Comentário curtido!", variant: "default" });
    } catch (error) {
      toast({ title: "Erro ao curtir", description: error.message, variant: "destructive" });
      // Se der erro, reverte a mudança na tela para o estado original
      setComments(originalComments);
    }
  };


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

  return (
    <div className="space-y-4">
      {comments.map((comment) => {
        // ATUALIZADO: A informação de 'curtido' agora vem direto do banco de dados
        const isLiked = comment.is_liked;

        return (
          <Card key={comment.id} className="glass-effect border-white/10 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-white/10">{comment.commenter_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base font-semibold">{comment.commenter_name}</CardTitle>
                  <p className="text-xs text-gray-400">
                    comentou em {new Date(comment.timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <Badge variant={comment.platform === 'facebook' ? 'default' : 'secondary'}>
                {comment.platform.charAt(0).toUpperCase() + comment.platform.slice(1)}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-gray-200 whitespace-pre-wrap">{comment.message}</p>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-4">
                
                <Button 
                  size="sm" 
                  variant="outline" 
                  className={`border-white/10 hover:bg-white/10 ${isLiked ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}`}
                  onClick={() => handleLikeComment(comment)}
                >
                  <ThumbsUp className="w-4 h-4 mr-2" /> {isLiked ? 'Curtido' : 'Curtir'}
                </Button>

                <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/10" onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}>
                  <CornerDownRight className="w-4 h-4 mr-2" /> Responder
                </Button>
              </div>
              {replyingTo === comment.id && (
                <ReplyForm 
                  comment={comment} 
                  onReplySent={() => setReplyingTo(null)}
                  onCancel={() => setReplyingTo(null)}
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}