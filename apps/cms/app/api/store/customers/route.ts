import { requireCommercePermission } from "@/lib/commerce-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

type CustomerOrder = {
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  total: number | string | null;
  currency: string | null;
  payment_status: string | null;
  created_at: string;
};

type CustomerSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  paidByCurrency: Record<string, number>;
  lastOrderAt: string;
};

export async function GET() {
  const access = await requireCommercePermission("customers.read");
  if (!access.ok) return access.response;

  const { data, error } = await access.supabase
    .from("orders")
    .select("customer_id,customer_name,customer_email,customer_phone,total,currency,payment_status,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(10000);

  if (error) {
    return Response.json(
      { error: "Customer records could not be loaded from store orders." },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }

  const customers = new Map<string, CustomerSummary>();
  for (const row of (data || []) as CustomerOrder[]) {
    const email = String(row.customer_email || "").trim();
    const phone = String(row.customer_phone || "").trim();
    const name = String(row.customer_name || "").trim();
    const key = row.customer_id
      ? `id:${row.customer_id}`
      : email
        ? `email:${email.toLowerCase()}`
        : phone
          ? `phone:${phone.replace(/\D/g, "")}`
          : "";
    if (!key) continue;

    let customer = customers.get(key);
    if (!customer) {
      customer = {
        id: key,
        name: name || "Customer",
        email,
        phone,
        orderCount: 0,
        paidByCurrency: {},
        lastOrderAt: row.created_at,
      };
      customers.set(key, customer);
    }
    customer.orderCount += 1;
    if (row.payment_status === "paid") {
      const currency = String(row.currency || "INR").toUpperCase();
      customer.paidByCurrency[currency] =
        (customer.paidByCurrency[currency] || 0) + (Number(row.total) || 0);
    }
  }

  return Response.json(
    { customers: [...customers.values()], truncated: (data?.length || 0) === 10000 },
    { headers: PRIVATE_HEADERS },
  );
}
