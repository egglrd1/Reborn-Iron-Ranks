// proxy.ts
export { default } from "next-auth/middleware";

export const config = {
  // Only require Discord auth on the homepage
  matcher: ["/"],
};
