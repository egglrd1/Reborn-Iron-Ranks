// scripts/download_osrs_item_icons.mjs
// Node 18+ recommended.
//
// Downloads OSRS Wiki item sprites to: /public/items/<item-id>.png
//
// Strategy (robust):
// 1) Try action=query&titles=... (fast)
// 2) If missing, fallback to action=query&list=search to find the correct title (fixes casing + name mismatches)
// 3) action=parse&prop=wikitext to extract infobox image (prefers *_detail.png)
// 4) action=query&prop=imageinfo for a thumbnail URL
// 5) Download to public/items/<item-id>.png
//
// Usage:
//   node scripts/download_osrs_item_icons.mjs
//
// Output:
//   public/items/<item-id>.png
//   public/items/_icon_failures.json

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const PROJECT_ROOT = process.cwd();
const ITEMS_FILE = path.join(PROJECT_ROOT, "lib", "reborn_item_points.ts");
const OUT_DIR = path.join(PROJECT_ROOT, "public", "items");
const WIKI_API = "https://oldschool.runescape.wiki/api.php";
const WIKI_ORIGIN = "https://oldschool.runescape.wiki/";

const UA = "reborn-iron-ranks-icon-downloader/7.0 (local-dev; Node18+)";

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\*\*\*|\*\*|\*/g, "")
    .replace(/[†]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function extractItemNames(tsSource) {
  const names = [];
  const re = /item\(\s*"([^"]+)"\s*,/g;
  let m;
  while ((m = re.exec(tsSource))) names.push(m[1]);
  return [...new Set(names)];
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json,text/plain,*/*",
    },
  });
  const text = await res.text();
  return { res, text };
}

async function fetchJson(url) {
  const { res, text } = await fetchText(url);
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { res, text, json };
}

async function downloadToFile(url, outPath) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      Referer: WIKI_ORIGIN,
    },
    redirect: "follow",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`IMG HTTP ${res.status} :: ${(txt || "").slice(0, 160)}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
}

async function withRetries(fn, tries = 3) {
  let lastErr = null;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await sleep(250 + i * i * 500);
    }
  }
  throw lastErr;
}

// ---------- WIKI HELPERS ----------

// Fast: try direct titles lookup
async function wikiTryTitle(inputTitle) {
  const url =
    `${WIKI_API}?format=json&formatversion=2&action=query&redirects=1` +
    `&titles=${encodeURIComponent(inputTitle)}`;

  const { res, text, json } = await fetchJson(url);

  if (!res.ok || !json?.query?.pages?.length) {
    return { ok: false, stage: "resolve_title", status: res.status, url, snippet: text.slice(0, 200) };
  }

  const page = json.query.pages[0];
  if (page?.missing) {
    return { ok: false, stage: "resolve_title", status: res.status, url, snippet: `Missing page for "${inputTitle}"` };
  }

  const title = page?.title;
  if (typeof title !== "string" || !title) {
    return { ok: false, stage: "resolve_title", status: res.status, url, snippet: `No title returned for "${inputTitle}"` };
  }

  return { ok: true, title };
}

// Robust: search for the correct page title if direct lookup says missing
async function wikiSearchTitle(inputTitle) {
  // Quoted phrase tends to work well for exact item names (even if wiki page differs slightly)
  const query = `"${inputTitle}"`;

  const url =
    `${WIKI_API}?format=json&formatversion=2&action=query&list=search` +
    `&srsearch=${encodeURIComponent(query)}` +
    `&srlimit=1&srnamespace=0`;

  const { res, text, json } = await fetchJson(url);

  if (!res.ok || !json?.query?.search) {
    return { ok: false, stage: "search_title", status: res.status, url, snippet: text.slice(0, 220) };
  }

  const hit = json.query.search[0];
  const title = hit?.title;

  if (typeof title !== "string" || !title) {
    return { ok: false, stage: "search_title", status: res.status, url, snippet: `No search results for ${query}` };
  }

  return { ok: true, title };
}

// Resolve canonical title: try direct, then fallback to search
async function wikiResolveTitleSmart(inputTitle) {
  const direct = await wikiTryTitle(inputTitle);
  if (direct.ok) return direct;

  // Fallback: search for the correct title (fixes casing + naming mismatches like "Great Helmet" vs "great helm")
  const searched = await wikiSearchTitle(inputTitle);
  if (searched.ok) return searched;

  // If both fail, return the direct error (more intuitive for debugging)
  return direct;
}

async function wikiGetWikitext(pageTitle) {
  const url =
    `${WIKI_API}?format=json&action=parse&redirects=1` +
    `&page=${encodeURIComponent(pageTitle)}` +
    `&prop=wikitext`;

  const { res, text, json } = await fetchJson(url);

  if (!res.ok || json?.error || !json?.parse?.wikitext?.["*"]) {
    const snippet = json?.error
      ? JSON.stringify(json.error).slice(0, 240)
      : text.slice(0, 240);
    return { ok: false, stage: "parse_wikitext", status: res.status, url, snippet };
  }

  return { ok: true, wikitext: json.parse.wikitext["*"] };
}

function pickBestImageFilename(wikitext) {
  const candidates = new Set();

  // Infobox image field: | image = Something.png
  {
    const re = /^\s*\|\s*image\s*=\s*([^\n\r|]+)\s*$/gim;
    let m;
    while ((m = re.exec(wikitext))) {
      const raw = String(m[1] || "").trim();
      if (!raw) continue;
      const cleaned = raw
        .replace(/\[\[|\]\]/g, "")
        .replace(/^File:/i, "")
        .split("|")[0]
        .trim();
      if (cleaned) candidates.add(cleaned);
    }
  }

  // Fallback: any [[File:Something.png]]
  {
    const re = /\[\[\s*File:([^\]|]+?\.(?:png|webp|gif))\s*(?:\||\]\])/gim;
    let m;
    while ((m = re.exec(wikitext))) {
      const fn = String(m[1] || "").trim();
      if (fn) candidates.add(fn);
    }
  }

  const list = [...candidates]
    .map((x) => x.trim())
    .filter((x) => /\.(png|webp)$/i.test(x))
    .filter((x) => !/\.gif$/i.test(x))
    .filter((x) => !/sprite|sheet|icon|chathead|model|render|map/i.test(x));

  if (!list.length) return null;

  // Prefer *_detail.png
  const detail = list.find((x) => /_detail\.png$/i.test(x));
  if (detail) return detail;

  // Otherwise prefer .png
  const png = list.find((x) => /\.png$/i.test(x));
  if (png) return png;

  return list[0] ?? null;
}

async function wikiGetImageThumb(filename, sizePx = 128) {
  const fileTitle = filename.startsWith("File:") ? filename : `File:${filename}`;

  const url =
    `${WIKI_API}?format=json&formatversion=2&action=query` +
    `&titles=${encodeURIComponent(fileTitle)}` +
    `&prop=imageinfo&iiprop=url&iiurlwidth=${encodeURIComponent(sizePx)}`;

  const { res, text, json } = await fetchJson(url);

  if (!res.ok || !json?.query?.pages?.length) {
    return { ok: false, stage: "imageinfo", status: res.status, url, snippet: text.slice(0, 220) };
  }

  const page = json.query.pages[0];
  const ii = page?.imageinfo?.[0];
  const thumb = ii?.thumburl || ii?.url;

  if (typeof thumb !== "string" || !thumb) {
    return { ok: false, stage: "imageinfo", status: res.status, url, snippet: `No thumburl/url for "${fileTitle}"` };
  }

  return { ok: true, thumb, fileTitle };
}

// ---------- MAIN ----------
async function main() {
  if (typeof fetch !== "function") {
    console.error("Global fetch not available. Use Node 18+.");
    process.exit(1);
  }

  if (!fs.existsSync(ITEMS_FILE)) {
    console.error(`Cannot find ${ITEMS_FILE}`);
    process.exit(1);
  }

  ensureDir(OUT_DIR);

  const src = fs.readFileSync(ITEMS_FILE, "utf8");
  const names = extractItemNames(src);

  console.log(`Found ${names.length} item() entries`);
  console.log(`Saving to ${OUT_DIR}\n`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  const failures = [];

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const id = slugify(name);
    const outPath = path.join(OUT_DIR, `${id}.png`);

    if (fs.existsSync(outPath)) {
      skipped++;
      continue;
    }

    // 1) Resolve to a real page title (handles casing + mismatch)
    const resolved = await withRetries(() => wikiResolveTitleSmart(name), 3);

    if (!resolved.ok) {
      failed++;
      failures.push({ name, id, stage: resolved.stage, ok: false, url: resolved.url, status: resolved.status, snippet: resolved.snippet });
      console.log(`[${i + 1}/${names.length}] MISS  ${name} -> ${id}.png (resolve_title)`);
      await sleep(120);
      continue;
    }

    const pageTitle = resolved.title;

    // 2) Parse wikitext
    const w = await withRetries(() => wikiGetWikitext(pageTitle), 3);
    if (!w.ok) {
      failed++;
      failures.push({ name, id, stage: w.stage, ok: false, pageTitle, url: w.url, status: w.status, snippet: w.snippet });
      console.log(`[${i + 1}/${names.length}] MISS  ${name} -> ${id}.png (parse_wikitext)`);
      await sleep(120);
      continue;
    }

    // 3) Pick best filename
    const picked = pickBestImageFilename(w.wikitext);
    if (!picked) {
      failed++;
      failures.push({ name, id, stage: "pick_image", ok: false, pageTitle, snippet: "No suitable image filename found in wikitext." });
      console.log(`[${i + 1}/${names.length}] MISS  ${name} -> ${id}.png (pick_image)`);
      await sleep(120);
      continue;
    }

    // 4) Get thumb URL (bigger sizes for crispness)
    const sizes = [96, 128, 160];
    let thumbUrl = null;
    let fileTitle = null;

    for (const s of sizes) {
      const info = await withRetries(() => wikiGetImageThumb(picked, s), 3);
      if (info.ok) {
        thumbUrl = info.thumb;
        fileTitle = info.fileTitle;
        break;
      }
      await sleep(80);
    }

    if (!thumbUrl) {
      failed++;
      failures.push({ name, id, stage: "imageinfo", ok: false, pageTitle, picked });
      console.log(`[${i + 1}/${names.length}] MISS  ${name} -> ${id}.png (imageinfo)`);
      await sleep(120);
      continue;
    }

    // 5) Download
    try {
      await withRetries(() => downloadToFile(thumbUrl, outPath), 3);
      ok++;
      console.log(`[${i + 1}/${names.length}] OK    ${name} -> ${id}.png  (${fileTitle || picked} via "${pageTitle}")`);
    } catch (e) {
      failed++;
      failures.push({
        name,
        id,
        stage: "download_image",
        ok: false,
        pageTitle,
        picked,
        thumbUrl,
        error: String(e?.message ?? e),
      });
      console.log(`[${i + 1}/${names.length}] FAIL  ${name} -> ${id}.png (download)`);
    }

    await sleep(140);
  }

  console.log(`\nDone. Downloaded: ${ok}, Skipped: ${skipped}, Failed: ${failed}`);

  const reportPath = path.join(OUT_DIR, "_icon_failures.json");
  fs.writeFileSync(reportPath, JSON.stringify(failures, null, 2));
  console.log(`Wrote: public/items/_icon_failures.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
