#!/usr/bin/env npx tsx

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { execSync } from "node:child_process";
import { select, input, password, confirm } from "@inquirer/prompts";
import ora from "ora";
import chalk from "chalk";

// =============================================================================
// NODE.JS VERSION CHECK
// =============================================================================

const MIN_NODE_VERSION = 20;

function checkNodeVersion(): void {
  const currentVersion = process.versions.node;
  const majorVersion = parseInt(currentVersion.split(".")[0], 10);

  if (majorVersion < MIN_NODE_VERSION) {
    console.log();
    console.log(chalk.red("━".repeat(60)));
    console.log();
    console.log(chalk.red.bold("  ✗ Node.js version requirement not met"));
    console.log();
    console.log(
      `  ${chalk.dim("Current version:")}  ${chalk.red(`v${currentVersion}`)}`,
    );
    console.log(
      `  ${chalk.dim("Required version:")} ${chalk.green(
        `v${MIN_NODE_VERSION}.x or higher`,
      )}`,
    );
    console.log();
    console.log(chalk.yellow("  Please upgrade Node.js to continue."));
    console.log();
    console.log(chalk.dim("  Download the latest LTS version from:"));
    console.log(chalk.cyan("    https://nodejs.org/"));
    console.log();
    console.log(chalk.dim("  Or use a version manager like nvm:"));
    console.log(chalk.cyan("    nvm install 20"));
    console.log(chalk.cyan("    nvm use 20"));
    console.log();
    console.log(chalk.dim("  After upgrading, run setup again:"));
    console.log(chalk.cyan("    npm run setup"));
    console.log();
    console.log(chalk.red("━".repeat(60)));
    console.log();
    process.exit(1);
  }
}

// Run version check immediately
checkNodeVersion();

// =============================================================================
// BRANDING
// =============================================================================

const LOGO = `
${chalk.cyan.bold(`    ___         __   __  _            `)}
${chalk.cyan.bold(`   /   | __  __/ /__/ /_(_)   ______ _`)}
${chalk.cyan.bold(`  / /| |/ / / / //_/ __/ / | / / __ \`/`)}
${chalk.cyan.bold(` / ___ / /_/ / ,< / /_/ /| |/ / /_/ / `)}
${chalk.cyan.bold(`/_/  |_\\__,_/_/|_|\\__/_/ |___/\\__,_/  `)}
`;

const TAGLINE =
  "A comprehensive auction platform for hosting private and public auctions";

// =============================================================================
// TYPES
// =============================================================================

interface EnvConfig {
  DATABASE_URL: string;
  DATABASE_AUTH_TOKEN?: string;
  AUTH_SECRET: string;
  AUTH_URL: string;
  STORAGE_PROVIDER: "local" | "s3";
  S3_BUCKET?: string;
  S3_REGION?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_ENDPOINT?: string;
  ALLOW_OPEN_AUCTIONS: string;
  PORT: string;
  // Email configuration
  EMAIL_PROVIDER?: "brevo" | "smtp";
  BREVO_API_KEY?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_SECURE?: string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  MAIL_FROM?: string;
  MAIL_FROM_NAME?: string;
  NEXT_PUBLIC_APP_URL?: string;
  CRON_SECRET?: string;
  // OAuth configuration
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  // Deployment admin
  DEPLOYMENT_ADMIN_EMAIL?: string;
  // Realtime configuration
  REALTIME_DRIVER?: "soketi" | "pusher" | "disabled";
  SOKETI_APP_ID?: string;
  SOKETI_APP_KEY?: string;
  SOKETI_APP_SECRET?: string;
  SOKETI_HOST?: string;
  SOKETI_PORT?: string;
  SOKETI_USE_TLS?: string;
  NEXT_PUBLIC_REALTIME_DRIVER?: string;
  NEXT_PUBLIC_SOKETI_APP_KEY?: string;
  NEXT_PUBLIC_SOKETI_HOST?: string;
  NEXT_PUBLIC_SOKETI_PORT?: string;
  NEXT_PUBLIC_SOKETI_USE_TLS?: string;
  PUSHER_APP_ID?: string;
  PUSHER_SECRET?: string;
  NEXT_PUBLIC_PUSHER_KEY?: string;
  NEXT_PUBLIC_PUSHER_CLUSTER?: string;
}

// =============================================================================
// UTILITIES
// =============================================================================

function printHeader(title: string, step?: { current: number; total: number }) {
  console.log();
  if (step) {
    console.log(
      chalk.blue(`━━━ Step ${step.current}/${step.total}: `) +
        chalk.bold(title) +
        chalk.blue(" " + "━".repeat(Math.max(0, 50 - title.length))),
    );
  } else {
    console.log(chalk.blue("━".repeat(60)));
    console.log(chalk.bold(title));
    console.log(chalk.blue("━".repeat(60)));
  }
  console.log();
}

function printSuccess(message: string) {
  console.log(chalk.green("✓") + " " + message);
}

function printInfo(message: string) {
  console.log(chalk.blue("ℹ") + " " + message);
}

function generateAuthSecret(): string {
  return crypto.randomBytes(32).toString("base64");
}

function commandExists(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// SETUP STEPS
// =============================================================================

async function setupStorage(): Promise<Partial<EnvConfig>> {
  const provider = await select({
    message: "Where should uploaded images be stored?",
    choices: [
      {
        value: "local",
        name: "Local filesystem",
        description:
          "Store images on this server. Good for single-server deployments.",
      },
      {
        value: "s3",
        name: "S3-compatible storage",
        description:
          "AWS S3, Cloudflare R2, MinIO, etc. Recommended for production.",
      },
    ],
  });

  if (provider === "local") {
    console.log();
    console.log(
      chalk.dim(
        "Images will be stored in ./public/uploads (served at /uploads)",
      ),
    );
    return { STORAGE_PROVIDER: "local" };
  }

  // S3 configuration
  console.log();
  console.log(chalk.dim("Enter your S3-compatible storage credentials:"));
  console.log();

  const bucket = await input({
    message: "S3 Bucket name:",
    required: true,
  });

  const region = await input({
    message: "S3 Region:",
    default: "us-east-1",
  });

  const accessKey = await input({
    message: "S3 Access Key ID:",
    required: true,
  });

  const secretKey = await password({
    message: "S3 Secret Access Key:",
  });

  const endpoint = await input({
    message: "S3 Endpoint (leave empty for AWS):",
    default: "",
  });

  return {
    STORAGE_PROVIDER: "s3",
    S3_BUCKET: bucket,
    S3_REGION: region,
    S3_ACCESS_KEY_ID: accessKey,
    S3_SECRET_ACCESS_KEY: secretKey,
    ...(endpoint && { S3_ENDPOINT: endpoint }),
  };
}

async function setupDatabase(): Promise<Partial<EnvConfig>> {
  const dbType = await select({
    message: "Which database would you like to use?",
    choices: [
      {
        value: "sqlite",
        name: "Local SQLite",
        description: "Simple file-based database. Good for small deployments.",
      },
      {
        value: "turso",
        name: "Turso (LibSQL)",
        description: "Distributed SQLite. Recommended for production.",
      },
    ],
  });

  if (dbType === "sqlite") {
    const dbPath = await input({
      message: "Database file path:",
      default: "file:./data/auktiva.db",
    });

    return {
      DATABASE_URL: dbPath,
    };
  }

  // Turso configuration
  console.log();
  console.log(chalk.dim("Enter your Turso database credentials:"));
  console.log(
    chalk.dim("Get these from: ") +
      chalk.cyan("turso db show <dbname> --url") +
      chalk.dim(" and ") +
      chalk.cyan("turso db tokens create <dbname>"),
  );
  console.log();

  const tursoUrl = await input({
    message: "Turso Database URL:",
    required: true,
    validate: (value) => {
      if (!value.startsWith("libsql://")) {
        return "URL must start with libsql://";
      }
      return true;
    },
  });

  const tursoToken = await password({
    message: "Turso Auth Token:",
  });

  return {
    DATABASE_URL: tursoUrl,
    DATABASE_AUTH_TOKEN: tursoToken,
  };
}

async function setupAuth(): Promise<Partial<EnvConfig>> {
  // Service port - where Next.js actually listens
  console.log(chalk.dim("Service port where Next.js will listen:"));
  console.log();

  const port = await input({
    message: "Service port:",
    default: "3000",
    validate: (value) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1 || num > 65535) {
        return "Please enter a valid port number (1-65535)";
      }
      return true;
    },
  });

  console.log();
  console.log(
    chalk.dim("Public URL - how users will access the app externally."),
  );
  console.log(
    chalk.dim(
      "Examples: https://auctions.mydomain.com, http://192.168.1.50:3000",
    ),
  );
  console.log();

  const authUrl = await input({
    message: "Public URL:",
    default: `http://localhost:${port}`,
    validate: (value) => {
      if (!value) return "URL is required";
      if (!value.startsWith("http://") && !value.startsWith("https://")) {
        return "URL must start with http:// or https://";
      }
      return true;
    },
  });

  console.log();
  printInfo(`Next.js will listen on port ${chalk.cyan(port)}`);
  printInfo(`Users will access via ${chalk.magenta(authUrl)}`);

  const authSecret = generateAuthSecret();
  printSuccess("Generated secure AUTH_SECRET");

  return {
    AUTH_URL: authUrl,
    AUTH_SECRET: authSecret,
    PORT: port,
  };
}

