// src/components/Integrations/WhatsAppIntegration.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QrCode, Smartphone, Loader2, WifiOff, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

/* ---------- helpers ---------- */

function parseAuthArtifact(j) {
  // tenta QR
  const s =
    j?.image || j?.qrcode || j?.qr || j?.qrCode ||
    j?.dataURL || j?.dataUrl || j?.data ||
    j?.base64 || j?.Base64 || null;

  if (s) {
    if (typeof s === 'string') {
      if (s.includes('<svg')) return { type: 'svg', value: s };
      if (s.startsWith('data:image')) return { type: 'img', value: s };
      if (/^[A-Za-z0-9+/=]+$/.test(s)) return { type: 'img', value: `data:image/png;base64,${s}` };
      return { type: 'text', value: s }; // conteúdo do QR → vira png
    }
  }

  // tenta CÓDIGO numérico
  const code = j?.code || j?.pairingCode || j?.pairing_code || j?.pair_code;
  if (code) return { type: 'code', value: String(code) };

  // alguns retornam string simples
  if (typeof j === 'string' && /\d/.test(j)) return { type: 'code', value: j };

  return { type: 'none', value: null };
}

function normalizeStatus(resp) {
  try {
    const s = typeof resp === 'string'
      ? resp
      : resp?.status || resp?.state || resp?.connection || resp?.response || JSON.stringify(resp);
    const t = String(s || '').toLowerCase();
    if (t.includes('connected') || t.includes('open') || t.includes('online') || t.includes('ready')) return 'connected';
    if (t.includes('qr') || t.includes('scan') || t.includes('pair')) return 'qr';
    if (t.includes('disconnected') || t.includes('closed') || t.includes('logout') || t.includes('offline')) return 'disconnected';
    return 'unknown';
  } catch { return 'unknown'; }
}

function genInstanceName(userId) {
  return `crm_${(userId || 'user').toString().slice(0, 8)}_${Date.now()}`;
}

/* ---------- card de instância ---------- */

