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
    const tg = (window as any).Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;

    console.log('Telegram WebApp:', !!tg, 'User:', tgUser);

    // Mark if running in Telegram
    setIsTelegram(!!tgUser?.id);

    if (tgUser?.id) {
      // Real Telegram user
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', tgUser.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          console.log('Found Telegram user:', data.id);
          setUser(data as DbUser);
        } else {
          // Create new user if not exists
          console.log('Creating new Telegram user...');
          const newUser = {
            telegram_id: tgUser.id,
            display_name: `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || 'Игрок',
            username: tgUser.username || null,
            avatar_url: tgUser.photo_url || null,
            level: 'D',
            role: 'player' as const,
            membership_status: 'unpaid',
          };

          const { data: createdUser, error: createError } = await supabase
            .from('users')
            .insert(newUser)
            .select()
            .single();

          if (createError) throw createError;
          console.log('Created Telegram user:', createdUser.id);
          setUser(createdUser as DbUser);
        }
        setIsDevMode(false);
      } catch (error) {
        console.error('Error fetching/creating Telegram user:', error);
        setUser(null);
      }
    } else if (import.meta.env.DEV) {
      // Dev mode — only when NOT in Telegram and DEV environment
      console.log('DEV MODE: No Telegram, using dev user...');
      
      const { data: devUser } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'owner')
        .limit(1)
        .maybeSingle();

      if (devUser) {
        console.log('DEV MODE: Using dev user:', devUser.id);
        setUser(devUser as DbUser);
        setIsDevMode(true);
      }
    }

    setLoading(false);
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
