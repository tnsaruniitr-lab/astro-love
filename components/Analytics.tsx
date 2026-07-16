"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

/** Counts a page_view per route change. Mounted once in the root layout. */
export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    // Transactional pages report themselves with richer states.
    if (pathname.startsWith("/pay/")) return;
    track("page_view");
  }, [pathname]);

  return null;
}
