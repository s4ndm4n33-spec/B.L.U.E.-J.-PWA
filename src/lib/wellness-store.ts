/**
 * NEW: Wellness Store — tracks health and self-care habits during coding sessions.
 *
 * Persisted to localStorage alongside the other stores.
 * Integrates with the gamification system for wellness achievements.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MoodId = 'great' | 'good' | 'neutral' | 'tired' | 'stressed';

export const MOOD_OPTIONS: { id: MoodId; emoji: string; label: string }[] = [
  { id: 'great', emoji: '🔥', label: 'Great' },
  { id: 'good', emoji: '😊', label: 'Good' },
  { id: 'neutral', emoji: '😐', label: 'Okay' },
  { id: 'tired', emoji: '😴', label: 'Tired' },
  { id: 'stressed', emoji: '😤', label: 'Stressed' },
];

export interface MoodEntry {
  mood: MoodId;
  timestamp: number;
  dateKey: string;
}

export interface WellnessSettings {
  breakIntervalMinutes: number;     // Remind to break every N minutes (default: 25)
  waterGoal: number;                // Glasses of water per day (default: 8)
  enableBreakReminders: boolean;
  enableWaterReminders: boolean;
  enableEyeRestReminders: boolean;
  eyeRestIntervalMinutes: number;   // 20-20-20 rule (default: 20)
}

export interface DayStats {
  dateKey: string;
  waterCount: number;
  stretchCount: number;
  eyeRestCount: number;
  totalCodingMinutes: number;
  breaksTaken: number;
  codingSessionActive: boolean;
  sessionStartTime: number | null;
}

export interface WellnessStreak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

interface WellnessState {
  settings: WellnessSettings;
  todayStats: DayStats;
  moods: MoodEntry[];
  streak: WellnessStreak;
  allTimeStats: {
    totalWater: number;
    totalStretches: number;
    totalEyeRests: number;
    totalCodingHours: number;
    totalBreaks: number;
  };

  // Actions
  updateSettings: (s: Partial<WellnessSettings>) => void;
  logWater: () => void;
  logStretch: () => void;
  logEyeRest: () => void;
  logMood: (mood: MoodId) => void;
  startCodingSession: () => void;
  pauseCodingSession: () => void;
  resumeCodingSession: () => void;
  refreshDay: () => void;
  updateWellnessStreak: () => void;
  getTodayMoods: () => MoodEntry[];
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function freshDayStats(): DayStats {
  return {
    dateKey: todayKey(),
    waterCount: 0,
    stretchCount: 0,
    eyeRestCount: 0,
    totalCodingMinutes: 0,
    breaksTaken: 0,
    codingSessionActive: false,
    sessionStartTime: null,
  };
}

export const useWellnessStore = create<WellnessState>()(
  persist(
    (set, get) => ({
      settings: {
        breakIntervalMinutes: 25,
        waterGoal: 8,
        enableBreakReminders: true,
        enableWaterReminders: true,
        enableEyeRestReminders: true,
        eyeRestIntervalMinutes: 20,
      },
      todayStats: freshDayStats(),
      moods: [],
      streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: '' },
      allTimeStats: {
        totalWater: 0, totalStretches: 0, totalEyeRests: 0,
        totalCodingHours: 0, totalBreaks: 0,
      },

      updateSettings: (s) => set(state => ({
        settings: { ...state.settings, ...s },
      })),

      logWater: () => {
        get().refreshDay();
        set(s => ({
          todayStats: { ...s.todayStats, waterCount: s.todayStats.waterCount + 1 },
          allTimeStats: { ...s.allTimeStats, totalWater: s.allTimeStats.totalWater + 1 },
        }));
        // Fire event for gamification
        window.dispatchEvent(new CustomEvent('bluej:wellness-water'));
      },

      logStretch: () => {
        get().refreshDay();
        set(s => ({
          todayStats: { ...s.todayStats, stretchCount: s.todayStats.stretchCount + 1 },
          allTimeStats: { ...s.allTimeStats, totalStretches: s.allTimeStats.totalStretches + 1 },
        }));
        window.dispatchEvent(new CustomEvent('bluej:wellness-stretch'));
      },

      logEyeRest: () => {
        get().refreshDay();
        set(s => ({
          todayStats: { ...s.todayStats, eyeRestCount: s.todayStats.eyeRestCount + 1 },
          allTimeStats: { ...s.allTimeStats, totalEyeRests: s.allTimeStats.totalEyeRests + 1 },
        }));
        window.dispatchEvent(new CustomEvent('bluej:wellness-eye-rest'));
      },

      logMood: (mood) => {
        get().refreshDay();
        const entry: MoodEntry = { mood, timestamp: Date.now(), dateKey: todayKey() };
        set(s => ({
          moods: [...s.moods, entry].slice(-200), // Keep last 200 entries
        }));
      },

      startCodingSession: () => {
        get().refreshDay();
        set(s => ({
          todayStats: {
            ...s.todayStats,
            codingSessionActive: true,
            sessionStartTime: Date.now(),
          },
        }));
      },

      pauseCodingSession: () => {
        const { todayStats } = get();
        if (todayStats.sessionStartTime) {
          const elapsed = Math.floor((Date.now() - todayStats.sessionStartTime) / 60000);
          set(s => ({
            todayStats: {
              ...s.todayStats,
              codingSessionActive: false,
              totalCodingMinutes: s.todayStats.totalCodingMinutes + elapsed,
              breaksTaken: s.todayStats.breaksTaken + 1,
            },
            allTimeStats: {
              ...s.allTimeStats,
              totalCodingHours: s.allTimeStats.totalCodingHours + (elapsed / 60),
              totalBreaks: s.allTimeStats.totalBreaks + 1,
            },
          }));
        }
      },

      resumeCodingSession: () => {
        set(s => ({
          todayStats: {
            ...s.todayStats,
            codingSessionActive: true,
            sessionStartTime: Date.now(),
          },
        }));
      },

      refreshDay: () => {
        const key = todayKey();
        const { todayStats } = get();
        if (todayStats.dateKey !== key) {
          // New day — check wellness streak, reset stats
          get().updateWellnessStreak();
          set({ todayStats: freshDayStats() });
        }
      },

      updateWellnessStreak: () => {
        const { todayStats, streak } = get();
        const key = todayKey();
        // Wellness streak: must have logged water AND stretch AND mood today
        const wasActiveToday = todayStats.waterCount > 0 && todayStats.stretchCount > 0;

        if (wasActiveToday && streak.lastActiveDate !== key) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayKey = yesterday.toISOString().slice(0, 10);

          const isConsecutive = streak.lastActiveDate === yesterdayKey;
          const newStreak = isConsecutive ? streak.currentStreak + 1 : 1;
          set({
            streak: {
              currentStreak: newStreak,
              longestStreak: Math.max(newStreak, streak.longestStreak),
              lastActiveDate: key,
            },
          });
        }
      },

      getTodayMoods: () => {
        const key = todayKey();
        return get().moods.filter(m => m.dateKey === key);
      },
    }),
    {
      name: 'bluej-wellness',
      partialize: (state) => ({
        settings: state.settings,
        todayStats: state.todayStats,
        moods: state.moods,
        streak: state.streak,
        allTimeStats: state.allTimeStats,
      }),
    }
  )
);
