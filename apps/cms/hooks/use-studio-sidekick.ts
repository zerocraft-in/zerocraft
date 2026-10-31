"use client";

import { useEffect, useRef, useState } from "react";

type SpeechResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechLike = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: SpeechResultEvent) => void) | null; onerror: (() => void) | null; onstart: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechConstructor = new () => SpeechLike;

export function useStudioSidekick() {
  const [commandPrompt, setCommandPrompt] = useState("");
  const [bottomPrompt, setBottomPrompt] = useState("");
  const [sidekickOpen, setSidekickOpen] = useState(false);
  const [sidekickExpanded, setSidekickExpanded] = useState(false);
  const [sidekickHydrated, setSidekickHydrated] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceRecognitionRef = useRef<SpeechLike | null>(null);
  useEffect(() => { const savedOpen = window.localStorage.getItem("zerocraft-sidekick-open"); if (savedOpen === "true") setSidekickOpen(true); window.localStorage.removeItem("zerocraft-sidekick-expanded"); setSidekickExpanded(false); setSidekickHydrated(true); }, []);
  useEffect(() => { if (sidekickHydrated) window.localStorage.setItem("zerocraft-sidekick-open", String(sidekickOpen)); }, [sidekickHydrated, sidekickOpen]);
  async function sendBottomPrompt(value = bottomPrompt) {
    const prompt = value.trim(); if (!prompt) return;
    let finalPrompt = prompt;
    try { const files = await Promise.all(attachedFiles.slice(0, 3).map(async (file) => `\n\n[Attached file: ${file.name}]\n${(await file.text()).slice(0, 6000)}`)); finalPrompt += files.join("").slice(0, 12000); }
    catch { setVoiceStatus("Could not read the selected file. Try a text, CSV, Markdown, or JSON file."); return; }
    setCommandPrompt(finalPrompt); setBottomPrompt(""); setAttachedFiles([]); setSidekickOpen(true); setVoiceStatus("");
  }
  function startVoiceCommand() {
    const browserWindow = window as Window & { SpeechRecognition?: SpeechConstructor; webkitSpeechRecognition?: SpeechConstructor };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) { setVoiceStatus("Voice input is not supported in this browser."); return; }
    voiceRecognitionRef.current?.stop(); const recognition = new Recognition(); recognition.lang = "en-IN"; recognition.interimResults = false; recognition.continuous = false; recognition.onstart = () => setVoiceStatus("Listening…"); recognition.onresult = (event) => { const transcript = event.results[0]?.[0]?.transcript?.trim(); if (transcript) void sendBottomPrompt(transcript); }; recognition.onerror = () => setVoiceStatus("Could not hear that. Please try again."); recognition.onend = () => { voiceRecognitionRef.current = null; }; voiceRecognitionRef.current = recognition; recognition.start();
  }
  return { commandPrompt, setCommandPrompt, bottomPrompt, setBottomPrompt, sidekickOpen, setSidekickOpen, sidekickExpanded, setSidekickExpanded, voiceStatus, attachedFiles, setAttachedFiles, fileInputRef, sendBottomPrompt, startVoiceCommand };
}
