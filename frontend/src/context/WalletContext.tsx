"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { connectWallet, getPublicKey } from "@/lib/freighter";

interface WalletCtx {
  publicKey: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletCtx>({
  publicKey: null,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    getPublicKey().then(setPublicKey);
  }, []);

  const connect = async () => {
    setConnecting(true);
    try {
      const key = await connectWallet();
      setPublicKey(key);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => setPublicKey(null);

  return (
    <WalletContext.Provider value={{ publicKey, connecting, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
