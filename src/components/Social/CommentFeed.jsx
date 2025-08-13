import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient'; // Usando o seu cliente Supabase
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, ThumbsUp, CornerDownRight, Loader2 } from 'lucide-react';

export function CommentFeed() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchComments() {
      try {
        setLoading(true);
        // Busca os comentários na sua tabela, ordenando pelos mais recentes
        const { data, error } = await supabase
          .from('social_comments')
          .select('*')
          .order('timestamp', { ascending: false });

        if (error) {
          // Se o erro for de RLS (segurança), damos uma mensagem mais amigável
          if (error.code === '42501') {
             throw new Error("Você não tem permissão para ver estes comentários. Verifique as políticas de segurança da tabela 'social_comments'.");
          }
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
      {comments.map((comment) => (
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
              <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/10">
                <ThumbsUp className="w-4 h-4 mr-2" /> Curtir
              </Button>
              <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/10">
                <CornerDownRight className="w-4 h-4 mr-2" /> Responder
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}