import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SorobanLoyalty — On-chain loyalty infrastructure on Stellar",
  description:
    "Businesses create reward campaigns, users earn tokenized LYT incentives, everything stored transparently on-chain. Built on Stellar Soroban.",
  openGraph: {
    title: "SorobanLoyalty — On-chain loyalty infrastructure on Stellar",
    description:
      "Businesses create reward campaigns, users earn tokenized LYT incentives, everything stored transparently on-chain.",
    type: "website",
    url: "https://sorobanloyalty.app",
    siteName: "SorobanLoyalty",
  },
  twitter: {
    card: "summary_large_image",
    title: "SorobanLoyalty",
    description: "On-chain loyalty infrastructure on Stellar",
  },
};

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Merchant creates a campaign",
    desc: "Set a reward amount and expiry. The campaign is deployed on-chain via Soroban smart contracts.",
  },
  {
    step: "2",
    title: "Users earn LYT tokens",
    desc: "Customers claim rewards by signing a transaction with Freighter. Tokens are minted directly to their wallet.",
  },
  {
    step: "3",
    title: "Redeem for real value",
    desc: "Users burn LYT tokens to redeem rewards. Every action is transparent and verifiable on Stellar.",
  },
];

const FEATURES = [
  {
    icon: "🔗",
    title: "Fully on-chain",
    desc: "Campaigns, claims, and redemptions live on Stellar. No hidden databases, no vendor lock-in.",
  },
  {
    icon: "⚡",
    title: "Fast & cheap",
    desc: "Stellar settles in 3–5 seconds with sub-cent fees. Loyalty programs that actually scale.",
  },
  {
    icon: "🔒",
    title: "Non-custodial",
    desc: "Users hold their own LYT tokens. Merchants can't freeze or confiscate rewards.",
  },
  {
    icon: "📊",
    title: "Built-in analytics",
    desc: "Track claims, redemption rates, and campaign performance from a live dashboard.",
  },
];

const STATS = [
  { value: "500+", label: "Campaigns created" },
  { value: "1.2M", label: "LYT distributed" },
  { value: "8,400", label: "Active users" },
];

export default function LandingPage() {
  return (
    <div className="landing">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero__badge">Built on Stellar · Powered by Soroban</div>
        <h1 className="landing-hero__headline">
          Loyalty rewards,<br />
          <span className="landing-hero__accent">on-chain.</span>
        </h1>
        <p className="landing-hero__sub">
          SorobanLoyalty lets businesses create tokenized reward campaigns and users earn
          LYT — a real, transferable asset on the Stellar network.
        </p>
        <div className="landing-hero__cta">
          <Link href="/dashboard" className="btn btn-primary landing-cta-primary">
            Connect Wallet &amp; Explore
          </Link>
          <Link href="/merchant" className="btn btn-outline landing-cta-secondary">
            Launch a Campaign
          </Link>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="landing-stats" aria-label="Platform statistics">
        {STATS.map((s) => (
          <div key={s.label} className="landing-stat">
            <span className="landing-stat__value">{s.value}</span>
            <span className="landing-stat__label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="landing-section" aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="landing-section__title">How it works</h2>
        <div className="landing-steps">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="landing-step">
              <div className="landing-step__num" aria-hidden="true">{item.step}</div>
              <h3 className="landing-step__title">{item.title}</h3>
              <p className="landing-step__desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="landing-section" aria-labelledby="features">
        <h2 id="features" className="landing-section__title">Why SorobanLoyalty</h2>
        <div className="landing-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feature">
              <span className="landing-feature__icon" aria-hidden="true">{f.icon}</span>
              <h3 className="landing-feature__title">{f.title}</h3>
              <p className="landing-feature__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer__brand">
          <span className="logo">SorobanLoyalty</span>
          <span className="landing-footer__tagline">On-chain loyalty for everyone.</span>
        </div>
        <nav className="landing-footer__links" aria-label="Footer navigation">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/merchant">Merchant</Link>
          <Link href="/analytics">Analytics</Link>
          <Link href="/help">Help</Link>
          <a href="https://github.com/Dev-Odun-oss/Soroban-Loyalty" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </nav>
        <p className="landing-footer__copy">
          © {new Date().getFullYear()} SorobanLoyalty. Built on Stellar.
        </p>
      </footer>
    </div>
  );
}
