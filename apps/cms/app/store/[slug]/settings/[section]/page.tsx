import { notFound } from "next/navigation";
import CommerceSettingsPage from "../page";
import { LegalPoliciesSettings } from "@/components/platform/legal-policies-settings";

const settingSections = new Set([
  "general", "plan", "billing", "payments", "checkout", "customer-accounts",
  "shipping", "taxes", "locations", "apps", "sales-channels", "domains", "customer-events",
  "notifications", "custom-data", "languages", "privacy", "policies",
]);

export default async function SettingsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!settingSections.has(section)) notFound();
  if (section === "policies") return <LegalPoliciesSettings />;
  return <CommerceSettingsPage />;
}
