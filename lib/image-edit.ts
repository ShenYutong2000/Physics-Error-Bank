"use client";

async function loadImage(file: File): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image."));
    };
    img.src = url;
  });
}

export async function rotateImageFile(file: File, quarterTurns: number): Promise<File> {
  const turns = ((quarterTurns % 4) + 4) % 4;
  if (turns === 0) return file;

  const img = await loadImage(file);
  const swapSize = turns % 2 === 1;
  const canvas = document.createElement("canvas");
  canvas.width = swapSize ? img.height : img.width;
  canvas.height = swapSize ? img.width : img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((Math.PI / 2) * turns);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  const outputType = file.type.startsWith("image/") ? file.type : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputType, 0.95);
  });
  if (!blob) return file;

  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".jpg";
  const base = file.name.includes(".") ? file.name.slice(0, file.name.lastIndexOf(".")) : file.name;
  return new File([blob], `${base}${ext}`, {
    type: outputType,
    lastModified: Date.now(),
  });
}
