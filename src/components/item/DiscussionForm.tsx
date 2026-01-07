import { useTranslations } from "next-intl";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useState } from "react";

interface DiscussionFormProps {
  onSubmit: (content: string) => Promise<void>;
  isSubmitting: boolean;
  isReply?: boolean;
  onCancel?: () => void;
  initialContent?: string;
}

export function DiscussionForm({ onSubmit, isSubmitting, isReply, onCancel, initialContent = "" }: DiscussionFormProps) {
  const t = useTranslations("discussions");
  const [content, setContent] = useState(initialContent);
  const [editorKey, setEditorKey] = useState(0);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim() || content === "<p></p>" || isSubmitting) return;

    await onSubmit(content);
    setContent("");
    // Force re-mount editor to clear undo history
    setEditorKey((k) => k + 1);
  };

  const isEmpty = !content.trim() || content === "<p></p>";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <RichTextEditor
        key={editorKey}
        name="discussion"
        value={content}
        onChange={setContent}
        placeholder={isReply ? t("replyPlaceholder") : t("placeholder")}
        maxLength={2000}
        onSubmit={handleSubmit}
      />

      <div className="flex justify-end gap-2">
        {isReply && onCancel && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t("cancel")}
          </button>
        )}
        <button
          type="submit"
          className={isReply ? "btn btn-primary btn-sm" : "btn btn-primary"}
          disabled={isEmpty || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              {t("submitting")}
            </>
          ) : (
            <>
              <span className="icon-[tabler--send] size-4"></span>
              {isReply ? t("reply") : t("submit")}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
