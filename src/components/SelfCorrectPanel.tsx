/**
 * NEW: Self-Correction UI — shows detected issues and proposed fixes.
 * User must explicitly approve each fix before it's applied.
 *
 * Accessible from a new "Diagnostics" button in the HUD header.
 */
import { useState } from 'react';
import { useSelfCorrectStore, type FixProposal, type DiagnosticIssue } from '@/lib/self-correct';
import {
  ShieldAlert, ShieldCheck, CheckCircle2, XCircle, RotateCcw, Trash2,
  AlertTriangle, Info, AlertCircle, Zap, ChevronDown, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SEVERITY_ICON = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  critical: Zap,
};

const SEVERITY_COLORS = {
  info: 'text-blue-400 border-blue-500/30 bg-blue-500/5',
  warning: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5',
  error: 'text-red-400 border-red-500/30 bg-red-500/5',
  critical: 'text-red-500 border-red-600/30 bg-red-600/10',
};

const STATUS_BADGE = {
  proposed: { label: 'PENDING', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
  approved: { label: 'APPROVED', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  applied: { label: 'APPLIED', color: 'text-green-400 border-green-500/30 bg-green-500/10' },
  rejected: { label: 'REJECTED', color: 'text-red-400/50 border-red-500/20 bg-red-500/5' },
  'rolled-back': { label: 'ROLLED BACK', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
};

export function SelfCorrectPanel({ onClose }: { onClose: () => void }) {
  const { issues, proposals, autoAnalyze, setAutoAnalyze, approveProposal, rejectProposal, rollbackProposal, dismissIssue, clearHistory } = useSelfCorrectStore();
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [expandedFix, setExpandedFix] = useState<string | null>(null);

  const pendingFixes = proposals.filter(p => p.status === 'proposed');
  const appliedFixes = proposals.filter(p => p.status === 'applied');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background border border-primary/30 rounded-sm w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-primary/20 bg-secondary/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-hud uppercase tracking-widest text-sm">
            <ShieldAlert className="w-4 h-4" />
            <span>Self-Diagnostics</span>
            {pendingFixes.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[10px] rounded">
                {pendingFixes.length} pending
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-primary/40 hover:text-primary">✕</button>
        </div>

        {/* Controls */}
        <div className="px-4 py-2 border-b border-primary/10 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoAnalyze}
              onChange={e => setAutoAnalyze(e.target.checked)}
              className="accent-primary w-3 h-3"
            />
            <span className="text-[10px] text-primary/50 font-mono">Auto-diagnose errors</span>
          </label>
          <button
            onClick={clearHistory}
            className="flex items-center gap-1 text-[10px] text-red-400/50 hover:text-red-400 font-mono"
          >
            <Trash2 className="w-3 h-3" /> Clear all
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">

          {/* Pending Fixes — prominent */}
          {pendingFixes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-hud uppercase tracking-widest text-yellow-400/70">
                Fixes Awaiting Your Approval
              </h3>
              {pendingFixes.map(fix => (
                <FixCard key={fix.id} fix={fix} expanded={expandedFix === fix.id}
                  onToggle={() => setExpandedFix(expandedFix === fix.id ? null : fix.id)}
                  onApprove={() => approveProposal(fix.id)}
                  onReject={() => rejectProposal(fix.id)}
                />
              ))}
            </div>
          )}

          {/* Recent Issues */}
          {issues.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-[10px] font-hud uppercase tracking-widest text-primary/50">
                Detected Issues ({issues.length})
              </h3>
              {issues.slice(0, 20).map(issue => {
                const Icon = SEVERITY_ICON[issue.severity];
                const colors = SEVERITY_COLORS[issue.severity];
                const isExpanded = expandedIssue === issue.id;
                return (
                  <div key={issue.id} className={`border rounded-sm ${colors} p-2`}>
                    <button
                      onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                      className="w-full flex items-start gap-2 text-left"
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{issue.title}</div>
                        <div className="text-[10px] opacity-60 truncate">{issue.description}</div>
                      </div>
                      {isExpanded ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0" />}
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 pt-2 border-t border-current/10 space-y-1">
                            {issue.errorDetails && (
                              <pre className="text-[10px] opacity-50 font-mono whitespace-pre-wrap break-all max-h-24 overflow-auto">
                                {issue.errorDetails}
                              </pre>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => dismissIssue(issue.id)}
                                className="text-[10px] opacity-50 hover:opacity-100 underline"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-primary/30">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xs font-hud uppercase tracking-wider">All Systems Nominal</p>
              <p className="text-[10px] font-mono mt-1">No issues detected.</p>
            </div>
          )}

          {/* Applied Fixes History */}
          {appliedFixes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-hud uppercase tracking-widest text-green-400/50">
                Applied Fixes
              </h3>
              {appliedFixes.map(fix => (
                <div key={fix.id} className="border border-green-500/20 bg-green-500/5 rounded-sm p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs text-green-400/80">{fix.title}</span>
                  </div>
                  <button
                    onClick={() => rollbackProposal(fix.id)}
                    className="flex items-center gap-1 text-[10px] text-orange-400/50 hover:text-orange-400"
                  >
                    <RotateCcw className="w-3 h-3" /> Undo
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function FixCard({ fix, expanded, onToggle, onApprove, onReject }: {
  fix: FixProposal; expanded: boolean;
  onToggle: () => void; onApprove: () => void; onReject: () => void;
}) {
  const badge = STATUS_BADGE[fix.status];
  return (
    <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-sm overflow-hidden">
      <button onClick={onToggle} className="w-full px-3 py-2 flex items-center gap-2 text-left">
        <Zap className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-yellow-400 truncate">{fix.title}</div>
          <div className="text-[10px] text-yellow-400/50 truncate">{fix.explanation}</div>
        </div>
        <span className={`text-[9px] px-1.5 py-0.5 border rounded font-hud uppercase ${badge.color}`}>
          {badge.label}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-yellow-500/10 pt-2">
              <p className="text-[10px] text-yellow-300/60 font-mono">{fix.explanation}</p>

              {/* Changes preview */}
              <div className="space-y-1">
                {fix.changes.map((change, i) => (
                  <div key={i} className="bg-black/30 rounded p-2 text-[10px] font-mono">
                    <span className="text-yellow-400/50">{change.type}:</span>{' '}
                    <span className="text-yellow-300/80">{change.description}</span>
                  </div>
                ))}
              </div>

              {/* Confidence */}
              <div className="text-[10px] text-primary/30 font-mono">
                Confidence: {fix.confidence}%
              </div>

              {/* Approve / Reject */}
              {fix.status === 'proposed' && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={onApprove}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 rounded-sm text-xs font-hud uppercase tracking-wider"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve Fix
                  </button>
                  <button
                    onClick={onReject}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400/70 rounded-sm text-xs font-hud uppercase tracking-wider"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
