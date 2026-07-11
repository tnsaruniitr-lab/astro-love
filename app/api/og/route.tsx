import { ImageResponse } from "next/og";
import { computeChart } from "@/lib/astro/chart";
import { computeSynastry } from "@/lib/astro/synastry";
import { coupleArchetype } from "@/lib/astro/insights";
import { decodeReading } from "@/lib/astro/share";
import { decodeShare } from "@/lib/server/sharetoken";
import type { BirthFormValues } from "@/components/BirthFields";
import type { ChartInput } from "@/lib/astro/types";

// Dynamic per-reading Open Graph card. Every shared link now unfurls as a
// scroll-stopping image (names + score + band + couple type) in WhatsApp,
// iMessage, Telegram and X — instead of bare text. This is the acquisition
// loop the whole share feature depends on.
//
// Node runtime (not edge): decodeShare uses node:crypto to open the encrypted
// ?s= token, and the astronomy engine runs here to recompute the score.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const W = 1200;
const H = 630;

function toInput(f: BirthFormValues): ChartInput {
  const p = f.place!;
  return {
    name: f.name || undefined, place: p.label,
    year: f.year, month: f.month, day: f.day, hour: f.hour, minute: f.minute,
    timeKnown: f.timeKnown, lat: p.lat, lon: p.lon, tz: p.tz,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const s = url.searchParams.get("s");
  const legacy = s ? decodeShare(s) : url.searchParams.get("r");
  const decoded = legacy ? decodeReading(legacy) : null;

  let names = { a: "You", b: "Them" };
  let score = "";
  let band = "Math-based love compatibility";
  let archetype = "Every point explained";

  if (decoded?.a.place && decoded?.b.place) {
    const A = decoded.a, B = decoded.b;
    const syn = computeSynastry(
      computeChart(toInput(A)), computeChart(toInput(B)),
      A.name || "Person A", B.name || "Person B",
    );
    names = syn.names;
    score = String(syn.score);
    band = syn.band.label;
    archetype = coupleArchetype(syn).name;
  }

  // Satori (the engine behind ImageResponse) only speaks a subset of CSS and
  // only ships a Latin font by default: a sized radial-gradient crashes its
  // parser, and any non-Latin glyph triggers a network font fetch that fails
  // offline. So: a plain linear-gradient with an accent bar, and text only.
  // (Non-Latin names fall back to the text title/description in the metadata.)
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", color: "#f4e0e3",
          background: "linear-gradient(135deg, #3a1020 0%, #1c0a14 55%, #150812 100%)",
        }}
      >
        <div style={{ display: "flex", width: 120, height: 4, background: "#be2e50", borderRadius: 4, marginBottom: 34 }} />
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 8, color: "#e7ad94", textTransform: "uppercase" }}>
          Astro-Love
        </div>
        <div style={{ display: "flex", fontSize: 66, fontStyle: "italic", marginTop: 22, textAlign: "center" }}>
          {`${names.a} & ${names.b}`}
        </div>
        {score && (
          <div style={{ display: "flex", alignItems: "baseline", marginTop: 6 }}>
            <span style={{ fontSize: 200, fontWeight: 700, color: "#f3c9b0", lineHeight: 1 }}>{score}</span>
            <span style={{ fontSize: 40, color: "#c99aa6", marginLeft: 14 }}>/ 100</span>
          </div>
        )}
        <div style={{ display: "flex", fontSize: 42, color: "#f3c9b0", fontStyle: "italic", marginTop: score ? 8 : 30 }}>
          {band}
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#e7ad94", marginTop: 18 }}>
          {score ? `Couple type: ${archetype}` : archetype}
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
