import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Storefront API guide",
  description: "Storefront API endpoints, security boundaries, and frontend integration flows.",
};

const endpoints = [
  { method: "GET", path: "/api/store/catalog", access: "Public · host-scoped catalog", purpose: "Lists active products and taxonomy, or returns one active product by slug/id.", request: "page, pageSize, query, category, subcategory, collection, origin, availability, sort, slug, id", response: "Listing: { products: { products, page, pageSize, total }, categories, collections }. Detail: { product }.", frontend: "SearchOverlay (debounced search), InfiniteProductGrid (next pages), CartProvider (rehydrate a saved cart line). Initial home/shop/product render reads catalog.ts directly on the server.", notes: "Listing cache is s-maxage=30, stale-while-revalidate=60; details are private/no-store. page is clamped >=1 and pageSize to 1..48 in getProducts. Route casts origin/sort without validating allowed values. Collections fail soft to an empty array." },
  { method: "GET", path: "/api/store/bundles", access: "Public · published bundles only", purpose: "Returns published bundles with active products and bundle item quantities.", request: "No query parameters.", response: "{ bundles: [{ id, slug, name, description, discountPercent, imageUrl, items }] }", frontend: "No caller found in the current storefront; bundle data is not wired to storefront UI.", notes: "Cached for 30 seconds with stale-while-revalidate=60. Database errors return 503." },
  { method: "POST", path: "/api/store/cart/validate", access: "Same-origin · public cart validation; customization ownership checked when present", purpose: "Rechecks products, variants, stock, currency and line totals against the store database.", request: "JSON { items: [{ productId, variantId?, quantity, customizationReference?, color?, size?, lineId? }] }. 1–30 lines; quantity 1–20; UUID identifiers; body limit 20 KB.", response: "{ valid, currency, subtotal, subtotalPaise, lines, errors }. Lines include current price, availability, status and errors/warnings.", frontend: "Not called by current cart UI. Connect before checkout; treat it as a preflight only, never a stock reservation.", notes: "Uses host-selected service role for catalog/inventory reads. Customization path ownership is checked here; registration and storage existence are rechecked at checkout." },
  { method: "POST", path: "/api/store/orders", access: "Same-origin · signed-in customer · feature gated", purpose: "Creates an order and payment attempt through an atomic database RPC.", request: "JSON { idempotencyKey, items, address, delivery, paymentMethod }. 1–30 lines; quantity 1–20; strict field allowlists, UUIDs/enums/address checks; body limit 32 KB.", response: "{ order: { id, order_number, status, currency, total, subtotal, discount, shipping_fee, tax, items, created_at, payment_attempt_id } }. 201 new; 200 replay.", frontend: "Not called by current storefront. CartDrawer checkout currently shows a placeholder alert; address/payment/confirmation flow is incomplete.", notes: "Requires ZEROCRAFT_TRANSACTIONAL_CHECKOUT_ENABLED=true. Manual payment also requires ZEROCRAFT_MANUAL_PAYMENTS_ENABLED=true. Server fingerprints requests; RPC is service_role-only. DB transaction must remain authoritative for prices, inventory, totals and idempotency." },
  { method: "GET", path: "/api/store/payments/methods", access: "Public · dynamic · uncached", purpose: "Returns enabled payment options configured for this store.", request: "No query parameters.", response: "{ methods: [{ method_code, display_name, merchant_name, upi_vpa, upi_qr_image_url, bank_name, bank_account_name, bank_account_number, bank_ifsc, instructions }] }", frontend: "No caller found. Checkout must fetch this endpoint and show only methods returned by the server.", notes: "Treat account instructions as shopper-visible information; do not put secrets in payment_methods. Query errors return 503." },
  { method: "POST", path: "/api/store/payments/utr", access: "Same-origin · signed-in customer · host-scoped service RPC", purpose: "Submits manual payment evidence for an order attempt.", request: "JSON { paymentAttemptId, orderId, utr, amount, paidAt?, note? }. UTR normalized and constrained to 6–64 allowed characters; amount/date/UUIDs validated; note <=500 chars.", response: "{ submission } with 201, or an error.", frontend: "No caller found. Wire after order creation using order.id and payment_attempt_id returned by /orders.", notes: "RPC receives customer ID from auth.getUser(), never request JSON. Database should verify attempt/order ownership, amount and duplicate UTR. Route has no explicit content-length limit." },
  { method: "POST", path: "/api/store/customizations", access: "Same-origin · signed-in customer · feature gated", purpose: "Uploads artwork privately and registers it to a published product template.", request: "multipart/form-data: file, productId, templateId. JPEG/PNG/WebP/PDF; max 25 MB; UUIDs required.", response: "{ customizationId, objectPath, signedUrl, expiresIn: 300 } with 201.", frontend: "No caller found. Upload first, keep returned objectPath as the cart reference, then pass it to validation/order requests.", notes: "Requires ZEROCRAFT_CUSTOMIZATION_REGISTRATION_ENABLED=true. Uses authenticated customer client/RLS/private bucket and rolls back object on registration/signing failure. Size checked after formData parsing; consider upstream request cap and file-signature validation." },
  { method: "POST", path: "/api/store/newsletter", access: "Same-origin · public signup", purpose: "Normalizes an email and forwards signup to configured newsletter webhook.", request: "JSON { email }, basic email validation and <=254 characters.", response: "{ ok: true, message }; 400 invalid, 502 upstream failure, 503 if not configured.", frontend: "NewsForm does not call this endpoint; it shows local success. Call it and confirm only after an OK response.", notes: "Requires NEWSLETTER_WEBHOOK_URL. No explicit content-type/body-size check or rate limit. Webhook URL is server environment configuration." },
];

