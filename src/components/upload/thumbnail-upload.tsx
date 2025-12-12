import { useState, useRef } from "react";

interface ThumbnailUploadProps {
  auctionId: string;
  currentThumbnail: string | null;
  onThumbnailChange: (url: string | null) => void;
}

export function ThumbnailUpload({
  auctionId,
  currentThumbnail,
  onThumbnailChange,
}: ThumbnailUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("thumbnail", file);

      const res = await fetch(`/api/auctions/${auctionId}/thumbnail`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Upload failed");
      }

      const data = await res.json();
      onThumbnailChange(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    setError(null);
    setIsUploading(true);

    try {
      const res = await fetch(`/api/auctions/${auctionId}/thumbnail`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to remove thumbnail");
      }

      onThumbnailChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        {/* Thumbnail Preview */}
        <div className="w-24 h-24 bg-base-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
          {currentThumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentThumbnail}
              alt="Auction thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="icon-[tabler--photo] size-8 text-base-content/30"></span>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />

          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <span className="icon-[tabler--upload] size-4"></span>
              )}
              {currentThumbnail ? "Change" : "Upload"}
            </button>

            {currentThumbnail && (
              <button
                type="button"
                className="btn btn-sm btn-ghost text-error"
                onClick={handleDelete}
                disabled={isUploading}
              >
                <span className="icon-[tabler--trash] size-4"></span>
                Remove
              </button>
            )}
          </div>

          <p className="text-xs text-base-content/50">
            JPEG, PNG, WebP, GIF • Max 5MB • Square recommended
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error alert-sm">
          <span className="icon-[tabler--alert-circle] size-4"></span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
