"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconAlertCircle,
  IconArchive,
  IconArrowBackUp,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconFileText,
  IconInbox,
  IconLoader2,
  IconMail,
  IconPaperclip,
  IconPencil,
  IconRefresh,
  IconSearch,
  IconSend,
  IconStar,
  IconTag,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Folder = "inbox" | "unread" | "starred" | "sent" | "drafts" | string;
type MailSummary = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  snippet: string;
  date: string;
  unread: boolean;
  starred: boolean;
  labelIds: string[];
  draftId?: string;
  body?: string;
  attachments?: Array<{ attachmentId: string; filename: string; mimeType: string; size: number; messageId: string }>;
};
type MailMessage = MailSummary & {
  cc: string;
  messageId: string;
  references: string;
  attachments: Array<{ attachmentId: string; filename: string; mimeType: string; size: number }>;
  bodyType: string;
};
type MailLabel = { id: string; name: string; type: string };
type Connection = { connected: boolean; email: string | null };
type ComposerState = {
  draftId?: string;
  threadId?: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  attachments: File[];
};

const folders: Array<{ id: Folder; label: string; icon: typeof IconInbox }> = [
  { id: "inbox", label: "Inbox", icon: IconInbox },
  { id: "unread", label: "Unread", icon: IconMail },
  { id: "starred", label: "Starred", icon: IconStar },
  { id: "sent", label: "Sent", icon: IconSend },
  { id: "drafts", label: "Drafts", icon: IconFileText },
];

function decodeAddress(value: string) {
  const match = value.match(/<([^<>]+)>/);
  return (match?.[1] || value).trim();
}

function dateLabel(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function emailMimeType(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return ({
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    txt: "text/plain",
    csv: "text/csv",
  } as Record<string, string>)[extension || ""] || "";
}

async function jsonRequest<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { cache: "no-store", ...init });
  const payload = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error || "Email workspace request failed.");
  return payload;
}