function WhatsAppInstanceCard({ instance, onAfterStatusChange }) {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [artifact, setArtifact] = useState({ type: 'none', value: null }); // qr img/svg/text OU code
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
      const { data, error } = await supabase.functions.invoke('whatsapp-session', {
        body: { action: 'status', instanceName: instance.instance_name }
      });
      if (error) return;

      // *** Normaliza SEMPRE (faz "open" -> "connected", etc.)
      const current = normalizeStatus(data?.status ?? data);
      setStatus(current);

      if (current === 'connected') {
        stopPolling();
        setIsConnecting(false);
        setArtifact({ type: 'none', value: null });

        await supabase.from('whatsapp_instances').update({ status: 'connected' }).eq('id', instance.id);
        localStorage.setItem('instance_name', instance.instance_name);

        await supabase.functions.invoke('whatsapp-session', {
          body: { action: 'ensure_webhook', instanceName: instance.instance_name }
        });

        toast({ title: 'WhatsApp Conectado', description: `Conta "${instance.display_name}" conectada!` });
        onAfterStatusChange?.('connected');
      }
    } catch {}
  }, [instance, onAfterStatusChange, toast]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setArtifact({ type: 'none', value: null });
    setStatus('qr');

    try {
      await supabase.functions.invoke('whatsapp-session', {
        body: { action: 'ensure_instance', instanceName: instance.instance_name }
      });

      const { data, error } = await supabase.functions.invoke('whatsapp-session', {
        body: { action: 'generate_qr', instanceName: instance.instance_name }
      });
      if (error) throw new Error(error.message);

      // *** Se já veio "connected", atualiza na hora
      const immediate = normalizeStatus(data?.status ?? data);
      if (immediate === 'connected') {
        setIsConnecting(false);
        setArtifact({ type: 'none', value: null });
        setStatus('connected');
        stopPolling();
        await supabase.from('whatsapp_instances').update({ status: 'connected' }).eq('id', instance.id);
        localStorage.setItem('instance_name', instance.instance_name);
        await supabase.functions.invoke('whatsapp-session', {
          body: { action: 'ensure_webhook', instanceName: instance.instance_name }
        });
        toast({ title: 'WhatsApp Conectado', description: `Conta "${instance.display_name}" conectada!` });
        onAfterStatusChange?.('connected');
        return;
      }

      // Caso contrário, tenta exibir QR/código
      const parsed = parseAuthArtifact(data);
      if (parsed.type === 'img') {
        setArtifact(parsed);
      } else if (parsed.type === 'svg') {
        const blob = new Blob([parsed.value], { type: 'image/svg+xml' });
        setArtifact({ type: 'img', value: URL.createObjectURL(blob) });
      } else if (parsed.type === 'text') {
        const dataUrl = await QRCode.toDataURL(parsed.value);
        setArtifact({ type: 'img', value: dataUrl });
      } else if (parsed.type === 'code') {
        setArtifact(parsed);
      } else {
        toast({ title: 'Aguardando...', description: 'Não veio QR nem código. Tente novamente.', variant: 'destructive' });
      }

      stopPolling();
      pollRef.current = setInterval(checkConnectionStatus, 3000);
    } catch {
      setIsConnecting(false);
      toast({ title: 'Erro ao iniciar conexão', description: 'Não foi possível obter QR/código.', variant: 'destructive' });
    }
  };

  const handleDisconnect = async () => {
    stopPolling();
    setIsConnecting(false);
    setArtifact({ type: 'none', value: null });
    try {
      await supabase.functions.invoke('whatsapp-session', {
        body: { action: 'logout', instanceName: instance.instance_name }
      });
      await supabase.from('whatsapp_instances').update({ status: 'disconnected' }).eq('id', instance.id);
      setStatus('disconnected');
      toast({ title: 'WhatsApp Desconectado', description: `Conta "${instance.display_name}" foi desconectada.` });
      onAfterStatusChange?.('disconnected');
    } catch {
      toast({ title: 'Erro ao desconectar', description: 'Não foi possível finalizar a sessão.', variant: 'destructive' });
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
            <div className="w-40 h-40 bg-white p-2 rounded-lg">
              <img src={artifact.value} alt="QR Code" />
            </div>
            <p className="text-sm text-gray-300">Escaneie o QR no WhatsApp.</p>
          </>
        )}

        {isConnecting && artifact.type === 'code' && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-white text-3xl font-mono tracking-widest bg-black/40 px-4 py-2 rounded-lg">
              {artifact.value}
            </div>
            <p className="text-sm text-gray-300 text-center">
              Abra o WhatsApp &gt; Menu &gt; Aparelhos conectados &gt; Conectar com código e digite esse número.
            </p>
          </div>
        )}

        {!isConnecting && status !== 'connected' && (
          <div className="flex flex-col items-center gap-2">
            <WifiOff className="text-gray-400" />
            <p className="text-sm text-gray-400">Conta desconectada</p>
          </div>
        )}

        {status === 'connected' && (
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 /> <span>Conectado</span>
          </div>
        )}

        <div className="flex gap-2">
          {status !== 'connected' ? (
            <Button onClick={handleConnect} className="bg-gradient-to-r from-green-500 to-emerald-500">
              <QrCode className="mr-2 h-4 w-4" />
              Conectar (QR / Código)
            </Button>
          ) : (
            <Button onClick={handleDisconnect} variant="destructive">
              <XCircle className="mr-2 h-4 w-4" />
              Desconectar
            </Button>
          )}
          <Button onClick={checkConnectionStatus} variant="secondary" className="bg-white/10 hover:bg-white/20">
            {status === 'connected' ? 'Re-checar' : 'Ver status'}
          </Button>
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
    setLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: true });
    if (!error) setInstances(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchInstances(); }, [fetchInstances]);

  const handleAddInstance = async () => {
    if (!newInstanceName.trim()) {
      toast({ title: 'Nome inválido', description: 'Informe um nome para a conta.', variant: 'destructive' });
      return;
    }
    if (instances.length >= 5) {
      toast({ title: 'Limite atingido', description: 'Máximo de 5 contas.', variant: 'destructive' });
      return;
    }
    const instance_name = genInstanceName(user?.id || 'user');
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .insert({
        user_id: user.id,
        display_name: newInstanceName,
        instance_name,
        status: 'disconnected'
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro ao adicionar conta', description: error.message, variant: 'destructive' });
    } else {
      setInstances([...instances, data]);
      setNewInstanceName('');
      setIsDialogOpen(false);
      toast({ title: 'Conta adicionada com sucesso!' });
    }
  };

  const handleDeleteInstance = async (id) => {
    const { error } = await supabase.from('whatsapp_instances').delete().eq('id', id);
    if (error) toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    else {
      setInstances(instances.filter((i) => i.id !== id));
      toast({ title: 'Conta removida' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="text-emerald-400" />
          <h2 className="text-xl font-semibold text-white">Integração WhatsApp</h2>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-indigo-500 to-purple-500">
          <Plus className="mr-2 h-4 w-4" /> Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && (
          <Card className="glass-effect border-white/10">
            <CardContent className="flex items-center justify-center h-40 text-white/70">
              <Loader2 className="animate-spin mr-2" /> Carregando...
            </CardContent>
          </Card>
        )}

        {!loading && instances.length === 0 && (
          <Card className="glass-effect border-white/10">
            <CardContent className="flex items-center justify-center h-40 text-white/70">
              Nenhuma conta adicionada ainda.
            </CardContent>
          </Card>
        )}

        {!loading && instances.map((instance) => (
          <motion.div key={instance.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative">
            <div className="absolute right-2 top-2 z-10">
              <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDeleteInstance(instance.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <WhatsAppInstanceCard instance={instance} onAfterStatusChange={() => fetchInstances()} />
          </motion.div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#111827]/90 backdrop-blur-md border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Criar nova conta</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Ex: Conta Vendas, Suporte Principal"
              value={newInstanceName}
              onChange={(e) => setNewInstanceName(e.target.value)}
              className="bg-white/5 text-white placeholder:text-white/50"
            />
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddInstance} className="bg-gradient-to-r from-green-500 to-emerald-500">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { WhatsAppIntegration };
export default WhatsAppIntegration;
