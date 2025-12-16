import { useState } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  PageLayout,
  BackLink,
  AlertMessage,
  ConfirmDialog,
} from "@/components/common";
import { ThumbnailUpload } from "@/components/upload/thumbnail-upload";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/hooks/ui";

interface AuctionSettingsProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  auction: {
    id: string;
    name: string;
    description: string | null;
    joinMode: string;
    memberCanInvite: boolean;
    bidderVisibility: string;
    itemEndMode: string;
    endDate: string | null;
    isEnded: boolean;
    thumbnailUrl: string | null;
  };
  allowOpenAuctions: boolean;
}

export default function AuctionSettingsPage({
  user,
  auction,
  allowOpenAuctions,
}: AuctionSettingsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: auction.name,
    description: auction.description || "",
    joinMode: auction.joinMode,
    memberCanInvite: auction.memberCanInvite,
    bidderVisibility: auction.bidderVisibility,
    itemEndMode: auction.itemEndMode,
    endDate: auction.endDate ? auction.endDate.slice(0, 16) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const deleteDialog = useConfirmDialog();
  const endDialog = useConfirmDialog();
  const [isEnded, setIsEnded] = useState(auction.isEnded);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    auction.thumbnailUrl,
  );

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/auctions/${auction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          endDate: formData.endDate || null,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.message || "Failed to update auction");
      } else {
        showToast("Settings saved successfully", "success");
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
      const res = await fetch(`/api/auctions/${auction.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const result = await res.json();
        setError(result.message || "Failed to delete auction");
        setIsDeleting(false);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("An error occurred. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <PageLayout user={user} maxWidth="2xl">
      <div className="mb-8">
        <BackLink href={`/auctions/${auction.id}`} label="Back to Auction" />
      </div>

      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
        <div className="card-body p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="icon-[tabler--settings] size-7"></span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Auction Settings</h1>
              <p className="text-base-content/60">
                Manage your auction configuration
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && <AlertMessage type="error">{error}</AlertMessage>}

            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-primary">
                <span className="icon-[tabler--info-circle] size-5"></span>
                Basic Information
              </h2>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Auction Name</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Description</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="textarea textarea-bordered w-full h-24 bg-base-100 focus:bg-base-100 transition-colors"
                  placeholder="Optional description..."
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    Thumbnail Image
                  </span>
                </label>
                <ThumbnailUpload
                  auctionId={auction.id}
                  currentThumbnail={thumbnailUrl}
                  onThumbnailChange={setThumbnailUrl}
                />
              </div>
            </div>

            {/* Access Settings */}
            <div className="divider opacity-50"></div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-secondary">
                <span className="icon-[tabler--lock] size-5"></span>
                Access Settings
              </h2>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Join Mode</span>
                </label>
                <select
                  name="joinMode"
                  value={formData.joinMode}
                  onChange={handleChange}
                  className="select select-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                >
                  <option value="INVITE_ONLY">Invite Only</option>
                  <option value="LINK">Anyone with Link</option>
                  {allowOpenAuctions && (
                    <option value="FREE">Open to All</option>
                  )}
                </select>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3 p-0">
                  <input
                    type="checkbox"
                    name="memberCanInvite"
                    checked={formData.memberCanInvite}
                    onChange={handleChange}
                    className="checkbox checkbox-primary"
                  />
                  <div>
                    <span className="label-text font-medium">
                      Members can invite others
                    </span>
                    <p className="text-xs text-base-content/60">
                      Allow non-admin members to send invites
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Bidding Settings */}
            <div className="divider opacity-50"></div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-accent">
                <span className="icon-[tabler--gavel] size-5"></span>
                Bidding Settings
              </h2>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Bid Visibility</span>
                </label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-base-content/10 cursor-pointer hover:bg-base-100 transition-all has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-sm">
                    <input
                      type="radio"
                      name="bidderVisibility"
                      value="VISIBLE"
                      checked={formData.bidderVisibility === "VISIBLE"}
                      onChange={handleChange}
                      className="radio radio-primary mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium">Always Visible</div>
                      <div className="text-sm text-base-content/60">
                        Bidder names are always shown to all auction members
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-base-content/10 cursor-pointer hover:bg-base-100 transition-all has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-sm">
                    <input
                      type="radio"
                      name="bidderVisibility"
                      value="ANONYMOUS"
                      checked={formData.bidderVisibility === "ANONYMOUS"}
                      onChange={handleChange}
                      className="radio radio-primary mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium">Always Anonymous</div>
                      <div className="text-sm text-base-content/60">
                        Bidder names are hidden from other members. Only item
                        owners can see bidder details.
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-base-content/10 cursor-pointer hover:bg-base-100 transition-all has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-sm">
                    <input
                      type="radio"
                      name="bidderVisibility"
                      value="PER_BID"
                      checked={formData.bidderVisibility === "PER_BID"}
                      onChange={handleChange}
                      className="radio radio-primary mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium">Per Bid Choice</div>
                      <div className="text-sm text-base-content/60">
                        Each bidder can choose whether to show their name or bid
                        anonymously. Item owners always see bidder details.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Timing */}
            <div className="divider opacity-50"></div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-info">
                <span className="icon-[tabler--clock] size-5"></span>
                Timing
              </h2>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    Auction End Date (optional)
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="input input-bordered flex-1 bg-base-100 focus:bg-base-100 transition-colors"
                  />
                  {formData.endDate && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, endDate: "" }))
                      }
                      className="btn btn-ghost btn-square"
                      title="Clear end date"
                    >
                      <span className="icon-[tabler--x] size-5"></span>
                    </button>
                  )}
                </div>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Leave empty for no end date
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Item End Mode</span>
                </label>
                <select
                  name="itemEndMode"
                  value={formData.itemEndMode}
                  onChange={handleChange}
                  className="select select-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                >
                  {formData.endDate && (
                    <option value="AUCTION_END">End with Auction</option>
                  )}
                  <option value="CUSTOM">Custom per Item</option>
                  {!formData.endDate && (
                    <option value="NONE">No End Date</option>
                  )}
                </select>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    {formData.endDate
                      ? "Items can end with auction or have custom end dates"
                      : "Set an auction end date to enable 'End with Auction'"}
                  </span>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="divider opacity-50"></div>
            <Button
              type="submit"
              variant="primary"
              modifier="block"
              isLoading={isLoading}
              loadingText="Saving..."
              className="shadow-lg shadow-primary/20"
              icon={
                <span className="icon-[tabler--device-floppy] size-5"></span>
              }
            >
              Save Settings
            </Button>
          </form>
        </div>
      </div>

      {/* End Auction Now */}
      {!isEnded && (
        <div className="card bg-base-100/50 backdrop-blur-sm shadow-xl mt-8 border border-warning/30">
          <div className="card-body p-8">
            <h2 className="card-title text-warning flex items-center gap-2">
              <span className="icon-[tabler--clock-off] size-6"></span>
              End Auction Now
            </h2>

            <p className="text-base-content/60 text-sm">
              End this auction immediately. All items will be closed and winners
              will be determined. This action cannot be undone.
            </p>

            {!endDialog.isOpen ? (
              <button
                onClick={endDialog.open}
                className="btn btn-warning btn-outline mt-4 border-warning/50 hover:bg-warning hover:border-warning"
              >
                <span className="icon-[tabler--clock-off] size-5"></span>
                End Auction Now
              </button>
            ) : (
              <ConfirmDialog
                isOpen={endDialog.isOpen}
                title={`Are you sure you want to end "${auction.name}" now?`}
                message="All bidding will stop immediately and winners will be finalized."
                confirmLabel="Yes, End Now"
                variant="warning"
                isLoading={isEnding}
                onConfirm={async () => {
                  setIsEnding(true);
                  setError(null);
                  try {
                    const res = await fetch(
                      `/api/auctions/${auction.id}/close`,
                      { method: "POST" },
                    );
                    if (!res.ok) {
                      const result = await res.json();
                      setError(result.message || "Failed to end auction");
                    } else {
                      setIsEnded(true);
                      endDialog.close();
                      showToast("Auction ended successfully", "success");
                    }
                  } catch {
                    setError("An error occurred. Please try again.");
                  } finally {
                    setIsEnding(false);
                  }
                }}
                onCancel={endDialog.close}
              />
            )}
          </div>
        </div>
      )}

      {isEnded && (
        <div className="alert alert-info mt-8 shadow-sm">
          <span className="icon-[tabler--info-circle] size-5"></span>
          <span>
            This auction has ended.{" "}
            <a
              href={`/auctions/${auction.id}/results`}
              className="link font-bold"
            >
              View results
            </a>
          </span>
        </div>
      )}

      {/* Danger Zone */}
      <div className="card bg-base-100/50 backdrop-blur-sm shadow-xl mt-8 border border-error/30">
        <div className="card-body p-8">
          <h2 className="card-title text-error flex items-center gap-2">
            <span className="icon-[tabler--alert-triangle] size-6"></span>
            Danger Zone
          </h2>

          <p className="text-base-content/60 text-sm">
            Deleting this auction will permanently remove all items, bids, and
            member data. This action cannot be undone.
          </p>

          {!deleteDialog.isOpen ? (
            <button
              onClick={deleteDialog.open}
              className="btn btn-error btn-outline mt-4 border-error/50 hover:bg-error hover:border-error"
            >
              <span className="icon-[tabler--trash] size-5"></span>
              Delete Auction
            </button>
          ) : (
            <ConfirmDialog
              isOpen={deleteDialog.isOpen}
              title={`Are you sure you want to delete "${auction.name}"?`}
              confirmLabel="Yes, Delete"
              variant="error"
              isLoading={isDeleting}
              onConfirm={handleDelete}
              onCancel={deleteDialog.close}
            />
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

  // Check if user is owner
  const membership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId: session.user.id,
      },
    },
  });

  if (!membership || membership.role !== "OWNER") {
    return {
      redirect: {
        destination: `/auctions/${auctionId}`,
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

  // Generate public URL for thumbnail
  const { getPublicUrl } = await import("@/lib/storage");

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
        joinMode: auction.joinMode,
        memberCanInvite: auction.memberCanInvite,
        bidderVisibility: auction.bidderVisibility,
        itemEndMode: auction.itemEndMode,
        endDate: auction.endDate?.toISOString() || null,
        isEnded: auction.endDate
          ? new Date(auction.endDate) < new Date()
          : false,
        thumbnailUrl: auction.thumbnailUrl
          ? getPublicUrl(auction.thumbnailUrl)
          : null,
      },
      allowOpenAuctions: process.env.ALLOW_OPEN_AUCTIONS === "true",
    },
  };
};
