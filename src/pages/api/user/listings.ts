import { createHandler, withAuth } from "@/lib/api";
import type { ApiHandler } from "@/lib/api/types";
import * as itemService from "@/lib/services/item.service";

/**
 * GET /api/user/listings - Get user's created items/listings
 */
const getUserListings: ApiHandler = async (_req, res, ctx) => {
  const items = await itemService.getUserCreatedItems(ctx.session!.user.id);
  res.status(200).json(items);
};

export default createHandler({
  GET: [[withAuth], getUserListings],
});
