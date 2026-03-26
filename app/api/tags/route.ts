import { NextResponse } from "next/server";
import { requireDbAndUser } from "@/lib/api-route-guards";
import { deleteTagForUser, listTagUsageForUser, renameOrMergeTagForUser } from "@/lib/mistakes-repo";
import { PRESET_TAG_SET } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await requireDbAndUser(request);
  if (!guard.ok) return guard.response;
  try {
    const tags = await listTagUsageForUser(guard.user.id);
    return NextResponse.json({ tags });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load tags." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const guard = await requireDbAndUser(request);
  if (!guard.ok) return guard.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const fromName = typeof (body as { fromName?: unknown }).fromName === "string" ? (body as { fromName: string }).fromName : "";
  const toName = typeof (body as { toName?: unknown }).toName === "string" ? (body as { toName: string }).toName : "";
  if (!fromName.trim() || !toName.trim()) {
    return NextResponse.json({ error: "Body must include fromName and toName." }, { status: 400 });
  }
  if (PRESET_TAG_SET.has(fromName.trim())) {
    return NextResponse.json({ error: "Preset curriculum tags cannot be edited." }, { status: 403 });
  }
  try {
    const result = await renameOrMergeTagForUser(guard.user.id, fromName, toName);
    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Source tag not found." }, { status: 404 });
    }
    return NextResponse.json({ movedCount: result.movedCount });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to rename tag.";
    if (msg.includes("required")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to rename tag." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const guard = await requireDbAndUser(request);
  if (!guard.ok) return guard.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const name = typeof (body as { name?: unknown }).name === "string" ? (body as { name: string }).name : "";
  if (!name.trim()) {
    return NextResponse.json({ error: "Body must include tag name." }, { status: 400 });
  }
  if (PRESET_TAG_SET.has(name.trim())) {
    return NextResponse.json({ error: "Preset curriculum tags cannot be deleted." }, { status: 403 });
  }
  try {
    const result = await deleteTagForUser(guard.user.id, name);
    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Tag not found." }, { status: 404 });
    }
    return NextResponse.json({ detachedCount: result.detachedCount });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete tag.";
    if (msg.includes("required")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to delete tag." }, { status: 500 });
  }
}
