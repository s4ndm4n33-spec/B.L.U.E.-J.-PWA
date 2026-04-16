import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";

// ─── Types ───────────────────────────────────────────────────

export type GoalCategory =
  | "chat"
  | "code"
  | "debug"
  | "portfolio"
  | "explore"
  | "streak"
  | "challenge";

export interface DailyGoal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  target: number;
  current: number;
  xpReward: number;
  completed: boolean;
  dateKey: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  type: "xp" | "sessions" | "lines_written" | "questions_asked" | "projects_saved" | "streak_days" | "challenges_completed";
  unlocked: boolean;
  unlockedAt?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  unlockedAt?: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

export interface ProgressStats {
  totalXp: number;
  level: number;
  sessionsCompleted: number;
  totalLinesWritten: number;
  totalQuestionsAsked: number;
  totalProjectsSaved: number;
  challengesCompleted: number;
  languagesUsed: string[];
  modesUsed: string[];
}

// ─── Daily Goal Templates ────────────────────────────────────

const GOAL_TEMPLATES: Omit<DailyGoal, "id" | "current" | "completed" | "dateKey">[] = [
  { title: "Curious Mind",     description: "Ask J 3 questions",               category: "chat",      target: 3,  xpReward: 30 },
  { title: "Deep Dive",        description: "Have a 10-message conversation",   category: "chat",      target: 10, xpReward: 50 },
  { title: "Quick Learner",    description: "Ask J to explain a concept",       category: "chat",      target: 1,  xpReward: 20 },
  { title: "Hello World",      description: "Write and save a program",         category: "code",      target: 1,  xpReward: 25 },
  { title: "Code Warrior",     description: "Write 50 lines of code",           category: "code",      target: 50, xpReward: 60 },
  { title: "Keystroke King",   description: "Write 20 lines of code",           category: "code",      target: 20, xpReward: 35 },
  { title: "Function Builder", description: "Write 3 functions",                category: "code",      target: 3,  xpReward: 45 },
  { title: "Bug Hunter",       description: "Ask J to help debug code",         category: "debug",     target: 1,  xpReward: 30 },
  { title: "Exterminator",     description: "Fix 3 bugs with J's help",         category: "debug",     target: 3,  xpReward: 60 },
  { title: "Collector",        description: "Save a project to your portfolio", category: "portfolio", target: 1,  xpReward: 25 },
  { title: "Archivist",        description: "Save 3 projects today",            category: "portfolio", target: 3,  xpReward: 50 },
  { title: "Polyglot",         description: "Try a different programming language", category: "explore", target: 1, xpReward: 40 },
  { title: "Mode Switcher",    description: "Switch learner modes",             category: "explore",   target: 1,  xpReward: 20 },
  { title: "Explorer",         description: "Try a new hardware profile",       category: "explore",   target: 1,  xpReward: 15 },
  { title: "Challenge Accepted", description: "Complete today's coding challenge", category: "challenge", target: 1, xpReward: 75 },
  { title: "Speed Coder",      description: "Solve a challenge in under 10 min",  category: "challenge", target: 1, xpReward: 100 },
];

// ─── Milestones ──────────────────────────────────────────────

const MILESTONES: Omit<Milestone, "unlocked" | "unlockedAt">[] = [
  { id: "xp_100",     title: "Getting Started",  description: "Earn 100 XP",           icon: "⭐",  requirement: 100,   type: "xp" },
  { id: "xp_500",     title: "Rising Star",      description: "Earn 500 XP",           icon: "🌟",  requirement: 500,   type: "xp" },
  { id: "xp_1000",    title: "Code Cadet",       description: "Earn 1,000 XP",         icon: "🎖️", requirement: 1000,  type: "xp" },
  { id: "xp_5000",    title: "Code Commander",   description: "Earn 5,000 XP",         icon: "🏅",  requirement: 5000,  type: "xp" },
  { id: "xp_10000",   title: "Code Legend",       description: "Earn 10,000 XP",        icon: "👑",  requirement: 10000, type: "xp" },
  { id: "sess_5",     title: "Regular",          description: "Complete 5 sessions",    icon: "📅",  requirement: 5,     type: "sessions" },
  { id: "sess_25",    title: "Dedicated",        description: "Complete 25 sessions",   icon: "📆",  requirement: 25,    type: "sessions" },
  { id: "sess_100",   title: "Committed",        description: "Complete 100 sessions",  icon: "🗓️", requirement: 100,   type: "sessions" },
  { id: "lines_100",  title: "First 100",        description: "Write 100 lines total",  icon: "📝",  requirement: 100,   type: "lines_written" },
  { id: "lines_1000", title: "Thousand Lines",   description: "Write 1,000 lines total",icon: "📜",  requirement: 1000,  type: "lines_written" },
  { id: "lines_10k",  title: "Prolific Coder",   description: "Write 10,000 lines",     icon: "📚",  requirement: 10000, type: "lines_written" },
  { id: "q_10",       title: "Inquisitive",      description: "Ask 10 questions",       icon: "❓",  requirement: 10,    type: "questions_asked" },
  { id: "q_100",      title: "Knowledge Seeker", description: "Ask 100 questions",      icon: "🔍",  requirement: 100,   type: "questions_asked" },
  { id: "streak_3",   title: "On a Roll",        description: "3-day streak",           icon: "🔥",  requirement: 3,     type: "streak_days" },
  { id: "streak_7",   title: "Week Warrior",     description: "7-day streak",           icon: "💪",  requirement: 7,     type: "streak_days" },
  { id: "streak_30",  title: "Monthly Master",   description: "30-day streak",          icon: "🏆",  requirement: 30,    type: "streak_days" },
  { id: "proj_5",     title: "Portfolio Started", description: "Save 5 projects",       icon: "💾",  requirement: 5,     type: "projects_saved" },
  { id: "proj_25",    title: "Portfolio Pro",     description: "Save 25 projects",      icon: "🗂️", requirement: 25,    type: "projects_saved" },
];

