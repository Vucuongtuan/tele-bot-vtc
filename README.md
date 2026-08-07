# Telegram newsletter generate

Node.js 22 / TypeScript bot that creates a  newsletter from Telegram content and an image ZIP.

## What the bot does

1. Use `/new YYYY-MM-DD` to start an order.
2. For WWK, send newsletter content then choose either a ZIP of article folders or automatic featured-image retrieval from Payload. Jewelry uses ZIP images.
3. The bot sends a standalone Base64 `YYYY-MM-DD-preview.html` and the final ZIP.
4. If GitHub publishing is configured, it also publishes only `public/YYYY-MM-DD/` in the target repository.

Use `/clean` to permanently delete the current order for the chat and start over. It removes the saved Firestore document, including pasted content and its state.

## Requirements

- Node.js 22 or newer
- A Telegram bot token from BotFather
- A Firebase project with Firestore in Native mode
- A public HTTPS URL for webhook delivery in production
- Optional: Git installed on the server and a GitHub token, for automatic publishing

## Configure your own accounts

Clone the project, then create your local environment file:

```sh
git clone YOUR_REPOSITORY_URL
cd backend
cp .env.example .env
```

### Telegram bot

In Telegram, open [@BotFather](https://t.me/BotFather), send `/newbot`, and follow its prompts to create a bot. Copy the token BotFather returns; it is the value for `TELEGRAM_BOT_TOKEN`.

Set the following values in `.env` or in your server's secret/environment-variable settings:

```dotenv
TELEGRAM_BOT_TOKEN=token-from-botfather
TELEGRAM_WEBHOOK_SECRET=a-long-random-secret
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
PORT=8080
# Optional for WWK's “Lấy ảnh từ Payload” option
PAYLOAD_API_URL=https://wowweekend.vn/api
PAYLOAD_API_KEY=your-payload-user-api-key
```

### Optional: automatically start WWK orders from Gmail

Use `/checkwwk` in Telegram to check Gmail on demand. It reads emails from one trusted sender whose subject contains `WWK`, such as `WWK | Order E-News ngày 9/8/2026`. A valid WWK content body automatically fetches images from Payload, sends previews, and waits for the usual Export confirmation button. No background polling or cron is used.

Each check reads only the single newest matching email; it never backfills historical orders.

The email subject must also include its newsletter date in Vietnamese numeric format, for example `[WWK] 9/8/2026`. The export folder will be `2026-08-09`.

Create a Google OAuth client and a refresh token authorized with both `https://www.googleapis.com/auth/gmail.readonly` and `https://www.googleapis.com/auth/gmail.send` scopes, then set these secrets. The send scope is used only after you press the Telegram button to reply to the original order email.

```dotenv
# One or more trusted senders, separated by commas
GMAIL_ORDER_SENDER=orders@example.com,editor@example.com
GMAIL_OAUTH_CLIENT_ID=google-oauth-client-id
GMAIL_OAUTH_CLIENT_SECRET=google-oauth-client-secret
GMAIL_OAUTH_REFRESH_TOKEN=google-oauth-refresh-token
```

Only successfully parsed and previewed messages are recorded as processed in Firestore. The order is sent to the Telegram chat that invokes `/checkwwk`; keep the bot private if its Gmail integration should not be usable by other people.

Generate the webhook secret with:

```sh
openssl rand -hex 32
```

To get the Firebase JSON: Firebase Console → Project settings → Service accounts → **Generate new private key**. Paste the entire JSON as one environment-variable value. Never commit `.env`, a service-account JSON file, or a GitHub token.

## Run locally

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Check the service:

```sh
curl http://localhost:8080/health
```

## Deploy to any server

Deploy this application to any host that can run Node.js 22+ (or the included `Dockerfile`), keep the environment variables above as secrets, and expose port `PORT` on a public HTTPS domain.

Start command:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

After deployment, register the public webhook URL:

```sh
curl -F "url=https://YOUR_DOMAIN/telegram/webhook" \
  -F "secret_token=YOUR_TELEGRAM_WEBHOOK_SECRET" \
  "https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/setWebhook"
```

Verify it with:

```sh
curl "https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

Telegram command suggestions are registered automatically when the bot starts: `/start`, `/new`, `/clean`, and `/cancel`.

## ZIP structure

The bot scans nested folders. Each article folder must begin with its order number and contain `1040x584.jpg`:

```text
E-News/
├── 1. Architecture/1040x584.jpg
├── 2. Watches/1040x584.jpg
└── 3. WWK's Choice/1040x584.jpg
```

The final archive contains:

```text
YYYY-MM-DD/
├── vi/index.html
└── assets/img/bannerN_2x.jpg
```

## Optional GitHub publishing

Set these variables on the server to enable publishing:

```dotenv
GITHUB_TOKEN=github-token-with-contents-read-write
NEWSLETTER_GITHUB_REPOSITORY=organization-or-user/repository
NEWSLETTER_GITHUB_BRANCH=main
```

The token belongs to the account that has write access to the target repository. For a company repository, the organization may need to allow or approve the token.

After the final ZIP has already been sent in Telegram, the bot clones the target repository and replaces only:

```text
public/YYYY-MM-DD/
```

It commits and pushes that folder only. A GitHub failure never prevents the bot from creating or sending the preview and final ZIP.
