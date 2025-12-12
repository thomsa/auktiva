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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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
  // Resize to thumbnail size and optimize
  return sharp(filePath)
    .resize(400, 400, {
      fit: "cover",
      position: "center",
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

  // Get auction and check ownership
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
  });

  if (!auction) {
    return res.status(404).json({ message: "Auction not found" });
  }

  // Only owner can change thumbnail
  if (auction.creatorId !== session.user.id) {
    return res
      .status(403)
      .json({ message: "Only the auction owner can change the thumbnail" });
  }

  // GET - Get current thumbnail
  if (req.method === "GET") {
    return res.status(200).json({
      thumbnailUrl: auction.thumbnailUrl,
      publicUrl: auction.thumbnailUrl
        ? getPublicUrl(auction.thumbnailUrl)
        : null,
    });
  }

  // POST - Upload new thumbnail
  if (req.method === "POST") {
    try {
      const { files } = await parseForm(req);
      const fileArray = files.thumbnail;

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
        return res.status(500).json({ message: "Failed to upload image" });
      }

      // Update auction
      await prisma.auction.update({
        where: { id: auctionId },
        data: { thumbnailUrl: filename },
      });

      // Clean up temp file
      fs.unlink(file.filepath, () => {});

      return res.status(200).json({
        thumbnailUrl: filename,
        publicUrl: getPublicUrl(filename),
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ message: "Failed to upload image" });
    }
  }

  // DELETE - Remove thumbnail
  if (req.method === "DELETE") {
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

    return res.status(200).json({ message: "Thumbnail removed" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
