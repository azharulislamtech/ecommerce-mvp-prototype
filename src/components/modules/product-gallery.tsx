"use client";

import { useMemo, useState } from "react";
import { ProductVisual } from "@/components/modules/product-visual";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { ProductImage, ProductVisual as ProductVisualType } from "@/lib/data";

type ProductGalleryProps = {
  imageAlt?: string;
  imageUrl?: string;
  images?: ProductImage[];
  label: string;
  visual: ProductVisualType;
};

export function ProductGallery({ imageAlt, imageUrl, images, label, visual }: ProductGalleryProps) {
  const galleryImages = useMemo(() => {
    const productImages = (images ?? []).filter((image) => image.url);

    if (productImages.length) {
      return productImages;
    }

    if (imageUrl) {
      return [{ id: "primary", url: imageUrl, alt: imageAlt ?? label, sortOrder: 0 }];
    }

    return [];
  }, [imageAlt, imageUrl, images, label]);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = galleryImages[activeIndex] ?? galleryImages[0];
  const hasMultipleImages = galleryImages.length > 1;

  function showPrevious() {
    setActiveIndex((current) => (current - 1 + galleryImages.length) % galleryImages.length);
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % galleryImages.length);
  }

  return (
    <div>
      <div className="relative" data-testid="product-gallery-main">
        <ProductVisual
          imageAlt={activeImage?.alt ?? imageAlt}
          imageUrl={activeImage?.url ?? imageUrl}
          label={label}
          large
          visual={visual}
        />

        {hasMultipleImages ? (
          <>
            <button
              aria-label="Show previous product image"
              className="focus-ring absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-950 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
              data-testid="product-gallery-previous"
              onClick={showPrevious}
              type="button"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              aria-label="Show next product image"
              className="focus-ring absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-950 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
              data-testid="product-gallery-next"
              onClick={showNext}
              type="button"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
            <span className="sr-only" aria-live="polite">
              Image {activeIndex + 1} of {galleryImages.length}
            </span>
          </>
        ) : null}
      </div>

      {galleryImages.length ? (
        <div className="mt-3 grid grid-cols-4 gap-3">
          {galleryImages.slice(0, 8).map((image, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                aria-label={`Show product image ${index + 1}`}
                aria-pressed={isActive}
                className={`focus-ring rounded-md border bg-white p-1 transition ${
                  isActive
                    ? "border-blue-600 shadow-[0_0_0_2px_rgba(37,99,235,0.22)]"
                    : "border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                }`}
                data-testid="product-gallery-thumbnail"
                key={image.id}
                onClick={() => setActiveIndex(index)}
                type="button"
              >
                <ProductVisual
                  compact
                  imageAlt={image.alt}
                  imageUrl={image.url}
                  label={`${label} image ${index + 1}`}
                  visual={visual}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}