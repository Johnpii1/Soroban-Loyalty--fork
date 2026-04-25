import type { Metadata } from "next";
import { WalletProvider } from "@/context/WalletContext";
import { I18nProvider } from "@/context/I18nContext";
import { ToastProvider } from "@/context/ToastContext";
import { WalletConnector } from "@/components/WalletConnector";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import "./globals.css";

export const metadata: Metadata = {
  title: "SorobanLoyalty",
  description: "On-chain loyalty platform built on Stellar",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <WalletProvider>
          <ToastProvider>
            <LayoutContent>{children}</LayoutContent>
          </ToastProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
