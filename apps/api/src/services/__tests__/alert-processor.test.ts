import { describe, it, expect } from "vitest";
import {
  parseEarlyFraudWarning,
  parseDispute,
  mapReasonCategory,
} from "../alert-processor.js";

describe("parseEarlyFraudWarning", () => {
  it("parses an actionable EFW", () => {
    const efw = {
      id: "issfr_123",
      actionable: true,
      charge: "ch_abc",
      payment_intent: "pi_xyz",
      created: 1700000000,
    };

    const result = parseEarlyFraudWarning(efw, 4999, "usd");

    expect(result.source).toBe("stripe_efw");
    expect(result.stripeChargeId).toBe("ch_abc");
    expect(result.stripePaymentIntentId).toBe("pi_xyz");
    expect(result.stripeEfwId).toBe("issfr_123");
    expect(result.amount).toBe(4999);
    expect(result.currency).toBe("usd");
    expect(result.reasonCategory).toBe("fraudulent");
    expect(result.isActionable).toBe(true);
  });

  it("parses a non-actionable EFW", () => {
    const efw = {
      id: "issfr_456",
      actionable: false,
      charge: "ch_def",
      created: 1700000000,
    };

    const result = parseEarlyFraudWarning(efw, 10000, "eur");

    expect(result.isActionable).toBe(false);
    expect(result.stripePaymentIntentId).toBeUndefined();
    expect(result.reasonRaw).toBe("early_fraud_warning");
  });
});

describe("parseDispute", () => {
  it("parses a fraudulent dispute", () => {
    const dispute = {
      id: "dp_123",
      charge: "ch_abc",
      payment_intent: "pi_xyz",
      amount: 5000,
      currency: "usd",
      reason: "fraudulent",
      status: "needs_response",
    };

    const result = parseDispute(dispute);

    expect(result.source).toBe("stripe_dispute");
    expect(result.stripeChargeId).toBe("ch_abc");
    expect(result.stripeDisputeId).toBe("dp_123");
    expect(result.amount).toBe(5000);
    expect(result.currency).toBe("USD");
    expect(result.reasonCategory).toBe("fraudulent");
    expect(result.isActionable).toBe(true);
  });

  it("parses a dispute with needs_response as actionable", () => {
    const dispute = {
      id: "dp_456",
      charge: "ch_def",
      amount: 2000,
      currency: "gbp",
      reason: "product_not_received",
      status: "needs_response",
    };

    const result = parseDispute(dispute);

    expect(result.isActionable).toBe(true);
  });

  it("parses a won dispute as not actionable", () => {
    const dispute = {
      id: "dp_789",
      charge: "ch_ghi",
      amount: 3000,
      currency: "usd",
      reason: "duplicate",
      status: "won",
    };

    const result = parseDispute(dispute);

    expect(result.isActionable).toBe(false);
    expect(result.reasonCategory).toBe("duplicate");
  });

  it("converts currency to uppercase", () => {
    const dispute = {
      id: "dp_test",
      charge: "ch_test",
      amount: 1000,
      currency: "eur",
      reason: "general",
      status: "needs_response",
    };

    const result = parseDispute(dispute);
    expect(result.currency).toBe("EUR");
  });

  it("maps unknown reason to general", () => {
    const dispute = {
      id: "dp_unknown",
      charge: "ch_unknown",
      amount: 1000,
      currency: "usd",
      reason: "some_unknown_reason",
      status: "needs_response",
    };

    const result = parseDispute(dispute);
    expect(result.reasonCategory).toBe("general");
  });
});

describe("mapReasonCategory", () => {
  it("maps fraudulent correctly", () => {
    expect(mapReasonCategory("fraudulent")).toBe("fraudulent");
  });

  it("maps unknown reasons to general", () => {
    expect(mapReasonCategory("unknown_reason")).toBe("general");
  });

  it("maps product_not_received correctly", () => {
    expect(mapReasonCategory("product_not_received")).toBe(
      "product_not_received",
    );
  });
});
