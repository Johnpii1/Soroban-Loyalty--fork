"use client";

import { useEffect, useState } from "react";
import { api, Campaign } from "@/lib/api";
import { useWallet } from "@/context/WalletContext";
import { useI18n } from "@/context/I18nContext";
import { useToast } from "@/context/ToastContext";
import { claimReward } from "@/lib/soroban";
import { ShareCampaign } from "@/components/ShareCampaign";
import { CampaignCard } from "@/components/CampaignCard";

interface Props {
  id: number;
}

export default function CampaignDetailClient({ id }: Props) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const { publicKey } = useWallet();
  const { t } = useI18n();
  const { toast } = useToast();

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const campaignUrl = `${baseUrl}/campaigns/${id}`;

  useEffect(() => {
    setLoading(true);
    api.getCampaign(id)
      .then((res) => {
        setCampaign(res.campaign);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError(t('common.error'));
      })
      .finally(() => setLoading(false));
  }, [id, t]);

  const handleClaim = async () => {
    if (!publicKey) {
      toast(t('wallet.connectFirst'), "error");
      return;
    }
    setClaiming(true);
    try {
      await claimReward(publicKey, id);
      toast(t('messages.claimSuccess', { id: id.toString() }), "success");
      // Refresh campaign data
      const res = await api.getCampaign(id);
      setCampaign(res.campaign);
    } catch (err: any) {
      toast(err.message || t('messages.claimFailed'), "error");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return <div className="site-main">{t('common.loading')}</div>;
  if (error || !campaign) return <div className="site-main alert alert-error">{error || "Campaign not found"}</div>;

  return (
    <div className="campaign-detail-page">
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">{t('campaigns.details.campaign')} #{id}</h1>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '32px' }}>
        <div style={{ maxWidth: '600px' }}>
          <CampaignCard 
            campaign={campaign} 
            onClaim={handleClaim} 
            claiming={claiming}
          />
        </div>

        <section>
          <h2 className="section-title">{t('sharing.title')}</h2>
          <ShareCampaign campaignId={id} url={campaignUrl} />
        </section>
      </div>
    </div>
  );
}
