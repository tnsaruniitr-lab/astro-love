import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** App icon: gold star-heart mark on the velvet-night gradient the app uses. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1b0f2b 0%, #140b1e 55%, #2a0f26 100%)",
          borderRadius: 96,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 300,
            color: "#e8c979",
          }}
        >
          ♡
        </div>
        <div
          style={{
            position: "absolute",
            top: 96,
            right: 110,
            fontSize: 96,
            color: "#f3e3b2",
          }}
        >
          ✦
        </div>
      </div>
    ),
    { ...size },
  );
}
