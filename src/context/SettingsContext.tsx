import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface Settings {
  site_name: string;
  site_tagline: string;
  logo_url: string;
  favicon_url: string;
  contact_email: string;
  contact_whatsapp: string;
  facebook_url: string;
  instagram_url: string;
  twitter_url: string;
  youtube_url: string;
  seo_title: string;
  meta_description: string;
  footer_text: string;
  google_analytics_id: string;
}

interface SettingsContextType {
  settings: Settings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
  site_name: 'Ez-Store',
  site_tagline: 'Top Up Game Termurah & Tercepat',
  logo_url: '',
  favicon_url: '',
  contact_email: 'support@ez-store.com',
  contact_whatsapp: '6281234567890',
  facebook_url: '',
  instagram_url: '',
  twitter_url: '',
  youtube_url: '',
  seo_title: 'Ez-Store - Top Up Game Termurah & Tercepat',
  meta_description: 'Top up game dengan harga termurah dan proses tercepat.',
  footer_text: '© 2024 Ez-Store. All rights reserved.',
  google_analytics_id: '',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw error;

      if (data) {
        const settingsMap = data.reduce((acc, item) => {
          acc[item.key] = item.value || '';
          return acc;
        }, {} as Record<string, string>);

        setSettings({
          ...defaultSettings,
          ...settingsMap,
        } as Settings);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider
      value={{ settings, loading, refreshSettings: fetchSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
