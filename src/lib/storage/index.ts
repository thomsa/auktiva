import { Storage } from "@tweedegolf/storage-abstraction";

let storageInstance: Storage | null = null;

/**
 * Log storage configuration (without sensitive data)
 */
export function logStorageConfig(): void {
  const provider = process.env.STORAGE_PROVIDER || "local";
  console.log("[Storage] Configuration:", {
    provider,
    bucket: process.env.S3_BUCKET || "(not set)",
    region: process.env.S3_REGION || "us-east-1",
    hasAccessKey: !!process.env.S3_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.S3_SECRET_ACCESS_KEY,
    endpoint: process.env.S3_ENDPOINT || "(AWS default)",
  });
}

export function getStorage(): Storage {
  if (storageInstance) {
    return storageInstance;
  }

  const provider = process.env.STORAGE_PROVIDER || "local";

  console.log("[Storage] Initializing storage provider:", provider);

  if (provider === "s3" || provider === "aws") {
    // Validate required S3 environment variables
    const missingVars: string[] = [];
    if (!process.env.S3_BUCKET) missingVars.push("S3_BUCKET");
    if (!process.env.S3_ACCESS_KEY_ID) missingVars.push("S3_ACCESS_KEY_ID");
    if (!process.env.S3_SECRET_ACCESS_KEY) missingVars.push("S3_SECRET_ACCESS_KEY");

    if (missingVars.length > 0) {
      console.error("[Storage] ERROR: Missing required S3 environment variables:", missingVars);
      throw new Error(`Missing S3 configuration: ${missingVars.join(", ")}`);
    }

    const s3Config = {
      provider: "aws" as const,
      region: process.env.S3_REGION || "us-east-1",
      bucketName: process.env.S3_BUCKET,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
    };

    console.log("[Storage] S3 config:", {
      region: s3Config.region,
      bucketName: s3Config.bucketName,
      hasAccessKey: !!s3Config.accessKeyId,
      hasSecretKey: !!s3Config.secretAccessKey,
      endpoint: s3Config.endpoint || "(AWS default)",
    });

    storageInstance = new Storage(s3Config);
  } else {
    // Local filesystem configuration
    const directory = process.env.STORAGE_LOCAL_PATH || "./public/uploads";
    console.log("[Storage] Local config:", { directory });
    storageInstance = new Storage({
      provider: "local",
      directory,
      bucketName: "images", // Required subdirectory for local storage
      mode: 0o755,
    });
  }

  console.log("[Storage] Storage instance created successfully");
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
