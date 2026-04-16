import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProgressStore, xpForNextLevel, xpProgressInLevel } from "@/lib/progress-store";
import { Target, Flame, Zap, Trophy, Star } from "lucide-react";

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-secondary/50 rounded-sm p-2.5 border border-primary/20 text-center">
      <div className="text-primary/60 flex justify-center mb-1">{icon}</div>
      <div className="text-lg font-bold text-primary font-display">{value}</div>
      <div className="text-[10px] text-primary/40 uppercase font-hud tracking-wider">{label}</div>
    </div>
  );
}

export function DailyGoals() {
  const { stats, streak, dailyGoals, refreshDailyGoals, updateStreak } = useProgressStore();

  useEffect(() => {
    refreshDailyGoals();
    updateStreak();
  }, []);

  const completedCount = dailyGoals.filter((g) => g.completed).length;
  const levelProgress = xpProgressInLevel(stats.totalXp, stats.level);
  const levelTarget = xpForNextLevel(stats.level);

  return (
    <div className="h-full flex flex-col hud-panel">
      {/* Header */}
      <div className="px-4 py-2 border-b border-primary/20 bg-secondary/50 flex items-center gap-2 text-primary font-hud uppercase tracking-widest text-sm">
        <Target className="w-4 h-4" />
        <span>Daily Ops // Mission Board</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Level" value={stats.level} icon={<Zap className="w-4 h-4" />} />
          <StatCard label="Total XP" value={stats.totalXp.toLocaleString()} icon={<Star className="w-4 h-4" />} />
          <StatCard label="Streak" value={`${streak.currentStreak}d`} icon={<Flame className="w-4 h-4" />} />
        </div>

        {/* Level Progress */}
        <div className="bg-secondary/30 rounded-sm p-3 border border-primary/15">
          <div className="flex justify-between text-xs text-primary/50 font-mono mb-1.5">
            <span>LVL.{stats.level}</span>
            <span>{levelProgress}/{levelTarget} XP</span>
          </div>
          <div className="w-full h-2 bg-background rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((levelProgress / levelTarget) * 100, 100)}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between pt-1">
          <h3 className="text-xs font-bold text-primary/70 uppercase tracking-widest font-hud">
            Today's Missions
          </h3>
          <span className="text-xs text-primary/40 font-mono">
            {completedCount}/{dailyGoals.length}
          </span>
        </div>

        {/* Goal Cards */}
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {dailyGoals.map((goal, i) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`p-3 rounded-sm border transition-all duration-300 ${
                  goal.completed
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-secondary/30 border-primary/15 hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-hud font-semibold ${goal.completed ? "text-green-400" : "text-primary/90"}`}>
                    {goal.completed && "✅ "}{goal.title}
                  </span>
                  <span className="text-xs text-yellow-400/80 font-mono">+{goal.xpReward} XP</span>
                </div>
                <p className="text-xs text-primary/40 mb-2 font-mono">{goal.description}</p>
                <div className="w-full h-1.5 bg-background/80 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${goal.completed ? "bg-green-500" : "bg-gradient-to-r from-primary/80 to-accent/80"}`}
                    animate={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="text-right text-[10px] text-primary/30 mt-1 font-mono">
                  {goal.current}/{goal.target}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Streak Info */}
        {streak.longestStreak > 0 && (
          <div className="bg-secondary/30 rounded-sm p-3 border border-primary/15 text-center">
            <div className="flex items-center justify-center gap-2 text-primary/50 text-xs font-hud uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5" />
              <span>Best Streak: {streak.longestStreak} days</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
