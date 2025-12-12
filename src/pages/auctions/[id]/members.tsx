import { useState } from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  invitedBy: {
    name: string | null;
    email: string;
  } | null;
}

interface MembersPageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  auction: {
    id: string;
    name: string;
  };
  members: Member[];
  isOwner: boolean;
  isAdmin: boolean;
}

const ROLE_OPTIONS = ["ADMIN", "CREATOR", "BIDDER"];
const ROLE_COLORS: Record<string, string> = {
  OWNER: "badge-primary",
  ADMIN: "badge-secondary",
  CREATOR: "badge-accent",
  BIDDER: "badge-ghost",
};

export default function MembersPage({
  user,
  auction,
  members: initialMembers,
  isOwner,
  isAdmin,
}: MembersPageProps) {
  const [members, setMembers] = useState(initialMembers);
  const [error, setError] = useState<string | null>(null);
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setError(null);
    setLoadingMemberId(memberId);

    try {
      const res = await fetch(
        `/api/auctions/${auction.id}/members/${memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        },
      );

      const result = await res.json();

      if (!res.ok) {
        setError(result.message || "Failed to update role");
      } else {
        setMembers(
          members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
        );
        showToast("Role updated successfully", "success");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoadingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${memberName} from this auction?`,
      )
    ) {
      return;
    }

    setError(null);
    setLoadingMemberId(memberId);

    try {
      const res = await fetch(
        `/api/auctions/${auction.id}/members/${memberId}`,
        {
          method: "DELETE",
        },
      );

      const result = await res.json();

      if (!res.ok) {
        setError(result.message || "Failed to remove member");
      } else {
        setMembers(members.filter((m) => m.id !== memberId));
        showToast("Member removed successfully", "success");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoadingMemberId(null);
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8 pb-12 max-w-4xl">
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <Link
            href={`/auctions/${auction.id}`}
            className="btn btn-ghost btn-sm gap-2"
          >
            <span className="icon-[tabler--arrow-left] size-4"></span>
            <span className="hidden sm:inline">Back to {auction.name}</span>
            <span className="sm:hidden">Back</span>
          </Link>
          {(isOwner || isAdmin) && (
            <Link
              href={`/auctions/${auction.id}/invite`}
              className="btn btn-primary btn-sm w-full sm:w-auto"
            >
              <span className="icon-[tabler--user-plus] size-4"></span>
              Invite
            </Link>
          )}
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="card-title text-2xl mb-4">
              <span className="icon-[tabler--users] size-6"></span>
              Members ({members.length})
            </h1>

            {error && (
              <div className="alert alert-error mb-4">
                <span className="icon-[tabler--alert-circle] size-5"></span>
                <span>{error}</span>
              </div>
            )}

            {/* Mobile Card View */}
            <div className="space-y-3 md:hidden">
              {members.map((member) => {
                const isCurrentUser = member.user.id === user.id;
                const canModify =
                  isAdmin && !isCurrentUser && member.role !== "OWNER";

                return (
                  <div
                    key={member.id}
                    className={`p-3 rounded-lg ${isCurrentUser ? "bg-base-200" : "bg-base-100 border border-base-200"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div className="bg-neutral text-neutral-content w-10 h-10 rounded-full">
                            <span>
                              {member.user.name?.charAt(0) ||
                                member.user.email.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-sm">
                            {member.user.name || "No name"}
                            {isCurrentUser && (
                              <span className="badge badge-xs ml-2">You</span>
                            )}
                          </div>
                          <div className="text-xs text-base-content/60 break-all">
                            {member.user.email}
                          </div>
                        </div>
                      </div>
                      {canModify && isAdmin && (
                        <button
                          onClick={() =>
                            handleRemoveMember(
                              member.id,
                              member.user.name || member.user.email,
                            )
                          }
                          disabled={loadingMemberId === member.id}
                          className="btn btn-ghost btn-xs text-error"
                          title="Remove member"
                        >
                          {loadingMemberId === member.id ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            <span className="icon-[tabler--trash] size-4"></span>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {canModify ? (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(member.id, e.target.value)
                          }
                          disabled={loadingMemberId === member.id}
                          className="select select-bordered select-xs"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`badge badge-sm ${ROLE_COLORS[member.role] || "badge-ghost"}`}
                        >
                          {member.role}
                        </span>
                      )}
                      <span className="text-xs text-base-content/60">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Invited By</th>
                    {isAdmin && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const isCurrentUser = member.user.id === user.id;
                    const canModify =
                      isAdmin && !isCurrentUser && member.role !== "OWNER";

                    return (
                      <tr
                        key={member.id}
                        className={isCurrentUser ? "bg-base-200" : ""}
                      >
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar placeholder">
                              <div className="bg-neutral text-neutral-content w-10 h-10 rounded-full">
                                <span>
                                  {member.user.name?.charAt(0) ||
                                    member.user.email.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="font-bold">
                                {member.user.name || "No name"}
                                {isCurrentUser && (
                                  <span className="badge badge-sm ml-2">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-base-content/60">
                                {member.user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {canModify ? (
                            <select
                              value={member.role}
                              onChange={(e) =>
                                handleRoleChange(member.id, e.target.value)
                              }
                              disabled={loadingMemberId === member.id}
                              className="select select-bordered select-sm"
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`badge ${ROLE_COLORS[member.role] || "badge-ghost"}`}
                            >
                              {member.role}
                            </span>
                          )}
                        </td>
                        <td className="text-sm text-base-content/60">
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="text-sm text-base-content/60">
                          {member.invitedBy
                            ? member.invitedBy.name || member.invitedBy.email
                            : "—"}
                        </td>
                        {isAdmin && (
                          <td className="text-right">
                            {canModify && (
                              <button
                                onClick={() =>
                                  handleRemoveMember(
                                    member.id,
                                    member.user.name || member.user.email,
                                  )
                                }
                                disabled={loadingMemberId === member.id}
                                className="btn btn-ghost btn-sm text-error"
                                title="Remove member"
                              >
                                {loadingMemberId === member.id ? (
                                  <span className="loading loading-spinner loading-sm"></span>
                                ) : (
                                  <span className="icon-[tabler--trash] size-4"></span>
                                )}
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
        select: { id: true, name: true },
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

  const isOwner = membership.role === "OWNER";
  const isAdmin = isOwner || membership.role === "ADMIN";

  // Only admins can view member list
  if (!isAdmin) {
    return {
      redirect: {
        destination: `/auctions/${auctionId}`,
        permanent: false,
      },
    };
  }

  const members = await prisma.auctionMember.findMany({
    where: { auctionId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });

  // Fetch inviter info for members who were invited
  const inviterIds = members
    .filter((m) => m.invitedById)
    .map((m) => m.invitedById as string);

  const inviters =
    inviterIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: inviterIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

  const inviterMap = new Map(inviters.map((i) => [i.id, i]));

  return {
    props: {
      user: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || "",
      },
      auction: membership.auction,
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        user: m.user,
        invitedBy: m.invitedById ? inviterMap.get(m.invitedById) || null : null,
      })),
      isOwner,
      isAdmin,
    },
  };
};
