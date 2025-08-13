import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Filter, MoreHorizontal, Upload, Download, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { ClientFormDialog } from './ClientFormDialog';
import Papa from 'papaparse';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ClientsTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    status: [],
    segment: [],
  });

  const fetchClients = useCallback(async () => {
    let query = supabase.from('clients').select('*');
    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }
    if (filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters.segment.length > 0) {
      query = query.in('segment', filters.segment);
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: "Erro ao buscar clientes", description: error.message, variant: 'destructive' });
    } else {
      setClients(data);
    }
  }, [searchTerm, filters, toast]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchClients();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchClients]);

  useEffect(() => {
    fetchClients();
  }, [filters, fetchClients]);
  
  const handleExportClients = () => {
    const csv = Papa.unparse(clients.map(c => ({
        nome: c.name,
        email: c.email,
        telefone: c.phone,
        etiqueta: c.segment
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "nexus-flow-clientes.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    toast({ title: "Exportação Iniciada", description: "O download do seu arquivo CSV começará em breve." });
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
                segment: row.etiqueta,
                status: 'Lead',
                kanban_stage: 'new_lead',
                temperature: 'cold'
            })).filter(c => c.name);

            if(importedClients.length > 0) {
                const { error } = await supabase.from('clients').insert(importedClients);
                if(error) {
                    toast({ title: "Erro na Importação", description: error.message, variant: 'destructive'});
                } else {
                    toast({ title: "Importação Concluída", description: `${importedClients.length} clientes importados com sucesso!`});
                    fetchClients();
                }
            } else {
                 toast({ title: "Arquivo Vazio ou Inválido", description: "Verifique o formato do seu arquivo.", variant: 'destructive'});
            }
        }
    });
  };

  const downloadSampleCSV = () => {
    const sampleCsv = "nome,email,telefone,etiqueta\nJoão da Silva,joao.silva@example.com,+5511999998888,VIP\nMaria Oliveira,maria.o@example.com,+5521988887777,Regular";
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'exemplo-importacao-clientes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const handleFilterChange = (type, value) => {
    setFilters(prev => {
      const newValues = prev[type].includes(value)
        ? prev[type].filter(item => item !== value)
        : [...prev[type], value];
      return { ...prev, [type]: newValues };
    });
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
    if(shouldRefetch) {
      fetchClients();
    }
  };

  return (
    <>
    <Card className="glass-effect border-white/10">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="text-white">Gestão de Clientes</CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleAddClient} className="bg-gradient-to-r from-purple-500 to-pink-500">
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
            <Button variant="outline" onClick={handleExportClients}><Download className="w-4 h-4 mr-2" />Exportar</Button>
            <Button variant="outline" asChild>
                <label htmlFor="import-csv" className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />Importar
                    <input type="file" id="import-csv" accept=".csv" className="hidden" onChange={handleImportClients} />
                </label>
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
            <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10"
                />
            </div>
            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-white/10">
                        <Filter className="w-4 h-4 mr-2" />
                        Filtros
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 glass-effect border-white/10 text-white">
                    <DropdownMenuLabel>Filtrar por Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem checked={filters.status.includes('Ativo')} onCheckedChange={() => handleFilterChange('status', 'Ativo')}>Ativo</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={filters.status.includes('Inativo')} onCheckedChange={() => handleFilterChange('status', 'Inativo')}>Inativo</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={filters.status.includes('Novo')} onCheckedChange={() => handleFilterChange('status', 'Novo')}>Novo</DropdownMenuCheckboxItem>

                    <DropdownMenuLabel className="mt-2">Filtrar por Segmento</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem checked={filters.segment.includes('VIP')} onCheckedChange={() => handleFilterChange('segment', 'VIP')}>VIP</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={filters.segment.includes('Regular')} onCheckedChange={() => handleFilterChange('segment', 'Regular')}>Regular</DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                </DropdownMenu>
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
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Segmento</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Valor</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, index) => (
                <motion.tr
                  key={client.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-medium">{client.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <p className="text-white text-sm">{client.email}</p>
                      <p className="text-gray-400 text-sm">{client.phone}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant={client.status === 'Ativo' ? 'default' : 'secondary'}>
                      {client.status || 'N/A'}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-white">{client.segment || 'N/A'}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-green-400 font-medium">R$ {client.value || 0}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                       <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditClient(client)}
                        className="text-gray-400 hover:text-white"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
    <ClientFormDialog isOpen={isDialogOpen} onClose={handleDialogClose} client={selectedClient} />
    </>
  );
}