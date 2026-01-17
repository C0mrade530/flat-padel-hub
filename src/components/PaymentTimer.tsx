import { useState, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';

interface PaymentTimerProps {
  deadline: string;
  onExpired: () => void;
}

export const PaymentTimer = ({ deadline, onExpired }: PaymentTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  const calculateTimeLeft = useCallback(() => {
    const deadlineTime = new Date(deadline).getTime();
    const now = Date.now();
    const diff = Math.max(0, deadlineTime - now);
    return Math.floor(diff / 1000);
  }, [deadline]);

  useEffect(() => {
    const initial = calculateTimeLeft();
    setTimeLeft(initial);
    
    if (initial <= 0) {
      setIsExpired(true);
      onExpired();
      return;
    }

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setIsExpired(true);
        clearInterval(timer);
        onExpired();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline, onExpired, calculateTimeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const getColorClass = () => {
    if (timeLeft <= 60) return 'text-red-500 bg-red-500/20 border-red-500/30';
    if (timeLeft <= 300) return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/30';
    return 'text-primary bg-primary/20 border-primary/30';
  };

  if (isExpired) {
    return (
      <div className="rounded-xl p-4 text-center bg-red-500/10 border border-red-500/30">
        <p className="text-red-400 font-semibold">⏰ Время на оплату истекло</p>
        <p className="text-red-400/70 text-sm mt-1">Ваша бронь была отменена</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 border ${getColorClass()}`}>
      <div className="flex items-center justify-center gap-2 mb-2">
        <Clock className="w-5 h-5" />
        <span className="text-2xl font-bold font-mono">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
      <p className="text-center text-sm opacity-80">
        Оплатите в течение {minutes > 0 ? `${minutes} мин` : `${seconds} сек`}, иначе бронь будет отменена
      </p>
    </div>
  );
};
