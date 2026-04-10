import type { Metadata } from "next";
import { WalletProvider } from "@/context/WalletContext";
import { WalletConnector } from "@/components/WalletConnector";
import "./globals.css";

export const metadata: Metadata = {
  title: "SorobanLoyalty",
  description: "On-chain loyalty platform on Stellar",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <header className="site-header">
            <a href="/" className="logo">SorobanLoyalty</a>
            <nav>
              <a href="/dashboard">Dashboard</a>
              <a href="/merchant">Merchant</a>
              <a href="/analytics">Analytics</a>
            </nav>
            <WalletConnector />
          </header>
          <main className="site-main">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
