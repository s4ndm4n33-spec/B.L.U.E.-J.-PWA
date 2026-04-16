import { motion } from "framer-motion";
import { useProgressStore } from "@/lib/progress-store";
import { Award, Lock } from "lucide-react";

const RARITY_STYLES = {
  common:    { border: "border-gray-500/30",   bg: "bg-gray-500/5",   text: "text-gray-400" },
  rare:      { border: "border-blue-500/30",   bg: "bg-blue-500/5",   text: "text-blue-400" },
  epic:      { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-400" },
  legendary: { border: "border-yellow-500/30", bg: "bg-yellow-500/5", text: "text-yellow-400" },
};

export function AchievementsPanel() {
  const { milestones, achievements, stats, streak } = useProgressStore();

  const unlockedMilestones = milestones.filter((m) => m.unlocked);
  const nextMilestones = milestones.filter((m) => !m.unlocked).slice(0, 4);
  const unlockedAchievements = achievements.filter((a) => a.unlockedAt);

  function getMilestoneProgress(m: typeof milestones[0]): number {
    let val = 0;
    switch (m.type) {
      case "xp": val = stats.totalXp; break;
      case "sessions": val = stats.sessionsCompleted; break;
      case "lines_written": val = stats.totalLinesWritten; break;
      case "questions_asked": val = stats.totalQuestionsAsked; break;
      case "projects_saved": val = stats.totalProjectsSaved; break;
      case "streak_days": val = streak.currentStreak; break;
      case "challenges_completed": val = stats.challengesCompleted; break;
    }
    return Math.min((val / m.requirement) * 100, 100);
  }

  return (
    <div className="h-full flex flex-col hud-panel">
      {/* Header */}
      <div className="px-4 py-2 border-b border-primary/20 bg-secondary/50 flex items-center gap-2 text-primary font-hud uppercase tracking-widest text-sm">
        <Award className="w-4 h-4" />
        <span>Commendations // Archive</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-secondary/50 rounded-sm p-3 border border-primary/20 text-center">
            <div className="text-2xl font-bold text-primary font-display">
              {unlockedMilestones.length}/{milestones.length}
            </div>
            <div className="text-[10px] text-primary/40 uppercase font-hud tracking-wider">Milestones</div>
          </div>
          <div className="bg-secondary/50 rounded-sm p-3 border border-primary/20 text-center">
            <div className="text-2xl font-bold text-primary font-display">
              {unlockedAchievements.length}/{achievements.length}
            </div>
            <div className="text-[10px] text-primary/40 uppercase font-hud tracking-wider">Achievements</div>
          </div>
        </div>

        {/* Next Milestones */}
        {nextMilestones.length > 0 && (
          <>
            <h3 className="text-xs font-bold text-primary/70 uppercase tracking-widest font-hud">
              Next Milestones
            </h3>
            <div className="flex flex-col gap-2">
              {nextMilestones.map((m) => {
                const pct = getMilestoneProgress(m);
                return (
                  <div key={m.id} className="p-3 rounded-sm border border-primary/15 bg-secondary/30">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{m.icon}</span>
                      <span className="text-sm font-hud font-medium text-primary/90">{m.title}</span>
                    </div>
                    <p className="text-xs text-primary/40 mb-2 font-mono">{m.description}</p>
                    <div className="w-full h-1.5 bg-background/80 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary/80 to-accent/80 rounded-full"
                        animate={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Completed Milestones */}
        {unlockedMilestones.length > 0 && (
          <>
            <h3 className="text-xs font-bold text-green-400/70 uppercase tracking-widest font-hud">
              Completed Milestones
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {unlockedMilestones.map((m) => (
                <div key={m.id} className="bg-green-500/10 border border-green-500/20 rounded-sm p-2 text-center">
                  <div className="text-xl mb-0.5">{m.icon}</div>
                  <div className="text-[9px] text-green-400/80 font-hud">{m.title}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Achievements */}
        <h3 className="text-xs font-bold text-primary/70 uppercase tracking-widest font-hud pt-1">
          Achievements
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {achievements.map((a) => {
            const style = RARITY_STYLES[a.rarity];
            const unlocked = !!a.unlockedAt;
            return (
              <motion.div
                key={a.id}
                whileTap={{ scale: 0.95 }}
                className={`p-2 rounded-sm border text-center ${
                  unlocked
                    ? `${style.border} ${style.bg}`
                    : "border-gray-700/20 bg-gray-800/10 opacity-40"
                }`}
              >
                <div className="text-2xl mb-1">{unlocked ? a.icon : "🔒"}</div>
                <div className={`text-[10px] font-hud font-medium leading-tight ${unlocked ? style.text : "text-gray-500"}`}>
                  {a.title}
                </div>
                {unlocked && (
                  <div className={`text-[8px] mt-0.5 uppercase ${style.text} opacity-60`}>{a.rarity}</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
