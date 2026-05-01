import { NextResponse } from "next/server";
import { createLocalPlan } from "@/lib/sample-plan";
import type { GenerateRequest, GenerateResponse, HardwarePlan } from "@/types/hardware";

export const runtime = "nodejs";

const hardwarePlanSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "overview",
    "difficulty",
    "estimatedTime",
    "boards",
    "bom",
    "wiring",
    "power",
    "buildSteps",
    "safetyChecks",
    "firmware",
    "testPlan",
    "simulator",
    "circuit"
  ],
  properties: {
    title: { type: "string" },
    overview: { type: "string" },
    difficulty: { type: "string", enum: ["Beginner", "Intermediate", "Advanced"] },
    estimatedTime: { type: "string" },
    boards: { type: "array", items: { type: "string" } },
    bom: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "quantity", "notes"],
        properties: {
          name: { type: "string" },
          quantity: { type: "integer" },
          notes: { type: "string" }
        }
      }
    },
    wiring: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["from", "to", "signal", "wireColor", "notes"],
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          signal: { type: "string" },
          wireColor: { type: "string" },
          notes: { type: "string" }
        }
      }
    },
    power: { type: "string" },
    buildSteps: { type: "array", items: { type: "string" } },
    safetyChecks: { type: "array", items: { type: "string" } },
    firmware: {
      type: "object",
      additionalProperties: false,
      required: ["platform", "language", "filename", "code"],
      properties: {
        platform: { type: "string", enum: ["Arduino", "Raspberry Pi", "ESP32", "MicroPython"] },
        language: { type: "string", enum: ["C++", "Python", "MicroPython"] },
        filename: { type: "string" },
        code: { type: "string" }
      }
    },
    testPlan: { type: "array", items: { type: "string" } },
    simulator: {
      type: "object",
      additionalProperties: false,
      required: ["serialExpectation", "validationNotes"],
      properties: {
        serialExpectation: { type: "array", items: { type: "string" } },
        validationNotes: { type: "array", items: { type: "string" } }
      }
    },
    circuit: {
      type: "object",
      additionalProperties: false,
      required: ["nodes", "links"],
      properties: {
        nodes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label", "kind", "x", "y"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              kind: { type: "string", enum: ["board", "sensor", "actuator", "power", "passive", "module"] },
              x: { type: "number" },
              y: { type: "number" }
            }
          }
        },
        links: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["from", "to", "label", "color"],
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              label: { type: "string" },
              color: { type: "string" }
            }
          }
        }
      }
    }
  }
} as const;

async function generateWithOpenRouter(request: GenerateRequest): Promise<HardwarePlan> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
  const model = process.env.OPENROUTER_GENERATE_MODEL ?? "qwen/qwen3-next-80b-a3b-instruct:free";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a careful electronics mentor. Create practical hardware project plans with safe wiring, beginner-friendly build steps, code, and a circuit layout. Avoid mains voltage. Prefer common parts. Return only JSON matching the requested schema."
        },
        {
          role: "user",
          content: `Project request: ${request.prompt}\nPreferred board: ${request.board}\nBuilder experience: ${request.experience}\nUse x and y coordinates from 5 to 95 for each circuit node.`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "hardware_project_plan",
          strict: true,
          schema: hardwarePlanSchema
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const outputText = payload.choices?.[0]?.message?.content ?? null;

  if (!outputText) {
    throw new Error("OpenRouter response did not include output text.");
  }

  return JSON.parse(outputText) as HardwarePlan;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<GenerateRequest>;
  const payload: GenerateRequest = {
    prompt: body.prompt?.trim() || "Build a sensor controlled LED project",
    board: body.board?.trim() || "Arduino Uno",
    experience: body.experience?.trim() || "beginner"
  };

  try {
    const plan = await generateWithOpenRouter(payload);
    return NextResponse.json<GenerateResponse>({ plan, source: "openai" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error.";
    return NextResponse.json<GenerateResponse>({
      plan: createLocalPlan(payload),
      source: "local",
      warning: message
    });
  }
}