// ─── Achievements ────────────────────────────────────────────

const ACHIEVEMENT_DEFS: Omit<Achievement, "unlockedAt">[] = [
  { id: "first_question", title: "First Steps",         description: "Asked your first question",       icon: "🐣", rarity: "common" },
  { id: "first_code",     title: "Hello World",         description: "Wrote your first program",        icon: "👶", rarity: "common" },
  { id: "first_save",     title: "Saver",               description: "Saved your first project",        icon: "💾", rarity: "common" },
  { id: "night_owl",      title: "Night Owl",           description: "Coded after midnight",            icon: "🦉", rarity: "rare" },
  { id: "early_bird",     title: "Early Bird",          description: "Coded before 6 AM",               icon: "🐦", rarity: "rare" },
  { id: "polyglot",       title: "Polyglot",            description: "Used all 3 languages",            icon: "🌐", rarity: "rare" },
  { id: "all_modes",      title: "Shapeshifter",        description: "Tried all learner modes",         icon: "🎭", rarity: "rare" },
  { id: "5_goals_day",    title: "Perfect Day",         description: "Completed all 5 daily goals",     icon: "✨", rarity: "rare" },
  { id: "streak_14",      title: "Two Week Titan",      description: "14-day streak",                   icon: "⚡", rarity: "epic" },
  { id: "level_10",       title: "Double Digits",       description: "Reached level 10",                icon: "🔟", rarity: "epic" },
  { id: "1000_lines",     title: "Thousand Lines Club", description: "Wrote 1,000 lines of code",       icon: "🏛️", rarity: "epic" },
  { id: "streak_30",      title: "Unstoppable",         description: "30-day streak — you're a machine",icon: "🔱", rarity: "legendary" },
  { id: "level_25",       title: "Grandmaster",         description: "Reached level 25",                icon: "👑", rarity: "legendary" },
  { id: "10k_xp",         title: "10K Club",            description: "Earned 10,000 XP total",          icon: "💎", rarity: "legendary" },
];

// ─── Helpers ─────────────────────────────────────────────────

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function calculateLevel(xp: number): number {
  let level = 1;
  let needed = 0;
  while (needed + level * 100 <= xp) {
    needed += level * 100;
    level++;
  }
  return level;
}

export function xpForNextLevel(level: number): number {
  return level * 100;
}

