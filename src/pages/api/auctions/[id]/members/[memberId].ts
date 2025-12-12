import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "CREATOR", "BIDDER"]),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const auctionId = req.query.id as string;
  const memberId = req.query.memberId as string;

  // Check if current user is admin
  const currentMembership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId: session.user.id,
      },
    },
  });

  if (
    !currentMembership ||
    !["OWNER", "ADMIN"].includes(currentMembership.role)
  ) {
    return res.status(403).json({ message: "Only admins can manage members" });
  }

  // Get the target member
  const targetMember = await prisma.auctionMember.findUnique({
    where: { id: memberId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!targetMember || targetMember.auctionId !== auctionId) {
    return res.status(404).json({ message: "Member not found" });
  }

  // Cannot modify owner
  if (targetMember.role === "OWNER") {
    return res.status(403).json({ message: "Cannot modify the auction owner" });
  }

  // Cannot modify yourself
  if (targetMember.userId === session.user.id) {
    return res
      .status(403)
      .json({ message: "Cannot modify your own membership" });
  }

  // PATCH - Update role
  if (req.method === "PATCH") {
    const parsed = updateRoleSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid role",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const updated = await prisma.auctionMember.update({
        where: { id: memberId },
        data: { role: parsed.data.role },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return res.status(200).json({
        id: updated.id,
        role: updated.role,
        user: updated.user,
      });
    } catch (error) {
      console.error("Update member error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // DELETE - Remove member
  if (req.method === "DELETE") {
    try {
      await prisma.auctionMember.delete({
        where: { id: memberId },
      });

      return res.status(200).json({ message: "Member removed successfully" });
    } catch (error) {
      console.error("Remove member error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
