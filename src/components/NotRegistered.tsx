import { GlassCard } from './ui/GlassCard';
import { GlassButton } from './ui/GlassButton';

export const NotRegistered = () => {
  const handleClose = () => {
    (window as any).Telegram?.WebApp?.close();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <GlassCard className="max-w-sm text-center p-8">
        <div className="text-6xl mb-4">🎾</div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Регистрация не завершена
        </h2>
        <p className="text-muted-foreground mb-6">
          Пройди регистрацию в боте, чтобы продолжить
        </p>
        <GlassButton onClick={handleClose} className="w-full">
          Вернуться в бот
        </GlassButton>
      </GlassCard>
    </div>
  );
};
