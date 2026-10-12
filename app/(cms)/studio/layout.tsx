import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import StudioShell from "./studio-shell";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/studio");
  const { data: profile } = await supabase.from("profiles").select("role,full_name").eq("id", user.id).maybeSingle();
  if (!["admin", "manager", "staff"].includes(profile?.role || "")) redirect("/");
  return <StudioShell user={{ name: profile?.full_name || user.email?.split("@")[0] || "Studio", email: user.email || "", role: profile?.role || "staff" }}>{children}</StudioShell>;
}
