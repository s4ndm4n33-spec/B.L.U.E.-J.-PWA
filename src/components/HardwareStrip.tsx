import { useBlueJStore } from '@/lib/store';
import { Cpu, HardDrive, Smartphone, Monitor as MonitorIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function HardwareStrip() {
  const { hardwareMonitorEnabled, hardwareInfo, selectedOs } = useBlueJStore();

  if (!hardwareMonitorEnabled) return null;

  const OsIcon = selectedOs === 'android' || selectedOs === 'ios' ? Smartphone : MonitorIcon;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 h-10 bg-secondary/80 backdrop-blur-xl border-t border-primary/30 z-40 flex items-center justify-between px-4 font-mono text-xs text-primary/70"
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>SYSTEM.ONLINE</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
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
      </motion.div>
    </AnimatePresence>
  );
}
