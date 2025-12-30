import { createHandler, withAuth } from "@/lib/api";
import type { ApiHandler } from "@/lib/api/types";
import * as bidService from "@/lib/services/bid.service";

/**
 * GET /api/user/history - Get user's bid history with stats
 */
const getUserHistory: ApiHandler = async (_req, res, ctx) => {
  const historyData = await bidService.getUserBidHistory(ctx.session!.user.id);
  res.status(200).json(historyData);
};

export default createHandler({
  GET: [[withAuth], getUserHistory],
});
