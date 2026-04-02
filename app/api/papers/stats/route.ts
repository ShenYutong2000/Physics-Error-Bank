import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDbAndUser } from "@/lib/api-route-guards";
import {
  getCrossPaperThemeMasteryClassWide,
  getCrossPaperThemeMasteryForUser,
  getPublishedPapersAggregateQuestionStats,
} from "@/lib/papers-repo";
import { listStudentUsersBrief } from "@/lib/users-repo";

export const runtime = "nodejs";

/**
 * Cross-paper stats: aggregate question results for every published paper,
 * and theme (tag) mastery — self (student), class-wide, or selected student (teacher).
 */
export async function GET(request: Request) {
  const guard = await requireDbAndUser(request);
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const studentIdParam = url.searchParams.get("studentId");

  try {
    const papers = await getPublishedPapersAggregateQuestionStats();

    if (guard.user.role === "STUDENT") {
      if (studentIdParam && studentIdParam !== guard.user.id) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
      const crossPaperThemeMastery = await getCrossPaperThemeMasteryForUser(guard.user.id);
      return NextResponse.json({
        papers,
        crossPaperThemeMastery,
        masteryScope: "self" as const,
      });
    }

    if (guard.user.role === "TEACHER") {
      const students = await listStudentUsersBrief();

      if (studentIdParam) {
        const target = await prisma.user.findFirst({
          where: { id: studentIdParam, role: "STUDENT" },
          select: { id: true, name: true, email: true },
        });
        if (!target) {
          return NextResponse.json({ error: "Student not found." }, { status: 404 });
        }
        const crossPaperThemeMastery = await getCrossPaperThemeMasteryForUser(target.id);
        return NextResponse.json({
          papers,
          crossPaperThemeMastery,
          masteryScope: "student" as const,
          selectedStudent: {
            userId: target.id,
            name: target.name,
            email: target.email,
          },
          students,
        });
      }

      const crossPaperThemeMastery = await getCrossPaperThemeMasteryClassWide();
      return NextResponse.json({
        papers,
        crossPaperThemeMastery,
        masteryScope: "class" as const,
        students,
      });
    }

    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load paper stats." }, { status: 500 });
  }
}
