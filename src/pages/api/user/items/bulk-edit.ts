import { createHandler, withAuth } from "@/lib/api";
import type { ApiHandler } from "@/lib/api/types";
import * as itemService from "@/lib/services/item.service";

/**
 * GET /api/user/items/bulk-edit - Get all user items for bulk editing
 */
const getItemsForBulkEdit: ApiHandler = async (_req, res, ctx) => {
  const userId = ctx.session!.user.id;
  const items = await itemService.getUserItemsForBulkEdit(userId);
  res.status(200).json(items);
};

/**
 * PATCH /api/user/items/bulk-edit - Bulk update multiple items
 */
const bulkUpdateItems: ApiHandler = async (req, res, ctx) => {
  const userId = ctx.session!.user.id;
  const { itemIds, updates } = req.body as {
    itemIds: string[];
    updates: itemService.BulkUpdateInput;
  };

  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ message: "itemIds array is required" });
  }

  const result = await itemService.bulkUpdateItems(itemIds, userId, updates);
  res.status(200).json(result);
};

export default createHandler({
  GET: [[withAuth], getItemsForBulkEdit],
  PATCH: [[withAuth], bulkUpdateItems],
});