async function setupFeatures(): Promise<Partial<EnvConfig>> {
  // Explain open auctions before asking
  console.log(chalk.bold("About Open Auctions:"));
  console.log();
  console.log(
    chalk.dim("  By default, auctions in Auktiva are private. Users can only"),
  );
  console.log(
    chalk.dim("  join an auction if they are explicitly invited by the owner"),
  );
  console.log(chalk.dim("  or have a direct invite link."));
  console.log();
  console.log(chalk.dim("  Enabling open auctions adds a third option:"));
  console.log();
  console.log(
    `    ${chalk.cyan("•")} ${chalk.bold("Open/Public Auctions")} - Any registered user can browse`,
  );
  console.log(
    chalk.dim("      and join these auctions without needing an invitation."),
  );
  console.log(
    chalk.dim(
      "      They appear in a public auction listing accessible to all.",
    ),
  );
  console.log();
  console.log(chalk.yellow("  ⚠ Security consideration:"));
  console.log(
    chalk.dim("    If your instance is publicly accessible on the internet,"),
  );
  console.log(
    chalk.dim("    enabling this means anyone who registers can participate"),
  );
  console.log(
    chalk.dim("    in open auctions. This is ideal for community marketplaces"),
  );
  console.log(
    chalk.dim("    but may not be suitable for private/corporate deployments."),
  );
  console.log();

  const allowOpen = await confirm({
    message: "Enable open/public auctions on this instance?",
    default: false,
  });

  if (allowOpen) {
    printSuccess(
      "Open auctions enabled - users can create publicly joinable auctions",
    );
  } else {
    printInfo("Open auctions disabled - all auctions require invitations");
  }

  return {
    ALLOW_OPEN_AUCTIONS: allowOpen ? "true" : "false",
  };
}

async function setupDeploymentAdmin(): Promise<Partial<EnvConfig>> {
  console.log(
    chalk.dim(
      "The deployment admin can install updates directly from the app.",
    ),
  );
  console.log();

  const adminEmail = await input({
    message: "Deployment admin email address:",
    validate: (value) => {
      if (!value) return true; // Optional
      if (!value.includes("@")) return "Please enter a valid email address";
      return true;
    },
  });

  if (!adminEmail) {
    printInfo(
      "No deployment admin set. Any user can claim this role later in Settings.",
    );
    return {};
  }

  return {
    DEPLOYMENT_ADMIN_EMAIL: adminEmail,
  };
}

async function testSmtpConnection(config: {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
}): Promise<{ success: boolean; error?: string }> {
  // Dynamic import to avoid loading nodemailer during setup if not needed
  const nodemailer = await import("nodemailer");

  const auth = config.user
    ? { user: config.user, pass: config.password || "" }
    : undefined;

  const transporter = nodemailer.default.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });

  try {
    await transporter.verify();
    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: errorMessage };
  } finally {
    transporter.close();
  }
}