export function EmailWorkspace() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [messages, setMessages] = useState<MailSummary[]>([]);
  const [labels, setLabels] = useState<MailLabel[]>([]);
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<Array<string | null>>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [search, setSearch] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [activeThread, setActiveThread] = useState<MailMessage[] | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [oauthResult, setOauthResult] = useState("");

  const selectedFolder = useMemo(() => folders.find((item) => item.id === folder), [folder]);

  const loadConnection = useCallback(async () => {
    setConnectionLoading(true);
    try {
      const state = await jsonRequest<Connection>("/api/studio/email/connection");
      setConnection(state);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not check the Gmail connection.");
    } finally {
      setConnectionLoading(false);
    }
  }, []);

  const loadLabels = useCallback(async () => {
    try {
      const result = await jsonRequest<{ labels: MailLabel[] }>("/api/studio/email/labels");
      setLabels(result.labels);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load Gmail labels.");
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!connection?.connected) {
      setMessages([]);
      return;
    }
    setListLoading(true);
    setError("");
    try {
      if (folder === "drafts") {
        const query = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : "";
        const result = await jsonRequest<{ drafts: Array<{
          id: string; messageId: string; threadId: string; to: string; subject: string; body: string; date: string;
          attachments: NonNullable<MailSummary["attachments"]>;
        }>; nextPageToken: string | null }>(`/api/studio/email/drafts${query}`);
        setMessages(result.drafts.map((draft) => ({
          id: draft.messageId || draft.id,
          threadId: draft.threadId,
          subject: draft.subject || "(no subject)",
          from: "Draft",
          to: draft.to,
          snippet: draft.body.slice(0, 180),
          date: draft.date,
          unread: false,
          starred: false,
          labelIds: ["DRAFT"],
          draftId: draft.id,
          body: draft.body,
          attachments: draft.attachments,
        })));
        setNextPageToken(result.nextPageToken);
      } else {
        const params = new URLSearchParams({ folder, q: search });
        if (pageToken) params.set("pageToken", pageToken);
        if (!selectedFolder && folder !== "inbox") params.set("labelId", folder);
        const result = await jsonRequest<{ messages: MailSummary[]; nextPageToken: string | null }>(
          `/api/studio/email/messages?${params}`,
        );
        setMessages(result.messages);
        setNextPageToken(result.nextPageToken);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load Gmail messages.");
      setMessages([]);
    } finally {
      setListLoading(false);
    }
  }, [connection?.connected, folder, pageToken, search, selectedFolder]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadConnection();
      const params = new URLSearchParams(window.location.search);
      const connectionStatus = params.get("connection");
      if (connectionStatus) {
        setOauthResult(connectionStatus);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadConnection]);

  useEffect(() => {
    if (!connection?.connected) return;
    const timer = window.setTimeout(() => {
      void loadMessages();
      void loadLabels();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [connection?.connected, loadMessages, loadLabels]);

  async function openThread(message: MailSummary) {
    setError("");
    if (message.draftId) {
      setBusy(true);
      setError("");
      try {
        const draft = await jsonRequest<{
          id: string; messageId: string; threadId: string; to: string; cc: string; bcc: string;
          subject: string; body: string; attachments: NonNullable<MailSummary["attachments"]>;
        }>(`/api/studio/email/drafts/${encodeURIComponent(message.draftId)}`);
        const files: File[] = [];
        let totalSize = 0;
        for (const attachment of draft.attachments) {
          if (attachment.size > 3 * 1024 * 1024 || totalSize + attachment.size > 3 * 1024 * 1024) {
            throw new Error("This draft has attachments over the 3 MB compose limit. Edit or send it in Gmail.");
          }
          const response = await fetch(`/api/studio/email/attachments/${encodeURIComponent(attachment.messageId)}/${encodeURIComponent(attachment.attachmentId)}`, { cache: "no-store" });
          if (!response.ok) throw new Error("A draft attachment could not be loaded safely.");
          const blob = await response.blob();
          totalSize += blob.size;
          if (totalSize > 3 * 1024 * 1024) {
            throw new Error("This draft has attachments over the 3 MB compose limit. Edit or send it in Gmail.");
          }
          files.push(new File([blob], attachment.filename, { type: attachment.mimeType }));
        }
        setComposer({
          draftId: draft.id,
          threadId: draft.threadId || undefined,
          to: draft.to,
          cc: draft.cc,
          bcc: draft.bcc,
          subject: draft.subject,
          body: draft.body,
          attachments: files,
        });
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not open this draft.");
      } finally {
        setBusy(false);
      }
      return;
    }
    setActiveThread(null);
    setThreadLoading(true);
    try {
      const thread = await jsonRequest<{ messages: MailMessage[] }>(
        `/api/studio/email/threads/${encodeURIComponent(message.threadId)}`,
      );
      setActiveThread(thread.messages);
      if (message.unread) {
        await mutateMessage(message.threadId, "read", false);
        const refreshed = await jsonRequest<{ messages: MailMessage[] }>(
          `/api/studio/email/threads/${encodeURIComponent(message.threadId)}`,
        );
        setActiveThread(refreshed.messages);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not open this conversation.");
    } finally {
      setThreadLoading(false);
    }
  }

  async function mutateMessage(threadId: string, action: string, reload = true, labelId?: string) {
    setBusy(true);
    setError("");
    try {
      await jsonRequest(`/api/studio/email/messages/${encodeURIComponent(threadId)}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, labelId }),
      });
      if (reload) await loadMessages();
      if (activeThread) {
        const thread = await jsonRequest<{ messages: MailMessage[] }>(
          `/api/studio/email/threads/${encodeURIComponent(activeThread[0]?.threadId || "")}`,
        );
        setActiveThread(thread.messages);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The email action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function startReply(all = false, forward = false) {
    if (!activeThread?.length) return;
    const message = activeThread.at(-1)!;
    if (forward) {
      setBusy(true);
      setError("");
      try {
        let totalSize = 0;
        const files: File[] = [];
        for (const attachment of message.attachments) {
          if (attachment.size > 3 * 1024 * 1024 || totalSize + attachment.size > 3 * 1024 * 1024) {
            throw new Error("This conversation has attachments over the 3 MB compose limit. Forward it from Gmail.");
          }
          const response = await fetch(`/api/studio/email/attachments/${encodeURIComponent(message.id)}/${encodeURIComponent(attachment.attachmentId)}`, { cache: "no-store" });
          if (!response.ok) throw new Error("This attachment cannot be forwarded from the CMS. Forward it from Gmail.");
          const blob = await response.blob();
          totalSize += blob.size;
          if (totalSize > 3 * 1024 * 1024) throw new Error("This conversation has attachments over the 3 MB compose limit. Forward it from Gmail.");
          files.push(new File([blob], attachment.filename, { type: attachment.mimeType }));
        }
        setComposer({
          to: "", cc: "", bcc: "",
          attachments: files,
          subject: `Fwd: ${message.subject.replace(/^(fwd:\s*)+/i, "")}`,
          body: `\n\n---------- Forwarded message ----------\nFrom: ${message.from}\nDate: ${message.date}\nSubject: ${message.subject}\nTo: ${message.to}\n\n${message.body || ""}`,
        });
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not forward this conversation.");
      } finally {
        setBusy(false);
      }
      return;
    }
    const recipients = [decodeAddress(message.from)];
    const cc = all
      ? [...new Set([message.to, message.cc].flatMap((value) => value.split(",").map(decodeAddress)).filter(Boolean))]
          .filter((address) => !recipients.includes(address) && address.toLowerCase() !== connection?.email?.toLowerCase())
          .join(", ")
      : "";
    setComposer({
      threadId: message.threadId,
      to: recipients.join(", "),
      cc,
      bcc: "",
      attachments: [],
      subject: /^re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}`,
      body: `\n\nOn ${message.date}, ${message.from} wrote:\n${(message.body || "").split("\n").map((line) => `> ${line}`).join("\n")}`,
    });
  }

  async function submitComposer(saveDraft: boolean) {
    if (!composer) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (saveDraft) {
        const result = await jsonRequest<{ id: string }>("/api/studio/email/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...composer, attachments: await encodeAttachments(composer.attachments) }),
        });
        setComposer({ ...composer, draftId: result.id });
        setNotice("Draft saved to Gmail.");
      } else {
        const result = await jsonRequest<{ ok: boolean; messageId: string }>("/api/studio/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...composer, attachments: await encodeAttachments(composer.attachments), idempotencyKey: crypto.randomUUID() }),
        });
        setNotice("Message sent.");
        setComposer(null);
        setFolder("sent");
        setPageToken(null);
        setPageHistory([]);
        await loadMessages();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The email could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect the shared Gmail account from the Studio email workspace?")) return;
    setBusy(true);
    setError("");
    try {
      const result = await jsonRequest<{ message: string; revocationPending?: boolean }>("/api/studio/email/connection", { method: "DELETE" });
      setConnection({ connected: false, email: null });
      setMessages([]);
      setActiveThread(null);
      setNotice(result.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not disconnect Gmail.");
    } finally {
      setBusy(false);
    }
  }

  function openCompose() {
    setError("");
    setComposer({ to: "", cc: "", bcc: "", subject: "", body: "", attachments: [] });
  }

  async function encodeAttachments(files: File[]) {
    return Promise.all(files.map(async (file) => {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
        reader.onload = () => {
          const dataUrl = typeof reader.result === "string" ? reader.result : "";
          resolve(dataUrl.slice(dataUrl.indexOf(",") + 1));
        };
        reader.readAsDataURL(file);
      });
      return { filename: file.name, mimeType: emailMimeType(file), data: base64 };
    }));
  }

  function selectFolder(id: Folder) {
    setFolder(id);
    setPageToken(null);
    setPageHistory([]);
    setActiveThread(null);
  }

  function goToNextPage() {
    if (!nextPageToken) return;
    setPageHistory((history) => [...history, pageToken]);
    setPageToken(nextPageToken);
  }

  function goToPreviousPage() {
    setPageHistory((history) => {
      if (!history.length) return history;
      setPageToken(history.at(-1) || null);
      return history.slice(0, -1);
    });
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchValue.trim());
    setPageToken(null);
    setPageHistory([]);
  }

  const currentMessage = activeThread?.at(-1);
  const folderTitle = selectedFolder?.label || labels.find((label) => label.id === folder)?.name || "Label";

  return (
    <main className="min-h-[calc(100svh-56px)] px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Studio workspace</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Email</h1>
            <p className="mt-1 text-sm text-muted-foreground">A private Gmail workspace for Studio admins.</p>
          </div>
          {connection?.connected && (
            <Button onClick={openCompose} className="gap-2">
              <IconPencil size={17} /> Compose
            </Button>
          )}
        </header>

        {oauthResult === "connected" && <Banner kind="success">Gmail connected. The CMS will refresh access securely when needed.</Banner>}
        {oauthResult && oauthResult !== "connected" && <Banner kind="error">
          {oauthResult === "account-switch-blocked"
            ? "A different Gmail account is already connected. Disconnect it from this page before connecting another mailbox."
            : `Gmail connection was not completed (${oauthResult}). Check OAuth setup and try again.`}
        </Banner>}
        {error && <Banner kind="error">{error}</Banner>}
        {notice && <Banner kind="success">{notice}</Banner>}

        {connectionLoading ? (
          <PanelState icon={<IconLoader2 className="animate-spin" />} title="Checking Gmail connection" description="Loading secure workspace status." />
        ) : !connection?.connected ? (
          <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-9">
            <div className="max-w-2xl">
              <span className="flex size-11 items-center justify-center rounded-xl bg-muted"><IconMail size={21} /></span>
              <h2 className="mt-5 text-xl font-semibold">Connect the Studio mailbox</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Connect one shared Gmail account for authorized Studio admins. The CMS stores only an encrypted refresh token and message metadata stays in Gmail.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button render={<a href="/api/studio/email/oauth" />} disabled={busy} className="gap-2">
                  <IconMail size={17} /> Connect Gmail
                </Button>
                <Button variant="outline" onClick={() => void loadConnection()} className="gap-2">
                  <IconRefresh size={16} /> Check connection
                </Button>
              </div>
              <p className="mt-4 max-w-xl text-xs leading-5 text-muted-foreground">
                Production use requires an approved Google OAuth consent screen for the Gmail scope. Connecting does not change the existing SMTP sender.
              </p>
            </div>
          </section>
        ) : (
          <section className="grid min-h-[min(720px,calc(100svh-200px))] overflow-hidden rounded-2xl border bg-card shadow-sm lg:grid-cols-[210px_minmax(300px,390px)_minmax(0,1fr)]">
            <aside className="flex flex-col border-b bg-muted/20 p-3 lg:border-b-0 lg:border-r">
              <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-background px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium">{connection.email}</div>
                  <div className="text-[10px] text-muted-foreground">Connected mailbox</div>
                </div>
                <button type="button" aria-label="Disconnect Gmail" title="Disconnect Gmail" disabled={busy} onClick={() => void disconnect()} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">
                  <IconX size={15} />
                </button>
              </div>
              <nav aria-label="Email folders" className="flex gap-1 overflow-x-auto lg:flex-col">
                {folders.map(({ id, label, icon: FolderIcon }) => (
                  <button key={id} type="button" onClick={() => selectFolder(id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${folder === id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}>
                    <FolderIcon size={16} stroke={1.7} /> {label}
                  </button>
                ))}
              </nav>
              {labels.filter((label) => label.type === "user").length > 0 && (
                <div className="mt-5 hidden lg:block">
                  <div className="mb-1 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Labels</div>
                  {labels.filter((label) => label.type === "user").map((label) => (
                    <button key={label.id} type="button" onClick={() => selectFolder(label.id)} className={`flex w-full items-center gap-2 truncate rounded-lg px-3 py-2 text-left text-xs ${folder === label.id ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/70"}`}>
                      <IconTag size={14} /> <span className="truncate">{label.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-auto hidden px-3 pt-5 text-[10px] leading-4 text-muted-foreground lg:block">Gmail messages and attachments are not copied into Supabase.</p>
            </aside>

            <section className={`${activeThread ? "hidden lg:flex" : "flex"} min-h-[520px] flex-col border-b lg:border-b-0 lg:border-r`}>
              <div className="border-b p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold">{folderTitle}</h2>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Private · Gmail</p>
                  </div>
                  <button type="button" aria-label="Refresh messages" onClick={() => void loadMessages()} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <IconRefresh size={16} />
                  </button>
                </div>
                <form onSubmit={submitSearch} className="mt-3 flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Search this mailbox" aria-label="Search Gmail" className="h-9 pl-9 text-sm" />
                  </div>
                  <Button size="sm" variant="outline" type="submit">Search</Button>
                </form>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {listLoading ? (
                  <PanelState icon={<IconLoader2 className="animate-spin" />} title="Loading messages" description="Fetching this Gmail folder." />
                ) : messages.length === 0 ? (
                  <PanelState icon={<IconInbox />} title="Nothing here yet" description={search ? "No messages match this search." : "This folder has no messages."} />
                ) : (
                  <ul>
                    {messages.map((message) => (
                      <li key={message.draftId || message.id}>
                        <button type="button" onClick={() => void openThread(message)} className="group flex w-full gap-3 border-b px-4 py-3.5 text-left transition-colors hover:bg-muted/50">
                          <span className={`mt-1.5 size-2 shrink-0 rounded-full ${message.unread ? "bg-primary" : "bg-transparent"}`} aria-label={message.unread ? "Unread" : undefined} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className={`truncate text-xs ${message.unread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{message.from}</span>
                              <span className="shrink-0 text-[10px] text-muted-foreground">{dateLabel(message.date)}</span>
                            </span>
                            <span className="mt-1 flex items-center gap-1.5">
                              <span className="truncate text-[13px] font-medium">{message.subject}</span>
                              {message.starred && <IconStar size={13} className="shrink-0 fill-amber-400 text-amber-500" />}
                            </span>
                            <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">{message.snippet || "No preview available"}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex items-center justify-between border-t px-3 py-2">
                <span className="text-[11px] text-muted-foreground">{messages.length} messages</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" disabled={!pageHistory.length || listLoading} aria-label="Previous page" onClick={goToPreviousPage}><IconChevronLeft size={16} /></Button>
                  <Button variant="ghost" size="icon-sm" disabled={!nextPageToken || listLoading} aria-label="Next page" onClick={goToNextPage}><IconChevronRight size={16} /></Button>
                </div>
              </div>
            </section>

            <section className={`${activeThread || threadLoading ? "flex" : "hidden lg:flex"} min-h-[520px] min-w-0 flex-col`}>
              {threadLoading ? (
                <PanelState icon={<IconLoader2 className="animate-spin" />} title="Opening conversation" description="Loading messages securely from Gmail." />
              ) : !activeThread ? (
                <PanelState icon={<IconMail />} title="Select a conversation" description="Choose a message to read, reply, forward, or organize." />
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
                    <div className="flex min-w-0 items-center gap-2">
                      <button type="button" aria-label="Back to messages" onClick={() => setActiveThread(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"><IconChevronLeft size={18} /></button>
                      <h2 className="truncate text-sm font-semibold">{currentMessage?.subject || "(no subject)"}</h2>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {currentMessage && (
                        <>
                          <ActionButton title={currentMessage.unread ? "Mark read" : "Mark unread"} onClick={() => void mutateMessage(currentMessage.threadId, currentMessage.unread ? "read" : "unread")}><IconMail size={17} /></ActionButton>
                          <ActionButton title={currentMessage.starred ? "Remove star" : "Star"} onClick={() => void mutateMessage(currentMessage.threadId, currentMessage.starred ? "unstar" : "star")}><IconStar size={17} className={currentMessage.starred ? "fill-amber-400 text-amber-500" : ""} /></ActionButton>
                          <ActionButton title="Archive" onClick={() => void mutateMessage(currentMessage.threadId, "archive")}><IconArchive size={17} /></ActionButton>
                          <ActionButton title="Move to trash" onClick={() => void mutateMessage(currentMessage.threadId, "trash")}><IconTrash size={17} /></ActionButton>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-7">
                    <div className="mx-auto max-w-3xl space-y-4">
                      {activeThread.map((message) => (
                        <article key={message.id} className="rounded-xl border bg-background p-4 sm:p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="break-all text-sm font-medium">{message.from}</div>
                              <div className="mt-1 break-all text-xs text-muted-foreground">To: {message.to || connection.email}{message.cc ? ` · Cc: ${message.cc}` : ""}</div>
                            </div>
                            <time className="text-[11px] text-muted-foreground">{dateLabel(message.date)}</time>
                          </div>
                          <div className="mt-5 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                            {message.bodyType === "text/plain" ? message.body || "" : <span className="text-muted-foreground">This email has no safe plain-text body to display.</span>}
                          </div>
                          {message.attachments.length > 0 && (
                            <div className="mt-5 border-t pt-4">
                              <p className="mb-2 text-xs font-medium">Attachments</p>
                              <div className="flex flex-wrap gap-2">
                                {message.attachments.map((file) => (
                                  <a key={file.attachmentId} href={`/api/studio/email/attachments/${encodeURIComponent(message.id)}/${encodeURIComponent(file.attachmentId)}`} className="max-w-full rounded-lg border px-3 py-2 text-xs hover:bg-muted">
                                    <span className="block truncate">{file.filename}</span>
                                    <span className="text-muted-foreground">{formatBytes(file.size)}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </article>
                      ))}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => void startReply()} className="gap-2"><IconArrowBackUp size={15} /> Reply</Button>
                        <Button variant="outline" size="sm" onClick={() => void startReply(true)} className="gap-2"><IconChevronDown size={15} /> Reply all</Button>
                        <Button variant="outline" size="sm" onClick={() => void startReply(false, true)} className="gap-2"><IconSend size={15} /> Forward</Button>
                        {labels.filter((label) => label.type === "user").length > 0 && currentMessage && (
                          <LabelPicker
                            labels={labels.filter((label) => label.type === "user")}
                            onApply={(labelId) => void mutateMessage(currentMessage.threadId, "apply-label", true, labelId)}
                            onRemove={(labelId) => void mutateMessage(currentMessage.threadId, "remove-label", true, labelId)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>
          </section>
        )}
      </div>

      {composer && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="composer-title">
          <div className="flex max-h-[92svh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border bg-card shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 id="composer-title" className="text-sm font-semibold">{composer.draftId ? "Edit draft" : "New message"}</h2>
              <button type="button" aria-label="Close compose" onClick={() => setComposer(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><IconX size={17} /></button>
            </div>
            <div className="space-y-3 overflow-y-auto p-4 sm:p-5">
              <ComposerField label="To" value={composer.to} onChange={(to) => setComposer({ ...composer, to })} placeholder="name@example.com" />
              <ComposerField label="Cc" value={composer.cc} onChange={(cc) => setComposer({ ...composer, cc })} placeholder="Optional" />
              <ComposerField label="Bcc" value={composer.bcc} onChange={(bcc) => setComposer({ ...composer, bcc })} placeholder="Optional" />
              <ComposerField label="Subject" value={composer.subject} onChange={(subject) => setComposer({ ...composer, subject })} placeholder="Subject" />
              <Textarea value={composer.body} onChange={(event) => setComposer({ ...composer, body: event.target.value })} placeholder="Write your message…" className="min-h-[240px] resize-y text-sm leading-6" aria-label="Message body" />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:bg-muted">
                <IconPaperclip size={15} /> Attach files
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv" className="sr-only" onChange={(event) => {
                  const picked = Array.from(event.target.files || []);
                  const files = [...composer.attachments, ...picked];
                  if (
                    files.length > 10 ||
                    files.reduce((total, file) => total + file.size, 0) > 3 * 1024 * 1024 ||
                    files.some((file) => !["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp", "text/plain", "text/csv"].includes(emailMimeType(file)))
                  ) {
                    setError("Choose up to 10 allowed files with a combined size no greater than 3 MB.");
                  } else {
                    setError("");
                    setComposer({ ...composer, attachments: files });
                  }
                  event.target.value = "";
                }} />
              </label>
              {composer.attachments.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {composer.attachments.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs">
                      <span className="max-w-48 truncate">{file.name}</span><span className="text-muted-foreground">{formatBytes(file.size)}</span>
                      <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setComposer({ ...composer, attachments: composer.attachments.filter((_item, itemIndex) => itemIndex !== index) })}><IconX size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-muted-foreground">Gmail sends as the connected account. Attachments are limited to 10 safe file types and 3 MB combined for this CMS form.</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 sm:px-5">
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void submitComposer(true)} className="gap-2"><IconFileText size={15} /> Save draft</Button>
              <Button size="sm" disabled={busy || !composer.to.trim() || !composer.subject.trim() || !composer.body.trim()} onClick={() => void submitComposer(false)} className="gap-2">
                {busy ? <IconLoader2 size={15} className="animate-spin" /> : <IconSend size={15} />} Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Banner({ children, kind }: { children: React.ReactNode; kind: "error" | "success" }) {
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${kind === "error" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-emerald-500/30 bg-emerald-500/5 text-foreground"}`}>
      {kind === "error" ? <IconAlertCircle size={17} className="mt-0.5 shrink-0" /> : <IconMail size={17} className="mt-0.5 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

function PanelState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex min-h-[260px] flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">{icon}</span>
      <h3 className="mt-4 text-sm font-medium">{title}</h3>
      <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function ActionButton({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return <button type="button" title={title} aria-label={title} onClick={onClick} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">{children}</button>;
}

function ComposerField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="flex items-center gap-3 border-b pb-2 text-xs text-muted-foreground">
      <span className="w-12 shrink-0">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-8 border-0 px-0 text-sm shadow-none focus-visible:ring-0" />
    </label>
  );
}

function LabelPicker({ labels, onApply, onRemove }: { labels: MailLabel[]; onApply: (labelId: string) => void; onRemove: (labelId: string) => void }) {
  const [labelId, setLabelId] = useState("");
  return (
    <div className="flex items-center gap-1">
      <select aria-label="Choose Gmail label" value={labelId} onChange={(event) => setLabelId(event.target.value)} className="h-9 max-w-40 rounded-lg border bg-background px-2 text-xs">
        <option value="">Add label</option>
        {labels.map((label) => <option key={label.id} value={label.id}>{label.name}</option>)}
      </select>
      <Button variant="outline" size="icon-sm" aria-label="Apply label" disabled={!labelId} onClick={() => onApply(labelId)}><IconTag size={15} /></Button>
      <Button variant="outline" size="sm" disabled={!labelId} onClick={() => onRemove(labelId)}>Remove</Button>
    </div>
  );
}
