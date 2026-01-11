import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

interface HealthResponse {
  status: "ok" | "error";
  timestamp: string;
  version: string;
  database: "connected" | "disconnected";
}

/**
 * Health check endpoint for Docker/Kubernetes health probes
 * GET /api/health
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end();
  }

  let databaseStatus: "connected" | "disconnected" = "disconnected";

  try {
    // Test database connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    databaseStatus = "connected";
  } catch {
    databaseStatus = "disconnected";
  }

  const isHealthy = databaseStatus === "connected";

  const response: HealthResponse = {
    status: isHealthy ? "ok" : "error",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "unknown",
    database: databaseStatus,
  };

  return res.status(isHealthy ? 200 : 503).json(response);
}
