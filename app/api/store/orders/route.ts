import { createClient } from "@supabase/supabase-js";
import { PRODUCTS } from "@/lib/data/storeData";
import { isSameOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";

type IncomingItem = { productId: string; quantity: number; color?: string; size?: string };
type IncomingAddress = { fullName: string; street: string; city: string; state: string; postalCode: string; country: string; phone: string };

function validText(value: unknown, max: number) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function rounded(value: number) { return Math.round(value * 100) / 100; }

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "Send JSON." }, { status: 415 });
  if (Number(request.headers.get("content-length") || 0) > 20_000) return Response.json({ error: "Order is too large." }, { status: 413 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return Response.json({ error: "Ordering is not configured yet. Please contact the studio directly." }, { status: 503 });

  let body: { name?: unknown; email?: unknown; address?: IncomingAddress; items?: IncomingItem[]; delivery?: string; coupon?: string; website?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid order data." }, { status: 400 }); }
  if (body.website) return Response.json({ error: "Invalid order data." }, { status: 400 });
  if (!validText(body.name, 100) || !validText(body.email, 200) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) return Response.json({ error: "Enter a valid name and email." }, { status: 400 });
  const address = body.address;
  if (!address || !validText(address.fullName, 100) || !validText(address.street, 200) || !validText(address.city, 100) || !validText(address.state, 100) || !validText(address.postalCode, 30) || !validText(address.country, 100) || !validText(address.phone, 40)) return Response.json({ error: "Complete the shipping address." }, { status: 400 });
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 30) return Response.json({ error: "Add items to your order." }, { status: 400 });
  const delivery = body.delivery;
  if (!delivery || !["standard", "express", "overnight"].includes(delivery)) return Response.json({ error: "Choose a delivery method." }, { status: 400 });

  const items = [];
  for (const item of body.items) {
    const product = PRODUCTS.find((entry) => entry.id === item.productId);
    if (!product || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20 || item.quantity > product.stock) return Response.json({ error: "An item is unavailable or has an invalid quantity." }, { status: 400 });
    if (item.color && !product.colors.some((color) => color.name === item.color)) return Response.json({ error: "Invalid product color." }, { status: 400 });
    if (item.size && !product.sizes.includes(item.size)) return Response.json({ error: "Invalid product size." }, { status: 400 });
    items.push({ productId: product.id, title: product.title, image: product.images[0], price: product.price, quantity: item.quantity, color: item.color || null, size: item.size || null });
  }

  const subtotal = rounded(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const coupon = (body.coupon || "").trim().toUpperCase();
  const discountRate = ["CRAFT10", "WELCOME10"].includes(coupon) ? .1 : ["ZEROCRAFT20", "LUXURY20"].includes(coupon) ? .2 : 0;
  if (coupon && !discountRate) return Response.json({ error: "Invalid coupon." }, { status: 400 });
  const discount = rounded(subtotal * discountRate);
  const shipping = delivery === "standard" ? (subtotal > 100 ? 0 : 9) : delivery === "express" ? 15 : 25;
  const tax = rounded((subtotal - discount) * .08);
  const total = rounded(subtotal - discount + shipping + tax);
  const number = `ZC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("store_orders").insert({
    order_number: number, customer_name: String(body.name).trim(), customer_email: String(body.email).trim(), customer_phone: address.phone.trim(),
    shipping_address: address, items, delivery_method: delivery, coupon_code: coupon || null,
    subtotal, discount, shipping_fee: shipping, tax, total, currency: "USD", status: "pending", payment_status: "unpaid", payment_method: "cod",
  }).select("id,order_number,created_at,status,items,subtotal,discount,shipping_fee,tax,total").single();
  if (error || !data) return Response.json({ error: "The order could not be saved. Please try again or contact the studio." }, { status: 503 });
  return Response.json({ order: data }, { status: 201 });
}
