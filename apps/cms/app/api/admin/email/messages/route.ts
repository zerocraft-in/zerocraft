import { consumeGmailRateLimit, gmailAccessToken, gmailApi, gmailRequest, GmailError, recordGmailAudit } from "@/lib/email/gmail";
import { gmailErrorResponse, gmailJson, requireGmailAdmin } from "@/lib/email/gmail-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MessageListResponse = {
  threads?: Array<{ id: string; snippet?: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
};
type ThreadDetail = {
  id: string;
  messages?: Array<{
    id: string;
    internalDate?: string;
    labelIds?: string[];
    payload?: { headers?: Array<{ name?: string; value?: string }> };
  }>;
};

const LABELS: Record<string, string> = {
  inbox: "INBOX",
  unread: "UNREAD",
  starred: "STARRED",
  sent: "SENT",
  drafts: "DRAFT",
};

export async function GET(request: Request) {
  const access = await requireGmailAdmin("email.read");
  if (!access.ok) return access.response;
  try {
    await consumeGmailRateLimit(access.access.supabase, "list", 120, 60);
    const url = new URL(request.url);
    const folder = url.searchParams.get("folder") || "inbox";
    const customLabel = url.searchParams.get("labelId") || "";
    if (customLabel && !/^[\w-]{1,200}$/.test(customLabel)) throw new GmailError("Invalid Gmail label.", 400, "invalid_label");
    if (!LABELS[folder] && !customLabel) throw new GmailError("Choose a supported mailbox folder.", 400, "invalid_folder");
    const query = url.searchParams.get("q")?.trim() || "";
    if (query.length > 200) throw new GmailError("Search text must be 200 characters or fewer.", 400, "query_too_long");
    const cursor = url.searchParams.get("pageToken") || "";
    if (cursor.length > 2048) throw new GmailError("Invalid page token.", 400, "invalid_page_token");
    const params = new URLSearchParams({ maxResults: "20", labelIds: customLabel || LABELS[folder] });
    if (query) params.set("q", query);
    if (cursor) params.set("pageToken", cursor);
    const token = await gmailAccessToken();
    const page = await gmailRequest<MessageListResponse>(token, `/users/me/threads?${params}`);
    const details = await Promise.all((page.threads || []).map(({ id }) =>
      gmailRequest<ThreadDetail>(token, `/users/me/threads/${encodeURIComponent(id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`),
    ));
    const messages = details.map((message, index) => {
      const lastMessage = message.messages?.at(-1);
      const headers = lastMessage?.payload?.headers || [];
      const header = (name: string) => headers.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value || "";
      const labelIds = [...new Set((message.messages || []).flatMap((item) => item.labelIds || []))];
      return {
        id: lastMessage?.id || message.id,
        threadId: message.id,
        snippet: (page.threads?.[index]?.snippet || "").slice(0, 500),
        subject: header("Subject") || "(no subject)",
        from: header("From"),
        to: header("To"),
        date: header("Date"),
        internalDate: lastMessage?.internalDate || "",
        unread: labelIds.includes("UNREAD"),
        starred: labelIds.includes("STARRED"),
        labelIds,
      };
    });
    await recordGmailAudit(access.access.supabase, {
      actorId: access.access.user.id,
      action: "list",
      outcome: "succeeded",
    });
    return gmailJson({ messages, nextPageToken: page.nextPageToken || null, resultSizeEstimate: page.resultSizeEstimate || 0 });
  } catch (error) {
    return gmailErrorResponse(error);
  }
}
