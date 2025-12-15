import { useState, useMemo } from "react";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { useRouter } from "next/router";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import {
  SortDropdown,
  sidebarItemSortOptions,
  sortItems,
} from "@/components/ui/sort-dropdown";
import { Button } from "@/components/ui/button";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

interface Bid {
  id: string;
  amount: number;
  createdAt: string;
  isAnonymous: boolean;
  user: {
    id: string;
    name: string | null;
  } | null; // null if anonymous to viewer
}

interface AuctionItemSummary {
  id: string;
  name: string;
  currentBid: number | null;
  startingBid: number;
  thumbnailUrl: string | null;
  endDate: string | null;
  createdAt: string;
  currency: {
    symbol: string;
  };
}

interface ItemDetailProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  auction: {
    id: string;
    name: string;
    bidderVisibility: string;
  };
  auctionItems: AuctionItemSummary[];
  itemSidebarCollapsed: boolean;
  item: {
    id: string;
    name: string;
    description: string | null;
    currencyCode: string;
    currency: {
      code: string;
      name: string;
      symbol: string;
    };
    startingBid: number;
    minBidIncrement: number;
    currentBid: number | null;
    highestBidderId: string | null;
    bidderAnonymous: boolean;
    endDate: string | null;
    createdAt: string;
    creator: {
      id: string;
      name: string | null;
      email: string;
    };
  };
  bids: Bid[];
  isHighestBidder: boolean;
  canBid: boolean;
  canEdit: boolean;
  isItemOwner: boolean;
  winnerEmail: string | null;
  images: Array<{
    id: string;
    url: string;
    publicUrl: string;
    order: number;
  }>;
}

interface ItemResponse {
  item: ItemDetailProps["item"];
  bids: Bid[];
}

