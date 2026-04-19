/**
 * FIXED: HardwareStrip — no longer covers buttons in portrait mode.
 * 
 * Changes:
 * 1. Removed `fixed bottom-0` → now uses normal document flow
 * 2. Added `flex-shrink-0` so it never collapses
 * 3. On mobile portrait: collapsible with a tap-to-expand toggle
 * 4. Always visible on desktop, compact single-line on mobile
 */
import { useState } from 'react';
import { useBlueJStore } from '@/lib/store';
import { Cpu, HardDrive, Smartphone, Monitor as MonitorIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function HardwareStrip() {
  const { hardwareMonitorEnabled, hardwareInfo, selectedOs } = useBlueJStore();
  const [expanded, setExpanded] = useState(false);

  if (!hardwareMonitorEnabled) return null;

  const OsIcon = selectedOs === 'android' || selectedOs === 'ios' ? Smartphone : MonitorIcon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="relative z-40 flex-shrink-0 bg-secondary/80 backdrop-blur-xl border-t border-primary/30"
      >
        {/* ── Desktop: full bar (unchanged look) ── */}
        <div className="hidden sm:flex items-center justify-between px-4 h-10 font-mono text-xs text-primary/70">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>SYSTEM.ONLINE</span>
            </div>
            <div className="flex items-center gap-2">
              <OsIcon className="w-4 h-4" />
              <span className="uppercase">{selectedOs} ENV</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              <span>CORES: {hardwareInfo.cpuCores || 'UNK'}</span>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              <span>MEM: {hardwareInfo.ramGb ? `${hardwareInfo.ramGb}GB` : 'UNK'}</span>
            </div>
          </div>
        </div>

        {/* ── Mobile: compact toggle strip ── */}
        <div className="sm:hidden">
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between px-3 h-7 font-mono text-[10px] text-primary/50 active:bg-primary/5"
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span>SYS.OK</span>
              <span className="text-primary/30">·</span>
              <span>{hardwareInfo.cpuCores || '?'}C / {hardwareInfo.ramGb ? `${hardwareInfo.ramGb}G` : '?'}</span>
            </div>
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-primary/10"
              >
                <div className="px-3 py-2 grid grid-cols-2 gap-2 text-[10px] font-mono text-primary/60">
                  <div className="flex items-center gap-1.5">
                    <OsIcon className="w-3 h-3" />
                    <span className="uppercase">{selectedOs}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3 h-3" />
                    <span>CORES: {hardwareInfo.cpuCores || 'UNK'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="w-3 h-3" />
                    <span>RAM: {hardwareInfo.ramGb ? `${hardwareInfo.ramGb}GB` : 'UNK'}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
