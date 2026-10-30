"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  IconArrowRight,
  IconBrain,
  IconCommand,
  IconMicrophone,
  IconMicrophoneOff,
  IconRadio,
  IconSparkles,
  IconWand,
  IconX,
} from "@tabler/icons-react";
import { Message, MessageAvatar, MessageContent, MessageGroup } from "@/components/ui/message";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

type CommandCenterProps = { open: boolean; onOpenChange: (open: boolean) => void; initialPrompt?: string; onPromptConsumed?: () => void };
type ConversationMessage = { id: string; role: "user" | "assistant"; text: string; approval?: boolean };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const commands = [
  { label: "Open products", hint: "Manage your catalogue", href: "/store/products", aliases: ["product", "catalogue", "catalog"] },
  { label: "Open orders", hint: "Review payments and fulfilment", href: "/store/orders", aliases: ["order", "payment", "fulfilment"] },
  { label: "Open clients", hint: "View your CRM pipeline", href: "/studio/clients", aliases: ["client", "customer", "crm"] },
  { label: "Open analytics", hint: "See performance and attribution", href: "/reports", aliases: ["analytics", "report", "insight"] },
  { label: "Open content studio", hint: "Create and publish content", href: "/studio/content", aliases: ["content", "blog", "journal"] },
  { label: "Create a new lead", hint: "Start a CRM enquiry", href: "/studio/leads?create=1", aliases: ["lead", "enquiry", "inquiry"] },
] as const;

function findCommand(query: string) {
  const normalized = query.trim().toLowerCase();
  return commands.find((command) => [command.label, ...command.aliases].some((value) => normalized.includes(value))) ?? null;
}

