"use client";

import { useState } from "react";
import { useSorobanTransaction } from "@/hooks/useSorobanTransaction";
import { SorobanErrorBoundary } from "./SorobanErrorBoundary";

interface Props {
  balance: number;
  onRedeem: (amount: number) => Promise<void>;
}

function RedeemFormContent({ balance, onRedeem }: Props) {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"input" | "confirm">("input");
  const { execute, loading, error, clearError } = useSorobanTransaction({
    showToast: true,
    onSuccess: () => {
      setAmount("");
      setStep("input");
      clearError();
    }
  });

  const parsed = parseFloat(amount);
  const isValid = !isNaN(parsed) && parsed > 0 && parsed <= balance;

  const handleConfirm = async () => {
    if (!isValid) return;
    
    await execute(async () => {
      await onRedeem(parsed);
    });
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

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {error.userMessage}
            {error.shouldShowRetry && (
              <button 
                onClick={handleConfirm}
                style={{ marginLeft: '0.5rem', textDecoration: 'underline' }}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {open && (
          <div style={{ marginBottom: 16 }}>
            <TransactionProgress steps={steps} onRetry={reset} />
          </div>
        )}

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
                disabled={loading}
              />
              {amount && !isValid && (
                <span style={{ fontSize: "0.8rem", color: "#f87171" }}>
                  {parsed > balance ? "Exceeds balance" : "Enter a valid amount"}
                </span>
              )}
            </div>
            <button
              className="btn btn-primary"
              disabled={!isValid || loading}
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
                disabled={open}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={open}
                style={{ flex: 1 }}
              >
                {loading ? "Processing..." : "Confirm & Burn"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function RedeemForm(props: Props) {
  return (
    <SorobanErrorBoundary>
      <RedeemFormContent {...props} />
    </SorobanErrorBoundary>
  );
}
