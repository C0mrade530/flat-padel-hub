import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

export interface UserRegistration {
  eventId: string;
  status: 'confirmed' | 'waiting' | 'canceled';
  isPaid: boolean;
}

export const useUserRegistrations = () => {
  const { user } = useUser();
  const [registrations, setRegistrations] = useState<Map<string, UserRegistration>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchRegistrations = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get all user's registrations with payment status
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          id,
          event_id,
          status,
          payments (
            status
          )
        `)
        .eq('user_id', user.id)
        .neq('status', 'canceled');

      if (error) throw error;

      const regMap = new Map<string, UserRegistration>();
      
      (data || []).forEach((item: any) => {
        const isPaid = item.payments?.some((p: any) => p.status === 'paid') || false;
        regMap.set(item.event_id, {
          eventId: item.event_id,
          status: item.status,
          isPaid,
        });
      });

      setRegistrations(regMap);
    } catch (err) {
      console.error('Error fetching registrations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const isRegistered = (eventId: string) => registrations.has(eventId);
  const isPaid = (eventId: string) => registrations.get(eventId)?.isPaid || false;
  const getRegistration = (eventId: string) => registrations.get(eventId);

  return { 
    registrations, 
    loading, 
    isRegistered, 
    isPaid, 
    getRegistration,
    refetch: fetchRegistrations 
  };
};
