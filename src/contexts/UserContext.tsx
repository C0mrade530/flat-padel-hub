import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { DbUser } from '@/types/database';

// Dev mode test user (owner role for testing)
const DEV_USER: DbUser = {
  id: 'dev-user-001',
  telegram_id: 123456789,
  display_name: 'Dev User',
  username: 'devuser',
  avatar_url: null,
  level: 'C+',
  role: 'owner',
  membership_status: 'paid',
};

interface UserContextType {
  user: DbUser | null;
  loading: boolean;
  isDevMode: boolean;
  isAdmin: boolean;
  refetchUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  isDevMode: false,
  isAdmin: false,
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

  const fetchUser = async () => {
    // Check if Telegram WebApp is available
    const tg = (window as any).Telegram?.WebApp;
    
    if (tg?.initDataUnsafe?.user) {
      // Real Telegram user
      const telegramUser = tg.initDataUnsafe.user;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', telegramUser.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setUser(data as DbUser);
        } else {
          // Create new user if not exists
          const newUser = {
            telegram_id: telegramUser.id,
            display_name: `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim() || 'Игрок',
            username: telegramUser.username || null,
            avatar_url: telegramUser.photo_url || null,
            level: 'D',
            role: 'player',
            membership_status: 'unpaid',
          };

          const { data: createdUser, error: createError } = await supabase
            .from('users')
            .insert(newUser)
            .select()
            .single();

          if (createError) throw createError;
          setUser(createdUser as DbUser);
        }
        setIsDevMode(false);
      } catch (error) {
        console.error('Error fetching user:', error);
        // Fallback to dev mode on error
        setUser(DEV_USER);
        setIsDevMode(true);
      }
    } else {
      // Dev mode - no Telegram, use test user
      console.log('DEV MODE: Using test user with owner role');
      setUser(DEV_USER);
      setIsDevMode(true);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const isAdmin = user?.role === 'owner' || user?.role === 'assistant';

  return (
    <UserContext.Provider value={{ 
      user, 
      loading, 
      isDevMode, 
      isAdmin,
      refetchUser: fetchUser 
    }}>
      {children}
    </UserContext.Provider>
  );
};
