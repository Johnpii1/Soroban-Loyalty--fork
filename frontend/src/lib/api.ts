const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface Campaign {
  id: number;
  merchant: string;
  reward_amount: number;
  expiration: number;
  active: boolean;
  total_claimed: number;
}

export interface Reward {
  id: string;
  user_address: string;
  campaign_id: number;
  amount: number;
  redeemed: boolean;
  redeemed_amount: number;
  claimed_at: string;
}

export interface AnalyticsData {
  totalClaims: number;
  totalLYT: number;
  redemptionRate: number;
  claimsPerCampaign: { name: string; claims: number }[];
  claimsOverTime: { date: string; claims: number }[];
}

export const api = {
  getCampaigns: () => apiFetch<{ campaigns: Campaign[] }>("/campaigns"),
  getCampaign: (id: number) => apiFetch<{ campaign: Campaign }>(`/campaigns/${id}`),
  getUserRewards: (address: string) =>
    apiFetch<{ rewards: Reward[] }>(`/user/${address}/rewards`),
  getAnalytics: (days: number) =>
    apiFetch<AnalyticsData>(`/analytics?days=${days}`),
};
