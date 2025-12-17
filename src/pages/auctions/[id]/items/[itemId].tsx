import { useState, useMemo } from "react";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { useRouter } from "next/router";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMessages, Locale } from "@/i18n";
import { Navbar } from "@/components/layout/navbar";
import {
  SortDropdown,
  sidebarItemSortOptions,
  sortItems,
} from "@/components/ui/sort-dropdown";
import { Button } from "@/components/ui/button";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { canUserBid } from "@/utils/auction-helpers";
import { getPublicUrl } from "@/lib/storage";
import { useTranslations } from "next-intl";

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
  highestBidderId: string | null;
  userHasBid: boolean;
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
  const t = useTranslations("item");
  const tCommon = useTranslations("common");
  const tTime = useTranslations("time");
  const tErrors = useTranslations("errors");
  const tAuction = useTranslations("auction");
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
  const bids: Bid[] = data?.bids ?? initialBids;
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
      setError(
        tErrors("validation.minBid", {
          symbol: item.currency.symbol,
          amount: minBid.toFixed(2),
        })
      );
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
        setError(result.message || tErrors("bid.placeFailed"));
      } else {
        // Revalidate SWR data
        await mutate();
        setBidAmount("");
      }
    } catch {
      setError(tErrors("generic"));
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
    <div className="min-h-screen bg-base-100 relative overflow-x-hidden selection:bg-primary/20">
      {/* Background decorations */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[128px] translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[128px] -translate-x-1/3 translate-y-1/3"></div>
      </div>

      <div className="relative z-10">
        <Navbar user={user} />

        <div className="flex h-[calc(100vh-64px)]">
          {/* Items Sidebar */}
          <aside
            className={`hidden lg:flex flex-col bg-base-100/80 backdrop-blur-xl border-r border-base-content/10 transition-all duration-300 ${
              sidebarCollapsed ? "w-0 overflow-hidden" : "w-80"
            }`}
          >
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-sm uppercase tracking-wider text-base-content/60 flex items-center gap-2">
                    <span className="icon-[tabler--list] size-4"></span>
                    {t("sidebar.title")}
                  </h2>
                  <span className="badge badge-sm badge-ghost">
                    {auctionItems.length}
                  </span>
                </div>
                <div className="sticky top-0 bg-base-100/95 backdrop-blur z-10 pb-4">
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
                    const isActive = auctionItem.id === initialItem.id;
                    const isWinning = auctionItem.highestBidderId === user.id;
                    const isOutbid = auctionItem.userHasBid && !isWinning;

                    return (
                      <Link
                        key={auctionItem.id}
                        href={`/auctions/${auction.id}/items/${auctionItem.id}`}
                        className={`block p-3 rounded-xl transition-all border ${
                          isActive
                            ? "bg-primary/5 border-primary/20 shadow-sm"
                            : "bg-base-100/50 border-transparent hover:bg-base-100 hover:border-base-content/10"
                        } ${isEnded ? "opacity-60" : ""}`}
                      >
                        <div className="flex gap-3">
                          <div className="relative shrink-0">
                            {auctionItem.thumbnailUrl ? (
                              <img
                                src={auctionItem.thumbnailUrl}
                                alt={auctionItem.name}
                                className={`w-12 h-12 object-cover rounded-lg ${
                                  isEnded ? "grayscale" : ""
                                }`}
                              />
                            ) : (
                              <div
                                className={`w-12 h-12 bg-base-200 rounded-lg flex items-center justify-center ${
                                  isEnded ? "grayscale" : ""
                                }`}
                              >
                                <span className="icon-[tabler--photo] size-5 text-base-content/30"></span>
                              </div>
                            )}
                            {isEnded && isWinning ? (
                              <div className="absolute -top-1 -left-1">
                                <div className="badge badge-success badge-xs gap-0.5 shadow-sm">
                                  <span className="icon-[tabler--crown] size-2"></span>
                                </div>
                              </div>
                            ) : isEnded ? (
                              <div className="absolute -top-1 -left-1">
                                <div className="badge badge-error badge-xs gap-0.5 shadow-sm">
                                  <span className="icon-[tabler--flag-filled] size-2"></span>
                                </div>
                              </div>
                            ) : isWinning ? (
                              <div className="absolute -top-1 -left-1">
                                <div className="badge badge-success badge-xs gap-0.5 shadow-sm">
                                  <span className="icon-[tabler--trophy] size-2"></span>
                                </div>
                              </div>
                            ) : isOutbid ? (
                              <div className="absolute -top-1 -left-1">
                                <div className="badge badge-warning badge-xs gap-0.5 shadow-sm">
                                  <span className="icon-[tabler--alert-triangle] size-2"></span>
                                </div>
                              </div>
                            ) : null}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className={`font-medium truncate text-sm ${
                                isActive ? "text-primary" : ""
                              }`}
                            >
                              {auctionItem.name}
                            </div>
                            <div
                              className={`text-xs font-semibold mt-0.5 ${
                                isEnded
                                  ? "text-base-content/50"
                                  : isActive
                                  ? "text-primary"
                                  : "text-base-content/70"
                              }`}
                            >
                              {auctionItem.currency.symbol}
                              {(
                                auctionItem.currentBid ||
                                auctionItem.startingBid
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
            className="hidden lg:flex fixed z-20 bg-base-100 border border-base-content/10 rounded-r-lg p-1.5 shadow-md hover:bg-base-200 transition-all items-center justify-center top-24"
            style={{ left: sidebarCollapsed ? 0 : "20rem" }}
            aria-label={
              sidebarCollapsed ? t("sidebar.show") : t("sidebar.hide")
            }
          >
            <span
              className={`icon-[tabler--chevron-${
                sidebarCollapsed ? "right" : "left"
              }] size-4 text-base-content/60`}
            ></span>
          </button>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto bg-base-200/30">
            <div className="container mx-auto px-4 py-8 pb-20 max-w-6xl">
              <div className="mb-6 flex items-center justify-between">
                <Link
                  href={`/auctions/${auction.id}`}
                  className="btn btn-ghost btn-sm gap-2 hover:bg-base-content/5"
                >
                  <span className="icon-[tabler--arrow-left] size-4"></span>
                  {tAuction("invite.backTo", { name: tCommon("back") })}
                </Link>

                {/* Mobile: Show items count */}
                <div className="lg:hidden">
                  <Link
                    href={`/auctions/${auction.id}`}
                    className="btn btn-ghost btn-sm gap-2"
                  >
                    <span className="icon-[tabler--list] size-4"></span>
                    {auctionItems.length} {tAuction("card.items")}
                  </Link>
                </div>
              </div>

              <div className="flex flex-col xl:flex-row gap-8 items-start">
                {/* Main Content */}
                <div className="flex-1 w-full min-w-0">
                  <div className="card bg-base-100/80 backdrop-blur-sm border border-base-content/5 shadow-xl">
                    <div className="card-body p-6 sm:p-8">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                        <div>
                          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                            {item.name}
                          </h1>
                          <div className="flex items-center gap-2 text-sm text-base-content/60">
                            <span className="icon-[tabler--user] size-4"></span>
                            <span>Listed by</span>
                            <span className="font-medium text-base-content/80">
                              {item.creator.name || item.creator.email}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start">
                          {isEnded && (
                            <div className="badge badge-error gap-1 font-bold">
                              <span className="icon-[tabler--flag-filled] size-3"></span>
                              {tCommon("status.ended")}
                            </div>
                          )}
                          {canEdit && (
                            <Link
                              href={`/auctions/${auction.id}/items/${item.id}/edit`}
                              className="btn btn-outline btn-sm gap-2"
                            >
                              <span className="icon-[tabler--edit] size-4"></span>
                              {tCommon("edit")}
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Image Gallery */}
                      {images.length > 0 ? (
                        <div className="mb-8">
                          {/* Main Image with Navigation */}
                          <div className="relative aspect-video bg-base-200/50 rounded-2xl overflow-hidden mb-4 border border-base-content/5 shadow-inner group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={images[selectedImageIndex]?.publicUrl}
                              alt={`${item.name} - ${t("gallery.imageOf", {
                                current: selectedImageIndex + 1,
                                total: images.length,
                              })}`}
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
                                  className="absolute left-4 top-1/2 -translate-y-1/2 btn btn-circle btn-sm bg-base-100/80 backdrop-blur border-none hover:bg-base-100 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                  aria-label={t("gallery.previousImage")}
                                >
                                  <span className="icon-[tabler--chevron-left] size-5"></span>
                                </button>
                                <button
                                  onClick={() =>
                                    setSelectedImageIndex((prev) =>
                                      prev === images.length - 1 ? 0 : prev + 1
                                    )
                                  }
                                  className="absolute right-4 top-1/2 -translate-y-1/2 btn btn-circle btn-sm bg-base-100/80 backdrop-blur border-none hover:bg-base-100 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                  aria-label={t("gallery.nextImage")}
                                >
                                  <span className="icon-[tabler--chevron-right] size-5"></span>
                                </button>
                                {/* Image Counter */}
                                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-medium">
                                  {selectedImageIndex + 1} / {images.length}
                                </div>
                              </>
                            )}
                          </div>
                          {/* Thumbnails */}
                          {images.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                              {images.map((img, index) => (
                                <button
                                  key={img.id}
                                  onClick={() => setSelectedImageIndex(index)}
                                  className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                                    index === selectedImageIndex
                                      ? "border-primary ring-2 ring-primary/20"
                                      : "border-transparent opacity-70 hover:opacity-100 hover:border-base-300"
                                  }`}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={img.publicUrl}
                                    alt={t("gallery.thumbnail", {
                                      index: index + 1,
                                    })}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mb-8 aspect-video bg-base-200/50 rounded-2xl flex items-center justify-center border border-base-content/5">
                          <div className="text-center text-base-content/30">
                            <span className="icon-[tabler--photo-off] size-16 mb-2"></span>
                            <p>{t("gallery.noImages")}</p>
                          </div>
                        </div>
                      )}

                      {item.description && (
                        <div className="mb-8">
                          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
                            <span className="icon-[tabler--file-description] size-5 text-primary"></span>
                            {t("create.description")}
                          </h2>
                          <div className="prose prose-sm max-w-none text-base-content/80 bg-base-200/30 p-4 rounded-xl border border-base-content/5">
                            <p className="whitespace-pre-wrap">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="divider opacity-50"></div>

                      {/* Bid History */}
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="font-bold text-lg flex items-center gap-2">
                            <span className="icon-[tabler--history] size-5 text-secondary"></span>
                            {t("history.title")}
                            <span className="badge badge-sm badge-ghost">
                              {bids.length}
                            </span>
                          </h2>
                        </div>

                        {bids.length === 0 ? (
                          <div className="text-center py-12 bg-base-200/30 rounded-xl border border-base-content/5 border-dashed">
                            <div className="bg-base-200 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                              <span className="icon-[tabler--gavel] size-6 text-base-content/30"></span>
                            </div>
                            <p className="text-base-content/60 font-medium">
                              {t("history.noBids")}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {bids.map((bid, index) => (
                              <div
                                key={bid.id}
                                className={`flex justify-between items-center p-4 rounded-xl border transition-all ${
                                  index === 0
                                    ? "bg-primary/5 border-primary/20 shadow-sm"
                                    : "bg-base-100 border-base-content/5 hover:bg-base-200/50"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      index === 0
                                        ? "bg-primary text-primary-content"
                                        : "bg-base-300 text-base-content/60"
                                    }`}
                                  >
                                    {index === 0 ? (
                                      <span className="icon-[tabler--trophy] size-4"></span>
                                    ) : (
                                      <span className="icon-[tabler--user] size-4"></span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`font-semibold ${
                                          index === 0 ? "text-primary" : ""
                                        }`}
                                      >
                                        {bid.user
                                          ? bid.user.name ||
                                            t("history.anonymous")
                                          : t("history.anonymous")}
                                      </span>
                                      {index === 0 && (
                                        <span className="badge badge-primary badge-xs">
                                          {t("history.highest")}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-base-content/50">
                                      {new Date(bid.createdAt).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold font-mono text-lg">
                                    {item.currency.symbol}
                                    {bid.amount.toFixed(2)}
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
                <div className="w-full xl:w-96 shrink-0">
                  <div className="card bg-base-100/80 backdrop-blur-sm border border-base-content/5 shadow-xl sticky top-4">
                    <div className="card-body p-6">
                      <h2 className="card-title flex items-center gap-2 mb-2">
                        <span className="icon-[tabler--gavel] size-6 text-primary"></span>
                        {t("bid.title")}
                      </h2>

                      <div className="bg-base-200/50 border border-base-content/5 rounded-xl p-5 my-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-base-content/60 uppercase tracking-wide">
                            {t("bid.currentBid")}
                          </span>
                          {!isEnded && (
                            <span className="badge badge-sm badge-success gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                              {tCommon("status.live")}
                            </span>
                          )}
                        </div>
                        <div className="text-4xl font-extrabold text-primary tracking-tight mb-2">
                          {item.currency.symbol}
                          {(item.currentBid || item.startingBid).toFixed(2)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-base-content/50">
                          <span className="icon-[tabler--arrow-up] size-3"></span>
                          {t("bid.startingBid")}: {item.currency.symbol}
                          {item.startingBid.toFixed(2)}
                        </div>
                      </div>

                      {isHighestBidder && (
                        <div className="alert alert-success shadow-sm mb-4 border-none bg-success/10 text-success-content">
                          <span className="icon-[tabler--trophy] size-5 text-success"></span>
                          <span className="font-semibold text-success">
                            {t("bid.highestBidder")}
                          </span>
                        </div>
                      )}

                      {item.endDate && (
                        <div
                          className={`flex items-center gap-2 text-sm mb-6 p-3 rounded-lg ${
                            isEnded
                              ? "bg-error/10 text-error"
                              : "bg-base-200/50 text-base-content/70"
                          }`}
                        >
                          <span
                            className={`icon-[tabler--${
                              isEnded ? "flag-filled" : "clock"
                            }] size-5`}
                          ></span>
                          <span className="font-medium">
                            {isEnded
                              ? t("bid.biddingEnded")
                              : tTime("endsAt")}
                            :
                          </span>
                          <span className="font-mono">
                            {formatDate(item.endDate)}
                          </span>
                        </div>
                      )}

                      {error && (
                        <div className="alert alert-error mb-4 shadow-sm text-sm">
                          <span className="icon-[tabler--alert-circle] size-5"></span>
                          <span>{error}</span>
                        </div>
                      )}

                      {canBid && !isEnded ? (
                        <form onSubmit={handleBid} className="space-y-4">
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text font-medium">
                                {t("bid.yourBid")}
                              </span>
                              <span className="label-text-alt text-base-content/60">
                                {t("bid.minBid")}: {item.currency.symbol}
                                {minBid.toFixed(2)}
                              </span>
                            </label>
                            <div className="join w-full shadow-sm">
                              <span className="join-item btn btn-active cursor-default bg-base-200 border-base-300">
                                {item.currency.symbol}
                              </span>
                              <input
                                type="number"
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                placeholder={minBid.toFixed(2)}
                                min={minBid}
                                step="0.01"
                                required
                                className="join-item input input-bordered w-full focus:outline-none"
                              />
                            </div>
                          </div>

                          {auction.bidderVisibility === "PER_BID" && (
                            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-base-200/50 transition-colors">
                              <input
                                type="checkbox"
                                checked={bidAsAnonymous}
                                onChange={(e) =>
                                  setBidAsAnonymous(e.target.checked)
                                }
                                className="checkbox checkbox-sm checkbox-primary"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium">
                                    {t("bid.bidAsAnonymous")}
                                  </span>
                                  <div
                                    className="tooltip tooltip-top"
                                    data-tip={t("bid.anonymousTooltip")}
                                  >
                                    <span className="icon-[tabler--info-circle] size-3.5 text-base-content/40 cursor-help"></span>
                                  </div>
                                </div>
                              </div>
                            </label>
                          )}

                          <Button
                            type="submit"
                            variant="primary"
                            modifier="block"
                            isLoading={isLoading}
                            loadingText={t("bid.placingBid")}
                            className="btn-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
                            icon={
                              <span className="icon-[tabler--gavel] size-5"></span>
                            }
                          >
                            {t("bid.placeBid")}
                          </Button>
                        </form>
                      ) : isEnded ? (
                        <div className="space-y-4">
                          <div className="text-center py-6 bg-base-200/30 rounded-xl border border-base-content/5">
                            <span className="icon-[tabler--gavel-off] size-8 text-base-content/20 mb-2"></span>
                            <div className="text-base-content/60 font-medium">
                              {t("bid.biddingEnded")}
                            </div>
                          </div>
                          {winnerEmail && (
                            <div className="alert alert-info shadow-sm">
                              <span className="icon-[tabler--trophy] size-5"></span>
                              <div>
                                <div className="font-bold">Winner Contact</div>
                                <div className="text-sm opacity-90">
                                  {winnerEmail}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : isItemOwner ? (
                        <div className="alert alert-info shadow-sm">
                          <span className="icon-[tabler--info-circle] size-5"></span>
                          <span>You cannot bid on your own item.</span>
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-base-200/30 rounded-xl border border-base-content/5 text-base-content/60">
                          You cannot bid on this item.
                        </div>
                      )}

                      <div className="divider opacity-50 my-6"></div>

                      <div className="text-sm space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-base-content/60 flex items-center gap-2">
                            <span className="icon-[tabler--currency-dollar] size-4"></span>
                            Currency
                          </span>
                          <span className="font-medium">
                            {item.currency.name}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-base-content/60 flex items-center gap-2">
                            <span className="icon-[tabler--chart-bar] size-4"></span>
                            Min Increment
                          </span>
                          <span className="font-medium">
                            {item.currency.symbol}
                            {item.minBidIncrement.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-base-content/60 flex items-center gap-2">
                            <span className="icon-[tabler--users] size-4"></span>
                            Total Bids
                          </span>
                          <span className="badge badge-ghost font-medium">
                            {bids.length}
                          </span>
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
      highestBidderId: true, // Need this for sidebar status
      currency: {
        select: { symbol: true },
      },
      images: {
        select: { url: true },
        orderBy: { order: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Get user settings
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });

  // Get user's bids to show which items they've bid on in sidebar
  const userBids = await prisma.bid.findMany({
    where: {
      userId: session.user.id,
      auctionItem: { auctionId },
    },
    select: { auctionItemId: true },
    distinct: ["auctionItemId"],
  });

  const userBidItemIds = new Set(userBids.map((b) => b.auctionItemId));

  // ...

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
        thumbnailUrl: ai.images[0]?.url ? getPublicUrl(ai.images[0].url) : null,
        userHasBid: userBidItemIds.has(ai.id), // Pass bid status
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
      canBid: canUserBid(session.user.id, item.creatorId, !!isItemEnded),
      canEdit,
      isItemOwner: isCreator,
      winnerEmail,
      images: images.map((img) => ({
        id: img.id,
        url: img.url,
        publicUrl: getPublicUrl(img.url),
        order: img.order,
      })),
      messages: await getMessages(context.locale as Locale),
    },
  };
};
