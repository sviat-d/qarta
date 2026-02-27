import type {
  Alert,
  Policy,
  PolicyCondition,
  PolicyAction,
} from "@qarta/shared";

export interface PolicyDecision {
  matched: boolean;
  policy?: Policy;
  action?: PolicyAction;
  reason: string;
}

/**
 * Evaluate an alert against a merchant's policies.
 * Policies are evaluated in priority order (lowest priority number first).
 * First matching policy wins.
 */
export function evaluateAlert(
  alert: Alert,
  policies: Policy[],
): PolicyDecision {
  const enabledPolicies = policies
    .filter((p) => p.enabled)
    .sort((a, b) => a.priority - b.priority);

  if (enabledPolicies.length === 0) {
    return {
      matched: false,
      reason: "no_enabled_policies",
    };
  }

  for (const policy of enabledPolicies) {
    if (matchesAllConditions(alert, policy.conditions)) {
      return {
        matched: true,
        policy,
        action: policy.action,
        reason: `matched_policy:${policy.name}`,
      };
    }
  }

  return {
    matched: false,
    reason: "no_policy_matched",
  };
}

/**
 * Check if an alert matches ALL conditions in a policy.
 */
function matchesAllConditions(
  alert: Alert,
  conditions: PolicyCondition[],
): boolean {
  return conditions.every((condition) => matchesCondition(alert, condition));
}

/**
 * Evaluate a single condition against an alert.
 */
function matchesCondition(
  alert: Alert,
  condition: PolicyCondition,
): boolean {
  const fieldValue = getFieldValue(alert, condition.field);
  if (fieldValue === undefined) return false;

  switch (condition.operator) {
    case "eq":
      return fieldValue === condition.value;
    case "lt":
      return typeof fieldValue === "number" && fieldValue < (condition.value as number);
    case "lte":
      return typeof fieldValue === "number" && fieldValue <= (condition.value as number);
    case "gt":
      return typeof fieldValue === "number" && fieldValue > (condition.value as number);
    case "gte":
      return typeof fieldValue === "number" && fieldValue >= (condition.value as number);
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(String(fieldValue));
    default:
      return false;
  }
}

/**
 * Extract the value of a field from an alert for condition matching.
 */
function getFieldValue(
  alert: Alert,
  field: PolicyCondition["field"],
): string | number | boolean | undefined {
  switch (field) {
    case "amount":
      return alert.amount;
    case "reason_category":
      return alert.reasonCategory;
    case "source":
      return alert.source;
    case "card_brand":
      return alert.cardBrand ?? undefined;
    case "is_actionable":
      return alert.isActionable;
    default:
      return undefined;
  }
}
