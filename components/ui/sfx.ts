/** Lightweight Web Audio placeholders until real 16-bit WAVs land. */

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function beep(
  freq: number,
  duration: number,
  type: OscillatorType = "square",
  gain = 0.04
) {
  const audio = ac();
  if (!audio) return;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(audio.destination);
  const t = audio.currentTime;
  osc.start(t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.stop(t + duration);
}

export function playKeyClack() {
  beep(220, 0.04, "square", 0.03);
}

export function playSipRing() {
  beep(880, 0.08);
  setTimeout(() => beep(660, 0.1), 100);
}

export function playDoorSqueak() {
  beep(140, 0.2, "sawtooth", 0.05);
  setTimeout(() => beep(90, 0.15, "sawtooth", 0.04), 120);
}

export function playOgreSlam() {
  beep(60, 0.25, "triangle", 0.08);
  setTimeout(() => beep(40, 0.2, "square", 0.06), 80);
}

export function playWitchYell() {
  beep(320, 0.12, "sawtooth", 0.06);
  setTimeout(() => beep(280, 0.18, "sawtooth", 0.05), 100);
  setTimeout(() => beep(420, 0.1, "square", 0.04), 220);
}

export function playSmokeWin() {
  beep(500, 0.05, "square", 0.04);
  setTimeout(() => beep(180, 0.35, "sine", 0.03), 80);
}

export function playWinFanfare() {
  [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.12), i * 100));
}
