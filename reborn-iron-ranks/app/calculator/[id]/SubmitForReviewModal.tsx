"use client";

import React, { useMemo, useState, useEffect } from "react";
import UI from "@/app/ui/ui.Colors";
import { PVM_RANKS, computePvmRank } from "@/lib/reborn_rank_rules";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  rsn: string;

  requestedRank?: string;
  requestedRole?: string;
  requesterDiscordId?: string;
  onSubmit?: () => Promise<void> | void;
  submitting?: boolean;
};

type SubmitState = "idle" | "submitting" | "success" | "error";
type RankOpt = { id: string; label: string; group: "PvM" | "Skilling" | "Special" };

const SKILLING_RANKS: RankOpt[] = [
  { id: "emerald", label: "Emerald", group: "Skilling" },
  { id: "onyx", label: "Onyx", group: "Skilling" },
  { id: "zenyte", label: "Zenyte", group: "Skilling" },
  { id: "maxed", label: "Maxed", group: "Skilling" },
];

const SPECIAL_RANKS: RankOpt[] = [
  { id: "proselyte", label: "Proselyte", group: "Special" },
  { id: "major", label: "Major", group: "Special" },
  { id: "master", label: "Master", group: "Special" },
  { id: "colonel", label: "Colonel", group: "Special" },
  { id: "zamorakian", label: "Zamorakian", group: "Special" },
];

function iconSrc(rankId: string) {
  return `/ranks/${rankId}.png`;
}

type CheckedMap = Record<string, boolean>;
function lsChecklistKey(playerId: string) {
  return `reborn_item_checklist_v1_${playerId}`;
}

function metricToKc(m: any): number {
  const n = Number(m?.kills ?? m?.score ?? m?.kc ?? 0);
  return Number.isFinite(n) ? n : 0;
}

const RAID_KEYS = new Set<string>([
  "chambers_of_xeric",
  "chambers_of_xeric_challenge_mode",
  "theatre_of_blood",
  "theatre_of_blood_hard_mode",
  "tombs_of_amascut",
  "tombs_of_amascut_expert",
]);

const ZAM_BOSS_EXCLUDE_KEYS = new Set<string>([
  "wintertodt",
  "zalcano",
  "hespori",
  "guardians_of_the_rift",
  "gotr",
]);

function extractTempleSummary(templeResp: any): {
  petsUnique: number | null;
  collectionLogCompleted: number | null;
  collectionLogAvailable: number | null;
} {
  // ✅ Our API route returns: { ok: true, temple: <payload>, petsUnique: number }
  const petsUniqueDirect =
    templeResp?.petsUnique ??
    templeResp?.data?.petsUnique ??
    null;

  const temple = templeResp?.temple ?? templeResp?.data ?? templeResp;
  const data = temple?.data ?? temple;

  const collected =
    data?.total_collections_in_response ??
    data?.total_collections_found ??
    data?.total_collections ??
    temple?.total_collections_in_response ??
    temple?.total_collections_found ??
    temple?.total_collections ??
    null;

  const available =
    data?.total_collections_available ??
    temple?.total_collections_available ??
    null;

  return {
    petsUnique:
      typeof petsUniqueDirect === "number" && Number.isFinite(petsUniqueDirect)
        ? petsUniqueDirect
        : null,
    collectionLogCompleted: typeof collected === "number" ? collected : null,
    collectionLogAvailable: typeof available === "number" ? available : null,
  };
}

