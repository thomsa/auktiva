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

  const notificationId = req.query.id as string;

  // Verify ownership
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== session.user.id) {
    return res.status(404).json({ message: "Notification not found" });
  }

  // PATCH - Mark as read
  if (req.method === "PATCH") {
    try {
      const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });

      return res.status(200).json({
        ...updated,
        createdAt: updated.createdAt.toISOString(),
      });
    } catch (error) {
      console.error("Update notification error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // DELETE - Delete notification
  if (req.method === "DELETE") {
    try {
      await prisma.notification.delete({
        where: { id: notificationId },
      });

      return res.status(200).json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Delete notification error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
