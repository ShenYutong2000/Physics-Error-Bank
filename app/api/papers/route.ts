import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/api-route-guards";
import { listPapers } from "@/lib/papers-repo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await requireStudent(request);
  if (!guard.ok) return guard.response;
  try {
    const papers = await listPapers({ includeUnpublished: false });
    return NextResponse.json({ papers });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load papers." }, { status: 500 });
  }
}

