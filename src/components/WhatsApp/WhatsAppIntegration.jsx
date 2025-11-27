// src/components/Integrations/WhatsAppIntegration.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QrCode, Smartphone, Loader2, WifiOff, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { EvolutionService } from '@/lib/whatsapp';
import { useAuth } from '@/contexts/AuthContext';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

/* ---------- helpers ---------- */
function parseAuthArtifact(j) {
  // Evolution v2: { qrcode: { base64: "..." } }
  let s = j?.qrcode?.base64 || j?.base64 || j?.qrcode || j?.qr || j?.dataURL || null;

  // Se s for objeto (ex: { instanceId: ... }), tenta pegar base64 dentro dele
  if (typeof s === 'object' && s !== null) {
    s = s.base64 || s.qr || null;
  }

  if (s && typeof s === 'string') {
    if (s.startsWith('data:image')) return { type: 'img', value: s };
    // Se for base64 puro, adiciona prefixo
    if (/^[A-Za-z0-9+/=]+$/.test(s)) return { type: 'img', value: `data:image/png;base64,${s}` };
    return { type: 'text', value: s };
  }

  const code = j?.pairingCode || j?.code || j?.qrcode?.pairingCode;
  if (code) return { type: 'code', value: String(code) };

  return { type: 'none', value: null };
}

function normalizeStatus(resp) {
  try {
    // Evolution API v2 returns { instance: { state: 'open' } } or just { state: 'open' }
    const s = typeof resp === 'string' ? resp : resp?.instance?.state || resp?.state || resp?.status || 'unknown';
    const t = String(s || '').toLowerCase();

    if (t === 'open' || t === 'connected' || t === 'online' || t === 'ready') return 'connected';
    if (t === 'close' || t === 'disconnected' || t === 'offline' || t === 'logout') return 'disconnected';
    if (t === 'connecting' || t === 'qr' || t === 'scan') return 'qr';

    return 'unknown';
  } catch { return 'unknown'; }
}

