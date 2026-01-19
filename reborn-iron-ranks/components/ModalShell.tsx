"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function ModalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  // Lock background scroll while modal is open (and restore on unmount)
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;

    // Prevent background page from scrolling
    document.body.style.overflow = "hidden";

    // Optional: prevent layout shift when scrollbar disappears
    const scrollbarW =
      window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarW > 0) {
      document.body.style.paddingRight = `${scrollbarW}px`;
    }

    // Ensure the scroll area is ready and focused for wheel/trackpad scroll
    setTimeout(() => {
      scrollRef.current?.focus?.();
    }, 0);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: 18,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={() => router.back()}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: "min(1180px, 96vw)",
          height: "92vh", // IMPORTANT: fixed height so inner scroll works consistently
          display: "grid",
          gridTemplateRows: "auto 1fr", // header + scroll area
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(14,16,22,0.92)",
          boxShadow: "0 20px 70px rgba(0,0,0,0.6)",
          overflow: "hidden", // IMPORTANT: keep scroll inside the content area only
        }}
      >
        {/* Sticky Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(14,16,22,0.92)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <div style={{ fontWeight: 1000, letterSpacing: 0.3 }}>{title}</div>

          <button
            type="button"
            onClick={() => router.back()}
            style={{
              marginLeft: "auto",
              padding: "8px 12px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "white",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* ✅ Internal Scroll Area */}
        <div
          ref={scrollRef}
          tabIndex={-1}
          style={{
            padding: 14,
            overflowY: "auto",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            minHeight: 0, // IMPORTANT for grid children to allow scrolling
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
