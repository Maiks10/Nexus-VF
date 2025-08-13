import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Facebook, Loader2 } from 'lucide-react';

// Componente para mostrar a lista de páginas (sem alterações aqui)
function PageSelection({ connectionId, onClose }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingPageId, setSubmittingPageId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchPages() {
      if (!connectionId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('meta_connections')
        .select('available_pages')
        .eq('id', connectionId)
        .single();
      
      if (error || !data) {
        toast({ title: 'Erro ao buscar páginas', description: error?.message || 'Conexão não encontrada.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      setPages(data.available_pages || []);
      setLoading(false);
    }
    fetchPages();
  }, [connectionId, toast]);

  const handleSelectPage = async (page) => {
    setSubmittingPageId(page.id);
    try {
      const { error } = await supabase.functions.invoke('meta-finalize-connection', {
        body: {
          connection_id: connectionId,
          page_id: page.id,
          page_access_token: page.access_token,
        },
      });

      if (error) throw error;
      
      onClose(true);

    } catch (error) {
      toast({ title: 'Erro ao conectar página', description: error.message, variant: 'destructive' });
      setSubmittingPageId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
      {pages.map((page) => (
        <div key={page.id} className="flex items-center justify-between p-2 rounded-md bg-white/5">
          <div className="flex items-center gap-3">
            <img src={page.picture.data.url} alt={page.name} className="w-10 h-10 rounded-full" />
            <div>
              <p className="font-semibold text-white">{page.name}</p>
              <p className="text-xs text-gray-400">{page.category}</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => handleSelectPage(page)}
            disabled={submittingPageId === page.id}
          >
            {submittingPageId === page.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Conectar'}
          </Button>
        </div>
      ))}
    </div>
  );
}

// Componente principal do Dialog
export function IntegrationConfigDialog({ isOpen, onClose, integration }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  if (!integration) return null;

  // CORRIGIDO: A função de conexão agora pega o ID do usuário e envia para a Edge Function
  const handleFacebookConnect = async () => {
    setIsSubmitting(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('Sessão de usuário não encontrada. Faça login novamente.');

      const { data, error } = await supabase.functions.invoke('meta-oauth', { 
        body: { 
          action: 'initiate',
          userId: session.user.id // <-- Enviando o ID do usuário
        } 
      });

      if (error) throw error;

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error('Não foi possível obter a URL de redirecionamento.');
      }
    } catch (error) {
      toast({ title: 'Erro ao Conectar', description: error.message, variant: 'destructive' });
      setIsSubmitting(false);
    }
  };
  
  const isPageSelectionFlow = !!integration.connection_id_for_selection;
  const isOauthFlow = integration.fields.some(field => field.type === 'oauth_button');

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
      <DialogContent className="sm:max-w-lg glass-effect border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>
            {isPageSelectionFlow ? 'Selecione uma Página para Conectar' : `Configurar ${integration.name}`}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {isPageSelectionFlow 
              ? 'Apenas páginas de negócio clássicas e públicas são totalmente compatíveis.' 
              : `Clique no botão para conectar sua conta de forma segura.`}
          </DialogDescription>
        </DialogHeader>
        
        {isPageSelectionFlow ? (
          <PageSelection connectionId={integration.connection_id_for_selection} onClose={onClose} />
        ) : isOauthFlow ? (
          <div className="py-4">
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleFacebookConnect} disabled={isSubmitting}>
              <Facebook className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Redirecionando...' : 'Conectar com Facebook & Instagram'}
            </Button>
          </div>
        ) : (
          <p>Outras integrações ainda não implementadas.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}