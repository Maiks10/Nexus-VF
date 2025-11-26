import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import apiClient from '@/lib/customSupabaseClient'; // Importando nosso apiClient (axios)
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Função para validar o token ao carregar a página
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // IMPORTANTE: Ajuste a URL '/api/auth/profile' se a rota da sua API que valida um token for diferente
          const response = await apiClient.get('/api/auth/profile'); 
          setUser(response.data); // O backend deve retornar os dados do usuário
        } catch (error) {
          // Se o token for inválido ou expirado, removemos ele.
          localStorage.removeItem('authToken');
          setUser(null);
          console.error("Sessão inválida, fazendo logout.", error);
        }
      }
      setLoading(false);
    };

    validateToken();
  }, []);

  const signUp = useCallback(async (email, password, otherDetails) => {
    try {
      // IMPORTANTE: Ajuste a URL '/api/auth/register' se a rota de cadastro da sua API for diferente
      await apiClient.post('/api/auth/register', { email, password, ...otherDetails });
      toast({
        title: "Cadastro realizado!",
        description: "Você já pode fazer o login com suas credenciais.",
      });
      return { error: null };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Ocorreu um erro no cadastro.";
      toast({
        variant: "destructive",
        title: "Falha no Cadastro",
        description: errorMessage,
      });
      return { error: new Error(errorMessage) };
    }
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    try {
      // IMPORTANTE: Ajuste a URL '/api/auth/login' se a rota de login da sua API for diferente
      const response = await apiClient.post('/api/auth/login', { email, password });
      
      const { token, user } = response.data;

      if (!token || !user) {
        throw new Error("Resposta da API inválida. Faltando token ou dados do usuário.");
      }

      localStorage.setItem('authToken', token);
      setUser(user);

      return { error: null };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Email ou senha inválidos.";
      toast({
        variant: "destructive",
        title: "Falha no Login",
        description: errorMessage,
      });
      return { error: new Error(errorMessage) };
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    localStorage.removeItem('authToken');
    setUser(null);
    return { error: null };
  }, []);
  
  const value = useMemo(() => ({
    user,
    loading,
    signUp,
    signIn,
    signOut,
  }), [user, loading, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};