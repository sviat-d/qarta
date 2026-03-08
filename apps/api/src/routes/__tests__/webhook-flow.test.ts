import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Alert, Policy, PolicyCondition, PolicyAction, SafetyRails } from "@qarta/shared";
import { evaluateAlert } from "../../services/policy-engine.js";
import {
  parseEarlyFraudWarning,
  parseDispute,
} from "../../services/alert-processor.js";

/**
 * E2E-style integration test for the webhook processing pipeline.
 *
 * Tests the full flow: Stripe event → parse → policy evaluation → decision
 * without hitting a real database or Stripe API.
 */

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    id: "pol_test",
    merchantId: "mer_test",
    name: "Auto-refund small EFW",
    enabled: true,
    priority: 1,
    conditions: [
      { field: "amount", operator: "lt", value: 10000 },
      { field: "source", operator: "eq", value: "stripe_efw" },
      { field: "reason_category", operator: "eq", value: "fraudulent" },
    ],
    action: { type: "auto_refund" },
    safetyRails: {
      maxRefundsPerDay: 25,
      maxRefundsPerCustomer: 3,
      maxRefundAmount: 10000,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeEscalatePolicy(): Policy {
  return makePolicy({
    id: "pol_escalate",
    name: "Escalate high-value",
    priority: 2,
    conditions: [{ field: "amount", operator: "gte", value: 10000 }],
    action: { type: "escalate" },
    safetyRails: {
      maxRefundsPerDay: 50,
      maxRefundsPerCustomer: 5,
      maxRefundAmount: 100000,
    },
  });
}

function makeDismissPolicy(): Policy {
  return makePolicy({
    id: "pol_dismiss",
    name: "Dismiss duplicates",
    priority: 3,
    conditions: [{ field: "reason_category", operator: "eq", value: "duplicate" }],
    action: { type: "dismiss" },
  });
}

describe("Webhook Flow: EFW → Parse → Evaluate → Decision", () => {
  const policies = [makePolicy(), makeEscalatePolicy(), makeDismissPolicy()];

  it("parses EFW event and auto-refunds small fraudulent charge", () => {
    // 1. Simulate Stripe EFW event payload
    const efwEvent = {
      id: "issfr_1ABC",
      actionable: true,
      charge: "ch_test_123",
      payment_intent: "pi_test_123",
      created: Math.floor(Date.now() / 1000),
    };

    // 2. Parse into normalized alert
    const parsed = parseEarlyFraudWarning(efwEvent, 4900, "usd");

    expect(parsed.source).toBe("stripe_efw");
    expect(parsed.amount).toBe(4900);
    expect(parsed.currency).toBe("usd");
    expect(parsed.reasonCategory).toBe("fraudulent");
    expect(parsed.isActionable).toBe(true);
    expect(parsed.stripeChargeId).toBe("ch_test_123");
    expect(parsed.stripeEfwId).toBe("issfr_1ABC");

    // 3. Build alert object for policy engine
    const alert: Alert = {
      id: "alt_test",
      merchantId: "mer_test",
      source: parsed.source,
      status: "evaluating",
      stripeChargeId: parsed.stripeChargeId,
      stripeEfwId: parsed.stripeEfwId,
      amount: parsed.amount,
      currency: parsed.currency,
      reasonCategory: parsed.reasonCategory,
      isActionable: parsed.isActionable,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 4. Evaluate against policies
    const decision = evaluateAlert(alert, policies);

    expect(decision.matched).toBe(true);
    expect(decision.action?.type).toBe("auto_refund");
    expect(decision.policy?.id).toBe("pol_test");
    expect(decision.policy?.name).toBe("Auto-refund small EFW");
  });

  it("escalates high-value EFW alerts", () => {
    const efwEvent = {
      id: "issfr_2DEF",
      actionable: true,
      charge: "ch_test_456",
      created: Math.floor(Date.now() / 1000),
    };

    const parsed = parseEarlyFraudWarning(efwEvent, 25000, "usd");

    const alert: Alert = {
      id: "alt_test_2",
      merchantId: "mer_test",
      source: parsed.source,
      status: "evaluating",
      amount: parsed.amount,
      currency: parsed.currency,
      reasonCategory: parsed.reasonCategory,
      isActionable: parsed.isActionable,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const decision = evaluateAlert(alert, policies);

    expect(decision.matched).toBe(true);
    expect(decision.action?.type).toBe("escalate");
    expect(decision.policy?.id).toBe("pol_escalate");
  });

  it("parses dispute event and routes through policy engine", () => {
    // 1. Simulate Stripe dispute event
    const disputeEvent = {
      id: "dp_test_789",
      charge: "ch_test_789",
      payment_intent: "pi_test_789",
      amount: 3900,
      currency: "usd",
      reason: "fraudulent",
      status: "needs_response",
    };

    // 2. Parse into normalized alert
    const parsed = parseDispute(disputeEvent);

    expect(parsed.source).toBe("stripe_dispute");
    expect(parsed.amount).toBe(3900);
    expect(parsed.currency.toLowerCase()).toBe("usd");
    expect(parsed.reasonCategory).toBe("fraudulent");
    expect(parsed.stripeDisputeId).toBe("dp_test_789");
    expect(parsed.stripeChargeId).toBe("ch_test_789");

    // 3. Build alert
    const alert: Alert = {
      id: "alt_test_3",
      merchantId: "mer_test",
      source: parsed.source,
      status: "evaluating",
      stripeChargeId: parsed.stripeChargeId,
      stripeDisputeId: parsed.stripeDisputeId,
      amount: parsed.amount,
      currency: parsed.currency,
      reasonCategory: parsed.reasonCategory,
      isActionable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 4. Evaluate — dispute source doesn't match EFW policy condition (source: "eq" "stripe_efw")
    // but does match the escalate policy (amount >= 10000 is false since 3900 < 10000)
    // Neither matches, so should escalate via no-match
    const decision = evaluateAlert(alert, policies);

    // Small dispute from stripe_dispute source doesn't match the EFW-only policy
    // and 3900 < 10000 so doesn't match escalate policy either
    // duplicate policy won't match since reason is fraudulent not duplicate
    expect(decision.matched).toBe(false);
    expect(decision.reason).toBe("no_policy_matched");
  });

  it("dismisses duplicate reason alerts", () => {
    const disputeEvent = {
      id: "dp_dup_001",
      charge: "ch_dup_001",
      amount: 5000,
      currency: "usd",
      reason: "duplicate",
      status: "needs_response",
    };

    const parsed = parseDispute(disputeEvent);
    expect(parsed.reasonCategory).toBe("duplicate");

    const alert: Alert = {
      id: "alt_dup",
      merchantId: "mer_test",
      source: parsed.source,
      status: "evaluating",
      amount: parsed.amount,
      currency: parsed.currency,
      reasonCategory: parsed.reasonCategory,
      isActionable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const decision = evaluateAlert(alert, policies);

    expect(decision.matched).toBe(true);
    expect(decision.action?.type).toBe("dismiss");
    expect(decision.policy?.id).toBe("pol_dismiss");
  });

  it("handles non-actionable EFW by still processing through pipeline", () => {
    const efwEvent = {
      id: "issfr_noaction",
      actionable: false,
      charge: "ch_noaction",
      created: Math.floor(Date.now() / 1000),
    };

    const parsed = parseEarlyFraudWarning(efwEvent, 2000, "usd");
    expect(parsed.isActionable).toBe(false);

    // Non-actionable alerts still go through evaluation
    const alert: Alert = {
      id: "alt_noaction",
      merchantId: "mer_test",
      source: parsed.source,
      status: "evaluating",
      amount: parsed.amount,
      currency: parsed.currency,
      reasonCategory: parsed.reasonCategory,
      isActionable: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const decision = evaluateAlert(alert, policies);
    // Should still match the auto-refund policy based on conditions
    expect(decision.matched).toBe(true);
  });

  it("respects policy priority order", () => {
    // Create a case where multiple policies could match
    // but only the highest priority (lowest number) should be selected
    const overlappingPolicies: Policy[] = [
      makePolicy({
        id: "pol_low_priority",
        name: "Low priority catch-all",
        priority: 100,
        conditions: [{ field: "source", operator: "eq", value: "stripe_efw" }],
        action: { type: "dismiss" },
      }),
      makePolicy({
        id: "pol_high_priority",
        name: "High priority refund",
        priority: 1,
        conditions: [{ field: "source", operator: "eq", value: "stripe_efw" }],
        action: { type: "auto_refund" },
      }),
    ];

    const alert: Alert = {
      id: "alt_priority",
      merchantId: "mer_test",
      source: "stripe_efw",
      status: "evaluating",
      amount: 5000,
      currency: "usd",
      reasonCategory: "fraudulent",
      isActionable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const decision = evaluateAlert(alert, overlappingPolicies);

    expect(decision.matched).toBe(true);
    expect(decision.policy?.id).toBe("pol_high_priority");
    expect(decision.action?.type).toBe("auto_refund");
  });

  it("returns no_enabled_policies when all policies are disabled", () => {
    const disabledPolicies = policies.map((p) => ({ ...p, enabled: false }));

    const alert: Alert = {
      id: "alt_disabled",
      merchantId: "mer_test",
      source: "stripe_efw",
      status: "evaluating",
      amount: 5000,
      currency: "usd",
      reasonCategory: "fraudulent",
      isActionable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const decision = evaluateAlert(alert, disabledPolicies);
    expect(decision.matched).toBe(false);
    expect(decision.reason).toBe("no_enabled_policies");
  });
});
