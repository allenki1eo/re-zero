import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import { createLocalPlan } from "@/lib/sample-plan";
import { runSimulation } from "@/lib/simulation";

const openRouterBaseUrl = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
const defaultOpenRouterModel = "qwen/qwen3-coder:free";

type UnknownMessage = {
  role?: string;
  content?: unknown;
  parts?: Array<{ type?: string; text?: string }>;
};

function getLastUserPrompt(messages: unknown[]): string {
  const lastUserMessage = [...messages]
    .reverse()
    .find((m): m is UnknownMessage => typeof m === "object" && m !== null && (m as UnknownMessage).role === "user");

  if (!lastUserMessage) return "Build a sensor controlled LED project";

  if (typeof lastUserMessage.content === "string") return lastUserMessage.content;

  const text = lastUserMessage.parts
    ?.filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("\n")
    .trim();

  return text || "Build a sensor controlled LED project";
}

function inferBoard(prompt: string) {
  const p = prompt.toLowerCase();
  if (p.includes("raspberry")) return "Raspberry Pi";
  if (p.includes("esp32")) return "ESP32";
  if (p.includes("pico")) return "Raspberry Pi Pico";
  return "Arduino Uno";
}

function getOpenRouterApiKey() {
  return (process.env.OPENROUTER_API_KEY ?? "").trim();
}

export function getGabimaruMode() {
  const mode = process.env.GABIMARU_AI_MODE?.trim().toLowerCase();
  return mode === "openrouter" ? "openrouter" : "local";
}

export function getGabimaruModelLabel() {
  return process.env.OPENROUTER_MODEL ?? defaultOpenRouterModel;
}

export function streamGabimaruAnswer(messages: unknown[]) {
  const apiKey = getOpenRouterApiKey();
  const modelId = process.env.OPENROUTER_MODEL ?? defaultOpenRouterModel;

  const placeholders = ["your_openrouter_api_key"];
  if (!apiKey || placeholders.includes(apiKey)) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured. Create an OpenRouter API key, add it to your Vercel environment variables (or .env.local for local dev), then redeploy."
    );
  }

  const openrouter = createOpenAICompatible({
    name: "openrouter",
    baseURL: openRouterBaseUrl,
    apiKey,
    includeUsage: true
  });

  const prompt = getLastUserPrompt(messages);
  const plan = createLocalPlan({ prompt, board: inferBoard(prompt), experience: "beginner" });
  const simulation = runSimulation(plan);

  const planContext = JSON.stringify({ plan, simulation }, null, 2);

  return streamText({
    model: openrouter(modelId),
    system:
      "You are Gabimaru, a precise electronics build agent. You help people build Arduino, Raspberry Pi, ESP32, Pico, sensor, motor, display, robotics, and IoT projects. Keep safety conservative: no mains voltage, no unsafe battery charging, no high-current motor wiring without a proper driver and separate supply. Be direct, practical, and friendly. Format your response in markdown.",
    messages: [
      {
        role: "user",
        content: `User request: ${prompt}\n\nA hardware plan and simulation have already been generated for this project:\n\`\`\`json\n${planContext}\n\`\`\`\n\nUsing this plan, provide a clear explanation covering: what to buy, how to wire it up, the circuit diagram in Mermaid format, the firmware code, build steps, and safety checks. Explain what each part of the plan means in practical terms.`
      }
    ]
  });
}
