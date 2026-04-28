# Re Zero Hardware Agent

A Vercel-ready web app for designing electronics projects with Arduino, Raspberry Pi, ESP32, sensors, actuators, wiring diagrams, firmware, and a lightweight simulator.

## What it does

- Turns a project idea into a build plan.
- Shows a circuit diagram and a wiring table.
- Generates firmware for Arduino-style sketches or Raspberry Pi Python.
- Runs a browser-side simulation check for common code and wiring mistakes.
- Works without an API key using the free local planner mode.
- Can use Groq-hosted tool-calling models when `GABIMARU_AI_MODE=groq` and `GROQ_API_KEY` are configured.
- Adds Gabimaru, a chat-first hardware agent with tool calls for project planning and simulation checks.
- Includes a Chat SDK bot scaffold in `src/lib/gabimaru-chat-sdk.ts` so Slack, Telegram, GitHub, or other adapters can share the same Gabimaru identity later.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## AI modes

Gabimaru defaults to no-cost local mode:

```bash
GABIMARU_AI_MODE=local
```

This keeps the chat working on Vercel without paid inference. It uses the app's built-in planner and simulator to produce wiring, firmware, circuit diagrams, and safety checks.

For stronger model reasoning and faster tool calling, switch to Groq hosted inference:

```bash
GABIMARU_AI_MODE=groq
```

Important: Groq is a hosted compute service. Keep `GABIMARU_AI_MODE=local` when you want the app to answer without any hosted model key.

## Groq setup

Gabimaru uses Groq through its OpenAI-compatible Chat Completions endpoint, so the Vercel AI SDK can keep the same agent and tool-calling structure.

Create a `.env.local` file for local development:

```bash
GABIMARU_AI_MODE=groq
GROQ_API_KEY=your_groq_api_key
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=openai/gpt-oss-20b
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
```

Recommended models:

- `openai/gpt-oss-20b` for fast tool-calling hardware planning.
- `openai/gpt-oss-120b` for deeper reasoning on complex electronics builds.
- `qwen/qwen3-32b` for code-heavy firmware and debugging tasks.
- `meta-llama/llama-4-scout-17b-16e-instruct` for uploaded component photos, schematics, circuit images, and vision work.

Create an API key in the Groq Console, then restart `npm run dev` after changing environment variables.

Future tools for images and schematics should be implemented inside the app, then exposed to the Groq agent as tool calls. Good next tools are `searchComponentImages`, `fetchDatasheet`, `generateBreadboardLayout`, `inspectUploadedSchematic`, and `createWiringDiagram`.

## Deploy to Vercel

1. Import this repository into Vercel.
2. Leave `GABIMARU_AI_MODE=local` for no-cost operation.
3. To use hosted Groq models, add `GABIMARU_AI_MODE=groq` and `GROQ_API_KEY` in Project Settings -> Environment Variables.
4. Optionally set `GROQ_BASE_URL`, `GROQ_MODEL`, and `GROQ_VISION_MODEL`.
5. Deploy.
