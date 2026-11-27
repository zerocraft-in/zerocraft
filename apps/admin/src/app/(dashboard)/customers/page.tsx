import Link from "next/link";
import { redirect } from "next/navigation";

import {
  requireOrganization,
  NO_ACTIVE_MEMBERSHIP_ERROR,
} from "@/lib/auth/session";

import CustomersManager from "./_components/customers-manager";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@zerocraft/ui/button";

async function requireOrganizationOrRedirect() {
  try {
    return await requireOrganization();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === NO_ACTIVE_MEMBERSHIP_ERROR
    ) {
      redirect("/onboarding");
    }

    throw error;
  }
}

export default async function CustomersPage() {
  const context = await requireOrganizationOrRedirect();

  const organizationId = context.activeOrganization?.id;

  if (!organizationId) {
    redirect("/onboarding");
  }

  if (!context.permissions.has("customers.view")) {
    redirect("/overview");
  }

  return (
    <PageHeader
      actions={
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
          <Button variant="outline" size="sm">
            Export
          </Button>
          <Button variant="outline" size="sm">
            Import
          </Button>

          <Button
            size="sm"
            render={<Link href="/customers/new" />}
          >
            Add customer
          </Button>
        </div>
      }
    >
      <CustomersManager
        organizationId={organizationId}
        permissions={context.permissions}
      />
    </PageHeader>
  );
}
