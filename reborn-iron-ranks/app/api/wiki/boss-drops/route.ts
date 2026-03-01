// app/api/wiki/boss-drops/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function norm(s: string) {
  return String(s || "").trim().replace(/\s+/g, " ");
}

async function wikiParseHtml(title: string) {
  const u = new URL("https://oldschool.runescape.wiki/api.php");
  u.searchParams.set("action", "parse");
  u.searchParams.set("format", "json");
  u.searchParams.set("origin", "*");
  u.searchParams.set("page", title);
  u.searchParams.set("redirects", "1");
  u.searchParams.set("prop", "text");
  u.searchParams.set("formatversion", "2");

  const r = await fetch(u.toString(), {
    cache: "no-store",
    headers: { "User-Agent": "Reborn-Iron-Ranks/1.0 (boss drops)" },
  });
  if (!r.ok) throw new Error(`Wiki request failed (${r.status})`);
  return r.json();
}

function extractFirstDropsTableHtml(fullHtml: string): { tableHtml: string | null; note?: string } {
  const html = String(fullHtml || "");
  if (!html) return { tableHtml: null, note: "Empty HTML" };

  // Look for common section anchors/headlines
  const anchors = [
    'id="Drops"',
    'id="Drop_table"',
    'id="Drop_table_"',
    'id="Loot"',
    'id="Rewards"',
  ];

  let startIdx = -1;
  for (const a of anchors) {
    const i = html.indexOf(a);
    if (i >= 0) {
      startIdx = i;
      break;
    }
  }

  // If no section found, fall back to first wikitable that looks like a drop table
  const scanFrom = startIdx >= 0 ? startIdx : 0;

  // Find the next <table ...> after the section
  let tStart = html.indexOf("<table", scanFrom);
  while (tStart >= 0) {
    const tEnd = html.indexOf("</table>", tStart);
    if (tEnd < 0) break;

    const table = html.slice(tStart, tEnd + "</table>".length);

    // Heuristics: must be a wikitable-ish table and contain drop-ish headers
    const low = table.toLowerCase();
    const looksWikiTable = low.includes("wikitable") || low.includes("infobox") === false;
    const looksDropish =
      low.includes("rarity") ||
      low.includes("quantity") ||
      low.includes("roll") ||
      low.includes("chance") ||
      low.includes("price") ||
      low.includes("drop");

    if (looksWikiTable && looksDropish) {
      return { tableHtml: table, note: startIdx >= 0 ? undefined : "Used fallback scan (no Drops section anchor found)." };
    }

    // otherwise keep scanning for next table
    tStart = html.indexOf("<table", tEnd + 8);
  }

  return { tableHtml: null, note: startIdx >= 0 ? "No table found after Drops section." : "No suitable drop table found in page HTML." };
}

function extractItemTitlesFromTable(tableHtml: string): string[] {
  const out = new Set<string>();

  // Collect title="..." from <a> tags
  const re = /<a[^>]+title="([^"]+)"[^>]*>/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(tableHtml))) {
    const title = norm(m[1]);
    if (!title) continue;

    if (title.startsWith("File:")) continue;
    if (title.startsWith("Category:")) continue;
    if (title.startsWith("Help:")) continue;
    if (title.startsWith("Special:")) continue;

    const low = title.toLowerCase();
    // Filter obvious non-item junk
    if (low.includes("drop table")) continue;
    if (low === "zulrah") continue;

    out.add(title);
  }

  return [...out];
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const titleRaw = url.searchParams.get("title") ?? "";
    const title = norm(titleRaw);

    if (!title || title.length < 2) return json({ ok: false, error: "Missing title" }, 400);

    const data = await wikiParseHtml(title);
    const bossTitle = data?.parse?.title ?? title;
    const html = data?.parse?.text ?? "";

    const { tableHtml, note } = extractFirstDropsTableHtml(html);
    if (!tableHtml) {
      return json({ ok: true, bossTitle, drops: [], note: note ?? "No drops table detected." });
    }

    const drops = extractItemTitlesFromTable(tableHtml);

    return json({ ok: true, bossTitle, drops, note });
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
  }
}