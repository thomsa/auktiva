import { createHandler, withAuth } from "@/lib/api";
import type { ApiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const getCurrencies: ApiHandler = async (_req, res) => {
  const currencies = await prisma.currency.findMany({
    orderBy: { code: "asc" },
  });

  res.status(200).json(currencies);
};

export default createHandler({
  GET: [[withAuth], getCurrencies],
});
