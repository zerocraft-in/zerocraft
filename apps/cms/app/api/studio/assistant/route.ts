import { requireStudioPermission } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actions = [
  { id: "open_home", label: "Open home", href: "/", aliases: ["home", "dashboard", "overview"] },
  { id: "open_products", label: "Open products", href: "/store/products", aliases: ["products", "product", "catalogue", "catalog"] },
  { id: "open_orders", label: "Open orders", href: "/orders", aliases: ["orders", "order", "payments", "fulfilment"] },
  { id: "open_clients", label: "Open clients", href: "/clients", aliases: ["clients", "client", "customers", "crm"] },
  { id: "open_leads", label: "Open leads", href: "/leads", aliases: ["leads", "lead", "enquiry", "inquiry"] },
  { id: "open_projects", label: "Open projects", href: "/projects", aliases: ["projects", "project", "work"] },
  { id: "open_content", label: "Open content studio", href: "/content", aliases: ["content", "blog", "journal"] },
  { id: "open_analytics", label: "Open analytics", href: "/reports", aliases: ["analytics", "reports", "report", "insights"] },
  { id: "open_integrations", label: "Open integrations", href: "/integrations", aliases: ["integrations", "integration", "apps", "providers"] },
  { id: "open_settings", label: "Open settings", href: "/settings", aliases: ["settings", "setting", "configuration"] },
  { id: "create_lead", label: "Create a new lead", href: "/leads?create=1", aliases: ["new lead", "create lead", "new enquiry"] },
  { id: "create_project", label: "Create a new project", href: "/projects?create=1", aliases: ["new project", "create project"] },
  { id: "create_appointment", label: "Create an appointment", href: "/appointments?create=1", aliases: ["appointment", "booking", "schedule"] },
] as const;

type Action = (typeof actions)[number];

function localMatch(input: string): Action | null {
  const value = input.trim().toLowerCase();
  if (!value) return null;
  return actions.find((action) => [action.label, ...action.aliases].some((alias) => value.includes(alias))) || null;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const access = await requireStudioPermission("dashboard.read");
  if (!access.ok) return access.response;

  let body: { message?: unknown };
  try { body = await request.json(); } catch { return jsonResponse({ error: "Invalid JSON body." }, 400); }
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
  if (!message) return jsonResponse({ error: "A command is required." }, 400);

  const direct = localMatch(message);
  if (direct) return jsonResponse({ action: direct, reply: `Opening ${direct.label.replace(/^Open /, "").replace(/^Create /, "").toLowerCase()}.`, source: "local" });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return jsonResponse({ error: "AI assistant is not configured. Add GEMINI_API_KEY to the CMS server environment.", source: "configuration" }, 503);

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const prompt = [
    "You are Zerocraft Studio's admin assistant.",
    "Choose exactly one action from the allowlist below, or return null when the request is not a supported navigation/create command.",
    "Never invent an action, URL, or tool. Respond with compact JSON only: {\"actionId\": string|null, \"reply\": string}.",
    `Allowlist: ${actions.map((action) => `${action.id}: ${action.label}`).join(" | ")}`,
    `User command: ${message}`,
  ].join("\n");

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: "application/json" } }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return jsonResponse({ error: "The AI provider could not process this command.", source: "provider" }, 502);
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) as { actionId?: unknown; reply?: unknown };
    const action = actions.find((item) => item.id === parsed.actionId);
    if (!action) return jsonResponse({ action: null, reply: typeof parsed.reply === "string" ? parsed.reply : "I can open or create supported Studio areas. Try asking for products, leads, projects, analytics, or settings.", source: "ai" });
    return jsonResponse({ action, reply: typeof parsed.reply === "string" ? parsed.reply : `Opening ${action.label.toLowerCase()}.`, source: "ai" });
  } catch (error) {
    console.error("Studio assistant request failed", error);
    return jsonResponse({ error: "The AI assistant is temporarily unavailable. Try a direct command instead.", source: "provider" }, 502);
  }
}
