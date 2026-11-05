import Link from "next/link";
import {
  ArrowUpRight,
  Bold,
  CalendarDays,
  FileImage,
  Heading,
  ImagePlus,
  Italic,
  Link2,
  Mail,
  Plus,
  Quote,
  Send,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import type { Metadata } from "next";
import { Badge } from "@zerocraft/ui/components/badge";
import { Button } from "@zerocraft/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@zerocraft/ui/components/card";
import { Input } from "@zerocraft/ui/components/input";
import { Textarea } from "@zerocraft/ui/components/textarea";

export const metadata: Metadata = { title: "ZeroCraft Studio — Content" };

const contentItems = [
  ["How we rebuilt Northwind’s brand system", "Case study", "In review"],
  ["Why launch films need a media library", "Blog post", "Draft"],
  ["Atlas product site is live", "Announcement", "Scheduled"],
  ["November studio update", "Email campaign", "Approved"],
  ["Behind the Lumen launch film", "Social post", "Published"],
] as const;
const glass =
  "border-white/[.1] bg-white/[.06] shadow-none backdrop-blur-[28px]";

export default function StudioContentPage() {
  return (
    <div className="relative -mx-8 -mb-10 flex min-h-[calc(100vh-32px)] flex-wrap gap-0 overflow-hidden p-4 max-md:-mx-4 max-md:p-3">

      <Card
        className={`${glass} relative z-10 flex min-h-[calc(100vh-32px)] w-[300px] shrink-0 flex-col gap-4 rounded-[36px] p-5 max-[1180px]:min-h-0 max-[1180px]:w-full max-[1180px]:flex-row max-[760px]:flex-col`}
      >
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium">Content</span>
          <Button
            size="icon-sm"
            className="rounded-full"
            aria-label="New content"
          >
            <Plus />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["All", "Blog", "Case study", "Social", "Email"].map(
            (filter, index) => (
              <Button
                key={filter}
                variant={index === 0 ? "default" : "outline"}
                size="sm"
                className="rounded-full border-white/15 px-3 text-xs"
              >
                {filter}
              </Button>
            ),
          )}
        </div>
        <div className="space-y-1">
          {contentItems.map(([title, type, status], index) => (
            <button
              key={title}
              className={`w-full rounded-3xl border p-3.5 text-left transition-colors ${index === 0 ? "border-orange-500/60 bg-white/10" : "border-transparent hover:bg-white/[.06]"}`}
            >
              <strong className="block text-[15px] font-medium leading-tight">
                {title}
              </strong>
              <span className="mt-2 flex justify-between text-[13px] text-zinc-400">
                <span>{type}</span>
                <span>{status}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>
      <main className="relative z-10 min-w-[360px] flex-1 px-7 pt-1 max-md:px-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/studio"
            className="text-[15px] text-zinc-400 hover:text-white"
          >
            ZeroCraft Studio <span className="text-zinc-700">/</span>{" "}
            <span className="text-white">Content</span>
          </Link>
          <span className="flex-1" />
          <span className="text-sm text-zinc-500">Saved just now</span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-white/15 bg-white/[.06]"
          >
            Preview
          </Button>
          <Button size="sm" className="rounded-full">
            Request approval
          </Button>
        </div>
        <div className="mx-auto max-w-[680px]">
          <div className="relative mt-6 flex h-[190px] items-end overflow-hidden rounded-[36px] bg-[linear-gradient(150deg,#ff8a4c,#a02c1a_60%,#1a0d0d)] p-5">
            <span className="rounded-full bg-black/60 px-3.5 py-1.5 text-[13px]">
              Cover · 1200 × 630
            </span>
          </div>
          <h1 className="mt-7 text-[clamp(38px,4vw,52px)] font-extralight leading-[1.08] tracking-[-.04em]">
            How we rebuilt Northwind’s brand system
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
            <Badge>Case study</Badge>
            <span>Anna K.</span>
            <span>·</span>
            <span>6 min read</span>
          </div>
          <div className="prose prose-invert mt-6 max-w-none">
            <p className="text-lg font-light leading-[1.65] text-zinc-200">
              Northwind came to us with six logos, three typefaces and no shared
              rules. We began by auditing every place the brand appeared, then
              reduced it to one mark, one type pair and a small colour set.
            </p>
            <p className="text-lg font-light leading-[1.65] text-zinc-200">
              The new system lives in the Studio media library, so designers and
              developers pull the same files every time.
            </p>
            <blockquote className="my-7 rounded-[28px] border border-white/10 bg-white/[.07] p-6 text-[26px] font-extralight leading-[1.3]">
              [Client quote goes here]
            </blockquote>
            <p className="text-lg font-light leading-[1.65] text-zinc-200">
              Next, we mapped the rollout across the website, social templates
              and the launch film.
            </p>
          </div>
        </div>
        <Card className="sticky bottom-4 mx-auto mt-9 flex h-14 w-max max-w-full flex-row items-center gap-1 rounded-full border-white/[.12] bg-[#1e1412]/80 px-2 backdrop-blur-2xl">
          <Button variant="ghost" size="icon-sm" aria-label="Bold">
            <Bold />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Italic">
            <Italic />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Heading">
            <Heading />
          </Button>
          <span className="mx-1 h-6 w-px bg-white/20" />
          <Button variant="ghost" size="icon-sm" aria-label="Link">
            <Link2 />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Insert image">
            <ImagePlus />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Quote">
            <Quote />
          </Button>
          <span className="mx-1 h-6 w-px bg-white/20" />
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-orange-400"
            aria-label="Write with AI"
          >
            <Sparkles />
          </Button>
        </Card>
      </main>
      <Card
        className={`${glass} relative z-10 flex min-h-[calc(100vh-32px)] w-[340px] shrink-0 flex-col gap-4 rounded-[40px] p-[22px] max-[1180px]:m-0 max-[1180px]:min-h-0 max-[1180px]:w-full`}
      >
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium">Publishing</span>
          <Badge
            variant="outline"
            className="border-violet-300 text-violet-200"
          >
            In review
          </Badge>
        </div>
        <div>
          <div className="mt-1 flex items-center">
            <i className="size-2.5 rounded-full bg-white" />
            <b className="h-px flex-1 bg-white/40" />
            <i className="size-[18px] rounded-full bg-violet-200" />
            <b className="h-px flex-1 bg-white/20" />
            <i className="size-2.5 rounded-full bg-white/40" />
            <b className="h-px flex-1 bg-white/20" />
            <i className="size-2.5 rounded-full bg-white/40" />
            <b className="h-px flex-1 bg-white/20" />
            <i className="size-2.5 rounded-full bg-white/40" />
          </div>
          <div className="mt-2 flex justify-between text-xs text-zinc-400">
            <span>Draft</span>
            <span className="text-violet-200">Review</span>
            <span>Approved</span>
            <span>Scheduled</span>
            <span>Live</span>
          </div>
        </div>
        <div>
          <label
            htmlFor="publish-date"
            className="mb-1.5 block text-[13px] text-zinc-400"
          >
            Publish on
          </label>
          <Input
            id="publish-date"
            defaultValue="Nov 12, 2026, 10:00 AM IST"
            className="h-11 rounded-[18px] border-white/[.14] bg-white/[.05]"
          />
        </div>
        <div>
          <label
            htmlFor="slug"
            className="mb-1.5 block text-[13px] text-zinc-400"
          >
            Slug
          </label>
          <Input
            id="slug"
            defaultValue="northwind-brand-system"
            className="h-11 rounded-[18px] border-white/[.14] bg-white/[.05]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] text-zinc-400">
            Channels
          </label>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="border-violet-300 bg-violet-300/15 text-violet-100"
            >
              Website
            </Badge>
            <Badge variant="outline">LinkedIn</Badge>
            <Badge variant="outline">Newsletter</Badge>
          </div>
        </div>
        <div>
          <label
            htmlFor="seo-title"
            className="mb-1.5 block text-[13px] text-zinc-400"
          >
            SEO title
          </label>
          <Input
            id="seo-title"
            defaultValue="Northwind brand system case study"
            className="h-11 rounded-[18px] border-white/[.14] bg-white/[.05]"
          />
        </div>
        <div>
          <label
            htmlFor="seo-description"
            className="mb-1.5 block text-[13px] text-zinc-400"
          >
            SEO description
          </label>
          <Textarea
            id="seo-description"
            defaultValue="How ZeroCraft turned six logos and three typefaces into one brand system."
            className="min-h-[72px] rounded-[18px] border-white/[.14] bg-white/[.05]"
          />
        </div>
        <div className="rounded-3xl bg-white p-4 text-[#0a0a0b]">
          <p className="text-xs text-[#5d5d64]">
            zerocraft › work › northwind-brand-system
          </p>
          <h3 className="mt-1 text-[17px] font-medium">
            Northwind brand system case study
          </h3>
          <p className="mt-1 text-[13px] text-[#5d5d64]">
            How ZeroCraft turned six logos and three typefaces into one brand
            system.
          </p>
        </div>
        <div className="mt-auto flex gap-2">
          <Button className="flex-1 rounded-full">Schedule</Button>
          <Button
            variant="outline"
            className="flex-1 rounded-full border-white/15"
          >
            Save draft
          </Button>
        </div>
      </Card>
    </div>
  );
}
