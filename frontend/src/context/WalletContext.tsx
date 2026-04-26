"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { connectWallet, getPublicKey } from "@/lib/freighter";
import { useToast } from "./ToastContext";

interface WalletCtx {
  publicKey: string | null;
  connecting: boolean;
  mounted: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const WalletContext = createContext<WalletCtx>({
  publicKey: null,
  connecting: false,
  mounted: false,
  connect: async () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    getPublicKey().then(setPublicKey);
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const key = await connectWallet();
      setPublicKey(key);
      toast(`Wallet connected: ${key.slice(0, 6)}...${key.slice(-4)}`, 'success');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      toast(errorMessage, 'error');
      console.error('Wallet connection error:', error);
    } finally {
      setConnecting(false);
    }
  }, [toast]);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    toast('Wallet disconnected', 'info');
  }, [toast]);

  return (
    <WalletContext.Provider value={{ publicKey, connecting, mounted, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