/* ---------- card de instância ---------- */
function WhatsAppInstanceCard({ instance, onAfterStatusChange }) {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [artifact, setArtifact] = useState({ type: 'none', value: null });
  const [status, setStatus] = useState(instance.status || 'disconnected');
  const [phoneNumber, setPhoneNumber] = useState(''); // Novo estado para número de telefone
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
      const current = normalizeStatus(data?.instance?.state || data?.state);
      setStatus(current);

      // Se estiver em QR, tenta atualizar o artefato (QR Code) caso venha na resposta de status ou se precisarmos buscar novamente
      if (current === 'qr') {
        const parsed = parseAuthArtifact(data);
        if (parsed.type !== 'none') {
          setArtifact(parsed);
        } else if (artifact.type === 'none') {
          // Se o status é QR mas não temos o QR, tentamos chamar o connect novamente para pegar o QR do cache do backend
          // Isso força o backend a retornar o QR cacheado na resposta do connect/status
          try {
            const retryData = await EvolutionService.connectInstance(instance.instance_name);
            const retryParsed = parseAuthArtifact(retryData);
            if (retryParsed.type !== 'none') setArtifact(retryParsed);
          } catch (ignore) { }
        }
      }

      if (current === 'connected') {
        stopPolling();
        setIsConnecting(false);
        setArtifact({ type: 'none', value: null });
        localStorage.setItem('instance_name', instance.instance_name);
        toast({ title: 'WhatsApp Conectado', description: `Conta "${instance.display_name}" conectada!` });
        onAfterStatusChange?.('connected');
      }
    } catch (error) {
      console.error("Erro ao checar status:", error);
    }
  }, [instance, onAfterStatusChange, toast]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setArtifact({ type: 'none', value: null });
    setStatus('qr');
    try {
      // Se o usuário preencheu o número, passamos para o backend gerar o Pairing Code
      const payload = phoneNumber ? { number: phoneNumber } : {};
      const data = await EvolutionService.connectInstance(instance.instance_name, payload);

      // Evolution returns base64 or code in the response immediately or we might need to poll
      // Usually connect returns { base64: "..." } or similar

      const parsed = parseAuthArtifact(data);
      if (parsed.type === 'img') setArtifact(parsed);
      else if (parsed.type === 'code') setArtifact(parsed);
      else {
        // If no QR returned immediately, it might be in 'connecting' state, start polling
      }

      stopPolling();
      pollRef.current = setInterval(checkConnectionStatus, 3000);
    } catch (error) {
      setIsConnecting(false);
      const errorMessage = error.response?.data?.message || 'Não foi possível obter QR/código.';
      toast({ title: 'Erro ao iniciar conexão', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleDisconnect = async () => {
    stopPolling();
    setIsConnecting(false);
    setArtifact({ type: 'none', value: null });
    try {
      await EvolutionService.logoutInstance(instance.instance_name);
      setStatus('disconnected');
      toast({ title: 'WhatsApp Desconectado', description: `Conta "${instance.display_name}" foi desconectada.` });
      onAfterStatusChange?.('disconnected');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Não foi possível finalizar a sessão.';
      toast({ title: 'Erro ao desconectar', description: errorMessage, variant: 'destructive' });
    }
  };

  useEffect(() => () => stopPolling(), []);

  return (
    <Card className="glass-effect border-white/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg text-white">{instance.display_name}</CardTitle>
        <Badge variant={status === 'connected' ? 'success' : 'secondary'} className="capitalize">
          {status === 'qr' ? 'Aguardando Scan' : status.replace('_', ' ')}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center min-h-[220px] space-y-4">
        {isConnecting && artifact.type === 'img' && (
          <>
            <div className="w-40 h-40 bg-white p-2 rounded-lg"><img src={artifact.value} alt="QR Code" /></div>
            <p className="text-sm text-gray-300">Escaneie o QR no WhatsApp.</p>
          </>
        )}
        {isConnecting && artifact.type === 'code' && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-white text-3xl font-mono tracking-widest bg-black/40 px-4 py-2 rounded-lg">{artifact.value}</div>
            <p className="text-sm text-gray-300 text-center">Abra o WhatsApp &gt; Menu &gt; Aparelhos conectados &gt; Conectar com código e digite esse número.</p>
          </div>
        )}
        {!isConnecting && status !== 'connected' && (
          <div className="flex flex-col items-center gap-2"><WifiOff className="text-gray-400" /><p className="text-sm text-gray-400">Conta desconectada</p></div>
        )}
        {status === 'connected' && (
          <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 /> <span>Conectado</span></div>
        )}
        <div className="flex gap-2 w-full max-w-sm flex-col">
          {status !== 'connected' && (
            <div className="flex flex-col gap-2 mb-2">
              <label className="text-xs text-gray-400 ml-1">Número para Pareamento (Opcional)</label>
              <Input
                placeholder="Ex: 5511999999999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-[10px] text-gray-500 ml-1">Preencha apenas se quiser usar Código de Pareamento em vez de QR Code.</p>
            </div>
          )}
          <div className="flex gap-2 justify-center">
            {status !== 'connected' ? (
              <Button onClick={handleConnect} className="bg-gradient-to-r from-green-500 to-emerald-500 w-full">
                <QrCode className="mr-2 h-4 w-4" />
                {phoneNumber ? 'Gerar Código' : 'Gerar QR Code'}
              </Button>
            ) : (
              <Button onClick={handleDisconnect} variant="destructive" className="w-full"><XCircle className="mr-2 h-4 w-4" />Desconectar</Button>
            )}
            <Button onClick={checkConnectionStatus} variant="secondary" className="bg-white/10 hover:bg-white/20">{status === 'connected' ? 'Re-checar' : 'Ver status'}</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- lista + criação ---------- */
function WhatsAppIntegration() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');

  const fetchInstances = useCallback(async () => {
    // if (!user) { setLoading(false); return; } // Allow fetching even if user context is partial, or rely on auth
    setLoading(true);
    try {
      const data = await EvolutionService.fetchInstances();
      setInstances(data || []);
    } catch (error) {
      console.error("Erro ao buscar instâncias:", error);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchInstances(); }, [fetchInstances]);

  const handleAddInstance = async () => {
    if (!newInstanceName.trim()) {
      toast({ title: 'Nome inválido', description: 'Informe um nome para a conta.', variant: 'destructive' });
      return;
    }
    try {
      // Evolution create instance
      await EvolutionService.createInstance(newInstanceName);
      // Refresh list
      await fetchInstances();
      setNewInstanceName('');
      setIsDialogOpen(false);
      toast({ title: 'Conta adicionada com sucesso!' });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Não foi possível adicionar a conta.';
      toast({ title: 'Erro ao adicionar conta', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleDeleteInstance = async (id) => {
    try {
      await EvolutionService.deleteInstance(id);
      setInstances(instances.filter((i) => i.id !== id));
      toast({ title: 'Conta removida' });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Não foi possível remover a conta.';
      toast({ title: 'Erro ao remover', description: errorMessage, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="text-emerald-400" />
          <h2 className="text-xl font-semibold text-white">Integração WhatsApp</h2>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-indigo-500 to-purple-500"><Plus className="mr-2 h-4 w-4" /> Nova Conta</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && <Card className="glass-effect border-white/10"><CardContent className="flex items-center justify-center h-40 text-white/70"><Loader2 className="animate-spin mr-2" /> Carregando...</CardContent></Card>}
        {!loading && instances.length === 0 && <Card className="glass-effect border-white/10"><CardContent className="flex items-center justify-center h-40 text-white/70">Nenhuma conta adicionada ainda.</CardContent></Card>}
        {!loading && instances.map((instance) => (
          <motion.div key={instance.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative">
            <div className="absolute right-2 top-2 z-10">
              <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDeleteInstance(instance.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <WhatsAppInstanceCard instance={instance} onAfterStatusChange={() => fetchInstances()} />
          </motion.div>
        ))}
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#111827]/90 backdrop-blur-md border-white/10">
          <DialogHeader><DialogTitle className="text-white">Criar nova conta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Ex: Minha Loja" value={newInstanceName} onChange={(e) => setNewInstanceName(e.target.value)} className="bg-white/5 text-white placeholder:text-white/50" />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddInstance} className="bg-gradient-to-r from-green-500 to-emerald-500">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { WhatsAppIntegration };
export default WhatsAppIntegration;