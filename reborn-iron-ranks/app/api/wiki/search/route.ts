// app/api/wiki/search/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function normQ(v: string) {
  return v.trim().replace(/\s+/g, " ");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const qRaw = url.searchParams.get("q") ?? "";
    const q = normQ(qRaw);

    if (!q || q.length < 2) {
      return json({ ok: true, results: [] });
    }

    // OSRS Wiki (MediaWiki) search
    // We use `list=search` because it gives better ranking and metadata than opensearch.
    const api = new URL("https://oldschool.runescape.wiki/api.php");
    api.searchParams.set("action", "query");
    api.searchParams.set("format", "json");
    api.searchParams.set("origin", "*");
    api.searchParams.set("list", "search");
    api.searchParams.set("srsearch", q);
    api.searchParams.set("srlimit", "12");
    api.searchParams.set("srprop", "snippet|titlesnippet|timestamp|size|wordcount");

    const r = await fetch(api.toString(), {
      // keep it dynamic; avoid caching during dev
      cache: "no-store",
      headers: {
        "User-Agent": "Reborn-Iron-Ranks/1.0 (admin config wiki search)",
      },
    });

    if (!r.ok) {
      return json({ ok: false, error: `Wiki request failed (${r.status})` }, 502);
    }

    const data = await r.json();

    const results =
      data?.query?.search?.map((s: any) => ({
        title: String(s?.title ?? ""),
        pageId: Number(s?.pageid ?? 0),
        snippet: String(s?.snippet ?? ""), // HTML snippet from MediaWiki
        timestamp: String(s?.timestamp ?? ""),
      })) ?? [];

    // Filter obvious empties
    const cleaned = results.filter((x: any) => x.title);

    return json({ ok: true, results: cleaned });
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
  }
}