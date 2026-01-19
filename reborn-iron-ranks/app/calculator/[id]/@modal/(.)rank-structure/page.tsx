// app/calculator/[id]/@modal/(.)rank-structure/page.tsx
import React from "react";
import ModalShell from "../../../../../components/ModalShell";
import RankStructureContent from "../../../../rank-structure/RankStructureContent";

export default function RankStructureModalPage() {
  return (
    <ModalShell title="Rank Structure">
      <RankStructureContent />
    </ModalShell>
  );
}
