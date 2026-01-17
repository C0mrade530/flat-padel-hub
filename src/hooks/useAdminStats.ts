import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface AdminStats {
  playersToday: number;
  revenue: number;
  pendingPayments: number;
  activeEventsCount: number;
  totalParticipants: number;
}

interface PendingPayment {
  id: string;
  amount: number;
  userName: string;
  eventType: string;
  eventDate: string;
}

export type RevenuePeriod = 'today' | 'week' | 'month' | 'all';

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats>({
    playersToday: 0,
    revenue: 0,
    pendingPayments: 0,
    activeEventsCount: 0,
    totalParticipants: 0,
  });
  const [pendingList, setPendingList] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>('month');

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

      // Revenue calculation with period filter
      let revenueQuery = supabase
        .from('payments')
        .select('amount')
        .eq('status', 'paid');

      const now = new Date();
      
      if (revenuePeriod === 'today') {
        revenueQuery = revenueQuery.gte('paid_at', today);
      } else if (revenuePeriod === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        revenueQuery = revenueQuery.gte('paid_at', weekAgo);
      } else if (revenuePeriod === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        revenueQuery = revenueQuery.gte('paid_at', monthAgo);
      }
      // 'all' - no filter

      const { data: paidPayments } = await revenueQuery;
      const revenue = (paidPayments || []).reduce((sum, p: any) => sum + (p.amount || 0), 0);

      // Pending payments count
      const { count: pendingCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Active events count
      const { count: activeEventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .in('status', ['scheduled', 'published'])
        .gte('event_date', today);

      // Total participants (all confirmed)
      const { count: totalParticipants } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed');

      // Pending payments list
      const { data: pending } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          users (display_name),
          events (title, event_date)
        `)
        .eq('status', 'pending')
        .limit(10);

      setStats({
        playersToday: playersToday || 0,
        revenue,
        pendingPayments: pendingCount || 0,
        activeEventsCount: activeEventsCount || 0,
        totalParticipants: totalParticipants || 0,
      });

      setPendingList(
        (pending || []).map((p: any) => ({
          id: p.id,
          amount: p.amount,
          userName: p.users?.display_name || 'Unknown',
          eventType: p.events?.title || 'Событие',
          eventDate: p.events?.event_date || '',
        }))
      );
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError('Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  }, [revenuePeriod]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { 
    stats, 
    pendingList, 
    loading, 
    error, 
    refetch: fetchStats,
    revenuePeriod,
    setRevenuePeriod,
  };
};
