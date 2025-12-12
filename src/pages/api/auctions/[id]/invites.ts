import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "CREATOR", "BIDDER"]).optional(),
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

  // Check membership and auction settings
  const membership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId: session.user.id,
      },
    },
    include: {
      auction: true,
    },
  });

  if (!membership) {
    return res.status(403).json({ message: "Not a member of this auction" });
  }

  const isAdmin = ["OWNER", "ADMIN"].includes(membership.role);
  const canInvite = isAdmin || membership.auction.memberCanInvite;

  if (!canInvite) {
    return res.status(403).json({ message: "Not authorized to invite" });
  }

  if (req.method === "POST") {
    try {
      const parsed = createInviteSchema.safeParse(req.body);

      if (!parsed.success) {
        const errors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          if (issue.path[0]) {
            errors[issue.path[0] as string] = issue.message;
          }
        });
        return res.status(400).json({ errors });
      }

      const { email, role } = parsed.data;

      // Non-admins can only invite as BIDDER
      const inviteRole = isAdmin ? role || "BIDDER" : "BIDDER";

      // Check if user is already a member
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        const existingMembership = await prisma.auctionMember.findUnique({
          where: {
            auctionId_userId: {
              auctionId,
              userId: existingUser.id,
            },
          },
        });

        if (existingMembership) {
          return res
            .status(400)
            .json({ errors: { email: "User is already a member" } });
        }
      }

      // Check for existing invite
      const existingInvite = await prisma.auctionInvite.findUnique({
        where: {
          auctionId_email: {
            auctionId,
            email: email.toLowerCase(),
          },
        },
      });

      if (existingInvite && !existingInvite.usedAt) {
        return res
          .status(400)
          .json({ errors: { email: "Invite already sent to this email" } });
      }

      // Create or update invite
      const invite = await prisma.auctionInvite.upsert({
        where: {
          auctionId_email: {
            auctionId,
            email: email.toLowerCase(),
          },
        },
        create: {
          auctionId,
          email: email.toLowerCase(),
          role: inviteRole,
          senderId: session.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
        update: {
          role: inviteRole,
          senderId: session.user.id,
          usedAt: null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        include: {
          sender: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return res.status(201).json(invite);
    } catch (error) {
      console.error("Create invite error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "GET") {
    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "Not authorized to view invites" });
    }

    try {
      const invites = await prisma.auctionInvite.findMany({
        where: { auctionId },
        include: {
          sender: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.status(200).json(invites);
    } catch (error) {
      console.error("Get invites error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
