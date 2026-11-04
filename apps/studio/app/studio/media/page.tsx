"use client";

import { useState } from "react";
import {
  ArrowRight,
  FileImage,
  Folder,
  Grid2X2,
  ImagePlus,
  List,
  Pause,
  Play,
  Search,
  Tag,
  Upload,
  Video,
  WandSparkles,
} from "lucide-react";
import { Badge } from "@zerocraft/ui/components/badge";
import { Button } from "@zerocraft/ui/components/button";
import { Card } from "@zerocraft/ui/components/card";
import { Input } from "@zerocraft/ui/components/input";
import { Textarea } from "@zerocraft/ui/components/textarea";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@zerocraft/ui/components/input-group";
const glass =
  "border-white/[.1] bg-white/[.06] shadow-none backdrop-blur-[28px]";
const assets = [
  [
    "FrontWalk_Take01.mp4",
    "48 MB",
    "Published",
    "Video",
    "bg-[linear-gradient(160deg,#ff8a4c,#9b2a1a_60%,#1a0d0d)]",
  ],
  [
    "Pose_Keyframe_01.png",
    "2.1 MB",
    "Draft",
    "Image",
    "bg-[radial-gradient(circle_at_30%_30%,#f2c28b,#3b2a2a_80%)]",
  ],
  ["zerocraft-logo.svg", "12 KB", "Published", "SVG", "bg-[#17171a]"],
  ["Northwind_Brief_v2.pdf", "860 KB", "Needs alt text", "Doc", "bg-[#ececee]"],
  [
    "Monologue_VO_final.wav",
    "18 MB",
    "In review",
    "Audio",
    "bg-[linear-gradient(180deg,#2a2530,#121014)]",
  ],
  [
    "Moodboard_Lavender.jpg",
    "3.4 MB",
    "Published",
    "Image",
    "bg-[radial-gradient(circle_at_70%_30%,#d9c6ff,#2a2540_75%)]",
  ],
  [
    "Lumen_Cut_03.mp4",
    "212 MB",
    "In review",
    "Video",
    "bg-[linear-gradient(200deg,#4a4a52,#0f0f11_70%)]",
  ],
  [
    "Atlas_Hero_Still.png",
    "5.8 MB",
    "Draft",
    "Image",
    "bg-[linear-gradient(135deg,#ffb089,#c8431f_60%,#2a110c)]",
  ],
] as const;

type ViewMode = "grid" | "list";

function AssetGlyph({ type }: { type: string }) {
  return type === "Video" ? (
    <Video size={34} fill="currentColor" />
  ) : type === "SVG" ? (
    <span className="grid size-14 place-items-center rounded-full border border-white text-xl text-white">
      ●
    </span>
  ) : type === "Doc" ? (
    <span className="grid h-16 w-12 place-items-center rounded-lg border-2 border-black text-2xl text-black">
      ≡
    </span>
  ) : type === "Audio" ? (
    <span className="flex items-end gap-1 text-violet-200">
      {[12, 24, 16, 30, 20, 28, 12].map((height, index) => (
        <i
          key={index}
          className="w-1 rounded-full bg-current"
          style={{ height }}
        />
      ))}
    </span>
  ) : (
    <FileImage size={30} />
  );
}

