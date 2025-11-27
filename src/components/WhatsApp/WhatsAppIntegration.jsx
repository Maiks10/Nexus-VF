// src/components/WhatsApp/WhatsAppIntegration.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QrCode, Smartphone, Loader2, WifiOff, Plus, Trash2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { EvolutionService } from '@/lib/whatsapp';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

/* ---------- HELPERS INTELIGENTES ---------- */
function parseAuthArtifact(data) {
  if (!data) return { type: 'none', value: null };

  // Debug para você ver no navegador (F12) o que está chegando
  console.log("📦 Dados recebidos no Parse:", data);

  // 1. Tenta encontrar a string base64 em vários lugares possíveis do JSON
  let base64 = 
    data?.qrcode?.base64 || 
    data?.base64 || 
    data?.qrcode || 
    data?.qr || 
    (typeof data === 'string' && data.length > 100 ? data : null);

  // Se achou algo que parece uma imagem
  if (base64 && typeof base64 === 'string') {
    // Remove prefixo se já vier duplicado
    base64 = base64.replace('data:image/png;base64,', '');
    
    // Se for uma string muito curta, provavelmente não é imagem (é um erro ou status)
    if (base64.length < 50) return { type: 'none', value: null };

    return { type: 'img', value: `data:image/png;base64,${base64}` };
  }

  // 2. Tenta encontrar códigos de pareamento (Pairing Code)
  const code = data?.pairingCode || data?.code || data?.qrcode?.pairingCode;
  if (code) return { type: 'code', value: String(code) };

  return { type: 'none', value: null };
}

function normalizeStatus(resp) {
  try {
    const s = typeof resp === 'string' ? resp : resp?.instance?.state || resp?.state || resp?.status || 'unknown';
    const t = String(s || '').toLowerCase();

    if (['open', 'connected', 'online', 'ready'].includes(t)) return 'connected';
    if (['close', 'disconnected', 'offline', 'logout'].includes(t)) return 'disconnected';
    if (['connecting', 'qr', 'scan'].includes(t)) return 'qr';

    return 'unknown';
  } catch { return 'unknown'; }
}

