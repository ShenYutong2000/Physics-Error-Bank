import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api-route-guards";
import { publishPaper } from "@/lib/papers-repo";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireTeacher(request);
  if (!guard.ok) return guard.response;
  const { id } = await context.params;
  let body: { publish?: unknown };
  try {
    body = (await request.json()) as { publish?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (typeof body.publish !== "boolean") {
    return NextResponse.json({ error: "publish(boolean) is required." }, { status: 400 });
  }
  try {
    const paper = await publishPaper(id, body.publish);
    return NextResponse.json({ paper });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update publish state." }, { status: 500 });
  }
}

