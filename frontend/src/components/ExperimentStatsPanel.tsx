"use client";

import { useEffect, useState } from "react";
import { getExperimentStats, ExperimentStats } from "@/lib/experiments";

export function ExperimentStatsPanel() {
  const [stats, setStats] = useState<ExperimentStats[]>([]);

  useEffect(() => {
    setStats(getExperimentStats());
  }, []);

  if (stats.every((s) => s.variants.every((v) => v.impressions === 0))) {
    return (
      <p className="empty-state" style={{ paddingTop: 16 }}>
        No experiment data yet. Variants are tracked as users visit the app.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {stats.map((exp) => (
        <div key={exp.experimentId} className="card">
          <div className="card-header">
            <span style={{ fontWeight: 600 }}>{exp.experimentId}</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <th style={{ textAlign: "left",  padding: "10px 16px" }}>Variant</th>
                  <th style={{ textAlign: "right", padding: "10px 16px" }}>Impressions</th>
                  <th style={{ textAlign: "right", padding: "10px 16px" }}>Conversions</th>
                  <th style={{ textAlign: "right", padding: "10px 16px" }}>Conv. Rate</th>
                </tr>
              </thead>
              <tbody>
                {exp.variants.map((v) => (
                  <tr key={v.variant} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 16px", fontFamily: "monospace" }}>{v.variant}</td>
                    <td style={{ padding: "10px 16px", textAlign: "right" }}>{v.impressions}</td>
                    <td style={{ padding: "10px 16px", textAlign: "right" }}>{v.conversions}</td>
                    <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--accent)", fontWeight: 600 }}>
                      {v.conversionRate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
