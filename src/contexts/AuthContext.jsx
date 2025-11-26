import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';

const API_URL = '/api';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = () => {
      // ADICIONADO: Verificação para garantir que o token é uma string válida
      if (token && typeof token === 'string' && token.split('.').length === 3) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          // Verifica se o token não expirou
          if (payload.exp * 1000 > Date.now()) {
            setUser({ id: payload.userId, email: payload.email });
          } else {
            // Token expirado
            localStorage.removeItem('authToken');
            setToken(null);
            setUser(null);
          }
        } catch (e) {
          // Token inválido (não pôde ser decodificado)
          localStorage.removeItem('authToken');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    validateToken();
  }, [token]);

  const signUp = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao criar conta');
      toast({ title: "Conta Criada!", description: "Agora você pode fazer o login." });
      return { error: null };
    } catch (error) {
      toast({ variant: "destructive", title: "Falha no Cadastro", description: error.message });
      return { error };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha no login');

      // ADICIONADO: Garante que o token existe antes de salvar
      if (data && data.token) {
        localStorage.setItem('authToken', data.token);
        setToken(data.token);
        setUser(data.user);
      } else {
        throw new Error('Resposta do servidor inválida.');
      }
      return { error: null };
    } catch (error) {
      toast({ variant: "destructive", title: "Falha no Login", description: error.message });
      return { error };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const signOut = useCallback(() => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    signUp,
    signIn,
    signOut,
  }), [user, token, loading, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};