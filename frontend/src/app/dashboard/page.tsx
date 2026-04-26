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
import { EmptyState } from "@/components/EmptyState";
import { SorobanErrorBoundary } from "@/components/SorobanErrorBoundary";
import { useSorobanTransaction } from "@/hooks/useSorobanTransaction";
import { useToast } from "@/context/ToastContext";

const PAGE_SIZE = 20;

function DashboardPageContent() {
  const { publicKey } = useWallet();
  const { health } = useNetworkStatus();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [optimisticClaimed, setOptimisticClaimed] = useState<Set<number>>(new Set());
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const networkDisabled = health.status === 'unreachable';

  const loadCampaigns = useCallback(async (startOffset: number, reset = false) => {
    if (startOffset === 0) setLoadingMore(false);
    else setLoadingMore(true);
    
    try {
      const resp = await api.getCampaigns(startOffset, PAGE_SIZE);
      if (reset) {
        setCampaigns(resp.campaigns);
      } else {
        setCampaigns(prev => [...prev, ...resp.campaigns]);
      }
      setTotal(resp.total);
      setOffset(startOffset + resp.campaigns.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    api.getCampaigns().then((r) => setCampaigns(r.campaigns)).catch(console.error);
  }, []);

  useEffect(() => {
    if (publicKey) {
      api.getUserRewards(publicKey).then((r) => {
        setRewards(r.rewards);
        const claimedIds = r.rewards.filter(rw => !rw.redeemed).map(rw => rw.campaign_id);
        setOptimisticClaimed(new Set(claimedIds));
      }).catch(console.error);
    }
  }, [publicKey]);

  useEffect(() => {
    loadCampaigns(0, true);
  }, [loadCampaigns]);

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
  }, [loadingMore, offset, total, loadCampaigns]);

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
      setOptimisticClaimed(prev => new Set(prev).add(campaignId));
      toast("Reward claimed successfully!", "success");
      
      // Refresh rewards
      const r = await api.getUserRewards(publicKey);
      setRewards(r.rewards);
    } catch (err: any) {
      // Error already handled by useSorobanTransaction through toast
      console.error("Claim failed:", err);
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
      
      // Refresh rewards
      const r = await api.getUserRewards(publicKey);
      setRewards(r.rewards);
    } catch (err: any) {
      // Error already handled by useSorobanTransaction through toast
      console.error("Redeem failed:", err);
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
      
      <div style={{ marginBottom: "2rem" }}>
        <h1 className="page-title">Active Campaigns</h1>
        {campaigns.length === 0 ? (
          <EmptyState
            illustration="campaigns"
            title="No active campaigns"
            description="Check back later for new loyalty campaigns."
          />
        ) : (
          <div className="campaign-grid">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                isClaimed={optimisticClaimed.has(campaign.id)}
                isClaiming={claimingId === campaign.id}
                onClaim={() => handleClaim(campaign.id)}
                disabled={networkDisabled}
              />
            ))}
          </div>
        )}
        <div ref={sentinelRef} style={{ height: "1px" }} />
        {loadingMore && <div style={{ textAlign: "center", padding: "1rem" }}>Loading more...</div>}
      </div>

      <div>
        <h1 className="page-title">Your Rewards</h1>
        <RewardList
          rewards={rewards}
          onRedeem={handleRedeem}
          redeemingId={redeemingId}
          disabled={networkDisabled}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <SorobanErrorBoundary>
      <DashboardPageContent />
    </SorobanErrorBoundary>
  );
}
