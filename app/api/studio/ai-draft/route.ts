import { createClient } from "@/utils/supabase/server";
import { isSameOrigin } from "@/lib/request-origin";
import { getStoredIntegration, isIntegrationEnabled } from "@/lib/studio-integration-secrets";

export const runtime = "nodejs";

const tasks = {
  blog: "Write a concise blog outline with a title, short introduction, four useful section headings, and a closing paragraph.",
  project: "Write a concise portfolio concept description with a clear objective, creative approach, and honest description of the intended experience.",
  social: "Write three distinct short social captions with accessible language and restrained hashtags.",
  product: "Write a clear store product description, a short listing summary, and a factual features list. Do not invent materials, dimensions, warranties, or stock.",
  reply: "Write a warm customer-service reply based only on the supplied situation. Do not promise shipping dates, refunds, or actions that are not confirmed.",
} as const;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to use studio tools." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!["admin", "manager", "staff"].includes(profile?.role || "")) return Response.json({ error: "Studio access required." }, { status: 403 });

  if (!(await isIntegrationEnabled("gemini").catch(() => true))) return Response.json({ error: "Gemini is disabled in Studio integrations. Enable it in Settings to use AI drafting." }, { status: 503 });
  const saved = await getStoredIntegration<{ apiKey?: string; model?: string }>("gemini").catch(() => null);
  const apiKey = saved?.apiKey || process.env.GEMINI_API_KEY;
  const model = saved?.model || process.env.GEMINI_MODEL;
  if (!apiKey || !model) return Response.json({ error: "AI drafting is not configured. Set GEMINI_API_KEY and GEMINI_MODEL on the server." }, { status: 503 });
  if (!/^[a-zA-Z0-9_.-]+$/.test(model)) return Response.json({ error: "Invalid AI model configuration." }, { status: 503 });

  let body: { task?: keyof typeof tasks; brief?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body.task || !(body.task in tasks) || !body.brief || body.brief.trim().length < 10 || body.brief.length > 3000) return Response.json({ error: "Choose a task and enter a brief of 10–3000 characters." }, { status: 400 });

  const prompt = `You are an editorial assistant for Zerocraft Studio, a creative and digital studio. ${tasks[body.task]} Use only the information in the brief. Do not invent client names, metrics, awards, testimonials, or completed work. Clearly mark any unknown details as placeholders. Keep it human, clear, and non-corporate. The output is a draft for human review, never a published claim.\n\nBrief:\n${body.brief}`;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: .55, maxOutputTokens: 1200 } }),
      signal: AbortSignal.timeout(20_000), cache: "no-store",
    });
    if (!response.ok) return Response.json({ error: "Gemini could not generate a draft. Check the API key, model, and quota." }, { status: 502 });
    const data = await response.json();
    const draft = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("\n").trim();
    if (!draft) return Response.json({ error: "Gemini returned no draft. Try a more specific brief." }, { status: 502 });
    return Response.json({ draft });
  } catch { return Response.json({ error: "AI drafting is temporarily unavailable." }, { status: 502 }); }
}
