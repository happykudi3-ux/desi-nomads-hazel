# Desi Nomads — Hazel

Hazel is an AI travel assistant, built with Next.js. This app has two parts:

- `app/page.js` — the chat interface (dark navy + gold theme)
- `app/api/chat/route.js` — a server route that calls the Anthropic API using a secret key, so the key never reaches the browser

## Run locally

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and paste in your real OpenRouter API key (get one at openrouter.ai)
3. `npm run dev`
4. Open http://localhost:3000

## Deploy

See the step-by-step guide provided alongside this project for pushing to GitHub and deploying on Vercel.
