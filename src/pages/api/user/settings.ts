import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSettingsSchema = z.object({
  itemSidebarCollapsed: z.boolean().optional(),
  emailOnNewItem: z.boolean().optional(),
  emailOnOutbid: z.boolean().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // GET - Fetch user settings
  if (req.method === "GET") {
    try {
      let settings = await prisma.userSettings.findUnique({
        where: { userId: session.user.id },
      });

      // Create default settings if none exist
      if (!settings) {
        settings = await prisma.userSettings.create({
          data: {
            userId: session.user.id,
          },
        });
      }

      return res.status(200).json(settings);
    } catch (error) {
      console.error("Get settings error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // PATCH - Update user settings
  if (req.method === "PATCH") {
    try {
      const parsed = updateSettingsSchema.safeParse(req.body);

      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: parsed.error.issues[0].message });
      }

      const settings = await prisma.userSettings.upsert({
        where: { userId: session.user.id },
        update: parsed.data,
        create: {
          userId: session.user.id,
          ...parsed.data,
        },
      });

      return res.status(200).json(settings);
    } catch (error) {
      console.error("Update settings error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
