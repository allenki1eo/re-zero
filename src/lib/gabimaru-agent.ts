import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";
import { createLocalPlan } from "@/lib/sample-plan";
import { runSimulation } from "@/lib/simulation";

const groqBaseUrl = process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1";
const defaultGroqModel = "openai/gpt-oss-20b";

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

function getGroqApiKey() {
  return (process.env.GROQ_API_KEY ?? "").trim();
}

export function getGabimaruMode() {
  const mode = process.env.GABIMARU_AI_MODE?.trim().toLowerCase();
  return mode === "groq" ? "groq" : "local";
}

export function getGabimaruAgent() {
  const apiKey = getGroqApiKey();
  const modelId = process.env.GROQ_MODEL ?? defaultGroqModel;
  const cacheKey = `${apiKey}:${groqBaseUrl}:${modelId}`;

  const placeholders = ["your_groq_api_key"];
  if (!apiKey || placeholders.includes(apiKey)) {
    throw new Error(
      "GROQ_API_KEY is not configured. Create a Groq API key, add it to your Vercel environment variables (or .env.local for local dev), then redeploy."
    );
  }

  if (gabimaruAgent && cachedKey === cacheKey) {
    return gabimaruAgent;
  }

  const groq = createOpenAICompatible({
    name: "groq",
    baseURL: groqBaseUrl,
    apiKey,
    includeUsage: true
  });

  gabimaruAgent = new ToolLoopAgent({
    id: "gabimaru",
    model: groq(modelId),
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
  return process.env.GROQ_MODEL ?? defaultGroqModel;
}
