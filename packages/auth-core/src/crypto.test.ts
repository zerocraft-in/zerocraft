import { describe, expect, it } from "vitest";

import {
  createCodeChallenge,
  createPkcePair,
  generateRandomToken,
  isValidCodeChallenge,
  isValidHandoffCode,
  isValidPkceVerifier,
  isValidState,
  sha256Hex,
  signHandoffRequest,
  timingSafeEqualBase64Url,
  verifyHandoffRequest,
} from "./crypto";

const SECRET = "test-only-handoff-secret-with-32-plus-bytes";

describe("random tokens", () => {
  it("generates distinct URL-safe values", () => {
    const first = generateRandomToken();
    const second = generateRandomToken();
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(isValidHandoffCode(first)).toBe(true);
    expect(isValidState(first)).toBe(true);
  });

  it("rejects invalid token lengths", () => {
    expect(() => generateRandomToken(8)).toThrow();
    expect(() => generateRandomToken(1024)).toThrow();
  });
});

describe("PKCE", () => {
  it("creates an S256 challenge that validates", async () => {
    const { verifier, challenge } = await createPkcePair();
    expect(isValidPkceVerifier(verifier)).toBe(true);
    expect(isValidCodeChallenge(challenge)).toBe(true);
    expect(await createCodeChallenge(verifier)).toBe(challenge);
  });

  it("rejects malformed challenges", () => {
    expect(isValidCodeChallenge("abc")).toBe(false);
    expect(isValidPkceVerifier("short")).toBe(false);
  });
});

describe("handoff request signatures", () => {
  it("verifies a fresh correctly signed request", async () => {
    const timestamp = "1700000000000";
    const body = '{"code":"abc","verifier":"def"}';
    const signature = await signHandoffRequest(SECRET, timestamp, body);

    await expect(
      verifyHandoffRequest({
        secret: SECRET,
        timestamp,
        body,
        signature,
        now: 1700000000000,
      }),
    ).resolves.toBe(true);
  });

  it("rejects tampered bodies, stale timestamps and short secrets", async () => {
    const timestamp = "1700000000000";
    const body = '{"code":"abc"}';
    const signature = await signHandoffRequest(SECRET, timestamp, body);

    await expect(
      verifyHandoffRequest({
        secret: SECRET,
        timestamp,
        body: '{"code":"xyz"}',
        signature,
        now: 1700000000000,
      }),
    ).resolves.toBe(false);

    await expect(
      verifyHandoffRequest({
        secret: SECRET,
        timestamp,
        body,
        signature,
        now: 1700000000000 + 300_000,
      }),
    ).resolves.toBe(false);

    await expect(
      verifyHandoffRequest({
        secret: "short",
        timestamp,
        body,
        signature,
        now: 1700000000000,
      }),
    ).resolves.toBe(false);
  });
});

describe("hashing", () => {
  it("produces the documented SHA-256 hex digest", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("compares base64url values in constant time", () => {
    expect(timingSafeEqualBase64Url("YWJj", "YWJj")).toBe(true);
    expect(timingSafeEqualBase64Url("YWJj", "YWJk")).toBe(false);
    expect(timingSafeEqualBase64Url("YWJj", "YWI")).toBe(false);
  });
});
