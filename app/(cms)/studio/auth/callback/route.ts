import { NextResponse } from "next/server";
import { isSafeReturnPath, resolveDomainHost } from "@/lib/domains";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  if (resolveDomainHost(new URL(request.url).hostname) !== "admin") {
    return new NextResponse("Authentication callbacks require the admin hostname", { status: 421 });
  }
  const code = searchParams.get("code");
  const next = isSafeReturnPath(searchParams.get("next"), "/studio");
  const safeDestination = new URL(next, origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(safeDestination);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
