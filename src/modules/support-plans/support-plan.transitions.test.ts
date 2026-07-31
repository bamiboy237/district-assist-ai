import { describe, expect, it } from "vitest";
import { canTransitionPlan, isTerminalStatus } from "./support-plan.transitions.js";

describe("canTransitionPlan", () => {
  it("allows only the documented lifecycle transitions", () => {
    expect(canTransitionPlan("draft", "active")).toBe(true);
    expect(canTransitionPlan("active", "completed")).toBe(true);
    expect(canTransitionPlan("draft", "cancelled")).toBe(true);
    expect(canTransitionPlan("active", "cancelled")).toBe(true);
    expect(canTransitionPlan("completed", "active")).toBe(true);
    expect(canTransitionPlan("draft", "completed")).toBe(false);
    expect(canTransitionPlan("completed", "draft")).toBe(false);
    expect(canTransitionPlan("completed", "cancelled")).toBe(false);
    expect(canTransitionPlan("cancelled", "active")).toBe(false);
    expect(canTransitionPlan("cancelled", "draft")).toBe(false);
    expect(canTransitionPlan("cancelled", "completed")).toBe(false);
  });
});

describe("isTerminalStatus", () => {
  it("identifies terminal plan statuses", () => {
    expect(isTerminalStatus("completed")).toBe(true);
    expect(isTerminalStatus("cancelled")).toBe(true);
    expect(isTerminalStatus("draft")).toBe(false);
    expect(isTerminalStatus("active")).toBe(false);
  });
});
