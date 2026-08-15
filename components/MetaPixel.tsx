"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FB_PIXEL_ID } from "@/lib/meta";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";
import { getVisitorId } from "@/lib/visitor";

/** Meta pixel loader + PageView reporter.
 *
 *  Two things the default snippet gets wrong in an App Router app:
 *   1. Client-side navigations don't reload the document, so the snippet's own
 *      PageView only ever counts the first route — the rest are fired here.
 *   2. That first PageView is fired by the snippet, so the effect must skip its
 *      own initial run or every landing counts twice.
 *
 *  Nothing is injected until marketing consent is granted (GDPR: the EU locales
 *  are a primary market). Consent is read from a cookie so the server-side CAPI
 *  routes honour the same decision.
 */
export default function MetaPixel() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [granted, setGranted] = useState(false);
  const [vid, setVid] = useState<string | null>(null);
  // The last path already counted. Seeded (not fired) the first time the pixel
  // becomes live, because the inline snippet counts that view itself.
  const counted = useRef<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const ok = readConsent() === "granted";
      setGranted(ok);
      // Minted here, before the snippet renders, so the pixel's init carries
      // the same visitor id the server sends as external_id.
      setVid(ok ? getVisitorId() : null);
    };
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!granted) return;
    const key = `${pathname}?${search}`;
    // Seed on the first granted render: that view belongs to the snippet.
    // A plain "skip the first run" guard is NOT enough here — `granted` is a
    // dependency, so the pre-consent render burns the skip and the
    // consent-flip render then races the snippet to fire the same PageView.
    // Keying on the path makes the outcome independent of which wins.
    if (counted.current === null || counted.current === key) {
      counted.current = key;
      return;
    }
    counted.current = key;
    window.fbq?.("track", "PageView");
  }, [pathname, search, granted]);

  if (!FB_PIXEL_ID || !granted) return null;

  // Advanced matching. Meta hashes this in the browser; the server hashes the
  // same raw value, so the two legs resolve to one visitor. Belt-and-braces
  // sanitising: this string is interpolated into an inline script.
  const safeVid = vid && /^[A-Za-z0-9-]{1,64}$/.test(vid) ? vid : null;
  const initArgs = safeVid
    ? `'${FB_PIXEL_ID}',{external_id:'${safeVid}'}`
    : `'${FB_PIXEL_ID}'`;

  return (
    <>
      <Script id="fb-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init',${initArgs});
fbq('track','PageView');
      `}</Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          alt=""
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
