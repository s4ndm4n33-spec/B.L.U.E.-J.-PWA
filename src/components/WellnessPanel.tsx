/**
 * NEW: Wellness & Health Panel — self-care gamification.
 *
 * Features:
 * - Coding session timer with break reminders (Pomodoro-style)
 * - Hydration tracker
 * - Stretch / eye-rest prompts
 * - Mood check-ins
 * - Health-related achievements
 * - Screen time stats
 * - Mindful coding streaks
 */
import { useEffect, useState } from 'react';
import { useWellnessStore, MOOD_OPTIONS, type MoodEntry } from '@/lib/wellness-store';
import {
  Heart, Droplets, Eye, Timer, Brain, Smile,
  TrendingUp, Activity, Coffee, Sun, Moon, Dumbbell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function WellnessStatCard({ label, value, icon, color }: {
  label: string; value: string | number; icon: React.ReactNode; color: string;
}) {
  return (
    <div className={`bg-secondary/50 rounded-sm p-2.5 border ${color} text-center`}>
      <div className="flex justify-center mb-1 opacity-70">{icon}</div>
      <div className="text-lg font-bold font-display text-primary">{value}</div>
      <div className="text-[10px] text-primary/40 uppercase font-hud tracking-wider">{label}</div>
    </div>
  );
}

export function WellnessPanel() {
  const {
    todayStats, streak, settings,
    logWater, logStretch, logEyeRest, logMood,
    startCodingSession, pauseCodingSession, resumeCodingSession,
    getTodayMoods,
  } = useWellnessStore();

  const [now, setNow] = useState(Date.now());
  const [showMoodPicker, setShowMoodPicker] = useState(false);

  // Tick every second for timer
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const sessionActive = todayStats.codingSessionActive;
  const sessionStarted = todayStats.sessionStartTime;
  const elapsed = sessionActive && sessionStarted ? Math.floor((now - sessionStarted) / 1000) : 0;
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;

  const breakDue = sessionActive && elapsedMin >= settings.breakIntervalMinutes;
  const todayMoods = getTodayMoods();

  return (
    <div className="h-full flex flex-col hud-panel">
      {/* Header */}
      <div className="px-4 py-2 border-b border-primary/20 bg-secondary/50 flex items-center gap-2 text-primary font-hud uppercase tracking-widest text-sm">
        <Heart className="w-4 h-4" />
        <span>Wellness // Operator Health</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* Coding Session Timer */}
        <div className={`rounded-sm p-3 border ${breakDue ? 'border-red-500/40 bg-red-500/5' : 'border-primary/20 bg-secondary/30'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-hud uppercase tracking-widest text-primary/60">
              <Timer className="w-3.5 h-3.5" />
              <span>Coding Session</span>
            </div>
            {breakDue && (
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-[10px] text-red-400 font-hud uppercase"
              >
                BREAK TIME!
              </motion.span>
            )}
          </div>

          <div className="text-center">
            <div className={`text-3xl font-display font-bold tabular-nums ${breakDue ? 'text-red-400' : 'text-primary'}`}>
              {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}
            </div>
            <p className="text-[10px] text-primary/30 font-mono mt-1">
              {sessionActive ? `Break recommended every ${settings.breakIntervalMinutes}min` : 'Session paused'}
            </p>
          </div>

          <div className="flex gap-2 mt-3">
            {!sessionActive ? (
              <>
                <button
                  onClick={startCodingSession}
                  className="flex-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 rounded-sm text-xs font-hud uppercase tracking-wider"
                >
                  Start Session
                </button>
                {sessionStarted && (
                  <button
                    onClick={resumeCodingSession}
                    className="flex-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary/70 rounded-sm text-xs font-hud uppercase tracking-wider"
                  >
                    Resume
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={pauseCodingSession}
                className="flex-1 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-400 rounded-sm text-xs font-hud uppercase tracking-wider"
              >
                {breakDue ? '🧘 Take Break' : 'Pause'}
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <WellnessStatCard
            label="Water" value={`${todayStats.waterCount}/${settings.waterGoal}`}
            icon={<Droplets className="w-4 h-4 text-blue-400" />} color="border-blue-500/20"
          />
          <WellnessStatCard
            label="Stretches" value={todayStats.stretchCount}
            icon={<Dumbbell className="w-4 h-4 text-green-400" />} color="border-green-500/20"
          />
          <WellnessStatCard
            label="Eye Rests" value={todayStats.eyeRestCount}
            icon={<Eye className="w-4 h-4 text-purple-400" />} color="border-purple-500/20"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={logWater}
            className="flex flex-col items-center gap-1 p-2.5 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 rounded-sm transition-all active:scale-95"
          >
            <Droplets className="w-5 h-5 text-blue-400" />
            <span className="text-[10px] text-blue-400/70 font-hud uppercase">+ Water</span>
          </button>
          <button
            onClick={logStretch}
            className="flex flex-col items-center gap-1 p-2.5 bg-green-500/5 hover:bg-green-500/10 border border-green-500/20 rounded-sm transition-all active:scale-95"
          >
            <Dumbbell className="w-5 h-5 text-green-400" />
            <span className="text-[10px] text-green-400/70 font-hud uppercase">+ Stretch</span>
          </button>
          <button
            onClick={logEyeRest}
            className="flex flex-col items-center gap-1 p-2.5 bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 rounded-sm transition-all active:scale-95"
          >
            <Eye className="w-5 h-5 text-purple-400" />
            <span className="text-[10px] text-purple-400/70 font-hud uppercase">+ Eye Rest</span>
          </button>
        </div>

        {/* Mood Check-In */}
        <div className="bg-secondary/30 rounded-sm p-3 border border-primary/15">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-hud uppercase tracking-widest text-primary/60">
              <Brain className="w-3.5 h-3.5" />
              <span>Mood Check</span>
            </div>
            <button
              onClick={() => setShowMoodPicker(v => !v)}
              className="text-[10px] text-primary/40 hover:text-primary font-mono underline"
            >
              {showMoodPicker ? 'Close' : 'Log Mood'}
            </button>
          </div>

          <AnimatePresence>
            {showMoodPicker && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-5 gap-2 py-2">
                  {MOOD_OPTIONS.map(mood => (
                    <button
                      key={mood.id}
                      onClick={() => { logMood(mood.id); setShowMoodPicker(false); }}
                      className="flex flex-col items-center gap-1 p-2 hover:bg-primary/10 rounded-sm transition-all active:scale-95"
                    >
                      <span className="text-xl">{mood.emoji}</span>
                      <span className="text-[9px] text-primary/40 font-mono">{mood.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Today's moods */}
          {todayMoods.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] text-primary/30 font-mono">Today:</span>
              {todayMoods.map((m, i) => {
                const mood = MOOD_OPTIONS.find(o => o.id === m.mood);
                return <span key={i} className="text-sm" title={new Date(m.timestamp).toLocaleTimeString()}>{mood?.emoji}</span>;
              })}
            </div>
          )}
        </div>

        {/* Wellness Streak */}
        <div className="bg-secondary/30 rounded-sm p-3 border border-primary/15 text-center">
          <div className="flex items-center justify-center gap-2 text-primary/50 text-xs font-hud uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            <span>Wellness Streak: {streak.currentStreak} days</span>
          </div>
          <p className="text-[10px] text-primary/30 font-mono mt-1">
            Log water + stretch + mood daily to maintain streak
          </p>
        </div>

        {/* Tips */}
        <div className="bg-primary/5 rounded-sm p-3 border border-primary/10">
          <div className="flex items-center gap-2 text-xs text-primary/50 mb-1">
            <Sun className="w-3.5 h-3.5" />
            <span className="font-hud uppercase tracking-wider text-[10px]">Wellness Tip</span>
          </div>
          <p className="text-[10px] text-primary/40 font-mono leading-relaxed">
            Follow the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds. Your eyes (and code) will thank you. 👁️
          </p>
        </div>
      </div>
    </div>
  );
}
