"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@zerocraft/ui/components/avatar";
import { Button } from "@zerocraft/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@zerocraft/ui/components/dropdown-menu";
import { createStudioSupabaseBrowserClient } from "@/lib/studio-supabase-browser";

export function AccountMenu() {
  const router = useRouter();
  const [name, setName] = useState("Maran");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createStudioSupabaseBrowserClient();
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        setName(
          user?.user_metadata?.full_name ??
            user?.email?.split("@")[0] ??
            "Maran",
        );
      })
      .catch(() => undefined);
  }, []);

  async function signOut() {
    setBusy(true);
    const supabase = createStudioSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto rounded-full p-0.5 hover:bg-white/[.08]"
          aria-label="Open account menu"
        >
          <Avatar size="lg" className="border border-white/20 bg-[#2a2a2e]">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-64 rounded-2xl border border-white/[.12] bg-[#202024]/95 p-2 text-zinc-100 backdrop-blur-2xl"
      >
        <DropdownMenuItem
          className="rounded-xl px-3 py-2.5"
          onClick={() => router.push("/studio/settings/workspace-profile")}
        >
          <UserRound />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-xl px-3 py-2.5"
          onClick={() => router.push("/studio/settings")}
        >
          <Settings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={busy}
          className="rounded-xl px-3 py-2.5"
          onClick={signOut}
        >
          <LogOut />
          {busy ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
