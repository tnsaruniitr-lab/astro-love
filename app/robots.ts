import type { MetadataRoute } from "next";

const SITE = process.env.SITE_URL || "https://astromatch.carecompass.me";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // API routes are for the app, not crawlers; /pay/return is transactional.
        disallow: ["/api/", "/pay/"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
