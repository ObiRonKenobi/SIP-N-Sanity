import { create } from "zustand";
import doorData from "@/data/door-outcomes.json";
import smokeData from "@/data/smoke-outcomes.json";
import { pickRandomTicket, type Ticket } from "./tickets";

export type GamePhase =
  | "idle"
  | "console"
  | "bathroom"
  | "lunch"
  | "outage"
  | "won"
  | "lost";

export type DialogPayload = {
  title: string;
  text: string;
  tone?: "neutral" | "good" | "bad" | "witch";
} | null;

export type DoorKey = "clean" | "ogre" | "empty";

const DAY_START_MINUTES = 0; // 9:00
const DAY_END_MINUTES = 480; // 5:00
const BATHROOM_AT = 90; // 10:30
const BATHROOM_RESUME = 100; // 10:40
const LUNCH_AT = 180; // 12:00
const OUTAGE_AT = 360; // 3:00

/** Real ms per in-game minute. Full day ≈ 8 minutes. */
export const TICK_MS = 1000;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatClock(gameTime: number): string {
  const total = 9 * 60 + gameTime;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function shuffleDoors(): DoorKey[] {
  const doors: DoorKey[] = ["clean", "ogre", "empty"];
  for (let i = doors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doors[i], doors[j]] = [doors[j], doors[i]];
  }
  return doors;
}

type GameState = {
  sanity: number;
  csat: number;
  queue: number;
  gameTime: number;
  currentPhase: GamePhase;
  isRunning: boolean;
  hasSmoked: boolean;
  isBathroomTime: boolean;
  bathroomCompleted: boolean;
  lunchCompleted: boolean;
  outageCompleted: boolean;
  smokeRNG: number;
  bathroomDoors: DoorKey[];
  activeTicket: Ticket | null;
  ticketCooldown: number;
  dialog: DialogPayload;
  clockLabel: string;
  loseReason: string | null;

  startDay: () => void;
  pauseDay: () => void;
  resumeConsole: () => void;
  tick: () => void;
  applyEffect: (effect: {
    sanity?: number;
    csat?: number;
    queue?: number;
  }) => void;
  answerTicket: (answerIndex: number) => void;
  spawnTicket: () => void;
  takeSmokeBreak: () => void;
  completeBathroom: (doorIndex: number) => void;
  finishBathroom: () => void;
  completeLunch: (success: boolean) => void;
  completeOutage: () => void;
  setDialog: (dialog: DialogPayload) => void;
  clearDialog: () => void;
  resetGame: () => void;
};

