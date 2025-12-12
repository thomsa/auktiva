import { useState, useRef, useCallback } from "react";

interface UploadedImage {
  id: string;
  url: string;
  publicUrl: string;
  order: number;
}

interface ImageUploadProps {
  auctionId: string;
  itemId: string;
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
}

export function ImageUpload({
  auctionId,
  itemId,
  images,
  onImagesChange,
  maxImages = 10,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(
      `/api/auctions/${auctionId}/items/${itemId}/images`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Upload failed");
    }

    return res.json();
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remainingSlots = maxImages - images.length;

    if (fileArray.length > remainingSlots) {
      setError(`Can only upload ${remainingSlots} more image(s)`);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const uploadPromises = fileArray.map((file) => uploadFile(file));
      const uploadedImages = await Promise.all(uploadPromises);
      onImagesChange([...images, ...uploadedImages]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [images.length],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // Reset input
      e.target.value = "";
    }
  };

  const handleDelete = async (imageId: string) => {
    try {
      const res = await fetch(
        `/api/auctions/${auctionId}/items/${itemId}/images?imageId=${imageId}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        throw new Error("Failed to delete image");
      }

      onImagesChange(images.filter((img) => img.id !== imageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const moveImage = async (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);

    // Update local state immediately
    onImagesChange(newImages);

    // Persist order to server
    try {
      await fetch(`/api/auctions/${auctionId}/items/${itemId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: newImages.map((img) => img.id) }),
      });
    } catch (err) {
      console.error("Failed to save image order:", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-base-300 hover:border-primary/50"
        } ${images.length >= maxImages ? "opacity-50 pointer-events-none" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={images.length >= maxImages}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-sm text-base-content/60">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="icon-[tabler--cloud-upload] size-12 text-base-content/40"></span>
            <p className="text-sm text-base-content/60">
              Drag & drop images here, or{" "}
              <button
                type="button"
                className="link link-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                browse
              </button>
            </p>
            <p className="text-xs text-base-content/40">
              JPEG, PNG, WebP, GIF • Max 10MB • {images.length}/{maxImages}{" "}
              images
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error alert-sm">
          <span className="icon-[tabler--alert-circle] size-4"></span>
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setError(null)}
          >
            <span className="icon-[tabler--x] size-4"></span>
          </button>
        </div>
      )}

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="relative group aspect-square bg-base-200 rounded-lg overflow-hidden"
            >
              <img
                src={image.publicUrl}
                alt={`Image ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {/* Move left */}
                {index > 0 && (
                  <button
                    type="button"
                    className="btn btn-circle btn-sm btn-ghost text-white"
                    onClick={() => moveImage(index, index - 1)}
                    title="Move left"
                  >
                    <span className="icon-[tabler--chevron-left] size-5"></span>
                  </button>
                )}

                {/* Delete */}
                <button
                  type="button"
                  className="btn btn-circle btn-sm btn-error"
                  onClick={() => handleDelete(image.id)}
                  title="Delete"
                >
                  <span className="icon-[tabler--trash] size-4"></span>
                </button>

                {/* Move right */}
                {index < images.length - 1 && (
                  <button
                    type="button"
                    className="btn btn-circle btn-sm btn-ghost text-white"
                    onClick={() => moveImage(index, index + 1)}
                    title="Move right"
                  >
                    <span className="icon-[tabler--chevron-right] size-5"></span>
                  </button>
                )}
              </div>

              {/* Order badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 badge badge-primary badge-sm">
                  Main
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