export default function SubmitForReviewModal({
  isOpen,
  onClose,
  playerId,
  rsn,
  requesterDiscordId: requesterDiscordIdFromButton,
}: Props) {
  const allRanks: RankOpt[] = useMemo(() => {
    const pvm: RankOpt[] = PVM_RANKS.map((r) => ({ id: r.id, label: r.label, group: "PvM" }));
    return [...pvm, ...SKILLING_RANKS, ...SPECIAL_RANKS];
  }, []);

  const defaultRankId = allRanks[0]?.id ?? "";

  const [requestedRankId, setRequestedRankId] = useState<string>(defaultRankId);
  const [requestedRoleId, setRequestedRoleId] = useState<string>(defaultRankId);
  const [roleSameAsRank, setRoleSameAsRank] = useState(true);

  const [requesterDiscordId, setRequesterDiscordId] = useState(requesterDiscordIdFromButton ?? "");
  const [notes, setNotes] = useState("");

  const [state, setState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Item checklist map
  const [checked, setChecked] = useState<CheckedMap>({});
  useEffect(() => {
    if (!playerId) return;
    try {
      const raw = localStorage.getItem(lsChecklistKey(playerId));
      if (raw) setChecked(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [playerId, isOpen]);

  const evaled = useMemo(() => computePvmRank(checked), [checked]);

  // Session-based discord id autofill (multi-user fix)
  useEffect(() => {
    if (!isOpen) return;
    if (requesterDiscordId.trim()) return;

    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!res.ok) return;
        const sess = await res.json();
        const id = String(sess?.discordId ?? sess?.user?.discordId ?? "").trim();
        if (id) setRequesterDiscordId(id);
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Fetch Temple + WOM so staff message always has pets/clog/totallevel/zam totals
  const [petsUnique, setPetsUnique] = useState<number | null>(null);
  const [clogCompleted, setClogCompleted] = useState<number | null>(null);
  const [clogAvailable, setClogAvailable] = useState<number | null>(null);

  const [totalLevel, setTotalLevel] = useState<number | null>(null);
  const [raidsTotal, setRaidsTotal] = useState<number | null>(null);
  const [bossKillsTotal, setBossKillsTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!rsn?.trim()) return;

    setPetsUnique(null);
    setClogCompleted(null);
    setClogAvailable(null);
    setTotalLevel(null);
    setRaidsTotal(null);
    setBossKillsTotal(null);

    (async () => {
      // Temple
      try {
        const t = await fetch(`/api/temple/collection-log?rsn=${encodeURIComponent(rsn)}`, { cache: "no-store" });
        if (t.ok) {
          const tj = await t.json();
          const sum = extractTempleSummary(tj);
          setPetsUnique(sum.petsUnique);
          setClogCompleted(sum.collectionLogCompleted);
          setClogAvailable(sum.collectionLogAvailable);
        }
      } catch {
        // ignore
      }

      // WOM
      try {
        const w = await fetch(`/api/wom/player?rsn=${encodeURIComponent(rsn)}`, { cache: "no-store" });
        if (w.ok) {
          const wj = await w.json();
          const overall = wj?.latestSnapshot?.data?.skills?.overall ?? null;
          const tl = Number(overall?.level ?? null);
          if (Number.isFinite(tl)) setTotalLevel(tl);

          const bosses = wj?.latestSnapshot?.data?.bosses ?? {};
          let rTotal = 0;
          let bTotal = 0;

          for (const [key, metric] of Object.entries(bosses)) {
            const kc = metricToKc(metric);
            if (RAID_KEYS.has(key)) {
              rTotal += kc;
              continue;
            }
            if (ZAM_BOSS_EXCLUDE_KEYS.has(key)) continue;
            bTotal += kc;
          }

          setRaidsTotal(rTotal);
          setBossKillsTotal(bTotal);
        }
      } catch {
        // ignore
      }
    })();
  }, [isOpen, rsn]);

  const requestedRankLabel = allRanks.find((r) => r.id === requestedRankId)?.label ?? requestedRankId;
  const requestedRoleLabel = allRanks.find((r) => r.id === requestedRoleId)?.label ?? requestedRoleId;

  const canSubmit =
    Boolean(rsn?.trim()) && Boolean(requestedRankId) && Boolean(requesterDiscordId.trim());

  if (!isOpen) return null;

  async function submit() {
    setErrorMsg("");
    setState("submitting");

    try {
      const res = await fetch("/api/review-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          rsn,
          requestedRank: requestedRankLabel,
          requestedRole: roleSameAsRank ? requestedRankLabel : requestedRoleLabel,
          requesterDiscordId: requesterDiscordId.trim(),
          notes: notes.trim() || undefined,

          // item checklist summary
          itemPointsEarned: evaled.pointsEarned,
          itemNextThreshold: evaled.nextRank?.thresholdPoints ?? null,
          itemQualifiedRankLabel: evaled.qualifiedRank?.label ?? undefined,
          itemNextRankLabel: evaled.nextRank?.label ?? undefined,

          // skilling + zam info
          totalLevel,
          raidsTotal,
          bossKillsTotal,

          // pets/clog
          petsUnique,
          collectionLogCompleted: clogCompleted,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setErrorMsg(json?.error || json?.message || "Failed to submit request.");
        return;
      }

      setState("success");
    } catch (e: any) {
      setState("error");
      setErrorMsg(e?.message || "Network error.");
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "grid",
    placeItems: "center",
    padding: 18,
    background: "rgba(0,0,0,0.78)",
    backdropFilter: "blur(10px)",
  };

  const panelStyle: React.CSSProperties = {
    width: "min(760px, 100%)",
    borderRadius: 18,
    border: `1px solid ${UI.border}`,
    background: UI.panel,
    boxShadow: "0 24px 90px rgba(0,0,0,0.70)",
    overflow: "hidden",
  };

  const headerStyle: React.CSSProperties = {
    padding: "14px 16px",
    borderBottom: `1px solid ${UI.borderSoft}`,
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: UI.panel,
  };

  const bodyStyle: React.CSSProperties = {
    padding: 16,
    display: "grid",
    gap: 12,
    background: UI.panel,
  };

  const footerStyle: React.CSSProperties = {
    padding: 16,
    borderTop: `1px solid ${UI.borderSoft}`,
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    background: UI.panel,
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    background: UI.panelStrong,
    border: `1px solid ${UI.borderSoft}`,
    color: UI.text,
    outline: "none",
    fontWeight: 800,
  };

  const optionStyle: React.CSSProperties = { color: "black", background: "white" };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={overlayStyle}
    >
      <div style={panelStyle}>
        <div style={headerStyle}>
          <div style={{ fontWeight: 1000, letterSpacing: 0.3 }}>Submit for review</div>

          <div style={{ marginLeft: "auto" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: `1px solid ${UI.borderSoft}`,
                background: UI.panelStrong,
                color: UI.text,
                borderRadius: 12,
                padding: "8px 10px",
                cursor: "pointer",
                fontWeight: 1000,
              }}
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div style={bodyStyle}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>Character</div>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                background: UI.panelStrong,
                border: `1px solid ${UI.borderSoft}`,
                fontWeight: 1000,
              }}
            >
              {rsn}
              <span style={{ marginLeft: 10, opacity: 0.65, fontWeight: 800 }}>({playerId})</span>
            </div>
          </div>

          {/* Preview blocks (staff-visible data) */}
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${UI.borderSoft}`,
              fontWeight: 900,
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div style={{ opacity: 0.85 }}>Item points</div>
              <div style={{ fontFamily: "serif" }}>
                {evaled.pointsEarned.toLocaleString()} /{" "}
                {typeof evaled.nextRank?.thresholdPoints === "number"
                  ? evaled.nextRank.thresholdPoints.toLocaleString()
                  : "—"}{" "}
                Points
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div style={{ opacity: 0.85 }}>Unique pets</div>
              <div style={{ fontFamily: "serif" }}>{petsUnique != null ? petsUnique.toLocaleString() : "—"}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div style={{ opacity: 0.85 }}>Collection log</div>
              <div style={{ fontFamily: "serif" }}>
                {clogCompleted != null ? clogCompleted.toLocaleString() : "—"}
                {clogAvailable != null ? ` / ${clogAvailable.toLocaleString()}` : ""}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div style={{ opacity: 0.85 }}>Total level</div>
              <div style={{ fontFamily: "serif" }}>{totalLevel != null ? totalLevel.toLocaleString() : "—"}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900 }}>Requested rank</div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <img
                  src={iconSrc(requestedRankId)}
                  alt=""
                  width={28}
                  height={28}
                  style={{
                    imageRendering: "pixelated",
                    borderRadius: 8,
                    background: UI.panelStrong,
                    border: `1px solid ${UI.borderSoft}`,
                    padding: 3,
                  }}
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.onerror = null;
                    img.src = "/ranks/placeholder.png";
                  }}
                />

                <select
                  value={requestedRankId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setRequestedRankId(nextId);
                    if (roleSameAsRank) setRequestedRoleId(nextId);
                  }}
                  style={fieldStyle}
                >
                  <optgroup label="PvM">
                    {allRanks
                      .filter((r) => r.group === "PvM")
                      .map((r) => (
                        <option key={r.id} value={r.id} style={optionStyle}>
                          {r.label}
                        </option>
                      ))}
                  </optgroup>

                  <optgroup label="Skilling">
                    {allRanks
                      .filter((r) => r.group === "Skilling")
                      .map((r) => (
                        <option key={r.id} value={r.id} style={optionStyle}>
                          {r.label}
                        </option>
                      ))}
                  </optgroup>

                  <optgroup label="Special">
                    {allRanks
                      .filter((r) => r.group === "Special")
                      .map((r) => (
                        <option key={r.id} value={r.id} style={optionStyle}>
                          {r.label}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900 }}>Requested role</div>

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.85, fontWeight: 900 }}>
                  <input
                    type="checkbox"
                    checked={roleSameAsRank}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setRoleSameAsRank(v);
                      if (v) setRequestedRoleId(requestedRankId);
                    }}
                    style={{ width: 16, height: 16 }}
                  />
                  Same as rank
                </label>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <img
                  src={iconSrc(roleSameAsRank ? requestedRankId : requestedRoleId)}
                  alt=""
                  width={28}
                  height={28}
                  style={{
                    imageRendering: "pixelated",
                    borderRadius: 8,
                    background: UI.panelStrong,
                    border: `1px solid ${UI.borderSoft}`,
                    padding: 3,
                    opacity: roleSameAsRank ? 0.9 : 1,
                  }}
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.onerror = null;
                    img.src = "/ranks/placeholder.png";
                  }}
                />

                <select
                  value={requestedRoleId}
                  onChange={(e) => setRequestedRoleId(e.target.value)}
                  style={{ ...fieldStyle, opacity: roleSameAsRank ? 0.6 : 1 }}
                  disabled={roleSameAsRank}
                >
                  <optgroup label="PvM">
                    {allRanks
                      .filter((r) => r.group === "PvM")
                      .map((r) => (
                        <option key={r.id} value={r.id} style={optionStyle}>
                          {r.label}
                        </option>
                      ))}
                  </optgroup>

                  <optgroup label="Skilling">
                    {allRanks
                      .filter((r) => r.group === "Skilling")
                      .map((r) => (
                        <option key={r.id} value={r.id} style={optionStyle}>
                          {r.label}
                        </option>
                      ))}
                  </optgroup>

                  <optgroup label="Special">
                    {allRanks
                      .filter((r) => r.group === "Special")
                      .map((r) => (
                        <option key={r.id} value={r.id} style={optionStyle}>
                          {r.label}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85, fontWeight: 900 }}>Requester Discord ID</span>
            <input
              value={requesterDiscordId}
              onChange={(e) => setRequesterDiscordId(e.target.value)}
              placeholder="e.g. 208786500249321472"
              style={fieldStyle}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85, fontWeight: 900 }}>Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Anything staff should know…"
              style={{
                ...fieldStyle,
                resize: "vertical",
                lineHeight: 1.35,
                fontWeight: 700,
              }}
            />
          </label>

          {state === "error" ? (
            <div
              style={{
                border: `1px solid ${UI.redBorder}`,
                background: "rgba(198,40,40,0.18)",
                color: UI.text,
                padding: "10px 12px",
                borderRadius: 12,
                fontWeight: 900,
              }}
            >
              {errorMsg || "Failed to submit."}
            </div>
          ) : null}

          {state === "success" ? (
            <div
              style={{
                border: `1px solid ${UI.borderSoft}`,
                background: "rgba(26,255,0,0.12)",
                color: UI.text,
                padding: "10px 12px",
                borderRadius: 12,
                fontWeight: 1000,
              }}
            >
              ✅ Submitted! Staff will review it.
            </div>
          ) : null}
        </div>

        <div style={footerStyle}>
          <button
            type="button"
            onClick={onClose}
            disabled={state === "submitting"}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: `1px solid ${UI.borderSoft}`,
              background: UI.panelStrong,
              color: UI.text,
              cursor: "pointer",
              fontWeight: 900,
              opacity: state === "submitting" ? 0.7 : 1,
            }}
          >
            Close
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || state === "submitting" || state === "success"}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: `1px solid ${UI.redBorder}`,
              background: UI.red,
              color: "white",
              cursor:
                !canSubmit || state === "submitting" || state === "success"
                  ? "not-allowed"
                  : "pointer",
              fontWeight: 1000,
              opacity: !canSubmit || state === "submitting" || state === "success" ? 0.7 : 1,
            }}
          >
            {state === "submitting"
              ? "Submitting..."
              : state === "success"
              ? "Submitted"
              : "Submit for review"}
          </button>
        </div>
      </div>
    </div>
  );
}
