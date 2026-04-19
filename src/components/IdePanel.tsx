import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBlueJStore, SIM_PROFILES, type SimHardwareProfile } from '@/lib/store';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Copy, Play, Check, Download, Zap, ChevronDown, ChevronUp,
  Terminal as TerminalIcon, Loader2, X, Cpu, ChevronRight, Activity,
  CheckCircle2, XCircle, FlaskConical, Bolt, FolderOpen
} from 'lucide-react';
import { useChatStream } from '@/hooks/use-chat';
import { optimizeOfflineCode } from '@/lib/offline-ai';
import { DownloadModal } from './DownloadModal';
import { WorkspaceManagerModal } from './WorkspaceManagerModal';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./ui/tooltip";
import { motion, AnimatePresence } from 'framer-motion';

const LANG_MAP: Record<string, string> = {
  python: 'python', py: 'python',
  javascript: 'javascript', js: 'javascript',
  typescript: 'typescript', ts: 'typescript',
  cpp: 'cpp', 'c++': 'cpp', c: 'c',
};

function extractCodeBlock(content: string): { code: string; lang: string } {
  const match = content.match(/```([\w+#.-]+)?\n([\s\S]*?)```/);
  if (match) {
    const rawLang = (match[1] ?? 'python').toLowerCase();
    return { code: match[2].trim(), lang: LANG_MAP[rawLang] ?? rawLang };
  }
  return { code: '# Awaiting code synthesis from J...', lang: 'python' };
}

interface SimulationResult {
  output: string;
  simulatedAt: string;
  error?: string;
  profile?: { id: string; label: string; cores: number | null; ramGb: number | null; gpu: string | null };
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  runtimeMs: number;
  timedOut: boolean;
  phase?: 'compile' | 'run';
  executedAt: string;
  engine?: 'piston' | 'local';
  fallback?: boolean;
}

type IdeTab = 'j_code' | 'my_code' | 'optimized';

