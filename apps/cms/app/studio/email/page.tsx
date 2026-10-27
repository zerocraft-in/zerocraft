import { redirect } from "next/navigation";
import { requireGmailAdmin } from "@/lib/email/gmail-route";
import { EmailWorkspace } from "@/components/studio/email-workspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EmailPage() {
  const access = await requireGmailAdmin("email.read");
  if (!access.ok) {
    if (access.response.status >= 500) {
      throw new Error("Email workspace permissions are unavailable. Apply the approved permissions and Gmail workspace migrations.");
    }
    redirect("/");
  }
  return <EmailWorkspace />;
}
