export const PLATFORM_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  // Sliding inactivity timeout. Supabase refreshes the cookie while a user is
  // active; an abandoned browser session expires after eight hours.
  maxAge: 8 * 60 * 60,
};
