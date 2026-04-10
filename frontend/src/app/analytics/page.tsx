"use client";

import { useEffect, useState } from "react";
import { api, Campaign } from "@/lib/api";

export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    api.getCampaigns().then((r) => setCampaigns(r.campaigns)).catch(console.error);
  }, []);

  const totalClaimed = campaigns.reduce((s, c) => s + c.total_claimed, 0);
  const activeCampaigns = campaigns.filter(
    (c) => c.active && Date.now() / 1000 < c.expiration
  ).length;
  const totalRewardsIssued = campaigns.reduce(
    (s, c) => s + c.reward_amount * c.total_claimed,
    0
  );

  return (
    <div>
      <h1 className="page-title">Analytics</h1>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{campaigns.length}</div>
          <div className="stat-label">Total Campaigns</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{activeCampaigns}</div>
          <div className="stat-label">Active Campaigns</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalClaimed.toLocaleString()}</div>
          <div className="stat-label">Total Claims</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalRewardsIssued.toLocaleString()}</div>
          <div className="stat-label">LYT Issued</div>
        </div>
      </div>

      <h2 className="section-title">Campaign Performance</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #2d3148", color: "#64748b", fontSize: "0.8rem" }}>
            <th style={{ textAlign: "left", padding: "8px 12px" }}>ID</th>
            <th style={{ textAlign: "left", padding: "8px 12px" }}>Merchant</th>
            <th style={{ textAlign: "right", padding: "8px 12px" }}>Reward</th>
            <th style={{ textAlign: "right", padding: "8px 12px" }}>Claims</th>
            <th style={{ textAlign: "right", padding: "8px 12px" }}>Total Issued</th>
            <th style={{ textAlign: "left", padding: "8px 12px" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => {
            const expired = Date.now() / 1000 > c.expiration;
            const status = !c.active ? "Inactive" : expired ? "Expired" : "Active";
            return (
              <tr key={c.id} style={{ borderBottom: "1px solid #1a1d27" }}>
                <td style={{ padding: "10px 12px" }}>#{c.id}</td>
                <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "0.8rem" }}>
                  {c.merchant.slice(0, 8)}…
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                  {c.reward_amount.toLocaleString()} LYT
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{c.total_claimed}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                  {(c.reward_amount * c.total_claimed).toLocaleString()} LYT
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span className="badge" data-status={status.toLowerCase()}>{status}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
