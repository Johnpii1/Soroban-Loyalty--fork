"use client";

import { WalletProvider } from "@/context/WalletContext";
import { I18nProvider } from "@/context/I18nContext";
import { ToastProvider } from "@/context/ToastContext";
import { WalletConnector } from "@/components/WalletConnector";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <ToastProvider>
        <I18nProvider>
          <ShellContent>{children}</ShellContent>
        </I18nProvider>
      </ToastProvider>
    </WalletProvider>
  );
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const { health } = useNetworkStatus();

  return (
    <>
      <header className="site-header">
        <a href="/" className="logo">SorobanLoyalty</a>
        <nav>
          <a href="/dashboard">Dashboard</a>
          <a href="/merchant">Merchant</a>
          <a href="/analytics">Analytics</a>
          <a href="/profile">Profile</a>
        </nav>
        <NetworkStatusIndicator health={health} />
        <WalletConnector />
      </header>
      <main className="site-main">{children}</main>
    </>
  );
}
