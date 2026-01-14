// Telegram WebApp Integration
// @ts-ignore - Telegram types not available
export const tg = (window as any).Telegram?.WebApp;

export const initTelegram = () => {
  if (tg) {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
    
    // Set theme colors
    tg.setHeaderColor('#030712');
    tg.setBackgroundColor('#030712');
  }
};

export const haptic = {
  impact: (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    tg?.HapticFeedback?.impactOccurred(style);
  },
  notification: (type: 'success' | 'warning' | 'error') => {
    tg?.HapticFeedback?.notificationOccurred(type);
  },
  selection: () => {
    tg?.HapticFeedback?.selectionChanged();
  },
};

export const openLink = (url: string) => {
  if (tg) {
    tg.openLink(url);
  } else {
    window.open(url, '_blank');
  }
};

export const showMainButton = (text: string, onClick: () => void) => {
  if (tg) {
    tg.MainButton.setText(text);
    tg.MainButton.show();
    tg.MainButton.onClick(onClick);
  }
};

export const hideMainButton = () => {
  if (tg) {
    tg.MainButton.hide();
  }
};

export const getTelegramUser = () => {
  if (tg?.initDataUnsafe?.user) {
    return {
      id: tg.initDataUnsafe.user.id,
      first_name: tg.initDataUnsafe.user.first_name,
      last_name: tg.initDataUnsafe.user.last_name,
      username: tg.initDataUnsafe.user.username,
      photo_url: tg.initDataUnsafe.user.photo_url,
    };
  }
  return null;
};

export const isTelegramWebApp = () => {
  return !!tg;
};
