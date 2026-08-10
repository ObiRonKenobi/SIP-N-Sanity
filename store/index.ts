import { create } from "zustand";
import doorData from "@/data/door-outcomes.json";
import smokeData from "@/data/smoke-outcomes.json";
import endings from "@/data/endings.json";
import { pickRandomTicket, type Ticket } from "./tickets";

export type GamePhase =
  | "idle"
  | "console"
  | "bathroom"
  | "lunch"
  | "outage"
  | "smoke"
  | "won"
  | "lost";

export type EndingKind = "sanity" | "csat" | "queue" | "won";
export type SmokeOutcomeId = "win" | "lose" | null;

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

/** New ticket every N game minutes (= N real seconds at TICK_MS=1000). */
export const TICKET_INTERVAL = 5;

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

function pickEnding(kind: EndingKind): string {
  const list = endings[kind];
  return list[Math.floor(Math.random() * list.length)];
}

/** Priority: sanity → csat → queue crash. */
function checkLose(
  sanity: number,
  csat: number,
  queue: number
): { kind: EndingKind; quip: string } | null {
  if (sanity <= 0) return { kind: "sanity", quip: pickEnding("sanity") };
  if (csat <= 0) return { kind: "csat", quip: pickEnding("csat") };
  if (queue >= 100) return { kind: "queue", quip: pickEnding("queue") };
  return null;
}

