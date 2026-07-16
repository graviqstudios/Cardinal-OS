import { ImageResponse } from "next/og";

// Node runtime per project rule (never edge). next/og runs fine on Node.
export const runtime = "nodejs";

export const alt = "Cardinal OS - the all-in-one app for students";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Branded social card, generated at build/request time. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#14100B",
          color: "#F2E9DB",
          padding: "72px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* warm accent glow */}
        <div
          style={{
            position: "absolute",
            top: -160,
            left: 360,
            width: 820,
            height: 560,
            display: "flex",
            background:
              "radial-gradient(ellipse at center, rgba(203,75,51,0.22), transparent 68%)",
          }}
        />

        {/* left: brand + headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="46" height="46" viewBox="0 0 100 100">
              <path d="M50 6 L61 53 L39 53 Z" fill="#CB4B33" />
              <path d="M50 86 L61 53 L39 53 Z" fill="#C9BBA3" />
            </svg>
            <span style={{ fontSize: 40, letterSpacing: -1 }}>Cardinal</span>
            <span style={{ fontSize: 20, letterSpacing: 2, color: "#897C68", paddingTop: 8 }}>OS</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 66, lineHeight: 1.04, letterSpacing: -1.5, maxWidth: 700 }}>
              The all-in-one app for students.
            </div>
            <div style={{ fontSize: 28, color: "#B6A892", maxWidth: 640, lineHeight: 1.4 }}>
              Habits, goals, money, body and mind, with AI woven through and one honest number to orient by.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, color: "#897C68" }}>
            <span style={{ display: "flex", width: 10, height: 10, borderRadius: 5, background: "#CB4B33" }} />
            One compass for everything
          </div>
        </div>

        {/* right: Life Score ring */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 360, position: "relative" }}>
          <svg width="320" height="320" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="60" stroke="rgba(242,233,219,0.12)" strokeWidth="9" fill="none" />
            <circle
              cx="70" cy="70" r="60" stroke="#CB4B33" strokeWidth="9" strokeLinecap="round" fill="none"
              pathLength={1000} strokeDasharray="784 1000" transform="rotate(-90 70 70)"
            />
          </svg>
          <div
            style={{
              position: "absolute",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 96, lineHeight: 1 }}>784</span>
            <span style={{ fontSize: 22, color: "#897C68", marginTop: 6 }}>Life Score · of 1000</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
