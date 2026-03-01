"use client";


import { useSession } from "next-auth/react";
// app/admin/config/ui/ConfigEditorClient.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ITEMS as FALLBACK_ITEMS,
  REQUIRED_REQUIREMENTS,
  type ItemDef,
  type Requirement,
} from "@/lib/reborn_item_points";
import { PVM_RANKS, type RankDef } from "@/lib/reborn_rank_rules";

type ItemRow = ItemDef & {
  enabled?: boolean;
  imageUrl?: string;
};

type UiConfig = {
  schemaVersion: number;
  itemPoints: {
    items: ItemRow[];
    requiredRequirements: Requirement[];
  };
  pvmRanks: RankDef[];
};

type BossPick = { slug: string; title: string };
type BossItemPick = { title: string; thumb: string | null };

type ConfigVersionRow = {
  id: string;
  name: string | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string | null;
  created_by: string | null;
  author_discord_id: string | null;
  author_name?: string | null;
};

function normalize(s: string) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function safeInt(v: any, fallback = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function slugify(name: string) {
  return String(name)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\*\*\*|\*\*|\*/g, "")
    .replace(/[†]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function panelStyle(): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    padding: 14,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "9px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    outline: "none",
    fontWeight: 900,
    minWidth: 0,
    boxSizing: "border-box",
  };
}

function selectStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    appearance: "none",
  };
}

/** button system (clean + consistent) */
type BtnTone = "primary" | "secondary" | "danger" | "ghost";
function buttonStyle(disabled?: boolean, tone: BtnTone = "primary"): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    color: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 950,
    background: "rgba(255,255,255,0.08)",
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "normal",
    lineHeight: 1.05,
  };

  if (tone === "primary") base.background = disabled ? "rgba(255,255,255,0.06)" : "#2e2a6a";
  if (tone === "secondary") base.background = disabled ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.10)";
  if (tone === "danger") base.background = disabled ? "rgba(255,255,255,0.06)" : "#7a1b1b";
  if (tone === "ghost") {
    base.background = "transparent";
    base.border = "1px solid rgba(255,255,255,0.10)";
    base.whiteSpace = "nowrap";
  }

  return base;
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(46,42,106,0.55)" : "rgba(255,255,255,0.08)",
    color: "white",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 12,
    whiteSpace: "nowrap",
  };
}

/** tiny media query hook (no deps) */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(query);
    const onChange = () => setMatches(!!m.matches);
    onChange();
    if (m.addEventListener) m.addEventListener("change", onChange);
    else (m as any).addListener(onChange);
    return () => {
      if (m.removeEventListener) m.removeEventListener("change", onChange);
      else (m as any).removeListener(onChange);
    };
  }, [query]);

  return matches;
}

function ensureUiConfig(initialConfig: any): UiConfig {
  if (
    initialConfig &&
    typeof initialConfig === "object" &&
    initialConfig.itemPoints &&
    Array.isArray(initialConfig.itemPoints.items) &&
    Array.isArray(initialConfig.itemPoints.requiredRequirements) &&
    Array.isArray(initialConfig.pvmRanks)
  ) {
    return {
      schemaVersion: Number(initialConfig.schemaVersion ?? 1),
      itemPoints: {
        items: (initialConfig.itemPoints.items as any[]).map((x) => ({
          id: String(x.id),
          name: String(x.name),
          points: x.points === null || typeof x.points === "number" ? x.points : null,
          group: x.group ? String(x.group) : undefined,
          notes: x.notes ? String(x.notes) : undefined,
          enabled: x.enabled === false ? false : true,
          imageUrl: x.imageUrl ? String(x.imageUrl) : undefined,
        })),
        requiredRequirements: initialConfig.itemPoints.requiredRequirements as Requirement[],
      },
      pvmRanks: (initialConfig.pvmRanks as any[]).map((r) => ({
        id: String(r.id) as any,
        label: String(r.label),
        thresholdPoints: typeof r.thresholdPoints === "number" ? r.thresholdPoints : undefined,
        requiresBase: !!r.requiresBase,
        requiresInfernal: !!r.requiresInfernal,
      })),
    };
  }

  return {
    schemaVersion: 1,
    itemPoints: {
      items: FALLBACK_ITEMS.map((it) => ({ ...(it as any), enabled: true })),
      requiredRequirements: REQUIRED_REQUIREMENTS,
    },
    pvmRanks: PVM_RANKS,
  };
}

function itemImgSrc(it: ItemRow) {
  return it.imageUrl || `/items/${it.id}.png`;
}

function rankImgSrc(id: string) {
  return `/ranks/${id}.png`;
}

function getGroupOrderFromItems(items: ItemRow[]) {
  const seen = new Set<string>();
  const groups: string[] = [];
  for (const it of items) {
    const g = it.group ?? "Other";
    if (!seen.has(g)) {
      seen.add(g);
      groups.push(g);
    }
  }
  if (!seen.has("Other")) groups.push("Other");
  return groups;
}

function collectGroups(items: ItemRow[]) {
  const groups = new Map<string, ItemRow[]>();
  for (const it of items) {
    const g = it.group ?? "Other";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(it);
  }
  return groups;
}

function fmtWhen(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function ConfigEditorClient({ initialConfig }: { initialConfig: any }) {
  const { data: session } = useSession();

  const authorDiscordId =
    (session as any)?.discordId ? String((session as any).discordId) : null;

  function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers || {});
  if (authorDiscordId) headers.set("x-admin-discord-id", authorDiscordId);
  return fetch(input, {
    ...init,
    cache: "no-store",
    headers,
  });
}

