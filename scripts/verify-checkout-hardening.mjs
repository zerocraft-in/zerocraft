#!/usr/bin/env node

import assert from "node:assert/strict";
import { createFixturePlan } from "./prepare-commerce-fixtures.mjs";

const plan = createFixturePlan("offline-hardening");
const results = [];

function test(name, fn) {
  fn();
  results.push(name);
}

class MockCheckout {
  constructor() {
    this.requests = new Map();
    this.inventory = new Map([["final-one-unit", 1]]);
    this.orders = [];
  }

  checkout(customer, key, fingerprint, kind = "final-one-unit") {
    const requestKey = `${customer}:${key}`;
    const existing = this.requests.get(requestKey);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new Error("IDEMPOTENCY_CONFLICT");
      return { ...existing.result, replayed: true };
    }
    if (kind === "digital") {
      const result = { orderId: `order-${this.orders.length + 1}`, reserved: 0 };
      this.requests.set(requestKey, { fingerprint, result });
      this.orders.push(result);
      return { ...result, replayed: false };
    }
    const available = this.inventory.get(kind) ?? 0;
    if (available < 1) throw new Error("OUT_OF_STOCK");
    this.inventory.set(kind, available - 1);
    const result = { orderId: `order-${this.orders.length + 1}`, reserved: 1 };
    this.requests.set(requestKey, { fingerprint, result });
    this.orders.push(result);
    return { ...result, replayed: false };
  }

  release(order) {
    if (!order || order.released || order.reserved === 0) return false;
    this.inventory.set("final-one-unit", (this.inventory.get("final-one-unit") ?? 0) + order.reserved);
    order.released = true;
    return true;
  }
}

test("fixture plan is deterministic", () => {
  assert.deepEqual(createFixturePlan("offline-hardening"), plan);
});

test("fixture plan is development-only and non-mutating", () => {
  assert.equal(plan.developmentOnly, true);
  assert.equal(plan.remoteWrites, false);
  assert.equal(plan.products.length, 12);
  assert.equal(plan.products.every((product) => product.slug.startsWith("zc-itest-offline-hardening-")), true);
});

test("fixture payloads use deployed schema fields", () => {
  assert.equal("currency" in plan.variants[0], false);
  assert.equal("currency_code" in plan.variants[0], true);
  assert.equal(plan.inventoryLevels.every((row) => row.reserved === 0), true);
  assert.equal(plan.templates.every((template) => !Object.hasOwn(template, "product_slug")), true);
});

test("same key and fingerprint replays without a second reservation", () => {
  const checkout = new MockCheckout();
  const first = checkout.checkout("customer-a", "same-key", "fingerprint");
  const replay = checkout.checkout("customer-a", "same-key", "fingerprint");
  assert.equal(replay.replayed, true);
  assert.equal(checkout.orders.length, 1);
  assert.equal(checkout.inventory.get("final-one-unit"), 0);
  assert.equal(first.orderId, replay.orderId);
});

test("same key with a different fingerprint conflicts", () => {
  const checkout = new MockCheckout();
  checkout.checkout("customer-a", "same-key", "first");
  assert.throws(() => checkout.checkout("customer-a", "same-key", "changed"), /IDEMPOTENCY_CONFLICT/);
});

test("same key is isolated across customers", () => {
  const checkout = new MockCheckout();
  checkout.inventory.set("final-one-unit", 2);
  const first = checkout.checkout("customer-a", "same-key", "same");
  const second = checkout.checkout("customer-b", "same-key", "same");
  assert.equal(first.orderId, "order-1");
  assert.equal(second.orderId, "order-2");
});

test("two buyers cannot reserve the final unit", () => {
  const checkout = new MockCheckout();
  checkout.checkout("customer-a", "a", "a");
  assert.throws(() => checkout.checkout("customer-b", "b", "b"), /OUT_OF_STOCK/);
  assert.equal(checkout.inventory.get("final-one-unit"), 0);
});

test("release is retry-safe", () => {
  const checkout = new MockCheckout();
  const order = checkout.checkout("customer-a", "a", "a");
  assert.equal(checkout.release(order), true);
  assert.equal(checkout.release(order), false);
  assert.equal(checkout.inventory.get("final-one-unit"), 1);
});

test("digital checkout bypasses physical inventory", () => {
  const checkout = new MockCheckout();
  const result = checkout.checkout("customer-a", "digital", "digital", "digital");
  assert.equal(result.reserved, 0);
  assert.equal(checkout.inventory.get("final-one-unit"), 1);
});

test("failed inventory validation leaves no order or reservation", () => {
  const checkout = new MockCheckout();
  checkout.inventory.set("final-one-unit", 0);
  assert.throws(() => checkout.checkout("customer-a", "a", "a"), /OUT_OF_STOCK/);
  assert.equal(checkout.orders.length, 0);
  assert.equal(checkout.requests.size, 0);
});

test("reservation invariants hold", () => {
  const checkout = new MockCheckout();
  const order = checkout.checkout("customer-a", "a", "a");
  assert.equal(checkout.inventory.get("final-one-unit") >= 0, true);
  assert.equal(order.reserved >= 0, true);
  checkout.release(order);
  assert.equal(checkout.inventory.get("final-one-unit"), 1);
});

test("fixture variant relationships are complete", () => {
  assert.equal(plan.variantValues.every((link) => plan.variants.some((variant) => variant.id === link.variant_id)), true);
  assert.equal(plan.variantValues.every((link) => plan.optionValues.some((value) => value.id === link.option_value_id)), true);
});

console.log(`Checkout hardening mock checks passed: ${results.length}`);
console.log("MOCK VERIFIED only; no Supabase clients, RPCs, Storage calls, or remote writes were used.");
