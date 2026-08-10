/**
 * Install this in script.google.com, configure its Script Properties, then add
 * a time-driven trigger for checkWwkOrders (for example, every 5 minutes).
 *
 * Required Script Properties:
 *   BACKEND_GMAIL_ORDER_URL    https://your-domain/gmail/order
 *   BACKEND_GMAIL_PUSH_SECRET  same value as GMAIL_PUSH_SECRET on the backend
 */
const FORWARDED_LABEL = "WWK-Forwarded";

function checkWwkOrders() {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("BACKEND_GMAIL_ORDER_URL");
  const secret = props.getProperty("BACKEND_GMAIL_PUSH_SECRET");
  if (!endpoint || !secret) throw new Error("Set BACKEND_GMAIL_ORDER_URL and BACKEND_GMAIL_PUSH_SECRET in Script Properties");

  const label = GmailApp.getUserLabelByName(FORWARDED_LABEL) || GmailApp.createLabel(FORWARDED_LABEL);
  const threads = GmailApp.search(`in:inbox -label:${FORWARDED_LABEL} subject:WWK subject:"E-News"`);
  for (const thread of threads) {
    if (thread.getLabels().some((item) => item.getName() === FORWARDED_LABEL)) continue;
    const messages = thread.getMessages();
    const message = messages[messages.length - 1];
    const response = UrlFetchApp.fetch(endpoint, {
      method: "post",
      contentType: "application/json",
      headers: { "X-Gmail-Push-Secret": secret },
      payload: JSON.stringify({
        messageId: message.getId(),
        threadId: thread.getId(),
        text: message.getPlainBody(),
        subject: message.getSubject(),
        from: message.getFrom(),
      }),
      muteHttpExceptions: true,
    });
    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
      thread.addLabel(label);
    } else {
      console.warn(`Could not forward ${message.getId()}: ${response.getResponseCode()} ${response.getContentText()}`);
    }
  }
}
