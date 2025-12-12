import { useState } from "react";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

interface Invite {
  id: string;
  email: string;
  role: string;
  token: string;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  sender: {
    name: string | null;
    email: string;
  };
}

interface InvitePageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  auction: {
    id: string;
    name: string;
    memberCanInvite: boolean;
  };
  isAdmin: boolean;
  invites: Invite[];
}

export default function InvitePage({
  user,
  auction,
  isAdmin,
  invites: initialInvites,
}: InvitePageProps) {
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("BIDDER");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/auctions/${auction.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: isAdmin ? role : "BIDDER" }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(
          result.errors?.email || result.message || "Failed to send invite",
        );
      } else {
        showToast(`Invite sent to ${email}`, "success");
        setEmail("");
        // Add to list if admin
        if (isAdmin) {
          setInvites([result, ...invites]);
        }
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getInviteLink = (token: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/invite/${token}`;
    }
    return `/invite/${token}`;
  };

  const copyToClipboard = async (token: string) => {
    try {
      await navigator.clipboard.writeText(getInviteLink(token));
      showToast("Link copied to clipboard!", "success");
    } catch {
      setError("Failed to copy link");
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8 pb-12 max-w-2xl">
        <div className="mb-6">
          <Link
            href={`/auctions/${auction.id}`}
            className="btn btn-ghost btn-sm gap-2"
          >
            <span className="icon-[tabler--arrow-left] size-4"></span>
            Back to {auction.name}
          </Link>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="card-title text-2xl mb-6">
              <span className="icon-[tabler--user-plus] size-6"></span>
              Invite People
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="alert alert-error">
                  <span className="icon-[tabler--alert-circle] size-5"></span>
                  <span>{error}</span>
                </div>
              )}

              <div className="form-control">
                <label className="label" htmlFor="email">
                  <span className="label-text">Email Address</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="input input-bordered w-full"
                  required
                />
              </div>

              {isAdmin && (
                <div className="form-control">
                  <label className="label" htmlFor="role">
                    <span className="label-text">Role</span>
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="select select-bordered w-full"
                  >
                    <option value="BIDDER">
                      Bidder - Can only bid on items
                    </option>
                    <option value="CREATOR">
                      Creator - Can create items and bid
                    </option>
                    <option value="ADMIN">
                      Admin - Can manage members and items
                    </option>
                  </select>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                modifier="block"
                isLoading={isLoading}
                loadingText="Sending..."
                icon={<span className="icon-[tabler--send] size-5"></span>}
              >
                Send Invite
              </Button>
            </form>
          </div>
        </div>

        {/* Pending Invites (Admin only) */}
        {isAdmin && invites.length > 0 && (
          <div className="card bg-base-100 shadow-xl mt-6">
            <div className="card-body">
              <h2 className="card-title text-lg mb-4">
                <span className="icon-[tabler--mail] size-5"></span>
                Pending Invites
              </h2>

              <div className="space-y-3">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      invite.usedAt ? "bg-base-200 opacity-60" : "bg-base-200"
                    }`}
                  >
                    <div>
                      <div className="font-medium">{invite.email}</div>
                      <div className="text-sm text-base-content/60">
                        {invite.role} • {invite.usedAt ? "Accepted" : "Pending"}
                      </div>
                    </div>
                    {!invite.usedAt && (
                      <button
                        onClick={() => copyToClipboard(invite.token)}
                        className="btn btn-ghost btn-sm"
                        title="Copy invite link"
                      >
                        <span className="icon-[tabler--copy] size-4"></span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user?.id) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const auctionId = context.params?.id as string;

  const membership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId: session.user.id,
      },
    },
    include: {
      auction: {
        select: {
          id: true,
          name: true,
          memberCanInvite: true,
        },
      },
    },
  });

  if (!membership) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  const isAdmin = ["OWNER", "ADMIN"].includes(membership.role);
  const canInvite = isAdmin || membership.auction.memberCanInvite;

  if (!canInvite) {
    return {
      redirect: {
        destination: `/auctions/${auctionId}`,
        permanent: false,
      },
    };
  }

  // Only admins can see invite list
  const invites = isAdmin
    ? await prisma.auctionInvite.findMany({
        where: { auctionId },
        include: {
          sender: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return {
    props: {
      user: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || "",
      },
      auction: membership.auction,
      isAdmin,
      invites: invites.map((i) => ({
        ...i,
        usedAt: i.usedAt?.toISOString() || null,
        expiresAt: i.expiresAt?.toISOString() || null,
        createdAt: i.createdAt.toISOString(),
      })),
    },
  };
};
