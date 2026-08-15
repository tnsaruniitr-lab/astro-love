import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms of using AstroMatch: entertainment framing, purchases, refunds.",
};

const UPDATED = "16 July 2026";

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl text-cream mt-8 mb-2">{children}</h2>;
}

export default function TermsPage() {
  return (
    <main className="relative mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
      <TopNav />
      <article className="text-sm leading-relaxed text-haze">
        <h1 className="font-display text-3xl text-cream">Terms of use</h1>
        <p className="mt-1 text-xs text-haze/60">Last updated {UPDATED}</p>

        <H>What AstroMatch is — and isn&apos;t</H>
        <p>
          The planetary positions we show are real, computed astronomy. The interpretations built on
          them — scores, archetypes, readings — are <strong>for entertainment and
          self-reflection</strong>. They are not medical, psychological, legal or financial advice,
          and not a prediction or guarantee about any relationship. Decisions about your life and
          relationships are yours; a chart is a mirror to think with, not an instruction.
        </p>

        <H>Using the app</H>
        <p>
          You must be 16 or older. Enter another person&apos;s birth details only with their
          knowledge and consent. Don&apos;t abuse the service (scraping, flooding the API, reselling
          the content as your own).
        </p>

        <H>Purchases and refunds</H>
        <p>
          The full reading is a one-time digital purchase, delivered immediately after payment. By
          buying you agree to immediate delivery, which under EU rules means the standard 14-day
          withdrawal right ends once the content is delivered. That said: if something went wrong —
          double charge, the unlock never arrived, or the reading disappointed you — write to{" "}
          <a className="text-gold/85 hover:text-gold underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{" "}
          within 14 days and we will make it right, usually with a refund. Prices are shown at
          checkout; payment is handled by our payment provider.
        </p>

        <H>Restoring an unlock</H>
        <p>
          Your unlock lives on the device where you bought it and in the restore link from your
          payment confirmation. Clearing browser data removes it locally; the restore link brings it
          back.
        </p>

        <H>Liability</H>
        <p>
          To the extent the law allows, our liability for anything arising from the use of
          AstroMatch is limited to the amount you paid us. Nothing here limits liability that
          cannot legally be limited.
        </p>

        <H>Who we are</H>
        <p>
          AstroMatch is operated by Dreamport Technology Pvt Ltd (the team behind CareCompass).
          Payments are processed by our payment provider via pay.carecompass.me.
        </p>

        <H>Changes</H>
        <p>
          If these terms change materially, the date above changes with them, and continued use
          means acceptance. Questions:{" "}
          <a className="text-gold/85 hover:text-gold underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </article>
    </main>
  );
}
