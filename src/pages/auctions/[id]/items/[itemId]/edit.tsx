import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageLayout, BackLink, AlertMessage, ConfirmDialog } from "@/components/common";
import { ImageUpload } from "@/components/upload/image-upload";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/hooks/ui";

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface ItemImage {
  id: string;
  url: string;
  publicUrl: string;
  order: number;
}

interface EditItemProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  auction: {
    id: string;
    name: string;
    bidderVisibility: string;
    itemEndMode: string;
    endDate: string | null;
  };
  item: {
    id: string;
    name: string;
    description: string | null;
    currencyCode: string;
    startingBid: number;
    minBidIncrement: number;
    bidderAnonymous: boolean;
    endDate: string | null;
    currentBid: number | null;
  };
  currencies: Currency[];
  hasBids: boolean;
  images: ItemImage[];
}

export default function EditItemPage({
  user,
  auction,
  item,
  currencies,
  hasBids,
  images: initialImages,
}: EditItemProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [images, setImages] = useState<ItemImage[]>(initialImages);
  const [isEnding, setIsEnding] = useState(false);
  const deleteDialog = useConfirmDialog();
  const endDialog = useConfirmDialog();
  const [itemEndDate, setItemEndDate] = useState(
    item.endDate ? item.endDate.slice(0, 16) : "",
  );

  const isItemEnded = !!(item.endDate && new Date(item.endDate) < new Date());
  const auctionHasEndDate = !!auction.endDate;
  const canSetCustomEndDate = auction.itemEndMode === "CUSTOM";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      currencyCode: formData.get("currencyCode") as string,
      startingBid: parseFloat(formData.get("startingBid") as string) || 0,
      minBidIncrement:
        parseFloat(formData.get("minBidIncrement") as string) || 1,
      bidderAnonymous: formData.get("bidderAnonymous") === "on",
      endDate: (formData.get("endDate") as string) || null,
    };

    try {
      const res = await fetch(`/api/auctions/${auction.id}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.errors) {
          setFieldErrors(result.errors);
        } else {
          setError(result.message || "Failed to update item");
        }
      } else {
        router.push(`/auctions/${auction.id}/items/${item.id}`);
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/auctions/${auction.id}/items/${item.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const result = await res.json();
        setError(result.message || "Failed to delete item");
        setIsDeleting(false);
      } else {
        router.push(`/auctions/${auction.id}`);
      }
    } catch {
      setError("An error occurred. Please try again.");
      setIsDeleting(false);
    }
  };

  const handleEndNow = async () => {
    setIsEnding(true);
    setError(null);

    try {
      const res = await fetch(`/api/auctions/${auction.id}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endDate: new Date().toISOString() }),
      });

      if (!res.ok) {
        const result = await res.json();
        setError(result.message || "Failed to end item");
        setIsEnding(false);
        endDialog.close();
      } else {
        router.push(`/auctions/${auction.id}/items/${item.id}`);
      }
    } catch {
      setError("An error occurred. Please try again.");
      setIsEnding(false);
      endDialog.close();
    }
  };

  return (
    <PageLayout user={user} maxWidth="2xl">
      <div className="mb-6">
        <BackLink href={`/auctions/${auction.id}/items/${item.id}`} label="Back to Item" />
      </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="card-title text-2xl mb-6">Edit Item</h1>

            {hasBids && (
              <div className="alert alert-warning mb-4">
                <span className="icon-[tabler--alert-triangle] size-5"></span>
                <span>This item has bids. Some fields cannot be changed.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <AlertMessage type="error">{error}</AlertMessage>
              )}

              {/* Basic Info */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="icon-[tabler--package] size-5 text-primary"></span>
                  Item Details
                </h2>

                <div className="form-control">
                  <label className="label" htmlFor="name">
                    <span className="label-text">Item Name *</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    defaultValue={item.name}
                    placeholder="e.g., Vintage Watch"
                    className={`input input-bordered w-full ${fieldErrors.name ? "input-error" : ""}`}
                    required
                  />
                  {fieldErrors.name && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {fieldErrors.name}
                      </span>
                    </label>
                  )}
                </div>

                <div className="form-control">
                  <label className="label" htmlFor="description">
                    <span className="label-text">Description</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    defaultValue={item.description || ""}
                    placeholder="Describe the item in detail..."
                    className="textarea textarea-bordered w-full h-32"
                  />
                </div>
              </div>

              {/* Images */}
              <div className="divider"></div>
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="icon-[tabler--photo] size-5 text-primary"></span>
                  Images
                </h2>
                <ImageUpload
                  auctionId={auction.id}
                  itemId={item.id}
                  images={images}
                  onImagesChange={setImages}
                />
              </div>

              {/* Pricing */}
              <div className="divider"></div>
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="icon-[tabler--currency-dollar] size-5 text-primary"></span>
                  Pricing
                </h2>

                <div className="form-control">
                  <label className="label" htmlFor="currencyCode">
                    <span className="label-text">Currency *</span>
                  </label>
                  <select
                    id="currencyCode"
                    name="currencyCode"
                    className="select select-bordered w-full"
                    defaultValue={item.currencyCode}
                    disabled={hasBids}
                    required
                  >
                    {currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name} ({currency.symbol})
                      </option>
                    ))}
                  </select>
                  {hasBids && (
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        Cannot change currency after bids are placed
                      </span>
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label" htmlFor="startingBid">
                      <span className="label-text">Starting Bid</span>
                    </label>
                    <input
                      id="startingBid"
                      name="startingBid"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={item.startingBid}
                      disabled={hasBids}
                      className={`input input-bordered w-full ${fieldErrors.startingBid ? "input-error" : ""}`}
                    />
                    {fieldErrors.startingBid && (
                      <label className="label">
                        <span className="label-text-alt text-error">
                          {fieldErrors.startingBid}
                        </span>
                      </label>
                    )}
                    {hasBids && (
                      <label className="label">
                        <span className="label-text-alt text-base-content/60">
                          Cannot change after bids
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="form-control">
                    <label className="label" htmlFor="minBidIncrement">
                      <span className="label-text">Min Bid Increment</span>
                    </label>
                    <input
                      id="minBidIncrement"
                      name="minBidIncrement"
                      type="number"
                      min="0.01"
                      step="0.01"
                      defaultValue={item.minBidIncrement}
                      className="input input-bordered w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Visibility - deprecated, kept for backwards compatibility */}
              {false && auction.bidderVisibility === "ITEM_CHOICE" && (
                <>
                  <div className="divider"></div>
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <span className="icon-[tabler--eye] size-5 text-primary"></span>
                      Visibility
                    </h2>

                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-3">
                        <input
                          type="checkbox"
                          name="bidderAnonymous"
                          defaultChecked={item.bidderAnonymous}
                          className="checkbox checkbox-primary"
                        />
                        <div>
                          <span className="label-text">Anonymous Bidding</span>
                          <p className="text-xs text-base-content/60">
                            Hide bidder names for this item
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Timing */}
              <div className="divider"></div>
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="icon-[tabler--clock] size-5 text-primary"></span>
                  Timing
                </h2>

                {/* Item End Mode Info */}
                <div className="bg-base-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="icon-[tabler--info-circle] size-4 text-info"></span>
                    <span className="font-medium">Item End Mode:</span>
                    <span className="text-base-content/70">
                      {auction.itemEndMode === "CUSTOM"
                        ? "Custom per item"
                        : auction.itemEndMode === "WITH_AUCTION"
                          ? "Ends with auction"
                          : "No end date"}
                    </span>
                  </div>
                  {auctionHasEndDate && (
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <span className="icon-[tabler--calendar] size-4 text-info"></span>
                      <span className="font-medium">Auction ends:</span>
                      <span className="text-base-content/70">
                        {new Date(auction.endDate!).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {canSetCustomEndDate && (
                  <div className="form-control">
                    <label className="label" htmlFor="endDate">
                      <span className="label-text">
                        Item End Date (optional)
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="endDate"
                        name="endDate"
                        type="datetime-local"
                        value={itemEndDate}
                        onChange={(e) => setItemEndDate(e.target.value)}
                        className="input input-bordered flex-1"
                        disabled={isItemEnded}
                        max={
                          auctionHasEndDate
                            ? auction.endDate!.slice(0, 16)
                            : undefined
                        }
                      />
                      {itemEndDate && !isItemEnded && (
                        <button
                          type="button"
                          onClick={() => setItemEndDate("")}
                          className="btn btn-ghost btn-square"
                          title="Clear end date (defaults to auction end)"
                        >
                          <span className="icon-[tabler--x] size-5"></span>
                        </button>
                      )}
                    </div>
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        {isItemEnded
                          ? "This item has already ended and cannot be extended"
                          : auctionHasEndDate
                            ? `Leave empty to end with auction (${new Date(auction.endDate!).toLocaleString()}). Cannot be set after auction end date.`
                            : "Leave empty for no end date"}
                      </span>
                    </label>
                  </div>
                )}

                {!canSetCustomEndDate &&
                  auction.itemEndMode === "WITH_AUCTION" && (
                    <div className="alert alert-info">
                      <span className="icon-[tabler--info-circle] size-5"></span>
                      <span>
                        {auctionHasEndDate
                          ? `This item will end with the auction on ${new Date(auction.endDate!).toLocaleString()}`
                          : "This item will end when the auction ends. Set an auction end date first."}
                      </span>
                    </div>
                  )}

                {!canSetCustomEndDate && auction.itemEndMode === "NONE" && (
                  <div className="alert alert-info">
                    <span className="icon-[tabler--info-circle] size-5"></span>
                    <span>This item has no end date (auction setting).</span>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="divider"></div>
              <div className="flex gap-4">
                <Link
                  href={`/auctions/${auction.id}/items/${item.id}`}
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </Link>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  isLoading={isLoading}
                  loadingText="Saving..."
                  icon={
                    <span className="icon-[tabler--device-floppy] size-5"></span>
                  }
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* End Item Section - Only show if custom end dates are allowed */}
        {!isItemEnded && canSetCustomEndDate && (
          <div className="card bg-base-100 shadow-xl mt-6 border-2 border-warning/20">
            <div className="card-body">
              <h2 className="card-title text-warning">
                <span className="icon-[tabler--clock-stop] size-6"></span>
                End Bidding
              </h2>

              <p className="text-base-content/60 text-sm">
                End bidding on this item immediately. No more bids will be
                accepted after this.
              </p>

              {!endDialog.isOpen ? (
                <button
                  onClick={endDialog.open}
                  className="btn btn-warning btn-outline mt-4"
                >
                  <span className="icon-[tabler--flag-filled] size-5"></span>
                  End Item Now
                </button>
              ) : (
                <ConfirmDialog
                  isOpen={endDialog.isOpen}
                  title={`Are you sure you want to end bidding on "${item.name}"?`}
                  message={hasBids ? "The current highest bidder will win this item." : "This item has no bids yet."}
                  confirmLabel="Yes, End Now"
                  variant="warning"
                  isLoading={isEnding}
                  onConfirm={handleEndNow}
                  onCancel={endDialog.close}
                />
              )}
            </div>
          </div>
        )}

        {/* Item Already Ended Notice */}
        {isItemEnded && (
          <div className="alert alert-info mt-6">
            <span className="icon-[tabler--flag-filled] size-5"></span>
            <span>This item has already ended. Bidding is closed.</span>
          </div>
        )}

        {/* Danger Zone */}
        {!hasBids && (
          <div className="card bg-base-100 shadow-xl mt-6 border-2 border-error/20">
            <div className="card-body">
              <h2 className="card-title text-error">
                <span className="icon-[tabler--alert-triangle] size-6"></span>
                Danger Zone
              </h2>

              <p className="text-base-content/60 text-sm">
                Delete this item permanently. This action cannot be undone.
              </p>

              {!deleteDialog.isOpen ? (
                <button
                  onClick={deleteDialog.open}
                  className="btn btn-error btn-outline mt-4"
                >
                  <span className="icon-[tabler--trash] size-5"></span>
                  Delete Item
                </button>
              ) : (
                <ConfirmDialog
                  isOpen={deleteDialog.isOpen}
                  title={`Are you sure you want to delete "${item.name}"?`}
                  confirmLabel="Yes, Delete"
                  variant="error"
                  isLoading={isDeleting}
                  onConfirm={handleDelete}
                  onCancel={deleteDialog.close}
                />
              )}
            </div>
          </div>
        )}

        {hasBids && (
          <div className="alert alert-info mt-6">
            <span className="icon-[tabler--info-circle] size-5"></span>
            <span>Items with bids cannot be deleted.</span>
          </div>
        )}
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
  const itemId = context.params?.itemId as string;

  // Get item with creator info
  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    include: {
      _count: {
        select: { bids: true },
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

  // Check if user is the creator or an admin
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

  // Only item creator, OWNER, or ADMIN can edit
  const isCreator = item.creatorId === session.user.id;
  const isAdmin = ["OWNER", "ADMIN"].includes(membership.role);

  if (!isCreator && !isAdmin) {
    return {
      redirect: {
        destination: `/auctions/${auctionId}/items/${itemId}`,
        permanent: false,
      },
    };
  }

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: {
      id: true,
      name: true,
      bidderVisibility: true,
      itemEndMode: true,
      endDate: true,
    },
  });

  if (!auction) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  const currencies = await prisma.currency.findMany({
    orderBy: { code: "asc" },
  });

  // Get item images
  const images = await prisma.auctionItemImage.findMany({
    where: { auctionItemId: itemId },
    orderBy: { order: "asc" },
  });

  // Generate public URLs for images
  const { getPublicUrl } = await import("@/lib/storage");

  return {
    props: {
      user: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || "",
      },
      auction: {
        ...auction,
        endDate: auction.endDate?.toISOString() || null,
      },
      item: {
        id: item.id,
        name: item.name,
        description: item.description,
        currencyCode: item.currencyCode,
        startingBid: item.startingBid,
        minBidIncrement: item.minBidIncrement,
        bidderAnonymous: item.bidderAnonymous,
        endDate: item.endDate?.toISOString() || null,
        currentBid: item.currentBid,
      },
      currencies,
      hasBids: item._count.bids > 0,
      images: images.map((img) => ({
        id: img.id,
        url: img.url,
        publicUrl: getPublicUrl(img.url),
        order: img.order,
      })),
    },
  };
};
