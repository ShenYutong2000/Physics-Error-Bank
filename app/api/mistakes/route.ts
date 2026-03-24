import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/api-auth";
import { assertOssEnvForUpload, getImageStorageMode } from "@/lib/oss-config";
import { isDatabaseConfigured } from "@/lib/db";
import { deleteMistakeImageFile, saveMistakeImage } from "@/lib/mistake-files";
import { createMistakeForUser, listMistakesForUser } from "@/lib/mistakes-repo";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured. Set DATABASE_URL in .env." },
      { status: 503 },
    );
  }

  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const mistakes = await listMistakesForUser(user.id);
    return NextResponse.json({ mistakes });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load mistakes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured. Set DATABASE_URL in .env." },
      { status: 503 },
    );
  }

  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }
  if (!image.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image." }, { status: 400 });
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 12 MB)." }, { status: 400 });
  }

  const notes = typeof form.get("notes") === "string" ? (form.get("notes") as string) : "";
  const tagsRaw = form.get("tags");
  if (typeof tagsRaw !== "string") {
    return NextResponse.json({ error: "Tags JSON is required." }, { status: 400 });
  }

  let tagNames: string[];
  try {
    const parsed = JSON.parse(tagsRaw) as unknown;
    if (!Array.isArray(parsed) || !parsed.every((t) => typeof t === "string")) {
      return NextResponse.json({ error: "Tags must be a JSON string array." }, { status: 400 });
    }
    tagNames = parsed;
  } catch {
    return NextResponse.json({ error: "Invalid tags JSON." }, { status: 400 });
  }

  if (getImageStorageMode() === "oss") {
    try {
      assertOssEnvForUpload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "OSS is not configured.";
      return NextResponse.json({ error: msg }, { status: 503 });
    }
  }

  let imageKey: string | null = null;
  try {
    imageKey = await saveMistakeImage(user.id, image);
    const mistake = await createMistakeForUser(user.id, {
      imageKey,
      notes: notes.trim(),
      tagNames,
    });
    return NextResponse.json({ mistake });
  } catch (e) {
    if (imageKey) {
      await deleteMistakeImageFile(imageKey);
    }
    const msg = e instanceof Error ? e.message : "Failed to save mistake.";
    if (msg.includes("At least one tag")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (msg.includes("IMAGE_STORAGE=oss") || msg.includes("OSS environment")) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to save mistake." }, { status: 500 });
  }
}
