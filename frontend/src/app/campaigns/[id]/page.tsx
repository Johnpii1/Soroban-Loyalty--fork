import { Metadata } from "next";
import { api } from "@/lib/api";
import CampaignDetailClient from "./CampaignDetailClient";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const id = parseInt(params.id);
  try {
    const { campaign } = await api.getCampaign(id);
    const merchantShort = `${campaign.merchant.slice(0, 8)}...${campaign.merchant.slice(-4)}`;
    return {
      title: `Campaign #${id} - SorobanLoyalty`,
      description: `Earn ${campaign.reward_amount} LYT rewards from merchant ${merchantShort}. Join now!`,
      openGraph: {
        title: `Campaign #${id} - SorobanLoyalty`,
        description: `Earn ${campaign.reward_amount} LYT rewards. On-chain loyalty platform on Stellar.`,
        type: "website",
        url: `/campaigns/${id}`,
        siteName: "SorobanLoyalty",
      },
      twitter: {
        card: "summary_large_image",
        title: `Campaign #${id} - SorobanLoyalty`,
        description: `Earn rewards from this campaign!`,
      }
    };
  } catch (e) {
    return {
      title: "Campaign Not Found",
    };
  }
}

export default function CampaignPage({ params }: { params: { id: string } }) {
  return <CampaignDetailClient id={parseInt(params.id)} />;
}
