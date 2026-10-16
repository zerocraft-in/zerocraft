import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { STORAGE_TEST_CASES, TEST_DATA_MANIFEST, TEST_EXECUTION_MANIFEST } from "./storage-test-cases.mjs";

const ROOT = process.cwd();
const LOCAL_DIR = path.join(ROOT, ".storage-runtime-test");
const PROJECT_REF_FILE = path.join(ROOT, "supabase", ".temp", "project-ref");
const PRODUCT_BUCKET = "product-media";
const CUSTOMER_BUCKET = "customer-customizations";
const TEST_FLAG = "ZEROCRAFT_RUN_STORAGE_RUNTIME_TESTS";
const APPROVAL_FLAG = "ZEROCRAFT_STORAGE_TEST_APPROVED";
const TARGET_FLAG = "ZEROCRAFT_STORAGE_TARGET";
const RUN_ID = `runtime-${new Date().toISOString().replace(/[-:.TZ]/g, "")}-${crypto.randomUUID().slice(0, 8)}`;
const VALID_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const VALID_JPEG = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AR//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AR//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z", "base64");
const VALID_WEBP = Buffer.from("UklGRiIAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAUAmJaQAA3AA/vuUAAA=", "base64");

function fail(message) {
  throw new Error(message);
}

function requireExecutionApproval() {
  if (process.env[TARGET_FLAG] !== "development") fail(`${TARGET_FLAG}=development is required; production targets are refused.`);
  if (process.env[TEST_FLAG] !== "1" || process.env[APPROVAL_FLAG] !== "1") {
    fail(`Disabled by default. Set ${TEST_FLAG}=1 and ${APPROVAL_FLAG}=1 only after explicit approval.`);
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) fail("Service-role credentials are forbidden for runtime authorization tests.");
}

async function verifyProjectIdentity() {
  const expected = (await fs.readFile(PROJECT_REF_FILE, "utf8")).trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) fail("NEXT_PUBLIC_SUPABASE_URL and a publishable/anonymous key are required.");
  const hostname = new URL(url).hostname;
  if (hostname !== `${expected}.supabase.co`) fail(`Configured Supabase URL does not match linked project ${expected}.`);
  if (process.env.ZEROCRAFT_STORAGE_TARGET === "production") fail("Production targets are refused.");
  return { expected, url, key };
}

function clientFor(url, key) {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signIn(role, url, key) {
  const email = process.env[`ZEROCRAFT_TEST_${role.toUpperCase().replaceAll("-", "_")}_EMAIL`];
  const password = process.env[`ZEROCRAFT_TEST_${role.toUpperCase().replaceAll("-", "_")}_PASSWORD`];
  if (!email || !password) fail(`Missing pre-provisioned credentials for ${role}; the harness never creates users.`);
  const supabase = clientFor(url, key);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) fail(`${role} authentication failed.`);
  return { supabase, userId: data.user.id };
}

async function verifyStudioMembership(client, role, expected) {
  const { data, error } = await client.rpc("is_studio_member");
  if (error || data !== expected) fail(`${role} Studio membership assertion failed.`);
}

function localManifest(runId) {
  return {
    runId,
    projectRef: "",
    createdAt: new Date().toISOString(),
    objects: [],
    usersCreated: [],
    testCases: STORAGE_TEST_CASES.map((test) => ({ ...test, status: "not-run" })),
    dataManifest: TEST_DATA_MANIFEST,
    executionManifest: TEST_EXECUTION_MANIFEST,
  };
}

function testPath(userId, extension = "png") {
  return `${userId}/${crypto.randomUUID()}.${extension}`;
}

function productPath(productId, extension = "png") {
  return `products/${productId}/${crypto.randomUUID()}.${extension}`;
}

function fixture(size, value = 0x61) {
  return Buffer.alloc(size, value);
}

