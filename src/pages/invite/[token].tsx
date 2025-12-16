import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { getMessages, Locale } from "@/i18n";

interface InviteInfo {
  auction: {
    id: string;
    name: string;
    description: string | null;
  };
  sender: {
    name: string | null;
    email: string;
  };
  role: string;
  email: string;
}

export default function AcceptInvitePage() {
  const router = useRouter();
  const { token } = router.query;
  const { data: session, status } = useSession();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchInvite = async () => {
      try {
        const res = await fetch(`/api/invites/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Invalid invite");
        } else {
          setInvite(data);
        }
      } catch {
        setError("Failed to load invite");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    setIsAccepting(true);
    setError(null);

    try {
      const res = await fetch(`/api/invites/${token}`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to accept invite");
      } else {
        router.push(`/auctions/${data.auctionId}`);
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse delay-1000"></div>
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
        </div>

        <div className="text-center relative z-10">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content/60 font-medium animate-pulse">
            Loading invite...
          </p>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center px-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-error/10 rounded-full blur-[128px]"></div>
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
        </div>

        <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl max-w-md w-full relative z-10">
          <div className="card-body items-center text-center p-8">
            <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mb-4">
              <span className="icon-[tabler--alert-circle] size-10 text-error"></span>
            </div>
            <h1 className="text-2xl font-bold mt-2">Invalid Invite</h1>
            <p className="text-base-content/60 mt-2">{error}</p>
            <div className="card-actions mt-8 w-full">
              <Link
                href="/dashboard"
                className="btn btn-primary w-full shadow-lg shadow-primary/20"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  const isLoggedIn = status === "authenticated";
  const emailMatches =
    session?.user?.email?.toLowerCase() === invite.email.toLowerCase();

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse delay-1000"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
      </div>

      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl max-w-md w-full relative z-10">
        <div className="card-body p-8">
          <div className="text-center mb-8">
            <div className="inline-flex relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
              <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl flex items-center justify-center relative z-10 border border-base-content/5 rotate-3">
                <span className="icon-[tabler--mail-opened] size-12 text-primary -rotate-3"></span>
              </div>
            </div>
            <h1 className="text-3xl font-extrabold mt-6 bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              You&apos;re Invited!
            </h1>
            <p className="text-base-content/60 mt-2">
              You have been invited to join an auction
            </p>
          </div>

          <div className="bg-base-100/80 rounded-xl p-5 mb-8 border border-base-content/5 shadow-inner">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="icon-[tabler--gavel] size-6"></span>
              </div>
              <div>
                <h2 className="font-bold text-lg leading-tight">
                  {invite.auction.name}
                </h2>
                <p className="text-xs text-base-content/50 uppercase tracking-wide font-semibold">
                  Auction
                </p>
              </div>
            </div>

            {invite.auction.description && (
              <p className="text-sm text-base-content/70 mb-4 pl-[52px]">
                {invite.auction.description}
              </p>
            )}

            <div className="divider my-3 opacity-50"></div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-base-content/60">Invited by</span>
                <span className="font-medium flex items-center gap-1.5">
                  <span className="icon-[tabler--user] size-3.5 opacity-50"></span>
                  {invite.sender.name || invite.sender.email}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-base-content/60">Your Role</span>
                <span className="badge badge-primary badge-sm font-semibold shadow-sm shadow-primary/20">
                  {invite.role}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-error mb-6 shadow-sm">
              <span className="icon-[tabler--alert-circle] size-5"></span>
              <span>{error}</span>
            </div>
          )}

          {!isLoggedIn ? (
            <div className="space-y-4">
              <div className="text-center p-4 bg-base-200/50 rounded-xl mb-2">
                <p className="text-base-content/80 font-medium mb-1">
                  Login Required
                </p>
                <p className="text-sm text-base-content/60">
                  This invite was sent to{" "}
                  <span className="font-bold text-base-content/80">
                    {invite.email}
                  </span>
                </p>
              </div>

              <Link
                href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
                className="btn btn-primary w-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
              >
                Login to Accept
              </Link>
              <div className="text-center">
                <span className="text-xs text-base-content/40 uppercase font-bold tracking-widest">
                  or
                </span>
              </div>
              <Link
                href={`/register?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
                className="btn btn-outline w-full hover:bg-base-content/5"
              >
                Create Account
              </Link>
            </div>
          ) : !emailMatches ? (
            <div className="space-y-4">
              <div className="alert alert-warning shadow-sm">
                <span className="icon-[tabler--alert-triangle] size-5"></span>
                <div className="text-sm">
                  <p className="font-bold mb-1">Wrong Account</p>
                  <p>
                    Invite is for:{" "}
                    <strong className="font-mono">{invite.email}</strong>
                  </p>
                  <p>
                    Logged in as:{" "}
                    <strong className="font-mono">{session.user?.email}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: `/invite/${token}` })}
                className="btn btn-primary w-full shadow-lg shadow-primary/20"
              >
                Log out & Switch Account
              </button>
              <Link href="/dashboard" className="btn btn-ghost w-full">
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <Button
              onClick={handleAccept}
              variant="primary"
              modifier="block"
              isLoading={isAccepting}
              loadingText="Joining Auction..."
              icon={<span className="icon-[tabler--check] size-5"></span>}
              className="btn-lg shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
            >
              Accept & Join Auction
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const messages = await getMessages(context.locale as Locale);
  return {
    props: {
      messages,
    },
  };
};
