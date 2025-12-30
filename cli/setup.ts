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
  // Deployment admin
  DEPLOYMENT_ADMIN_EMAIL?: string;
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
      chalk.dim("Images will be stored in ./public/uploads (served at /uploads)"),
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

  const auth = config.user ? { user: config.user, pass: config.password || "" } : undefined;

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
        description: "Use your own SMTP server (Gmail, Mailgun, self-hosted, etc.)",
      },
    ],
  });

  let providerConfig: Partial<EnvConfig> = {};

  if (emailProvider === "brevo") {
    console.log();
    console.log(
      chalk.dim("Brevo offers a free tier with 300 emails/day."),
    );
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

  // Step 5: Deployment Admin
  printHeader("Deployment Administration", { current: 5, total: 6 });
  Object.assign(config, await setupDeploymentAdmin());

  // Step 6: Email
  printHeader("Email Notifications", { current: 6, total: 6 });
  Object.assign(
    config,
    await setupEmail(config.AUTH_URL || "http://localhost:3000"),
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
    `  ${chalk.dim("URL:")}           ${chalk.magenta(config.AUTH_URL)}`,
  );
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
