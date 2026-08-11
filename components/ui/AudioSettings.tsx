"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  getAudioPrefs,
  hydrateAudioPrefs,
  setAudioPrefs,
  subscribeAudioPrefs,
  type AudioPrefs,
} from "@/lib/audioPrefs";
import { syncDemoMusicFromPrefs } from "@/components/ui/demoMusic";

type Props = {
  /** Extra class on the fixed wrapper (e.g. z-index tweaks). */
  className?: string;
};

function Toggle({
  checked,
  onChange,
  labelId,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelId: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      className={`relative h-5 w-9 shrink-0 border-2 border-[#0b1220] transition-colors ${
        checked ? "bg-amber-400" : "bg-slate-700"
      }`}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`absolute top-0.5 h-3 w-3 border border-[#0b1220] bg-[#f1e9d2] transition-[left] ${
          checked ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export function AudioSettings({ className = "" }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<AudioPrefs>(() => hydrateAudioPrefs());
  const musicLabel = useId();
  const sfxLabel = useId();
  const volLabel = useId();
  const hoverCloseTimer = useRef<number | null>(null);

  useEffect(() => {
    hydrateAudioPrefs();
    setPrefs(getAudioPrefs());
    syncDemoMusicFromPrefs();
    return subscribeAudioPrefs((next) => setPrefs(next));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const clearHoverClose = () => {
    if (hoverCloseTimer.current != null) {
      window.clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  };

  const scheduleHoverClose = () => {
    clearHoverClose();
    hoverCloseTimer.current = window.setTimeout(() => setOpen(false), 220);
  };

  const patch = (partial: Partial<AudioPrefs>) => {
    const next = setAudioPrefs(partial);
    setPrefs(next);
    syncDemoMusicFromPrefs();
  };

  const volPct = Math.round(prefs.volume * 100);
  const iconMuted = !prefs.music && !prefs.sfx;

  return (
    <div
      ref={rootRef}
      className={`pointer-events-auto fixed bottom-3 right-3 z-[60] ${className}`}
      onMouseEnter={() => {
        clearHoverClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleHoverClose}
    >
      {open && (
        <div
          className="absolute bottom-[calc(100%+8px)] right-0 w-[min(240px,calc(100vw-1.5rem))] border-4 border-[#0b1220] bg-[#152033] p-3 shadow-[4px_4px_0_#0b1220]"
          role="dialog"
          aria-label="Audio settings"
        >
          <p className="mb-2 font-pixel text-[10px] text-amber-300">Audio</p>

          <div className="mb-2 flex items-center justify-between gap-3">
            <span
              id={musicLabel}
              className="font-mono text-[11px] text-slate-200"
            >
              Music
            </span>
            <Toggle
              checked={prefs.music}
              onChange={(music) => patch({ music })}
              labelId={musicLabel}
            />
          </div>

          <div className="mb-3 flex items-center justify-between gap-3">
            <span id={sfxLabel} className="font-mono text-[11px] text-slate-200">
              SFX
            </span>
            <Toggle
              checked={prefs.sfx}
              onChange={(sfx) => patch({ sfx })}
              labelId={sfxLabel}
            />
          </div>

          <label
            htmlFor={volLabel}
            className="mb-1 flex items-center justify-between font-mono text-[11px] text-slate-200"
          >
            <span>Volume</span>
            <span className="text-amber-200">{volPct}%</span>
          </label>
          <input
            id={volLabel}
            type="range"
            min={0}
            max={100}
            step={1}
            value={volPct}
            className="audio-slider w-full"
            onChange={(e) => patch({ volume: Number(e.target.value) / 100 })}
          />
        </div>
      )}

      <button
        type="button"
        className="pixel-btn flex h-10 w-10 items-center justify-center bg-[#1a2740] text-amber-200 hover:bg-[#243652]"
        aria-label={open ? "Close audio settings" : "Open audio settings"}
        aria-expanded={open}
        onClick={() => {
          clearHoverClose();
          setOpen((v) => !v);
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          aria-hidden
          className="block"
        >
          <path
            d="M2 7h3l4-3v10l-4-3H2V7z"
            fill="currentColor"
            stroke="#0b1220"
            strokeWidth="1"
          />
          {iconMuted ? (
            <path
              d="M12 6l4 4M16 6l-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          ) : (
            <>
              <path
                d="M12 6.5c1.2 1 1.8 2.2 1.8 3.5S13.2 12.5 12 13.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M14 4.5c2 1.6 3 3.4 3 5.5s-1 3.9-3 5.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
