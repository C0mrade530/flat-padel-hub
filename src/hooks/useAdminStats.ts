import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface AdminStats {
  playersToday: number;
  revenue: number;
  pendingPayments: number;
}

interface PendingPayment {
  id: string;
  amount: number;
  userName: string;
  eventType: string;
  eventDate: string;
}

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats>({
    playersToday: 0,
    revenue: 0,
    pendingPayments: 0,
  });
  const [pendingList, setPendingList] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];

      // Players today (confirmed participants for today's events)
      const { count: playersToday } = await supabase
        .from('event_participants')
        .select('*, events!inner(*)', { count: 'exact', head: true })
        .eq('events.event_date', today)
        .eq('status', 'confirmed');

      // Revenue from paid payments
      const { data: paidPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'paid');

      const revenue = (paidPayments || []).reduce((sum, p: any) => sum + (p.amount || 0), 0);

      // Pending payments count
      const { count: pendingCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Pending payments list
      const { data: pending } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          users (display_name),
          events (event_type, event_date)
        `)
        .eq('status', 'pending')
        .limit(10);

      setStats({
        playersToday: playersToday || 0,
        revenue,
        pendingPayments: pendingCount || 0,
      });

      setPendingList(
        (pending || []).map((p: any) => ({
          id: p.id,
          amount: p.amount,
          userName: p.users?.display_name || 'Unknown',
          eventType: p.events?.event_type || 'other',
          eventDate: p.events?.event_date || '',
        }))
      );
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError('Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, pendingList, loading, error, refetch: fetchStats };
};
