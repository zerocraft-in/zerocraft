
"use client";

import Link from "next/link";
import {
  Folder,
  Forward,
  MoreHorizontal,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@zerocraft/ui/dropdown-menu";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@zerocraft/ui/sidebar";

type Project = {
  name: string;
  url: string;
  icon: LucideIcon;
};

interface NavProjectsProps {
  projects: Project[];
  onShare?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onMore?: () => void;
}

export function NavProjects({
  projects,
  onShare,
  onDelete,
  onMore,
}: NavProjectsProps) {
  const { isMobile } = useSidebar();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Projects</SidebarGroupLabel>

      <SidebarMenu>
        {projects.map((project) => {
          const ProjectIcon = project.icon;

          return (
            <SidebarMenuItem key={project.name}>
              <SidebarMenuButton
                render={<Link href={project.url} />}
                tooltip={project.name}
              >
                <ProjectIcon />
                <span className="truncate">{project.name}</span>
              </SidebarMenuButton>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuAction showOnHover>
                      <MoreHorizontal />
                      <span className="sr-only">
                        Project options
                      </span>
                    </SidebarMenuAction>
                  }
                />

                <DropdownMenuContent
                  className="w-48 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                  sideOffset={4}
                >
                  <DropdownMenuItem
                    render={<Link href={project.url} />}
                  >
                    <Folder className="size-4 text-muted-foreground" />
                    <span>View Project</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => onShare?.(project)}
                  >
                    <Forward className="size-4 text-muted-foreground" />
                    <span>Share Project</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete?.(project)}
                  >
                    <Trash2 className="size-4" />
                    <span>Delete Project</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          );
        })}

        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={onMore}
            className="text-sidebar-foreground/70"
            tooltip="More projects"
          >
            <MoreHorizontal className="size-4" />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
