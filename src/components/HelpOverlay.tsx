import { X, Terminal, Code2, Zap, Play, Download, GraduationCap, Cpu, Mic, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpOverlayProps {
  open: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    icon: Terminal,
    title: 'Chat Panel (Left)',
    color: 'text-primary',
    border: 'border-primary/30',
    items: [
      'Type a message and press Enter or click Send to talk to J.',
      'J. responds in character — dry wit, precise, British. He teaches you to build a local AI.',
      'Click the mic icon to speak instead of type (voice-to-text via Whisper).',
      'J. reads his responses aloud automatically (OpenAI TTS — Echo voice).',
      'The learner mode button (graduation cap) cycles through Kids → Teen → Beginner → Advanced, adjusting vocabulary and complexity.',
    ],
  },
  {
    icon: Code2,
    title: 'IDE Panel (Right)',
    color: 'text-accent',
    border: 'border-accent/30',
    items: [
      "J.'s Synthesis tab — J.'s latest code block, syntax-highlighted and ready to copy.",
      'My Workspace tab — your personal code editor with live syntax highlighting.',
      'Copy button — copies whichever tab is active to clipboard.',
      "Language badge (top-right) — shows the current code language.",
    ],
  },
  {
    icon: Zap,
    title: 'Optimize Button',
    color: 'text-yellow-400',
    border: 'border-yellow-500/30',
    items: [
      'Appears in My Workspace tab only.',
      "Sends your code through J.'s Five Masters gauntlet — Korotkevich (efficiency), Torvalds (rigor), Carmack (optimization), Hamilton (reliability), Ritchie (fundamentals).",
      'Returns memory-optimized, performance-tuned code and explains every change.',
      'Optimized code replaces your workspace code automatically.',
    ],
  },
  {
    icon: Play,
    title: 'Simulate Execution',
    color: 'text-green-400',
    border: 'border-green-500/30',
    items: [
      'Runs your code through AI simulation — no Python, Node.js, or compiler needed.',
      'J. predicts the exact output your code would produce on the selected hardware.',
      'Use the CPU dropdown to select a hardware target: your machine, a Raspberry Pi, Cloud GPU, etc.',
      'J. will flag memory errors, import delays, CUDA issues, and more — just like a real runtime.',
    ],
  },
  {
    icon: Cpu,
    title: 'Hardware Profile',
    color: 'text-primary/70',
    border: 'border-primary/20',
    items: [
      'Choose from 6 profiles: Auto-detect, High-End Workstation, Mid-Range PC, Budget Laptop, Raspberry Pi 4, Cloud GPU.',
      'Auto uses your actual detected hardware (CPU cores + RAM).',
      "J.'s simulation and advice adapt to whichever target you select.",
    ],
  },
  {
    icon: Download,
    title: 'Export',
    color: 'text-accent',
    border: 'border-accent/30',
    items: [
      'Download an offline package containing your code, setup instructions, and model recommendations for your hardware.',
    ],
  },
  {
    icon: GraduationCap,
    title: 'Learner Mode (HUD Header)',
    color: 'text-accent',
    border: 'border-accent/30',
    items: [
      'Click to cycle: KIDS (8–12) → TEEN (13–17) → BEGINNER → ADVANCED.',
      "Adjusts J.'s vocabulary, code complexity, and teaching pace.",
      'Change at any time — takes effect on the next message.',
    ],
  },
  {
    icon: Shield,
    title: 'Safety Protocols',
    color: 'text-green-400',
    border: 'border-green-500/30',
    items: [
      "Asimov's Three Laws and the ANTI-ULTRON protocol are always active.",
      'J. will not assist with malware, exploits, or anything designed to harm people.',
      "Normal coding topics — including security education, system calls, and error handling — are always permitted.",
      'If J. ever flags something incorrectly, simply rephrase in a coding context.',
    ],
  },
];

export function HelpOverlay({ open, onClose }: HelpOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-8"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            className="relative w-full max-w-3xl bg-background border border-primary/30 rounded-sm shadow-2xl shadow-black/80 my-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20">
              <div>
                <h2 className="font-display font-bold text-lg text-primary glow-text tracking-widest">
                  B.L.U.E.-J. — WORKSPACE GUIDE
                </h2>
                <p className="text-[0.65rem] font-mono text-primary/50 uppercase tracking-widest mt-0.5">
                  How to interact with the simulation
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-primary/40 hover:text-primary transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Intro */}
            <div className="px-6 py-4 border-b border-primary/10 bg-primary/5">
              <p className="text-xs font-mono text-primary/70 leading-relaxed">
                <span className="text-primary font-bold">B.L.U.E.-J.</span> — <span className="text-primary/90">Build. Learn. Utilize. Engineer.</span> — is an AI coding mentor simulator.
                J. teaches Python, C++, and JavaScript with the goal of helping you build a local AI assistant on your own hardware.
                Write code in your workspace, run it live on the server, or use AI simulation to predict output on any hardware profile.
              </p>
            </div>

            {/* Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-primary/10">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <div key={section.title} className={`px-5 py-4 border-b ${section.border} border-opacity-20`}>
                    <div className={`flex items-center gap-2 mb-2 ${section.color}`}>
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-[0.7rem] font-hud uppercase tracking-widest font-semibold">
                        {section.title}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {section.items.map((item, i) => (
                        <li key={i} className="text-[0.68rem] font-mono text-primary/60 leading-relaxed flex gap-2">
                          <span className="text-primary/30 flex-shrink-0">›</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-primary/20 bg-secondary/30 flex items-center justify-between">
              <p className="text-[0.6rem] font-mono text-primary/30 uppercase tracking-widest">
                ANTI-ULTRON PROTOCOL ACTIVE · ASIMOV LAWS ENFORCED
              </p>
              <button
                onClick={onClose}
                className="text-xs font-hud uppercase tracking-widest text-primary/60 hover:text-primary transition-colors border border-primary/20 px-3 py-1 rounded-sm hover:bg-primary/10"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
