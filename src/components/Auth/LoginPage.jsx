import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext'; // <-- CORREÇÃO APLICADA AQUI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth(); // Funções vêm do nosso novo AuthContext

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    await signIn(email, password);
    // O setLoading(false) será tratado pelo AuthContext, que fará a tela recarregar
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    await signUp(email, password);
    setLoading(false); // Mantemos aqui para o usuário poder tentar logar depois
  };

  return (
    <>
      <Helmet>
        <title>Login - Nexus Flow</title>
      </Helmet>
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Tabs defaultValue="login" className="w-[400px]">
            <TabsList className="grid w-full grid-cols-2 bg-white/5">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <Card className="glass-effect border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-2xl gradient-text">Bem-vindo de volta!</CardTitle>
                  <CardDescription className="text-gray-400">Acesse sua conta para continuar.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email" className="text-gray-300">Email</Label>
                      <Input id="login-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white/5" />
                    </div>
                    <div>
                      <Label htmlFor="login-password" className="text-gray-300">Senha</Label>
                      <Input id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-white/5" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-500 to-pink-500">
                      {loading ? <Loader2 className="animate-spin" /> : 'Entrar'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="signup">
              <Card className="glass-effect border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-2xl gradient-text">Crie sua Conta</CardTitle>
                  <CardDescription className="text-gray-400">Comece a usar o Nexus Flow hoje mesmo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div>
                      <Label htmlFor="signup-email" className="text-gray-300">Email</Label>
                      <Input id="signup-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white/5" />
                    </div>
                    <div>
                      <Label htmlFor="signup-password" className="text-gray-300">Senha</Label>
                      <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-white/5" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-green-500 to-emerald-500">
                      {loading ? <Loader2 className="animate-spin" /> : 'Criar Conta'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </>
  );
}