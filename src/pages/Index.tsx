import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/screens/SplashScreen";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { BookingsScreen } from "@/components/screens/BookingsScreen";
import { ProfileScreen } from "@/components/screens/ProfileScreen";
import { AdminScreen } from "@/components/screens/AdminScreen";
import { BottomNav } from "@/components/layout/BottomNav";

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState("home");

  const renderScreen = () => {
    switch (activeTab) {
      case "home":
        return <HomeScreen userName="Леонид" />;
      case "bookings":
        return <BookingsScreen />;
      case "profile":
        return <ProfileScreen />;
      case "admin":
        return <AdminScreen />;
      default:
        return <HomeScreen userName="Леонид" />;
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
            isAdmin={true}
          />
        </>
      )}
    </div>
  );
};

export default Index;