const createdBy =
    (session as any)?.user?.name
      ? String((session as any).user.name)
      : (session as any)?.user?.username
      ? String((session as any).user.username)
      : (session as any)?.user?.email
      ? String((session as any).user.email)
      : null;
  const [cfg, setCfg] = useState<UiConfig>(() => ensureUiConfig(initialConfig));
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState<"items" | "ranks">("items");
  const [q, setQ] = useState("");
  const [showDisabled, setShowDisabled] = useState(true);

  // history/changelog
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<ConfigVersionRow[]>([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  // responsive breakpoints for the editor rows
  const isWide = useMediaQuery("(min-width: 1100px)");
  const isMid = useMediaQuery("(min-width: 820px)");

  // ✅ Add Item modal state
  const [addOpen, setAddOpen] = useState(false);
  const [addGroupMode, setAddGroupMode] = useState<"auto" | "pick" | "new">("auto");
  const [addGroupPick, setAddGroupPick] = useState("");
  const [addGroupNew, setAddGroupNew] = useState("");
  const [addPointsMode, setAddPointsMode] = useState<"points" | "required">("points");
  const [addPoints, setAddPoints] = useState(0);

  // Boss-driven add flow
  const [bossQ, setBossQ] = useState("");
  const [bossLoading, setBossLoading] = useState(false);
  const [bossResults, setBossResults] = useState<BossPick[]>([]);
  const [bossPick, setBossPick] = useState<BossPick | null>(null);

  const [bossItemsLoading, setBossItemsLoading] = useState(false);
  const [bossItems, setBossItems] = useState<BossItemPick[]>([]);
  const [bossSelected, setBossSelected] = useState<Record<string, boolean>>({});
  const [bossItemFilter, setBossItemFilter] = useState("");

  const bossTimer = useRef<any>(null);

  const enabledCount = useMemo(
    () => cfg.itemPoints.items.filter((x) => x.enabled !== false).length,
    [cfg.itemPoints.items]
  );
  const totalCount = cfg.itemPoints.items.length;

  const groupOrder = useMemo(() => getGroupOrderFromItems(cfg.itemPoints.items), [cfg.itemPoints.items]);
  const groupMap = useMemo(() => collectGroups(cfg.itemPoints.items), [cfg.itemPoints.items]);

  const filteredGroupOrder = useMemo(() => {
    const nq = normalize(q);
    if (!nq) return groupOrder;

    const keep = new Set<string>();
    for (const g of groupOrder) {
      if (normalize(g).includes(nq)) keep.add(g);
    }
    for (const it of cfg.itemPoints.items) {
      const enabled = it.enabled !== false;
      if (!showDisabled && !enabled) continue;
      const hay = normalize(`${it.name} ${it.group ?? ""} ${it.id}`);
      if (hay.includes(nq)) keep.add(it.group ?? "Other");
    }
    return groupOrder.filter((g) => keep.has(g));
  }, [groupOrder, q, cfg.itemPoints.items, showDisabled]);

  const allGroups = groupOrder;

  const existingNameSet = useMemo(() => {
    const set = new Set<string>();
    for (const it of cfg.itemPoints.items) set.add(normalize(it.name));
    return set;
  }, [cfg.itemPoints.items]);

  const bossSelectedNewCount = useMemo(() => {
    let n = 0;
    for (const [title, v] of Object.entries(bossSelected)) {
      if (!v) continue;
      if (existingNameSet.has(normalize(title))) continue;
      n++;
    }
    return n;
  }, [bossSelected, existingNameSet]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const r = await apiFetch("/api/admin/config", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error ?? "Failed to load history");
      setHistory(Array.isArray(j.history) ? (j.history as ConfigVersionRow[]) : []);
    } catch (e: any) {
      setStatus({ ok: false, msg: e?.message ?? "Failed to load changelog." });
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    // load once on mount
    loadHistory();
  }, []);

  async function refreshActive() {
    setStatus(null);
    try {
      const r = await apiFetch("/api/admin/config", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error ?? "Failed to load");
      const active = j?.active?.config_json ?? null;
      if (!active) return setStatus({ ok: false, msg: "No active config found." });

      setCfg(ensureUiConfig(active));
      setStatus({ ok: true, msg: "Loaded active config from DB." });
      await loadHistory();
    } catch (e: any) {
      setStatus({ ok: false, msg: e?.message ?? String(e) });
    }
  }

  async function publish() {
    setStatus(null);
    setSaving(true);
    try {
      const r = await apiFetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // NOTE: if you later have the current discord user on the client,
        // you can add: authorDiscordId / createdBy here.
        body: JSON.stringify({
          configJson: cfg,
          notes,
          authorDiscordId,
          createdBy,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error ?? "Publish failed");
      setStatus({ ok: true, msg: `Published new config: ${j.id}` });
      await loadHistory();
    } catch (e: any) {
      setStatus({ ok: false, msg: e?.message ?? String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function rollbackTo(id: string) {
    setStatus(null);
    setRollingBackId(id);
    try {
      const r = await apiFetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rollback", id }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error ?? "Rollback failed");

      setStatus({ ok: true, msg: `Rolled back. Active config is now: ${id}` });
      await refreshActive();
      await loadHistory();
    } catch (e: any) {
      setStatus({ ok: false, msg: e?.message ?? "Rollback failed." });
    } finally {
      setRollingBackId(null);
    }
  }

  async function loadVersionIntoEditor(id: string) {
    setStatus(null);
    try {
      const r = await apiFetch("/api/admin/config", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error ?? "Failed to load versions");

      // We only returned history metadata for speed; grab the version JSON via a second query:
      // easiest: fetch directly from a new endpoint, but we can do a simple POST-less approach:
      const rr = await apiFetch("/api/admin/config/version?id=" + encodeURIComponent(id), { cache: "no-store" });
      const jj = await rr.json().catch(() => ({}));
      if (!rr.ok || !jj?.ok) throw new Error(jj?.error ?? "Failed to load version JSON");

      const cfgJson = jj?.config_json ?? null;
      if (!cfgJson) throw new Error("Version has no config_json");

      setCfg(ensureUiConfig(cfgJson));
      setStatus({ ok: true, msg: `Loaded version into editor (not active): ${id}` });
      setTab("items");
    } catch (e: any) {
      setStatus({ ok: false, msg: e?.message ?? "Failed to load version into editor." });
    }
  }

  // ===== Items mutations =====
  function setItemEnabled(id: string, enabled: boolean) {
    setCfg((prev) => ({
      ...prev,
      itemPoints: {
        ...prev.itemPoints,
        items: prev.itemPoints.items.map((it) => (it.id === id ? { ...it, enabled } : it)),
      },
    }));
  }

  function setItemPoints(id: string, points: number | null) {
    setCfg((prev) => ({
      ...prev,
      itemPoints: {
        ...prev.itemPoints,
        items: prev.itemPoints.items.map((it) => (it.id === id ? { ...it, points } : it)),
      },
    }));
  }

  function setItemGroup(id: string, group: string) {
    setCfg((prev) => ({
      ...prev,
      itemPoints: {
        ...prev.itemPoints,
        items: prev.itemPoints.items.map((it) => (it.id === id ? { ...it, group } : it)),
      },
    }));
  }

  function setItemName(id: string, name: string) {
    setCfg((prev) => ({
      ...prev,
      itemPoints: {
        ...prev.itemPoints,
        items: prev.itemPoints.items.map((it) => (it.id === id ? { ...it, name } : it)),
      },
    }));
  }

  function setItemImageUrl(id: string, imageUrl?: string) {
    setCfg((prev) => ({
      ...prev,
      itemPoints: {
        ...prev.itemPoints,
        items: prev.itemPoints.items.map((it) =>
          it.id === id ? { ...it, imageUrl: imageUrl?.trim() ? imageUrl.trim() : undefined } : it
        ),
      },
    }));
  }

  function moveItem(id: string, dir: -1 | 1) {
    setCfg((prev) => {
      const arr = [...prev.itemPoints.items];
      const idx = arr.findIndex((x) => x.id === id);
      if (idx < 0) return prev;
      const to = idx + dir;
      if (to < 0 || to >= arr.length) return prev;
      const tmp = arr[idx];
      arr[idx] = arr[to];
      arr[to] = tmp;
      return { ...prev, itemPoints: { ...prev.itemPoints, items: arr } };
    });
  }

  function moveGroup(groupName: string, dir: -1 | 1) {
    setCfg((prev) => {
      const order = getGroupOrderFromItems(prev.itemPoints.items);
      const idx = order.indexOf(groupName);
      const toIdx = idx + dir;
      if (idx < 0 || toIdx < 0 || toIdx >= order.length) return prev;

      const a = order[idx];
      const b = order[toIdx];

      const items = [...prev.itemPoints.items];
      const aItems: ItemRow[] = [];
      const bItems: ItemRow[] = [];
      const rest: ItemRow[] = [];

      for (const it of items) {
        const g = it.group ?? "Other";
        if (g === a) aItems.push(it);
        else if (g === b) bItems.push(it);
        else rest.push(it);
      }

      const out: ItemRow[] = [];
      const firstSeen = getGroupOrderFromItems(items);

      for (const g of firstSeen) {
        if (g === a) out.push(...(dir === -1 ? aItems : bItems));
        else if (g === b) out.push(...(dir === -1 ? bItems : aItems));
        else for (const it of rest) if ((it.group ?? "Other") === g) out.push(it);
      }

      if (out.length !== items.length) return prev;
      return { ...prev, itemPoints: { ...prev.itemPoints, items: out } };
    });
  }

  // ===== Rank mutations =====
  function setRankField(idx: number, patch: Partial<RankDef>) {
    setCfg((prev) => {
      const next = [...prev.pvmRanks];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, pvmRanks: next };
    });
  }

  function moveRank(idx: number, dir: -1 | 1) {
    setCfg((prev) => {
      const next = [...prev.pvmRanks];
      const to = idx + dir;
      if (to < 0 || to >= next.length) return prev;
      const tmp = next[idx];
      next[idx] = next[to];
      next[to] = tmp;
      return { ...prev, pvmRanks: next };
    });
  }

  function removeRank(idx: number) {
    setCfg((prev) => {
      if (prev.pvmRanks.length <= 1) return prev;
      const next = prev.pvmRanks.filter((_, i) => i !== idx);
      return { ...prev, pvmRanks: next };
    });
  }

  function addRank() {
    setCfg((prev) => ({
      ...prev,
      pvmRanks: [
        ...prev.pvmRanks,
        {
          id: "new_rank" as any,
          label: "New Rank",
          thresholdPoints: 0,
          requiresBase: true,
          requiresInfernal: false,
        },
      ],
    }));
    setTab("ranks");
  }

  async function cacheIconForItem(itemId: string, title: string) {
    const r = await fetch("/api/admin/wiki/cache-icon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, title }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) throw new Error(j?.error ?? "Icon cache failed");
    return String(j.imageUrl || "");
  }

  // ===== Boss search + items =====
  async function bossSearchFetch(query: string) {
    const qq = query.trim();
    if (qq.length < 2) {
      setBossResults([]);
      return;
    }
    setBossLoading(true);
    try {
      const r = await fetch(`/api/admin/wiki/boss-items?q=${encodeURIComponent(qq)}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error ?? "Boss search failed");
      setBossResults(Array.isArray(j.bosses) ? j.bosses : []);
    } catch {
      setBossResults([]);
    } finally {
      setBossLoading(false);
    }
  }

  function onBossQChange(v: string) {
    setBossQ(v);
    setBossPick(null);
    setBossItems([]);
    setBossSelected({});
    setBossItemFilter("");
    if (bossTimer.current) clearTimeout(bossTimer.current);
    bossTimer.current = setTimeout(() => bossSearchFetch(v), 200);
  }

  async function loadBossItems(b: BossPick) {
    setBossPick(b);
    setBossItems([]);
    setBossSelected({});
    setBossItemFilter("");
    setBossItemsLoading(true);
    try {
      const r = await fetch(`/api/admin/wiki/boss-items?boss=${encodeURIComponent(b.slug)}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error ?? "Boss items fetch failed");
      setBossItems(Array.isArray(j.items) ? j.items : []);
    } catch {
      setBossItems([]);
    } finally {
      setBossItemsLoading(false);
    }
  }

  function openAddModal() {
    setAddOpen(true);
    setAddGroupMode("auto");
    setAddGroupPick(allGroups[0] ?? "Other");
    setAddGroupNew("");
    setAddPointsMode("points");
    setAddPoints(0);

    setBossQ("");
    setBossLoading(false);
    setBossResults([]);
    setBossPick(null);
    setBossItemsLoading(false);
    setBossItems([]);
    setBossSelected({});
    setBossItemFilter("");
  }

  function resolveAddGroup(): string {
    if (addGroupMode === "auto") return bossPick?.title ?? "Other";
    if (addGroupMode === "new") return addGroupNew.trim() || "Other";
    return addGroupPick.trim() || "Other";
  }

  async function confirmAddSelectedItems() {
    setStatus(null);

    if (!bossPick) return setStatus({ ok: false, msg: "Pick a boss first." });

    const pickedTitles = Object.entries(bossSelected)
      .filter(([_, v]) => !!v)
      .map(([k]) => k);

    const toAdd = pickedTitles.filter((t) => !existingNameSet.has(normalize(t)));

    if (!toAdd.length) {
      return setStatus({
        ok: false,
        msg: "No new items selected (everything selected is already added, or nothing checked).",
      });
    }

    const group = resolveAddGroup();
    const existingIds = new Set(cfg.itemPoints.items.map((x) => x.id));

    const created: Array<{ id: string; title: string }> = [];
    const newItems: ItemRow[] = [];

    for (const title of toAdd) {
      const base = slugify(title);
      if (!base) continue;

      let id = base;
      let i = 2;
      while (existingIds.has(id)) id = `${base}_${i++}`;
      existingIds.add(id);

      created.push({ id, title });

      newItems.push({
        id,
        name: title,
        group,
        enabled: true,
        points: addPointsMode === "required" ? null : safeInt(addPoints, 0),
        notes: "",
        imageUrl: undefined,
      });
    }

    setCfg((prev) => ({
      ...prev,
      itemPoints: { ...prev.itemPoints, items: [...newItems, ...prev.itemPoints.items] },
    }));

    setAddOpen(false);
    setTab("items");
    setQ(bossPick.title);

    // cache icons best-effort, sequential
    let cached = 0;
    for (const c of created) {
      try {
        const imageUrl = await cacheIconForItem(c.id, c.title);
        if (imageUrl) {
          cached++;
          setItemImageUrl(c.id, imageUrl);
        }
      } catch {
        // ignore
      }
    }

    setStatus({
      ok: true,
      msg: `Added ${created.length} item(s) from ${bossPick.title}. Cached icons: ${cached}/${created.length}.`,
    });
  }

  async function quickCacheIcon(it: ItemRow) {
    setStatus(null);
    try {
      const imageUrl = await cacheIconForItem(it.id, it.name);
      setItemImageUrl(it.id, imageUrl);
      setStatus({ ok: true, msg: `Cached icon for ${it.name}.` });
    } catch (e: any) {
      setStatus({ ok: false, msg: e?.message ?? "Failed to cache icon." });
    }
  }

  const filteredBossItems = useMemo(() => {
    const f = normalize(bossItemFilter);
    if (!f) return bossItems;
    return bossItems.filter((it) => normalize(it.title).includes(f));
  }, [bossItems, bossItemFilter]);

  // --- responsive row layout helpers
  function itemRowStyle(enabled: boolean): React.CSSProperties {
    if (isWide) {
      return {
        display: "grid",
        gridTemplateColumns: "44px minmax(220px, 320px) minmax(280px, 1fr) minmax(280px, 420px)",
        gridTemplateAreas: `
          "icon controls name points"
          "icon controls group  points"
        `,
        gap: 12,
        alignItems: "start",
        padding: "12px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.22)",
        opacity: enabled ? 1 : 0.58,
        minWidth: 0,
      };
    }

    if (isMid) {
      return {
        display: "grid",
        gridTemplateColumns: "44px 1fr minmax(260px, 360px)",
        gridTemplateAreas: `
          "icon name points"
          "icon controls points"
          "group group group"
        `,
        gap: 12,
        alignItems: "start",
        padding: "12px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.22)",
        opacity: enabled ? 1 : 0.58,
        minWidth: 0,
      };
    }

    return {
      display: "grid",
      gridTemplateColumns: "44px 1fr",
      gridTemplateAreas: `
        "icon name"
        "icon controls"
        "points points"
        "group group"
      `,
      gap: 12,
      alignItems: "start",
      padding: "12px 12px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(0,0,0,0.22)",
      opacity: enabled ? 1 : 0.58,
      minWidth: 0,
    };
  }

  function ranksGridStyle(): React.CSSProperties {
    if (isWide) return { display: "grid", gridTemplateColumns: "1.2fr 0.7fr 1fr", gap: 10, marginTop: 12, alignItems: "start" };
    if (isMid) return { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12, alignItems: "start" };
    return { display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 12, alignItems: "start" };
  }

  return (
    <section style={{ display: "grid", gap: 12 }}>
      {/* Sticky toolbar */}
      <div
        style={{
          position: "sticky",
          top: 12,
          zIndex: 5,
          padding: 12,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(10,10,18,0.92)",
          backdropFilter: "blur(10px)",
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button type="button" onClick={refreshActive} style={buttonStyle(false, "secondary")}>
          Reload from DB
        </button>

        <button type="button" onClick={publish} disabled={saving} style={buttonStyle(saving, "primary")}>
          {saving ? "Publishing..." : "Publish"}
        </button>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={openAddModal} style={buttonStyle(false, "primary")}>
            + Add item
          </button>
          <button type="button" onClick={addRank} style={buttonStyle(false, "secondary")}>
            + Add rank
          </button>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900, opacity: 0.85 }}>
            Items enabled: {enabledCount}/{totalCount} • Ranks: {cfg.pvmRanks.length}
          </div>
          <button type="button" onClick={() => setTab("items")} style={buttonStyle(false, tab === "items" ? "primary" : "secondary")}>
            Items
          </button>
          <button type="button" onClick={() => setTab("ranks")} style={buttonStyle(false, tab === "ranks" ? "primary" : "secondary")}>
            Ranks
          </button>
        </div>
      </div>

      {/* Notes */}
      <div style={panelStyle()}>
        <div style={{ fontWeight: 1000, marginBottom: 8 }}>Publish notes (optional)</div>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What changed?" style={inputStyle()} />
      </div>

      {/* Changelog / rollback */}
      <div style={panelStyle()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 1100, fontSize: 16 }}>Changelog</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Roll back by activating a previous config_versions row.</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => setHistoryOpen((v) => !v)} style={buttonStyle(false, "secondary")}>
              {historyOpen ? "Hide" : "Show"}
            </button>
            <button type="button" onClick={loadHistory} disabled={historyLoading} style={buttonStyle(historyLoading, "secondary")}>
              {historyLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {historyOpen ? (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {history.length === 0 ? (
              <div style={{ fontSize: 12, opacity: 0.75 }}>No versions found.</div>
            ) : (
              history.map((h) => {
                const who = h.author_name || h.created_by || (h.author_discord_id ? `Discord ${h.author_discord_id}` : "Unknown");
                const active = !!h.is_active;

                return (
                  <div
                    key={h.id}
                    style={{
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 14,
                      padding: 12,
                      background: active ? "rgba(46,42,106,0.25)" : "rgba(0,0,0,0.18)",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                        <div style={{ fontWeight: 1000, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {active ? "✅ ACTIVE • " : ""}
                          {h.name ?? "Unnamed"}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>
                          <span style={{ fontWeight: 950 }}>{who}</span> • {fmtWhen(h.created_at)} •{" "}
                          <span style={{ fontFamily: "ui-monospace" }}>{h.id}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          style={buttonStyle(false, "secondary")}
                          onClick={() => loadVersionIntoEditor(h.id)}
                          title="Load this version into the editor WITHOUT making it active"
                        >
                          Load into editor
                        </button>

                        <button
                          type="button"
                          disabled={active || rollingBackId === h.id}
                          style={buttonStyle(active || rollingBackId === h.id, "danger")}
                          onClick={() => rollbackTo(h.id)}
                          title={active ? "Already active" : "Make this version the active config"}
                        >
                          {rollingBackId === h.id ? "Rolling back..." : "Rollback to this"}
                        </button>
                      </div>
                    </div>

                    {h.notes ? (
                      <div style={{ fontSize: 12, opacity: 0.85, whiteSpace: "pre-wrap" }}>
                        <span style={{ fontWeight: 950, opacity: 0.9 }}>Notes:</span> {h.notes}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </div>

      {/* ADD ITEM MODAL */}
      {addOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.65)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAddOpen(false);
          }}
        >
          <div style={{ ...panelStyle(), width: "min(980px, 100%)", background: "rgba(12,12,20,0.96)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontWeight: 1100, fontSize: 18 }}>Add items</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Pick a boss, check the items you want, then add. Already-added items are locked.
                </div>
              </div>

              <button type="button" onClick={() => setAddOpen(false)} style={buttonStyle(false, "ghost")}>
                Close
              </button>
            </div>

            {/* Body */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.45fr", gap: 12, marginTop: 12 }}>
              {/* Left: settings + actions */}
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ ...panelStyle(), padding: 12, background: "rgba(0,0,0,0.22)" }}>
                  <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.85, marginBottom: 8 }}>Group</div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    <button type="button" style={chipStyle(addGroupMode === "auto")} onClick={() => setAddGroupMode("auto")}>
                      Auto (boss name)
                    </button>
                    <button type="button" style={chipStyle(addGroupMode === "pick")} onClick={() => setAddGroupMode("pick")}>
                      Pick existing
                    </button>
                    <button type="button" style={chipStyle(addGroupMode === "new")} onClick={() => setAddGroupMode("new")}>
                      New group
                    </button>
                  </div>

                  {addGroupMode === "pick" ? (
                    <select value={addGroupPick} onChange={(e) => setAddGroupPick(e.target.value)} style={selectStyle()}>
                      {allGroups.map((g) => (
                        <option key={g} value={g} style={{ color: "black" }}>
                          {g}
                        </option>
                      ))}
                    </select>
                  ) : addGroupMode === "new" ? (
                    <input value={addGroupNew} onChange={(e) => setAddGroupNew(e.target.value)} placeholder="New group name" style={inputStyle()} />
                  ) : (
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      Group will be: <b style={{ opacity: bossPick ? 1 : 0.7 }}>{bossPick?.title ?? "— (pick a boss)"}</b>
                    </div>
                  )}
                </div>

                <div style={{ ...panelStyle(), padding: 12, background: "rgba(0,0,0,0.22)" }}>
                  <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.85, marginBottom: 8 }}>Default points</div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    <button type="button" style={chipStyle(addPointsMode === "required")} onClick={() => setAddPointsMode("required")}>
                      Required (null)
                    </button>
                    <button type="button" style={chipStyle(addPointsMode === "points")} onClick={() => setAddPointsMode("points")}>
                      Point item
                    </button>
                  </div>

                  {addPointsMode === "points" ? (
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>Set points for newly added items:</div>
                      <input
                        value={String(addPoints)}
                        onChange={(e) => setAddPoints(safeInt(e.target.value, 0))}
                        placeholder="0"
                        style={{ ...inputStyle(), width: 120 }}
                      />
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, opacity: 0.75 }}>Newly added items will have points = null (required gate).</div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ ...panelStyle(), padding: 12, background: "rgba(0,0,0,0.22)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "grid" }}>
                      <div style={{ fontWeight: 1000 }}>Selected (new)</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        {bossPick ? bossPick.title : "Pick a boss"} • {bossSelectedNewCount}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <button type="button" onClick={() => setAddOpen(false)} style={buttonStyle(false, "danger")}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmAddSelectedItems}
                        disabled={!bossPick || bossSelectedNewCount === 0}
                        style={buttonStyle(!bossPick || bossSelectedNewCount === 0, "primary")}
                        title={!bossPick ? "Pick a boss first" : bossSelectedNewCount === 0 ? "Select at least 1 new item" : ""}
                      >
                        Add selected
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: boss + items list */}
              <div style={{ display: "grid", gap: 12 }}>
                {/* Boss picker */}
                <div style={{ ...panelStyle(), padding: 12, background: "rgba(0,0,0,0.22)" }}>
                  <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.85, marginBottom: 6 }}>Boss</div>
                  <input
                    value={bossQ}
                    onChange={(e) => onBossQChange(e.target.value)}
                    placeholder="Search boss (e.g. zulrah, hydra, tob...)"
                    style={inputStyle()}
                  />

                  <div style={{ marginTop: 10, display: "grid", gap: 8, maxHeight: 170, overflow: "auto" }}>
                    {bossLoading ? <div style={{ fontSize: 12, opacity: 0.75 }}>Searching...</div> : null}
                    {!bossLoading && bossQ.trim().length < 2 ? (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>Type 2+ characters to search.</div>
                    ) : null}

                    {!bossLoading &&
                      bossResults.map((b) => {
                        const picked = bossPick?.slug === b.slug;
                        return (
                          <button
                            key={b.slug}
                            type="button"
                            onClick={() => loadBossItems(b)}
                            style={{
                              textAlign: "left",
                              padding: "10px 10px",
                              borderRadius: 12,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: picked ? "rgba(46,42,106,0.55)" : "rgba(255,255,255,0.06)",
                              color: "white",
                              cursor: "pointer",
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            <div style={{ fontWeight: 950 }}>{b.title}</div>
                            <div style={{ fontSize: 12, opacity: 0.65, fontFamily: "ui-monospace" }}>{b.slug}</div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Items list */}
                <div style={{ ...panelStyle(), padding: 12, background: "rgba(0,0,0,0.22)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 1000 }}>
                      Items {bossPick ? <span style={{ opacity: 0.75 }}>• {bossPick.title}</span> : null}
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.75 }}>{bossItemsLoading ? "Loading..." : `${bossItems.length}`}</div>
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      value={bossItemFilter}
                      onChange={(e) => setBossItemFilter(e.target.value)}
                      placeholder="Filter items..."
                      style={{ ...inputStyle(), flex: "1 1 240px" }}
                      disabled={!bossPick || bossItemsLoading || bossItems.length === 0}
                    />

                    <button
                      type="button"
                      style={buttonStyle(false, "secondary")}
                      disabled={!bossItems.length}
                      onClick={() => {
                        const next: Record<string, boolean> = {};
                        for (const it of bossItems) {
                          if (!existingNameSet.has(normalize(it.title))) next[it.title] = true;
                        }
                        setBossSelected(next);
                      }}
                    >
                      Select all new
                    </button>

                    <button type="button" style={buttonStyle(false, "secondary")} disabled={!bossItems.length} onClick={() => setBossSelected({})}>
                      Clear
                    </button>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 8, maxHeight: 360, overflow: "auto" }}>
                    {!bossPick ? (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>Pick a boss to load its collection log items.</div>
                    ) : bossItemsLoading ? (
                      <div style={{ fontSize: 12, opacity: 0.75 }}>Loading items...</div>
                    ) : bossItems.length === 0 ? (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>No items returned for this boss.</div>
                    ) : filteredBossItems.length === 0 ? (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>No items match that filter.</div>
                    ) : (
                      filteredBossItems.map((it) => {
                        const already = existingNameSet.has(normalize(it.title));
                        const checked = !!bossSelected[it.title];

                        return (
                          <label
                            key={it.title}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "18px 34px 1fr auto",
                              alignItems: "center",
                              gap: 10,
                              padding: "10px 10px",
                              borderRadius: 12,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: already ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.06)",
                              opacity: already ? 0.55 : 1,
                              cursor: already ? "not-allowed" : "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              disabled={already}
                              checked={already ? true : checked}
                              onChange={(e) => {
                                const v = e.target.checked;
                                setBossSelected((prev) => ({ ...prev, [it.title]: v }));
                              }}
                              style={{ width: 18, height: 18 }}
                            />

                            <div style={{ width: 34, height: 34, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)" }}>
                              <img
                                src={it.thumb || "/items/placeholder.png"}
                                alt=""
                                width={34}
                                height={34}
                                style={{ display: "block", imageRendering: "pixelated" }}
                              />
                            </div>

                            <div style={{ fontWeight: 950 }}>{it.title}</div>

                            {already ? <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.75 }}>Already added</div> : null}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ITEMS TAB */}
      {tab === "items" ? (
        <>
          <div style={panelStyle()}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontWeight: 1000 }}>Items</div>

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search (name, group, id)..."
                style={{ ...inputStyle(), flex: "1 1 320px" }}
              />

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 1000, opacity: 0.9 }}>
                <input type="checkbox" checked={showDisabled} onChange={(e) => setShowDisabled(e.target.checked)} style={{ width: 18, height: 18 }} />
                Show disabled
              </label>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
              Group order + item order here will match the calculator (we reorder the <b>items array</b>).
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {filteredGroupOrder.map((groupName, gi) => {
              const items = (groupMap.get(groupName) ?? []).filter((it) => (showDisabled ? true : it.enabled !== false));

              const nq = normalize(q);
              const visibleItems = !nq
                ? items
                : items.filter(
                    (it) => normalize(`${it.name} ${it.group ?? ""} ${it.id}`).includes(nq) || normalize(groupName).includes(nq)
                  );

              if (visibleItems.length === 0) return null;

              const canUp = gi > 0;
              const canDown = gi < filteredGroupOrder.length - 1;

              return (
                <div key={groupName} style={panelStyle()}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 1000, fontSize: 16 }}>{groupName}</div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>{visibleItems.length} items</div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button type="button" style={buttonStyle(!canUp, "secondary")} disabled={!canUp} onClick={() => moveGroup(groupName, -1)}>
                        ↑ Group
                      </button>
                      <button type="button" style={buttonStyle(!canDown, "secondary")} disabled={!canDown} onClick={() => moveGroup(groupName, +1)}>
                        ↓ Group
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    {visibleItems.map((it) => {
                      const enabled = it.enabled !== false;
                      const isRequired = it.points == null;

                      const full = cfg.itemPoints.items;
                      const fullIdx = full.findIndex((x) => x.id === it.id);

                      const prevSameGroup = (() => {
                        for (let k = fullIdx - 1; k >= 0; k--) if ((full[k].group ?? "Other") === groupName) return full[k];
                        return null;
                      })();
                      const nextSameGroup = (() => {
                        for (let k = fullIdx + 1; k < full.length; k++) if ((full[k].group ?? "Other") === groupName) return full[k];
                        return null;
                      })();

                      const canItemUp = !!prevSameGroup;
                      const canItemDown = !!nextSameGroup;

                      return (
                        <div key={it.id} style={itemRowStyle(enabled)}>
                          {/* icon */}
                          <div
                            style={{
                              gridArea: "icon",
                              width: 44,
                              height: 44,
                              borderRadius: 10,
                              overflow: "hidden",
                              border: "1px solid rgba(255,255,255,0.10)",
                            }}
                          >
                            <img
                              src={itemImgSrc(it)}
                              alt=""
                              width={44}
                              height={44}
                              style={{ display: "block", imageRendering: "pixelated" }}
                              onError={(e) => {
                                const img = e.currentTarget as HTMLImageElement;
                                img.onerror = null;
                                img.src = "/items/placeholder.png";
                              }}
                            />
                          </div>

                          {/* controls */}
                          <div style={{ gridArea: "controls", display: "grid", gap: 10, alignContent: "start", minWidth: 0 }}>
                            <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 1000 }}>
                              <input type="checkbox" checked={enabled} onChange={(e) => setItemEnabled(it.id, e.target.checked)} style={{ width: 18, height: 18 }} />
                              {enabled ? "On" : "Off"}
                            </label>

                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              <button type="button" style={buttonStyle(!canItemUp, "secondary")} disabled={!canItemUp} onClick={() => moveItem(it.id, -1)}>
                                ↑
                              </button>
                              <button type="button" style={buttonStyle(!canItemDown, "secondary")} disabled={!canItemDown} onClick={() => moveItem(it.id, +1)}>
                                ↓
                              </button>
                            </div>

                            <button
                              type="button"
                              style={{ ...buttonStyle(false, "secondary"), width: "100%" }}
                              onClick={() => quickCacheIcon(it)}
                              title="Download icon from wiki and store in Supabase Storage"
                            >
                              Cache icon
                            </button>
                          </div>

                          {/* name */}
                          <div style={{ gridArea: "name", minWidth: 0, display: "grid", gap: 8 }}>
                            <input value={it.name} onChange={(e) => setItemName(it.id, e.target.value)} style={inputStyle()} />
                            <div style={{ fontSize: 12, opacity: 0.78, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              id: <span style={{ fontFamily: "ui-monospace" }}>{it.id}</span>
                            </div>
                            <input
                              value={it.imageUrl ?? ""}
                              onChange={(e) => setItemImageUrl(it.id, e.target.value)}
                              placeholder="imageUrl (optional; overrides /items/{id}.png)"
                              style={{ ...inputStyle(), fontFamily: "ui-monospace", fontWeight: 800, opacity: 0.9 }}
                            />
                          </div>

                          {/* points */}
                          <div style={{ gridArea: "points", display: "grid", gap: 10, alignContent: "start", minWidth: 0 }}>
                            <button
                              type="button"
                              onClick={() => setItemPoints(it.id, isRequired ? 0 : null)}
                              style={{ ...buttonStyle(false, isRequired ? "danger" : "secondary"), width: "100%" }}
                              title={isRequired ? "Required (points null)" : "Point item"}
                            >
                              {isRequired ? "Required" : "Point item"}
                            </button>

                            <div style={{ display: "grid", gap: 6 }}>
                              <div style={{ fontWeight: 1000, opacity: 0.85, fontSize: 12 }}>Points</div>
                              <input
                                disabled={isRequired}
                                value={isRequired ? "" : String(it.points ?? 0)}
                                onChange={(e) => setItemPoints(it.id, safeInt(e.target.value, 0))}
                                placeholder={isRequired ? "—" : "0"}
                                style={{ ...inputStyle(), width: "100%", opacity: isRequired ? 0.6 : 1 }}
                              />
                            </div>
                          </div>

                          {/* group */}
                          <div style={{ gridArea: "group", display: "grid", gap: 10, alignContent: "start", minWidth: 0 }}>
                            <div style={{ display: "grid", gap: 6 }}>
                              <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.85 }}>Group</div>
                              <input value={it.group ?? ""} onChange={(e) => setItemGroup(it.id, e.target.value)} placeholder="Group" style={inputStyle()} />
                            </div>

                            <div style={{ display: "grid", gap: 6 }}>
                              <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.85 }}>Move to group</div>
                              <select value={groupName} onChange={(e) => setItemGroup(it.id, e.target.value)} style={selectStyle()}>
                                {allGroups.map((g) => (
                                  <option key={g} value={g} style={{ color: "black" }}>
                                    {g}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {/* RANKS TAB */}
      {tab === "ranks" ? (
        <>
          <div style={panelStyle()}>
            <div style={{ fontWeight: 1000, marginBottom: 8 }}>PvM Ranks</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Order matters. Use arrows to reorder. Icons preview from /public/ranks.</div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {cfg.pvmRanks.map((r, idx) => {
              const canUp = idx > 0;
              const canDown = idx < cfg.pvmRanks.length - 1;

              return (
                <div key={`${r.id}-${idx}`} style={panelStyle()}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)" }}>
                        <img
                          src={rankImgSrc(String(r.id))}
                          alt=""
                          width={34}
                          height={34}
                          style={{ display: "block", imageRendering: "pixelated" }}
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            img.onerror = null;
                            img.src = "/ranks/placeholder.png";
                          }}
                        />
                      </div>

                      <div style={{ fontWeight: 1000 }}>
                        {idx + 1}. <span style={{ opacity: 0.85 }}>id:</span>{" "}
                        <span style={{ fontFamily: "ui-monospace" }}>{String(r.id)}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button type="button" style={buttonStyle(!canUp, "secondary")} disabled={!canUp} onClick={() => moveRank(idx, -1)}>
                        ↑
                      </button>
                      <button type="button" style={buttonStyle(!canDown, "secondary")} disabled={!canDown} onClick={() => moveRank(idx, +1)}>
                        ↓
                      </button>
                      <button type="button" style={buttonStyle(cfg.pvmRanks.length <= 1, "secondary")} disabled={cfg.pvmRanks.length <= 1} onClick={() => removeRank(idx)}>
                        Remove
                      </button>
                    </div>
                  </div>

                  <div style={ranksGridStyle()}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.85 }}>Label</div>
                      <input value={r.label} onChange={(e) => setRankField(idx, { label: e.target.value })} style={inputStyle()} />

                      <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.85 }}>Rank id</div>
                      <input
                        value={String(r.id)}
                        onChange={(e) => setRankField(idx, { id: e.target.value as any })}
                        style={{ ...inputStyle(), fontFamily: "ui-monospace" }}
                        title="Must match /public/ranks/{id}.png"
                      />
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.85 }}>Threshold points</div>
                      <input
                        value={typeof r.thresholdPoints === "number" ? String(r.thresholdPoints) : ""}
                        onChange={(e) => setRankField(idx, { thresholdPoints: safeInt(e.target.value, 0) })}
                        placeholder="0"
                        style={inputStyle()}
                      />
                      <div style={{ fontSize: 12, opacity: 0.7 }}>0 = base-only rank</div>
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 1000 }}>
                        <input type="checkbox" checked={!!r.requiresBase} onChange={(e) => setRankField(idx, { requiresBase: e.target.checked })} style={{ width: 18, height: 18 }} />
                        Requires base items
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 1000 }}>
                        <input
                          type="checkbox"
                          checked={!!r.requiresInfernal}
                          onChange={(e) => setRankField(idx, { requiresInfernal: e.target.checked })}
                          style={{ width: 18, height: 18 }}
                        />
                        Requires Infernal Cape
                      </label>

                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        Icon preview uses: <span style={{ fontFamily: "ui-monospace" }}>/ranks/{String(r.id)}.png</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {/* Status */}
      {status ? (
        <div style={{ ...panelStyle(), borderColor: status.ok ? "rgba(26,255,0,0.35)" : "rgba(255,0,0,0.35)" }}>
          <div style={{ fontWeight: 1000 }}>{status.ok ? "✅ OK" : "❌ Error"}</div>
          <div style={{ opacity: 0.9, marginTop: 4 }}>{status.msg}</div>
        </div>
      ) : null}
    </section>
  );
}