/* ---------- COMPONENTE DO CARD ---------- */
function WhatsAppInstanceCard({ instance, onAfterStatusChange }) {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [artifact, setArtifact] = useState({ type: 'none', value: null });
  const [status, setStatus] = useState(instance.status || 'disconnected');
  const pollRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const checkConnectionStatus = useCallback(async () => {
    try {
      const data = await EvolutionService.getConnectionState(instance.instance_name);
      const current = normalizeStatus(data);
      setStatus(current);

      if (current === 'connected') {
        stopPolling();
        setIsConnecting(false);
        setArtifact({ type: 'none', value: null });
        toast({ title: 'Conectado!', description: `A conta "${instance.display_name}" está online.`, className: "bg-green-600 text-white border-none" });
        onAfterStatusChange?.('connected');
      }
    } catch (error) {
      console.error("Status Check Error:", error);
    }
  }, [instance, onAfterStatusChange, toast]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setArtifact({ type: 'none', value: null }); // Limpa anterior
    setStatus('qr'); // Assume estado visual de QR
    
    try {
      // Chama o backend (que agora tem a lógica de auto-correção)
      const responseData = await EvolutionService.connectInstance(instance.instance_name);
      
      console.log("📡 Resposta do Backend:", responseData); // OLHE ISTO NO CONSOLE DO NAVEGADOR

      const parsed = parseAuthArtifact(responseData);
      
      if (parsed.type !== 'none') {
        setArtifact(parsed);
        // Inicia polling para saber quando o user escaneou
        stopPolling();
        pollRef.current = setInterval(checkConnectionStatus, 3000);
      } else {
        // Se não veio QR, pode ser que já esteja conectado ou erro
        const currentStatus = normalizeStatus(responseData);
        if (currentStatus === 'connected') {
            setStatus('connected');
            setIsConnecting(false);
            toast({ title: 'Já conectado!', description: 'Esta instância já está pronta.' });
        } else {
            // Mantém em connecting para tentar de novo manual ou mostra erro
            toast({ title: 'Aguardando...', description: 'QR Code solicitado. Se não aparecer em 5s, tente novamente.' });
        }
      }
    } catch (error) {
      setIsConnecting(false);
      const msg = error.response?.data?.details || error.message || 'Erro desconhecido';
      toast({ title: 'Erro ao conectar', description: msg, variant: 'destructive' });
    }
  };

  const handleDisconnect = async () => {
    stopPolling();
    setIsConnecting(false);
    setArtifact({ type: 'none', value: null });
    try {
      await EvolutionService.logoutInstance(instance.instance_name);
      setStatus('disconnected');
      toast({ title: 'Desconectado', description: 'Sessão finalizada.' });
      onAfterStatusChange?.('disconnected');
    } catch (error) {
      toast({ title: 'Erro ao desconectar', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    // Limpa polling ao desmontar
    return () => stopPolling();
  }, []);

  return (
    <Card className="glass-effect border-white/10 overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg text-white font-medium truncate max-w-[200px]" title={instance.display_name}>
          {instance.display_name}
        </CardTitle>
        <Badge variant={status === 'connected' ? 'success' : 'secondary'} className={`capitalize border-0 ${status === 'connected' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-gray-400'}`}>
          {status === 'qr' ? 'Escaneie' : status.replace('_', ' ')}
        </Badge>
      </CardHeader>

      <CardContent className="flex flex-col items-center justify-center min-h-[240px] space-y-6 relative z-10">
        
        {/* ESTADO: CONECTADO */}
        {status === 'connected' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]">
              <Smartphone className="h-10 w-10 text-emerald-400" />
            </div>
            <p className="text-emerald-400 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> WhatsApp Ativo
            </p>
          </div>
        )}

        {/* ESTADO: MOSTRANDO QR CODE */}
        {isConnecting && artifact.type === 'img' && status !== 'connected' && (
           <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white p-3 rounded-xl shadow-xl shadow-black/50 mb-3">
               <img src={artifact.value} alt="QR Code" className="w-48 h-48 object-contain" />
             </div>
             <p className="text-xs text-gray-400 animate-pulse">Abra o WhatsApp e escaneie</p>
           </div>
        )}

        {/* ESTADO: CARREGANDO QR (Spinner) */}
        {isConnecting && artifact.type === 'none' && status !== 'connected' && (
          <div className="flex flex-col items-center text-center space-y-4">
            <Loader2 className="h-12 w-12 text-indigo-400 animate-spin" />
            <div className="space-y-1">
              <p className="text-white font-medium">Gerando QR Code...</p>
              <p className="text-sm text-gray-500">Isso pode levar alguns segundos</p>
            </div>
          </div>
        )}

        {/* ESTADO: DESCONECTADO (Inicial) */}
        {!isConnecting && status !== 'connected' && (
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <WifiOff className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm">Conta desconectada</p>
          </div>
        )}

        {/* BOTÕES DE AÇÃO */}
        <div className="flex gap-3 w-full pt-2">
          {status !== 'connected' ? (
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border-0 text-white shadow-lg shadow-indigo-900/20 transition-all hover:scale-[1.02]"
            >
              {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <QrCode className="w-4 h-4 mr-2" />}
              {isConnecting ? 'Gerando...' : 'Conectar'}
            </Button>
          ) : (
            <Button onClick={handleDisconnect} variant="destructive" className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20">
              <XCircle className="mr-2 h-4 w-4" /> Desconectar
            </Button>
          )}
          
          <Button onClick={checkConnectionStatus} variant="outline" size="icon" className="border-white/10 bg-white/5 hover:bg-white/10 text-white" title="Atualizar Status">
             <RefreshCw className={`h-4 w-4 ${status === 'qr' ? 'animate-spin' : ''}`} />
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}

/* ---------- PÁGINA PRINCIPAL ---------- */
function WhatsAppIntegration() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');

  const fetchInstances = useCallback(async () => {
    setLoading(true);
    try {
      const data = await EvolutionService.fetchInstances();
      setInstances(data || []);
    } catch (error) {
      console.error("Erro ao buscar instâncias:", error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchInstances(); }, [fetchInstances]);

  const handleAddInstance = async () => {
    if (!newInstanceName.trim()) {
      toast({ title: 'Nome inválido', description: 'Informe um nome para a conta.', variant: 'destructive' });
      return;
    }
    try {
      await EvolutionService.createInstance(newInstanceName);
      await fetchInstances();
      setNewInstanceName('');
      setIsDialogOpen(false);
      toast({ title: 'Sucesso!', description: 'Nova conta preparada.' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível criar a conta.', variant: 'destructive' });
    }
  };

  const handleDeleteInstance = async (id) => {
    if(!confirm("Tem certeza que deseja remover esta conta do painel?")) return;
    try {
      await EvolutionService.deleteInstance(id);
      setInstances(instances.filter((i) => i.id !== id));
      toast({ title: 'Conta removida' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao remover conta.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Smartphone className="text-emerald-400 h-6 w-6" /> Integração WhatsApp
          </h2>
          <p className="text-gray-400 text-sm mt-1">Gerencie suas conexões e escaneie os QR Codes para iniciar.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-lg shadow-emerald-900/20">
          <Plus className="mr-2 h-4 w-4" /> Nova Conexão
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading && (
            [1,2,3].map(i => (
                <Card key={i} className="h-[300px] glass-effect border-white/5 animate-pulse bg-white/5"></Card>
            ))
        )}
        
        {!loading && instances.length === 0 && (
            <Card className="col-span-full h-40 flex flex-col items-center justify-center glass-effect border-white/10 border-dashed">
                <p className="text-gray-400">Nenhuma conta conectada ainda.</p>
                <Button variant="link" onClick={() => setIsDialogOpen(true)} className="text-emerald-400">Criar a primeira</Button>
            </Card>
        )}

        {!loading && instances.map((instance) => (
          <motion.div key={instance.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
            <div className="relative">
              <Button 
                size="icon" 
                variant="ghost" 
                className="absolute right-2 top-2 z-20 h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-500/10" 
                onClick={() => handleDeleteInstance(instance.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <WhatsAppInstanceCard instance={instance} onAfterStatusChange={() => fetchInstances()} />
            </div>
          </motion.div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#0f172a] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conexão</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
                <label className="text-sm text-gray-400">Nome da conta (Ex: Vendas, Suporte)</label>
                <Input 
                    placeholder="Digite um nome para identificar..." 
                    value={newInstanceName} 
                    onChange={(e) => setNewInstanceName(e.target.value)} 
                    className="bg-white/5 border-white/10 text-white focus:border-emerald-500" 
                />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="hover:bg-white/5 hover:text-white">Cancelar</Button>
            <Button onClick={handleAddInstance} className="bg-emerald-600 hover:bg-emerald-500 text-white">Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { WhatsAppIntegration };
export default WhatsAppIntegration;