export default function ItemDetailPage({
  user,
  auction,
  auctionItems,
  itemSidebarCollapsed: initialSidebarCollapsed,
  item: initialItem,
  bids: initialBids,
  canBid,
  canEdit,
  isItemOwner,
  winnerEmail,
  images,
}: ItemDetailProps) {
  const router = useRouter();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [bidAmount, setBidAmount] = useState("");
  const [bidAsAnonymous, setBidAsAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    initialSidebarCollapsed
  );

  // Sidebar sorting
  const sidebarSort = (router.query.sidebarSort as string) || "date-desc";
  const sortedAuctionItems = useMemo(() => {
    return sortItems(auctionItems, sidebarSort);
  }, [auctionItems, sidebarSort]);

  const isEnded =
    initialItem.endDate && new Date(initialItem.endDate) < new Date();

  // Fetch latest item data with SWR (poll every 5 seconds when active)
  const { data, mutate } = useSWR<ItemResponse>(
    `/api/auctions/${auction.id}/items/${initialItem.id}`,
    fetcher,
    {
      fallbackData: { item: initialItem, bids: initialBids },
      refreshInterval: isEnded ? 0 : 5000,
      revalidateOnFocus: true,
    }
  );

  const item = data?.item ?? initialItem;
  const bids = data?.bids ?? initialBids;
  const isHighestBidder = item.highestBidderId === user.id;

  const minBid = item.currentBid
    ? item.currentBid + item.minBidIncrement
    : item.startingBid;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No end date";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < minBid) {
      setError(`Minimum bid is ${item.currency.symbol}${minBid.toFixed(2)}`);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/auctions/${auction.id}/items/${item.id}/bids`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            isAnonymous:
              auction.bidderVisibility === "PER_BID"
                ? bidAsAnonymous
                : undefined,
          }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        setError(result.message || "Failed to place bid");
      } else {
        // Revalidate SWR data
        await mutate();
        setBidAmount("");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSidebar = async () => {
    const newValue = !sidebarCollapsed;
    setSidebarCollapsed(newValue);
    // Persist to server
    try {
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemSidebarCollapsed: newValue }),
      });
    } catch (err) {
      console.error("Failed to save sidebar preference:", err);
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar user={user} />

      <div className="flex">
        {/* Items Sidebar */}
        <aside
          className={`hidden lg:block bg-base-100 border-r border-base-300 transition-all duration-300 ${
            sidebarCollapsed ? "w-0 overflow-hidden" : "w-80"
          }`}
        >
          <div className="h-[calc(100vh-4rem)] overflow-y-auto sticky top-16">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-lg">Items in Auction</h2>
                <span className="badge badge-ghost">{auctionItems.length}</span>
              </div>
              <div className="sticky top-0 bg-base-100 pb-2 -mx-4 px-4 z-10">
                <SortDropdown
                  options={sidebarItemSortOptions}
                  currentSort={sidebarSort}
                  paramName="sidebarSort"
                  fullWidth
                  dropdownEnd={false}
                />
              </div>
              <div className="space-y-2">
                {sortedAuctionItems.map((auctionItem) => {
                  const isEnded =
                    auctionItem.endDate &&
                    new Date(auctionItem.endDate) < new Date();
                  return (
                    <Link
                      key={auctionItem.id}
                      href={`/auctions/${auction.id}/items/${auctionItem.id}`}
                      className={`block p-3 rounded-lg transition-colors ${
                        auctionItem.id === initialItem.id
                          ? "bg-primary/10 border border-primary"
                          : "bg-base-200 hover:bg-base-300"
                      } ${isEnded ? "opacity-60" : ""}`}
                    >
                      <div className="flex gap-3">
                        <div className="relative shrink-0">
                          {auctionItem.thumbnailUrl ? (
                            <img
                              src={auctionItem.thumbnailUrl}
                              alt={auctionItem.name}
                              className={`w-12 h-12 object-cover rounded ${
                                isEnded ? "grayscale" : ""
                              }`}
                            />
                          ) : (
                            <div
                              className={`w-12 h-12 bg-base-300 rounded flex items-center justify-center ${
                                isEnded ? "grayscale" : ""
                              }`}
                            >
                              <span className="icon-[tabler--photo] size-6 text-base-content/40"></span>
                            </div>
                          )}
                          {isEnded && (
                            <div className="absolute -top-1 -left-1">
                              <div className="badge badge-error badge-xs gap-0.5">
                                <span className="icon-[tabler--flag-filled] size-2"></span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {auctionItem.name}
                          </div>
                          <div
                            className={`text-sm font-semibold ${
                              isEnded ? "text-base-content/50" : "text-primary"
                            }`}
                          >
                            {auctionItem.currency.symbol}
                            {(
                              auctionItem.currentBid || auctionItem.startingBid
                            ).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Sidebar Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-10 bg-base-100 border border-base-300 rounded-r-lg p-2 shadow-md hover:bg-base-200 transition-all"
          style={{ left: sidebarCollapsed ? 0 : "calc(20rem - 1px)" }}
          aria-label={
            sidebarCollapsed ? "Show items sidebar" : "Hide items sidebar"
          }
        >
          <span
            className={`icon-[tabler--chevron-${
              sidebarCollapsed ? "right" : "left"
            }] size-5`}
          ></span>
        </button>

        {/* Main Content Area */}
        <main
          className={`flex-1 transition-all duration-300 ${
            sidebarCollapsed ? "" : "lg:ml-0"
          }`}
        >
          <div className="container mx-auto px-4 py-8 pb-12">
            <div className="mb-6 flex items-center justify-between">
              <Link
                href={`/auctions/${auction.id}`}
                className="btn btn-ghost btn-sm gap-2"
              >
                <span className="icon-[tabler--arrow-left] size-4"></span>
                Back to {auction.name}
              </Link>

              {/* Mobile: Show items count */}
              <div className="lg:hidden">
                <Link
                  href={`/auctions/${auction.id}`}
                  className="btn btn-ghost btn-sm gap-2"
                >
                  <span className="icon-[tabler--list] size-4"></span>
                  {auctionItems.length} items
                </Link>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Main Content */}
              <div className="flex-1">
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <h1 className="card-title text-xl sm:text-3xl">
                        {item.name}
                      </h1>
                      <div className="flex items-center gap-2">
                        {isEnded && (
                          <div className="badge badge-error">Ended</div>
                        )}
                        {canEdit && (
                          <Link
                            href={`/auctions/${auction.id}/items/${item.id}/edit`}
                            className="btn btn-ghost btn-sm"
                          >
                            <span className="icon-[tabler--edit] size-4"></span>
                            Edit
                          </Link>
                        )}
                      </div>
                    </div>

                    <p className="text-base-content/60 text-sm">
                      Listed by {item.creator.name || item.creator.email}
                    </p>

                    {/* Image Gallery */}
                    {images.length > 0 && (
                      <div className="mt-6">
                        {/* Main Image with Navigation */}
                        <div className="relative aspect-video bg-base-200 rounded-lg overflow-hidden mb-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={images[selectedImageIndex]?.publicUrl}
                            alt={`${item.name} - Image ${
                              selectedImageIndex + 1
                            }`}
                            className="w-full h-full object-contain"
                          />
                          {/* Navigation Buttons */}
                          {images.length > 1 && (
                            <>
                              <button
                                onClick={() =>
                                  setSelectedImageIndex((prev) =>
                                    prev === 0 ? images.length - 1 : prev - 1
                                  )
                                }
                                className="absolute left-2 top-1/2 -translate-y-1/2 btn btn-circle btn-sm bg-black/50 hover:bg-black/70 border-none text-white"
                                aria-label="Previous image"
                              >
                                <span className="icon-[tabler--chevron-left] size-5"></span>
                              </button>
                              <button
                                onClick={() =>
                                  setSelectedImageIndex((prev) =>
                                    prev === images.length - 1 ? 0 : prev + 1
                                  )
                                }
                                className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-circle btn-sm bg-black/50 hover:bg-black/70 border-none text-white"
                                aria-label="Next image"
                              >
                                <span className="icon-[tabler--chevron-right] size-5"></span>
                              </button>
                              {/* Image Counter */}
                              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                {selectedImageIndex + 1} / {images.length}
                              </div>
                            </>
                          )}
                        </div>
                        {/* Thumbnails */}
                        {images.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {images.map((img, index) => (
                              <button
                                key={img.id}
                                onClick={() => setSelectedImageIndex(index)}
                                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                                  index === selectedImageIndex
                                    ? "border-primary"
                                    : "border-transparent hover:border-base-300"
                                }`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={img.publicUrl}
                                  alt={`Thumbnail ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {item.description && (
                      <div className="mt-6">
                        <h2 className="font-semibold mb-2">Description</h2>
                        <p className="text-base-content/80 whitespace-pre-wrap">
                          {item.description}
                        </p>
                      </div>
                    )}

                    <div className="divider"></div>

                    {/* Bid History */}
                    <div>
                      <h2 className="font-semibold mb-4 flex items-center gap-2">
                        <span className="icon-[tabler--history] size-5"></span>
                        Bid History ({bids.length})
                      </h2>

                      {bids.length === 0 ? (
                        <p className="text-base-content/60 text-center py-8">
                          No bids yet. Be the first to bid!
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {bids.map((bid, index) => (
                            <div
                              key={bid.id}
                              className={`flex justify-between items-center p-3 rounded-lg ${
                                index === 0 ? "bg-primary/10" : "bg-base-200"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {bid.user
                                    ? bid.user.name || "Anonymous"
                                    : "Anonymous"}
                                </span>
                                {index === 0 && (
                                  <span className="badge badge-primary badge-sm text-center">
                                    Highest
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-bold">
                                  {item.currency.symbol}
                                  {bid.amount.toFixed(2)}
                                </div>
                                <div className="text-xs text-base-content/60">
                                  {new Date(bid.createdAt).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar - Bidding */}
              <div className="w-full lg:w-96">
                <div className="card bg-base-100 shadow-xl sticky top-24">
                  <div className="card-body">
                    <h2 className="card-title">
                      <span className="icon-[tabler--gavel] size-6"></span>
                      Place Bid
                    </h2>

                    <div className="bg-base-200 rounded-lg p-4 my-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-base-content/60">
                          Current Bid
                        </span>
                        {!isEnded && (
                          <span className="text-xs text-base-content/40">
                            <span className="icon-[tabler--refresh] size-3 inline mr-1 animate-spin"></span>
                            Live
                          </span>
                        )}
                      </div>
                      <div className="text-3xl font-bold text-primary">
                        {item.currency.symbol}
                        {(item.currentBid || item.startingBid).toFixed(2)}
                      </div>
                      {item.currentBid && (
                        <div className="text-sm text-base-content/60 mt-1">
                          Starting: {item.currency.symbol}
                          {item.startingBid.toFixed(2)}
                        </div>
                      )}
                    </div>

                    {isHighestBidder && (
                      <div className="alert alert-success mb-4">
                        <span className="icon-[tabler--trophy] size-5"></span>
                        <span>You&apos;re the highest bidder!</span>
                      </div>
                    )}

                    {item.endDate && (
                      <div className="text-sm text-base-content/60 mb-4">
                        <span className="icon-[tabler--clock] size-4 inline mr-1"></span>
                        {isEnded ? "Ended" : "Ends"}: {formatDate(item.endDate)}
                      </div>
                    )}

                    {error && (
                      <div className="alert alert-error mb-4">
                        <span className="icon-[tabler--alert-circle] size-5"></span>
                        <span>{error}</span>
                      </div>
                    )}

                    {canBid && !isEnded ? (
                      <form onSubmit={handleBid} className="space-y-4">
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">Your Bid</span>
                            <span className="label-text-alt">
                              Min: {item.currency.symbol}
                              {minBid.toFixed(2)}
                            </span>
                          </label>
                          <div className="input">
                            <input
                              type="number"
                              value={bidAmount}
                              onChange={(e) => setBidAmount(e.target.value)}
                              placeholder={minBid.toFixed(2)}
                              min={minBid}
                              step="0.01"
                              required
                            />
                            <span className="label">
                              {item.currency.symbol}
                            </span>
                          </div>
                        </div>

                        {auction.bidderVisibility === "PER_BID" && (
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={bidAsAnonymous}
                              onChange={(e) =>
                                setBidAsAnonymous(e.target.checked)
                              }
                              className="checkbox checkbox-sm"
                            />
                            <div className="flex items-center gap-1">
                              <span className="text-sm">Bid as anonymous</span>
                              <div
                                className="tooltip tooltip-left"
                                data-tip="Your name will be hidden from other bidders. The item owner will still see your details."
                              >
                                <span className="icon-[tabler--info-circle] size-4 text-base-content/50"></span>
                              </div>
                            </div>
                          </label>
                        )}

                        <Button
                          type="submit"
                          variant="primary"
                          modifier="block"
                          isLoading={isLoading}
                          loadingText="Placing Bid..."
                          icon={
                            <span className="icon-[tabler--gavel] size-5"></span>
                          }
                        >
                          Place Bid
                        </Button>
                      </form>
                    ) : isEnded ? (
                      <div className="space-y-3">
                        <div className="text-center py-2 text-base-content/60">
                          This item&apos;s bidding has ended.
                        </div>
                        {winnerEmail && (
                          <div className="alert alert-info">
                            <span className="icon-[tabler--trophy] size-5"></span>
                            <div>
                              <div className="font-medium">Winner Contact</div>
                              <div className="text-sm">{winnerEmail}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : isItemOwner ? (
                      <div className="alert alert-info">
                        <span className="icon-[tabler--info-circle] size-5"></span>
                        <span>You cannot bid on your own item.</span>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-base-content/60">
                        You cannot bid on this item.
                      </div>
                    )}

                    <div className="divider"></div>

                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-base-content/60">Currency</span>
                        <span>{item.currency.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-base-content/60">
                          Min Increment
                        </span>
                        <span>
                          {item.currency.symbol}
                          {item.minBidIncrement.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-base-content/60">Total Bids</span>
                        <span>{bids.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
  const itemId = context.params?.itemId as string;

  // Check membership
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
          bidderVisibility: true,
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

  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    include: {
      currency: true,
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!item || item.auctionId !== auctionId) {
    return {
      redirect: {
        destination: `/auctions/${auctionId}`,
        permanent: false,
      },
    };
  }

  // Get bids with user info - we'll filter based on visibility settings (no email)
  const bidsRaw = await prisma.bid.findMany({
    where: { auctionItemId: itemId },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
    orderBy: { amount: "desc" },
  });

  // Check if item has ended and determine winner
  const isItemEnded = item.endDate && new Date(item.endDate) < new Date();
  const isItemOwner = item.creatorId === session.user.id;
  const highestBid = bidsRaw[0] || null;

  // Get winner email only if item ended and viewer is item owner
  let winnerEmail: string | null = null;
  if (isItemEnded && isItemOwner && highestBid) {
    const winner = await prisma.user.findUnique({
      where: { id: highestBid.userId },
      select: { email: true },
    });
    winnerEmail = winner?.email || null;
  }

  // Filter user info based on visibility settings (never include email)
  const bids = bidsRaw.map((bid) => {
    // Item owner always sees bidder names
    if (isItemOwner) {
      return { ...bid, isAnonymous: bid.isAnonymous };
    }

    // Always visible - show all bidders
    if (membership.auction.bidderVisibility === "VISIBLE") {
      return { ...bid, isAnonymous: false };
    }

    // Always anonymous - hide all bidders
    if (membership.auction.bidderVisibility === "ANONYMOUS") {
      return { ...bid, user: null, isAnonymous: true };
    }

    // PER_BID - respect each bid's isAnonymous setting
    if (bid.isAnonymous) {
      return { ...bid, user: null };
    }
    return bid;
  });

  const isHighestBidder = item.highestBidderId === session.user.id;

  // Check if user can edit this item
  const isCreator = item.creatorId === session.user.id;
  const isAdmin = ["OWNER", "ADMIN"].includes(membership.role);
  const canEdit = isCreator || isAdmin;

  // Get item images
  const images = await prisma.auctionItemImage.findMany({
    where: { auctionItemId: itemId },
    orderBy: { order: "asc" },
  });

  // Get all items in this auction for sidebar
  const auctionItems = await prisma.auctionItem.findMany({
    where: { auctionId },
    select: {
      id: true,
      name: true,
      currentBid: true,
      startingBid: true,
      endDate: true,
      createdAt: true,
      currency: {
        select: { symbol: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Get user settings
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });

  // Generate public URLs for images
  const { getPublicUrl } = await import("@/lib/storage");

  // Get thumbnails for auction items
  const itemThumbnails = await prisma.auctionItem.findMany({
    where: { auctionId },
    select: {
      id: true,
      images: {
        select: { url: true },
        orderBy: { order: "asc" },
        take: 1,
      },
    },
  });

  const thumbnailMap = new Map(
    itemThumbnails.map((i) => [
      i.id,
      i.images[0]?.url ? getPublicUrl(i.images[0].url) : null,
    ])
  );

  return {
    props: {
      user: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || "",
      },
      auction: membership.auction,
      auctionItems: auctionItems.map((ai) => ({
        ...ai,
        endDate: ai.endDate?.toISOString() || null,
        createdAt: ai.createdAt.toISOString(),
        thumbnailUrl: thumbnailMap.get(ai.id) || null,
      })),
      itemSidebarCollapsed: userSettings?.itemSidebarCollapsed ?? false,
      item: {
        ...item,
        endDate: item.endDate?.toISOString() || null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      },
      bids: bids.map((b) => ({
        id: b.id,
        amount: b.amount,
        createdAt: b.createdAt.toISOString(),
        isAnonymous: b.isAnonymous,
        user: b.user,
      })),
      isHighestBidder,
      canBid: !isCreator, // Item creators cannot bid on their own items
      canEdit,
      isItemOwner: isCreator,
      winnerEmail,
      images: images.map((img) => ({
        id: img.id,
        url: img.url,
        publicUrl: getPublicUrl(img.url),
        order: img.order,
      })),
    },
  };
};
