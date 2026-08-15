"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FB_PIXEL_ID } from "@/lib/meta";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";

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
  const firstRun = useRef(true);

  useEffect(() => {
    const sync = () => setGranted(readConsent() === "granted");
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false; // the inline snippet already counted this one
      return;
    }
    if (!granted) return;
    window.fbq?.("track", "PageView");
  }, [pathname, search, granted]);

  if (!FB_PIXEL_ID || !granted) return null;

  return (
    <>
      <Script id="fb-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${FB_PIXEL_ID}');
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
