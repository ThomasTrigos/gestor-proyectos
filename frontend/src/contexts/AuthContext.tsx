import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, LoginRequest, LoginResponse } from '../types';
import client from '../api/client';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: Partial<AuthUser>) => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginRequest) => {
    const id = credentials.identificador || credentials.username || credentials.email || '';
    const payload = {
      identificador: id,
      username: id,
      email: id,
      password: credentials.password,
    };
    const response = await client.post<LoginResponse>('/auth/login/', payload);
    const { access, refresh, user } = response.data;
    
    localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user', JSON.stringify(user));
    
    setUser(user);
  };

  const logout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    try {
      await client.post('/auth/logout/', { refresh });
    } catch (e) {
      // Ignorar si falla la llamada de red al cerrar sesión
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (updatedUser: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return null;
      const merged = { ...prev, ...updatedUser };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
