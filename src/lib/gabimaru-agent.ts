import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";
import { createLocalPlan } from "@/lib/sample-plan";
import { runSimulation } from "@/lib/simulation";

const huggingFaceBaseUrl = process.env.HF_BASE_URL ?? "https://router.huggingface.co/v1";
const defaultHuggingFaceModel = "Qwen/Qwen3-Coder-30B-A3B-Instruct:fastest";

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

function getHuggingFaceToken() {
  return (
    process.env.HF_TOKEN ??
    process.env.HUGGING_FACE_HUB_TOKEN ??
    process.env.HUGGINGFACE_API_KEY ??
    ""
  ).trim();
}

export function getGabimaruAgent() {
  const apiKey = getHuggingFaceToken();
  const modelId = process.env.HF_MODEL ?? defaultHuggingFaceModel;
  const cacheKey = `${apiKey}:${huggingFaceBaseUrl}:${modelId}`;

  const placeholders = ["your_huggingface_token"];
  if (!apiKey || placeholders.includes(apiKey)) {
    throw new Error(
      "HF_TOKEN is not configured. Create a Hugging Face access token, enable Inference Providers, then add it to your Vercel environment variables (or .env.local for local dev) and redeploy."
    );
  }

  if (gabimaruAgent && cachedKey === cacheKey) {
    return gabimaruAgent;
  }

  const huggingFace = createOpenAICompatible({
    name: "huggingface",
    baseURL: huggingFaceBaseUrl,
    apiKey,
    includeUsage: true
  });

  gabimaruAgent = new ToolLoopAgent({
    id: "gabimaru",
    model: huggingFace(modelId),
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
  return process.env.HF_MODEL ?? defaultHuggingFaceModel;
}
