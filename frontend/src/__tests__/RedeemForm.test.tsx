import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RedeemForm } from "@/components/RedeemForm";

const setup = (balance = 500, onRedeem = jest.fn()) =>
  render(<RedeemForm balance={balance} onRedeem={onRedeem} />);

test("displays current balance", () => {
  setup(500);
  expect(screen.getByText(/500/)).toBeInTheDocument();
});

test("Redeem button disabled when input empty", () => {
  setup();
  expect(screen.getByRole("button", { name: /redeem lyt/i })).toBeDisabled();
});

test("shows error when amount exceeds balance", () => {
  setup(100);
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "200" } });
  expect(screen.getByText(/exceeds balance/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /redeem lyt/i })).toBeDisabled();
});

test("shows error for zero amount", () => {
  setup();
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "0" } });
  expect(screen.getByRole("button", { name: /redeem lyt/i })).toBeDisabled();
});

test("advances to confirm step with valid amount", () => {
  setup(500);
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "100" } });
  fireEvent.click(screen.getByRole("button", { name: /redeem lyt/i }));
  expect(screen.getByText(/100/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /confirm & burn/i })).toBeInTheDocument();
});

test("cancel returns to input step", () => {
  setup(500);
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "100" } });
  fireEvent.click(screen.getByRole("button", { name: /redeem lyt/i }));
  fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
  expect(screen.getByRole("spinbutton")).toBeInTheDocument();
});

test("calls onRedeem with parsed amount on confirm", async () => {
  const onRedeem = jest.fn().mockResolvedValue(undefined);
  setup(500, onRedeem);
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "250" } });
  fireEvent.click(screen.getByRole("button", { name: /redeem lyt/i }));
  fireEvent.click(screen.getByRole("button", { name: /confirm & burn/i }));
  await waitFor(() => expect(onRedeem).toHaveBeenCalledWith(250));
});

test("shows error message when onRedeem rejects", async () => {
  const onRedeem = jest.fn().mockRejectedValue(new Error("tx failed"));
  setup(500, onRedeem);
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "100" } });
  fireEvent.click(screen.getByRole("button", { name: /redeem lyt/i }));
  fireEvent.click(screen.getByRole("button", { name: /confirm & burn/i }));
  await waitFor(() => expect(screen.getByText(/tx failed/i)).toBeInTheDocument());
});
