import { prisma } from "@/lib/db";

export type TagRow = { tag: string; count: number };

export type StudentMistakeAnalyticsRow = {
  userId: string;
  name: string;
  email: string;
  mistakeCount: number;
  tagRows: TagRow[];
};

/** Aggregates mistakes and tags for student accounts only (excludes teachers). */
export async function getStudentMistakeAnalyticsForTeacher(): Promise<{
  overall: {
    totalMistakes: number;
    studentCountWithMistakes: number;
    tagRows: TagRow[];
  };
  students: StudentMistakeAnalyticsRow[];
}> {
  const totalMistakes = await prisma.mistake.count({
    where: { user: { role: "STUDENT" } },
  });

  const distinctStudentRows = await prisma.mistake.findMany({
    where: { user: { role: "STUDENT" } },
    select: { userId: true },
    distinct: ["userId"],
  });
  const studentCountWithMistakes = distinctStudentRows.length;

  const overallPairs = await prisma.mistakeTag.findMany({
    where: { mistake: { user: { role: "STUDENT" } } },
    select: { tag: { select: { name: true } } },
  });
  const overallTagMap = new Map<string, number>();
  for (const p of overallPairs) {
    const n = p.tag.name;
    overallTagMap.set(n, (overallTagMap.get(n) ?? 0) + 1);
  }
  const tagRows = [...overallTagMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  const studentsWithMeta = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: {
      id: true,
      name: true,
      email: true,
      _count: { select: { mistakes: true } },
    },
    orderBy: { mistakes: { _count: "desc" } },
  });

  const perUserPairs = await prisma.mistakeTag.findMany({
    where: { mistake: { user: { role: "STUDENT" } } },
    select: {
      tag: { select: { name: true } },
      mistake: { select: { userId: true } },
    },
  });
  const userTagMap = new Map<string, Map<string, number>>();
  for (const p of perUserPairs) {
    const uid = p.mistake.userId;
    let m = userTagMap.get(uid);
    if (!m) {
      m = new Map();
      userTagMap.set(uid, m);
    }
    const n = p.tag.name;
    m.set(n, (m.get(n) ?? 0) + 1);
  }

  const students: StudentMistakeAnalyticsRow[] = studentsWithMeta.map((u) => {
    const tm = userTagMap.get(u.id);
    const rows = tm
      ? [...tm.entries()]
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
      : [];
    return {
      userId: u.id,
      name: u.name.trim(),
      email: u.email,
      mistakeCount: u._count.mistakes,
      tagRows: rows,
    };
  });

  return {
    overall: { totalMistakes, studentCountWithMistakes, tagRows },
    students,
  };
}
