/** Where to store mistake images: local disk or Alibaba Cloud OSS. */
export type ImageStorageMode = "local" | "oss";

export function getImageStorageMode(): ImageStorageMode {
  const m = process.env.IMAGE_STORAGE?.trim().toLowerCase();
  if (m === "oss") return "oss";
  return "local";
}

export function getOssPrefix(): string {
  return (process.env.ALIYUN_OSS_PREFIX?.trim() || "mistakes").replace(/^\/+|\/+$/g, "");
}

export function isOssConfigured(): boolean {
  return Boolean(
    process.env.ALIYUN_OSS_REGION?.trim() &&
    process.env.ALIYUN_OSS_ACCESS_KEY_ID?.trim() &&
    process.env.ALIYUN_OSS_ACCESS_KEY_SECRET?.trim() &&
    process.env.ALIYUN_OSS_BUCKET?.trim(),
  );
}

/** True when DB key was stored from OSS upload (prefix/userId/file). */
export function isOssImageKey(imageKey: string): boolean {
  const prefix = getOssPrefix();
  return imageKey.startsWith(`${prefix}/`);
}

/** Call before saving when mode is OSS. */
export function assertOssEnvForUpload(): void {
  if (getImageStorageMode() !== "oss") return;
  if (!isOssConfigured()) {
    throw new Error(
      "IMAGE_STORAGE=oss but OSS is not configured. Set ALIYUN_OSS_REGION, ALIYUN_OSS_ACCESS_KEY_ID, ALIYUN_OSS_ACCESS_KEY_SECRET, ALIYUN_OSS_BUCKET.",
    );
  }
}
