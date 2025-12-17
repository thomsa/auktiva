import { useState } from "react";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("auction.invite");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tStatus = useTranslations("status");
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
          result.errors?.email || result.message || tErrors("invite.sendFailed"),
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
      setError(tErrors("generic"));
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
      showToast(tCommon("copied"), "success");
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
              {t("backTo", { name: auction.name })}
            </Link>
          </div>

          <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
            <div className="card-body p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="icon-[tabler--user-plus] size-7"></span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{t("title")}</h1>
                  <p className="text-base-content/60">
                    {t("subtitle")}
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
                  <label className="label">
                    <span className="label-text font-medium">
                      {t("emailAddress")}
                    </span>
                  </label>
                  <div className="join w-full">
                    <div className="relative w-full">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 icon-[tabler--mail] size-5"></span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("emailPlaceholder")}
                        className="input input-bordered w-full pl-10 bg-base-100 focus:bg-base-100 transition-colors"
                        required
                      />
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">{t("role")}</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label
                        className={`cursor-pointer border rounded-xl p-3 hover:border-primary/50 transition-all ${
                          role === "BIDDER"
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "bg-base-100 border-base-content/10"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="radio"
                            name="role"
                            value="BIDDER"
                            checked={role === "BIDDER"}
                            onChange={(e) => setRole(e.target.value)}
                            className="radio radio-primary radio-sm"
                          />
                          <span className="font-bold">Bidder</span>
                        </div>
                        <p className="text-xs text-base-content/60 pl-6">
                          {t("roleBidder").split(" - ")[1]}
                        </p>
                      </label>
                      <label
                        className={`cursor-pointer border rounded-xl p-3 hover:border-primary/50 transition-all ${
                          role === "CREATOR"
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "bg-base-100 border-base-content/10"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="radio"
                            name="role"
                            value="CREATOR"
                            checked={role === "CREATOR"}
                            onChange={(e) => setRole(e.target.value)}
                            className="radio radio-primary radio-sm"
                          />
                          <span className="font-bold">Creator</span>
                        </div>
                        <p className="text-xs text-base-content/60 pl-6">
                          {t("roleCreator").split(" - ")[1]}
                        </p>
                      </label>
                      <label
                        className={`cursor-pointer border rounded-xl p-3 hover:border-primary/50 transition-all ${
                          role === "ADMIN"
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "bg-base-100 border-base-content/10"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="radio"
                            name="role"
                            value="ADMIN"
                            checked={role === "ADMIN"}
                            onChange={(e) => setRole(e.target.value)}
                            className="radio radio-primary radio-sm"
                          />
                          <span className="font-bold">Admin</span>
                        </div>
                        <p className="text-xs text-base-content/60 pl-6">
                          {t("roleAdmin").split(" - ")[1]}
                        </p>
                      </label>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  modifier="block"
                  isLoading={isLoading}
                  loadingText={t("sending")}
                  className="btn-lg shadow-lg shadow-primary/20"
                  icon={<span className="icon-[tabler--send] size-5"></span>}
                >
                  {t("sendInvite")}
                </Button>
              </form>
            </div>
          </div>

          {isAdmin && invites.length > 0 && (
            <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mt-8">
              <div className="card-body p-8">
                <h2 className="card-title text-lg mb-6 flex items-center gap-2">
                  <span className="icon-[tabler--mail] size-5 text-secondary"></span>
                  {t("pendingInvites")}
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
                          <span>{invite.usedAt ? tStatus("accepted") : tStatus("pending")}</span>
                        </div>
                      </div>
                      {!invite.usedAt && (
                        <button
                          onClick={() => copyToClipboard(invite.token)}
                          className="btn btn-ghost btn-sm btn-circle tooltip tooltip-left"
                          data-tip={t("copyInviteLink")}
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
      messages: await getMessages(context.locale as Locale),
    },
  };
};
