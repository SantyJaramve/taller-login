// =============================================================================
// CONTEXTO DE AUTENTICACION - CocinasApp
// =============================================================================
// Provee: user, token, login(), completeLogin(), logout(), isAuthenticated,
//         isAdmin, isSupervisor, isEmployee, isCarpintero
// =============================================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';

// --- Interfaz de usuario ---
interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  role_display_name: string;
}

// --- Tipo del contexto ---
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  completeLogin: (tokenStr: string, userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isEmployee: boolean;
  isCarpintero: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Proveedor de autenticacion ---
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  // --- Sincronizar token con localStorage ---
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  // --- Sincronizar usuario con localStorage ---
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // --- Login directo (para flujos sin animacion) ---
  const login = async (username: string, password: string) => {
    const response = await api.post<{ token: string; user: User }>('/auth/login', { username, password });
    setToken(response.token);
    setUser(response.user);
  };

  // --- Login diferido (para el flujo con video) ---
  const completeLogin = useCallback((tokenStr: string, userData: User) => {
    setToken(tokenStr);
    setUser(userData);
  }, []);

  // --- Cerrar sesion ---
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      completeLogin,
      logout,
      isAuthenticated: !!token && !!user,
      isAdmin: user?.role === 'admin',
      isSupervisor: user?.role === 'supervisor',
      isEmployee: user?.role === 'employee',
      isCarpintero: user?.role === 'carpintero',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Hook para usar el contexto ---
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
}
