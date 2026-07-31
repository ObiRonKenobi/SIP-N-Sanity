"use client";

type Tone = "neutral" | "good" | "bad" | "witch";

const toneStyles: Record<Tone, string> = {
  neutral: "border-amber-400/60 bg-[#1e2a3a]",
  good: "border-emerald-400/70 bg-[#152a22]",
  bad: "border-rose-400/70 bg-[#2a1520]",
  witch: "border-orange-500/80 bg-[#2a1810]",
};

export function DialogBox({
  title,
  text,
  tone = "neutral",
  onClose,
}: {
  title: string;
  text: string;
  tone?: Tone;
  onClose: () => void;
}) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div
        className={`pixel-frame max-w-md w-full border-4 p-4 shadow-[6px_6px_0_#0b1220] ${toneStyles[tone]}`}
        role="dialog"
        aria-labelledby="dialog-title"
      >
        <h2 id="dialog-title" className="font-pixel text-sm text-amber-200 mb-3">
          {title}
        </h2>
        <p className="font-mono text-sm leading-relaxed text-slate-100 mb-4">
          {text}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="pixel-btn w-full bg-amber-400 text-[#1a2332] hover:bg-amber-300"
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
}
