import { useTranslations } from "next-intl";
import { useImageGallery } from "@/hooks/ui";

interface ItemImage {
  id: string;
  publicUrl: string;
}

interface ItemGalleryProps {
  images: ItemImage[];
  itemName: string;
}

export function ItemGallery({ images, itemName }: ItemGalleryProps) {
  const t = useTranslations("item.gallery");
  const { selectedIndex, setSelectedIndex, next, previous } = useImageGallery(
    images.length,
  );

  if (images.length === 0) return null;

  return (
    <div className="mt-6">
      {/* Main Image with Navigation */}
      <div className="relative aspect-video bg-base-200 rounded-lg overflow-hidden mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[selectedIndex]?.publicUrl}
          alt={`${itemName} - Image ${selectedIndex + 1}`}
          className="w-full h-full object-contain"
        />
        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={previous}
              className="absolute left-2 top-1/2 -translate-y-1/2 btn btn-circle btn-sm bg-black/50 hover:bg-black/70 border-none text-white"
              aria-label={t("previousImage")}
            >
              <span className="icon-[tabler--chevron-left] size-5"></span>
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-circle btn-sm bg-black/50 hover:bg-black/70 border-none text-white"
              aria-label={t("nextImage")}
            >
              <span className="icon-[tabler--chevron-right] size-5"></span>
            </button>
            {/* Image Counter */}
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {selectedIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, index) => (
            <button
              key={img.id}
              onClick={() => setSelectedIndex(index)}
              className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                index === selectedIndex
                  ? "border-primary"
                  : "border-transparent hover:border-base-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.publicUrl}
                alt={t("thumbnail", { index: index + 1 })}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
