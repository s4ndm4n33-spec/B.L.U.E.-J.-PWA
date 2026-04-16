import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const onOnline = () => { setIsOnline(true); setShowBanner(true); setTimeout(() => setShowBanner(false), 3000); };
    const onOffline = () => { setIsOnline(false); setShowBanner(true); };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className={`fixed top-0 left-0 right-0 z-[90] flex items-center justify-center gap-2 py-1.5 text-xs font-hud uppercase tracking-wider ${
            isOnline
              ? "bg-green-500/20 text-green-400 border-b border-green-500/30"
              : "bg-yellow-500/20 text-yellow-400 border-b border-yellow-500/30"
          }`}
        >
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {isOnline ? "Connection Restored" : "Offline Mode — Local AI Active"}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
