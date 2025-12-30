import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { getStorageProvider } from "@/lib/storage";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Only serve files for local storage provider
  if (getStorageProvider() !== "local") {
    return res.status(404).json({ error: "Not found" });
  }

  const { path: pathSegments } = req.query;

  if (!pathSegments || !Array.isArray(pathSegments)) {
    return res.status(400).json({ error: "Invalid path" });
  }

  // Construct file path and prevent directory traversal
  const relativePath = pathSegments.join("/");
  if (relativePath.includes("..")) {
    return res.status(400).json({ error: "Invalid path" });
  }

  const filePath = path.join(process.cwd(), "public/uploads", relativePath);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  // Get file stats
  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    return res.status(404).json({ error: "Not a file" });
  }

  // Determine content type
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  // Set caching headers (1 year for immutable content)
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Length", stats.size);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}
