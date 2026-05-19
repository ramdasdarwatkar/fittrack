import type { Json } from "@/db/supabase";

export interface MetricLayout {
  label1: string;
  label2: string;
  hasVal1: boolean;
  hasVal2: boolean;
  val1Placeholder: string;
  val2Placeholder: string;
}

export const MetricEngine = {
  /**
   * Generates input configurations dynamically for shareable routine blueprints.
   * Weight tracking is explicitly skipped here to keep blueprints universally usable across athletes.
   */
  getLayout(metricsPayload: Json | undefined): MetricLayout {
    const metrics: string[] = Array.isArray(metricsPayload)
      ? (metricsPayload as string[])
      : [];

    const hasReps = metrics.includes("reps");
    const hasDuration = metrics.includes("duration");
    const hasDistance = metrics.includes("distance");

    const layout: MetricLayout = {
      label1: "—",
      label2: "—",
      hasVal1: false,
      hasVal2: false,
      val1Placeholder: "",
      val2Placeholder: "",
    };

    // Slot 1: Maps your primary intensity target (Time takes priority, then Reps)
    if (hasDuration) {
      layout.label1 = "Time";
      layout.hasVal1 = true;
      layout.val1Placeholder = "secs";
    } else if (hasReps) {
      layout.label1 = "Reps";
      layout.hasVal1 = true;
      layout.val1Placeholder = "count";
    }

    // Slot 2: Maps your distance vector if available
    if (hasDistance) {
      layout.label2 = "Distance";
      layout.hasVal2 = true;
      layout.val2Placeholder = "mtrs";
    }

    return layout;
  },
};
