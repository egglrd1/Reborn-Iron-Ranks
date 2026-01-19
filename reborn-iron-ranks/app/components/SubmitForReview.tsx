"use client";

import React, { useMemo, useState } from "react";
import IconImg from "@/app/components/IconImg";
import UI from "@/app/ui/ui.Colors";

type Props = {
  rsn: string;
  playerId?: string;
};

const RANK_OPTIONS = [
  "Recruit",
  "Member",
  "Corporal",
  "Sergeant",
  "Lieutenant",
  "Captain",
  "General",
  "Gnome Child",
  "Wrath",
  "Beast",
] as const;

const ROLE_OPTIONS = [
  "Skiller",
  "PvMer",
  "Pker",
  "Raider",
  "Staff",
] as const;

export default function SubmitForReview({ rsn, playerId }: Props) {
  const [open, setOpen] = useState(false);

  const [requestedRank, setRequestedRank] = useState<string>("");
  const [requestedRole, setRequestedRole] = useState<string>("");
  const [requesterDiscordId, setRequesterDiscordId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      rsn.trim().length > 0 &&
      requestedRank.trim().length > 0 &&
      requestedRole.trim().length > 0 &&
      requesterDiscordId.trim().length > 0 &&
      !submitting
    );
  }, [rsn, requestedRank, requestedRole, requesterDiscordId, submitting]);

  async function onSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/review-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rsn: rsn.trim(),
          requestedRank: requestedRank.trim(),
          requestedRole: requestedRole.trim(),
          requesterDiscordId: requesterDiscordId.trim(),
          playerId: playerId?.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("review-request failed", res.status, json);
        alert(json?.error || "Failed to submit request.");
        return;
      }

      // success
      setOpen(false);
      setNotes("");
      alert("Submitted for review!");
    } catch (e) {
      console.error(e);
      alert("Network error submitting request.");
    } finally {
      setSubmitting(false);
    }
  }

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
          color: UI.text,
          cursor: "pointer",
          fontWeight: 950,
          whiteSpace: "nowrap",
        }}
        title="Send a staff review request to Discord"
      >
        Submit for review
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            style={{
              width: "min(720px, 100%)",
              maxHeight: "85vh",
              overflow: "auto",
              borderRadius: 16,
              background: UI.panel,
              border: `1px solid ${UI.border}`,
              boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: 14,
                borderBottom: `1px solid ${UI.borderSoft}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <IconImg
                src="/clan/icon.png"
                alt="Reborn Irons"
                size={34}
                style={{
                  borderRadius: 10,
                  background: "rgba(0,0,0,0.25)",
                  border: `1px solid ${UI.borderSoft}`,
                  padding: 4,
                }}
              />

              <div style={{ display: "grid", lineHeight: 1.05 }}>
                <div style={{ fontWeight: 1000, letterSpacing: 0.4 }}>
                  Submit for review
                </div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Staff will approve/deny in Discord
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  marginLeft: "auto",
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${UI.borderSoft}`,
                  color: UI.text,
                  cursor: "pointer",
                  fontWeight: 1000,
                }}
                aria-label="Close"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: 14, display: "grid", gap: 12 }}>
              <div
                style={{
                  borderRadius: 14,
                  background: UI.panelStrong,
                  border: `1px solid ${UI.borderSoft}`,
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 900, opacity: 0.9, marginBottom: 6 }}>
                  Request summary
                </div>

                <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                  <KV k="RSN" v={rsn || "—"} />
                  {playerId ? <KV k="Player ID" v={playerId} /> : null}
                </div>
              </div>

              <Field label="Requested rank">
                <select
                  value={requestedRank}
                  onChange={(e) => setRequestedRank(e.target.value)}
                  style={inputStyle()}
                >
                  <option value="" style={{ color: "black" }}>
                    Select rank…
                  </option>
                  {RANK_OPTIONS.map((r) => (
                    <option key={r} value={r} style={{ color: "black" }}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Requested role">
                <select
                  value={requestedRole}
                  onChange={(e) => setRequestedRole(e.target.value)}
                  style={inputStyle()}
                >
                  <option value="" style={{ color: "black" }}>
                    Select role…
                  </option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r} style={{ color: "black" }}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Requester Discord ID">
                <input
                  value={requesterDiscordId}
                  onChange={(e) => setRequesterDiscordId(e.target.value)}
                  placeholder="e.g. 208786500249321472"
                  style={inputStyle()}
                />
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  This is what staff will use to assign roles.
                </div>
              </Field>

              <Field label="Notes (optional)">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything staff should know…"
                  rows={4}
                  style={{
                    ...inputStyle(),
                    resize: "vertical",
                  }}
                />
              </Field>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: 14,
                borderTop: `1px solid ${UI.borderSoft}`,
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${UI.borderSoft}`,
                  color: UI.text,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: canSubmit ? UI.red : "rgba(255,255,255,0.08)",
                  border: `1px solid ${
                    canSubmit ? UI.redBorder : UI.borderSoft
                  }`,
                  color: UI.text,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  fontWeight: 1000,
                  opacity: canSubmit ? 1 : 0.75,
                  minWidth: 160,
                }}
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 900, opacity: 0.9 }}>{label}</div>
      {children}
    </label>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 10,
        alignItems: "baseline",
      }}
    >
      <div style={{ opacity: 0.7 }}>{k}</div>
      <div style={{ fontWeight: 900, wordBreak: "break-word" }}>{v}</div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    padding: 10,
    borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${UI.borderSoft}`,
    color: UI.text,
    outline: "none",
  };
}
