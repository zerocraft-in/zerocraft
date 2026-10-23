import { getPublishedBundles } from "@/lib/commerce/bundles";

export const runtime = "nodejs";

export async function GET() {
  try {
    const bundles = await getPublishedBundles();
    return Response.json(
      { bundles },
      {
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("Store bundles request failed", error);
    return Response.json(
      { error: "Bundles are temporarily unavailable." },
      { status: 503 },
    );
  }
}
