import { render, screen, act, waitFor } from "@testing-library/react";
import { WalletProvider, useWallet } from "@/context/WalletContext";
import freighter from "@stellar/freighter-api";
import React from "react";

const Probe = () => {
  const { publicKey, connecting, connect, disconnect } = useWallet();
  return (
    <div>
      <span data-testid="key">{publicKey ?? "none"}</span>
      <span data-testid="connecting">{String(connecting)}</span>
      <button onClick={connect}>connect</button>
      <button onClick={disconnect}>disconnect</button>
    </div>
  );
};

const setup = () =>
  render(
    <WalletProvider>
      <Probe />
    </WalletProvider>
  );

beforeEach(() => jest.clearAllMocks());

test("initialises with key from freighter on mount", async () => {
  (freighter.getPublicKey as jest.Mock).mockResolvedValue({ publicKey: "GAUTO", error: null });
  setup();
  await waitFor(() => expect(screen.getByTestId("key")).toHaveTextContent("GAUTO"));
});

test("returns null key when freighter errors on mount", async () => {
  (freighter.getPublicKey as jest.Mock).mockResolvedValue({ publicKey: "", error: "no key" });
  setup();
  await waitFor(() => expect(screen.getByTestId("key")).toHaveTextContent("none"));
});

test("connect sets publicKey", async () => {
  (freighter.getPublicKey as jest.Mock).mockResolvedValue({ publicKey: "", error: "no key" });
  (freighter.isConnected as jest.Mock).mockResolvedValue(true);
  setup();
  await waitFor(() => expect(screen.getByTestId("key")).toHaveTextContent("none"));

  (freighter.getPublicKey as jest.Mock).mockResolvedValue({ publicKey: "GNEW", error: null });
  await act(async () => { screen.getByText("connect").click(); });
  await waitFor(() => expect(screen.getByTestId("key")).toHaveTextContent("GNEW"));
});

test("disconnect clears publicKey", async () => {
  (freighter.getPublicKey as jest.Mock).mockResolvedValue({ publicKey: "GAUTO", error: null });
  setup();
  await waitFor(() => expect(screen.getByTestId("key")).toHaveTextContent("GAUTO"));
  act(() => { screen.getByText("disconnect").click(); });
  expect(screen.getByTestId("key")).toHaveTextContent("none");
});
