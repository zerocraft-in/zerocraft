import { NextResponse } from "next/server";
import { isSafeReturnPath } from "@/lib/domains";
import { createClient } from "@zerocraft/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = isSafeReturnPath(searchParams.get("next"), "/");
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
