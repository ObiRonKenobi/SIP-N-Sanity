"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

/** Loads a public sprite; shows children fallback if missing/broken. */
export function SpriteImg({
  src,
  alt = "",
  className = "",
  style,
  fallback,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  fallback?: ReactNode;
}) {
  const [ok, setOk] = useState(true);

  if (!ok && fallback) return <>{fallback}</>;
  if (!ok) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`pixel-sprite ${className}`}
      style={{ imageRendering: "pixelated", ...style }}
      onError={() => setOk(false)}
      draggable={false}
    />
  );
}
