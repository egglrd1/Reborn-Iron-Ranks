import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("rsn") || "").trim();

  const body = await req.json().catch(() => ({} as any));
  const b = ((body?.rsn ?? "") as string).toString().trim();

  // TEMP DEBUG: show exactly what we got
  if (!q && !b) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing rsn",
        debug: {
          url: req.url,
          query_rsn: q,
          body_rsn: b,
          body_keys: body ? Object.keys(body) : null,
          body_raw: body,
        },
      },
      { status: 400 }
    );
  }

  const rsn = q || b;

  const url = `https://api.wiseoldman.net/v2/players/${encodeURIComponent(rsn)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "reborn-iron-ranks (local dev)",
    },
    cache: "no-store",
  });

  const text = await res.text();

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "WOM update failed", status: res.status, body: text },
      { status: 500 }
    );
  }

  return new NextResponse(text, {
    headers: { "Content-Type": "application/json" },
  });
}
