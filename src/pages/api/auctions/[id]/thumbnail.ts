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

  console.log("[ThumbnailUpload] Starting upload for auction:", auctionId);

  console.log("[ThumbnailUpload] Parsing form data...");
  let files;
  try {
    const formResult = await parseForm(req);
    files = formResult.files;
    console.log("[ThumbnailUpload] Form parsed, files:", Object.keys(files));
  } catch (parseError) {
    console.error("[ThumbnailUpload] Form parse error:", parseError);
    throw new BadRequestError(
      `Failed to parse upload: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
    );
  }

  const fileArray = files.thumbnail;

  if (!fileArray || (Array.isArray(fileArray) && fileArray.length === 0)) {
    console.log("[ThumbnailUpload] No thumbnail file in request");
    throw new BadRequestError("No image file provided");
  }

  const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
  console.log("[ThumbnailUpload] File received:", {
    originalFilename: file.originalFilename,
    mimetype: file.mimetype,
    size: file.size,
  });

  if (!file.mimetype || !ALLOWED_TYPES.includes(file.mimetype)) {
    console.log("[ThumbnailUpload] Invalid file type:", file.mimetype);
    throw new BadRequestError(
      "Invalid file type. Allowed: JPEG, PNG, WebP, GIF",
    );
  }

  // Process image
  console.log("[ThumbnailUpload] Processing image with sharp...");
  let processedBuffer: Buffer;
  try {
    processedBuffer = await processImage(file.filepath);
    console.log("[ThumbnailUpload] Image processed, buffer size:", processedBuffer.length);
  } catch (processError) {
    console.error("[ThumbnailUpload] Image processing error:", processError);
    throw new BadRequestError(
      `Failed to process image: ${processError instanceof Error ? processError.message : "Unknown error"}`,
    );
  }

  // Generate filename
  const filename = `auctions/${auctionId}/thumbnail-${Date.now()}.jpg`;
  console.log("[ThumbnailUpload] Generated filename:", filename);

  // Delete old thumbnail if exists
  if (auction.thumbnailUrl) {
    console.log("[ThumbnailUpload] Deleting old thumbnail:", auction.thumbnailUrl);
    const storage = getStorage();
    try {
      await storage.removeFile(auction.thumbnailUrl);
      console.log("[ThumbnailUpload] Old thumbnail deleted");
    } catch (deleteError) {
      console.warn("[ThumbnailUpload] Failed to delete old thumbnail:", deleteError);
      // Ignore errors when deleting old file
    }
  }

  // Upload to storage
  console.log("[ThumbnailUpload] Getting storage instance...");
  let storage;
  try {
    storage = getStorage();
    console.log("[ThumbnailUpload] Storage instance obtained");
  } catch (storageError) {
    console.error("[ThumbnailUpload] Failed to get storage:", storageError);
    throw new BadRequestError(
      `Storage configuration error: ${storageError instanceof Error ? storageError.message : "Unknown error"}`,
    );
  }

  console.log("[ThumbnailUpload] Uploading to storage...");
  let result;
  try {
    result = await storage.addFileFromBuffer({
      buffer: processedBuffer,
      targetPath: filename,
    });
    console.log("[ThumbnailUpload] Storage upload result:", {
      error: result.error,
      value: result.value,
    });
  } catch (uploadError) {
    console.error("[ThumbnailUpload] Storage upload exception:", uploadError);
    throw new BadRequestError(
      `Storage upload failed: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`,
    );
  }

  if (result.error) {
    console.error("[ThumbnailUpload] Storage upload error:", result.error);
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
