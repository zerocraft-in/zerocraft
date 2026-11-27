"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@zerocraft/ui/dropdown-menu";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@zerocraft/ui/sidebar"
type Team = {
  name: string;
  logo: React.ElementType;
  plan: string;
};

interface TeamSwitcherProps {
  teams: Team[];
  onAddTeam?: () => void;
  onTeamChange?: (team: Team) => void;
}

export function TeamSwitcher({
  teams,
  onAddTeam,
  onTeamChange,
}: TeamSwitcherProps) {
  const { isMobile } = useSidebar();

  const [selectedTeamName, setSelectedTeamName] = React.useState<string | null>(
    () => teams[0]?.name ?? null,
  );

  const activeTeam =
    teams.find((team) => team.name === selectedTeamName) ?? teams[0];

  const handleTeamChange = (team: Team) => {
    setSelectedTeamName(team.name);
    onTeamChange?.(team);
  };

  if (!activeTeam) {
    return null;
  }

  const ActiveTeamLogo = activeTeam.logo;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
        
              >
                <div className="flex aspect-square size-8 items-center justify-center">
                  <ActiveTeamLogo className="size-4" />
                </div>

                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {activeTeam.name}
                  </span>

                  <span className="truncate text-xs text-muted-foreground">
                    {activeTeam.plan}
                  </span>
                </div>

                <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-60" />
              </SidebarMenuButton>
            }
          />

          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Teams
              </DropdownMenuLabel>

              {teams.map((team, index) => {
                const TeamLogo = team.logo;
                const isActive = activeTeam.name === team.name;

                return (
                  <DropdownMenuItem
                    key={team.name}
                    onClick={() => handleTeamChange(team)}
                    className="flex items-center gap-2 p-2"
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      <TeamLogo className="size-3.5 shrink-0" />
                    </div>

                    <span className="flex-1 truncate">{team.name}</span>

                    {isActive ? (
                      <Check className="size-4 text-muted-foreground" />
                    ) : (
                      <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => onAddTeam?.()}
              className="gap-2 p-2"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>

              <span className="font-medium text-muted-foreground">
                Add team
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
