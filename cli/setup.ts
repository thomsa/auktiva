#!/usr/bin/env npx tsx

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { execSync } from "node:child_process";
import { select, input, password, confirm } from "@inquirer/prompts";
import ora from "ora";
import chalk from "chalk";

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
  STORAGE_LOCAL_PATH?: string;
  STORAGE_LOCAL_URL_PREFIX?: string;
  S3_BUCKET?: string;
  S3_REGION?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_ENDPOINT?: string;
  ALLOW_OPEN_AUCTIONS: string;
  // Email configuration
  BREVO_API_KEY?: string;
  MAIL_FROM?: string;
  MAIL_FROM_NAME?: string;
  NEXT_PUBLIC_APP_URL?: string;
  CRON_SECRET?: string;
  // OAuth configuration
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
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
    const storagePath = await input({
      message: "Storage path:",
      default: "./public/uploads",
    });

    const urlPrefix = await input({
      message: "URL prefix for images:",
      default: "/uploads",
    });

    return {
      STORAGE_PROVIDER: "local",
      STORAGE_LOCAL_PATH: storagePath,
      STORAGE_LOCAL_URL_PREFIX: urlPrefix,
    };
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
  console.log(chalk.dim("Configure where Auktiva will be accessible:"));
  console.log();

  const domain = await input({
    message: "Domain or IP address:",
    default: "localhost",
    validate: (value) => {
      if (!value) return "Domain is required";
      return true;
    },
  });

  // Determine protocol and port
  const isLocalhost = domain === "localhost" || domain === "127.0.0.1";
  const isIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(domain);

  let protocol = "https";
  let port = "";

  if (isLocalhost) {
    protocol = "http";
    port = ":3000";
  } else if (isIP) {
    protocol = "http";
  }

  const authUrl = `${protocol}://${domain}${port}`;

  console.log();
  printInfo(`Auth URL will be: ${chalk.magenta(authUrl)}`);

  const authSecret = generateAuthSecret();
  printSuccess("Generated secure AUTH_SECRET");

  return {
    AUTH_URL: authUrl,
    AUTH_SECRET: authSecret,
  };
}

async function setupFeatures(): Promise<Partial<EnvConfig>> {
  const allowOpen = await confirm({
    message: "Allow public/open auctions (anyone can join without invite)?",
    default: false,
  });

  return {
    ALLOW_OPEN_AUCTIONS: allowOpen ? "true" : "false",
  };
}

async function setupEmail(authUrl: string): Promise<Partial<EnvConfig>> {
  const wantEmail = await confirm({
    message: "Do you want to enable email notifications?",
    default: false,
  });

  if (!wantEmail) {
    return {};
  }

  console.log();
  console.log(
    chalk.dim("Auktiva uses Brevo (formerly Sendinblue) for sending emails."),
  );
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
    BREVO_API_KEY: brevoKey,
    MAIL_FROM: mailFrom,
    MAIL_FROM_NAME: mailFromName,
    NEXT_PUBLIC_APP_URL: authUrl,
    CRON_SECRET: cronSecret,
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

  if (config.STORAGE_PROVIDER === "local") {
    env += `STORAGE_LOCAL_PATH="${config.STORAGE_LOCAL_PATH}"\n`;
    env += `STORAGE_LOCAL_URL_PREFIX="${config.STORAGE_LOCAL_URL_PREFIX}"\n`;
  } else {
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
`;

  // Email configuration (optional)
  if (config.BREVO_API_KEY) {
    env += `
# =============================================================================
# EMAIL (Brevo)
# =============================================================================
BREVO_API_KEY="${config.BREVO_API_KEY}"
MAIL_FROM="${config.MAIL_FROM}"
MAIL_FROM_NAME="${config.MAIL_FROM_NAME}"
NEXT_PUBLIC_APP_URL="${config.NEXT_PUBLIC_APP_URL}"
CRON_SECRET="${config.CRON_SECRET}"
`;
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

  return env;
}

// =============================================================================
// POST-SETUP TASKS
// =============================================================================

async function runPostSetupTasks(config: EnvConfig): Promise<void> {
  // Create storage directory if local
  if (config.STORAGE_PROVIDER === "local" && config.STORAGE_LOCAL_PATH) {
    const storagePath = config.STORAGE_LOCAL_PATH.replace(/^\.\//, "");
    const fullPath = path.join(process.cwd(), storagePath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      printSuccess(`Created storage directory: ${storagePath}`);
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
    execSync("npm run db:generate", { stdio: "pipe" });
    spinner.succeed("Prisma client generated");

    spinner.start("Pushing database schema...");
    execSync("npm run db:push", { stdio: "pipe" });
    spinner.succeed("Database schema pushed");

    spinner.start("Seeding currencies...");
    execSync("npm run seed:currencies", { stdio: "pipe" });
    spinner.succeed("Currencies seeded");
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

  spinner = ora("Starting with PM2...").start();
  try {
    execSync('pm2 start npm --name "auktiva" -- start', { stdio: "pipe" });
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
  printHeader("Image Storage", { current: 1, total: 6 });
  Object.assign(config, await setupStorage());

  // Step 2: Database
  printHeader("Database", { current: 2, total: 6 });
  Object.assign(config, await setupDatabase());

  // Step 3: Authentication
  printHeader("Authentication & Domain", { current: 3, total: 6 });
  Object.assign(config, await setupAuth());

  // Step 4: Features
  printHeader("Features", { current: 4, total: 6 });
  Object.assign(config, await setupFeatures());

  // Step 5: Email
  printHeader("Email Notifications", { current: 5, total: 6 });
  Object.assign(
    config,
    await setupEmail(config.AUTH_URL || "http://localhost:3000"),
  );

  // Step 6: OAuth
  printHeader("OAuth Sign-in (Optional)", { current: 6, total: 6 });
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
    `  ${chalk.dim("Database:")}      ${config.DATABASE_URL?.startsWith("libsql") ? chalk.cyan("Turso") : chalk.green("SQLite")}`,
  );
  console.log(
    `  ${chalk.dim("Storage:")}       ${config.STORAGE_PROVIDER === "s3" ? chalk.cyan(`S3 (${config.S3_BUCKET})`) : chalk.green("Local")}`,
  );
  console.log(
    `  ${chalk.dim("URL:")}           ${chalk.magenta(config.AUTH_URL)}`,
  );
  console.log(
    `  ${chalk.dim("Open Auctions:")} ${config.ALLOW_OPEN_AUCTIONS === "true" ? chalk.green("Enabled") : chalk.yellow("Disabled")}`,
  );
  console.log(
    `  ${chalk.dim("Email:")}         ${config.BREVO_API_KEY ? chalk.green("Enabled (Brevo)") : chalk.yellow("Disabled")}`,
  );
  // OAuth summary
  const oauthProviders: string[] = [];
  if (config.GOOGLE_CLIENT_ID) oauthProviders.push("Google");
  if (config.MICROSOFT_CLIENT_ID) oauthProviders.push("Microsoft");
  console.log(
    `  ${chalk.dim("OAuth:")}         ${oauthProviders.length > 0 ? chalk.green(oauthProviders.join(", ")) : chalk.yellow("Disabled")}`,
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
