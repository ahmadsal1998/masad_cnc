import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { fetchSheet } from '../services/googleSheets';
import { verifyPassword } from '../utils/hash';
import { SHEETS } from '../services/config';

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'msad_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const users = await fetchSheet<User>(SHEETS.USERS);
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    const valid = await verifyPassword(password, found.password);
    if (!valid) throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    const safeUser: User = { ...found, password: '' };
    setUser(safeUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
