import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  invitedBy: {
    name: string | null;
    email: string;
  } | null;
}

export interface UseMembersReturn {
  members: Member[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<void>;
  updateRole: (memberId: string, newRole: string) => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;
}

export function useMembers(auctionId: string | undefined): UseMembersReturn {
  const { data, error, isLoading, mutate } = useSWR<Member[]>(
    auctionId ? `/api/auctions/${auctionId}/members` : null,
    fetcher,
  );

  const updateRole = async (
    memberId: string,
    newRole: string,
  ): Promise<boolean> => {
    if (!auctionId) return false;

    try {
      const res = await fetch(
        `/api/auctions/${auctionId}/members/${memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        },
      );

      if (res.ok) {
        await mutate();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const removeMember = async (memberId: string): Promise<boolean> => {
    if (!auctionId) return false;

    try {
      const res = await fetch(
        `/api/auctions/${auctionId}/members/${memberId}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        await mutate();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return {
    members: data ?? [],
    isLoading,
    error,
    mutate: async () => {
      await mutate();
    },
    updateRole,
    removeMember,
  };
}
