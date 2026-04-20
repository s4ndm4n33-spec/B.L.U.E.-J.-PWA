/**
 * NEW: Break Reminder overlay — shows a gentle prompt when the user
 * has been coding for too long without a break.
 *
 * - Pomodoro-style interval (default 25 min)
 * - Suggests stretching, hydration, eye rest
 * - Can be snoozed or dismissed
 * - Counts toward wellness goals automatically
 */
import { useState, useEffect } from 'react';
import { useWellnessStore } from '@/lib/wellness-store';
import { Timer, Droplets, Eye, Dumbbell, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TIPS = [
  { icon: Dumbbell, text: 'Stand up and stretch for 30 seconds', action: 'stretch' as const },
  { icon: Droplets, text: 'Drink a glass of water', action: 'water' as const },
  { icon: Eye, text: 'Look at something 20ft away for 20 seconds', action: 'eye' as const },
];

export function BreakReminder() {
  const { todayStats, settings, logWater, logStretch, logEyeRest, pauseCodingSession } = useWellnessStore();
  const [show, setShow] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!settings.enableBreakReminders || !todayStats.codingSessionActive || !todayStats.sessionStartTime) {
      return;
    }

    const check = setInterval(() => {
      if (snoozed) return;
      const elapsed = Math.floor((Date.now() - todayStats.sessionStartTime!) / 60000);
      if (elapsed >= settings.breakIntervalMinutes) {
        setShow(true);
        setTipIndex(Math.floor(Math.random() * TIPS.length));
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(check);
  }, [todayStats.codingSessionActive, todayStats.sessionStartTime, settings, snoozed]);

  const handleAction = (action: 'stretch' | 'water' | 'eye') => {
    if (action === 'stretch') logStretch();
    if (action === 'water') logWater();
    if (action === 'eye') logEyeRest();
    pauseCodingSession();
    setShow(false);
    setSnoozed(false);
  };

  const handleSnooze = () => {
    setShow(false);
    setSnoozed(true);
    // Un-snooze after 5 minutes
    setTimeout(() => setSnoozed(false), 5 * 60 * 1000);
  };

  const tip = TIPS[tipIndex];
  const TipIcon = tip.icon;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] w-[90vw] max-w-sm"
        >
          <div className="bg-background/95 backdrop-blur-xl border border-primary/30 rounded-sm shadow-xl shadow-black/50 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 text-primary font-hud uppercase tracking-widest text-xs">
                <Timer className="w-4 h-4 text-yellow-400" />
                <span>Break Recommended</span>
              </div>
              <button onClick={() => setShow(false)} className="text-primary/30 hover:text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-3 p-2 bg-primary/5 rounded-sm border border-primary/10">
              <TipIcon className="w-5 h-5 text-primary/60 flex-shrink-0" />
              <p className="text-xs text-primary/70 font-mono">{tip.text}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleAction(tip.action)}
                className="flex-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 rounded-sm text-xs font-hud uppercase tracking-wider"
              >
                ✓ Done — Take Break
              </button>
              <button
                onClick={handleSnooze}
                className="px-3 py-2 bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary/50 rounded-sm text-xs font-hud uppercase tracking-wider flex items-center gap-1"
              >
                <Clock className="w-3 h-3" /> 5min
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
