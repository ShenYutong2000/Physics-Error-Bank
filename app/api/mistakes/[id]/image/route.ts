import { NextResponse } from "next/server";
import { requireDbAndUser } from "@/lib/api-route-guards";
import { deleteMistakeImageFile, saveMistakeImage } from "@/lib/mistake-files";
import { MAX_IMAGE_BYTES } from "@/lib/mistake-input";
import { assertOssEnvForUpload, getImageStorageMode } from "@/lib/oss-config";
import { replaceMistakeImageForUser } from "@/lib/mistakes-repo";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  const guard = await requireDbAndUser(request);
  if (!guard.ok) return guard.response;
  const { user } = guard;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
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

  const expectedUpdatedAt =
    typeof form.get("expectedUpdatedAt") === "string" ? (form.get("expectedUpdatedAt") as string) : "";
  if (!expectedUpdatedAt) {
    return NextResponse.json(
      { error: "Form must include expectedUpdatedAt for optimistic locking." },
      { status: 400 },
    );
  }

  if (getImageStorageMode() === "oss") {
    try {
      assertOssEnvForUpload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "OSS is not configured.";
      return NextResponse.json({ error: msg }, { status: 503 });
    }
  }

  let newImageKey: string | null = null;
  try {
    newImageKey = await saveMistakeImage(user.id, image);
    const result = await replaceMistakeImageForUser(user.id, id, {
      newImageKey,
      expectedUpdatedAt,
    });
    if (result.kind === "not_found") {
      await deleteMistakeImageFile(newImageKey);
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    if (result.kind === "conflict") {
      await deleteMistakeImageFile(newImageKey);
      return NextResponse.json(
        {
          error:
            "This mistake was updated elsewhere. Please refresh and try again.",
          code: "CONFLICT",
        },
        { status: 409 },
      );
    }
    await deleteMistakeImageFile(result.oldImageKey);
    return NextResponse.json({ mistake: result.mistake });
  } catch (e) {
    if (newImageKey) {
      await deleteMistakeImageFile(newImageKey);
    }
    const msg = e instanceof Error ? e.message : "Failed to replace image.";
    if (msg.includes("IMAGE_STORAGE=local is not supported in production")) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    if (msg.includes("IMAGE_STORAGE=oss") || msg.includes("OSS environment")) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to replace image." }, { status: 500 });
  }
}
