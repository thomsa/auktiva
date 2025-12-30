import { createPrismaClient } from "../src/lib/prisma";

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.log("No deployment admin email provided, skipping.");
    process.exit(0);
  }

  const prisma = createPrismaClient();

  try {
    await prisma.systemSettings.upsert({
      where: { id: "system" },
      create: {
        id: "system",
        deploymentAdminEmail: email,
      },
      update: {
        deploymentAdminEmail: email,
      },
    });

    console.log(`Deployment admin set to: ${email}`);
  } catch (error) {
    // Check if this is a "table does not exist" error
    const errorMessage = String(error);
    if (
      errorMessage.includes("does not exist") ||
      errorMessage.includes("P2021")
    ) {
      console.log(
        "SystemSettings table not found. This will be created on first app start.",
      );
      console.log(
        `Deployment admin email (${email}) should be set via Settings page after first login.`,
      );
      process.exit(0);
    }
    console.error("Failed to set deployment admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
