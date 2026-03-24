import { readFile, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/api-auth";
import { localUploadRoot } from "@/lib/mistake-files";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: Ctx) {
  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { path: segments } = await context.params;
  if (!segments?.length) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const decoded = segments.map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });

  if (decoded.some((p) => p.includes("..") || p === "")) {
    return NextResponse.json({ error: "Bad path." }, { status: 400 });
  }

  const [first, ...rest] = decoded;
  if (first !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const full = path.resolve(path.join(localUploadRoot(), first, ...rest));
  const allowedPrefix = path.resolve(path.join(localUploadRoot(), user.id));
  if (!full.startsWith(allowedPrefix + path.sep) && full !== allowedPrefix) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const st = await stat(full);
    if (!st.isFile()) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const ext = path.extname(full).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";
  const buf = await readFile(full);

  return new NextResponse(buf, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
