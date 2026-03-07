import { describe, it, expect } from "vitest";
import { evaluateAlert, type PolicyDecision } from "../policy-engine.js";
import type { Alert, Policy } from "@qarta/shared";

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "alt_test",
    merchantId: "mer_test",
    source: "stripe_efw",
    status: "evaluating",
    amount: 5000, // $50
    currency: "USD",
    reasonCategory: "fraudulent",
    isActionable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    id: "pol_test",
    merchantId: "mer_test",
    name: "Test Policy",
    enabled: true,
    priority: 10,
    conditions: [],
    action: { type: "auto_refund" },
    safetyRails: {
      maxRefundsPerDay: 25,
      maxRefundsPerCustomer: 3,
      maxRefundAmount: 50000,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("evaluateAlert", () => {
  it("returns no_enabled_policies when no policies exist", () => {
    const result = evaluateAlert(makeAlert(), []);
    expect(result.matched).toBe(false);
    expect(result.reason).toBe("no_enabled_policies");
  });

  it("returns no_enabled_policies when all policies are disabled", () => {
    const result = evaluateAlert(makeAlert(), [
      makePolicy({ enabled: false }),
    ]);
    expect(result.matched).toBe(false);
    expect(result.reason).toBe("no_enabled_policies");
  });

  it("matches a policy with no conditions (catch-all)", () => {
    const policy = makePolicy({ conditions: [] });
    const result = evaluateAlert(makeAlert(), [policy]);
    expect(result.matched).toBe(true);
    expect(result.policy?.id).toBe("pol_test");
    expect(result.action?.type).toBe("auto_refund");
  });

  it("matches policy with amount lt condition", () => {
    const policy = makePolicy({
      conditions: [{ field: "amount", operator: "lt", value: 10000 }],
    });
    const result = evaluateAlert(makeAlert({ amount: 5000 }), [policy]);
    expect(result.matched).toBe(true);
  });

  it("does not match when amount exceeds lt condition", () => {
    const policy = makePolicy({
      conditions: [{ field: "amount", operator: "lt", value: 3000 }],
    });
    const result = evaluateAlert(makeAlert({ amount: 5000 }), [policy]);
    expect(result.matched).toBe(false);
    expect(result.reason).toBe("no_policy_matched");
  });

  it("matches policy with amount gte condition", () => {
    const policy = makePolicy({
      conditions: [{ field: "amount", operator: "gte", value: 5000 }],
    });
    const result = evaluateAlert(makeAlert({ amount: 5000 }), [policy]);
    expect(result.matched).toBe(true);
  });

  it("matches policy with eq condition on reason_category", () => {
    const policy = makePolicy({
      conditions: [
        { field: "reason_category", operator: "eq", value: "fraudulent" },
      ],
    });
    const result = evaluateAlert(
      makeAlert({ reasonCategory: "fraudulent" }),
      [policy],
    );
    expect(result.matched).toBe(true);
  });

  it("does not match wrong reason_category", () => {
    const policy = makePolicy({
      conditions: [
        { field: "reason_category", operator: "eq", value: "duplicate" },
      ],
    });
    const result = evaluateAlert(
      makeAlert({ reasonCategory: "fraudulent" }),
      [policy],
    );
    expect(result.matched).toBe(false);
  });

  it("matches policy with in operator on source", () => {
    const policy = makePolicy({
      conditions: [
        {
          field: "source",
          operator: "in",
          value: ["stripe_efw", "stripe_dispute"],
        },
      ],
    });
    const result = evaluateAlert(makeAlert({ source: "stripe_efw" }), [policy]);
    expect(result.matched).toBe(true);
  });

  it("does not match in operator when value not in array", () => {
    const policy = makePolicy({
      conditions: [
        { field: "source", operator: "in", value: ["stripe_dispute"] },
      ],
    });
    const result = evaluateAlert(makeAlert({ source: "stripe_efw" }), [policy]);
    expect(result.matched).toBe(false);
  });

  it("requires ALL conditions to match (AND logic)", () => {
    const policy = makePolicy({
      conditions: [
        { field: "amount", operator: "lt", value: 10000 },
        { field: "reason_category", operator: "eq", value: "fraudulent" },
        { field: "source", operator: "eq", value: "stripe_efw" },
      ],
    });
    const result = evaluateAlert(
      makeAlert({
        amount: 5000,
        reasonCategory: "fraudulent",
        source: "stripe_efw",
      }),
      [policy],
    );
    expect(result.matched).toBe(true);
  });

  it("fails when one condition out of many does not match", () => {
    const policy = makePolicy({
      conditions: [
        { field: "amount", operator: "lt", value: 10000 },
        { field: "reason_category", operator: "eq", value: "duplicate" },
      ],
    });
    const result = evaluateAlert(
      makeAlert({ amount: 5000, reasonCategory: "fraudulent" }),
      [policy],
    );
    expect(result.matched).toBe(false);
  });

  it("evaluates policies in priority order (lowest first)", () => {
    const lowPriority = makePolicy({
      id: "pol_low",
      name: "Low Priority",
      priority: 100,
      conditions: [],
      action: { type: "escalate" },
    });
    const highPriority = makePolicy({
      id: "pol_high",
      name: "High Priority",
      priority: 1,
      conditions: [],
      action: { type: "auto_refund" },
    });

    // Pass low priority first to ensure sorting works
    const result = evaluateAlert(makeAlert(), [lowPriority, highPriority]);
    expect(result.matched).toBe(true);
    expect(result.policy?.id).toBe("pol_high");
    expect(result.action?.type).toBe("auto_refund");
  });

  it("first matching policy wins", () => {
    const first = makePolicy({
      id: "pol_1",
      priority: 1,
      conditions: [{ field: "amount", operator: "lt", value: 10000 }],
      action: { type: "auto_refund" },
    });
    const second = makePolicy({
      id: "pol_2",
      priority: 2,
      conditions: [],
      action: { type: "escalate" },
    });

    const result = evaluateAlert(makeAlert({ amount: 5000 }), [
      second,
      first,
    ]);
    expect(result.policy?.id).toBe("pol_1");
  });

  it("falls through to next policy when first doesnt match", () => {
    const strict = makePolicy({
      id: "pol_strict",
      priority: 1,
      conditions: [{ field: "amount", operator: "lt", value: 1000 }],
      action: { type: "auto_refund" },
    });
    const catchAll = makePolicy({
      id: "pol_catch",
      priority: 2,
      conditions: [],
      action: { type: "escalate" },
    });

    const result = evaluateAlert(makeAlert({ amount: 5000 }), [
      strict,
      catchAll,
    ]);
    expect(result.policy?.id).toBe("pol_catch");
    expect(result.action?.type).toBe("escalate");
  });

  it("matches lte operator correctly at boundary", () => {
    const policy = makePolicy({
      conditions: [{ field: "amount", operator: "lte", value: 5000 }],
    });
    expect(evaluateAlert(makeAlert({ amount: 5000 }), [policy]).matched).toBe(
      true,
    );
    expect(evaluateAlert(makeAlert({ amount: 5001 }), [policy]).matched).toBe(
      false,
    );
  });

  it("matches gt operator correctly", () => {
    const policy = makePolicy({
      conditions: [{ field: "amount", operator: "gt", value: 5000 }],
    });
    expect(evaluateAlert(makeAlert({ amount: 5001 }), [policy]).matched).toBe(
      true,
    );
    expect(evaluateAlert(makeAlert({ amount: 5000 }), [policy]).matched).toBe(
      false,
    );
  });

  it("handles is_actionable boolean condition", () => {
    const policy = makePolicy({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conditions: [{ field: "is_actionable", operator: "eq", value: true as any }],
    });
    expect(
      evaluateAlert(makeAlert({ isActionable: true }), [policy]).matched,
    ).toBe(true);
    expect(
      evaluateAlert(makeAlert({ isActionable: false }), [policy]).matched,
    ).toBe(false);
  });

  it("handles card_brand with undefined value", () => {
    const policy = makePolicy({
      conditions: [{ field: "card_brand", operator: "eq", value: "visa" }],
    });
    // cardBrand is undefined by default in makeAlert
    const result = evaluateAlert(makeAlert(), [policy]);
    expect(result.matched).toBe(false);
  });

  it("matches card_brand when present", () => {
    const policy = makePolicy({
      conditions: [{ field: "card_brand", operator: "eq", value: "visa" }],
    });
    const result = evaluateAlert(makeAlert({ cardBrand: "visa" }), [policy]);
    expect(result.matched).toBe(true);
  });

  it("returns dismiss action type", () => {
    const policy = makePolicy({
      action: { type: "dismiss" },
      conditions: [],
    });
    const result = evaluateAlert(makeAlert(), [policy]);
    expect(result.matched).toBe(true);
    expect(result.action?.type).toBe("dismiss");
  });
});
