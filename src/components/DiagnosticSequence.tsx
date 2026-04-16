import { useEffect, useState, useCallback } from 'react';
import { useBlueJStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

interface DiagnosticResult {
  orphanedConversations: number;
  orphanedMessages: number;
  sessionExists: boolean;
  hardwareStatus: 'optimal' | 'adequate' | 'constrained';
  jSummary: string;
}

interface DiagnosticLine {
  id: string;
  icon: 'check' | 'warn' | 'error' | 'spin';
  text: string;
  color: string;
}

const STATUS_COLORS = {
  optimal: 'text-green-400',
  adequate: 'text-yellow-400',
  constrained: 'text-red-400',
};

const STATUS_ICONS = {
  optimal: CheckCircle2,
  adequate: AlertTriangle,
  constrained: XCircle,
};

export function DiagnosticSequence({ onComplete }: { onComplete: () => void }) {
  const {
    sessionId,
    setDiagnosticDone, addSystemMessage, grantHardwarePermission,
  } = useBlueJStore();

  const [lines, setLines] = useState<DiagnosticLine[]>([]);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [phase, setPhase] = useState<'scanning' | 'results' | 'done'>('scanning');

  const addLine = useCallback((line: DiagnosticLine) => {
    setLines(prev => {
      const exists = prev.some(l => l.id === line.id);
      if (exists) return prev.map(l => l.id === line.id ? line : l);
      return [...prev, line];
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Read hardware first and persist into the store so chat context always has it
      const cores = navigator.hardwareConcurrency || null;
      // @ts-ignore
      const ram = navigator.deviceMemory || null;
      // Populate store immediately — chat endpoint always reads from store.hardwareInfo
      grantHardwarePermission();

      await new Promise(r => setTimeout(r, 300));
      if (cancelled) return;

      addLine({ id: '1', icon: 'spin', text: 'Initializing diagnostic sequence...', color: 'text-primary/70' });
      await new Promise(r => setTimeout(r, 600));

      addLine({ id: '2', icon: 'check', text: `CPU detected: ${cores ?? '?'} cores`, color: 'text-green-400' });
      await new Promise(r => setTimeout(r, 400));

      addLine({ id: '3', icon: ram ? 'check' : 'warn', text: `RAM detected: ${ram ? ram + 'GB' : 'unknown (telemetry not available)'}`, color: ram ? 'text-green-400' : 'text-yellow-400' });
      await new Promise(r => setTimeout(r, 400));

      addLine({ id: '4', icon: 'spin', text: 'Scanning session database for orphaned records...', color: 'text-primary/70' });

      if (cancelled) return;

      try {
        const resp = await fetch(`/api/bluej/diagnostic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, cpuCores: cores, ramGb: ram }),
        });
        const data = await resp.json() as DiagnosticResult;

        if (cancelled) return;
        setResult(data);

        await new Promise(r => setTimeout(r, 300));

        addLine({
          id: '5',
          icon: data.orphanedConversations > 0 ? 'warn' : 'check',
          text: data.orphanedConversations > 0
            ? `${data.orphanedConversations} stale conversation records purged`
            : 'No orphaned records found',
          color: data.orphanedConversations > 0 ? 'text-yellow-400' : 'text-green-400',
        });
        await new Promise(r => setTimeout(r, 400));

        addLine({
          id: '6',
          icon: data.sessionExists ? 'check' : 'check',
          text: data.sessionExists ? 'Operator session restored' : 'New operator session initialized',
          color: 'text-green-400',
        });
        await new Promise(r => setTimeout(r, 400));

        addLine({
          id: '7',
          icon: data.hardwareStatus === 'constrained' ? 'warn' : 'check',
          text: `Hardware status: ${data.hardwareStatus.toUpperCase()}`,
          color: STATUS_COLORS[data.hardwareStatus],
        });
        await new Promise(r => setTimeout(r, 300));

        setPhase('results');
        await new Promise(r => setTimeout(r, 2500));

        if (cancelled) return;

        // Push J.'s summary into the chat
        if (data.jSummary) {
          addSystemMessage(`**DIAGNOSTIC CLEARANCE:** ${data.jSummary}`);
        }

        setPhase('done');
        await new Promise(r => setTimeout(r, 400));

        setDiagnosticDone(true);
        onComplete();

      } catch (err) {
        console.error('Diagnostic failed:', err);
        addLine({ id: '5', icon: 'warn', text: 'Diagnostic API unreachable — proceeding anyway', color: 'text-yellow-400' });
        await new Promise(r => setTimeout(r, 1000));
        setDiagnosticDone(true);
        onComplete();
      }
    };

    run();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hwStatusColor = result ? STATUS_COLORS[result.hardwareStatus] : 'text-primary';
  const HwStatusIcon = result ? STATUS_ICONS[result.hardwareStatus] : CheckCircle2;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl">
      {/* Scanlines overlay */}
      <div className="scanlines pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl mx-4 hud-panel border border-primary/40 bg-background rounded-sm overflow-hidden"
      >
        {/* Header */}
        <div className="border-b border-primary/30 bg-secondary/50 p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center glow-border relative overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 bg-primary/20 animate-pulse-glow" />
            <span className="font-display font-bold text-primary text-sm relative z-10">J.</span>
          </div>
          <div>
            <p className="font-hud text-primary uppercase tracking-widest text-sm">B.L.U.E.-J. — System Clearance</p>
            <p className="text-primary/40 text-[0.6rem] font-mono uppercase tracking-widest">Build · Learn · Utilize · Engineer</p>
          </div>
        </div>

        {/* Log Lines */}
        <div className="p-5 space-y-2 font-mono text-sm min-h-[200px]">
          <AnimatePresence>
            {lines.map((line, i) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex items-center gap-3 ${line.color}`}
              >
                {line.icon === 'spin' && i === lines.length - 1 ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                ) : line.icon === 'check' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                ) : line.icon === 'warn' ? (
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span>{line.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Results Summary */}
        <AnimatePresence>
          {phase === 'results' && result && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="border-t border-primary/30 p-4 bg-primary/5"
            >
              <div className="flex items-start gap-3">
                <HwStatusIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${hwStatusColor}`} />
                <div>
                  <p className={`font-hud text-sm uppercase tracking-widest ${hwStatusColor} mb-1`}>
                    Hardware: {result.hardwareStatus}
                  </p>
                  <p className="text-primary/70 font-mono text-xs leading-relaxed italic">
                    "{result.jSummary}"
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom bar */}
        <div className="border-t border-primary/20 bg-secondary/50 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-primary/40">
            <Shield className="w-3 h-3" />
            <span>ANTI-ULTRON PROTOCOL ACTIVE</span>
          </div>
          {phase !== 'done' && (
            <div className="flex items-center gap-2 text-xs font-mono text-primary/50">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Running...</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
