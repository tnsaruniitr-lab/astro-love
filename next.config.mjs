/** @type {import('next').NextConfig} */

// Two deploy targets, one config:
//  - Default build → a normal Next.js server (for Railway / any Node host).
//    Supports SSR + future API routes (e.g. the Claude AI layer in M3).
//  - STATIC_EXPORT=1 → a static export for GitHub Pages (no server). The
//    engine runs in the browser either way, so both work today.
const isExport = process.env.STATIC_EXPORT === "1";
const basePath = (isExport && process.env.NEXT_PUBLIC_BASE_PATH) || "";

// A static export DROPS every /api route — including /api/pay/verify and
// /api/reading — silently degrading the paywall to client-only (i.e. none)
// and killing payment verification. Refuse unless explicitly acknowledged.
if (isExport && process.env.ALLOW_INSECURE_STATIC !== "1") {
  throw new Error(
    "STATIC_EXPORT=1 would ship WITHOUT /api/pay/verify and /api/reading — the paywall and payment verification stop working. " +
      "If you really want a static demo build, set ALLOW_INSECURE_STATIC=1 as well.",
  );
}

const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  images: { unoptimized: true },
  ...(isExport
    ? { output: "export", basePath, assetPrefix: basePath || undefined }
    : {}),
};

export default nextConfig;
