# Re Zero Hardware Agent

A Vercel-ready web app for designing electronics projects with Arduino, Raspberry Pi, ESP32, sensors, actuators, wiring diagrams, firmware, and a lightweight simulator.

## What it does

- Turns a project idea into a build plan.
- Shows a circuit diagram and a wiring table.
- Generates firmware for Arduino-style sketches or Raspberry Pi Python.
- Runs a browser-side simulation check for common code and wiring mistakes.
- Works without an API key using local fallback plans.
- Uses Kimi K2.6 through Moonshot's OpenAI-compatible API when `MOONSHOT_API_KEY` is configured.
- Adds Gabimaru, a chat-first hardware agent with tool calls for project planning and simulation checks.
- Includes a Chat SDK bot scaffold in `src/lib/gabimaru-chat-sdk.ts` so Slack, Telegram, GitHub, or other adapters can share the same Gabimaru identity later.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

1. Import this repository into Vercel.
2. Add `MOONSHOT_API_KEY` in Project Settings -> Environment Variables.
3. Optionally set `KIMI_MODEL` to another Moonshot-compatible model.
4. Deploy.
