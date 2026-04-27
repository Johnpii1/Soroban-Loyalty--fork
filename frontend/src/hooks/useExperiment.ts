"use client";

import { useEffect, useState } from "react";
import { getVariant, trackEvent, ExperimentEventType } from "@/lib/experiments";

/**
 * Hook to get the assigned variant for an experiment and track impressions.
 *
 * @example
 * const { variant, track } = useExperiment("cta_copy");
 * // variant === "Connect Wallet" | "Get Started Free"
 * // call track("conversion") when the user converts
 */
export function useExperiment(experimentId: string) {
  const [variant, setVariant] = useState<string>("control");

  useEffect(() => {
    const v = getVariant(experimentId);
    setVariant(v);
    trackEvent(experimentId, "impression", v);
  }, [experimentId]);

  const track = (event: ExperimentEventType) => trackEvent(experimentId, event, variant);

  return { variant, track };
}
