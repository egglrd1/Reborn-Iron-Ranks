"use client";

import * as React from "react";
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
        font: "inherit",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
