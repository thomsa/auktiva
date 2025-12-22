import {
  createHandler,
  withAuth,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "@/lib/api";
import type { ApiHandler, Middleware } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getStorage, getPublicUrl } from "@/lib/storage";
import formidable from "formidable";
import fs from "fs";
import sharp from "sharp";
import type { Auction } from "@/generated/prisma/client";

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function parseForm(
  req: Parameters<ApiHandler>[0],
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({
    maxFileSize: MAX_FILE_SIZE,
    filter: ({ mimetype }) => {
      return mimetype ? ALLOWED_TYPES.includes(mimetype) : false;
    },
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

async function processImage(filePath: string): Promise<Buffer> {
  // Resize to thumbnail size and optimize
  return sharp(filePath)
    .resize(400, 400, {
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

type ContextWithAuction = { auction: Auction };

/**
 * Middleware to check auction ownership for thumbnail operations
 */
const withAuctionOwnership: Middleware = (next) => async (req, res, ctx) => {
  const auctionId = ctx.params.id;

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
  });

  if (!auction) {
    throw new NotFoundError("Auction not found");
  }

  if (auction.creatorId !== ctx.session!.user.id) {
    throw new ForbiddenError("Only the auction owner can change the thumbnail");
  }

  (ctx as typeof ctx & ContextWithAuction).auction = auction;

  return next(req, res, ctx);
};

const getThumbnail: ApiHandler = async (_req, res, ctx) => {
  const { auction } = ctx as typeof ctx & ContextWithAuction;

  res.status(200).json({
    thumbnailUrl: auction.thumbnailUrl,
    publicUrl: auction.thumbnailUrl ? getPublicUrl(auction.thumbnailUrl) : null,
  });
};

const uploadThumbnail: ApiHandler = async (req, res, ctx) => {
  const { auction } = ctx as typeof ctx & ContextWithAuction;
  const auctionId = ctx.params.id;

  const { files } = await parseForm(req);
  const fileArray = files.thumbnail;

  if (!fileArray || (Array.isArray(fileArray) && fileArray.length === 0)) {
    throw new BadRequestError("No image file provided");
  }

  const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;

  if (!file.mimetype || !ALLOWED_TYPES.includes(file.mimetype)) {
    throw new BadRequestError(
      "Invalid file type. Allowed: JPEG, PNG, WebP, GIF",
    );
  }

  // Process image
  const processedBuffer = await processImage(file.filepath);

  // Generate filename
  const filename = `auctions/${auctionId}/thumbnail-${Date.now()}.jpg`;

  // Delete old thumbnail if exists
  if (auction.thumbnailUrl) {
    const storage = getStorage();
    try {
      await storage.removeFile(auction.thumbnailUrl);
    } catch {
      // Ignore errors when deleting old file
    }
  }

  // Upload to storage
  const storage = getStorage();
  const result = await storage.addFileFromBuffer({
    buffer: processedBuffer,
    targetPath: filename,
  });

  if (result.error) {
    console.error("Storage upload error:", result.error);
    throw new BadRequestError("Failed to upload image");
  }

  // Update auction
  await prisma.auction.update({
    where: { id: auctionId },
    data: { thumbnailUrl: filename },
  });

  // Clean up temp file
  fs.unlink(file.filepath, () => {});

  res.status(200).json({
    thumbnailUrl: filename,
    publicUrl: getPublicUrl(filename),
  });
};

const deleteThumbnail: ApiHandler = async (_req, res, ctx) => {
  const { auction } = ctx as typeof ctx & ContextWithAuction;
  const auctionId = ctx.params.id;

  if (auction.thumbnailUrl) {
    const storage = getStorage();
    try {
      await storage.removeFile(auction.thumbnailUrl);
    } catch {
      // Ignore errors when deleting
    }

    await prisma.auction.update({
      where: { id: auctionId },
      data: { thumbnailUrl: null },
    });
  }

  res.status(200).json({ message: "Thumbnail removed" });
};

export default createHandler({
  GET: [[withAuth, withAuctionOwnership], getThumbnail],
  POST: [[withAuth, withAuctionOwnership], uploadThumbnail],
  DELETE: [[withAuth, withAuctionOwnership], deleteThumbnail],
});
