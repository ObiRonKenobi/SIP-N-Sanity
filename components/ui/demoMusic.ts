/**
 * Demo BGM — starts on "Play demo" (user gesture), survives /demo navigation,
 * plays once through office + break room, then silence (no loop).
 */

const DEMO_MUSIC_SRC = "/music/od-yishama.mp3";

let track: HTMLAudioElement | null = null;
let started = false;

function getTrack(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!track) {
    track = new Audio(DEMO_MUSIC_SRC);
    track.loop = false;
    track.preload = "auto";
    track.volume = 0.55;
    track.addEventListener("ended", () => {
      started = false;
    });
  }
  return track;
}

/** Call from the Play demo click handler so autoplay is allowed. */
export function startDemoMusic() {
  const audio = getTrack();
  if (!audio) return;
  if (started && !audio.paused && !audio.ended) return;
  started = true;
  audio.currentTime = 0;
  void audio.play().catch(() => {
    started = false;
  });
}

export function setDemoMusicMuted(muted: boolean) {
  const audio = getTrack();
  if (audio) audio.muted = muted;
}

export function stopDemoMusic() {
  if (!track) return;
  track.pause();
  track.currentTime = 0;
  started = false;
}
