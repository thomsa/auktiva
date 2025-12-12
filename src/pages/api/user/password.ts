import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parsed = changePasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return res.status(400).json({
      message: Object.values(errors).flat()[0] || "Invalid input",
      errors,
    });
  }

  try {
    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      return res
        .status(400)
        .json({ message: "Cannot change password for this account" });
    }

    // Verify current password
    const isValid = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash,
    );

    if (!isValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: hashedPassword },
    });

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
