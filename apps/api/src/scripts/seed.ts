/**
 * Seed script — creates a demo merchant with an API key and starter policies.
 *
 * Usage:
 *   npx tsx src/scripts/seed.ts
 *
 * Requires DATABASE_URL in .env (or environment).
 * Prints the generated API key — save it, it's shown only once.
 */

import { randomBytes, createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { db, schema } from "../db/index.js";
import { config } from "../config.js";

async function seed() {
  console.log("Seeding Qarta database...\n");

  // 1. Generate API key
  const apiKey = `qk_live_${randomBytes(24).toString("hex")}`;
  const apiKeyHash = createHash("sha256")
    .update(apiKey + config.API_KEY_SALT)
    .digest("hex");

  // 2. Create merchant
  const merchantId = `mer_${nanoid()}`;
  await db.insert(schema.merchants).values({
    id: merchantId,
    name: "Demo Merchant",
    email: "demo@qarta.eu",
    apiKeyHash,
  });

  console.log("Created merchant:");
  console.log(`  ID:    ${merchantId}`);
  console.log(`  Name:  Demo Merchant`);
  console.log(`  Email: demo@qarta.eu`);

  // 3. Create default policies
  const policies = [
    {
      id: `pol_${nanoid()}`,
      merchantId,
      name: "Auto-refund small fraud alerts",
      priority: 1,
      conditions: [
        { field: "amount", operator: "lt", value: 10000 },
        { field: "reason_category", operator: "eq", value: "fraudulent" },
        { field: "source", operator: "eq", value: "stripe_efw" },
      ],
      actionType: "auto_refund" as const,
      cancelSubscription: false,
      maxRefundsPerDay: 25,
      maxRefundsPerCustomer: 3,
      maxRefundAmount: 10000,
    },
    {
      id: `pol_${nanoid()}`,
      merchantId,
      name: "Escalate high-value alerts",
      priority: 2,
      conditions: [{ field: "amount", operator: "gte", value: 10000 }],
      actionType: "escalate" as const,
      cancelSubscription: false,
      maxRefundsPerDay: 50,
      maxRefundsPerCustomer: 5,
      maxRefundAmount: 100000,
    },
    {
      id: `pol_${nanoid()}`,
      merchantId,
      name: "Dismiss duplicate alerts",
      priority: 3,
      conditions: [
        { field: "reason_category", operator: "eq", value: "duplicate" },
      ],
      actionType: "dismiss" as const,
      cancelSubscription: false,
      maxRefundsPerDay: 100,
      maxRefundsPerCustomer: 10,
      maxRefundAmount: 50000,
    },
  ];

  for (const policy of policies) {
    await db.insert(schema.policies).values(policy);
  }

  console.log(`\nCreated ${policies.length} default policies:`);
  for (const p of policies) {
    console.log(`  #${p.priority} ${p.name} → ${p.actionType}`);
  }

  // 4. Print API key (shown only once)
  console.log("\n" + "=".repeat(60));
  console.log("YOUR API KEY (save it — shown only once!):");
  console.log(`\n  ${apiKey}\n`);
  console.log("Use this key to:");
  console.log("  - Log in to the dashboard");
  console.log("  - Call the API with: Authorization: Bearer <key>");
  console.log("=".repeat(60));

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
