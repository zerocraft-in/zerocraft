export type LeadEvent =
  | "whatsapp_click"
  | "email_click"
  | "project_brief_submitted"
  | "instagram_click";

type EventDetails = Record<string, string | undefined>;

export function trackLeadEvent(event: LeadEvent, details: EventDetails = {}) {
  if (typeof window === "undefined") return;
  const payload = {
    event,
    ...details,
    page_path: window.location.pathname,
    timestamp: new Date().toISOString(),
  };
  window.dispatchEvent(new CustomEvent("zerocraft:lead", { detail: payload }));
  const dataLayer = (window as typeof window & { dataLayer?: unknown[] }).dataLayer;
  dataLayer?.push(payload);
  const gtag = (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.("event", event, details);
  try {
    const history = JSON.parse(window.localStorage.getItem("zerocraft_lead_events") || "[]");
    history.push(payload);
    window.localStorage.setItem("zerocraft_lead_events", JSON.stringify(history.slice(-50)));
  } catch {
    // Storage may be disabled; the browser event and dataLayer still work.
  }
}
