import { requireStudioAccess } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  return Response.json({ role: access.role, user: { id: access.user.id, email: access.user.email } }, { headers: { "Cache-Control": "private, no-store" } });
}
