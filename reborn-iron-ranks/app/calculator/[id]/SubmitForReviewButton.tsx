"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import SubmitForReviewModal from "./SubmitForReviewModal";
import UI from "@/app/ui/ui.Colors";

type Props = {
  rsn: string;
  playerId: string;

  // Kept so your existing page.tsx prop passing does NOT break.
  // (Modal handles the actual selection now.)
  requestedRank?: string;
  requestedRole?: string;
};

export default function SubmitForReviewButton({ rsn, playerId }: Props) {
  const [open, setOpen] = useState(false);

  // ✅ Pull discordId from NextAuth session so the modal can auto-fill it
  const { data: session } = useSession();

  const requesterDiscordId = useMemo(() => {
    const id = (session as any)?.discordId;
    return typeof id === "string" ? id : "";
  }, [session]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          background: UI.red,
          border: `1px solid ${UI.redBorder}`,
          color: "white",
          cursor: "pointer",
          fontWeight: 1000,
          whiteSpace: "nowrap",
        }}
      >
        Submit for review
      </button>

      <SubmitForReviewModal
        isOpen={open}
        onClose={() => setOpen(false)}
        rsn={rsn}
        playerId={playerId}
        requesterDiscordId={requesterDiscordId}
      />
    </>
  );
}
