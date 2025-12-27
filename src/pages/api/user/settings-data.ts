import { createHandler, withAuth } from "@/lib/api";
import type { ApiHandler } from "@/lib/api/types";
import * as userService from "@/lib/services/user.service";
import * as systemService from "@/lib/services/system.service";
import { createLogger } from "@/lib/logger";

const settingsLogger = createLogger("settings-api");

/**
 * GET /api/user/settings-data - Get all settings page data
 */
const getSettingsData: ApiHandler = async (_req, res, ctx) => {
  const userId = ctx.session!.user.id;

  // Get user settings
  const settings = await userService.getUserSettingsWithDefaults(userId);

  // Get connected accounts
  const connectedAccounts = await userService.getUserConnectedAccounts(userId);

  // Check if user has password
  const hasPassword = await userService.userHasPassword(userId);

  // Check Google OAuth
  const googleOAuthEnabled =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

  // Check deployment admin status
  const isDeploymentAdmin = await systemService.isDeploymentAdmin(
    ctx.session!.user.email!,
  );
  const systemSettings = await systemService.getSystemSettings();
  const hasDeploymentAdmin = !!systemSettings?.deploymentAdminEmail;

  // Version info
  let versionInfo = null;
  const isHostedDeployment =
    !!process.env.VERCEL || process.env.HOSTED === "true";

  if (!isHostedDeployment) {
    try {
      const packageJson = await import("../../../../package.json");
      const currentVersion = packageJson.version;

      const response = await fetch(
        "https://api.github.com/repos/thomsa/auktiva/releases/latest",
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Auktiva",
          },
        },
      );

      if (response.ok) {
        const release = await response.json();
        const latestVersion = release.tag_name?.replace(/^v/, "") || null;
        const updateAvailable =
          latestVersion && latestVersion !== currentVersion;

        versionInfo = {
          currentVersion,
          latestVersion,
          updateAvailable: !!updateAvailable,
          releaseUrl: release.html_url || null,
        };
      } else {
        versionInfo = {
          currentVersion,
          latestVersion: null,
          updateAvailable: false,
          releaseUrl: null,
        };
      }
    } catch (error) {
      settingsLogger.error({ error }, "Error fetching version info");
      const packageJson = await import("../../../../package.json");
      versionInfo = {
        currentVersion: packageJson.version,
        latestVersion: null,
        updateAvailable: false,
        releaseUrl: null,
      };
    }
  }

  res.status(200).json({
    settings: {
      emailOnNewItem: settings.emailOnNewItem,
      emailOnOutbid: settings.emailOnOutbid,
    },
    connectedAccounts: connectedAccounts.map((acc) => ({
      provider: acc.provider,
    })),
    hasPassword,
    googleOAuthEnabled,
    isDeploymentAdmin,
    hasDeploymentAdmin,
    versionInfo,
    isHostedDeployment,
  });
};

export default createHandler({
  GET: [[withAuth], getSettingsData],
});
