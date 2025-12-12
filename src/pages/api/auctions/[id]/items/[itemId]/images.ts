import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorage, getPublicUrl } from "@/lib/storage";
import formidable from "formidable";
import fs from "fs";
import sharp from "sharp";

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
  req: NextApiRequest,
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const auctionId = req.query.id as string;
  const itemId = req.query.itemId as string;

  // Check membership
  const membership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    return res.status(403).json({ message: "Not a member of this auction" });
  }

  // Get item
  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    include: {
      _count: {
        select: { images: true },
      },
    },
  });

  if (!item || item.auctionId !== auctionId) {
    return res.status(404).json({ message: "Item not found" });
  }

  // Check permission (creator or admin)
  const isCreator = item.creatorId === session.user.id;
  const isAdmin = ["OWNER", "ADMIN"].includes(membership.role);

  if (!isCreator && !isAdmin) {
    return res.status(403).json({
      message: "You don't have permission to manage images for this item",
    });
  }

  // GET - List images
  if (req.method === "GET") {
    const images = await prisma.auctionItemImage.findMany({
      where: { auctionItemId: itemId },
      orderBy: { order: "asc" },
    });

    return res.status(200).json(images);
  }

  // POST - Upload image
  if (req.method === "POST") {
    // Check image limit
    if (item._count.images >= MAX_IMAGES_PER_ITEM) {
      return res.status(400).json({
        message: `Maximum ${MAX_IMAGES_PER_ITEM} images allowed per item`,
      });
    }

    try {
      const { files } = await parseForm(req);
      const fileArray = files.image;

      if (!fileArray || (Array.isArray(fileArray) && fileArray.length === 0)) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;

      if (!file.mimetype || !ALLOWED_TYPES.includes(file.mimetype)) {
        return res.status(400).json({
          message: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF",
        });
      }

      // Process image
      const processedBuffer = await processImage(file.filepath);

      // Generate unique filename
      const ext = ".jpg"; // Always save as JPEG after processing
      const filename = `${auctionId}/${itemId}/${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;

      // Upload to storage
      const storage = getStorage();
      const result = await storage.addFileFromBuffer({
        buffer: processedBuffer,
        targetPath: filename,
      });

      if (result.error) {
        console.error("Storage upload error:", result.error);
        return res.status(500).json({ message: "Failed to upload image" });
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

      return res.status(201).json({
        ...image,
        publicUrl: getPublicUrl(filename),
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ message: "Failed to upload image" });
    }
  }

  // DELETE - Delete image
  if (req.method === "DELETE") {
    const { imageId } = req.query;

    if (!imageId || typeof imageId !== "string") {
      return res.status(400).json({ message: "Image ID required" });
    }

    const image = await prisma.auctionItemImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.auctionItemId !== itemId) {
      return res.status(404).json({ message: "Image not found" });
    }

    try {
      // Delete from storage
      const storage = getStorage();
      await storage.removeFile(image.url);

      // Delete from database
      await prisma.auctionItemImage.delete({
        where: { id: imageId },
      });

      return res.status(200).json({ message: "Image deleted" });
    } catch (error) {
      console.error("Delete error:", error);
      return res.status(500).json({ message: "Failed to delete image" });
    }
  }

  // PATCH - Reorder images
  if (req.method === "PATCH") {
    const { imageIds } = req.body;

    if (!Array.isArray(imageIds)) {
      return res.status(400).json({ message: "imageIds array required" });
    }

    try {
      // Update order for each image
      await Promise.all(
        imageIds.map((id: string, index: number) =>
          prisma.auctionItemImage.updateMany({
            where: { id, auctionItemId: itemId },
            data: { order: index },
          }),
        ),
      );

      return res.status(200).json({ message: "Images reordered" });
    } catch (error) {
      console.error("Reorder error:", error);
      return res.status(500).json({ message: "Failed to reorder images" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
