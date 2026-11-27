import "server-only";

import { randomUUID } from "node:crypto";

export type EncodedEmailAttachment = {
  filename: string;
  mimeType: string;
  data: string;
};

const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
]);

function contentMatchesMime(bytes: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/gif") return /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString("ascii"));
  if (mimeType === "image/webp") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return !bytes.includes(0);
}

export function parseEmailAttachments(value: unknown): EncodedEmailAttachment[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 10) {
    throw new Error("Choose no more than 10 attachments.");
  }
  let totalSize = 0;
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("An attachment is invalid.");
    const file = item as Record<string, unknown>;
    if (
      typeof file.filename !== "string" ||
      typeof file.mimeType !== "string" ||
      typeof file.data !== "string"
    ) throw new Error("An attachment is missing required file information.");
    const filename = file.filename.split(/[\\/]/).pop()!
      .replace(/[\u0000-\u001f\u007f"]/g, "_")
      .trim()
      .slice(0, 150);
    const mimeType = file.mimeType.split(";")[0].trim().toLowerCase();
    const data = file.data;
    if (!filename || !ALLOWED_TYPES.has(mimeType)) throw new Error("This attachment type is not allowed.");
    if (data.length > Math.ceil(MAX_ATTACHMENT_BYTES * 4 / 3) + 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) {
      throw new Error("An attachment is invalid or exceeds the 10 MB limit.");
    }
    const bytes = Buffer.from(data, "base64");
    if (bytes.length > MAX_ATTACHMENT_BYTES || bytes.toString("base64").replace(/=+$/, "") !== data.replace(/=+$/, "")) {
      throw new Error("An attachment is invalid or exceeds the 10 MB limit.");
    }
    totalSize += bytes.length;
    if (totalSize > MAX_ATTACHMENT_BYTES) throw new Error("The combined attachment size must not exceed 10 MB.");
    if (!contentMatchesMime(bytes, mimeType)) throw new Error("An attachment's contents do not match its declared file type.");
    return { filename, mimeType, data: bytes.toString("base64") };
  });
}

function safeMessageIds(value: string) {
  return value
    .replace(/[\r\n]+/g, " ")
    .split(/\s+/)
    .filter((part) => /^<[\w.!#$%&'*+/=?^`{|}~@:-]{1,250}>$/.test(part))
    .join(" ")
    .slice(0, 1000);
}

function encodeSubject(value: string) {
  return /[^\x20-\x7e]/.test(value)
    ? `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`
    : value;
}

function base64Lines(value: Buffer) {
  return value.toString("base64").match(/.{1,76}/g)?.join("\r\n") || "";
}

export function buildRawEmail(input: {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  attachments?: EncodedEmailAttachment[];
}) {
  const headers = [
    `To: ${input.to.join(", ")}`,
    input.cc.length ? `Cc: ${input.cc.join(", ")}` : "",
    input.bcc.length ? `Bcc: ${input.bcc.join(", ")}` : "",
    `Subject: ${encodeSubject(input.subject)}`,
    input.inReplyTo ? `In-Reply-To: ${safeMessageIds(input.inReplyTo)}` : "",
    input.references ? `References: ${safeMessageIds(input.references)}` : "",
    "MIME-Version: 1.0",
  ].filter(Boolean);
  const body = Buffer.from(input.body.replace(/\r?\n/g, "\r\n"), "utf8");
  if (!input.attachments?.length) {
    headers.push("Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64");
    return Buffer.from(`${headers.join("\r\n")}\r\n\r\n${base64Lines(body)}`, "utf8").toString("base64url");
  }

  const boundary = `=_Zerocraft_${randomUUID().replaceAll("-", "")}`;
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  const parts = [
    `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64Lines(body)}`,
    ...input.attachments.map((file) => {
      const bytes = Buffer.from(file.data, "base64");
      const asciiName = file.filename.replace(/[^\x20-\x7e]|["\\;]/g, "_");
      return `--${boundary}\r\nContent-Type: ${file.mimeType}; name="${asciiName}"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.filename)}\r\n\r\n${base64Lines(bytes)}`;
    }),
    `--${boundary}--`,
  ];
  return Buffer.from(`${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`, "utf8").toString("base64url");
}
