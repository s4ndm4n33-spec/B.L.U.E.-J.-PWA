import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProgressStore } from "@/lib/progress-store";

export function UnlockToast() {
  const { newUnlocks, milestones, achievements, clearNewUnlocks } = useProgressStore();

  useEffect(() => {
    if (newUnlocks.length > 0) {
      const timer = setTimeout(clearNewUnlocks, 4000);
      return () => clearTimeout(timer);
    }
  }, [newUnlocks, clearNewUnlocks]);

  const unlockId = newUnlocks[0];
  const milestone = milestones.find((m) => m.id === unlockId);
  const achievement = achievements.find((a) => a.id === unlockId);
  const item = milestone || achievement;

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0, y: -60, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.9 }}
          transition={{ type: "spring", damping: 15 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]"
        >
          <div className="bg-card/95 backdrop-blur-xl border border-yellow-500/50 rounded-sm px-5 py-3 shadow-[0_0_30px_rgba(255,200,0,0.2)] flex items-center gap-3">
            <motion.span
              className="text-3xl"
              animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6 }}
            >
              {"icon" in item ? item.icon : "🏆"}
            </motion.span>
            <div>
              <div className="text-yellow-400 text-[10px] font-bold uppercase tracking-widest font-hud">
                {milestone ? "Milestone Unlocked!" : "Achievement Earned!"}
              </div>
              <div className="text-primary font-semibold text-sm font-hud">
                {"title" in item ? item.title : ""}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
