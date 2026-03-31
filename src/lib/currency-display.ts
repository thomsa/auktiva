export interface CurrencyDisplayProfile {
  symbol: string;
  inputMode?: "SCALAR" | "DENOMINATION";
  fractionMode?: "INTEGER_ONLY" | "DECIMAL";
  precision?: number;
  denominationConfig?: unknown;
}

interface DenominationComponent {
  key: string;
  label?: string;
}

function parseDenominationComponents(
  denominationConfig: unknown,
): DenominationComponent[] {
  let parsedConfig: unknown = denominationConfig;

  if (typeof denominationConfig === "string") {
    try {
      parsedConfig = JSON.parse(denominationConfig);
    } catch {
      parsedConfig = null;
    }
  }

  if (!parsedConfig || typeof parsedConfig !== "object") {
    return [];
  }

  const components = (parsedConfig as { components?: unknown }).components;

  if (!Array.isArray(components)) {
    return [];
  }

  return components.filter(
    (component): component is DenominationComponent =>
      typeof component === "object" &&
      component !== null &&
      typeof (component as { key?: unknown }).key === "string",
  );
}

export function formatAuctionAmount(
  amount: number,
  profile: CurrencyDisplayProfile,
): string {
  const decimals =
    profile.fractionMode === "INTEGER_ONLY"
      ? 0
      : typeof profile.precision === "number"
        ? profile.precision
        : 2;

  return `${profile.symbol}${amount.toFixed(decimals)}`;
}

export function formatAuctionBidDisplay(params: {
  amount: number;
  enteredRepresentation?: unknown;
  profile?: CurrencyDisplayProfile | null;
  fallbackSymbol: string;
}): string {
  const { amount, enteredRepresentation, profile, fallbackSymbol } = params;

  if (!profile) {
    return `${fallbackSymbol}${amount.toFixed(2)}`;
  }

  if (profile.inputMode === "DENOMINATION") {
    const components = parseDenominationComponents(profile.denominationConfig);
    if (components.length > 0) {
      let parsedRepresentation: unknown = enteredRepresentation;

      if (typeof enteredRepresentation === "string") {
        try {
          parsedRepresentation = JSON.parse(enteredRepresentation);
        } catch {
          parsedRepresentation = null;
        }
      }

      const values =
        parsedRepresentation && typeof parsedRepresentation === "object"
          ? (parsedRepresentation as { components?: unknown }).components
          : null;

      if (values && typeof values === "object") {
        const rendered = components
          .map((component) => {
            const raw = (values as Record<string, unknown>)[component.key];
            const value = typeof raw === "number" ? raw : 0;
            if (!Number.isFinite(value) || value <= 0) {
              return null;
            }
            return `${value} ${component.label || component.key}`;
          })
          .filter((part): part is string => part !== null);

        if (rendered.length > 0) {
          return rendered.join(" • ");
        }
      }
    }
  }

  return formatAuctionAmount(amount, profile);
}
