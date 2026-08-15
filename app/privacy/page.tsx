import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import ClearDataButton from "@/components/ClearDataButton";
import { ConsentSettings } from "@/components/Consent";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What AstroMatch stores, where your birth data lives, and how to erase it.",
};

const UPDATED = "15 August 2026";

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl text-cream mt-8 mb-2">{children}</h2>;
}

export default function PrivacyPage() {
  return (
    <main className="relative mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
      <TopNav />
      <article className="text-sm leading-relaxed text-haze">
        <h1 className="font-display text-3xl text-cream">Privacy</h1>
        <p className="mt-1 text-xs text-haze/60">Last updated {UPDATED}</p>

        <p className="mt-5">
          AstroMatch is built so that the most sensitive thing you give it — birth details — stays
          with you. This page says plainly what is processed, where, and how to erase it.
        </p>

        <H>What you enter, and where it lives</H>
        <p>
          Birth details (date, time, place, an optional first name) for you and a partner are used
          to compute charts <strong>in your browser</strong>. Your latest reading and settings are
          saved in this browser&apos;s local storage — not in an account, and not in a database of
          ours. Closing your account isn&apos;t a thing here because there is no account.
        </p>

        <H>What reaches our server</H>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>AI-written readings.</strong> When a paid reading is written, the computed chart
            facts (planet positions, aspects, first names if you entered them) are sent to our
            server and on to Anthropic&apos;s API, which writes the text. Generated text is cached so
            it isn&apos;t re-generated on every visit.
          </li>
          <li>
            <strong>Payments.</strong> Checkout happens on our payment service (CareCompass). We
            verify a payment reference and keep a purchase record (reference, product, and the
            contact your payment provider passes along, if any) so we can restore unlocks and
            handle refunds. We never see card numbers.
          </li>
          <li>
            <strong>Share links.</strong> A shared reading link carries the data encrypted; only
            people you give the link to can open it.
          </li>
          <li>
            <strong>Usage counts.</strong> We count anonymous product events (a reading was
            computed, a card was opened). These use no cookies and no advertising identifiers.
          </li>
          <li>
            <strong>Advertising measurement — only if you accept.</strong> If you accept
            advertising cookies, we load Meta&apos;s pixel and report a few milestones (a page
            view, a result viewed, a quiz finished, a checkout started, a completed purchase) to
            Meta so we can tell which ads actually work. We also set a random id of our own
            (<code>am_vid</code>) so those reports describe one visitor rather than a guess from
            IP address and browser string; it is a random number, tied to nothing else about you.
            The purchase is reported from our server;
            where your payment provider passes us an email or phone number, it is hashed before it
            is sent — Meta receives the hash, never the address itself. Decline and none of this
            runs.
          </li>
        </ul>

        <H>Your partner&apos;s details</H>
        <p>
          A compatibility reading involves someone else&apos;s birth data. Enter it only with their
          knowledge and consent, and use share links thoughtfully — the reading names both of you.
        </p>

        <H>Advertising cookies</H>
        <p>
          In the EU, EEA, UK and Switzerland these stay off until you accept — you&apos;ll see a
          banner asking. Elsewhere they are on by default and you can switch them off here.
          Either way this control is the whole story: withdrawing expires Meta&apos;s{" "}
          <code>_fbp</code>/<code>_fbc</code> identifiers on this device and stops the
          server-side reporting too.
        </p>
        <ConsentSettings />

        <H>Erasing your data</H>
        <p>
          Everything on this device can be removed right now:
        </p>
        <ClearDataButton />
        <p className="mt-4">
          To have a purchase record deleted (or for any privacy question), write to{" "}
          <a className="text-gold/85 hover:text-gold underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          We answer within 30 days.
        </p>

        <H>Who we are</H>
        <p>
          AstroMatch is operated by Dreamport Technology Pvt Ltd (the team behind CareCompass).
          Questions about this policy:{" "}
          <a className="text-gold/85 hover:text-gold underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </article>
    </main>
  );
}