async function setupSmtpConfig(): Promise<Partial<EnvConfig> | null> {
  console.log();
  console.log(chalk.dim("Configure your SMTP server settings:"));
  console.log();

  const smtpHost = await input({
    message: "SMTP Host:",
    required: true,
    validate: (value) => {
      if (!value.trim()) return "SMTP host is required";
      return true;
    },
  });

  const smtpPort = await input({
    message: "SMTP Port:",
    default: "587",
    validate: (value) => {
      const port = parseInt(value, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        return "Please enter a valid port number (1-65535)";
      }
      return true;
    },
  });

  const portNum = parseInt(smtpPort, 10);
  const defaultSecure = portNum === 465;

  const smtpSecure = await confirm({
    message: "Use implicit TLS (secure connection)?",
    default: defaultSecure,
  });

  console.log();
  console.log(
    chalk.dim("SMTP authentication (leave empty for no authentication):"),
  );

  const smtpUser = await input({
    message: "SMTP Username (optional):",
  });

  let smtpPassword = "";
  if (smtpUser) {
    smtpPassword = await password({
      message: "SMTP Password:",
    });
  }

  // Test the connection
  console.log();
  const spinner = ora("Testing SMTP connection...").start();

  const testResult = await testSmtpConnection({
    host: smtpHost,
    port: portNum,
    secure: smtpSecure,
    user: smtpUser || undefined,
    password: smtpPassword || undefined,
  });

  if (testResult.success) {
    spinner.succeed("SMTP connection successful!");
    return {
      EMAIL_PROVIDER: "smtp",
      SMTP_HOST: smtpHost,
      SMTP_PORT: smtpPort,
      SMTP_SECURE: smtpSecure ? "true" : "false",
      ...(smtpUser && { SMTP_USER: smtpUser }),
      ...(smtpPassword && { SMTP_PASSWORD: smtpPassword }),
    };
  } else {
    spinner.fail(`SMTP connection failed: ${testResult.error}`);
    console.log();

    const retry = await confirm({
      message: "Would you like to re-enter SMTP settings?",
      default: true,
    });

    if (retry) {
      return setupSmtpConfig();
    }

    const saveAnyway = await confirm({
      message: "Save these settings anyway? (You can fix them later in .env)",
      default: false,
    });

    if (saveAnyway) {
      return {
        EMAIL_PROVIDER: "smtp",
        SMTP_HOST: smtpHost,
        SMTP_PORT: smtpPort,
        SMTP_SECURE: smtpSecure ? "true" : "false",
        ...(smtpUser && { SMTP_USER: smtpUser }),
        ...(smtpPassword && { SMTP_PASSWORD: smtpPassword }),
      };
    }

    return null;
  }
}

async function setupEmail(authUrl: string): Promise<Partial<EnvConfig>> {
  const wantEmail = await confirm({
    message: "Do you want to enable email notifications?",
    default: false,
  });

  if (!wantEmail) {
    return {};
  }

  const emailProvider = await select({
    message: "Which email provider would you like to use?",
    choices: [
      {
        value: "brevo",
        name: "Brevo (formerly Sendinblue)",
        description: "Cloud email service with free tier (300 emails/day)",
      },
      {
        value: "smtp",
        name: "SMTP Server",
        description:
          "Use your own SMTP server (Gmail, Mailgun, self-hosted, etc.)",
      },
    ],
  });

  let providerConfig: Partial<EnvConfig> = {};

  if (emailProvider === "brevo") {
    console.log();
    console.log(chalk.dim("Brevo offers a free tier with 300 emails/day."));
    console.log();
    console.log(
      chalk.cyan("1. Create a free account at: ") +
        chalk.bold("https://www.brevo.com/"),
    );
    console.log(
      chalk.cyan("2. Get your API key from: ") +
        chalk.bold("https://app.brevo.com/settings/keys/api"),
    );
    console.log();

    const brevoKey = await password({
      message: "Brevo API Key:",
    });

    if (!brevoKey) {
      printInfo("Skipping email configuration. You can add it later to .env");
      return {};
    }

    providerConfig = {
      EMAIL_PROVIDER: "brevo",
      BREVO_API_KEY: brevoKey,
    };
  } else {
    const smtpConfig = await setupSmtpConfig();
    if (!smtpConfig) {
      printInfo("Skipping email configuration. You can add it later to .env");
      return {};
    }
    providerConfig = smtpConfig;
  }

  // Common email settings
  const mailFrom = await input({
    message: "Sender email address:",
    default: "noreply@auktiva.org",
    validate: (value) => {
      if (!value.includes("@")) return "Please enter a valid email address";
      return true;
    },
  });

  const mailFromName = await input({
    message: "Sender name:",
    default: "Auktiva",
  });

  // Generate CRON_SECRET for securing the retry endpoint
  const cronSecret = crypto.randomBytes(32).toString("base64");

  return {
    ...providerConfig,
    MAIL_FROM: mailFrom,
    MAIL_FROM_NAME: mailFromName,
    NEXT_PUBLIC_APP_URL: authUrl,
    CRON_SECRET: cronSecret,
  };
}

