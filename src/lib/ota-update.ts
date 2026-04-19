/**
 * OTA (Over-The-Air) Live Update for B.L.U.E.-J. mobile app.
 *
 * Checks a hosted manifest for new web bundles and hot-swaps them
 * without requiring a full APK reinstall.
 *
 * The manifest lives at: https://<owner>.github.io/<repo>/ota/manifest.json
 * The bundle ZIP lives alongside it.
 */

const OTA_BASE_URL =
  localStorage.getItem('bluej-ota-url') ||
  'https://s4ndm4n33-spec.github.io/B.L.U.E.-J.-PWA/ota';

interface OtaManifest {
  version: string;
  buildDate: string;
  bundleUrl: string;   // relative to OTA_BASE_URL
  checksum: string;    // SHA-256 of the ZIP
  notes: string;
}

interface OtaStatus {
  state: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';
  currentVersion: string;
  remoteVersion?: string;
  notes?: string;
  progress?: number;
  error?: string;
}

type OtaListener = (status: OtaStatus) => void;

const APP_VERSION = __APP_VERSION__;
let listeners: OtaListener[] = [];
let currentStatus: OtaStatus = { state: 'idle', currentVersion: APP_VERSION };

function notify(patch: Partial<OtaStatus>) {
  currentStatus = { ...currentStatus, ...patch };
  listeners.forEach(fn => fn(currentStatus));
}

export function onOtaStatus(fn: OtaListener) {
  listeners.push(fn);
  fn(currentStatus);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

export function getOtaStatus(): OtaStatus {
  return currentStatus;
}

export async function checkForUpdate(): Promise<OtaManifest | null> {
  notify({ state: 'checking' });
  try {
    const res = await fetch(`${OTA_BASE_URL}/manifest.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      notify({ state: 'idle' });
      return null;
    }
    const manifest: OtaManifest = await res.json();
    if (manifest.version !== APP_VERSION) {
      notify({ state: 'available', remoteVersion: manifest.version, notes: manifest.notes });
      return manifest;
    }
    notify({ state: 'idle' });
    return null;
  } catch (err) {
    notify({ state: 'error', error: String(err) });
    return null;
  }
}

export async function downloadAndApply(manifest: OtaManifest): Promise<boolean> {
  notify({ state: 'downloading', progress: 0 });
  try {
    const url = manifest.bundleUrl.startsWith('http')
      ? manifest.bundleUrl
      : `${OTA_BASE_URL}/${manifest.bundleUrl}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);

    const total = Number(res.headers.get('content-length') || 0);
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No reader');

    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total > 0) {
        notify({ progress: Math.round((received / total) * 100) });
      }
    }

    // Store bundle in Cache API for the service worker to pick up
    const blob = new Blob(chunks, { type: 'application/zip' });
    const cache = await caches.open('bluej-ota');
    await cache.put('latest-bundle', new Response(blob, {
      headers: { 'X-OTA-Version': manifest.version },
    }));

    // Save version marker
    localStorage.setItem('bluej-ota-pending', manifest.version);
    notify({ state: 'ready', remoteVersion: manifest.version });
    return true;
  } catch (err) {
    notify({ state: 'error', error: String(err) });
    return false;
  }
}

/** Call on app startup to check if we just applied an update. */
export function finalizePendingUpdate() {
  const pending = localStorage.getItem('bluej-ota-pending');
  if (pending) {
    localStorage.removeItem('bluej-ota-pending');
    localStorage.setItem('bluej-last-ota', pending);
  }
}

// Expose current version globally
declare const __APP_VERSION__: string;
