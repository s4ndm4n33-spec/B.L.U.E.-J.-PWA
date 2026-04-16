# B.L.U.E.-J. Mobile PWA Expansion

A sovereign, mobile-first evolution of the B.L.U.E.-J. development engine. This expansion transforms the core simulator into a Progressive Web App (PWA) with integrated offline AI and a gamified learning framework.

## 🚀 Key Features

### 📱 PWA & Mobile UX
- **Installable**: Full PWA support for Android and iOS via "Add to Home Screen".
- **Offline First**: Workbox-powered caching for all assets, including Google Fonts.
- **Touch-Optimized**: 4-tab mobile navigation (Chat, IDE, Goals, Achievements) with haptic-style Framer Motion animations.

### 🤖 Localized Intelligence
- **Offline AI**: Integration of `@mlc-ai/web-llm` running Phi-3.5-mini entirely in-browser via WebGPU.
- **Adaptive Persona**: AI personality scales based on learner mode (Kids/Teen/Adult/Advanced).
- **Smart Fallback**: Automatic transition to local inference when server connectivity is lost.

### 🎯 Gamification Engine
- **Daily Goals**: 5 randomized missions per day across coding, debugging, and exploration.
- **XP & Leveling**: Level-based progression system ($Level \times 100\ XP$).
- **Achievements**: 14 unlockable badges across 4 rarity tiers (Common to Legendary).
- **Milestones**: 18 tracked metrics including "Thousand Lines Club" and session streaks.

## 🛠️ Technical Architecture

### Modified Files
- `package.json`: Added PWA and WebLLM dependencies.
- `vite.config.ts`: Configured VitePWA plugin and manifest.
- `src/lib/store.ts`: Extended state for mobile tabs and gamification events.
- `src/hooks/use-chat.ts`: Integrated progress tracking and offline fallback.

### New Modules
- `src/lib/progress-store.ts`: Core gamification and XP logic.
- `src/lib/offline-ai.ts`: WebLLM/WebGPU implementation.
- `src/components/UnlockToast.tsx`: Animated achievement notifications.

## 📦 Quick Start (Replit)

1. Extract `bluej-mobile-pwa.zip` into your project directory.
2. Install dependencies:
   ```bash
   npm install
