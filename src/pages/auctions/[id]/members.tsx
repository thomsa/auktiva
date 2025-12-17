import { useState } from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageLayout, BackLink, AlertMessage } from "@/components/common";
import { MemberCard, MemberRow } from "@/components/member";
import { useToast } from "@/components/ui/toast";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";

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

export default function MembersPage({
  user,
  auction,
  members: initialMembers,
  isOwner,
  isAdmin,
}: MembersPageProps) {
  const t = useTranslations("auction.members");
  const tCommon = useTranslations("common");
  const tAuction = useTranslations("auction");
  const tErrors = useTranslations("errors");
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
        setError(result.message || tErrors("generic"));
      } else {
        setMembers(
          members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
        );
        showToast(t("updateSuccess"), "success");
      }
    } catch {
      setError(tErrors("generic"));
    } finally {
      setLoadingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (
      !confirm(
        t("confirmRemove", { name: memberName }),
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
        setError(result.message || tErrors("generic"));
      } else {
        setMembers(members.filter((m) => m.id !== memberId));
        showToast(t("removeSuccess"), "success");
      }
    } catch {
      setError(tErrors("generic"));
    } finally {
      setLoadingMemberId(null);
    }
  };

  return (
    <PageLayout user={user} maxWidth="4xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <BackLink
            href={`/auctions/${auction.id}`}
            label={tAuction("invite.backTo", { name: auction.name })}
            shortLabel={tCommon("back")}
          />
          <h1 className="text-2xl sm:text-3xl font-bold mt-4 flex items-center gap-3">
            <span className="icon-[tabler--users] size-8 text-primary"></span>
            {t("title")}
            <span className="badge badge-neutral text-lg">
              {members.length}
            </span>
          </h1>
        </div>

        {(isOwner || isAdmin) && (
          <Link
            href={`/auctions/${auction.id}/invite`}
            className="btn btn-primary shadow-lg shadow-primary/20 gap-2"
          >
            <span className="icon-[tabler--user-plus] size-5"></span>
            {t("invite")}
          </Link>
        )}
      </div>

      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
        <div className="card-body p-0 sm:p-6">
          {error && (
            <div className="p-6 pb-0">
              <AlertMessage type="error">{error}</AlertMessage>
            </div>
          )}

          {/* Mobile Card View */}
          <div className="sm:hidden divide-y divide-base-content/5">
            {members.map((member) => (
              <div key={member.id} className="p-4">
                <MemberCard
                  member={member}
                  currentUserId={user.id}
                  isAdmin={isAdmin}
                  isLoading={loadingMemberId === member.id}
                  onRoleChange={handleRoleChange}
                  onRemove={handleRemoveMember}
                />
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="table table-lg">
              <thead>
                <tr className="border-b-base-content/5">
                  <th className="bg-base-200/30 text-base-content/60 font-semibold pl-6">
                    {t("member")}
                  </th>
                  <th className="bg-base-200/30 text-base-content/60 font-semibold">
                    {t("role")}
                  </th>
                  <th className="bg-base-200/30 text-base-content/60 font-semibold">
                    {t("joined")}
                  </th>
                  <th className="bg-base-200/30 text-base-content/60 font-semibold">
                    {t("invitedBy")}
                  </th>
                  {isAdmin && (
                    <th className="bg-base-200/30 text-base-content/60 font-semibold text-right pr-6">
                      {t("actions")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-base-content/5">
                {members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    currentUserId={user.id}
                    isAdmin={isAdmin}
                    isLoading={loadingMemberId === member.id}
                    onRoleChange={handleRoleChange}
                    onRemove={handleRemoveMember}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageLayout>
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
      messages: await getMessages(context.locale as Locale),
    },
  };
};
