"use client";

/**
 * Tiny SVG sparkline of recent Readiness Scores (last ~14 days). Accent-tinted,
 * scaled to its own min/max so movement reads even in a narrow range.
 */
export function Sparkline({
  data,
  width = 140,
  height = 44,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-[10px] text-muted-foreground"
        style={{ width, height }}
      >
        Trend builds over days
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 4;
  const stepX = (width - pad * 2) / (data.length - 1);

  const points = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = points.map(([x, y]) => `${x},${y}`).join(" ");
  const area =
    `${pad},${height - pad} ` +
    points.map(([x, y]) => `${x},${y}`).join(" ") +
    ` ${width - pad},${height - pad}`;

  const last = points[points.length - 1];

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polygon points={area} fill="hsl(var(--module-readiness) / 0.12)" />
      <polyline
        points={line}
        fill="none"
        stroke="hsl(var(--module-readiness))"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={3} fill="hsl(var(--module-readiness))" />
    </svg>
  );
}
