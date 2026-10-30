import { requireStudioPermission } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actions = [
  { id: "open_home", label: "Open home", href: "/studio", aliases: ["home", "dashboard", "overview"] },
  { id: "open_products", label: "Open products", href: "/store/products", aliases: ["products", "product", "catalogue", "catalog"] },
  { id: "open_orders", label: "Open orders", href: "/store/orders", aliases: ["orders", "order", "payments", "fulfilment"] },
  { id: "open_clients", label: "Open clients", href: "/studio/clients", aliases: ["clients", "client", "customers", "crm"] },
  { id: "open_leads", label: "Open leads", href: "/studio/leads", aliases: ["leads", "lead", "enquiry", "inquiry"] },
  { id: "open_projects", label: "Open projects", href: "/studio/projects", aliases: ["projects", "project", "work"] },
  { id: "open_content", label: "Open content studio", href: "/studio/content", aliases: ["content", "blog", "journal"] },
  { id: "open_analytics", label: "Open analytics", href: "/reports", aliases: ["analytics", "reports", "report", "insights"] },
  { id: "open_integrations", label: "Open integrations", href: "/integrations", aliases: ["integrations", "integration", "apps", "providers"] },
  { id: "open_settings", label: "Open settings", href: "/settings", aliases: ["settings", "setting", "configuration"] },
  { id: "create_lead", label: "Create a new lead", href: "/studio/leads?create=1", aliases: ["new lead", "create lead", "new enquiry"] },
  { id: "create_project", label: "Create a new project", href: "/studio/projects?create=1", aliases: ["new project", "create project"] },
  { id: "create_appointment", label: "Create an appointment", href: "/studio/appointments?create=1", aliases: ["appointment", "booking", "schedule"] },
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

async function prepareApproval(access: { supabase: any; user: { id: string } }, input: { actionType: string; title: string; description: string; riskLevel: string; payload: Record<string, unknown>; idempotencyKey: string }) {
  const { data, error } = await access.supabase.from("studio_ai_action_requests").insert({
    action_type: input.actionType,
    title: input.title.slice(0, 180),
    description: input.description.slice(0, 1000),
    risk_level: input.riskLevel,
    payload: input.payload,
    requested_by: access.user.id,
    idempotency_key: input.idempotencyKey,
  }).select("id,action_type,title,description,risk_level,status,payload,requested_at").single();
  if (error) {
    if (error.code === "23505") return { duplicate: true };
    throw error;
  }
  const { data: recipients } = await access.supabase.from("profiles").select("id").eq("is_active", true).in("role", ["admin", "manager"]);
  const recipientIds = Array.from(new Set([access.user.id, ...(recipients || []).map((recipient: { id: string }) => recipient.id)]));
  await access.supabase.from("notifications").upsert(recipientIds.map((recipient_id) => ({ title: "AI approval required", message: input.title, category: "automation", type: "warning", read: false, link: "/automations/approvals", recipient_id, event_key: `ai-action:${data.id}:${recipient_id}`, dedupe_key: `ai-action:${data.id}:${recipient_id}`, metadata: { source: "ai_assistant", actionId: data.id } })), { onConflict: "event_key" });
  return { action: data };
}

async function runStoreTool(access: { supabase: any }, message: string) {
  const value = message.toLowerCase();
  if (/low stock|low inventory|running low|stock alert/.test(value)) {
    const { data, error } = await access.supabase.from("store_products").select("id,title,sku,stock,price,currency,status").eq("status", "active").lte("stock", 5).order("stock", { ascending: true }).limit(20);
    if (error) throw error;
    const products = (data || []).map((item: { id: string; title: string; sku: string; stock: number | null; price: number; currency: string }) => ({ id: item.id, title: item.title, sku: item.sku, stock: item.stock ?? 0, price: item.price, currency: item.currency }));
    return { source: "tool", data: { tool: "low_stock_products", products }, reply: products.length ? `I found ${products.length} active product${products.length === 1 ? "" : "s"} with 5 or fewer units: ${products.slice(0, 8).map((item: { title: string; stock: number }) => `${item.title} (${item.stock})`).join(", ")}.` : "No active products currently have 5 or fewer units in stock." };
  }
  if (/today('|’)s orders|orders today|today.*orders/.test(value)) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { data, error } = await access.supabase.from("store_orders").select("order_number,customer_name,total,currency,status,payment_status,created_at").gte("created_at", start.toISOString()).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    const orders = data || [];
    return { source: "tool", data: { tool: "today_orders", orders }, reply: orders.length ? `There ${orders.length === 1 ? "is" : "are"} ${orders.length} order${orders.length === 1 ? "" : "s"} today. ${orders.slice(0, 6).map((item: { order_number: string; customer_name: string; total: number; currency: string; status: string }) => `#${item.order_number} · ${item.customer_name} · ${item.currency} ${item.total} · ${item.status}`).join(" | ")}` : "There are no orders recorded today." };
  }
  if (/unpaid customers|customers.*unpaid|unpaid invoices|outstanding payments/.test(value)) {
    const { data, error } = await access.supabase.from("store_orders").select("order_number,customer_name,customer_email,total,currency,created_at").eq("payment_status", "unpaid").neq("status", "cancelled").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    const customers = new Map<string, { name: string; email: string; orders: number; outstanding: number; currency: string }>();
    for (const item of data || []) { const key = String(item.customer_email || item.customer_name).toLowerCase(); const current = customers.get(key) || { name: item.customer_name, email: item.customer_email, orders: 0, outstanding: 0, currency: item.currency }; current.orders += 1; current.outstanding += Number(item.total || 0); customers.set(key, current); }
    const result = Array.from(customers.values());
    return { source: "tool", data: { tool: "unpaid_customers", customers: result }, reply: result.length ? `I found ${result.length} customer${result.length === 1 ? "" : "s"} with unpaid orders: ${result.slice(0, 8).map((item) => `${item.name} (${item.currency} ${item.outstanding})`).join(", ")}.` : "No unpaid customer orders were found." };
  }
  return null;
}

async function runGeneralTool(message: string) {
  const value = message.trim().toLowerCase();
  if (/^(hi|hello|hey|vanakkam)\b/.test(value)) {
    return { source: "local", reply: "Hello! I’m Zerocraft Assistant. I can help with your Store data, Studio pages, orders, inventory, and approved actions." };
  }
  if (/\b(time|time now|current time|what time)\b/.test(value)) {
    const cityMatch = message.match(/\b(?:in|at|for)\s+([a-z][a-z\s-]{1,40})\s*\??$/i);
    const city = cityMatch?.[1]?.trim() || "Chennai";
    const zone = /mumbai|delhi|bangalore|bengaluru|kolkata|hyderabad|chennai|india/i.test(city) ? "Asia/Kolkata" : "UTC";
    return { source: "local", reply: `The current time in ${city} is ${new Intl.DateTimeFormat("en-IN", { timeZone: zone, dateStyle: "medium", timeStyle: "short" }).format(new Date())}.` };
  }
  if (/\b(weather|temperature|forecast|rain|raining)\b/.test(value)) {
    const cityMatch = message.match(/\b(?:in|at|for)\s+([a-z][a-z\s-]{1,40})\s*\??$/i);
    const city = cityMatch?.[1]?.trim() || "Chennai";
    try {
      const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`, { signal: AbortSignal.timeout(4_000) });
      if (!geoResponse.ok) throw new Error(`geocode_${geoResponse.status}`);
      const geo = await geoResponse.json() as { results?: Array<{ latitude: number; longitude: number; name: string; country?: string }> };
      const location = geo.results?.[0];
      if (!location) return { source: "weather", reply: `I couldn’t find weather data for ${city}. Try a city and country, such as Chennai, India.` };
      const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`, { signal: AbortSignal.timeout(4_000) });
      if (!weatherResponse.ok) throw new Error(`weather_${weatherResponse.status}`);
      const weather = await weatherResponse.json() as { current?: { temperature_2m?: number; apparent_temperature?: number; relative_humidity_2m?: number; wind_speed_10m?: number } };
      const current = weather.current;
      if (!current) throw new Error("weather_empty");
      return { source: "weather", reply: `Current weather in ${location.name}${location.country ? `, ${location.country}` : ""}: ${current.temperature_2m ?? "—"}°C, feels like ${current.apparent_temperature ?? "—"}°C, humidity ${current.relative_humidity_2m ?? "—"}%, wind ${current.wind_speed_10m ?? "—"} km/h.` };
    } catch (error) {
      console.error("Weather tool failed", { error: error instanceof Error ? error.message : "unknown" });
      return { source: "weather_unavailable", reply: `I couldn’t fetch live weather for ${city} right now. Please try again shortly.` };
    }
  }
  return null;
}

export async function POST(request: Request) {
  const access = await requireStudioPermission("dashboard.read");
  if (!access.ok) return access.response;

  let body: {
    message?: unknown;
    pathname?: unknown;
    history?: unknown;
  };
  try { body = await request.json(); } catch { return jsonResponse({ error: "Invalid JSON body." }, 400); }
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
  if (!message) return jsonResponse({ error: "A command is required." }, 400);
  const pathname = typeof body.pathname === "string" && body.pathname.startsWith("/")
    ? body.pathname.slice(0, 180)
    : "/studio";
  const history = Array.isArray(body.history)
    ? body.history
        .filter((item): item is { role: string; text: string } =>
          Boolean(item) && typeof item === "object" &&
          typeof (item as { role?: unknown }).role === "string" &&
          typeof (item as { text?: unknown }).text === "string",
        )
        .slice(-8)
        .map((item) => `${item.role}: ${item.text.slice(0, 1200)}`)
        .join("\n")
    : "";

  const uuid = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0];
  if (/\barchive\b/i.test(message) && /\b(product|item|tee|shirt)\b/i.test(message)) {
    let productId = uuid;
    let productTitle = "product";
    if (!productId) {
      const { data: products } = await access.supabase.from("store_products").select("id,title,status").eq("status", "active").limit(100);
      const terms = message.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((term: string) => term.length > 2 && !["archive", "product", "item", "please", "the", "from", "low", "stock"].includes(term));
      const matches = (products || []).filter((product: { title?: string }) => terms.every((term: string) => (product.title || "").toLowerCase().includes(term)));
      if (matches.length !== 1) {
        const hint = matches.length > 1 ? `I found multiple matching products: ${matches.slice(0, 5).map((product: { title?: string }) => product.title).join(", ")}. Please include the exact product id.` : "I could not uniquely identify the product. Please include its exact product id or name.";
        return jsonResponse({ action: null, reply: `${hint} I will not guess which product to archive.`, source: "guardrail", requiresApproval: true });
      }
      productId = matches[0].id;
      productTitle = matches[0].title || productTitle;
    }
    const prepared = await prepareApproval(access, { actionType: "archive_product", title: `Archive ${productTitle}`, description: message, riskLevel: "high", payload: { productId }, idempotencyKey: `archive_product:${productId}` });
    return jsonResponse({ action: null, approval: prepared.action || null, duplicate: prepared.duplicate || false, requiresApproval: true, reply: prepared.duplicate ? "That archive action is already in the approval queue." : "I prepared the archive action. An authorized operator must approve it before execution.", source: "approval_queue" });
  }

  if (/\b(send|email|mail)\b/i.test(message) && /\b(invoice|payment)\b/i.test(message)) {
    const recipient = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
    const paymentLink = message.match(/https?:\/\/\S+/i)?.[0]?.replace(/[),.;]+$/, "") || "";
    if (!recipient || !paymentLink) return jsonResponse({ action: null, reply: "I can prepare the invoice/payment email, but I need both the recipient email and payment link.", source: "guardrail", requiresApproval: true });
    const prepared = await prepareApproval(access, { actionType: "send_invoice", title: `Send payment link to ${recipient}`, description: message, riskLevel: "high", payload: { recipient, paymentLink }, idempotencyKey: `send_invoice:${recipient}:${paymentLink}` });
    return jsonResponse({ action: null, approval: prepared.action || null, duplicate: prepared.duplicate || false, requiresApproval: true, reply: prepared.duplicate ? "That invoice email is already in the approval queue." : "I prepared the invoice email. It will be sent only after an authorized operator approves and executes it.", source: "approval_queue" });
  }

  if (/\b(update|change|move|mark)\b/i.test(message) && /\border\b/i.test(message) && uuid) {
    const requestedStatus = ["pending", "confirmed", "fulfilling", "shipped", "completed", "cancelled"].find((status) => new RegExp(`\\b${status}\\b`, "i").test(message));
    if (!requestedStatus) return jsonResponse({ action: null, reply: "Tell me the target order status: pending, confirmed, fulfilling, shipped, completed, or cancelled.", source: "guardrail", requiresApproval: true });
    const prepared = await prepareApproval(access, { actionType: "update_order_status", title: `Update order to ${requestedStatus}`, description: message, riskLevel: "high", payload: { orderId: uuid, status: requestedStatus }, idempotencyKey: `update_order_status:${uuid}:${requestedStatus}` });
    return jsonResponse({ action: null, approval: prepared.action || null, duplicate: prepared.duplicate || false, requiresApproval: true, reply: prepared.duplicate ? "That order update is already in the approval queue." : "I prepared the order update. An authorized operator must approve it before execution.", source: "approval_queue" });
  }

  if (/\b(prepare|create|set up|make)\b/i.test(message) && /\bdiscount\b/i.test(message)) {
    const percent = Number(message.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] || 0);
    if (!percent || percent >= 100) return jsonResponse({ action: null, reply: "Tell me a valid discount percentage below 100%, for example: prepare a 10% discount for active products.", source: "guardrail", requiresApproval: true });
    const { count, error } = await access.supabase.from("store_products").select("id", { count: "exact", head: true }).eq("status", "active");
    if (error) return jsonResponse({ error: "I could not read the active product catalog to prepare that discount.", source: "data" }, 503);
    const prepared = await prepareApproval(access, { actionType: "prepare_discount", title: `Prepare ${percent}% discount for active products`, description: message, riskLevel: "high", payload: { percent, productFilter: "active", estimatedProductCount: count || 0 }, idempotencyKey: `prepare_discount:${percent}:active` });
    return jsonResponse({ action: null, approval: prepared.action || null, duplicate: prepared.duplicate || false, requiresApproval: true, reply: prepared.duplicate ? "That discount preparation is already in the approval queue." : `I prepared a ${percent}% discount draft for ${count || 0} active products. Review and approve it before anything changes.`, source: "approval_queue" });
  }

  const isStoreDataQuestion = /low stock|low inventory|running low|stock alert|today('|’)s orders|orders today|today.*orders|unpaid customers|customers.*unpaid|unpaid invoices|outstanding payments/i.test(message);
  try {
    const toolResult = await runStoreTool(access, message);
    if (toolResult) return jsonResponse(toolResult);
  const generalToolResult = await runGeneralTool(message);
  if (generalToolResult) return jsonResponse(generalToolResult);
  } catch (error) {
    console.error("Studio assistant data tool failed", { error: error instanceof Error ? error.message : "unknown" });
    if (isStoreDataQuestion) return jsonResponse({ action: null, source: "data_error", reply: "I could not read that Store data right now. Check your Store data permission and retry." });
  }
  if (isStoreDataQuestion) return jsonResponse({ action: null, source: "data_unavailable", reply: "I could not match that Store data request yet. Try asking for low-stock products, today’s orders, or unpaid customers." });

  const direct = localMatch(message);
  if (direct) {
    const contextualAction = direct.id === "open_home"
      ? { ...direct, href: pathname.startsWith("/store") ? "/store" : "/studio" }
      : direct;
    return jsonResponse({ action: contextualAction, reply: `Opening ${contextualAction.label.replace(/^Open /, "").replace(/^Create /, "").toLowerCase()}.`, source: "local" });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return jsonResponse({ error: "AI assistant is not configured. Add GEMINI_API_KEY to the CMS server environment.", source: "configuration" }, 503);

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
  const models = Array.from(new Set([model, "gemini-3.6-flash", "gemini-2.5-flash"]));
  const prompt = [
    "You are Zerocraft Studio's admin assistant.",
    "Answer questions about the current workspace clearly and briefly. Choose one action from the allowlist only when navigation or a supported create command is requested; otherwise return null.",
    "Never invent an action, URL, store fact, metric, or completed mutation. If the request needs data or a write operation that is not available, say what is missing and ask a concise follow-up question.",
    "Respond with compact JSON only: {\"actionId\": string|null, \"reply\": string}.",
    `Allowlist: ${actions.map((action) => `${action.id}: ${action.label}`).join(" | ")}`,
    `Current admin page: ${pathname}`,
    history ? `Recent conversation:\n${history}` : "Recent conversation: none",
    `User command: ${message}`,
  ].join("\n");

  let lastProviderStatus = 0;
  try {
    for (const candidateModel of models) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidateModel)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: "application/json" } }),
        signal: AbortSignal.timeout(5_000),
      });
      lastProviderStatus = response.status;
      if (!response.ok) {
        console.error("Gemini request failed", { status: response.status, model: candidateModel });
        if ([404, 429, 500, 502, 503, 504].includes(response.status)) continue;
        const providerMessage = response.status === 401 || response.status === 403
          ? "Gemini rejected the configured API key or its API restriction."
          : `Gemini returned HTTP ${response.status}. Check the server logs and try again.`;
        return jsonResponse({ error: providerMessage, source: "provider" }, 502);
      }
      const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) as { actionId?: unknown; reply?: unknown };
      const action = actions.find((item) => item.id === parsed.actionId);
      if (!action) return jsonResponse({ action: null, reply: typeof parsed.reply === "string" ? parsed.reply : "I can help with your current workspace. Try asking about products, orders, analytics, or settings.", source: "ai" });
      return jsonResponse({ action, reply: typeof parsed.reply === "string" ? parsed.reply : `Opening ${action.label.toLowerCase()}.`, source: "ai" });
    }
    return jsonResponse({
      action: null,
      source: "provider_unavailable",
      providerUnavailable: true,
      reply: lastProviderStatus === 429
        ? "Gemini is temporarily rate-limited. I can still open Zerocraft pages and prepare approved actions; please retry this question in a moment."
        : "Gemini is temporarily unavailable. I can still open Zerocraft pages and prepare approved actions; please retry this question shortly.",
    });
  } catch (error) {
    const causeCode =
      typeof error === "object" && error !== null && "cause" in error
        ? (error.cause as { code?: unknown } | undefined)?.code
        : undefined;
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const timedOut =
      errorName === "TimeoutError" ||
      errorName === "AbortError" ||
      causeCode === "ETIMEDOUT" ||
      causeCode === "ECONNRESET";
    const networkFailure =
      timedOut ||
      causeCode === "ECONNREFUSED" ||
      causeCode === "ENOTFOUND" ||
      causeCode === "EAI_AGAIN";
    console.error("Studio assistant request failed", { errorName, causeCode, model });
    console.error("Studio assistant fallback", { networkFailure, errorName, causeCode, model });
    return jsonResponse({
      action: null,
      source: "fallback",
      providerUnavailable: true,
      reply: networkFailure
        ? "I can still open Zerocraft pages and prepare approved actions, but Gemini is temporarily unreachable from the CMS server. Please retry the question in a moment."
        : "Gemini is temporarily unavailable. I can still open Zerocraft pages and prepare approved actions; please retry this question shortly.",
    });
  }
}
