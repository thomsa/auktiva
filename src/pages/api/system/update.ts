import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as systemService from "@/lib/services/system.service";
import { updateLogger } from "@/lib/logger";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

interface UpdateResponse {
  success: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateResponse>
) {
  updateLogger.info({ method: req.method }, "Update request received");

  if (req.method !== "POST") {
    updateLogger.warn({ method: req.method }, "Invalid method");
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false });
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    updateLogger.warn("Unauthorized update attempt - no session");
    return res.status(401).json({ success: false });
  }

  updateLogger.info({ email: session.user.email }, "Update requested by user");

  // Check if user is deployment admin
  const isAdmin = await systemService.isDeploymentAdmin(session.user.email);
  if (!isAdmin) {
    updateLogger.warn(
      { email: session.user.email },
      "Non-admin user attempted update"
    );
    return res.status(403).json({ success: false });
  }

  updateLogger.info(
    { email: session.user.email },
    "User verified as deployment admin"
  );

  // Look for update script
  const projectRoot = process.cwd();
  const updateScriptPath = path.join(projectRoot, "scripts", "update.sh");

  updateLogger.info(
    { projectRoot, updateScriptPath },
    "Looking for update script"
  );

  // Check if update script exists
  if (!fs.existsSync(updateScriptPath)) {
    updateLogger.error({ updateScriptPath }, "Update script not found");
    return res.status(400).json({ success: false });
  }

  // Return success immediately - the update will run in the background
  // The client will poll for availability
  res.status(200).json({ success: true });

  updateLogger.info("Update script found, executing...");

  try {
    // Execute the update script
    // The script should handle: git pull, npm install, build, and restart
    updateLogger.info(
      { script: updateScriptPath, timeout: "5 minutes" },
      "Starting update script execution"
    );

    const { stdout, stderr } = await execAsync(`bash ${updateScriptPath}`, {
      cwd: projectRoot,
      timeout: 300000, // 5 minute timeout
      env: {
        ...process.env,
        AUKTIVA_UPDATE: "true",
      },
    });

    updateLogger.info("Update script completed successfully");
    if (stdout) {
      updateLogger.info({ stdout }, "Update stdout");
    }
    if (stderr) {
      updateLogger.warn({ stderr }, "Update stderr");
    }
  } catch (error) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    updateLogger.error(
      {
        message: execError.message,
        stdout: execError.stdout,
        stderr: execError.stderr,
      },
      "Update script failed"
    );
  }
}
