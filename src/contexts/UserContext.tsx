import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { DbUser } from '@/types/database';

// Dev mode telegram_id for test user
const DEV_TELEGRAM_ID = 123456789;

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

  // Initialize or fetch dev user from database
  const initDevUser = async (): Promise<DbUser | null> => {
    try {
      // First try to find existing dev user
      const { data: existing, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', DEV_TELEGRAM_ID)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching dev user:', fetchError);
        return null;
      }

      if (existing) {
        console.log('DEV MODE: Found existing dev user:', existing.id);
        return existing as DbUser;
      }

      // Create new dev user if not exists
      console.log('DEV MODE: Creating new dev user...');
      const { data: created, error: createError } = await supabase
        .from('users')
        .insert({
          telegram_id: DEV_TELEGRAM_ID,
          display_name: 'Dev User',
          username: 'devuser',
          level: 'D+',
          role: 'owner',
          membership_status: 'paid',
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating dev user:', createError);
        return null;
      }

      console.log('DEV MODE: Created dev user:', created.id);
      return created as DbUser;
    } catch (error) {
      console.error('Dev user init error:', error);
      return null;
    }
  };

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
        const devUser = await initDevUser();
        setUser(devUser);
        setIsDevMode(true);
      }
    } else {
      // Dev mode - no Telegram, create/fetch real user from DB
      console.log('DEV MODE: No Telegram WebApp, initializing dev user...');
      const devUser = await initDevUser();
      setUser(devUser);
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
