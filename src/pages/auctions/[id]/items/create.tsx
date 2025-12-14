import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageLayout, BackLink, AlertMessage } from "@/components/common";
import { Button } from "@/components/ui/button";

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface CreateItemProps {
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
  currencies: Currency[];
}

export default function CreateItemPage({
  user,
  auction,
  currencies,
}: CreateItemProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showEndDate, setShowEndDate] = useState(
    auction.itemEndMode === "CUSTOM",
  );

  useEffect(() => {
    setShowEndDate(auction.itemEndMode === "CUSTOM");
  }, [auction.itemEndMode]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      currencyCode: formData.get("currencyCode") as string,
      startingBid: parseFloat(formData.get("startingBid") as string) || 0,
      minBidIncrement:
        parseFloat(formData.get("minBidIncrement") as string) || 1,
      bidderAnonymous: formData.get("bidderAnonymous") === "on",
      endDate: (formData.get("endDate") as string) || undefined,
    };

    try {
      const res = await fetch(`/api/auctions/${auction.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.errors) {
          setFieldErrors(result.errors);
        } else {
          setError(result.message || "Failed to create item");
        }
      } else {
        router.push(`/auctions/${auction.id}/items/${result.id}`);
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout user={user} maxWidth="2xl">
      <div className="mb-6">
        <BackLink href={`/auctions/${auction.id}`} label={`Back to ${auction.name}`} />
      </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="card-title text-2xl mb-6">Add New Item</h1>

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
                    placeholder="Describe the item in detail..."
                    className="textarea textarea-bordered w-full h-32"
                  />
                </div>
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
                    defaultValue="USD"
                    required
                  >
                    {currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name} ({currency.symbol})
                      </option>
                    ))}
                  </select>
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
                      defaultValue="0"
                      className={`input input-bordered w-full ${fieldErrors.startingBid ? "input-error" : ""}`}
                    />
                    {fieldErrors.startingBid && (
                      <label className="label">
                        <span className="label-text-alt text-error">
                          {fieldErrors.startingBid}
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
                      defaultValue="1"
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
              {showEndDate && (
                <>
                  <div className="divider"></div>
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <span className="icon-[tabler--clock] size-5 text-primary"></span>
                      Timing
                    </h2>

                    <div className="form-control">
                      <label className="label" htmlFor="endDate">
                        <span className="label-text">End Date (optional)</span>
                      </label>
                      <input
                        id="endDate"
                        name="endDate"
                        type="datetime-local"
                        className="input input-bordered w-full"
                      />
                      <label className="label">
                        <span className="label-text-alt text-base-content/60">
                          Leave empty for no end date
                        </span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Submit */}
              <div className="divider"></div>
              <div className="flex gap-4">
                <Link
                  href={`/auctions/${auction.id}`}
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </Link>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  isLoading={isLoading}
                  loadingText="Creating..."
                  icon={<span className="icon-[tabler--plus] size-5"></span>}
                >
                  Add Item
                </Button>
              </div>
            </form>
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

  // Check membership and permission
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

  // Only OWNER, ADMIN, or CREATOR can add items
  if (!["OWNER", "ADMIN", "CREATOR"].includes(membership.role)) {
    return {
      redirect: {
        destination: `/auctions/${auctionId}`,
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
      currencies,
    },
  };
};