export function StudioCommandCenter({ open, onOpenChange, initialPrompt, onPromptConsumed }: CommandCenterProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [listening, setListening] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const voiceRef = useRef<SpeechRecognitionLike | null>(null);

  const filteredCommands = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return commands;
    return commands.filter((command) => [command.label, command.hint, ...command.aliases].some((value) => value.toLowerCase().includes(normalized)));
  }, [query]);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    if (!open || !initialPrompt?.trim()) return;
    void execute(initialPrompt);
    onPromptConsumed?.();
  }, [initialPrompt, open, onPromptConsumed]);

  useEffect(() => () => voiceRef.current?.stop(), []);

  function getRecognition() {
    const browserWindow = window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
  }

  async function execute(input: string) {
    const commandText = input.trim();
    if (!commandText || aiLoading) return;
    const assistantId = crypto.randomUUID();
    setQuery("");
    setConversation((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: commandText },
      { id: assistantId, role: "assistant", text: "Thinking through that request…" },
    ]);
    const direct = findCommand(commandText);
    if (direct) {
      setConversation((current) => current.map((item) => item.id === assistantId ? { ...item, text: `Opening ${direct.label.replace(/^Open /, "").toLowerCase()}.` } : item));
      window.setTimeout(() => router.push(direct.href), 180);
      return;
    }
    setAiLoading(true);
    try {
      const response = await fetch("/api/studio/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commandText }),
      });
      const payload = await response.json() as { action?: { href: string }; requiresApproval?: boolean; reply?: string; error?: string };
      const reply = response.ok ? payload.reply || "Done." : payload.error || "Try asking me to open products, show analytics, or create a new lead.";
      setConversation((current) => current.map((item) => item.id === assistantId ? { ...item, text: reply, approval: response.ok && payload.requiresApproval } : item));
      if (!response.ok) return;
      if (payload.requiresApproval) {
        window.setTimeout(() => router.push("/automations/approvals"), 350);
      } else if (payload.action?.href) {
        window.setTimeout(() => router.push(payload.action!.href), 200);
      }
    } catch {
      setConversation((current) => current.map((item) => item.id === assistantId ? { ...item, text: "AI is unavailable right now. Try a direct command instead." } : item));
    } finally {
      setAiLoading(false);
    }
  }

  function toggleVoice() {
    if (listening) {
      voiceRef.current?.stop();
      setListening(false);
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
      setListening(false);
      void execute(event.results[0]?.[0]?.transcript ?? "");
    };
    recognition.onerror = () => { setListening(false); setMessage("I could not hear that. Please type a command instead."); };
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    voiceRef.current = recognition;
    recognition.start();
  }

  function close() {
    voiceRef.current?.stop();
    setListening(false);
    onOpenChange(false);
  }

  return <AnimatePresence>
    {open && <motion.div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 px-3 pt-[12vh] backdrop-blur-sm sm:px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <motion.section role="dialog" aria-modal="true" aria-labelledby="command-center-title" className="w-full max-w-[640px] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl" initial={{ opacity: 0, y: -16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.98 }}>
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><IconBrain className="size-4" /></div>
          <div className="min-w-0 flex-1"><p id="command-center-title" className="text-sm font-semibold">My Store assistant</p><p className="text-xs text-muted-foreground">Ask Zerocraft to manage your store or studio</p></div>
          <button type="button" onClick={close} aria-label="Close assistant" className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><IconX className="size-4" /></button>
        </div>

        {conversation.length > 0 && <div className="max-h-72 overflow-y-auto border-b border-border bg-muted/15 px-4 py-4 sm:px-5" aria-label="AI conversation"><MessageGroup>
          {conversation.map((item) => <Message key={item.id} align={item.role === "user" ? "end" : "start"}>
            {item.role === "assistant" && <MessageAvatar className="size-7 bg-primary text-primary-foreground"><IconSparkles className="size-3.5" /></MessageAvatar>}
            <MessageContent className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm", item.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-background")}>
              {item.text}
              {item.approval && <button type="button" onClick={() => router.push("/automations/approvals")} className="mt-2 block rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/15">Review approval queue</button>}
            </MessageContent>
          </Message>)}
        </MessageGroup></div>}

        <form onSubmit={(event) => { event.preventDefault(); void execute(query); }} className="px-4 py-3 sm:px-5">
          <InputGroup className="rounded-2xl border-border bg-background shadow-sm">
            <InputGroupTextarea ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setMessage(""); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } if (event.key === "Escape") close(); }} placeholder={listening ? "Listening…" : "Help me find products or manage your store"} aria-label="Type a command" className="min-h-12 resize-none border-0 px-3 pt-3 text-[15px] shadow-none focus-visible:ring-0" />
            <InputGroupAddon align="block-end" className="px-2 pb-2">
              <InputGroupButton type="button" size="icon-sm" variant="ghost" className="rounded-full text-muted-foreground" aria-label="Recent AI conversations" onClick={() => setMessage("Recent conversations are stored only for this workspace session.")}><IconRadio className="size-4" /></InputGroupButton>
              <InputGroupButton type="button" size="icon-sm" variant="ghost" className="rounded-full text-muted-foreground" aria-label={listening ? "Stop listening" : "Use voice command"} onClick={toggleVoice}>{listening ? <IconMicrophoneOff className="size-4" /> : <IconMicrophone className="size-4" />}</InputGroupButton>
              <InputGroupButton type="submit" size="icon-sm" className="ml-auto rounded-full" disabled={!query.trim() || aiLoading} aria-label="Send command"><IconArrowRight className="size-4" /></InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
        <p className="px-5 pb-3 text-[11px] text-muted-foreground">Press Enter to send · Shift+Enter for a new line · Approval-required actions never execute automatically</p>
        {message && <p role="status" className="mx-4 mb-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 sm:mx-5">{message}</p>}
        <div className="border-t border-border bg-muted/20 p-2.5 sm:p-3"><div className="flex items-center justify-between px-2 pb-2"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Suggested actions</span><span className="flex items-center gap-1 text-[10px] text-muted-foreground"><IconWand className="size-3" /> {aiLoading ? "AI is thinking" : "AI command routing"}</span></div><div className="grid gap-1 sm:grid-cols-2">{filteredCommands.map((command) => <button key={command.href} type="button" onClick={() => void execute(command.label)} className="group flex min-h-12 items-center gap-3 rounded-xl px-3 text-left transition hover:bg-background hover:shadow-sm"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground"><IconSparkles className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{command.label}</span><span className="block truncate text-xs text-muted-foreground">{command.hint}</span></span><IconArrowRight className="size-4 shrink-0 text-muted-foreground/50" /></button>)}</div></div>
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground sm:px-5"><span className="flex items-center gap-1.5"><IconCommand className="size-3" /> Text and voice commands stay in your workspace</span><kbd className="hidden rounded border border-border px-1.5 py-0.5 sm:inline">ESC</kbd></div>
      </motion.section>
    </motion.div>}
  </AnimatePresence>;
}
