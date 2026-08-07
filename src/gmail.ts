interface GmailMessagePart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMessagePart[];
}

interface GmailMessage {
  id: string;
  payload?: GmailMessagePart;
}

const gmailApi = "https://gmail.googleapis.com/gmail/v1/users/me";

function configured() {
  return Boolean(process.env.GMAIL_ORDER_SENDER && process.env.GMAIL_OAUTH_CLIENT_ID && process.env.GMAIL_OAUTH_CLIENT_SECRET && process.env.GMAIL_OAUTH_REFRESH_TOKEN);
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
export async function checkGmailOrders(onOrder: (messageId: string, text: string) => Promise<boolean>): Promise<number> {
  if (!configured()) throw new Error("Gmail order integration is not configured");
  const token = await accessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const sender = process.env.GMAIL_ORDER_SENDER!;
  const query = new URLSearchParams({ q: `from:${sender} subject:"[WWK]"`, maxResults: "10" });
  const list = await fetch(`${gmailApi}/messages?${query}`, { headers });
  if (!list.ok) throw new Error(`Gmail message list failed (${list.status})`);
  const body = await list.json() as { messages?: Array<{ id: string }> };
  let processed = 0;
  for (const item of body.messages ?? []) {
    const response = await fetch(`${gmailApi}/messages/${item.id}?format=full`, { headers });
    if (!response.ok) throw new Error(`Gmail message read failed (${response.status})`);
    const message = await response.json() as GmailMessage;
    const text = findPlainText(message.payload);
    if (text && await onOrder(message.id, text)) processed += 1;
  }
  return processed;
}
