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

        // Discord can have multiple "display name" fields depending on account/settings
        const p: any = profile;
        const display =
          p.global_name ||
          p.username ||
          p.display_name ||
          (token as any).name ||
          null;

        if (display) (token as any).discordName = String(display);
      }
      return token;
    },

    async session({ session, token }) {
      (session as any).discordId = (token as any).discordId;

      const discordName = (token as any).discordName;
      if (discordName) {
        session.user = session.user ?? ({} as any);
        (session.user as any).name = String(discordName);
      }

      return session;
    },

    // ✅ Prevent bad callbackUrls like /calculator/undefined
    async redirect({ url, baseUrl }) {
      try {
        const target = url.startsWith("/") ? new URL(url, baseUrl) : new URL(url);

        if (target.origin !== new URL(baseUrl).origin) return baseUrl;

        const path = target.pathname || "";
        if (path.includes("/calculator/undefined")) return `${baseUrl}/players`;

        if (
          path.startsWith("/calculator/") &&
          (path.endsWith("/undefined") ||
            path.endsWith("/null") ||
            path === "/calculator" ||
            path === "/calculator/")
        ) {
          return `${baseUrl}/players`;
        }

        return target.toString();
      } catch {
        return baseUrl;
      }
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };