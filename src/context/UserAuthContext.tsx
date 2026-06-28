import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  whatsapp: string;
  created_at?: string;
}

interface UserAuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  token: string | null;
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined);

const AUTH_KEY = 'ezstore_user_auth';
const AUTH_TOKEN_KEY = 'ezstore_user_auth_token';
const AUTH_EXPIRY_KEY = 'ezstore_user_auth_expiry';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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
            setUser(JSON.parse(storedAuth));
            setToken(storedToken);
            localStorage.setItem(AUTH_EXPIRY_KEY, (Date.now() + SESSION_DURATION).toString());
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-auth`,
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
        return { success: false, error: data.error || 'Login gagal' };
      }

      setUser(data.user);
      setToken(data.token || null);

      localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
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
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
  };

  return (
    <UserAuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: user !== null,
        token,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const context = useContext(UserAuthContext);
  if (context === undefined) {
    throw new Error('useUserAuth must be used within a UserAuthProvider');
  }
  return context;
}
