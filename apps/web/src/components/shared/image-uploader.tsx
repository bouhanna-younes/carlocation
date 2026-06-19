"use client";

import { useState, useCallback, useRef } from "react";
import { UploadCloud, Loader2, ImageIcon } from "lucide-react";
import { compressImage, formatBytes } from "@/lib/image-compress";

interface ImageUploaderProps {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
  compact?: boolean;
  multiple?: boolean;
}

export function ImageUploader({
  onUpload,
  disabled = false,
  compact = false,
  multiple = false,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    original: number;
    compressed: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) return;

      setIsUploading(true);

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        setProgress({
          current: i + 1,
          total: imageFiles.length,
          original: file.size,
          compressed: file.size,
        });

        try {
          const compressed = await compressImage(file, 1600, 500, 0.6);
          setProgress({
            current: i + 1,
            total: imageFiles.length,
            original: file.size,
            compressed: compressed.size,
          });
          await onUpload(compressed);
        } catch {
          // Continue to next file even if one fails
        }
      }

      setIsUploading(false);
      setTimeout(() => setProgress(null), 1500);
    },
    [onUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled || isUploading) return;
      const files = e.dataTransfer.files;
      if (files && files.length > 0) handleFiles(files);
    },
    [disabled, isUploading, handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const inputProps = {
    ref: inputRef,
    type: "file" as const,
    accept: "image/*",
    multiple,
    className: "hidden",
    disabled: disabled || isUploading,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) handleFiles(files);
      e.target.value = "";
    },
  };

  if (compact) {
    return (
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex items-center justify-center gap-2 py-2.5 border-t border-border cursor-pointer transition-all ${
          isDragging ? "bg-primary/10 border-primary" : "hover:bg-surface-hover"
        } ${disabled || isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs text-muted">
              {progress
                ? multiple && progress.total > 1
                  ? `${progress.current}/${progress.total} — ${formatBytes(progress.original)} → ${formatBytes(progress.compressed)}`
                  : `${formatBytes(progress.original)} → ${formatBytes(progress.compressed)}`
                : "جاري المعالجة..."}
            </span>
          </>
        ) : (
          <>
            <UploadCloud className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted">
              {multiple ? "رفع صور (اسحب أو انقر)" : "رفع صورة (اسحب أو انقر)"}
            </span>
          </>
        )}
        <input {...inputProps} />
      </label>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && !isUploading && inputRef.current?.click()}
      className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center p-8 ${
        isDragging
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border hover:border-primary/40 hover:bg-surface-hover"
      } ${disabled || isUploading ? "opacity-60 cursor-not-allowed" : ""}`}
      style={{ minHeight: 180 }}
    >
      <input {...inputProps} />

      {isUploading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-border" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <ImageIcon className="w-6 h-6 text-primary absolute inset-0 m-auto" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {multiple && progress && progress.total > 1
                ? `جاري رفع ${progress.current} من ${progress.total} صور...`
                : "جاري الضغط والرفع..."}
            </p>
            {progress && (
              <p className="text-xs text-muted">
                {formatBytes(progress.original)} →{" "}
                <span className="text-success font-medium">
                  {formatBytes(progress.compressed)}
                </span>
                <span className="text-success">
                  {" "}
                  ({Math.round((1 - progress.compressed / progress.original) * 100)}% توفير)
                </span>
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <UploadCloud className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {multiple ? "اسحب الصور هنا أو انقر للاختيار" : "اسحب الصورة هنا أو انقر للاختيار"}
            </p>
            <p className="text-xs text-muted mt-1">
              {multiple ? "يمكن رفع عدة صور دفعة واحدة — " : ""}
              سيتم ضغط الصور تلقائياً مع الحفاظ على الجودة (حد أقصى 500KB لكل صورة)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
