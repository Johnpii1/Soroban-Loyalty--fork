import type { Metadata } from "next";
import { WalletProvider } from "@/context/WalletContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { WalletConnector } from "@/components/WalletConnector";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "SorobanLoyalty",
  description: "On-chain loyalty platform on Stellar",
};

// Inline script to apply theme before first paint (prevents flash)
const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem('theme');
    var preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', stored || preferred);
  } catch(e){}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <WalletProvider>
            <header className="site-header">
              <a href="/" className="logo">SorobanLoyalty</a>
              <nav>
                <a href="/dashboard">Dashboard</a>
                <a href="/merchant">Merchant</a>
                <a href="/analytics">Analytics</a>
              </nav>
              <ThemeToggle />
              <WalletConnector />
            </header>
            <main className="site-main">{children}</main>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
