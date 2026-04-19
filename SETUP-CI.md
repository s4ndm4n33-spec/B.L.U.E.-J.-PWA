# B.L.U.E.-J. — CI/CD Setup Guide

## What This Does

Every time you push to `main`, GitHub automatically builds:
- ✅ **Windows** — `.exe` installer + portable `.exe`
- ✅ **Linux** — `.AppImage` + `.deb`
- ✅ **Android** — `.apk`

When you tag a release (e.g., `v1.0.0`), it creates a **GitHub Release** page with all the downloads attached — a public download page anyone can grab installers from.

---

## Setup (One-Time, ~10 Minutes)

### Step 1: Add Files to Your Repo

Copy these into your project root:

```
your-repo/
├── .github/
│   └── workflows/
│       └── build-apps.yml       ← The CI pipeline
├── electron-main.js             ← From the patch pack
├── electron-builder.json        ← From the patch pack
├── capacitor.config.ts          ← From the patch pack
└── (everything else already there)
```

### Step 2: Update `package.json`

Add these fields to your `package.json`:

```json
{
  "main": "electron-main.js",
  "scripts": {
    "dev": "vite --port 5000 --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "server": "tsx server/index.ts",
    "start": "concurrently \"npm run dev\" \"npm run server\"",
    "electron:dev": "electron .",
    "electron:build": "npm run build && electron-builder --config electron-builder.json",
    "cap:sync": "npx cap sync",
    "cap:android": "npx cap open android"
  }
}
```

### Step 3: Install New Dependencies

In Replit terminal (or locally):

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install --save-dev electron electron-builder
```

### Step 4: Initialize Capacitor

```bash
npx cap init "B.L.U.E.-J." "com.bluej.simulator" --web-dir dist
```

This creates `capacitor.config.ts` (replace with the one from the patch pack if you prefer the pre-configured version).

### Step 5: Push to GitHub

```bash
git add -A
git commit -m "Add CI/CD pipeline + standalone app configs"
git push origin main
```

### Step 6: Watch It Build

1. Go to your repo: https://github.com/s4ndm4n33-spec/B.L.U.E.-J.
2. Click the **Actions** tab
3. You'll see "Build Standalone Apps" running
4. When it finishes (~5-10 minutes), click the run → scroll to **Artifacts**
5. Download your `.exe`, `.AppImage`, or `.apk`

---

## Releasing a Version

When you're ready to share a version publicly:

```bash
git tag v1.1.0
git push origin v1.1.0
```

This triggers the full build AND creates a **GitHub Release** page at:
`https://github.com/s4ndm4n33-spec/B.L.U.E.-J./releases`

Anyone can go there and download the Windows/Linux/Android installer. That's your public distribution page — share that link anywhere.

---

## How It Works (Under the Hood)

```
Push to main
    │
    ▼
┌──────────────────┐
│ Build Frontend   │  ← npm ci + vite build
│ (Ubuntu)         │
└────────┬─────────┘
         │ dist/ artifact
         ├──────────────────────┬──────────────────────┐
         ▼                      ▼                      ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────────┐
│ Windows Build  │  │ Linux Build    │  │ Android Build      │
│ (windows-latest)│ │ (ubuntu-latest)│  │ (ubuntu + Java 17) │
│ electron-builder│ │ electron-builder│ │ capacitor + gradle │
└────────┬───────┘  └────────┬───────┘  └────────┬───────────┘
         │                   │                    │
         ▼                   ▼                    ▼
    Setup.exe           .AppImage              .apk
    Portable.exe        .deb
         │                   │                    │
         └───────────────────┴────────────────────┘
                             │
                    (if tagged v*)
                             ▼
                    GitHub Release Page
                    with all downloads
```

The frontend builds once and is shared across all platform builds — keeps things fast.

---

## Troubleshooting

**Build fails on Android?**
- Make sure `capacitor.config.ts` has `webDir: 'dist'`
- The workflow auto-creates the `android/` folder if it doesn't exist

**Build fails on Electron?**
- Make sure `electron-main.js` exists in root
- Make sure `electron-builder.json` exists in root
- Make sure `"main": "electron-main.js"` is in package.json

**Want to add macOS (.dmg)?**
- Add a `build-macos` job using `runs-on: macos-latest`
- Note: macOS builds require code signing for distribution outside the App Store

**Want signed Android APK (for Play Store)?**
- Add a keystore to GitHub Secrets
- Switch from `assembleDebug` to `assembleRelease` with signing config
- I can set this up when you're ready to publish to the Play Store
