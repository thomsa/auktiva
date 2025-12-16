import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageLayout, BackLink, AlertMessage } from "@/components/common";
import { Button } from "@/components/ui/button";
import { getMessages, Locale } from "@/i18n";

interface CreateAuctionProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  allowOpenAuctions: boolean;
}

export default function CreateAuctionPage({
  user,
  allowOpenAuctions,
}: CreateAuctionProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      joinMode: formData.get("joinMode") as string,
      memberCanInvite: formData.get("memberCanInvite") === "on",
      bidderVisibility: formData.get("bidderVisibility") as string,
      endDate: (formData.get("endDate") as string) || undefined,
      itemEndMode: formData.get("itemEndMode") as string,
    };

    try {
      const res = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.errors) {
          setFieldErrors(result.errors);
        } else {
          setError(result.message || "Failed to create auction");
        }
      } else {
        router.push(`/auctions/${result.id}`);
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout user={user} maxWidth="2xl">
      <div className="mb-8">
        <BackLink href="/dashboard" label="Back to Dashboard" />
      </div>

      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
        <div className="card-body p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="icon-[tabler--gavel] size-7"></span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Create New Auction</h1>
              <p className="text-base-content/60">
                Set up your auction details
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
                <label className="label" htmlFor="name">
                  <span className="label-text font-medium">Auction Name *</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g., Family Estate Sale"
                  className={`input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors ${
                    fieldErrors.name ? "input-error" : ""
                  }`}
                  required
                  maxLength={100}
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
                  <span className="label-text font-medium">Description</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Describe your auction..."
                  className="textarea textarea-bordered w-full h-32 bg-base-100 focus:bg-base-100 transition-colors"
                  maxLength={500}
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
                <label className="label" htmlFor="joinMode">
                  <span className="label-text font-medium">Who can join?</span>
                </label>
                <select
                  id="joinMode"
                  name="joinMode"
                  className="select select-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                  defaultValue="INVITE_ONLY"
                >
                  <option value="INVITE_ONLY">
                    Invite Only - Only invited users can join
                  </option>
                  <option value="LINK">
                    Link Access - Anyone with the link can join
                  </option>
                  {allowOpenAuctions && (
                    <option value="FREE">Open - Anyone can join</option>
                  )}
                </select>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3 p-0">
                  <input
                    type="checkbox"
                    name="memberCanInvite"
                    className="checkbox checkbox-primary"
                  />
                  <span className="label-text">
                    Allow members to invite others
                  </span>
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
                <label className="label" htmlFor="bidderVisibility">
                  <span className="label-text font-medium">
                    Bidder Visibility
                  </span>
                </label>
                <select
                  id="bidderVisibility"
                  name="bidderVisibility"
                  className="select select-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                  defaultValue="VISIBLE"
                >
                  <option value="VISIBLE">
                    Always Visible - Show bidder names
                  </option>
                  <option value="ANONYMOUS">
                    Always Anonymous - Hide bidder names
                  </option>
                  <option value="PER_BID">
                    Per Bid - Let each bidder decide
                  </option>
                </select>
              </div>
            </div>

            {/* Timing Settings */}
            <div className="divider opacity-50"></div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-info">
                <span className="icon-[tabler--clock] size-5"></span>
                Timing
              </h2>

              <div className="form-control">
                <label className="label" htmlFor="endDate">
                  <span className="label-text font-medium">
                    Auction End Date (optional)
                  </span>
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="datetime-local"
                  className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Leave empty for no end date
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label" htmlFor="itemEndMode">
                  <span className="label-text font-medium">Item End Mode</span>
                </label>
                <select
                  id="itemEndMode"
                  name="itemEndMode"
                  className="select select-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                  defaultValue="CUSTOM"
                >
                  <option value="CUSTOM">
                    Custom - Each item can have its own end date
                  </option>
                  <option value="AUCTION_END">
                    Auction End - All items end when auction ends
                  </option>
                  <option value="NONE">No End - Items have no end date</option>
                </select>
              </div>
            </div>

            {/* Submit */}
            <div className="divider opacity-50"></div>
            <div className="flex gap-4 pt-4">
              <Link href="/dashboard" className="btn btn-ghost flex-1">
                Cancel
              </Link>
              <Button
                type="submit"
                variant="primary"
                className="flex-1 shadow-lg shadow-primary/20"
                isLoading={isLoading}
                loadingText="Creating..."
                icon={<span className="icon-[tabler--plus] size-5"></span>}
              >
                Create Auction
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

  const messages = await getMessages(context.locale as Locale);

  return {
    props: {
      user: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || "",
      },
      allowOpenAuctions: process.env.ALLOW_OPEN_AUCTIONS === "true",
      messages,
    },
  };
};
