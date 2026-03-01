// app/admin/ConfigEditorClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type ActiveConfig = {
  id: string;
  created_at: string;
  is_active: boolean;
  config_json: any;
  notes: string | null;
  author_discord_id: string | null;
};

export default function ConfigEditorClient() {
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ActiveConfig | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [notes, setNotes] = useState("");
  const [publishNotes, setPublishNotes] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const prettyCreated = useMemo(() => {
    if (!active?.created_at) return "—";
    const d = new Date(active.created_at);
    return Number.isFinite(d.getTime()) ? d.toLocaleString() : active.created_at;
  }, [active?.created_at]);

  async function load() {
    setErr(null);
    setOkMsg(null);
    setLoading(true);
    try {
      const r = await fetch("/api/admin/config", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      const a = (j?.active ?? null) as ActiveConfig | null;
      setActive(a);
      setNotes(a?.notes ?? "");
      setJsonText(a?.config_json ? JSON.stringify(a.config_json, null, 2) : "");
    } catch (e: any) {
      setErr(e?.message || "Failed to load config.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function publish() {
    setErr(null);
    setOkMsg(null);

    let parsed: any;
    try {
      parsed = jsonText.trim() ? JSON.parse(jsonText) : null;
    } catch {
      setErr("Config JSON is not valid JSON.");
      return;
    }

    try {
      const r = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configJson: parsed,
          notes: publishNotes.trim() ? publishNotes.trim() : null,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setOkMsg(`Published config version: ${j?.id || "OK"}`);
      setPublishNotes("");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Publish failed.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: 12,
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Active config</div>

        {loading ? (
          <div style={{ opacity: 0.8 }}>Loading…</div>
        ) : !active ? (
          <div style={{ opacity: 0.8 }}>No active config found.</div>
        ) : (
          <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
            <div>
              <b>ID:</b> {active.id}
            </div>
            <div>
              <b>Published:</b> {prettyCreated}
            </div>
            <div>
              <b>Author:</b>{" "}
              {active.author_discord_id ? (
                <span>
                  <code>{active.author_discord_id}</code>
                </span>
              ) : (
                "—"
              )}
            </div>
            <div>
              <b>Notes:</b> {notes?.trim() ? notes : "—"}
            </div>
          </div>
        )}

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={load}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Reload from DB
          </button>
        </div>
      </div>

      {err ? (
        <div
          style={{
            border: "1px solid rgba(255,0,0,0.35)",
            background: "rgba(255,0,0,0.12)",
            borderRadius: 12,
            padding: 10,
            fontWeight: 800,
          }}
        >
          ❌ {err}
        </div>
      ) : null}

      {okMsg ? (
        <div
          style={{
            border: "1px solid rgba(0,255,0,0.25)",
            background: "rgba(0,255,0,0.10)",
            borderRadius: 12,
            padding: 10,
            fontWeight: 800,
          }}
        >
          ✅ {okMsg}
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: 12,
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Edit config JSON</div>

        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          spellCheck={false}
          style={{
            width: "100%",
            minHeight: 360,
            resize: "vertical",
            borderRadius: 12,
            padding: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.35)",
            color: "white",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 12,
            lineHeight: 1.35,
          }}
        />

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 900, fontSize: 13, opacity: 0.95 }}>Publish notes (optional)</div>
            <input
              value={publishNotes}
              onChange={(e) => setPublishNotes(e.target.value)}
              placeholder="What changed? (e.g. added items to Yama, adjusted points)"
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                fontWeight: 800,
              }}
            />
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={publish}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,0,0,0.45)",
                background: "rgba(255,0,0,0.85)",
                color: "white",
                fontWeight: 1000,
                cursor: "pointer",
              }}
            >
              Publish config
            </button>
          </div>

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Notes are saved on the config version so other admins can see what changed.
          </div>
        </div>
      </div>
    </div>
  );
}