"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CampaignCard } from "@/components/CampaignCard";
import { EmptyState } from "@/components/EmptyState";
import { NetworkBanner } from "@/components/NetworkBanner";
import { RewardList } from "@/components/RewardList";
import { useWallet } from "@/context/WalletContext";
import { useToast } from "@/context/ToastContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { api, Campaign, Reward } from "@/lib/api";
import { claimReward, redeemReward } from "@/lib/soroban";

const PAGE_SIZE = 20;
const SKELETON_COUNT = 3;

function CampaignCardSkeleton() {
  return (
    <div className="card campaign-card-skeleton" aria-hidden="true">
      <div className="card-header">
        <div className="skeleton skeleton-pill" />
        <div className="skeleton skeleton-text-sm" />
      </div>
      <div className="card-body">
        <div className="skeleton skeleton-text-md" />
        <div className="skeleton skeleton-text-lg" />
        <div className="skeleton skeleton-text-md" />
        <div className="skeleton skeleton-text-md" />
      </div>
      <div className="card-footer">
        <div className="skeleton skeleton-button" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { publicKey, refreshBalance } = useWallet();
  const { health } = useNetworkStatus();
  const { toast } = useToast();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [fadeInCards, setFadeInCards] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const networkDisabled = health.status === "unreachable";
  const hasMore = total !== null && offset < total;

  const loadCampaigns = useCallback(async (nextOffset: number, replace = false) => {
    setLoadingMore(true);
    try {
      const response = await api.getCampaigns(PAGE_SIZE, nextOffset);
      setCampaigns((prev) => (replace ? response.campaigns : [...prev, ...response.campaigns]));
      setOffset(nextOffset + response.campaigns.length);
      setTotal(response.total);
    } catch (error) {
      console.error("Failed to load campaigns", error);
    } finally {
      setLoadingMore(false);
      if (replace) {
        setIsInitialLoading(false);
        requestAnimationFrame(() => setFadeInCards(true));
      }
    }
  }, []);

  useEffect(() => {
    if (!publicKey) return;
    api.getUserRewards(publicKey).then((r) => setRewards(r.rewards)).catch(console.error);
  }, [publicKey]);

  useEffect(() => {
    setFadeInCards(false);
    setIsInitialLoading(true);
    loadCampaigns(0, true);
  }, [loadCampaigns]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          loadCampaigns(offset);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadCampaigns, loadingMore, offset]);

  const handleClaim = async (campaignId: number) => {
    if (!publicKey) {
      toast("Please connect your wallet first", "error");
      return;
    }

    if (networkDisabled) {
      toast("Network is unreachable. Please try again later.", "error");
      return;
    }

    setClaimingId(campaignId);
    try {
      await claimReward(publicKey, campaignId);
      toast("Reward claimed successfully!", "success");
      const r = await api.getUserRewards(publicKey);
      setRewards(r.rewards);
      await refreshBalance();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to claim reward", "error");
    } finally {
      setClaimingId(null);
    }
  };

  const handleRedeem = async (rewardId: string, amount: number) => {
    if (!publicKey) {
      toast("Please connect your wallet first", "error");
      return;
    }

    if (networkDisabled) {
      toast("Network is unreachable. Please try again later.", "error");
      return;
    }

    setRedeemingId(rewardId);
    try {
      await redeemReward(publicKey, BigInt(amount));
      toast("Reward redeemed successfully!", "success");
      const r = await api.getUserRewards(publicKey);
      setRewards(r.rewards);
      await refreshBalance();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to redeem reward", "error");
    } finally {
      setRedeemingId(null);
    }
  };

  if (!publicKey) {
    return (
      <div className="container">
        <NetworkBanner />
        <div className="alert alert-warning" style={{ marginTop: "2rem" }}>
          Please connect your Freighter wallet to view campaigns and rewards.
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <NetworkBanner />

      <section style={{ marginBottom: "2rem" }}>
        <h1 className="page-title">Active Campaigns</h1>
        <div
          className={`grid campaign-grid ${fadeInCards ? "campaign-grid-loaded" : ""}`}
          aria-busy={isInitialLoading}
          aria-label={isInitialLoading ? "Loading campaigns" : "Campaign listings"}
        >
          {isInitialLoading
            ? Array.from({ length: SKELETON_COUNT }).map((_, idx) => <CampaignCardSkeleton key={idx} />)
            : campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  claiming={claimingId === campaign.id}
                  onClaim={handleClaim}
                />
              ))}
        </div>

        {!isInitialLoading && campaigns.length === 0 && (
          <EmptyState
            illustration="campaigns"
            title="No active campaigns"
            description="Check back later for new loyalty campaigns."
          />
        )}
      </section>

      <section style={{ marginTop: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>Your Rewards</h2>
          <Link href="/dashboard/history" className="btn btn-outline" style={{ fontSize: "0.8rem", padding: "4px 12px" }}>
            View History
          </Link>
        </div>

        <RewardList rewards={rewards} onRedeem={networkDisabled ? undefined : handleRedeem} redeeming={redeemingId} />
      </section>

      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />}
    </div>
  );
}
