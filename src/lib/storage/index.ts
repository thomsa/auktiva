import { Storage } from "@tweedegolf/storage-abstraction";

let storageInstance: Storage | null = null;

export function getStorage(): Storage {
  if (storageInstance) {
    return storageInstance;
  }

  const provider = process.env.STORAGE_PROVIDER || "local";

  if (provider === "s3" || provider === "aws") {
    // S3 configuration
    storageInstance = new Storage({
      provider: "aws",
      region: process.env.S3_REGION || "us-east-1",
      bucketName: process.env.S3_BUCKET,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
    });
  } else {
    // Local filesystem configuration
    const directory = process.env.STORAGE_LOCAL_PATH || "./public/uploads";
    storageInstance = new Storage({
      provider: "local",
      directory,
      bucketName: "images", // Required subdirectory for local storage
      mode: 0o755,
    });
  }

  return storageInstance;
}

export function getPublicUrl(path: string): string {
  // If path is already an absolute URL, return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const provider = process.env.STORAGE_PROVIDER || "local";

  if (provider === "s3") {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION || "us-east-1";
    const endpoint = process.env.S3_ENDPOINT;

    if (endpoint) {
      // Custom S3 endpoint (MinIO, etc.)
      return `${endpoint}/${bucket}/${path}`;
    }
    // AWS S3
    return `https://${bucket}.s3.${region}.amazonaws.com/${path}`;
  }

  // Local storage - serve from public folder
  const urlPrefix = process.env.STORAGE_LOCAL_URL_PREFIX || "/uploads";
  return `${urlPrefix}/images/${path}`;
}

export function getStorageProvider(): string {
  return process.env.STORAGE_PROVIDER || "local";
}
