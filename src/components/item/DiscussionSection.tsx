import { useTranslations } from "next-intl";
import { useState, useCallback, useEffect } from "react";
import { DiscussionForm } from "./DiscussionForm";
import { DiscussionItem } from "./DiscussionItem";

export interface Discussion {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  parentId: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  replies: Discussion[];
}

interface DiscussionSectionProps {
  auctionId: string;
  itemId: string;
  currentUserId: string;
  itemCreatorId: string;
  isOwnerOrAdmin: boolean;
  initialDiscussions: Discussion[];
  discussionsEnabled: boolean;
}

type SortOrder = "newest" | "oldest";

export function DiscussionSection({
  auctionId,
  itemId,
  currentUserId,
  itemCreatorId,
  isOwnerOrAdmin,
  initialDiscussions,
  discussionsEnabled,
}: DiscussionSectionProps) {
  const t = useTranslations("discussions");
  const tErrors = useTranslations("errors");

  const [discussions, setDiscussions] =
    useState<Discussion[]>(initialDiscussions);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when item changes
  useEffect(() => {
    setDiscussions(initialDiscussions);
    setSortOrder("newest");
    setReplyingTo(null);
    setEditingId(null);
    setError(null);
  }, [itemId, initialDiscussions]);

  // Count total discussions including replies
  const countDiscussions = (items: Discussion[]): number => {
    return items.reduce(
      (count, item) => count + 1 + countDiscussions(item.replies),
      0,
    );
  };
  const totalCount = countDiscussions(discussions);

  const fetchDiscussions = useCallback(
    async (order: SortOrder) => {
      try {
        const res = await fetch(
          `/api/auctions/${auctionId}/items/${itemId}/discussions?order=${order}`,
        );
        if (!res.ok) throw new Error("Failed to fetch discussions");
        const data = await res.json();
        setDiscussions(data.discussions);
      } catch {
        setError(tErrors("generic"));
      }
    },
    [auctionId, itemId, tErrors],
  );

  const handleSortChange = async (order: SortOrder) => {
    setSortOrder(order);
    await fetchDiscussions(order);
  };

  const handleSubmit = async (content: string, parentId?: string | null) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/auctions/${auctionId}/items/${itemId}/discussions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, parentId: parentId || null }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to post discussion");
      }

      // Refresh to get proper tree structure
      await fetchDiscussions(sortOrder);
      setReplyingTo(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tErrors("discussion.createFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (discussionId: string) => {
    setDeletingId(discussionId);
    setError(null);

    try {
      const res = await fetch(
        `/api/auctions/${auctionId}/items/${itemId}/discussions/${discussionId}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete discussion");
      }

      // Refresh to get proper tree structure after deletion
      await fetchDiscussions(sortOrder);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tErrors("discussion.deleteFailed"),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = async (discussionId: string, content: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/auctions/${auctionId}/items/${itemId}/discussions/${discussionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update discussion");
      }

      // Refresh to get updated content
      await fetchDiscussions(sortOrder);
      setEditingId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tErrors("discussion.updateFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="icon-[tabler--messages] size-5"></span>
          {t("title")} ({totalCount})
        </h2>

        {discussions.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-base-content/70 whitespace-nowrap">
              {t("orderBy")}:
            </span>
            <select
              value={sortOrder}
              onChange={(e) => handleSortChange(e.target.value as SortOrder)}
              className="select select-sm select-bordered"
            >
              <option value="newest">{t("newest")}</option>
              <option value="oldest">{t("oldest")}</option>
            </select>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error">
          <span className="icon-[tabler--alert-circle] size-5"></span>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <span className="icon-[tabler--x] size-4"></span>
          </button>
        </div>
      )}

      {/* New Discussion Form */}
      {discussionsEnabled ? (
        <DiscussionForm
          onSubmit={(content) => handleSubmit(content)}
          isSubmitting={isSubmitting && !replyingTo}
        />
      ) : (
        <div className="alert alert-info">
          <span className="icon-[tabler--message-off] size-5"></span>
          <span>{t("disabled")}</span>
        </div>
      )}

      {/* Discussions List */}
      {discussions.length === 0 ? (
        <p className="text-base-content/60 text-center py-8">{t("empty")}</p>
      ) : (
        <div className="space-y-4">
          {discussions.map((discussion) => (
            <DiscussionItem
              key={discussion.id}
              discussion={discussion}
              currentUserId={currentUserId}
              itemCreatorId={itemCreatorId}
              isOwnerOrAdmin={isOwnerOrAdmin}
              discussionsEnabled={discussionsEnabled}
              onDelete={handleDelete}
              onReply={handleSubmit}
              onEdit={handleEdit}
              isDeleting={deletingId === discussion.id}
              editingId={editingId}
              setEditingId={setEditingId}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              isSubmitting={isSubmitting}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
