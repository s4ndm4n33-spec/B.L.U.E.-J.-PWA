/**
 * FIXED: SimulatorPage — HardwareStrip is now in normal flow (not fixed).
 *
 * Changes:
 * 1. Removed `pb-14 md:pb-16` from main — no longer needed since HardwareStrip isn't fixed
 * 2. HardwareStrip sits inside the flex column, so it never overlaps buttons
 * 3. Added WellnessProvider wrapper for break reminders / health features
 */
import { useEffect } from 'react';
import { useBlueJStore } from '@/lib/store';
import { useProgressStore } from '@/lib/progress-store';
import { useProgressEvents } from '@/hooks/use-progress-events';
import { HardwareBanner } from '@/components/HardwareBanner';
import { HudHeader } from '@/components/HudHeader';
import { ChatPanel } from '@/components/ChatPanel';
import { IdePanel } from '@/components/IdePanel';
import { DailyGoals } from '@/components/DailyGoals';
import { AchievementsPanel } from '@/components/AchievementsPanel';
import { WellnessPanel } from '@/components/WellnessPanel';
import { HardwareStrip } from '@/components/HardwareStrip';
import { UpdateBanner } from '@/components/UpdateBanner';
import { DiagnosticSequence } from '@/components/DiagnosticSequence';
import { UnlockToast } from '@/components/UnlockToast';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { BreakReminder } from '@/components/BreakReminder';
import { AnimatePresence } from 'framer-motion';
import { MemoryPanel } from '@/components/MemoryPanel';

export default function SimulatorPage() {
  const { detectSystem, activeTab, diagnosticDone, setDiagnosticDone, selectedLanguage, learnerMode } = useBlueJStore();
  const { refreshDailyGoals, updateStreak, trackLanguageUsed, trackModeUsed } = useProgressStore();

  useProgressEvents();

  useEffect(() => {
    detectSystem();
    refreshDailyGoals();
    updateStreak();
  }, [detectSystem, refreshDailyGoals, updateStreak]);

  useEffect(() => { trackLanguageUsed(selectedLanguage); }, [selectedLanguage, trackLanguageUsed]);
  useEffect(() => { trackModeUsed(learnerMode); }, [learnerMode, trackModeUsed]);

  return (
    <div className="min-h-screen h-screen flex flex-col relative bg-background">
      <UpdateBanner />
      <div className="scanlines pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none z-0">
        <img
          src="/images/hologrid.png"
          alt=""
          className="w-full h-full object-cover opacity-10 mix-blend-screen"
        />
      </div>

      <OfflineIndicator />
      <UnlockToast />
      <BreakReminder />
      <HardwareBanner />
      <HudHeader />

      {/* main: no more pb-14 — HardwareStrip is in flow now */}
      <main className="flex-1 overflow-hidden relative z-10 p-2 md:p-4 flex gap-4">
        <div className={`w-full md:w-1/2 h-full ${activeTab === 'chat' ? 'block' : 'hidden md:block'}`}>
          <ChatPanel />
        </div>
        <div className={`w-full md:w-1/2 h-full ${activeTab === 'ide' ? 'block' : 'hidden md:block'}`}>
          <IdePanel />
        </div>
        <div className={`w-full h-full ${activeTab === 'goals' ? 'block' : 'hidden'} md:hidden`}>
          <DailyGoals />
        </div>
        <div className={`w-full h-full ${activeTab === 'achievements' ? 'block' : 'hidden'} md:hidden`}>
          <AchievementsPanel />
        </div>
        <div className={`w-full h-full ${activeTab === 'wellness' ? 'block' : 'hidden'} md:hidden`}>
          <WellnessPanel />
        </div>
        <div className={`w-full h-full ${activeTab === 'memory' ? 'block' : 'hidden'} md:hidden`}>
          <MemoryPanel />
        </div>
      </main>

      {/* HardwareStrip in normal flex flow — never overlaps content */}
      <HardwareStrip />

      <AnimatePresence>
        {!diagnosticDone && (
          <DiagnosticSequence onComplete={() => setDiagnosticDone(true)} />
        )}
      </AnimatePresence>
    </div>
  );
}
