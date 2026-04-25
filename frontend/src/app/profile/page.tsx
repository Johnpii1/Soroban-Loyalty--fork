"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { api, Reward } from "@/lib/api";

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ProfilePage() {
  const { publicKey, mounted } = useWallet();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!publicKey) return;
    api.getUserRewards(publicKey).then((r) => setRewards(r.rewards)).catch(console.error);
  }, [publicKey]);

  const copyAddress = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!mounted) return null;

  if (!publicKey) {
    return (
      <div>
        <h1 className="page-title">Profile</h1>
        <div className="alert alert-error">Connect your Freighter wallet to view your profile.</div>
      </div>
    );
  }

  const totalEarned = rewards.reduce((s, r) => s + r.amount, 0);
  const totalRedeemed = rewards.reduce((s, r) => s + r.redeemed_amount, 0);
  const balance = totalEarned - totalRedeemed;
  const campaignIds = new Set(rewards.map((r) => r.campaign_id));
  const recent = [...rewards]
    .sort((a, b) => new Date(b.claimed_at).getTime() - new Date(a.claimed_at).getTime())
    .slice(0, 5);

  return (
    <div>
      <h1 className="page-title">Profile</h1>

      {/* Wallet address */}
      <div className="card" style={{ marginBottom: 24, padding: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>WALLET ADDRESS</div>
          <span className="mono" style={{ fontSize: "0.95rem" }}>{truncate(publicKey)}</span>
        </div>
        <button className="btn btn-secondary" onClick={copyAddress}>
          {copied ? "Copied!" : "Copy Address"}
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-value">{totalEarned.toLocaleString()}</div>
          <div className="stat-label">Total LYT Earned</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalRedeemed.toLocaleString()}</div>
          <div className="stat-label">Total Redeemed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{balance.toLocaleString()}</div>
          <div className="stat-label">Current Balance</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{campaignIds.size}</div>
          <div className="stat-label">Campaigns Joined</div>
        </div>
      </div>

      {/* Recent activity */}
      <section>
        <h2 className="section-title">Recent Activity</h2>
        {recent.length === 0 ? (
          <p className="empty-state">No activity yet.</p>
        ) : (
          <ul className="reward-list">
            {recent.map((r) => (
              <li key={r.id} className="reward-item">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.875rem" }}>Campaign #{r.campaign_id}</span>
                  <span className="reward-amount">{r.amount.toLocaleString()} LYT</span>
                </div>
                <div className="reward-meta">
                  <span>{new Date(r.claimed_at).toLocaleDateString()}</span>
                  <span
                    className="badge"
                    data-status={r.redeemed ? "inactive" : "active"}
                  >
                    {r.redeemed ? "Redeemed" : "Claimed"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
