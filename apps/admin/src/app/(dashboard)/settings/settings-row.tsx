"use client";

import * as React from "react";
import {
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Globe,
  Layers,
  Scale,
  Clock,
  Hash,
  Barcode,
  Folder,
  Sparkles,
  BookOpen,
  Headphones,
  Code,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type IconName =
  | "Mail"
  | "Phone"
  | "MapPin"
  | "DollarSign"
  | "Globe"
  | "Layers"
  | "Scale"
  | "Clock"
  | "Hash"
  | "Barcode"
  | "Folder"
  | "Sparkles"
  | "BookOpen"
  | "Headphones"
  | "Code"
  | "Activity";

const ICONS: Record<IconName, React.ElementType> = {
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Globe,
  Layers,
  Scale,
  Clock,
  Hash,
  Barcode,
  Folder,
  Sparkles,
  BookOpen,
  Headphones,
  Code,
  Activity,
};

type SettingsRowProps = {
  icon: IconName;
  label: string;
  description?: string | null;
  href?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
};

export function SettingsRow({
  icon,
  label,
  description,
  href,
  onClick,
  badge,
}: SettingsRowProps) {
  const Icon = ICONS[icon];
  const handleClick = (e: React.MouseEvent) => {
    if (href && e.currentTarget === e.target) return;
    onClick?.();
  };

  const content = (
    <>
      <div className="flex items-center gap-3">
        <div className="flex shrink-0 items-center justify-center size-5 rounded-sm bg-muted text-muted-foreground"><Icon className="size-4" /></div>
        <div className="min-w-0 flex flex-col leading-tight"><span className="font-medium text-foreground">{label}</span>{description && <span className="text-sm text-muted-foreground">{description}</span>}</div>
      </div>
      {badge && <span className="text-xs">{badge}</span>}
      {(href || onClick) && <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
    </>
  );
  const className = cn(
    "flex items-center justify-between gap-4 py-4 text-sm transition-colors rounded-lg",
    href || onClick ? "cursor-pointer hover:bg-muted/50" : "cursor-default",
  );
  if (href) return <Link href={href} className={className}>{content}</Link>;
  return (
    <div
      className={cn(
        className,
      )}
      onClick={onClick ? handleClick : undefined}
    >
      {content}
    </div>
  );
}
