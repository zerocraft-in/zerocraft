"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { createOrganization } from "./actions";
import { fetchTaxonomyManifest } from "@/lib/taxonomy";
import { Button } from "@zerocraft/ui/button";

const onboardingSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(120, "Organization name must be at most 120 characters"),
  taxonomyRootIds: z.array(z.string()).max(26),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [taxonomyRoots, setTaxonomyRoots] = React.useState<Array<{ id: string; name: string }>>([]);
  const [taxonomyRootsLoading, setTaxonomyRootsLoading] = React.useState(true);
  const [taxonomyLoadError, setTaxonomyLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadTaxonomyRoots() {
      setTaxonomyRootsLoading(true);
      setTaxonomyLoadError(null);

      try {
        const manifest = await fetchTaxonomyManifest();

        if (!cancelled) {
          const roots = manifest.roots
            .map((root) => ({
              id: `gid://shopify/TaxonomyCategory/${root.prefix}`,
              name: root.name,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

          setTaxonomyRoots(roots);
        }
      } catch (err) {
        if (!cancelled) {
          setTaxonomyLoadError(
            err instanceof Error
              ? err.message
              : "Unable to load Shopify product categories."
          );
        }
      } finally {
        if (!cancelled) {
          setTaxonomyRootsLoading(false);
        }
      }
    }

    void loadTaxonomyRoots();

    return () => {
      cancelled = true;
    };
  }, []);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      organizationName: "",
      taxonomyRootIds: ["gid://shopify/TaxonomyCategory/aa", "gid://shopify/TaxonomyCategory/bu", "gid://shopify/TaxonomyCategory/na", "gid://shopify/TaxonomyCategory/gc"],
    },
  });

  async function handleSubmit(values: OnboardingFormValues) {
    setError(null);
    setLoading(true);

    try {
      const result = await createOrganization(values.organizationName, values.taxonomyRootIds);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // Redirect to the Store Setup Wizard with the new organization id.
      router.push(`/onboarding/setup?organizationId=${encodeURIComponent(result.organizationId)}`);
    } catch {
      setError("Unable to create organization. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-full w-full flex-col items-center justify-center">
      <div className="mx-auto flex max-w-[340px] flex-col">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand text-[13px] font-bold text-brand-fg"
          >
            M
          </div>
          <p className="text-sm font-semibold tracking-[-0.02em]">Maara Merch</p>
        </div>

        <h2 className="mb-6 text-sm font-semibold tracking-[-0.02em]">
          Create your business
        </h2>
        <p className="mb-8 text-2xs text-meta">
          Enter your organization name. You&rsquo;ll become the Owner and can
          invite teammates later.
        </p>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="organizationName" className="text-2xs font-semibold text-meta">
              Organization name
            </label>
            <input
              id="organizationName"
              type="text"
              autoComplete="off"
              placeholder="Maara Clothing"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              {...form.register("organizationName")}
            />
            {form.formState.errors.organizationName && (
              <p className="text-2xs text-destructive">
                {form.formState.errors.organizationName.message}
              </p>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-2xs font-semibold text-meta">Product category groups</p>
            <p className="text-2xs text-meta">Choose the groups this organization needs. Only these selections are saved; the full Shopify taxonomy remains shared.</p>
            <div className="grid grid-cols-2 gap-2">
              {taxonomyRoots.map((root) => (
                <label key={root.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
                  <input type="checkbox" value={root.id} {...form.register("taxonomyRootIds")} />
                  {root.name}
                </label>
              ))}
            </div>
            {taxonomyRootsLoading && (
              <p className="text-2xs text-meta">Loading Shopify groups…</p>
            )}
            {taxonomyLoadError && (
              <p role="alert" className="text-2xs text-destructive">
                Unable to load product groups: {taxonomyLoadError}
              </p>
            )}
            {!taxonomyRootsLoading && !taxonomyLoadError && taxonomyRoots.length === 0 && (
              <p className="text-2xs text-meta">No Shopify groups are available.</p>
            )}
          </div>
          <p className="text-2xs text-meta">
            Organization creation is rate-limited and happens in a single
            database transaction.
          </p>

          <Button type="submit" size="lg" disabled={loading || taxonomyRootsLoading || !!taxonomyLoadError || taxonomyRoots.length === 0} className="w-full">
            {loading ? "Creating…" : "Create organization"}
          </Button>
        </form>

        <p className="mt-6 text-center text-2xs text-meta">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-brand underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

