import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Upload, Download, FileText, Wifi, Instagram, Mail, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { ClientFormDialog } from './ClientFormDialog';
import Papa from 'papaparse';

// Componente helper para mostrar um ícone bonito para cada plataforma
const PlatformIcon = ({ platform }) => {
  const platformName = (platform || 'manual').toLowerCase();
  
  if (['kiwify', 'hotmart', 'green', 'ticto', 'kirvano', 'cakto'].includes(platformName)) {
    return <Wifi className="w-4 h-4 text-orange-400" title={platform} />;
  }
  if (platformName.includes('instagram')) {
    return <Instagram className="w-4 h-4 text-pink-500" title={platform} />;
  }
  if (platformName.includes('whatsapp')) {
    return <MessageSquare className="w-4 h-4 text-green-500" title={platform} />;
  }
  return <Mail className="w-4 h-4 text-gray-400" title="Manual" />;
};

export function ClientsTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const { toast } = useToast();

  const fetchClients = useCallback(async () => {
    let query = supabase.from('clients').select('*').order('created_at', { ascending: false });
    
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: "Erro ao buscar clientes", description: error.message, variant: 'destructive' });
    } else {
      setClients(data || []);
    }
  }, [searchTerm, toast]);

  // Busca os clientes quando o componente carrega
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Busca os clientes com um pequeno delay após o usuário digitar
  useEffect(() => {
    const delayDebounceFn = setTimeout(fetchClients, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchClients]);

  const handleExportClients = () => {
    const csv = Papa.unparse(clients.map(c => ({
        nome: c.name,
        email: c.email,
        telefone: c.phone,
        plataforma: c.platform,
        status: c.status,
        valor: c.value
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "nexus-flow-clientes.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    toast({ title: "Exportação Iniciada" });
  };
  
  const handleImportClients = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            const importedClients = results.data.map(row => ({
                name: row.nome,
                email: row.email,
                phone: row.telefone,
                platform: row.plataforma || 'manual',
                status: row.status || 'Lead',
                value: row.valor || 0,
                kanban_stage: 'new_lead',
                temperature: 'cold'
            })).filter(c => c.name && c.email);

            if(importedClients.length > 0) {
                const { error } = await supabase.from('clients').insert(importedClients);
                if(error) {
                    toast({ title: "Erro na Importação", description: error.message, variant: 'destructive'});
                } else {
                    toast({ title: "Importação Concluída", description: `${importedClients.length} clientes importados!`});
                    fetchClients();
                }
            } else {
                 toast({ title: "Arquivo Vazio ou Inválido", variant: 'destructive'});
            }
        }
    });
  };

  const downloadSampleCSV = () => {
    const sampleCsv = "nome,email,telefone,plataforma,status,valor\nJoão da Silva,joao.silva@example.com,+5511999998888,kiwify,purchase.approved,197.90\nMaria Oliveira,maria.o@example.com,+5521988887777,manual,Lead,0";
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'exemplo-importacao-clientes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleAddClient = () => {
    setSelectedClient(null);
    setIsDialogOpen(true);
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setIsDialogOpen(true);
  };
  
  const handleDialogClose = (shouldRefetch) => {
    setIsDialogOpen(false);
    setSelectedClient(null);
    if (shouldRefetch) {
      fetchClients();
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gestão de Leads</h1>
          <p className="text-gray-400">Adicione, importe e gerencie todos os seus contatos</p>
        </div>
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleAddClient} className="bg-gradient-to-r from-purple-500 to-pink-500">
                  <Plus className="w-4 h-4 mr-2" /> Novo Lead
                </Button>
                <Button variant="outline" onClick={handleExportClients}><Download className="w-4 h-4 mr-2" />Exportar</Button>
                <Button variant="outline" asChild>
                  <label htmlFor="import-csv" className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />Importar
                    <input type="file" id="import-csv" accept=".csv" className="hidden" onChange={handleImportClients} />
                  </label>
                </Button>
                 <Button variant="link" onClick={downloadSampleCSV} className="text-gray-400"><FileText className="w-4 h-4 mr-1" />Baixar Exemplo</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Cliente</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Contato</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Plataforma</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Valor</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client, index) => (
                    <motion.tr key={client.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 }} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium">
                            {client.name ? client.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div><p className="text-white font-medium">{client.name}</p></div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <p className="text-white text-sm">{client.email}</p>
                          <p className="text-gray-400 text-sm">{client.phone}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 capitalize">
                          <PlatformIcon platform={client.platform} />
                          <span className="text-white">{client.platform || 'Manual'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="secondary" className="whitespace-nowrap">{client.status || 'N/A'}</Badge>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-green-400 font-medium">R$ {client.value?.toFixed(2) || '0.00'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <Button size="sm" variant="ghost" onClick={() => handleEditClient(client)} className="text-gray-400 hover:text-white">Editar</Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      <ClientFormDialog isOpen={isDialogOpen} onClose={handleDialogClose} client={selectedClient} />
    </>
  );
}