/**
 * Image compression utility — reduces file size while maintaining
 * visual quality using canvas API.
 *
 * Strategy:
 * 1. If image is <= targetMaxKB, skip compression (already small)
 * 2. Downscale to maxDimension if larger than needed
 * 3. Iteratively reduce JPEG quality until under target size
 *
 * @param file Original image file
 * @param maxDimension Max width/height in pixels (default 1600)
 * @param maxKB Target max size in KB (default 500)
 * @param minQuality Minimum JPEG quality (default 0.6)
 * @returns Compressed File object
 */
export async function compressImage(
  file: File,
  maxDimension = 1600,
  maxKB = 500,
  minQuality = 0.6,
): Promise<File> {
  // Non-image files — return as-is
  if (!file.type.startsWith("image/")) return file;

  // Already small enough — skip
  if (file.size <= maxKB * 1024) return file;

  // PNG with transparency — use PNG if small, else convert to JPEG
  const isPng = file.type === "image/png";

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Downscale if exceeds max dimension
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      // White background for PNG→JPEG (transparency)
      if (isPng) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }

      // High quality interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Iterative quality reduction
      let quality = 0.92;
      const targetBytes = maxKB * 1024;

      const tryCompress = (q: number) => {
        canvas.toBlob(
          (b) => {
            if (!b) {
              resolve(file);
              return;
            }

            if (b.size <= targetBytes || q <= minQuality) {
              const compressed = new File([b], file.name.replace(/\.\w+$/, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressed);
            } else {
              const nextQ = q - 0.08;
              tryCompress(nextQ);
            }
          },
          "image/jpeg",
          q,
        );
      };

      tryCompress(quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback to original on error
    };

    img.src = url;
  });
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
