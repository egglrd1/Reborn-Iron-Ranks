"use client";

// app/page.tsx
import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import UI from "@/app/ui/ui.Colors";
import IconImg from "@/app/components/IconImg";

export default function Home() {
  const { status } = useSession();

  // ✅ Auto-trigger Discord OAuth on FIRST page load
  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("discord");
    }
  }, [status]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: UI.bg,
        color: UI.text,
        fontFamily: "system-ui",
        padding: 24,
        position: "relative",
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
      }}
    >
      {/* background clan icon */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.07,
          display: "grid",
          placeItems: "center",
        }}
      >
        <IconImg
          src="/clan/icon.png"
          alt=""
          size={560}
          style={{ borderRadius: 48 }}
        />
      </div>

      {/* centered content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 820,
          width: "100%",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 46,
            margin: 0,
            letterSpacing: -0.6,
            fontWeight: 1000,
          }}
        >
          Reborn Iron Ranks
        </h1>

        <div
          style={{
            marginTop: 10,
            opacity: 0.8,
            fontSize: 15,
            lineHeight: 1.4,
          }}
        >
          Clan rank calculator powered by Temple & Wise Old Man.
        </div>

        <div
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/players"
            style={{
              padding: "14px 20px",
              borderRadius: 14,
              background: UI.red,
              border: `1px solid ${UI.redBorder}`,
              color: "white",
              textDecoration: "none",
              fontWeight: 1000,
              fontSize: 15,
            }}
          >
            View Players →
          </Link>

          <Link
            href="/players/new"
            style={{
              padding: "14px 20px",
              borderRadius: 14,
              background: UI.panel,
              border: `1px solid ${UI.border}`,
              color: UI.text,
              textDecoration: "none",
              fontWeight: 900,
              fontSize: 15,
            }}
          >
            Add Player
          </Link>
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 12,
            opacity: 0.65,
          }}
        >
          Start by adding a player or opening an existing calculator.
        </div>
      </div>
    </main>
  );
}
