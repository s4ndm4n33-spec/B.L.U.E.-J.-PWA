import { useState } from 'react';
import { useBlueJStore } from '@/lib/store';
import {
  X, Download, Cpu, Database, HardDrive, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, Github, BookOpen, Loader2, ExternalLink,
  Trash2, FolderOpen, Plus, Lock, Globe, Code2
} from 'lucide-react';

interface Props {
  onClose: () => void;
}

function getModelRecommendation(ram: number | null) {
  if (!ram) return { name: "llama3.2:3b", display: "Llama 3.2 3B", size: "2.0GB", reason: "Default — balanced performance" };
  if (ram <= 2) return { name: "tinyllama:1.1b", display: "TinyLlama 1.1B", size: "0.6GB", reason: "Ultra-lightweight for low RAM" };
  if (ram <= 4) return { name: "phi3:mini", display: "Phi-3 Mini 3.8B", size: "2.3GB", reason: "Microsoft's efficient coding model" };
  if (ram <= 8) return { name: "llama3.2:3b", display: "Llama 3.2 3B", size: "2.0GB", reason: "Fast, capable, hardware-friendly" };
  if (ram <= 16) return { name: "llama3.1:8b", display: "Llama 3.1 8B", size: "4.7GB", reason: "Full-power instruction following" };
  if (ram <= 32) return { name: "codellama:13b", display: "CodeLlama 13B", size: "7.4GB", reason: "Code-specialized, near-GPT4 quality" };
  return { name: "codellama:34b", display: "CodeLlama 34B", size: "19.0GB", reason: "Studio-grade code assistance" };
}

type Tab = 'offline' | 'github' | 'portfolio';

