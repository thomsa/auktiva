import { Storage } from "@tweedegolf/storage-abstraction";
import { AdapterAmazonS3 } from "@tweedegolf/sab-adapter-amazon-s3";
import { AdapterLocal } from "@tweedegolf/sab-adapter-local";
import { storageLogger as logger } from "@/lib/logger";
import fs from "fs";
import path from "path";

void [AdapterAmazonS3, AdapterLocal];

let storageInstance: Storage | null = null;

const LOCAL_STORAGE_DIR = "./public/uploads";

export function logStorageConfig(): void {
  const provider = process.env.STORAGE_PROVIDER || "local";

  if (provider === "s3") {
    logger.info(
      {
        provider,
        bucket: process.env.S3_BUCKET || "(not set)",
        region: process.env.S3_REGION || "us-east-1",
        hasAccessKey: !!process.env.S3_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.S3_SECRET_ACCESS_KEY,
        endpoint: process.env.S3_ENDPOINT || "(AWS default)",
      },
      "Storage configuration",
    );
  } else {
    logger.info(
      { provider, directory: LOCAL_STORAGE_DIR },
      "Storage configuration",
    );
  }
}

export function getStorage(): Storage {
  if (storageInstance) return storageInstance;

  const provider = process.env.STORAGE_PROVIDER || "local";
  logger.info({ provider }, "Initializing storage provider");

  if (provider === "s3" || provider === "aws") {
    storageInstance = initializeS3Storage();
  } else {
    storageInstance = initializeLocalStorage();
  }

  return storageInstance;
}

function initializeS3Storage(): Storage {
  const requiredVars = [
    "S3_BUCKET",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
  ];
  const missingVars = requiredVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    logger.error({ missingVars }, "Missing required S3 environment variables");
    throw new Error(`Missing S3 configuration: ${missingVars.join(", ")}`);
  }

  const config = {
    provider: "aws" as const,
    region: process.env.S3_REGION || "us-east-1",
    bucketName: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
  };

  logger.info(
    {
      region: config.region,
      bucketName: config.bucketName,
      hasAccessKey: !!config.accessKeyId,
      hasSecretKey: !!config.secretAccessKey,
      endpoint: config.endpoint || "(AWS default)",
    },
    "S3 config",
  );

  try {
    const storage = new Storage(config);
    logger.info("S3 Storage initialized");
    return storage;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, message }, "Failed to initialize S3 Storage");
    throw new Error(`S3 initialization failed: ${message}`);
  }
}

function initializeLocalStorage(): Storage {
  const bucketPath = path.join(LOCAL_STORAGE_DIR);

  logger.info({ directory: LOCAL_STORAGE_DIR }, "Local storage config");

  if (!fs.existsSync(bucketPath)) {
    logger.info({ bucketPath }, "Creating local storage directory");
    fs.mkdirSync(bucketPath, { recursive: true, mode: 0o755 });
  }

  try {
    const storage = new Storage({
      provider: "local",
      directory: LOCAL_STORAGE_DIR,
      mode: 0o755,
    });
    logger.info("Local Storage initialized");
    return storage;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Failed to initialize Local Storage");
    throw new Error(`Local storage initialization failed: ${message}`);
  }
}

export function getPublicUrl(filePath: string): string {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }

  const provider = process.env.STORAGE_PROVIDER || "local";

  if (provider === "s3") {
    return buildS3Url(filePath);
  }

  return buildLocalUrl(filePath);
}

function buildS3Url(filePath: string): string {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || "us-east-1";
  const endpoint = process.env.S3_ENDPOINT;

  if (endpoint) {
    return `${endpoint}/${bucket}/${filePath}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${filePath}`;
}

function buildLocalUrl(filePath: string): string {
  return `/uploads/${filePath}`;
}

export function getStorageProvider(): string {
  return process.env.STORAGE_PROVIDER || "local";
}
