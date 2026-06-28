import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await supabase.auth.getSessionFromUrl({ storeSession: true });
      } catch (error) {
        console.error('Auth callback error:', error);
      } finally {
        navigate('/user/dashboard', { replace: true });
      }
    };

    void handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-muted">Memproses login Google...</p>
      </div>
    </div>
  );
}
