"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { IconArrowUp, IconSparkles, IconX } from "@tabler/icons-react";

type Message = { role: "user" | "assistant"; text: string };

const starters = ["Explain what this dashboard tracks", "Help me plan a project launch", "Draft a response to a client"];

function AssistantGlyph() {
  return <span className="studio-assistant-glyph" aria-hidden="true"><svg viewBox="0 0 64 64" role="presentation">
    <path fill="#83a7ff" d="M18 12c1-6 7-10 14-8 5-5 15-2 17 5 8 1 12 8 10 15 5 5 3 14-4 17H12C4 37 4 26 10 22c-1-5 2-9 8-10Z" />
    <path fill="#4774ee" d="M13 25c0-5 4-9 9-9 1-6 6-9 12-7 4-4 12-2 13 5 6 0 9 5 8 10 4 4 2 11-3 13H15c-5-2-6-8-2-12Z" />
    <rect x="17" y="19" width="31" height="20" rx="6" fill="#111b42" stroke="#a9c5ff" strokeWidth="2" />
    <path d="m27 25 5 4-5 4m10 0h5" fill="none" stroke="#67e6ff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
    <path d="M22 39h21l-2 9H25l-3-9Z" fill="#6592ff" />
    <rect x="27" y="47" width="5" height="7" rx="2" fill="#88adff" /><rect x="36" y="47" width="5" height="7" rx="2" fill="#88adff" />
    <path d="M18 40 14 46m32-6 4 6" stroke="#8bb0ff" strokeLinecap="round" strokeWidth="4" />
    <circle cx="13" cy="24" r="2" fill="#c9dbff" /><circle cx="52" cy="16" r="2" fill="#c9dbff" />
  </svg></span>;
}

export default function StudioAssistant() {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Hi, I’m the Zerocraft studio assistant. I can help with planning, writing, and questions about your CMS. What are you working on?" }]);
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    let current = true;
    void fetch("/api/studio/assistant", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Assistant status is unavailable.");
        if (current) setConfigured(Boolean(result.configured));
      })
      .catch(() => { if (current) setConfigured(false); });
    return () => { current = false; };
  }, [open]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, busy, open]);

  async function send(text = input) {
    const prompt = text.trim();
    if (!prompt || busy) return;
    const nextMessages = [...messages, { role: "user" as const, text: prompt }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/studio/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.filter((message, index) => index !== 0 || message.role !== "assistant").slice(-16).map(({ role, text: message }) => ({ role, text: message })) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The assistant couldn’t respond.");
      setConfigured(true);
      setMessages((current) => [...current, { role: "assistant", text: result.reply }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The assistant couldn’t respond.");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send();
  }

  return (
    <div className="studio-assistant-root">
      <AnimatePresence>
        {open && (
          <motion.section
            className="studio-assistant-panel"
            role="dialog"
            aria-label="Studio AI assistant"
            initial={reduceMotion ? false : { opacity: 0, y: 18, scale: .97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 12, scale: .98 }}
            transition={{ duration: .22, ease: [.2, .75, .25, 1] }}
          >
            <header className="studio-assistant-head">
              <AssistantGlyph />
              <div><span>ZEROCRAFT / INTELLIGENCE</span><h2>Studio assistant</h2><small><i className={configured ? "is-online" : ""} />{configured === null ? "Checking Gemini…" : configured ? "Gemini connected" : "Gemini needs setup"}</small></div>
              <button type="button" aria-label="Close assistant" onClick={() => setOpen(false)}><IconX size={17} /></button>
            </header>
            <div className="studio-assistant-log" ref={logRef} aria-live="polite" aria-relevant="additions text">
              <div className="studio-assistant-context"><IconSparkles size={14} /> Your conversation stays in this session.</div>
              {messages.map((message, index) => (
                <div key={`${index}-${message.role}`} className={`studio-assistant-message is-${message.role}`}>
                  {message.role === "assistant" && <AssistantGlyph />}
                  <p>{message.text}</p>
                </div>
              ))}
              {busy && <div className="studio-assistant-message is-assistant"><AssistantGlyph /><p className="studio-assistant-thinking"><i /><i /><i /><span className="sr-only">Thinking</span></p></div>}
              {messages.length === 1 && <div className="studio-assistant-starters">{starters.map((starter) => <button key={starter} type="button" onClick={() => void send(starter)} disabled={busy}>{starter}<IconArrowUp size={13} /></button>)}</div>}
              {error && <p className="studio-assistant-error" role="alert">{error}</p>}
            </div>
            <form className="studio-assistant-compose" onSubmit={onSubmit}>
              <textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} maxLength={2000} rows={1} placeholder="Message the studio assistant…" aria-label="Message the studio assistant" disabled={busy} />
              <button type="submit" aria-label="Send message" disabled={!input.trim() || busy}><IconArrowUp size={18} /></button>
              <small>AI can make mistakes. Review important details.</small>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        className={`studio-assistant-launcher ${open ? "is-open" : ""}`}
        aria-label={open ? "Close studio assistant" : "Open studio assistant"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        whileHover={reduceMotion ? undefined : { y: -3, scale: 1.04 }}
        whileTap={reduceMotion ? undefined : { scale: .96 }}
      >
        {open ? <IconX size={20} /> : <><AssistantGlyph /><span>AI</span></>}
      </motion.button>
    </div>
  );
}
