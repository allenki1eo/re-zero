import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const key = (process.env.MOONSHOT_API_KEY ?? process.env.KIMI_API_KEY ?? "").trim();
  const placeholders = ["your_actual_moonshot_key", "your_platform_kimi_ai_api_key"];

  let status: "ok" | "missing" | "placeholder";
  if (!key) {
    status = "missing";
  } else if (placeholders.includes(key)) {
    status = "placeholder";
  } else {
    status = "ok";
  }

  return NextResponse.json({
    moonshot_api_key: status,
    key_preview: status === "ok" ? `${key.slice(0, 6)}…` : null,
    kimi_model: process.env.KIMI_MODEL ?? "(not set, using default)",
    moonshot_base_url: process.env.MOONSHOT_BASE_URL ?? "(not set, using default)"
  });
}
