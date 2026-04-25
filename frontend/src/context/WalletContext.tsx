"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { connectWallet, getPublicKey } from "@/lib/freighter";

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
  // `mounted` is false on the server and during the first render,
  // preventing any wallet-dependent UI from rendering until the client
  // has hydrated — eliminating the hydration mismatch.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getPublicKey().then(setPublicKey);
  }, []);

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
    <WalletContext.Provider value={{ publicKey, connecting, mounted, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
