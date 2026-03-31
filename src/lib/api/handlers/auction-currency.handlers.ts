import type { ApiHandler } from "@/lib/api/types";
import type { ValidatedRequest } from "@/lib/api/middleware";
import { z } from "zod";
import * as auctionCurrencyService from "@/lib/services/auction-currency.service";

const currencyRuleSchema = z.object({
  type: z.enum([
    "MIN_INCREMENT",
    "MIN_COMPONENT_RATIO",
    "REQUIRED_DENOMINATION",
  ]),
  isEnabled: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()),
});

export const createAuctionCurrencySchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(100),
  symbol: z.string().min(1).max(20),
  conversionRateToBase: z.number().positive().optional(),
  fractionMode: z.enum(["INTEGER_ONLY", "DECIMAL"]).optional(),
  precision: z.number().int().min(0).max(8).optional(),
  inputMode: z.enum(["SCALAR", "DENOMINATION"]).optional(),
  denominationConfig: z.record(z.string(), z.unknown()).optional(),
  isBase: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  rules: z.array(currencyRuleSchema).optional(),
});

export const updateAuctionCurrencySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  symbol: z.string().min(1).max(20).optional(),
  conversionRateToBase: z.number().positive().optional(),
  fractionMode: z.enum(["INTEGER_ONLY", "DECIMAL"]).optional(),
  precision: z.number().int().min(0).max(8).optional(),
  inputMode: z.enum(["SCALAR", "DENOMINATION"]).optional(),
  denominationConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  isBase: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  rules: z.array(currencyRuleSchema).optional(),
});

export type CreateAuctionCurrencyBody = z.infer<
  typeof createAuctionCurrencySchema
>;
export type UpdateAuctionCurrencyBody = z.infer<
  typeof updateAuctionCurrencySchema
>;

export const listAuctionCurrencies: ApiHandler = async (_req, res, ctx) => {
  const data = await auctionCurrencyService.getAuctionCurrencyContext(
    ctx.params.id,
  );
  res.status(200).json(data);
};

export const createAuctionCurrency: ApiHandler = async (req, res, ctx) => {
  const { validatedBody } = req as ValidatedRequest<CreateAuctionCurrencyBody>;

  const created = await auctionCurrencyService.createAuctionCurrency(
    ctx.params.id,
    ctx.session!.user.id,
    validatedBody,
  );

  res.status(201).json(created);
};

export const updateAuctionCurrency: ApiHandler = async (req, res, ctx) => {
  const { validatedBody } = req as ValidatedRequest<UpdateAuctionCurrencyBody>;

  const updated = await auctionCurrencyService.updateAuctionCurrency(
    ctx.params.id,
    ctx.params.currencyId,
    ctx.session!.user.id,
    validatedBody,
  );

  res.status(200).json(updated);
};

export const archiveAuctionCurrency: ApiHandler = async (_req, res, ctx) => {
  await auctionCurrencyService.archiveAuctionCurrency(
    ctx.params.id,
    ctx.params.currencyId,
    ctx.session!.user.id,
  );

  res.status(200).json({ message: "Auction currency archived" });
};
