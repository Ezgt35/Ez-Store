import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Admin } from '../lib/supabase';

interface AdminAuthContextType {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  token: string | null;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const AUTH_KEY = 'ezstore_admin_auth';
const AUTH_TOKEN_KEY = 'ezstore_admin_auth_token';
const AUTH_EXPIRY_KEY = 'ezstore_admin_auth_expiry';
const SESSION_DURATION = 24 * 60 * 60 * 1000;

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      const storedAuth = localStorage.getItem(AUTH_KEY);
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      const storedExpiry = localStorage.getItem(AUTH_EXPIRY_KEY);

      if (storedAuth && storedToken && storedExpiry) {
        const expiry = parseInt(storedExpiry, 10);
        if (Date.now() < expiry) {
          try {
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-auth`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({ action: 'validate', token: storedToken }),
              }
            );

            const data = await response.json();
            if (!response.ok || data.error) {
              localStorage.removeItem(AUTH_KEY);
              localStorage.removeItem(AUTH_TOKEN_KEY);
              localStorage.removeItem(AUTH_EXPIRY_KEY);
            } else {
              setAdmin(data.admin);
              setToken(storedToken);
              localStorage.setItem(AUTH_EXPIRY_KEY, (Date.now() + SESSION_DURATION).toString());
            }
          } catch {
            localStorage.removeItem(AUTH_KEY);
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_EXPIRY_KEY);
          }
        } else {
          localStorage.removeItem(AUTH_KEY);
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(AUTH_EXPIRY_KEY);
        }
      }
      setLoading(false);
    };

    validateSession();

    const checkInterval = setInterval(() => {
      const storedExpiry = localStorage.getItem(AUTH_EXPIRY_KEY);
      if (storedExpiry && Date.now() >= parseInt(storedExpiry, 10)) {
        logout();
      }
    }, 60000);

    return () => clearInterval(checkInterval);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email, password, action: 'login' }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        return { success: false, error: data.error || 'Login failed' };
      }

      setAdmin(data.admin);
      setToken(data.token || null);

      localStorage.setItem(AUTH_KEY, JSON.stringify(data.admin));
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      localStorage.setItem(AUTH_EXPIRY_KEY, (Date.now() + SESSION_DURATION).toString());

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAdmin(null);
    setToken(null);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        loading,
        login,
        logout,
        isAuthenticated: admin !== null,
        token,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