export function IdePanel() {
  const {
    selectedLanguage, selectedOs, myCode, setMyCode,
    simHardwareProfile, setSimHardwareProfile, hardwareInfo,
    providerMode, localModelReady, selectedWorkspaceFileId,
  } = useBlueJStore();
  const { messages, addSystemMessage } = useChatStream();

  const [activeTab, setActiveTab] = useState<IdeTab>('j_code');
  const [copied, setCopied] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profileMenuPos, setProfileMenuPos] = useState({ top: 0, left: 0 });
  const profileBtnRef = useRef<HTMLButtonElement>(null);

  // Simulation
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  // Real execution
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<ExecutionResult | null>(null);

  // Optimization
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedCode, setOptimizedCode] = useState<string | null>(null);
  const [optimizedExplanation, setOptimizedExplanation] = useState('');
  const [originalBeforeOptimize, setOriginalBeforeOptimize] = useState('');

  const terminalRef = useRef<HTMLDivElement>(null);
  const highlightLayerRef = useRef<HTMLDivElement>(null);
  const myCodeTextareaRef = useRef<HTMLTextAreaElement>(null);

  const syncHighlightScroll = () => {
    if (highlightLayerRef.current && myCodeTextareaRef.current) {
      highlightLayerRef.current.scrollTop = myCodeTextareaRef.current.scrollTop;
      highlightLayerRef.current.scrollLeft = myCodeTextareaRef.current.scrollLeft;
    }
  };

  const { code: jCode, lang: jLang } = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'assistant') {
        const result = extractCodeBlock(msg.content);
        if (result.code !== '# Awaiting code synthesis from J...') return result;
      }
    }
    return { code: '# Awaiting code synthesis from J...', lang: selectedLanguage };
  }, [messages, selectedLanguage]);

  useEffect(() => {
    if (showTerminal && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [simResult, execResult, showTerminal]);

  const currentProfile = SIM_PROFILES.find(p => p.id === simHardwareProfile) ?? SIM_PROFILES[0];
  const resolvedCores = simHardwareProfile === 'auto' ? hardwareInfo.cpuCores : currentProfile.cores;
  const resolvedRam   = simHardwareProfile === 'auto' ? hardwareInfo.ramGb   : currentProfile.ramGb;
  const resolvedGpu   = simHardwareProfile === 'auto' ? null                 : currentProfile.gpu;

  // Which code is "active" for simulation / copy / run
  const activeCode = activeTab === 'j_code' ? jCode : activeTab === 'optimized' ? (optimizedCode ?? '') : myCode;
  const activeLang = activeTab === 'j_code' ? jLang : selectedLanguage;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulate = async () => {
    if (!activeCode.trim() || activeCode.includes('Awaiting code')) return;
    setSimulating(true);
    setShowTerminal(true);
    setSimResult(null);
    setExecResult(null);
    try {
      const resp = await fetch(`/api/bluej/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeCode, language: activeLang, os: selectedOs,
          simProfileId: simHardwareProfile,
          simCores: resolvedCores, simRamGb: resolvedRam, simGpu: resolvedGpu,
        }),
      });
      setSimResult(await resp.json() as SimulationResult);
    } catch {
      setSimResult({ output: '[Connection error — simulation unavailable]', simulatedAt: new Date().toISOString() });
    } finally {
      setSimulating(false);
    }
  };

  const handleRealExecute = async () => {
    if (!activeCode.trim() || activeCode.includes('Awaiting code')) return;
    setExecuting(true);
    setShowTerminal(true);
    setExecResult(null);
    setSimResult(null);
    try {
      const resp = await fetch(`/api/bluej/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activeCode, language: activeLang }),
      });
      const data = await resp.json();
      setExecResult({ ...data, executedAt: new Date().toISOString() });
    } catch {
      setExecResult({
        stdout: '', stderr: 'Connection error — execution unavailable.',
        exitCode: -1, runtimeMs: 0, timedOut: false, executedAt: new Date().toISOString(),
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleOptimize = async () => {
    if (!myCode.trim()) return;
    setOptimizing(true);
    try {
      const useLocalOptimizer = providerMode !== 'cloud' && localModelReady;
      const data = useLocalOptimizer
        ? await optimizeOfflineCode(myCode, selectedLanguage)
        : await (async () => {
            const resp = await fetch(`/api/bluej/optimize`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: myCode, language: selectedLanguage, os: selectedOs }),
            });
            return resp.json() as Promise<{ optimizedCode: string; explanation: string }>;
          })();
      if (data.optimizedCode) {
        setOriginalBeforeOptimize(myCode);
        setOptimizedCode(data.optimizedCode);
        setOptimizedExplanation(data.explanation);
        setActiveTab('optimized');
        addSystemMessage?.(`**Five Masters Optimization ready for review.** ${data.explanation}`);
      }
    } catch (err) {
      console.error('Optimize error:', err);
    } finally {
      setOptimizing(false);
    }
  };

  const acceptOptimized = () => {
    if (optimizedCode) {
      setMyCode(optimizedCode);
      setOptimizedCode(null);
      setOptimizedExplanation('');
      setOriginalBeforeOptimize('');
      setActiveTab('my_code');
    }
  };

  const discardOptimized = () => {
    setOptimizedCode(null);
    setOptimizedExplanation('');
    setOriginalBeforeOptimize('');
    setActiveTab('my_code');
  };

  const { terminalOutput, jComment } = useMemo(() => {
    if (!simResult?.output) return { terminalOutput: '', jComment: '' };
    const parts = simResult.output.split(/\n---\n?/);
    return { terminalOutput: parts[0]?.trim() ?? '', jComment: parts[1]?.trim() ?? '' };
  }, [simResult]);

  // Shared font/line-height — must match exactly between textarea and highlight layer
  const EDITOR_FONT_SIZE = '0.85rem';
  const EDITOR_LINE_HEIGHT = '1.6';
  const EDITOR_PADDING = '1rem';

  const isRunDisabled = (executing || simulating) || (!activeCode.trim() || activeCode.includes('Awaiting code'));

  return (
    <>
      <div className="h-full flex flex-col hud-panel overflow-hidden">

        {/* ── Tab Header ── */}
        <div className="flex border-b border-primary/20 bg-secondary/50 flex-shrink-0">
          <button
            onClick={() => setActiveTab('j_code')}
            className={`flex-1 py-3 text-xs font-hud uppercase tracking-widest transition-colors ${activeTab === 'j_code' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-primary/50 hover:text-primary/80'}`}
          >
            J.'s Synthesis
          </button>
          <button
            onClick={() => setActiveTab('my_code')}
            className={`flex-1 py-3 text-xs font-hud uppercase tracking-widest transition-colors ${activeTab === 'my_code' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-accent/50 hover:text-accent/80'}`}
          >
            My Workspace
          </button>
          {optimizedCode && (
            <button
              onClick={() => setActiveTab('optimized')}
              className={`flex-1 py-3 text-xs font-hud uppercase tracking-widest transition-colors flex items-center justify-center gap-1 ${
                activeTab === 'optimized'
                  ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-400/5'
                  : 'text-yellow-500/60 hover:text-yellow-400/80'
              }`}
            >
              <Zap className="w-3 h-3" />
              Optimized
            </button>
          )}
        </div>

        {/* ── Code Area ── */}
        <div className="flex-1 relative bg-[#1E1E1E] overflow-hidden flex flex-col min-h-0">

          {/* Top-right copy + lang badge */}
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <div className="bg-black/60 text-primary/70 text-xs px-2 py-1 rounded border border-primary/20 font-mono uppercase">
              {activeLang}
            </div>
            <Tooltip content="Copy code to clipboard" position="bottom">
              <button
                onClick={handleCopy}
                className="bg-black/60 hover:bg-primary/20 text-primary p-1.5 rounded border border-primary/20 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </Tooltip>
          </div>

          {/* ── Editor Views ── */}
          <div className="flex-1 overflow-auto">

            {/* J.'s Synthesis — read-only highlighted */}
            {activeTab === 'j_code' && (
              <div className="p-4 pt-10 h-full">
                <SyntaxHighlighter
                  language={jLang}
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, padding: 0, background: 'transparent', fontSize: EDITOR_FONT_SIZE, lineHeight: EDITOR_LINE_HEIGHT }}
                  showLineNumbers
                  lineNumberStyle={{ color: '#4a5568', minWidth: '2.5em' }}
                >
                  {jCode}
                </SyntaxHighlighter>
              </div>
            )}

            {/* My Workspace — editable overlay */}
            {activeTab === 'my_code' && (
              <div className="relative w-full h-full" style={{ minHeight: '200px' }}>
                <div
                  ref={highlightLayerRef}
                  className="absolute inset-0 pointer-events-none overflow-hidden"
                  aria-hidden="true"
                  style={{ padding: EDITOR_PADDING, overflowY: 'hidden', overflowX: 'hidden' }}
                >
                  <SyntaxHighlighter
                    language={LANG_MAP[selectedLanguage] ?? selectedLanguage}
                    style={vscDarkPlus}
                    customStyle={{ margin: 0, padding: 0, background: 'transparent', fontSize: EDITOR_FONT_SIZE, lineHeight: EDITOR_LINE_HEIGHT, whiteSpace: 'pre', overflow: 'visible' }}
                    showLineNumbers={false}
                    wrapLongLines={false}
                  >
                    {myCode || ' '}
                  </SyntaxHighlighter>
                </div>
                <textarea
                  ref={myCodeTextareaRef}
                  value={myCode}
                  onChange={(e) => {
                    const newCode = e.target.value;
                    const oldLines = (myCode.match(/\n/g) || []).length;
                    const newLines = (newCode.match(/\n/g) || []).length;
                    const added = newLines - oldLines;
                    if (added > 0) {
                      window.dispatchEvent(new CustomEvent('bluej:lines-written', { detail: added }));
                    }
                    setMyCode(newCode);
                  }}
                  onScroll={syncHighlightScroll}
                  className="absolute inset-0 w-full h-full bg-transparent font-mono focus:outline-none resize-none overflow-auto"
                  style={{ padding: EDITOR_PADDING, lineHeight: EDITOR_LINE_HEIGHT, fontSize: EDITOR_FONT_SIZE, color: 'transparent', caretColor: '#e2e8f0', WebkitTextFillColor: 'transparent', zIndex: 1 }}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
                {!myCode && (
                  <div
                    className="absolute top-0 left-0 text-gray-600 font-mono pointer-events-none"
                    style={{ padding: EDITOR_PADDING, lineHeight: EDITOR_LINE_HEIGHT, fontSize: EDITOR_FONT_SIZE }}
                  >
                    # Write or paste your code here...
                  </div>
                )}
              </div>
            )}

            {/* ── Optimized View ── */}
            {activeTab === 'optimized' && optimizedCode && (
              <div className="flex flex-col h-full min-h-0">
                {/* Explanation banner */}
                <div className="flex-shrink-0 border-b border-yellow-400/20 bg-yellow-400/5 px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-[0.65rem] font-hud uppercase tracking-widest">Five Masters Optimization — Review Before Accepting</span>
                  </div>
                  <p className="text-[0.68rem] font-mono text-yellow-300/70 leading-relaxed">{optimizedExplanation}</p>

                  {/* Accept / Discard */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={acceptOptimized}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 rounded-sm text-xs font-hud uppercase tracking-wider transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Accept — Load into Workspace
                    </button>
                    <button
                      onClick={discardOptimized}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400/80 rounded-sm text-xs font-hud uppercase tracking-wider transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Discard
                    </button>
                  </div>
                </div>

                {/* Optimized code — read-only syntax highlight */}
                <div className="flex-1 overflow-auto p-4">
                  <SyntaxHighlighter
                    language={LANG_MAP[selectedLanguage] ?? selectedLanguage}
                    style={vscDarkPlus}
                    customStyle={{ margin: 0, padding: 0, background: 'transparent', fontSize: EDITOR_FONT_SIZE, lineHeight: EDITOR_LINE_HEIGHT }}
                    showLineNumbers
                    lineNumberStyle={{ color: '#4a5568', minWidth: '2.5em' }}
                  >
                    {optimizedCode}
                  </SyntaxHighlighter>
                </div>
              </div>
            )}
          </div>

          {/* ── Terminal Panel ── */}
          <AnimatePresence>
            {showTerminal && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: '42%' }}
                exit={{ height: 0 }}
                className="border-t border-primary/30 bg-[#0d0d0d] flex flex-col overflow-hidden"
              >
                {/* Terminal Header */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-primary/20 bg-black/80 flex-shrink-0">
                  <div className="flex items-center gap-2 text-xs font-hud text-primary/70 uppercase tracking-widest">
                    <TerminalIcon className="w-3.5 h-3.5" />
                    <span>Execution Terminal</span>
                    {(simulating || executing) && <Loader2 className="w-3 h-3 animate-spin text-accent" />}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Mode badge */}
                    {execResult && !simResult && (
                      <div className={`flex items-center gap-1.5 text-[0.65rem] font-hud px-2 py-0.5 rounded uppercase tracking-wider border ${
                        execResult.phase === 'blocked'
                          ? 'bg-red-900/30 border-red-500/30 text-red-400'
                          : 'bg-orange-900/30 border-orange-500/30 text-orange-400'
                      }`}>
                        <Bolt className="w-2.5 h-2.5" />
                        <span>{execResult.phase === 'blocked' ? 'BLOCKED' : 'SERVER EXEC'}</span>
                      </div>
                    )}
                    {simResult && !execResult && (
                      <div className="flex items-center gap-1.5 bg-green-900/30 border border-green-500/30 text-green-400 text-[0.65rem] font-hud px-2 py-0.5 rounded uppercase tracking-wider">
                        <Activity className="w-2.5 h-2.5" />
                        <span>AI SIM</span>
                      </div>
                    )}
                    <button onClick={() => setShowTerminal(false)} className="text-primary/40 hover:text-primary transition-colors p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Profile info bar (sim only) */}
                {simResult?.profile && (
                  <div className="px-3 py-1 bg-primary/5 border-b border-primary/10 text-[0.68rem] font-mono text-primary/50 flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <Cpu className="w-3 h-3 flex-shrink-0" />
                    <span>Target: <span className="text-primary/80">{simResult.profile.label}</span></span>
                    {simResult.profile.cores && <span>· {simResult.profile.cores}-core CPU</span>}
                    {simResult.profile.ramGb  && <span>· {simResult.profile.ramGb}GB RAM</span>}
                    {simResult.profile.gpu    && <span>· {simResult.profile.gpu}</span>}
                  </div>
                )}

                {/* Terminal Output */}
                <div ref={terminalRef} className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed">

                  {/* Running states */}
                  {simulating && <div className="text-green-500/70 animate-pulse">{'>'} Running AI simulation on {currentProfile.label}...</div>}
                  {executing  && <div className="text-orange-400/70 animate-pulse">{'>'} Executing code on live runtime...</div>}

                  {/* AI Simulation result */}
                  {simResult && !simulating && (() => {
                    const { terminalOutput: out, jComment: jc } = (() => {
                      const parts = simResult.output.split(/\n---\n?/);
                      return { terminalOutput: parts[0]?.trim() ?? '', jComment: parts[1]?.trim() ?? '' };
                    })();
                    return (
                      <>
                        <div className="text-green-400/50 mb-2 text-[0.68rem]">
                          {'>'} {new Date(simResult.simulatedAt).toLocaleTimeString()} — AI simulated output:
                        </div>
                        {out ? (
                          <pre className="text-green-300 whitespace-pre-wrap break-words leading-relaxed">{out}</pre>
                        ) : (
                          <span className="text-primary/40 italic">(no output)</span>
                        )}
                        {jc && (
                          <div className="mt-3 pt-2 border-t border-primary/10 text-cyan-400/80 italic text-[0.75rem]">
                            J.: {jc}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Real execution result */}
                  {execResult && !executing && (
                    <>
                      <div className="text-orange-400/60 mb-2 text-[0.68rem] flex items-center gap-2">
                        {'>'} {new Date(execResult.executedAt).toLocaleTimeString()} — server-side execution · {execResult.runtimeMs}ms
                        {execResult.timedOut && <span className="text-red-400 bg-red-400/10 border border-red-400/30 px-1.5 rounded">TIMEOUT (10s)</span>}
                        {!execResult.timedOut && (
                          <span className={`px-1.5 rounded border text-[0.6rem] ${
                            execResult.exitCode === 0
                              ? 'text-green-400 bg-green-400/10 border-green-400/30'
                              : 'text-red-400 bg-red-400/10 border-red-400/30'
                          }`}>
                            exit {execResult.exitCode}
                          </span>
                        )}
                        {execResult.phase === 'compile' && (
                          <span className="text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-1.5 rounded text-[0.6rem]">COMPILE ERROR</span>
                        )}
                      </div>
                      {execResult.stdout ? (
                        <pre className="text-orange-200/90 whitespace-pre-wrap break-words leading-relaxed mb-2">{execResult.stdout}</pre>
                      ) : (
                        !execResult.stderr && <span className="text-primary/40 italic">(no output)</span>
                      )}
                      {execResult.stderr && (
                        <div className="mt-1 pt-1 border-t border-red-500/20">
                          <div className="text-red-400/60 text-[0.65rem] mb-1 uppercase font-hud tracking-wider">stderr</div>
                          <pre className="text-red-300/80 whitespace-pre-wrap break-words leading-relaxed">{execResult.stderr}</pre>
                        </div>
                      )}
                    </>
                  )}

                  {/* Idle state */}
                  {!simulating && !executing && !simResult && !execResult && (
                    <div className="text-primary/30 italic space-y-1">
                      <p>No execution run yet.</p>
                      <p className="text-[0.7rem]">
                        "Simulate" uses AI to predict output on the selected hardware profile.
                        "Run" executes your code on the server (Python 3, Node.js, g++). Network access and subprocess calls are blocked.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Bottom Toolbar ── */}
        <div className="p-2 border-t border-primary/20 bg-secondary/50 flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">

            {/* Export */}
            <Tooltip content="Export code · GitHub push · Portfolio save" position="top">
              <button
                onClick={() => setShowDownload(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent/10 hover:bg-accent/20 border border-accent/40 text-accent rounded-sm transition-all text-xs font-hud uppercase tracking-wider"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </Tooltip>

            {/* Optimize (My Workspace only) */}
            {activeTab === 'my_code' && (
              <Tooltip content="Five Masters gauntlet — optimize for memory & performance. Shows result in Optimized tab for review." position="top">
                <button
                  onClick={handleOptimize}
                  disabled={optimizing || !myCode.trim()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 rounded-sm transition-all text-xs font-hud uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {optimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{optimizing ? 'Optimizing...' : 'Optimize'}</span>
                </button>
              </Tooltip>
            )}

            <Tooltip content="Scoped workspace tools â€” import files, inspect diffs, and write with approval" position="top">
              <button
                onClick={() => setShowWorkspaceManager(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-sm transition-all text-xs font-hud uppercase tracking-wider ${
                  selectedWorkspaceFileId
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-primary/20 text-primary/50 hover:text-primary/80'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Workspace</span>
              </button>
            </Tooltip>

            {/* Terminal Toggle */}
            <Tooltip content="Toggle terminal — shows simulation and real execution output" position="top">
              <button
                onClick={() => setShowTerminal(v => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-sm transition-all text-xs font-hud uppercase tracking-wider ${
                  showTerminal ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'border-primary/20 text-primary/50 hover:text-primary/80'
                }`}
              >
                <TerminalIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Terminal</span>
                {showTerminal ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </button>
            </Tooltip>

            {/* Hardware Profile Selector */}
            <div className="relative">
              <Tooltip content="Select hardware target for AI simulation" position="top">
                <button
                  ref={profileBtnRef}
                  onClick={() => {
                    if (!showProfileMenu && profileBtnRef.current) {
                      const r = profileBtnRef.current.getBoundingClientRect();
                      setProfileMenuPos({ top: r.top, left: r.left });
                    }
                    setShowProfileMenu(v => !v);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary/70 hover:text-primary rounded-sm transition-all text-xs font-hud uppercase tracking-wider"
                >
                  <Cpu className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">{currentProfile.shortLabel}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Right side: Simulate + Run */}
          <div className="flex items-center gap-2">

            {/* AI Simulate */}
            <Tooltip content="AI simulation — J. predicts output on the selected hardware profile. No local runtime needed." position="top">
              <button
                onClick={handleSimulate}
                disabled={isRunDisabled}
                className="flex items-center gap-2 px-3 py-2 bg-primary/20 hover:bg-primary/40 border border-primary/50 text-primary rounded-sm transition-all text-xs font-hud uppercase tracking-wider glow-border disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {simulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{simulating ? 'Simulating...' : 'Simulate'}</span>
              </button>
            </Tooltip>

            {/* Real Execute */}
            <Tooltip content="Real execution — runs on live Python 3, Node.js, or g++ (C++17). Actual output, actual errors." position="top">
              <button
                onClick={handleRealExecute}
                disabled={isRunDisabled}
                className="flex items-center gap-2 px-3 py-2 bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/50 text-orange-400 rounded-sm transition-all text-xs font-hud uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{executing ? 'Running...' : 'Run'}</span>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {showDownload && <DownloadModal onClose={() => setShowDownload(false)} />}
      {showWorkspaceManager && (
        <WorkspaceManagerModal
          onClose={() => setShowWorkspaceManager(false)}
          open={showWorkspaceManager}
        />
      )}

      {/* Profile dropdown — portal so overflow:hidden on the IDE panel doesn't clip it */}
      {showProfileMenu && createPortal(
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowProfileMenu(false)} />
          {/* Menu — positioned above the trigger button */}
          <div
            className="fixed z-[9999] bg-background border border-primary/30 rounded-sm min-w-[260px] shadow-xl shadow-black/80"
            style={{ top: profileMenuPos.top - 4, left: profileMenuPos.left, transform: 'translateY(-100%)' }}
          >
            <div className="px-3 py-2 border-b border-primary/20 text-[0.65rem] font-hud text-primary/50 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-3 h-3" />
              <span>Simulation Hardware Profile</span>
            </div>
            <div className="px-3 py-2 bg-green-900/20 border-b border-green-500/20">
              <p className="text-[0.65rem] text-green-400/80 font-mono leading-relaxed">
                ✓ AI Simulation Mode — J. predicts output for the selected target.
                Use "Run" for actual live server execution.
              </p>
            </div>
            {SIM_PROFILES.map(profile => (
              <button
                key={profile.id}
                onClick={() => { setSimHardwareProfile(profile.id); setShowProfileMenu(false); setSimResult(null); }}
                className={`w-full text-left px-3 py-2.5 flex items-start gap-3 hover:bg-primary/10 transition-colors border-b border-primary/10 last:border-0 ${simHardwareProfile === profile.id ? 'bg-primary/10' : ''}`}
              >
                <ChevronRight className={`w-3 h-3 mt-0.5 flex-shrink-0 ${simHardwareProfile === profile.id ? 'text-primary opacity-100' : 'opacity-0'}`} />
                <div>
                  <div className={`text-xs font-hud uppercase tracking-wider ${simHardwareProfile === profile.id ? 'text-primary' : 'text-primary/70'}`}>{profile.label}</div>
                  <div className="text-[0.65rem] text-primary/40 font-mono mt-0.5">{profile.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
