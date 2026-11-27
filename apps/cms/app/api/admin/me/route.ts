import { getCommercePermissions, requireCommerceAccess } from "@/lib/commerce-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireCommerceAccess();
  if (!access.ok) return access.response;
  const permissions = await getCommercePermissions(access);
  const metadata = access.user.user_metadata || {};
  const displayName = [metadata.full_name, metadata.name]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0)
    ?.trim() || null;
  return Response.json({
    role: access.role,
    permissions,
    user: { id: access.user.id, email: access.user.email, displayName },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
