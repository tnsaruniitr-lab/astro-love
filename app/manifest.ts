import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AstroMatch — Love Compatibility",
    short_name: "AstroMatch",
    description:
      "Math-based love compatibility from real synastry — every point explained.",
    start_url: "/",
    display: "standalone",
    background_color: "#140b1e",
    theme_color: "#140b1e",
    icons: [
      { src: "/icon/", sizes: "512x512", type: "image/png" },
      { src: "/icon/", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