async function setupRealtime(
  port: string,
  authUrl: string,
): Promise<Partial<EnvConfig>> {
  console.log(chalk.bold("About Realtime Features:"));
  console.log();
  console.log(
    chalk.dim("  Realtime features provide instant updates for bids,"),
  );
  console.log(chalk.dim("  notifications, and comments without page refresh."));
  console.log();
  console.log(
    `    ${chalk.cyan("•")} ${chalk.bold("Soketi")} - Self-hosted, free, unlimited`,
  );
  console.log(chalk.dim("      Runs alongside Auktiva via PM2. Recommended."));
  console.log();
  console.log(
    `    ${chalk.cyan("•")} ${chalk.bold("Pusher")} - Cloud service, free tier available`,
  );
  console.log(
    chalk.dim("      200k messages/day, 100 concurrent connections."),
  );
  console.log(chalk.dim("      Best for Vercel deployments."));
  console.log();
  console.log(
    `    ${chalk.cyan("•")} ${chalk.bold("Disabled")} - Use polling instead`,
  );
  console.log(chalk.dim("      Falls back to periodic database queries."));
  console.log();

  const realtimeChoice = await select({
    message: "Enable realtime features?",
    choices: [
      {
        value: "soketi",
        name: "Yes, with Soketi (self-hosted)",
        description:
          "Free, unlimited. Recommended for self-hosted deployments.",
      },
      {
        value: "pusher",
        name: "Yes, with Pusher (cloud)",
        description: "Free tier available. Best for Vercel deployments.",
      },
      {
        value: "disabled",
        name: "No, use polling",
        description: "Periodic database queries. Higher database usage.",
      },
    ],
  });

  if (realtimeChoice === "disabled") {
    printInfo("Realtime disabled. Using polling for updates.");
    return { REALTIME_DRIVER: "disabled" };
  }

  if (realtimeChoice === "soketi") {
    // Check if Docker is available (required for Soketi since it doesn't support Node 20+)
    const dockerInstalled = commandExists("docker");

    if (!dockerInstalled) {
      console.log();
      console.log(chalk.yellow("  Docker is required for Soketi."));
      console.log();
      console.log(
        chalk.dim(
          "  Soketi doesn't support Node.js 20+, so it runs via Docker.",
        ),
      );
      console.log();

      const installDocker = await confirm({
        message: "Install Docker now?",
        default: true,
      });

      if (installDocker) {
        const platform = process.platform;
        const spinner = ora("Installing Docker...").start();

        try {
          if (platform === "darwin") {
            // macOS - use Homebrew
            if (!commandExists("brew")) {
              spinner.fail("Homebrew is required to install Docker on macOS");
              console.log(
                chalk.dim("  Install Homebrew first: https://brew.sh"),
              );
              console.log(chalk.dim("  Then re-run: npm run setup"));
              process.exit(1);
            }
            spinner.text =
              "Installing Docker via Homebrew (this may take a few minutes)...";
            execSync("brew install --cask docker", { stdio: "pipe" });
            spinner.succeed("Docker installed");
            console.log();
            console.log(
              chalk.cyan("  Please open Docker Desktop to complete setup,"),
            );
            console.log(chalk.cyan("  then re-run: npm run setup"));
            console.log();
            process.exit(0);
          } else if (platform === "linux") {
            // Linux - use official Docker install script
            spinner.text = "Installing Docker via official script...";
            execSync("curl -fsSL https://get.docker.com | sh", {
              stdio: "pipe",
            });
            // Add current user to docker group
            try {
              execSync(`sudo usermod -aG docker $USER`, { stdio: "pipe" });
            } catch {
              // Ignore if fails
            }
            spinner.succeed("Docker installed");
            console.log();
            console.log(
              chalk.cyan(
                "  You may need to log out and back in for Docker permissions.",
              ),
            );
            console.log(chalk.cyan("  Then re-run: npm run setup"));
            console.log();
            process.exit(0);
          } else {
            spinner.fail(
              "Automatic Docker installation not supported on this platform",
            );
            console.log(
              chalk.dim(
                "  Install Docker manually: https://docs.docker.com/get-docker/",
              ),
            );
            console.log(chalk.dim("  Then re-run: npm run setup"));
            process.exit(1);
          }
        } catch (error) {
          spinner.fail("Docker installation failed");
          console.error(chalk.red((error as Error).message));
          console.log();
          console.log(
            chalk.dim(
              "  Install Docker manually: https://docs.docker.com/get-docker/",
            ),
          );
          console.log(chalk.dim("  Then re-run: npm run setup"));
          process.exit(1);
        }
      } else {
        console.log();
        console.log(
          chalk.dim(
            "  Install Docker manually: https://docs.docker.com/get-docker/",
          ),
        );
        console.log(chalk.dim("  Then re-run: npm run setup"));
        console.log();
        process.exit(0);
      }
    }

    // Check if Docker daemon is running
    try {
      execSync("docker info", { stdio: "pipe" });
      printSuccess("Docker is available");
    } catch {
      console.log();
      console.log(chalk.yellow("  Docker is installed but not running."));
      console.log();

      if (process.platform === "darwin") {
        console.log(
          chalk.dim("  Please open Docker Desktop and wait for it to start."),
        );
      } else {
        console.log(
          chalk.dim("  Start Docker with: sudo systemctl start docker"),
        );
      }
      console.log(chalk.dim("  Then re-run: npm run setup"));
      console.log();
      process.exit(0);
    }

    // Generate credentials
    const soketiAppKey = crypto.randomBytes(16).toString("hex");
    const soketiAppSecret = crypto.randomBytes(32).toString("hex");

    // Configure port
    const soketiPort = await input({
      message: "Soketi port:",
      default: "6001",
      validate: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 1 || num > 65535) {
          return "Please enter a valid port number (1-65535)";
        }
        if (value === port) {
          return "Soketi port must be different from the app port";
        }
        return true;
      },
    });

    // Ask for public host (for browser connections)
    console.log();
    console.log(chalk.bold("Public WebSocket Host:"));
    console.log();
    console.log(
      chalk.dim("  The server connects to Soketi internally via 127.0.0.1,"),
    );
    console.log(
      chalk.dim("  but browsers need a publicly accessible address."),
    );
    console.log();
    console.log(
      chalk.dim("  Examples: yourdomain.com, 192.168.1.50, auction.local"),
    );
    console.log();

    // Extract host from AUTH_URL for default suggestion
    let defaultPublicHost = "127.0.0.1";
    try {
      const parsedUrl = new URL(authUrl || "http://localhost:3000");
      if (parsedUrl.hostname !== "localhost") {
        defaultPublicHost = parsedUrl.hostname;
      }
    } catch {
      // Ignore URL parse errors
    }

    const publicHost = await input({
      message: "Public host for WebSocket connections:",
      default: defaultPublicHost,
      validate: (value) => {
        if (!value.trim()) return "Host is required";
        // Basic validation - no protocol prefix
        if (value.includes("://")) {
          return "Enter hostname only, without http:// or https://";
        }
        return true;
      },
    });

    // Ask about TLS for public connections
    const publicUseTLS = await confirm({
      message: "Use TLS (wss://) for WebSocket connections?",
      default: publicHost !== "127.0.0.1" && publicHost !== "localhost",
    });

    printSuccess("Generated Soketi credentials");
    printInfo(`Soketi will run on port ${chalk.cyan(soketiPort)}`);
    printInfo(
      `Server connects via ${chalk.cyan("127.0.0.1:" + soketiPort)} (internal)`,
    );
    printInfo(
      `Browsers connect via ${chalk.cyan((publicUseTLS ? "wss://" : "ws://") + publicHost + ":" + soketiPort)} (public)`,
    );

    return {
      // Shared config (NEXT_PUBLIC_ used by both server and client)
      NEXT_PUBLIC_REALTIME_DRIVER: "soketi",
      NEXT_PUBLIC_SOKETI_APP_KEY: soketiAppKey,
      NEXT_PUBLIC_SOKETI_PORT: soketiPort,
      NEXT_PUBLIC_SOKETI_USE_TLS: publicUseTLS ? "true" : "false",
      // Server-only config
      SOKETI_APP_ID: "auktiva",
      SOKETI_APP_SECRET: soketiAppSecret,
      SOKETI_HOST: "127.0.0.1",
      // Client-only config (public host for browser connections)
      NEXT_PUBLIC_SOKETI_HOST: publicHost,
    };
  }

  // Pusher configuration
  console.log();
  console.log(chalk.dim("Enter your Pusher Channels credentials:"));
  console.log(
    chalk.cyan("Get them from: ") + chalk.bold("https://dashboard.pusher.com/"),
  );
  console.log();

  const pusherAppId = await input({
    message: "Pusher App ID:",
    required: true,
  });

  const pusherKey = await input({
    message: "Pusher Key:",
    required: true,
  });

  const pusherSecret = await password({
    message: "Pusher Secret:",
  });

  const pusherCluster = await input({
    message: "Pusher Cluster:",
    default: "eu",
  });

  printSuccess("Pusher configured");

  return {
    // Shared config (NEXT_PUBLIC_ used by both server and client)
    NEXT_PUBLIC_REALTIME_DRIVER: "pusher",
    NEXT_PUBLIC_PUSHER_KEY: pusherKey,
    NEXT_PUBLIC_PUSHER_CLUSTER: pusherCluster,
    // Server-only config
    PUSHER_APP_ID: pusherAppId,
    PUSHER_SECRET: pusherSecret,
  };
}

