// src/components/Clients/ClientsTable.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Upload, Download, FileText, Wifi, Instagram, Mail, MessageSquare, Edit, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/components/ui/use-toast';
import apiClient from '@/lib/customSupabaseClient';
import { ClientFormDialog } from './ClientFormDialog';
import { ClientDetailsDialog } from './ClientDetailsDialog';
import Papa from 'papaparse';

// NOVO: Função de download refatorada
const downloadCSV = (csvContent, fileName) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url); // Limpa a memória
};

export const PlatformIcon = ({ platform }) => {
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const { toast } = useToast();
  
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [viewingClient, setViewingClient] = useState(null);

  const fetchClients = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/clients', { params: { search: searchTerm } });
      setClients(response.data || []);
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Ocorreu um erro ao buscar os clientes.";
      toast({ title: "Erro ao buscar clientes", description: errorMessage, variant: 'destructive' });
    }
  }, [searchTerm, toast]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(fetchClients, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchClients]);

  // ALTERADO: Lógica de exportação e importação usando a nova função
  const handleExportClients = () => {
    if (clients.length === 0) {
      toast({ title: "Nenhum cliente para exportar", description: "A sua lista de clientes está vazia.", variant: "default" });
      return;
    }
    const csv = Papa.unparse(clients.map(c => ({ nome: c.name, email: c.email, telefone: c.phone, plataforma: c.platform, status: c.status, valor: Number(c.value || 0) })));
    downloadCSV(csv, "nexus-flow-clientes.csv");
    toast({ title: "Exportação Iniciada" });
  };
  
  const handleImportClients = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: async (results) => {
            const importedClients = results.data.map(row => ({ name: row.nome, email: row.email, phone: row.telefone, platform: row.plataforma || 'manual', status: row.status || 'Lead', value: row.valor || 0, kanban_stage: 'new_lead', temperature: 'cold' })).filter(c => c.name && c.email);
            if(importedClients.length > 0) {
                try {
                  await apiClient.post('/api/clients/import', { clients: importedClients });
                  toast({ title: "Importação Concluída", description: `${importedClients.length} clientes importados!`});
                  fetchClients();
                } catch (error) {
                  const errorMessage = error.response?.data?.message || "Ocorreu um erro na importação.";
                  toast({ title: "Erro na Importação", description: errorMessage, variant: 'destructive'});
                }
            } else { 
              toast({ title: "Arquivo Vazio ou Inválido", variant: 'destructive'}); 
            }
        }
    });
  };

  const downloadSampleCSV = () => {
    const sampleCsv = "nome,email,telefone,plataforma,status,valor\nJoão da Silva,joao.silva@example.com,+5511999998888,kiwify,purchase.approved,197.90\nMaria Oliveira,maria.o@example.com,+5521988887777,manual,Lead,0";
    downloadCSV(sampleCsv, 'exemplo-importacao-clientes.csv');
  };
  
  const handleAddClient = () => { setSelectedClient(null); setIsFormOpen(true); };
  const handleEditClient = (client) => { setSelectedClient(client); setIsFormOpen(true); };
  const handleFormClose = (shouldRefetch) => { setIsFormOpen(false); setSelectedClient(null); if (shouldRefetch) { fetchClients(); } };
  
  const handleViewClient = (client) => { setViewingClient(client); };
  const promptDeleteClient = (client) => { setClientToDelete(client); setIsDeleteAlertOpen(true); };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      await apiClient.delete(`/api/clients/${clientToDelete.id}`);
      toast({ title: "Cliente deletado com sucesso!" });
      fetchClients();
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Ocorreu um erro ao deletar.";
      toast({ title: "Erro ao deletar cliente", description: errorMessage, variant: 'destructive' });
    }
    setIsDeleteAlertOpen(false);
    setClientToDelete(null);
  };

  const getLastTag = (segment) => {
    if (!segment || typeof segment !== 'string') return 'N/A';
    const tags = segment.split(',').map(t => t.trim()).filter(Boolean);
    return tags.length > 0 ? tags[tags.length - 1] : 'Lead';
  };

  return (
    <>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold text-white mb-2">Gestão de Leads</h1><p className="text-gray-400">Adicione, importe e gerencie todos os seus contatos</p></div>
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative flex-1 min-w-[250px]"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" /><Input placeholder="Buscar por nome ou email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white/5 border-white/10"/></div>
              <div className="flex gap-2 flex-wrap"><Button onClick={handleAddClient} className="bg-gradient-to-r from-purple-500 to-pink-500"><Plus className="w-4 h-4 mr-2" /> Novo Lead</Button><Button variant="outline" onClick={handleExportClients}><Download className="w-4 h-4 mr-2" />Exportar</Button><Button variant="outline" asChild><label htmlFor="import-csv" className="cursor-pointer"><Upload className="w-4 h-4 mr-2" />Importar<input type="file" id="import-csv" accept=".csv" className="hidden" onChange={handleImportClients} /></label></Button><Button variant="link" onClick={downloadSampleCSV} className="text-gray-400"><FileText className="w-4 h-4 mr-1" />Baixar Exemplo</Button></div>
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
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client, index) => (
                    <motion.tr 
                        key={client.id} 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        transition={{ delay: index * 0.05 }} 
                        className="border-b border-white/5 hover:bg-white/10 cursor-pointer"
                        onClick={() => handleViewClient(client)}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium">{client.name ? client.name.charAt(0).toUpperCase() : '?'}</div>
                          <div><p className="text-white font-medium">{client.name}</p></div>
                        </div>
                      </td>
                      <td className="py-4 px-4"><div className="space-y-1"><p className="text-white text-sm">{client.email}</p><p className="text-gray-400 text-sm">{client.phone}</p></div></td>
                      <td className="py-4 px-4"><div className="flex items-center gap-2 capitalize"><PlatformIcon platform={client.platform} /><span className="text-white">{client.platform || 'Manual'}</span></div></td>
                      <td className="py-4 px-4">
                        <Badge variant="secondary" className="whitespace-nowrap">{getLastTag(client.segment)}</Badge>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-green-400 font-medium">
                          R$ {Number(client.value || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" onClick={() => handleEditClient(client)} className="text-gray-400 hover:text-white h-8 w-8"><Edit className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => promptDeleteClient(client)} className="text-gray-400 hover:text-red-500 h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <ClientFormDialog isOpen={isFormOpen} onClose={handleFormClose} client={selectedClient} />
      <ClientDetailsDialog isOpen={!!viewingClient} onClose={() => setViewingClient(null)} client={viewingClient} />
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="glass-effect border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente
              e removerá seus dados de nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild><Button variant="secondary" onClick={() => setIsDeleteAlertOpen(false)}>Cancelar</Button></AlertDialogCancel>
            <AlertDialogAction asChild><Button variant="destructive" onClick={handleDeleteClient}>Sim, deletar</Button></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}