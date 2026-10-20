import { isSameOrigin } from "@/lib/request-origin";
import { testEmail } from "@/lib/email/templates";
import { sendTrackedEmail } from "@/lib/email/delivery";
import { requireStudioPermission } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(message: string, status = 400) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return response("Invalid request origin.", 403);

  const access = await requireStudioPermission("notifications.manage");
  if (!access.ok) return access.response;

  let body: { recipient?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // An empty body is allowed; the authenticated operator receives the test.
  }

  const recipient = typeof body.recipient === "string" && body.recipient.trim()
    ? body.recipient.trim().toLowerCase()
    : access.user.email;
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return response("Enter a valid test recipient email.");
  }
  if (access.role !== "admin" && recipient !== access.user.email?.toLowerCase()) {
    return response("Only an admin can send a test email to another address.", 403);
  }

  try {
    const result = await sendTrackedEmail({
      supabase: access.supabase,
      actorId: access.user.id,
      kind: "smtp.test",
      message: testEmail(recipient, access.user.user_metadata?.full_name || access.user.email || "ZeroCraft operator"),
      metadata: { test: true },
    });
    return Response.json(
      { ok: true, recipient, messageId: result.messageId },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("SMTP test email failed", error);
    return response("SMTP test email could not be sent. Check the server email configuration.", 503);
  }
}
