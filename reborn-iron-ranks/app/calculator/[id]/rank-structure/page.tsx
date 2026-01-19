// app/calculator/[id]/rank-structure/page.tsx
// Server Component
import React from "react";
import BackButton from "@/components/BackButton";
import UI from "@/app/ui/ui.Colors";

// Reuse your existing Rank Structure page component
import RankStructurePage from "@/app/rank-structure/page";

export default async function CalculatorRankStructurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: UI.bg,
        color: UI.text,
        fontFamily: "system-ui",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <BackButton fallbackHref={`/calculator/${encodeURIComponent(id)}`} />
          <div style={{ marginLeft: "auto", opacity: 0.75, fontWeight: 900 }}>
            Reborn Rank Calculator • Rank Structure
          </div>
        </div>

        {/* Render the same content you already built at /rank-structure */}
        <div
          style={{
            borderRadius: 16,
            border: `1px solid ${UI.border}`,
            background: UI.panel,
            overflow: "hidden",
          }}
        >
          {/* RankStructurePage already returns a <main>, so we just render it inside a div wrapper */}
          <div style={{ padding: 0 }}>
            <RankStructurePage />
          </div>
        </div>
      </div>
    </main>
  );
}
