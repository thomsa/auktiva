import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageLayout, BackLink, EmptyState } from "@/components/common";
import { StatsCard } from "@/components/ui/stats-card";

interface Winner {
  itemId: string;
  itemName: string;
  thumbnailUrl: string | null;
  winningBid: number;
  currencyCode: string;
  currencySymbol: string;
  winner: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  isCurrentUser: boolean;
}

interface ResultsPageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  auction: {
    id: string;
    name: string;
    description: string | null;
    endDate: string | null;
    isEnded: boolean;
  };
  winners: Winner[];
  userWins: Winner[];
  totalItems: number;
  totalBids: number;
  isAdmin: boolean;
}

export default function ResultsPage({
  user,
  auction,
  winners,
  userWins,
  totalItems,
  totalBids,
  isAdmin,
}: ResultsPageProps) {
  const totalValue = winners.reduce((sum, w) => sum + w.winningBid, 0);

  const handleExport = (format: "json" | "csv") => {
    window.open(
      `/api/auctions/${auction.id}/export?format=${format}`,
      "_blank",
    );
  };

  return (
    <PageLayout user={user}>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <BackLink
          href="/dashboard"
          label="Back to Dashboard"
          shortLabel="Back"
        />
        <Link
          href={`/auctions/${auction.id}`}
          className="btn btn-outline btn-sm gap-2"
        >
          <span className="icon-[tabler--list-details] size-4"></span>
          View All Items
        </Link>
      </div>

      {/* Header */}
      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mb-8">
        <div className="card-body p-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
            <div>
              <p className="text-xs font-bold text-base-content/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span className="icon-[tabler--chart-bar] size-3"></span>
                Auction Results
              </p>
              <h1 className="card-title text-2xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
                <span className="icon-[tabler--trophy] size-8 text-warning"></span>
                {auction.name}
              </h1>
            </div>
            <div className="flex items-center gap-3 self-start">
              {auction.isEnded ? (
                <div className="badge badge-error badge-lg font-bold shadow-sm gap-1">
                  <span className="icon-[tabler--flag-filled] size-3"></span>
                  Ended
                </div>
              ) : (
                <div className="badge badge-success badge-lg font-bold shadow-sm gap-1 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                  Active
                </div>
              )}
              {isAdmin && (
                <div className="dropdown dropdown-end">
                  <button
                    tabIndex={0}
                    className="btn btn-ghost btn-sm btn-square"
                  >
                    <span className="icon-[tabler--dots-vertical] size-5"></span>
                  </button>
                  <ul
                    tabIndex={0}
                    className="dropdown-content menu bg-base-100/90 backdrop-blur rounded-box z-10 w-48 p-2 shadow-lg border border-base-content/5"
                  >
                    <li className="menu-title text-xs font-semibold uppercase tracking-wider text-base-content/50 px-2 py-1">
                      Export Data
                    </li>
                    <li>
                      <button
                        onClick={() => handleExport("json")}
                        className="gap-3"
                      >
                        <span className="icon-[tabler--file-code] size-4 text-primary"></span>
                        Export JSON
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => handleExport("csv")}
                        className="gap-3"
                      >
                        <span className="icon-[tabler--file-spreadsheet] size-4 text-success"></span>
                        Export CSV
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="divider opacity-50 my-6"></div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              icon="icon-[tabler--package]"
              iconColor="primary"
              value={totalItems}
              label="Total Items"
            />
            <StatsCard
              icon="icon-[tabler--gavel]"
              iconColor="secondary"
              value={winners.length}
              label="Items with Bids"
            />
            <StatsCard
              icon="icon-[tabler--hash]"
              iconColor="accent"
              value={totalBids}
              label="Total Bids"
            />
            <StatsCard
              icon="icon-[tabler--currency-dollar]"
              iconColor="success"
              value={`$${totalValue.toFixed(0)}`}
              label="Total Value"
            />
          </div>
        </div>
      </div>

      {/* User's Wins */}
      {userWins.length > 0 && (
        <div className="card bg-success/5 border border-success/20 shadow-xl mb-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-success/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>

          <div className="card-body p-8 relative z-10">
            <h2 className="card-title text-success flex items-center gap-2 mb-6">
              <span className="icon-[tabler--confetti] size-6"></span>
              Your Winning Bids{" "}
              <span className="badge badge-success badge-sm">
                {userWins.length}
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userWins.map((win) => (
                <Link
                  key={win.itemId}
                  href={`/auctions/${auction.id}/items/${win.itemId}`}
                  className="card bg-base-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group border border-base-content/5 overflow-hidden"
                >
                  {win.thumbnailUrl ? (
                    <figure className="h-40 relative overflow-hidden bg-base-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={win.thumbnailUrl}
                        alt={win.itemName}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </figure>
                  ) : (
                    <figure className="h-40 bg-base-200 flex items-center justify-center">
                      <span className="icon-[tabler--photo] size-10 text-base-content/20 group-hover:scale-110 transition-transform duration-300"></span>
                    </figure>
                  )}
                  <div className="card-body p-5">
                    <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                      {win.itemName}
                    </h3>
                    <div className="text-2xl font-bold text-success font-mono mt-2">
                      {win.currencySymbol}
                      {win.winningBid.toFixed(2)}
                    </div>
                    <div className="mt-auto pt-2 flex items-center text-xs text-base-content/60 font-medium">
                      <span className="icon-[tabler--check] size-3 mr-1 text-success"></span>
                      Highest Bidder
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All Winners */}
      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
        <div className="card-body p-0 sm:p-8">
          <div className="p-6 sm:p-0 flex items-center gap-3 mb-6">
            <span className="w-1 h-8 rounded-full bg-secondary"></span>
            <h2 className="card-title text-xl">All Winning Bids</h2>
          </div>

          {winners.length === 0 ? (
            <div className="pb-8 px-6 sm:pb-0 sm:px-0">
              <EmptyState
                icon="icon-[tabler--gavel]"
                title="No bids placed yet"
                description="Once bidding starts, results will appear here."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-lg">
                <thead>
                  <tr className="border-b-base-content/5">
                    <th className="bg-base-200/30 font-semibold text-base-content/60 pl-8">
                      Item
                    </th>
                    <th className="bg-base-200/30 font-semibold text-base-content/60">
                      Winner
                    </th>
                    <th className="bg-base-200/30 font-semibold text-base-content/60 text-right pr-8">
                      Winning Bid
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {winners.map((win) => (
                    <tr
                      key={win.itemId}
                      className={`hover:bg-base-content/2 transition-colors border-b-base-content/5 ${win.isCurrentUser ? "bg-success/5" : ""}`}
                    >
                      <td className="pl-8">
                        <Link
                          href={`/auctions/${auction.id}/items/${win.itemId}`}
                          className="flex items-center gap-4 hover:opacity-80 group"
                        >
                          {win.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={win.thumbnailUrl}
                              alt={win.itemName}
                              className="w-12 h-12 object-cover rounded-lg shadow-sm group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-base-200 rounded-lg flex items-center justify-center">
                              <span className="icon-[tabler--photo] size-5 text-base-content/30"></span>
                            </div>
                          )}
                          <span className="font-semibold group-hover:text-primary transition-colors">
                            {win.itemName}
                          </span>
                        </Link>
                      </td>
                      <td>
                        {win.winner ? (
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${win.isCurrentUser ? "bg-success text-success-content" : "bg-neutral text-neutral-content"}`}
                            >
                              {win.winner.name?.charAt(0) ||
                                win.winner.email.charAt(0)}
                            </div>
                            <span className="font-medium">
                              {win.winner.name || win.winner.email}
                              {win.isCurrentUser && (
                                <span className="badge badge-success badge-xs ml-2 font-bold shadow-sm">
                                  You
                                </span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-base-content/50 italic">
                            <span className="icon-[tabler--spy] size-4"></span>
                            Anonymous
                          </div>
                        )}
                      </td>
                      <td className="text-right pr-8">
                        <span className="font-bold font-mono text-lg">
                          {win.currencySymbol}
                          {win.winningBid.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

  // Check membership
  const membership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId: session.user.id,
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

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
  });

  if (!auction) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  // Get all items with their highest bids and first image
  const items = await prisma.auctionItem.findMany({
    where: { auctionId },
    include: {
      currency: true,
      images: {
        orderBy: { order: "asc" },
        take: 1,
      },
      bids: {
        orderBy: { amount: "desc" },
        take: 1,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      _count: {
        select: { bids: true },
      },
    },
  });

  const totalBids = items.reduce((sum, item) => sum + item._count.bids, 0);

  // Generate public URLs for images
  const { getPublicUrl } = await import("@/lib/storage");

  const winners = items
    .filter((item) => item.bids.length > 0)
    .map((item) => ({
      itemId: item.id,
      itemName: item.name,
      thumbnailUrl: item.images[0]?.url
        ? getPublicUrl(item.images[0].url)
        : null,
      winningBid: item.bids[0].amount,
      currencyCode: item.currencyCode,
      currencySymbol: item.currency.symbol,
      winner: item.bidderAnonymous ? null : item.bids[0].user,
      isCurrentUser: item.bids[0].userId === session.user.id,
    }));

  const userWins = winners.filter((w) => w.isCurrentUser);

  const isEnded = auction.endDate
    ? new Date(auction.endDate) < new Date()
    : false;
  const isAdmin = ["OWNER", "ADMIN"].includes(membership.role);

  return {
    props: {
      user: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || "",
      },
      auction: {
        id: auction.id,
        name: auction.name,
        description: auction.description,
        endDate: auction.endDate?.toISOString() || null,
        isEnded,
      },
      winners,
      userWins,
      totalItems: items.length,
      totalBids,
      isAdmin,
    },
  };
};
