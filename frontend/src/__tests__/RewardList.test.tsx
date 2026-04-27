import { render, screen } from "./test-utils";
import { RewardList } from "@/components/RewardList";
import { Reward } from "@/lib/api";

const reward: Reward = {
  id: "r1",
  user_address: "GABC",
  campaign_id: 1,
  amount: 100,
  redeemed: false,
  redeemed_amount: 0,
  claimed_at: new Date().toISOString(),
};

test("shows empty state when no rewards", () => {
  render(<RewardList rewards={[]} />);
  expect(screen.getByText(/no rewards yet/i)).toBeInTheDocument();
});

test("renders reward items", () => {
  render(<RewardList rewards={[reward]} />);
  expect(screen.getByText(/Campaign #1/)).toBeInTheDocument();
  expect(screen.getByText(/100/)).toBeInTheDocument();
  expect(screen.getByText(/Available/i)).toBeInTheDocument();
});

test("shows redeemed status", () => {
  render(<RewardList rewards={[{ ...reward, redeemed: true, redeemed_amount: 100 }]} />);
  expect(screen.getByText(/Redeemed 100 LYT/i)).toBeInTheDocument();
});

test("renders multiple rewards", () => {
  const r2 = { ...reward, id: "r2", campaign_id: 2, amount: 200 };
  render(<RewardList rewards={[reward, r2]} />);
  expect(screen.getByText(/Campaign #1/)).toBeInTheDocument();
  expect(screen.getByText(/Campaign #2/)).toBeInTheDocument();
});