const initialMeters = {
  sanity: 80,
  csat: 70,
  queue: 12,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialMeters,
  gameTime: DAY_START_MINUTES,
  currentPhase: "idle",
  isRunning: false,
  hasSmoked: false,
  isBathroomTime: false,
  bathroomCompleted: false,
  lunchCompleted: false,
  outageCompleted: false,
  smokeRNG: 0,
  bathroomDoors: shuffleDoors(),
  activeTicket: null,
  ticketCooldown: 0,
  dialog: null,
  clockLabel: formatClock(DAY_START_MINUTES),
  loseReason: null,

  startDay: () => {
    set({
      ...initialMeters,
      gameTime: DAY_START_MINUTES,
      currentPhase: "console",
      isRunning: true,
      hasSmoked: false,
      isBathroomTime: false,
      bathroomCompleted: false,
      lunchCompleted: false,
      outageCompleted: false,
      smokeRNG: 0,
      bathroomDoors: shuffleDoors(),
      activeTicket: pickRandomTicket(),
      ticketCooldown: 8,
      dialog: {
        title: "Shift Start",
        text: "Welcome to Tier 1. Survive until 5:00 PM. The queue does not sleep.",
        tone: "neutral",
      },
      clockLabel: formatClock(DAY_START_MINUTES),
      loseReason: null,
    });
    if (typeof window !== "undefined") {
      console.log("[SIP-N-Sanity] Day started. Transitions: 10:30, 12:00, 3:00");
    }
  },

  pauseDay: () => set({ isRunning: false }),

  resumeConsole: () =>
    set({
      currentPhase: "console",
      isRunning: true,
      isBathroomTime: false,
    }),

  tick: () => {
    const state = get();
    if (!state.isRunning || state.currentPhase !== "console") return;

    const nextTime = state.gameTime + 1;
    const lateDay = nextTime >= 360;
    const queueGrowth = lateDay ? 2 : 1;
    let queue = clamp(state.queue + queueGrowth, 0, 100);
    let ticketCooldown = Math.max(0, state.ticketCooldown - 1);
    let activeTicket = state.activeTicket;
    let nextPhase: GamePhase = "console";
    let isRunning = true;
    let isBathroomTime = false;

    if (!state.bathroomCompleted && nextTime >= BATHROOM_AT) {
      nextPhase = "bathroom";
      isRunning = false;
      isBathroomTime = true;
      console.log("[SIP-N-Sanity] Transition → bathroom (10:30)");
    } else if (!state.lunchCompleted && nextTime >= LUNCH_AT) {
      nextPhase = "lunch";
      isRunning = false;
      console.log("[SIP-N-Sanity] Transition → lunch stealth (12:00)");
    } else if (!state.outageCompleted && nextTime >= OUTAGE_AT) {
      nextPhase = "outage";
      isRunning = false;
      console.log("[SIP-N-Sanity] Transition → typing outage (3:00)");
    }

    if (
      nextPhase === "console" &&
      !activeTicket &&
      ticketCooldown <= 0
    ) {
      activeTicket = pickRandomTicket();
      ticketCooldown = lateDay ? 5 : 8;
    }

    let loseReason: string | null = null;

    if (state.sanity <= 0) {
      nextPhase = "lost";
      isRunning = false;
      loseReason = "Sanity collapsed. You are now one with the hold music.";
    } else if (queue >= 100) {
      nextPhase = "lost";
      isRunning = false;
      loseReason = "Queue hit 100. The ticket system achieved sentience and fired you.";
    } else if (nextTime >= DAY_END_MINUTES) {
      nextPhase = "won";
      isRunning = false;
    }

    set({
      gameTime:
        nextPhase === "bathroom"
          ? BATHROOM_AT
          : nextPhase === "lunch"
            ? LUNCH_AT
            : nextPhase === "outage"
              ? OUTAGE_AT
              : Math.min(nextTime, DAY_END_MINUTES),
      queue,
      ticketCooldown,
      activeTicket,
      currentPhase: nextPhase,
      isRunning,
      isBathroomTime,
      clockLabel: formatClock(
        nextPhase === "won" ? DAY_END_MINUTES : Math.min(nextTime, DAY_END_MINUTES)
      ),
      loseReason,
    });
  },

  applyEffect: (effect) => {
    const s = get();
    const sanity = clamp(s.sanity + (effect.sanity ?? 0), 0, 100);
    const csat = clamp(s.csat + (effect.csat ?? 0), 0, 100);
    const queue = clamp(s.queue + (effect.queue ?? 0), 0, 100);
    const updates: Partial<GameState> = { sanity, csat, queue };

    if (sanity <= 0) {
      updates.currentPhase = "lost";
      updates.isRunning = false;
      updates.loseReason =
        "Sanity collapsed. You are now one with the hold music.";
    } else if (queue >= 100) {
      updates.currentPhase = "lost";
      updates.isRunning = false;
      updates.loseReason =
        "Queue hit 100. The ticket system achieved sentience and fired you.";
    }
    set(updates);
  },

  answerTicket: (answerIndex) => {
    const s = get();
    if (!s.activeTicket || s.currentPhase !== "console") return;
    const answer = s.activeTicket.answers[answerIndex];
    if (!answer) return;
    get().applyEffect(answer.effect);
    set({
      activeTicket: null,
      ticketCooldown: s.gameTime >= 360 ? 4 : 6,
    });
  },

  spawnTicket: () => {
    set({ activeTicket: pickRandomTicket(), ticketCooldown: 8 });
  },

  takeSmokeBreak: () => {
    const s = get();
    if (s.hasSmoked) return;
    if (s.currentPhase === "bathroom" || s.currentPhase === "lunch") return;

    const rng = Math.random();
    const win = smokeData.smokeBreakOutcomes[0];
    const lose = smokeData.smokeBreakOutcomes[1];
    const outcome = rng < win.probability ? win : lose;

    get().applyEffect({ sanity: outcome.sanityEffect });
    set({
      hasSmoked: true,
      smokeRNG: rng,
      dialog: {
        title: outcome.id === "win" ? "Smoke Break" : "The Witch Boss",
        text: outcome.text,
        tone: outcome.id === "win" ? "good" : "witch",
      },
    });
  },

  completeBathroom: (doorIndex) => {
    const s = get();
    const key = s.bathroomDoors[doorIndex];
    const outcome = doorData.doorOutcomes.find((d) => d.key === key);
    if (!outcome) return;
    get().applyEffect({ sanity: outcome.sanityEffect });
    set({
      dialog: {
        title: "Bathroom Gamble",
        text: outcome.text,
        tone:
          outcome.sanityEffect > 0
            ? "good"
            : outcome.sanityEffect < 0
              ? "bad"
              : "neutral",
      },
    });
  },

  finishBathroom: () => {
    set({
      bathroomCompleted: true,
      isBathroomTime: false,
      gameTime: BATHROOM_RESUME,
      clockLabel: formatClock(BATHROOM_RESUME),
      currentPhase: "console",
      isRunning: true,
      ticketCooldown: 3,
    });
  },

  completeLunch: (success) => {
    if (success) {
      get().applyEffect({ sanity: 10 });
      set({
        dialog: {
          title: "Breakroom",
          text: "You claimed a sandwich and 90 seconds of silence. Sanity +10.",
          tone: "good",
        },
      });
    } else {
      get().applyEffect({ sanity: -15 });
      set({
        dialog: {
          title: "Caught",
          text: "Vision cone acquired. Back to your desk, agent.",
          tone: "bad",
        },
      });
    }
    set({
      lunchCompleted: true,
      currentPhase: "console",
      isRunning: true,
      gameTime: LUNCH_AT + 5,
      clockLabel: formatClock(LUNCH_AT + 5),
      ticketCooldown: 4,
    });
  },

  completeOutage: () => {
    set({
      outageCompleted: true,
      currentPhase: "console",
      isRunning: true,
      gameTime: OUTAGE_AT + 10,
      clockLabel: formatClock(OUTAGE_AT + 10),
      ticketCooldown: 3,
      dialog: {
        title: "Trunk Restored",
        text: "The SIP trunk staggers back online. Your wrists hate you.",
        tone: "neutral",
      },
    });
  },

  setDialog: (dialog) => set({ dialog }),
  clearDialog: () => set({ dialog: null }),

  resetGame: () => {
    set({
      ...initialMeters,
      gameTime: DAY_START_MINUTES,
      currentPhase: "idle",
      isRunning: false,
      hasSmoked: false,
      isBathroomTime: false,
      bathroomCompleted: false,
      lunchCompleted: false,
      outageCompleted: false,
      smokeRNG: 0,
      bathroomDoors: shuffleDoors(),
      activeTicket: null,
      ticketCooldown: 0,
      dialog: null,
      clockLabel: formatClock(DAY_START_MINUTES),
      loseReason: null,
    });
  },
}));

export const GAME_SCHEDULE = {
  DAY_END_MINUTES,
  BATHROOM_AT,
  BATHROOM_RESUME,
  LUNCH_AT,
  OUTAGE_AT,
};
