import { NextResponse } from "next/server";

// Server-side only — reads at container RUNTIME (not baked at build time),
// so this correctly picks up the root .env via docker-compose's env_file.
// Only ever returns the PUBLIC key and the assistant ID (a non-secret
// identifier). The Vapi PRIVATE key must never be referenced in this file
// or anywhere under frontend/ — it has no purpose here.
export async function GET() {
  const publicKey = process.env.VAPI_PUBLIC_KEY || "";
  const assistantId = process.env.VAPI_ASSISTANT_ID || "";
  return NextResponse.json({ publicKey, assistantId });
}
