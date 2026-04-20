/**
 * NEW: Self-Correction Engine — B.L.U.E.-J. can detect her own issues and
 * propose fixes, BUT only executes them with user permission.
 *
 * Architecture:
 * 1. Error Interceptor — catches runtime errors, console errors, failed API calls
 * 2. Diagnostic Analyzer — uses the AI (local or cloud) to analyze the error
 * 3. Fix Proposer — generates a fix proposal with explanation
 * 4. Permission Gate — shows the fix to the user, waits for approval
 * 5. Fix Executor — applies the approved fix
 *
 * All fixes are reversible (stores snapshots before applying).
 */
import { create } from 'zustand';

export type FixSeverity = 'info' | 'warning' | 'error' | 'critical';
export type FixStatus = 'proposed' | 'approved' | 'applied' | 'rejected' | 'rolled-back';

export interface DiagnosticIssue {
  id: string;
  timestamp: number;
  severity: FixSeverity;
  category: 'runtime-error' | 'api-failure' | 'ui-glitch' | 'performance' | 'code-error' | 'config';
  title: string;
  description: string;
  errorDetails?: string;
  stackTrace?: string;
}

export interface FixProposal {
  id: string;
  issueId: string;
  timestamp: number;
  status: FixStatus;
  title: string;
  explanation: string;
  changes: FixChange[];
  rollbackSnapshot?: string; // Serialized state before fix
  confidence: number; // 0-100
}

export interface FixChange {
  type: 'code-replace' | 'config-update' | 'state-reset' | 'cache-clear' | 'retry-action';
  target: string;        // What's being changed
  before?: string;       // Previous value
  after: string;         // New value
  description: string;
}

interface SelfCorrectState {
  issues: DiagnosticIssue[];
  proposals: FixProposal[];
  isAnalyzing: boolean;
  autoAnalyze: boolean; // Auto-analyze errors as they happen
  maxHistory: number;

  // Actions
  reportIssue: (issue: Omit<DiagnosticIssue, 'id' | 'timestamp'>) => string;
  addProposal: (proposal: Omit<FixProposal, 'id' | 'timestamp' | 'status'>) => void;
  approveProposal: (id: string) => void;
  rejectProposal: (id: string) => void;
  rollbackProposal: (id: string) => void;
  markApplied: (id: string) => void;
  clearHistory: () => void;
  setAutoAnalyze: (v: boolean) => void;
  dismissIssue: (id: string) => void;
}

export const useSelfCorrectStore = create<SelfCorrectState>((set, get) => ({
  issues: [],
  proposals: [],
  isAnalyzing: false,
  autoAnalyze: true,
  maxHistory: 50,

  reportIssue: (issue) => {
    const id = `issue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const full: DiagnosticIssue = { ...issue, id, timestamp: Date.now() };
    set(s => ({
      issues: [full, ...s.issues].slice(0, s.maxHistory),
    }));
    return id;
  },

  addProposal: (proposal) => {
    const id = `fix-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const full: FixProposal = { ...proposal, id, timestamp: Date.now(), status: 'proposed' };
    set(s => ({
      proposals: [full, ...s.proposals].slice(0, s.maxHistory),
    }));
  },

  approveProposal: (id) => {
    set(s => ({
      proposals: s.proposals.map(p => p.id === id ? { ...p, status: 'approved' as FixStatus } : p),
    }));
  },

  rejectProposal: (id) => {
    set(s => ({
      proposals: s.proposals.map(p => p.id === id ? { ...p, status: 'rejected' as FixStatus } : p),
    }));
  },

  rollbackProposal: (id) => {
    set(s => ({
      proposals: s.proposals.map(p => p.id === id ? { ...p, status: 'rolled-back' as FixStatus } : p),
    }));
  },

  markApplied: (id) => {
    set(s => ({
      proposals: s.proposals.map(p => p.id === id ? { ...p, status: 'applied' as FixStatus } : p),
    }));
  },

  clearHistory: () => set({ issues: [], proposals: [] }),
  setAutoAnalyze: (v) => set({ autoAnalyze: v }),

  dismissIssue: (id) => {
    set(s => ({ issues: s.issues.filter(i => i.id !== id) }));
  },
}));

/**
 * Global error interceptor — attach to window to catch unhandled errors.
 * Call this once in main.tsx.
 */
export function installErrorInterceptor() {
  const { reportIssue } = useSelfCorrectStore.getState();

  // Unhandled JS errors
  window.addEventListener('error', (event) => {
    reportIssue({
      severity: 'error',
      category: 'runtime-error',
      title: event.message || 'Unhandled Error',
      description: `Error in ${event.filename}:${event.lineno}:${event.colno}`,
      errorDetails: event.message,
      stackTrace: event.error?.stack,
    });
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason);
    reportIssue({
      severity: 'error',
      category: 'runtime-error',
      title: 'Unhandled Promise Rejection',
      description: msg,
      errorDetails: msg,
      stackTrace: event.reason?.stack,
    });
  });

  // Intercept console.error for additional diagnostics
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    originalConsoleError.apply(console, args);
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    if (msg.includes('[VoiceChat]') || msg.includes('[STT]') || msg.includes('[Chat]')) {
      reportIssue({
        severity: 'warning',
        category: 'runtime-error',
        title: 'Console Error Detected',
        description: msg.slice(0, 200),
        errorDetails: msg,
      });
    }
  };

  // Fetch interceptor for API failures
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      if (!response.ok && response.status >= 500) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        reportIssue({
          severity: 'warning',
          category: 'api-failure',
          title: `API Error ${response.status}`,
          description: `${url} returned ${response.status} ${response.statusText}`,
        });
      }
      return response;
    } catch (err: any) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      reportIssue({
        severity: 'error',
        category: 'api-failure',
        title: 'Network Request Failed',
        description: `Failed to fetch ${url}: ${err.message}`,
        errorDetails: err.message,
      });
      throw err;
    }
  };
}

/**
 * Analyze an issue using the AI and generate a fix proposal.
 * Works with both local and cloud AI.
 */
export async function analyzeAndProposeFix(
  issue: DiagnosticIssue,
  chatFn: (prompt: string) => Promise<string>
): Promise<void> {
  const store = useSelfCorrectStore.getState();

  const prompt = `You are B.L.U.E.-J.'s self-diagnostic system. Analyze this error and propose a fix.

ERROR:
- Category: ${issue.category}
- Severity: ${issue.severity}
- Title: ${issue.title}
- Description: ${issue.description}
${issue.stackTrace ? `- Stack: ${issue.stackTrace.slice(0, 500)}` : ''}

Respond in this exact JSON format:
{
  "title": "Brief fix title",
  "explanation": "What went wrong and how to fix it",
  "changes": [
    {
      "type": "state-reset|cache-clear|retry-action|config-update",
      "target": "what to change",
      "after": "new value or action",
      "description": "what this change does"
    }
  ],
  "confidence": 0-100
}`;

  try {
    const response = await chatFn(prompt);
    const parsed = JSON.parse(response);
    store.addProposal({
      issueId: issue.id,
      title: parsed.title,
      explanation: parsed.explanation,
      changes: parsed.changes,
      confidence: parsed.confidence ?? 50,
    });
  } catch (err) {
    console.warn('[SelfCorrect] Failed to analyze issue:', err);
  }
}
