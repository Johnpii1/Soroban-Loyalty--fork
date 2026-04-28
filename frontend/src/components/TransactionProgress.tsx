"use client";

export type TxStep = "signing" | "submitting" | "confirming";
export type TxStatus = "idle" | "active" | "done" | "error";

export interface TxStepState {
  step: TxStep;
  status: TxStatus;
  error?: string;
}

const STEPS: { key: TxStep; label: string }[] = [
  { key: "signing",    label: "Signing" },
  { key: "submitting", label: "Submitting" },
  { key: "confirming", label: "Confirming" },
];

interface Props {
  steps: TxStepState[];
  onRetry?: () => void;
}

export function TransactionProgress({ steps, onRetry }: Props) {
  const hasError = steps.some((s) => s.status === "error");

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Transaction progress"
      className="tx-progress"
    >
      <ol className="tx-steps" aria-label="Transaction steps">
        {STEPS.map(({ key, label }, idx) => {
          const state = steps.find((s) => s.step === key);
          const status = state?.status ?? "idle";
          const isCurrent = status === "active";

          return (
            <li
              key={key}
              className={`tx-step tx-step--${status}`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className="tx-step__icon" aria-hidden="true">
                {status === "done"  && "✓"}
                {status === "error" && "✕"}
                {status === "active" && <span className="tx-spinner" />}
                {status === "idle"  && <span className="tx-step__num">{idx + 1}</span>}
              </span>
              <span className="tx-step__label">{label}</span>
              {status === "error" && state?.error && (
                <span className="tx-step__error">{state.error}</span>
              )}
            </li>
          );
        })}
      </ol>

      {hasError && onRetry && (
        <button className="btn btn-primary tx-retry" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
