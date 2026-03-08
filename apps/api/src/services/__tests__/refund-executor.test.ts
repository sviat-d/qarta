import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("stripe", () => {
  class MockStripe {
    refunds = { create: mockCreate };
    static errors = {
      StripeError: class StripeError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "StripeError";
        }
      },
    };
  }
  return { default: MockStripe };
});

vi.mock("../../config.js", () => ({
  config: { STRIPE_SECRET_KEY: "sk_test_xxx" },
}));

import { executeRefund } from "../refund-executor.js";

describe("executeRefund", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("executes a full refund successfully", async () => {
    mockCreate.mockResolvedValue({
      id: "re_123",
      status: "succeeded",
    });

    const result = await executeRefund({
      stripeChargeId: "ch_abc",
      reason: "fraudulent",
    });

    expect(result.success).toBe(true);
    expect(result.stripeRefundId).toBe("re_123");
    expect(mockCreate).toHaveBeenCalledWith({
      charge: "ch_abc",
      amount: undefined,
      reason: "fraudulent",
      metadata: {
        source: "qarta_auto_refund",
        original_reason: "fraudulent",
      },
    });
  });

  it("executes a partial refund with amount", async () => {
    mockCreate.mockResolvedValue({
      id: "re_456",
      status: "pending",
    });

    const result = await executeRefund({
      stripeChargeId: "ch_def",
      amount: 2500,
      reason: "duplicate",
    });

    expect(result.success).toBe(true);
    expect(result.stripeRefundId).toBe("re_456");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2500 }),
    );
  });

  it("handles Stripe API errors", async () => {
    mockCreate.mockRejectedValue(
      Object.assign(new Error("Charge already refunded"), {
        type: "StripeCardError",
      }),
    );

    const result = await executeRefund({
      stripeChargeId: "ch_already_refunded",
    });

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe("Unknown refund error");
  });

  it("uses default reason when none provided", async () => {
    mockCreate.mockResolvedValue({
      id: "re_789",
      status: "succeeded",
    });

    await executeRefund({
      stripeChargeId: "ch_no_reason",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          original_reason: "policy_match",
        }),
      }),
    );
  });

  it("treats pending refund as success", async () => {
    mockCreate.mockResolvedValue({
      id: "re_pending",
      status: "pending",
    });

    const result = await executeRefund({
      stripeChargeId: "ch_pending",
    });

    expect(result.success).toBe(true);
    expect(result.stripeRefundId).toBe("re_pending");
  });
});
