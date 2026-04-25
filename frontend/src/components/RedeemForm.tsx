"use client";

import { useState } from "react";

interface Props {
  balance: number;
  onRedeem: (amount: number) => Promise<void>;
}

export function RedeemForm({ balance, onRedeem }: Props) {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"input" | "confirm">("input");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = parseFloat(amount);
  const isValid = !isNaN(parsed) && parsed > 0 && parsed <= balance;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onRedeem(parsed);
      setAmount("");
      setStep("input");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Redeem failed");
      setStep("input");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 420 }}>
      <div className="card-body">
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Current Balance</span>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#7c6af7" }}>
            {balance.toLocaleString()} LYT
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {step === "input" ? (
          <>
            <div className="form-group">
              <label>Amount to Redeem (LYT)</label>
              <input
                type="number"
                min="1"
                max={balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Max ${balance.toLocaleString()}`}
              />
              {amount && !isValid && (
                <span style={{ fontSize: "0.8rem", color: "#f87171" }}>
                  {parsed > balance ? "Exceeds balance" : "Enter a valid amount"}
                </span>
              )}
            </div>
            <button
              className="btn btn-primary"
              disabled={!isValid}
              onClick={() => setStep("confirm")}
              style={{ width: "100%" }}
            >
              Redeem LYT
            </button>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ color: "#94a3b8" }}>
              You are about to burn{" "}
              <strong style={{ color: "#f87171" }}>{parsed.toLocaleString()} LYT</strong>.
              This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-outline"
                onClick={() => setStep("input")}
                disabled={loading}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? "Confirming…" : "Confirm & Burn"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
