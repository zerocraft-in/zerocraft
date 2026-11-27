"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  IconArrowUp,
  IconArchive,
  IconArchiveOff,
  IconCheck,
  IconChevronRight,
  IconCopy,
  IconHistory,
  IconMaximize,
  IconMessagePlus,
  IconMicrophone,
  IconMinimize,
  IconPaperclip,
  IconPlus,
  IconSparkles,
  IconThumbDown,
  IconThumbUp,
  IconTrash,
  IconX,
  IconLayoutSidebarRight,
} from "@tabler/icons-react";
import { Message, MessageContent, MessageGroup } from "@zerocraft/components/ui/message";
import { Kbd } from "@zerocraft/components/ui/kbd";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@zerocraft/components/ui/input-group";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@zerocraft/components/ui/dropdown-menu";

type SidekickProps = {
  pathname: string;
  externalPrompt?: string;
  onPromptConsumed?: () => void;
  expanded?: boolean;
  onExpand: () => void;
  onClose: () => void;
};
type SidekickMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  approval?: boolean;
  approvalRequest?: { id: string };
  action?: { label: string; href: string };
  feedback?: "up" | "down";
};
type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: SidekickMessage[];
  archived?: boolean;
};
type VoiceRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type VoiceRecognitionConstructor = new () => VoiceRecognition;
const CONVERSATION_STORAGE_KEY = "zerocraft.sidekick.conversations.v1";
const STARTER_PROMPTS = [
  "Show my latest orders",
  "Find products that need attention",
  "Review my store setup",
] as const;

