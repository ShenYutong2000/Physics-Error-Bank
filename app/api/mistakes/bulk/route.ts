import { NextResponse } from "next/server";
import { requireDbAndUser } from "@/lib/api-route-guards";
import { deleteMistakeImageFile } from "@/lib/mistake-files";
import {
  bulkAddTagsToMistakesForUser,
  bulkDeleteMistakesForUser,
  bulkRemoveTagsFromMistakesForUser,
  exportMistakesByIdsForUser,
} from "@/lib/mistakes-repo";

export const runtime = "nodejs";

type BulkBody = {
  action?: unknown;
  ids?: unknown;
  tags?: unknown;
};

function parseIds(raw: unknown): string[] {
  if (!Array.isArray(raw) || !raw.every((x) => typeof x === "string")) return [];
  return [...new Set(raw.map((x) => x.trim()).filter(Boolean))];
}

function parseTags(raw: unknown): string[] {
  if (!Array.isArray(raw) || !raw.every((x) => typeof x === "string")) return [];
  return [...new Set(raw.map((x) => x.trim()).filter(Boolean))];
}

export async function POST(request: Request) {
  const guard = await requireDbAndUser(request);
  if (!guard.ok) return guard.response;
  let body: BulkBody;
  try {
    body = (await request.json()) as BulkBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const action = typeof body.action === "string" ? body.action.trim() : "";
  const ids = parseIds(body.ids);
  if (ids.length === 0) {
    return NextResponse.json({ error: "Body must include ids: string[]." }, { status: 400 });
  }

  try {
    if (action === "add_tags") {
      const tags = parseTags(body.tags);
      if (tags.length === 0) {
        return NextResponse.json({ error: "Body must include tags: string[] for add_tags." }, { status: 400 });
      }
      const result = await bulkAddTagsToMistakesForUser(guard.user.id, ids, tags);
      return NextResponse.json({ affected: result.affected });
    }
    if (action === "remove_tags") {
      const tags = parseTags(body.tags);
      if (tags.length === 0) {
        return NextResponse.json({ error: "Body must include tags: string[] for remove_tags." }, { status: 400 });
      }
      const result = await bulkRemoveTagsFromMistakesForUser(guard.user.id, ids, tags);
      return NextResponse.json({ affected: result.affected });
    }
    if (action === "delete") {
      const result = await bulkDeleteMistakesForUser(guard.user.id, ids);
      await Promise.all(result.imageKeys.map((k) => deleteMistakeImageFile(k)));
      return NextResponse.json({ deletedIds: result.deletedIds });
    }
    if (action === "export") {
      const mistakes = await exportMistakesByIdsForUser(guard.user.id, ids);
      return NextResponse.json({
        exportedAt: new Date().toISOString(),
        count: mistakes.length,
        mistakes,
      });
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Bulk operation failed." }, { status: 500 });
  }
}