export default function StudioMediaPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  return (
    <div className="relative -mx-8 -mb-10 flex min-h-[calc(100vh-93px)] flex-wrap gap-0 overflow-hidden bg-[#0a0a0b] p-4 max-md:-mx-4 max-md:p-3">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-220px] right-[120px] size-[640px] rounded-full bg-[radial-gradient(circle_at_40%_40%,#ff6a2b,#b3261e_55%,transparent_72%)] opacity-40 blur-[90px]"
      />
      <Card
        className={`${glass} sticky z-10 flex h-[calc(100dvh-2rem)] min-h-0 w-[288px] shrink-0 flex-col gap-4 rounded-[36px] p-5 max-[1160px]:static max-[1160px]:h-auto max-[1160px]:w-full max-[1160px]:flex-row max-[760px]:flex-col`}
      >
        <div className="flex h-11 items-center gap-2 rounded-full border border-white/[.14] bg-white/[.06] px-4 text-sm text-zinc-500">
          <Search size={16} />
          <span>Search assets</span>
        </div>
        <p className="m-0 text-[13px] text-zinc-400">Project assets</p>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          <button className="flex h-12 w-full items-center gap-3 rounded-2xl bg-white/10 px-3 text-left text-sm">
            <Folder size={18} className="text-orange-400" /> Greeting Sequences{" "}
            <span className="ml-auto text-xs text-zinc-500">12</span>
          </button>
          <div className="flex h-10 items-center gap-2 rounded-2xl bg-orange-500/15 px-3 text-sm text-white">
            <Video size={14} /> FrontWalk_Take01.mp4
          </div>
          <div className="flex h-10 items-center gap-2 rounded-2xl px-3 text-sm text-zinc-300">
            <FileImage size={14} /> Pose_Keyframe_01.png
          </div>
          <button className="flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm text-zinc-300">
            <Folder size={18} /> Studio Monologue{" "}
            <span className="ml-auto text-xs text-zinc-500">4</span>
          </button>
          <button className="flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm text-zinc-300">
            <Folder size={18} /> Northwind rebrand{" "}
            <span className="ml-auto text-xs text-zinc-500">28</span>
          </button>
          <button className="flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm text-zinc-300">
            <Folder size={18} /> Brand kit{" "}
            <span className="ml-auto text-xs text-zinc-500">9</span>
          </button>
        </div>
        <div className="mt-auto">
          <div className="mb-2 flex justify-between text-sm">
            <span>Storage</span>
            <span className="text-zinc-500">42.6 of 100 GB</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10">
            <span className="block h-full w-[43%] rounded-full bg-orange-500" />
          </div>
        </div>
      </Card>
      <main className="relative z-10 min-w-[360px] flex-1 px-6 pt-1 max-md:px-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] text-zinc-400">
            ZeroCraft Studio <span className="text-zinc-700">/</span>{" "}
            <span className="text-white">Media</span>
          </span>
          <span className="flex-1" />
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            className="rounded-full border-white/15"
            onClick={() => setViewMode("grid")}
            aria-pressed={viewMode === "grid"}
          >
            <Grid2X2 /> Grid
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className="rounded-full text-zinc-500"
            onClick={() => setViewMode("list")}
            aria-pressed={viewMode === "list"}
          >
            <List /> List
          </Button>
          <Button size="sm" className="rounded-full">
            <Upload /> Upload
          </Button>
        </div>
        <h1 className="mt-7 text-[clamp(38px,4vw,58px)] font-extralight leading-none tracking-[-.04em]">
          Media library
        </h1>
        <p className="mt-2 text-base text-zinc-400">
          138 assets · 12 waiting for alt text
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {["All", "Image", "Video", "Audio", "SVG", "Docs"].map(
            (filter, index) => (
              <Button
                key={filter}
                variant={index === 0 ? "default" : "outline"}
                size="sm"
                className="rounded-full border-white/15"
              >
                {filter}
              </Button>
            ),
          )}
        </div>
        <div
          className={
            viewMode === "grid"
              ? "mt-5 grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3.5"
              : "mt-5 overflow-hidden rounded-[28px] border border-white/[.1] bg-white/[.04]"
          }
        >
          {assets.map(([name, size, status, type, color], index) => (
            <button
              key={name}
              className={
                viewMode === "grid"
                  ? `rounded-[28px] border p-2.5 pb-3 text-left transition hover:-translate-y-0.5 ${index === 0 ? "border-orange-500 shadow-[0_0_0_1px_#ff6a2b,0_0_32px_rgba(255,106,43,.25)]" : "border-white/[.09]"} bg-white/[.05]`
                  : "flex w-full items-center gap-4 border-b border-white/[.08] px-4 py-3 text-left transition last:border-b-0 hover:bg-white/[.06]"
              }
            >
              <div
                className={`relative grid place-items-center overflow-hidden ${viewMode === "grid" ? "h-[132px] rounded-[20px]" : "size-16 shrink-0 rounded-2xl"} ${color} ${type === "Doc" ? "text-black" : "text-white"}`}
              >
                <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-xs">
                  {type}
                </span>
                <AssetGlyph type={type} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={
                    viewMode === "grid"
                      ? "mt-3 truncate px-1.5 text-[15px] font-medium"
                      : "truncate text-[15px] font-medium"
                  }
                >
                  {name}
                </p>
                <div
                  className={
                    viewMode === "grid"
                      ? "mt-1 flex justify-between px-1.5 text-[13px] text-zinc-400"
                      : "mt-1 flex gap-4 text-[13px] text-zinc-400"
                  }
                >
                  <span>{size}</span>
                  <span>{status}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div>
          <InputGroup className="mt-5 h-[54px] rounded-[28px] max-w-md mx-auto p-2 text-sm text-zinc-400">
            <InputGroupInput placeholder="Search..." />
            <InputGroupAddon>
              <WandSparkles
                size={24}
                strokeWidth={1.5}
                className="shrink-0 text-orange-400"
              />
            </InputGroupAddon>

            <InputGroupAddon align="inline-end">
              <Button
                type="button"
                size="icon"
                aria-label="Generate asset"
                className="size-8 shrink-0 rounded-full bg-white text-black hover:bg-zinc-100"
              >
                <ArrowRight size={28} strokeWidth={1.7} />
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </main>
      <Card
        className={`${glass} relative z-10 flex w-[344px] min-h-full shrink-0 flex-col gap-4 rounded-[40px] p-[18px] max-[1160px]:m-0 max-[1160px]:w-full`}
      >
        <div className="relative flex h-[300px] items-end justify-center gap-2 overflow-hidden rounded-[28px] bg-[linear-gradient(160deg,#ff8a4c,#9b2a1a_55%,#1a0d0d)] pb-[18px]">
          <div className="absolute left-1/2 top-10 h-[210px] w-24 -translate-x-1/2 rounded-[48px_48px_20px_20px] bg-black/70 blur-[7px]" />
          <Button
            variant="secondary"
            size="icon-sm"
            className="relative rounded-full"
          >
            <Pause />
          </Button>
          <Button
            variant="secondary"
            size="icon-sm"
            className="relative rounded-full"
          >
            <Play />
          </Button>
          <Button
            variant="secondary"
            size="icon-sm"
            className="relative rounded-full"
          >
            <ArrowRightIcon />
          </Button>
        </div>
        <div>
          <h2 className="text-lg font-medium">FrontWalk_Take01.mp4</h2>
          <Badge className="mt-2">Published</Badge>
        </div>
        <div>
          {[
            ["Type", "Video · 16:9"],
            ["Size", "48 MB"],
            ["Project", "Greeting Sequences"],
            ["Version", "v3"],
            ["Used in", "2 places"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between border-t border-white/[.08] py-2 text-sm"
            >
              <span className="text-zinc-500">{label}</span>
              <strong className="font-medium">{value}</strong>
            </div>
          ))}
        </div>
        <div>
          <label htmlFor="alt-text" className="text-[13px] text-zinc-400">
            Alt text
          </label>
          <Textarea
            id="alt-text"
            defaultValue="Silhouette of a person walking toward the camera against an orange backdrop."
            className="mt-1 min-h-16 rounded-2xl border-white/[.14] bg-white/[.05] text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">hero</Badge>
          <Badge variant="outline">greeting</Badge>
          <Badge variant="outline">orange</Badge>
          <Badge variant="outline">
            <Tag /> Add tag
          </Badge>
        </div>
        <div className="mt-auto flex gap-2">
          <Button className="flex-1 rounded-full">Publish</Button>
          <Button
            variant="outline"
            className="flex-1 rounded-full border-white/15"
          >
            Export
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-full border-white/15"
            aria-label="Replace version"
          >
            <ImagePlus />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ArrowRightIcon() {
  return <span aria-hidden="true">→</span>;
}
