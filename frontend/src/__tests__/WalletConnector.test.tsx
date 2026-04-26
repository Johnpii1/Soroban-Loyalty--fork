import { render, screen, fireEvent } from "./test-utils";
import { WalletConnector } from "@/components/WalletConnector";
import { WalletContext } from "@/context/WalletContext";
import React from "react";

const makeCtx = (overrides = {}) => ({
  publicKey: null,
  connecting: false,
  connect: jest.fn(),
  disconnect: jest.fn(),
  ...overrides,
});

const wrap = (ctx: ReturnType<typeof makeCtx>) =>
  render(
    <WalletContext.Provider value={ctx}>
      <WalletConnector />
    </WalletContext.Provider>
  );

beforeEach(() => {
  // Simulate Freighter being installed so connect() is called directly
  Object.defineProperty(window, "freighter", { value: {}, configurable: true });
});

afterEach(() => {
  // @ts-expect-error cleanup
  delete window.freighter;
});

test("shows Connect button when disconnected", () => {
  wrap(makeCtx());
  expect(screen.getByRole("button", { name: /connect freighter/i })).toBeInTheDocument();
});

test("shows connecting state", () => {
  wrap(makeCtx({ connecting: true }));
  expect(screen.getByRole("button")).toHaveTextContent(/connecting/i);
  expect(screen.getByRole("button")).toBeDisabled();
});

test("calls connect on click", async () => {
  const ctx = makeCtx();
  wrap(ctx);
  fireEvent.click(screen.getByRole("button"));
  // handleConnect is async; wait a tick
  await Promise.resolve();
  expect(ctx.connect).toHaveBeenCalledTimes(1);
});

test("shows truncated key and disconnect when connected", () => {
  wrap(makeCtx({ publicKey: "GABCDEFGHIJKLMNOP" }));
  expect(screen.getByText(/GABCDE/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
});

test("calls disconnect on click", () => {
  const ctx = makeCtx({ publicKey: "GABCDEFGHIJKLMNOP" });
  wrap(ctx);
  fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));
  expect(ctx.disconnect).toHaveBeenCalledTimes(1);
});
