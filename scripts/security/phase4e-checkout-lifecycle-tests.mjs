import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve("supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql");
const sql = readFileSync(migrationPath, "utf8");

function checkSqlContract() {
  assert.match(sql, /PENDING REVIEW ONLY/);
  assert.match(sql, /create or replace function public\.create_transactional_checkout/);
  assert.match(sql, /store_inventory_reservations\s*\(/);
  assert.match(sql, /status, expires_at/);
  assert.match(sql, /jsonb_to_recordset\(p_checkout->'items'\)/);
  assert.match(sql, /"productId" uuid/);
  assert.match(sql, /"customizationReference" text/);
  assert.match(sql, /x\.\"productId\"/);
  assert.doesNotMatch(sql, /x\.product_id|x\.variant_id|x\.customization_reference/);
  assert.match(sql, /for update/);
  assert.match(sql, /IDEMPOTENCY_CONFLICT/);
  assert.match(sql, /CUSTOMIZATION_INVALID|customization was already consumed|customization is not owned/);
  assert.match(sql, /public\.release_order_reservations/);
  assert.match(sql, /public\.expire_order_reservations/);
  assert.match(sql, /public\.fulfill_order_reservations/);
  assert.match(sql, /public\.cancel_order_with_reservations/);
  assert.match(sql, /grant execute on function public\.create_transactional_checkout[\s\S]*to service_role/);
  assert.doesNotMatch(sql, /grant execute on function public\.(?:create_transactional_checkout|release_order_reservations|expire_order_reservations|fulfill_order_reservations|cancel_order_with_reservations)[\s\S]*to (?:anon|authenticated)/);
}

class CheckoutFixture {
  constructor() {
    this.variants = new Map([["v-shirt", { onHand: 2, reserved: 0 }]]);
    this.requests = new Map();
    this.orders = new Map();
    this.reservations = [];
    this.customizations = new Map([["customer-a/art-1.png", { customerId: "customer-a", status: "ready" }]]);
    this.lock = Promise.resolve();
  }

  async withTransaction(work) {
    const previous = this.lock;
    let release;
    this.lock = new Promise((resolveRelease) => { release = resolveRelease; });
    await previous;
    const snapshot = structuredClone({
      requests: this.requests,
      orders: this.orders,
      reservations: this.reservations,
      variants: this.variants,
      customizations: this.customizations,
    });
    try {
      return await work();
    } catch (error) {
      this.requests = snapshot.requests;
      this.orders = snapshot.orders;
      this.reservations = snapshot.reservations;
      this.variants = snapshot.variants;
      this.customizations = snapshot.customizations;
      throw error;
    } finally {
      release();
    }
  }

  async checkout({ role = "service_role", customerId, key, items, failAfterReserve = false }) {
    if (role !== "service_role") throw new Error("trusted server required");
    return this.withTransaction(async () => {
      const requestKey = `${customerId}:${key}`;
      const fingerprint = JSON.stringify(items);
      const existing = this.requests.get(requestKey);
      if (existing && existing.fingerprint !== fingerprint) throw new Error("IDEMPOTENCY_CONFLICT");
      if (existing) return { ...existing.order, replayed: true };
      for (const item of items) {
        if (item.customizationReference) {
          const customization = this.customizations.get(item.customizationReference);
          if (!customization || customization.customerId !== customerId || customization.status !== "ready") {
            throw new Error("CUSTOMIZATION_OWNERSHIP");
          }
        }
        const variant = this.variants.get(item.variantId);
        if (!variant || variant.onHand - variant.reserved < item.quantity) throw new Error("OUT_OF_STOCK");
      }
      const order = { id: `order-${this.orders.size + 1}`, status: "pending" };
      this.orders.set(order.id, order);
      for (const item of items) {
        const variant = this.variants.get(item.variantId);
        variant.reserved += item.quantity;
        this.reservations.push({ orderId: order.id, variantId: item.variantId, quantity: item.quantity, status: "reserved", expiresAt: Date.now() + 30 * 60 * 1000 });
        if (item.customizationReference) this.customizations.get(item.customizationReference).status = "consumed";
      }
      if (failAfterReserve) throw new Error("forced rollback");
      this.requests.set(requestKey, { fingerprint, order });
      return { ...order, replayed: false };
    });
  }

  async release(orderId, status = "released") {
    return this.withTransaction(async () => {
      let count = 0;
      for (const reservation of this.reservations.filter((row) => row.orderId === orderId && row.status === "reserved")) {
        const variant = this.variants.get(reservation.variantId);
        assert.ok(variant.reserved >= reservation.quantity);
        variant.reserved -= reservation.quantity;
        reservation.status = status;
        count += 1;
      }
      return count;
    });
  }

  async expire(orderId, now = Date.now()) {
    return this.withTransaction(async () => {
      const order = this.orders.get(orderId);
      if (!order) throw new Error("order unavailable");
      if (!["pending", "confirmed"].includes(order.status)) return 0;
      const active = this.reservations.filter((row) => row.orderId === orderId && row.status === "reserved");
      if (active.length === 0 || active.some((row) => row.expiresAt > now)) return 0;
      for (const reservation of active) {
        const variant = this.variants.get(reservation.variantId);
        variant.reserved -= reservation.quantity;
        reservation.status = "expired";
      }
      order.status = "cancelled";
      return active.length;
    });
  }

  async cancel(orderId) {
    return this.withTransaction(async () => {
      const order = this.orders.get(orderId);
      if (!order) throw new Error("order unavailable");
      if (order.status === "cancelled") return 0;
      if (!["pending", "confirmed"].includes(order.status)) throw new Error("cannot cancel after fulfillment begins");
      let count = 0;
      for (const reservation of this.reservations.filter((row) => row.orderId === orderId && row.status === "reserved")) {
        this.variants.get(reservation.variantId).reserved -= reservation.quantity;
        reservation.status = "released";
        count += 1;
      }
      order.status = "cancelled";
      return count;
    });
  }
}

async function run() {
  checkSqlContract();

  const fixture = new CheckoutFixture();
  const first = await fixture.checkout({ customerId: "customer-a", key: "same-key", items: [{ variantId: "v-shirt", quantity: 1, customizationReference: "customer-a/art-1.png" }] });
  const replay = await fixture.checkout({ customerId: "customer-a", key: "same-key", items: [{ variantId: "v-shirt", quantity: 1, customizationReference: "customer-a/art-1.png" }] });
  assert.equal(first.id, replay.id);
  assert.equal(replay.replayed, true);
  assert.equal(fixture.variants.get("v-shirt").reserved, 1);
  assert.equal(fixture.customizations.get("customer-a/art-1.png").status, "consumed");

  await assert.rejects(() => fixture.checkout({ customerId: "customer-a", key: "same-key", items: [{ variantId: "v-shirt", quantity: 2 }] }), /IDEMPOTENCY_CONFLICT/);
  await assert.rejects(() => fixture.checkout({ customerId: "customer-b", key: "other-key", items: [{ variantId: "v-shirt", quantity: 2 }] }), /OUT_OF_STOCK/);
  await assert.rejects(() => fixture.checkout({ role: "authenticated", customerId: "customer-a", key: "unauthorized", items: [{ variantId: "v-shirt", quantity: 1 }] }), /trusted server required/);
  await assert.rejects(() => fixture.checkout({ customerId: "customer-b", key: "owned-check", items: [{ variantId: "v-shirt", quantity: 1, customizationReference: "customer-a/art-1.png" }] }), /CUSTOMIZATION_OWNERSHIP/);

  await assert.rejects(() => fixture.checkout({ customerId: "customer-a", key: "rollback", items: [{ variantId: "v-shirt", quantity: 1 }] , failAfterReserve: true }), /forced rollback/);
  assert.equal(fixture.variants.get("v-shirt").reserved, 1);
  assert.equal(fixture.reservations.filter((row) => row.status === "reserved").length, 1);

  const concurrent = await Promise.allSettled([
    fixture.checkout({ customerId: "customer-a", key: "concurrent-a", items: [{ variantId: "v-shirt", quantity: 1 }] }),
    fixture.checkout({ customerId: "customer-a", key: "concurrent-b", items: [{ variantId: "v-shirt", quantity: 1 }] }),
  ]);
  assert.equal(concurrent.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(concurrent.filter((result) => result.status === "rejected").length, 1);

  const released = await fixture.release(first.id);
  assert.equal(released, 1);
  assert.equal(await fixture.release(first.id), 0);

  const lifecycleFixture = new CheckoutFixture();
  const mixed = await lifecycleFixture.checkout({ customerId: "customer-a", key: "mixed-expiry", items: [
    { variantId: "v-shirt", quantity: 1 },
    { variantId: "v-shirt", quantity: 1 },
  ] });
  lifecycleFixture.reservations[0].expiresAt = Date.now() - 1;
  lifecycleFixture.reservations[1].expiresAt = Date.now() + 60_000;
  assert.equal(await lifecycleFixture.expire(mixed.id), 0);
  assert.equal(lifecycleFixture.orders.get(mixed.id).status, "pending");
  lifecycleFixture.reservations[1].expiresAt = Date.now() - 1;
  assert.equal(await lifecycleFixture.expire(mixed.id), 2);
  assert.equal(lifecycleFixture.orders.get(mixed.id).status, "cancelled");
  assert.equal(lifecycleFixture.variants.get("v-shirt").reserved, 0);
  assert.equal(await lifecycleFixture.expire(mixed.id), 0);

  const restricted = new CheckoutFixture();
  const activeOrder = await restricted.checkout({ customerId: "customer-a", key: "fulfilling", items: [{ variantId: "v-shirt", quantity: 1 }] });
  restricted.orders.get(activeOrder.id).status = "fulfilling";
  await assert.rejects(() => restricted.cancel(activeOrder.id), /cannot cancel after fulfillment begins/);
  assert.equal(restricted.variants.get("v-shirt").reserved, 1);
  console.log("Phase 4E-A checkout lifecycle tests: PASS (contract + isolated fixture scenarios)");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
