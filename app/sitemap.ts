import type { MetadataRoute } from "next";

const SITE = process.env.SITE_URL || "https://astromatch.carecompass.me";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/natal/`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/love-language/`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/privacy/`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/terms/`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
