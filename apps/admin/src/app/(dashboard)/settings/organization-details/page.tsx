import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requireOrganization,
  NO_ACTIVE_MEMBERSHIP_ERROR,
} from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@zerocraft/ui/card";
import { Badge } from "@zerocraft/ui/badge";
import { Button } from "@zerocraft/ui/button";
import { Separator } from "@zerocraft/ui/separator";
import { MapPin, Mail, Phone, Globe } from "lucide-react";
import Image from "next/image";

type OrganizationRow = {
  id: string;
  name: string | null;
  slug: string | null;
  currency: string | null;
  timezone: string | null;
  country: string | null;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  address: Record<string, unknown> | null;
  logo_path: string | null;
  invoice_prefix: string | null;
  invoice_next_number: number | null;
  tax_inclusive_pricing: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

async function getOrganization(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrganizationRow | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select(
      `
      id,
      name,
      slug,
      currency,
      timezone,
      country,
      gstin,
      phone,
      email,
      address,
      logo_path,
      invoice_prefix,
      invoice_next_number,
      tax_inclusive_pricing,
      created_at,
      updated_at
    `,
    )
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("Organization lookup failed.", {
      code: error.code,
      message: error.message,
    });
    throw new Error("Unable to load organization details");
  }
  return (data ?? null) as OrganizationRow | null;
}

async function requireOrganizationOrRedirect() {
  try {
    return await requireOrganization();
  } catch (error) {
    if (error instanceof Error && error.message === NO_ACTIVE_MEMBERSHIP_ERROR) {
      redirect("/onboarding");
    }
    throw error;
  }
}

export default async function OrganizationDetailsPage() {
  const context = await requireOrganizationOrRedirect();

  const supabase: SupabaseClient = await createServerSupabaseClient();

  const organizationId = context.activeOrganization?.id;
  if (!organizationId) {
    redirect("/onboarding");
  }

  if (!context.permissions.has("settings.view")) {
    redirect("/overview");
  }

  const org = await getOrganization(supabase, organizationId);
  if (!org) {
    redirect("/overview");
  }

  const canManage = context.permissions.has("settings.manage");

  const address = org.address as
    | { raw?: string; street?: string; city?: string; state?: string; zip?: string }
    | null
    | undefined;

  const addressLines = [];
  if (address) {
    if (address.street) addressLines.push(address.street);
    if (address.city) addressLines.push(address.city);
    if (address.state) addressLines.push(address.state);
    if (address.zip) addressLines.push(address.zip);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0 flex items-center gap-2">
          <div
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand text-[13px] font-bold text-brand-fg"
          >
            M
          </div>
          <div className="min-w-0 leading-tight">
            <h1 className="text-sm font-semibold tracking-[-0.02em] text-body">
              {org.name ?? "Organization"}
              <span className="text-2xs text-muted-foreground ml-2">
                {org.slug ? `· ${org.slug}` : ""}
              </span>
            </h1>
            <p className="hidden text-2xs text-meta sm:block">
              Organization details
            </p>
          </div>
        </div>
        {canManage && (
          <Button variant="outline" size="sm">
            Edit
          </Button>
        )}
      </div>

      <Separator className="mt-4 mb-8" />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Organization overview */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="rounded-xl border border-input bg-background p-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-tighter mb-4">
              Organization overview
            </h2>
            <div className="flex gap-4">
              <div className="relative flex-1 aspect-video rounded-xl border border-border overflow-hidden">
                <Image
                  fill
                  src="/map-placeholder.svg"
                  alt="Organization map"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex shrink-0 mt-0.5">
                  <Globe className="size-4 text-muted-foreground" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">No website</p>
                  <p className="text-xs text-muted-foreground">
                    Add a website to help customers find your organization.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex shrink-0 mt-0.5">
                  <Mail className="size-4 text-muted-foreground" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">
                    {org.email ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex shrink-0 mt-0.5">
                  <Phone className="size-4 text-muted-foreground" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">
                    {org.phone ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex shrink-0 mt-0.5">
                  <MapPin className="size-4 text-muted-foreground" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">
                    {addressLines.length > 0
                      ? addressLines.join(", ")
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {org.country ?? "India"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Business entities */}
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Business entities</CardTitle>
              </div>
              {canManage && <Button size="sm">+ Entity</Button>}
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">All</Button>
                <Button variant="outline" size="sm">Active</Button>
                <Button variant="outline" size="sm">Archived</Button>
              </div>
              <div className="mt-6 rounded-xl border border-input p-6 text-center">
                <div className="flex flex-col items-center gap-2">
                  <SearchIcon className="size-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No business entities found
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Try changing the filters or search term
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stores */}
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Stores</CardTitle>
              </div>
              <Button size="sm">Create store</Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button variant="outline" size="sm">All</Button>
                <Button variant="outline" size="sm">Active</Button>
                <Button variant="outline" size="sm">Archived</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b">
                      <th className="text-left pb-3">Store</th>
                      <th className="text-left pb-3">Status</th>
                      <th className="text-left pb-3">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex shrink-0 items-center justify-center size-5 rounded-full bg-brand text-[10px] font-bold text-brand-fg">
                            DD
                          </div>
                          <div className="flex flex-col leading-none">
                            <p className="text-sm font-medium">
                              Devi Fashion Official
                            </p>
                            <p className="text-xs text-muted-foreground">
                              devi-fashion-official.myshopify.com
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant="success">Active</Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        Client transfer
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex shrink-0 items-center justify-center size-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            M
                          </div>
                          <div className="flex flex-col leading-none">
                            <p className="text-sm font-medium">
                              maraapparels
                            </p>
                            <p className="text-xs text-muted-foreground">
                              maraapparels.myshopify.com
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant="success">Active</Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        Client transfer
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Organization business details */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Organization business details</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                <span className="size-4">+</span>
                Add new entity
              </Button>
            </CardContent>
          </Card>

          {/* App Store registration */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>App Store registration</CardTitle>
              </div>
              <Button>Register</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-input bg-muted p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">
                      One-time registration charge
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pay 0% revenue share on the first $10L USD in lifetime
                      app revenue
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Publish public apps
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    $19.00 USD
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency contact information */}
          <Card>
            <CardHeader>
              <CardTitle>Emergency contact information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-body">
                  Emergency developer email
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-2xs text-muted-foreground">
                  The email where all API breaking changes and app operational
                  information will be sent
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-body">
                  Emergency developer phone number
                </label>
                <div className="flex gap-2">
                  <select
                    className="flex h-9 shrink-0 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option>India (+91)</option>
                  </select>
                  <input
                    type="tel"
                    placeholder=""
                    className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <p className="text-2xs text-muted-foreground">
                  The phone number that can be used to notify you of emergency
                  API breaking changes and operational issues
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
