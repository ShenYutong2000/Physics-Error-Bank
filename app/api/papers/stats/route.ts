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
const STATS_CACHE_TTL_MS = 60_000;
const statsCache = new Map<string, { expiresAt: number; payload: unknown }>();

function getCached<T>(key: string): T | null {
  const hit = statsCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    statsCache.delete(key);
    return null;
  }
  return hit.payload as T;
}

function setCached(key: string, payload: unknown) {
  statsCache.set(key, { expiresAt: Date.now() + STATS_CACHE_TTL_MS, payload });
}

/**
 * Cross-paper stats: aggregate question results for every published paper,
 * and theme (tag) mastery — self (student), class-wide, or selected student (teacher).
 */
export async function GET(request: Request) {
  const guard = await requireDbAndUser(request);
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const studentIdParam = url.searchParams.get("studentId");
  const prepScope = url.searchParams.get("prep") === "dp1" ? "dp1" : "all";
  const onlyDp1Prep = prepScope === "dp1";

  try {
    if (guard.user.role === "STUDENT") {
      if (studentIdParam && studentIdParam !== guard.user.id) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
      const cacheKey = `stats:student:self:${guard.user.id}:prep:${prepScope}`;
      const cached = getCached<{
        papers: Awaited<ReturnType<typeof getPublishedPapersAggregateQuestionStats>>;
        crossPaperThemeMastery: Awaited<ReturnType<typeof getCrossPaperThemeMasteryForUser>>;
        classCrossPaperThemeMastery: Awaited<ReturnType<typeof getCrossPaperThemeMasteryClassWide>>;
        masteryScope: "self";
        prepScope: "all" | "dp1";
      }>(cacheKey);
      if (cached) return NextResponse.json(cached, { headers: { "x-stats-cache": "hit" } });

      const papers = await getPublishedPapersAggregateQuestionStats(onlyDp1Prep);
      const crossPaperThemeMastery = await getCrossPaperThemeMasteryForUser(guard.user.id, onlyDp1Prep);
      const classCrossPaperThemeMastery = await getCrossPaperThemeMasteryClassWide(onlyDp1Prep);
      const payload = {
        papers,
        crossPaperThemeMastery,
        classCrossPaperThemeMastery,
        masteryScope: "self" as const,
        prepScope,
      };
      setCached(cacheKey, payload);
      return NextResponse.json(payload, { headers: { "x-stats-cache": "miss" } });
    }

    if (guard.user.role === "TEACHER") {
      const cacheKey = studentIdParam
        ? `stats:teacher:student:${studentIdParam}:prep:${prepScope}`
        : `stats:teacher:class:prep:${prepScope}`;
      const cached = getCached<{
        papers: Awaited<ReturnType<typeof getPublishedPapersAggregateQuestionStats>>;
        crossPaperThemeMastery:
          | Awaited<ReturnType<typeof getCrossPaperThemeMasteryClassWide>>
          | Awaited<ReturnType<typeof getCrossPaperThemeMasteryForUser>>;
        masteryScope: "class" | "student";
        prepScope: "all" | "dp1";
        selectedStudent?: { userId: string; name: string; email: string };
        students: Awaited<ReturnType<typeof listStudentUsersBrief>>;
      }>(cacheKey);
      if (cached) return NextResponse.json(cached, { headers: { "x-stats-cache": "hit" } });

      const papers = await getPublishedPapersAggregateQuestionStats(onlyDp1Prep);
      const students = await listStudentUsersBrief();

      if (studentIdParam) {
        const target = await prisma.user.findFirst({
          where: { id: studentIdParam, role: "STUDENT" },
          select: { id: true, name: true, email: true },
        });
        if (!target) {
          return NextResponse.json({ error: "Student not found." }, { status: 404 });
        }
        const crossPaperThemeMastery = await getCrossPaperThemeMasteryForUser(target.id, onlyDp1Prep);
        const payload = {
          papers,
          crossPaperThemeMastery,
          masteryScope: "student" as const,
          prepScope,
          selectedStudent: {
            userId: target.id,
            name: target.name,
            email: target.email,
          },
          students,
        };
        setCached(cacheKey, payload);
        return NextResponse.json(payload, { headers: { "x-stats-cache": "miss" } });
      }

      const crossPaperThemeMastery = await getCrossPaperThemeMasteryClassWide(onlyDp1Prep);
      const payload = {
        papers,
        crossPaperThemeMastery,
        masteryScope: "class" as const,
        prepScope,
        students,
      };
      setCached(cacheKey, payload);
      return NextResponse.json(payload, { headers: { "x-stats-cache": "miss" } });
    }

    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load paper stats." }, { status: 500 });
  }
}
