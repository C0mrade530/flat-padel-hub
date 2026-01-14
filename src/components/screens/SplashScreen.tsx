import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 200);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[100]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Radial gradient background */}
      <div 
        className="absolute inset-0 opacity-50"
        style={{
          background: "radial-gradient(ellipse at center, hsl(160 84% 39% / 0.15) 0%, transparent 60%)"
        }}
      />

      {/* Logo with glow */}
      <motion.div
        className="relative mb-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.2 }}
      >
        <motion.div
          className="text-6xl"
          animate={{ 
            filter: [
              "drop-shadow(0 0 20px hsl(160 84% 39% / 0.4))",
              "drop-shadow(0 0 40px hsl(160 84% 39% / 0.6))",
              "drop-shadow(0 0 20px hsl(160 84% 39% / 0.4))"
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          🎾
        </motion.div>
      </motion.div>

      {/* Brand name */}
      <motion.h1
        className="text-3xl font-bold text-foreground tracking-[0.5em] mb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        FLAT
      </motion.h1>

      <motion.p
        className="text-sm text-foreground-tertiary tracking-widest mb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 0.6 }}
      >
        PADEL CLUB
      </motion.p>

      {/* Progress bar */}
      <motion.div
        className="w-48 h-1 bg-muted rounded-full overflow-hidden"
        initial={{ opacity: 0, scaleX: 0.5 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.8 }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, hsl(160 84% 39%) 0%, hsl(187 96% 42%) 100%)",
            width: `${progress}%`,
          }}
          transition={{ duration: 0.1 }}
        />
      </motion.div>
    </motion.div>
  );
};

export { SplashScreen };
