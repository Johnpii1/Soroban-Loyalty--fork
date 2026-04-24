"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useWallet } from "@/context/WalletContext";
import { useI18n } from "@/context/I18nContext";
import { api, Campaign, Reward } from "@/lib/api";
import { claimReward, redeemReward } from "@/lib/soroban";
import { CampaignCard } from "@/components/CampaignCard";
import { RewardList } from "@/components/RewardList";
import { NetworkBanner } from "@/components/NetworkBanner";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const PAGE_SIZE = 20;

export default function DashboardPage() {
  const { publicKey } = useWallet();
  const { health } = useNetworkStatus();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const networkDisabled = health.status === 'unreachable';

  useEffect(() => {
    api.getCampaigns().then((r) => setCampaigns(r.campaigns)).catch(console.error);
  }, []);

  // Initial load
  useEffect(() => {
    loadCampaigns(0, true);
  }, [loadCampaigns]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && total !== null && offset < total) {
          loadCampaigns(offset);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadCampaigns, loadingMore, offset, total]);

  useEffect(() => {
    if (!publicKey) return;
    api.getUserRewards(publicKey).then((r) => setRewards(r.rewards)).catch(console.error);
  }, [publicKey]);

  const handleClaim = async (campaignId: number) => {
    if (!publicKey) return setMessage({ type: "error", text: "Connect your wallet first" });
    if (networkDisabled) return setMessage({ type: "error", text: "Network is unreachable" });
    setClaimingId(campaignId);
    setMessage(null);
    setClaimedId(null);
    try {
      await claimReward(publicKey, campaignId);
      setMessage({ type: "success", text: t('messages.claimSuccess', { id: campaignId.toString() }) });
      const r = await api.getUserRewards(publicKey);
      setRewards(r.rewards);
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : t('messages.claimFailed') });
    } finally {
      setClaimingId(null);
    }
  };

  const handleRedeem = async (reward: Reward) => {
    if (!publicKey) return;
    if (networkDisabled) return setMessage({ type: "error", text: "Network is unreachable" });
    setRedeemingId(reward.id);
    setMessage(null);
    try {
      await redeemReward(publicKey, BigInt(reward.amount));
      setMessage({ type: "success", text: t('messages.redeemSuccess', { amount: reward.amount.toString() }) });
      const r = await api.getUserRewards(publicKey);
      setRewards(r.rewards);
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : t('messages.redeemFailed') });
    } finally {
      setRedeemingId(null);
    }
  };

  const hasMore = total !== null && offset < total;

  return (
    <div>
      <h1 className="page-title">{t('dashboard.title')}</h1>

      <NetworkBanner health={health} />

      {message && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      {!publicKey && (
        <div className="alert alert-error">{t('wallet.connectFirst')}</div>
      )}

      <section>
        <h2 className="section-title">{t('campaigns.title')}</h2>
        {campaigns.length === 0 ? (
          <p className="empty-state">{t('campaigns.noCampaigns')}</p>
        ) : (
          <div className="grid">
            {campaigns.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onClaim={networkDisabled ? undefined : handleClaim}
                claiming={claimingId === c.id}
                justClaimed={claimedId === c.id}
              />
            ))}
          </div>
        )}
      </section>

      {publicKey && (
        <section style={{ marginTop: 40 }}>
          <h2 className="section-title">{t('rewards.title')}</h2>
          <RewardList
            rewards={rewards}
            onRedeem={networkDisabled ? undefined : handleRedeem}
            redeeming={redeemingId}
          />
        </section>
      )}
    </div>
  );
}
