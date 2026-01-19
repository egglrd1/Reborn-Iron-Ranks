"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import IconImg from "@/app/components/IconImg";

// ✅ global colors (existing keys only)
import { UI } from "@/lib/uiColors";

type RosterPlayer = { id: number; username: string; displayName?: string };
type RosterResponse = { group: any; roster: RosterPlayer[] };

function norm(s: string) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export default function NewPlayerPage() {
  const router = useRouter();

  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(true);

  const [rsn, setRsn] = useState("");

  // ✅ NEW: searchable picker state
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  // temp until we wire Discord login
  const [discordId, setDiscordId] = useState("208786500249321472");

  const [saving, setSaving] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadRoster() {
      try {
        const res = await fetch("/api/roster", { cache: "no-store" });
        const json: RosterResponse = await res.json();
        setRoster(json.roster ?? []);
      } catch (e) {
        console.error("Failed to load roster", e);
      } finally {
        setLoadingRoster(false);
      }
    }
    loadRoster();
  }, []);

  // Close picker when clicking outside
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const el = wrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as any)) setPickerOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  // When rsn changes externally (selected), sync query for nice display
  useEffect(() => {
    if (rsn) setQuery(rsn);
  }, [rsn]);

  const rosterForSearch = useMemo(() => {
    return roster.map((p) => {
      const value = p.displayName || p.username;
      const label =
        p.displayName && p.displayName !== p.username ? `${p.displayName} (${p.username})` : value;

      return {
        id: p.id,
        value,
        label,
        search: norm(`${value} ${label} ${p.username}`),
      };
    });
  }, [roster]);

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return rosterForSearch.slice(0, 40);

    // prioritize startsWith matches
    const starts: any[] = [];
    const contains: any[] = [];

    for (const p of rosterForSearch) {
      if (p.search.startsWith(q)) starts.push(p);
      else if (p.search.includes(q)) contains.push(p);
      if (starts.length + contains.length >= 60) break;
    }

    return [...starts, ...contains].slice(0, 60);
  }, [rosterForSearch, query]);

  async function onSave() {
    if (!rsn) {
      alert("Pick a player.");
      return;
    }
    if (!discordId.trim()) {
      alert("Discord ID is required (temp).");
      return;
    }

    // ✅ Join date removed from UI; default to today (YYYY-MM-DD)
    const joinDate = new Date().toISOString().slice(0, 10);

    setSaving(true);
    try {
      const res = await fetch("/api/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rsn,
          join_date: joinDate,
          scaling: 100,
          discord_id: discordId.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("Save failed:", json);
        alert(json?.error || json?.message || "Failed to save");
        return;
      }

      router.push("/players");
    } catch (e) {
      console.error(e);
      alert("Failed to save (network error).");
    } finally {
      setSaving(false);
    }
  }

  const fieldStyles: React.CSSProperties = {
    padding: 10,
    borderRadius: 10,
    background: UI.panel,
    border: `1px solid ${UI.border}`,
    color: UI.text,
  };

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
      {/* Center wrapper (matches other pages) */}
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* TOPBAR (matches calculator + /players) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <BackButton fallbackHref="/players" />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 10px",
              borderRadius: 14,
              border: `1px solid ${UI.border}`,
              background: UI.panel,
            }}
          >
            <IconImg
              src="/clan/icon.png"
              alt="Reborn Irons"
              size={34}
              style={{
                borderRadius: 10,
                background: UI.panelStrong,
                border: `1px solid ${UI.borderSoft}`,
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
              <div style={{ fontSize: 11, opacity: 0.7 }}>Rank Calculator</div>
            </div>
          </div>

          <div style={{ marginLeft: "auto" }} />
        </div>

        {/* CONTENT CARD */}
        <div
          style={{
            borderRadius: 16,
            border: `1px solid ${UI.border}`,
            background: UI.panel,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              background: UI.panelStrong,
              borderBottom: `1px solid ${UI.borderSoft}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 1000, letterSpacing: 0.3 }}>Add new player</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Pick from roster and save</div>
          </div>

          <div style={{ padding: 14 }}>
            <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
              {/* ✅ REPLACED: janky select -> searchable picker */}
              <div ref={wrapRef} style={{ display: "grid", gap: 6, position: "relative" }}>
                <span>Player name</span>

                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPickerOpen(true);
                    // if they start typing after selecting, clear the rsn until they pick again
                    if (rsn) setRsn("");
                  }}
                  onFocus={() => setPickerOpen(true)}
                  placeholder={loadingRoster ? "Loading roster..." : "Search a player…"}
                  style={fieldStyles}
                />

                {/* Selected indicator */}
                {rsn ? (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Selected: <b>{rsn}</b>
                  </div>
                ) : null}

                {pickerOpen ? (
                  <div
                    style={{
                      position: "absolute",
                      top: 70,
                      left: 0,
                      right: 0,
                      borderRadius: 12,
                      border: `1px solid ${UI.borderSoft}`,
                      background: UI.panelStrong,
                      boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
                      overflow: "hidden",
                      zIndex: 50,
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 10px",
                        borderBottom: `1px solid ${UI.borderSoft}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        {loadingRoster
                          ? "Loading…"
                          : query.trim()
                          ? `Matches (${filtered.length})`
                          : `Top players (${filtered.length})`}
                      </div>

                      <button
                        type="button"
                        onClick={() => setPickerOpen(false)}
                        style={{
                          border: `1px solid ${UI.borderSoft}`,
                          background: UI.panel,
                          color: UI.text,
                          borderRadius: 10,
                          padding: "6px 8px",
                          cursor: "pointer",
                          fontWeight: 900,
                          fontSize: 12,
                          opacity: 0.9,
                        }}
                      >
                        Close
                      </button>
                    </div>

                    <div
                      style={{
                        maxHeight: 320,
                        overflowY: "auto",
                      }}
                    >
                      {!loadingRoster && filtered.length === 0 ? (
                        <div style={{ padding: 10, opacity: 0.75, fontSize: 13 }}>
                          No matches. Try a different spelling.
                        </div>
                      ) : null}

                      {filtered.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setRsn(p.value);
                            setQuery(p.value);
                            setPickerOpen(false);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 10px",
                            background: "transparent",
                            border: "none",
                            borderBottom: `1px solid ${UI.borderSoft}`,
                            color: UI.text,
                            cursor: "pointer",
                            fontWeight: 900,
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Join date removed */}

              <label style={{ display: "grid", gap: 6 }}>
                <span>Discord ID (temp)</span>
                <input
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value)}
                  style={fieldStyles}
                />
              </label>

              <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                <button
                  onClick={() => {
                    if (typeof window !== "undefined" && window.history.length > 1) {
                      router.back();
                    } else {
                      router.push("/players");
                    }
                  }}
                  style={{
                    padding: "12px 18px",
                    borderRadius: 12,
                    background: UI.panel,
                    border: `1px solid ${UI.border}`,
                    color: UI.text,
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
                >
                  Back
                </button>

                <button
                  onClick={onSave}
                  disabled={saving}
                  style={{
                    padding: "12px 18px",
                    borderRadius: 12,
                    background: UI.red,
                    border: `1px solid ${UI.redBorder}`,
                    color: "white",
                    cursor: saving ? "not-allowed" : "pointer",
                    minWidth: 140,
                    opacity: saving ? 0.7 : 1,
                    fontWeight: 900,
                  }}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
          Tip: roster comes from <b>/api/roster</b>.
        </div>
      </div>
    </main>
  );
}
