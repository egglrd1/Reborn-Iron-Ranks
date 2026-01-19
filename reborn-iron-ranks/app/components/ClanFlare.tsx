import React from "react";
import Image from "next/image";

export default function ClanFlare({
  subtitle = "Rank Calculator",
}: {
  subtitle?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 10px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
        whiteSpace: "nowrap",
      }}
    >
      <Image
        src="/clan/icon.png"
        alt="Reborn Irons"
        width={34}
        height={34}
        priority
        style={{
          borderRadius: 10,
          background: "rgba(0,0,0,0.25)",
          border: "1px solid rgba(255,255,255,0.12)",
          padding: 4,
        }}
      />
      <div style={{ display: "grid", lineHeight: 1.05 }}>
        <div
          style={{
            fontWeight: 1000,
            letterSpacing: 0.6,
            fontSize: 13,
            opacity: 0.95,
          }}
        >
          REBORN IRONS
        </div>
        <div style={{ fontSize: 11, opacity: 0.7 }}>{subtitle}</div>
      </div>
    </div>
  );
}
