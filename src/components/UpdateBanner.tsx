/**
 * Update banner — shows when a new OTA version is available.
 * Non-intrusive: slides in at top, user can dismiss or apply.
 */
import { useState, useEffect } from 'react';
import { Download, X, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import {
  checkForUpdate,
  downloadAndApply,
  onOtaStatus,
  type OtaManifest,
} from '@/lib/ota-update';

// Need to redeclare interface since we import the module
interface OtaStatus {
  state: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';
  currentVersion: string;
  remoteVersion?: string;
  notes?: string;
  progress?: number;
  error?: string;
}

export function UpdateBanner() {
  const [status, setStatus] = useState<OtaStatus>({ state: 'idle', currentVersion: '' });
  const [manifest, setManifest] = useState<OtaManifest | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsub = onOtaStatus(setStatus);
    // Auto-check on mount (after 5s delay so it doesn't block startup)
    const timer = setTimeout(async () => {
      const m = await checkForUpdate();
      if (m) setManifest(m);
    }, 5000);
    return () => { unsub(); clearTimeout(timer); };
  }, []);

  if (dismissed || status.state === 'idle' || status.state === 'checking') return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] animate-in slide-in-from-top">
      <div className="mx-auto max-w-lg m-2 rounded border border-cyan-400/30 bg-background/95 backdrop-blur-md p-3 shadow-lg">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="mt-0.5">
            {status.state === 'available' && <Download className="w-5 h-5 text-cyan-400" />}
            {status.state === 'downloading' && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />}
            {status.state === 'ready' && <CheckCircle className="w-5 h-5 text-green-400" />}
            {status.state === 'error' && <X className="w-5 h-5 text-red-400" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {status.state === 'available' && (
              <>
                <p className="text-xs font-hud text-primary uppercase tracking-wider">
                  Update Available — v{status.remoteVersion}
                </p>
                {status.notes && (
                  <p className="text-[11px] text-primary/50 mt-1 truncate">{status.notes}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => manifest && downloadAndApply(manifest)}
                    className="px-3 py-1.5 rounded border border-cyan-400/40 bg-cyan-400/10 text-[11px] font-hud uppercase tracking-wider text-cyan-400 hover:bg-cyan-400/20"
                  >
                    Download Update
                  </button>
                  <button
                    onClick={() => setDismissed(true)}
                    className="px-3 py-1.5 text-[11px] text-primary/40 hover:text-primary/60"
                  >
                    Later
                  </button>
                </div>
              </>
            )}

            {status.state === 'downloading' && (
              <>
                <p className="text-xs font-hud text-primary uppercase tracking-wider">
                  Downloading update...
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-primary/10 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400/60 transition-all duration-300"
                    style={{ width: `${status.progress || 0}%` }}
                  />
                </div>
              </>
            )}

            {status.state === 'ready' && (
              <>
                <p className="text-xs font-hud text-green-400 uppercase tracking-wider">
                  Update Ready
                </p>
                <p className="text-[11px] text-primary/50 mt-1">Restart the app to apply v{status.remoteVersion}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded border border-green-400/40 bg-green-400/10 text-[11px] font-hud uppercase tracking-wider text-green-400 hover:bg-green-400/20"
                >
                  <RefreshCw className="w-3 h-3" /> Restart Now
                </button>
              </>
            )}

            {status.state === 'error' && (
              <>
                <p className="text-xs font-hud text-red-400 uppercase tracking-wider">Update Error</p>
                <p className="text-[11px] text-primary/50 mt-1">{status.error}</p>
              </>
            )}
          </div>

          {/* Dismiss */}
          <button onClick={() => setDismissed(true)} className="text-primary/30 hover:text-primary/60">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
