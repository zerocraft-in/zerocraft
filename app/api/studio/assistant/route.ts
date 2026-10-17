import { isSameOrigin } from "@/lib/request-origin";
import { getStoredIntegration, isIntegrationEnabled } from "@/lib/studio-integration-secrets";
import { requireStudioAccess } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  if (!(await isIntegrationEnabled("gemini").catch(() => true))) return Response.json({ configured: false }, { headers: { "Cache-Control": "private, no-store" } });
  const saved = await getStoredIntegration<{ apiKey?: string; model?: string }>("gemini").catch(() => null);
  return Response.json({ configured: Boolean((saved?.apiKey || process.env.GEMINI_API_KEY) && (saved?.model || process.env.GEMINI_MODEL)) }, { headers: { "Cache-Control": "private, no-store" } });
}

type ChatMessage = { role: "user" | "assistant"; text: string };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  if (!(await isIntegrationEnabled("gemini").catch(() => true))) return Response.json({ error: "Gemini is disabled in Studio integrations. Enable it in Settings to use the assistant." }, { status: 503 });

  const saved = await getStoredIntegration<{ apiKey?: string; model?: string }>("gemini").catch(() => null);
  const apiKey = saved?.apiKey || process.env.GEMINI_API_KEY;
  const model = saved?.model || process.env.GEMINI_MODEL;
  if (!apiKey || !model) return Response.json({ error: "Gemini is not configured. Add GEMINI_API_KEY and GEMINI_MODEL to the server environment." }, { status: 503 });
  if (!/^[a-zA-Z0-9_.-]+$/.test(model)) return Response.json({ error: "Invalid Gemini model configuration." }, { status: 503 });

  let body: { messages?: ChatMessage[] };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 16) return Response.json({ error: "Send between 1 and 16 messages." }, { status: 400 });
  const valid = messages.every((message) => message && (message.role === "user" || message.role === "assistant") && typeof message.text === "string" && message.text.trim().length > 0 && message.text.length <= 2000);
  const totalLength = messages.reduce((sum, message) => sum + (typeof message?.text === "string" ? message.text.length : 0), 0);
  if (!valid || totalLength > 12_000 || messages[messages.length - 1]?.role !== "user") return Response.json({ error: "That conversation is too long or has an invalid message." }, { status: 400 });

  const contents: { role: "user" | "model"; parts: [{ text: string }] }[] = [];
  for (const message of messages) {
    const role = message.role === "assistant" ? "model" : "user";
    const previous = contents[contents.length - 1];
    if (previous?.role === role) previous.parts[0].text += `\n\n${message.text.trim()}`;
    else contents.push({ role, parts: [{ text: message.text.trim() }] });
  }
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are the Zerocraft Studio CMS assistant. Be clear, practical, warm, and concise. Help with creative planning and writing. Never claim you can see live CMS records unless they are explicitly included in the conversation; never invent projects, clients, analytics, orders, or business facts. Do not publish content, change records, send messages, or perform actions. Ask the user to review generated text before using it. Do not request passwords, API keys, payment information, or sensitive customer personal data." }] },
        contents,
        generationConfig: { temperature: .65, maxOutputTokens: 900 },
      }),
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });
    if (!response.ok) return Response.json({ error: "Gemini couldn’t respond. Check the server key, model, and available quota." }, { status: 502 });
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("\n").trim();
    if (!reply) return Response.json({ error: "Gemini returned an empty reply. Try again with a more specific prompt." }, { status: 502 });
    return Response.json({ reply }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Gemini is temporarily unavailable. Try again in a moment." }, { status: 502 });
  }
}
