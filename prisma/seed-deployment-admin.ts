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
        deploymentAdminEmail: email 
      },
      update: { 
        deploymentAdminEmail: email 
      },
    });

    console.log(`Deployment admin set to: ${email}`);
  } catch (error) {
    console.error("Failed to set deployment admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
