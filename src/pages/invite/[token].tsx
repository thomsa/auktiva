import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

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
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content/60">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
        <div className="card bg-base-100 shadow-xl max-w-md w-full">
          <div className="card-body items-center text-center">
            <span className="icon-[tabler--alert-circle] size-16 text-error"></span>
            <h1 className="card-title mt-4">Invalid Invite</h1>
            <p className="text-base-content/60">{error}</p>
            <div className="card-actions mt-6">
              <Link href="/dashboard" className="btn btn-primary">
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
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
      <div className="card bg-base-100 shadow-xl max-w-md w-full">
        <div className="card-body">
          <div className="text-center mb-6">
            <span className="icon-[tabler--mail-opened] size-16 text-primary"></span>
            <h1 className="text-2xl font-bold mt-4">You&apos;re Invited!</h1>
          </div>

          <div className="bg-base-200 rounded-lg p-4 mb-6">
            <h2 className="font-bold text-lg">{invite.auction.name}</h2>
            {invite.auction.description && (
              <p className="text-sm text-base-content/60 mt-1">
                {invite.auction.description}
              </p>
            )}
            <div className="mt-3 text-sm">
              <span className="text-base-content/60">Invited by: </span>
              <span className="font-medium">
                {invite.sender.name || invite.sender.email}
              </span>
            </div>
            <div className="mt-1 text-sm">
              <span className="text-base-content/60">Role: </span>
              <span className="badge badge-primary badge-sm">
                {invite.role}
              </span>
            </div>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              <span className="icon-[tabler--alert-circle] size-5"></span>
              <span>{error}</span>
            </div>
          )}

          {!isLoggedIn ? (
            <div className="space-y-4">
              <p className="text-center text-base-content/60">
                Please login or create an account to accept this invite.
              </p>
              <div className="text-center text-sm text-base-content/60">
                Invite is for:{" "}
                <span className="font-medium">{invite.email}</span>
              </div>
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
                className="btn btn-primary w-full"
              >
                Login to Accept
              </Link>
              <Link
                href={`/register?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
                className="btn btn-ghost w-full"
              >
                Create Account
              </Link>
            </div>
          ) : !emailMatches ? (
            <div className="space-y-4">
              <div className="alert alert-warning">
                <span className="icon-[tabler--alert-triangle] size-5"></span>
                <div>
                  <p>
                    This invite is for <strong>{invite.email}</strong>
                  </p>
                  <p className="text-sm">
                    You&apos;re logged in as {session.user?.email}
                  </p>
                </div>
              </div>
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
              loadingText="Joining..."
              icon={<span className="icon-[tabler--check] size-5"></span>}
            >
              Accept & Join Auction
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
