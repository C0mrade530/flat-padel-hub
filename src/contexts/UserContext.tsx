import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { DbUser } from '@/types/database';

interface UserContextType {
  user: DbUser | null;
  loading: boolean;
  isDevMode: boolean;
  isAdmin: boolean;
  isTelegram: boolean;
  refetchUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  isDevMode: false,
  isAdmin: false,
  isTelegram: false,
  refetchUser: async () => {},
});

export const useUser = () => useContext(UserContext);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);

  const fetchUser = async () => {
    try {
      setLoading(true);
      
      const tg = window.Telegram?.WebApp;
      const tgUser = tg?.initDataUnsafe?.user;
      
      // ОТЛАДКА - покажи в консоли
      console.log('=== DEBUG ===');
      console.log('Telegram WebApp:', tg);
      console.log('TG User:', tgUser);
      console.log('TG User ID:', tgUser?.id);
      console.log('TG User ID type:', typeof tgUser?.id);
      
      // Mark if running in Telegram
      setIsTelegram(!!tg);
      
      if (tgUser?.id) {
        // Ищем пользователя по telegram_id
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', tgUser.id)
          .single();
        
        console.log('Supabase result:', { data, error });
        
        if (data && !error) {
          setUser(data as DbUser);
          setIsDevMode(false);
          return;
        } else {
          console.log('User not found for telegram_id:', tgUser.id);
        }
      }
      
      // Fallback - если не в Telegram или пользователь не найден
      // Берём первого пользователя для тестирования
      console.log('Using fallback - loading first user');
      const { data } = await supabase
        .from('users')
        .select('*')
        .limit(1)
        .single();
      
      console.log('Fallback user:', data);
      
      if (data) {
        setUser(data as DbUser);
        setIsDevMode(!tgUser);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    
    // Initialize Telegram WebApp
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  const isAdmin = user?.role === 'owner' || user?.role === 'assistant';

  return (
    <UserContext.Provider value={{ 
      user, 
      loading, 
      isDevMode,
      isAdmin,
      isTelegram,
      refetchUser: fetchUser 
    }}>
      {children}
    </UserContext.Provider>
  );
};
