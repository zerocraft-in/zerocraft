import { logSecurityEvent } from "@/lib/security-logging";

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: { routePath: string; routeType: string },
) {
  if (!request.path.startsWith("/api/")) return;
  await logSecurityEvent({
    event: "api.error",
    route: context.routePath || request.path,
    status: 500,
    metadata: { method: request.method, routeType: context.routeType, error: error instanceof Error ? error.name : "unknown" },
  });
}