function verifyLocalFixtures() {
  if (VALID_PNG.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") fail("PNG fixture is invalid.");
  if (VALID_JPEG.subarray(0, 2).toString("hex") !== "ffd8" || VALID_JPEG.subarray(-2).toString("hex") !== "ffd9") fail("JPEG fixture is invalid.");
  if (VALID_WEBP.subarray(0, 4).toString() !== "RIFF" || VALID_WEBP.subarray(8, 12).toString() !== "WEBP") fail("WebP fixture is invalid.");
}

async function upload(client, bucket, objectPath, body, contentType) {
  return client.storage.from(bucket).upload(objectPath, body, { contentType, upsert: false });
}

async function expectAllowed(manifest, id, operation) {
  try {
    const result = await operation();
    if (result?.error) throw result.error;
    manifest.testCases.find((test) => test.id === id).status = "passed";
    return result;
  } catch (error) {
    manifest.testCases.find((test) => test.id === id).status = "failed";
    throw new Error(`${id} unexpectedly failed.`);
  }
}

async function expectDenied(manifest, id, operation) {
  const test = manifest.testCases.find((candidate) => candidate.id === id);
  try {
    const result = await operation();
    if (!result?.error) {
      test.status = "failed";
      throw new Error(`${id} unexpectedly succeeded.`);
    }
    test.status = "passed";
    test.denialEvidence = {
      structuredError: true,
      status: result.error.status ?? result.error.statusCode ?? null,
      code: result.error.code ?? null,
    };
    return result.error;
  } catch (error) {
    test.status = "failed";
    throw error instanceof Error ? error : new Error(`${id} returned an unstructured failure.`);
  }
}

async function runStorageCases({ anon, studio, customerA, customerB, productId, manifest }) {
  verifyLocalFixtures();
  const image = VALID_PNG;
  const productObject = productPath(productId);
  const customerObject = testPath(customerA.userId);
  const customerBObject = testPath(customerB.userId);
  manifest.objects.push(
    { bucket: PRODUCT_BUCKET, path: productObject, owner: "studio" },
    { bucket: CUSTOMER_BUCKET, path: customerObject, owner: "customer-a" },
  );

  await expectDenied(manifest, "product.anon-upload-denied", () => upload(anon, PRODUCT_BUCKET, productPath(productId), image, "image/png"));
  await expectDenied(manifest, "product.customer-upload-denied", () => upload(customerA.supabase, PRODUCT_BUCKET, productPath(productId), image, "image/png"));
  await expectAllowed(manifest, "product.studio-upload", () => upload(studio.supabase, PRODUCT_BUCKET, productObject, image, "image/png"));
  await expectAllowed(manifest, "product.studio-update", () => studio.supabase.storage.from(PRODUCT_BUCKET).update(productObject, image, { contentType: "image/png", upsert: false }));
  await expectDenied(manifest, "product.invalid-product-path-denied", () => upload(studio.supabase, PRODUCT_BUCKET, "products/not-a-product/not-a-uuid.png", image, "image/png"));
  await expectDenied(manifest, "product.invalid-mime-denied", () => upload(studio.supabase, PRODUCT_BUCKET, productPath(productId, "svg"), image, "image/svg+xml"));
  await expectDenied(manifest, "product.oversized-file-denied", () => upload(studio.supabase, PRODUCT_BUCKET, productPath(productId), fixture(10 * 1024 * 1024 + 1), "image/png"));
  await expectAllowed(manifest, "product.studio-delete", () => studio.supabase.storage.from(PRODUCT_BUCKET).remove([productObject]));

  await expectDenied(manifest, "customer.anon-upload-denied", () => upload(anon, CUSTOMER_BUCKET, customerObject, image, "image/png"));
  await expectAllowed(manifest, "customer.owner-upload", () => upload(customerA.supabase, CUSTOMER_BUCKET, customerObject, image, "image/png"));
  await expectDenied(manifest, "customer.cross-owner-upload-denied", () => upload(customerA.supabase, CUSTOMER_BUCKET, customerBObject, image, "image/png"));
  await expectAllowed(manifest, "customer.owner-read", () => customerA.supabase.storage.from(CUSTOMER_BUCKET).download(customerObject));
  await expectDenied(manifest, "customer.cross-owner-read-denied", () => customerB.supabase.storage.from(CUSTOMER_BUCKET).download(customerObject));
  await expectDenied(manifest, "customer.cross-owner-update-denied", () => customerB.supabase.storage.from(CUSTOMER_BUCKET).update(customerObject, image, { contentType: "image/png", upsert: false }));
  await expectDenied(manifest, "customer.cross-owner-delete-denied", () => customerB.supabase.storage.from(CUSTOMER_BUCKET).remove([customerObject]));
  await expectAllowed(manifest, "customer.studio-operational-access", () => studio.supabase.storage.from(CUSTOMER_BUCKET).download(customerObject));
  await expectDenied(manifest, "customer.anon-read-denied", () => anon.storage.from(CUSTOMER_BUCKET).download(customerObject));
  await expectDenied(manifest, "customer.invalid-depth-denied", () => upload(customerA.supabase, CUSTOMER_BUCKET, `${customerA.userId}/nested/${crypto.randomUUID()}.png`, image, "image/png"));
  await expectDenied(manifest, "customer.invalid-uuid-denied", () => upload(customerA.supabase, CUSTOMER_BUCKET, `${customerA.userId}/not-a-uuid.png`, image, "image/png"));
  await expectDenied(manifest, "customer.invalid-mime-denied", () => upload(customerA.supabase, CUSTOMER_BUCKET, testPath(customerA.userId, "svg"), image, "image/svg+xml"));
  await expectDenied(manifest, "customer.oversized-file-denied", () => upload(customerA.supabase, CUSTOMER_BUCKET, testPath(customerA.userId), fixture(25 * 1024 * 1024 + 1), "image/png"));

  const { data: signed, error: signedError } = await customerA.supabase.storage.from(CUSTOMER_BUCKET).createSignedUrl(customerObject, 2);
  if (signedError || !signed?.signedUrl) throw new Error("customer signed URL creation failed.");
  manifest.testCases.find((test) => test.id === "signed.owner-preview").status = (await fetch(signed.signedUrl)).ok ? "passed" : "failed";
  await expectDenied(manifest, "signed.public-url-denied", () => fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${CUSTOMER_BUCKET}/${customerObject}`).then(async (response) => response.ok ? { data: response } : { error: new Error(`HTTP ${response.status}`) }));
  await expectDenied(manifest, "signed.cross-owner-preview-denied", () => customerB.supabase.storage.from(CUSTOMER_BUCKET).createSignedUrl(customerObject, 60));
  await new Promise((resolve) => setTimeout(resolve, 2500));
  manifest.testCases.find((test) => test.id === "signed.expired-preview").status = (await fetch(signed.signedUrl)).ok ? "failed" : "passed";
  manifest.testCases.find((test) => test.id === "api.unauthorized-signed-url-request").status = "pending";
}

async function execute() {
  requireExecutionApproval();
  const { expected, url, key } = await verifyProjectIdentity();
  const anon = clientFor(url, key);
  const studio = await signIn("studio", url, key);
  const customerA = await signIn("customer-a", url, key);
  const customerB = await signIn("customer-b", url, key);
  if (new Set([studio.userId, customerA.userId, customerB.userId]).size !== 3) fail("Test identities must be distinct accounts.");
  await verifyStudioMembership(studio.supabase, "studio", true);
  await verifyStudioMembership(customerA.supabase, "customer-a", false);
  await verifyStudioMembership(customerB.supabase, "customer-b", false);
  const productId = process.env.ZEROCRAFT_STORAGE_TEST_PRODUCT_ID;
  if (!productId) fail("ZEROCRAFT_STORAGE_TEST_PRODUCT_ID is required; no product record is created by this harness.");
  const manifest = localManifest(RUN_ID);
  manifest.projectRef = expected;
  manifest.accounts = { studio: studio.userId, customerA: customerA.userId, customerB: customerB.userId };
  manifest.productId = productId;
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, `${RUN_ID}.json`), JSON.stringify(manifest, null, 2), "utf8");
  try {
    await runStorageCases({ anon, studio, customerA, customerB, productId, manifest });
  } catch (error) {
    manifest.failure = "Runtime test execution stopped; inspect statuses and clean only manifest-listed objects.";
    throw error;
  } finally {
    await fs.writeFile(path.join(LOCAL_DIR, `${RUN_ID}.json`), JSON.stringify(manifest, null, 2), "utf8");
  }
  console.log(`Completed runtime test run ${RUN_ID}. No tests were retried or cleaned up automatically.`);
  console.log(`Test manifest: ${path.relative(ROOT, path.join(LOCAL_DIR, `${RUN_ID}.json`))}`);
}

async function cleanup() {
  requireExecutionApproval();
  fail("Cleanup is intentionally not executable in Phase 2.6A. Use the reviewed manifest and an explicitly approved cleanup phase.");
}

if (process.argv.includes("--fixtures")) {
  verifyLocalFixtures();
  console.log("Local PNG, JPEG, and WebP fixtures passed header checks; SVG and oversized payload fixtures are local negative inputs only.");
} else if (process.argv.includes("--cleanup")) await cleanup();
else if (process.argv.includes("--execute")) await execute();
else {
  console.log(`Storage runtime harness is disabled. Use --execute only after explicit approval with ${TEST_FLAG}=1, ${APPROVAL_FLAG}=1, and ${TARGET_FLAG}=development.`);
  console.log(`Expected test cases: ${STORAGE_TEST_CASES.length}; remote mutations: none in preparation mode.`);
}
