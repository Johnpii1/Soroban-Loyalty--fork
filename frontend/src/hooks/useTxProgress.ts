"use client";

import { useState, useCallback } from "react";
import { TxStep, TxStepState } from "@/components/TransactionProgress";

function makeSteps(active: TxStep | null, errorStep?: TxStep, errorMsg?: string): TxStepState[] {
  const order: TxStep[] = ["signing", "submitting", "confirming"];
  const activeIdx = active ? order.indexOf(active) : -1;

  return order.map((step, idx) => {
    if (errorStep === step) return { step, status: "error", error: errorMsg };
    if (idx < activeIdx)    return { step, status: "done" };
    if (idx === activeIdx)  return { step, status: "active" };
    return { step, status: "idle" };
  });
}

export function useTxProgress() {
  const [steps, setSteps] = useState<TxStepState[]>(makeSteps(null));
  const [open, setOpen] = useState(false);

  const run = useCallback(async <T>(fn: (setStep: (s: TxStep) => void) => Promise<T>): Promise<T> => {
    setSteps(makeSteps("signing"));
    setOpen(true);
    try {
      const result = await fn((step) => setSteps(makeSteps(step)));
      // All done
      setSteps([
        { step: "signing",    status: "done" },
        { step: "submitting", status: "done" },
        { step: "confirming", status: "done" },
      ]);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Determine which step failed based on message heuristics
      const errorStep: TxStep =
        msg.toLowerCase().includes("sign") ? "signing" :
        msg.toLowerCase().includes("submit") ? "submitting" : "confirming";
      setSteps(makeSteps(null, errorStep, msg));
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setSteps(makeSteps(null));
    setOpen(false);
  }, []);

  return { steps, open, run, reset };
}
