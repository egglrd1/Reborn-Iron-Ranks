import React from "react";
import Link from "next/link";

export default function PageShell({
  title,
  subtitle,
  children,
  right,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        {/* Header / flair */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <img
            src="/clan/icon.png"
            alt=""
            width={30}
            height={30}
            style={{ imageRendering: "pixelated", borderRadius: 8 }}
          />
          <div style={{ display: "grid", lineHeight: 1.1 }}>
            <div style={{ fontWeight: 1000, letterSpacing: 0.4 }}>REBORN</div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Iron Ranks</div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>{right}</div>
        </div>

        {title ? <h1 style={{ fontSize: 34, margin: 0 }}>{title}</h1> : null}
        {subtitle ? <div style={{ opacity: 0.75, marginTop: 6 }}>{subtitle}</div> : null}

        <div style={{ marginTop: title || subtitle ? 14 : 0 }}>{children}</div>
      </div>
    </main>
  );
}
