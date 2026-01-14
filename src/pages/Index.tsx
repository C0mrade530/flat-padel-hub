import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/screens/SplashScreen";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { BookingsScreen } from "@/components/screens/BookingsScreen";
import { ProfileScreen } from "@/components/screens/ProfileScreen";
import { AdminScreen } from "@/components/screens/AdminScreen";
import { BottomNav } from "@/components/layout/BottomNav";
import { UserProvider, useUser } from "@/contexts/UserContext";

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const { isAdmin } = useUser();

  const renderScreen = () => {
    switch (activeTab) {
      case "home":
        return <HomeScreen />;
      case "bookings":
        return <BookingsScreen />;
      case "profile":
        return <ProfileScreen />;
      case "admin":
        return <AdminScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>
        {showSplash && (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      {!showSplash && (
        <>
          <AnimatePresence mode="wait">
            <div key={activeTab}>
              {renderScreen()}
            </div>
          </AnimatePresence>
          
          <BottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isAdmin={isAdmin}
          />
        </>
      )}
    </div>
  );
};

const Index = () => {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};

export default Index;
