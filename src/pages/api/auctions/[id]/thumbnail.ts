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
import { uploadLogger as logger } from "@/lib/logger";
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
  req: Parameters<ApiHandler>[0]
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

  logger.info({ auctionId }, "Starting thumbnail upload");

  let files;
  try {
    const formResult = await parseForm(req);
    files = formResult.files;
    logger.debug({ files: Object.keys(files) }, "Form parsed");
  } catch (parseError) {
    logger.error({ err: parseError }, "Form parse error");
    throw new BadRequestError(
      `Failed to parse upload: ${
        parseError instanceof Error ? parseError.message : "Unknown error"
      }`
    );
  }

  const fileArray = files.thumbnail;

  if (!fileArray || (Array.isArray(fileArray) && fileArray.length === 0)) {
    logger.warn("No thumbnail file in request");
    throw new BadRequestError("No image file provided");
  }

  const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
  logger.debug(
    {
      originalFilename: file.originalFilename,
      mimetype: file.mimetype,
      size: file.size,
    },
    "File received"
  );

  if (!file.mimetype || !ALLOWED_TYPES.includes(file.mimetype)) {
    logger.warn({ mimetype: file.mimetype }, "Invalid file type");
    throw new BadRequestError(
      "Invalid file type. Allowed: JPEG, PNG, WebP, GIF"
    );
  }

  // Process image
  let processedBuffer: Buffer;
  try {
    processedBuffer = await processImage(file.filepath);
    logger.debug({ bufferSize: processedBuffer.length }, "Image processed");
  } catch (processError) {
    logger.error({ err: processError }, "Image processing error");
    throw new BadRequestError(
      `Failed to process image: ${
        processError instanceof Error ? processError.message : "Unknown error"
      }`
    );
  }

  // Generate filename
  const filename = `auctions/${auctionId}/thumbnail-${Date.now()}.jpg`;
  logger.debug({ filename }, "Generated filename");

  // Delete old thumbnail if exists
  if (auction.thumbnailUrl) {
    logger.debug(
      { oldThumbnail: auction.thumbnailUrl },
      "Deleting old thumbnail"
    );
    const storage = getStorage();
    try {
      await storage.removeFile(auction.thumbnailUrl);
      logger.debug("Old thumbnail deleted");
    } catch (deleteError) {
      logger.warn({ err: deleteError }, "Failed to delete old thumbnail");
      // Ignore errors when deleting old file
    }
  }

  // Upload to storage
  let storage;
  try {
    storage = getStorage();
  } catch (storageError) {
    logger.error({ err: storageError }, "Failed to get storage");
    throw new BadRequestError(
      `Storage configuration error: ${
        storageError instanceof Error ? storageError.message : "Unknown error"
      }`
    );
  }

  let result;
  try {
    result = await storage.addFileFromBuffer({
      buffer: processedBuffer,
      targetPath: filename,
    });
    logger.debug(
      { error: result.error, value: result.value },
      "Storage upload result"
    );
  } catch (uploadError) {
    logger.error({ err: uploadError }, "Storage upload exception");
    throw new BadRequestError(
      `Storage upload failed: ${
        uploadError instanceof Error ? uploadError.message : "Unknown error"
      }`
    );
  }

  if (result.error) {
    logger.error({ error: result.error }, "Storage upload error");
    throw new BadRequestError(`Failed to upload image: ${result.error}`);
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
