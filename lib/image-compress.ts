"use client";
type CompressOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};
const DEFAULTS: Required<CompressOptions> = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.82,
};
function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image."));
    };
    img.src = url;
  });
}
function calculateSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { w: number; h: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { w: width, h: height };
  }
  const scale = Math.min(maxWidth / width, maxHeight / height);
  return {
    w: Math.max(1, Math.round(width * scale)),
    h: Math.max(1, Math.round(height * scale)),
  };
}
export async function compressImageForUpload(
  file: File,
  options?: CompressOptions,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const { maxWidth, maxHeight, quality } = { ...DEFAULTS, ...options };
  const img = await loadImageFromBlob(file);
  const { w, h } = calculateSize(img.width, img.height, maxWidth, maxHeight);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);
  const outputType =
    file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/webp"
      ? "image/jpeg"
      : file.type;
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputType, quality);
  });
  if (!blob) return file;
  // Keep original when compression is not beneficial.
  if (blob.size >= file.size && w === img.width && h === img.height) {
    return file;
  }
  const ext = outputType === "image/jpeg" ? ".jpg" : file.name.slice(file.name.lastIndexOf("."));
  const base = file.name.includes(".") ? file.name.slice(0, file.name.lastIndexOf(".")) : file.name;
  return new File([blob], `${base}${ext}`, { type: outputType, lastModified: Date.now() });
}