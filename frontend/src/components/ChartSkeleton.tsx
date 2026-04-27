// Skeleton placeholders for analytics charts and stat cards.
// Shimmer animation is defined in globals.css (.skeleton, @keyframes shimmer).

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton${className ? ` ${className}` : ""}`} style={style} />;
}

export function StatCardsSkeleton() {
  return (
    <div className="stat-grid" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="stat-card" style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <Skeleton style={{ width: "60%", height: 36, borderRadius: 6 }} />
          <Skeleton style={{ width: "80%", height: 14, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

// Horizontal bars of varying widths mimicking a bar chart
export function BarChartSkeleton() {
  const widths = ["85%", "60%", "75%", "45%", "90%", "55%"];
  return (
    <div aria-hidden="true" style={{ width: "100%", height: 280, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 12, padding: "16px 0 8px" }}>
      {widths.map((w, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Skeleton style={{ width: 32, height: 12, borderRadius: 3, flexShrink: 0 }} />
          <Skeleton style={{ width: w, height: 28, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

// SVG wavy line placeholder mimicking a line chart
export function LineChartSkeleton() {
  return (
    <div aria-hidden="true" style={{ width: "100%", height: 280, position: "relative", overflow: "hidden" }}>
      <Skeleton style={{ position: "absolute", inset: 0, borderRadius: 8 }} />
      <svg
        viewBox="0 0 600 200"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.25 }}
      >
        <polyline
          points="0,160 80,120 160,140 240,80 320,100 400,60 480,90 600,50"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
