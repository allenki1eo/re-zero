import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const key = (process.env.GROQ_API_KEY ?? "").trim();
  const placeholders = ["your_groq_api_key"];

  let status: "ok" | "missing" | "placeholder";
  if (!key) {
    status = "missing";
  } else if (placeholders.includes(key)) {
    status = "placeholder";
  } else {
    status = "ok";
  }

  return NextResponse.json({
    gabimaru_ai_mode: process.env.GABIMARU_AI_MODE ?? "local",
    groq_api_key: status,
    key_preview: status === "ok" ? `${key.slice(0, 6)}...` : null,
    groq_model: process.env.GROQ_MODEL ?? "openai/gpt-oss-20b",
    groq_vision_model: process.env.GROQ_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct",
    groq_base_url: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
    hosted_note: "Groq hosted models require a Groq API key. Keep GABIMARU_AI_MODE=local for no-key local planning."
  });
}
