import { render, screen, fireEvent } from "@testing-library/react";
import { CampaignCard } from "@/components/CampaignCard";
import { Campaign } from "@/lib/api";

const base: Campaign = {
  id: 1,
  merchant: "GABCDEFGHIJKLMNOPQRSTUVWXYZ",
  reward_amount: 500,
  expiration: Math.floor(Date.now() / 1000) + 86400,
  active: true,
  total_claimed: 10,
};

test("renders campaign details", () => {
  render(<CampaignCard campaign={base} />);
  expect(screen.getByText(/Campaign #1/)).toBeInTheDocument();
  expect(screen.getByText(/500/)).toBeInTheDocument();
  expect(screen.getByText(/Active/i)).toBeInTheDocument();
});

test("shows Claim button when onClaim provided", () => {
  render(<CampaignCard campaign={base} onClaim={jest.fn()} />);
  expect(screen.getByRole("button", { name: /claim reward/i })).toBeInTheDocument();
});

test("calls onClaim with campaign id", () => {
  const onClaim = jest.fn();
  render(<CampaignCard campaign={base} onClaim={onClaim} />);
  fireEvent.click(screen.getByRole("button", { name: /claim reward/i }));
  expect(onClaim).toHaveBeenCalledWith(1);
});

test("disables claim button when claiming", () => {
  render(<CampaignCard campaign={base} onClaim={jest.fn()} claiming />);
  expect(screen.getByRole("button")).toBeDisabled();
});

test("shows Inactive badge for inactive campaign", () => {
  render(<CampaignCard campaign={{ ...base, active: false }} />);
  expect(screen.getByText(/Inactive/i)).toBeInTheDocument();
});

test("shows Expired badge for expired campaign", () => {
  const expired = { ...base, expiration: Math.floor(Date.now() / 1000) - 1 };
  render(<CampaignCard campaign={expired} />);
  expect(screen.getByText(/Expired/i)).toBeInTheDocument();
});

test("disables claim for expired campaign", () => {
  const expired = { ...base, expiration: Math.floor(Date.now() / 1000) - 1 };
  render(<CampaignCard campaign={expired} onClaim={jest.fn()} />);
  expect(screen.getByRole("button")).toBeDisabled();
});
