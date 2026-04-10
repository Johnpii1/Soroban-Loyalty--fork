import Link from "next/link";

export default function Home() {
  return (
    <div style={{ textAlign: "center", paddingTop: 80 }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: 16 }}>
        SorobanLoyalty
      </h1>
      <p style={{ color: "#94a3b8", fontSize: "1.1rem", marginBottom: 40 }}>
        Modular on-chain loyalty infrastructure on Stellar
      </p>
      <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
        <Link href="/dashboard" className="btn btn-primary" style={{ padding: "12px 28px", fontSize: "1rem" }}>
          Go to Dashboard
        </Link>
        <Link href="/merchant" className="btn btn-outline" style={{ padding: "12px 28px", fontSize: "1rem" }}>
          Merchant Portal
        </Link>
      </div>
    </div>
  );
}
