interface CurrencyProfileShape {
  conversionRateToBase: number;
  inputMode: "SCALAR" | "DENOMINATION";
  denominationConfig: unknown;
}

interface CurrencyRuleShape {
  type: string;
  config: unknown;
  isEnabled: boolean;
}

export interface BidEntryInput {
  amount?: number;
  enteredRepresentation?: unknown;
}

export interface RuleViolation {
  code:
    | "EQUAL_NOT_HIGHER"
    | "MIN_INCREMENT_NOT_MET"
    | "MIN_COMPONENT_RATIO_NOT_MET"
    | "REQUIRED_DENOMINATION_MISSING"
    | "INVALID_DENOMINATION_INPUT"
    | "UNSUPPORTED_RULE_TYPE";
  message: string;
  ruleType?: string;
  details?: Record<string, unknown>;
}

interface DenominationComponent {
  key: string;
  factor: number;
}

interface DenominationConfig {
  components: DenominationComponent[];
}

function parseJsonValue<T>(value: unknown): T | null {
  if (value == null) return null;

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  return value as T;
}

function parseDenominationConfig(
  profile: Pick<CurrencyProfileShape, "denominationConfig">,
): DenominationConfig | null {
  const parsed = parseJsonValue<DenominationConfig>(profile.denominationConfig);
  if (!parsed || !Array.isArray(parsed.components)) return null;
  return parsed;
}

function getComponentNumericValue(
  enteredRepresentation: unknown,
  key: string,
): number {
  const parsed = parseJsonValue<Record<string, unknown>>(enteredRepresentation);
  if (!parsed) return 0;

  const components =
    typeof parsed.components === "object" && parsed.components
      ? (parsed.components as Record<string, unknown>)
      : parsed;

  const value = components[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function calculateDenominationNormalizedAmount(
  denominationConfig: DenominationConfig,
  enteredRepresentation: unknown,
): number | null {
  const parsed = parseJsonValue<Record<string, unknown>>(enteredRepresentation);
  if (!parsed) return null;

  const components =
    typeof parsed.components === "object" && parsed.components
      ? (parsed.components as Record<string, unknown>)
      : parsed;

  let total = 0;
  for (const component of denominationConfig.components) {
    const rawValue = components[component.key];
    if (rawValue === undefined) continue;
    if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
      return null;
    }

    total += rawValue * component.factor;
  }

  return total;
}

export function normalizeBidValue(
  profile: Pick<
    CurrencyProfileShape,
    "conversionRateToBase" | "inputMode" | "denominationConfig"
  > | null,
  input: BidEntryInput,
): number | null {
  if (!profile) {
    return typeof input.amount === "number" ? input.amount : null;
  }

  const conversionRate =
    typeof profile.conversionRateToBase === "number" &&
    Number.isFinite(profile.conversionRateToBase) &&
    profile.conversionRateToBase > 0
      ? profile.conversionRateToBase
      : 1;

  if (profile.inputMode === "DENOMINATION") {
    const denominationConfig = parseDenominationConfig(profile);
    if (!denominationConfig) return null;

    const normalized = calculateDenominationNormalizedAmount(
      denominationConfig,
      input.enteredRepresentation,
    );
    if (normalized == null) return null;

    return normalized * conversionRate;
  }

  if (typeof input.amount !== "number" || !Number.isFinite(input.amount)) {
    return null;
  }

  return input.amount * conversionRate;
}

export function evaluateBidRules(params: {
  normalizedAmount: number;
  currentHighestNormalized: number | null;
  rules: Pick<CurrencyRuleShape, "type" | "config" | "isEnabled">[];
  enteredRepresentation?: unknown;
}): RuleViolation[] {
  const {
    normalizedAmount,
    currentHighestNormalized,
    rules,
    enteredRepresentation,
  } = params;

  const violations: RuleViolation[] = [];

  if (
    typeof currentHighestNormalized === "number" &&
    normalizedAmount <= currentHighestNormalized
  ) {
    violations.push({
      code: "EQUAL_NOT_HIGHER",
      message: "Bid must be strictly higher than the current highest bid",
      details: {
        currentHighestNormalized,
        submittedNormalized: normalizedAmount,
      },
    });
  }

  for (const rule of rules) {
    if (!rule.isEnabled) continue;

    const config = parseJsonValue<Record<string, unknown>>(rule.config) ?? {};

    if (rule.type === "MIN_INCREMENT") {
      if (typeof currentHighestNormalized !== "number") continue;
      const minIncrement =
        typeof config.minIncrementBaseUnits === "number"
          ? config.minIncrementBaseUnits
          : 0;

      if (normalizedAmount - currentHighestNormalized < minIncrement) {
        violations.push({
          code: "MIN_INCREMENT_NOT_MET",
          message: "Bid does not meet the minimum increment requirement",
          ruleType: rule.type,
          details: {
            minIncrementBaseUnits: minIncrement,
            currentHighestNormalized,
            submittedNormalized: normalizedAmount,
          },
        });
      }
      continue;
    }

    if (rule.type === "MIN_COMPONENT_RATIO") {
      const componentKey =
        typeof config.componentKey === "string" ? config.componentKey : "";
      const minRatio =
        typeof config.minRatio === "number" ? config.minRatio : 0;

      if (!componentKey || normalizedAmount <= 0) continue;

      const componentValue = getComponentNumericValue(
        enteredRepresentation,
        componentKey,
      );
      const ratio = componentValue / normalizedAmount;

      if (ratio < minRatio) {
        violations.push({
          code: "MIN_COMPONENT_RATIO_NOT_MET",
          message: "Bid component ratio is below the required threshold",
          ruleType: rule.type,
          details: {
            componentKey,
            minRatio,
            actualRatio: ratio,
          },
        });
      }
      continue;
    }

    if (rule.type === "REQUIRED_DENOMINATION") {
      const requiredKeys = Array.isArray(config.requiredKeys)
        ? config.requiredKeys.filter(
            (key): key is string => typeof key === "string",
          )
        : [];

      for (const key of requiredKeys) {
        const value = getComponentNumericValue(enteredRepresentation, key);
        if (value <= 0) {
          violations.push({
            code: "REQUIRED_DENOMINATION_MISSING",
            message: "Bid is missing a required denomination component",
            ruleType: rule.type,
            details: { key },
          });
          break;
        }
      }
      continue;
    }

    violations.push({
      code: "UNSUPPORTED_RULE_TYPE",
      message: `Unsupported rule type: ${rule.type}`,
      ruleType: rule.type,
    });
  }

  return violations;
}