async function setupOAuth(authUrl: string): Promise<Partial<EnvConfig>> {
  const config: Partial<EnvConfig> = {};

  // Google OAuth
  const wantGoogle = await confirm({
    message: "Do you want to enable Google OAuth sign-in?",
    default: false,
  });

  if (wantGoogle) {
    console.log();
    console.log(
      chalk.dim(
        "Google OAuth allows users to sign in with their Google account.",
      ),
    );
    console.log();
    console.log(
      chalk.cyan("Setup instructions: ") +
        chalk.bold("https://console.cloud.google.com/apis/credentials"),
    );
    console.log(chalk.dim("1. Create a new project or select existing"));
    console.log(
      chalk.dim(
        "2. Go to APIs & Services → Credentials → Create Credentials → OAuth client ID",
      ),
    );
    console.log(chalk.dim("3. Application type: Web application"));
    console.log(
      chalk.dim(`4. Add redirect URI: ${authUrl}/api/auth/callback/google`),
    );
    console.log();

    const googleClientId = await input({
      message: "Google Client ID:",
      required: true,
    });

    const googleClientSecret = await password({
      message: "Google Client Secret:",
    });

    if (googleClientId && googleClientSecret) {
      config.GOOGLE_CLIENT_ID = googleClientId;
      config.GOOGLE_CLIENT_SECRET = googleClientSecret;
      printSuccess("Google OAuth configured");
    }
  }

  // Microsoft OAuth
  const wantMicrosoft = await confirm({
    message: "Do you want to enable Microsoft OAuth sign-in?",
    default: false,
  });

  if (wantMicrosoft) {
    console.log();
    console.log(
      chalk.dim(
        "Microsoft OAuth allows users to sign in with their Microsoft account.",
      ),
    );
    console.log();
    console.log(
      chalk.cyan("Setup instructions: ") +
        chalk.bold(
          "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps",
        ),
    );
    console.log(
      chalk.dim("1. Go to Azure AD → App registrations → New registration"),
    );
    console.log(
      chalk.dim(
        "2. Select 'Accounts in any organizational directory and personal Microsoft accounts'",
      ),
    );
    console.log(
      chalk.dim(
        `3. Add redirect URI (Web): ${authUrl}/api/auth/callback/azure-ad`,
      ),
    );
    console.log(
      chalk.dim("4. Go to Certificates & secrets → New client secret"),
    );
    console.log();

    const microsoftClientId = await input({
      message: "Microsoft Client ID (Application ID):",
      required: true,
    });

    const microsoftClientSecret = await password({
      message: "Microsoft Client Secret:",
    });

    if (microsoftClientId && microsoftClientSecret) {
      config.MICROSOFT_CLIENT_ID = microsoftClientId;
      config.MICROSOFT_CLIENT_SECRET = microsoftClientSecret;
      printSuccess("Microsoft OAuth configured");
    }
  }

  return config;
}

// =============================================================================
// ENV FILE GENERATION
// =============================================================================

