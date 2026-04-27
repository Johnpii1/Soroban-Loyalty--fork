/**
 * Lightweight A/B testing framework.
 *
 * Usage:
 *   1. Define experiments in EXPERIMENTS below.
 *   2. Use the `useExperiment` hook to get the assigned variant.
 *   3. Call `trackEvent` to record impressions and conversions.
 *
 * Variant assignment is deterministic per session and persisted to localStorage.
 * Experiment results are visible in the Analytics dashboard via the
 * /api/analytics/experiments endpoint (tracked events stored in localStorage
 * for the demo; swap trackEvent for a real analytics sink in production).
 */

export interface Experiment {
  id: string;
  variants: string[];
  /** Optional: override via NEXT_PUBLIC_AB_<EXPERIMENT_ID>=<variant> */
}

/** Register all experiments here */
export const EXPERIMENTS: Experiment[] = [
  {
    id: "cta_copy",
    variants: ["Connect Wallet", "Get Started Free"],
  },
  {
    id: "hero_layout",
    variants: ["centered", "split"],
  },
];

const STORAGE_KEY = "sl_ab_assignments";

function loadAssignments(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveAssignments(assignments: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
}

/** Assign a variant for an experiment, persisting to localStorage. */
export function getVariant(experimentId: string): string {
  const experiment = EXPERIMENTS.find((e) => e.id === experimentId);
  if (!experiment) return "control";

  // Allow env-var override (useful for CI / forced testing)
  const envKey = `NEXT_PUBLIC_AB_${experimentId.toUpperCase()}`;
  if (typeof process !== "undefined" && process.env[envKey]) {
    return process.env[envKey] as string;
  }

  const assignments = loadAssignments();
  if (assignments[experimentId]) return assignments[experimentId];

  // Random assignment
  const variant = experiment.variants[Math.floor(Math.random() * experiment.variants.length)];
  assignments[experimentId] = variant;
  saveAssignments(assignments);
  return variant;
}

// ── Event tracking ────────────────────────────────────────────────────────────

export type ExperimentEventType = "impression" | "conversion";

export interface ExperimentEvent {
  experimentId: string;
  variant: string;
  event: ExperimentEventType;
  ts: number;
}

const EVENTS_KEY = "sl_ab_events";

function loadEvents(): ExperimentEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Record an impression or conversion for an experiment variant. */
export function trackEvent(
  experimentId: string,
  event: ExperimentEventType,
  variant?: string
) {
  const resolvedVariant = variant ?? getVariant(experimentId);
  const events = loadEvents();
  events.push({ experimentId, variant: resolvedVariant, event, ts: Date.now() });
  if (typeof window !== "undefined") {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }
}

/** Aggregate events for the analytics dashboard. */
export interface ExperimentStats {
  experimentId: string;
  variants: {
    variant: string;
    impressions: number;
    conversions: number;
    conversionRate: string;
  }[];
}

export function getExperimentStats(): ExperimentStats[] {
  const events = loadEvents();
  return EXPERIMENTS.map((exp) => {
    const expEvents = events.filter((e) => e.experimentId === exp.id);
    const variants = exp.variants.map((variant) => {
      const impressions = expEvents.filter((e) => e.variant === variant && e.event === "impression").length;
      const conversions = expEvents.filter((e) => e.variant === variant && e.event === "conversion").length;
      return {
        variant,
        impressions,
        conversions,
        conversionRate: impressions > 0 ? `${((conversions / impressions) * 100).toFixed(1)}%` : "—",
      };
    });
    return { experimentId: exp.id, variants };
  });
}
