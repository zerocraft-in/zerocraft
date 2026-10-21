import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import type { Attachment } from "nodemailer/lib/mailer";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  replyTo?: string;
};

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: Attachment[];
};

let transporter: Transporter | null = null;

function readConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM?.trim() || user;
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || undefined;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !password || !from || !Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM.");
  }

  return { host, port, secure, user, password, from, replyTo };
}

function getTransporter(config: SmtpConfig) {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporter;
}

export async function sendEmail(message: EmailMessage) {
  const config = readConfig();
  const info = await getTransporter(config).sendMail({
    from: config.from,
    to: message.to,
    replyTo: config.replyTo,
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: message.attachments,
  });

  return { messageId: info.messageId, accepted: info.accepted };
}

export function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD &&
      (process.env.EMAIL_FROM || process.env.SMTP_USER),
  );
}

export async function verifySmtpConnection() {
  const config = readConfig();
  await getTransporter(config).verify();
  return { host: config.host, port: config.port, secure: config.secure };
}
