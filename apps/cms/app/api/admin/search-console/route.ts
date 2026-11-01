import { requireCommercePermission } from "@/lib/commerce-auth";
import { searchConsoleDashboard, SearchConsoleError } from "@/lib/search-console/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }

export async function GET(request: Request) {
  const access = await requireCommercePermission("reports.read");
  if (!access.ok) return access.response;
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim();
  if (!siteUrl) return Response.json({ error: "Add GOOGLE_SEARCH_CONSOLE_SITE_URL to the CMS environment." }, { status: 409 });
  const params = new URL(request.url).searchParams;
  const end = new Date();
  end.setDate(end.getDate() - 2);
  const days = Math.min(Math.max(Number(params.get("days") || 28), 7), 90);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  try {
    return Response.json({ checkedAt: new Date().toISOString(), ...(await searchConsoleDashboard(siteUrl, isoDate(start), isoDate(end))) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof SearchConsoleError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
    return Response.json({ error: "Search Console data could not be loaded." }, { status: 503 });
  }
}