type GameState = {
  sanity: number;
  csat: number;
  queue: number;
  gameTime: number;
  currentPhase: GamePhase;
  isRunning: boolean;
  isPaused: boolean;
  muted: boolean;
  hasSmoked: boolean;
  smokeOutcome: SmokeOutcomeId;
  coffeeUsesLeft: number;
  lastCoffeeAt: number;
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
  endingKind: EndingKind | null;

  startDay: () => void;
  pauseDay: () => void;
  togglePause: () => void;
  toggleMute: () => void;
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
  finishSmokeBreak: () => void;
  drinkCoffee: () => void;
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
  isPaused: false,
  muted: false,
  hasSmoked: false,
  smokeOutcome: null,
  coffeeUsesLeft: 3,
  lastCoffeeAt: -999,
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
  endingKind: null,

  startDay: () => {
    set({
      ...initialMeters,
      gameTime: DAY_START_MINUTES,
      currentPhase: "console",
      isRunning: true,
      isPaused: false,
      hasSmoked: false,
      smokeOutcome: null,
      coffeeUsesLeft: 3,
      lastCoffeeAt: -999,
      isBathroomTime: false,
      bathroomCompleted: false,
      lunchCompleted: false,
      outageCompleted: false,
      smokeRNG: 0,
      bathroomDoors: shuffleDoors(),
      activeTicket: pickRandomTicket(),
      ticketCooldown: TICKET_INTERVAL,
      dialog: {
        title: "Shift Start",
        text: "Welcome to Tier 1. Survive until 5:00 PM. The queue does not sleep.",
        tone: "neutral",
      },
      clockLabel: formatClock(DAY_START_MINUTES),
      loseReason: null,
      endingKind: null,
    });
    if (typeof window !== "undefined") {
      console.log("[SIP-N-Sanity] Day started. Transitions: 10:30, 12:00, 3:00");
    }
  },

  pauseDay: () => set({ isRunning: false, isPaused: true }),

  togglePause: () => {
    const s = get();
    if (s.currentPhase === "idle" || s.currentPhase === "won" || s.currentPhase === "lost")
      return;
    if (s.currentPhase !== "console") return;
    if (s.isPaused) {
      set({ isPaused: false, isRunning: true });
    } else {
      set({ isPaused: true, isRunning: false });
    }
  },

  toggleMute: () => set((s) => ({ muted: !s.muted })),

  resumeConsole: () =>
    set({
      currentPhase: "console",
      isRunning: true,
      isPaused: false,
      isBathroomTime: false,
    }),

  tick: () => {
    const state = get();
    if (!state.isRunning || state.isPaused || state.currentPhase !== "console")
      return;

    const nextTime = state.gameTime + 1;
    const lateDay = nextTime >= 360;
    const queuePulse = nextTime % TICKET_INTERVAL === 0;
    const queueGrowth = queuePulse ? (lateDay ? 2 : 1) : 0;
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
      ticketCooldown = TICKET_INTERVAL;
    }

    let loseReason: string | null = null;
    let endingKind: EndingKind | null = null;

    const loss = checkLose(state.sanity, state.csat, queue);
    if (loss) {
      nextPhase = "lost";
      isRunning = false;
      loseReason = loss.quip;
      endingKind = loss.kind;
    } else if (nextTime >= DAY_END_MINUTES) {
      nextPhase = "won";
      isRunning = false;
      loseReason = pickEnding("won");
      endingKind = "won";
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
      endingKind,
    });
  },

  applyEffect: (effect) => {
    const s = get();
    const sanity = clamp(s.sanity + (effect.sanity ?? 0), 0, 100);
    const csat = clamp(s.csat + (effect.csat ?? 0), 0, 100);
    const queue = clamp(s.queue + (effect.queue ?? 0), 0, 100);
    const updates: Partial<GameState> = { sanity, csat, queue };

    const loss = checkLose(sanity, csat, queue);
    if (loss) {
      updates.currentPhase = "lost";
      updates.isRunning = false;
      updates.loseReason = loss.quip;
      updates.endingKind = loss.kind;
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
      ticketCooldown: TICKET_INTERVAL,
    });
  },

  spawnTicket: () => {
    set({ activeTicket: pickRandomTicket(), ticketCooldown: TICKET_INTERVAL });
  },

  takeSmokeBreak: () => {
    const s = get();
    if (s.hasSmoked) return;
    if (
      s.currentPhase === "bathroom" ||
      s.currentPhase === "lunch" ||
      s.currentPhase === "outage" ||
      s.currentPhase === "smoke"
    )
      return;

    const rng = Math.random();
    const win = smokeData.smokeBreakOutcomes[0];
    const outcomeId: SmokeOutcomeId = rng < win.probability ? "win" : "lose";
    const outcome =
      outcomeId === "win"
        ? smokeData.smokeBreakOutcomes[0]
        : smokeData.smokeBreakOutcomes[1];

    get().applyEffect({ sanity: outcome.sanityEffect });
    if (get().currentPhase === "lost") {
      set({ hasSmoked: true, smokeRNG: rng, smokeOutcome: outcomeId });
      return;
    }
    set({
      hasSmoked: true,
      smokeRNG: rng,
      smokeOutcome: outcomeId,
      currentPhase: "smoke",
      isRunning: false,
      isPaused: false,
    });
  },

  finishSmokeBreak: () => {
    const s = get();
    if (s.currentPhase === "lost" || s.currentPhase === "won") return;
    set({
      currentPhase: "console",
      isRunning: true,
      isPaused: false,
      dialog: null,
      ticketCooldown: Math.min(s.ticketCooldown, 2),
      activeTicket: s.activeTicket ?? pickRandomTicket(),
    });
  },

  drinkCoffee: () => {
    const s = get();
    if (s.currentPhase !== "console" || s.isPaused) return;
    if (s.coffeeUsesLeft <= 0) {
      set({
        dialog: {
          title: "Coffee Station",
          text: "The urn is empty. So is your soul. Try again next shift.",
          tone: "bad",
        },
      });
      return;
    }
    if (s.gameTime - s.lastCoffeeAt < 40) {
      set({
        dialog: {
          title: "Coffee Station",
          text: "Too soon. Your heart is already a SIP trunk.",
          tone: "neutral",
        },
      });
      return;
    }
    get().applyEffect({ sanity: 8 });
    set({
      coffeeUsesLeft: s.coffeeUsesLeft - 1,
      lastCoffeeAt: s.gameTime,
      dialog: {
        title: "Coffee Station",
        text: `Burnt office coffee. Sanity +8. Cups left today: ${s.coffeeUsesLeft - 1}.`,
        tone: "good",
      },
    });
  },

  completeBathroom: (doorIndex: number) => {
    const s = get();
    // Already resolved / left bathroom — don't re-apply or soft-lock
    if (s.bathroomCompleted || s.currentPhase !== "bathroom") return;
    const key = s.bathroomDoors[doorIndex];
    const outcome = doorData.doorOutcomes.find((d) => d.key === key);
    if (!outcome) return;
    get().applyEffect({ sanity: outcome.sanityEffect });
    // If ogre/drain ended the run, don't leave a stuck bathroom overlay
    if (get().currentPhase === "lost") return;
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
    const s = get();
    if (s.currentPhase === "lost" || s.currentPhase === "won") return;
    if (s.bathroomCompleted && s.currentPhase === "console") return;
    set({
      bathroomCompleted: true,
      isBathroomTime: false,
      gameTime: BATHROOM_RESUME,
      clockLabel: formatClock(BATHROOM_RESUME),
      currentPhase: "console",
      isRunning: true,
      ticketCooldown: TICKET_INTERVAL,
      activeTicket: pickRandomTicket(),
      dialog: null,
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
          title: "Cornered",
          text: "They just needed 'one quick second.' Twenty minutes later your Sanity is toast. Sanity -15.",
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
      ticketCooldown: TICKET_INTERVAL,
    });
  },

  completeOutage: () => {
    set({
      outageCompleted: true,
      currentPhase: "console",
      isRunning: true,
      gameTime: OUTAGE_AT + 10,
      clockLabel: formatClock(OUTAGE_AT + 10),
      ticketCooldown: TICKET_INTERVAL,
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
      isPaused: false,
      muted: get().muted,
      hasSmoked: false,
      smokeOutcome: null,
      coffeeUsesLeft: 3,
      lastCoffeeAt: -999,
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
      endingKind: null,
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
