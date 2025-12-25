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
import type { AuctionItem } from "@/generated/prisma/client";

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGES_PER_ITEM = 10;

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
  // Resize and optimize image
  return sharp(filePath)
    .resize(1200, 1200, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

type ContextWithItem = { item: AuctionItem & { _count: { images: number } } };

/**
 * Middleware to check membership and item permissions
 */
const withItemPermission: Middleware = (next) => async (req, res, ctx) => {
  const auctionId = ctx.params.id;
  const itemId = ctx.params.itemId;

  const membership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId: ctx.session!.user.id,
      },
    },
  });

  if (!membership) {
    throw new ForbiddenError("Not a member of this auction");
  }

  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    include: {
      _count: {
        select: { images: true },
      },
    },
  });

  if (!item || item.auctionId !== auctionId) {
    throw new NotFoundError("Item not found");
  }

  // Check permission (creator or admin)
  const isCreator = item.creatorId === ctx.session!.user.id;
  const isAdmin = ["OWNER", "ADMIN"].includes(membership.role);

  if (!isCreator && !isAdmin) {
    throw new ForbiddenError(
      "You don't have permission to manage images for this item"
    );
  }

  ctx.membership = membership;
  (ctx as typeof ctx & ContextWithItem).item = item;

  return next(req, res, ctx);
};

const getImages: ApiHandler = async (_req, res, ctx) => {
  const itemId = ctx.params.itemId;

  const images = await prisma.auctionItemImage.findMany({
    where: { auctionItemId: itemId },
    orderBy: { order: "asc" },
  });

  res.status(200).json(images);
};

const uploadImage: ApiHandler = async (req, res, ctx) => {
  const auctionId = ctx.params.id;
  const itemId = ctx.params.itemId;
  const { item } = ctx as typeof ctx & ContextWithItem;

  logger.info({ itemId, auctionId }, "Starting image upload");

  // Check image limit
  if (item._count.images >= MAX_IMAGES_PER_ITEM) {
    logger.warn({ imageCount: item._count.images }, "Image limit reached");
    throw new BadRequestError(
      `Maximum ${MAX_IMAGES_PER_ITEM} images allowed per item`
    );
  }

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

  const fileArray = files.image;

  if (!fileArray || (Array.isArray(fileArray) && fileArray.length === 0)) {
    logger.warn("No image file in request");
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

  // Generate unique filename
  const ext = ".jpg"; // Always save as JPEG after processing
  const filename = `${auctionId}/${itemId}/${Date.now()}-${Math.random()
    .toString(36)
    .substring(7)}${ext}`;
  logger.debug({ filename }, "Generated filename");

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

  // Get current max order
  const maxOrder = await prisma.auctionItemImage.aggregate({
    where: { auctionItemId: itemId },
    _max: { order: true },
  });

  // Save to database
  const image = await prisma.auctionItemImage.create({
    data: {
      auctionItemId: itemId,
      url: filename,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  // Clean up temp file
  fs.unlink(file.filepath, () => {});

  res.status(201).json({
    ...image,
    publicUrl: getPublicUrl(filename),
  });
};

const deleteImage: ApiHandler = async (req, res, ctx) => {
  const itemId = ctx.params.itemId;
  const { imageId } = req.query;

  if (!imageId || typeof imageId !== "string") {
    throw new BadRequestError("Image ID required");
  }

  const image = await prisma.auctionItemImage.findUnique({
    where: { id: imageId },
  });

  if (!image || image.auctionItemId !== itemId) {
    throw new NotFoundError("Image not found");
  }

  // Delete from storage
  const storage = getStorage();
  await storage.removeFile(image.url);

  // Delete from database
  await prisma.auctionItemImage.delete({
    where: { id: imageId },
  });

  res.status(200).json({ message: "Image deleted" });
};

const reorderImages: ApiHandler = async (req, res, ctx) => {
  const itemId = ctx.params.itemId;
  const { imageIds } = req.body;

  if (!Array.isArray(imageIds)) {
    throw new BadRequestError("imageIds array required");
  }

  // Update order for each image
  await Promise.all(
    imageIds.map((id: string, index: number) =>
      prisma.auctionItemImage.updateMany({
        where: { id, auctionItemId: itemId },
        data: { order: index },
      })
    )
  );

  res.status(200).json({ message: "Images reordered" });
};

export default createHandler({
  GET: [[withAuth, withItemPermission], getImages],
  POST: [[withAuth, withItemPermission], uploadImage],
  DELETE: [[withAuth, withItemPermission], deleteImage],
  PATCH: [[withAuth, withItemPermission], reorderImages],
});
