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

/**
 * Guard against accidental local filesystem uploads in production/serverless.
 * On platforms like Vercel, local disk is ephemeral and not suitable for persistent user uploads.
 */
export function assertImageStorageModeSafeForProduction(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (getImageStorageMode() === "local") {
    throw new Error(
      "IMAGE_STORAGE=local is not supported in production. Use IMAGE_STORAGE=oss and configure OSS environment variables.",
    );
  }
}

/** True when DB key was stored from OSS upload (prefix/userId/file). */
export function isOssImageKey(imageKey: string): boolean {
  const prefix = getOssPrefix();
  return imageKey.startsWith(`${prefix}/`);
}

/** Call before saving when mode is OSS. */
export function assertOssEnvForUpload(): void {
  assertImageStorageModeSafeForProduction();
  if (getImageStorageMode() !== "oss") return;
  if (!isOssConfigured()) {
    throw new Error(
      "IMAGE_STORAGE=oss but OSS is not configured. Set ALIYUN_OSS_REGION, ALIYUN_OSS_ACCESS_KEY_ID, ALIYUN_OSS_ACCESS_KEY_SECRET, ALIYUN_OSS_BUCKET.",
    );
  }
}
