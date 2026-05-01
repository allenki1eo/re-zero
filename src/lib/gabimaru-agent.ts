import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";
import { createLocalPlan } from "@/lib/sample-plan";
import { runSimulation } from "@/lib/simulation";

const openRouterBaseUrl = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
const defaultOpenRouterModel = "qwen/qwen3-coder:free";

const hardwareTools = {
  createHardwareBuildPlan: tool({
    description:
      "Create a complete electronics project plan with bill of materials, wiring, a circuit diagram layout, firmware, safety checks, and bench tests.",
    inputSchema: z.object({
      projectIdea: z.string().min(3).describe("The hardware project the user wants to build."),
      board: z.string().default("Arduino Uno").describe("Preferred board, such as Arduino Uno, ESP32, Raspberry Pi, or Pico."),
      experience: z.enum(["beginner", "intermediate", "advanced"]).default("beginner")
    }),
    execute: async ({ projectIdea, board, experience }) => {
      const plan = createLocalPlan({ prompt: projectIdea, board, experience });
      return {
        plan,
        simulation: runSimulation(plan)
      };
    }
  }),
  runFirmwareSimulation: tool({
    description:
      "Run a lightweight static bench simulation against the generated firmware and wiring assumptions.",
    inputSchema: z.object({
      projectIdea: z.string().min(3),
      board: z.string().default("Arduino Uno"),
      experience: z.enum(["beginner", "intermediate", "advanced"]).default("beginner")
    }),
    execute: async ({ projectIdea, board, experience }) => {
      const plan = createLocalPlan({ prompt: projectIdea, board, experience });
      return runSimulation(plan);
    }
  })
};

let gabimaruAgent: ToolLoopAgent<never, typeof hardwareTools> | null = null;
let cachedKey = "";

function getOpenRouterApiKey() {
  return (process.env.OPENROUTER_API_KEY ?? "").trim();
}

export function getGabimaruMode() {
  const mode = process.env.GABIMARU_AI_MODE?.trim().toLowerCase();
  return mode === "openrouter" ? "openrouter" : "local";
}

export function getGabimaruAgent() {
  const apiKey = getOpenRouterApiKey();
  const modelId = process.env.OPENROUTER_MODEL ?? defaultOpenRouterModel;
  const cacheKey = `${apiKey}:${openRouterBaseUrl}:${modelId}`;

  const placeholders = ["your_openrouter_api_key"];
  if (!apiKey || placeholders.includes(apiKey)) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured. Create an OpenRouter API key, add it to your Vercel environment variables (or .env.local for local dev), then redeploy."
    );
  }

  if (gabimaruAgent && cachedKey === cacheKey) {
    return gabimaruAgent;
  }

  const openrouter = createOpenAICompatible({
    name: "openrouter",
    baseURL: openRouterBaseUrl,
    apiKey,
    includeUsage: true
  });

  gabimaruAgent = new ToolLoopAgent({
    id: "gabimaru",
    model: openrouter(modelId),
    tools: hardwareTools,
    stopWhen: stepCountIs(6),
    temperature: 0.25,
    instructions:
      "You are Gabimaru, a precise electronics build agent. Help people build Arduino, Raspberry Pi, ESP32, Pico, sensor, motor, display, robotics, and IoT projects. When a user asks for a project, call createHardwareBuildPlan before answering. Explain where to connect wires, what the diagram means, what code to run, and how to validate it. Keep safety conservative: no mains voltage, no unsafe battery charging, no high-current motor wiring without a proper driver and separate supply. Be direct, practical, and friendly."
  });
  cachedKey = cacheKey;

  return gabimaruAgent;
}

export function getGabimaruModelLabel() {
  return process.env.OPENROUTER_MODEL ?? defaultOpenRouterModel;
}
