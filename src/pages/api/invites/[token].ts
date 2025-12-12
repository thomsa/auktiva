import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const token = req.query.token as string;

  if (req.method === "GET") {
    // Get invite details (public - for showing invite info before login)
    try {
      const invite = await prisma.auctionInvite.findUnique({
        where: { token },
        include: {
          auction: {
            select: { id: true, name: true, description: true },
          },
          sender: {
            select: { name: true, email: true },
          },
        },
      });

      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }

      if (invite.usedAt) {
        return res.status(400).json({ message: "Invite already used" });
      }

      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return res.status(400).json({ message: "Invite expired" });
      }

      return res.status(200).json({
        auction: invite.auction,
        sender: invite.sender,
        role: invite.role,
        email: invite.email,
      });
    } catch (error) {
      console.error("Get invite error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    // Accept invite (requires authentication)
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({ message: "Please login to accept invite" });
    }

    try {
      const invite = await prisma.auctionInvite.findUnique({
        where: { token },
      });

      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }

      if (invite.usedAt) {
        return res.status(400).json({ message: "Invite already used" });
      }

      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return res.status(400).json({ message: "Invite expired" });
      }

      // Check if user email matches invite email
      if (session.user.email?.toLowerCase() !== invite.email.toLowerCase()) {
        return res.status(403).json({
          message: `This invite is for ${invite.email}. Please login with that email.`,
        });
      }

      // Check if already a member
      const existingMembership = await prisma.auctionMember.findUnique({
        where: {
          auctionId_userId: {
            auctionId: invite.auctionId,
            userId: session.user.id,
          },
        },
      });

      if (existingMembership) {
        // Mark invite as used and return success
        await prisma.auctionInvite.update({
          where: { token },
          data: { usedAt: new Date() },
        });
        return res.status(200).json({
          message: "Already a member",
          auctionId: invite.auctionId,
        });
      }

      // Create membership and mark invite as used
      await prisma.$transaction([
        prisma.auctionMember.create({
          data: {
            auctionId: invite.auctionId,
            userId: session.user.id,
            role: invite.role,
            invitedById: invite.senderId,
          },
        }),
        prisma.auctionInvite.update({
          where: { token },
          data: { usedAt: new Date() },
        }),
      ]);

      return res.status(200).json({
        message: "Joined auction successfully",
        auctionId: invite.auctionId,
      });
    } catch (error) {
      console.error("Accept invite error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
