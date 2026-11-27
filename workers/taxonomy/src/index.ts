
const VERSION = "2026-11";
const PREFIX = `taxonomy/${VERSION}/`;

const ALLOWED_ORIGINS = new Set([
  "https://admin.maara.co.in",
  "https://maara.co.in",
  "https://www.maara.co.in",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const ALLOWED_VERTICALS = new Set([
  "ap", "aa", "ae", "bt", "bu", "bi", "co", "el", "fb",
  "fr", "gc", "ha", "hb", "hg", "lb", "ma", "me", "os",
  "pa", "rc", "se", "so", "sg", "tg", "na", "vp",
]);

function resolveObjectKey(pathname: string): string | null {
  if (pathname === "/v1/taxonomy/manifest") {
    return `${PREFIX}manifest.json.gz`;
  }

  if (pathname === "/v1/taxonomy/attributes") {
    return `${PREFIX}attributes.en.json.gz`;
  }

  if (pathname === "/v1/taxonomy/return-reasons") {
    return `${PREFIX}return_reasons.en.json.gz`;
  }

  const match = pathname.match(
    /^\/v1\/taxonomy\/verticals\/([^/]+)$/
  );

  if (match) {
    let vertical: string;

    try {
      vertical = decodeURIComponent(match[1]);
    } catch {
      return null;
    }

    if (!ALLOWED_VERTICALS.has(vertical)) return null;

    return `${PREFIX}verticals/${vertical}.json.gz`;
  }

  return null;
}

function corsHeaders(origin: string | null): Headers {
  const headers = new Headers({
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "If-None-Match, If-Modified-Since, Content-Type",
    "Access-Control-Expose-Headers": "ETag, X-Taxonomy-Version",
    "Access-Control-Max-Age": "3600",
  });

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

function jsonError(
  status: number,
  message: string,
  headers = new Headers()
): Response {
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");

  return new Response(JSON.stringify({ error: message }), {
    status,
    headers,
  });
}

function matchesEtag(header: string | null, etag: string): boolean {
  if (!header) return false;

  return header.split(",").some((value) => {
    const candidate = value.trim();

    return (
      candidate === "*" ||
      candidate === etag ||
      candidate.replace(/^W\//, "") === etag
    );
  });
}


async function serveTaxonomyObject(
  request: Request,
  env: Env,
  key: string,
  headers: Headers
): Promise<Response> {
  const isHead = request.method === "HEAD";

  if (isHead) {
    const object = await env.TAXONOMY.head(key);

    if (!object) {
      return jsonError(404, "Taxonomy resource not found", headers);
    }

    const etag = object.httpEtag;

    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("ETag", etag);
    headers.set("X-Taxonomy-Version", VERSION);
    headers.set("X-Content-Type-Options", "nosniff");

    if (object.uploaded) {
      headers.set("Last-Modified", object.uploaded.toUTCString());
    }

    if (matchesEtag(request.headers.get("If-None-Match"), etag)) {
      return new Response(null, { status: 304, headers });
    }

    return new Response(null, { status: 200, headers });
  }

  const object = await env.TAXONOMY.get(key);

  if (!object) {
    return jsonError(404, "Taxonomy resource not found", headers);
  }

  const etag = object.httpEtag;

  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", etag);
  headers.set("X-Taxonomy-Version", VERSION);
  headers.set("X-Content-Type-Options", "nosniff");

  if (object.uploaded) {
    headers.set("Last-Modified", object.uploaded.toUTCString());
  }

  if (matchesEtag(request.headers.get("If-None-Match"), etag)) {
    return new Response(null, { status: 304, headers });
  }

  const decompressed = object.body.pipeThrough(
    new DecompressionStream("gzip")
  );

  return new Response(decompressed, {
    status: 200,
    headers,
  });
}


const worker: ExportedHandler<Env> = {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const headers = corsHeaders(origin);

    const isHealth = url.pathname === "/health";
    const key = resolveObjectKey(url.pathname);

    if (!isHealth && !key) {
      return jsonError(404, "Route not found", headers);
    }

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return jsonError(403, "Origin not allowed");
    }

    if (request.method === "OPTIONS") {
      const requestedMethod = request.headers.get(
        "Access-Control-Request-Method"
      );

      if (
        requestedMethod &&
        !["GET", "HEAD"].includes(requestedMethod)
      ) {
        return jsonError(405, "Method not allowed", headers);
      }

      return new Response(null, {
        status: 204,
        headers,
      });
    }

    if (!["GET", "HEAD"].includes(request.method)) {
      headers.set("Allow", "GET, HEAD, OPTIONS");
      return jsonError(405, "Method not allowed", headers);
    }

    if (isHealth) {
      headers.set("Content-Type", "application/json; charset=utf-8");
      headers.set("Cache-Control", "no-store");

      return new Response(
        JSON.stringify({
          status: "ok",
          service: "maara-taxonomy",
          version: VERSION,
        }),
        { status: 200, headers }
      );
    }

    try {
      return await serveTaxonomyObject(
        request,
        env,
        key!,
        headers
      );
    } catch (error) {
      console.error(JSON.stringify({
        message: "Taxonomy Worker request failed",
        path: url.pathname,
        error: error instanceof Error ? error.message : "Unknown error",
      }));

      return jsonError(500, "Unable to read taxonomy resource", headers);
    }
  },
};

export default worker;
