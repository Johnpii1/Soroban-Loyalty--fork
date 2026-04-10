"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { api, Campaign, Reward } from "@/lib/api";
import { claimReward, redeemReward } from "@/lib/soroban";
import { CampaignCard } from "@/components/CampaignCard";
import { RewardList } from "@/components/RewardList";

export default function DashboardPage() {
  const { publicKey } = useWallet();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    api.getCampaigns().then((r) => setCampaigns(r.campaigns)).catch(console.error);
  }, []);

  useEffect(() => {
    if (!publicKey) return;
    api.getUserRewards(publicKey).then((r) => setRewards(r.rewards)).catch(console.error);
  }, [publicKey]);

  const handleClaim = async (campaignId: number) => {
    if (!publicKey) return setMessage({ type: "error", text: "Connect your wallet first" });
    setClaimingId(campaignId);
    setMessage(null);
    try {
      await claimReward(publicKey, campaignId);
      setMessage({ type: "success", text: `Reward claimed for campaign #${campaignId}!` });
      const r = await api.getUserRewards(publicKey);
      setRewards(r.rewards);
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Claim failed" });
    } finally {
      setClaimingId(null);
    }
  };

  const handleRedeem = async (reward: Reward) => {
    if (!publicKey) return;
    setRedeemingId(reward.id);
    setMessage(null);
    try {
      await redeemReward(publicKey, BigInt(reward.amount));
      setMessage({ type: "success", text: `Redeemed ${reward.amount} LYT!` });
      const r = await api.getUserRewards(publicKey);
      setRewards(r.rewards);
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Redeem failed" });
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      {message && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      {!publicKey && (
        <div className="alert alert-error">Connect your Freighter wallet to claim rewards.</div>
      )}

      <section>
        <h2 className="section-title">Active Campaigns</h2>
        {campaigns.length === 0 ? (
          <p className="empty-state">No campaigns available.</p>
        ) : (
          <div className="grid">
            {campaigns.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onClaim={handleClaim}
                claiming={claimingId === c.id}
              />
            ))}
          </div>
        )}
      </section>

      {publicKey && (
        <section style={{ marginTop: 40 }}>
          <h2 className="section-title">My Rewards</h2>
          <RewardList
            rewards={rewards}
            onRedeem={handleRedeem}
            redeeming={redeemingId}
          />
        </section>
      )}
    </div>
  );
}
