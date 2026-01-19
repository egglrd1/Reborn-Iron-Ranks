"use client";

import { useRouter } from "next/navigation";

export default function BackButton({
  fallbackHref = "/players",
  children = "← Back",
  style,
}: {
  fallbackHref?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        // If user has history, go back; otherwise go to fallback.
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        color: "white",
        cursor: "pointer",
        opacity: 0.9,
        textDecoration: "none",
        font: "inherit",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
