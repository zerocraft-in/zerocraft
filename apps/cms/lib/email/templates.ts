import "server-only";

import { sendEmail } from "./smtp";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function testEmail(recipient: string, senderName: string) {
  const safeName = escapeHtml(senderName || "ZeroCraft operator");
  const text = `ZeroCraft SMTP is working. Sent by ${senderName || "ZeroCraft operator"}.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#171717"><p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#666">ZeroCraft CMS</p><h1 style="font-size:28px;margin:20px 0 8px">SMTP is working</h1><p style="line-height:1.6">This test email was sent by ${safeName} from the CMS email foundation.</p></div>`;
  return {
    to: recipient,
    subject: "ZeroCraft CMS SMTP test",
    text,
    html,
  };
}

export async function sendTestEmail(recipient: string, senderName: string) {
  return sendEmail(testEmail(recipient, senderName));
}

const dateLabel = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));

export function appointmentEmail(input: { recipient: string; clientName: string; service: string; scheduledAt: string; status: string; notes?: string }) {
  const subject = `Appointment ${input.status}: ${input.service}`;
  const text = `Hi ${input.clientName},\n\nYour ZeroCraft appointment is ${input.status}.\nService: ${input.service}\nScheduled: ${dateLabel(input.scheduledAt)}\n${input.notes ? `Notes: ${input.notes}\n` : ""}\nRegards,\nZeroCraft Studio`;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#18181b"><h2>ZeroCraft Studio appointment</h2><p>Hi ${escapeHtml(input.clientName)},</p><p>Your appointment is <strong>${escapeHtml(input.status)}</strong>.</p><p><strong>Service:</strong> ${escapeHtml(input.service)}<br/><strong>Scheduled:</strong> ${escapeHtml(dateLabel(input.scheduledAt))}</p>${input.notes ? `<p><strong>Notes:</strong> ${escapeHtml(input.notes)}</p>` : ""}<p>Regards,<br/>ZeroCraft Studio</p></div>`;
  return { to: input.recipient, subject, text, html };
}

export function orderEmail(input: { recipient: string; customerName: string; orderNumber: string; status: string; paymentStatus: string; total: number; currency: string }) {
  const subject = `Order ${input.orderNumber} is ${input.status}`;
  const total = new Intl.NumberFormat("en-IN", { style: "currency", currency: input.currency || "INR" }).format(input.total);
  const text = `Hi ${input.customerName},\n\nYour ZeroCraft order ${input.orderNumber} is now ${input.status}.\nPayment: ${input.paymentStatus}\nTotal: ${total}\n\nRegards,\nZeroCraft Studio`;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#18181b"><h2>ZeroCraft order update</h2><p>Hi ${escapeHtml(input.customerName)},</p><p>Order <strong>${escapeHtml(input.orderNumber)}</strong> is now <strong>${escapeHtml(input.status)}</strong>.</p><p><strong>Payment:</strong> ${escapeHtml(input.paymentStatus)}<br/><strong>Total:</strong> ${escapeHtml(total)}</p><p>Regards,<br/>ZeroCraft Studio</p></div>`;
  return { to: input.recipient, subject, text, html };
}

export function automationFailureEmail(input: {
  recipient: string;
  jobName: string;
  trigger: string;
  startedAt: string;
  errorMessage: string;
}) {
  const jobName = input.jobName || "ZeroCraft automation";
  const trigger = input.trigger || "scheduled";
  const errorMessage = input.errorMessage || "The automation failed without an error message.";
  const subject = `ZeroCraft automation failed: ${jobName}`;
  const text = [
    "ZeroCraft CMS automation failure",
    "",
    `Job: ${jobName}`,
    `Trigger: ${trigger}`,
    `Started: ${dateLabel(input.startedAt)}`,
    `Error: ${errorMessage}`,
    "",
    "Open CMS → System → Automation health to review the run and retry it manually.",
  ].join("\\n");
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#18181b;max-width:620px;margin:0 auto;padding:28px"><p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#666">ZeroCraft CMS · System alert</p><h2 style="margin:18px 0 8px">Automation failed</h2><p>The CMS detected a failed background automation run.</p><p><strong>Job:</strong> ${escapeHtml(jobName)}<br/><strong>Trigger:</strong> ${escapeHtml(trigger)}<br/><strong>Started:</strong> ${escapeHtml(dateLabel(input.startedAt))}</p><p style="padding:14px;background:#fff1f2;border:1px solid #fecdd3;border-radius:8px"><strong>Error:</strong> ${escapeHtml(errorMessage)}</p><p>Open <strong>System → Automation health</strong> in ZeroCraft CMS to review the run and retry it manually.</p></div>`;
  return { to: input.recipient, subject, text, html };
}
