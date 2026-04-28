import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const key = (
    process.env.HF_TOKEN ??
    process.env.HUGGING_FACE_HUB_TOKEN ??
    process.env.HUGGINGFACE_API_KEY ??
    ""
  ).trim();
  const placeholders = ["your_huggingface_token"];

  let status: "ok" | "missing" | "placeholder";
  if (!key) {
    status = "missing";
  } else if (placeholders.includes(key)) {
    status = "placeholder";
  } else {
    status = "ok";
  }

  return NextResponse.json({
    hf_token: status,
    key_preview: status === "ok" ? `${key.slice(0, 6)}...` : null,
    hf_model: process.env.HF_MODEL ?? "Qwen/Qwen3-Coder-30B-A3B-Instruct:fastest",
    hf_fallback_model: process.env.HF_FALLBACK_MODEL ?? "(not set)",
    hf_base_url: process.env.HF_BASE_URL ?? "https://router.huggingface.co/v1"
  });
}