export function xpProgressInLevel(xp: number, level: number): number {
  let needed = 0;
  for (let l = 1; l < level; l++) needed += l * 100;
  return xp - needed;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateDailyGoals(dateKey: string): DailyGoal[] {
  // Use date as seed so goals are stable within a day
  const seed = dateKey.split("-").reduce((a, b) => a + parseInt(b), 0);
  const shuffled = [...GOAL_TEMPLATES].sort((a, b) => {
    const ha = (seed * 31 + a.title.charCodeAt(0)) % 1000;
    const hb = (seed * 31 + b.title.charCodeAt(0)) % 1000;
    return ha - hb;
  });
  return shuffled.slice(0, 5).map((t) => ({
    ...t,
    id: uuidv4(),
    current: 0,
    completed: false,
    dateKey,
  }));
}

// ─── Store ───────────────────────────────────────────────────

interface ProgressState {
  stats: ProgressStats;
  streak: StreakInfo;
  dailyGoals: DailyGoal[];
  dailyGoalsDate: string;
  milestones: Milestone[];
  achievements: Achievement[];
  newUnlocks: string[];

  refreshDailyGoals: () => void;
  trackEvent: (category: GoalCategory, amount?: number) => void;
  addXp: (amount: number) => void;
  updateStreak: () => void;
  trackLanguageUsed: (lang: string) => void;
  trackModeUsed: (mode: string) => void;
  trackLinesWritten: (count: number) => void;
  clearNewUnlocks: () => void;
  checkAchievements: () => void;
  checkMilestones: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      stats: {
        totalXp: 0,
        level: 1,
        sessionsCompleted: 0,
        totalLinesWritten: 0,
        totalQuestionsAsked: 0,
        totalProjectsSaved: 0,
        challengesCompleted: 0,
        languagesUsed: [],
        modesUsed: [],
      },
      streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: "" },
      dailyGoals: [],
      dailyGoalsDate: "",
      milestones: MILESTONES.map((m) => ({ ...m, unlocked: false })),
      achievements: ACHIEVEMENT_DEFS.map((a) => ({ ...a })),
      newUnlocks: [],

      refreshDailyGoals: () => {
        const today = getTodayKey();
        if (get().dailyGoalsDate !== today) {
          set({ dailyGoals: generateDailyGoals(today), dailyGoalsDate: today });
        }
      },

      trackEvent: (category, amount = 1) => {
        const { dailyGoals, stats } = get();
        const updated = dailyGoals.map((g) => {
          if (g.category === category && !g.completed) {
            const newCurrent = Math.min(g.current + amount, g.target);
            const justCompleted = newCurrent >= g.target;
            if (justCompleted) setTimeout(() => get().addXp(g.xpReward), 0);
            return { ...g, current: newCurrent, completed: justCompleted };
          }
          return g;
        });
        const newStats = { ...stats };
        if (category === "chat") newStats.totalQuestionsAsked += amount;
        if (category === "portfolio") newStats.totalProjectsSaved += amount;
        if (category === "challenge") newStats.challengesCompleted += amount;
        set({ dailyGoals: updated, stats: newStats });
        setTimeout(() => { get().checkAchievements(); get().checkMilestones(); }, 100);
      },

      addXp: (amount) => {
        const { stats } = get();
        const newXp = stats.totalXp + amount;
        set({ stats: { ...stats, totalXp: newXp, level: calculateLevel(newXp) } });
      },

      updateStreak: () => {
        const { streak, stats } = get();
        const today = getTodayKey();
        if (streak.lastActiveDate === today) return;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().split("T")[0];
        const newStreak = streak.lastActiveDate === yesterdayKey ? streak.currentStreak + 1 : 1;
        set({
          streak: { currentStreak: newStreak, longestStreak: Math.max(newStreak, streak.longestStreak), lastActiveDate: today },
          stats: { ...stats, sessionsCompleted: stats.sessionsCompleted + 1 },
        });
      },

      trackLanguageUsed: (lang) => {
        const { stats } = get();
        if (!stats.languagesUsed.includes(lang)) {
          set({ stats: { ...stats, languagesUsed: [...stats.languagesUsed, lang] } });
          setTimeout(() => get().checkAchievements(), 100);
        }
      },

      trackModeUsed: (mode) => {
        const { stats } = get();
        if (!stats.modesUsed.includes(mode)) {
          set({ stats: { ...stats, modesUsed: [...stats.modesUsed, mode] } });
          setTimeout(() => get().checkAchievements(), 100);
        }
      },

      trackLinesWritten: (count) => {
        const { stats } = get();
        set({ stats: { ...stats, totalLinesWritten: stats.totalLinesWritten + count } });
        get().trackEvent("code", count);
      },

      clearNewUnlocks: () => set({ newUnlocks: [] }),

      checkMilestones: () => {
        const { milestones, stats, streak } = get();
        const unlocks: string[] = [];
        const updated = milestones.map((m) => {
          if (m.unlocked) return m;
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
          if (val >= m.requirement) {
            unlocks.push(m.id);
            return { ...m, unlocked: true, unlockedAt: Date.now() };
          }
          return m;
        });
        if (unlocks.length > 0) set({ milestones: updated, newUnlocks: [...get().newUnlocks, ...unlocks] });
      },

      checkAchievements: () => {
        const { achievements, stats, streak } = get();
        const hour = new Date().getHours();
        const unlocks: string[] = [];
        const updated = achievements.map((a) => {
          if (a.unlockedAt) return a;
          let earned = false;
          switch (a.id) {
            case "first_question": earned = stats.totalQuestionsAsked >= 1; break;
            case "first_code": earned = stats.totalLinesWritten >= 1; break;
            case "first_save": earned = stats.totalProjectsSaved >= 1; break;
            case "night_owl": earned = hour >= 0 && hour < 5 && stats.totalLinesWritten > 0; break;
            case "early_bird": earned = hour >= 4 && hour < 6 && stats.totalLinesWritten > 0; break;
            case "polyglot": earned = stats.languagesUsed.length >= 3; break;
            case "all_modes": earned = stats.modesUsed.length >= 4; break;
            case "5_goals_day": earned = get().dailyGoals.length === 5 && get().dailyGoals.every((g) => g.completed); break;
            case "streak_14": earned = streak.currentStreak >= 14; break;
            case "streak_30": earned = streak.currentStreak >= 30; break;
            case "level_10": earned = stats.level >= 10; break;
            case "level_25": earned = stats.level >= 25; break;
            case "1000_lines": earned = stats.totalLinesWritten >= 1000; break;
            case "10k_xp": earned = stats.totalXp >= 10000; break;
          }
          if (earned) {
            unlocks.push(a.id);
            return { ...a, unlockedAt: Date.now() };
          }
          return a;
        });
        if (unlocks.length > 0) set({ achievements: updated, newUnlocks: [...get().newUnlocks, ...unlocks] });
      },
    }),
    { name: "bluej-progress" }
  )
);
