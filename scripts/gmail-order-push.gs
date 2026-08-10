/**
 * Install this in script.google.com, configure its Script Properties, then add
 * a time-driven trigger for checkWwkOrders (for example, every 5 minutes).
 *
 * Required Script Properties:
 *   BACKEND_GMAIL_ORDER_URL    https://your-domain/gmail/order
 *   BACKEND_GMAIL_PUSH_SECRET  same value as GMAIL_PUSH_SECRET on the backend
 *
 * The first run only creates a starting point. Emails received before that
 * point are not forwarded, avoiding a backlog of historical orders.
 */
const FORWARDED_LABEL = "WWK-Forwarded";
const START_AFTER_KEY = "WWK_ORDER_PUSH_START_AFTER";

/** Run manually to ignore every order received before this moment. */
function resetWwkOrderPushStart() {
  PropertiesService.getScriptProperties().setProperty(START_AFTER_KEY, String(Date.now()));
  console.log("WWK order push start time was reset. Older orders will be ignored.");
}

function checkWwkOrders() {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty("BACKEND_GMAIL_ORDER_URL");
  const secret = props.getProperty("BACKEND_GMAIL_PUSH_SECRET");
  if (!endpoint || !secret) throw new Error("Set BACKEND_GMAIL_ORDER_URL and BACKEND_GMAIL_PUSH_SECRET in Script Properties");

  const startAfter = Number(props.getProperty(START_AFTER_KEY));
  if (!Number.isFinite(startAfter)) {
    props.setProperty(START_AFTER_KEY, String(Date.now()));
    console.log("WWK order push is initialized. Only emails received from now on will be forwarded.");
    return;
  }

  const label = GmailApp.getUserLabelByName(FORWARDED_LABEL) || GmailApp.createLabel(FORWARDED_LABEL);
  const threads = GmailApp.search(`in:inbox -label:${FORWARDED_LABEL} subject:WWK subject:"E-News"`);
  for (const thread of threads) {
    if (thread.getLabels().some((item) => item.getName() === FORWARDED_LABEL)) continue;
    const messages = thread.getMessages();
    const message = messages.find((item) => item.getDate().getTime() > startAfter);
    if (!message) {
      thread.addLabel(label);
      continue;
    }
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
    if ((response.getResponseCode() >= 200 && response.getResponseCode() < 300) || response.getResponseCode() === 400) {
      thread.addLabel(label);
    } else {
      console.warn(`Could not forward ${message.getId()}: ${response.getResponseCode()} ${response.getContentText()}`);
    }
  }
}