function omitAttachedFileContents(text: string) {
  const attachmentStart = text.search(/\n\n\[Attached file:/i);
  return attachmentStart < 0
    ? text
    : `${text.slice(0, attachmentStart)}\n\n[Attached file contents omitted from local chat history]`;
}

function pageLabel(pathname: string) {
  const value = pathname.split("/").filter(Boolean).pop() || "home";
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function CommerceSidekick({
  pathname,
  externalPrompt,
  onPromptConsumed,
  expanded = false,
  onExpand,
  onClose,
}: SidekickProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<SidekickMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState("new");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState("");
  const [historyView, setHistoryView] = useState<"active" | "archived">(
    "active",
  );
  const [selectedConversationIds, setSelectedConversationIds] = useState<
    string[]
  >([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceRecognitionRef = useRef<VoiceRecognition | null>(null);
  const consumedExternalPromptRef = useRef("");
  const context = useMemo(
    () => `Finding ${pageLabel(pathname)} page in Zerocraft`,
    [pathname],
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CONVERSATION_STORAGE_KEY);
      const parsed = stored ? (JSON.parse(stored) as Conversation[]) : [];
      const valid = Array.isArray(parsed)
        ? parsed.filter(
            (item) =>
              typeof item?.id === "string" &&
              typeof item?.title === "string" &&
              Array.isArray(item?.messages),
          )
        : [];
      const normalized = valid.map((conversation) => ({
        ...conversation,
        archived: conversation.archived === true,
        messages: conversation.messages.map((message) =>
          message.text.startsWith("Could not reach Gemini from the CMS server.")
            ? {
                ...message,
                text: "Gemini was temporarily unavailable. Navigation and approved actions are still available; please retry this question shortly.",
              }
            : message,
        ),
      }));
      setConversations(normalized);
      if (normalized[0]) {
        setConversationId(normalized[0].id);
        setMessages(normalized[0].messages);
      }
    } catch {
      setConversations([]);
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!historyLoaded) return;
    try {
      window.localStorage.setItem(
        CONVERSATION_STORAGE_KEY,
        JSON.stringify(conversations.slice(0, 20)),
      );
    } catch {
      // Chat history is a convenience; disabled or full storage must not block use.
    }
  }, [conversations, historyLoaded]);

  useEffect(() => {
    if (!historyLoaded || !messages.some((item) => item.role === "user"))
      return;
    const firstUserMessage = messages.find(
      (item) => item.role === "user",
    )?.text;
    const title =
      firstUserMessage?.replace(/\s+/g, " ").slice(0, 54) || "New chat";
    const nextConversation: Conversation = {
      id: conversationId === "new" ? crypto.randomUUID() : conversationId,
      title,
      updatedAt: Date.now(),
      messages: messages.map((item) =>
        item.role === "user"
          ? { ...item, text: omitAttachedFileContents(item.text) }
          : item,
      ),
    };
    if (conversationId === "new") setConversationId(nextConversation.id);
    setConversations((current) =>
      [
        nextConversation,
        ...current.filter((item) => item.id !== nextConversation.id),
      ].slice(0, 20),
    );
  }, [conversationId, historyLoaded, messages]);

  useEffect(() => () => voiceRecognitionRef.current?.stop(), []);

  function startNewConversation() {
    voiceRecognitionRef.current?.stop();
    setConversationId("new");
    setMessages([]);
    setAttachedFiles([]);
    setVoiceStatus("");
    setCopiedMessageId("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function openConversation(conversation: Conversation) {
    setConversationId(conversation.id);
    setMessages(conversation.messages);
    setAttachedFiles([]);
    setVoiceStatus("");
  }

  const visibleConversations = conversations.filter((conversation) =>
    historyView === "archived" ? conversation.archived : !conversation.archived,
  );
  const allVisibleSelected =
    visibleConversations.length > 0 &&
    visibleConversations.every((item) =>
      selectedConversationIds.includes(item.id),
    );

  function toggleConversationSelection(id: string) {
    setSelectedConversationIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleSelectAll() {
    setSelectedConversationIds((current) =>
      allVisibleSelected
        ? current.filter(
            (id) => !visibleConversations.some((item) => item.id === id),
          )
        : Array.from(
            new Set([
              ...current,
              ...visibleConversations.map((item) => item.id),
            ]),
          ),
    );
  }

  function archiveSelected(archived: boolean) {
    if (!selectedConversationIds.length) return;
    setConversations((current) =>
      current.map((item) =>
        selectedConversationIds.includes(item.id)
          ? { ...item, archived }
          : item,
      ),
    );
    setSelectedConversationIds([]);
  }

  function deleteSelected() {
    if (!selectedConversationIds.length) return;
    setConversations((current) =>
      current.filter((item) => !selectedConversationIds.includes(item.id)),
    );
    if (selectedConversationIds.includes(conversationId))
      startNewConversation();
    setSelectedConversationIds([]);
  }

  async function copyMessage(message: SidekickMessage) {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId(""), 1600);
    } catch {
      setVoiceStatus("Clipboard access is unavailable in this browser.");
    }
  }

  function startVoiceCommand() {
    const browserWindow = window as Window & {
      SpeechRecognition?: VoiceRecognitionConstructor;
      webkitSpeechRecognition?: VoiceRecognitionConstructor;
    };
    const Recognition =
      browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceStatus("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setQuery(transcript);
        setVoiceStatus("Voice command ready. Press send to continue.");
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    recognition.onerror = () =>
      setVoiceStatus(
        "Sidekick could not access the microphone. Check browser permission.",
      );
    recognition.onend = () => {
      voiceRecognitionRef.current = null;
    };
    voiceRecognitionRef.current = recognition;
    setVoiceStatus("Listening…");
    try {
      recognition.start();
    } catch {
      voiceRecognitionRef.current = null;
      setVoiceStatus("Could not start voice input. Try again.");
    }
  }

  async function submit(event?: FormEvent, incomingMessage?: string) {
    event?.preventDefault();
    let message = (incomingMessage ?? query).trim();
    if (!message || loading) return;
    setLoading(true);
    if (attachedFiles.length) {
      try {
        const fileContext = await Promise.all(
          attachedFiles
            .slice(0, 3)
            .map(
              async (file) =>
                `\n\n[Attached file: ${file.name}]\n${(await file.text()).slice(0, 6000)}`,
            ),
        );
        message += fileContext.join("").slice(0, 12000);
      } catch {
        setVoiceStatus(
          "Could not read that file. Attach a text, CSV, Markdown, or JSON file.",
        );
        setLoading(false);
        return;
      }
    }
    setQuery("");
    setAttachedFiles([]);
    setVoiceStatus("");
    const assistantId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: message },
      { id: assistantId, role: "assistant", text: "Working on it…" },
    ]);
    try {
      const response = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          pathname,
          history: messages
            .slice(-8)
            .map(({ role, text }) => ({ role, text: text.slice(0, 1200) })),
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const payload = (await response.json()) as {
        reply?: string;
        error?: string;
        requiresApproval?: boolean;
        action?: { label?: string; href?: string } | null;
        approval?: { id?: string } | null;
      };
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                text: response.ok
                  ? payload.reply || "Done."
                  : payload.error || "I could not complete that request.",
                approval: response.ok && payload.requiresApproval,
                approvalRequest:
                  response.ok && payload.approval?.id
                    ? { id: payload.approval.id }
                    : undefined,
                action:
                  response.ok && payload.action?.href
                    ? {
                        label: payload.action.label || "Open page",
                        href: payload.action.href,
                      }
                    : undefined,
              }
            : item,
        ),
      );
    } catch {
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? { ...item, text: "AI is unavailable right now." }
            : item,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function decideApproval(
    messageId: string,
    id: string,
    decision: "approve" | "reject",
  ) {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/assistant/actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, decision }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Approval could not be updated.");
      if (decision === "approve") {
        const execute = await fetch("/api/admin/assistant/actions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, decision: "execute" }),
        });
        const executePayload = await execute.json();
        if (!execute.ok)
          throw new Error(
            executePayload.error || "Approved action could not execute.",
          );
      }
      setMessages((current) =>
        current.map((item) =>
          item.id === messageId
            ? {
                ...item,
                approval: false,
                text:
                  decision === "approve"
                    ? "Approved and executed successfully."
                    : "Approval rejected.",
              }
            : item,
        ),
      );
    } catch (error) {
      setMessages((current) =>
        current.map((item) =>
          item.id === messageId
            ? {
                ...item,
                text:
                  error instanceof Error
                    ? error.message
                    : "Approval could not be updated.",
              }
            : item,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!externalPrompt?.trim()) {
      consumedExternalPromptRef.current = "";
      return;
    }
    if (loading || consumedExternalPromptRef.current === externalPrompt) return;
    consumedExternalPromptRef.current = externalPrompt;
    void submit(undefined, externalPrompt);
    onPromptConsumed?.();
  }, [externalPrompt, loading]);

  return (
    <motion.aside
      layout
      transition={{ layout: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
      className={cn(
        "relative flex h-full min-h-0 min-w-0 w-[min(420px,100vw)] shrink-0 flex-col overflow-hidden border-l border-border bg-background shadow-2xl transition-[width] duration-200 lg:rounded-xl",
        expanded
          ? "w-full overflow-hidden rounded-2xl border lg:flex-1 lg:w-auto"
          : "rounded-xl lg:w-[300px] 2xl:w-[340px]",
      )}
      aria-label="Zerocraft AI Sidekick"
    >
      <motion.div
        layout
        className="flex h-12 min-w-0 shrink-0 items-center gap-1.5 overflow-hidden border-b border-border bg-background/95 px-2 sm:gap-2 sm:px-3 text-[11px]"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-8 max-w-[104px] shrink-0 items-center gap-1.5 overflow-hidden rounded-full border border-border bg-background px-2 font-medium text-foreground hover:bg-muted sm:max-w-none sm:gap-2 sm:px-2.5"
            aria-label="Recent Sidekick conversations"
          >
            <IconHistory className="size-3.5 text-muted-foreground" />
            <span>Recents</span>
            {conversations.length > 0 && (
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {conversations.length}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between gap-2">
              <span>
                {historyView === "archived"
                  ? "Archived conversations"
                  : "Recent conversations"}
              </span>
              <span className="text-[10px] font-normal text-muted-foreground">
                {visibleConversations.length}
              </span>
            </DropdownMenuLabel>
            <div className="flex items-center gap-1 px-2 pb-1">
              <button
                type="button"
                onClick={() => {
                  setHistoryView("active");
                  setSelectedConversationIds([]);
                }}
                className={cn(
                  "rounded-md px-2 py-1 text-[10px]",
                  historyView === "active"
                    ? "bg-muted font-medium"
                    : "text-muted-foreground",
                )}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => {
                  setHistoryView("archived");
                  setSelectedConversationIds([]);
                }}
                className={cn(
                  "rounded-md px-2 py-1 text-[10px]",
                  historyView === "archived"
                    ? "bg-muted font-medium"
                    : "text-muted-foreground",
                )}
              >
                Archived
              </button>
            </div>
            <div className="flex items-center justify-between border-y border-border px-2 py-1.5">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
              >
                {allVisibleSelected ? "Clear selection" : "Select all"}
              </button>
              <div className="flex items-center gap-0.5">
                {historyView === "active" ? (
                  <button
                    type="button"
                    onClick={() => archiveSelected(true)}
                    disabled={!selectedConversationIds.length}
                    className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
                    aria-label="Archive selected"
                    title="Archive selected"
                  >
                    <IconArchive className="size-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => archiveSelected(false)}
                    disabled={!selectedConversationIds.length}
                    className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
                    aria-label="Restore selected"
                    title="Restore selected"
                  >
                    <IconArchiveOff className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={deleteSelected}
                  disabled={!selectedConversationIds.length}
                  className="rounded p-1 text-destructive/80 hover:bg-destructive/10 disabled:opacity-40"
                  aria-label="Delete selected"
                  title="Delete selected"
                >
                  <IconTrash className="size-3.5" />
                </button>
              </div>
            </div>
            <DropdownMenuSeparator />
            {visibleConversations.length ? (
              visibleConversations.map((conversation) => (
                <DropdownMenuItem
                  key={conversation.id}
                  onClick={() => openConversation(conversation)}
                  className="gap-2 py-2"
                >
                  <button
                    type="button"
                    aria-label={`Select ${conversation.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleConversationSelection(conversation.id);
                    }}
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded border",
                      selectedConversationIds.includes(conversation.id)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {selectedConversationIds.includes(conversation.id) && (
                      <IconCheck className="size-3" />
                    )}
                  </button>
                  <span className="min-w-0 flex-1">
                    <span className="block w-full truncate text-xs font-medium">
                      {conversation.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(conversation.updatedAt)}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={
                      historyView === "active"
                        ? `Archive ${conversation.title}`
                        : `Restore ${conversation.title}`
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      setConversations((current) =>
                        current.map((item) =>
                          item.id === conversation.id
                            ? { ...item, archived: historyView === "active" }
                            : item,
                        ),
                      );
                    }}
                    className="rounded p-1 text-muted-foreground hover:bg-muted"
                  >
                    {historyView === "active" ? (
                      <IconArchive className="size-3.5" />
                    ) : (
                      <IconArchiveOff className="size-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${conversation.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setConversations((current) =>
                        current.filter((item) => item.id !== conversation.id),
                      );
                      if (conversation.id === conversationId)
                        startNewConversation();
                    }}
                    className="rounded p-1 text-destructive/70 hover:bg-destructive/10"
                  >
                    <IconTrash className="size-3.5" />
                  </button>
                </DropdownMenuItem>
              ))
            ) : (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                {historyView === "archived"
                  ? "No archived conversations."
                  : "Your chats will appear here."}
              </p>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={startNewConversation}
              className="text-xs text-muted-foreground"
            >
              <IconX className="size-3.5" /> Clear current chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {context}
        </span>
        <button
          type="button"
          onClick={startNewConversation}
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="New chat"
          title="New chat"
        >
          <IconMessagePlus className="size-4" />
        </button>
        <button
          type="button"
          onClick={onExpand}
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={expanded ? "Restore sidekick" : "Expand sidekick"}
          title={expanded ? "Restore sidekick" : "Expand sidekick"}
        >
          {expanded ? (
            <IconMinimize className="size-3.5" />
          ) : (
            <IconMaximize className="size-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Collapse sidekick"
        >
          <IconX className="size-3.5" />
        </button>
      </motion.div>

      <motion.div
        layout
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ opacity: { duration: 0.2 }, x: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
        className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-background px-3 py-4 sm:px-4 sm:py-5"
      >
        {!messages.length ? (
          <div className="flex min-h-full flex-col items-center justify-center text-center">
            <div className="mb-3 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <IconSparkles className="size-4" />
            </div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Where should we begin?
            </p>
            <p className="mt-1 max-w-[230px] text-[11px] leading-4 text-muted-foreground">
              Ask me to find products, review orders, or prepare an approved
              workspace action.
            </p>
            <div className="mt-4 grid w-full max-w-[240px] gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-left text-[11px] text-muted-foreground shadow-xs transition-colors hover:border-primary/30 hover:bg-muted hover:text-foreground"
                  onClick={() => {
                    setQuery(prompt);
                    inputRef.current?.focus();
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <MessageGroup className="gap-4">
            {messages.map((item) => (
              <Message
                key={item.id}
                align={item.role === "user" ? "end" : "start"}
              >
                <MessageContent
                  className={cn(
                    "max-w-[95%] break-words [overflow-wrap:anywhere] rounded-xl px-2.5 py-2 text-[11px] leading-4",
                    item.role === "user"
                      ? "bg-muted text-foreground"
                      : "bg-background text-foreground",
                  )}
                >
                  {item.text}
                  {item.action && (
                    <Link
                      href={item.action.href}
                      className="mt-2 flex items-center justify-between rounded-md border border-border px-2 py-2 text-[10px] font-medium text-primary hover:bg-muted"
                    >
                      <span>{item.action.label}</span>
                      <IconChevronRight className="size-3" />
                    </Link>
                  )}
                  {item.approval && (
                    <div className="mt-3 rounded-lg border border-border bg-muted/50 p-2.5">
                      <div className="flex items-center gap-2 text-[10px] font-semibold">
                        <IconSparkles className="size-3.5 text-violet-500" />{" "}
                        Approval required
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Review this action before it changes your workspace.
                      </p>
                      {item.approvalRequest?.id ? (
                        <div className="mt-2 flex gap-1.5">
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              void decideApproval(
                                item.id,
                                item.approvalRequest!.id,
                                "reject",
                              )
                            }
                            className="rounded-md border px-2 py-1 text-[10px] hover:bg-background"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              void decideApproval(
                                item.id,
                                item.approvalRequest!.id,
                                "approve",
                              )
                            }
                            className="rounded-md bg-foreground px-2 py-1 text-[10px] text-background hover:opacity-90"
                          >
                            Approve &amp; run
                          </button>
                          <Link
                            href="/system/automations/approvals"
                            className="ml-auto rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:bg-background"
                          >
                            Details{" "}
                            <IconChevronRight className="inline size-3" />
                          </Link>
                        </div>
                      ) : (
                        <Link
                          href="/system/automations/approvals"
                          className="mt-2 flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          Review approval queue{" "}
                          <IconChevronRight className="size-3" />
                        </Link>
                      )}
                    </div>
                  )}
                  {item.role === "assistant" &&
                    item.text !== "Working on it…" && (
                      <div className="mt-2 flex items-center gap-1 text-muted-foreground">
                        <button
                          type="button"
                          aria-label="Copy response"
                          onClick={() => void copyMessage(item)}
                          className="rounded p-1 hover:bg-muted"
                        >
                          {copiedMessageId === item.id ? (
                            <IconCheck className="size-3" />
                          ) : (
                            <IconCopy className="size-3" />
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label="Helpful response"
                          aria-pressed={item.feedback === "up"}
                          onClick={() =>
                            setMessages((current) =>
                              current.map((message) =>
                                message.id === item.id
                                  ? {
                                      ...message,
                                      feedback:
                                        message.feedback === "up"
                                          ? undefined
                                          : "up",
                                    }
                                  : message,
                              ),
                            )
                          }
                          className={cn(
                            "rounded p-1 hover:bg-muted",
                            item.feedback === "up" &&
                              "bg-muted text-foreground",
                          )}
                        >
                          <IconThumbUp className="size-3" />
                        </button>
                        <button
                          type="button"
                          aria-label="Unhelpful response"
                          aria-pressed={item.feedback === "down"}
                          onClick={() =>
                            setMessages((current) =>
                              current.map((message) =>
                                message.id === item.id
                                  ? {
                                      ...message,
                                      feedback:
                                        message.feedback === "down"
                                          ? undefined
                                          : "down",
                                    }
                                  : message,
                              ),
                            )
                          }
                          className={cn(
                            "rounded p-1 hover:bg-muted",
                            item.feedback === "down" &&
                              "bg-muted text-foreground",
                          )}
                        >
                          <IconThumbDown className="size-3" />
                        </button>
                      </div>
                    )}
                </MessageContent>
              </Message>
            ))}
          </MessageGroup>
        )}
      </motion.div>

      <div className="min-w-0 shrink-0 overflow-hidden border-t border-border bg-background/95 p-3 pb-3">
        <form onSubmit={submit}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json"
            multiple
            className="sr-only"
            onChange={(event) => {
              setAttachedFiles(
                Array.from(event.target.files ?? []).slice(0, 3),
              );
              event.target.value = "";
            }}
          />
          {attachedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachedFiles.map((file) => (
                <span
                  key={`${file.name}-${file.size}`}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground"
                >
                  <IconPaperclip className="size-3" />
                  <span className="max-w-36 truncate">{file.name}</span>
                  <button
                    type="button"
                    className="ml-1 text-foreground"
                    aria-label={`Remove ${file.name}`}
                    onClick={() =>
                      setAttachedFiles((current) =>
                        current.filter((item) => item !== file),
                      )
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <InputGroup className="rounded-xl border-input bg-background shadow-sm transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
            <InputGroupTextarea
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              disabled={loading}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Work with Sidekick"
              aria-label="Work with Sidekick"
              className="min-h-12 resize-none border-0 px-3 pt-2.5 text-[13px] shadow-none focus-visible:ring-0"
            />
            <InputGroupAddon align="block-end" className="px-1.5 pb-1.5">
              <InputGroupButton
                type="button"
                size="icon-sm"
                variant="ghost"
                className="size-6 rounded-md text-muted-foreground"
                aria-label="Add context"
                title="Attach a text, CSV, Markdown, or JSON file"
                onClick={() => fileInputRef.current?.click()}
              >
                <IconPlus className="size-3" />
              </InputGroupButton>
              <InputGroupButton
                type="button"
                size="icon-sm"
                variant="ghost"
                className="size-6 rounded-md text-muted-foreground"
                aria-label="Use voice command"
                title="Use voice command"
                onClick={startVoiceCommand}
              >
                <IconMicrophone className="size-3" />
              </InputGroupButton>
              <InputGroupButton
                type="submit"
                size="icon-sm"
                className="ml-auto size-6 rounded-md"
                disabled={!query.trim() || loading}
                aria-label="Send to Sidekick"
              >
                <IconArrowUp className="size-3" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
        <p aria-live="polite" className="mt-2 min-h-4 min-w-0 px-1 text-[10px] leading-4 text-muted-foreground">
          {voiceStatus ? (
            <span className="block break-words [overflow-wrap:anywhere]">{voiceStatus}</span>
          ) : (
            <>
              <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                <Kbd className="h-4 shrink-0 rounded-[4px] px-1 text-[9px]">Enter</Kbd>
                <span>to send</span>
                <span aria-hidden="true">·</span>
                <Kbd className="h-4 shrink-0 rounded-[4px] px-1 text-[9px]">Shift+Enter</Kbd>
                <span>for a new line</span>
              </span>
              <span className="mt-1 block break-words [overflow-wrap:anywhere]">Actions requiring approval are never run automatically.</span>
            </>
          )}
        </p>
      </div>
    </motion.aside>
  );
}
