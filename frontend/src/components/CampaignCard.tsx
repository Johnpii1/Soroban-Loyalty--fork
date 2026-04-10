"use client";

import { Campaign } from "@/lib/api";

interface Props {
  campaign: Campaign;
  onClaim?: (id: number) => void;
  claiming?: boolean;
}

export function CampaignCard({ campaign, onClaim, claiming }: Props) {
  const expired = Date.now() / 1000 > campaign.expiration;
  const status = !campaign.active ? "Inactive" : expired ? "Expired" : "Active";
  const canClaim = campaign.active && !expired;

  return (
    <div className="card">
      <div className="card-header">
        <span className="badge" data-status={status.toLowerCase()}>
          {status}
        </span>
        <span className="campaign-id">Campaign #{campaign.id}</span>
      </div>
      <div className="card-body">
        <p>
          <strong>Merchant:</strong>{" "}
          <span className="mono">
            {campaign.merchant.slice(0, 8)}…{campaign.merchant.slice(-4)}
          </span>
        </p>
        <p>
          <strong>Reward:</strong> {campaign.reward_amount.toLocaleString()} LYT
        </p>
        <p>
          <strong>Claimed:</strong> {campaign.total_claimed}
        </p>
        <p>
          <strong>Expires:</strong>{" "}
          {new Date(campaign.expiration * 1000).toLocaleString()}
        </p>
      </div>
      {onClaim && (
        <div className="card-footer">
          <button
            onClick={() => onClaim(campaign.id)}
            disabled={!canClaim || claiming}
            className="btn btn-primary"
          >
            {claiming ? "Claiming…" : "Claim Reward"}
          </button>
        </div>
      )}
    </div>
  );
}
