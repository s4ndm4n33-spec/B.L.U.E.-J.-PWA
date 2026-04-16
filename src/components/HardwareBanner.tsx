import { useBlueJStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, X } from 'lucide-react';

export function HardwareBanner() {
  const { hardwarePermissionGranted, grantHardwarePermission, denyHardwarePermission } = useBlueJStore();

  return (
    <AnimatePresence>
      {hardwarePermissionGranted === null && (
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="bg-primary/10 border-b border-primary/30 text-primary-foreground py-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-50 relative backdrop-blur-md"
        >
          <div className="flex items-center gap-3 text-sm text-primary">
            <Cpu className="w-5 h-5 animate-pulse" />
            <p><strong>SYSTEM OVERRIDE REQUEST:</strong> J. requests access to hardware telemetry (CPU/RAM) to optimize code generation for your machine.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={grantHardwarePermission}
              className="flex-1 sm:flex-none px-4 py-1.5 bg-primary/20 hover:bg-primary/40 border border-primary/50 text-primary rounded-sm transition-all text-xs font-display font-bold tracking-wider uppercase glow-border"
            >
              Authorize
            </button>
            <button 
              onClick={denyHardwarePermission}
              className="flex-1 sm:flex-none px-4 py-1.5 bg-destructive/20 hover:bg-destructive/40 border border-destructive/50 text-destructive rounded-sm transition-all text-xs font-display font-bold tracking-wider uppercase"
            >
              Deny
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
