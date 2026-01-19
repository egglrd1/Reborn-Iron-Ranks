// reborn-iron-ranks/proxy.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const config = {
  // Only require Discord auth on the homepage
  matcher: ["/"],
};

export default async function proxy(req: NextRequest) {
  // If you already have NEXTAUTH_SECRET set, this will work.
  // It reads the session token from cookies (no server session call).
  const token = await getToken({ req });

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/api/auth/signin";
    url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
