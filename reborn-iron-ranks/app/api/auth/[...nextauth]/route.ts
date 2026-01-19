import NextAuth, { type NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: "identify" } },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, profile }) {
      // profile is only present on initial sign-in
      if (profile && (profile as any).id) {
        (token as any).discordId = String((profile as any).id);
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).discordId = (token as any).discordId;
      return session;
    },

    // ✅ Prevent bad callbackUrls like /calculator/undefined
    async redirect({ url, baseUrl }) {
      try {
        // Allow relative URLs (NextAuth often passes these)
        const target = url.startsWith("/")
          ? new URL(url, baseUrl)
          : new URL(url);

        // Only allow redirects back to our own site
        if (target.origin !== new URL(baseUrl).origin) return baseUrl;

        // Block the exact bad case you're seeing
        const path = target.pathname || "";
        if (path.includes("/calculator/undefined")) {
          return `${baseUrl}/players`;
        }

        // Also block any calculator route that ends with undefined/null/empty
        if (
          path.startsWith("/calculator/") &&
          (path.endsWith("/undefined") ||
            path.endsWith("/null") ||
            path === "/calculator" ||
            path === "/calculator/")
        ) {
          return `${baseUrl}/players`;
        }

        // Otherwise, allow
        return target.toString();
      } catch {
        return baseUrl;
      }
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
