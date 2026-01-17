import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  telegram_id: number | null;
  username: string | null;
  display_name: string;
  phone: string | null;
  level: string | null;
  role: string;
  avatar_url: string | null;
  membership_status: string | null;
  created_at?: string;
  updated_at?: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isDevMode: boolean;
  refetchUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({ 
  user: null, 
  loading: true, 
  isAdmin: false,
  isDevMode: false,
  refetchUser: async () => {}
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);

  const loadUser = async () => {
    try {
      // Пробуем получить telegram_id из Telegram WebApp
      const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      
      console.log('Loading user, tgId:', tgId);
      
      let query = supabase.from('users').select('*');
      
      if (tgId) {
        query = query.eq('telegram_id', tgId);
      }
      
      const { data, error } = await query.limit(1).maybeSingle();
      
      console.log('User loaded:', data, error);
      
      if (data) {
        setUser(data);
        // Если нет telegram_id в WebApp - это dev mode
        setIsDevMode(!window.Telegram?.WebApp?.initDataUnsafe?.user?.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
  }, []);

  const isAdmin = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'assistant';

  return (
    <UserContext.Provider value={{ user, loading, isAdmin, isDevMode, refetchUser: loadUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