function generateEnvFile(config: EnvConfig): string {
  let env = `# =============================================================================
# AUKTIVA CONFIGURATION
# Generated by setup wizard on ${new Date().toISOString()}
# =============================================================================

# =============================================================================
# DATABASE
# =============================================================================
DATABASE_URL="${config.DATABASE_URL}"
`;

  if (config.DATABASE_AUTH_TOKEN) {
    env += `DATABASE_AUTH_TOKEN="${config.DATABASE_AUTH_TOKEN}"\n`;
  }

  env += `
# =============================================================================
# AUTHENTICATION
# =============================================================================
AUTH_SECRET="${config.AUTH_SECRET}"
AUTH_URL="${config.AUTH_URL}"

# =============================================================================
# STORAGE
# =============================================================================
STORAGE_PROVIDER="${config.STORAGE_PROVIDER}"
`;

  if (config.STORAGE_PROVIDER === "s3") {
    env += `S3_BUCKET="${config.S3_BUCKET}"\n`;
    env += `S3_REGION="${config.S3_REGION}"\n`;
    env += `S3_ACCESS_KEY_ID="${config.S3_ACCESS_KEY_ID}"\n`;
    env += `S3_SECRET_ACCESS_KEY="${config.S3_SECRET_ACCESS_KEY}"\n`;
    if (config.S3_ENDPOINT) {
      env += `S3_ENDPOINT="${config.S3_ENDPOINT}"\n`;
    }
  }

  env += `
# =============================================================================
# FEATURES
# =============================================================================
ALLOW_OPEN_AUCTIONS="${config.ALLOW_OPEN_AUCTIONS}"
PORT="${config.PORT}"
`;

  // Email configuration (optional)
  if (config.EMAIL_PROVIDER) {
    env += `
# =============================================================================
# EMAIL
# =============================================================================
EMAIL_PROVIDER="${config.EMAIL_PROVIDER}"
MAIL_FROM="${config.MAIL_FROM}"
MAIL_FROM_NAME="${config.MAIL_FROM_NAME}"
NEXT_PUBLIC_APP_URL="${config.NEXT_PUBLIC_APP_URL}"
CRON_SECRET="${config.CRON_SECRET}"
`;

    if (config.EMAIL_PROVIDER === "brevo") {
      env += `BREVO_API_KEY="${config.BREVO_API_KEY}"\n`;
    } else if (config.EMAIL_PROVIDER === "smtp") {
      env += `SMTP_HOST="${config.SMTP_HOST}"\n`;
      env += `SMTP_PORT="${config.SMTP_PORT}"\n`;
      env += `SMTP_SECURE="${config.SMTP_SECURE}"\n`;
      if (config.SMTP_USER) {
        env += `SMTP_USER="${config.SMTP_USER}"\n`;
      }
      if (config.SMTP_PASSWORD) {
        env += `SMTP_PASSWORD="${config.SMTP_PASSWORD}"\n`;
      }
    }
  }

  // OAuth configuration (optional)
  if (config.GOOGLE_CLIENT_ID || config.MICROSOFT_CLIENT_ID) {
    env += `
# =============================================================================
# OAUTH (Optional)
# =============================================================================
`;
    if (config.GOOGLE_CLIENT_ID) {
      env += `GOOGLE_CLIENT_ID="${config.GOOGLE_CLIENT_ID}"
GOOGLE_CLIENT_SECRET="${config.GOOGLE_CLIENT_SECRET}"
`;
    }
    if (config.MICROSOFT_CLIENT_ID) {
      env += `MICROSOFT_CLIENT_ID="${config.MICROSOFT_CLIENT_ID}"
MICROSOFT_CLIENT_SECRET="${config.MICROSOFT_CLIENT_SECRET}"
`;
    }
  }

  // Realtime configuration (optional)
  if (config.REALTIME_DRIVER && config.REALTIME_DRIVER !== "disabled") {
    env += `
# =============================================================================
# REALTIME
# =============================================================================
REALTIME_DRIVER="${config.REALTIME_DRIVER}"
`;
    if (config.REALTIME_DRIVER === "soketi") {
      env += `SOKETI_APP_ID="${config.SOKETI_APP_ID}"
SOKETI_APP_KEY="${config.SOKETI_APP_KEY}"
SOKETI_APP_SECRET="${config.SOKETI_APP_SECRET}"
SOKETI_HOST="${config.SOKETI_HOST}"
SOKETI_PORT="${config.SOKETI_PORT}"
SOKETI_USE_TLS="${config.SOKETI_USE_TLS}"

# Client-side Soketi config
NEXT_PUBLIC_REALTIME_DRIVER="${config.NEXT_PUBLIC_REALTIME_DRIVER}"
NEXT_PUBLIC_SOKETI_APP_KEY="${config.NEXT_PUBLIC_SOKETI_APP_KEY}"
NEXT_PUBLIC_SOKETI_HOST="${config.NEXT_PUBLIC_SOKETI_HOST}"
NEXT_PUBLIC_SOKETI_PORT="${config.NEXT_PUBLIC_SOKETI_PORT}"
NEXT_PUBLIC_SOKETI_USE_TLS="${config.NEXT_PUBLIC_SOKETI_USE_TLS}"
`;
    } else if (config.REALTIME_DRIVER === "pusher") {
      env += `PUSHER_APP_ID="${config.PUSHER_APP_ID}"
PUSHER_SECRET="${config.PUSHER_SECRET}"

# Client-side Pusher config
NEXT_PUBLIC_REALTIME_DRIVER="${config.NEXT_PUBLIC_REALTIME_DRIVER}"
NEXT_PUBLIC_PUSHER_KEY="${config.NEXT_PUBLIC_PUSHER_KEY}"
NEXT_PUBLIC_PUSHER_CLUSTER="${config.NEXT_PUBLIC_PUSHER_CLUSTER}"
`;
    }
  }

  return env;
}

// =============================================================================
// POST-SETUP TASKS
// =============================================================================

