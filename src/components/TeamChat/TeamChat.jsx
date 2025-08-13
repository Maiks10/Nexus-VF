
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Users } from 'lucide-react';

export function TeamChat() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const { toast } = useToast();

    // Mock user for now. In a real app, this would come from auth context.
    const currentUser = { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', email: 'user@example.com' };

    const fetchMessages = async () => {
        const { data, error } = await supabase
            .from('team_messages')
            .select('*, user_id(email)') // This might not work if you don't have RLS set up for users to read other users' emails. A profile table is better.
            .order('created_at', { ascending: true });
        
        if (error) {
            toast({ title: "Erro ao buscar mensagens", description: error.message, variant: 'destructive' });
        } else {
            // A temporary fix for the select above, as it might fail
            const formattedData = data.map(m => ({ ...m, senderEmail: m.user_id?.email || 'Usuário Anônimo' }));
            setMessages(formattedData);
        }
    };

    useEffect(() => {
        fetchMessages();

        const channel = supabase
            .channel('team-chat')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages' }, (payload) => {
                const updatedMessage = { ...payload.new, senderEmail: 'Novo Usuário' }; // Again, a profile would be better here.
                setMessages(currentMessages => [...currentMessages, updatedMessage]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        const { error } = await supabase.from('team_messages').insert({
            content: newMessage,
            user_id: currentUser.id,
            team_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12' // Mock team_id
        });

        if (error) {
            toast({ title: "Erro ao enviar mensagem", description: error.message, variant: 'destructive' });
        } else {
            setNewMessage('');
        }
    };

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
