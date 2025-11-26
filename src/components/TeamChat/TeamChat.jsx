import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
// ALTERADO: Importando apiClient
import apiClient from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Users } from 'lucide-react';
// ALTERADO: Importando nosso AuthContext
import { useAuth } from '@/contexts/AuthContext';

export function TeamChat() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const { toast } = useToast();
    // ALTERADO: O usuário agora vem do nosso AuthContext
    const { user: currentUser } = useAuth();
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // ALTERADO: fetchMessages agora usa apiClient
    const fetchMessages = async () => {
        if (!currentUser) return;
        try {
            const response = await apiClient.get('/api/team-chat/messages');
            setMessages(response.data || []);
        } catch (error) {
            toast({ title: "Erro ao buscar mensagens", description: error.response?.data?.message, variant: 'destructive' });
        }
    };

    // Efeito para buscar mensagens e iniciar o polling
    useEffect(() => {
        fetchMessages();

        // ALTERADO: Substituímos o Supabase Channel por um intervalo que busca mensagens a cada 5 segundos
        const intervalId = setInterval(fetchMessages, 5000);

        // Limpa o intervalo quando o componente é desmontado
        return () => clearInterval(intervalId);
    }, [currentUser]); // Depende do currentUser para começar a buscar

    // Efeito para rolar para o final quando novas mensagens chegam
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // ALTERADO: handleSendMessage agora usa apiClient
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentUser) return;

        // Adiciona a mensagem otimisticamente para uma UI mais rápida
        const optimisticMessage = {
            id: `temp-${Date.now()}`,
            content: newMessage,
            user_id: currentUser.id,
            senderEmail: currentUser.email,
            created_at: new Date().toISOString(),
        };
        setMessages(currentMessages => [...currentMessages, optimisticMessage]);
        setNewMessage('');

        try {
            await apiClient.post('/api/team-chat/messages', {
                content: newMessage,
                // O backend pegará o team_id do usuário logado
            });
            // A mensagem real virá na próxima busca do polling, substituindo a otimista se necessário
        } catch (error) {
            toast({ title: "Erro ao enviar mensagem", description: error.response?.data?.message, variant: 'destructive' });
            // Remove a mensagem otimista em caso de erro
            setMessages(currentMessages => currentMessages.filter(m => m.id !== optimisticMessage.id));
            setNewMessage(newMessage); // Devolve o texto para o input
        }
    };

    if (!currentUser) {
        return <p className="text-white text-center p-8">Carregando dados do usuário...</p>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white mb-2">Chat Interno da Equipe</h1>
            <Card className="glass-effect border-white/10 h-[calc(100vh-200px)] flex flex-col">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2"><Users /> Comunicação da Equipe</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-4">
                    <div className="flex-1 space-y-4 mb-4 overflow-y-auto scrollbar-hide pr-2">
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${msg.user_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${msg.user_id === currentUser.id ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'bg-white/10 text-white'}`}>
                                    <p className="text-xs font-bold opacity-80">{msg.senderEmail}</p>
                                    <p className="text-sm">{msg.content}</p>
                                    <p className="text-xs opacity-70 mt-1 text-right">{new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </motion.div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Digite sua mensagem para a equipe..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="bg-white/5 border-white/10"
                        />
                        <Button onClick={handleSendMessage} className="bg-gradient-to-r from-purple-500 to-pink-500">
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}