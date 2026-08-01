"use client";

/** Tiny CSS pixel icons — replace with Gemini PNGs later (same 16×16 footprint). */

export function IconSanity({ className = "" }: { className?: string }) {
  return (
    <span
      className={`pixel-sprite inline-grid h-4 w-4 grid-cols-4 grid-rows-4 gap-0 ${className}`}
      aria-hidden
      title="sanity"
    >
      {/* coffee heart silhouette */}
      <i className="bg-transparent" />
      <i className="bg-emerald-400" />
      <i className="bg-emerald-400" />
      <i className="bg-transparent" />
      <i className="bg-emerald-500" />
      <i className="bg-emerald-300" />
      <i className="bg-emerald-300" />
      <i className="bg-emerald-500" />
      <i className="bg-amber-800" />
      <i className="bg-amber-700" />
      <i className="bg-amber-700" />
      <i className="bg-amber-800" />
      <i className="bg-transparent" />
      <i className="bg-amber-900" />
      <i className="bg-amber-900" />
      <i className="bg-transparent" />
    </span>
  );
}

export function IconCsat({ className = "" }: { className?: string }) {
  return (
    <span
      className={`pixel-sprite relative inline-block h-4 w-4 ${className}`}
      aria-hidden
    >
      <span
        className="absolute inset-0"
        style={{
          clipPath:
            "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
          background: "#5eb1ff",
        }}
      />
    </span>
  );
}

export function IconQueue({ className = "" }: { className?: string }) {
  return (
    <span
      className={`pixel-sprite inline-flex h-4 w-4 flex-col justify-end gap-px ${className}`}
      aria-hidden
    >
      <span className="h-1 w-4 bg-rose-300" />
      <span className="h-1 w-4 bg-rose-400" />
      <span className="h-1.5 w-4 bg-rose-500" />
    </span>
  );
}
