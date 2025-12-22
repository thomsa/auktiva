import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";

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
  const t = useTranslations("upload");
  const tErrors = useTranslations("errors");
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
      throw new Error(data.message || tErrors("generic"));
    }

    return res.json();
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remainingSlots = maxImages - images.length;

    if (fileArray.length > remainingSlots) {
      showToast(t("maxImagesError", { count: remainingSlots }), "error");
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = fileArray.map((file) => uploadFile(file));
      const uploadedImages = await Promise.all(uploadPromises);
      onImagesChange([...images, ...uploadedImages]);
      showToast(t("uploadSuccess"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : tErrors("upload.imageFailed"), "error");
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
        throw new Error(tErrors("upload.deleteFailed"));
      }

      onImagesChange(images.filter((img) => img.id !== imageId));
      showToast(t("deleteSuccess"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : tErrors("upload.deleteFailed"), "error");
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
      const res = await fetch(`/api/auctions/${auctionId}/items/${itemId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: newImages.map((img) => img.id) }),
      });
      if (!res.ok) {
        throw new Error(tErrors("upload.reorderFailed"));
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : tErrors("upload.reorderFailed"), "error");
      // Revert order on error
      onImagesChange(images);
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
            <p className="text-sm text-base-content/60">{t("uploading")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="icon-[tabler--cloud-upload] size-12 text-base-content/40"></span>
            <p className="text-sm text-base-content/60">
              {t("dragDrop")}{" "}
              <button
                type="button"
                className="link link-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                {t("browse")}
              </button>
            </p>
            <p className="text-xs text-base-content/40">
              {t("imageFormats")} • {t("maxSize")} • {images.length}/{maxImages}{" "}
              {t("images")}
            </p>
          </div>
        )}
      </div>

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
                alt={t("imageAlt", { index: index + 1 })}
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
                    title={t("moveLeft")}
                  >
                    <span className="icon-[tabler--chevron-left] size-5"></span>
                  </button>
                )}

                {/* Delete */}
                <button
                  type="button"
                  className="btn btn-circle btn-sm btn-error"
                  onClick={() => handleDelete(image.id)}
                  title={t("delete")}
                >
                  <span className="icon-[tabler--trash] size-4"></span>
                </button>

                {/* Move right */}
                {index < images.length - 1 && (
                  <button
                    type="button"
                    className="btn btn-circle btn-sm btn-ghost text-white"
                    onClick={() => moveImage(index, index + 1)}
                    title={t("moveRight")}
                  >
                    <span className="icon-[tabler--chevron-right] size-5"></span>
                  </button>
                )}
              </div>

              {/* Order badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 badge badge-primary badge-sm">
                  {t("main")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
