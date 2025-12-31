"use client";

import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import { CharacterCount } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import DOMPurify from "dompurify";

interface RichTextEditorProps {
  name: string;
  id?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function RichTextEditor({
  name,
  id,
  defaultValue = "",
  value,
  onChange,
  placeholder,
  className = "",
  maxLength = 1000,
}: RichTextEditorProps) {
  const t = useTranslations("richText");
  const [content, setContent] = useState(value || defaultValue);

  const editor = useEditor({
    extensions: [
      CharacterCount.configure({
        limit: maxLength,
      }),
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || t("placeholder"),
      }),
    ],
    content: value || defaultValue,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[120px] p-3 focus:outline-none text-base-content",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Convert empty paragraph to empty string
      const isEmpty = html === "<p></p>" || html === "";
      const newContent = isEmpty ? "" : html;
      setContent(newContent);
      onChange?.(newContent);
    },
  });

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      return {
        characterCount: ctx.editor?.storage.characterCount.characters(),
      };
    },
  });
  const characterCount = editorState?.characterCount ?? 0;

  const percentage = editor
    ? Math.round((100 / maxLength) * characterCount)
    : 0;

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!editor) {
    return <div className="animate-pulse bg-base-200 rounded-lg h-32"></div>;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt(t("enterUrl"), previousUrl);

    if (url === null) {
      return;
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className={`rich-text-editor ${className}`}>
      {/* Hidden input to submit the HTML value */}
      <input type="hidden" name={name} id={id} value={content} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-base-200/50 border border-base-300 rounded-t-lg border-b-0">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`btn btn-ghost btn-xs btn-square tooltip tooltip-bottom ${
            editor.isActive("bold") ? "bg-base-300" : ""
          }`}
          data-tip={t("bold")}
          aria-label={t("bold")}
        >
          <span className="icon-[tabler--bold] size-4"></span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`btn btn-ghost btn-xs btn-square tooltip tooltip-bottom ${
            editor.isActive("italic") ? "bg-base-300" : ""
          }`}
          data-tip={t("italic")}
          aria-label={t("italic")}
        >
          <span className="icon-[tabler--italic] size-4"></span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`btn btn-ghost btn-xs btn-square tooltip tooltip-bottom ${
            editor.isActive("strike") ? "bg-base-300" : ""
          }`}
          data-tip={t("strikethrough")}
          aria-label={t("strikethrough")}
        >
          <span className="icon-[tabler--strikethrough] size-4"></span>
        </button>

        <div className="divider divider-horizontal mx-0 w-px h-4"></div>

        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={`btn btn-ghost btn-xs btn-square tooltip tooltip-bottom ${
            editor.isActive("heading", { level: 2 }) ? "bg-base-300" : ""
          }`}
          data-tip={t("heading")}
          aria-label={t("heading")}
        >
          <span className="icon-[tabler--heading] size-4"></span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`btn btn-ghost btn-xs btn-square tooltip tooltip-bottom ${
            editor.isActive("bulletList") ? "bg-base-300" : ""
          }`}
          data-tip={t("bulletList")}
          aria-label={t("bulletList")}
        >
          <span className="icon-[tabler--list] size-4"></span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`btn btn-ghost btn-xs btn-square tooltip tooltip-bottom ${
            editor.isActive("orderedList") ? "bg-base-300" : ""
          }`}
          data-tip={t("numberedList")}
          aria-label={t("numberedList")}
        >
          <span className="icon-[tabler--list-numbers] size-4"></span>
        </button>

        <div className="divider divider-horizontal mx-0 w-px h-4"></div>

        <button
          type="button"
          onClick={setLink}
          className={`btn btn-ghost btn-xs btn-square tooltip tooltip-bottom ${
            editor.isActive("link") ? "bg-base-300" : ""
          }`}
          data-tip={t("link")}
          aria-label={t("link")}
        >
          <span className="icon-[tabler--link] size-4"></span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`btn btn-ghost btn-xs btn-square tooltip tooltip-bottom ${
            editor.isActive("blockquote") ? "bg-base-300" : ""
          }`}
          data-tip={t("quote")}
          aria-label={t("quote")}
        >
          <span className="icon-[tabler--quote] size-4"></span>
        </button>

        <div className="divider divider-horizontal mx-0 w-px h-4"></div>

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="btn btn-ghost btn-xs btn-square tooltip tooltip-bottom"
          data-tip={t("undo")}
          aria-label={t("undo")}
        >
          <span className="icon-[tabler--arrow-back-up] size-4"></span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="btn btn-ghost btn-xs btn-square tooltip tooltip-bottom"
          data-tip={t("redo")}
          aria-label={t("redo")}
        >
          <span className="icon-[tabler--arrow-forward-up] size-4"></span>
        </button>
      </div>

      {/* Editor Content */}
      <div className="border border-base-300 rounded-b-lg bg-base-100 focus-within:border-primary transition-colors">
        <EditorContent editor={editor} />
      </div>

      <div
        className={`character-count mt-2 flex items-center gap-2 text-sm text-base-content/70 ${
          characterCount >= maxLength ? "text-warning" : ""
        }`}
      >
        <svg height="20" width="20" viewBox="0 0 20 20">
          <circle r="10" cx="10" cy="10" className="fill-base-300" />
          <circle
            r="5"
            cx="10"
            cy="10"
            fill="transparent"
            className="stroke-primary"
            strokeWidth="10"
            strokeDasharray={`calc(${percentage} * 31.4 / 100) 31.4`}
            transform="rotate(-90) translate(-20)"
          />
          <circle r="6" cx="10" cy="10" className="fill-base-100" />
        </svg>
        {characterCount} / {maxLength} characters
      </div>
    </div>
  );
}

// Component to render rich text content (HTML)
// This component is client-only because DOMPurify requires a DOM environment
interface RichTextRendererProps {
  content: string;
  className?: string;
}

const emptySubscribe = () => () => {};

export function RichTextRenderer({
  content,
  className = "",
}: RichTextRendererProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!content || !isMounted) return null;

  // Sanitize HTML to prevent XSS attacks (client-side only)
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "a",
      "blockquote",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });

  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}

// Utility to strip HTML tags for plain text previews (e.g., in cards)
export function stripHtmlTags(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
