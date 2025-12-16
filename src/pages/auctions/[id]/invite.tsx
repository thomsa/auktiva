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
    <div className="min-h-screen bg-base-100 relative overflow-x-hidden selection:bg-primary/20">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[128px] translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[128px] -translate-x-1/3 translate-y-1/3"></div>
      </div>

      <div className="relative z-10">
        <Navbar user={user} />

        <main className="container mx-auto px-4 py-8 pb-12 max-w-2xl">
          <div className="mb-8">
            <Link
              href={`/auctions/${auction.id}`}
              className="btn btn-ghost btn-sm gap-2 hover:bg-base-content/5"
            >
              <span className="icon-[tabler--arrow-left] size-4"></span>
              Back to {auction.name}
            </Link>
          </div>

          <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
            <div className="card-body p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="icon-[tabler--user-plus] size-7"></span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Invite People</h1>
                  <p className="text-base-content/60">
                    Send email invitations to new members
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="alert alert-error shadow-sm">
                    <span className="icon-[tabler--alert-circle] size-5"></span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-control">
                  <label className="label" htmlFor="email">
                    <span className="label-text font-medium">
                      Email Address
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 icon-[tabler--mail] size-5"></span>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="friend@example.com"
                      className="input input-bordered w-full pl-10 bg-base-100 focus:bg-base-100 transition-colors"
                      required
                    />
                  </div>
                </div>

                {isAdmin && (
                  <div className="form-control">
                    <label className="label" htmlFor="role">
                      <span className="label-text font-medium">Role</span>
                    </label>
                    <select
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="select select-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
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

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    modifier="block"
                    isLoading={isLoading}
                    loadingText="Sending..."
                    className="shadow-lg shadow-primary/20"
                    icon={<span className="icon-[tabler--send] size-5"></span>}
                  >
                    Send Invite
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Pending Invites (Admin only) */}
          {isAdmin && invites.length > 0 && (
            <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mt-8">
              <div className="card-body p-8">
                <h2 className="card-title text-lg mb-6 flex items-center gap-2">
                  <span className="icon-[tabler--mail] size-5 text-secondary"></span>
                  Pending Invites
                  <span className="badge badge-ghost badge-sm">
                    {invites.length}
                  </span>
                </h2>

                <div className="space-y-3">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        invite.usedAt
                          ? "bg-base-200/50 border-transparent opacity-60"
                          : "bg-base-100 border-base-content/5 hover:border-primary/20 hover:shadow-sm"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-base-content/90">
                          {invite.email}
                        </div>
                        <div className="text-sm text-base-content/60 flex items-center gap-2 mt-0.5">
                          <span className="badge badge-xs badge-ghost">
                            {invite.role}
                          </span>
                          <span>•</span>
                          <span>{invite.usedAt ? "Accepted" : "Pending"}</span>
                        </div>
                      </div>
                      {!invite.usedAt && (
                        <button
                          onClick={() => copyToClipboard(invite.token)}
                          className="btn btn-ghost btn-sm btn-circle tooltip tooltip-left"
                          data-tip="Copy Invite Link"
                        >
                          <span className="icon-[tabler--copy] size-5"></span>
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