async function runPostSetupTasks(config: EnvConfig): Promise<void> {
  // Build environment variables for child processes
  // This ensures the new config is used even though .env was just written
  const childEnv = {
    ...process.env,
    DATABASE_URL: config.DATABASE_URL,
    DATABASE_AUTH_TOKEN: config.DATABASE_AUTH_TOKEN || "",
  };

  // Create logs directory for PM2
  const logsDir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    printSuccess("Created logs directory");
  }

  // Create storage directory if local
  if (config.STORAGE_PROVIDER === "local") {
    const uploadDir = path.join(process.cwd(), "public/uploads/images");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      printSuccess("Created storage directory: public/uploads/images");
    }
  }

  // Create database directory if SQLite
  if (config.DATABASE_URL?.startsWith("file:")) {
    const dbPath = config.DATABASE_URL.replace("file:", "").replace(
      /^\.\//,
      "",
    );
    const dbDir = path.dirname(path.join(process.cwd(), dbPath));
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      printSuccess(
        `Created database directory: ${path.relative(process.cwd(), dbDir)}`,
      );
    }
  }

  // Initialize database
  let spinner = ora("Generating Prisma client...").start();
  try {
    execSync("npm run db:generate", { stdio: "pipe", env: childEnv });
    spinner.succeed("Prisma client generated");

    spinner.start("Running database migrations...");
    execSync("npx prisma migrate deploy", { stdio: "pipe", env: childEnv });
    spinner.succeed("Database migrations applied");

    spinner.start("Seeding currencies...");
    execSync("npm run seed:currencies", { stdio: "pipe", env: childEnv });
    spinner.succeed("Currencies seeded");

    // Set deployment admin if provided
    if (config.DEPLOYMENT_ADMIN_EMAIL) {
      spinner.start("Setting deployment admin...");
      execSync(
        `npx tsx prisma/seed-deployment-admin.ts "${config.DEPLOYMENT_ADMIN_EMAIL}"`,
        {
          stdio: "pipe",
          env: childEnv,
        },
      );
      spinner.succeed(
        `Deployment admin set to ${config.DEPLOYMENT_ADMIN_EMAIL}`,
      );
    }
  } catch (error) {
    spinner.fail("Database initialization failed");
    console.error(chalk.red((error as Error).message));
    return;
  }

  // Build application
  spinner = ora("Building application (this may take a minute)...").start();
  try {
    execSync("npm run build", { stdio: "pipe" });
    spinner.succeed("Application built");
  } catch (error) {
    spinner.fail("Build failed");
    console.error(chalk.red((error as Error).message));
    return;
  }

  // PM2 setup
  if (!commandExists("pm2")) {
    console.log();
    const installPm2 = await confirm({
      message:
        "PM2 is not installed. Install it now? (recommended for production)",
      default: true,
    });

    if (installPm2) {
      spinner = ora("Installing PM2...").start();
      try {
        execSync("npm install -g pm2", { stdio: "pipe" });
        spinner.succeed("PM2 installed");
      } catch (error) {
        spinner.fail("PM2 installation failed (may need sudo)");
        console.error(chalk.red((error as Error).message));
        console.log(chalk.dim("  Try manually: sudo npm install -g pm2"));
        return;
      }
    } else {
      printInfo("Skipping PM2. To start manually: npm start");
      return;
    }
  }

  // Start Soketi via Docker if configured (before PM2)
  if (config.REALTIME_DRIVER === "soketi") {
    spinner = ora("Starting Soketi WebSocket server via Docker...").start();
    try {
      // Stop existing container if running
      execSync("docker stop soketi 2>/dev/null || true", { stdio: "pipe" });
      execSync("docker rm soketi 2>/dev/null || true", { stdio: "pipe" });

      // Start Soketi container
      // SOKETI_DEFAULT_APP_HOST=0.0.0.0 is required to accept connections from outside the container
      const soketiCmd = [
        "docker run -d",
        "--name soketi",
        "--restart unless-stopped",
        `-p ${config.SOKETI_PORT || "6001"}:6001`,
        `-e SOKETI_DEFAULT_APP_ID=${config.SOKETI_APP_ID || "auktiva"}`,
        `-e SOKETI_DEFAULT_APP_KEY=${config.SOKETI_APP_KEY}`,
        `-e SOKETI_DEFAULT_APP_SECRET=${config.SOKETI_APP_SECRET}`,
        "-e SOKETI_DEFAULT_APP_HOST=0.0.0.0",
        "quay.io/soketi/soketi:latest",
      ].join(" ");

      execSync(soketiCmd, { stdio: "pipe" });
      spinner.succeed("Soketi started via Docker");
    } catch (error) {
      spinner.fail("Failed to start Soketi");
      console.error(chalk.red((error as Error).message));
      console.log(chalk.dim("  You can start it manually later with:"));
      console.log(
        chalk.dim("  docker run -d --name soketi --restart unless-stopped \\"),
      );
      console.log(chalk.dim(`    -p ${config.SOKETI_PORT || "6001"}:6001 \\`));
      console.log(
        chalk.dim(
          `    -e SOKETI_DEFAULT_APP_ID=${config.SOKETI_APP_ID || "auktiva"} \\`,
        ),
      );
      console.log(
        chalk.dim(`    -e SOKETI_DEFAULT_APP_KEY=${config.SOKETI_APP_KEY} \\`),
      );
      console.log(
        chalk.dim(
          `    -e SOKETI_DEFAULT_APP_SECRET=${config.SOKETI_APP_SECRET} \\`,
        ),
      );
      console.log(chalk.dim("    quay.io/soketi/soketi:latest"));
    }
  }

  spinner = ora("Starting with PM2...").start();
  try {
    // Start main Auktiva app
    execSync("pm2 startOrRestart ecosystem.config.js --only auktiva", {
      stdio: "pipe",
    });

    execSync("pm2 save", { stdio: "pipe" });
    spinner.succeed("Application started with PM2");
  } catch (error) {
    spinner.fail("PM2 start failed");
    console.error(chalk.red((error as Error).message));
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.clear();

  // Show logo
  console.log(LOGO);
  console.log();
  console.log(chalk.bold("  Welcome to the Auktiva Setup Wizard!"));
  console.log();
  console.log(chalk.dim(`  ${TAGLINE}`));
  console.log();
  console.log(
    chalk.dim("  This wizard will guide you through configuring your"),
  );
  console.log(chalk.dim("  self-hosted Auktiva instance."));
  console.log();
  console.log(chalk.blue("━".repeat(60)));

  const proceed = await confirm({
    message: "Ready to begin setup?",
    default: true,
  });

  if (!proceed) {
    console.log();
    console.log(chalk.dim("Setup cancelled. Run `npm run setup` when ready."));
    console.log();
    process.exit(0);
  }

  const config: Partial<EnvConfig> = {};

  // Step 1: Storage
  printHeader("Image Storage", { current: 1, total: 8 });
  Object.assign(config, await setupStorage());

  // Step 2: Database
  printHeader("Database", { current: 2, total: 8 });
  Object.assign(config, await setupDatabase());

  // Step 3: Authentication
  printHeader("Authentication & Domain", { current: 3, total: 8 });
  Object.assign(config, await setupAuth());

  // Step 4: Features
  printHeader("Features", { current: 4, total: 8 });
  Object.assign(config, await setupFeatures());

  // Step 5: Deployment Admin
  printHeader("Deployment Administration", { current: 5, total: 8 });
  Object.assign(config, await setupDeploymentAdmin());

  // Step 6: Email
  printHeader("Email Notifications", { current: 6, total: 8 });
  Object.assign(
    config,
    await setupEmail(config.AUTH_URL || "http://localhost:3000"),
  );

  // Step 7: Realtime
  printHeader("Realtime Features", { current: 7, total: 8 });
  Object.assign(
    config,
    await setupRealtime(
      config.PORT || "3000",
      config.AUTH_URL || "http://localhost:3000",
    ),
  );

  // Step 8: OAuth
  printHeader("OAuth Sign-in (Optional)", { current: 8, total: 8 });
  Object.assign(
    config,
    await setupOAuth(config.AUTH_URL || "http://localhost:3000"),
  );

  // Summary
  console.log();
  console.log(chalk.blue("━".repeat(60)));
  console.log();
  console.log(chalk.bold("Configuration Summary:"));
  console.log();
  console.log(
    `  ${chalk.dim("Database:")}      ${
      config.DATABASE_URL?.startsWith("libsql")
        ? chalk.cyan("Turso")
        : chalk.green("SQLite")
    }`,
  );
  console.log(
    `  ${chalk.dim("Storage:")}       ${
      config.STORAGE_PROVIDER === "s3"
        ? chalk.cyan(`S3 (${config.S3_BUCKET})`)
        : chalk.green("Local")
    }`,
  );
  console.log(
    `  ${chalk.dim("App URL:")}       ${chalk.magenta(config.AUTH_URL)}`,
  );
  console.log(`  ${chalk.dim("Service Port:")} ${chalk.cyan(config.PORT)}`);
  console.log(
    `  ${chalk.dim("Open Auctions:")} ${
      config.ALLOW_OPEN_AUCTIONS === "true"
        ? chalk.green("Enabled")
        : chalk.yellow("Disabled")
    }`,
  );
  console.log(
    `  ${chalk.dim("Email:")}         ${
      config.EMAIL_PROVIDER === "brevo"
        ? chalk.green("Enabled (Brevo)")
        : config.EMAIL_PROVIDER === "smtp"
          ? chalk.green(`Enabled (SMTP: ${config.SMTP_HOST})`)
          : chalk.yellow("Disabled")
    }`,
  );
  console.log(
    `  ${chalk.dim("Deploy Admin:")} ${
      config.DEPLOYMENT_ADMIN_EMAIL
        ? chalk.green(config.DEPLOYMENT_ADMIN_EMAIL)
        : chalk.yellow("Not set")
    }`,
  );
  // Realtime summary
  console.log(
    `  ${chalk.dim("Realtime:")}      ${
      config.REALTIME_DRIVER === "soketi"
        ? chalk.green(`Soketi (port ${config.SOKETI_PORT})`)
        : config.REALTIME_DRIVER === "pusher"
          ? chalk.green("Pusher")
          : chalk.yellow("Disabled (polling)")
    }`,
  );
  // OAuth summary
  const oauthProviders: string[] = [];
  if (config.GOOGLE_CLIENT_ID) oauthProviders.push("Google");
  if (config.MICROSOFT_CLIENT_ID) oauthProviders.push("Microsoft");
  console.log(
    `  ${chalk.dim("OAuth:")}         ${
      oauthProviders.length > 0
        ? chalk.green(oauthProviders.join(", "))
        : chalk.yellow("Disabled")
    }`,
  );
  console.log();

  const confirmSave = await confirm({
    message: "Save this configuration?",
    default: true,
  });

  if (!confirmSave) {
    console.log();
    console.log(
      chalk.dim("Configuration not saved. Run `npm run setup` to reconfigure."),
    );
    console.log();
    process.exit(0);
  }

  // Write .env file
  const spinner = ora("Saving configuration...").start();

  const envContent = generateEnvFile(config as EnvConfig);
  const envPath = path.join(process.cwd(), ".env");

  // Backup existing .env if it exists
  if (fs.existsSync(envPath)) {
    const backupPath = `${envPath}.backup.${Date.now()}`;
    fs.copyFileSync(envPath, backupPath);
    spinner.info(`Backed up existing .env to ${path.basename(backupPath)}`);
    spinner.start("Saving configuration...");
  }

  fs.writeFileSync(envPath, envContent);
  spinner.succeed("Configuration saved to .env");

  // Post-setup tasks
  console.log();
  printHeader("Post-Setup Tasks");
  await runPostSetupTasks(config as EnvConfig);

  // Final message
  console.log();
  console.log(chalk.green("━".repeat(60)));
  console.log();
  console.log(chalk.bold.green("  ✓ Setup Complete!"));
  console.log();
  console.log(`  Visit your instance at: ${chalk.cyan.bold(config.AUTH_URL)}`);
  console.log();

  if (!commandExists("pm2")) {
    console.log(chalk.dim("  To start manually:"));
    console.log(chalk.dim("    npm start"));
    console.log();
  }

  console.log(chalk.green("━".repeat(60)));
  console.log();
}

// Run
main().catch((error) => {
  if (error.name === "ExitPromptError") {
    console.log();
    console.log(chalk.dim("Setup cancelled."));
    process.exit(0);
  }
  console.error(chalk.red("Error:"), error.message);
  process.exit(1);
});
