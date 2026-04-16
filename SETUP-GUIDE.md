# B.L.U.E.-J. Mobile PWA — Setup Guide

## Quick Start (Replit)

1. **Upload the zip** — Extract `bluej-mobile-pwa.zip` and replace your Replit files with the contents
2. **Install dependencies** — Run in Replit shell:
   ```bash
   npm install
   ```
3. **Run dev server** — Replit auto-starts, or:
   ```bash
   npm run dev
   ```
4. **Install on phone** — Open the Replit URL on your phone → browser menu → "Add to Home Screen"

## What Changed

### Modified Files (8)
| File | What Changed |
|------|-------------|
| `package.json` | Added `@mlc-ai/web-llm`, `vite-plugin-pwa`, `workbox-window` |
| `vite.config.ts` | Added VitePWA plugin with manifest + workbox caching |
| `index.html` | Added PWA meta tags, iOS `apple-mobile-web-app-capable`, theme-color |
| `src/main.tsx` | Added PWA service worker registration |
| `src/lib/store.ts` | Extended `activeTab` type to include `'goals' \| 'achievements'`; portfolio save fires gamification event |
| `src/pages/simulator.tsx` | Integrated DailyGoals, AchievementsPanel, UnlockToast, OfflineIndicator; tracks language/mode |
| `src/components/HudHeader.tsx` | Added Goals (🎯) and Achievements (🏅) tab buttons to mobile nav |
| `src/components/IdePanel.tsx` | Tracks lines written for gamification |
| `src/hooks/use-chat.ts` | Added progress tracking on message send + offline AI fallback via WebLLM |

### New Files (12)
| File | Purpose |
|------|---------|
| `src/lib/progress-store.ts` | Gamification engine — XP, levels, streaks, daily goals, milestones, achievements |
| `src/lib/offline-ai.ts` | WebLLM integration — runs Phi-3.5-mini in-browser via WebGPU |
| `src/components/DailyGoals.tsx` | Daily missions panel with progress bars, stats, streak display |
| `src/components/AchievementsPanel.tsx` | Milestones progress + achievements grid with rarity colors |
| `src/components/UnlockToast.tsx` | Animated notification toast when milestones/achievements unlock |
| `src/components/OfflineIndicator.tsx` | Online/offline status banner |
| `src/hooks/use-progress-events.ts` | Bridges store events → gamification tracking |
| `src/vite-env.d.ts` | TypeScript declarations for PWA virtual imports |
| `public/favicon.svg` | App favicon |
| `public/icons/icon.svg` | Source SVG icon |
| `public/icons/icon-192.png` | 192×192 PWA icon |
| `public/icons/icon-512.png` | 512×512 PWA icon (also maskable) |

## Features Added

### 📱 PWA (Installable App)
- Works on Android + iOS via "Add to Home Screen"
- All assets cached offline by service worker (Workbox)
- Google Fonts cached for offline use
- App icon + splash screen with B.L.U.E.-J. branding

### 🎯 Daily Goals (5 per day)
- Randomly selected from 16 templates each day
- Categories: chat, code, debug, portfolio, explore, challenge
- XP rewards on completion (20-100 XP each)
- Progress bars with real-time tracking

### ⭐ XP & Levels
- XP earned from completing goals
- Level formula: Level N requires N×100 XP
- Visual level progress bar

### 🔥 Streaks
- Tracked automatically on each session
- Current streak + longest streak displayed
- Streak-based milestones (3, 7, 30 days)

### 🏆 18 Milestones
- XP milestones (100 → 10,000)
- Session milestones (5 → 100)
- Lines written (100 → 10,000)
- Questions asked, streaks, projects saved

### 🏅 14 Achievements (4 rarities)
- **Common**: First Steps, Hello World, Saver
- **Rare**: Night Owl, Early Bird, Polyglot, Shapeshifter, Perfect Day
- **Epic**: Two Week Titan, Double Digits, Thousand Lines Club
- **Legendary**: Unstoppable, Grandmaster, 10K Club

### 🤖 Offline AI (WebLLM)
- Phi-3.5-mini runs entirely in-browser via WebGPU
- ~2GB one-time download, then works without internet
- Automatic fallback when server is unreachable
- Adapts personality to learner mode (kids/teen/adult/advanced)

## Mobile UX
- 4-tab mobile nav: Chat | IDE | Goals | Achievements
- Goals & Achievements are mobile-only tabs (desktop shows chat + IDE side-by-side)
- Touch-optimized cards and progress bars
- Haptic-style animations via Framer Motion
