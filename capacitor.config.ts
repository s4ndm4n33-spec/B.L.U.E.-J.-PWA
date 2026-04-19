/**
 * STANDALONE MOBILE APP — Capacitor config.
 *
 * Wraps the PWA into a native Android APK / iOS IPA.
 * The app runs 100% offline with local AI.
 *
 * Setup:
 *   npm install @capacitor/core @capacitor/cli
 *   npx cap init "B.L.U.E.-J." "com.bluej.simulator" --web-dir dist
 *   npm install @capacitor/android @capacitor/ios
 *   npx cap add android
 *   npx cap add ios
 *
 * Build:
 *   npm run build          # Build the Vite frontend
 *   npx cap sync           # Copy dist/ into native projects
 *   npx cap open android   # Open in Android Studio → Build APK
 *   npx cap open ios       # Open in Xcode → Build IPA
 */
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bluej.simulator',
  appName: 'B.L.U.E.-J.',
  webDir: 'dist',
  
  // Server config — keeps everything local, no external server needed
  server: {
    androidScheme: 'https',       // Required for WebGPU on Android
    iosScheme: 'https',
    allowNavigation: [],          // Block all external navigation by default
  },

  // Android-specific
  android: {
    buildOptions: {
      releaseType: 'APK',
    },
    // Allow WebGPU for local AI
    allowMixedContent: true,
  },

  // iOS-specific  
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    scheme: 'B.L.U.E.-J.',
  },

  // Plugins
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0f1a',
      showSpinner: true,
      spinnerColor: '#00d4ff',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0f1a',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
