# B.L.U.E.-J. Patch Pack — v1.1

All fixes and new features for the B.L.U.E.-J. PWA.

---

## 🐛 BUG FIX: Portrait Mode Banner Covering Buttons

**Problem:** The `HardwareStrip` (SYSTEM.ONLINE / CORES / MEM bar) used `position: fixed; bottom: 0` which covered the IDE toolbar buttons and chat input in portrait mode.

**Fix:** Two files changed:

| File | What Changed |
|------|-------------|
| `components/HardwareStrip.tsx` | Removed `fixed bottom-0`. Now in normal flex flow. Collapsible on mobile (tiny 28px bar, tap to expand). Same look on desktop. |
| `pages/simulator.tsx` | Removed `pb-14 md:pb-16` padding hack — no longer needed since strip is in flow. |

**How to apply:** Drop-in replace both files. Zero config changes needed.

---

## 🎤 NEW: Voice Chat Mode (Always-On Mic)

**File:** `hooks/use-voice-chat.ts`

Full voice conversation system using the Web Speech API:
- **Always-listening mode** — mic stays hot, user speaks naturally
- **Auto-pause** when J. is responding/speaking TTS (prevents feedback)
- **Auto-resume** after J. finishes speaking
- **Visual states:** inactive → listening → processing → responding → speaking
- **Interim transcription** — shows what user is saying in real-time
- **Fallback:** Works on Chrome, Edge, Safari. Push-to-talk fallback for Firefox.

**Integration:** Import `useVoiceChat` in `ChatPanel.tsx`, add a "Voice Mode" toggle button. When active, it replaces the push-to-talk mic with continuous listening. Wire `setSpeaking` / `setDoneSpeaking` to the existing TTS audio events.

---

## 🔀 NEW: Local vs Cloud AI Toggle

**Files:**
- `lib/ai-provider.ts` — Provider store (auto / cloud / local)
- `components/AIProviderSettings.tsx` — Settings UI panel

Features:
- **Three modes:** Auto (smart fallback), Cloud (server API), Local (WebLLM in-browser)
- **Custom endpoints** — point to Ollama (`http://localhost:11434/v1`), LM Studio, or any OpenAI-compatible API
- **Saved endpoints** — store multiple custom endpoints, switch between them
- **Model download UI** — progress bar for the ~2GB local model download
- **WebGPU detection** — warns if the device can't run local AI

**Integration:** Import `resolveProvider()` from `ai-provider.ts` in `use-chat.ts`. Replace the existing `navigator.onLine` check with `resolveProvider()` to decide cloud vs local. Use `useAIProviderStore().cloudEndpoint` for the fetch URL.

**How the optimizer works offline:** In `IdePanel.tsx`, the `handleOptimize` function currently hits `/api/bluej/optimize`. When provider is `local`, instead call `chatOffline()` with an optimization prompt. The `offline-ai.ts` module already supports this — just pass the right system prompt.

---

## 🛡️ NEW: Self-Correction System (Fixes With Permission)

**Files:**
- `lib/self-correct.ts` — Error interceptor + fix proposal engine + permission gate
- `components/SelfCorrectPanel.tsx` — Diagnostics UI

Architecture:
1. **Error Interceptor** — catches runtime errors, console errors, failed API calls automatically
2. **AI Analyzer** — sends error context to AI (local or cloud) for diagnosis
3. **Fix Proposals** — AI proposes fixes with confidence scores
4. **Permission Gate** — USER MUST APPROVE every fix before it's applied
5. **Rollback** — every fix stores a snapshot, can be undone

**Integration:**
1. In `main.tsx`, call `installErrorInterceptor()` on app startup
2. Add a "Diagnostics" button to `HudHeader.tsx` (shield icon) — opens `SelfCorrectPanel`
3. When `autoAnalyze` is on and an issue is reported, call `analyzeAndProposeFix()` with the issue

---

## 💪 NEW: Wellness & Health Gamification

**Files:**
- `lib/wellness-store.ts` — Health tracking store (water, stretches, eye rest, mood, sessions)
- `components/WellnessPanel.tsx` — Full wellness dashboard (mobile tab)
- `components/BreakReminder.tsx` — Pomodoro-style break popup

Features:
- **Coding session timer** with Pomodoro-style break reminders (default 25min)
- **Hydration tracker** — log glasses of water, daily goal
- **Stretch tracker** — log stretch breaks
- **Eye rest tracker** — 20-20-20 rule reminders
- **Mood check-ins** — emoji-based mood logging throughout the day
- **Wellness streak** — maintain streak by logging water + stretch daily
- **Break reminder overlay** — gentle popup suggesting specific wellness action
- **Snooze** — dismiss reminder for 5 minutes
- **All-time stats** — total hours coded, total breaks, hydration history

**Integration:**
1. In `simulator.tsx`, add `<BreakReminder />` and the `WellnessPanel` tab (already in the patched file)
2. In `HudHeader.tsx`, add a Heart icon tab for mobile → `activeTab: 'wellness'`
3. In `store.ts`, extend `activeTab` type: `'chat' | 'ide' | 'goals' | 'achievements' | 'wellness'`

---

## 📦 NEW: Standalone Desktop + Mobile App Packaging

### Desktop (Electron)

**Files:**
- `configs/electron-main.js` → copy to project root as `electron-main.js`
- `configs/electron-builder.json` → copy to project root

**Setup:**
```bash
npm install electron electron-builder --save-dev
```

**Add to `package.json`:**
```json
{
  "main": "electron-main.js",
  "scripts": {
    "electron:dev": "electron .",
    "electron:build": "npm run build && electron-builder --config electron-builder.json"
  }
}
```

**Build outputs:**
- Windows: `.exe` installer + portable `.exe`
- macOS: `.dmg`
- Linux: `.AppImage` + `.deb`

Bundles the Express API server inside the app. No Replit, no Vercel, no internet needed. Download, install, run.

### Mobile (Capacitor)

**File:** `configs/capacitor.config.ts` → copy to project root

**Setup:**
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "B.L.U.E.-J." "com.bluej.simulator" --web-dir dist
npx cap add android
npm run build && npx cap sync
npx cap open android   # → Build APK in Android Studio
```

Produces a native APK that runs the full app locally. WebGPU-enabled for local AI.

---

## 📁 File Map

```
components/
├── HardwareStrip.tsx         ← REPLACE (portrait mode fix)
├── AIProviderSettings.tsx    ← NEW (local/cloud toggle UI)
├── SelfCorrectPanel.tsx      ← NEW (diagnostics UI)
├── WellnessPanel.tsx         ← NEW (health dashboard)
├── BreakReminder.tsx         ← NEW (break popup)
├── simulator.tsx             ← REPLACE (pages/simulator.tsx)

hooks/
├── use-voice-chat.ts         ← NEW (continuous voice mode)

lib/
├── ai-provider.ts            ← NEW (local/cloud/auto store)
├── self-correct.ts           ← NEW (error interceptor + fix engine)
├── wellness-store.ts         ← NEW (health tracking store)

configs/
├── electron-main.js          ← NEW (desktop app entry)
├── electron-builder.json     ← NEW (desktop build config)
├── capacitor.config.ts       ← NEW (mobile app config)
```

---

## Priority Order

1. ✅ **Portrait fix** — drop in, instant fix
2. ✅ **AI toggle** — unlocks offline/local/cloud choice
3. ✅ **Voice chat** — full conversation mode
4. ✅ **Wellness** — health gamification
5. ✅ **Self-correct** — auto-diagnostics
6. ✅ **Standalone packaging** — downloadable apps
