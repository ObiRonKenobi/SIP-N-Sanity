/**
 * Shared audio prefs (music / SFX / master volume) for title + demo.
 * Persisted in localStorage so refresh keeps mute/volume.
 */

const STORAGE_KEY = "sip-n-sanity-audio";

export type AudioPrefs = {
  music: boolean;
  sfx: boolean;
  /** 0–1 master volume */
  volume: number;
};

export const DEFAULT_AUDIO_PREFS: AudioPrefs = {
  music: true,
  sfx: true,
  volume: 0.75,
};

type Listener = (prefs: AudioPrefs) => void;

let prefs: AudioPrefs = { ...DEFAULT_AUDIO_PREFS };
let hydrated = false;
const listeners = new Set<Listener>();

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function readStorage(): AudioPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_AUDIO_PREFS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_PREFS };
    const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      music: parsed.music !== false,
      sfx: parsed.sfx !== false,
      volume: clamp01(
        typeof parsed.volume === "number" ? parsed.volume : DEFAULT_AUDIO_PREFS.volume,
      ),
    };
  } catch {
    return { ...DEFAULT_AUDIO_PREFS };
  }
}

function writeStorage(next: AudioPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

export function hydrateAudioPrefs(): AudioPrefs {
  if (!hydrated) {
    prefs = readStorage();
    hydrated = true;
  }
  return { ...prefs };
}

export function getAudioPrefs(): AudioPrefs {
  if (!hydrated) return hydrateAudioPrefs();
  return { ...prefs };
}

export function setAudioPrefs(patch: Partial<AudioPrefs>): AudioPrefs {
  if (!hydrated) hydrateAudioPrefs();
  prefs = {
    music: patch.music ?? prefs.music,
    sfx: patch.sfx ?? prefs.sfx,
    volume: clamp01(patch.volume ?? prefs.volume),
  };
  writeStorage(prefs);
  listeners.forEach((fn) => fn({ ...prefs }));
  return { ...prefs };
}

export function subscribeAudioPrefs(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
