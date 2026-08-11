/**
 * Demo BGM — starts on "Play demo" (user gesture), survives /demo navigation,
 * loops until Music is turned off. Unused original: /music/od-yishama.mp3
 * Respects audio prefs (music on/off + master volume).
 */

import {
  getAudioPrefs,
  hydrateAudioPrefs,
  subscribeAudioPrefs,
} from "@/lib/audioPrefs";

const DEMO_MUSIC_SRC = "/music/livefone-theme.wav";
/** Base gain before master volume (kept under 1 so 100% isn't harsh). */
const BASE_GAIN = 0.72;

let track: HTMLAudioElement | null = null;
let started = false;
let subscribed = false;

function effectiveVolume(): number {
  const { music, volume } = getAudioPrefs();
  if (!music) return 0;
  return BASE_GAIN * volume;
}

function applyTrackState() {
  const audio = track;
  if (!audio) return;
  const { music } = getAudioPrefs();
  audio.volume = effectiveVolume();
  audio.muted = !music || getAudioPrefs().volume <= 0.001;

  if (!music) {
    if (!audio.paused) audio.pause();
    return;
  }

  // Resume from pause if we already started and track hasn't ended
  if (started && audio.paused && !audio.ended) {
    void audio.play().catch(() => {
      /* autoplay may still block until gesture */
    });
  }
}

function ensureSubscribed() {
  if (subscribed || typeof window === "undefined") return;
  subscribed = true;
  hydrateAudioPrefs();
  subscribeAudioPrefs(() => applyTrackState());
}

function getTrack(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  ensureSubscribed();
  if (!track) {
    track = new Audio(DEMO_MUSIC_SRC);
    track.loop = true;
    track.preload = "auto";
    track.volume = effectiveVolume();
  }
  return track;
}

/** Call from the Play demo click handler so autoplay is allowed. */
export function startDemoMusic() {
  const audio = getTrack();
  if (!audio) return;
  ensureSubscribed();
  const { music } = getAudioPrefs();
  applyTrackState();

  if (!music) {
    // Remember intent: when music is re-enabled, resume from start of demo session
    started = true;
    audio.currentTime = 0;
    return;
  }

  if (started && !audio.paused && !audio.ended) return;
  started = true;
  if (audio.ended) audio.currentTime = 0;
  void audio.play().catch(() => {
    started = false;
  });
}

export function setDemoMusicMuted(muted: boolean) {
  const audio = getTrack();
  if (!audio) return;
  // Legacy bridge from game-store mute — maps to music mute without wiping prefs volume
  if (muted) {
    audio.muted = true;
    if (!audio.paused) audio.pause();
  } else {
    applyTrackState();
  }
}

export function stopDemoMusic() {
  if (!track) return;
  track.pause();
  track.currentTime = 0;
  started = false;
}

/** Sync volume/pause from current prefs (call after prefs hydrate). */
export function syncDemoMusicFromPrefs() {
  ensureSubscribed();
  applyTrackState();
}
