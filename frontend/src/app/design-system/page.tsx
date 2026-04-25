"use client";

/** Component showcase for the SorobanLoyalty design system. */
export default function DesignSystemPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1 className="page-title">Design System</h1>

      {/* ── Colors ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 className="section-title">Brand Colors</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["#f0eeff","#e0dcff","#c4baff","#a898ff","#8c76f8","#7c6af7","#6b58e8","#5846c9","#4535a0","#322577"].map((c, i) => (
            <div key={c} style={{ textAlign: "center" }}>
              <div style={{ width: 48, height: 48, background: c, borderRadius: 8, border: "1px solid #2d3148" }} />
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>{i * 100 || 50}</div>
            </div>
          ))}
        </div>

        <h2 className="section-title" style={{ marginTop: 24 }}>Status Colors</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "Success", bg: "#14532d", color: "#4ade80", border: "#166534" },
            { label: "Error",   bg: "#450a0a", color: "#f87171", border: "#7f1d1d" },
            { label: "Warning", bg: "#451a03", color: "#fb923c", border: "#7c2d12" },
            { label: "Info",    bg: "#1e1b4b", color: "#a5b4fc", border: "#312e81" },
          ].map(({ label, bg, color, border }) => (
            <div key={label} style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 16px", fontSize: 14 }}>
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* ── Typography ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 className="section-title">Typography Scale</h2>
        {[
          { label: "4xl — 2.25rem", size: "2.25rem", weight: 700 },
          { label: "3xl — 1.875rem", size: "1.875rem", weight: 700 },
          { label: "2xl — 1.5rem",  size: "1.5rem",   weight: 700 },
          { label: "xl — 1.25rem",  size: "1.25rem",  weight: 600 },
          { label: "lg — 1.125rem", size: "1.125rem", weight: 600 },
          { label: "base — 1rem",   size: "1rem",     weight: 400 },
          { label: "sm — 0.875rem", size: "0.875rem", weight: 400 },
          { label: "xs — 0.75rem",  size: "0.75rem",  weight: 400 },
        ].map(({ label, size, weight }) => (
          <div key={label} style={{ fontSize: size, fontWeight: weight, marginBottom: 8, color: "#e2e8f0" }}>
            {label}
          </div>
        ))}
      </section>

      {/* ── Buttons ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 className="section-title">Buttons</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn btn-primary">Primary</button>
          <button className="btn btn-secondary">Secondary</button>
          <button className="btn btn-outline">Outline</button>
          <button className="btn btn-primary" disabled>Disabled</button>
        </div>
      </section>

      {/* ── Badges ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 className="section-title">Badges</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span className="badge" data-status="active">Active</span>
          <span className="badge" data-status="inactive">Inactive</span>
          <span className="badge" data-status="expired">Expired</span>
        </div>
      </section>

      {/* ── Cards ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 className="section-title">Card</h2>
        <div className="card" style={{ maxWidth: 320 }}>
          <div className="card-header">
            <span className="campaign-title">Card Title</span>
            <span className="badge" data-status="active">Active</span>
          </div>
          <div className="card-body">
            <div className="reward-label">Reward</div>
            <div className="reward-highlight">500 LYT</div>
            <p style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Card body content goes here.</p>
          </div>
          <div className="card-footer">
            <button className="btn btn-primary">Action</button>
          </div>
        </div>
      </section>

      {/* ── Form Inputs ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 className="section-title">Form Inputs</h2>
        <div style={{ maxWidth: 320 }}>
          <div className="form-group">
            <label>Label</label>
            <input type="text" placeholder="Placeholder text" />
          </div>
          <div className="form-group">
            <label>Disabled</label>
            <input type="text" placeholder="Disabled" disabled />
          </div>
        </div>
      </section>

      {/* ── Stat Cards ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 className="section-title">Stat Cards</h2>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">1,240</div>
            <div className="stat-label">Total LYT Earned</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">320</div>
            <div className="stat-label">Total Redeemed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">920</div>
            <div className="stat-label">Current Balance</div>
          </div>
        </div>
      </section>

      {/* ── Alerts ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 className="section-title">Alerts</h2>
        <div className="alert alert-success">Success message</div>
        <div className="alert alert-error">Error message</div>
      </section>

      {/* ── Spacing ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 className="section-title">Spacing Scale</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[4, 8, 12, 16, 20, 24, 32, 40].map((px) => (
            <div key={px} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: px, height: px, background: "#7c6af7", borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{px}px</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
