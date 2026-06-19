"use client";

import { useState, useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from "lucide-react";

interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  onDelete?: (id: string) => void;
  canDelete?: boolean;
  height?: number;
}

export function ImageGallery({
  images,
  onDelete,
  canDelete = false,
  height = 220,
}: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const next = useCallback(() => {
    setActiveIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  const prev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, next, prev]);

  if (!images || images.length === 0) {
    return (
      <div
        className="rounded-2xl border border-border bg-surface/50 flex flex-col items-center justify-center text-muted"
        style={{ height }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-2 opacity-30">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <p className="text-xs">لا توجد صور</p>
      </div>
    );
  }

  const active = images[activeIndex];

  return (
    <>
      {/* Main Gallery */}
      <div className="rounded-2xl overflow-hidden border border-border bg-surface">
        {/* Main Image */}
        <div
          className="relative group cursor-zoom-in"
          style={{ height }}
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={active.url}
            alt={active.caption ?? "car image"}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Zoom hint */}
          <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn className="w-4 h-4 text-white" />
          </div>

          {/* Delete button */}
          {canDelete && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(active.id);
              }}
              className="absolute top-3 left-3 w-9 h-9 rounded-full bg-danger/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger"
              title="حذف الصورة"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            </>
          )}

          {/* Caption */}
          {active.caption && (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
              <p className="text-xs text-white">{active.caption}</p>
            </div>
          )}

          {/* Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
              {activeIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Thumbnails strip */}
        {images.length > 1 && (
          <div className="flex gap-1.5 p-2 bg-surface overflow-x-auto scrollbar-thin">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setActiveIndex(idx)}
                className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === activeIndex
                    ? "border-primary ring-2 ring-primary/30 scale-95"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center animate-fade-in"
          onClick={() => {
            setLightboxOpen(false);
            setZoom(1);
          }}
        >
          {/* Close */}
          <button
            onClick={() => {
              setLightboxOpen(false);
              setZoom(1);
            }}
            className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Download */}
          <a
            href={active.url}
            download
            onClick={(e) => e.stopPropagation()}
            className="absolute top-5 left-5 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
          >
            <Download className="w-5 h-5 text-white" />
          </a>

          {/* Zoom controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/10 rounded-full px-3 py-2 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoom((z) => Math.max(1, z - 0.25));
              }}
              className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
              disabled={zoom <= 1}
            >
              <ZoomOut className="w-4 h-4 text-white" />
            </button>
            <span className="text-white text-xs font-medium w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoom((z) => Math.min(3, z + 0.25));
              }}
              className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
              disabled={zoom >= 3}
            >
              <ZoomIn className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Nav arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                  setZoom(1);
                }}
                className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                  setZoom(1);
                }}
                className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {/* Image */}
          <img
            src={active.url}
            alt={active.caption ?? "car image"}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
          />

          {/* Counter */}
          <div className="absolute bottom-6 right-6 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium z-10">
            {activeIndex + 1} / {images.length}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center">
                <X className="w-7 h-7 text-danger" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground mb-1">حذف الصورة</h3>
                <p className="text-sm text-muted">هل أنت متأكد من حذف هذه الصورة نهائياً؟ لا يمكن التراجع.</p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-surface-hover transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    onDelete?.(confirmDelete);
                    setConfirmDelete(null);
                    if (activeIndex > 0) setActiveIndex((i) => i - 1);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-danger text-white text-sm font-medium hover:bg-danger/90 transition-colors"
                >
                  حذف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
