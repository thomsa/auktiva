import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const unreadOnly = req.query.unread === "true";

      const notifications = await prisma.notification.findMany({
        where: {
          userId: session.user.id,
          ...(unreadOnly ? { read: false } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      const unreadCount = await prisma.notification.count({
        where: {
          userId: session.user.id,
          read: false,
        },
      });

      return res.status(200).json({
        notifications: notifications.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        })),
        unreadCount,
      });
    } catch (error) {
      console.error("Get notifications error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
