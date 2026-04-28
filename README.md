# Re Zero Hardware Agent

A Vercel-ready web app for designing electronics projects with Arduino, Raspberry Pi, ESP32, sensors, actuators, wiring diagrams, firmware, and a lightweight simulator.

## What it does

- Turns a project idea into a build plan.
- Shows a circuit diagram and a wiring table.
- Generates firmware for Arduino-style sketches or Raspberry Pi Python.
- Runs a browser-side simulation check for common code and wiring mistakes.
- Works without an API key using local fallback plans.
- Uses open models through Hugging Face's OpenAI-compatible router when `HF_TOKEN` is configured.
- Adds Gabimaru, a chat-first hardware agent with tool calls for project planning and simulation checks.
- Includes a Chat SDK bot scaffold in `src/lib/gabimaru-chat-sdk.ts` so Slack, Telegram, GitHub, or other adapters can share the same Gabimaru identity later.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Hugging Face setup

Gabimaru uses open models through Hugging Face Inference Providers. The app talks to Hugging Face's OpenAI-compatible Chat Completions router, so model changes are mostly environment variable changes.

Create a `.env.local` file for local development:

```bash
HF_TOKEN=your_huggingface_token
HF_BASE_URL=https://router.huggingface.co/v1
HF_MODEL=Qwen/Qwen3-Coder-30B-A3B-Instruct:fastest
HF_FALLBACK_MODEL=openai/gpt-oss-20b:cheapest
```

Recommended models:

- `Qwen/Qwen3-Coder-30B-A3B-Instruct:fastest` for the main Gabimaru hardware agent.
- `openai/gpt-oss-20b:cheapest` as a lower-cost fallback option.
- `Qwen/Qwen3-4B-Instruct-2507:fastest` for a smaller budget model.

Create an access token at Hugging Face, then make sure Inference Providers are enabled for your account.

Restart `npm run dev` after changing environment variables.

## Deploy to Vercel

1. Import this repository into Vercel.
2. Add `HF_TOKEN` in Project Settings -> Environment Variables.
3. Optionally set `HF_BASE_URL`, `HF_MODEL`, and `HF_FALLBACK_MODEL`.
4. Deploy.
