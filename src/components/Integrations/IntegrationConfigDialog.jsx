import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
// ALTERADO: Importando apiClient
import apiClient from '@/lib/customSupabaseClient';
import { Facebook, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Componente para mostrar a lista de páginas
function PageSelection({ connectionId, onClose }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingPageId, setSubmittingPageId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchPages() {
      if (!connectionId) return;
      setLoading(true);
      try {
        // ALTERADO: Busca as páginas da nossa API
        const response = await apiClient.get(`/api/integrations/meta/pages?connectionId=${connectionId}`);
        setPages(response.data.available_pages || []);
      } catch (error) {
        toast({ title: 'Erro ao buscar páginas', description: error.response?.data?.message || 'Conexão não encontrada.', variant: 'destructive' });
      }
      setLoading(false);
    }
    fetchPages();
  }, [connectionId, toast]);

  const handleSelectPage = async (page) => {
    setSubmittingPageId(page.id);
    try {
      // ALTERADO: Finaliza a conexão através da nossa API
      await apiClient.post('/api/integrations/meta/finalize', {
        connection_id: connectionId,
        page_id: page.id,
        page_access_token: page.access_token,
      });
      onClose(true); // Sucesso, fecha o diálogo
    } catch (error) {
      toast({ title: 'Erro ao conectar página', description: error.response?.data?.message, variant: 'destructive' });
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
  const { user } = useAuth();

  if (!integration) return null;

  const handleFacebookConnect = async () => {
    setIsSubmitting(true);
    try {
      // ALTERADO: Inicia a conexão OAuth através da nossa API
      const response = await apiClient.post('/api/integrations/meta/initiate-oauth');
      const data = response.data;
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error('Não foi possível obter a URL de redirecionamento.');
      }
    } catch (error) {
      toast({ title: 'Erro ao Conectar', description: error.response?.data?.message, variant: 'destructive' });
      setIsSubmitting(false);
    }
  };

  const isPageSelectionFlow = !!integration.connection_id_for_selection;
  const isOauthFlow = integration.fields.some(field => field.type === 'oauth_button');
  const isRedirectFlow = integration.fields.some(field => field.type === 'redirect_button'); // Novo
  const isWebhookFlow = ['kiwify', 'hotmart', 'green', 'ticto', 'kirvano', 'cakto'].includes(integration.id);

  // ... (código existente)

  const handleRedirect = () => {
    const field = integration.fields.find(f => f.type === 'redirect_button');
    if (field?.route) {
      window.location.hash = field.route; // Redireciona via hash (já que o App usa hash router manual)
      onClose(false);
    }
  };

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
              : isRedirectFlow
                ? 'Esta integração possui um painel dedicado.'
                : isWebhookFlow
                  ? `Configure o webhook para receber notificações da ${integration.name}.`
                  : `Clique no botão para conectar sua conta de forma segura.`
            }
          </DialogDescription>
        </DialogHeader>

        {isPageSelectionFlow ? (
          <PageSelection connectionId={integration.connection_id_for_selection} onClose={onClose} />
        ) : isOauthFlow ? (
          // ...
          <div className="py-4">
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleFacebookConnect} disabled={isSubmitting}>
              <Facebook className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Redirecionando...' : 'Conectar com Facebook & Instagram'}
            </Button>
          </div>
        ) : isRedirectFlow ? (
          <div className="py-4">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleRedirect}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Acessar Painel WhatsApp
            </Button>
          </div>
        ) : isWebhookFlow ? (
          <div className="py-4">
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleFacebookConnect} disabled={isSubmitting}>
              <Facebook className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Redirecionando...' : 'Conectar com Facebook & Instagram'}
            </Button>
          </div>
        ) : isWebhookFlow ? (
          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-400">
              Copie a URL abaixo e cole no campo "Webhook" ou "Postback" nas configurações da {integration.name}.
            </p>
            <div className="flex items-center space-x-2">
              <Input value={webhookUrl} readOnly className="bg-white/10" />
              <Button onClick={copyToClipboard} variant="outline">Copiar</Button>
            </div>
            <p className="text-xs text-gray-500">
              Esta URL é única para sua conta. Ela enviará os eventos de vendas diretamente para o seu CRM.
            </p>
          </div>
        ) : (
          <div className="py-4">
            {integration.fields.map(field => (
              <div key={field.name} className="space-y-2">
                <label className="text-sm font-medium text-gray-300">{field.name}</label>
                <Input type={field.type} className="bg-white/10" />
              </div>
            ))}
            <Button className="mt-4 w-full">Salvar Configuração</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}