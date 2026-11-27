import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy selector path; the canonical route is /organizations. */
export default function SelectOrganizationPage() {
  redirect("/organizations");
}
