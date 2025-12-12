import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.method === "PATCH") {
    const parsed = updateProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return res.status(400).json({
        message: Object.values(errors).flat()[0] || "Invalid input",
        errors,
      });
    }

    try {
      const user = await prisma.user.update({
        where: { id: session.user.id },
        data: { name: parsed.data.name },
        select: { id: true, name: true, email: true },
      });

      return res.status(200).json(user);
    } catch (error) {
      console.error("Update profile error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "GET") {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json(user);
    } catch (error) {
      console.error("Get profile error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
