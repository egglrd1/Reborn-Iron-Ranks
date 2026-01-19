import { NextResponse } from "next/server";

const WOM_GROUP_ID = 2386;

export async function GET() {
  try {
    const res = await fetch(`https://api.wiseoldman.net/v2/groups/${WOM_GROUP_ID}`, {
      // avoid caching during dev
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Failed to fetch WOM group", status: res.status, body: text },
        { status: 500 }
      );
    }

    const data = await res.json();

    // data.memberships[].player contains the player info (username/displayName/etc.)
    const roster =
      (data.memberships ?? [])
        .map((m: any) => m.player)
        .filter(Boolean)
        .map((p: any) => ({
          playerId: p.id,
          username: p.username,
          displayName: p.displayName ?? p.username,
          type: p.type,
          build: p.build,
          country: p.country,
          status: p.status,
          exp: p.exp,
          ehp: p.ehp,
          ehb: p.ehb,
          ttm: p.ttm,
          tt200m: p.tt200m,
          lastImportedAt: p.lastImportedAt,
        }))
        // sort nicely for dropdown
        .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));

    return NextResponse.json({ group: { id: data.id, name: data.name }, roster });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Unexpected error", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
