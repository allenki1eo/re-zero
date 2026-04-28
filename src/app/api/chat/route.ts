import { createAgentUIStreamResponse, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { NextResponse } from "next/server";
import { getGabimaruAgent, getGabimaruMode } from "@/lib/gabimaru-agent";
import { createLocalPlan } from "@/lib/sample-plan";
import { runSimulation } from "@/lib/simulation";

export const runtime = "nodejs";

type UnknownMessage = {
  role?: string;
  content?: unknown;
  parts?: Array<{ type?: string; text?: string }>;
};

function getLastUserPrompt(messages: unknown[]) {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message): message is UnknownMessage => {
      return typeof message === "object" && message !== null && (message as UnknownMessage).role === "user";
    });

  if (!lastUserMessage) {
    return "Build a sensor controlled LED project";
  }

  if (typeof lastUserMessage.content === "string") {
    return lastUserMessage.content;
  }

  const text = lastUserMessage.parts
    ?.filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();

  return text || "Build a sensor controlled LED project";
}

function inferBoard(prompt: string) {
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes("raspberry")) return "Raspberry Pi";
  if (lowerPrompt.includes("esp32")) return "ESP32";
  if (lowerPrompt.includes("pico")) return "Raspberry Pi Pico";
  if (lowerPrompt.includes("arduino")) return "Arduino Uno";
  return "Arduino Uno";
}

function toMermaidLabel(value: string) {
  return value.replace(/"/g, "'");
}

function createMermaidDiagram(plan: ReturnType<typeof createLocalPlan>) {
  const nodeLines = plan.circuit.nodes.map((node) => `  ${node.id}["${toMermaidLabel(node.label)}"]`);
  const linkLines = plan.circuit.links.map(
    (link) => `  ${link.from} -->|"${toMermaidLabel(link.label)}"| ${link.to}`
  );

  return ["flowchart LR", ...nodeLines, ...linkLines].join("\n");
}

function createLocalAnswer(prompt: string) {
  const plan = createLocalPlan({
    prompt,
    board: inferBoard(prompt),
    experience: "beginner"
  });
  const simulation = runSimulation(plan);
  const bom = plan.bom.map((item) => `- ${item.quantity}x ${item.name}: ${item.notes}`).join("\n");
  const wiring = plan.wiring
    .map((wire) => `- ${wire.from} -> ${wire.to} (${wire.signal}, ${wire.wireColor}): ${wire.notes}`)
    .join("\n");
  const steps = plan.buildSteps.map((step, index) => `${index + 1}. ${step}`).join("\n");
  const tests = plan.testPlan.map((step) => `- ${step}`).join("\n");
  const checks = plan.safetyChecks.map((step) => `- ${step}`).join("\n");
  const simulationNotes = simulation.checks
    .map((check) => `- ${check.passed ? "PASS" : "CHECK"}: ${check.label}`)
    .join("\n");

  return `I'm running in free local mode, so this answer does not spend hosted AI credits. Groq hosted models are available if you set \`GABIMARU_AI_MODE=groq\` and add \`GROQ_API_KEY\`.

## ${plan.title}

${plan.overview}

Difficulty: ${plan.difficulty}
Estimated time: ${plan.estimatedTime}
Board: ${plan.boards.join(", ")}

## Bill of materials

${bom}

## Wiring

${wiring}

## Circuit diagram

\`\`\`mermaid
${createMermaidDiagram(plan)}
\`\`\`

## Build steps

${steps}

## Firmware

\`\`\`${plan.firmware.language === "Python" ? "python" : "cpp"}
${plan.firmware.code}
\`\`\`

## Test plan

${tests}

## Safety checks

${checks}

## Simulation check

${simulationNotes}
`;
}

function createLocalChatResponse(messages: unknown[]) {
  const answer = createLocalAnswer(getLastUserPrompt(messages));
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const textId = "gabimaru-local-answer";
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: answer });
      writer.write({ type: "text-end", id: textId });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish", finishReason: "stop" });
    }
  });

  return createUIMessageStreamResponse({ stream });
}

export async function POST(request: Request) {
  const { messages } = (await request.json()) as { messages?: unknown[] };

  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "Missing chat messages." }, { status: 400 });
  }

  if (getGabimaruMode() === "local") {
    return createLocalChatResponse(messages);
  }

  try {
    return createAgentUIStreamResponse({
      agent: getGabimaruAgent(),
      uiMessages: messages
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gabimaru could not start.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
