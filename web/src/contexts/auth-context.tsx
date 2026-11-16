'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

import { clearAuth, getStoredUser, getToken, saveAuth } from '@/lib/auth';

import { AuthUser, LoginResponse } from '@/types/auth';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;

  login: (username: string, password: string) => Promise<void>;

  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);

  const [token, setToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === 'true') {
      const devLogin = async () => {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                username: process.env.NEXT_PUBLIC_DEV_USERNAME || 'superadmin',
                password: process.env.NEXT_PUBLIC_DEV_PASSWORD || '',
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData?.message || 'Dev mode login failed');
          }

          const data = await response.json();
          const loginData = data as LoginResponse;

          saveAuth(loginData.accessToken, loginData.user);
          setToken(loginData.accessToken);
          setUser(loginData.user);
          setLoading(false);
        } catch (error) {
          console.error('Dev mode login failed:', error);
          setLoading(false);
        }
      };

      devLogin();
      return;
    }

    const storedToken = getToken();
    const storedUser = getStoredUser();

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }

    setLoading(false);
  }, []);

  async function login(username: string, password: string) {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          username,
          password,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || 'Invalid username or password');
    }

    const loginData = data as LoginResponse;

    saveAuth(loginData.accessToken, loginData.user);

    setToken(loginData.accessToken);
    setUser(loginData.user);

    router.replace('/');
  }

  function logout() {
    clearAuth();

    setToken(null);
    setUser(null);

    router.replace('/login');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
