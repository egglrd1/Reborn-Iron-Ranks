import { headers } from "next/headers";

/**
 * Returns the current request's origin, compatible with Vercel + Next 16.
 * Example: https://reborn-iron-ranks.vercel.app
 */
export async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${proto}://${host}` : "";
}
