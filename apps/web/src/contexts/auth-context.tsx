'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    role: 'TEACHER' | 'STUDENT',
    classroomCode?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state from localStorage and verify with server
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          // Verify token is still valid
          const { user: currentUser } = await authApi.me(storedToken);
          setUser(currentUser);
          setAccessToken(storedToken);
        } catch (error) {
          // Token expired, try to refresh
          try {
            const { accessToken: newToken } = await authApi.refresh();
            const { user: currentUser } = await authApi.me(newToken);
            setUser(currentUser);
            setAccessToken(newToken);
            localStorage.setItem('accessToken', newToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
          } catch (refreshError) {
            // Refresh failed, clear auth state
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Auto-refresh token before expiry (15min - 1min = 14min)
  useEffect(() => {
    if (!accessToken) return;

    const refreshInterval = setInterval(
      async () => {
        try {
          const { accessToken: newToken } = await authApi.refresh();
          setAccessToken(newToken);
          localStorage.setItem('accessToken', newToken);
        } catch (error) {
          console.error('Token refresh failed:', error);
          // If refresh fails, logout
          await logout();
        }
      },
      14 * 60 * 1000
    ); // 14 minutes

    return () => clearInterval(refreshInterval);
  }, [accessToken]);

  const login = async (email: string, password: string) => {
    const { user: loggedInUser, accessToken: token } = await authApi.login({
      email,
      password,
    });

    setUser(loggedInUser);
    setAccessToken(token);
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(loggedInUser));

    // Route based on role
    const redirectPath = loggedInUser.role === 'TEACHER' ? '/dashboard' : '/student-dashboard';
    router.push(redirectPath);
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    role: 'TEACHER' | 'STUDENT',
    classroomCode?: string
  ) => {
    const { user: registeredUser, accessToken: token } = await authApi.register(
      {
        email,
        password,
        name,
        role,
        classroomCode,
      }
    );

    setUser(registeredUser);
    setAccessToken(token);
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(registeredUser));

    // Route based on role
    const redirectPath = role === 'TEACHER' ? '/dashboard' : '/student-dashboard';
    router.push(redirectPath);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  const refreshToken = async () => {
    const { accessToken: newToken } = await authApi.refresh();
    setAccessToken(newToken);
    localStorage.setItem('accessToken', newToken);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        login,
        register,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
