import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import EventPage from "./pages/EventPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to handle Telegram deep links
const TelegramDeepLinkHandler = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;

    if (tg?.initDataUnsafe?.start_param) {
      const param = tg.initDataUnsafe.start_param;
      console.log('Telegram start_param:', param);

      if (param.startsWith('event_')) {
        const eventId = param.replace('event_', '');
        navigate(`/event/${eventId}`);
      }
    }
  }, [navigate]);

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TelegramDeepLinkHandler>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/event/:eventId" element={<EventPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TelegramDeepLinkHandler>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
