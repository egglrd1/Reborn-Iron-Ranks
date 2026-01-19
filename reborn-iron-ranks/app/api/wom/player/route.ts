import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rsn = (searchParams.get("rsn") || "").trim();

  if (!rsn) {
    return NextResponse.json({ error: "Missing rsn" }, { status: 400 });
  }

  // Wise Old Man: player lookup endpoint (username in path)
  const url = `https://api.wiseoldman.net/v2/players/${encodeURIComponent(rsn)}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "reborn-iron-ranks (local dev)" },
    cache: "no-store",
  });

  const text = await res.text();

  if (!res.ok) {
    return NextResponse.json(
      { error: "Wise Old Man request failed", status: res.status, body: text },
      { status: 500 }
    );
  }

  // Return raw JSON from WOM
  return new NextResponse(text, {
    headers: { "Content-Type": "application/json" },
  });
}
