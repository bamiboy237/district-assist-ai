import type { SupportPlan } from "./support-plan.schema.js";

const allowed: Record<SupportPlan["status"], SupportPlan["status"][]> = {
  draft: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: ["active"],
  cancelled: [],
};
export function canTransitionPlan(
  current: SupportPlan["status"],
  next: SupportPlan["status"],
): boolean {
  return current === next || allowed[current].includes(next);
}

export function isTerminalStatus(status: SupportPlan["status"]): boolean {
  return status === "completed" || status === "cancelled";
}
