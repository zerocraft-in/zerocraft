import { notFound } from "next/navigation";
import StudioSettingsPage from "../page";

const settingSections = new Set([
  "general", "plan", "billing", "users", "payments", "checkout", "customer-accounts",
  "shipping", "taxes", "locations", "apps", "sales-channels", "domains", "customer-events",
  "notifications", "custom-data", "languages", "privacy", "policies",
]);

export default async function SettingsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!settingSections.has(section)) notFound();
  return <StudioSettingsPage />;
}
