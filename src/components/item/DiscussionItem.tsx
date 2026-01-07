import { useTranslations } from "next-intl";
import { useFormatters } from "@/i18n";
import { RichTextRenderer } from "@/components/ui/rich-text-editor";
import { useState } from "react";
import Image from "next/image";
import { DiscussionForm } from "./DiscussionForm";
import type { Discussion } from "./DiscussionSection";

interface DiscussionItemProps {
  discussion: Discussion;
  currentUserId: string;
  itemCreatorId: string;
  isOwnerOrAdmin: boolean;
  discussionsEnabled: boolean;
  onDelete: (discussionId: string) => Promise<void>;
  onReply: (content: string, parentId: string) => Promise<void>;
  onEdit: (discussionId: string, content: string) => Promise<void>;
  isDeleting: boolean;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  isSubmitting: boolean;
  depth: number;
}

const MAX_DEPTH = 5; // Maximum nesting depth

export function DiscussionItem({
  discussion,
  currentUserId,
  itemCreatorId,
  isOwnerOrAdmin,
  discussionsEnabled,
  onDelete,
  onReply,
  onEdit,
  isDeleting,
  editingId,
  setEditingId,
  replyingTo,
  setReplyingTo,
  isSubmitting,
  depth,
}: DiscussionItemProps) {
  const t = useTranslations("discussions");
    const { formatDate } = useFormatters();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isItemCreator = discussion.user.id === itemCreatorId;

  const isAuthor = currentUserId === discussion.user.id;
  const canDelete =
    isAuthor || currentUserId === itemCreatorId || isOwnerOrAdmin;
  const canEdit = isAuthor;
  const canReply = discussionsEnabled && depth < MAX_DEPTH;
  const isReplying = replyingTo === discussion.id;
  const isEditing = editingId === discussion.id;

  const handleDelete = async () => {
    await onDelete(discussion.id);
    setShowDeleteConfirm(false);
  };

  const handleReply = async (content: string) => {
    await onReply(content, discussion.id);
  };

  
  const startEditing = () => {
    setEditingId(discussion.id);
    setReplyingTo(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-base-300 pl-4" : ""}>
      <div 
        className={`bg-base-200 rounded-lg p-4 relative group ${
          isAuthor ? "ring-2 ring-primary/30" : ""
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Edit button on hover */}
        {canEdit && isHovered && !isEditing && !showDeleteConfirm && (
          <button
            type="button"
            onClick={startEditing}
            className="absolute top-2 right-2 btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <span className="icon-[tabler--edit] size-4"></span>
            {t("edit")}
          </button>
        )}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="avatar placeholder shrink-0">
            <div className={`bg-base-300 text-base-content/70 rounded-full ${depth > 0 ? "w-8 h-8" : "w-10 h-10"}`}>
              {discussion.user.image ? (
                <Image
                  src={discussion.user.image}
                  alt={discussion.user.name || "User"}
                  width={depth > 0 ? 32 : 40}
                  height={depth > 0 ? 32 : 40}
                  className="rounded-full"
                />
              ) : (
                <span className={depth > 0 ? "text-sm" : "text-lg"}>
                  {(discussion.user.name || "U").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">
                {discussion.user.name || t("anonymous")}
              </span>
              {isItemCreator && (
                <span className="badge badge-primary badge-sm">
                  {t("itemOwner")}
                </span>
              )}
              <span className="text-xs text-base-content/60">
                {formatDate(discussion.createdAt)}
              </span>
              {discussion.isEdited && (
                <span 
                  className="text-xs text-base-content/50 italic tooltip tooltip-bottom cursor-help"
                  data-tip={`${t("editedAt")} ${formatDate(discussion.updatedAt)}`}
                >
                  ({t("edited")})
                </span>
              )}
            </div>

            <div className="mt-2">
              {isEditing ? (
                <div className="space-y-3">
                  <DiscussionForm
                    onSubmit={async (content) => {
                      await onEdit(discussion.id, content);
                      setEditingId(null);
                    }}
                    isSubmitting={isSubmitting}
                    isReply
                    onCancel={cancelEditing}
                    initialContent={discussion.content}
                  />
                </div>
              ) : (
                <RichTextRenderer content={discussion.content} />
              )}
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {canReply && !isReplying && (
                <button
                  type="button"
                  onClick={() => setReplyingTo(discussion.id)}
                  className="btn btn-ghost btn-xs"
                >
                  <span className="icon-[tabler--corner-down-right] size-4"></span>
                  {t("reply")}
                </button>
              )}
              {canDelete && (
                <>
                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="btn btn-ghost btn-xs text-error"
                      disabled={isDeleting}
                    >
                      <span className="icon-[tabler--trash] size-4"></span>
                      {t("delete")}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-base-content/70">
                        {t("confirmDelete")}
                      </span>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="btn btn-error btn-xs"
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          t("delete")
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="btn btn-ghost btn-xs"
                        disabled={isDeleting}
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Reply Form */}
            {isReplying && (
              <div className="mt-4">
                <DiscussionForm
                  onSubmit={handleReply}
                  isSubmitting={isSubmitting}
                  isReply
                  onCancel={() => setReplyingTo(null)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nested Replies */}
      {discussion.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {discussion.replies.map((reply) => (
            <DiscussionItem
              key={reply.id}
              discussion={reply}
              currentUserId={currentUserId}
              itemCreatorId={itemCreatorId}
              isOwnerOrAdmin={isOwnerOrAdmin}
              discussionsEnabled={discussionsEnabled}
              onDelete={onDelete}
              onReply={onReply}
              onEdit={onEdit}
              isDeleting={isDeleting}
              editingId={editingId}
              setEditingId={setEditingId}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              isSubmitting={isSubmitting}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
