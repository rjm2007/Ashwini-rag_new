import { NextResponse } from "next/server";

// Force this route to execute fresh on EVERY request — without this,
// Next.js's App Router statically caches GET route handlers by default,
// since reading process.env isn't recognized as a reason to stay dynamic.
// That caused this route to serve one frozen (and empty) response forever
// after its first evaluation, regardless of what was actually in .env.
export const dynamic = "force-dynamic";

// Server-side only — reads at container RUNTIME (not baked at build time),
// so this correctly picks up the root .env via docker-compose's env_file.
// Only ever returns the PUBLIC key and the assistant ID (a non-secret
// identifier). The Vapi PRIVATE key must never be referenced in this file
// or anywhere under frontend/ — it has no purpose here.
export async function GET() {
  // Only the public key is global/shared now — the assistant ID is
  // per-agent and comes from the backend's /vapi-agents list instead.
  const publicKey = process.env.VAPI_PUBLIC_KEY?.trim() || "";
  return NextResponse.json({ publicKey });
}
