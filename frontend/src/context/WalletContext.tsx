"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { connectWallet, getPublicKey } from "@/lib/freighter";
import { api } from "@/lib/api";

interface WalletCtx {
  publicKey: string | null;
  connecting: boolean;
  mounted: boolean;
  lytBalance: number;
  balanceLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

export const WalletContext = createContext<WalletCtx>({
  publicKey: null,
  connecting: false,
  mounted: false,
  lytBalance: 0,
  balanceLoading: false,
  connect: async () => {},
  disconnect: () => {},
  refreshBalance: async () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [lytBalance, setLytBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  // `mounted` is false on the server and during the first render,
  // preventing any wallet-dependent UI from rendering until the client
  // has hydrated — eliminating the hydration mismatch.
  const [mounted, setMounted] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);

  const refreshBalance = useCallback(async () => {
    if (!publicKey) {
      setLytBalance(0);
      setBalanceLoading(false);
      return;
    }

    setBalanceLoading(true);
    try {
      const { rewards } = await api.getUserRewards(publicKey);
      const availableBalance = rewards.reduce((sum, reward) => {
        const remaining = reward.redeemed ? reward.amount - reward.redeemed_amount : reward.amount;
        return sum + Math.max(remaining, 0);
      }, 0);
      setLytBalance(availableBalance);
    } catch (error) {
      console.error("Failed to refresh LYT balance", error);
    } finally {
      setBalanceLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    setMounted(true);
    getPublicKey().then(setPublicKey);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibilityChange = () => {
      setIsPageVisible(document.visibilityState === "visible");
    };
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!publicKey) {
      setLytBalance(0);
      setBalanceLoading(false);
      return;
    }
    void refreshBalance();
  }, [publicKey, refreshBalance]);

  useEffect(() => {
    if (!publicKey || !isPageVisible) return;
    const interval = window.setInterval(() => {
      void refreshBalance();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [publicKey, isPageVisible, refreshBalance]);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const key = await connectWallet();
      setPublicKey(key);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => setPublicKey(null), []);

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        connecting,
        mounted,
        lytBalance,
        balanceLoading,
        connect,
        disconnect,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
