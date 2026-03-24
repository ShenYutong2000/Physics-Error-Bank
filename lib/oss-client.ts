import OSS from "ali-oss";
import { getOssPrefix, isOssConfigured } from "@/lib/oss-config";

let client: OSS | null = null;

export function getOssClient(): OSS {
  if (!isOssConfigured()) {
    throw new Error("OSS environment variables are not set.");
  }
  if (client) return client;

  const region = process.env.ALIYUN_OSS_REGION!.trim();
  const accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID!.trim();
  const accessKeySecret = process.env.ALIYUN_OSS_ACCESS_KEY_SECRET!.trim();
  const bucket = process.env.ALIYUN_OSS_BUCKET!.trim();
  const endpoint = process.env.ALIYUN_OSS_ENDPOINT?.trim();

  client = new OSS({
    region,
    accessKeyId,
    accessKeySecret,
    bucket,
    ...(endpoint ? { endpoint } : {}),
  });

  return client;
}

/** For auth checks on GET: object key must be `{prefix}/{userId}/...`. */
export function ossKeyBelongsToUser(objectKey: string, userId: string): boolean {
  const prefix = getOssPrefix();
  const parts = objectKey.split("/").filter(Boolean);
  if (parts.length < 3) return false;
  if (parts[0] !== prefix) return false;
  return parts[1] === userId;
}
