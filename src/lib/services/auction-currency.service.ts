import { prisma } from "@/lib/prisma";
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from "@/lib/api/errors";

const MANAGER_ROLES = ["OWNER", "ADMIN"] as const;

type ManagerRole = (typeof MANAGER_ROLES)[number];

export interface CreateAuctionCurrencyInput {
  code: string;
  name: string;
  symbol: string;
  conversionRateToBase?: number;
  fractionMode?: "INTEGER_ONLY" | "DECIMAL";
  precision?: number;
  inputMode?: "SCALAR" | "DENOMINATION";
  denominationConfig?: unknown;
  isBase?: boolean;
  sortOrder?: number;
  rules?: Array<{
    type: "MIN_INCREMENT" | "MIN_COMPONENT_RATIO" | "REQUIRED_DENOMINATION";
    isEnabled?: boolean;
    config: unknown;
  }>;
}

export interface UpdateAuctionCurrencyInput {
  name?: string;
  symbol?: string;
  conversionRateToBase?: number;
  fractionMode?: "INTEGER_ONLY" | "DECIMAL";
  precision?: number;
  inputMode?: "SCALAR" | "DENOMINATION";
  denominationConfig?: unknown;
  isBase?: boolean;
  isArchived?: boolean;
  sortOrder?: number;
  rules?: Array<{
    type: "MIN_INCREMENT" | "MIN_COMPONENT_RATIO" | "REQUIRED_DENOMINATION";
    isEnabled?: boolean;
    config: unknown;
  }>;
}

async function assertCurrencyManager(
  auctionId: string,
  userId: string,
): Promise<ManagerRole> {
  const membership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new NotFoundError("Auction membership not found");
  }

  if (!MANAGER_ROLES.includes(membership.role as ManagerRole)) {
    throw new ForbiddenError("Not authorized to manage auction currencies");
  }

  return membership.role as ManagerRole;
}

export async function listAuctionCurrencies(auctionId: string) {
  return prisma.auctionCurrencyProfile.findMany({
    where: { auctionId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      rules: {
        orderBy: { type: "asc" },
      },
    },
  });
}

export async function getAuctionCurrencyContext(auctionId: string) {
  const currencies = await listAuctionCurrencies(auctionId);
  const baseCurrency = currencies.find((currency) => currency.isBase) ?? null;

  return {
    currencies,
    baseCurrency,
  };
}

export async function resolveAuctionCurrencyForBid(
  auctionId: string,
  currencyProfileId?: string,
) {
  if (currencyProfileId) {
    const currency = await prisma.auctionCurrencyProfile.findFirst({
      where: {
        id: currencyProfileId,
        auctionId,
        isArchived: false,
      },
      include: { rules: true },
    });

    if (!currency) {
      throw new BadRequestError("Selected auction currency profile is invalid");
    }

    return currency;
  }

  const fallbackCurrency = await prisma.auctionCurrencyProfile.findFirst({
    where: {
      auctionId,
      isArchived: false,
    },
    orderBy: [{ isBase: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    include: { rules: true },
  });

  return fallbackCurrency;
}

export async function createAuctionCurrency(
  auctionId: string,
  userId: string,
  input: CreateAuctionCurrencyInput,
) {
  await assertCurrencyManager(auctionId, userId);

  const code = input.code.trim().toUpperCase();
  if (!code) {
    throw new BadRequestError("Currency code is required");
  }

  return prisma.$transaction(async (tx) => {
    if (input.isBase) {
      await tx.auctionCurrencyProfile.updateMany({
        where: { auctionId, isBase: true },
        data: { isBase: false },
      });
    }

    const created = await tx.auctionCurrencyProfile.create({
      data: {
        auctionId,
        code,
        name: input.name,
        symbol: input.symbol,
        conversionRateToBase: input.conversionRateToBase ?? 1,
        fractionMode: input.fractionMode ?? "DECIMAL",
        precision: input.precision ?? 2,
        inputMode: input.inputMode ?? "SCALAR",
        denominationConfig: (input.denominationConfig ?? null) as never,
        isBase: input.isBase ?? false,
        isArchived: false,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    if (input.rules?.length) {
      await tx.auctionCurrencyRule.createMany({
        data: input.rules.map((rule) => ({
          currencyProfileId: created.id,
          type: rule.type,
          isEnabled: rule.isEnabled ?? true,
          config: rule.config as never,
        })),
      });
    }

    return tx.auctionCurrencyProfile.findUnique({
      where: { id: created.id },
      include: { rules: true },
    });
  });
}

export async function updateAuctionCurrency(
  auctionId: string,
  currencyProfileId: string,
  userId: string,
  input: UpdateAuctionCurrencyInput,
) {
  await assertCurrencyManager(auctionId, userId);

  const existing = await prisma.auctionCurrencyProfile.findFirst({
    where: { id: currencyProfileId, auctionId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError("Auction currency profile not found");
  }

  return prisma.$transaction(async (tx) => {
    if (input.isBase === true) {
      await tx.auctionCurrencyProfile.updateMany({
        where: { auctionId, isBase: true, id: { not: currencyProfileId } },
        data: { isBase: false },
      });
    }

    await tx.auctionCurrencyProfile.update({
      where: { id: currencyProfileId },
      data: {
        name: input.name,
        symbol: input.symbol,
        conversionRateToBase: input.conversionRateToBase,
        fractionMode: input.fractionMode,
        precision: input.precision,
        inputMode: input.inputMode,
        denominationConfig: input.denominationConfig as never,
        isBase: input.isBase,
        isArchived: input.isArchived,
        sortOrder: input.sortOrder,
      },
    });

    if (input.rules) {
      await tx.auctionCurrencyRule.deleteMany({
        where: { currencyProfileId },
      });

      if (input.rules.length) {
        await tx.auctionCurrencyRule.createMany({
          data: input.rules.map((rule) => ({
            currencyProfileId,
            type: rule.type,
            isEnabled: rule.isEnabled ?? true,
            config: rule.config as never,
          })),
        });
      }
    }

    return tx.auctionCurrencyProfile.findUnique({
      where: { id: currencyProfileId },
      include: { rules: true },
    });
  });
}

export async function archiveAuctionCurrency(
  auctionId: string,
  currencyProfileId: string,
  userId: string,
) {
  await assertCurrencyManager(auctionId, userId);

  return prisma.auctionCurrencyProfile.updateMany({
    where: { id: currencyProfileId, auctionId },
    data: { isArchived: true, isBase: false },
  });
}
