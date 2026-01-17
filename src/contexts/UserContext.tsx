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
      
      // Получаем данные из Telegram WebApp
      const tg = window.Telegram?.WebApp;
      const tgUser = tg?.initDataUnsafe?.user;
      
      console.log('Telegram user:', tgUser);
      
      // Mark if running in Telegram
      setIsTelegram(!!tgUser?.id);
      
      if (tgUser?.id) {
        // Ищем пользователя по telegram_id
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', tgUser.id)
          .maybeSingle();
        
        console.log('DB result:', data, error);
        
        if (data) {
          setUser(data as DbUser);
          setIsDevMode(false);
        } else {
          console.log('User not found for telegram_id:', tgUser.id);
          setUser(null);
        }
      } else {
        console.log('Not in Telegram, using fallback');
        // Fallback для браузера - берём первого owner
        if (import.meta.env.DEV) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'owner')
            .limit(1)
            .maybeSingle();
          
          if (data) {
            console.log('DEV MODE: Using dev user:', data.id);
            setUser(data as DbUser);
            setIsDevMode(true);
          }
        }
      }
    } catch (err) {
      console.error('Init user error:', err);
      setUser(null);
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
