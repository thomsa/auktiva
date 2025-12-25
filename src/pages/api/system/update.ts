import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as systemService from "@/lib/services/system.service";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

interface UpdateResponse {
  success: boolean;
  message: string;
  output?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed`,
    });
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  // Check if user is deployment admin
  const isAdmin = await systemService.isDeploymentAdmin(session.user.email);
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Only deployment admin can trigger updates",
    });
  }

  // Look for update script
  const projectRoot = process.cwd();
  const updateScriptPath = path.join(projectRoot, "scripts", "update.sh");

  // Check if update script exists
  if (!fs.existsSync(updateScriptPath)) {
    return res.status(400).json({
      success: false,
      message: "Update script not found. Please create scripts/update.sh",
      error: `Expected script at: ${updateScriptPath}`,
    });
  }

  try {
    // Execute the update script
    // The script should handle: git pull, npm install, build, and restart
    const { stdout, stderr } = await execAsync(`bash ${updateScriptPath}`, {
      cwd: projectRoot,
      timeout: 300000, // 5 minute timeout
      env: {
        ...process.env,
        AUKTIVA_UPDATE: "true",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Update triggered successfully. The application will restart.",
      output: stdout,
      error: stderr || undefined,
    });
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    return res.status(500).json({
      success: false,
      message: "Update failed",
      output: execError.stdout,
      error: execError.stderr || execError.message,
    });
  }
}