const flow = [
  ["1 · Browse", "Server components query catalog.ts for first paint. Search, filters and pagination call GET /catalog. Keep requests on the store host so Supabase resolves the intended store."],
  ["2 · Cart preflight", "Cart state is currently localStorage snapshots. Map UI lines to productId/variantId/quantity and POST /cart/validate. Use returned prices; block invalid/mixed-currency lines. It does not reserve inventory."],
  ["3 · Custom artwork (optional)", "POST multipart artwork to /customizations. Keep returned objectPath as the reference. Never treat a client-supplied path as ownership proof."],
  ["4 · Checkout", "Collect address and delivery/payment choice. Generate one idempotency key per attempt and POST /orders. Reuse it only to retry the same payload. Never trust client-calculated totals."],
  ["5 · Payment", "For manual methods, fetch /payments/methods, show returned instructions, then submit UTR using order.id and payment_attempt_id from /orders."],
  ["6 · Confirmation/recovery", "Render server order number/status. A customer-scoped GET order/status route is absent, so secure refresh recovery/order tracking needs a new endpoint."],
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-3"><h2 className="text-lg font-semibold tracking-tight">{title}</h2>{children}</section>;
}
function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{children}</code>;
}

export default function StorefrontApiDocsPage() {
  return <main className="mx-auto w-full max-w-6xl space-y-9 px-4 py-7 sm:px-6 lg:px-8">
    <header className="space-y-3 border-b border-border/70 pb-6">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Developer documentation · apps/store</p>
      <h1 className="text-3xl font-semibold tracking-tight">Storefront API &amp; frontend integration</h1>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">Route-by-route contract, trust boundaries and end-to-end browser flow for ZeroCraft. Scope: <Code>apps/store/app/api/store/*</Code>. CMS endpoints under <Code>apps/cms/app/api/store/*</Code> are separate admin APIs and are not covered as storefront endpoints.</p>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[["8", "storefront route handlers"], ["3", "called by current storefront UI"], ["5", "need frontend wiring"], ["0", "completed checkout UI flows"]].map(([value, label]) => <div key={label} className="rounded-xl border border-border/80 bg-card p-4"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}
    </section>

    <Section title="How requests reach the right store">
      <div className="rounded-xl border border-border/80 bg-card p-5 text-sm leading-6"><ol className="list-decimal space-y-2 pl-5">
        <li>Browser calls a storefront page or <Code>/api/store/*</Code> on a store host.</li>
        <li><Code>apps/store/proxy.ts</Code> invokes the shared Supabase session updater. It refreshes sessions; it does not replace route-level authorization.</li>
        <li><Code>createClient()</Code> reads request host and picks that host’s public Supabase URL/key using <Code>packages/supabase/src/config.ts</Code>.</li>
        <li>Privileged handlers call <Code>getRequestStoreConfig()</Code>, which selects the matching server secret by store ID. Registry mode has no cross-store service-key fallback.</li>
        <li>Same-origin, authentication, ownership, validation and database RPC permissions are separate controls. Every mutation must enforce the checks its data requires.</li>
      </ol><p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5">Deployment check: public catalog/bundle responses are cacheable while data is host-scoped. Confirm the CDN cache key includes hostname for custom store domains.</p></div>
    </Section>

    <Section title="Admin setup · domains and store connection">
      <div className="space-y-3 rounded-xl border border-border/80 bg-card p-5 text-sm leading-6">
        <p className="text-muted-foreground">Configure one registry in both the CMS deployment and the storefront deployment. The storefront request host chooses its Supabase project; the CMS host chooses the same store record for admin operations. Use origins (scheme + hostname + optional port), not page paths.</p>
        <div className="grid gap-3 md:grid-cols-3">
          {[["CMS/admin origin", "http://localhost:3002", "Admin app; local development"], ["Storefront origin", "http://localhost:3001", "Customer-facing app; local development"], ["Store Supabase URL", "https://<project-ref>.supabase.co", "Project URL, same project for that store"]].map(([label, value, note]) => <div key={label} className="rounded-lg border border-border/70 p-3"><p className="text-xs font-semibold">{label}</p><code className="mt-2 block break-all text-xs">{value}</code><p className="mt-2 text-xs text-muted-foreground">{note}</p></div>)}
        </div>
        <p><strong>Custom domain example:</strong> admin <Code>https://admin.zerocraft.example</Code>; storefront <Code>https://shop.zerocraft.example</Code>. Add both exact domains to the CMS/storefront hosting projects and TLS settings, then register the origins in the store connection below. Do not map two different stores to the same host.</p>
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-5"><code>{`# apps/cms/.env.local AND apps/store/.env.local (sample only)
NEXT_PUBLIC_STORE_CONNECTIONS='[{"id":"zerocraft","name":"Zerocraft","adminOrigin":"http://localhost:3002","storefrontOrigin":"http://localhost:3001","adminAliases":["https://admin.zerocraft.example"],"storefrontAliases":["https://shop.zerocraft.example"],"url":"https://<project-ref>.supabase.co","key":"sb_publishable_<public-key>"}]'

# Server-only. Configure the same store ID in each app that needs privileged work.
# Real values belong in ignored .env.local / deployment secret settings.
STORE_SERVER_SECRETS='{"zerocraft":{"serviceRoleKey":"<server-only-service-role-key>"}}'

# Legacy single-store mode (used only when NEXT_PUBLIC_STORE_CONNECTIONS is absent):
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<public-key>
NEXT_PUBLIC_STORE_ID=zerocraft
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>`}</code></pre>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5"><strong>Secret boundary:</strong> <Code>NEXT_PUBLIC_STORE_CONNECTIONS</Code> contains public project URL/key and public host mapping only. Never put a service role key, payment provider secret, SMTP secret, or webhook secret in a <Code>NEXT_PUBLIC_*</Code> variable. Keep <Code>STORE_SERVER_SECRETS</Code> server-only. Use placeholders in docs and rotate any credential that was accidentally committed or pasted into client code.</div>
        <p className="text-xs text-muted-foreground">After editing registry values, restart local dev servers. In deployments, set the public registry before build because <Code>NEXT_PUBLIC_*</Code> values are embedded at build time; add secrets separately in server runtime settings. Supabase Auth redirect/callback allowlists must include the exact app origins and callback URLs used by the login flow.</p>
      </div>
    </Section>

    <Section title="Admin-to-storefront connection map">
      <div className="overflow-x-auto rounded-xl border border-border/80 bg-card"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-muted/40 text-xs"><tr><th className="px-4 py-3">Admin action</th><th className="px-4 py-3">What is saved</th><th className="px-4 py-3">Storefront effect</th><th className="px-4 py-3">Verify</th></tr></thead><tbody>
        {[
          ["Create / publish product", "products, variants, product_media rows in selected store DB", "GET catalog and server-rendered product pages can show active product", "Publish product, then GET /api/store/catalog?slug=<slug> on its mapped storefront domain."],
          ["Activate category / subcategory", "categories and subcategories in same DB", "Catalog filters/taxonomy show active categories", "GET catalog and inspect categories; try category query."],
          ["Configure bundles", "bundles + bundle_items", "GET /api/store/bundles returns published bundles", "Publish bundle with at least one active product; GET /api/store/bundles."],
          ["Configure enabled payment method", "payment_methods row", "GET /api/store/payments/methods returns shopper-facing instructions", "Enable a test method and fetch on correct host; ensure no secret credentials are included."],
          ["Register customer artwork template", "customization_templates + storage/RLS configuration", "Customer upload route accepts matching published template when feature flag is on", "Test signed-in upload and confirm private object plus customer-owned row."],
          ["Checkout rollout", "Schema RPC/migration + server feature flags", "POST /api/store/orders can atomically create order and reserve inventory", "Only enable after staging checks; test idempotent retry and stock race."],
        ].map(([action, saved, effect, verify], i) => <tr key={action} className={i ? "border-t border-border/70" : ""}><td className="px-4 py-3 align-top font-medium">{action}</td><td className="px-4 py-3 align-top text-muted-foreground">{saved}</td><td className="px-4 py-3 align-top text-muted-foreground">{effect}</td><td className="px-4 py-3 align-top text-xs leading-5 text-muted-foreground">{verify}</td></tr>)}
      </tbody></table></div>
      <p className="text-xs leading-5 text-muted-foreground">Admin and storefront must resolve the same store ID to the same Supabase project. Separate stores use separate project URLs and keys. Publishing data in one store does not publish it into another.</p>
    </Section>

    <Section title="Endpoint reference"><div className="space-y-4">{endpoints.map((e) => <article key={e.path} className="overflow-hidden rounded-xl border border-border/80 bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-muted/30 px-4 py-3"><span className="rounded-md bg-foreground px-2 py-1 font-mono text-[10px] font-semibold text-background">{e.method}</span><code className="break-all font-mono text-sm font-medium">{e.path}</code><span className="ml-auto text-xs text-muted-foreground">{e.access}</span></div>
      <dl className="grid gap-x-6 gap-y-4 p-4 md:grid-cols-[150px_1fr]">
        <dt className="text-xs font-semibold text-muted-foreground">Purpose</dt><dd className="text-sm leading-6">{e.purpose}</dd>
        <dt className="text-xs font-semibold text-muted-foreground">Request</dt><dd className="break-words text-sm leading-6">{e.request}</dd>
        <dt className="text-xs font-semibold text-muted-foreground">Response</dt><dd className="break-words text-sm leading-6">{e.response}</dd>
        <dt className="text-xs font-semibold text-muted-foreground">Frontend connection</dt><dd className="text-sm leading-6">{e.frontend}</dd>
        <dt className="text-xs font-semibold text-muted-foreground">Behavior / notes</dt><dd className="text-sm leading-6 text-muted-foreground">{e.notes}</dd>
      </dl>
    </article>)}</div></Section>

    <Section title="Recommended complete frontend flow"><div className="space-y-3">{flow.map(([title, description]) => <div key={title} className="grid gap-2 rounded-xl border border-border/80 bg-card p-4 sm:grid-cols-[220px_1fr]"><h3 className="text-sm font-semibold">{title}</h3><p className="text-sm leading-6 text-muted-foreground">{description}</p></div>)}</div></Section>

    <Section title="Frontend implementation pattern"><div className="rounded-xl border border-border/80 bg-card p-4">
      <p className="mb-3 text-sm leading-6 text-muted-foreground">Use a typed fetch helper in client components. Parse server errors, send same-origin requests and never trust localStorage prices. Example cart preflight:</p>
      <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-5"><code>{`const response = await fetch("/api/store/cart/validate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    items: cart.map(({ productId, variantId, quantity }) => ({
      productId, variantId, quantity,
    })),
  }),
});

const result = await response.json();
if (!response.ok) throw new Error(result.error ?? "Cart check failed");
if (!result.valid) showLineErrors(result.lines);
else showAuthoritativePreview(result);`}</code></pre>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">This is a preview, not an inventory reservation. The order endpoint and database transaction must recalculate all values to prevent stale-price and stock-race issues.</p>
    </div></Section>

    <Section title="End-to-end frontend snippets">
      <div className="space-y-3 rounded-xl border border-border/80 bg-card p-4">
        <h3 className="text-sm font-semibold">Create order after cart preflight</h3>
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-5"><code>{`const checkout = {
  idempotencyKey: crypto.randomUUID(), // keep for retries of this same payload
  items: [{ productId, variantId, quantity }],
  address: {
    fullName: "Sample Customer", street: "12 Example Road",
    city: "Chennai", state: "Tamil Nadu", postalCode: "600001",
    country: "IN", phone: "+91 90000 00000",
  },
  delivery: "standard",
  paymentMethod: "cod",
};

const response = await fetch("/api/store/orders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(checkout),
});
const payload = await response.json();
if (!response.ok) throw new Error(payload.error ?? "Checkout failed");
// Render payload.order.order_number and payload.order.status.`}</code></pre>
        <p className="text-xs leading-5 text-muted-foreground">Sample customer/address are fake placeholders. Use only IDs returned by catalog. The route currently requires an authenticated user and server feature flags; the UI must handle 401, 400 validation, 409 stock/idempotency conflicts, and 503 disabled/unavailable states.</p>
        <h3 className="pt-2 text-sm font-semibold">Fetch shopper-visible payment options</h3>
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-5"><code>{`const response = await fetch("/api/store/payments/methods", {
  cache: "no-store",
});
const { methods } = await response.json();
// Render enabled methods returned for this store host only.`}</code></pre>
      </div>
    </Section>

    <Section title="Current gaps and prioritized fixes"><div className="overflow-hidden rounded-xl border border-border/80 bg-card">{[
      ["P0 · Checkout is not wired", "CartDrawer Checkout is a placeholder alert. Build checkout form, validation, POST /orders, confirmation, and error/retry states."],
      ["P1 · Client-side price math", "CartProvider trusts persisted product snapshots and local coupon/shipping math. Preflight with /cart/validate; move discounts, shipping, taxes and payable totals to the authoritative checkout transaction."],
      ["P1 · Newsletter false success", "NewsForm sets done without calling its route. Fetch /newsletter and only confirm after success."],
      ["P1 · Payment/customization APIs orphaned", "Connect methods → order payment attempt → UTR. Wire customization upload before allowing customized cart lines."],
      ["P2 · Request hardening", "Validate origin/sort enums; bound UTR/newsletter bodies and multipart upload before parsing; add abuse controls and actual file-signature checks."],
      ["P2 · Order recovery API absent", "No customer-scoped GET order/status endpoint exists. Add it before promising refresh-safe confirmation or order tracking."],
    ].map(([title, description], i) => <div key={title} className={`grid gap-2 p-4 sm:grid-cols-[260px_1fr] ${i ? "border-t border-border/70" : ""}`}><h3 className="text-sm font-semibold">{title}</h3><p className="text-sm leading-6 text-muted-foreground">{description}</p></div>)}</div></Section>

    <footer className="border-t border-border/70 pt-4 text-xs leading-5 text-muted-foreground">Source analysis: handlers in <Code>apps/store/app/api/store</Code>, helpers in <Code>apps/store/lib/commerce</Code>, and callers in <Code>apps/store/components</Code>. Verify handler and schema when contracts change. This documents source behavior; it does not imply feature flags, migrations, or production configuration are enabled.</footer>
  </main>;
}
