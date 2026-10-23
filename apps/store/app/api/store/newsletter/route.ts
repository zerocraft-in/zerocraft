import { isSameOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    return Response.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  const webhook = process.env.NEWSLETTER_WEBHOOK_URL;
  if (!webhook)
    return Response.json(
      {
        error:
          "Newsletter signup is not connected yet. Please check back soon.",
      },
      { status: 503 },
    );
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "zerocraft-store" }),
      cache: "no-store",
    });
    if (!response.ok)
      return Response.json(
        { error: "Newsletter signup is temporarily unavailable." },
        { status: 502 },
      );
    return Response.json({
      ok: true,
      message: "You are on the Zerocraft studio list.",
    });
  } catch {
    return Response.json(
      { error: "Newsletter signup is temporarily unavailable." },
      { status: 502 },
    );
  }
}
