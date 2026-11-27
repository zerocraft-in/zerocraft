
import { describe, expect, it, vi } from "vitest";
import worker from "./index";

const VERSION = "2026-11";

async function makeGzipObject(
  data: unknown,
  etag = '"test-etag"'
) {
  const compressed = await new Response(
    new Blob([JSON.stringify(data)])
      .stream()
      .pipeThrough(new CompressionStream("gzip"))
  ).arrayBuffer();

  return {
    httpEtag: etag,
    uploaded: new Date("2026-11-24T10:00:00.000Z"),
    body: new Blob([compressed]).stream(),
  };
}

function createBucket() {
  return {
    get: vi.fn(),
    head: vi.fn(),
  };
}

async function requestWorker(
  path: string,
  bucket = createBucket(),
  init: RequestInit = {}
) {
  const request = new Request(`https://taxonomy.test${path}`, init);

const response = await worker.fetch!(
  request as Parameters<NonNullable<typeof worker.fetch>>[0],
  { TAXONOMY: bucket } as never,
  {} as ExecutionContext
);

  return { response, bucket };
}

describe("Taxonomy Worker", () => {
  it("returns health status without accessing R2", async () => {
    const { response, bucket } = await requestWorker("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      service: "maara-taxonomy",
      version: VERSION,
    });

    expect(bucket.get).not.toHaveBeenCalled();
    expect(bucket.head).not.toHaveBeenCalled();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("serves and decompresses the taxonomy manifest", async () => {
    const manifest = {
      version: VERSION,
      roots: [{ id: "aa", prefix: "aa", name: "Apparel & Accessories" }],
    };

    const bucket = createBucket();
    bucket.get.mockResolvedValue(await makeGzipObject(manifest));

    const { response } = await requestWorker(
      "/v1/taxonomy/manifest",
      bucket
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(manifest);
    expect(bucket.get).toHaveBeenCalledWith(
      "taxonomy/2026-11/manifest.json.gz"
    );
    expect(response.headers.get("X-Taxonomy-Version")).toBe(VERSION);
    expect(response.headers.get("Content-Type")).toContain("application/json");
  });

  it("serves an allowed vertical", async () => {
    const vertical = {
      version: VERSION,
      prefix: "aa",
      name: "Apparel & Accessories",
      categories: [],
    };

    const bucket = createBucket();
    bucket.get.mockResolvedValue(await makeGzipObject(vertical));

    const { response } = await requestWorker(
      "/v1/taxonomy/verticals/aa",
      bucket
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(vertical);
    expect(bucket.get).toHaveBeenCalledWith(
      "taxonomy/2026-11/verticals/aa.json.gz"
    );
  });

  it("serves attributes", async () => {
    const data = { version: VERSION, attributes: [] };
    const bucket = createBucket();
    bucket.get.mockResolvedValue(await makeGzipObject(data));

    const { response } = await requestWorker(
      "/v1/taxonomy/attributes",
      bucket
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(data);
    expect(bucket.get).toHaveBeenCalledWith(
      "taxonomy/2026-11/attributes.en.json.gz"
    );
  });

  it("serves return reasons", async () => {
    const data = { version: VERSION, return_reasons: [] };
    const bucket = createBucket();
    bucket.get.mockResolvedValue(await makeGzipObject(data));

    const { response } = await requestWorker(
      "/v1/taxonomy/return-reasons",
      bucket
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(data);
    expect(bucket.get).toHaveBeenCalledWith(
      "taxonomy/2026-11/return_reasons.en.json.gz"
    );
  });

  it("rejects an unknown vertical without accessing R2", async () => {
    const { response, bucket } = await requestWorker(
      "/v1/taxonomy/verticals/unknown"
    );

    expect(response.status).toBe(404);
    expect(bucket.get).not.toHaveBeenCalled();
  });

  it("rejects unknown routes", async () => {
    const { response, bucket } = await requestWorker("/unknown");

    expect(response.status).toBe(404);
    expect(bucket.get).not.toHaveBeenCalled();
  });

  it("rejects POST requests", async () => {
    const { response } = await requestWorker(
      "/v1/taxonomy/manifest",
      createBucket(),
      { method: "POST" }
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, HEAD, OPTIONS");
  });

  it("allows CORS from approved origins", async () => {
    const { response } = await requestWorker("/health", createBucket(), {
      headers: { Origin: "https://admin.maara.co.in" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://admin.maara.co.in"
    );
  });

  it("rejects CORS requests from unapproved origins", async () => {
    const { response } = await requestWorker("/health", createBucket(), {
      headers: { Origin: "https://untrusted.example" },
    });

    expect(response.status).toBe(403);
  });

  it("handles valid CORS preflight requests", async () => {
    const { response } = await requestWorker("/health", createBucket(), {
      method: "OPTIONS",
      headers: {
        Origin: "https://admin.maara.co.in",
        "Access-Control-Request-Method": "GET",
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://admin.maara.co.in"
    );
  });

  it("rejects preflight requests for unsupported methods", async () => {
    const { response } = await requestWorker("/health", createBucket(), {
      method: "OPTIONS",
      headers: {
        Origin: "https://admin.maara.co.in",
        "Access-Control-Request-Method": "DELETE",
      },
    });

    expect(response.status).toBe(405);
  });

  it("serves HEAD requests without a response body", async () => {
    const bucket = createBucket();
    bucket.head.mockResolvedValue(await makeGzipObject({ version: VERSION }));

    const { response } = await requestWorker(
      "/v1/taxonomy/manifest",
      bucket,
      { method: "HEAD" }
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
    expect(bucket.head).toHaveBeenCalledWith(
      "taxonomy/2026-11/manifest.json.gz"
    );
    expect(bucket.get).not.toHaveBeenCalled();
  });

  it("returns 304 when the ETag matches", async () => {
    const bucket = createBucket();
    bucket.get.mockResolvedValue(
      await makeGzipObject({ version: VERSION }, '"test-etag"')
    );

    const { response } = await requestWorker(
      "/v1/taxonomy/manifest",
      bucket,
      { headers: { "If-None-Match": '"test-etag"' } }
    );

    expect(response.status).toBe(304);
    expect(await response.text()).toBe("");
  });

  it("returns 404 when an R2 object is missing", async () => {
    const bucket = createBucket();
    bucket.get.mockResolvedValue(null);

    const { response } = await requestWorker(
      "/v1/taxonomy/manifest",
      bucket
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "Taxonomy resource not found",
    });
  });
});
