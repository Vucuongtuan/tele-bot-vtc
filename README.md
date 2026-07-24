# Telegram newsletter backend

Node.js 22 / TypeScript service for the `/new YYYY-MM-DD` Telegram workflow.

## Local setup

```sh
cd backend
cp .env.example .env
pnpm install
pnpm dev
```

For local use, set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and either `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`. For webhook mode, expose `POST /telegram/webhook`, then set it with Telegram's `setWebhook` API and the same secret token. Use `GET /health` for health checks.

## Render Free deployment (recommended)

1. Create a Firebase project on the Spark plan, then create one Firestore database in Native mode.
2. Firebase Console → Project settings → Service accounts → **Generate new private key**. Keep the downloaded JSON private.
3. Push this repository to GitHub. In Render, select **New → Blueprint**, select the repository, and set **Blueprint Path** to `backend/render.yaml`.
4. In Render's Environment settings, set:
   - `TELEGRAM_BOT_TOKEN`: the token from BotFather.
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: paste the entire downloaded JSON as one value.
   - `TELEGRAM_WEBHOOK_SECRET`: create a value using `openssl rand -hex 32`; do not change it after registering the webhook.
5. Deploy. Copy the public service URL, then register `https://YOUR_SERVICE_URL/telegram/webhook` with Telegram.

To register the webhook, get the secret from Render's Environment screen and run:

```sh
curl -F "url=https://YOUR_SERVICE_URL/telegram/webhook" \
  -F "secret_token=YOUR_TELEGRAM_WEBHOOK_SECRET" \
  "https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/setWebhook"
```

Render Free can sleep after inactivity, so the first Telegram message after a long idle can be delayed while it wakes up. Do not commit `.env` or service-account JSON.

## Archive contract

Only ZIP is accepted. Every nested folder is scanned; source JPEG images must be named `1.jpg`, `2.jpg`, etc. The resulting archive contains `vi/index.html` and `assets/img/bannerN_2x.jpg`.
