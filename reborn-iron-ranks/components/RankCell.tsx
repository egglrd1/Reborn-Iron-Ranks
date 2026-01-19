// components/RankCell.tsx
// SERVER-SAFE: no event handlers, no client-only hooks.

import React from "react";

export default function RankCell({
  id,
  label,
  locked = false,
  lockReason,
  size = 26,
  center = true,
}: {
  id: string;
  label: string;
  locked?: boolean;
  lockReason?: string;
  size?: number;
  center?: boolean;
}) {
  const title = locked ? lockReason || `${label} is locked` : label;

  return (
    <div
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        justifyContent: center ? "center" : "flex-start",
        fontFamily: "serif",
        fontSize: 20,
        opacity: locked ? 0.55 : 1,
        filter: locked ? "grayscale(1)" : "none",
      }}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        <img
          src={`/ranks/${id}.png`}
          alt={label}
          width={size}
          height={size}
          style={{
            imageRendering: "pixelated",
            display: "block",
          }}
        />

        {locked ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                width: Math.round(size * 0.78),
                height: Math.round(size * 0.78),
                borderRadius: 999,
                background: "rgba(0,0,0,0.65)",
                border: "1px solid rgba(255,255,255,0.22)",
                display: "grid",
                placeItems: "center",
                fontSize: Math.round(size * 0.5),
                lineHeight: 1,
                color: "white",
                textShadow: "0 1px 0 rgba(0,0,0,0.85)",
              }}
            >
              🔒
            </span>
          </div>
        ) : null}
      </div>

      <span style={{ fontWeight: 900 }}>{label}</span>
    </div>
  );
}
