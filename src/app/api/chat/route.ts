import { createAgentUIStreamResponse } from "ai";
import { NextResponse } from "next/server";
import { getGabimaruAgent } from "@/lib/gabimaru-agent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { messages } = (await request.json()) as { messages?: unknown[] };

  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "Missing chat messages." }, { status: 400 });
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
