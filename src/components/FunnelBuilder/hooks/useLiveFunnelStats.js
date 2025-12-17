// Hook customizado para estatísticas em tempo real
import { useState, useEffect, useRef } from 'react';
import apiClient from '@/lib/customSupabaseClient';

export function useLiveFunnelStats(funnelId, isActive, intervalMs = 3000) {
    const [liveStats, setLiveStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const intervalRef = useRef(null);

    const fetchStats = async () => {
        if (!funnelId || !isActive) {
            setLiveStats(null);
            setIsLoading(false);
            return;
        }

        try {
            const response = await apiClient.get(`/api/funnels/${funnelId}/live-stats`);
            setLiveStats(response.data);
            setIsLoading(false);
        } catch (error) {
            console.error('[LiveStats] Erro ao buscar:', error);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Buscar imediatamente
        fetchStats();

        // Se o funil está ativo, fazer polling
        if (isActive && funnelId) {
            intervalRef.current = setInterval(fetchStats, intervalMs);
        }

        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [funnelId, isActive, intervalMs]);

    return { liveStats, isLoading, refetch: fetchStats };
}
