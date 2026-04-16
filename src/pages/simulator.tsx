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
import { HardwareStrip } from '@/components/HardwareStrip';
import { DiagnosticSequence } from '@/components/DiagnosticSequence';
import { UnlockToast } from '@/components/UnlockToast';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { AnimatePresence } from 'framer-motion';

export default function SimulatorPage() {
  const { detectSystem, activeTab, diagnosticDone, setDiagnosticDone, selectedLanguage, learnerMode } = useBlueJStore();
  const { refreshDailyGoals, updateStreak, trackLanguageUsed, trackModeUsed } = useProgressStore();

  useProgressEvents(); // Wire custom events to progress store

  useEffect(() => {
    detectSystem();
    refreshDailyGoals();
    updateStreak();
  }, [detectSystem, refreshDailyGoals, updateStreak]);

  // Track language/mode changes for achievements
  useEffect(() => { trackLanguageUsed(selectedLanguage); }, [selectedLanguage, trackLanguageUsed]);
  useEffect(() => { trackModeUsed(learnerMode); }, [learnerMode, trackModeUsed]);

  return (
    <div className="min-h-screen h-screen flex flex-col relative bg-background">
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
      <HardwareBanner />
      <HudHeader />

      <main className="flex-1 overflow-hidden relative z-10 p-2 md:p-4 pb-14 md:pb-16 flex gap-4">
        {/* Chat Panel */}
        <div className={`w-full md:w-1/2 h-full ${activeTab === 'chat' ? 'block' : 'hidden md:block'}`}>
          <ChatPanel />
        </div>

        {/* IDE Panel — visible on desktop always, on mobile only when active */}
        <div className={`w-full md:w-1/2 h-full ${activeTab === 'ide' ? 'block' : 'hidden md:block'}`}>
          <IdePanel />
        </div>

        {/* Goals Panel — mobile only */}
        <div className={`w-full h-full ${activeTab === 'goals' ? 'block' : 'hidden'} md:hidden`}>
          <DailyGoals />
        </div>

        {/* Achievements Panel — mobile only */}
        <div className={`w-full h-full ${activeTab === 'achievements' ? 'block' : 'hidden'} md:hidden`}>
          <AchievementsPanel />
        </div>
      </main>

      <HardwareStrip />

      {/* Diagnostic Sequence */}
      <AnimatePresence>
        {!diagnosticDone && (
          <DiagnosticSequence onComplete={() => setDiagnosticDone(true)} />
        )}
      </AnimatePresence>
    </div>
  );
}
