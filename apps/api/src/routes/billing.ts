import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import Stripe from "stripe";
import { BILLING_PLANS, type BillingPlanId } from "@qarta/shared";
import { authenticateApiKey } from "../middleware/auth.js";
import { db, schema } from "../db/index.js";
import { config } from "../config.js";

function getStripe(): Stripe | null {
  if (!config.STRIPE_SECRET_KEY) return null;
  return new Stripe(config.STRIPE_SECRET_KEY);
}

const checkoutSchema = z.object({
  plan: z.enum(["pro", "growth"]),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function billingRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authenticateApiKey);

  // Get current subscription
  app.get("/", async (request, reply) => {
    const merchant = request.merchant!;

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.merchantId, merchant.id),
    });

    const plan = subscription?.plan ?? "free";
    const planDetails = BILLING_PLANS[plan as BillingPlanId] ?? BILLING_PLANS.free;

    return reply.send({
      success: true,
      data: {
        plan,
        planDetails,
        status: subscription?.status ?? "active",
        stripeSubscriptionId: subscription?.stripeSubscriptionId ?? null,
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      },
    });
  });

  // Create Stripe Checkout session to upgrade
  app.post("/checkout", async (request, reply) => {
    const merchant = request.merchant!;
    const stripe = getStripe();

    if (!stripe) {
      return reply.status(503).send({
        success: false,
        error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe is not configured" },
      });
    }

    const parsed = checkoutSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid checkout data" },
      });
    }

    const { plan, successUrl, cancelUrl } = parsed.data;

    // Get or create Stripe customer
    let subscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.merchantId, merchant.id),
    });

    let stripeCustomerId = subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: merchant.email,
        name: merchant.name,
        metadata: { merchantId: merchant.id },
      });
      stripeCustomerId = customer.id;

      if (!subscription) {
        subscription = {
          id: `sub_${nanoid()}`,
          merchantId: merchant.id,
          plan: "free",
          status: "active",
          stripeCustomerId,
          stripeSubscriptionId: null,
          stripePriceId: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await db.insert(schema.subscriptions).values(subscription);
      } else {
        await db
          .update(schema.subscriptions)
          .set({ stripeCustomerId, updatedAt: new Date() })
          .where(eq(schema.subscriptions.merchantId, merchant.id));
      }
    }

    // Create checkout session
    // Note: stripePriceId should be set as env vars in production
    // For now we use metadata to identify the plan
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Qarta ${BILLING_PLANS[plan].name} Plan`,
              description: `Chargeback deflection — ${plan === "pro" ? "$199/mo + $15 per deflection" : "$399/mo + $10 per deflection"}`,
            },
            unit_amount: BILLING_PLANS[plan].priceMonthly,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      metadata: {
        merchantId: merchant.id,
        plan,
      },
      success_url: successUrl ?? `${config.DASHBOARD_URL}/settings?billing=success`,
      cancel_url: cancelUrl ?? `${config.DASHBOARD_URL}/settings?billing=canceled`,
    });

    return reply.send({
      success: true,
      data: { url: session.url, sessionId: session.id },
    });
  });

  // Create Stripe Customer Portal session
  app.post("/portal", async (request, reply) => {
    const merchant = request.merchant!;
    const stripe = getStripe();

    if (!stripe) {
      return reply.status(503).send({
        success: false,
        error: { code: "STRIPE_NOT_CONFIGURED", message: "Stripe is not configured" },
      });
    }

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.merchantId, merchant.id),
    });

    if (!subscription?.stripeCustomerId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_SUBSCRIPTION", message: "No active billing subscription" },
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${config.DASHBOARD_URL}/settings`,
    });

    return reply.send({
      success: true,
      data: { url: session.url },
    });
  });

  // Handle Stripe billing webhooks (subscription events)
  // This is called from the main webhook handler when billing events are received
  app.post("/webhook-sync", async (request, reply) => {
    // This endpoint is for internal use by the billing webhook handler
    const body = request.body as {
      type: string;
      data: Record<string, unknown>;
    };

    await handleBillingEvent(body.type, body.data);

    return reply.send({ success: true });
  });
}

/**
 * Process Stripe billing webhook events.
 * Called from the billing webhook endpoint or the main webhook handler.
 */
export async function handleBillingEvent(
  eventType: string,
  data: Record<string, unknown>,
): Promise<void> {
  switch (eventType) {
    case "checkout.session.completed": {
      const session = data as {
        customer: string;
        subscription: string;
        metadata: { merchantId: string; plan: string };
      };

      if (session.metadata?.merchantId && session.metadata?.plan) {
        await db
          .update(schema.subscriptions)
          .set({
            plan: session.metadata.plan,
            stripeSubscriptionId: session.subscription,
            status: "active",
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.merchantId, session.metadata.merchantId));

        console.log(`Subscription upgraded: ${session.metadata.merchantId} → ${session.metadata.plan}`);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = data as {
        id: string;
        status: string;
        cancel_at_period_end: boolean;
        current_period_start: number;
        current_period_end: number;
      };

      const subscription = await db.query.subscriptions.findFirst({
        where: eq(schema.subscriptions.stripeSubscriptionId, sub.id),
      });

      if (subscription) {
        await db
          .update(schema.subscriptions)
          .set({
            status: sub.status as "active" | "past_due" | "canceled" | "trialing",
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.id, subscription.id));
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = data as { id: string };

      const subscription = await db.query.subscriptions.findFirst({
        where: eq(schema.subscriptions.stripeSubscriptionId, sub.id),
      });

      if (subscription) {
        await db
          .update(schema.subscriptions)
          .set({
            plan: "free",
            status: "canceled",
            stripeSubscriptionId: null,
            stripePriceId: null,
            cancelAtPeriodEnd: false,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.id, subscription.id));

        console.log(`Subscription canceled: ${subscription.merchantId} → free`);
      }
      break;
    }
  }
}
