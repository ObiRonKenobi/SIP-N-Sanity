/** Web Audio placeholders; respects audio prefs (SFX + master volume). */

import {
  getAudioPrefs,
  hydrateAudioPrefs,
  subscribeAudioPrefs,
} from "@/lib/audioPrefs";

let ctx: AudioContext | null = null;
let subscribed = false;
/** Legacy game-store mute (OR'd with prefs.sfx). */
let storeMuted = false;

function ensureSubscribed() {
  if (subscribed || typeof window === "undefined") return;
  subscribed = true;
  hydrateAudioPrefs();
  subscribeAudioPrefs(() => {
    /* prefs read live in play paths */
  });
}

function sfxAllowed(): boolean {
  ensureSubscribed();
  const { sfx, volume } = getAudioPrefs();
  return !storeMuted && sfx && volume > 0.001;
}

function masterGain(): number {
  return getAudioPrefs().volume;
}

export function setSfxMuted(value: boolean) {
  storeMuted = value;
}

function ac(): AudioContext | null {
  if (typeof window === "undefined" || !sfxAllowed()) return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function beep(
  freq: number,
  duration: number,
  type: OscillatorType = "square",
  gain = 0.04,
) {
  if (!sfxAllowed()) return;
  const audio = ac();
  if (!audio) return;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain * masterGain();
  osc.connect(g);
  g.connect(audio.destination);
  const t = audio.currentTime;
  osc.start(t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.stop(t + duration);
}

/** Try HTMLAudioElement from /sounds/{name}.wav|mp3, else beep fallback. */
function playFile(name: string, fallback: () => void) {
  if (!sfxAllowed() || typeof window === "undefined") return;
  const vol = 0.35 * masterGain();
  const a = new Audio(`/sounds/${name}.wav`);
  a.volume = vol;
  a.play().catch(() => {
    const b = new Audio(`/sounds/${name}.mp3`);
    b.volume = vol;
    b.play().catch(() => fallback());
  });
}

export function playKeyClack() {
  playFile("key", () => beep(220, 0.04, "square", 0.03));
}

export function playSipRing() {
  playFile("sip-ring", () => {
    beep(880, 0.08);
    setTimeout(() => beep(660, 0.1), 100);
  });
}

export function playDoorSqueak() {
  playFile("door", () => {
    beep(140, 0.2, "sawtooth", 0.05);
    setTimeout(() => beep(90, 0.15, "sawtooth", 0.04), 120);
  });
}

export function playOgreSlam() {
  playFile("ogre", () => {
    beep(60, 0.25, "triangle", 0.08);
    setTimeout(() => beep(40, 0.2, "square", 0.06), 80);
  });
}

export function playWitchYell() {
  playFile("witch", () => {
    beep(320, 0.12, "sawtooth", 0.06);
    setTimeout(() => beep(280, 0.18, "sawtooth", 0.05), 100);
    setTimeout(() => beep(420, 0.1, "square", 0.04), 220);
  });
}

export function playSmokeWin() {
  playFile("zippo", () => {
    beep(500, 0.05, "square", 0.04);
    setTimeout(() => beep(180, 0.35, "sine", 0.03), 80);
  });
}

export function playWinFanfare() {
  playFile("win", () => {
    [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.12), i * 100));
  });
}

export function playCoffee() {
  playFile("coffee", () => beep(400, 0.08, "sine", 0.04));
}
