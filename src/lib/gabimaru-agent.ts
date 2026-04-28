import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";
import { createLocalPlan } from "@/lib/sample-plan";
import { runSimulation } from "@/lib/simulation";

const moonshotBaseUrl = process.env.MOONSHOT_BASE_URL ?? "https://api.moonshot.ai/v1";
const defaultKimiModel = "kimi-k2.6";

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

function getMoonshotKey() {
  return (process.env.MOONSHOT_API_KEY ?? process.env.KIMI_API_KEY ?? "").trim();
}

export function getGabimaruAgent() {
  const apiKey = getMoonshotKey();
  const modelId = process.env.KIMI_MODEL ?? defaultKimiModel;
  const cacheKey = `${apiKey}:${modelId}`;

  if (!apiKey || apiKey === "your_actual_moonshot_key") {
    throw new Error(
      "MOONSHOT_API_KEY is required. Create an API key on platform.kimi.ai, add it to .env.local, then restart the dev server."
    );
  }

  if (gabimaruAgent && cachedKey === cacheKey) {
    return gabimaruAgent;
  }

  const moonshot = createOpenAICompatible({
    name: "moonshot",
    baseURL: moonshotBaseUrl,
    apiKey,
    includeUsage: true,
    transformRequestBody: (body) => ({
      ...body,
      thinking: { type: process.env.KIMI_THINKING ?? "disabled" }
    })
  });

  gabimaruAgent = new ToolLoopAgent({
    id: "gabimaru",
    model: moonshot(modelId),
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
  return process.env.KIMI_MODEL ?? defaultKimiModel;
}
