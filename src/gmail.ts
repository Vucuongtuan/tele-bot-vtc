interface GmailMessagePart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMessagePart[];
  headers?: Array<{ name?: string; value?: string }>;
}

interface GmailMessage {
  id: string;
  threadId: string;
  payload?: GmailMessagePart;
}

const gmailApi = "https://gmail.googleapis.com/gmail/v1/users/me";

function configured() {
  return Boolean(process.env.GMAIL_ORDER_SENDER && process.env.GMAIL_OAUTH_CLIENT_ID && process.env.GMAIL_OAUTH_CLIENT_SECRET && process.env.GMAIL_OAUTH_REFRESH_TOKEN);
}

function trustedSenders(): string[] {
  return (process.env.GMAIL_ORDER_SENDER ?? "").split(",").map((sender) => sender.trim()).filter(Boolean);
}

async function accessToken(): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_OAUTH_CLIENT_ID!,
      client_secret: process.env.GMAIL_OAUTH_CLIENT_SECRET!,
      refresh_token: process.env.GMAIL_OAUTH_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error(`Gmail OAuth token request failed (${response.status})`);
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("Gmail OAuth did not return an access token");
  return body.access_token;
}

const decodeBase64Url = (value: string) => Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");

function findPlainText(part?: GmailMessagePart): string | undefined {
  if (!part) return undefined;
  if (part.mimeType === "text/plain" && part.body?.data) return decodeBase64Url(part.body.data);
  return part.parts?.map(findPlainText).find(Boolean);
}

/** Reads matching Gmail orders once; invoke this from a user action, not a background timer. */
export async function checkGmailOrders(onOrder: (order: { messageId: string; threadId: string; text: string; subject: string; from: string; rfcMessageId?: string }) => Promise<boolean>): Promise<number> {
  if (!configured()) throw new Error("Gmail order integration is not configured");
  const token = await accessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const senders = trustedSenders();
  const senderQuery = senders.length === 1 ? `from:${senders[0]}` : `{${senders.map((sender) => `from:${sender}`).join(" ")}}`;
  // Gmail returns newest messages first. Deliberately inspect only one so a
  // manual check can never backfill and create exports from historical orders.
  const query = new URLSearchParams({ q: `${senderQuery} subject:WWK`, maxResults: "1" });
  const list = await fetch(`${gmailApi}/messages?${query}`, { headers });
  if (!list.ok) throw new Error(`Gmail message list failed (${list.status})`);
  const body = await list.json() as { messages?: Array<{ id: string }> };
  let processed = 0;
  for (const item of body.messages ?? []) {
    const response = await fetch(`${gmailApi}/messages/${item.id}?format=full`, { headers });
    if (!response.ok) throw new Error(`Gmail message read failed (${response.status})`);
    const message = await response.json() as GmailMessage;
    const text = findPlainText(message.payload);
    const subject = message.payload?.headers?.find((header) => header.name?.toLowerCase() === "subject")?.value ?? "";
    const header = (name: string) => message.payload?.headers?.find((item) => item.name?.toLowerCase() === name)?.value;
    if (text && await onOrder({ messageId: message.id, threadId: message.threadId, text, subject, from: header("from") ?? "", rfcMessageId: header("message-id") })) processed += 1;
  }
  return processed;
}

const headerSafe = (value: string) => value.replace(/[\r\n]/g, " ");
const base64Url = (value: string) => Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function sendGmailOrderReply(draft: { threadId: string; from: string; subject: string; rfcMessageId?: string; folderName: string }): Promise<void> {
  if (!configured()) throw new Error("Gmail order integration is not configured");
  const link = `https://newsletter.wowweekend.vn/${encodeURIComponent(draft.folderName)}/vi/`;
  const message = [`To: ${headerSafe(draft.from)}`, `Subject: Re: ${headerSafe(draft.subject)}`, ...(draft.rfcMessageId ? [`In-Reply-To: ${headerSafe(draft.rfcMessageId)}`, `References: ${headerSafe(draft.rfcMessageId)}`] : []), "Content-Type: text/plain; charset=UTF-8", "", "Dear team", "", "Em gửi link enew nhờ team check lại giúp nhé", "", `Link: ${link}`, "", "Trân trọng,"].join("\r\n");
  const response = await fetch(`${gmailApi}/messages/send`, { method: "POST", headers: { Authorization: `Bearer ${await accessToken()}`, "content-type": "application/json" }, body: JSON.stringify({ threadId: draft.threadId, raw: base64Url(message) }) });
  if (!response.ok) throw new Error(`Gmail send failed (${response.status})`);
}
