"use client";

import { Reward } from "@/lib/api";

interface Props {
  rewards: Reward[];
  onRedeem?: (reward: Reward) => void;
  redeeming?: string | null; // reward id being redeemed
}

export function RewardList({ rewards, onRedeem, redeeming }: Props) {
  if (rewards.length === 0) {
    return <p className="empty-state">No rewards yet. Claim a campaign to get started.</p>;
  }

  return (
    <ul className="reward-list">
      {rewards.map((r) => (
        <li key={r.id} className="reward-item">
          <div>
            <strong>Campaign #{r.campaign_id}</strong>
            <span className="reward-amount">{r.amount.toLocaleString()} LYT</span>
          </div>
          <div className="reward-meta">
            <span>{r.redeemed ? `Redeemed ${r.redeemed_amount} LYT` : "Available"}</span>
            <span>{new Date(r.claimed_at).toLocaleDateString()}</span>
          </div>
          {onRedeem && !r.redeemed && (
            <button
              onClick={() => onRedeem(r)}
              disabled={redeeming === r.id}
              className="btn btn-secondary"
            >
              {redeeming === r.id ? "Redeeming…" : "Redeem"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
