import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import apiClient from '@/lib/customSupabaseClient';

export function Traffic() {
    const [adsData, setAdsData] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAds = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/api/ads');
            setAdsData(response.data);
        } catch (error) {
            console.error('Erro ao buscar ads:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAds();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Gestão de Tráfego</h1>
                    <p className="text-gray-400">Acompanhe suas campanhas do Facebook Ads em tempo real</p>
                </div>
                <Button onClick={fetchAds} variant="outline" className="gap-2">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </div>

            <Card className="glass-effect border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Campanhas Ativas</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/10 hover:bg-white/5">
                                <TableHead className="text-gray-400">Campanha / Conjunto / Anúncio</TableHead>
                                <TableHead className="text-gray-400">Status</TableHead>
                                <TableHead className="text-gray-400">Gasto (R$)</TableHead>
                                <TableHead className="text-gray-400">CTR (%)</TableHead>
                                <TableHead className="text-gray-400">CPC (R$)</TableHead>
                                <TableHead className="text-gray-400">Leads</TableHead>
                                <TableHead className="text-gray-400">CPL (R$)</TableHead>
                                <TableHead className="text-gray-400">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {adsData.map((ad) => (
                                <TableRow key={ad.id} className="border-white/10 hover:bg-white/5">
                                    <TableCell className="font-medium text-white">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-purple-400">{ad.campaign}</span>
                                            <span className="text-xs text-gray-300 ml-2">↳ {ad.adset}</span>
                                            <span className="text-xs text-gray-500 ml-4">↳ {ad.ad}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={ad.status === 'active' ? 'default' : 'secondary'} className={ad.status === 'active' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : ''}>
                                            {ad.status === 'active' ? 'Ativo' : 'Pausado'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-white">R$ {ad.spend.toFixed(2)}</TableCell>
                                    <TableCell className={ad.ctr > 2 ? 'text-green-400' : 'text-yellow-400'}>{ad.ctr}%</TableCell>
                                    <TableCell className="text-white">R$ {ad.cpc.toFixed(2)}</TableCell>
                                    <TableCell className="text-white">{ad.leads}</TableCell>
                                    <TableCell className="text-white">R$ {ad.cost_per_lead.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch checked={ad.status === 'active'} />
                                            {ad.cost_per_lead > 15 && (
                                                <AlertTriangle className="w-4 h-4 text-red-500" title="Custo por Lead alto!" />
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
