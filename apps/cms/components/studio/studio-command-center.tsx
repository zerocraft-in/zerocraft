"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import {
  IconArrowRight,
  IconBrain,
  IconCommand,
  IconMicrophone,
  IconMicrophoneOff,
  IconRadio,
  IconSearch,
  IconSparkles,
  IconWand,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type CommandCenterProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string; isFinal?: boolean }>> }) => void) | null;
  onerror: ((event?: { error?: string }) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const commands = [
  { label: "Open products", hint: "Manage your catalogue", href: "/store/products", aliases: ["product", "catalogue", "catalog"] },
  { label: "Open orders", hint: "Review payments and fulfilment", href: "/orders", aliases: ["order", "payment", "fulfilment"] },
  { label: "Open clients", hint: "View your CRM pipeline", href: "/clients", aliases: ["client", "customer", "crm"] },
  { label: "Open analytics", hint: "See performance and attribution", href: "/reports", aliases: ["analytics", "report", "insight"] },
  { label: "Open content studio", hint: "Create and publish content", href: "/content", aliases: ["content", "blog", "journal"] },
  { label: "Open integrations", hint: "Connect apps and providers", href: "/integrations", aliases: ["integration", "app", "provider"] },
  { label: "Open settings", hint: "Configure your workspace", href: "/settings", aliases: ["setting", "configuration"] },
  { label: "Create a new lead", hint: "Start a CRM enquiry", href: "/leads?create=1", aliases: ["lead", "enquiry", "inquiry"] },
  { label: "Create a new project", hint: "Start a client project", href: "/projects?create=1", aliases: ["project", "work"] },
  { label: "Create an appointment", hint: "Book a client slot", href: "/appointments?create=1", aliases: ["appointment", "booking", "schedule"] },
] as const;

function findCommand(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  return commands.find((command) =>
    [command.label, ...command.aliases].some((value) => normalized.includes(value)),
  ) ?? null;
}

export function StudioCommandCenter({ open, onOpenChange }: CommandCenterProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [wakePhraseEnabled, setWakePhraseEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef<SpeechRecognitionLike | null>(null);
  const wakePhraseRef = useRef(false);
  const armedRef = useRef(false);
  const pulseRef = useRef<HTMLDivElement>(null);

  const filteredCommands = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return commands.slice(0, 6);
    return commands.filter((command) =>
      [command.label, command.hint, ...command.aliases].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    ).slice(0, 8);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!pulseRef.current) return;
    if (listening) {
      gsap.to(pulseRef.current, { scale: 1.14, opacity: 0.35, duration: 0.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
    } else {
      gsap.killTweensOf(pulseRef.current);
      gsap.to(pulseRef.current, { scale: 1, opacity: 0, duration: 0.2 });
    }
    return () => { if (pulseRef.current) gsap.killTweensOf(pulseRef.current); };
  }, [listening]);

  useEffect(() => () => {
    wakePhraseRef.current = false;
    voiceRef.current?.stop();
  }, []);

  function getRecognition() {
    return (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;
  }

  async function execute(commandText: string) {
    const command = findCommand(commandText);
    if (command) {
      router.push(command.href);
      setMessage("");
      setQuery("");
      if (!wakePhraseRef.current) onOpenChange(false);
      return;
    }
    if (aiLoading) return;
    setAiLoading(true);
    setMessage("Zerocraft AI is understanding that command…");
    try {
      const response = await fetch("/api/studio/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: commandText }) });
      const payload = await response.json() as { action?: { href: string }; reply?: string; error?: string };
      if (!response.ok) {
        setMessage(payload.error || "Try: “open products”, “show analytics”, or “create a new lead”.");
        return;
      }
      setMessage(payload.reply || "Done.");
      if (payload.action?.href) {
        router.push(payload.action.href);
        setQuery("");
        if (!wakePhraseRef.current) window.setTimeout(() => onOpenChange(false), 220);
      }
    } catch {
      setMessage("AI is unavailable right now. Try a direct command instead.");
    } finally {
      setAiLoading(false);
    }
  }

  function stopVoice() {
    wakePhraseRef.current = false;
    armedRef.current = false;
    voiceRef.current?.stop();
    setListening(false);
    setWakePhraseEnabled(false);
  }

  function closeCommandCenter() {
    if (listening || wakePhraseEnabled) stopVoice();
    onOpenChange(false);
  }

  function toggleVoice() {
    if (listening) {
      stopVoice();
      return;
    }
    const Recognition = getRecognition();
    if (!Recognition) {
      setMessage("Voice commands are not supported in this browser. Type a command instead.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setQuery(transcript);
      setListening(false);
      void execute(transcript);
    };
    recognition.onerror = () => {
      setListening(false);
      setMessage("I could not hear that. Please try again or type a command.");
    };
    recognition.onstart = () => setMessage("Listening for one command…");
    recognition.onend = () => setListening(false);
    voiceRef.current = recognition;
    setMessage("");
    setListening(true);
    recognition.start();
  }

  function toggleWakePhrase() {
    if (wakePhraseEnabled) {
      stopVoice();
      setMessage("Wake phrase mode is off.");
      return;
    }
    const Recognition = getRecognition();
    if (!Recognition) {
      setMessage("Wake phrase mode needs a browser with speech recognition support.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = true;
    wakePhraseRef.current = true;
    armedRef.current = false;
    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1]?.[0]?.transcript?.trim() ?? "";
      const normalized = transcript.toLowerCase().replace(/[,.!?]/g, "");
      const wakeMatch = /\bhey\s+(?:zero\s*craft|zerocraft)\b/.exec(normalized);
      if (wakeMatch) {
        const commandAfterWake = normalized.slice((wakeMatch.index ?? 0) + wakeMatch[0].length).trim();
        armedRef.current = true;
        setMessage(commandAfterWake ? `I heard “${commandAfterWake}”.` : "I’m listening. What should I do?");
        if (commandAfterWake) void execute(commandAfterWake);
        return;
      }
      if (armedRef.current && event.results[event.results.length - 1]?.[0]?.isFinal !== false) {
        void execute(normalized);
        armedRef.current = false;
      }
    };
    recognition.onstart = () => {
      setListening(true);
      setMessage("Wake phrase active — say “Hey Zerocraft”.");
    };
    recognition.onerror = (event) => {
      const code = (event as unknown as { error?: string })?.error;
      if (code === "no-speech" || code === "aborted") return;
      wakePhraseRef.current = false;
      setWakePhraseEnabled(false);
      setListening(false);
      setMessage(code === "not-allowed" || code === "service-not-allowed"
        ? "Microphone access is blocked. Allow microphone access for this localhost site, then enable wake phrase again."
        : "Voice recognition stopped. Try enabling wake phrase again or use text commands.");
    };
    recognition.onend = () => {
      if (!wakePhraseRef.current) return;
      window.setTimeout(() => {
        if (!wakePhraseRef.current) return;
        try { recognition.start(); } catch { setWakePhraseEnabled(false); setListening(false); }
      }, 180);
    };
    voiceRef.current = recognition;
    setMessage("Wake phrase active — say “Hey Zerocraft”.");
    setWakePhraseEnabled(true);
    setListening(true);
    try {
      recognition.start();
    } catch {
      wakePhraseRef.current = false;
      setWakePhraseEnabled(false);
      setListening(false);
      setMessage("Could not start the microphone. Check browser permission and try again.");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/45 px-3 pt-[12vh] backdrop-blur-sm sm:px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeCommandCenter(); }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-center-title"
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl"
            initial={{ opacity: 0, y: -18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 sm:px-5">
              <div className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <span ref={pulseRef} className="absolute inset-0 rounded-xl bg-primary opacity-0" />
                {wakePhraseEnabled ? <IconRadio className="relative size-4" /> : listening ? <IconMicrophone className="relative size-4" /> : <IconBrain className="relative size-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p id="command-center-title" className="text-sm font-semibold">Studio command center</p>
                <p className="hidden text-xs text-muted-foreground sm:block">Ask Zerocraft to open, create, or manage something</p>
              </div>
              <button type="button" onClick={closeCommandCenter} aria-label="Close command center" className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <IconX className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <IconSearch className="size-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => { setQuery(event.target.value); setMessage(""); }}
                onKeyDown={(event) => { if (event.key === "Enter") void execute(query); if (event.key === "Escape") closeCommandCenter(); }}
                placeholder={listening ? "Listening…" : "Try “open products” or “create a new lead”"}
                aria-label="Type a command"
                className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70"
              />
              <button type="button" onClick={wakePhraseEnabled ? stopVoice : toggleVoice} aria-label={wakePhraseEnabled || listening ? "Stop listening" : "Use voice command"} className={cn("relative grid size-9 shrink-0 place-items-center rounded-xl border transition", listening ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground")}>
                {listening ? <IconMicrophoneOff className="size-4" /> : <IconMicrophone className="size-4" />}
              </button>
            </div>

            <div className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/35 px-3 py-2 sm:mx-5">
              <div className="flex min-w-0 items-center gap-2">
                <IconRadio className={cn("size-4 shrink-0", wakePhraseEnabled ? "text-primary" : "text-muted-foreground")} />
                <div className="min-w-0">
                  <p className="text-xs font-medium">Wake phrase mode</p>
                  <p className="truncate text-[11px] text-muted-foreground">Say “Hey Zerocraft, open products”</p>
                </div>
              </div>
              <button type="button" onClick={toggleWakePhrase} className={cn("rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition", wakePhraseEnabled ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground")}>
                {wakePhraseEnabled ? "Listening" : "Enable"}
              </button>
            </div>

            {message && <p role="status" className="mx-4 mb-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 sm:mx-5">{message}</p>}

            <div className="border-t border-border bg-muted/20 p-2.5 sm:p-3">
              <div className="flex items-center justify-between px-2 pb-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Suggested actions</span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><IconWand className="size-3" /> {aiLoading ? "Zerocraft AI is thinking" : "AI command routing"}</span>
              </div>
              <div className="grid gap-1 sm:grid-cols-2">
                {filteredCommands.map((command) => (
                  <button key={command.href} type="button" onClick={() => void execute(command.label)} className="group flex min-h-12 items-center gap-3 rounded-xl px-3 text-left transition hover:bg-background hover:shadow-sm">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground transition group-hover:bg-primary group-hover:text-primary-foreground"><IconSparkles className="size-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{command.label}</span><span className="block truncate text-xs text-muted-foreground">{command.hint}</span></span>
                    <IconArrowRight className="size-4 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </button>
                ))}
              </div>
              {!filteredCommands.length && <p className="py-8 text-center text-sm text-muted-foreground">No matching actions yet. Try a page or action name.</p>}
            </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground sm:px-5">
              <span className="flex items-center gap-1.5"><IconCommand className="size-3" /> Text and voice commands stay in your workspace</span>
              <kbd className="hidden rounded border border-border px-1.5 py-0.5 sm:inline">ESC</kbd>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
