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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <p className="text-sm text-base-content/60 uppercase tracking-wide mb-1">
                Auction Results
              </p>
              <h1 className="card-title text-xl sm:text-3xl flex items-center gap-2 sm:gap-3">
                <span className="icon-[tabler--trophy] size-6 sm:size-8 text-warning"></span>
                {auction.name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {auction.isEnded ? (
                <div className="badge badge-error badge-lg">Ended</div>
              ) : (
                <div className="badge badge-success badge-lg">Active</div>
              )}
              {isAdmin && (
                <div className="dropdown dropdown-end">
                  <button tabIndex={0} className="btn btn-ghost btn-sm">
                    <span className="icon-[tabler--download] size-4"></span>
                    Export
                  </button>
                  <ul
                    tabIndex={0}
                    className="dropdown-content menu bg-base-100 rounded-box z-10 w-40 p-2 shadow"
                  >
                    <li>
                      <button onClick={() => handleExport("json")}>
                        <span className="icon-[tabler--file-code] size-4"></span>
                        JSON
                      </button>
                    </li>
                    <li>
                      <button onClick={() => handleExport("csv")}>
                        <span className="icon-[tabler--file-spreadsheet] size-4"></span>
                        CSV
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
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
        <div className="card bg-success/10 border-2 border-success shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-success">
              <span className="icon-[tabler--confetti] size-6"></span>
              Your Winning Bids ({userWins.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {userWins.map((win) => (
                <Link
                  key={win.itemId}
                  href={`/auctions/${auction.id}/items/${win.itemId}`}
                  className="card bg-base-100 hover:shadow-lg transition-shadow"
                >
                  {win.thumbnailUrl ? (
                    <figure className="h-32">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={win.thumbnailUrl}
                        alt={win.itemName}
                        className="w-full h-full object-cover"
                      />
                    </figure>
                  ) : (
                    <figure className="h-32 bg-base-200 flex items-center justify-center">
                      <span className="icon-[tabler--photo] size-10 text-base-content/20"></span>
                    </figure>
                  )}
                  <div className="card-body p-4">
                    <h3 className="font-bold">{win.itemName}</h3>
                    <div className="text-2xl font-bold text-success">
                      {win.currencySymbol}
                      {win.winningBid.toFixed(2)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All Winners */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            <span className="icon-[tabler--list-check] size-6"></span>
            All Winning Bids
          </h2>

          {winners.length === 0 ? (
            <EmptyState
              icon="icon-[tabler--mood-sad]"
              title="No bids placed yet"
            />
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Winner</th>
                    <th className="text-right">Winning Bid</th>
                  </tr>
                </thead>
                <tbody>
                  {winners.map((win) => (
                    <tr
                      key={win.itemId}
                      className={win.isCurrentUser ? "bg-success/10" : ""}
                    >
                      <td>
                        <Link
                          href={`/auctions/${auction.id}/items/${win.itemId}`}
                          className="flex items-center gap-3 hover:opacity-80"
                        >
                          {win.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={win.thumbnailUrl}
                              alt={win.itemName}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-base-200 rounded flex items-center justify-center">
                              <span className="icon-[tabler--photo] size-5 text-base-content/30"></span>
                            </div>
                          )}
                          <span className="font-medium">{win.itemName}</span>
                        </Link>
                      </td>
                      <td>
                        {win.winner ? (
                          <div className="flex items-center gap-2">
                            <div className="avatar placeholder">
                              <div className="bg-neutral text-neutral-content w-8 h-8 rounded-full">
                                <span className="text-xs">
                                  {win.winner.name?.charAt(0) ||
                                    win.winner.email.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <span>
                              {win.winner.name || win.winner.email}
                              {win.isCurrentUser && (
                                <span className="badge badge-success badge-sm ml-2">
                                  You
                                </span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-base-content/60">
                            Anonymous
                          </span>
                        )}
                      </td>
                      <td className="text-right font-bold">
                        {win.currencySymbol}
                        {win.winningBid.toFixed(2)}
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
