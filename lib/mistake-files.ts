import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  assertImageStorageModeSafeForProduction,
  assertOssEnvForUpload,
  getImageStorageMode,
  getOssPrefix,
  isOssImageKey,
} from "@/lib/oss-config";
import { getOssClient } from "@/lib/oss-client";

const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads");

function extFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === "image/jpeg" || m === "image/jpg") return ".jpg";
  if (m === "image/png") return ".png";
  if (m === "image/webp") return ".webp";
  if (m === "image/gif") return ".gif";
  return ".bin";
}

function resolveSafeExt(file: File): string {
  const ext = file.name.includes(".")
    ? path.extname(file.name).slice(0, 8).toLowerCase() || extFromMime(file.type)
    : extFromMime(file.type);
  return /^\.[a-z0-9]+$/i.test(ext) ? ext : extFromMime(file.type);
}

export async function saveMistakeImage(userId: string, file: File): Promise<string> {
  assertImageStorageModeSafeForProduction();
  const buf = Buffer.from(await file.arrayBuffer());
  const safeExt = resolveSafeExt(file);
  const name = `${randomUUID()}${safeExt}`;
  const contentType = file.type || "application/octet-stream";

  if (getImageStorageMode() === "oss") {
    assertOssEnvForUpload();
    const prefix = getOssPrefix();
    const objectKey = `${prefix}/${userId}/${name}`;
    const oss = getOssClient();
    await oss.put(objectKey, buf, {
      headers: { "Content-Type": contentType },
    });
    return objectKey;
  }

  const dir = path.join(UPLOAD_ROOT, userId);
  await mkdir(dir, { recursive: true });
  const full = path.join(dir, name);
  await writeFile(full, buf);
  return `${userId}/${name}`;
}

export async function deleteMistakeImageFile(imageKey: string): Promise<void> {
  if (!imageKey || imageKey.includes("..") || path.isAbsolute(imageKey)) return;

  if (isOssImageKey(imageKey)) {
    try {
      const oss = getOssClient();
      await oss.delete(imageKey);
    } catch {
      /* missing object is ok */
    }
    return;
  }

  const full = path.join(UPLOAD_ROOT, ...imageKey.split("/"));
  if (!full.startsWith(UPLOAD_ROOT)) return;
  try {
    await unlink(full);
  } catch {
    /* missing file is ok */
  }
}

export function localUploadRoot(): string {
  return UPLOAD_ROOT;
}
