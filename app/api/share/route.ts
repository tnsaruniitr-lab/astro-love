import { NextResponse } from "next/server";
import { decodeReading } from "@/lib/astro/share";
import { encodeShare } from "@/lib/server/sharetoken";

// Mint an opaque, encrypted share token from a legacy reproducible token, so
// shared links stop carrying both people's birth data in cleartext. The client
// posts the token it already builds locally; we validate it decodes, then
// return the encrypted form to put in the URL.

export const dynamic = "force-dynamic";

const MAX = 4096;

export async function POST(req: Request) {
  let body: { r?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const r = typeof body.r === "string" ? body.r : "";
  if (!r || r.length > MAX || !decodeReading(r)) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }
  return NextResponse.json({ s: encodeShare(r) });
}