export function DownloadModal({ onClose }: Props) {
  const {
    selectedOs, selectedLanguage, hardwareInfo, myCode,
    portfolio, saveToPortfolio, loadFromPortfolio, deleteFromPortfolio,
  } = useBlueJStore();

  const [tab, setTab] = useState<Tab>('offline');

  // Offline tab
  const [downloading, setDownloading] = useState<'j' | 'clone' | null>(null);
  const [done, setDone] = useState<'j' | 'clone' | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // GitHub tab
  const [ghToken, setGhToken] = useState('');
  const [ghOwner, setGhOwner] = useState('');
  const [ghRepo, setGhRepo] = useState('');
  const [ghPrivate, setGhPrivate] = useState(false);
  const [ghPushing, setGhPushing] = useState(false);
  const [ghResult, setGhResult] = useState<{ url: string; fileUrl: string; created: boolean } | null>(null);
  const [ghError, setGhError] = useState('');

  // Portfolio tab
  const [saveName, setSaveName] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  const model = getModelRecommendation(hardwareInfo.ramGb);
  const isMobile = selectedOs === 'android' || selectedOs === 'ios';

  const buildUrl = (type: 'j' | 'clone') => {
    const base = `/api/bluej/download/${type}`;
    const params = new URLSearchParams({
      os: selectedOs,
      language: selectedLanguage,
      ...(hardwareInfo.cpuCores != null ? { cpuCores: String(hardwareInfo.cpuCores) } : {}),
      ...(hardwareInfo.ramGb != null ? { ramGb: String(hardwareInfo.ramGb) } : {}),
      ...(type === 'clone' && myCode ? { code: myCode } : {}),
    });
    return `${base}?${params.toString()}`;
  };

  const handleDownload = async (type: 'j' | 'clone') => {
    setDownloading(type);
    try {
      const a = document.createElement('a');
      a.href = buildUrl(type);
      a.download = type === 'j' ? 'bluej-offline.zip' : 'my-ai-clone.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => { setDownloading(null); setDone(type); setTimeout(() => setDone(null), 4000); }, 1500);
    } catch { setDownloading(null); }
  };

  const handleGitHubPush = async () => {
    setGhPushing(true);
    setGhError('');
    setGhResult(null);
    try {
      const resp = await fetch('/api/bluej/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: ghToken.trim(),
          owner: ghOwner.trim(),
          repo: ghRepo.trim(),
          code: myCode,
          language: selectedLanguage,
          isPrivate: ghPrivate,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        setGhError(data.error || 'Push failed. Please try again.');
      } else {
        setGhResult({ url: data.repoUrl, fileUrl: data.fileUrl, created: data.created });
      }
    } catch {
      setGhError('Network error — could not reach the server.');
    } finally {
      setGhPushing(false);
    }
  };

  const handleSavePortfolio = () => {
    if (!myCode.trim()) return;
    saveToPortfolio(saveName || `${selectedLanguage} project`, saveNotes);
    setSaveName('');
    setSaveNotes('');
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  };

  const handleLoad = (id: string) => {
    loadFromPortfolio(id);
    setLoadedId(id);
    setTimeout(() => { setLoadedId(null); onClose(); }, 600);
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'offline', label: 'Offline', icon: <Download className="w-3.5 h-3.5" /> },
    { id: 'github',  label: 'GitHub',  icon: <Github className="w-3.5 h-3.5" /> },
    { id: 'portfolio', label: 'Portfolio', icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg hud-panel border border-primary/40 bg-background rounded-sm overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20 bg-secondary/50 flex-shrink-0">
          <span className="font-hud text-primary uppercase tracking-widest text-sm">Export & Save</span>
          <button onClick={onClose} className="text-primary/50 hover:text-primary transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-primary/20 bg-secondary/30 flex-shrink-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-hud uppercase tracking-widest transition-colors ${
                tab === t.id
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-primary/40 hover:text-primary/70 border-b-2 border-transparent'
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto flex-1">

          {/* ── OFFLINE TAB ── */}
          {tab === 'offline' && (
            <div className="p-5 space-y-4">
              {/* Hardware Profile */}
              <div className="border border-primary/20 rounded-sm p-3 bg-secondary/30 space-y-2">
                <p className="text-xs font-hud text-primary/60 uppercase tracking-widest mb-2">Your Hardware Profile</p>
                <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                  <div className="flex flex-col items-center gap-1 p-2 border border-primary/10 rounded-sm bg-background/50">
                    <Cpu className="w-4 h-4 text-primary/70" />
                    <span className="text-primary/50">CPU</span>
                    <span className="text-primary font-bold">{hardwareInfo.cpuCores ?? '?'} cores</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 border border-primary/10 rounded-sm bg-background/50">
                    <Database className="w-4 h-4 text-primary/70" />
                    <span className="text-primary/50">RAM</span>
                    <span className="text-primary font-bold">{hardwareInfo.ramGb != null ? hardwareInfo.ramGb + 'GB' : '?'}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 border border-primary/10 rounded-sm bg-background/50">
                    <HardDrive className="w-4 h-4 text-accent/70" />
                    <span className="text-accent/50">OS</span>
                    <span className="text-accent font-bold uppercase">{selectedOs}</span>
                  </div>
                </div>
                {!hardwareInfo.cpuCores && !hardwareInfo.ramGb && (
                  <p className="text-xs text-yellow-500/80 flex items-center gap-1.5 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    Authorize hardware access in the HUD for a tailored package.
                  </p>
                )}
              </div>

              {/* Download J. */}
              <div className="border border-primary/30 rounded-sm overflow-hidden">
                <div className="bg-primary/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-hud text-primary text-sm uppercase tracking-widest mb-1">J. — Offline Edition</h3>
                      <p className="text-xs text-primary/60 leading-relaxed">
                        Your AI mentor, running entirely on your machine. No API keys. No internet.
                        Full curriculum. Complete privacy.
                      </p>
                      {isMobile && (
                        <p className="text-xs text-yellow-500/80 mt-2 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          Mobile devices have limited local LLM support. See README for options.
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDownload('j')}
                      disabled={downloading === 'j'}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-sm border text-sm font-hud uppercase tracking-wider transition-all whitespace-nowrap flex-shrink-0 ${
                        done === 'j'
                          ? 'border-green-500/50 bg-green-500/10 text-green-400'
                          : 'border-primary/50 bg-primary/10 hover:bg-primary/25 text-primary glow-border'
                      } disabled:opacity-50 disabled:cursor-wait`}
                    >
                      {done === 'j' ? <><CheckCircle2 className="w-4 h-4" /> Sent</>
                        : downloading === 'j' ? <span className="animate-pulse">Packaging...</span>
                        : <><Download className="w-4 h-4" /> Download</>}
                    </button>
                  </div>

                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-1.5 mt-3 text-xs text-primary/50 hover:text-primary/80 transition-colors"
                  >
                    {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Recommended model: <span className="text-primary font-mono ml-1">{model.display}</span> ({model.size})
                  </button>

                  {showDetails && (
                    <div className="mt-3 bg-black/30 border border-primary/10 rounded-sm p-3 text-xs font-mono space-y-1">
                      {[
                        ['Model', model.name],
                        ['Download size', `${model.size} (one-time)`],
                        ['Why this model', model.reason],
                        ['Runtime', 'Ollama (local)'],
                        ['Internet required', 'Setup only'],
                        ['After setup', '100% offline'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4">
                          <span className="text-primary/50">{k}</span>
                          <span className={v === '100% offline' || v === 'Setup only' ? 'text-green-400' : 'text-primary/80'}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Download Clone */}
              <div className="border border-accent/30 rounded-sm overflow-hidden">
                <div className="bg-accent/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-hud text-accent text-sm uppercase tracking-widest mb-1">My AI Clone</h3>
                      <p className="text-xs text-accent/60 leading-relaxed">
                        Your workspace code, packaged as a standalone{' '}
                        <span className="font-mono text-accent/80">{selectedLanguage}</span> project.
                        {!myCode.trim() || myCode.includes("Hello, J.")
                          ? " Includes a starter template."
                          : " Includes your custom code."}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownload('clone')}
                      disabled={downloading === 'clone'}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-sm border text-sm font-hud uppercase tracking-wider transition-all whitespace-nowrap flex-shrink-0 ${
                        done === 'clone'
                          ? 'border-green-500/50 bg-green-500/10 text-green-400'
                          : 'border-accent/50 bg-accent/10 hover:bg-accent/25 text-accent'
                      } disabled:opacity-50 disabled:cursor-wait`}
                    >
                      {done === 'clone' ? <><CheckCircle2 className="w-4 h-4" /> Sent</>
                        : downloading === 'clone' ? <span className="animate-pulse">Packaging...</span>
                        : <><Download className="w-4 h-4" /> Download</>}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-primary/30 text-center font-mono">
                Both packages are self-contained. No account or connection required after first-time model download.
              </p>
            </div>
          )}

          {/* ── GITHUB TAB ── */}
          {tab === 'github' && (
            <div className="p-5 space-y-4">
              <div className="border border-primary/20 rounded-sm p-3 bg-secondary/30">
                <p className="text-[0.68rem] font-mono text-primary/60 leading-relaxed">
                  Push your workspace code directly to a GitHub repository.
                  You need a{' '}
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=BLUEJ-Export"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    Personal Access Token
                  </a>
                  {' '}with <span className="font-mono text-primary/80">repo</span> scope.
                  Your token is never stored — it is used once for this push only.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[0.65rem] font-hud text-primary/60 uppercase tracking-widest mb-1">
                    GitHub Username
                  </label>
                  <input
                    type="text"
                    value={ghOwner}
                    onChange={e => setGhOwner(e.target.value)}
                    placeholder="your-username"
                    className="w-full bg-black/40 border border-primary/20 rounded-sm px-3 py-2 text-sm font-mono text-primary/90 focus:outline-none focus:border-primary/50 placeholder:text-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-[0.65rem] font-hud text-primary/60 uppercase tracking-widest mb-1">
                    Repository Name
                  </label>
                  <input
                    type="text"
                    value={ghRepo}
                    onChange={e => setGhRepo(e.target.value)}
                    placeholder="my-ai-clone"
                    className="w-full bg-black/40 border border-primary/20 rounded-sm px-3 py-2 text-sm font-mono text-primary/90 focus:outline-none focus:border-primary/50 placeholder:text-primary/30"
                  />
                  <p className="text-[0.62rem] text-primary/40 font-mono mt-1">New repo will be created if it does not exist.</p>
                </div>

                <div>
                  <label className="block text-[0.65rem] font-hud text-primary/60 uppercase tracking-widest mb-1">
                    Personal Access Token
                  </label>
                  <input
                    type="password"
                    value={ghToken}
                    onChange={e => setGhToken(e.target.value)}
                    placeholder="ghp_••••••••••••••••••••••••••••••••"
                    className="w-full bg-black/40 border border-primary/20 rounded-sm px-3 py-2 text-sm font-mono text-primary/90 focus:outline-none focus:border-primary/50 placeholder:text-primary/30"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGhPrivate(!ghPrivate)}
                    className={`flex items-center gap-2 px-3 py-1.5 border rounded-sm text-xs font-hud uppercase tracking-wider transition-all ${
                      ghPrivate
                        ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
                        : 'border-primary/20 text-primary/50 hover:text-primary/80'
                    }`}
                  >
                    {ghPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                    {ghPrivate ? 'Private' : 'Public'}
                  </button>
                  <span className="text-[0.62rem] text-primary/40 font-mono">
                    {ghPrivate ? 'Only you can see this repository.' : 'Anyone can view this repository.'}
                  </span>
                </div>
              </div>

              {ghError && (
                <div className="border border-red-500/30 bg-red-500/10 rounded-sm p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-mono text-red-400/90">{ghError}</p>
                </div>
              )}

              {ghResult && (
                <div className="border border-green-500/30 bg-green-500/10 rounded-sm p-3 space-y-2">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs font-hud uppercase tracking-wider">
                      {ghResult.created ? 'Repository created & code pushed' : 'Code pushed successfully'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <a
                      href={ghResult.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-mono text-primary/70 hover:text-primary underline underline-offset-2"
                    >
                      <Github className="w-3 h-3" /> {ghResult.url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={ghResult.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-mono text-accent/70 hover:text-accent underline underline-offset-2"
                    >
                      <Code2 className="w-3 h-3" /> View file on GitHub
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              <button
                onClick={handleGitHubPush}
                disabled={ghPushing || !ghToken.trim() || !ghOwner.trim() || !ghRepo.trim() || !myCode.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary rounded-sm transition-all text-sm font-hud uppercase tracking-wider glow-border disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {ghPushing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Pushing to GitHub...</>
                  : <><Github className="w-4 h-4" /> Push to GitHub</>
                }
              </button>

              <p className="text-[0.62rem] text-primary/30 text-center font-mono">
                Your token is sent only to the B.L.U.E.-J. server for this single request and is never logged or stored.
              </p>
            </div>
          )}

          {/* ── PORTFOLIO TAB ── */}
          {tab === 'portfolio' && (
            <div className="p-5 space-y-4">
              {/* Save current workspace */}
              <div className="border border-accent/30 rounded-sm p-4 bg-accent/5 space-y-3">
                <p className="text-xs font-hud text-accent/80 uppercase tracking-widest">Save Current Workspace</p>
                <input
                  type="text"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder={`${selectedLanguage} project — ${new Date().toLocaleDateString()}`}
                  className="w-full bg-black/40 border border-accent/20 rounded-sm px-3 py-2 text-sm font-mono text-primary/90 focus:outline-none focus:border-accent/50 placeholder:text-primary/30"
                />
                <textarea
                  value={saveNotes}
                  onChange={e => setSaveNotes(e.target.value)}
                  placeholder="Optional notes (what this code does, what lesson it's from...)"
                  rows={2}
                  className="w-full bg-black/40 border border-accent/20 rounded-sm px-3 py-2 text-xs font-mono text-primary/80 focus:outline-none focus:border-accent/50 placeholder:text-primary/30 resize-none"
                />
                <button
                  onClick={handleSavePortfolio}
                  disabled={!myCode.trim() || justSaved}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-sm text-sm font-hud uppercase tracking-wider transition-all ${
                    justSaved
                      ? 'border-green-500/50 bg-green-500/10 text-green-400'
                      : 'border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {justSaved
                    ? <><CheckCircle2 className="w-4 h-4" /> Saved to Portfolio</>
                    : <><Plus className="w-4 h-4" /> Save Snapshot</>
                  }
                </button>
              </div>

              {/* Saved entries */}
              <div>
                <p className="text-[0.65rem] font-hud text-primary/50 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <BookOpen className="w-3 h-3" />
                  Saved Projects ({portfolio.length})
                </p>

                {portfolio.length === 0 ? (
                  <div className="border border-primary/10 rounded-sm p-6 text-center">
                    <p className="text-xs font-mono text-primary/30">No saved projects yet.</p>
                    <p className="text-[0.65rem] font-mono text-primary/20 mt-1">Use "Save Snapshot" above to store your workspace code.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {portfolio.map(entry => (
                      <div
                        key={entry.id}
                        className={`border rounded-sm p-3 transition-colors ${
                          loadedId === entry.id
                            ? 'border-green-500/40 bg-green-500/5'
                            : 'border-primary/15 bg-secondary/20 hover:bg-secondary/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-hud text-primary/90 truncate">{entry.name}</span>
                              <span className="text-[0.6rem] font-mono text-primary/40 uppercase bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">
                                {entry.language}
                              </span>
                            </div>
                            <p className="text-[0.62rem] font-mono text-primary/40">
                              {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {entry.notes && (
                              <p className="text-[0.65rem] font-mono text-primary/50 mt-1 leading-relaxed">{entry.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleLoad(entry.id)}
                              className="p-1.5 border border-primary/20 hover:border-accent/50 hover:bg-accent/10 text-primary/50 hover:text-accent rounded-sm transition-all"
                              title="Load into workspace"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                            </button>
                            {confirmDelete === entry.id ? (
                              <button
                                onClick={() => { deleteFromPortfolio(entry.id); setConfirmDelete(null); }}
                                className="p-1.5 border border-red-500/40 bg-red-500/10 text-red-400 rounded-sm text-[0.6rem] font-hud uppercase tracking-wider px-2"
                              >
                                Confirm
                              </button>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(entry.id)}
                                className="p-1.5 border border-primary/20 hover:border-red-500/40 hover:bg-red-500/10 text-primary/30 hover:text-red-400 rounded-sm transition-all"
                                title="Delete snapshot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
